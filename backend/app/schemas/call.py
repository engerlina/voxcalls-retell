"""
Call schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CallTranscriptResponse(BaseModel):
    """Call transcript message response."""

    id: UUID
    sequence: int
    role: str
    content: str
    start_time_ms: int | None
    end_time_ms: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class CallResponse(BaseModel):
    """Call response schema."""

    id: UUID
    tenant_id: UUID
    user_id: UUID | None
    agent_id: UUID | None
    elevenlabs_conversation_id: str | None
    phone_number: str | None
    direction: str
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    duration_seconds: int | None
    call_successful: bool | None
    transcript_summary: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CallDetailResponse(CallResponse):
    """Call detail response with transcripts."""

    transcripts: list[CallTranscriptResponse]
    agent_name: str | None = None
