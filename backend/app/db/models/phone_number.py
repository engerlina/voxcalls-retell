"""
PhoneNumber model for telephony management.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.tenant import Tenant
    from app.db.models.user import User
    from app.db.models.agent import Agent


class PhoneNumber(Base):
    """
    Phone number pool model.

    Managed by super admins, assigned to tenants.
    """

    __tablename__ = "phone_numbers"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Phone data
    phone_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(10))
    number_type: Mapped[str | None] = mapped_column(
        String(50)
    )  # local, mobile, toll_free

    # Retell AI reference
    retell_phone_id: Mapped[str | None] = mapped_column(String(255))

    # SIP Trunk configuration
    sip_trunk_uri: Mapped[str | None] = mapped_column(String(255))

    # Assignment (NULL = available in pool)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Capabilities
    supports_inbound: Mapped[bool] = mapped_column(Boolean, default=True)
    supports_outbound: Mapped[bool] = mapped_column(Boolean, default=True)
    supports_sms: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    status: Mapped[str] = mapped_column(
        String(50),
        default="available",
        nullable=False,
    )  # available, assigned, suspended

    # Timestamps
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    tenant: Mapped["Tenant | None"] = relationship(
        "Tenant",
        back_populates="phone_numbers",
    )
    assigned_user: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[assigned_user_id],
    )
    assigned_agent: Mapped["Agent | None"] = relationship(
        "Agent",
        back_populates="phone_numbers",
    )

    def __repr__(self) -> str:
        return f"<PhoneNumber {self.phone_number}>"
