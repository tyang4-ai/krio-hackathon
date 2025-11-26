"""
Quiz service - business logic for questions and quiz sessions.
"""
import random
from datetime import datetime
from typing import List, Optional, Dict, Any

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.question import Question
from models.quiz_session import QuizSession
from models.grading import ExamFocusEvent
from schemas.question import QuestionCreate, QuestionUpdate
from schemas.quiz import QuizSettings

logger = structlog.get_logger()


class QuizService:
    """Service for managing questions and quiz sessions."""

    # Quiz mode constants
    MODES = {"practice": "practice", "timed": "timed", "exam": "exam"}

    # ============== Question CRUD ==============

    async def create_question(
        self,
        db: AsyncSession,
        category_id: int,
        question_data: QuestionCreate,
    ) -> Question:
        """Create a new question."""
        question = Question(
            category_id=category_id,
            document_id=question_data.document_id,
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            difficulty=question_data.difficulty,
            options=question_data.options,
            correct_answer=question_data.correct_answer,
            explanation=question_data.explanation,
            tags=question_data.tags or [],
        )

        db.add(question)
        await db.flush()
        await db.refresh(question)

        logger.info("question_created", question_id=question.id, category_id=category_id)
        return question

    async def create_bulk_questions(
        self,
        db: AsyncSession,
        category_id: int,
        questions_data: List[QuestionCreate],
        document_id: Optional[int] = None,
    ) -> List[Question]:
        """Create multiple questions at once."""
        questions = []
        for data in questions_data:
            question = Question(
                category_id=category_id,
                document_id=document_id or data.document_id,
                question_text=data.question_text,
                question_type=data.question_type,
                difficulty=data.difficulty,
                options=data.options,
                correct_answer=data.correct_answer,
                explanation=data.explanation,
                tags=data.tags or [],
            )
            db.add(question)
            questions.append(question)

        await db.flush()
        for question in questions:
            await db.refresh(question)

        logger.info("questions_bulk_created", count=len(questions), category_id=category_id)
        return questions

    async def get_question_by_id(
        self,
        db: AsyncSession,
        question_id: int,
    ) -> Optional[Question]:
        """Get a question by ID."""
        result = await db.execute(select(Question).where(Question.id == question_id))
        return result.scalar_one_or_none()

    async def get_questions_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        difficulty: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> List[Question]:
        """Get all questions for a category with optional filters."""
        query = select(Question).where(Question.category_id == category_id)

        if difficulty:
            query = query.where(Question.difficulty == difficulty)

        query = query.order_by(Question.created_at.desc())
        result = await db.execute(query)
        questions = list(result.scalars().all())

        # Filter by tags if provided (JSON filtering done in Python)
        if tags:
            questions = [
                q for q in questions if q.tags and any(tag in q.tags for tag in tags)
            ]

        return questions

    async def update_question(
        self,
        db: AsyncSession,
        question_id: int,
        question_data: QuestionUpdate,
    ) -> Optional[Question]:
        """Update a question."""
        question = await self.get_question_by_id(db, question_id)
        if not question:
            return None

        update_data = question_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(question, field, value)

        await db.flush()
        await db.refresh(question)

        logger.info("question_updated", question_id=question_id)
        return question

    async def delete_question(
        self,
        db: AsyncSession,
        question_id: int,
    ) -> bool:
        """Delete a question."""
        question = await self.get_question_by_id(db, question_id)
        if not question:
            return False

        await db.delete(question)
        await db.flush()

        logger.info("question_deleted", question_id=question_id)
        return True

    async def rate_question(
        self,
        db: AsyncSession,
        question_id: int,
        rating: float,
    ) -> Optional[Question]:
        """Rate a question (1-5 stars)."""
        question = await self.get_question_by_id(db, question_id)
        if not question:
            return None

        question.rating = rating
        await db.flush()
        await db.refresh(question)

        logger.info("question_rated", question_id=question_id, rating=rating)
        return question

    async def get_question_stats(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> dict:
        """Get statistics for questions in a category."""
        # Total and by difficulty
        questions = await self.get_questions_by_category(db, category_id)

        stats = {
            "total": len(questions),
            "easy": sum(1 for q in questions if q.difficulty == "easy"),
            "medium": sum(1 for q in questions if q.difficulty == "medium"),
            "hard": sum(1 for q in questions if q.difficulty == "hard"),
            "by_type": {
                "multiple_choice": sum(1 for q in questions if q.question_type == "multiple_choice"),
                "true_false": sum(1 for q in questions if q.question_type == "true_false"),
                "written_answer": sum(1 for q in questions if q.question_type == "written_answer"),
                "fill_in_blank": sum(1 for q in questions if q.question_type == "fill_in_blank"),
            },
        }

        return stats

    # ============== Quiz Sessions ==============

    async def select_questions_for_quiz(
        self,
        db: AsyncSession,
        category_id: int,
        settings: QuizSettings,
    ) -> List[Question]:
        """Select questions for a quiz based on settings."""
        if settings.selection_mode == "custom":
            # Custom mode: get specific counts of each type
            selected_questions = []

            if settings.multiple_choice > 0:
                mc_questions = await self._get_questions_by_type_and_count(
                    db, category_id, "multiple_choice", settings.multiple_choice, settings.difficulty
                )
                selected_questions.extend(mc_questions)

            if settings.true_false > 0:
                tf_questions = await self._get_questions_by_type_and_count(
                    db, category_id, "true_false", settings.true_false, settings.difficulty
                )
                selected_questions.extend(tf_questions)

            if settings.written_answer > 0:
                wa_questions = await self._get_questions_by_type_and_count(
                    db, category_id, "written_answer", settings.written_answer, settings.difficulty
                )
                selected_questions.extend(wa_questions)

            if settings.fill_in_blank > 0:
                fib_questions = await self._get_questions_by_type_and_count(
                    db, category_id, "fill_in_blank", settings.fill_in_blank, settings.difficulty
                )
                selected_questions.extend(fib_questions)

            # Shuffle the combined array
            random.shuffle(selected_questions)
            return selected_questions
        else:
            # Mixed mode: get random questions from all types
            query = select(Question).where(Question.category_id == category_id)

            if settings.difficulty and settings.difficulty != "mixed":
                query = query.where(Question.difficulty == settings.difficulty)

            # Use PostgreSQL's random() for ordering
            query = query.order_by(func.random()).limit(settings.total_questions)

            result = await db.execute(query)
            return list(result.scalars().all())

    async def _get_questions_by_type_and_count(
        self,
        db: AsyncSession,
        category_id: int,
        question_type: str,
        count: int,
        difficulty: Optional[str] = None,
    ) -> List[Question]:
        """Get questions of a specific type with count limit."""
        query = (
            select(Question)
            .where(Question.category_id == category_id)
            .where(Question.question_type == question_type)
        )

        if difficulty and difficulty != "mixed":
            query = query.where(Question.difficulty == difficulty)

        query = query.order_by(func.random()).limit(count)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def create_quiz_session(
        self,
        db: AsyncSession,
        category_id: int,
        settings: QuizSettings,
    ) -> tuple[QuizSession, List[Question]]:
        """Create a new quiz session."""
        questions = await self.select_questions_for_quiz(db, category_id, settings)

        if not questions:
            raise ValueError("No questions available for quiz")

        session = QuizSession(
            category_id=category_id,
            settings=settings.model_dump(),
            questions=[q.id for q in questions],
            total_questions=len(questions),
        )

        db.add(session)
        await db.flush()
        await db.refresh(session)

        logger.info(
            "quiz_session_created",
            session_id=session.id,
            category_id=category_id,
            question_count=len(questions),
        )
        return session, questions

    async def get_quiz_session(
        self,
        db: AsyncSession,
        session_id: int,
    ) -> Optional[QuizSession]:
        """Get a quiz session by ID."""
        result = await db.execute(select(QuizSession).where(QuizSession.id == session_id))
        return result.scalar_one_or_none()

    async def submit_quiz_answers(
        self,
        db: AsyncSession,
        session_id: int,
        answers: Dict[str, str],
    ) -> dict:
        """Submit quiz answers and calculate score."""
        session = await self.get_quiz_session(db, session_id)
        if not session:
            raise ValueError("Quiz session not found")

        question_ids = session.questions
        results = []
        correct_count = 0

        for question_id in question_ids:
            question = await self.get_question_by_id(db, question_id)
            if not question:
                continue

            user_answer = answers.get(str(question_id), "")
            is_correct = user_answer == question.correct_answer

            if is_correct:
                correct_count += 1

            results.append({
                "question_id": question_id,
                "question_text": question.question_text,
                "user_answer": user_answer,
                "correct_answer": question.correct_answer,
                "is_correct": is_correct,
                "explanation": question.explanation,
                "options": question.options,
            })

        # Update session
        session.answers = answers
        session.score = correct_count
        session.completed = True
        session.completed_at = datetime.utcnow()

        await db.flush()
        await db.refresh(session)

        logger.info(
            "quiz_submitted",
            session_id=session_id,
            score=correct_count,
            total=len(question_ids),
        )

        return {
            "session_id": session_id,
            "score": correct_count,
            "total": len(question_ids),
            "percentage": round((correct_count / len(question_ids)) * 100) if question_ids else 0,
            "results": results,
        }

    async def get_quiz_history(
        self,
        db: AsyncSession,
        category_id: int,
        limit: int = 50,
    ) -> List[QuizSession]:
        """Get quiz history for a category."""
        result = await db.execute(
            select(QuizSession)
            .where(QuizSession.category_id == category_id)
            .where(QuizSession.completed == True)
            .order_by(QuizSession.completed_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # ============== Exam Mode - Focus Events ==============

    async def record_focus_event(
        self,
        db: AsyncSession,
        session_id: int,
        event_type: str,
        details: Optional[dict] = None,
    ) -> ExamFocusEvent:
        """Record a focus event for exam integrity tracking."""
        event = ExamFocusEvent(
            session_id=session_id,
            event_type=event_type,
            details=details,
        )

        db.add(event)
        await db.flush()
        await db.refresh(event)

        logger.info("focus_event_recorded", session_id=session_id, event_type=event_type)
        return event

    async def get_focus_events(
        self,
        db: AsyncSession,
        session_id: int,
    ) -> List[ExamFocusEvent]:
        """Get focus events for a session."""
        result = await db.execute(
            select(ExamFocusEvent)
            .where(ExamFocusEvent.session_id == session_id)
            .order_by(ExamFocusEvent.timestamp.asc())
        )
        return list(result.scalars().all())

    async def get_exam_integrity_report(
        self,
        db: AsyncSession,
        session_id: int,
    ) -> dict:
        """Get exam integrity report for a session."""
        events = await self.get_focus_events(db, session_id)

        focus_lost_count = sum(1 for e in events if e.event_type == "focus_lost")
        tab_switch_count = sum(1 for e in events if e.event_type == "tab_switch")
        window_blur_count = sum(1 for e in events if e.event_type == "window_blur")

        total_violations = focus_lost_count + tab_switch_count + window_blur_count

        return {
            "session_id": session_id,
            "total_violations": total_violations,
            "focus_lost_count": focus_lost_count,
            "tab_switch_count": tab_switch_count,
            "window_blur_count": window_blur_count,
            "integrity_score": max(0, 100 - total_violations * 5),
            "events": events,
        }


# Global service instance
quiz_service = QuizService()
