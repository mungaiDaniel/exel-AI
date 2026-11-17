from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # App
    APP_NAME: str = "ExcelAI Dashboard"
    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Database
    DATABASE_URL: str = "postgresql://postgres:username@localhost:5432/excelai_db"
    ASYNC_DATABASE_URL: str = "postgresql+asyncpg://postgres:username@localhost:5432/excelai_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio_admin"
    MINIO_SECRET_KEY: str = "minio_secret"
    MINIO_BUCKET: str = "excelai-files"
    MINIO_SECURE: bool = False
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_DIR: str = "uploads"

    # AI — set AI_PROVIDER to "groq" to use the free Groq tier instead of Anthropic
    AI_PROVIDER: str = "anthropic"   # "anthropic" | "groq"
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-sonnet-4-6"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # JWT
    JWT_SECRET_KEY: str = "dev-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"debug", "development", "dev"}:
                return True
        return value


settings = Settings()
