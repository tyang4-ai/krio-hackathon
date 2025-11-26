"""
Generation Agent - Generates questions and flashcards using AI.

Responsibilities:
- Generate questions based on content and analysis patterns
- Apply style guides from Analysis Agent
- Support all question types (multiple_choice, true_false, written_answer, fill_in_blank)
- Generate flashcards from content
"""
import json
import re
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import AIAnalysisResult, AgentMessage as AgentMessageModel, Question, Flashcard
from services.ai_service import ai_service

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

GENERATION_SYSTEM_PROMPT = """You are an expert educator who creates high-quality quiz questions and flashcards.

Your questions should:
1. Be clear and unambiguous
2. Test understanding, not just memorization
3. Have plausible distractors for multiple choice
4. Include helpful explanations
5. Match the style and format of any provided examples

Always respond with valid JSON."""


class GenerationAgent(BaseAgent):
    """
    Agent that generates questions and flashcards.

    Uses patterns from the Analysis Agent (if available) to ensure
    consistency with user-provided samples.
    """

    def __init__(self):
        """Initialize the Generation Agent."""
        super().__init__(
            role=AgentRole.GENERATION,
            system_prompt=GENERATION_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate questions based on input.

        Args:
            input_data: Dict containing:
                - content: Text content to generate questions from
                - count: Number of questions to generate
                - difficulty: easy/medium/hard
                - question_type: Type of questions to generate
                - style_guide: Optional style guide from analysis
                - custom_directions: Optional user instructions

        Returns:
            Generated questions
        """
        content = input_data.get("content", "")
        count = input_data.get("count", 5)
        difficulty = input_data.get("difficulty", "medium")
        question_type = input_data.get("question_type", "multiple_choice")
        style_guide = input_data.get("style_guide")
        custom_directions = input_data.get("custom_directions", "")

        if not content:
            return {
                "success": False,
                "error": "No content provided for question generation",
            }

        logger.info(
            "generation_agent_processing",
            content_length=len(content),
            count=count,
            difficulty=difficulty,
            question_type=question_type,
        )

        # Build prompt
        prompt = self._build_generation_prompt(
            content=content,
            count=count,
            difficulty=difficulty,
            question_type=question_type,
            style_guide=style_guide,
            custom_directions=custom_directions,
        )

        try:
            response = await self.generate_json(prompt, max_tokens=4000)
            questions = self._parse_questions_response(response)

            logger.info(
                "generation_agent_completed",
                questions_generated=len(questions),
            )

            return {
                "success": True,
                "questions": questions,
            }

        except Exception as e:
            logger.error("generation_agent_error", error=str(e))
            return {
                "success": False,
                "error": f"Question generation failed: {str(e)}",
            }

    def _build_generation_prompt(
        self,
        content: str,
        count: int,
        difficulty: str,
        question_type: str,
        style_guide: Optional[Dict[str, Any]] = None,
        custom_directions: str = "",
    ) -> str:
        """Build the prompt for question generation."""
        # Truncate content if too long
        max_content_length = 7000
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."

        # Type-specific instructions
        type_instructions = {
            "multiple_choice": """
For MULTIPLE CHOICE questions:
- Provide exactly 4 options labeled A, B, C, D
- Only ONE option should be correct
- Make distractors plausible but clearly incorrect
- Correct answer should be just the letter (A, B, C, or D)""",
            "true_false": """
For TRUE/FALSE questions:
- Create definitive statements that are either completely true or false
- Avoid ambiguous wording
- Correct answer should be "True" or "False\"""",
            "written_answer": """
For WRITTEN ANSWER questions:
- Create open-ended questions requiring paragraph responses
- Include a model answer showing what a good response includes
- Correct answer should be the model answer text""",
            "fill_in_blank": """
For FILL-IN-THE-BLANK questions:
- Create sentences with a key term/formula replaced by _____
- Use exactly 5 underscores for blanks
- Test important concepts, terms, or formulas
- Correct answer should be the exact text that fills the blank""",
        }

        type_instruction = type_instructions.get(
            question_type,
            type_instructions["multiple_choice"]
        )

        # Style guide section
        style_section = ""
        if style_guide:
            style_section = f"""
Use this style guide based on the user's sample questions:
- Tone: {style_guide.get('tone', 'academic')}
- Vocabulary Level: {style_guide.get('vocabulary_level', 'intermediate')}
- Question Length: {style_guide.get('question_length', 'medium')}
- Explanation Style: {style_guide.get('explanation_style', 'Brief and clear')}
"""
            if style_guide.get("formatting_rules"):
                style_section += f"- Formatting Rules: {', '.join(style_guide['formatting_rules'])}\n"

        # Custom directions section
        custom_section = ""
        if custom_directions:
            custom_section = f"\nAdditional Instructions from User:\n{custom_directions}\n"

        return f"""Generate {count} {difficulty} difficulty {question_type.replace('_', ' ')} questions based on this content:

{content}

{type_instruction}
{style_section}
{custom_section}

Respond with JSON in this format:
{{
    "questions": [
        {{
            "question_text": "The question text",
            "question_type": "{question_type}",
            "difficulty": "{difficulty}",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correct_answer": "A",
            "explanation": "Brief explanation of why this is correct",
            "tags": ["topic1", "topic2"]
        }}
    ]
}}

Notes:
- "options" should be null for written_answer and fill_in_blank types
- Each question must have a clear, unambiguous correct answer
- Explanations should help students understand the concept"""

    def _parse_questions_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse the AI response into questions."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            questions = data.get("questions", [])

            # Validate and clean each question
            valid_questions = []
            for q in questions:
                if q.get("question_text") and q.get("correct_answer"):
                    valid_questions.append({
                        "question_text": q["question_text"],
                        "question_type": q.get("question_type", "multiple_choice"),
                        "difficulty": q.get("difficulty", "medium"),
                        "options": q.get("options"),
                        "correct_answer": q["correct_answer"],
                        "explanation": q.get("explanation", ""),
                        "tags": q.get("tags", []),
                    })

            return valid_questions

        except json.JSONDecodeError:
            logger.warning("generation_parse_failed", response_preview=response[:200])
            return []

    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON."""
        response = re.sub(r"```json\s*", "", response)
        response = re.sub(r"```\s*", "", response)

        start = response.find("{")
        end = response.rfind("}") + 1

        if start != -1 and end > start:
            return response[start:end]

        return response

    async def generate_flashcards(
        self,
        content: str,
        count: int = 10,
        custom_directions: str = "",
    ) -> Dict[str, Any]:
        """
        Generate flashcards from content.

        Args:
            content: Text content to create flashcards from
            count: Number of flashcards to generate
            custom_directions: Optional user instructions

        Returns:
            Generated flashcards
        """
        if not content:
            return {
                "success": False,
                "error": "No content provided for flashcard generation",
            }

        logger.info(
            "generation_agent_flashcards",
            content_length=len(content),
            count=count,
        )

        prompt = self._build_flashcard_prompt(content, count, custom_directions)

        try:
            response = await self.generate_json(prompt, max_tokens=3000)
            flashcards = self._parse_flashcards_response(response)

            logger.info(
                "flashcards_generated",
                count=len(flashcards),
            )

            return {
                "success": True,
                "flashcards": flashcards,
            }

        except Exception as e:
            logger.error("flashcard_generation_error", error=str(e))
            return {
                "success": False,
                "error": f"Flashcard generation failed: {str(e)}",
            }

    def _build_flashcard_prompt(
        self,
        content: str,
        count: int,
        custom_directions: str = "",
    ) -> str:
        """Build prompt for flashcard generation."""
        max_content_length = 7000
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."

        custom_section = ""
        if custom_directions:
            custom_section = f"\nAdditional Instructions:\n{custom_directions}\n"

        return f"""Create {count} educational flashcards from this content:

