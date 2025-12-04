"""
Controller Agent - Orchestrates the multi-agent system.

Responsibilities:
- Route requests to appropriate agents
- Coordinate analysis and generation workflows
- Manage agent communication
- Track agent activity
"""
from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    AIAnalysisResult,
    AgentMessage as AgentMessageModel,
    Document,
    SampleQuestion,
)

from .analysis_agent import analyze_samples, clear_analysis, get_analysis_status
from .base_agent import AgentRole, BaseAgent
from .generation_agent import generate_flashcards, generate_questions
from .grading_agent import grade_answer, get_session_grades
from .handwriting_agent import (
    get_handwritten_answer,
    get_session_handwritten_answers,
    process_handwritten_answer,
    update_with_correction,
)

logger = structlog.get_logger()


class ControllerAgent(BaseAgent):
    """
    Main controller that orchestrates the multi-agent system.

    Routes requests to appropriate agents and coordinates
    complex workflows like analysis-then-generation.
    """

    def __init__(self):
        """Initialize the Controller Agent."""
        super().__init__(
            role=AgentRole.CONTROLLER,
            system_prompt="You are the controller agent coordinating AI operations.",
        )

    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request by routing to appropriate agent.

        Args:
            input_data: Dict containing:
                - action: The action to perform
                - ... action-specific parameters

        Returns:
            Result from the appropriate agent
        """
        action = input_data.get("action")

        if not action:
            return {
                "success": False,
                "error": "No action specified",
            }

        logger.info("controller_routing", action=action)

        # Route to appropriate handler
        handlers = {
            "analyze": self._handle_analyze,
            "generate_questions": self._handle_generate_questions,
            "generate_flashcards": self._handle_generate_flashcards,
            "grade_answer": self._handle_grade_answer,
            "process_handwriting": self._handle_handwriting,
        }

        handler = handlers.get(action)
        if not handler:
            return {
                "success": False,
                "error": f"Unknown action: {action}",
            }

        return await handler(input_data)

    async def _handle_analyze(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle analysis request."""
        db = input_data.get("db")
        category_id = input_data.get("category_id")
        force = input_data.get("force", False)

        if not db or not category_id:
            return {"success": False, "error": "Missing db or category_id"}

        return await analyze_samples(db, category_id, force)

    async def _handle_generate_questions(
        self, input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle question generation request."""
        db = input_data.get("db")
        category_id = input_data.get("category_id")
        content = input_data.get("content")
        count = input_data.get("count", 5)
        difficulty = input_data.get("difficulty", "medium")
        question_type = input_data.get("question_type", "multiple_choice")
        custom_directions = input_data.get("custom_directions", "")
        document_id = input_data.get("document_id")

        if not db or not category_id or not content:
            return {"success": False, "error": "Missing required parameters"}

        return await generate_questions(
            db=db,
            category_id=category_id,
            content=content,
            count=count,
            difficulty=difficulty,
            question_type=question_type,
            custom_directions=custom_directions,
            document_id=document_id,
        )

    async def _handle_generate_flashcards(
        self, input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle flashcard generation request."""
        db = input_data.get("db")
        category_id = input_data.get("category_id")
        content = input_data.get("content")
        count = input_data.get("count", 10)
        custom_directions = input_data.get("custom_directions", "")
        document_id = input_data.get("document_id")

        if not db or not category_id or not content:
            return {"success": False, "error": "Missing required parameters"}

        return await generate_flashcards(
            db=db,
            category_id=category_id,
            content=content,
            count=count,
            custom_directions=custom_directions,
            document_id=document_id,
        )

    async def _handle_grade_answer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle grading request."""
        db = input_data.get("db")
        session_id = input_data.get("session_id")
        question_id = input_data.get("question_id")
        user_answer = input_data.get("user_answer")
        use_partial_credit = input_data.get("use_partial_credit", True)

        if not all([db, session_id, question_id, user_answer]):
            return {"success": False, "error": "Missing required parameters"}

        return await grade_answer(
            db=db,
            session_id=session_id,
            question_id=question_id,
            user_answer=user_answer,
            use_partial_credit=use_partial_credit,
        )

    async def _handle_handwriting(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle handwriting processing request."""
        db = input_data.get("db")
        session_id = input_data.get("session_id")
        question_id = input_data.get("question_id")
        image_data = input_data.get("image_data")
        file_path = input_data.get("file_path")
        original_name = input_data.get("original_name")

        if not all([db, session_id, question_id, image_data]):
            return {"success": False, "error": "Missing required parameters"}

        return await process_handwritten_answer(
            db=db,
            session_id=session_id,
            question_id=question_id,
            image_data=image_data,
            file_path=file_path or "",
            original_name=original_name or "handwritten.pdf",
        )


async def trigger_analysis(
    db: AsyncSession,
    category_id: int,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Trigger analysis of sample questions.

    This is the main entry point for the analysis workflow.
    """
    # Log the action
    agent_msg = AgentMessageModel(
        category_id=category_id,
        from_agent="controller",
        to_agent="analysis_agent",
        message_type="analyze_request",
        payload={"force": force},
        status="pending",
    )
    db.add(agent_msg)

    # Run analysis
    result = await analyze_samples(db, category_id, force)

    # Update message status
    agent_msg.status = "processed"

    return result


async def get_agent_activity(
    db: AsyncSession,
    category_id: int,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Get recent agent activity for a category.

    Returns the inter-agent message log.
    """
    result = await db.execute(
        select(AgentMessageModel)
        .where(AgentMessageModel.category_id == category_id)
        .order_by(AgentMessageModel.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()

    return [
        {
            "id": m.id,
            "from_agent": m.from_agent,
            "to_agent": m.to_agent,
            "message_type": m.message_type,
            "payload": m.payload,
            "status": m.status,
            "created_at": m.created_at.isoformat(),
            "processed_at": m.processed_at.isoformat() if m.processed_at else None,
        }
        for m in messages
    ]


async def get_system_stats(
    db: AsyncSession,
    category_id: int,
) -> Dict[str, Any]:
    """
    Get overall AI system statistics for a category.
    """
    # Count sample questions
    samples_result = await db.execute(
        select(func.count(SampleQuestion.id)).where(
            SampleQuestion.category_id == category_id
        )
    )
    sample_count = samples_result.scalar() or 0

    # Count documents
    docs_result = await db.execute(
        select(func.count(Document.id)).where(Document.category_id == category_id)
    )
    doc_count = docs_result.scalar() or 0

    # Check analysis status
    analysis_result = await db.execute(
        select(AIAnalysisResult).where(AIAnalysisResult.category_id == category_id)
    )
    analysis = analysis_result.scalar_one_or_none()

    # Count agent messages
    messages_result = await db.execute(
        select(func.count(AgentMessageModel.id)).where(
            AgentMessageModel.category_id == category_id
        )
    )
    message_count = messages_result.scalar() or 0

    return {
        "category_id": category_id,
        "sample_questions": sample_count,
        "documents": doc_count,
        "has_analysis": analysis is not None,
        "analysis_updated_at": analysis.updated_at.isoformat() if analysis else None,
        "agent_messages": message_count,
    }


async def generate_from_documents(
    db: AsyncSession,
    category_id: int,
    document_ids: Optional[List[int]] = None,
    count: int = 10,
    difficulty: str = "medium",
    question_type: str = "multiple_choice",
    custom_directions: str = "",
    chapter: str = "",
    use_rag: bool = False,
    validate: bool = False,
) -> Dict[str, Any]:
    """
    Generate questions from category documents.

    Args:
        db: Database session
        category_id: Category ID
        document_ids: Optional specific documents (None = all)
        count: Number of questions to generate
        difficulty: Difficulty level
        question_type: Question type
        custom_directions: Additional instructions
        chapter: Optional chapter/topic to tag questions with
        use_rag: Whether to use RAG for context retrieval (Phase 3)
        validate: Whether to validate and score questions (Phase 3)

    Returns:
        Generation result
    """
    # Get documents - filter by chapter if specified
    query = select(Document).where(Document.category_id == category_id)
    if document_ids:
        query = query.where(Document.id.in_(document_ids))

    # Filter by chapter if specified - only use documents from that chapter
    if chapter:
        query = query.where(Document.chapter == chapter)

    result = await db.execute(query)
    documents = result.scalars().all()

    if not documents:
        error_msg = "No documents found"
        if chapter:
            error_msg = f"No documents found for chapter '{chapter}'. Upload documents with this chapter tag or select a different chapter."
        return {
            "success": False,
            "error": error_msg,
        }

    # Combine document content (use content_text and original_name from Document model)
    combined_content = "\n\n".join(
        [f"--- {doc.original_name} ---\n{doc.content_text}" for doc in documents if doc.content_text]
    )

    if not combined_content.strip():
        return {
            "success": False,
            "error": "Documents have not been processed yet. Please wait for processing to complete.",
        }

    # Generate questions
    return await generate_questions(
        db=db,
        category_id=category_id,
        content=combined_content,
        count=count,
        difficulty=difficulty,
        question_type=question_type,
        custom_directions=custom_directions,
        document_id=documents[0].id if len(documents) == 1 else None,
        chapter=chapter,
        use_rag=use_rag,
        validate=validate,
        document_ids=document_ids or [d.id for d in documents],
    )


# Singleton instance
controller_agent = ControllerAgent()
