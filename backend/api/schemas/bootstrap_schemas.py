"""
Pydantic schemas for bootstrap and authentication endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime


class BootstrapRequest(BaseModel):
    """Schema for bootstrap initiation request."""
    token: str = Field(..., description="Admin bootstrap token")
    email: EmailStr = Field(..., description="Admin email address")


class BootstrapResponse(BaseModel):
    """Schema for bootstrap response."""
    success: bool
    message: str
    smtp_tested: bool
    otp_sent: bool
    timestamp: str


class BootstrapVerifyOTPRequest(BaseModel):
    """Schema for bootstrap OTP verification request."""
    email: EmailStr = Field(..., description="Admin email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class BootstrapVerifyOTPResponse(BaseModel):
    """Schema for bootstrap OTP verification response."""
    success: bool
    message: str
    temp_token: str
    requires_setup: bool
    timestamp: str


class FirstTimePasswordRequest(BaseModel):
    """Schema for first-time password setup request."""
    password: str = Field(..., min_length=12, description="New password")
    confirm_password: str = Field(..., min_length=12, description="Password confirmation")


class FirstTimePasswordResponse(BaseModel):
    """Schema for first-time password setup response."""
    success: bool
    message: str
    two_fa_setup: Dict[str, Any]
    setup_token: str
    timestamp: str


class Verify2FASetupRequest(BaseModel):
    """Schema for 2FA setup verification request."""
    totp_code: str = Field(..., min_length=6, max_length=6, description="TOTP verification code")


class Verify2FASetupResponse(BaseModel):
    """Schema for 2FA setup verification response."""
    success: bool
    message: str
    access_token: str
    token_type: str
    user: Dict[str, Any]
    timestamp: str


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    success: bool = False
    error: str
    message: str
    details: Optional[str] = None
    timestamp: str


class SystemStatusResponse(BaseModel):
    """Schema for system status response."""
    locked: bool
    admin_exists: bool
    app_mode: str
    smtp_configured: bool
    requires_bootstrap: bool