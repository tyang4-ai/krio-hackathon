"""
Analytics API endpoints.

Provides comprehensive learning analytics:
- Overall performance metrics
- Category-based analytics
- Trend data for charts
- AI-powered learning score
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from middleware.auth_middleware import get_optional_user
from services.analytics_service import AnalyticsService
from schemas.analytics import (
    OverviewResponse,
    CategoryPerformance,
    TrendDataPoint,
    HardestQuestion,
    LearningScore,
    AnalyticsDashboardResponse,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get overall analytics summary.

    Returns total attempts, accuracy, time spent, sessions, and streak.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.get_user_overview(user_id, days)


@router.get("/categories", response_model=list[CategoryPerformance])
async def get_category_performance(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get performance breakdown by category.

    Returns accuracy, attempts, and mastery score per category.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.get_category_performance(user_id)


@router.get("/difficulty")
async def get_difficulty_breakdown(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get performance by difficulty level (easy/medium/hard).
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.get_difficulty_breakdown(user_id, category_id)


@router.get("/question-types")
async def get_question_type_breakdown(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get performance by question type.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.get_question_type_breakdown(user_id, category_id)


@router.get("/trends", response_model=list[TrendDataPoint])
async def get_trend_data(
    days: int = Query(30, ge=1, le=365, description="Analysis period"),
    granularity: str = Query("day", regex="^(day|week|month)$"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get performance trend over time for charts.

    Granularity options: day, week, month
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.get_trend_data(user_id, category_id, days, granularity)


@router.get("/hardest-questions", response_model=list[HardestQuestion])
async def get_hardest_questions(
    limit: int = Query(10, ge=1, le=50),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get questions with lowest accuracy.

    Useful for identifying weak areas to focus on.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.get_hardest_questions(user_id, category_id, limit)


@router.get("/learning-score", response_model=LearningScore)
async def get_learning_score(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Calculate AI-powered learning score (0-100).

    Factors in accuracy, consistency, improvement trend, and difficulty progression.
    Includes letter grade and personalized recommendation.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)
    return await service.calculate_learning_score(user_id, category_id)


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
async def get_full_dashboard(
    days: int = Query(30, ge=1, le=365, description="Analysis period"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get complete analytics dashboard data in a single request.

    Combines all analytics endpoints for efficient loading.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)

    # Fetch all data in parallel would be ideal, but for simplicity:
    overview = await service.get_user_overview(user_id, days, category_id)
    category_performance = await service.get_category_performance(user_id, category_id)
    difficulty_breakdown = await service.get_difficulty_breakdown(user_id, category_id)
    question_type_breakdown = await service.get_question_type_breakdown(user_id, category_id)
    trend_data = await service.get_trend_data(user_id, category_id, days, "day")
    hardest_questions = await service.get_hardest_questions(user_id, category_id, 10)
    learning_score = await service.calculate_learning_score(user_id, category_id)

    return AnalyticsDashboardResponse(
        overview=overview,
        category_performance=category_performance,
        difficulty_breakdown=difficulty_breakdown,
        question_type_breakdown=question_type_breakdown,
        trend_data=trend_data,
        hardest_questions=hardest_questions,
        learning_score=learning_score,
    )


@router.get("/category/{category_id}")
async def get_category_analytics(
    category_id: int,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get detailed analytics for a specific category.
    """
    user_id = current_user.id if current_user else None
    service = AnalyticsService(db)

    overview = await service.get_user_overview(user_id, days)
    category_perf = await service.get_category_performance(user_id, category_id)
    difficulty = await service.get_difficulty_breakdown(user_id, category_id)
    trends = await service.get_trend_data(user_id, category_id, days, "day")
    hardest = await service.get_hardest_questions(user_id, category_id, 5)

    return {
        "category_id": category_id,
        "overview": overview,
        "performance": category_perf[0] if category_perf else None,
        "difficulty_breakdown": difficulty,
        "trend_data": trends,
        "hardest_questions": hardest,
    }
