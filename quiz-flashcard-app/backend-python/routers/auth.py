"""
Authentication router for Google OAuth login.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from middleware import limiter, RateLimits
from schemas.auth import GoogleAuthRequest, AuthResponse, UserResponse
from services.auth_service import auth_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/google", response_model=AuthResponse)
@limiter.limit(RateLimits.AUTH_STRICT)
async def google_login(
    request: Request,
    auth_request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with Google OAuth.

    Exchange a Google ID token for a JWT access token.
    Creates a new user if this is their first login.
    """
    # Verify the Google token
    google_info = await auth_service.verify_google_token(auth_request.credential)
    if not google_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    # Get or create user
    user = await auth_service.get_or_create_user(
        db=db,
        google_id=google_info["google_id"],
        email=google_info["email"],
        name=google_info["name"],
        avatar_url=google_info.get("avatar_url"),
    )

    # Create JWT token
    access_token, expires_in = auth_service.create_access_token(user)

    logger.info(
        "google_auth_success",
        user_id=user.id,
        email=user.email,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(lambda: None),  # Will be replaced by middleware
):
    """
    Get the currently authenticated user.

    Requires a valid JWT access token in the Authorization header.
    """
    # This endpoint will be protected by the auth middleware
    # The middleware will inject the current_user
    from middleware.auth_middleware import get_current_user_dependency

    # For now, this is a placeholder - will be properly integrated
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Auth middleware not yet integrated. Use /api/auth/verify endpoint.",
    )


@router.post("/verify", response_model=UserResponse)
async def verify_token(
    db: AsyncSession = Depends(get_db),
    authorization: str = None,
):
    """
    Verify a JWT access token and return user info.

    Pass the token in the Authorization header as: Bearer <token>
    """
    from fastapi import Header

    # This is a workaround for testing - in production use middleware
    pass


@router.get("/verify")
@limiter.limit(RateLimits.AUTH)
async def verify_token_get(
    request: Request,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a JWT access token (GET method for easy testing).

    Args:
        token: JWT access token as query parameter
    """
    from middleware.auth_middleware import GUEST_USER_ID

    # Handle guest token
    if token == "guest":
        from datetime import datetime
        now = datetime.utcnow()
        return UserResponse(
            id=GUEST_USER_ID,
            google_id="guest",
            email="guest@studyforge.app",
            name="Guest User",
            avatar_url=None,
            is_active=True,
            created_at=now,
            last_login=now,
        )

    payload = auth_service.verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Get the user
    user = await auth_service.get_user_by_id(db, int(payload.sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout():
    """
    Logout the current user.

    Since we use stateless JWTs, this is primarily for client-side cleanup.
    The client should discard the token.
    """
    # In a stateful session system, we would invalidate the session here
    # With JWTs, the client simply discards the token
    return {"message": "Logged out successfully"}


@router.post("/guest", response_model=AuthResponse)
async def guest_login():
    """
    Login as a guest user for testing.

    Returns a special "guest" token that allows limited access to the app.
    Guest data is isolated and may be cleared periodically.
    """
    from datetime import datetime
    from middleware.auth_middleware import GUEST_USER_ID

    logger.info("guest_login")

    now = datetime.utcnow()

    # Return guest user info with special "guest" token
    guest_user = UserResponse(
        id=GUEST_USER_ID,
        google_id="guest",
        email="guest@studyforge.app",
        name="Guest User",
        avatar_url=None,
        is_active=True,
        created_at=now,
        last_login=now,
    )

    return AuthResponse(
        access_token="guest",
        token_type="bearer",
        expires_in=86400 * 365,  # 1 year (never expires for guest)
        user=guest_user,
    )
