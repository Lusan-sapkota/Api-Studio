"""
Unit tests for authentication services.
Tests JWT service, password service, and 2FA service functionality.
"""

import json
import pytest
from datetime import datetime, timedelta, timezone
from jose import JWTError

from core.jwt_service import JWTService
from core.password_service import PasswordService
from core.two_factor_service import TwoFactorService


class TestJWTService:
    """Test cases for JWT service."""
    
    def test_create_token(self, test_settings):
        """Test JWT token creation."""
        jwt_service = JWTService()
        user_data = {"user_id": 1, "email": "test@example.com", "role": "admin"}
        
        token = jwt_service.create_token(user_data)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_token(self, test_settings):
        """Test JWT token verification."""
        jwt_service = JWTService()
        user_data = {"user_id": 1, "email": "test@example.com", "role": "admin"}
        
        token = jwt_service.create_token(user_data)
        payload = jwt_service.verify_token(token)
        
        assert payload["user_id"] == 1
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "admin"
        assert payload["type"] == "session"
    
    def test_verify_invalid_token(self, test_settings):
        """Test verification of invalid token."""
        jwt_service = JWTService()
        
        with pytest.raises(JWTError):
            jwt_service.verify_token("invalid.token.here")
    
    def test_create_temp_token(self, test_settings):
        """Test temporary token creation."""
        jwt_service = JWTService()
        user_data = {"user_id": 1, "email": "test@example.com"}
        
        token = jwt_service.create_temp_token(user_data, expires_minutes=5)
        payload = jwt_service.decode_temp_token(token)
        
        assert payload["user_id"] == 1
        assert payload["type"] == "temporary"
    
    def test_create_reset_token(self, test_settings):
        """Test password reset token creation."""
        jwt_service = JWTService()
        user_data = {"user_id": 1, "email": "test@example.com"}
        
        token = jwt_service.create_reset_token(user_data, expires_minutes=30)
        payload = jwt_service.decode_reset_token(token)
        
        assert payload["user_id"] == 1
        assert payload["type"] == "reset"
    
    def test_token_type_validation(self, test_settings):
        """Test token type validation."""
        jwt_service = JWTService()
        user_data = {"user_id": 1, "email": "test@example.com"}
        
        session_token = jwt_service.create_token(user_data)
        temp_token = jwt_service.create_temp_token(user_data)
        reset_token = jwt_service.create_reset_token(user_data)
        
        # Should not be able to decode temp token as reset token
        with pytest.raises(JWTError):
            jwt_service.decode_reset_token(temp_token)
        
        # Should not be able to decode reset token as temp token
        with pytest.raises(JWTError):
            jwt_service.decode_temp_token(reset_token)
    
    def test_get_token_type(self, test_settings):
        """Test getting token type."""
        jwt_service = JWTService()
        user_data = {"user_id": 1, "email": "test@example.com"}
        
        session_token = jwt_service.create_token(user_data)
        temp_token = jwt_service.create_temp_token(user_data)
        reset_token = jwt_service.create_reset_token(user_data)
        
        assert jwt_service.get_token_type(session_token) == "session"
        assert jwt_service.get_token_type(temp_token) == "temporary"
        assert jwt_service.get_token_type(reset_token) == "reset"
        assert jwt_service.get_token_type("invalid") == "invalid"


