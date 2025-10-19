# API Studio Backend Setup Guide

This guide will help you set up the API Studio backend for either local development or hosted deployment.

## Quick Start

### Local Mode (Single User, No Authentication)

Perfect for personal use and development:

```bash
# 1. Copy the local configuration template
cp .env.local.example .env

# 2. Edit .env if needed (optional)
# The defaults work for most local development

# 3. Start the application
python start.py
```

Your API Studio will be available at `http://localhost:58123` with no authentication required.

### Hosted Mode (Multi-User with Authentication)

For team collaboration and production deployments:

```bash
# 1. Copy the hosted configuration template
cp .env.hosted.example .env

# 2. Configure your environment (see detailed setup below)
# Edit .env with your SMTP settings and security tokens

# 3. Start the application
python start.py

# 4. Complete the bootstrap process (see Bootstrap Setup below)
```

## Detailed Configuration

### Environment Variables

| Variable | Required | Mode | Description |
|----------|----------|------|-------------|
| `APP_MODE` | Yes | Both | Set to `local` or `hosted` |
| `DATABASE_URL` | Yes | Both | SQLite database path |
| `SECRET_KEY` | Yes | Both | Application secret key (min 32 chars) |
| `FRONTEND_URL` | Yes | Both | Frontend URL for CORS |
| `JWT_SECRET` | Yes | Hosted | JWT signing secret (different from SECRET_KEY) |
| `SMTP_SERVER` | Yes | Hosted | SMTP server hostname |
| `SMTP_PORT` | Yes | Hosted | SMTP server port |
| `SMTP_USER` | Yes | Hosted | SMTP username |
| `SMTP_PASSWORD` | Yes | Hosted | SMTP password |
| `EMAIL_FROM` | Yes | Hosted | From email address |
| `ADMIN_BOOTSTRAP_TOKEN` | Yes | Hosted | Secure token for initial setup |
| `ADMIN_USERNAME` | No | Local | Default admin username |
| `ADMIN_PASSWORD` | No | Local | Default admin password |

### SMTP Configuration

#### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "API Studio"
3. **Configure in .env**:
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

#### SendGrid Setup

1. **Create SendGrid Account** and verify your domain
2. **Create API Key** with mail sending permissions
3. **Configure in .env**:
   ```env
   SMTP_SERVER=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@your-domain.com
   ```

#### Mailgun Setup

1. **Create Mailgun Account** and add your domain
2. **Get SMTP credentials** from Mailgun dashboard
3. **Configure in .env**:
   ```env
   SMTP_SERVER=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASSWORD=your-mailgun-password
   EMAIL_FROM=noreply@your-domain.com
   ```

#### Custom SMTP Server

For other email providers, use their SMTP settings:

```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@your-domain.com
```

### Security Configuration

#### Generating Secure Tokens

Use these commands to generate secure tokens:

```bash
# For SECRET_KEY and JWT_SECRET
openssl rand -hex 32

# For ADMIN_BOOTSTRAP_TOKEN
openssl rand -hex 32
```

#### Security Best Practices

- **Use different values** for `SECRET_KEY` and `JWT_SECRET`
- **Minimum 32 characters** for all secret keys
- **Rotate tokens regularly** in production
- **Use HTTPS** for production deployments
- **Keep bootstrap token secure** and change after initial setup

## Bootstrap Setup (Hosted Mode Only)

After starting the application in hosted mode, you need to create the first admin user:

### Step 1: Access Bootstrap Endpoint

The system will be locked until you complete bootstrap. Only the bootstrap endpoint will be accessible.

### Step 2: Initiate Bootstrap

Send a POST request to `/api/bootstrap` with:

```json
{
  "token": "your-admin-bootstrap-token",
  "email": "admin@your-domain.com"
}
```

### Step 3: Verify Email

Check your email for a 6-digit OTP code and verify it at `/api/bootstrap/verify-otp`:

```json
{
  "email": "admin@your-domain.com",
  "otp": "123456"
}
```

### Step 4: Set Password

Use the temporary token to set your password at `/api/auth/first-time-password`:

```json
{
  "password": "your-secure-password"
}
```

### Step 5: Setup 2FA

Complete 2FA setup at `/api/auth/verify-2fa-setup` with your authenticator app.

## Database Management

### Migrations

Database migrations run automatically on startup. To run manually:

```bash
python -m db.migrate
```

### Health Checks

Check system status:

```bash
# Basic health check
curl http://localhost:58123/api/health

# Detailed system status
curl http://localhost:58123/api/system-status
```

## Troubleshooting

### Common Issues

#### SMTP Connection Failed

**Problem**: Bootstrap fails with SMTP connection error

**Solutions**:
- Verify SMTP credentials are correct
- Check if your email provider requires app passwords
- Ensure firewall allows outbound connections on SMTP port
- Test SMTP settings with a simple email client

#### System Locked

**Problem**: All endpoints return "System is locked" error

**Solutions**:
- Complete the bootstrap process to create first admin user
- Check that `ADMIN_BOOTSTRAP_TOKEN` is set correctly
- Verify email configuration is working

#### JWT Token Errors

**Problem**: Authentication fails with token errors

**Solutions**:
- Ensure `JWT_SECRET` is set and different from `SECRET_KEY`
- Check token hasn't expired (default 24 hours)
- Verify system clock is correct

#### Database Errors

**Problem**: Database connection or migration failures

**Solutions**:
- Check `DATABASE_URL` path is writable
- Ensure SQLite is installed
- Run migrations manually: `python -m db.migrate`

### Configuration Validation

The application validates configuration on startup and provides detailed error messages. Check the logs for specific configuration issues.

### Logs

Application logs provide detailed information about:
- Configuration validation
- Authentication attempts
- SMTP connection status
- Database operations
- Security events

## Development

### Local Development Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Use local mode configuration
cp .env.local.example .env

# 3. Start with auto-reload
python start.py
```

### Testing SMTP Configuration

Test your SMTP setup before deploying:

```python
from core.email_service import EmailService
from core.config import settings

# Test SMTP connection
email_service = EmailService()
if email_service.test_connection():
    print("SMTP configuration is working!")
else:
    print("SMTP configuration failed!")
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords and tokens
- [ ] Use strong, unique `SECRET_KEY` and `JWT_SECRET` (min 32 characters)
- [ ] Set `RELOAD=false` in production
- [ ] Use HTTPS for `FRONTEND_URL`
- [ ] Configure proper SMTP with your domain
- [ ] Set strong `ADMIN_BOOTSTRAP_TOKEN` and keep it secure
- [ ] Consider using environment-specific secrets management
- [ ] Regularly rotate secrets and tokens
- [ ] Enable proper logging and monitoring
- [ ] Set up database backups
- [ ] Configure reverse proxy (nginx/Apache)

### Environment Variables in Production

Consider using:
- Docker secrets
- Kubernetes secrets
- Cloud provider secret managers (AWS Secrets Manager, Azure Key Vault, etc.)
- Environment variable injection tools

### Monitoring

Monitor these endpoints for health:
- `/api/health` - Basic health check
- `/api/system-status` - Detailed system information

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review application logs for detailed error messages
3. Verify configuration against the examples provided
4. Test SMTP configuration separately if email features aren't working

The application provides detailed error messages and configuration validation to help identify and resolve issues quickly.