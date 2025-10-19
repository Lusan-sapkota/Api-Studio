"""
Unit tests for email service.
Tests SMTP connection, email template rendering, and email sending functionality.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio

from core.email_service import EmailService, EmailTemplateLoader
from core.config import Settings


class TestEmailService:
    """Test cases for email service."""
    
    @pytest.fixture
    def email_settings(self):
        """Create test settings with SMTP configuration."""
        return Settings(
            database_url="sqlite:///:memory:",
            secret_key="test-secret-key",
            jwt_secret="test-jwt-secret",
            algorithm="HS256",
            access_token_expire_minutes=30,
            frontend_url="http://localhost:3000",
            app_mode="hosted",
            smtp_server="smtp.test.com",
            smtp_port=587,
            smtp_user="test@test.com",
            smtp_password="testpass",
            email_from="noreply@test.com",
            otp_expiry=600,
            app_name="API Studio Test"
        )
    
    @pytest.fixture
    def email_service_with_config(self, email_settings):
        """Create email service with test configuration."""
        with patch('core.email_service.settings', email_settings):
            return EmailService()
    
    def test_email_service_initialization(self, email_service_with_config):
        """Test email service initialization with configuration."""
        service = email_service_with_config
        
        assert service.smtp_server == "smtp.test.com"
        assert service.smtp_port == 587
        assert service.smtp_user == "test@test.com"
        assert service.smtp_password == "testpass"
        assert service.email_from == "noreply@test.com"
        assert service.app_name == "API Studio Test"
        assert service.max_retries == 3
        assert service.retry_delay == 2
    
    def test_validate_smtp_config_valid(self, email_service_with_config):
        """Test SMTP configuration validation with valid config."""
        service = email_service_with_config
        
        assert service._validate_smtp_config() is True
    
    def test_validate_smtp_config_invalid(self):
        """Test SMTP configuration validation with invalid config."""
        # Test with missing SMTP configuration
        settings = Settings(
            database_url="sqlite:///:memory:",
            secret_key="test-secret-key",
            frontend_url="http://localhost:3000",
            app_mode="hosted"
        )
        
        with patch('core.email_service.settings', settings):
            service = EmailService()
            assert service._validate_smtp_config() is False
    
    @patch('smtplib.SMTP')
    def test_test_connection_success(self, mock_smtp, email_service_with_config):
        """Test successful SMTP connection test."""
        service = email_service_with_config
        
        # Mock successful SMTP connection
        mock_server = Mock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        success, error = service.test_connection()
        
        assert success is True
        assert error is None
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@test.com", "testpass")
    
    @patch('smtplib.SMTP')
    def test_test_connection_auth_failure(self, mock_smtp, email_service_with_config):
        """Test SMTP connection test with authentication failure."""
        service = email_service_with_config
        
        # Mock authentication failure
        mock_server = Mock()
        mock_server.login.side_effect = Exception("Authentication failed")
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        success, error = service.test_connection()
        
        assert success is False
        assert "Authentication failed" in error
    
    @pytest.mark.asyncio
    @patch('aiosmtplib.SMTP')
    async def test_test_connection_async_success(self, mock_smtp, email_service_with_config):
        """Test successful async SMTP connection test."""
        service = email_service_with_config
        
        # Mock successful async SMTP connection
        mock_server = AsyncMock()
        mock_smtp.return_value.__aenter__.return_value = mock_server
        
        success, error = await service.test_connection_async()
        
        assert success is True
        assert error is None
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@test.com", "testpass")
    
    def test_email_template_loader(self, email_service_with_config):
        """Test email template loader functionality."""
        service = email_service_with_config
        
        # Test template loading
        template = service.jinja_env.get_template('bootstrap_otp')
        assert template is not None
        
        # Test template rendering
        context = {
            'otp': '123456',
            'app_name': 'Test App',
            'email': 'test@example.com',
            'expiry_minutes': 10
        }
        
        rendered = template.render(**context)
        assert '123456' in rendered
        assert 'Test App' in rendered
    
    def test_bootstrap_otp_template_rendering(self, email_service_with_config):
        """Test bootstrap OTP template rendering."""
        service = email_service_with_config
        
        template = service.jinja_env.get_template('bootstrap_otp')
        context = {
            'otp': '123456',
            'app_name': 'API Studio Test',
            'email': 'admin@test.com',
            'expiry_minutes': 10
        }
        
        html_content = template.render(**context)
        
        # Check required content is present
        assert '123456' in html_content
        assert 'API Studio Test' in html_content
        assert '10 minutes' in html_content
        assert 'Admin Setup Verification' in html_content
    
    def test_password_reset_template_rendering(self, email_service_with_config):
        """Test password reset template rendering."""
        service = email_service_with_config
        
        template = service.jinja_env.get_template('password_reset_otp')
        context = {
            'otp': '654321',
            'app_name': 'API Studio Test',
            'email': 'user@test.com',
            'expiry_minutes': 15
        }
        
        html_content = template.render(**context)
        
        # Check required content is present
        assert '654321' in html_content
        assert 'API Studio Test' in html_content
        assert 'user@test.com' in html_content
        assert '15 minutes' in html_content
        assert 'Password Reset Request' in html_content
    
    def test_invitation_template_rendering(self, email_service_with_config):
        """Test invitation template rendering."""
        service = email_service_with_config
        
        template = service.jinja_env.get_template('invitation')
        context = {
            'otp': '789012',
            'app_name': 'API Studio Test',
            'email': 'newuser@test.com',
            'role': 'editor',
            'inviter_name': 'Admin User'
        }
        
        html_content = template.render(**context)
        
        # Check required content is present
        assert '789012' in html_content
        assert 'API Studio Test' in html_content
        assert 'Editor' in html_content  # Should be title-cased
        assert 'Admin User' in html_content
        assert 'Team Invitation' in html_content
    
    def test_text_template_rendering(self, email_service_with_config):
        """Test text template rendering."""
        service = email_service_with_config
        
        template = service.jinja_env.get_template('bootstrap_otp_text')
        context = {
            'otp': '123456',
            'app_name': 'API Studio Test',
            'email': 'admin@test.com',
            'expiry_minutes': 10
        }
        
        text_content = template.render(**context)
        
        # Check required content is present
        assert '123456' in text_content
        assert 'API Studio Test' in text_content
        assert '10 minutes' in text_content
        # Text version should not contain HTML tags
        assert '<' not in text_content
        assert '>' not in text_content
    
    @pytest.mark.asyncio
    @patch('aiosmtplib.SMTP')
    async def test_send_templated_email_success(self, mock_smtp, email_service_with_config):
        """Test successful templated email sending."""
        service = email_service_with_config
        
        # Mock successful email sending
        mock_server = AsyncMock()
        mock_smtp.return_value.__aenter__.return_value = mock_server
        
        success = await service._send_templated_email(
            to_email="test@example.com",
            subject="Test Subject",
            template_name="bootstrap_otp",
            template_context={
                'otp': '123456',
                'app_name': 'Test App',
                'email': 'test@example.com',
                'expiry_minutes': 10
            }
        )
        
        assert success is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.send_message.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('aiosmtplib.SMTP')
    async def test_send_templated_email_failure(self, mock_smtp, email_service_with_config):
        """Test email sending failure with retry logic."""
        service = email_service_with_config
        service.max_retries = 2  # Reduce retries for faster testing
        
        # Mock email sending failure
        mock_server = AsyncMock()
        mock_server.send_message.side_effect = Exception("SMTP Error")
        mock_smtp.return_value.__aenter__.return_value = mock_server
        
        success = await service._send_templated_email(
            to_email="test@example.com",
            subject="Test Subject",
            template_name="bootstrap_otp",
            template_context={
                'otp': '123456',
                'app_name': 'Test App',
                'email': 'test@example.com',
                'expiry_minutes': 10
            }
        )
        
        assert success is False
        # Should retry the configured number of times
        assert mock_server.send_message.call_count == 2
    
    @pytest.mark.asyncio
    async def test_send_otp_bootstrap(self, email_service_with_config):
        """Test sending bootstrap OTP email."""
        service = email_service_with_config
        
        with patch.object(service, '_send_templated_email', return_value=True) as mock_send:
            success = await service.send_otp(
                email="admin@test.com",
                otp="123456",
                otp_type="bootstrap"
            )
            
            assert success is True
            mock_send.assert_called_once()
            
            # Check the call arguments
            call_args = mock_send.call_args
            assert call_args[1]['to_email'] == "admin@test.com"
            assert "Admin Setup Verification" in call_args[1]['subject']
            assert call_args[1]['template_name'] == "bootstrap_otp"
            assert call_args[1]['template_context']['otp'] == "123456"
    
    @pytest.mark.asyncio
    async def test_send_otp_password_reset(self, email_service_with_config):
        """Test sending password reset OTP email."""
        service = email_service_with_config
        
        with patch.object(service, '_send_templated_email', return_value=True) as mock_send:
            success = await service.send_otp(
                email="user@test.com",
                otp="654321",
                otp_type="password_reset"
            )
            
            assert success is True
            mock_send.assert_called_once()
            
            # Check the call arguments
            call_args = mock_send.call_args
            assert call_args[1]['to_email'] == "user@test.com"
            assert "Password Reset Verification" in call_args[1]['subject']
            assert call_args[1]['template_name'] == "password_reset_otp"
            assert call_args[1]['template_context']['otp'] == "654321"
    
    @pytest.mark.asyncio
    async def test_send_invitation(self, email_service_with_config):
        """Test sending invitation email."""
        service = email_service_with_config
        
        with patch.object(service, 'send_otp', return_value=True) as mock_send_otp:
            success = await service.send_invitation(
                email="newuser@test.com",
                role="editor",
                otp="789012",
                inviter_name="Admin User"
            )
            
            assert success is True
            mock_send_otp.assert_called_once_with(
                email="newuser@test.com",
                otp="789012",
                otp_type="invitation",
                role="editor",
                inviter_name="Admin User"
            )
    
    @pytest.mark.asyncio
    async def test_send_password_reset_confirmation(self, email_service_with_config):
        """Test sending password reset confirmation email."""
        service = email_service_with_config
        
        with patch.object(service, '_send_templated_email', return_value=True) as mock_send:
            success = await service.send_password_reset_confirmation(
                email="user@test.com",
                user_name="Test User"
            )
            
            assert success is True
            mock_send.assert_called_once()
            
            # Check the call arguments
            call_args = mock_send.call_args
            assert call_args[1]['to_email'] == "user@test.com"
            assert "Password Reset Successful" in call_args[1]['subject']
            assert call_args[1]['template_name'] == "password_reset_confirmation"
            assert call_args[1]['template_context']['user_name'] == "Test User"
    
    @pytest.mark.asyncio
    async def test_send_welcome_email(self, email_service_with_config):
        """Test sending welcome email."""
        service = email_service_with_config
        
        with patch.object(service, '_send_templated_email', return_value=True) as mock_send:
            success = await service.send_welcome_email(
                email="newuser@test.com",
                user_name="New User",
                role="viewer"
            )
            
            assert success is True
            mock_send.assert_called_once()
            
            # Check the call arguments
            call_args = mock_send.call_args
            assert call_args[1]['to_email'] == "newuser@test.com"
            assert "Welcome to" in call_args[1]['subject']
            assert call_args[1]['template_name'] == "welcome"
            assert call_args[1]['template_context']['user_name'] == "New User"
            assert call_args[1]['template_context']['role'] == "Viewer"  # Should be title-cased
    
    def test_send_email_without_smtp_config(self):
        """Test email sending without SMTP configuration."""
        # Create service without SMTP config
        settings = Settings(
            database_url="sqlite:///:memory:",
            secret_key="test-secret-key",
            frontend_url="http://localhost:3000",
            app_mode="hosted"
        )
        
        with patch('core.email_service.settings', settings):
            service = EmailService()
            
            # Should return False for connection test
            success, error = service.test_connection()
            assert success is False
            assert "SMTP configuration is incomplete" in error


class TestEmailTemplateLoader:
    """Test cases for email template loader."""
    
    def test_template_loader_initialization(self):
        """Test template loader initialization."""
        templates = {
            'test_template': 'Hello {{ name }}!',
            'another_template': 'Goodbye {{ name }}!'
        }
        
        loader = EmailTemplateLoader(templates)
        assert loader.templates == templates
    
    def test_get_source_existing_template(self):
        """Test getting source for existing template."""
        templates = {'test_template': 'Hello {{ name }}!'}
        loader = EmailTemplateLoader(templates)
        
        source, uptodate, _ = loader.get_source(None, 'test_template')
        
        assert source == 'Hello {{ name }}!'
        assert uptodate is None
    
    def test_get_source_nonexistent_template(self):
        """Test getting source for non-existent template."""
        templates = {'test_template': 'Hello {{ name }}!'}
        loader = EmailTemplateLoader(templates)
        
        with pytest.raises(FileNotFoundError):
            loader.get_source(None, 'nonexistent_template')