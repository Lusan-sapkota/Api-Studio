from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from typing import Optional

from core.database import get_session
from core.config import settings
from core.jwt_service import jwt_service
from db.models import User
from api.schemas.user_schemas import (
    LoginWith2FARequest, ForgotPasswordRequest, VerifyOTPRequest, 
    ResetPasswordRequest, LoginResponse, AuthResponse, CurrentUserResponse,
    UserResponse
)
from api.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


def get_current_user(request: Request, session: Session = Depends(get_session)) -> User:
    """Get current authenticated user from JWT token."""
    # Skip authentication in local mode
    if settings.app_mode == "local":
        # In local mode, return a default admin user or create one
        admin_user = session.exec(select(User).where(User.role == "admin")).first()
        if not admin_user:
            # Create default admin for local mode
            from core.password_service import password_service
            admin_user = User(
                username="admin",
                email="admin@localhost",
                hashed_password=password_service.hash_password("admin"),
                name="Local Admin",
                role="admin",
                status="active"
            )
            session.add(admin_user)
            session.commit()
            session.refresh(admin_user)
        return admin_user
    
    # Hosted mode - require JWT token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt_service.verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        user = session.get(User, int(user_id))
        if not user or user.status != "active":
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        return user
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")


@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginWith2FARequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Authenticate user with email/password and optional 2FA.
    
    - **email**: User email address
    - **password**: User password
    - **totp_code**: Optional TOTP code for 2FA (6 digits)
    - **backup_code**: Optional backup code for 2FA recovery
    """
    # Skip authentication in local mode
    if settings.app_mode == "local":
        return LoginResponse(
            success=True,
            access_token="local-mode-token",
            token_type="bearer",
            message="Local mode - authentication bypassed"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    success, user, token, additional_data = auth_service.authenticate_user(
        session=session,
        email=login_data.email,
        password=login_data.password,
        totp_code=login_data.totp_code,
        backup_code=login_data.backup_code,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        if additional_data and additional_data.get("requires_2fa"):
            return LoginResponse(
                success=False,
                requires_2fa=True,
                message=additional_data.get("message", "2FA verification required")
            )
        
        raise HTTPException(
            status_code=401,
            detail=additional_data.get("message", "Authentication failed")
        )
    
    # Convert user to response format
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        name=user.name,
        role=user.role,
        two_factor_enabled=user.two_factor_enabled,
        last_login_at=user.last_login_at,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    
    return LoginResponse(
        success=True,
        access_token=token,
        token_type="bearer",
        user=user_response,
        message=additional_data.get("message", "Login successful")
    )


@router.post("/forgot-password", response_model=AuthResponse)
def forgot_password(
    request_data: ForgotPasswordRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Initiate password reset process by sending OTP to email.
    
    - **email**: User email address
    
    Always returns success to prevent email enumeration.
    """
    if settings.app_mode == "local":
        return AuthResponse(
            success=True,
            message="Local mode - password reset not required"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    auth_service.initiate_password_reset(
        session=session,
        email=request_data.email,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return AuthResponse(
        success=True,
        message="If the email exists in our system, you will receive a password reset code shortly."
    )


@router.post("/forgot-password/verify-otp", response_model=AuthResponse)
def verify_password_reset_otp(
    request_data: VerifyOTPRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Verify OTP for password reset and receive reset token.
    
    - **email**: User email address
    - **otp_code**: 6-digit OTP code from email
    """
    if settings.app_mode == "local":
        return AuthResponse(
            success=True,
            message="Local mode - password reset not required"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    success, reset_token = auth_service.verify_password_reset_otp(
        session=session,
        email=request_data.email,
        otp_code=request_data.otp_code,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP code"
        )
    
    return AuthResponse(
        success=True,
        message="OTP verified successfully",
        data={"reset_token": reset_token}
    )


@router.post("/reset-password", response_model=AuthResponse)
def reset_password(
    request_data: ResetPasswordRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Reset password using reset token.
    
    - **token**: Reset token from OTP verification
    - **new_password**: New password (must meet complexity requirements)
    """
    if settings.app_mode == "local":
        return AuthResponse(
            success=True,
            message="Local mode - password reset not required"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    success, message = auth_service.reset_password(
        session=session,
        reset_token=request_data.token,
        new_password=request_data.new_password,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return AuthResponse(
        success=True,
        message=message
    )


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information and permissions.
    """
    user_response = UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        two_factor_enabled=current_user.two_factor_enabled,
        last_login_at=current_user.last_login_at,
        status=current_user.status,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )
    
    permissions = auth_service.get_current_user_permissions(current_user)
    
    return CurrentUserResponse(
        user=user_response,
        permissions=permissions
    )


@router.post("/logout", response_model=AuthResponse)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Logout current user and invalidate session.
    
    Note: In a stateless JWT implementation, the client should discard the token.
    This endpoint is provided for logging purposes and future session management.
    """
    if settings.app_mode == "local":
        return AuthResponse(
            success=True,
            message="Local mode - logout not required"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    # Log logout event
    auth_service._log_auth_event(
        session=session,
        user_id=current_user.id,
        action="logout",
        resource_type="session",
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return AuthResponse(
        success=True,
        message="Logged out successfully"
    )