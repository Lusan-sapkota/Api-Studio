"""
Tests for authentication middleware and configuration validation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import FastAPI, Request, HTTPException
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json

from core.middleware import AuthenticationMiddleware, get_current_user, require_auth, require_role
from core.config_validator import ConfigValidator, ConfigurationError, validate_and_log_config
from core.jwt_service import jwt_service
from db.models import User


class TestAuthenticationMiddleware:
    """Test authentication middleware functionality."""
    
    @pytest.fixture
    def app(self):
        """Create test FastAPI app."""
        app = FastAPI()
        
        @app.get("/public")
        async def public_endpoint():
            return {"message": "public"}
        
        @app.get("/protected")
        async def protected_endpoint(request: Request):
            user = get_current_user(request)
            return {"message": "protected", "user": user}
        
        @app.get("/api/admin/users")
        async def admin_endpoint(request: Request):
            user = get_current_user(request)
            return {"message": "admin", "user": user}
        
        @app.post("/api/workspaces")
        async def create_workspace(request: Request):
            user = get_current_user(request)
            return {"message": "workspace created", "user": user}
        
        @app.get("/api/workspaces")
        async def list_workspaces(request: Request):
            user = get_current_user(request)
            return {"message": "workspaces", "user": user}
        
        return app
    
    @pytest.fixture
    def local_mode_client(self):
        """Create test client with local mode middleware."""
        # Create a new app instance to avoid middleware conflicts
        local_app = FastAPI()
        
        # Add middleware first
        local_app.add_middleware(AuthenticationMiddleware, app_mode="local")
        
        @local_app.get("/public")
        async def public_endpoint():
            return {"message": "public"}
        
        @local_app.get("/protected")
        async def protected_endpoint(request: Request):
            user = get_current_user(request)
            return {"message": "protected", "user": user}
        
        @local_app.get("/api/admin/users")
        async def admin_endpoint(request: Request):
            user = get_current_user(request)
            return {"message": "admin", "user": user}
        
        return TestClient(local_app)
    
    @pytest.fixture
    def hosted_mode_client(self):
        """Create test client with hosted mode middleware."""
        # Create a new app instance to avoid middleware conflicts
        hosted_app = FastAPI()
        
        # Add middleware first
        hosted_app.add_middleware(AuthenticationMiddleware, app_mode="hosted")
        
        @hosted_app.get("/public")
        async def public_endpoint():
            return {"message": "public"}
        
        @hosted_app.get("/protected")
        async def protected_endpoint(request: Request):
            user = get_current_user(request)
            return {"message": "protected", "user": user}
        
        @hosted_app.get("/api/admin/users")
        async def admin_endpoint(request: Request):
            user = get_current_user(request)
            return {"message": "admin", "user": user}
        
        @hosted_app.post("/api/workspaces")
        async def create_workspace(request: Request):
            user = get_current_user(request)
            return {"message": "workspace created", "user": user}
        
        @hosted_app.get("/api/workspaces")
        async def list_workspaces(request: Request):
            user = get_current_user(request)
            return {"message": "workspaces", "user": user}
        
        return TestClient(hosted_app)
    
    @pytest.fixture
    def test_user(self):
        """Create test user data."""
        return {
            "user_id": 1,
            "email": "test@example.com",
            "role": "admin",
            "username": "testuser",
            "name": "Test User"
        }
    
    @pytest.fixture
    def valid_token(self, test_user):
        """Create valid JWT token."""
        return jwt_service.create_token(test_user)
    
    def test_local_mode_bypasses_authentication(self, local_mode_client):
        """Test that local mode bypasses all authentication."""
        # Public endpoint should work
        response = local_mode_client.get("/public")
        assert response.status_code == 200
        assert response.json()["message"] == "public"
        
        # Protected endpoint should work without auth
        response = local_mode_client.get("/protected")
        assert response.status_code == 200
        assert response.json()["message"] == "protected"
        assert response.json()["user"] is None
        
        # Admin endpoint should work without auth
        response = local_mode_client.get("/api/admin/users")
        assert response.status_code == 200
        assert response.json()["message"] == "admin"
    
    def test_hosted_mode_public_routes(self, hosted_mode_client):
        """Test that public routes work in hosted mode without auth."""
        response = hosted_mode_client.get("/public")
        assert response.status_code == 200
        assert response.json()["message"] == "public"
    
    def test_hosted_mode_requires_auth_for_protected_routes(self, hosted_mode_client):
        """Test that protected routes require authentication in hosted mode."""
        response = hosted_mode_client.get("/protected")
        assert response.status_code == 401
        assert "Authentication token required" in response.json()["message"]
    
    def test_hosted_mode_invalid_token(self, hosted_mode_client):
        """Test handling of invalid tokens."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = hosted_mode_client.get("/protected", headers=headers)
        assert response.status_code == 401
        assert "Token validation failed" in response.json()["message"]
    
    def test_hosted_mode_missing_bearer_scheme(self, hosted_mode_client):
        """Test handling of missing Bearer scheme."""
        headers = {"Authorization": "invalid-token"}
        response = hosted_mode_client.get("/protected", headers=headers)
        assert response.status_code == 401
        assert "Authentication token required" in response.json()["message"]
    
    @patch('core.middleware.get_session')
    @patch('api.services.user_service.UserService.get_user_by_id')
    def test_hosted_mode_valid_token(self, mock_get_user, mock_get_session, hosted_mode_client, valid_token, test_user):
        """Test successful authentication with valid token."""
        # Mock database session and user lookup
        mock_session = Mock()
        mock_get_session.return_value = [mock_session]
        
        mock_user = Mock()
        mock_user.id = test_user["user_id"]
        mock_user.email = test_user["email"]
        mock_user.role = test_user["role"]
        mock_user.username = test_user["username"]
        mock_user.name = test_user["name"]
        mock_user.status = "active"
        mock_user.locked_until = None
        
        mock_get_user.return_value = mock_user
        
        headers = {"Authorization": f"Bearer {valid_token}"}
        response = hosted_mode_client.get("/protected", headers=headers)
        
        assert response.status_code == 200
        assert response.json()["message"] == "protected"
        assert response.json()["user"]["email"] == test_user["email"]
    
    @patch('core.middleware.get_session')
    @patch('api.services.user_service.UserService.get_user_by_id')
    def test_hosted_mode_locked_user(self, mock_get_user, mock_get_session, hosted_mode_client, valid_token):
        """Test authentication with locked user account."""
        mock_session = Mock()
        mock_get_session.return_value = [mock_session]
        
        mock_user = Mock()
        mock_user.status = "active"
        mock_user.locked_until = datetime.now() + timedelta(minutes=10)
        
        mock_get_user.return_value = mock_user
        
        headers = {"Authorization": f"Bearer {valid_token}"}
        response = hosted_mode_client.get("/protected", headers=headers)
        
        assert response.status_code == 401
        assert "Account is temporarily locked" in response.json()["message"]
    
    @patch('core.middleware.get_session')
    @patch('api.services.user_service.UserService.get_user_by_id')
    def test_hosted_mode_inactive_user(self, mock_get_user, mock_get_session, hosted_mode_client, valid_token):
        """Test authentication with inactive user account."""
        mock_session = Mock()
        mock_get_session.return_value = [mock_session]
        
        mock_user = Mock()
        mock_user.status = "suspended"
        mock_user.locked_until = None
        
        mock_get_user.return_value = mock_user
        
        headers = {"Authorization": f"Bearer {valid_token}"}
        response = hosted_mode_client.get("/protected", headers=headers)
        
        assert response.status_code == 401
        assert "Account is not active" in response.json()["message"]
    
    @patch('core.middleware.get_session')
    @patch('api.services.user_service.UserService.get_user_by_id')
    def test_role_based_access_admin_route(self, mock_get_user, mock_get_session, hosted_mode_client, test_user):
        """Test admin route access control."""
        mock_session = Mock()
        mock_get_session.return_value = [mock_session]
        
        # Test admin user can access admin routes
        mock_user = Mock()
        mock_user.id = test_user["user_id"]
        mock_user.email = test_user["email"]
        mock_user.role = "admin"
        mock_user.username = test_user["username"]
        mock_user.name = test_user["name"]
        mock_user.status = "active"
        mock_user.locked_until = None
        
        mock_get_user.return_value = mock_user
        
        admin_token = jwt_service.create_token({**test_user, "role": "admin"})
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = hosted_mode_client.get("/api/admin/users", headers=headers)
        assert response.status_code == 200
        
        # Test non-admin user cannot access admin routes
        mock_user.role = "editor"
        editor_token = jwt_service.create_token({**test_user, "role": "editor"})
        headers = {"Authorization": f"Bearer {editor_token}"}
        
        response = hosted_mode_client.get("/api/admin/users", headers=headers)
        assert response.status_code == 403
        assert "Admin access required" in response.json()["message"]
    
    @patch('core.middleware.get_session')
    @patch('api.services.user_service.UserService.get_user_by_id')
    def test_role_based_access_editor_routes(self, mock_get_user, mock_get_session, hosted_mode_client, test_user):
        """Test editor route access control."""
        mock_session = Mock()
        mock_get_session.return_value = [mock_session]
        
        mock_user = Mock()
        mock_user.id = test_user["user_id"]
        mock_user.email = test_user["email"]
        mock_user.username = test_user["username"]
        mock_user.name = test_user["name"]
        mock_user.status = "active"
        mock_user.locked_until = None
        
        mock_get_user.return_value = mock_user
        
        # Test editor can create workspaces
        mock_user.role = "editor"
        editor_token = jwt_service.create_token({**test_user, "role": "editor"})
        headers = {"Authorization": f"Bearer {editor_token}"}
        
        response = hosted_mode_client.post("/api/workspaces", headers=headers)
        assert response.status_code == 200
        
        # Test viewer cannot create workspaces
        mock_user.role = "viewer"
        viewer_token = jwt_service.create_token({**test_user, "role": "viewer"})
        headers = {"Authorization": f"Bearer {viewer_token}"}
        
        response = hosted_mode_client.post("/api/workspaces", headers=headers)
        assert response.status_code == 403
        assert "Editor or admin access required" in response.json()["message"]
        
        # Test viewer can read workspaces
        response = hosted_mode_client.get("/api/workspaces", headers=headers)
        assert response.status_code == 200


