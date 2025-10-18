try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str
    
    # Security
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    
    # CORS
    frontend_url: str

    # Optional admin credentials for seeding
    admin_username: Optional[str] = None
    admin_password: Optional[str] = None

    # WebSocket settings
    websocket_debug: bool = False

    # Server settings (used by start.py)
    host: Optional[str] = None
    port: Optional[int] = None
    reload: Optional[bool] = None

    class Config:
        env_file = ".env"


settings = Settings()