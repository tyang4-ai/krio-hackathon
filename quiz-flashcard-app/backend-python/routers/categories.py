"""
Category API routes.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_db
from schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)
from services.category_service import category_service

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=CategoryListResponse)
async def get_all_categories(
    db: AsyncSession = Depends(get_db),
) -> CategoryListResponse:
    """
    Get all categories with their statistics.
    """
    categories_with_stats = await category_service.get_all_categories_with_stats(db)

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
) -> CategoryResponse:
    """
    Get a single category by ID with statistics.
    """
    result = await category_service.get_category_with_stats(db, category_id)

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
) -> CategoryResponse:
    """
    Create a new category.
    """
    category = await category_service.create_category(db, category_data)
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
) -> CategoryResponse:
    """
    Update a category.
    """
    category = await category_service.update_category(db, category_id, category_data)

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
) -> None:
    """
    Delete a category and all its related content.
    """
    deleted = await category_service.delete_category(db, category_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )
