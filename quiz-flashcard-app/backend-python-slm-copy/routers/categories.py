"""
Category API routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_db
from middleware.auth_middleware import get_current_user, get_optional_user, GUEST_USER_ID
from models.user import User
from schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)
from services.category_service import category_service

router = APIRouter(prefix="/api/categories", tags=["Categories"])


def get_effective_user_id(user: User) -> int | None:
    """
    Get the effective user ID for database operations.

    Returns None for guest users (GUEST_USER_ID) to avoid FK violations,
    since there's no actual user record with ID -1.
    """
    if user.id == GUEST_USER_ID:
        return None
    return user.id


@router.get("", response_model=CategoryListResponse)
async def get_all_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryListResponse:
    """
    Get all categories with their statistics for the current user.
    """
    user_id = get_effective_user_id(current_user)
    categories_with_stats = await category_service.get_all_categories_with_stats(db, user_id=user_id)

    categories = [
        CategoryResponse(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            color=cat.color,
            icon=cat.icon,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
            stats=stats,
        )
        for cat, stats in categories_with_stats
    ]

    return CategoryListResponse(categories=categories, total=len(categories))


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    """
    Get a single category by ID with statistics.
    """
    user_id = get_effective_user_id(current_user)
    result = await category_service.get_category_with_stats(db, category_id, user_id=user_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    category, stats = result
    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        color=category.color,
        icon=category.icon,
        created_at=category.created_at,
        updated_at=category.updated_at,
        stats=stats,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    """
    Create a new category for the current user.
    """
    user_id = get_effective_user_id(current_user)
    category = await category_service.create_category(db, category_data, user_id=user_id)
    stats = await category_service.get_category_stats(db, category.id)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        color=category.color,
        icon=category.icon,
        created_at=category.created_at,
        updated_at=category.updated_at,
        stats=stats,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    """
    Update a category.
    """
    user_id = get_effective_user_id(current_user)
    category = await category_service.update_category(db, category_id, category_data, user_id=user_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    stats = await category_service.get_category_stats(db, category.id)

    return CategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        color=category.color,
        icon=category.icon,
        created_at=category.created_at,
        updated_at=category.updated_at,
        stats=stats,
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a category and all its related content.
    """
    user_id = get_effective_user_id(current_user)
    deleted = await category_service.delete_category(db, category_id, user_id=user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )
