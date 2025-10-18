from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from core.database import get_session
from api.schemas.user_schemas import UserCreate, Token
from api.services.user_service import UserService
from core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    # Check if user exists
    existing_user = UserService.get_user_by_username(session, user_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = UserService.get_user_by_email(session, user_data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = UserService.create_user(session, user_data)
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(username: str, password: str, session: Session = Depends(get_session)):
    user = UserService.authenticate_user(session, username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# TODO: Implement token refresh, logout, etc.