from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
from datetime import datetime
import asyncio

router = APIRouter(prefix="/api/smtp", tags=["smtp"])

class SMTPConfig(BaseModel):
    host: str
    port: int
    use_tls: bool = True
    username: str
    password: str

class EmailAttachment(BaseModel):
    filename: str
    content: str  # base64 encoded
    content_type: str

class EmailRequest(BaseModel):
    smtp_config: SMTPConfig
    from_email: EmailStr
    to_emails: List[EmailStr]
    cc_emails: Optional[List[EmailStr]] = []
    bcc_emails: Optional[List[EmailStr]] = []
    subject: str
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    attachments: Optional[List[EmailAttachment]] = []

class EmailResponse(BaseModel):
    status: str
    message: str
    message_id: Optional[str] = None
    recipients: List[str]
    timestamp: str
    response_time: float

class SMTPTestRequest(BaseModel):
    smtp_config: SMTPConfig

@router.post("/test-connection")
async def test_smtp_connection(request: SMTPTestRequest):
    """Test SMTP server connection"""
    try:
        start_time = datetime.now()
        
        # Create SMTP connection
        if request.smtp_config.use_tls:
            server = smtplib.SMTP(request.smtp_config.host, request.smtp_config.port)
            server.starttls(context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(request.smtp_config.host, request.smtp_config.port)
        
        # Test authentication
        server.login(request.smtp_config.username, request.smtp_config.password)
        
        # Close connection
        server.quit()
        
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        return {
            "status": "success",
            "message": "SMTP connection successful",
            "host": request.smtp_config.host,
            "port": request.smtp_config.port,
            "tls": request.smtp_config.use_tls,
            "response_time": response_time
        }
        
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="SMTP authentication failed")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail="Failed to connect to SMTP server")
    except smtplib.SMTPServerDisconnected:
        raise HTTPException(status_code=400, detail="SMTP server disconnected")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP connection error: {str(e)}")

@router.post("/send", response_model=EmailResponse)
async def send_email(request: EmailRequest):
    """Send an email via SMTP"""
    try:
        start_time = datetime.now()
        
        # Validate email content
        if not request.html_content and not request.text_content:
            raise HTTPException(status_code=400, detail="Either html_content or text_content must be provided")
        
        # Create message
        message = MIMEMultipart('alternative')
        message['From'] = request.from_email
        message['To'] = ', '.join(request.to_emails)
        message['Subject'] = request.subject
        
        if request.cc_emails:
            message['Cc'] = ', '.join(request.cc_emails)
        
        # Add text content
        if request.text_content:
            text_part = MIMEText(request.text_content, 'plain', 'utf-8')
            message.attach(text_part)
        
        # Add HTML content
        if request.html_content:
            html_part = MIMEText(request.html_content, 'html', 'utf-8')
            message.attach(html_part)
        
        # Add attachments
        if request.attachments:
            for attachment in request.attachments:
                try:
                    # Decode base64 content
                    file_data = base64.b64decode(attachment.content)
                    
                    # Create attachment
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(file_data)
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment.filename}'
                    )
                    message.attach(part)
                    
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid attachment '{attachment.filename}': {str(e)}")
        
        # Prepare recipient list
        all_recipients = request.to_emails + (request.cc_emails or []) + (request.bcc_emails or [])
        
        # Connect to SMTP server and send
        if request.smtp_config.use_tls:
            server = smtplib.SMTP(request.smtp_config.host, request.smtp_config.port)
            server.starttls(context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(request.smtp_config.host, request.smtp_config.port)
        
        server.login(request.smtp_config.username, request.smtp_config.password)
        
        # Send email
        text = message.as_string()
        server.sendmail(request.from_email, all_recipients, text)
        server.quit()
        
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        # Generate mock message ID
        message_id = f"<{int(datetime.now().timestamp())}.{hash(request.subject)}@api-studio.local>"
        
        return EmailResponse(
            status="sent",
            message="Email sent successfully",
            message_id=message_id,
            recipients=all_recipients,
            timestamp=datetime.now().isoformat(),
            response_time=response_time
        )
        
    except smtplib.SMTPRecipientsRefused as e:
        raise HTTPException(status_code=400, detail=f"Recipients refused: {str(e)}")
    except smtplib.SMTPSenderRefused as e:
        raise HTTPException(status_code=400, detail=f"Sender refused: {str(e)}")
    except smtplib.SMTPDataError as e:
        raise HTTPException(status_code=400, detail=f"SMTP data error: {str(e)}")
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="SMTP authentication failed")
    except Exception as e:
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        return EmailResponse(
            status="failed",
            message=f"Email sending failed: {str(e)}",
            recipients=all_recipients,
            timestamp=datetime.now().isoformat(),
            response_time=response_time
        )

