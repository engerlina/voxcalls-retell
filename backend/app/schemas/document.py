"""
Document schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentBase(BaseModel):
    """Base document fields."""

    name: str


class DocumentCreate(DocumentBase):
    """Document creation schema (for text)."""

    content: str


class DocumentCreateFromUrl(DocumentBase):
    """Document creation from URL."""

    url: str


class DocumentResponse(DocumentBase):
    """Document response schema."""

    id: UUID
    tenant_id: UUID
    user_id: UUID
    user_name: str | None = None  # Added for display
    elevenlabs_doc_id: str | None
    source_type: str
    source_url: str | None
    file_name: str | None
    file_size_bytes: int | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
