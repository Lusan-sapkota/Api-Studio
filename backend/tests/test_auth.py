import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from main import app
from db.models import User, OTPCode, AuditLog
from api.services.auth_service import auth_service
from core.password_service import password_service
from core.two_factor_service import two_factor_service
from core.jwt_service import jwt_service
from core.config import settings


client = TestClient(app)


@pytest.fixture
def test_user(session: Session):
    """Create a test user with 2FA enabled."""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=password_service.hash_password("TestPassword123!"),
        name="Test User",
        role="editor",
        two_factor_enabled=True,
        two_factor_secret=two_factor_service.generate_secret(),
        status="active"
    )
    
    # Generate and store backup codes
    backup_codes, hashed_codes = two_factor_service.regenerate_backup_codes()
    user.backup_codes = hashed_codes
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def test_user_no_2fa(session: Session):
    """Create a test user without 2FA."""
    user = User(
        username="testuser2",
        email="test2@example.com",
        hashed_password=password_service.hash_password("TestPassword123!"),
        name="Test User 2",
        role="viewer",
        two_factor_enabled=False,
        status="active"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def locked_user(session: Session):
    """Create a locked test user."""
    user = User(
        username="lockeduser",
        email="locked@example.com",
        hashed_password=password_service.hash_password("TestPassword123!"),
        name="Locked User",
        role="viewer",
        failed_login_attempts=5,
        locked_until=datetime.now(timezone.utc) + timedelta(minutes=15),
        status="active"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestAuthenticationService:
    """Test authentication service methods."""
    
    def test_authenticate_user_success_no_2fa(self, session: Session, test_user_no_2fa: User):
        """Test successful authentication without 2FA."""
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test2@example.com",
            password="TestPassword123!",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is True
        assert user.id == test_user_no_2fa.id
        assert token is not None
        assert "message" in data
        
        # Verify JWT token
        payload = jwt_service.verify_token(token)
        assert payload["email"] == "test2@example.com"
        assert payload["role"] == "viewer"
    
    def test_authenticate_user_requires_2fa(self, session: Session, test_user: User):
        """Test authentication that requires 2FA."""
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test@example.com",
            password="TestPassword123!",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert user is None
        assert token is None
        assert data["requires_2fa"] is True
    
    def test_authenticate_user_with_valid_totp(self, session: Session, test_user: User):
        """Test successful authentication with valid TOTP."""
        # Generate valid TOTP
        totp_code = two_factor_service.get_current_totp(test_user.two_factor_secret)
        
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test@example.com",
            password="TestPassword123!",
            totp_code=totp_code,
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is True
        assert user.id == test_user.id
        assert token is not None
        assert "message" in data
    
    def test_authenticate_user_with_invalid_totp(self, session: Session, test_user: User):
        """Test authentication failure with invalid TOTP."""
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test@example.com",
            password="TestPassword123!",
            totp_code="123456",  # Invalid TOTP
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert user is None
        assert token is None
        assert "Invalid 2FA code" in data["message"]
    
    def test_authenticate_user_with_backup_code(self, session: Session, test_user: User):
        """Test successful authentication with backup code."""
        # Get a backup code
        backup_codes, _ = two_factor_service.regenerate_backup_codes()
        test_user.backup_codes = two_factor_service.hash_backup_codes(backup_codes)
        session.add(test_user)
        session.commit()
        
        # Use first backup code
        backup_code = backup_codes[0]
        
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test@example.com",
            password="TestPassword123!",
            backup_code=backup_code,
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is True
        assert user.id == test_user.id
        assert token is not None
        
        # Verify backup code is marked as used
        session.refresh(test_user)
        unused_count = two_factor_service.get_unused_backup_codes_count(test_user.backup_codes)
        assert unused_count == 9  # One code used
    
    def test_authenticate_user_invalid_email(self, session: Session):
        """Test authentication failure with invalid email."""
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="nonexistent@example.com",
            password="TestPassword123!",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert user is None
        assert token is None
        assert "Invalid email or password" in data["message"]
    
    def test_authenticate_user_invalid_password(self, session: Session, test_user_no_2fa: User):
        """Test authentication failure with invalid password."""
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test2@example.com",
            password="WrongPassword",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert user is None
        assert token is None
        assert "Invalid email or password" in data["message"]
        
        # Check failed attempts incremented
        session.refresh(test_user_no_2fa)
        assert test_user_no_2fa.failed_login_attempts == 1
    
    def test_authenticate_user_account_locked(self, session: Session, locked_user: User):
        """Test authentication failure with locked account."""
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="locked@example.com",
            password="TestPassword123!",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert user is None
        assert token is None
        assert "temporarily locked" in data["message"]
    
    def test_account_lockout_after_max_attempts(self, session: Session, test_user_no_2fa: User):
        """Test account gets locked after max failed attempts."""
        # Set user to one attempt before lockout
        test_user_no_2fa.failed_login_attempts = settings.max_login_attempts - 1
        session.add(test_user_no_2fa)
        session.commit()
        
        # Attempt with wrong password
        success, user, token, data = auth_service.authenticate_user(
            session=session,
            email="test2@example.com",
            password="WrongPassword",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        
        # Check user is now locked
        session.refresh(test_user_no_2fa)
        assert test_user_no_2fa.failed_login_attempts == settings.max_login_attempts
        assert test_user_no_2fa.locked_until is not None
        assert test_user_no_2fa.locked_until > datetime.now(timezone.utc)


class TestPasswordReset:
    """Test password reset functionality."""
    
    @patch('core.email_service.email_service.send_password_reset_otp')
    def test_initiate_password_reset_success(self, mock_send_email, session: Session, test_user: User):
        """Test successful password reset initiation."""
        mock_send_email.return_value = True
        
        result = auth_service.initiate_password_reset(
            session=session,
            email="test@example.com",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert result is True
        mock_send_email.assert_called_once()
        
        # Check OTP record created
        otp_record = session.exec(
            select(OTPCode).where(
                OTPCode.email == "test@example.com",
                OTPCode.otp_type == "forgot_password"
            )
        ).first()
        assert otp_record is not None
        assert otp_record.used is False
    
    @patch('core.email_service.email_service.send_password_reset_otp')
    def test_initiate_password_reset_nonexistent_user(self, mock_send_email, session: Session):
        """Test password reset for nonexistent user (should still return True)."""
        mock_send_email.return_value = True
        
        result = auth_service.initiate_password_reset(
            session=session,
            email="nonexistent@example.com",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        # Should return True to prevent email enumeration
        assert result is True
        mock_send_email.assert_not_called()
    
    def test_verify_password_reset_otp_success(self, session: Session, test_user: User):
        """Test successful OTP verification for password reset."""
        # Create OTP record
        otp_code = "123456"
        otp_record = OTPCode(
            email="test@example.com",
            otp_code=otp_code,
            otp_type="forgot_password",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
        )
        session.add(otp_record)
        session.commit()
        
        success, reset_token = auth_service.verify_password_reset_otp(
            session=session,
            email="test@example.com",
            otp_code=otp_code,
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is True
        assert reset_token is not None
        
        # Verify OTP is marked as used
        session.refresh(otp_record)
        assert otp_record.used is True
        
        # Verify reset token is valid
        payload = jwt_service.decode_reset_token(reset_token)
        assert payload["user_id"] == test_user.id
    
    def test_verify_password_reset_otp_invalid(self, session: Session, test_user: User):
        """Test OTP verification with invalid code."""
        # Create OTP record
        otp_record = OTPCode(
            email="test@example.com",
            otp_code="123456",
            otp_type="forgot_password",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
        )
        session.add(otp_record)
        session.commit()
        
        success, reset_token = auth_service.verify_password_reset_otp(
            session=session,
            email="test@example.com",
            otp_code="654321",  # Wrong code
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert reset_token is None
        
        # Check attempts incremented
        session.refresh(otp_record)
        assert otp_record.attempts == 1
    
    def test_verify_password_reset_otp_expired(self, session: Session, test_user: User):
        """Test OTP verification with expired code."""
        # Create expired OTP record
        otp_record = OTPCode(
            email="test@example.com",
            otp_code="123456",
            otp_type="forgot_password",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)  # Expired
        )
        session.add(otp_record)
        session.commit()
        
        success, reset_token = auth_service.verify_password_reset_otp(
            session=session,
            email="test@example.com",
            otp_code="123456",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert reset_token is None
    
    @patch('core.email_service.email_service.send_password_reset_confirmation')
    def test_reset_password_success(self, mock_send_email, session: Session, test_user: User):
        """Test successful password reset."""
        mock_send_email.return_value = True
        
        # Generate reset token
        reset_token = jwt_service.create_reset_token(
            {"user_id": test_user.id, "email": test_user.email}
        )
        
        new_password = "ComplexPassword9x7!"
        success, message = auth_service.reset_password(
            session=session,
            reset_token=reset_token,
            new_password=new_password,
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is True
        assert "successfully" in message
        
        # Verify password changed
        session.refresh(test_user)
        assert password_service.verify_password(new_password, test_user.hashed_password)
        assert test_user.failed_login_attempts == 0
        assert test_user.locked_until is None
        
        mock_send_email.assert_called_once()
    
    def test_reset_password_invalid_token(self, session: Session):
        """Test password reset with invalid token."""
        success, message = auth_service.reset_password(
            session=session,
            reset_token="invalid_token",
            new_password="NewTestPassword123!",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert "Invalid or expired" in message
    
    def test_reset_password_weak_password(self, session: Session, test_user: User):
        """Test password reset with weak password."""
        reset_token = jwt_service.create_reset_token(
            {"user_id": test_user.id, "email": test_user.email}
        )
        
        success, message = auth_service.reset_password(
            session=session,
            reset_token=reset_token,
            new_password="weak",  # Weak password
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        assert success is False
        assert "must be at least" in message


class TestAuthenticationAPI:
    """Test authentication API endpoints."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_login_success_no_2fa(self, session: Session, test_user_no_2fa: User):
        """Test successful login API without 2FA."""
        response = client.post("/api/auth/login", json={
            "email": "test2@example.com",
            "password": "TestPassword123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["user"]["email"] == "test2@example.com"
        assert data["user"]["role"] == "viewer"
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_login_requires_2fa(self, session: Session, test_user: User):
        """Test login API that requires 2FA."""
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "TestPassword123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["requires_2fa"] is True
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_login_with_2fa_success(self, session: Session, test_user: User):
        """Test successful login with 2FA."""
        totp_code = two_factor_service.get_current_totp(test_user.two_factor_secret)
        
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "TestPassword123!",
            "totp_code": totp_code
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["user"]["two_factor_enabled"] is True
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_login_invalid_credentials(self, session: Session):
        """Test login with invalid credentials."""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "Invalid email or password" in data["detail"]
    
    @patch('core.config.settings.app_mode', 'local')
    def test_login_local_mode(self, session: Session):
        """Test login in local mode (should bypass authentication)."""
        response = client.post("/api/auth/login", json={
            "email": "any@example.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["access_token"] == "local-mode-token"
    
    @patch('core.config.settings.app_mode', 'hosted')
    @patch('api.services.auth_service.auth_service.initiate_password_reset')
    def test_forgot_password_api(self, mock_initiate, session: Session):
        """Test forgot password API endpoint."""
        mock_initiate.return_value = True
        
        response = client.post("/api/auth/forgot-password", json={
            "email": "test@example.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "receive a password reset code" in data["message"]
        mock_initiate.assert_called_once()
    
    def test_get_current_user_info(self, session: Session, test_user: User):
        """Test getting current user information."""
        # Create JWT token for user
        token = jwt_service.create_token({
            "sub": str(test_user.id),
            "email": test_user.email,
            "role": test_user.role
        })
        
        with patch('core.config.settings.app_mode', 'hosted'):
            response = client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_user.email
        assert data["user"]["role"] == test_user.role
        assert "permissions" in data
        assert len(data["permissions"]) > 0
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_get_current_user_invalid_token(self, session: Session):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_logout_api(self, session: Session, test_user: User):
        """Test logout API endpoint."""
        token = jwt_service.create_token({
            "sub": str(test_user.id),
            "email": test_user.email,
            "role": test_user.role
        })
        
        response = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Logged out successfully" in data["message"]


class TestUserPermissions:
    """Test user permission system."""
    
    def test_admin_permissions(self):
        """Test admin user permissions."""
        admin_user = User(role="admin")
        permissions = auth_service.get_current_user_permissions(admin_user)
        
        assert "manage_users" in permissions
        assert "manage_system" in permissions
        assert "view_audit_logs" in permissions
        assert "delete_workspaces" in permissions
    
    def test_editor_permissions(self):
        """Test editor user permissions."""
        editor_user = User(role="editor")
        permissions = auth_service.get_current_user_permissions(editor_user)
        
        assert "create_workspaces" in permissions
        assert "manage_collections" in permissions
        assert "manage_users" not in permissions
        assert "view_audit_logs" not in permissions
    
    def test_viewer_permissions(self):
        """Test viewer user permissions."""
        viewer_user = User(role="viewer")
        permissions = auth_service.get_current_user_permissions(viewer_user)
        
        assert "view_shared_workspaces" in permissions
        assert "read_own_profile" in permissions
        assert "create_workspaces" not in permissions
        assert "manage_users" not in permissions


class TestAuditLogging:
    """Test audit logging functionality."""
    
    def test_login_success_logged(self, session: Session, test_user_no_2fa: User):
        """Test that successful login is logged."""
        auth_service.authenticate_user(
            session=session,
            email="test2@example.com",
            password="TestPassword123!",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        
        # Check audit log created
        audit_log = session.exec(
            select(AuditLog).where(
                AuditLog.user_id == test_user_no_2fa.id,
                AuditLog.action == "login_success"
            )
        ).first()
        
        assert audit_log is not None
        assert audit_log.ip_address == "192.168.1.1"
        assert audit_log.user_agent == "Mozilla/5.0"
        assert audit_log.resource_type == "authenticated"
    
    def test_login_failure_logged(self, session: Session, test_user_no_2fa: User):
        """Test that failed login is logged."""
        auth_service.authenticate_user(
            session=session,
            email="test2@example.com",
            password="WrongPassword",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        
        # Check audit log created
        audit_log = session.exec(
            select(AuditLog).where(
                AuditLog.user_id == test_user_no_2fa.id,
                AuditLog.action == "login_failed"
            )
        ).first()
        
        assert audit_log is not None
        assert audit_log.resource_type == "invalid_password"
        assert audit_log.details["attempts"] == 1