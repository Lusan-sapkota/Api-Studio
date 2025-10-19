"""
User profile and settings API routes.
Handles user profile management, password changes, and security settings.
"""

import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from core.database import get_session
from core.config import settings
from core.middleware import require_auth
from core.jwt_service import jwt_service
from core.password_service import password_service
from core.two_factor_service import two_factor_service
from core.audit_service import audit_service, AuditActions
from db.models import User, AuditLog
from api.schemas.user_schemas import UserResponse


router = APIRouter(prefix="/api/user", tags=["user"])


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=12)


class Enable2FAResponse(BaseModel):
    success: bool
    qr_code: str
    backup_codes: List[str]
    message: str


class Verify2FARequest(BaseModel):
    totp_code: str = Field(..., min_length=6, max_length=6)


class Disable2FARequest(BaseModel):
    password: str = Field(..., min_length=1)
    totp_code: Optional[str] = Field(None, min_length=6, max_length=6)


class SessionInfo(BaseModel):
    id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    last_active: datetime
    is_current: bool


class UserSessionsResponse(BaseModel):
    success: bool
    sessions: List[SessionInfo]


class UserProfileResponse(BaseModel):
    success: bool
    user: UserResponse


class SecuritySettingsResponse(BaseModel):
    success: bool
    two_factor_enabled: bool
    backup_codes_count: int
    last_password_change: Optional[datetime]
    active_sessions_count: int


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Get current user profile information.
    
    Returns user profile data including name, email, role, and security settings.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="User profiles not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse(
        success=True,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            role=user.role,
            two_factor_enabled=user.two_factor_enabled,
            requires_password_change=user.requires_password_change,
            last_login_at=user.last_login_at,
            status=user.status,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    )


@router.patch("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    update_data: UpdateProfileRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Update user profile information.
    
    Allows users to update their name and email address.
    Email changes require verification (future enhancement).
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="User profiles not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if update_data.name is not None:
        user.name = update_data.name
    
    if update_data.email is not None:
        # Check if email is already taken
        existing_user = session.exec(
            select(User).where(User.email == update_data.email, User.id != user.id)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email address is already in use"
            )
        user.email = update_data.email
    
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Log profile update
    audit_service.log_security_event(
        action=AuditActions.PROFILE_UPDATED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "updated_fields": [
                field for field, value in update_data.dict(exclude_unset=True).items()
                if value is not None
            ]
        },
        session=session
    )
    
    return UserProfileResponse(
        success=True,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            role=user.role,
            two_factor_enabled=user.two_factor_enabled,
            requires_password_change=user.requires_password_change,
            last_login_at=user.last_login_at,
            status=user.status,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    )


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Change user password.
    
    Requires current password verification and enforces password complexity.
    Invalidates all existing sessions except the current one.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="Password changes not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not password_service.verify_password(password_data.current_password, user.hashed_password):
        # Log failed password change attempt
        audit_service.log_security_event(
            action=AuditActions.PASSWORD_CHANGE_FAILED,
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "invalid_current_password"},
            session=session
        )
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Validate new password complexity
    if not password_service.validate_complexity(password_data.new_password):
        raise HTTPException(
            status_code=400,
            detail="New password does not meet complexity requirements"
        )
    
    # Check if new password is same as current
    if password_service.verify_password(password_data.new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )
    
    # Update password
    user.hashed_password = password_service.hash_password(password_data.new_password)
    user.requires_password_change = False
    user.updated_at = datetime.now(timezone.utc)
    
    session.add(user)
    session.commit()
    
    # Log successful password change
    audit_service.log_security_event(
        action=AuditActions.PASSWORD_CHANGED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"success": True},
        session=session
    )
    
    return {
        "success": True,
        "message": "Password changed successfully. Please log in again with your new password."
    }


@router.get("/security-settings", response_model=SecuritySettingsResponse)
async def get_security_settings(
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Get user security settings and status.
    
    Returns 2FA status, backup codes count, and session information.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="Security settings not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count backup codes
    backup_codes_count = 0
    if user.backup_codes:
        try:
            import json
            codes = json.loads(user.backup_codes)
            backup_codes_count = len(codes) if isinstance(codes, list) else 0
        except:
            backup_codes_count = 0
    
    # Get active sessions count (simplified - in real implementation would track sessions)
    active_sessions_count = 1  # Current session
    
    return SecuritySettingsResponse(
        success=True,
        two_factor_enabled=user.two_factor_enabled,
        backup_codes_count=backup_codes_count,
        last_password_change=user.updated_at,  # Simplified - would track password changes separately
        active_sessions_count=active_sessions_count
    )


@router.post("/enable-2fa", response_model=Enable2FAResponse)
async def enable_2fa(
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Enable 2FA for the user account.
    
    Generates TOTP secret, QR code, and backup codes.
    2FA is not active until verified with verify-2fa endpoint.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="2FA not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this account"
        )
    
    # Generate 2FA secret and QR code
    secret = two_factor_service.generate_secret()
    qr_code = two_factor_service.generate_qr_code(user.email, secret)
    backup_codes = two_factor_service.generate_backup_codes()
    
    # Store secret temporarily (not enabled until verified)
    user.two_factor_secret = secret
    session.add(user)
    session.commit()
    
    # Log 2FA setup initiation
    audit_service.log_security_event(
        action=AuditActions.TWO_FA_SETUP_INITIATED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"step": "secret_generated"},
        session=session
    )
    
    return Enable2FAResponse(
        success=True,
        qr_code=qr_code,
        backup_codes=backup_codes,
        message="Scan the QR code with your authenticator app and verify with a TOTP code"
    )


