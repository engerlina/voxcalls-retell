"""
Phone number schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PhoneNumberBase(BaseModel):
    """Base phone number fields."""

    phone_number: str
    country_code: str | None = None
    number_type: str | None = None


class PhoneNumberCreate(PhoneNumberBase):
    """Phone number creation schema (admin)."""

    twilio_sid: str
    supports_inbound: bool = True
    supports_outbound: bool = True
    supports_sms: bool = False


class PhoneNumberClaim(BaseModel):
    """Phone number claim request."""

    phone_number_id: UUID
    agent_id: UUID | None = None


class PhoneNumberAssignAgent(BaseModel):
    """Assign agent to phone number request."""

    agent_id: UUID | None = None  # None to unassign


class PhoneNumberResponse(PhoneNumberBase):
    """Phone number response schema."""

    id: UUID
    twilio_sid: str
    elevenlabs_phone_id: str | None
    tenant_id: UUID | None
    assigned_user_id: UUID | None
    assigned_agent_id: UUID | None
    supports_inbound: bool
    supports_outbound: bool
    supports_sms: bool
    status: str
    assigned_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class TwilioNumberSearch(BaseModel):
    """Twilio number search parameters."""

    country_code: str = "US"
    area_code: str | None = None
    contains: str | None = None
    number_type: str = "local"  # local, mobile, toll_free


class TwilioNumberResult(BaseModel):
    """Twilio available number result."""

    phone_number: str
    friendly_name: str
    country_code: str
    capabilities: dict


class NumberTypePricing(BaseModel):
    """Pricing for a number type."""

    number_type: str
    base_price: str | None = None
    current_price: str | None = None


class TwilioNumberBulkResult(BaseModel):
    """Twilio available numbers grouped by type."""

    local: list[TwilioNumberResult]
    mobile: list[TwilioNumberResult]
    toll_free: list[TwilioNumberResult]
    pricing: dict[str, str | None] = {}  # number_type -> monthly price


class PurchaseNumberRequest(BaseModel):
    """Request to purchase a phone number."""

    phone_number: str
    number_type: str = "local"  # local, mobile, toll_free
    country_code: str = "AU"  # ISO country code (AU, US, GB, etc.)