{content}
{custom_section}

Guidelines:
- Front should contain a clear question or term
- Back should contain a concise but complete answer
- Focus on key concepts, definitions, and important facts
- Vary the difficulty from easy to hard
- Use clear, educational language

Respond with JSON in this format:
{{
    "flashcards": [
        {{
            "front_text": "Question or term",
            "back_text": "Answer or definition",
            "difficulty": "easy|medium|hard",
            "tags": ["topic1", "topic2"]
        }}
    ]
}}"""

    def _parse_flashcards_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse the AI response into flashcards."""
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            flashcards = data.get("flashcards", [])

            valid_flashcards = []
            for f in flashcards:
                if f.get("front_text") and f.get("back_text"):
                    valid_flashcards.append({
                        "front_text": f["front_text"],
                        "back_text": f["back_text"],
                        "difficulty": f.get("difficulty", "medium"),
                        "tags": f.get("tags", []),
                    })

            return valid_flashcards

        except json.JSONDecodeError:
            logger.warning("flashcard_parse_failed", response_preview=response[:200])
            return []


async def generate_questions(
    db: AsyncSession,
    category_id: int,
    content: str,
    count: int = 5,
    difficulty: str = "medium",
    question_type: str = "multiple_choice",
    custom_directions: str = "",
    document_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate questions for a category.

    Uses analysis patterns if available.

    Args:
        db: Database session
        category_id: Category to generate for
        content: Source content
        count: Number of questions
        difficulty: Difficulty level
        question_type: Type of questions
        custom_directions: User instructions
        document_id: Optional document to link questions to

    Returns:
        Generation result with questions
    """
    # Get analysis patterns if available
    result = await db.execute(
        select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
    )
    analysis = result.scalar_one_or_none()

    style_guide = analysis.style_guide if analysis else None

    # Generate questions
    agent = GenerationAgent()
    result = await agent.process({
        "content": content,
        "count": count,
        "difficulty": difficulty,
        "question_type": question_type,
        "style_guide": style_guide,
        "custom_directions": custom_directions,
    })

    if result["success"]:
        # Store generated questions
        questions = result["questions"]
        stored_questions = []

        for q_data in questions:
            question = Question(
                category_id=category_id,
                document_id=document_id,
                question_text=q_data["question_text"],
                question_type=q_data["question_type"],
                difficulty=q_data["difficulty"],
                options=q_data.get("options"),
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation", ""),
                tags=q_data.get("tags", []),
            )
            db.add(question)
            stored_questions.append(question)

        # Log agent message
        agent_msg = AgentMessageModel(
            category_id=category_id,
            from_agent="generation_agent",
            to_agent="controller",
            message_type="questions_generated",
            payload={
                "count": len(questions),
                "difficulty": difficulty,
                "question_type": question_type,
            },
            status="processed",
        )
        db.add(agent_msg)

        logger.info(
            "questions_generated_and_stored",
            category_id=category_id,
            count=len(stored_questions),
        )

        result["stored_questions"] = stored_questions

    return result


async def generate_flashcards(
    db: AsyncSession,
    category_id: int,
    content: str,
    count: int = 10,
    custom_directions: str = "",
    document_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate flashcards for a category.

    Args:
        db: Database session
        category_id: Category to generate for
        content: Source content
        count: Number of flashcards
        custom_directions: User instructions
        document_id: Optional document to link flashcards to

    Returns:
        Generation result with flashcards
    """
    agent = GenerationAgent()
    result = await agent.generate_flashcards(
        content=content,
        count=count,
        custom_directions=custom_directions,
    )

    if result["success"]:
        flashcards = result["flashcards"]
        stored_flashcards = []

        for f_data in flashcards:
            flashcard = Flashcard(
                category_id=category_id,
                document_id=document_id,
                front_text=f_data["front_text"],
                back_text=f_data["back_text"],
                difficulty=f_data.get("difficulty", "medium"),
                tags=f_data.get("tags", []),
            )
            db.add(flashcard)
            stored_flashcards.append(flashcard)

        logger.info(
            "flashcards_generated_and_stored",
            category_id=category_id,
            count=len(stored_flashcards),
        )

        result["stored_flashcards"] = stored_flashcards

    return result


# Singleton instance
generation_agent = GenerationAgent()
