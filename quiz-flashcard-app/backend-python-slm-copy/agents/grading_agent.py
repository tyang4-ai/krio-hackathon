"""
Grading Agent - Evaluates answers with partial credit support.

Responsibilities:
- Grade answers for all question types
- Support partial credit for complex answers
- Provide detailed feedback and breakdown
- Handle mathematical equivalence checking
"""
import json
import re
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import PartialCreditGrade, Question
from services.ai_service import ai_service

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

GRADING_SYSTEM_PROMPT = """You are an expert grader evaluating student answers with partial credit support.

Your role is to:
1. Evaluate the correctness of student answers
2. Award partial credit for partially correct responses
3. Provide constructive feedback
4. Recognize equivalent answers (e.g., x² and x^2 are the same)
5. Break down complex answers into gradable components

Be fair but rigorous in your grading. Award credit for correct methodology even if the final answer has minor errors."""


class GradingAgent(BaseAgent):
    """
    Agent that grades quiz answers with partial credit.

    Handles both simple exact-match grading and complex
    AI-assisted grading for written answers.
    """

    def __init__(self):
        """Initialize the Grading Agent."""
        super().__init__(
            role=AgentRole.GRADING,
            system_prompt=GRADING_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Grade an answer.

        Args:
            input_data: Dict containing:
                - question: Question dict with text, type, correct_answer
                - user_answer: The student's answer
                - use_partial_credit: Whether to use AI for partial credit

        Returns:
            Grading result with score and feedback
        """
        question = input_data.get("question", {})
        user_answer = input_data.get("user_answer", "")
        use_partial_credit = input_data.get("use_partial_credit", True)

        if not question or not user_answer:
            return {
                "success": False,
                "error": "Missing question or answer",
            }

        question_type = question.get("question_type", "multiple_choice")
        correct_answer = question.get("correct_answer", "")

        # Simple types: exact match
        if question_type in ["multiple_choice", "true_false"]:
            is_correct = self._check_simple_answer(user_answer, correct_answer)
            return {
                "success": True,
                "is_correct": is_correct,
                "earned_points": 1.0 if is_correct else 0.0,
                "total_points": 1.0,
                "feedback": "Correct!" if is_correct else f"Incorrect. The correct answer is: {correct_answer}",
            }

        # Complex types: check if partial credit needed
        if not use_partial_credit:
            is_correct = self._check_simple_answer(user_answer, correct_answer)
            return {
                "success": True,
                "is_correct": is_correct,
                "earned_points": 1.0 if is_correct else 0.0,
                "total_points": 1.0,
                "feedback": "Correct!" if is_correct else f"The expected answer was: {correct_answer}",
            }

        # Use AI for partial credit grading
        return await self._grade_with_partial_credit(question, user_answer)

    def _check_simple_answer(self, user_answer: str, correct_answer: str) -> bool:
        """Check if a simple answer is correct."""
        # Normalize both answers
        user_normalized = user_answer.strip().lower()
        correct_normalized = correct_answer.strip().lower()

        # Direct match
        if user_normalized == correct_normalized:
            return True

        # For multiple choice, check just the letter
        if len(user_normalized) == 1 and user_normalized.isalpha():
            if correct_normalized.startswith(user_normalized):
                return True

        # Check mathematical equivalence for simple expressions
        if self._check_math_equivalence(user_answer, correct_answer):
            return True

        return False

    def _check_math_equivalence(self, expr1: str, expr2: str) -> bool:
        """Check if two math expressions are equivalent."""
        # Normalize math notation
        def normalize(expr: str) -> str:
            expr = expr.lower().strip()
            # x² -> x^2
            expr = re.sub(r"²", "^2", expr)
            expr = re.sub(r"³", "^3", expr)
            # Remove spaces
            expr = expr.replace(" ", "")
            # Normalize fractions
            expr = re.sub(r"(\d+)/(\d+)", r"\1/\2", expr)
            return expr

        return normalize(expr1) == normalize(expr2)

    async def _grade_with_partial_credit(
        self,
        question: Dict[str, Any],
        user_answer: str,
    ) -> Dict[str, Any]:
        """Use AI to grade with partial credit."""
        logger.info(
            "grading_with_partial_credit",
            question_type=question.get("question_type"),
            answer_length=len(user_answer),
        )

        prompt = self._build_grading_prompt(question, user_answer)

        try:
            response = await self.generate_json(prompt, max_tokens=2000)
            result = self._parse_grading_response(response)

            return {
                "success": True,
                **result,
            }

        except Exception as e:
            logger.error("partial_credit_grading_error", error=str(e))
            # Fall back to simple grading
            is_correct = self._check_simple_answer(
                user_answer, question.get("correct_answer", "")
            )
            return {
                "success": True,
                "is_correct": is_correct,
                "earned_points": 1.0 if is_correct else 0.0,
                "total_points": 1.0,
                "feedback": "Unable to provide detailed feedback.",
            }

    def _build_grading_prompt(
        self,
        question: Dict[str, Any],
        user_answer: str,
    ) -> str:
        """Build prompt for AI grading."""
        return f"""Grade this student answer with partial credit.

Question: {question.get('question_text', '')}
Question Type: {question.get('question_type', 'written_answer')}
Correct Answer: {question.get('correct_answer', '')}
Student Answer: {user_answer}

Evaluate the student's answer and provide partial credit if applicable.

Consider:
1. Is the setup/approach correct?
2. Are calculation steps accurate?
3. Is the final answer correct?
4. Are formulas applied correctly?
5. Are units handled properly?

Respond with JSON:
{{
    "total_points": 1.0,
    "earned_points": 0.75,
    "is_correct": false,
    "breakdown": [
        {{
            "component": "Setup/Approach",
            "max_points": 0.25,
            "earned_points": 0.25,
            "correct": true,
            "feedback": "Correct approach identified"
        }},
        {{
            "component": "Calculation",
            "max_points": 0.5,
            "earned_points": 0.25,
            "correct": false,
            "feedback": "Minor calculation error in step 2"
        }},
        {{
            "component": "Final Answer",
            "max_points": 0.25,
            "earned_points": 0.0,
            "correct": false,
            "feedback": "Incorrect due to earlier error"
        }}
    ],
    "overall_feedback": "Good understanding of the concept, but calculation error led to wrong answer.",
    "correct_parts": ["Correct formula used", "Units handled properly"],
    "incorrect_parts": ["Arithmetic error in calculation"],
    "suggestions": ["Double-check calculations", "Review order of operations"]
}}"""

    def _parse_grading_response(self, response: str) -> Dict[str, Any]:
        """Parse the AI grading response."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)

            earned = data.get("earned_points", 0)
            total = data.get("total_points", 1.0)

            return {
                "is_correct": earned >= total,
                "earned_points": earned,
                "total_points": total,
                "breakdown": data.get("breakdown", []),
                "feedback": data.get("overall_feedback", ""),
                "correct_parts": data.get("correct_parts", []),
                "incorrect_parts": data.get("incorrect_parts", []),
                "suggestions": data.get("suggestions", []),
            }

        except json.JSONDecodeError:
            logger.warning("grading_parse_failed", response_preview=response[:200])
            return {
                "is_correct": False,
                "earned_points": 0,
                "total_points": 1.0,
                "feedback": "Unable to parse grading response.",
            }

    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON."""
        response = re.sub(r"```json\s*", "", response)
        response = re.sub(r"```\s*", "", response)

        start = response.find("{")
        end = response.rfind("}") + 1

        if start != -1 and end > start:
            return response[start:end]

        return response


async def grade_answer(
    db: AsyncSession,
    session_id: int,
    question_id: int,
    user_answer: str,
    use_partial_credit: bool = True,
) -> Dict[str, Any]:
    """
    Grade a quiz answer.

    Args:
        db: Database session
        session_id: Quiz session ID
        question_id: Question ID
        user_answer: Student's answer
        use_partial_credit: Whether to use AI partial credit

    Returns:
        Grading result
    """
    # Get question
    result = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    question = result.scalar_one_or_none()

    if not question:
        return {
            "success": False,
            "error": f"Question {question_id} not found",
        }

    # Grade the answer
    agent = GradingAgent()
    result = await agent.process({
        "question": {
            "question_text": question.question_text,
            "question_type": question.question_type,
            "correct_answer": question.correct_answer,
            "options": question.options,
        },
        "user_answer": user_answer,
        "use_partial_credit": use_partial_credit,
    })

    # Store partial credit grade if applicable
    if result.get("success") and use_partial_credit and result.get("breakdown"):
        grade = PartialCreditGrade(
            session_id=session_id,
            question_id=question_id,
            total_points=result.get("total_points", 1.0),
            earned_points=result.get("earned_points", 0),
            breakdown=result.get("breakdown", []),
            feedback=result.get("feedback", ""),
        )
        db.add(grade)

        logger.info(
            "partial_credit_grade_stored",
            session_id=session_id,
            question_id=question_id,
            earned=result.get("earned_points"),
        )

    return result


async def get_session_grades(
    db: AsyncSession,
    session_id: int,
) -> List[Dict[str, Any]]:
    """Get all partial credit grades for a session."""
    result = await db.execute(
        select(PartialCreditGrade).where(PartialCreditGrade.session_id == session_id)
    )
    grades = result.scalars().all()

    return [
        {
            "id": g.id,
            "question_id": g.question_id,
            "total_points": g.total_points,
            "earned_points": g.earned_points,
            "breakdown": g.breakdown,
            "feedback": g.feedback,
            "created_at": g.created_at.isoformat(),
        }
        for g in grades
    ]


# Singleton instance
grading_agent = GradingAgent()
