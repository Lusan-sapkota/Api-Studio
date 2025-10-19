"""
Tests for bootstrap system and initial admin setup flow.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from main import app
from db.models import User, OTPCode, AuditLog
from api.services.bootstrap_service import bootstrap_service
from core.config import settings
from core.jwt_service import jwt_service
from core.password_service import password_service
from core.two_factor_service import two_factor_service


class TestBootstrapService:
    """Test bootstrap service functionality."""
    
    def test_is_system_locked_no_admin(self, session: Session):
        """Test system lock detection when no admin exists."""
        # No users in database
        assert bootstrap_service.is_system_locked(session) is True
    
    def test_is_system_locked_with_admin(self, session: Session):
        """Test system lock detection when admin exists."""
        # Create admin user
        admin = User(
            username="admin",
            email="admin@test.com",
            hashed_password="hashed_password",
            role="admin",
            status="active"
        )
        session.add(admin)
        session.commit()
        
        assert bootstrap_service.is_system_locked(session) is False
    
    def test_is_system_locked_inactive_admin(self, session: Session):
        """Test system lock when admin exists but is inactive."""
        # Create inactive admin user
        admin = User(
            username="admin",
            email="admin@test.com",
            hashed_password="hashed_password",
            role="admin",
            status="suspended"
        )
        session.add(admin)
        session.commit()
        
        assert bootstrap_service.is_system_locked(session) is True
    
    def test_validate_bootstrap_token_valid(self):
        """Test bootstrap token validation with valid token."""
        with patch.object(settings, 'admin_bootstrap_token', 'valid-token'):
            assert bootstrap_service.validate_bootstrap_token('valid-token') is True
    
    def test_validate_bootstrap_token_invalid(self):
        """Test bootstrap token validation with invalid token."""
        with patch.object(settings, 'admin_bootstrap_token', 'valid-token'):
            assert bootstrap_service.validate_bootstrap_token('invalid-token') is False
    
    def test_validate_bootstrap_token_not_configured(self):
        """Test bootstrap token validation when not configured."""
        with patch.object(settings, 'admin_bootstrap_token', None):
            assert bootstrap_service.validate_bootstrap_token('any-token') is False
    
    @pytest.mark.asyncio
    async def test_initiate_bootstrap_success(self, session: Session):
        """Test successful bootstrap initiation."""
        email = "admin@test.com"
        token = "valid-bootstrap-token"
        
        with patch.object(settings, 'admin_bootstrap_token', token), \
             patch('api.services.bootstrap_service.email_service.test_connection_async', new_callable=AsyncMock) as mock_smtp_test, \
             patch('api.services.bootstrap_service.email_service.send_otp', new_callable=AsyncMock) as mock_send_otp:
            
            # Mock email service methods
            mock_smtp_test.return_value = (True, None)
            mock_send_otp.return_value = True
            
            success, message, details = await bootstrap_service.initiate_bootstrap(
                session, token, email
            )
            
            assert success is True
            assert "Bootstrap initiated" in message
            assert details["smtp_tested"] is True
            assert details["otp_sent"] is True
            assert details["token_valid"] is True
            
            # Verify OTP record was created
            otp_record = session.exec(
                select(OTPCode).where(OTPCode.email == email)
            ).first()
            assert otp_record is not None
            assert otp_record.otp_type == "bootstrap"
    
    @pytest.mark.asyncio
    async def test_initiate_bootstrap_system_not_locked(self, session: Session):
        """Test bootstrap initiation when system is not locked."""
        # Create admin user first
        admin = User(
            username="admin",
            email="admin@test.com",
            hashed_password="hashed_password",
            role="admin",
            status="active"
        )
        session.add(admin)
        session.commit()
        
        success, message, details = await bootstrap_service.initiate_bootstrap(
            session, "token", "test@test.com"
        )
        
        assert success is False
        assert "already has admin users" in message
    
    @pytest.mark.asyncio
    async def test_initiate_bootstrap_invalid_token(self, session: Session):
        """Test bootstrap initiation with invalid token."""
        with patch.object(settings, 'admin_bootstrap_token', 'valid-token'):
            success, message, details = await bootstrap_service.initiate_bootstrap(
                session, "invalid-token", "test@test.com"
            )
            
            assert success is False
            assert "Invalid bootstrap token" in message
            assert details["token_valid"] is False
    
    @pytest.mark.asyncio
    async def test_initiate_bootstrap_smtp_failure(self, session: Session):
        """Test bootstrap initiation with SMTP failure."""
        token = "valid-bootstrap-token"
        
        with patch.object(settings, 'admin_bootstrap_token', token), \
             patch('api.services.bootstrap_service.email_service.test_connection_async', new_callable=AsyncMock) as mock_smtp_test:
            
            # Mock SMTP failure
            mock_smtp_test.return_value = (False, "SMTP connection failed")
            
            success, message, details = await bootstrap_service.initiate_bootstrap(
                session, token, "test@test.com"
            )
            
            assert success is False
            assert "SMTP connection failed" in message
            assert details["smtp_tested"] is True
    
    def test_verify_bootstrap_otp_success(self, session: Session):
        """Test successful OTP verification."""
        email = "admin@test.com"
        otp = "123456"
        
        # Create OTP record
        otp_record = OTPCode(
            email=email,
            otp_code=otp,
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        success, message, temp_token = bootstrap_service.verify_bootstrap_otp(
            session, email, otp
        )
        
        assert success is True
        assert "Verification successful" in message
        assert temp_token is not None
        
        # Verify OTP was marked as used
        session.refresh(otp_record)
        assert otp_record.used is True
        
        # Verify token contains correct data
        token_data = jwt_service.decode_temp_token(temp_token)
        assert token_data["email"] == email
        assert token_data["purpose"] == "admin_setup"
    
    def test_verify_bootstrap_otp_invalid_code(self, session: Session):
        """Test OTP verification with invalid code."""
        email = "admin@test.com"
        
        # Create OTP record
        otp_record = OTPCode(
            email=email,
            otp_code="123456",
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        success, message, temp_token = bootstrap_service.verify_bootstrap_otp(
            session, email, "wrong-otp"
        )
        
        assert success is False
        assert "Invalid verification code" in message
        assert temp_token is None
        
        # Verify attempt was recorded
        session.refresh(otp_record)
        assert otp_record.attempts == 1
    
    def test_verify_bootstrap_otp_expired(self, session: Session):
        """Test OTP verification with expired code."""
        email = "admin@test.com"
        
        # Create expired OTP record
        otp_record = OTPCode(
            email=email,
            otp_code="123456",
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        success, message, temp_token = bootstrap_service.verify_bootstrap_otp(
            session, email, "123456"
        )
        
        assert success is False
        assert "expired" in message.lower()
        assert temp_token is None
    
    def test_verify_bootstrap_otp_too_many_attempts(self, session: Session):
        """Test OTP verification with too many attempts."""
        email = "admin@test.com"
        
        # Create OTP record with max attempts
        otp_record = OTPCode(
            email=email,
            otp_code="123456",
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=3,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        success, message, temp_token = bootstrap_service.verify_bootstrap_otp(
            session, email, "123456"
        )
        
        assert success is False
        assert "Too many failed attempts" in message
        assert temp_token is None
    
    def test_setup_first_time_password_success(self, session: Session):
        """Test successful first-time password setup."""
        email = "admin@test.com"
        password = "SecurePassword123!"
        
        # Create temporary token
        temp_token_data = {
            "email": email,
            "purpose": "admin_setup",
            "step": "password_setup"
        }
        temp_token = jwt_service.create_temp_token(temp_token_data)
        
        with patch('core.two_factor_service.two_factor_service') as mock_2fa:
            # Mock 2FA service
            mock_2fa.generate_secret.return_value = "test-secret"
            mock_2fa.generate_qr_code.return_value = "qr-code-url"
            mock_2fa.generate_backup_codes.return_value = ["code1", "code2"]
            
            success, message, setup_data = bootstrap_service.setup_first_time_password(
                session, temp_token, password, password
            )
            
            assert success is True
            assert "Password set successfully" in message
            assert setup_data is not None
            assert "qr_code" in setup_data
            assert "secret" in setup_data
            assert "backup_codes" in setup_data
            assert "setup_token" in setup_data
            
            # Verify user was created
            user = session.exec(select(User).where(User.email == email)).first()
            assert user is not None
            assert user.role == "admin"
            assert user.status == "pending_2fa"
            assert user.two_factor_enabled is False
    
    def test_setup_first_time_password_mismatch(self, session: Session):
        """Test password setup with mismatched passwords."""
        temp_token_data = {
            "email": "admin@test.com",
            "purpose": "admin_setup"
        }
        temp_token = jwt_service.create_temp_token(temp_token_data)
        
        success, message, setup_data = bootstrap_service.setup_first_time_password(
            session, temp_token, "password1", "password2"
        )
        
        assert success is False
        assert "do not match" in message
        assert setup_data is None
    
    def test_setup_first_time_password_weak(self, session: Session):
        """Test password setup with weak password."""
        temp_token_data = {
            "email": "admin@test.com",
            "purpose": "admin_setup"
        }
        temp_token = jwt_service.create_temp_token(temp_token_data)
        
        success, message, setup_data = bootstrap_service.setup_first_time_password(
            session, temp_token, "weak", "weak"
        )
        
        assert success is False
        assert "does not meet requirements" in message
        assert setup_data is None
    
    def test_verify_2fa_setup_success(self, session: Session):
        """Test successful 2FA setup verification."""
        email = "admin@test.com"
        
        # Create pending user
        user = User(
            username="admin",
            email=email,
            hashed_password="hashed_password",
            role="admin",
            status="pending_2fa",
            two_factor_secret="test-secret",
            two_factor_enabled=False
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Create setup token
        setup_token_data = {
            "user_id": user.id,
            "email": email,
            "purpose": "2fa_setup",
            "backup_codes": ["code1", "code2"]
        }
        setup_token = jwt_service.create_temp_token(setup_token_data)
        
        with patch('core.two_factor_service.two_factor_service') as mock_2fa:
            # Mock TOTP verification
            mock_2fa.verify_totp.return_value = True
            
            success, message, auth_data = bootstrap_service.verify_2fa_setup(
                session, setup_token, "123456"
            )
            
            assert success is True
            assert "completed successfully" in message
            assert auth_data is not None
            assert "access_token" in auth_data
            assert "user" in auth_data
            
            # Verify user was activated
            session.refresh(user)
            assert user.status == "active"
            assert user.two_factor_enabled is True
            assert user.backup_codes is not None
    
    def test_verify_2fa_setup_invalid_totp(self, session: Session):
        """Test 2FA setup with invalid TOTP code."""
        email = "admin@test.com"
        
        # Create pending user
        user = User(
            username="admin",
            email=email,
            hashed_password="hashed_password",
            role="admin",
            status="pending_2fa",
            two_factor_secret="test-secret"
        )
        session.add(user)
        session.commit()
        
        setup_token_data = {
            "user_id": user.id,
            "purpose": "2fa_setup",
            "backup_codes": ["code1", "code2"]
        }
        setup_token = jwt_service.create_temp_token(setup_token_data)
        
        with patch('core.two_factor_service.two_factor_service') as mock_2fa:
            # Mock TOTP verification failure
            mock_2fa.verify_totp.return_value = False
            
            success, message, auth_data = bootstrap_service.verify_2fa_setup(
                session, setup_token, "wrong-code"
            )
            
            assert success is False
            assert "Invalid verification code" in message
            assert auth_data is None


class TestBootstrapAPI:
    """Test bootstrap API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_hosted_mode(self):
        """Mock hosted mode for tests."""
        with patch.object(settings, 'app_mode', 'hosted'):
            yield
    
    def test_system_status_locked(self, client, session: Session, mock_hosted_mode):
        """Test system status when locked."""
        response = client.get("/api/system-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["locked"] is True
        assert data["admin_exists"] is False
        assert data["requires_bootstrap"] is True
    
    def test_system_status_unlocked(self, client, session: Session, mock_hosted_mode):
        """Test system status when unlocked."""
        # Create admin user
        admin = User(
            username="admin",
            email="admin@test.com",
            hashed_password="hashed_password",
            role="admin",
            status="active"
        )
        session.add(admin)
        session.commit()
        
        response = client.get("/api/system-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["locked"] is False
        assert data["admin_exists"] is True
        assert data["requires_bootstrap"] is False
    
    @pytest.mark.asyncio
    async def test_bootstrap_initiation_success(self, client, session: Session, mock_hosted_mode):
        """Test successful bootstrap initiation."""
        with patch.object(settings, 'admin_bootstrap_token', 'valid-token'), \
             patch('core.email_service.email_service') as mock_email:
            
            # Mock email service
            mock_email.test_connection_async = AsyncMock(return_value=(True, None))
            mock_email.send_otp = AsyncMock(return_value=True)
            
            response = client.post("/api/bootstrap", json={
                "token": "valid-token",
                "email": "admin@test.com"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["smtp_tested"] is True
            assert data["otp_sent"] is True
    
    def test_bootstrap_initiation_invalid_token(self, client, mock_hosted_mode):
        """Test bootstrap initiation with invalid token."""
        with patch.object(settings, 'admin_bootstrap_token', 'valid-token'):
            response = client.post("/api/bootstrap", json={
                "token": "invalid-token",
                "email": "admin@test.com"
            })
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert data["error"] == "BOOTSTRAP_FAILED"
    
    def test_bootstrap_otp_verification_success(self, client, session: Session, mock_hosted_mode):
        """Test successful OTP verification."""
        email = "admin@test.com"
        otp = "123456"
        
        # Create OTP record
        otp_record = OTPCode(
            email=email,
            otp_code=otp,
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        response = client.post("/api/bootstrap/verify-otp", json={
            "email": email,
            "otp": otp
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["temp_token"] is not None
        assert data["requires_setup"] is True
    
    def test_bootstrap_otp_verification_invalid(self, client, session: Session, mock_hosted_mode):
        """Test OTP verification with invalid code."""
        email = "admin@test.com"
        
        # Create OTP record
        otp_record = OTPCode(
            email=email,
            otp_code="123456",
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        response = client.post("/api/bootstrap/verify-otp", json={
            "email": email,
            "otp": "wrong-otp"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "OTP_VERIFICATION_FAILED"
    
    def test_first_time_password_setup_success(self, client, session: Session, mock_hosted_mode):
        """Test successful first-time password setup."""
        email = "admin@test.com"
        
        # Create temporary token
        temp_token_data = {
            "email": email,
            "purpose": "admin_setup",
            "step": "password_setup"
        }
        temp_token = jwt_service.create_temp_token(temp_token_data)
        
        with patch('core.two_factor_service.two_factor_service') as mock_2fa:
            # Mock 2FA service
            mock_2fa.generate_secret.return_value = "test-secret"
            mock_2fa.generate_qr_code.return_value = "qr-code-url"
            mock_2fa.generate_backup_codes.return_value = ["code1", "code2"]
            
            response = client.post(
                "/api/auth/first-time-password",
                json={
                    "password": "SecurePassword123!",
                    "confirm_password": "SecurePassword123!"
                },
                headers={"Authorization": f"Bearer {temp_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "two_fa_setup" in data
            assert "setup_token" in data
    
    def test_first_time_password_setup_missing_token(self, client, mock_hosted_mode):
        """Test password setup without token."""
        response = client.post("/api/auth/first-time-password", json={
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "MISSING_TOKEN"
    
    def test_2fa_setup_verification_success(self, client, session: Session, mock_hosted_mode):
        """Test successful 2FA setup verification."""
        email = "admin@test.com"
        
        # Create pending user
        user = User(
            username="admin",
            email=email,
            hashed_password="hashed_password",
            role="admin",
            status="pending_2fa",
            two_factor_secret="test-secret"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Create setup token
        setup_token_data = {
            "user_id": user.id,
            "email": email,
            "purpose": "2fa_setup",
            "backup_codes": ["code1", "code2"]
        }
        setup_token = jwt_service.create_temp_token(setup_token_data)
        
        with patch('core.two_factor_service.two_factor_service') as mock_2fa:
            # Mock TOTP verification
            mock_2fa.verify_totp.return_value = True
            
            response = client.post(
                "/api/auth/verify-2fa-setup",
                json={"totp_code": "123456"},
                headers={"Authorization": f"Bearer {setup_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "access_token" in data
            assert "user" in data
    
    def test_2fa_setup_verification_invalid_code(self, client, session: Session, mock_hosted_mode):
        """Test 2FA setup with invalid TOTP code."""
        email = "admin@test.com"
        
        # Create pending user
        user = User(
            username="admin",
            email=email,
            hashed_password="hashed_password",
            role="admin",
            status="pending_2fa",
            two_factor_secret="test-secret"
        )
        session.add(user)
        session.commit()
        
        setup_token_data = {
            "user_id": user.id,
            "purpose": "2fa_setup",
            "backup_codes": ["code1", "code2"]
        }
        setup_token = jwt_service.create_temp_token(setup_token_data)
        
        with patch('core.two_factor_service.two_factor_service') as mock_2fa:
            # Mock TOTP verification failure
            mock_2fa.verify_totp.return_value = False
            
            response = client.post(
                "/api/auth/verify-2fa-setup",
                json={"totp_code": "wrong-code"},
                headers={"Authorization": f"Bearer {setup_token}"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert data["error"] == "2FA_SETUP_FAILED"


class TestBootstrapIntegration:
    """Integration tests for complete bootstrap flow."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_hosted_mode(self):
        """Mock hosted mode for tests."""
        with patch.object(settings, 'app_mode', 'hosted'):
            yield
    
    @pytest.mark.asyncio
    async def test_complete_bootstrap_flow(self, client, session: Session, mock_hosted_mode):
        """Test complete bootstrap flow from initiation to admin creation."""
        email = "admin@test.com"
        bootstrap_token = "valid-bootstrap-token"
        password = "SecurePassword123!"
        
        with patch.object(settings, 'admin_bootstrap_token', bootstrap_token), \
             patch('core.email_service.email_service') as mock_email, \
             patch('core.two_factor_service.two_factor_service') as mock_2fa:
            
            # Mock services
            mock_email.test_connection_async = AsyncMock(return_value=(True, None))
            mock_email.send_otp = AsyncMock(return_value=True)
            mock_2fa.generate_secret.return_value = "test-secret"
            mock_2fa.generate_qr_code.return_value = "qr-code-url"
            mock_2fa.generate_backup_codes.return_value = ["code1", "code2"]
            mock_2fa.verify_totp.return_value = True
            
            # Step 1: Initiate bootstrap
            response = client.post("/api/bootstrap", json={
                "token": bootstrap_token,
                "email": email
            })
            assert response.status_code == 200
            
            # Get OTP from database
            otp_record = session.exec(
                select(OTPCode).where(OTPCode.email == email)
            ).first()
            assert otp_record is not None
            
            # Step 2: Verify OTP
            response = client.post("/api/bootstrap/verify-otp", json={
                "email": email,
                "otp": otp_record.otp_code
            })
            assert response.status_code == 200
            temp_token = response.json()["temp_token"]
            
            # Step 3: Set password
            response = client.post(
                "/api/auth/first-time-password",
                json={
                    "password": password,
                    "confirm_password": password
                },
                headers={"Authorization": f"Bearer {temp_token}"}
            )
            assert response.status_code == 200
            setup_token = response.json()["setup_token"]
            
            # Step 4: Complete 2FA setup
            response = client.post(
                "/api/auth/verify-2fa-setup",
                json={"totp_code": "123456"},
                headers={"Authorization": f"Bearer {setup_token}"}
            )
            assert response.status_code == 200
            
            # Verify admin user was created and activated
            user = session.exec(select(User).where(User.email == email)).first()
            assert user is not None
            assert user.role == "admin"
            assert user.status == "active"
            assert user.two_factor_enabled is True
            
            # Verify system is no longer locked
            assert bootstrap_service.is_system_locked(session) is False
    
    def test_bootstrap_flow_smtp_error_handling(self, client, session: Session, mock_hosted_mode):
        """Test bootstrap flow with SMTP configuration errors."""
        with patch.object(settings, 'admin_bootstrap_token', 'valid-token'), \
             patch('core.email_service.email_service') as mock_email:
            
            # Mock SMTP failure
            mock_email.test_connection_async = AsyncMock(return_value=(False, "Connection refused"))
            
            response = client.post("/api/bootstrap", json={
                "token": "valid-token",
                "email": "admin@test.com"
            })
            
            assert response.status_code == 400
            data = response.json()
            assert data["success"] is False
            assert "Connection refused" in data["message"]
    
    def test_bootstrap_flow_otp_expiry_handling(self, client, session: Session, mock_hosted_mode):
        """Test bootstrap flow with OTP expiry scenarios."""
        email = "admin@test.com"
        
        # Create expired OTP
        otp_record = OTPCode(
            email=email,
            otp_code="123456",
            otp_type="bootstrap",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            attempts=0,
            used=False
        )
        session.add(otp_record)
        session.commit()
        
        response = client.post("/api/bootstrap/verify-otp", json={
            "email": email,
            "otp": "123456"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "expired" in data["message"].lower()