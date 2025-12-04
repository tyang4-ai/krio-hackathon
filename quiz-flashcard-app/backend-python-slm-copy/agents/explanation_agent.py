"""
Explanation Agent - Provides AI-powered explanations for quiz questions.

This agent helps students understand:
- Why an answer is correct/incorrect
- The underlying concepts
- Related topics and connections
- Step-by-step reasoning

Phase 4: Uses SLM (70B) for short explanations to reduce cost.
"""
from typing import Any, Dict, List, Optional

import structlog

from services.ai_service import ai_service
from services.task_router import task_router, TaskType

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

EXPLANATION_SYSTEM_PROMPT = """You are an expert tutor helping students understand quiz questions and answers.

Your role is to:
1. Explain WHY the correct answer is correct
2. Explain WHY incorrect answers are wrong (if applicable)
3. Break down complex concepts into simple terms
4. Provide relevant examples or analogies
5. Connect the topic to broader concepts when helpful
6. Be encouraging and supportive

Guidelines:
- Keep explanations clear and concise (2-4 paragraphs typically)
- Use simple language, avoiding unnecessary jargon
- If the student asks follow-up questions, build on previous explanations
- Be patient and thorough
- If you're unsure about something, acknowledge it

Format your responses in a conversational, helpful tone."""


class ExplanationAgent(BaseAgent):
    """Agent for providing detailed explanations of quiz questions."""

    def __init__(self):
        super().__init__(
            role=AgentRole.GRADING,  # Reusing GRADING role since it's similar
            system_prompt=EXPLANATION_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an explanation request.

        Args:
            input_data: Contains question details and user query

        Returns:
            Explanation response
        """
        question_text = input_data.get("question_text", "")
        question_type = input_data.get("question_type", "multiple_choice")
        options = input_data.get("options", [])
        correct_answer = input_data.get("correct_answer", "")
        user_answer = input_data.get("user_answer", "")
        existing_explanation = input_data.get("explanation", "")
        user_query = input_data.get("user_query", "")
        conversation_history = input_data.get("conversation_history", [])

        # Build the context prompt
        prompt = self._build_prompt(
            question_text=question_text,
            question_type=question_type,
            options=options,
            correct_answer=correct_answer,
            user_answer=user_answer,
            existing_explanation=existing_explanation,
            user_query=user_query,
            conversation_history=conversation_history,
        )

        # Phase 4: Determine if we should use SLM for this explanation
        # Use SLM for short, simple queries without complex conversation history
        is_short_query = len(user_query) < 100 and len(conversation_history) <= 2
        use_slm = is_short_query and task_router.should_use_slm(TaskType.SHORT_EXPLANATION)

        try:
            if use_slm:
                # Use SLM (Groq 70B) for short explanations - faster and cheaper
                task_router.log_routing_decision(
                    TaskType.SHORT_EXPLANATION,
                    context=f"query_len={len(user_query)}, history_len={len(conversation_history)}",
                )
                response = await ai_service.generate_with_slm(
                    prompt=prompt,
                    system_prompt=EXPLANATION_SYSTEM_PROMPT,
                    max_tokens=1024,
                    temperature=0.7,
                    use_large_model=True,  # Use 70B model for better explanations
                    json_mode=False,
                )
                logger.info(
                    "explanation_generated_with_slm",
                    model="groq_70b",
                    query_length=len(user_query),
                )
            else:
                # Use Claude for complex explanations or long conversations
                response = await self.generate(
                    prompt=prompt,
                    max_tokens=1024,
                    temperature=0.7,
                )

            return {
                "success": True,
                "explanation": response.strip(),
                "used_slm": use_slm,
            }
        except Exception as e:
            logger.error("explanation_generation_failed", error=str(e))
            return {
                "success": False,
                "error": f"Failed to generate explanation: {str(e)}",
            }

    def _build_prompt(
        self,
        question_text: str,
        question_type: str,
        options: List[str],
        correct_answer: str,
        user_answer: str,
        existing_explanation: str,
        user_query: str,
        conversation_history: List[Dict[str, str]],
    ) -> str:
        """Build the prompt for explanation generation."""
        prompt_parts = []

        # Question context
        prompt_parts.append(f"QUESTION: {question_text}")
        prompt_parts.append(f"Question Type: {question_type}")

        if options:
            prompt_parts.append("OPTIONS:")
            for opt in options:
                prompt_parts.append(f"  {opt}")

        prompt_parts.append(f"CORRECT ANSWER: {correct_answer}")

        if user_answer:
            is_correct = self._check_answer(user_answer, correct_answer)
            prompt_parts.append(f"STUDENT'S ANSWER: {user_answer}")
            prompt_parts.append(f"RESULT: {'Correct' if is_correct else 'Incorrect'}")

        if existing_explanation:
            prompt_parts.append(f"EXISTING EXPLANATION: {existing_explanation}")

        # Add conversation history if present
        if conversation_history:
            prompt_parts.append("\nPREVIOUS CONVERSATION:")
            for msg in conversation_history[-6:]:  # Last 6 messages for context
                role = "Student" if msg.get("role") == "user" else "Tutor"
                prompt_parts.append(f"{role}: {msg.get('content', '')}")

        # Current query
        prompt_parts.append(f"\nSTUDENT'S QUESTION: {user_query}")
        prompt_parts.append("\nPlease provide a helpful explanation:")

        return "\n".join(prompt_parts)

    def _check_answer(self, user_answer: str, correct_answer: str) -> bool:
        """Check if the user's answer matches the correct answer."""
        if not user_answer or not correct_answer:
            return False

        # Normalize for comparison
        user_norm = user_answer.strip().upper()
        correct_norm = correct_answer.strip().upper()

        # Handle letter answers (A, B, C, D)
        if len(user_norm) == 1 and user_norm.isalpha():
            if len(correct_norm) == 1:
                return user_norm == correct_norm
            # Check if correct answer starts with the letter
            if correct_norm.startswith(user_norm):
                return True

        return user_norm == correct_norm


# Singleton instance
_explanation_agent: Optional[ExplanationAgent] = None


def get_explanation_agent() -> ExplanationAgent:
    """Get or create the explanation agent singleton."""
    global _explanation_agent
    if _explanation_agent is None:
        _explanation_agent = ExplanationAgent()
    return _explanation_agent


async def explain_question(
    question_text: str,
    correct_answer: str,
    user_query: str,
    question_type: str = "multiple_choice",
    options: List[str] = None,
    user_answer: str = None,
    explanation: str = None,
    conversation_history: List[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Generate an explanation for a quiz question.

    Args:
        question_text: The question text
        correct_answer: The correct answer
        user_query: What the student wants explained
        question_type: Type of question
        options: Answer options (for multiple choice)
        user_answer: What the student answered
        explanation: Any existing explanation
        conversation_history: Previous messages in the conversation

    Returns:
        Dict with success status and explanation
    """
    agent = get_explanation_agent()

    return await agent.process({
        "question_text": question_text,
        "correct_answer": correct_answer,
        "user_query": user_query,
        "question_type": question_type,
        "options": options or [],
        "user_answer": user_answer or "",
        "explanation": explanation or "",
        "conversation_history": conversation_history or [],
    })
