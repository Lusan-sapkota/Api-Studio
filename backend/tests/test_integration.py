"""
Integration tests for the complete authentication system.
Tests end-to-end flows in both local and hosted modes.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool
from unittest.mock import patch, MagicMock
import json
from datetime import datetime, timedelta

from db.models import User, OTPCode, Invitation, AuditLog
from core.password_service import password_service
from core.jwt_service import jwt_service


class TestIntegrationBase:
    """Base class for integration tests with common setup."""
    
    @pytest.fixture
    def test_session(self):
        """Create test database session."""
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(engine)
        
        from sqlmodel import Session
        with Session(engine) as session:
            yield session


class TestDatabaseIntegration(TestIntegrationBase):
    """Integration tests for database operations."""
    
    def test_user_creation_and_authentication(self, test_session):
        """Test user creation and password verification."""
        # Create a user
        hashed_password = password_service.hash_password("test_password123")
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=hashed_password,
            name="Test User",
            role="viewer",
            status="active",
            two_factor_enabled=False
        )
        test_session.add(user)
        test_session.commit()
        test_session.refresh(user)
        
        # Verify user was created
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.role == "viewer"
        
        # Test password verification
        assert password_service.verify_password("test_password123", user.hashed_password)
        assert not password_service.verify_password("wrong_password", user.hashed_password)
    
    def test_otp_code_creation(self, test_session):
        """Test OTP code creation and validation."""
        from datetime import datetime, timedelta
        
        # Create OTP code
        otp_code = OTPCode(
            email="test@example.com",
            otp_code="123456",
            otp_type="bootstrap",
            expires_at=datetime.now() + timedelta(minutes=10),
            attempts=0,
            used=False
        )
        test_session.add(otp_code)
        test_session.commit()
        test_session.refresh(otp_code)
        
        # Verify OTP was created
        assert otp_code.id is not None
        assert otp_code.email == "test@example.com"
        assert otp_code.otp_code == "123456"
        assert not otp_code.used
    
    def test_invitation_creation(self, test_session):
        """Test invitation creation."""
        from datetime import datetime, timedelta
        
        # Create admin user first
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=password_service.hash_password("admin123"),
            name="Admin User",
            role="admin",
            status="active"
        )
        test_session.add(admin_user)
        test_session.commit()
        test_session.refresh(admin_user)
        
        # Create invitation
        invitation = Invitation(
            email="invited@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code="654321",
            expires_at=datetime.now() + timedelta(hours=24),
            accepted=False
        )
        test_session.add(invitation)
        test_session.commit()
        test_session.refresh(invitation)
        
        # Verify invitation was created
        assert invitation.id is not None
        assert invitation.email == "invited@example.com"
        assert invitation.role == "editor"
        assert invitation.invited_by == admin_user.id
        assert not invitation.accepted


class TestAuthenticationIntegration(TestIntegrationBase):
    """Integration tests for authentication services."""
    
    def test_jwt_token_creation_and_validation(self, test_session):
        """Test JWT token creation and validation."""
        # Create user data
        user_data = {
            "user_id": 1,
            "email": "test@example.com",
            "role": "admin",
            "type": "session"
        }
        
        # Create token
        token = jwt_service.create_token(user_data)
        assert token is not None
        assert isinstance(token, str)
        
        # Validate token
        decoded_data = jwt_service.verify_token(token)
        assert decoded_data["user_id"] == 1
        assert decoded_data["email"] == "test@example.com"
        assert decoded_data["role"] == "admin"
        assert decoded_data["type"] == "session"
    
    def test_password_service_integration(self, test_session):
        """Test password service functionality."""
        password = "SecureP@ssw0rd2024"  # Avoid sequential characters
        
        # Test password complexity validation
        is_valid, errors = password_service.validate_complexity(password)
        assert is_valid, f"Password validation failed: {errors}"
        assert len(errors) == 0
        
        # Test invalid passwords
        is_valid, errors = password_service.validate_complexity("weak")
        assert not is_valid
        assert len(errors) > 0
        
        is_valid, errors = password_service.validate_complexity("NoNumbers!")
        assert not is_valid
        assert len(errors) > 0
        
        is_valid, errors = password_service.validate_complexity("nonumbers456")
        assert not is_valid
        assert len(errors) > 0
        
        # Test password hashing and verification
        hashed = password_service.hash_password(password)
        assert hashed != password
        assert password_service.verify_password(password, hashed)
        assert not password_service.verify_password("wrong_password", hashed)
    
    def test_two_factor_service_integration(self, test_session):
        """Test 2FA service functionality."""
        from core.two_factor_service import two_factor_service
        
        # Generate secret
        secret = two_factor_service.generate_secret()
        assert secret is not None
        assert len(secret) == 32  # Base32 encoded secret
        
        # Generate backup codes
        backup_codes = two_factor_service.generate_backup_codes()
        assert len(backup_codes) == 10
        assert all(len(code) == 8 for code in backup_codes)
        
        # Test QR code generation
        qr_code = two_factor_service.generate_qr_code("test@example.com", secret)
        assert qr_code is not None
        assert isinstance(qr_code, str)


class TestServiceIntegration(TestIntegrationBase):
    """Integration tests for service layer functionality."""
    
    def test_bootstrap_service_integration(self, test_session):
        """Test bootstrap service functionality."""
        from api.services.bootstrap_service import bootstrap_service
        
        # Initially system should be locked (no admin users)
        assert bootstrap_service.is_system_locked(test_session)
        
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=password_service.hash_password("admin123"),
            name="Admin User",
            role="admin",
            status="active"
        )
        test_session.add(admin_user)
        test_session.commit()
        
        # Now system should be unlocked
        assert not bootstrap_service.is_system_locked(test_session)
    
    def test_user_service_integration(self, test_session):
        """Test user service functionality."""
        from api.services.user_service import UserService
        from api.schemas.user_schemas import UserCreate
        
        # Create user
        user_data = UserCreate(
            username="testuser",
            email="test@example.com",
            password="SecureP@ssw0rd2024"
        )
        
        user = UserService.create_user(
            session=test_session,
            user_data=user_data
        )
        
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        
        # Test user retrieval
        retrieved_user = UserService.get_user_by_email(test_session, "test@example.com")
        assert retrieved_user is not None
        assert retrieved_user.id == user.id
        
        # Test user by ID
        user_by_id = UserService.get_user_by_id(test_session, user.id)
        assert user_by_id is not None
        assert user_by_id.email == "test@example.com"


class TestConfigurationIntegration(TestIntegrationBase):
    """Integration tests for configuration validation."""
    
    def test_configuration_validation_hosted_mode(self):
        """Test configuration validation for hosted mode."""
        from core.config_validator import ConfigValidator
        
        # Test hosted mode with proper configuration
        with patch('core.config.settings') as mock_settings:
            mock_settings.app_mode = "hosted"
            mock_settings.jwt_secret = "test-jwt-secret-32-chars-long-12345"
            mock_settings.secret_key = "test-secret-key-32-chars-long-12345"
            mock_settings.admin_bootstrap_token = "test-bootstrap-token"
            mock_settings.smtp_server = "smtp.test.com"
            mock_settings.smtp_port = 587
            mock_settings.smtp_user = "test@test.com"
            mock_settings.smtp_password = "test-password"
            mock_settings.email_from = "test@test.com"
            mock_settings.max_login_attempts = 5
            mock_settings.login_lockout_duration = 900
            mock_settings.otp_expiry = 600
            mock_settings.jwt_expiry = 86400
            
            with patch('core.email_service.EmailService.test_connection') as mock_test:
                mock_test.return_value = True
                
                result = ConfigValidator.validate_startup_config()
                assert result["mode"] == "hosted"
                assert result["smtp_available"] == True
    
    def test_configuration_validation_local_mode(self):
        """Test configuration validation for local mode."""
        from core.config_validator import ConfigValidator
        
        with patch('core.config.settings') as mock_settings:
            mock_settings.app_mode = "local"
            
            result = ConfigValidator.validate_startup_config()
            assert result["mode"] == "local"
            assert "warnings" in result
    
    def test_invalid_configuration_handling(self):
        """Test handling of invalid configuration."""
        from core.config_validator import ConfigValidator, ConfigurationError
        
        # Test invalid mode
        with patch('core.config.settings') as mock_settings:
            mock_settings.app_mode = "invalid_mode"
            
            with pytest.raises(ConfigurationError):
                ConfigValidator.validate_startup_config()
    
    def test_database_migration_functionality(self):
        """Test database migration functionality."""
        from db.migrate import run_migration_safe
        
        # Test migration runs without errors
        migration_success = run_migration_safe()
        assert migration_success == True


class TestSecurityIntegration(TestIntegrationBase):
    """Integration tests for security features."""
    
    def test_jwt_token_expiry_handling(self, test_session):
        """Test JWT token expiry and validation."""
        # Create user data
        user_data = {
            "user_id": 1,
            "email": "test@test.com",
            "role": "viewer",
            "type": "session"
        }
        
        # Create expired token
        expired_token = jwt_service.create_token(
            user_data,
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
        
        # Try to validate expired token
        from core.jwt_service import JWTError
        with pytest.raises(JWTError):
            jwt_service.verify_token(expired_token)
    
    def test_password_complexity_validation(self, test_session):
        """Test password complexity requirements."""
        # Valid passwords (avoiding sequential characters)
        valid_passwords = [
            "SecureP@ssw0rd2024",
            "MyC0mpl3x!P@ssw0rd",
            "Str0ng!P@ssw0rd9876"
        ]
        
        for password in valid_passwords:
            is_valid, errors = password_service.validate_complexity(password)
            assert is_valid, f"Password should be valid: {password}, errors: {errors}"
        
        # Invalid passwords
        invalid_passwords = [
            "short",  # Too short
            "nouppercase456!",  # No uppercase
            "NOLOWERCASE456!",  # No lowercase
            "NoNumbers!",  # No numbers
            "NoSpecialChars456",  # No special characters
            "Simple456"  # Missing special character
        ]
        
        for password in invalid_passwords:
            is_valid, errors = password_service.validate_complexity(password)
            assert not is_valid, f"Password should be invalid: {password}"
            assert len(errors) > 0, f"Should have validation errors for: {password}"
    
    def test_audit_log_creation(self, test_session):
        """Test audit log creation."""
        from core.audit_service import audit_service
        
        # Create user for audit log
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=password_service.hash_password("password123"),
            name="Test User",
            role="viewer",
            status="active"
        )
        test_session.add(user)
        test_session.commit()
        test_session.refresh(user)
        
        # Create audit log
        audit_service.log_event(
            session=test_session,
            user_id=user.id,
            action="test_action",
            resource_type="test_resource",
            resource_id="123",
            details={"test": "data"},
            ip_address="127.0.0.1",
            user_agent="Test Agent"
        )
        
        # Verify audit log was created
        audit_log = test_session.exec(
            select(AuditLog).where(AuditLog.user_id == user.id)
        ).first()
        
        assert audit_log is not None
        assert audit_log.action == "test_action"
        assert audit_log.resource_type == "test_resource"
        assert audit_log.ip_address == "127.0.0.1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])