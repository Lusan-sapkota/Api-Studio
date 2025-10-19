from sqlmodel import Session
from typing import Optional
from db.models import User
from api.schemas.user_schemas import UserCreate, UserUpdate
from core.security import get_password_hash, verify_password


class UserService:
    @staticmethod
    def get_user(session: Session, user_id: int) -> Optional[User]:
        return session.get(User, user_id)

    @staticmethod
    def get_user_by_id(session: Session, user_id: int) -> Optional[User]:
        return session.get(User, user_id)

    @staticmethod
    def get_user_by_username(session: Session, username: str) -> Optional[User]:
        return session.query(User).filter(User.username == username).first()

    @staticmethod
    def get_user_by_email(session: Session, email: str) -> Optional[User]:
        return session.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(session: Session, user_data: UserCreate) -> User:
        hashed_password = get_password_hash(user_data.password)
        user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    @staticmethod
    def update_user(session: Session, user_id: int, update_data: UserUpdate) -> Optional[User]:
        user = session.get(User, user_id)
        if not user:
            return None
        for field, value in update_data.dict(exclude_unset=True).items():
            if field == "password":
                value = get_password_hash(value)
                field = "hashed_password"
            setattr(user, field, value)
        session.commit()
        session.refresh(user)
        return user

    @staticmethod
    def delete_user(session: Session, user_id: int) -> bool:
        user = session.get(User, user_id)
        if not user:
            return False
        session.delete(user)
        session.commit()
        return True

    @staticmethod
    def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
        user = UserService.get_user_by_username(session, username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user