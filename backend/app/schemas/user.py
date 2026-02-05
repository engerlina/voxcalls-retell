"""
User schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, computed_field


class UserBase(BaseModel):
    """Base user fields."""

    email: EmailStr
    name: str


class UserCreate(UserBase):
    """User creation schema (for invitations)."""

    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    """User update schema."""

    name: str | None = None
    settings: dict | None = None


class AdminUserUpdate(BaseModel):
    """Admin user update schema - allows more fields."""

    name: str | None = None
    role: str | None = None
    status: str | None = None
    tenant_id: UUID | None = None


class UserResponse(UserBase):
    """User response schema."""

    id: UUID
    tenant_id: UUID | None
    role: str
    status: str
    email_verified: bool
    assigned_agent_id: UUID | None
    assigned_phone_number_id: UUID | None
    created_at: datetime
    last_login_at: datetime | None

    @computed_field
    @property
    def full_name(self) -> str:
        """Alias for name field for frontend compatibility."""
        return self.name

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """User in database (includes hash)."""

    password_hash: str


class InvitationCreate(BaseModel):
    """Invitation creation schema."""

    email: EmailStr
    role: str = "user"  # admin or user


class InvitationResponse(BaseModel):
    """Invitation response schema."""

    id: UUID
    tenant_id: UUID
    email: str
    role: str
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminInvitationCreate(BaseModel):
    """Super admin invitation creation schema."""

    tenant_id: UUID
    email: EmailStr
    role: str = "user"  # admin or user


class AdminInvitationResponse(InvitationResponse):
    """Super admin invitation response with magic link."""

    magic_link: str
