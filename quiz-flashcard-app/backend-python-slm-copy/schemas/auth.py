"""
Pydantic schemas for authentication.
"""
from datetime import datetime
from typing import Optional

from pydantic import EmailStr

from .base import BaseSchema


class GoogleAuthRequest(BaseSchema):
    """Request schema for Google OAuth authentication."""

    credential: str  # Google ID token from frontend


class TokenResponse(BaseSchema):
    """Response schema with JWT access token."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until expiration


class UserBase(BaseSchema):
    """Base user schema."""

    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    """User response schema."""

    id: int
    google_id: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class AuthResponse(BaseSchema):
    """Combined authentication response with token and user info."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenPayload(BaseSchema):
    """JWT token payload schema."""

    sub: str  # user_id as string
    email: str
    name: str
    exp: int  # expiration timestamp
    iat: int  # issued at timestamp
