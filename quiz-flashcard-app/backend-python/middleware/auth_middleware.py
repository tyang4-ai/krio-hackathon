"""
Authentication middleware for JWT token validation.

Supports both authenticated users and guest mode for testing.
"""
from typing import Optional

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.user import User
from services.auth_service import auth_service

logger = structlog.get_logger()

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)

# Guest user ID - a special constant for guest mode
GUEST_USER_ID = -1


def create_guest_user() -> User:
    """
    Create a virtual guest user object (not persisted to database).

    Guest users have limited functionality but can test the app.
    """
    from datetime import datetime
    now = datetime.utcnow()
    guest = User(
        id=GUEST_USER_ID,
        google_id="guest",
        email="guest@studyforge.app",
        name="Guest User",
        avatar_url=None,
        is_active=True,
        created_at=now,
        last_login=now,
    )
    return guest


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the currently authenticated user.

    Validates the JWT token and returns the user.
    Supports guest mode with "guest" token.
    Raises HTTPException if not authenticated.

    Usage:
        @router.get("/protected")
        async def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Handle guest token
    if credentials.credentials == "guest":
        return create_guest_user()

    # Verify the token
    payload = auth_service.verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get the user from database
    user = await auth_service.get_user_by_id(db, int(payload.sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to optionally get the current user.

    Returns the user if authenticated, None otherwise.
    Supports guest mode with "guest" token.
    Does not raise exceptions for missing/invalid tokens.

    Usage:
        @router.get("/public-with-user")
        async def public_route(current_user: Optional[User] = Depends(get_optional_user)):
            if current_user:
                return {"message": f"Hello, {current_user.name}!"}
            return {"message": "Hello, guest!"}
    """
    if not credentials:
        return None

    # Handle guest token
    if credentials.credentials == "guest":
        return create_guest_user()

    # Verify the token
    payload = auth_service.verify_access_token(credentials.credentials)
    if not payload:
        return None

    # Get the user from database
    user = await auth_service.get_user_by_id(db, int(payload.sub))
    if not user or not user.is_active:
        return None

    return user


def require_auth(user: User = Depends(get_current_user)) -> User:
    """
    Simple alias for get_current_user for semantic clarity.

    Usage:
        @router.post("/create")
        async def create_item(user: User = Depends(require_auth)):
            ...
    """
    return user


# Dependency for getting user ID (lightweight, for cases where full user object isn't needed)
async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> int:
    """
    Dependency to get just the user ID without database lookup.

    Useful for operations that only need the user ID.
    Supports guest mode with "guest" token.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Handle guest token
    if credentials.credentials == "guest":
        return GUEST_USER_ID

    payload = auth_service.verify_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return int(payload.sub)
