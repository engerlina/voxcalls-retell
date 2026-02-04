"""
Document (Knowledge Base) endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select

from app.core.deps import DbSession, CurrentUser
from app.db import models
from app.schemas.document import DocumentCreate, DocumentCreateFromUrl, DocumentResponse
from app.services.elevenlabs import ElevenLabsService

router = APIRouter()


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    current_user: CurrentUser,
    db: DbSession,
) -> list[DocumentResponse]:
    """
    List documents.

    Admins see all tenant documents. Users see only their documents.
    """
    query = select(models.Document).where(
        models.Document.tenant_id == current_user.tenant_id
    )

    if current_user.role == "user":
        query = query.where(models.Document.user_id == current_user.id)

    result = await db.execute(query)
    documents = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in documents]


@router.post("/text", response_model=DocumentResponse)
async def create_document_from_text(
    document: DocumentCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> DocumentResponse:
    """
    Create document from text content.
    """
    # Create in ElevenLabs
    try:
        elevenlabs = ElevenLabsService()
        elevenlabs_doc = await elevenlabs.create_document_from_text(
            name=document.name,
            content=document.content,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document in ElevenLabs: {str(e)}",
        )

    # Create in database
    db_document = models.Document(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        elevenlabs_doc_id=elevenlabs_doc.get("id"),
        name=document.name,
        source_type="text",
        status="ready",
    )
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)

    return DocumentResponse.model_validate(db_document)


@router.post("/url", response_model=DocumentResponse)
async def create_document_from_url(
    document: DocumentCreateFromUrl,
    current_user: CurrentUser,
    db: DbSession,
) -> DocumentResponse:
    """
    Create document from URL.
    """
    # Create in ElevenLabs
    try:
        elevenlabs = ElevenLabsService()
        elevenlabs_doc = await elevenlabs.create_document_from_url(
            name=document.name,
            url=document.url,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document in ElevenLabs: {str(e)}",
        )

    # Create in database
    db_document = models.Document(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        elevenlabs_doc_id=elevenlabs_doc.get("id"),
        name=document.name,
        source_type="url",
        source_url=document.url,
        status="processing",
    )
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)

    return DocumentResponse.model_validate(db_document)


@router.post("/file", response_model=DocumentResponse)
async def create_document_from_file(
    file: UploadFile = File(...),
    name: str = Form(None),
    current_user: CurrentUser = None,
    db: DbSession = None,
) -> DocumentResponse:
    """
    Create document from uploaded file.
    """
    # Use filename if no name provided
    doc_name = name or file.filename

    # Read file content
    content = await file.read()

    # Create in ElevenLabs
    try:
        elevenlabs = ElevenLabsService()
        elevenlabs_doc = await elevenlabs.create_document_from_file(
            name=doc_name,
            file_content=content,
            file_name=file.filename,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document in ElevenLabs: {str(e)}",
        )

    # Create in database
    db_document = models.Document(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        elevenlabs_doc_id=elevenlabs_doc.get("id"),
        name=doc_name,
        source_type="file",
        file_name=file.filename,
        file_size_bytes=len(content),
        status="processing",
    )
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)

    return DocumentResponse.model_validate(db_document)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> DocumentResponse:
    """
    Get document by ID.
    """
    result = await db.execute(
        select(models.Document).where(
            models.Document.id == document_id,
            models.Document.tenant_id == current_user.tenant_id,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Users can only see their documents
    if current_user.role == "user" and document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """
    Delete document.
    """
    result = await db.execute(
        select(models.Document).where(
            models.Document.id == document_id,
            models.Document.tenant_id == current_user.tenant_id,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Users can only delete their documents
    if current_user.role == "user" and document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Delete from ElevenLabs
    if document.elevenlabs_doc_id:
        try:
            elevenlabs = ElevenLabsService()
            await elevenlabs.delete_document(document.elevenlabs_doc_id)
        except Exception:
            pass  # Continue even if ElevenLabs delete fails

    await db.delete(document)
    await db.commit()

    return {"message": "Document deleted successfully"}
