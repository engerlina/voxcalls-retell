"""
Tenant model for multi-tenancy.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Integer, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.agent import Agent
    from app.db.models.document import Document
    from app.db.models.phone_number import PhoneNumber
    from app.db.models.call import Call


class Tenant(Base):
    """
    Tenant (Organization) model.

    Represents a customer organization with isolated data.
    """

    __tablename__ = "tenants"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Status
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
    )  # active, suspended, trial, cancelled

    # Subscription
    plan: Mapped[str] = mapped_column(
        String(50),
        default="free",
        nullable=False,
    )  # free, starter, pro, enterprise
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    subscription_id: Mapped[str | None] = mapped_column(String(255))

    # Limits
    max_users: Mapped[int] = mapped_column(Integer, default=5)
    max_agents: Mapped[int] = mapped_column(Integer, default=1)
    max_phone_numbers: Mapped[int] = mapped_column(Integer, default=1)
    monthly_minutes_limit: Mapped[int] = mapped_column(Integer, default=100)

    # Settings
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    agents: Mapped[list["Agent"]] = relationship(
        "Agent",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    phone_numbers: Mapped[list["PhoneNumber"]] = relationship(
        "PhoneNumber",
        back_populates="tenant",
    )
    calls: Mapped[list["Call"]] = relationship(
        "Call",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.name} ({self.slug})>"