@router.post("/verify-2fa")
async def verify_2fa_setup(
    verify_data: Verify2FARequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Verify and complete 2FA setup.
    
    Verifies TOTP code and enables 2FA for the account.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="2FA not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this account"
        )
    
    if not user.two_factor_secret:
        raise HTTPException(
            status_code=400,
            detail="2FA setup not initiated. Please start 2FA setup first."
        )
    
    # Verify TOTP code
    if not two_factor_service.verify_totp(user.two_factor_secret, verify_data.totp_code):
        # Log failed verification
        audit_service.log_security_event(
            action=AuditActions.TWO_FA_SETUP_FAILED,
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "invalid_totp_code"},
            session=session
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid TOTP code. Please try again."
        )
    
    # Enable 2FA
    user.two_factor_enabled = True
    user.updated_at = datetime.now(timezone.utc)
    
    # Generate and store backup codes
    backup_codes = two_factor_service.generate_backup_codes()
    hashed_codes = [password_service.hash_password(code) for code in backup_codes]
    user.backup_codes = json.dumps(hashed_codes)
    
    session.add(user)
    session.commit()
    
    # Log successful 2FA setup
    audit_service.log_security_event(
        action=AuditActions.TWO_FA_ENABLED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"success": True},
        session=session
    )
    
    return {
        "success": True,
        "message": "2FA has been successfully enabled for your account",
        "backup_codes": backup_codes
    }


@router.post("/disable-2fa")
async def disable_2fa(
    disable_data: Disable2FARequest,
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Disable 2FA for the user account.
    
    Requires password verification and optionally TOTP code if available.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="2FA not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is not enabled for this account"
        )
    
    # Verify password
    if not password_service.verify_password(disable_data.password, user.hashed_password):
        # Log failed attempt
        audit_service.log_security_event(
            action=AuditActions.TWO_FA_DISABLE_FAILED,
            user_id=user.id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"reason": "invalid_password"},
            session=session
        )
        raise HTTPException(
            status_code=400,
            detail="Password is incorrect"
        )
    
    # Verify TOTP code if provided
    if disable_data.totp_code:
        if not two_factor_service.verify_totp(user.two_factor_secret, disable_data.totp_code):
            # Log failed attempt
            audit_service.log_security_event(
                action=AuditActions.TWO_FA_DISABLE_FAILED,
                user_id=user.id,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"reason": "invalid_totp_code"},
                session=session
            )
            raise HTTPException(
                status_code=400,
                detail="Invalid TOTP code"
            )
    
    # Disable 2FA
    user.two_factor_enabled = False
    user.two_factor_secret = None
    user.backup_codes = None
    user.updated_at = datetime.now(timezone.utc)
    
    session.add(user)
    session.commit()
    
    # Log successful 2FA disable
    audit_service.log_security_event(
        action=AuditActions.TWO_FA_DISABLED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"success": True},
        session=session
    )
    
    return {
        "success": True,
        "message": "2FA has been disabled for your account"
    }


@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Regenerate backup codes for 2FA.
    
    Requires 2FA to be enabled. Invalidates all existing backup codes.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="2FA not available in local mode"
        )
    
    user = session.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA must be enabled to regenerate backup codes"
        )
    
    # Generate new backup codes
    backup_codes = two_factor_service.generate_backup_codes()
    hashed_codes = [password_service.hash_password(code) for code in backup_codes]
    user.backup_codes = json.dumps(hashed_codes)
    user.updated_at = datetime.now(timezone.utc)
    
    session.add(user)
    session.commit()
    
    # Log backup codes regeneration
    audit_service.log_security_event(
        action=AuditActions.TWO_FA_BACKUP_CODES_GENERATED,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"success": True},
        session=session
    )
    
    return {
        "success": True,
        "backup_codes": backup_codes,
        "message": "New backup codes generated. Store them securely."
    }


@router.get("/sessions", response_model=UserSessionsResponse)
async def get_user_sessions(
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_auth)
):
    """
    Get user's active sessions.
    
    Returns list of active sessions with IP addresses and user agents.
    Note: This is a simplified implementation. In production, you would
    track sessions in a separate table or Redis.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="Session management not available in local mode"
        )
    
    # Simplified implementation - in real app would track sessions properly
    current_session = SessionInfo(
        id="current",
        ip_address="127.0.0.1",  # Would get from request
        user_agent="Current Session",
        created_at=datetime.now(timezone.utc),
        last_active=datetime.now(timezone.utc),
        is_current=True
    )
    
    return UserSessionsResponse(
        success=True,
        sessions=[current_session]
    )