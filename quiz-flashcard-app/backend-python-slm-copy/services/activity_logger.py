"""
Activity logging service for tracking user actions.

Provides structured logging for user activities such as:
- Quiz sessions
- Flashcard reviews
- Document uploads
- Content generation
"""
from datetime import datetime
from typing import Any, Dict, Optional

import structlog

logger = structlog.get_logger()


class ActivityLogger:
    """
    Centralized activity logging service.

    Logs user activities with consistent structure for analytics and debugging.
    """

    @staticmethod
    def log_quiz_started(
        user_id: Optional[int],
        category_id: int,
        session_id: int,
        question_count: int,
        difficulty: Optional[str] = None,
    ) -> None:
        """Log when a user starts a quiz."""
        logger.info(
            "activity_quiz_started",
            user_id=user_id,
            category_id=category_id,
            session_id=session_id,
            question_count=question_count,
            difficulty=difficulty,
            activity_type="quiz_start",
        )

    @staticmethod
    def log_quiz_completed(
        user_id: Optional[int],
        category_id: int,
        session_id: int,
        score: float,
        total_questions: int,
        correct_answers: int,
        duration_seconds: Optional[int] = None,
    ) -> None:
        """Log when a user completes a quiz."""
        logger.info(
            "activity_quiz_completed",
            user_id=user_id,
            category_id=category_id,
            session_id=session_id,
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            duration_seconds=duration_seconds,
            activity_type="quiz_complete",
        )

    @staticmethod
    def log_question_answered(
        user_id: Optional[int],
        session_id: int,
        question_id: int,
        is_correct: bool,
        question_type: str,
        time_spent_seconds: Optional[int] = None,
    ) -> None:
        """Log when a user answers a question."""
        logger.debug(
            "activity_question_answered",
            user_id=user_id,
            session_id=session_id,
            question_id=question_id,
            is_correct=is_correct,
            question_type=question_type,
            time_spent_seconds=time_spent_seconds,
            activity_type="question_answer",
        )

    @staticmethod
    def log_flashcard_reviewed(
        user_id: Optional[int],
        category_id: int,
        flashcard_id: int,
        confidence_level: float,
        next_review_days: int,
    ) -> None:
        """Log when a user reviews a flashcard."""
        logger.debug(
            "activity_flashcard_reviewed",
            user_id=user_id,
            category_id=category_id,
            flashcard_id=flashcard_id,
            confidence_level=confidence_level,
            next_review_days=next_review_days,
            activity_type="flashcard_review",
        )

    @staticmethod
    def log_content_generated(
        user_id: Optional[int],
        category_id: int,
        content_type: str,  # "questions" or "flashcards"
        count: int,
        difficulty: Optional[str] = None,
        source: str = "documents",  # "documents", "content", "ai"
    ) -> None:
        """Log when content is generated."""
        logger.info(
            "activity_content_generated",
            user_id=user_id,
            category_id=category_id,
            content_type=content_type,
            count=count,
            difficulty=difficulty,
            source=source,
            activity_type="content_generation",
        )

    @staticmethod
    def log_document_uploaded(
        user_id: Optional[int],
        category_id: int,
        document_id: int,
        file_type: str,
        file_size_bytes: int,
        chapter: Optional[str] = None,
    ) -> None:
        """Log when a document is uploaded."""
        logger.info(
            "activity_document_uploaded",
            user_id=user_id,
            category_id=category_id,
            document_id=document_id,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            chapter=chapter,
            activity_type="document_upload",
        )

    @staticmethod
    def log_analysis_triggered(
        user_id: Optional[int],
        category_id: int,
        sample_count: int,
        from_cache: bool = False,
    ) -> None:
        """Log when sample question analysis is triggered."""
        logger.info(
            "activity_analysis_triggered",
            user_id=user_id,
            category_id=category_id,
            sample_count=sample_count,
            from_cache=from_cache,
            activity_type="analysis",
        )

    @staticmethod
    def log_user_login(
        user_id: int,
        email: str,
        provider: str = "google",
        is_new_user: bool = False,
    ) -> None:
        """Log when a user logs in."""
        logger.info(
            "activity_user_login",
            user_id=user_id,
            email=email,
            provider=provider,
            is_new_user=is_new_user,
            activity_type="login",
        )

    @staticmethod
    def log_category_created(
        user_id: Optional[int],
        category_id: int,
        name: str,
    ) -> None:
        """Log when a category is created."""
        logger.info(
            "activity_category_created",
            user_id=user_id,
            category_id=category_id,
            name=name,
            activity_type="category_create",
        )

    @staticmethod
    def log_error(
        error_type: str,
        error_message: str,
        user_id: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log an error with context."""
        logger.error(
            "activity_error",
            error_type=error_type,
            error_message=error_message,
            user_id=user_id,
            context=context or {},
            activity_type="error",
        )


# Singleton instance
activity_logger = ActivityLogger()
