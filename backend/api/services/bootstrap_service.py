"""
Bootstrap Service for initial admin setup and system initialization.
Handles bootstrap token validation, OTP management, and admin creation.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any
from sqlmodel import Session, select
from db.models import User, OTPCode, AuditLog
from core.config import settings
from core.email_service import email_service
from core.password_service import password_service
from core.jwt_service import jwt_service
from core.two_factor_service import two_factor_service


logger = logging.getLogger(__name__)


class BootstrapService:
    """Service for handling bootstrap operations and initial admin setup."""
    
    @staticmethod
    def is_system_locked(session: Session) -> bool:
        """
        Check if system is in locked state (no admin users exist).
        
        Args:
            session: Database session
            
        Returns:
            True if system is locked, False otherwise
        """
        # Check if any admin users exist
        admin_query = select(User).where(User.role == "admin", User.status == "active")
        result = session.execute(admin_query)
        admin_user = result.scalars().first()
        return admin_user is None
    
    @staticmethod
    def validate_bootstrap_token(token: str) -> bool:
        """
        Validate the bootstrap token against configuration.
        
        Args:
            token: Bootstrap token to validate
            
        Returns:
            True if token is valid, False otherwise
        """
        if not settings.admin_bootstrap_token:
            logger.error("Admin bootstrap token not configured")
            return False
        
        return token == settings.admin_bootstrap_token
    
    @staticmethod
    async def initiate_bootstrap(
        session: Session, 
        token: str, 
        email: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Initiate bootstrap process with token validation and SMTP testing.
        
        Args:
            session: Database session
            token: Bootstrap token
            email: Admin email address
            
        Returns:
            Tuple of (success, message, details)
        """
        details = {
            "smtp_tested": False,
            "otp_sent": False,
            "token_valid": False
        }
        
        # Check if system is locked
        if not BootstrapService.is_system_locked(session):
            return False, "System already has admin users. Bootstrap not required.", details
        
        # Validate bootstrap token
        if not BootstrapService.validate_bootstrap_token(token):
            logger.warning(f"Invalid bootstrap token attempt for email: {email}")
            return False, "Invalid bootstrap token.", details
        
        details["token_valid"] = True
        
        # Test SMTP connection
        smtp_success, smtp_error = await email_service.test_connection_async()
        details["smtp_tested"] = True
        
        if not smtp_success:
            error_msg = f"SMTP connection failed: {smtp_error}"
            logger.error(error_msg)
            return False, error_msg, details
        
        # Generate and store OTP
        otp = password_service.generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.otp_expiry)
        
        # Remove any existing bootstrap OTPs for this email
        existing_otps_result = session.execute(
            select(OTPCode).where(
                OTPCode.email == email,
                OTPCode.otp_type == "bootstrap"
            )
        )
        existing_otps = existing_otps_result.scalars().all()
        
        for existing_otp in existing_otps:
            session.delete(existing_otp)
        
        # Create new OTP record
        otp_record = OTPCode(
            email=email,
            otp_code=otp,
            otp_type="bootstrap",
            expires_at=expires_at,
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        # Send OTP email
        email_sent = await email_service.send_otp(
            email=email,
            otp=otp,
            otp_type="bootstrap"
        )
        
        details["otp_sent"] = email_sent
        
        if not email_sent:
            logger.error(f"Failed to send bootstrap OTP to {email}")
            return False, "Failed to send verification email. Please check SMTP configuration.", details
        
        # Log bootstrap initiation
        audit_log = AuditLog(
            user_id=None,
            action="bootstrap_initiated",
            resource_type="system",
            details={"email": email, "smtp_tested": True},
            ip_address=None,  # Will be set by middleware
            user_agent=None   # Will be set by middleware
        )
        session.add(audit_log)
        session.commit()
        
        logger.info(f"Bootstrap initiated successfully for email: {email}")
        return True, "Bootstrap initiated. Please check your email for the verification code.", details
    
    @staticmethod
    def verify_bootstrap_otp(
        session: Session, 
        email: str, 
        otp: str
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Verify bootstrap OTP and create temporary token.
        
        Args:
            session: Database session
            email: Admin email address
            otp: OTP code to verify
            
        Returns:
            Tuple of (success, message, temp_token)
        """
        # Find OTP record
        otp_query = select(OTPCode).where(
            OTPCode.email == email,
            OTPCode.otp_type == "bootstrap",
            OTPCode.used == False
        )
        otp_result = session.execute(otp_query)
        otp_record = otp_result.scalars().first()
        
        if not otp_record:
            logger.warning(f"No valid bootstrap OTP found for email: {email}")
            return False, "Invalid or expired verification code.", None
        
        # Check expiry
        now = datetime.now(timezone.utc)
        expires_at = otp_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if now > expires_at:
            logger.warning(f"Expired bootstrap OTP for email: {email}")
            session.delete(otp_record)
            session.commit()
            return False, "Verification code has expired. Please restart the bootstrap process.", None
        
        # Check attempts
        if otp_record.attempts >= 3:
            logger.warning(f"Too many bootstrap OTP attempts for email: {email}")
            session.delete(otp_record)
            session.commit()
            return False, "Too many failed attempts. Please restart the bootstrap process.", None
        
        # Verify OTP
        if otp_record.otp_code != otp:
            otp_record.attempts += 1
            session.commit()
            remaining_attempts = 3 - otp_record.attempts
            return False, f"Invalid verification code. {remaining_attempts} attempts remaining.", None
        
        # Mark OTP as used
        otp_record.used = True
        session.commit()
        
        # Create temporary token for admin setup
        temp_token_data = {
            "email": email,
            "purpose": "admin_setup",
            "step": "password_setup"
        }
        temp_token = jwt_service.create_temp_token(temp_token_data, expires_minutes=15)
        
        # Log successful OTP verification
        audit_log = AuditLog(
            user_id=None,
            action="bootstrap_otp_verified",
            resource_type="system",
            details={"email": email},
            ip_address=None,
            user_agent=None
        )
        session.add(audit_log)
        session.commit()
        
        logger.info(f"Bootstrap OTP verified successfully for email: {email}")
        return True, "Verification successful. You can now set up your admin account.", temp_token
    
    @staticmethod
    def setup_first_time_password(
        session: Session,
        temp_token: str,
        password: str,
        confirm_password: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Set up first-time admin password and prepare 2FA setup.
        
        Args:
            session: Database session
            temp_token: Temporary JWT token from OTP verification
            password: New password
            confirm_password: Password confirmation
            
        Returns:
            Tuple of (success, message, setup_data)
        """
        try:
            # Verify temporary token
            token_data = jwt_service.decode_temp_token(temp_token)
            
            if token_data.get("purpose") != "admin_setup":
                return False, "Invalid setup token.", None
            
            email = token_data.get("email")
            if not email:
                return False, "Invalid token data.", None
            
        except Exception as e:
            logger.error(f"Invalid temp token for password setup: {str(e)}")
            return False, "Invalid or expired setup token.", None
        
        # Validate password confirmation
        if password != confirm_password:
            return False, "Passwords do not match.", None
        
        # Validate password complexity
        is_valid, errors = password_service.validate_complexity(password)
        if not is_valid:
            return False, f"Password does not meet requirements: {'; '.join(errors)}", None
        
        # Check if user already exists
        existing_user_result = session.execute(select(User).where(User.email == email))
        existing_user = existing_user_result.scalars().first()
        if existing_user:
            return False, "Admin user already exists.", None
        
        # Hash password
        hashed_password = password_service.hash_password(password)
        
        # Generate 2FA secret and QR code
        two_fa_secret = two_factor_service.generate_secret()
        qr_code_url = two_factor_service.generate_qr_code(email, two_fa_secret)
        backup_codes = two_factor_service.generate_backup_codes()
        
        # Create admin user (not activated yet)
        admin_user = User(
            username=email.split('@')[0],  # Use email prefix as username
            email=email,
            hashed_password=hashed_password,
            name=email.split('@')[0].title(),
            role="admin",
            two_factor_enabled=False,  # Will be enabled after 2FA setup
            two_factor_secret=two_fa_secret,
            backup_codes=None,  # Will be set after 2FA verification
            requires_password_change=False,
            status="pending_2fa"  # Special status for 2FA setup
        )
        
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        
        # Create new temporary token for 2FA setup
        setup_token_data = {
            "user_id": admin_user.id,
            "email": email,
            "purpose": "2fa_setup",
            "backup_codes": backup_codes  # Include backup codes in token
        }
        setup_token = jwt_service.create_temp_token(setup_token_data, expires_minutes=30)
        
        # Prepare 2FA setup data
        setup_data = {
            "qr_code": qr_code_url,
            "secret": two_fa_secret,
            "backup_codes": backup_codes,
            "setup_token": setup_token
        }
        
        # Log password setup
        audit_log = AuditLog(
            user_id=admin_user.id,
            action="admin_password_set",
            resource_type="user",
            resource_id=str(admin_user.id),
            details={"email": email, "2fa_prepared": True},
            ip_address=None,
            user_agent=None
        )
        session.add(audit_log)
        session.commit()
        
        logger.info(f"First-time password set for admin: {email}")
        return True, "Password set successfully. Please complete 2FA setup.", setup_data
    
    @staticmethod
    def verify_2fa_setup(
        session: Session,
        setup_token: str,
        totp_code: str
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Verify 2FA setup and complete admin account creation.
        
        Args:
            session: Database session
            setup_token: Setup token from password setup
            totp_code: TOTP verification code
            
        Returns:
            Tuple of (success, message, auth_data)
        """
        try:
            # Verify setup token
            token_data = jwt_service.decode_temp_token(setup_token)
            
            if token_data.get("purpose") != "2fa_setup":
                return False, "Invalid setup token.", None
            
            user_id = token_data.get("user_id")
            backup_codes = token_data.get("backup_codes", [])
            
            if not user_id:
                return False, "Invalid token data.", None
            
        except Exception as e:
            logger.error(f"Invalid setup token for 2FA verification: {str(e)}")
            return False, "Invalid or expired setup token.", None
        
        # Get user
        user = session.get(User, user_id)
        if not user or user.status != "pending_2fa":
            return False, "Invalid user state for 2FA setup.", None
        
        # Verify TOTP code
        if not two_factor_service.verify_totp(user.two_factor_secret, totp_code):
            return False, "Invalid verification code. Please try again.", None
        
        # Hash and store backup codes
        hashed_backup_codes = [
            password_service.hash_password(code) for code in backup_codes
        ]
        
        # Complete user setup
        user.two_factor_enabled = True
        user.backup_codes = ",".join(hashed_backup_codes)
        user.status = "active"
        user.last_login_at = datetime.now(timezone.utc)
        
        session.commit()
        session.refresh(user)
        
        # Create session token
        session_data = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "username": user.username
        }
        access_token = jwt_service.create_token(session_data)
        
        # Prepare user data for response
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "two_factor_enabled": user.two_factor_enabled,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
        }
        
        auth_data = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }
        
        # Log successful admin setup completion
        audit_log = AuditLog(
            user_id=user.id,
            action="admin_setup_completed",
            resource_type="user",
            resource_id=str(user.id),
            details={"email": user.email, "2fa_enabled": True},
            ip_address=None,
            user_agent=None
        )
        session.add(audit_log)
        session.commit()
        
        logger.info(f"Admin setup completed successfully for user: {user.email}")
        return True, "Admin setup completed successfully. Welcome to API Studio!", auth_data


# Global instance
bootstrap_service = BootstrapService()