class TestPasswordService:
    """Test cases for password service."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password_service = PasswordService()
        password = "TestPassword123!"
        
        hashed = password_service.hash_password(password)
        
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password
    
    def test_verify_password(self):
        """Test password verification."""
        password_service = PasswordService()
        password = "TestPassword123!"
        
        hashed = password_service.hash_password(password)
        
        assert password_service.verify_password(password, hashed) is True
        assert password_service.verify_password("WrongPassword", hashed) is False
    
    def test_validate_complexity_valid_password(self):
        """Test password complexity validation with valid password."""
        password_service = PasswordService()
        password = "ValidPassword147!"
        
        is_valid, errors = password_service.validate_complexity(password)
        
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_complexity_invalid_passwords(self):
        """Test password complexity validation with invalid passwords."""
        password_service = PasswordService()
        
        # Too short
        is_valid, errors = password_service.validate_complexity("Short1!")
        assert is_valid is False
        assert any("12 characters" in error for error in errors)
        
        # No uppercase
        is_valid, errors = password_service.validate_complexity("lowercase123!")
        assert is_valid is False
        assert any("uppercase" in error for error in errors)
        
        # No lowercase
        is_valid, errors = password_service.validate_complexity("UPPERCASE123!")
        assert is_valid is False
        assert any("lowercase" in error for error in errors)
        
        # No number
        is_valid, errors = password_service.validate_complexity("NoNumbersHere!")
        assert is_valid is False
        assert any("number" in error for error in errors)
        
        # No special character
        is_valid, errors = password_service.validate_complexity("NoSpecialChar123")
        assert is_valid is False
        assert any("special character" in error for error in errors)
    
    def test_generate_otp(self):
        """Test OTP generation."""
        password_service = PasswordService()
        
        otp = password_service.generate_otp()
        
        assert isinstance(otp, str)
        assert len(otp) == 6
        assert otp.isdigit()
    
    def test_validate_otp_format(self):
        """Test OTP format validation."""
        password_service = PasswordService()
        
        assert password_service.validate_otp_format("123456") is True
        assert password_service.validate_otp_format("12345") is False
        assert password_service.validate_otp_format("1234567") is False
        assert password_service.validate_otp_format("12345a") is False
        assert password_service.validate_otp_format("") is False
    
    def test_generate_secure_token(self):
        """Test secure token generation."""
        password_service = PasswordService()
        
        token = password_service.generate_secure_token(32)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_is_common_password(self):
        """Test common password detection."""
        password_service = PasswordService()
        
        assert password_service.is_common_password("password") is True
        assert password_service.is_common_password("123456") is True
        assert password_service.is_common_password("UniquePassword123!") is False
    
    def test_get_password_strength_score(self):
        """Test password strength scoring."""
        password_service = PasswordService()
        
        # Very weak password
        score, strength = password_service.get_password_strength_score("123")
        assert score < 40
        assert strength in ["Very Weak", "Weak"]
        
        # Strong password
        score, strength = password_service.get_password_strength_score("StrongPassword123!")
        assert score >= 60
        assert strength in ["Strong", "Very Strong"]


class TestTwoFactorService:
    """Test cases for 2FA service."""
    
    def test_generate_secret(self):
        """Test TOTP secret generation."""
        two_factor_service = TwoFactorService()
        
        secret = two_factor_service.generate_secret()
        
        assert isinstance(secret, str)
        assert len(secret) > 0
        assert two_factor_service.validate_secret(secret) is True
    
    def test_generate_qr_code(self):
        """Test QR code generation."""
        two_factor_service = TwoFactorService()
        secret = two_factor_service.generate_secret()
        email = "test@example.com"
        
        qr_code = two_factor_service.generate_qr_code(email, secret)
        
        assert isinstance(qr_code, str)
        assert qr_code.startswith("data:image/png;base64,")
    
    def test_verify_totp(self):
        """Test TOTP verification."""
        two_factor_service = TwoFactorService()
        secret = two_factor_service.generate_secret()
        
        # Get current TOTP
        current_totp = two_factor_service.get_current_totp(secret)
        
        # Verify it
        assert two_factor_service.verify_totp(secret, current_totp) is True
        assert two_factor_service.verify_totp(secret, "000000") is False
        assert two_factor_service.verify_totp(secret, "invalid") is False
    
    def test_generate_backup_codes(self):
        """Test backup code generation."""
        two_factor_service = TwoFactorService()
        
        codes = two_factor_service.generate_backup_codes()
        
        assert isinstance(codes, list)
        assert len(codes) == 10
        for code in codes:
            assert isinstance(code, str)
            assert len(code) == 8
            assert code.isalnum()
    
    def test_hash_backup_codes(self):
        """Test backup code hashing."""
        two_factor_service = TwoFactorService()
        codes = ["ABCD1234", "EFGH5678"]
        
        hashed_json = two_factor_service.hash_backup_codes(codes)
        
        assert isinstance(hashed_json, str)
        hashed_data = json.loads(hashed_json)
        assert len(hashed_data) == 2
        for item in hashed_data:
            assert "hash" in item
            assert "salt" in item
            assert "used" in item
            assert item["used"] is False
    
    def test_verify_backup_code(self):
        """Test backup code verification."""
        two_factor_service = TwoFactorService()
        codes = ["ABCD1234", "EFGH5678"]
        
        hashed_json = two_factor_service.hash_backup_codes(codes)
        
        # Verify valid code
        is_valid, updated_json = two_factor_service.verify_backup_code(hashed_json, "ABCD1234")
        assert is_valid is True
        
        # Code should now be marked as used
        updated_data = json.loads(updated_json)
        used_codes = [item for item in updated_data if item["used"]]
        assert len(used_codes) == 1
        
        # Verify same code again (should fail)
        is_valid, _ = two_factor_service.verify_backup_code(updated_json, "ABCD1234")
        assert is_valid is False
        
        # Verify invalid code
        is_valid, _ = two_factor_service.verify_backup_code(hashed_json, "INVALID1")
        assert is_valid is False
    
    def test_get_unused_backup_codes_count(self):
        """Test counting unused backup codes."""
        two_factor_service = TwoFactorService()
        codes = ["ABCD1234", "EFGH5678"]
        
        hashed_json = two_factor_service.hash_backup_codes(codes)
        
        # Initially all codes should be unused
        count = two_factor_service.get_unused_backup_codes_count(hashed_json)
        assert count == 2
        
        # Use one code
        _, updated_json = two_factor_service.verify_backup_code(hashed_json, "ABCD1234")
        count = two_factor_service.get_unused_backup_codes_count(updated_json)
        assert count == 1
    
    def test_regenerate_backup_codes(self):
        """Test backup code regeneration."""
        two_factor_service = TwoFactorService()
        
        plain_codes, hashed_json = two_factor_service.regenerate_backup_codes()
        
        assert isinstance(plain_codes, list)
        assert len(plain_codes) == 10
        assert isinstance(hashed_json, str)
        
        # Verify all codes work
        for code in plain_codes:
            is_valid, hashed_json = two_factor_service.verify_backup_code(hashed_json, code)
            assert is_valid is True
    
    def test_validate_secret(self):
        """Test TOTP secret validation."""
        two_factor_service = TwoFactorService()
        
        valid_secret = two_factor_service.generate_secret()
        assert two_factor_service.validate_secret(valid_secret) is True
        assert two_factor_service.validate_secret("invalid_secret") is False
        assert two_factor_service.validate_secret("") is False
    
    def test_get_totp_uri(self):
        """Test TOTP URI generation."""
        two_factor_service = TwoFactorService()
        secret = two_factor_service.generate_secret()
        email = "test@example.com"
        
        uri = two_factor_service.get_totp_uri(email, secret)
        
        assert isinstance(uri, str)
        assert uri.startswith("otpauth://totp/")
        assert "test%40example.com" in uri  # URL encoded email
        assert secret in uri
    
    def test_format_backup_codes_for_display(self):
        """Test backup code formatting."""
        two_factor_service = TwoFactorService()
        codes = ["ABCD1234", "EFGH5678"]
        
        formatted = two_factor_service.format_backup_codes_for_display(codes)
        
        assert formatted == ["ABCD-1234", "EFGH-5678"]
    
    def test_normalize_backup_code_input(self):
        """Test backup code input normalization."""
        two_factor_service = TwoFactorService()
        
        assert two_factor_service.normalize_backup_code_input("abcd-1234") == "ABCD1234"
        assert two_factor_service.normalize_backup_code_input("ABCD 1234") == "ABCD1234"
        assert two_factor_service.normalize_backup_code_input(" abcd-1234 ") == "ABCD1234"