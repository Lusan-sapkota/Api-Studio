from typing import Optional, Dict, Any
from datetime import datetime
from sqlmodel import Session, select
from fastapi import Request

from db.models import AuditLog, User
from db.session import get_session


class AuditService:
    """Service for logging security and user management events"""
    
    def __init__(self):
        pass
    
    def log_event(
        self,
        action: str,
        user_id: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session: Optional[Session] = None
    ) -> AuditLog:
        """Log an audit event"""
        if session is None:
            session = next(get_session())
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        session.add(audit_log)
        session.commit()
        session.refresh(audit_log)
        
        return audit_log
    
    def log_authentication_event(
        self,
        action: str,
        email: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        session: Optional[Session] = None
    ) -> AuditLog:
        """Log authentication-related events"""
        if session is None:
            session = next(get_session())
        
        # Try to find user by email for user_id
        user_id = None
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            user_id = user.id
        
        event_details = {
            "email": email,
            "success": success,
            **(details or {})
        }
        
        return self.log_event(
            action=action,
            user_id=user_id,
            resource_type="authentication",
            details=event_details,
            ip_address=ip_address,
            user_agent=user_agent,
            session=session
        )
    
    def log_user_management_event(
        self,
        action: str,
        admin_user_id: int,
        target_user_id: Optional[int] = None,
        target_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        session: Optional[Session] = None
    ) -> AuditLog:
        """Log user management events (invitations, role changes, etc.)"""
        if session is None:
            session = next(get_session())
        
        event_details = {
            **(details or {}),
        }
        
        if target_email:
            event_details["target_email"] = target_email
        
        return self.log_event(
            action=action,
            user_id=admin_user_id,
            resource_type="user_management",
            resource_id=str(target_user_id) if target_user_id else None,
            details=event_details,
            ip_address=ip_address,
            user_agent=user_agent,
            session=session
        )
    
    def log_security_event(
        self,
        action: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        session: Optional[Session] = None
    ) -> AuditLog:
        """Log security-related events (2FA setup, password changes, etc.)"""
        return self.log_event(
            action=action,
            user_id=user_id,
            resource_type="security",
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session=session
        )
    
    def get_audit_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        session: Optional[Session] = None
    ) -> list[AuditLog]:
        """Retrieve audit logs with optional filtering"""
        if session is None:
            session = next(get_session())
        
        query = select(AuditLog)
        
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        
        if action:
            query = query.where(AuditLog.action == action)
        
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        
        query = query.order_by(AuditLog.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        return session.exec(query).all()
    
    def extract_request_info(self, request: Request) -> tuple[Optional[str], Optional[str]]:
        """Extract IP address and user agent from request"""
        # Get IP address (handle proxy headers)
        ip_address = None
        if "x-forwarded-for" in request.headers:
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
        elif "x-real-ip" in request.headers:
            ip_address = request.headers["x-real-ip"]
        else:
            ip_address = getattr(request.client, "host", None) if request.client else None
        
        # Get user agent
        user_agent = request.headers.get("user-agent")
        
        return ip_address, user_agent


# Global audit service instance
audit_service = AuditService()


# Audit event constants
class AuditActions:
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_LOCKED = "login_locked"
    LOGOUT = "logout"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    BOOTSTRAP_INITIATED = "bootstrap_initiated"
    BOOTSTRAP_COMPLETED = "bootstrap_completed"
    
    # 2FA events
    TWO_FA_ENABLED = "2fa_enabled"
    TWO_FA_DISABLED = "2fa_disabled"
    TWO_FA_BACKUP_CODES_GENERATED = "2fa_backup_codes_generated"
    TWO_FA_BACKUP_CODE_USED = "2fa_backup_code_used"
    
    # User management events
    USER_INVITED = "user_invited"
    USER_INVITATION_ACCEPTED = "user_invitation_accepted"
    USER_ROLE_CHANGED = "user_role_changed"
    USER_REMOVED = "user_removed"
    USER_LOCKED = "user_locked"
    USER_UNLOCKED = "user_unlocked"
    
    # Security events
    PASSWORD_CHANGED = "password_changed"
    ACCOUNT_LOCKED = "account_locked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"