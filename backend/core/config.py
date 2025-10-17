from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "sqlite:///./api_studio.db"
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    frontend_url: str = "http://localhost:5173"

    # Optional admin credentials for seeding
    admin_username: Optional[str] = None
    admin_password: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()