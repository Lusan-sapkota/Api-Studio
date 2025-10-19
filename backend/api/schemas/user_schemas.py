from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    name: Optional[str] = None
    role: str
    two_factor_enabled: bool
    last_login_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Authentication request schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginWith2FARequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# Authentication response schemas
class LoginResponse(BaseModel):
    success: bool
    requires_2fa: Optional[bool] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UserResponse] = None
    message: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class CurrentUserResponse(BaseModel):
    user: UserResponse
    permissions: list[str]