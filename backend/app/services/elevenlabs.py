"""
ElevenLabs Conversational AI API service.
"""
import httpx
from typing import Any

from app.core.config import settings


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
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=f"{self.BASE_URL}{endpoint}",
                headers=self.headers,
                timeout=30.0,
                **kwargs,
            )
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
                    "model_id": "eleven_turbo_v2_5",
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

    async def create_document_from_file(
        self,
        name: str,
        file_content: bytes,
        file_name: str,
    ) -> dict[str, Any]:
        """Create a knowledge base document from file upload."""
        # File upload uses multipart form
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/knowledge-base/file",
                headers={"xi-api-key": self.api_key},
                files={"file": (file_name, file_content)},
                data={"name": name},
                timeout=60.0,
            )
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
        """Get signed URL for conversation audio."""
        result = await self._request(
            "GET", f"/conversations/{conversation_id}/audio"
        )
        return result.get("url", "")

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
        agent_id: str,
    ) -> dict[str, Any]:
        """Assign a phone number to an agent."""
        payload = {"agent_id": agent_id}
        return await self._request("PATCH", f"/phone-numbers/{phone_id}", json=payload)

    async def delete_phone_number(self, phone_id: str) -> None:
        """Delete a phone number."""
        await self._request("DELETE", f"/phone-numbers/{phone_id}")
