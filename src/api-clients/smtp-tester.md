# SMTP Tester

The SMTP Tester provides comprehensive email testing capabilities with HTML composition, attachment support, and delivery tracking.

## Features

- **Email Composition**: Rich HTML and plain text email creation
- **Attachment Support**: Multiple file attachments with various formats
- **Template Management**: Reusable email templates for common scenarios
- **SMTP Configuration**: Flexible SMTP server configuration and testing
- **Delivery Tracking**: Email delivery status and error reporting

## Getting Started

1. **Configure SMTP**: Set up your SMTP server settings
2. **Test Connection**: Verify SMTP connectivity
3. **Compose Email**: Create your email content
4. **Add Recipients**: Configure To, CC, and BCC recipients
5. **Send**: Deliver your email and track status

## SMTP Configuration

### Gmail Configuration
```
Host: smtp.gmail.com
Port: 587
TLS: ☑ Enabled
Username: your-email@gmail.com
Password: your-app-password
```

### Outlook/Hotmail Configuration
```
Host: smtp-mail.outlook.com
Port: 587
TLS: ☑ Enabled
Username: your-email@outlook.com
Password: your-password
```

### Custom SMTP Server
```
Host: mail.yourcompany.com
Port: 25 (or 465/587)
TLS: ☑ Enabled (recommended)
Username: your-username
Password: your-password
```

## Email Composition

### Basic Email Structure
```
From: sender@example.com
To: recipient@example.com
Subject: Test Email from API Studio
```

### HTML Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background: #4F46E5; color: white; padding: 20px; }
        .content { padding: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome!</h1>
    </div>
    <div class="content">
        <p>This is a test email from API Studio.</p>
    </div>
</body>
</html>
```

### Plain Text Content
```
Welcome!

This is a test email from API Studio.

Best regards,
Your Team
```

## Recipients Management

### Multiple Recipients
```
To: user1@example.com, user2@example.com
CC: manager@example.com
BCC: admin@example.com
```

### Dynamic Recipients
Use environment variables for dynamic recipient lists:
```
To: {{primary_recipient}}
CC: {{cc_recipients}}
```

## Attachments

### Supported File Types
- Documents: PDF, DOC, DOCX, TXT
- Images: JPG, PNG, GIF, SVG
- Archives: ZIP, RAR, TAR
- Data: CSV, JSON, XML

### Adding Attachments
1. Click "Add Files" button
2. Select one or more files
3. Files will be listed with size information
4. Remove unwanted attachments if needed

### Attachment Limits
- Maximum file size: 25MB per attachment
- Maximum total size: 50MB per email
- File count limit: 20 attachments per email

## Email Templates

### Welcome Email Template
```html
<!DOCTYPE html>
<html>
<head>
    <title>Welcome</title>
</head>
<body>
    <h1>Welcome to Our Service!</h1>
    <p>Thank you for joining us.</p>
    <a href="#" style="background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none;">Get Started</a>
</body>
</html>
```

### Password Reset Template
```html
<!DOCTYPE html>
<html>
<head>
    <title>Password Reset</title>
</head>
<body>
    <h1>Password Reset Request</h1>
    <p>Click the link below to reset your password:</p>
    <a href="#reset-link">Reset Password</a>
    <p><small>This link expires in 24 hours.</small></p>
</body>
</html>
```

### Notification Template
```html
<!DOCTYPE html>
<html>
<head>
    <title>Notification</title>
</head>
<body>
    <div style="border-left: 4px solid #3B82F6; padding: 15px;">
        <h3>New Notification</h3>
        <p>You have a new notification from our system.</p>
    </div>
</body>
</html>
```

## Delivery Status

### Success Response
```json
{
  "status": "sent",
  "message": "Email sent successfully",
  "message_id": "<12345@api-studio.local>",
  "recipients": ["user@example.com"],
  "timestamp": "2024-01-15T10:30:00Z",
  "response_time": 1250
}
```

### Error Response
```json
{
  "status": "failed",
  "message": "SMTP authentication failed",
  "error": "Invalid credentials",
  "timestamp": "2024-01-15T10:30:00Z",
  "response_time": 500
}
```

## Testing Features

### Connection Test
Before sending emails, test your SMTP configuration:
1. Click "Test Connection"
2. Verify authentication and server connectivity
3. Check TLS/SSL configuration
4. Confirm port accessibility

### Send Test Email
Send a simple test email to verify everything works:
1. Click "Send Test Email"
2. Enter a test recipient
3. A predefined test email will be sent
4. Check delivery status and logs

## Email Validation

### Content Validation
- HTML syntax checking
- CSS compatibility warnings
- Image and link validation
- Accessibility recommendations

### Recipient Validation
- Email format verification
- Domain existence checking
- Bounce risk assessment
- Spam filter compatibility

## Advanced Features

### Bulk Email Testing
- Send to multiple recipients
- Template variable substitution
- Delivery status tracking
- Performance metrics

### Email Analytics
- Open rate tracking (when supported)
- Click-through rate monitoring
- Bounce rate analysis
- Delivery time metrics

## Troubleshooting

### Common SMTP Issues

#### Authentication Failed
- Verify username and password
- Check if 2FA is enabled (use app passwords)
- Ensure SMTP access is enabled
- Try different authentication methods

#### Connection Timeout
- Check server hostname and port
- Verify network connectivity
- Test firewall settings
- Try different ports (25, 465, 587)

#### TLS/SSL Issues
- Enable/disable TLS based on server requirements
- Check certificate validity
- Try different encryption methods
- Verify server TLS support

### Email Delivery Issues

#### Emails Not Received
- Check spam/junk folders
- Verify recipient email addresses
- Check sender reputation
- Review email content for spam triggers

#### Formatting Problems
- Test HTML compatibility
- Check CSS support in email clients
- Validate image links and attachments
- Test with different email clients

## Best Practices

### Email Content
- Keep HTML simple and compatible
- Always include plain text version
- Optimize images for email
- Use inline CSS for better compatibility

### SMTP Configuration
- Use secure connections (TLS/SSL)
- Implement proper authentication
- Monitor delivery rates
- Set up proper SPF/DKIM records

### Testing Strategy
- Test with multiple email clients
- Verify mobile compatibility
- Check spam filter behavior
- Monitor delivery metrics