@router.post("/send-test")
async def send_test_email(smtp_config: SMTPConfig, to_email: EmailStr):
    """Send a test email to verify SMTP configuration"""
    try:
        test_request = EmailRequest(
            smtp_config=smtp_config,
            from_email=smtp_config.username,
            to_emails=[to_email],
            subject="SMTP Test Email - API Studio",
            html_content="""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>SMTP Test</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #4F46E5;">SMTP Test Successful!</h1>
                    <p>This is a test email sent from API Studio SMTP Tester.</p>
                    <p>If you received this email, your SMTP configuration is working correctly.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        Sent at: {timestamp}<br>
                        From: API Studio SMTP Tester
                    </p>
                </div>
            </body>
            </html>
            """.format(timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")),
            text_content=f"""
SMTP Test Successful!

This is a test email sent from API Studio SMTP Tester.
If you received this email, your SMTP configuration is working correctly.

Sent at: {datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
From: API Studio SMTP Tester
            """
        )
        
        return await send_email(test_request)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test email failed: {str(e)}")

@router.get("/templates")
async def get_email_templates():
    """Get predefined email templates"""
    return {
        "templates": [
            {
                "id": "welcome",
                "name": "Welcome Email",
                "subject": "Welcome to our service!",
                "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome!</h1>
        </div>
        <div class="content">
            <p>Thank you for joining our service. We're excited to have you on board!</p>
            <p>To get started, please click the button below:</p>
            <p><a href="#" class="button">Get Started</a></p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
    </div>
</body>
</html>
                """,
                "text_content": "Welcome!\n\nThank you for joining our service. We're excited to have you on board!\n\nTo get started, please visit our website.\n\nIf you have any questions, feel free to reach out to our support team."
            },
            {
                "id": "password_reset",
                "name": "Password Reset",
                "subject": "Reset your password",
                "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { padding: 20px; }
        .button { background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your password. If you made this request, click the button below:</p>
            <p><a href="#" class="button">Reset Password</a></p>
            <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 24 hours. If you didn't request this reset, please ignore this email.
            </div>
        </div>
    </div>
</body>
</html>
                """,
                "text_content": "Password Reset Request\n\nWe received a request to reset your password. If you made this request, please use the following link:\n\n[Reset Password Link]\n\nSecurity Notice: This link will expire in 24 hours. If you didn't request this reset, please ignore this email."
            },
            {
                "id": "notification",
                "name": "Notification Email",
                "subject": "You have a new notification",
                "html_content": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .notification { background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>New Notification</h1>
        <div class="notification">
            <h3>Notification Title</h3>
            <p>This is your notification message. You can customize this content based on your needs.</p>
        </div>
        <p>Thank you for using our service!</p>
    </div>
</body>
</html>
                """,
                "text_content": "New Notification\n\nNotification Title\nThis is your notification message. You can customize this content based on your needs.\n\nThank you for using our service!"
            }
        ]
    }

@router.post("/validate-email")
async def validate_email_content(html_content: str, text_content: Optional[str] = None):
    """Validate email content for common issues"""
    issues = []
    suggestions = []
    
    # Check HTML content
    if html_content:
        if '<html>' not in html_content.lower():
            suggestions.append("Consider adding proper HTML structure with <html>, <head>, and <body> tags")
        
        if 'charset=utf-8' not in html_content.lower():
            suggestions.append("Add charset=UTF-8 meta tag for proper character encoding")
        
        if '<title>' not in html_content.lower():
            suggestions.append("Add a <title> tag for better email client compatibility")
        
        # Check for inline styles (recommended for email)
        if '<style>' in html_content.lower() and 'style=' not in html_content.lower():
            suggestions.append("Consider using inline styles for better email client compatibility")
    
    # Check text content
    if not text_content and html_content:
        suggestions.append("Consider adding a text version for better accessibility and spam filter compatibility")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "suggestions": suggestions,
        "html_length": len(html_content) if html_content else 0,
        "text_length": len(text_content) if text_content else 0
    }