class TestConfigValidator:
    """Test configuration validation functionality."""
    
    @patch('core.config_validator.settings')
    def test_validate_local_mode(self, mock_settings):
        """Test validation in local mode."""
        mock_settings.app_mode = "local"
        mock_settings.database_url = "sqlite:///test.db"
        mock_settings.frontend_url = "http://localhost:3000"
        
        result = ConfigValidator.validate_startup_config()
        
        assert result["mode"] == "local"
        assert not result["smtp_available"]
        assert len(result["warnings"]) >= 1
        assert any("Local mode: Authentication and email features disabled" in warning for warning in result["warnings"])
    
    @patch('core.config_validator.settings')
    def test_validate_hosted_mode_complete_config(self, mock_settings):
        """Test validation in hosted mode with complete configuration."""
        mock_settings.app_mode = "hosted"
        mock_settings.database_url = "sqlite:///test.db"
        mock_settings.frontend_url = "http://localhost:3000"
        mock_settings.jwt_secret = "test-jwt-secret"
        mock_settings.secret_key = "test-secret"
        mock_settings.admin_bootstrap_token = "test-bootstrap-token"
        mock_settings.smtp_server = "smtp.example.com"
        mock_settings.smtp_port = 587
        mock_settings.smtp_user = "test@example.com"
        mock_settings.smtp_password = "password"
        mock_settings.email_from = "test@example.com"
        mock_settings.max_login_attempts = 5
        mock_settings.login_lockout_duration = 900
        mock_settings.otp_expiry = 600
        mock_settings.jwt_expiry = 86400
        
        with patch('core.email_service.EmailService') as mock_email_service:
            mock_email_instance = Mock()
            mock_email_instance.test_connection.return_value = True
            mock_email_service.return_value = mock_email_instance
            
            result = ConfigValidator.validate_startup_config()
            
            assert result["mode"] == "hosted"
            assert result["smtp_available"]
            assert len(result["warnings"]) == 0
    
    @patch('core.config_validator.settings')
    def test_validate_hosted_mode_missing_jwt_secret(self, mock_settings):
        """Test validation with missing JWT secret."""
        mock_settings.app_mode = "hosted"
        mock_settings.database_url = "sqlite:///test.db"
        mock_settings.frontend_url = "http://localhost:3000"
        mock_settings.jwt_secret = None
        mock_settings.secret_key = "test-secret"
        mock_settings.admin_bootstrap_token = "test-bootstrap-token"
        mock_settings.smtp_server = None
        mock_settings.max_login_attempts = 5
        mock_settings.login_lockout_duration = 900
        mock_settings.otp_expiry = 600
        mock_settings.jwt_expiry = 86400
        
        result = ConfigValidator.validate_startup_config()
        
        assert result["mode"] == "hosted"
        assert not result["smtp_available"]
        assert any("JWT_SECRET not set" in warning for warning in result["warnings"])
    
    @patch('core.config_validator.settings')
    def test_validate_hosted_mode_missing_bootstrap_token(self, mock_settings):
        """Test validation with missing bootstrap token."""
        mock_settings.app_mode = "hosted"
        mock_settings.database_url = "sqlite:///test.db"
        mock_settings.frontend_url = "http://localhost:3000"
        mock_settings.jwt_secret = "test-jwt-secret"
        mock_settings.admin_bootstrap_token = None
        
        with pytest.raises(ConfigurationError) as exc_info:
            ConfigValidator.validate_startup_config()
        
        assert "ADMIN_BOOTSTRAP_TOKEN is required" in str(exc_info.value)
    
    @patch('core.config_validator.settings')
    def test_validate_invalid_app_mode(self, mock_settings):
        """Test validation with invalid APP_MODE."""
        mock_settings.app_mode = "invalid"
        
        with pytest.raises(ConfigurationError) as exc_info:
            ConfigValidator.validate_startup_config()
        
        assert "Invalid APP_MODE 'invalid'" in str(exc_info.value)
    
    @patch('core.config_validator.settings')
    def test_validate_missing_database_url(self, mock_settings):
        """Test validation with missing database URL."""
        mock_settings.database_url = None
        
        with pytest.raises(ConfigurationError) as exc_info:
            ConfigValidator.validate_database_config()
        
        assert "DATABASE_URL is required" in str(exc_info.value)
    
    @patch('core.config_validator.settings')
    def test_validate_missing_frontend_url(self, mock_settings):
        """Test validation with missing frontend URL."""
        mock_settings.frontend_url = None
        
        with pytest.raises(ConfigurationError) as exc_info:
            ConfigValidator.validate_cors_config()
        
        assert "FRONTEND_URL is required" in str(exc_info.value)
    
    @patch('core.config_validator.settings')
    @patch('core.config_validator.ConfigValidator.validate_database_config')
    @patch('core.config_validator.ConfigValidator.validate_cors_config')
    @patch('core.config_validator.ConfigValidator.validate_startup_config')
    def test_validate_and_log_config_success(self, mock_startup, mock_cors, mock_db, mock_settings):
        """Test successful configuration validation and logging."""
        mock_startup.return_value = {
            "mode": "hosted",
            "warnings": [],
            "smtp_available": True
        }
        
        result = validate_and_log_config()
        
        assert result["mode"] == "hosted"
        assert result["smtp_available"]
        mock_db.assert_called_once()
        mock_cors.assert_called_once()
        mock_startup.assert_called_once()
    
    @patch('core.config_validator.settings')
    @patch('core.config_validator.ConfigValidator.validate_database_config')
    def test_validate_and_log_config_failure(self, mock_db, mock_settings):
        """Test configuration validation failure."""
        mock_db.side_effect = ConfigurationError("Database error")
        
        with pytest.raises(ConfigurationError) as exc_info:
            validate_and_log_config()
        
        assert "Database error" in str(exc_info.value)


