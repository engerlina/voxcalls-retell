"""
Tenant schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TenantBase(BaseModel):
    """Base tenant fields."""

    name: str
    slug: str


class TenantCreate(TenantBase):
    """Tenant creation schema."""

    plan: str = "free"


class TenantUpdate(BaseModel):
    """Tenant update schema."""

    name: str | None = None
    status: str | None = None
    plan: str | None = None
    max_users: int | None = None
    max_agents: int | None = None
    max_phone_numbers: int | None = None
    monthly_minutes_limit: int | None = None
    settings: dict | None = None


class TenantResponse(TenantBase):
    """Tenant response schema."""

    id: UUID
    status: str
    plan: str
    trial_ends_at: datetime | None
    max_users: int
    max_agents: int
    max_phone_numbers: int
    monthly_minutes_limit: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantStats(BaseModel):
    """Tenant statistics."""

    total_users: int
    total_agents: int
    total_documents: int
    total_calls: int
    minutes_used_this_month: float
