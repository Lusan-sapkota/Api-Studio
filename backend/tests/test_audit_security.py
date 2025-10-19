"""
Tests for audit logging and security features.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch
from sqlmodel import Session, select

from core.audit_service import audit_service, AuditActions
from core.rate_limiter import rate_limiter, RateLimitRule
from core.security_validator import security_validator
from db.models import User, AuditLog
from core.password_service import password_service


class TestAuditService:
    """Test audit logging functionality."""
    
    def test_log_event_basic(self, session: Session):
        """Test basic event logging."""
        # Log a basic event
        log = audit_service.log_event(
            action="test_action",
            user_id=1,
            resource_type="test_resource",
            resource_id="123",
            details={"key": "value"},
            ip_address="192.168.1.1",
            user_agent="test-agent",
            session=session
        )
        
        assert log.id is not None
        assert log.action == "test_action"
        assert log.user_id == 1
        assert log.resource_type == "test_resource"
        assert log.resource_id == "123"
        assert log.details == {"key": "value"}
        assert log.ip_address == "192.168.1.1"
        assert log.user_agent == "test-agent"
        assert log.created_at is not None
    
    def test_log_authentication_event(self, session: Session):
        """Test authentication event logging."""
        # Create a test user
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hashed",
            role="viewer"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Log authentication event
        log = audit_service.log_authentication_event(
            action=AuditActions.LOGIN_SUCCESS,
            email="test@example.com",
            success=True,
            ip_address="192.168.1.1",
            user_agent="test-agent",
            details={"2fa_used": True},
            session=session
        )
        
        assert log.action == AuditActions.LOGIN_SUCCESS
        assert log.user_id == user.id
        assert log.resource_type == "authentication"
        assert log.details["email"] == "test@example.com"
        assert log.details["success"] is True
        assert log.details["2fa_used"] is True
    
    def test_log_authentication_event_no_user(self, session: Session):
        """Test authentication event logging for non-existent user."""
        log = audit_service.log_authentication_event(
            action=AuditActions.LOGIN_FAILED,
            email="nonexistent@example.com",
            success=False,
            ip_address="192.168.1.1",
            user_agent="test-agent",
            details={"reason": "invalid_email"},
            session=session
        )
        
        assert log.action == AuditActions.LOGIN_FAILED
        assert log.user_id is None
        assert log.details["email"] == "nonexistent@example.com"
        assert log.details["success"] is False
        assert log.details["reason"] == "invalid_email"
    
    def test_log_user_management_event(self, session: Session):
        """Test user management event logging."""
        # Create test users
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password="hashed",
            role="admin"
        )
        target_user = User(
            username="target",
            email="target@example.com",
            hashed_password="hashed",
            role="viewer"
        )
        session.add_all([admin_user, target_user])
        session.commit()
        session.refresh(admin_user)
        session.refresh(target_user)
        
        # Log user management event
        log = audit_service.log_user_management_event(
            action=AuditActions.USER_ROLE_CHANGED,
            admin_user_id=admin_user.id,
            target_user_id=target_user.id,
            target_email="target@example.com",
            ip_address="192.168.1.1",
            user_agent="test-agent",
            details={"old_role": "viewer", "new_role": "editor"},
            session=session
        )
        
        assert log.action == AuditActions.USER_ROLE_CHANGED
        assert log.user_id == admin_user.id
        assert log.resource_type == "user_management"
        assert log.resource_id == str(target_user.id)
        assert log.details["target_email"] == "target@example.com"
        assert log.details["old_role"] == "viewer"
        assert log.details["new_role"] == "editor"
    
    def test_log_security_event(self, session: Session):
        """Test security event logging."""
        log = audit_service.log_security_event(
            action=AuditActions.ACCOUNT_LOCKED,
            user_id=1,
            ip_address="192.168.1.1",
            user_agent="test-agent",
            details={"reason": "max_attempts_exceeded", "attempts": 5},
            session=session
        )
        
        assert log.action == AuditActions.ACCOUNT_LOCKED
        assert log.user_id == 1
        assert log.resource_type == "security"
        assert log.details["reason"] == "max_attempts_exceeded"
        assert log.details["attempts"] == 5
    
    def test_get_audit_logs(self, session: Session):
        """Test retrieving audit logs."""
        # Create test logs
        for i in range(5):
            audit_service.log_event(
                action=f"test_action_{i}",
                user_id=i % 2 + 1,
                resource_type="test",
                session=session
            )
        
        # Get all logs
        logs = audit_service.get_audit_logs(session=session)
        assert len(logs) == 5
        
        # Get logs with limit
        logs = audit_service.get_audit_logs(limit=3, session=session)
        assert len(logs) == 3
        
        # Get logs with offset
        logs = audit_service.get_audit_logs(limit=3, offset=2, session=session)
        assert len(logs) == 3
        
        # Get logs filtered by user
        logs = audit_service.get_audit_logs(user_id=1, session=session)
        assert len(logs) == 3  # Users 1 appears in positions 0, 2, 4
        
        # Get logs filtered by action
        logs = audit_service.get_audit_logs(action="test_action_1", session=session)
        assert len(logs) == 1
    
    def test_extract_request_info(self):
        """Test extracting request information."""
        # Mock request with standard headers
        request = Mock()
        request.headers = {
            "user-agent": "Mozilla/5.0 Test Browser",
            "x-forwarded-for": "203.0.113.1, 192.168.1.1",
        }
        request.client = Mock()
        request.client.host = "192.168.1.1"
        
        ip_address, user_agent = audit_service.extract_request_info(request)
        
        assert ip_address == "203.0.113.1"  # First IP from x-forwarded-for
        assert user_agent == "Mozilla/5.0 Test Browser"
        
        # Test with x-real-ip header
        request.headers = {
            "user-agent": "Test Agent",
            "x-real-ip": "203.0.113.2",
        }
        
        ip_address, user_agent = audit_service.extract_request_info(request)
        
        assert ip_address == "203.0.113.2"
        assert user_agent == "Test Agent"
        
        # Test with no proxy headers
        request.headers = {"user-agent": "Direct Agent"}
        del request.headers["x-real-ip"]
        
        ip_address, user_agent = audit_service.extract_request_info(request)
        
        assert ip_address == "192.168.1.1"  # From client.host
        assert user_agent == "Direct Agent"


class TestRateLimiter:
    """Test rate limiting functionality."""
    
    def setup_method(self):
        """Reset rate limiter before each test."""
        rate_limiter._ip_attempts.clear()
        rate_limiter._email_attempts.clear()
    
    def test_check_rate_limit_allowed(self):
        """Test rate limit check when within limits."""
        allowed, reason, retry_after = rate_limiter.check_rate_limit(
            endpoint="login",
            ip_address="192.168.1.1",
            email="test@example.com"
        )
        
        assert allowed is True
        assert reason is None
        assert retry_after is None
    
    def test_check_rate_limit_unknown_endpoint(self):
        """Test rate limit check for unknown endpoint."""
        allowed, reason, retry_after = rate_limiter.check_rate_limit(
            endpoint="unknown",
            ip_address="192.168.1.1"
        )
        
        assert allowed is True
        assert reason is None
        assert retry_after is None
    
    def test_record_and_check_failed_attempts(self):
        """Test recording failed attempts and rate limiting."""
        ip_address = "192.168.1.1"
        email = "test@example.com"
        
        # Record 4 failed attempts (within limit)
        for i in range(4):
            rate_limiter.record_attempt(
                endpoint="login",
                success=False,
                ip_address=ip_address,
                email=email
            )
        
        # Should still be allowed
        allowed, reason, retry_after = rate_limiter.check_rate_limit(
            endpoint="login",
            ip_address=ip_address,
            email=email
        )
        assert allowed is True
        
        # Record 5th failed attempt (exceeds limit)
        rate_limiter.record_attempt(
            endpoint="login",
            success=False,
            ip_address=ip_address,
            email=email
        )
        
        # Should now be blocked
        allowed, reason, retry_after = rate_limiter.check_rate_limit(
            endpoint="login",
            ip_address=ip_address,
            email=email
        )
        assert allowed is False
        assert "Rate limit exceeded" in reason
        assert retry_after is not None
    
    def test_successful_attempt_resets_counter(self):
        """Test that successful login resets the counter."""
        ip_address = "192.168.1.1"
        email = "test@example.com"
        
        # Record 4 failed attempts
        for i in range(4):
            rate_limiter.record_attempt(
                endpoint="login",
                success=False,
                ip_address=ip_address,
                email=email
            )
        
        # Record successful attempt
        rate_limiter.record_attempt(
            endpoint="login",
            success=True,
            ip_address=ip_address,
            email=email
        )
        
        # Should be allowed again
        allowed, reason, retry_after = rate_limiter.check_rate_limit(
            endpoint="login",
            ip_address=ip_address,
            email=email
        )
        assert allowed is True
    
    def test_different_endpoints_separate_limits(self):
        """Test that different endpoints have separate rate limits."""
        ip_address = "192.168.1.1"
        email = "test@example.com"
        
        # Exceed login limit
        for i in range(6):
            rate_limiter.record_attempt(
                endpoint="login",
                success=False,
                ip_address=ip_address,
                email=email
            )
        
        # Login should be blocked
        allowed, _, _ = rate_limiter.check_rate_limit(
            endpoint="login",
            ip_address=ip_address,
            email=email
        )
        assert allowed is False
        
        # Password reset should still be allowed
        allowed, _, _ = rate_limiter.check_rate_limit(
            endpoint="password_reset",
            ip_address=ip_address,
            email=email
        )
        assert allowed is True
    
    def test_get_attempt_info(self):
        """Test getting attempt information."""
        ip_address = "192.168.1.1"
        email = "test@example.com"
        
        # Record some attempts
        for i in range(3):
            rate_limiter.record_attempt(
                endpoint="login",
                success=False,
                ip_address=ip_address,
                email=email
            )
        
        info = rate_limiter.get_attempt_info(
            endpoint="login",
            ip_address=ip_address,
            email=email
        )
        
        assert "ip" in info
        assert "email" in info
        assert info["ip"]["attempts"] == 3
        assert info["email"]["attempts"] == 3
        assert info["ip"]["max_attempts"] == 5
        assert info["ip"]["is_locked"] is False
    
    def test_clear_attempts(self):
        """Test clearing rate limit attempts."""
        ip_address = "192.168.1.1"
        email = "test@example.com"
        
        # Record some attempts
        for i in range(3):
            rate_limiter.record_attempt(
                endpoint="login",
                success=False,
                ip_address=ip_address,
                email=email
            )
        
        # Clear IP attempts for login
        rate_limiter.clear_attempts(
            endpoint="login",
            ip_address=ip_address
        )
        
        info = rate_limiter.get_attempt_info(
            endpoint="login",
            ip_address=ip_address,
            email=email
        )
        
        assert info["ip"]["attempts"] == 0
        assert info["email"]["attempts"] == 3  # Email attempts not cleared


class TestSecurityValidator:
    """Test security validation functionality."""
    
    def test_sanitize_html(self):
        """Test HTML sanitization."""
        # Basic HTML escaping
        result = security_validator.sanitize_html("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "&lt;script&gt;" in result or result == ""
        
        # Normal text should be preserved
        result = security_validator.sanitize_html("Hello World")
        assert result == "Hello World"
        
        # Empty/None input
        assert security_validator.sanitize_html("") == ""
        assert security_validator.sanitize_html(None) == ""
    
    def test_validate_email(self):
        """Test email validation."""
        # Valid emails
        valid, msg = security_validator.validate_email("test@example.com")
        assert valid is True
        assert msg is None
        
        valid, msg = security_validator.validate_email("user.name+tag@domain.co.uk")
        assert valid is True
        
        # Invalid emails
        valid, msg = security_validator.validate_email("invalid-email")
        assert valid is False
        assert "Invalid email format" in msg
        
        valid, msg = security_validator.validate_email("test@")
        assert valid is False
        
        valid, msg = security_validator.validate_email("@example.com")
        assert valid is False
        
        # Empty email
        valid, msg = security_validator.validate_email("")
        assert valid is False
        assert "Email is required" in msg
        
        # Too long email
        long_email = "a" * 250 + "@example.com"
        valid, msg = security_validator.validate_email(long_email)
        assert valid is False
        assert "too long" in msg
    
    def test_validate_username(self):
        """Test username validation."""
        # Valid usernames
        valid, msg = security_validator.validate_username("testuser")
        assert valid is True
        assert msg is None
        
        valid, msg = security_validator.validate_username("user_123")
        assert valid is True
        
        valid, msg = security_validator.validate_username("user-name.test")
        assert valid is True
        
        # Invalid usernames
        valid, msg = security_validator.validate_username("ab")  # Too short
        assert valid is False
        assert "at least 3 characters" in msg
        
        valid, msg = security_validator.validate_username("a" * 31)  # Too long
        assert valid is False
        assert "no more than 30 characters" in msg
        
        valid, msg = security_validator.validate_username("user@name")  # Invalid chars
        assert valid is False
        assert "can only contain" in msg
        
        # Reserved usernames
        valid, msg = security_validator.validate_username("admin")
        assert valid is False
        assert "reserved" in msg
    
    def test_validate_name(self):
        """Test display name validation."""
        # Valid names
        valid, msg = security_validator.validate_name("John Doe")
        assert valid is True
        assert msg is None
        
        valid, msg = security_validator.validate_name("Mary O'Connor")
        assert valid is True
        
        # Empty name (should be allowed)
        valid, msg = security_validator.validate_name("")
        assert valid is True
        
        valid, msg = security_validator.validate_name(None)
        assert valid is True
        
        # Too long name
        long_name = "a" * 101
        valid, msg = security_validator.validate_name(long_name)
        assert valid is False
        assert "no more than 100 characters" in msg
    
    def test_validate_url(self):
        """Test URL validation."""
        # Valid URLs
        valid, msg = security_validator.validate_url("https://example.com")
        assert valid is True
        assert msg is None
        
        valid, msg = security_validator.validate_url("http://api.example.com/path")
        assert valid is True
        
        # Invalid URLs
        valid, msg = security_validator.validate_url("ftp://example.com")
        assert valid is False
        assert "HTTP or HTTPS" in msg
        
        valid, msg = security_validator.validate_url("not-a-url")
        assert valid is False
        
        # Empty URL
        valid, msg = security_validator.validate_url("")
        assert valid is False
        assert "URL is required" in msg
        
        # Too long URL
        long_url = "https://example.com/" + "a" * 2050
        valid, msg = security_validator.validate_url(long_url)
        assert valid is False
        assert "too long" in msg
    
    def test_validate_json_field(self):
        """Test JSON field validation."""
        # Valid JSON data
        valid, msg = security_validator.validate_json_field({"key": "value"})
        assert valid is True
        assert msg is None
        
        valid, msg = security_validator.validate_json_field([1, 2, 3])
        assert valid is True
        
        valid, msg = security_validator.validate_json_field(None)
        assert valid is True
        
        # Too large JSON
        large_data = {"key": "a" * 10000}
        valid, msg = security_validator.validate_json_field(large_data, max_size=100)
        assert valid is False
        assert "too large" in msg
    
    def test_sanitize_filename(self):
        """Test filename sanitization."""
        # Normal filename
        result = security_validator.sanitize_filename("document.pdf")
        assert result == "document.pdf"
        
        # Filename with dangerous characters
        result = security_validator.sanitize_filename("../../../etc/passwd")
        assert result == "_.._.._.._etc_passwd"
        
        # Empty filename
        result = security_validator.sanitize_filename("")
        assert result == "unnamed"
        
        # Very long filename
        long_name = "a" * 300 + ".txt"
        result = security_validator.sanitize_filename(long_name)
        assert len(result) <= 255
        assert result.endswith(".txt")
    
    def test_validate_ip_address(self):
        """Test IP address validation."""
        # Valid IPv4
        valid, msg = security_validator.validate_ip_address("192.168.1.1")
        assert valid is True
        assert msg is None
        
        # Valid IPv6
        valid, msg = security_validator.validate_ip_address("2001:db8::1")
        assert valid is True
        
        # Invalid IP
        valid, msg = security_validator.validate_ip_address("256.256.256.256")
        assert valid is False
        assert "Invalid IP address" in msg
        
        valid, msg = security_validator.validate_ip_address("not-an-ip")
        assert valid is False
        
        # Empty IP
        valid, msg = security_validator.validate_ip_address("")
        assert valid is False
        assert "IP address is required" in msg
    
    def test_validate_request_size(self):
        """Test request size validation."""
        # Valid size
        valid, msg = security_validator.validate_request_size(1024)
        assert valid is True
        assert msg is None
        
        # None size (should be allowed)
        valid, msg = security_validator.validate_request_size(None)
        assert valid is True
        
        # Too large
        valid, msg = security_validator.validate_request_size(20 * 1024 * 1024)  # 20MB
        assert valid is False
        assert "Request too large" in msg
    
    def test_get_safe_headers(self):
        """Test safe header extraction."""
        headers = {
            "User-Agent": "Mozilla/5.0 Test Browser",
            "Authorization": "Bearer secret-token",
            "Content-Type": "application/json",
            "X-Custom-Header": "custom-value",
            "Accept": "application/json"
        }
        
        safe_headers = security_validator.get_safe_headers(headers)
        
        assert "user-agent" in safe_headers
        assert "content-type" in safe_headers
        assert "accept" in safe_headers
        assert "authorization" not in safe_headers  # Should be filtered out
        assert "x-custom-header" not in safe_headers  # Should be filtered out


class TestIntegratedSecurity:
    """Test integrated security features."""
    
    def test_login_with_rate_limiting_and_audit(self, session: Session):
        """Test login with rate limiting and audit logging integration."""
        # Create a test user
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=password_service.hash_password("password123"),
            role="viewer",
            status="active"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        ip_address = "192.168.1.1"
        email = "test@example.com"
        
        # Clear any existing rate limits
        rate_limiter.clear_attempts(ip_address=ip_address, email=email)
        
        # Test successful login creates audit log
        from api.services.auth_service import auth_service
        
        success, user_obj, token, data = auth_service.authenticate_user(
            session=session,
            email=email,
            password="password123",
            ip_address=ip_address,
            user_agent="test-agent"
        )
        
        assert success is True
        
        # Check audit log was created
        logs = session.exec(
            select(AuditLog).where(
                AuditLog.action == AuditActions.LOGIN_SUCCESS,
                AuditLog.user_id == user.id
            )
        ).all()
        
        assert len(logs) == 1
        assert logs[0].ip_address == ip_address
        assert logs[0].user_agent == "test-agent"
        
        # Test failed login attempts with rate limiting
        for i in range(5):
            success, _, _, _ = auth_service.authenticate_user(
                session=session,
                email=email,
                password="wrongpassword",
                ip_address=ip_address,
                user_agent="test-agent"
            )
            assert success is False
        
        # Check that account is now locked
        user_obj = session.get(User, user.id)
        assert user_obj.locked_until is not None
        
        # Check audit logs for failed attempts
        failed_logs = session.exec(
            select(AuditLog).where(
                AuditLog.action == AuditActions.LOGIN_FAILED,
                AuditLog.user_id == user.id
            )
        ).all()
        
        assert len(failed_logs) >= 5
        
        # Check for account locked audit log
        locked_logs = session.exec(
            select(AuditLog).where(
                AuditLog.action == AuditActions.ACCOUNT_LOCKED,
                AuditLog.user_id == user.id
            )
        ).all()
        
        assert len(locked_logs) == 1
    
    def test_input_validation_prevents_malicious_input(self):
        """Test that input validation prevents malicious input."""
        # Test XSS prevention
        malicious_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "'; DROP TABLE users; --"
        ]
        
        for malicious_input in malicious_inputs:
            # Email validation should reject malicious input
            valid, msg = security_validator.validate_email(malicious_input)
            assert valid is False
            
            # Username validation should reject malicious input
            valid, msg = security_validator.validate_username(malicious_input)
            assert valid is False
            
            # HTML sanitization should neutralize malicious input
            sanitized = security_validator.sanitize_html(malicious_input)
            assert "<script>" not in sanitized
            assert "javascript:" not in sanitized
            assert "onerror=" not in sanitized