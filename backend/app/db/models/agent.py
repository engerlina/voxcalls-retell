"""
Agent model for voice AI agents.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Integer, Float, Text, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.tenant import Tenant
    from app.db.models.user import User
    from app.db.models.phone_number import PhoneNumber
    from app.db.models.call import Call


class Agent(Base):
    """
    Voice AI Agent model.

    Maps to a Retell AI agent with VoxCalls metadata.
    """

    __tablename__ = "agents"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Tenant
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Retell AI references
    retell_agent_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )
    retell_llm_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Assignment
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Configuration
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text)
    welcome_message: Mapped[str | None] = mapped_column(Text)
    voice_id: Mapped[str | None] = mapped_column(String(255))
    llm_model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    language: Mapped[str] = mapped_column(String(10), default="en")

    # Retell-specific settings
    responsiveness: Mapped[float] = mapped_column(Float, default=0.8)
    interruption_sensitivity: Mapped[float] = mapped_column(Float, default=0.7)
    ambient_sound: Mapped[str | None] = mapped_column(String(50), nullable=True)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)

    # Knowledge base IDs (Retell)
    knowledge_base_ids: Mapped[list] = mapped_column(JSON, default=list)

    # Tools configuration
    tools_config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Status
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
    )  # active, paused, deleted

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
    tenant: Mapped["Tenant"] = relationship(
        "Tenant",
        back_populates="agents",
    )
    assigned_user: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[assigned_user_id],
    )
    phone_numbers: Mapped[list["PhoneNumber"]] = relationship(
        "PhoneNumber",
        back_populates="assigned_agent",
    )
    calls: Mapped[list["Call"]] = relationship(
        "Call",
        back_populates="agent",
    )

    def __repr__(self) -> str:
        return f"<Agent {self.name}>"
