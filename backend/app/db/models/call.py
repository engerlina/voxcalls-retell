"""
Call and CallTranscript models.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Integer, Boolean, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.tenant import Tenant
    from app.db.models.user import User
    from app.db.models.agent import Agent


class Call(Base):
    """
    Call record model.

    Tracks conversations handled by agents.
    """

    __tablename__ = "calls"

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

    # User and Agent
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ElevenLabs reference
    elevenlabs_conversation_id: Mapped[str | None] = mapped_column(String(255))

    # Call metadata
    phone_number: Mapped[str | None] = mapped_column(String(50))
    direction: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # inbound, outbound

    # Status
    status: Mapped[str] = mapped_column(
        String(50),
        default="in_progress",
        nullable=False,
    )  # in_progress, completed, failed

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)

    # Quality
    call_successful: Mapped[bool | None] = mapped_column(Boolean)
    failure_reason: Mapped[str | None] = mapped_column(Text)

    # Summary
    transcript_summary: Mapped[str | None] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship(
        "Tenant",
        back_populates="calls",
    )
    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="calls",
    )
    agent: Mapped["Agent | None"] = relationship(
        "Agent",
        back_populates="calls",
    )
    transcripts: Mapped[list["CallTranscript"]] = relationship(
        "CallTranscript",
        back_populates="call",
        cascade="all, delete-orphan",
        order_by="CallTranscript.sequence",
    )

    def __repr__(self) -> str:
        return f"<Call {self.id} ({self.status})>"


class CallTranscript(Base):
    """
    Call transcript message model.

    Individual messages in a conversation.
    """

    __tablename__ = "call_transcripts"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Call
    call_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("calls.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Message data
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Timing (relative to call start)
    start_time_ms: Mapped[int | None] = mapped_column(Integer)
    end_time_ms: Mapped[int | None] = mapped_column(Integer)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    call: Mapped["Call"] = relationship(
        "Call",
        back_populates="transcripts",
    )

    def __repr__(self) -> str:
        return f"<CallTranscript {self.sequence} ({self.role})>"
