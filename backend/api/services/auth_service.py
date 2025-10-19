"""
Authentication Service for user login, 2FA verification, and session management.
Handles login attempts, account lockouts, and security logging.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any
from sqlmodel import Session, select
from fastapi import HTTPException

from db.models import User, AuditLog, OTPCode
from core.jwt_service import jwt_service
from core.password_service import password_service
from core.two_factor_service import two_factor_service
from core.email_service import email_service
from core.config import settings


class AuthService:
    """Service for authentication operations including login, 2FA, and password reset."""
    
    @staticmethod
    def authenticate_user(
        session: Session, 
        email: str, 
        password: str,
        totp_code: Optional[str] = None,
        backup_code: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[User], Optional[str], Optional[Dict[str, Any]]]:
        """
        Authenticate user with email/password and optional 2FA.
        
        Args:
            session: Database session
            email: User email
            password: User password
            totp_code: Optional TOTP code for 2FA
            backup_code: Optional backup code for 2FA
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, user, token, additional_data)
            additional_data may contain requires_2fa flag
        """
        # Get user by email
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            # Log failed attempt
            AuthService._log_auth_event(
                session, None, "login_failed", "invalid_email", 
                ip_address, user_agent, {"email": email}
            )
            return False, None, None, {"message": "Invalid email or password"}
        
        # Check if account is locked
        if AuthService._is_account_locked(user):
            AuthService._log_auth_event(
                session, user.id, "login_failed", "account_locked",
                ip_address, user_agent
            )
            return False, None, None, {"message": "Account is temporarily locked due to too many failed attempts"}
        
        # Check if account is suspended
        if user.status != "active":
            AuthService._log_auth_event(
                session, user.id, "login_failed", "account_suspended",
                ip_address, user_agent
            )
            return False, None, None, {"message": "Account is suspended"}
        
        # Verify password
        if not password_service.verify_password(password, user.hashed_password):
            # Increment failed attempts
            user.failed_login_attempts += 1
            
            # Lock account if too many failures
            if user.failed_login_attempts >= settings.max_login_attempts:
                user.locked_until = datetime.now(timezone.utc) + timedelta(seconds=settings.login_lockout_duration)
                AuthService._log_auth_event(
                    session, user.id, "account_locked", "max_attempts_exceeded",
                    ip_address, user_agent, {"attempts": user.failed_login_attempts}
                )
            else:
                AuthService._log_auth_event(
                    session, user.id, "login_failed", "invalid_password",
                    ip_address, user_agent, {"attempts": user.failed_login_attempts}
                )
            
            session.add(user)
            session.commit()
            return False, None, None, {"message": "Invalid email or password"}
        
        # Password is correct, check 2FA if enabled
        if user.two_factor_enabled:
            if not totp_code and not backup_code:
                # 2FA required but not provided
                return False, None, None, {"requires_2fa": True, "message": "2FA verification required"}
            
            # Verify 2FA
            if totp_code:
                if not two_factor_service.verify_totp(user.two_factor_secret, totp_code):
                    user.failed_login_attempts += 1
                    session.add(user)
                    session.commit()
                    
                    AuthService._log_auth_event(
                        session, user.id, "login_failed", "invalid_2fa_totp",
                        ip_address, user_agent, {"attempts": user.failed_login_attempts}
                    )
                    return False, None, None, {"message": "Invalid 2FA code"}
            
            elif backup_code:
                if not user.backup_codes:
                    AuthService._log_auth_event(
                        session, user.id, "login_failed", "no_backup_codes",
                        ip_address, user_agent
                    )
                    return False, None, None, {"message": "No backup codes available"}
                
                # Normalize backup code input
                normalized_code = two_factor_service.normalize_backup_code_input(backup_code)
                is_valid, updated_codes = two_factor_service.verify_backup_code(
                    user.backup_codes, normalized_code
                )
                
                if not is_valid:
                    user.failed_login_attempts += 1
                    session.add(user)
                    session.commit()
                    
                    AuthService._log_auth_event(
                        session, user.id, "login_failed", "invalid_backup_code",
                        ip_address, user_agent, {"attempts": user.failed_login_attempts}
                    )
                    return False, None, None, {"message": "Invalid backup code"}
                
                # Update backup codes (mark as used)
                user.backup_codes = updated_codes
        
        # Authentication successful
        # Reset failed attempts and update last login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)
        
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Generate JWT token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name
        }
        
        access_token = jwt_service.create_token(token_data)
        
        # Log successful login
        AuthService._log_auth_event(
            session, user.id, "login_success", "authenticated",
            ip_address, user_agent, {"2fa_used": user.two_factor_enabled}
        )
        
        return True, user, access_token, {"message": "Login successful"}
    
    @staticmethod
    def initiate_password_reset(
        session: Session, 
        email: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Initiate password reset process by sending OTP.
        
        Args:
            session: Database session
            email: User email
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Always returns True to prevent email enumeration
        """
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if user and user.status == "active":
            # Generate OTP
            otp_code = password_service.generate_otp()
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.otp_expiry)
            
            # Store OTP in database
            otp_record = OTPCode(
                email=email,
                otp_code=otp_code,
                otp_type="forgot_password",
                expires_at=expires_at
            )
            session.add(otp_record)
            session.commit()
            
            # Send OTP email
            try:
                email_service.send_password_reset_otp(email, otp_code)
                
                AuthService._log_auth_event(
                    session, user.id, "password_reset_requested", "otp_sent",
                    ip_address, user_agent
                )
            except Exception as e:
                # Log error but don't reveal to user
                AuthService._log_auth_event(
                    session, user.id, "password_reset_failed", "email_send_error",
                    ip_address, user_agent, {"error": str(e)}
                )
        else:
            # Log attempt for non-existent or inactive user
            AuthService._log_auth_event(
                session, None, "password_reset_attempted", "invalid_email",
                ip_address, user_agent, {"email": email}
            )
        
        # Always return True to prevent email enumeration
        return True
    
    @staticmethod
    def verify_password_reset_otp(
        session: Session,
        email: str,
        otp_code: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify OTP for password reset and generate reset token.
        
        Args:
            session: Database session
            email: User email
            otp_code: OTP code to verify
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, reset_token)
        """
        # Get user
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        if not user or user.status != "active":
            return False, None
        
        # Get OTP record
        statement = select(OTPCode).where(
            OTPCode.email == email,
            OTPCode.otp_type == "forgot_password",
            OTPCode.used == False
        ).order_by(OTPCode.created_at.desc())
        otp_record = session.exec(statement).first()
        
        if not otp_record:
            AuthService._log_auth_event(
                session, user.id, "password_reset_failed", "no_otp_found",
                ip_address, user_agent
            )
            return False, None
        
        # Check if OTP is expired
        current_time = datetime.now(timezone.utc)
        expires_at = otp_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if current_time > expires_at:
            AuthService._log_auth_event(
                session, user.id, "password_reset_failed", "otp_expired",
                ip_address, user_agent
            )
            return False, None
        
        # Check attempts
        if otp_record.attempts >= 3:
            AuthService._log_auth_event(
                session, user.id, "password_reset_failed", "max_otp_attempts",
                ip_address, user_agent
            )
            return False, None
        
        # Verify OTP
        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            session.add(otp_record)
            session.commit()
            
            AuthService._log_auth_event(
                session, user.id, "password_reset_failed", "invalid_otp",
                ip_address, user_agent, {"attempts": otp_record.attempts}
            )
            return False, None
        
        # OTP is valid, mark as used
        otp_record.used = True
        session.add(otp_record)
        session.commit()
        
        # Generate reset token
        reset_token = jwt_service.create_reset_token(
            {"user_id": user.id, "email": user.email},
            expires_minutes=30
        )
        
        AuthService._log_auth_event(
            session, user.id, "password_reset_otp_verified", "reset_token_generated",
            ip_address, user_agent
        )
        
        return True, reset_token
    
    @staticmethod
    def reset_password(
        session: Session,
        reset_token: str,
        new_password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Reset user password using reset token.
        
        Args:
            session: Database session
            reset_token: JWT reset token
            new_password: New password
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Verify reset token
            payload = jwt_service.decode_reset_token(reset_token)
            user_id = payload.get("user_id")
            
            if not user_id:
                return False, "Invalid reset token"
            
            # Get user
            user = session.get(User, user_id)
            if not user or user.status != "active":
                return False, "User not found or inactive"
            
            # Validate new password
            is_valid, errors = password_service.validate_complexity(new_password)
            if not is_valid:
                return False, "; ".join(errors)
            
            # Update password
            user.hashed_password = password_service.hash_password(new_password)
            user.requires_password_change = False
            user.failed_login_attempts = 0
            user.locked_until = None
            
            session.add(user)
            session.commit()
            
            # Send confirmation email
            try:
                email_service.send_password_reset_confirmation(user.email)
            except Exception:
                pass  # Don't fail if email can't be sent
            
            AuthService._log_auth_event(
                session, user.id, "password_reset_completed", "password_changed",
                ip_address, user_agent
            )
            
            return True, "Password reset successfully"
            
        except Exception as e:
            return False, f"Invalid or expired reset token: {str(e)}"
    
    @staticmethod
    def get_current_user_permissions(user: User) -> list[str]:
        """
        Get list of permissions for a user based on their role.
        
        Args:
            user: User object
            
        Returns:
            List of permission strings
        """
        base_permissions = ["read_own_profile", "update_own_profile"]
        
        if user.role == "admin":
            return base_permissions + [
                "manage_users", "manage_system", "view_audit_logs",
                "create_workspaces", "manage_workspaces", "delete_workspaces",
                "create_collections", "manage_collections", "delete_collections",
                "create_requests", "manage_requests", "delete_requests"
            ]
        elif user.role == "editor":
            return base_permissions + [
                "create_workspaces", "manage_own_workspaces",
                "create_collections", "manage_collections",
                "create_requests", "manage_requests"
            ]
        elif user.role == "viewer":
            return base_permissions + [
                "view_shared_workspaces", "view_shared_collections", "view_shared_requests"
            ]
        
        return base_permissions
    
    @staticmethod
    def _is_account_locked(user: User) -> bool:
        """
        Check if user account is currently locked.
        
        Args:
            user: User object
            
        Returns:
            True if account is locked, False otherwise
        """
        if not user.locked_until:
            return False
        
        current_time = datetime.now(timezone.utc)
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        
        return current_time < locked_until
    
    @staticmethod
    def _log_auth_event(
        session: Session,
        user_id: Optional[int],
        action: str,
        resource_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Log authentication-related events for audit trail.
        
        Args:
            session: Database session
            user_id: User ID (None for anonymous events)
            action: Action performed
            resource_type: Type of resource/event
            ip_address: Client IP address
            user_agent: Client user agent
            details: Additional event details
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        session.add(audit_log)
        session.commit()


# Global instance
auth_service = AuthService()