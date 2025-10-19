"""
Email Service for SMTP integration and email template management.
Handles OTP emails, invitations, notifications, and SMTP connection testing.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
import smtplib
from jinja2 import Environment, BaseLoader, Template
from core.config import settings


logger = logging.getLogger(__name__)


class EmailTemplateLoader(BaseLoader):
    """Custom Jinja2 template loader for email templates."""
    
    def __init__(self, templates: Dict[str, str]):
        self.templates = templates
    
    def get_source(self, environment: Environment, template: str) -> tuple:
        if template not in self.templates:
            raise FileNotFoundError(f"Template '{template}' not found")
        
        source = self.templates[template]
        return source, None, lambda: True


class EmailService:
    """Service for SMTP email sending with template support and error handling."""
    
    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port or 587
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.email_from = settings.email_from or settings.smtp_user
        self.app_name = settings.app_name
        
        # Initialize Jinja2 environment with email templates
        self.templates = self._load_email_templates()
        self.jinja_env = Environment(loader=EmailTemplateLoader(self.templates))
        
        # Email sending configuration
        self.max_retries = 3
        self.retry_delay = 2  # seconds
        
    def _load_email_templates(self) -> Dict[str, str]:
        """Load all email templates for different notification types."""
        return {
            'bootstrap_otp': self._get_bootstrap_otp_template(),
            'password_reset_otp': self._get_password_reset_otp_template(),
            'invitation': self._get_invitation_template(),
            'password_reset_confirmation': self._get_password_reset_confirmation_template(),
            'welcome': self._get_welcome_template(),
            # Text versions
            'bootstrap_otp_text': self._get_bootstrap_otp_text_template(),
            'password_reset_otp_text': self._get_password_reset_otp_text_template(),
            'invitation_text': self._get_invitation_text_template(),
            'password_reset_confirmation_text': self._get_password_reset_confirmation_text_template(),
            'welcome_text': self._get_welcome_text_template(),
        }
    
    def test_connection(self) -> tuple[bool, Optional[str]]:
        """
        Test SMTP connection and authentication.
        
        Returns:
            Tuple of (success, error_message)
        """
        if not self._validate_smtp_config():
            return False, "SMTP configuration is incomplete. Please check SMTP_SERVER, SMTP_USER, and SMTP_PASSWORD."
        
        try:
            # Test synchronous connection for startup validation
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                logger.info("SMTP connection test successful")
                return True, None
                
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except smtplib.SMTPConnectError as e:
            error_msg = f"SMTP connection failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"SMTP test failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    async def test_connection_async(self) -> tuple[bool, Optional[str]]:
        """
        Test SMTP connection asynchronously.
        
        Returns:
            Tuple of (success, error_message)
        """
        if not self._validate_smtp_config():
            return False, "SMTP configuration is incomplete. Please check SMTP_SERVER, SMTP_USER, and SMTP_PASSWORD."
        
        try:
            async with aiosmtplib.SMTP(hostname=self.smtp_server, port=self.smtp_port) as server:
                await server.starttls()
                await server.login(self.smtp_user, self.smtp_password)
                logger.info("Async SMTP connection test successful")
                return True, None
                
        except aiosmtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except aiosmtplib.SMTPConnectError as e:
            error_msg = f"SMTP connection failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
            
        except Exception as e:
            error_msg = f"Async SMTP test failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def _validate_smtp_config(self) -> bool:
        """Validate that required SMTP configuration is present."""
        return bool(
            self.smtp_server and 
            self.smtp_user and 
            self.smtp_password and 
            self.email_from
        )
    
    async def send_otp(self, email: str, otp: str, otp_type: str, **template_vars) -> bool:
        """
        Send OTP email for various purposes.
        
        Args:
            email: Recipient email address
            otp: 6-digit OTP code
            otp_type: Type of OTP (bootstrap, password_reset, invitation)
            **template_vars: Additional variables for template rendering
            
        Returns:
            True if email sent successfully, False otherwise
        """
        template_mapping = {
            'bootstrap': 'bootstrap_otp',
            'password_reset': 'password_reset_otp',
            'forgot_password': 'password_reset_otp',
            'invitation': 'invitation'
        }
        
        template_name = template_mapping.get(otp_type, 'bootstrap_otp')
        
        subject_mapping = {
            'bootstrap': f"{self.app_name} - Admin Setup Verification",
            'password_reset': f"{self.app_name} - Password Reset Verification",
            'forgot_password': f"{self.app_name} - Password Reset Verification",
            'invitation': f"{self.app_name} - Team Invitation"
        }
        
        subject = subject_mapping.get(otp_type, f"{self.app_name} - Verification Code")
        
        template_context = {
            'otp': otp,
            'app_name': self.app_name,
            'email': email,
            'expiry_minutes': settings.otp_expiry // 60,
            **template_vars
        }
        
        return await self._send_templated_email(
            to_email=email,
            subject=subject,
            template_name=template_name,
            template_context=template_context
        )
    
    async def send_invitation(self, email: str, role: str, otp: str, inviter_name: str) -> bool:
        """
        Send team invitation email.
        
        Args:
            email: Recipient email address
            role: User role (admin, editor, viewer)
            otp: 6-digit OTP for invitation verification
            inviter_name: Name of the person sending the invitation
            
        Returns:
            True if email sent successfully, False otherwise
        """
        return await self.send_otp(
            email=email,
            otp=otp,
            otp_type='invitation',
            role=role,
            inviter_name=inviter_name
        )
    
    def send_password_reset_otp(self, email: str, otp: str) -> bool:
        """
        Send password reset OTP email synchronously.
        
        Args:
            email: Recipient email address
            otp: 6-digit OTP code
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Run async method synchronously
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self.send_otp(email, otp, 'password_reset')
            )
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Failed to send password reset OTP to {email}: {str(e)}")
            return False
    
    def send_password_reset_confirmation(self, email: str, user_name: str = None) -> bool:
        """
        Send password reset confirmation email synchronously.
        
        Args:
            email: Recipient email address
            user_name: Optional user name for personalization
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Run async method synchronously
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self.send_password_reset_confirmation_async(email, user_name)
            )
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Failed to send password reset confirmation to {email}: {str(e)}")
            return False

    async def send_password_reset_confirmation_async(self, email: str, user_name: str = None) -> bool:
        """
        Send password reset confirmation email.
        
        Args:
            email: Recipient email address
            user_name: Optional user name for personalization
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = f"{self.app_name} - Password Reset Successful"
        
        template_context = {
            'app_name': self.app_name,
            'email': email,
            'user_name': user_name or email,
            'reset_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        }
        
        return await self._send_templated_email(
            to_email=email,
            subject=subject,
            template_name='password_reset_confirmation',
            template_context=template_context
        )
    
    async def send_welcome_email(self, email: str, user_name: str, role: str) -> bool:
        """
        Send welcome email to new users.
        
        Args:
            email: Recipient email address
            user_name: User's name
            role: User's role in the system
            
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = f"Welcome to {self.app_name}!"
        
        template_context = {
            'app_name': self.app_name,
            'user_name': user_name,
            'email': email,
            'role': role.title(),
            'frontend_url': settings.frontend_url
        }
        
        return await self._send_templated_email(
            to_email=email,
            subject=subject,
            template_name='welcome',
            template_context=template_context
        )
    
    async def _send_templated_email(
        self, 
        to_email: str, 
        subject: str, 
        template_name: str, 
        template_context: Dict[str, Any]
    ) -> bool:
        """
        Send email using Jinja2 templates with HTML and text versions.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            template_name: Name of the template to use
            template_context: Variables for template rendering
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self._validate_smtp_config():
            logger.error("Cannot send email: SMTP configuration is incomplete")
            return False
        
        try:
            # Render HTML template
            html_template = self.jinja_env.get_template(template_name)
            html_content = html_template.render(**template_context)
            
            # Render text template
            text_template_name = f"{template_name}_text"
            text_template = self.jinja_env.get_template(text_template_name)
            text_content = text_template.render(**template_context)
            
            # Create multipart message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self.email_from
            message['To'] = to_email
            
            # Add text and HTML parts
            text_part = MIMEText(text_content, 'plain')
            html_part = MIMEText(html_content, 'html')
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email with retry logic
            return await self._send_email_with_retry(message, to_email)
            
        except Exception as e:
            logger.error(f"Failed to send templated email to {to_email}: {str(e)}")
            return False
    
    async def _send_email_with_retry(self, message: MIMEMultipart, to_email: str) -> bool:
        """
        Send email with retry logic and error handling.
        
        Args:
            message: Prepared email message
            to_email: Recipient email address
            
        Returns:
            True if email sent successfully, False otherwise
        """
        for attempt in range(self.max_retries):
            try:
                async with aiosmtplib.SMTP(hostname=self.smtp_server, port=self.smtp_port) as server:
                    await server.starttls()
                    await server.login(self.smtp_user, self.smtp_password)
                    await server.send_message(message)
                    
                logger.info(f"Email sent successfully to {to_email}")
                return True
                
            except Exception as e:
                logger.warning(f"Email send attempt {attempt + 1} failed to {to_email}: {str(e)}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))  # Exponential backoff
                else:
                    logger.error(f"Failed to send email to {to_email} after {self.max_retries} attempts")
        
        return False
    
    # Email template methods
    def _get_bootstrap_otp_template(self) -> str:
        """HTML template for bootstrap OTP email."""
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ app_name }} - Admin Setup</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { background: #1e40af; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 4px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ app_name }}</h1>
        <h2>Admin Setup Verification</h2>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>You are setting up the first admin account for <strong>{{ app_name }}</strong>. Please use the verification code below to complete the setup process:</p>
        
        <div class="otp-code">{{ otp }}</div>
        
        <div class="warning">
            <strong>Important:</strong> This code will expire in {{ expiry_minutes }} minutes. If you did not initiate this setup, please ignore this email.
        </div>
        
        <p>After entering this code, you will be able to:</p>
        <ul>
            <li>Set your admin password</li>
            <li>Configure two-factor authentication</li>
            <li>Access the admin dashboard</li>
            <li>Invite team members</li>
        </ul>
        
        <p>If you have any questions or need assistance, please contact your system administrator.</p>
    </div>
    <div class="footer">
        <p>This is an automated message from {{ app_name }}.</p>
    </div>
</body>
</html>
        """
    
    def _get_bootstrap_otp_text_template(self) -> str:
        """Text template for bootstrap OTP email."""
        return """
{{ app_name }} - Admin Setup Verification

Hello,

You are setting up the first admin account for {{ app_name }}. Please use the verification code below to complete the setup process:

Verification Code: {{ otp }}

IMPORTANT: This code will expire in {{ expiry_minutes }} minutes. If you did not initiate this setup, please ignore this email.

After entering this code, you will be able to:
- Set your admin password
- Configure two-factor authentication  
- Access the admin dashboard
- Invite team members

If you have any questions or need assistance, please contact your system administrator.

---
This is an automated message from {{ app_name }}.
        """
    
    def _get_password_reset_otp_template(self) -> str:
        """HTML template for password reset OTP email."""
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ app_name }} - Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { background: #b91c1c; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 4px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ app_name }}</h1>
        <h2>Password Reset Request</h2>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>We received a request to reset the password for your {{ app_name }} account ({{ email }}). Please use the verification code below to proceed:</p>
        
        <div class="otp-code">{{ otp }}</div>
        
        <div class="warning">
            <strong>Security Notice:</strong> This code will expire in {{ expiry_minutes }} minutes. If you did not request a password reset, please ignore this email and consider changing your password as a precaution.
        </div>
        
        <p>After entering this code, you will be able to set a new password for your account.</p>
        
        <p>For your security, please ensure your new password:</p>
        <ul>
            <li>Is at least 12 characters long</li>
            <li>Contains uppercase and lowercase letters</li>
            <li>Includes numbers and special characters</li>
            <li>Is not used on other accounts</li>
        </ul>
    </div>
    <div class="footer">
        <p>This is an automated message from {{ app_name }}.</p>
    </div>
</body>
</html>
        """
    
    def _get_password_reset_otp_text_template(self) -> str:
        """Text template for password reset OTP email."""
        return """
{{ app_name }} - Password Reset Request

Hello,

We received a request to reset the password for your {{ app_name }} account ({{ email }}). Please use the verification code below to proceed:

Verification Code: {{ otp }}

SECURITY NOTICE: This code will expire in {{ expiry_minutes }} minutes. If you did not request a password reset, please ignore this email and consider changing your password as a precaution.

After entering this code, you will be able to set a new password for your account.

For your security, please ensure your new password:
- Is at least 12 characters long
- Contains uppercase and lowercase letters
- Includes numbers and special characters
- Is not used on other accounts

---
This is an automated message from {{ app_name }}.
        """
    
    def _get_invitation_template(self) -> str:
        """HTML template for team invitation email."""
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ app_name }} - Team Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-code { background: #047857; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 4px; }
        .role-badge { background: #3b82f6; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; margin: 10px 0; }
        .info { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ app_name }}</h1>
        <h2>You're Invited to Join Our Team!</h2>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p><strong>{{ inviter_name }}</strong> has invited you to join <strong>{{ app_name }}</strong> as a team member.</p>
        
        <div class="info">
            <p><strong>Your Role:</strong> <span class="role-badge">{{ role|title }}</span></p>
            <p>Use the verification code below to accept this invitation and set up your account:</p>
        </div>
        
        <div class="otp-code">{{ otp }}</div>
        
        <p><strong>What happens next?</strong></p>
        <ol>
            <li>Enter the verification code above</li>
            <li>Set up your secure password</li>
            <li>Optionally enable two-factor authentication</li>
            <li>Start collaborating with your team!</li>
        </ol>
        
        <div class="info">
            <strong>Note:</strong> This invitation will expire in 24 hours. If you did not expect this invitation, you can safely ignore this email.
        </div>
        
        <p>We're excited to have you on board!</p>
    </div>
    <div class="footer">
        <p>This is an automated message from {{ app_name }}.</p>
    </div>
</body>
</html>
        """
    
    def _get_invitation_text_template(self) -> str:
        """Text template for team invitation email."""
        return """
{{ app_name }} - You're Invited to Join Our Team!

Hello,

{{ inviter_name }} has invited you to join {{ app_name }} as a team member.

Your Role: {{ role|title }}

Use the verification code below to accept this invitation and set up your account:

Verification Code: {{ otp }}

What happens next?
1. Enter the verification code above
2. Set up your secure password
3. Optionally enable two-factor authentication
4. Start collaborating with your team!

NOTE: This invitation will expire in 24 hours. If you did not expect this invitation, you can safely ignore this email.

We're excited to have you on board!

---
This is an automated message from {{ app_name }}.
        """
    
    def _get_password_reset_confirmation_template(self) -> str:
        """HTML template for password reset confirmation email."""
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ app_name }} - Password Reset Successful</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
        .security-tips { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ app_name }}</h1>
        <h2>Password Reset Successful</h2>
    </div>
    <div class="content">
        <p>Hello {{ user_name }},</p>
        
        <div class="success">
            <strong>✓ Success!</strong> Your password has been successfully reset for your {{ app_name }} account ({{ email }}).
        </div>
        
        <p><strong>Reset Details:</strong></p>
        <ul>
            <li>Account: {{ email }}</li>
            <li>Reset Time: {{ reset_time }}</li>
            <li>All existing sessions have been invalidated</li>
        </ul>
        
        <div class="security-tips">
            <strong>Security Recommendations:</strong>
            <ul>
                <li>Use a unique password that you don't use elsewhere</li>
                <li>Consider enabling two-factor authentication</li>
                <li>Keep your account information up to date</li>
                <li>Contact support if you notice any suspicious activity</li>
            </ul>
        </div>
        
        <p>You can now log in to {{ app_name }} using your new password.</p>
        
        <p>If you did not reset your password, please contact support immediately.</p>
    </div>
    <div class="footer">
        <p>This is an automated message from {{ app_name }}.</p>
    </div>
</body>
</html>
        """
    
    def _get_password_reset_confirmation_text_template(self) -> str:
        """Text template for password reset confirmation email."""
        return """
{{ app_name }} - Password Reset Successful

Hello {{ user_name }},

✓ SUCCESS! Your password has been successfully reset for your {{ app_name }} account ({{ email }}).

Reset Details:
- Account: {{ email }}
- Reset Time: {{ reset_time }}
- All existing sessions have been invalidated

Security Recommendations:
- Use a unique password that you don't use elsewhere
- Consider enabling two-factor authentication
- Keep your account information up to date
- Contact support if you notice any suspicious activity

You can now log in to {{ app_name }} using your new password.

If you did not reset your password, please contact support immediately.

---
This is an automated message from {{ app_name }}.
        """
    
    def _get_welcome_template(self) -> str:
        """HTML template for welcome email."""
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{ app_name }}!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .welcome-box { background: #ede9fe; border-left: 4px solid #7c3aed; padding: 20px; margin: 20px 0; text-align: center; }
        .role-badge { background: #3b82f6; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .cta-button { background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to {{ app_name }}!</h1>
    </div>
    <div class="content">
        <div class="welcome-box">
            <h2>🎉 Welcome, {{ user_name }}!</h2>
            <p>Your account has been successfully created.</p>
            <p><strong>Role:</strong> <span class="role-badge">{{ role }}</span></p>
        </div>
        
        <p>You now have access to {{ app_name }} and can start collaborating with your team. Here's what you can do:</p>
        
        <ul>
            <li><strong>Create and manage API collections</strong></li>
            <li><strong>Test and document APIs</strong></li>
            <li><strong>Collaborate with team members</strong></li>
            <li><strong>Organize your work with environments</strong></li>
        </ul>
        
        <div style="text-align: center;">
            <a href="{{ frontend_url }}" class="cta-button">Get Started</a>
        </div>
        
        <p><strong>Need help getting started?</strong></p>
        <ul>
            <li>Check out our documentation</li>
            <li>Contact your team admin</li>
            <li>Explore the interface and features</li>
        </ul>
        
        <p>We're excited to have you on board!</p>
    </div>
    <div class="footer">
        <p>This is an automated message from {{ app_name }}.</p>
    </div>
</body>
</html>
        """
    
    def _get_welcome_text_template(self) -> str:
        """Text template for welcome email."""
        return """
Welcome to {{ app_name }}!

🎉 Welcome, {{ user_name }}!

Your account has been successfully created.
Role: {{ role }}

You now have access to {{ app_name }} and can start collaborating with your team. Here's what you can do:

- Create and manage API collections
- Test and document APIs  
- Collaborate with team members
- Organize your work with environments

Get Started: {{ frontend_url }}

Need help getting started?
- Check out our documentation
- Contact your team admin
- Explore the interface and features

We're excited to have you on board!

---
This is an automated message from {{ app_name }}.
        """


# Global instance
email_service = EmailService()