class TestHelperFunctions:
    """Test middleware helper functions."""
    
    def test_get_current_user_with_user(self):
        """Test get_current_user with authenticated user."""
        request = Mock()
        request.state.user = {"user_id": 1, "email": "test@example.com"}
        
        user = get_current_user(request)
        assert user["user_id"] == 1
        assert user["email"] == "test@example.com"
    
    def test_get_current_user_without_user(self):
        """Test get_current_user without authenticated user."""
        request = Mock()
        request.state = Mock(spec=[])  # No user attribute
        
        user = get_current_user(request)
        assert user is None
    
    def test_require_auth_with_user(self):
        """Test require_auth with authenticated user."""
        request = Mock()
        request.state.user = {"user_id": 1, "email": "test@example.com"}
        
        user = require_auth(request)
        assert user["user_id"] == 1
    
    def test_require_auth_without_user(self):
        """Test require_auth without authenticated user."""
        request = Mock()
        request.state = Mock(spec=[])
        
        with pytest.raises(HTTPException) as exc_info:
            require_auth(request)
        
        assert exc_info.value.status_code == 401
        assert "Authentication required" in exc_info.value.detail
    
    def test_require_role_with_valid_role(self):
        """Test require_role with valid user role."""
        request = Mock()
        request.state.user = {"user_id": 1, "role": "admin"}
        
        role_checker = require_role(["admin", "editor"])
        user = role_checker(request)
        assert user["role"] == "admin"
    
    def test_require_role_with_invalid_role(self):
        """Test require_role with invalid user role."""
        request = Mock()
        request.state.user = {"user_id": 1, "role": "viewer"}
        
        role_checker = require_role(["admin", "editor"])
        
        with pytest.raises(HTTPException) as exc_info:
            role_checker(request)
        
        assert exc_info.value.status_code == 403
        assert "Access denied" in exc_info.value.detail