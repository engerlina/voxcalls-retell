"""
ElevenLabs Conversational AI API service.
"""
import logging
import httpx
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class ElevenLabsService:
    """
    Service for interacting with ElevenLabs Conversational AI API.
    """

    BASE_URL = "https://api.elevenlabs.io/v1/convai"

    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs,
    ) -> dict[str, Any]:
        """Make an HTTP request to the ElevenLabs API."""
        url = f"{self.BASE_URL}{endpoint}"
        logger.info(f"ElevenLabs API request: {method} {url}")

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=self.headers,
                timeout=30.0,
                **kwargs,
            )

            if response.status_code >= 400:
                error_text = response.text
                logger.error(f"ElevenLabs API error: {response.status_code} - {error_text}")
                response.raise_for_status()

            return response.json()

    # =========================================================================
    # Agent Management
    # =========================================================================

    async def create_agent(
        self,
        name: str,
        system_prompt: str | None = None,
        welcome_message: str | None = None,
        voice_id: str | None = None,
        llm_model: str = "gpt-4o-mini",
        language: str = "en",
    ) -> dict[str, Any]:
        """
        Create a new conversational agent.

        Valid LLM models include: gpt-4o-mini, gpt-4o, gemini-1.5-flash,
        gemini-2.0-flash, claude-3-5-sonnet, etc.
        """
        payload = {
            "name": name,
            "conversation_config": {
                "agent": {
                    "first_message": welcome_message or "Hello! How can I help you today?",
                    "language": language,
                    "prompt": {
                        "prompt": system_prompt or "You are a helpful voice assistant.",
                        "llm": llm_model,
                    },
                },
                "tts": {
                    "voice_id": voice_id or "21m00Tcm4TlvDq8ikWAM",  # Rachel (default)
                    "model_id": "eleven_turbo_v2",
                },
            },
        }

        return await self._request("POST", "/agents/create", json=payload)

    async def get_agent(self, agent_id: str) -> dict[str, Any]:
        """Get agent details."""
        return await self._request("GET", f"/agents/{agent_id}")

    async def update_agent(
        self,
        agent_id: str,
        name: str | None = None,
        system_prompt: str | None = None,
        welcome_message: str | None = None,
        voice_id: str | None = None,
        llm_model: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        """Update an agent's configuration."""
        payload: dict[str, Any] = {}

        if name:
            payload["name"] = name

        conversation_config: dict[str, Any] = {}
        agent_config: dict[str, Any] = {}
        prompt_config: dict[str, Any] = {}
        tts_config: dict[str, Any] = {}

        if welcome_message:
            agent_config["first_message"] = welcome_message
        if language:
            agent_config["language"] = language
        if system_prompt:
            prompt_config["prompt"] = system_prompt
        if llm_model:
            prompt_config["llm"] = llm_model
        if voice_id:
            tts_config["voice_id"] = voice_id

        if prompt_config:
            agent_config["prompt"] = prompt_config
        if agent_config:
            conversation_config["agent"] = agent_config
        if tts_config:
            conversation_config["tts"] = tts_config
        if conversation_config:
            payload["conversation_config"] = conversation_config

        return await self._request("PATCH", f"/agents/{agent_id}", json=payload)

    async def delete_agent(self, agent_id: str) -> None:
        """Delete an agent."""
        await self._request("DELETE", f"/agents/{agent_id}")

    # =========================================================================
    # Knowledge Base
    # =========================================================================

    async def create_document_from_text(
        self,
        name: str,
        content: str,
    ) -> dict[str, Any]:
        """Create a knowledge base document from text."""
        # This would use the appropriate endpoint
        # For now, using a placeholder structure
        payload = {
            "name": name,
            "text": content,
        }
        return await self._request("POST", "/knowledge-base/text", json=payload)

    async def create_document_from_url(
        self,
        name: str,
        url: str,
    ) -> dict[str, Any]:
        """Create a knowledge base document from URL."""
        payload = {
            "name": name,
            "url": url,
        }
        return await self._request("POST", "/knowledge-base/url", json=payload)

    # Allowed file types for ElevenLabs knowledge base
    ALLOWED_FILE_TYPES = {
        "pdf": "application/pdf",
        "txt": "text/plain",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "html": "text/html",
        "htm": "text/html",
        "epub": "application/epub+zip",
        "md": "text/markdown",
        "markdown": "text/markdown",
    }

    async def create_document_from_file(
        self,
        name: str,
        file_content: bytes,
        file_name: str,
    ) -> dict[str, Any]:
        """Create a knowledge base document from file upload."""
        # Determine content type based on file extension
        extension = file_name.lower().split(".")[-1] if "." in file_name else ""

        if extension not in self.ALLOWED_FILE_TYPES:
            allowed_extensions = ", ".join(self.ALLOWED_FILE_TYPES.keys())
            raise ValueError(
                f"Invalid file type '.{extension}'. Allowed types: {allowed_extensions}"
            )

        content_type = self.ALLOWED_FILE_TYPES[extension]

        # File upload uses multipart form
        url = f"{self.BASE_URL}/knowledge-base/file"
        logger.info(f"Uploading file to ElevenLabs: {url} (filename={file_name}, content_type={content_type}, size={len(file_content)})")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={"xi-api-key": self.api_key},
                files={"file": (file_name, file_content, content_type)},
                data={"name": name},
                timeout=60.0,
            )
            if response.status_code >= 400:
                logger.error(f"ElevenLabs file upload error: {response.status_code} - {response.text}")
            response.raise_for_status()
            return response.json()

    async def get_document(self, doc_id: str) -> dict[str, Any]:
        """Get document details."""
        return await self._request("GET", f"/knowledge-base/{doc_id}")

    async def delete_document(self, doc_id: str) -> None:
        """Delete a document."""
        await self._request("DELETE", f"/knowledge-base/{doc_id}")

    # =========================================================================
    # Conversations
    # =========================================================================

    async def list_conversations(
        self,
        agent_id: str | None = None,
        page_size: int = 50,
    ) -> dict[str, Any]:
        """List conversations."""
        params = {"page_size": page_size}
        if agent_id:
            params["agent_id"] = agent_id

        return await self._request("GET", "/conversations", params=params)

    async def get_conversation(self, conversation_id: str) -> dict[str, Any]:
        """Get conversation details with transcript."""
        return await self._request("GET", f"/conversations/{conversation_id}")

    async def get_conversation_audio(self, conversation_id: str) -> str:
        """
        Get signed URL for conversation audio.

        The ElevenLabs API returns a JSON response with the audio URL.
        """
        url = f"{self.BASE_URL}/conversations/{conversation_id}/audio"
        logger.info(f"Fetching audio URL from: {url}")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self.headers,
                timeout=30.0,
                follow_redirects=False,  # Don't follow redirects, we want the URL
            )

            logger.info(f"Audio response status: {response.status_code}")
            logger.info(f"Audio response headers: {dict(response.headers)}")

            # If it's a redirect, return the redirect URL
            if response.status_code in (301, 302, 303, 307, 308):
                redirect_url = response.headers.get("location", "")
                logger.info(f"Audio redirect URL: {redirect_url}")
                return redirect_url

            # If successful JSON response
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                logger.info(f"Audio content-type: {content_type}")

                if "application/json" in content_type:
                    data = response.json()
                    logger.info(f"Audio JSON response: {data}")
                    return data.get("audio_url") or data.get("url") or ""

                # If it's audio data directly, we can't use it as a URL
                # In this case, we'd need to proxy the audio
                logger.warning(f"Audio endpoint returned non-JSON: {content_type}")
                return ""

            logger.error(f"Audio fetch failed: {response.status_code} - {response.text}")
            return ""

    # =========================================================================
    # Phone Numbers
    # =========================================================================

    async def import_phone_number(
        self,
        phone_number: str,
        twilio_sid: str,
    ) -> dict[str, Any]:
        """Import a Twilio phone number."""
        payload = {
            "phone_number": phone_number,
            "label": f"VoxCalls - {phone_number}",
            "provider": "twilio",
            "sid": settings.TWILIO_ACCOUNT_SID,
            "token": settings.TWILIO_AUTH_TOKEN,
        }
        return await self._request("POST", "/phone-numbers", json=payload)

    async def get_phone_number(self, phone_id: str) -> dict[str, Any]:
        """Get phone number details."""
        return await self._request("GET", f"/phone-numbers/{phone_id}")

    async def assign_phone_to_agent(
        self,
        phone_id: str,
        agent_id: str | None,
    ) -> dict[str, Any]:
        """
        Assign a phone number to an agent, or unassign it.

        Args:
            phone_id: The ElevenLabs phone number ID
            agent_id: The ElevenLabs agent ID, or None to unassign
        """
        payload = {"agent_id": agent_id}
        return await self._request("PATCH", f"/phone-numbers/{phone_id}", json=payload)

    async def delete_phone_number(self, phone_id: str) -> None:
        """Delete a phone number."""
        await self._request("DELETE", f"/phone-numbers/{phone_id}")
