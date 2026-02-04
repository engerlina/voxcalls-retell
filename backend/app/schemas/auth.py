"""
Authentication schemas.
"""
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str
    tenant_id: str | None = None
    role: str
    type: str


class LoginRequest(BaseModel):
    """Login request body."""

    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """
    Registration request body.

    Creates a new tenant and first admin user.
    """

    # Tenant info
    tenant_name: str
    tenant_slug: str

    # User info
    email: EmailStr
    password: str
    name: str


class RefreshRequest(BaseModel):
    """Token refresh request body."""

    refresh_token: str
