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
    algorithm: str = "HS256"
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

    # New authentication settings
    app_mode: str = "local"  # "hosted" or "local"
    
    # JWT Configuration
    jwt_secret: Optional[str] = None
    jwt_expiry: int = 86400  # 24 hours
    
    # SMTP Configuration (hosted mode only)
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    email_from: Optional[str] = None
    smtp_use_tls: bool = True
    
    # Bootstrap Configuration
    admin_bootstrap_token: Optional[str] = None
    
    # Security Settings
    otp_expiry: int = 600  # 10 minutes
    max_login_attempts: int = 5
    login_lockout_duration: int = 900  # 15 minutes
    
    # 2FA Settings
    app_name: str = "API Studio"

    class Config:
        env_file = ".env"


settings = Settings()