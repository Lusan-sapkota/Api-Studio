"""
Admin Service for user management, invitations, and collaborator operations.
Handles invitation creation, user role management, and admin operations.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List, Dict, Any
from sqlmodel import Session, select
from fastapi import HTTPException

from db.models import User, Invitation, OTPCode, AuditLog
from core.jwt_service import jwt_service
from core.password_service import password_service
from core.two_factor_service import two_factor_service
from core.email_service import email_service
from core.config import settings


class AdminService:
    """Service for admin operations including user management and invitations."""
    
    @staticmethod
    def invite_user(
        session: Session,
        admin_user: User,
        email: str,
        role: str,
        name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[int], Optional[str], Optional[datetime]]:
        """
        Invite a new user to the system.
        
        Args:
            session: Database session
            admin_user: Admin user creating the invitation
            email: Email address to invite
            role: Role to assign (admin, editor, viewer)
            name: Optional display name
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, invitation_id, message, expires_at)
        """
        # Validate role
        valid_roles = ["admin", "editor", "viewer"]
        if role not in valid_roles:
            return False, None, f"Invalid role. Must be one of: {', '.join(valid_roles)}", None
        
        # Check if user already exists
        existing_user = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing_user:
            AdminService._log_admin_event(
                session, admin_user.id, "invite_failed", "user_exists",
                ip_address, user_agent, {"email": email}
            )
            return False, None, "User with this email already exists", None
        
        # Check for existing pending invitation
        existing_invitation = session.execute(
            select(Invitation).where(
                Invitation.email == email,
                Invitation.accepted == False,
                Invitation.expires_at > datetime.now(timezone.utc)
            )
        ).scalar_one_or_none()
        
        if existing_invitation:
            AdminService._log_admin_event(
                session, admin_user.id, "invite_failed", "invitation_exists",
                ip_address, user_agent, {"email": email}
            )
            return False, None, "Pending invitation already exists for this email", None
        
        # Generate OTP and create invitation
        otp_code = password_service.generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)  # 24-hour expiry for invitations
        
        invitation = Invitation(
            email=email,
            role=role,
            invited_by=admin_user.id,
            otp_code=otp_code,
            expires_at=expires_at,
            accepted=False
        )
        
        session.add(invitation)
        session.commit()
        session.refresh(invitation)
        
        # Send invitation email
        try:
            email_service.send_invitation_email(
                email=email,
                role=role,
                otp_code=otp_code,
                inviter_name=admin_user.name or admin_user.username,
                expires_at=expires_at
            )
            
            AdminService._log_admin_event(
                session, admin_user.id, "user_invited", "invitation_sent",
                ip_address, user_agent, {
                    "email": email,
                    "role": role,
                    "invitation_id": invitation.id
                }
            )
            
            return True, invitation.id, "Invitation sent successfully", expires_at
            
        except Exception as e:
            # Remove invitation if email failed
            session.delete(invitation)
            session.commit()
            
            AdminService._log_admin_event(
                session, admin_user.id, "invite_failed", "email_send_error",
                ip_address, user_agent, {
                    "email": email,
                    "error": str(e)
                }
            )
            
            return False, None, "Failed to send invitation email", None
    
    @staticmethod
    def verify_invitation(
        session: Session,
        email: str,
        otp_code: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[datetime]]:
        """
        Verify invitation OTP and generate setup token.
        
        Args:
            session: Database session
            email: Email address
            otp_code: OTP code to verify
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, setup_token, role, expires_at)
        """
        # Get invitation
        invitation = session.execute(
            select(Invitation).where(
                Invitation.email == email,
                Invitation.accepted == False
            ).order_by(Invitation.created_at.desc())
        ).scalar_one_or_none()
        
        if not invitation:
            AdminService._log_admin_event(
                session, None, "invitation_verification_failed", "no_invitation",
                ip_address, user_agent, {"email": email}
            )
            return False, None, None, None
        
        # Check if invitation is expired
        current_time = datetime.now(timezone.utc)
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if current_time > expires_at:
            AdminService._log_admin_event(
                session, invitation.invited_by, "invitation_verification_failed", "invitation_expired",
                ip_address, user_agent, {"email": email, "invitation_id": invitation.id}
            )
            return False, None, None, None
        
        # Verify OTP
        if invitation.otp_code != otp_code:
            AdminService._log_admin_event(
                session, invitation.invited_by, "invitation_verification_failed", "invalid_otp",
                ip_address, user_agent, {"email": email, "invitation_id": invitation.id}
            )
            return False, None, None, None
        
        # Generate setup token (30 minutes to complete setup)
        setup_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        setup_token = jwt_service.create_temp_token(
            {
                "email": email,
                "role": invitation.role,
                "invitation_id": invitation.id,
                "type": "collaborator_setup"
            },
            expires_minutes=30
        )
        
        AdminService._log_admin_event(
            session, invitation.invited_by, "invitation_verified", "setup_token_generated",
            ip_address, user_agent, {"email": email, "invitation_id": invitation.id}
        )
        
        return True, setup_token, invitation.role, setup_expires_at
    
    @staticmethod
    def complete_collaborator_setup(
        session: Session,
        setup_token: str,
        password: str,
        confirm_password: str,
        enable_2fa: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Complete collaborator account setup with password and optional 2FA.
        
        Args:
            session: Database session
            setup_token: JWT setup token from invitation verification
            password: New password
            confirm_password: Password confirmation
            enable_2fa: Whether to enable 2FA
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, message, response_data)
        """
        try:
            # Verify setup token
            payload = jwt_service.decode_temp_token(setup_token)
            
            if payload.get("type") not in ["temporary", "collaborator_setup"]:
                return False, "Invalid setup token", None
            
            email = payload.get("email")
            role = payload.get("role")
            invitation_id = payload.get("invitation_id")
            
            if not all([email, role, invitation_id]):
                return False, "Invalid setup token payload", None
            
            # Verify invitation still exists and is valid
            invitation = session.get(Invitation, invitation_id)
            if not invitation or invitation.accepted or invitation.email != email:
                return False, "Invalid or expired invitation", None
            
            # Validate passwords match
            if password != confirm_password:
                return False, "Passwords do not match", None
            
            # Validate password complexity
            is_valid, errors = password_service.validate_complexity(password)
            if not is_valid:
                return False, "; ".join(errors), None
            
            # Check if user already exists (shouldn't happen, but safety check)
            existing_user = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
            if existing_user:
                return False, "User account already exists", None
            
            # Create user account
            username = email.split("@")[0]  # Use email prefix as username
            counter = 1
            original_username = username
            
            # Ensure unique username
            while session.execute(select(User).where(User.username == username)).scalar_one_or_none():
                username = f"{original_username}{counter}"
                counter += 1
            
            hashed_password = password_service.hash_password(password)
            
            user = User(
                username=username,
                email=email,
                hashed_password=hashed_password,
                name=email.split("@")[0].title(),  # Default name from email
                role=role,
                status="active",
                two_factor_enabled=False,
                requires_password_change=False
            )
            
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Mark invitation as accepted
            invitation.accepted = True
            session.add(invitation)
            session.commit()
            
            response_data = {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": user.name,
                    "role": user.role,
                    "two_factor_enabled": user.two_factor_enabled,
                    "status": user.status,
                    "created_at": user.created_at.isoformat(),
                    "updated_at": user.updated_at.isoformat()
                }
            }
            
            # Handle 2FA setup if requested
            if enable_2fa:
                secret = two_factor_service.generate_secret()
                qr_code = two_factor_service.generate_qr_code(user.email, secret)
                backup_codes = two_factor_service.generate_backup_codes()
                
                # Store secret temporarily (will be confirmed later)
                user.two_factor_secret = secret
                session.add(user)
                session.commit()
                
                response_data["two_fa_setup"] = {
                    "secret": secret,
                    "qr_code": qr_code,
                    "backup_codes": backup_codes,
                    "requires_verification": True
                }
                
                # Generate setup token for 2FA verification
                setup_token = jwt_service.create_temp_token(
                    {
                        "user_id": user.id,
                        "email": user.email,
                        "type": "2fa_setup"
                    },
                    expires_minutes=15
                )
                
                response_data["setup_token"] = setup_token
                message = "Account created successfully. Please verify 2FA setup."
            else:
                # Generate access token for immediate login
                token_data = {
                    "sub": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "name": user.name
                }
                
                access_token = jwt_service.create_token(token_data)
                response_data["access_token"] = access_token
                response_data["token_type"] = "bearer"
                message = "Account created and logged in successfully"
            
            AdminService._log_admin_event(
                session, invitation.invited_by, "collaborator_setup_completed", "account_created",
                ip_address, user_agent, {
                    "user_id": user.id,
                    "email": email,
                    "role": role,
                    "2fa_enabled": enable_2fa
                }
            )
            
            return True, message, response_data
            
        except Exception as e:
            return False, f"Setup failed: {str(e)}", None
    
    @staticmethod
    def list_collaborators(
        session: Session,
        admin_user: User
    ) -> List[Dict[str, Any]]:
        """
        List all collaborators in the system.
        
        Args:
            session: Database session
            admin_user: Admin user requesting the list
            
        Returns:
            List of collaborator information
        """
        users = session.execute(select(User).order_by(User.created_at)).scalars().all()
        
        collaborators = []
        for user in users:
            # Get inviter information if available
            invited_by = None
            invitation = session.execute(
                select(Invitation).where(
                    Invitation.email == user.email,
                    Invitation.accepted == True
                ).order_by(Invitation.created_at.desc())
            ).scalar_one_or_none()
            
            if invitation:
                inviter = session.get(User, invitation.invited_by)
                if inviter:
                    invited_by = inviter.name or inviter.username
            
            collaborators.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "status": user.status,
                "two_factor_enabled": user.two_factor_enabled,
                "last_login_at": user.last_login_at,
                "created_at": user.created_at,
                "invited_by": invited_by
            })
        
        return collaborators
    
    @staticmethod
    def update_collaborator_role(
        session: Session,
        admin_user: User,
        collaborator_id: int,
        new_role: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Update a collaborator's role.
        
        Args:
            session: Database session
            admin_user: Admin user making the change
            collaborator_id: ID of user to update
            new_role: New role to assign
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, message, user_data)
        """
        # Validate role
        valid_roles = ["admin", "editor", "viewer"]
        if new_role not in valid_roles:
            return False, f"Invalid role. Must be one of: {', '.join(valid_roles)}", None
        
        # Get collaborator
        collaborator = session.get(User, collaborator_id)
        if not collaborator:
            return False, "User not found", None
        
        # Prevent admin from changing their own role
        if collaborator.id == admin_user.id:
            AdminService._log_admin_event(
                session, admin_user.id, "role_update_failed", "self_modification_attempted",
                ip_address, user_agent, {"target_user_id": collaborator_id}
            )
            return False, "Cannot modify your own role", None
        
        # Store old role for logging
        old_role = collaborator.role
        
        # Update role
        collaborator.role = new_role
        session.add(collaborator)
        session.commit()
        session.refresh(collaborator)
        
        # Log the change
        AdminService._log_admin_event(
            session, admin_user.id, "role_updated", "collaborator_role_changed",
            ip_address, user_agent, {
                "target_user_id": collaborator.id,
                "target_email": collaborator.email,
                "old_role": old_role,
                "new_role": new_role
            }
        )
        
        user_data = {
            "id": collaborator.id,
            "username": collaborator.username,
            "email": collaborator.email,
            "name": collaborator.name,
            "role": collaborator.role,
            "status": collaborator.status,
            "two_factor_enabled": collaborator.two_factor_enabled,
            "last_login_at": collaborator.last_login_at,
            "created_at": collaborator.created_at
        }
        
        return True, f"Role updated to {new_role} successfully", user_data
    
    @staticmethod
    def remove_collaborator(
        session: Session,
        admin_user: User,
        collaborator_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Remove a collaborator from the system.
        
        Args:
            session: Database session
            admin_user: Admin user making the change
            collaborator_id: ID of user to remove
            ip_address: Client IP address for logging
            user_agent: Client user agent for logging
            
        Returns:
            Tuple of (success, message)
        """
        # Get collaborator
        collaborator = session.get(User, collaborator_id)
        if not collaborator:
            return False, "User not found"
        
        # Prevent admin from removing themselves
        if collaborator.id == admin_user.id:
            AdminService._log_admin_event(
                session, admin_user.id, "user_removal_failed", "self_removal_attempted",
                ip_address, user_agent, {"target_user_id": collaborator_id}
            )
            return False, "Cannot remove your own account"
        
        # Check if this is the last admin
        if collaborator.role == "admin":
            admin_count = session.execute(
                select(User).where(User.role == "admin", User.status == "active")
            ).scalars().all()
            
            if len(admin_count) <= 1:
                AdminService._log_admin_event(
                    session, admin_user.id, "user_removal_failed", "last_admin_protection",
                    ip_address, user_agent, {"target_user_id": collaborator_id}
                )
                return False, "Cannot remove the last admin user"
        
        # Store user info for logging
        user_info = {
            "target_user_id": collaborator.id,
            "target_email": collaborator.email,
            "target_role": collaborator.role
        }
        
        # Remove user (this will cascade to related records)
        session.delete(collaborator)
        session.commit()
        
        # Log the removal
        AdminService._log_admin_event(
            session, admin_user.id, "user_removed", "collaborator_deleted",
            ip_address, user_agent, user_info
        )
        
        return True, "User removed successfully"
    
    @staticmethod
    def _log_admin_event(
        session: Session,
        admin_user_id: Optional[int],
        action: str,
        resource_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Log admin-related events for audit trail.
        
        Args:
            session: Database session
            admin_user_id: Admin user ID performing the action
            action: Action performed
            resource_type: Type of resource/event
            ip_address: Client IP address
            user_agent: Client user agent
            details: Additional event details
        """
        audit_log = AuditLog(
            user_id=admin_user_id,
            action=action,
            resource_type=resource_type,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        session.add(audit_log)
        session.commit()


# Global instance
admin_service = AdminService()