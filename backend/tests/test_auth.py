import pytest
from sqlmodel import Session
from api.services.user_service import UserService
from api.schemas.user_schemas import UserCreate


def test_create_user(session: Session):
    user_data = UserCreate(
        username="testuser",
        email="test@example.com",
        password="password123"
    )
    user = UserService.create_user(session, user_data)
    assert user.username == "testuser"
    assert user.email == "test@example.com"


def test_authenticate_user(session: Session):
    user = UserService.authenticate_user(session, "testuser", "password123")
    assert user is not None
    assert user.username == "testuser"


# TODO: Add more comprehensive tests