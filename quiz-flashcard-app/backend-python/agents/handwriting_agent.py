"""
Handwriting Agent - Processes handwritten PDF answers.

Responsibilities:
- Extract content from PDF files
- Recognize handwriting using AI vision
- Learn from user corrections
- Handle mathematical/chemical notation
"""
import json
import re
from io import BytesIO
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import HandwrittenAnswer, HandwritingCorrection, Question
from services.ai_service import ai_service

from .base_agent import AgentRole, BaseAgent

logger = structlog.get_logger()

HANDWRITING_SYSTEM_PROMPT = """You are a handwriting recognition specialist with expertise in:
1. Recognizing handwritten text from images
2. Understanding mathematical and scientific notation
3. Identifying formulas, equations, and symbols
4. Breaking answers into logical segments

Be thorough and provide confidence scores for uncertain text.
Handle subscripts, superscripts, Greek letters, and special symbols."""


class HandwritingAgent(BaseAgent):
    """
    Agent that processes handwritten answers.

    Uses OpenAI Vision to recognize handwriting from
    uploaded PDF/image files.
    """

    def __init__(self):
        """Initialize the Handwriting Agent."""
        super().__init__(
            role=AgentRole.HANDWRITING,
            system_prompt=HANDWRITING_SYSTEM_PROMPT,
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process handwritten content.

        Args:
            input_data: Dict containing:
                - image_data: Raw image bytes
                - question: Optional question context
                - learned_corrections: Previous corrections for this category

        Returns:
            Recognition result with text and confidence
        """
        image_data = input_data.get("image_data")
        question = input_data.get("question", {})
        learned_corrections = input_data.get("learned_corrections", [])

        if not image_data:
            return {
                "success": False,
                "error": "No image data provided",
            }

        logger.info(
            "handwriting_agent_processing",
            image_size=len(image_data),
            has_question=bool(question),
            corrections_count=len(learned_corrections),
        )

        try:
            # Build recognition prompt
            prompt = self._build_recognition_prompt(question, learned_corrections)

            # Use OpenAI Vision for recognition
            response = await ai_service.analyze_image(
                image_data=image_data,
                prompt=prompt,
                system_prompt=HANDWRITING_SYSTEM_PROMPT,
                max_tokens=2000,
            )

            result = self._parse_recognition_response(response)

            logger.info(
                "handwriting_recognition_complete",
                confidence=result.get("confidence", 0),
                segments=len(result.get("segments", [])),
            )

            return {
                "success": True,
                **result,
            }

        except Exception as e:
            logger.error("handwriting_recognition_error", error=str(e))
            return {
                "success": False,
                "error": f"Handwriting recognition failed: {str(e)}",
            }

    def _build_recognition_prompt(
        self,
        question: Dict[str, Any],
        learned_corrections: List[Dict[str, Any]],
    ) -> str:
        """Build the recognition prompt."""
        # Question context
        question_context = ""
        if question:
            question_context = f"""
Question Context:
- Question: {question.get('question_text', 'Unknown')}
- Type: {question.get('question_type', 'Unknown')}
- Subject: Based on content

This helps you understand what type of answer to expect.
"""

        # Learned corrections
        corrections_context = ""
        if learned_corrections:
            corrections_text = []
            for c in learned_corrections[:10]:  # Limit to 10 most recent
                corrections_text.append(
                    f"  - '{c.get('original')}' should be '{c.get('corrected')}'"
                )
            corrections_context = f"""
Previous Corrections (learn from these):
{chr(10).join(corrections_text)}

Apply these corrections to similar patterns in the current image.
"""

        return f"""Analyze this handwritten answer image and extract the text.
{question_context}
{corrections_context}

Instructions:
1. Carefully read all handwritten text in the image
2. Recognize mathematical formulas and scientific notation
3. Identify any diagrams or drawings and describe them
4. Break the answer into logical segments
5. Provide confidence scores for uncertain text

Respond with JSON:
{{
    "text": "The complete recognized text",
    "confidence": 0.85,
    "segments": [
        {{
            "text": "Segment text",
            "type": "equation|text|formula|diagram_description",
            "confidence": 0.9,
            "position": "beginning|middle|end"
        }}
    ],
    "suggestions": ["Alternative interpretation 1", "Alternative interpretation 2"],
    "subject_specific": {{
        "formulas_detected": ["E=mc²", "H₂O"],
        "units_detected": ["m/s", "kg"],
        "symbols_detected": ["√", "∫", "∑"]
    }}
}}"""

    def _parse_recognition_response(self, response: str) -> Dict[str, Any]:
        """Parse the AI recognition response."""
        # Try to extract JSON from response
        cleaned = self._clean_json_response(response)

        try:
            data = json.loads(cleaned)
            return {
                "text": data.get("text", ""),
                "confidence": data.get("confidence", 0.5),
                "segments": data.get("segments", []),
                "suggestions": data.get("suggestions", []),
                "subject_specific": data.get("subject_specific", {}),
            }

        except json.JSONDecodeError:
            # If JSON parsing fails, treat the whole response as text
            logger.warning(
                "handwriting_parse_fallback",
                response_preview=response[:100],
            )
            return {
                "text": response.strip(),
                "confidence": 0.5,
                "segments": [
                    {
                        "text": response.strip(),
                        "type": "text",
                        "confidence": 0.5,
                        "position": "full",
                    }
                ],
                "suggestions": [],
                "subject_specific": {},
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


async def process_handwritten_answer(
    db: AsyncSession,
    session_id: int,
    question_id: int,
    image_data: bytes,
    file_path: str,
    original_name: str,
) -> Dict[str, Any]:
    """
    Process a handwritten answer upload.

    Args:
        db: Database session
        session_id: Quiz session ID
        question_id: Question ID
        image_data: Image bytes
        file_path: Stored file path
        original_name: Original filename

    Returns:
        Recognition result
    """
    # Get question for context
    result = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    question = result.scalar_one_or_none()

    question_dict = {}
    category_id = None
    if question:
        question_dict = {
            "question_text": question.question_text,
            "question_type": question.question_type,
        }
        category_id = question.category_id

    # Get learned corrections for this category
    learned_corrections = []
    if category_id:
        corrections_result = await db.execute(
            select(HandwritingCorrection)
            .where(HandwritingCorrection.category_id == category_id)
            .order_by(HandwritingCorrection.created_at.desc())
            .limit(20)
        )
        corrections = corrections_result.scalars().all()
        learned_corrections = [
            {"original": c.original_text, "corrected": c.corrected_text}
            for c in corrections
        ]

    # Process with agent
    agent = HandwritingAgent()
    result = await agent.process({
        "image_data": image_data,
        "question": question_dict,
        "learned_corrections": learned_corrections,
    })

    if result.get("success"):
        # Store the handwritten answer
        handwritten = HandwrittenAnswer(
            session_id=session_id,
            question_id=question_id,
            file_path=file_path,
            original_name=original_name,
            recognized_text=result.get("text", ""),
            confidence_score=result.get("confidence", 0),
            user_corrections=[],
        )
        db.add(handwritten)

        logger.info(
            "handwritten_answer_stored",
            session_id=session_id,
            question_id=question_id,
            confidence=result.get("confidence"),
        )

        result["handwritten_id"] = handwritten.id

    return result


async def update_with_correction(
    db: AsyncSession,
    handwritten_id: int,
    corrected_text: str,
    corrections: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Update a handwritten answer with user corrections.

    Args:
        db: Database session
        handwritten_id: Handwritten answer ID
        corrected_text: User's corrected text
        corrections: List of specific corrections made

    Returns:
        Update result
    """
    # Get the handwritten answer
    result = await db.execute(
        select(HandwrittenAnswer).where(HandwrittenAnswer.id == handwritten_id)
    )
    handwritten = result.scalar_one_or_none()

    if not handwritten:
        return {
            "success": False,
            "error": f"Handwritten answer {handwritten_id} not found",
        }

    # Update the recognized text
    handwritten.recognized_text = corrected_text
    handwritten.user_corrections = corrections

    # Get the question to find category
    question_result = await db.execute(
        select(Question).where(Question.id == handwritten.question_id)
    )
    question = question_result.scalar_one_or_none()

    # Store corrections for learning
    if question and corrections:
        for correction in corrections:
            if correction.get("original") and correction.get("corrected"):
                learned = HandwritingCorrection(
                    category_id=question.category_id,
                    original_text=correction["original"],
                    corrected_text=correction["corrected"],
                    context=f"Question: {question.question_text[:100]}",
                )
                db.add(learned)

        logger.info(
            "handwriting_corrections_learned",
            category_id=question.category_id,
            corrections_count=len(corrections),
        )

    return {
        "success": True,
        "message": "Correction applied and learned",
    }


async def get_handwritten_answer(
    db: AsyncSession,
    handwritten_id: int,
) -> Optional[Dict[str, Any]]:
    """Get a handwritten answer by ID."""
    result = await db.execute(
        select(HandwrittenAnswer).where(HandwrittenAnswer.id == handwritten_id)
    )
    handwritten = result.scalar_one_or_none()

    if not handwritten:
        return None

    return {
        "id": handwritten.id,
        "session_id": handwritten.session_id,
        "question_id": handwritten.question_id,
        "file_path": handwritten.file_path,
        "original_name": handwritten.original_name,
        "recognized_text": handwritten.recognized_text,
        "confidence_score": handwritten.confidence_score,
        "user_corrections": handwritten.user_corrections,
        "created_at": handwritten.created_at.isoformat(),
    }


async def get_session_handwritten_answers(
    db: AsyncSession,
    session_id: int,
) -> List[Dict[str, Any]]:
    """Get all handwritten answers for a session."""
    result = await db.execute(
        select(HandwrittenAnswer).where(HandwrittenAnswer.session_id == session_id)
    )
    answers = result.scalars().all()

    return [
        {
            "id": a.id,
            "session_id": a.session_id,
            "question_id": a.question_id,
            "file_path": a.file_path,
            "original_name": a.original_name,
            "recognized_text": a.recognized_text,
            "confidence_score": a.confidence_score,
            "user_corrections": a.user_corrections,
            "created_at": a.created_at.isoformat(),
        }
        for a in answers
    ]


# Singleton instance
handwriting_agent = HandwritingAgent()
