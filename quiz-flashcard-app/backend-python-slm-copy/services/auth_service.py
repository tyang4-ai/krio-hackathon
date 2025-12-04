"""
Authentication service for Google OAuth and JWT handling.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from models.user import User
from schemas.auth import TokenPayload

logger = structlog.get_logger()


class AuthService:
    """Service for authentication operations."""

    # JWT Configuration
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days

    def __init__(self):
        self.secret_key = settings.secret_key
        self.google_client_id = settings.google_client_id

    async def verify_google_token(self, credential: str) -> Optional[dict]:
        """
        Verify a Google ID token and extract user info.

        Args:
            credential: The Google ID token from the frontend

        Returns:
            Dictionary with user info (sub, email, name, picture) or None if invalid
        """
        try:
            # Verify the token with Google
            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                self.google_client_id,
            )

            # Check that the token is from our app
            if idinfo.get("aud") != self.google_client_id:
                logger.warning("google_token_invalid_audience", aud=idinfo.get("aud"))
                return None

            # Extract user info
            return {
                "google_id": idinfo["sub"],
                "email": idinfo["email"],
                "name": idinfo.get("name", idinfo["email"].split("@")[0]),
                "avatar_url": idinfo.get("picture"),
            }

        except ValueError as e:
            logger.warning("google_token_verification_failed", error=str(e))
            return None

    async def get_or_create_user(
        self,
        db: AsyncSession,
        google_id: str,
        email: str,
        name: str,
        avatar_url: Optional[str] = None,
    ) -> User:
        """
        Get existing user by Google ID or create a new one.

        Args:
            db: Database session
            google_id: Google user ID
            email: User email
            name: User display name
            avatar_url: User avatar URL

        Returns:
            User object
        """
        # Try to find existing user
        result = await db.execute(select(User).where(User.google_id == google_id))
        user = result.scalar_one_or_none()

        if user:
            # Update last login and potentially changed info
            user.last_login = datetime.now(timezone.utc)
            user.name = name
            user.avatar_url = avatar_url
            await db.commit()
            await db.refresh(user)
            logger.info("user_logged_in", user_id=user.id, email=email)
            return user

        # Create new user
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("user_created", user_id=user.id, email=email)
        return user

    def create_access_token(self, user: User) -> tuple[str, int]:
        """
        Create a JWT access token for the user.

        Args:
            user: User object

        Returns:
            Tuple of (access_token, expires_in_seconds)
        """
        now = datetime.now(timezone.utc)
        expires_delta = timedelta(hours=self.ACCESS_TOKEN_EXPIRE_HOURS)
        expire = now + expires_delta

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.name,
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
        }

        token = jwt.encode(payload, self.secret_key, algorithm=self.ALGORITHM)
        expires_in = int(expires_delta.total_seconds())

        return token, expires_in

    def verify_access_token(self, token: str) -> Optional[TokenPayload]:
        """
        Verify a JWT access token and return the payload.

        Args:
            token: JWT access token

        Returns:
            TokenPayload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.ALGORITHM])
            return TokenPayload(**payload)
        except JWTError as e:
            logger.warning("jwt_verification_failed", error=str(e))
            return None

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> Optional[User]:
        """
        Get a user by their ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            User object or None
        """
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


# Global service instance
auth_service = AuthService()
