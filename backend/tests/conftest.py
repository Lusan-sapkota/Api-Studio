"""
Test configuration and fixtures for authentication services.
"""

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from core.config import Settings


@pytest.fixture(name="session")
def session_fixture():
    """Create a test database session."""
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with SessionLocal() as session:
        yield session


@pytest.fixture
def test_settings():
    """Create test settings."""
    return Settings(
        database_url="sqlite:///:memory:",
        secret_key="test-secret-key",
        jwt_secret="test-jwt-secret",
        algorithm="HS256",
        access_token_expire_minutes=30,
        frontend_url="http://localhost:3000",
        app_mode="hosted",
        jwt_expiry=86400,
        otp_expiry=600,
        max_login_attempts=5,
        login_lockout_duration=900,
        app_name="API Studio Test"
    )