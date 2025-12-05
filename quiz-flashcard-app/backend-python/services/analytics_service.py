"""
Analytics service for generating learning insights.

Provides aggregation queries for:
- Overall performance metrics
- Per-category analytics
- Time-based trends
- Question difficulty analysis
- AI-powered learning score calculation
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import func, case, and_, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models import QuestionAttempt, Question, Category, QuizSession, User
from models.flashcard import Flashcard


class AnalyticsService:
    """Service for computing analytics from question attempts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_overview(
        self, user_id: Optional[int] = None, days: int = 30, category_id: Optional[int] = None
    ) -> dict:
        """
        Get overall analytics for a user (or all users if user_id is None).

        Returns:
            - total_attempts: Total questions attempted
            - correct_count: Number of correct answers
            - accuracy: Overall accuracy percentage
            - total_time_spent: Total time in minutes
            - avg_time_per_question: Average seconds per question
            - sessions_completed: Number of quiz sessions
            - streak_days: Current study streak
        """
        since_date = datetime.utcnow() - timedelta(days=days)

        # Base query
        query = select(
            func.count(QuestionAttempt.id).label("total_attempts"),
            func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct_count"),
            func.sum(QuestionAttempt.time_spent_seconds).label("total_time"),
            func.avg(QuestionAttempt.time_spent_seconds).label("avg_time"),
        ).where(QuestionAttempt.answered_at >= since_date)

        # Include guest users (user_id=NULL) when no specific user is requested
        # or when user_id=None is explicitly passed (guest session)
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            # For guest/anonymous: include records where user_id IS NULL
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        row = result.one()

        total_attempts = row.total_attempts or 0
        correct_count = row.correct_count or 0
        total_time = row.total_time or 0
        avg_time = row.avg_time or 0

        # Count completed sessions
        sessions_query = select(func.count(QuizSession.id)).where(
            and_(
                QuizSession.completed == True,
                QuizSession.completed_at >= since_date,
            )
        )
        if category_id:
            sessions_query = sessions_query.where(QuizSession.category_id == category_id)
        sessions_result = await self.db.execute(sessions_query)
        sessions_completed = sessions_result.scalar() or 0

        # Calculate streak (days with at least one attempt)
        streak = await self._calculate_streak(user_id, category_id)

        return {
            "total_attempts": total_attempts,
            "correct_count": correct_count,
            "accuracy": round((correct_count / total_attempts * 100) if total_attempts > 0 else 0, 1),
            "total_time_minutes": round(total_time / 60, 1) if total_time else 0,
            "avg_time_per_question": round(avg_time, 1) if avg_time else 0,
            "sessions_completed": sessions_completed,
            "streak_days": streak,
            "period_days": days,
        }

    async def get_category_performance(
        self, user_id: Optional[int] = None, category_id: Optional[int] = None
    ) -> list[dict]:
        """
        Get performance breakdown by category.

        Returns list of categories with:
            - category_id, category_name, color
            - total_attempts, correct_count, accuracy
            - avg_time, mastery_score
        """
        query = (
            select(
                Category.id,
                Category.name,
                Category.color,
                func.count(QuestionAttempt.id).label("total_attempts"),
                func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct_count"),
                func.avg(QuestionAttempt.time_spent_seconds).label("avg_time"),
            )
            .join(QuestionAttempt, QuestionAttempt.category_id == Category.id)
            .group_by(Category.id, Category.name, Category.color)
            .order_by(desc("total_attempts"))
        )

        # Include guest users when user_id is None
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "category_id": row.id,
                "category_name": row.name,
                "color": row.color,
                "total_attempts": row.total_attempts,
                "correct_count": row.correct_count or 0,
                "accuracy": round(
                    (row.correct_count / row.total_attempts * 100)
                    if row.total_attempts > 0
                    else 0,
                    1,
                ),
                "avg_time": round(row.avg_time, 1) if row.avg_time else 0,
                "mastery_score": self._calculate_mastery(
                    row.total_attempts, row.correct_count or 0
                ),
            }
            for row in rows
        ]

    async def get_difficulty_breakdown(
        self, user_id: Optional[int] = None, category_id: Optional[int] = None
    ) -> dict:
        """
        Get performance by difficulty level.

        Returns dict with easy/medium/hard breakdowns.
        """
        query = (
            select(
                QuestionAttempt.difficulty,
                func.count(QuestionAttempt.id).label("total"),
                func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct"),
            )
            .group_by(QuestionAttempt.difficulty)
        )

        # Include guest users when user_id is None
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        rows = result.all()

        breakdown = {}
        for row in rows:
            breakdown[row.difficulty] = {
                "total": row.total,
                "correct": row.correct or 0,
                "accuracy": round(
                    (row.correct / row.total * 100) if row.total > 0 else 0, 1
                ),
            }

        return breakdown

    async def get_question_type_breakdown(
        self, user_id: Optional[int] = None, category_id: Optional[int] = None
    ) -> dict:
        """
        Get performance by question type.

        Returns dict with multiple_choice/true_false/written/fill_in_blank breakdowns.
        """
        query = (
            select(
                QuestionAttempt.question_type,
                func.count(QuestionAttempt.id).label("total"),
                func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct"),
                func.avg(QuestionAttempt.time_spent_seconds).label("avg_time"),
            )
            .group_by(QuestionAttempt.question_type)
        )

        # Include guest users when user_id is None
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        rows = result.all()

        breakdown = {}
        for row in rows:
            breakdown[row.question_type] = {
                "total": row.total,
                "correct": row.correct or 0,
                "accuracy": round(
                    (row.correct / row.total * 100) if row.total > 0 else 0, 1
                ),
                "avg_time": round(row.avg_time, 1) if row.avg_time else 0,
            }

        return breakdown

    async def get_trend_data(
        self,
        user_id: Optional[int] = None,
        category_id: Optional[int] = None,
        days: int = 30,
        granularity: str = "day",  # day, week, month
    ) -> list[dict]:
        """
        Get performance trend over time.

        Returns list of data points with:
            - date, attempts, correct, accuracy
        """
        since_date = datetime.utcnow() - timedelta(days=days)

        # Use date_trunc for grouping
        if granularity == "week":
            date_field = func.date_trunc("week", QuestionAttempt.answered_at)
        elif granularity == "month":
            date_field = func.date_trunc("month", QuestionAttempt.answered_at)
        else:
            date_field = func.date_trunc("day", QuestionAttempt.answered_at)

        query = (
            select(
                date_field.label("period"),
                func.count(QuestionAttempt.id).label("attempts"),
                func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct"),
            )
            .where(QuestionAttempt.answered_at >= since_date)
            .group_by(date_field)
            .order_by(date_field)
        )

        # Include guest users when user_id is None
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "date": row.period.isoformat() if row.period else None,
                "attempts": row.attempts,
                "correct": row.correct or 0,
                "accuracy": round(
                    (row.correct / row.attempts * 100) if row.attempts > 0 else 0, 1
                ),
            }
            for row in rows
        ]

    async def get_hardest_questions(
        self,
        user_id: Optional[int] = None,
        category_id: Optional[int] = None,
        limit: int = 10,
    ) -> list[dict]:
        """
        Get questions with lowest accuracy.

        Returns questions user struggles with most.
        """
        query = (
            select(
                Question.id,
                Question.category_id,
                Question.question_text,
                Question.question_type,
                Question.difficulty,
                func.count(QuestionAttempt.id).label("attempts"),
                func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct"),
            )
            .join(QuestionAttempt, QuestionAttempt.question_id == Question.id)
            .group_by(Question.id, Question.category_id, Question.question_text, Question.question_type, Question.difficulty)
            .having(func.count(QuestionAttempt.id) >= 2)  # At least 2 attempts
            .order_by(
                (func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)) * 1.0 /
                 func.count(QuestionAttempt.id))
            )
            .limit(limit)
        )

        # Include guest users when user_id is None
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "question_id": row.id,
                "category_id": row.category_id,
                "question_text": row.question_text[:100] + "..." if len(row.question_text) > 100 else row.question_text,
                "question_type": row.question_type,
                "difficulty": row.difficulty,
                "attempts": row.attempts,
                "correct": row.correct or 0,
                "accuracy": round(
                    (row.correct / row.attempts * 100) if row.attempts > 0 else 0, 1
                ),
            }
            for row in rows
        ]

    async def calculate_learning_score(
        self, user_id: Optional[int] = None, category_id: Optional[int] = None
    ) -> dict:
        """
        Calculate AI-style learning score (0-100).

        Factors:
        - Accuracy (40%)
        - Consistency/streak (20%)
        - Improvement trend (20%)
        - Difficulty progression (20%)
        """
        # Get recent performance (filtered by category if specified)
        overview = await self.get_user_overview(user_id, days=30, category_id=category_id)
        trend = await self.get_trend_data(user_id, category_id, days=14)
        difficulty = await self.get_difficulty_breakdown(user_id, category_id)

        # Accuracy score (0-40)
        accuracy_score = min(40, overview["accuracy"] * 0.4)

        # Consistency score (0-20) based on streak
        streak = overview["streak_days"]
        consistency_score = min(20, streak * 2)

        # Improvement score (0-20) - compare first half vs second half of trend
        improvement_score = 0
        if len(trend) >= 4:
            mid = len(trend) // 2
            first_half_acc = sum(t["accuracy"] for t in trend[:mid]) / mid if mid > 0 else 0
            second_half_acc = sum(t["accuracy"] for t in trend[mid:]) / (len(trend) - mid) if len(trend) - mid > 0 else 0
            if second_half_acc > first_half_acc:
                improvement_score = min(20, (second_half_acc - first_half_acc) * 0.5)

        # Difficulty progression score (0-20)
        difficulty_score = 0
        hard_data = difficulty.get("hard", {})
        medium_data = difficulty.get("medium", {})
        if hard_data.get("total", 0) > 0:
            # Bonus for attempting hard questions
            difficulty_score += 10
            if hard_data.get("accuracy", 0) > 50:
                difficulty_score += 10

        total_score = accuracy_score + consistency_score + improvement_score + difficulty_score

        return {
            "total_score": round(total_score, 1),
            "accuracy_score": round(accuracy_score, 1),
            "consistency_score": round(consistency_score, 1),
            "improvement_score": round(improvement_score, 1),
            "difficulty_score": round(difficulty_score, 1),
            "grade": self._score_to_grade(total_score),
            "recommendation": self._get_recommendation(
                overview["accuracy"],
                streak,
                difficulty,
            ),
        }

    async def _calculate_streak(self, user_id: Optional[int] = None, category_id: Optional[int] = None) -> int:
        """Calculate current study streak in days."""
        query = (
            select(func.date_trunc("day", QuestionAttempt.answered_at).label("study_date"))
            .distinct()
            .order_by(desc("study_date"))
        )

        # Include guest users when user_id is None
        if user_id:
            query = query.where(QuestionAttempt.user_id == user_id)
        else:
            query = query.where(QuestionAttempt.user_id.is_(None))
        if category_id:
            query = query.where(QuestionAttempt.category_id == category_id)

        result = await self.db.execute(query)
        dates = [row.study_date.date() for row in result.all() if row.study_date]

        if not dates:
            return 0

        today = datetime.utcnow().date()
        streak = 0

        for i, date in enumerate(dates):
            expected_date = today - timedelta(days=i)
            if date == expected_date:
                streak += 1
            else:
                break

        return streak

    def _calculate_mastery(self, attempts: int, correct: int) -> int:
        """Calculate mastery level 0-5 based on attempts and accuracy."""
        if attempts == 0:
            return 0

        accuracy = correct / attempts
        # Need both accuracy AND volume
        if attempts < 5:
            return min(2, int(accuracy * 3))
        elif attempts < 20:
            return min(4, int(accuracy * 5))
        else:
            return int(accuracy * 5)

    def _score_to_grade(self, score: float) -> str:
        """Convert score to letter grade."""
        if score >= 90:
            return "A+"
        elif score >= 85:
            return "A"
        elif score >= 80:
            return "A-"
        elif score >= 75:
            return "B+"
        elif score >= 70:
            return "B"
        elif score >= 65:
            return "B-"
        elif score >= 60:
            return "C+"
        elif score >= 55:
            return "C"
        elif score >= 50:
            return "C-"
        elif score >= 45:
            return "D"
        else:
            return "F"

    def _get_recommendation(
        self, accuracy: float, streak: int, difficulty: dict
    ) -> str:
        """Generate personalized recommendation."""
        if accuracy < 50:
            return "Focus on reviewing material before taking more quizzes. Consider studying flashcards first."
        elif accuracy < 70:
            if difficulty.get("easy", {}).get("accuracy", 0) < 80:
                return "Master the basics first. Spend more time on easy questions before advancing."
            return "Good progress! Try to identify patterns in questions you're missing."
        elif accuracy < 85:
            if streak < 3:
                return "Great accuracy! Build consistency by studying daily."
            if difficulty.get("hard", {}).get("total", 0) < 5:
                return "Ready for a challenge! Try more hard difficulty questions."
            return "Excellent work! Focus on your weakest categories to round out your knowledge."
        else:
            if streak >= 7:
                return "Outstanding performance and consistency! You're ready for any exam."
            return "Exceptional accuracy! Maintain your streak to solidify long-term retention."

    async def get_content_totals(self, category_id: Optional[int] = None, user_id: Optional[int] = None) -> dict:
        """
        Get total counts of questions, flashcards, and quizzes for a user.

        Returns:
            - total_questions: Total questions in user's categories
            - total_flashcards: Total flashcards in user's categories
            - total_quizzes: Total completed quiz sessions for user's categories
        """
        # Count questions - join with categories to filter by user
        questions_query = select(func.count(Question.id)).join(
            Category, Question.category_id == Category.id
        )
        if user_id:
            questions_query = questions_query.where(Category.user_id == user_id)
        else:
            # For guest/anonymous: include records where user_id IS NULL
            questions_query = questions_query.where(Category.user_id.is_(None))
        if category_id:
            questions_query = questions_query.where(Question.category_id == category_id)
        questions_result = await self.db.execute(questions_query)
        total_questions = questions_result.scalar() or 0

        # Count flashcards - join with categories to filter by user
        flashcards_query = select(func.count(Flashcard.id)).join(
            Category, Flashcard.category_id == Category.id
        )
        if user_id:
            flashcards_query = flashcards_query.where(Category.user_id == user_id)
        else:
            flashcards_query = flashcards_query.where(Category.user_id.is_(None))
        if category_id:
            flashcards_query = flashcards_query.where(Flashcard.category_id == category_id)
        flashcards_result = await self.db.execute(flashcards_query)
        total_flashcards = flashcards_result.scalar() or 0

        # Count completed quizzes - join with categories to filter by user
        quizzes_query = select(func.count(QuizSession.id)).join(
            Category, QuizSession.category_id == Category.id
        ).where(QuizSession.completed == True)
        if user_id:
            quizzes_query = quizzes_query.where(Category.user_id == user_id)
        else:
            quizzes_query = quizzes_query.where(Category.user_id.is_(None))
        if category_id:
            quizzes_query = quizzes_query.where(QuizSession.category_id == category_id)
        quizzes_result = await self.db.execute(quizzes_query)
        total_quizzes = quizzes_result.scalar() or 0

        return {
            "total_questions": total_questions,
            "total_flashcards": total_flashcards,
            "total_quizzes": total_quizzes,
        }
