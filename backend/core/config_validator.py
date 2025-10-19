"""
Configuration validation for dual-mode authentication system.
Validates required environment variables based on APP_MODE.
"""

import logging
from typing import List, Dict, Any
from core.config import settings
from core.email_service import EmailService

logger = logging.getLogger(__name__)


class ConfigurationError(Exception):
    """Raised when configuration validation fails."""
    pass


class ConfigValidator:
    """Validates application configuration based on mode and requirements."""
    
    @staticmethod
    def validate_startup_config() -> Dict[str, Any]:
        """
        Validate configuration on application startup.
        
        Returns:
            Dict containing validation results and any warnings
            
        Raises:
            ConfigurationError: If critical configuration is missing or invalid
        """
        validation_result = {
            "mode": settings.app_mode,
            "warnings": [],
            "smtp_available": False
        }
        
        # Validate APP_MODE
        if settings.app_mode not in ["local", "hosted"]:
            raise ConfigurationError(
                f"Invalid APP_MODE '{settings.app_mode}'. Must be 'local' or 'hosted'"
            )
        
        logger.info(f"Application starting in {settings.app_mode} mode")
        
        # Validate based on mode
        if settings.app_mode == "hosted":
            validation_result.update(ConfigValidator._validate_hosted_mode())
        else:
            validation_result.update(ConfigValidator._validate_local_mode())
        
        return validation_result
    
    @staticmethod
    def _validate_hosted_mode() -> Dict[str, Any]:
        """Validate configuration for hosted mode."""
        result = {"warnings": [], "smtp_available": False}
        
        # Check required JWT configuration
        if not settings.jwt_secret and not settings.secret_key:
            raise ConfigurationError(
                "JWT_SECRET or SECRET_KEY must be set for hosted mode"
            )
        
        if not settings.jwt_secret:
            result["warnings"].append(
                "JWT_SECRET not set, using SECRET_KEY for JWT signing"
            )
        
        # Check bootstrap token
        if not settings.admin_bootstrap_token:
            raise ConfigurationError(
                "ADMIN_BOOTSTRAP_TOKEN is required for hosted mode initial setup"
            )
        
        # Validate SMTP configuration
        smtp_config = {
            "smtp_server": settings.smtp_server,
            "smtp_port": settings.smtp_port,
            "smtp_user": settings.smtp_user,
            "smtp_password": settings.smtp_password,
            "email_from": settings.email_from
        }
        
        missing_smtp = [key for key, value in smtp_config.items() if not value]
        
        if missing_smtp:
            logger.warning(
                f"SMTP configuration incomplete. Missing: {', '.join(missing_smtp)}"
            )
            result["warnings"].append(
                f"SMTP not configured. Missing: {', '.join(missing_smtp)}. "
                "Email features will not work until SMTP is properly configured."
            )
        else:
            # Test SMTP connection
            try:
                email_service = EmailService()
                if email_service.test_connection():
                    result["smtp_available"] = True
                    logger.info("SMTP connection test successful")
                else:
                    result["warnings"].append(
                        "SMTP configuration provided but connection test failed. "
                        "Please verify SMTP settings."
                    )
            except Exception as e:
                logger.error(f"SMTP connection test failed: {str(e)}")
                result["warnings"].append(
                    f"SMTP connection test failed: {str(e)}. "
                    "Please verify SMTP settings."
                )
        
        # Validate security settings
        if settings.max_login_attempts < 1:
            result["warnings"].append(
                "MAX_LOGIN_ATTEMPTS should be at least 1"
            )
        
        if settings.login_lockout_duration < 60:
            result["warnings"].append(
                "LOGIN_LOCKOUT_DURATION should be at least 60 seconds"
            )
        
        if settings.otp_expiry < 60:
            result["warnings"].append(
                "OTP_EXPIRY should be at least 60 seconds"
            )
        
        if settings.jwt_expiry < 300:
            result["warnings"].append(
                "JWT_EXPIRY should be at least 300 seconds (5 minutes)"
            )
        
        return result
    
    @staticmethod
    def _validate_local_mode() -> Dict[str, Any]:
        """Validate configuration for local mode."""
        result = {"warnings": [], "smtp_available": False}
        
        # Check if hosted-mode settings are provided (informational)
        hosted_settings = [
            settings.admin_bootstrap_token,
            settings.smtp_server,
            settings.jwt_secret
        ]
        
        if any(hosted_settings):
            result["warnings"].append(
                "Hosted mode settings detected but running in local mode. "
                "These settings will be ignored."
            )
        
        result["warnings"].append(
            "Local mode: Authentication and email features disabled"
        )
        logger.info("Local mode: Authentication and email features disabled")
        
        return result
    
    @staticmethod
    def validate_database_config() -> None:
        """Validate database configuration."""
        if not settings.database_url:
            raise ConfigurationError("DATABASE_URL is required")
        
        logger.info(f"Database URL configured: {settings.database_url}")
    
    @staticmethod
    def validate_cors_config() -> None:
        """Validate CORS configuration."""
        if not settings.frontend_url:
            raise ConfigurationError("FRONTEND_URL is required for CORS configuration")
        
        logger.info(f"CORS configured for frontend: {settings.frontend_url}")
    
    @staticmethod
    def get_startup_summary(validation_result: Dict[str, Any]) -> str:
        """Generate a startup configuration summary."""
        mode = validation_result["mode"]
        warnings = validation_result.get("warnings", [])
        smtp_available = validation_result.get("smtp_available", False)
        
        summary = [
            f"🚀 API Studio starting in {mode.upper()} mode",
            ""
        ]
        
        if mode == "hosted":
            summary.extend([
                "📧 Email features: " + ("✅ Available" if smtp_available else "❌ Not configured"),
                "🔐 Authentication: ✅ Enabled",
                "👥 Multi-user: ✅ Enabled",
                ""
            ])
        else:
            summary.extend([
                "📧 Email features: ❌ Disabled (local mode)",
                "🔐 Authentication: ❌ Disabled (local mode)",
                "👥 Multi-user: ❌ Disabled (local mode)",
                ""
            ])
        
        if warnings:
            summary.extend([
                "⚠️  Configuration Warnings:",
                *[f"   • {warning}" for warning in warnings],
                ""
            ])
        
        summary.append("✅ Configuration validation complete")
        
        return "\n".join(summary)


def validate_and_log_config() -> Dict[str, Any]:
    """
    Validate configuration and log results.
    
    Returns:
        Validation results dictionary
        
    Raises:
        ConfigurationError: If critical configuration is invalid
    """
    try:
        # Validate core configuration
        ConfigValidator.validate_database_config()
        ConfigValidator.validate_cors_config()
        
        # Validate startup configuration
        validation_result = ConfigValidator.validate_startup_config()
        
        # Log startup summary
        summary = ConfigValidator.get_startup_summary(validation_result)
        logger.info(f"\n{summary}")
        
        return validation_result
        
    except ConfigurationError as e:
        logger.error(f"Configuration validation failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during configuration validation: {str(e)}")
        raise ConfigurationError(f"Configuration validation error: {str(e)}")