"""
Bootstrap API routes for initial admin setup and system initialization.
Handles bootstrap token validation, OTP verification, and admin account creation.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from core.database import get_session
from core.config import settings
from core.rate_limiter import rate_limiter
from core.security_validator import security_validator
from core.audit_service import audit_service, AuditActions
from api.schemas.bootstrap_schemas import (
    BootstrapRequest, BootstrapResponse,
    BootstrapVerifyOTPRequest, BootstrapVerifyOTPResponse,
    FirstTimePasswordRequest, FirstTimePasswordResponse,
    Verify2FASetupRequest, Verify2FASetupResponse,
    ErrorResponse, SystemStatusResponse
)
from api.services.bootstrap_service import bootstrap_service


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["bootstrap"])


def get_client_info(request: Request) -> tuple[str, str]:
    """Extract client IP and user agent from request."""
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return ip_address, user_agent


@router.get("/system-status", response_model=SystemStatusResponse)
def get_system_status(session: Session = Depends(get_session)):
    """
    Get system status and bootstrap requirements.
    
    Returns information about system lock state, admin existence,
    and configuration status.
    """
    try:
        is_locked = bootstrap_service.is_system_locked(session)
        
        return SystemStatusResponse(
            locked=is_locked,
            admin_exists=not is_locked,
            app_mode=settings.app_mode,
            smtp_configured=bool(
                settings.smtp_server and 
                settings.smtp_user and 
                settings.smtp_password
            ),
            requires_bootstrap=is_locked and settings.app_mode == "hosted"
        )
        
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "SYSTEM_ERROR",
                "message": "Failed to get system status",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.post("/bootstrap", response_model=BootstrapResponse)
async def initiate_bootstrap(
    request_data: BootstrapRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Initiate bootstrap process for first admin setup.
    
    Validates bootstrap token, tests SMTP connection, and sends OTP email.
    Only works when system is in locked state (no admin users exist).
    """
    try:
        # Check if app is in hosted mode
        if settings.app_mode != "hosted":
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "INVALID_MODE",
                    "message": "Bootstrap is only available in hosted mode",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Get client info for logging
        ip_address, user_agent = get_client_info(request)
        
        # Validate input
        is_valid, error_msg = security_validator.validate_email(request_data.email)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Check rate limits
        allowed, reason, retry_after = rate_limiter.check_rate_limit(
            endpoint="bootstrap",
            ip_address=ip_address,
            email=request_data.email
        )
        
        if not allowed:
            # Log rate limit exceeded
            audit_service.log_security_event(
                action=AuditActions.RATE_LIMIT_EXCEEDED,
                ip_address=ip_address,
                user_agent=user_agent,
                details={"endpoint": "bootstrap", "email": request_data.email, "reason": reason},
                session=session
            )
            
            headers = {}
            if retry_after:
                headers["Retry-After"] = str(retry_after)
            
            raise HTTPException(
                status_code=429,
                detail=reason,
                headers=headers
            )
        
        # Initiate bootstrap
        success, message, details = await bootstrap_service.initiate_bootstrap(
            session=session,
            token=request_data.token,
            email=request_data.email
        )
        
        # Record attempt for rate limiting
        rate_limiter.record_attempt(
            endpoint="bootstrap",
            success=success,
            ip_address=ip_address,
            email=request_data.email
        )
        
        if not success:
            # Log failed attempt
            logger.warning(
                f"Bootstrap initiation failed from {ip_address}: {message}",
                extra={
                    "email": request_data.email,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "details": details
                }
            )
            
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "BOOTSTRAP_FAILED",
                    "message": message,
                    "details": f"SMTP tested: {details.get('smtp_tested', False)}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Log successful initiation
        logger.info(
            f"Bootstrap initiated successfully from {ip_address}",
            extra={
                "email": request_data.email,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "details": details
            }
        )
        
        return BootstrapResponse(
            success=True,
            message=message,
            smtp_tested=details.get("smtp_tested", False),
            otp_sent=details.get("otp_sent", False),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in bootstrap initiation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": "Internal server error during bootstrap",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.post("/bootstrap/verify-otp", response_model=BootstrapVerifyOTPResponse)
def verify_bootstrap_otp(
    request_data: BootstrapVerifyOTPRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Verify bootstrap OTP and create temporary token for admin setup.
    
    Validates the OTP sent during bootstrap initiation and returns
    a temporary token for password and 2FA setup.
    """
    try:
        # Check if app is in hosted mode
        if settings.app_mode != "hosted":
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "INVALID_MODE",
                    "message": "Bootstrap is only available in hosted mode",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Get client info for logging
        ip_address, user_agent = get_client_info(request)
        
        # Check if system is still locked (no admin users exist)
        if not bootstrap_service.is_system_locked(session):
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "SYSTEM_NOT_LOCKED",
                    "message": "System already has admin users. Bootstrap not required.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Verify OTP
        success, message, temp_token = bootstrap_service.verify_bootstrap_otp(
            session=session,
            email=request_data.email,
            otp=request_data.otp
        )
        
        if not success:
            # Log failed attempt
            logger.warning(
                f"Bootstrap OTP verification failed from {ip_address}: {message}",
                extra={
                    "email": request_data.email,
                    "ip_address": ip_address,
                    "user_agent": user_agent
                }
            )
            
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "OTP_VERIFICATION_FAILED",
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Log successful verification
        logger.info(
            f"Bootstrap OTP verified successfully from {ip_address}",
            extra={
                "email": request_data.email,
                "ip_address": ip_address,
                "user_agent": user_agent
            }
        )
        
        return BootstrapVerifyOTPResponse(
            success=True,
            message=message,
            temp_token=temp_token,
            requires_setup=True,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in OTP verification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": "Internal server error during OTP verification",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.post("/auth/first-time-password", response_model=FirstTimePasswordResponse)
def setup_first_time_password(
    request_data: FirstTimePasswordRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Set up first-time admin password and prepare 2FA setup.
    
    Requires temporary token from OTP verification.
    Creates admin user and prepares 2FA setup data.
    """
    try:
        # Get authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail={
                    "success": False,
                    "error": "MISSING_TOKEN",
                    "message": "Temporary token required",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        temp_token = auth_header.split(" ")[1]
        
        # Get client info for logging
        ip_address, user_agent = get_client_info(request)
        
        # Setup password
        success, message, setup_data = bootstrap_service.setup_first_time_password(
            session=session,
            temp_token=temp_token,
            password=request_data.password,
            confirm_password=request_data.confirm_password
        )
        
        if not success:
            # Log failed attempt
            logger.warning(
                f"First-time password setup failed from {ip_address}: {message}",
                extra={
                    "ip_address": ip_address,
                    "user_agent": user_agent
                }
            )
            
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "PASSWORD_SETUP_FAILED",
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Log successful password setup
        logger.info(
            f"First-time password setup successful from {ip_address}",
            extra={
                "ip_address": ip_address,
                "user_agent": user_agent
            }
        )
        
        return FirstTimePasswordResponse(
            success=True,
            message=message,
            two_fa_setup={
                "qr_code": setup_data["qr_code"],
                "secret": setup_data["secret"],
                "backup_codes": setup_data["backup_codes"]
            },
            setup_token=setup_data["setup_token"],
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in password setup: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": "Internal server error during password setup",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.post("/auth/verify-2fa-setup", response_model=Verify2FASetupResponse)
def verify_2fa_setup(
    request_data: Verify2FASetupRequest,
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Verify 2FA setup and complete admin account creation.
    
    Requires setup token from password setup.
    Completes admin user creation and returns session token.
    """
    try:
        # Get authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail={
                    "success": False,
                    "error": "MISSING_TOKEN",
                    "message": "Setup token required",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        setup_token = auth_header.split(" ")[1]
        
        # Get client info for logging
        ip_address, user_agent = get_client_info(request)
        
        # Verify 2FA setup
        success, message, auth_data = bootstrap_service.verify_2fa_setup(
            session=session,
            setup_token=setup_token,
            totp_code=request_data.totp_code
        )
        
        if not success:
            # Log failed attempt
            logger.warning(
                f"2FA setup verification failed from {ip_address}: {message}",
                extra={
                    "ip_address": ip_address,
                    "user_agent": user_agent
                }
            )
            
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": "2FA_SETUP_FAILED",
                    "message": message,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Log successful 2FA setup
        logger.info(
            f"2FA setup completed successfully from {ip_address}",
            extra={
                "user_id": auth_data["user"]["id"],
                "email": auth_data["user"]["email"],
                "ip_address": ip_address,
                "user_agent": user_agent
            }
        )
        
        return Verify2FASetupResponse(
            success=True,
            message=message,
            access_token=auth_data["access_token"],
            token_type=auth_data["token_type"],
            user=auth_data["user"],
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in 2FA setup verification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": "Internal server error during 2FA setup",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


