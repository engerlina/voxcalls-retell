"""
Application configuration using Pydantic Settings.
"""
import json
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str | None = None

    # Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption
    ENCRYPTION_KEY: str | None = None

    # Retell AI
    RETELL_API_KEY: str

    # Twilio SIP Trunking
    TWILIO_TERMINATION_SIP_URL: str | None = None
    SIP_USERNAME: str | None = None
    SIP_PASSWORD: str | None = None

    # Twilio API (optional, for purchasing numbers)
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_ADDRESS_SID: str | None = None

    # Redis
    REDIS_URL: str | None = None

    # Super Admin
    SUPER_ADMIN_EMAIL: str = "admin@voxcalls.com"
    SUPER_ADMIN_PASSWORD: str = "change-this-password"

    # CORS - includes both local and production frontend URLs
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://voxcalls-retell.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from various formats (JSON string, comma-separated, or list)."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            # Try JSON parsing first (e.g., '["http://localhost:3000"]')
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Fall back to comma-separated
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


settings = Settings()
