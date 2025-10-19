"""
Authentication middleware for dual-mode operation.
Handles mode detection and JWT validation for hosted mode.
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import List, Optional
import logging
from datetime import datetime

from core.config import settings
from core.jwt_service import jwt_service, JWTError
from db.session import get_session
from api.services.user_service import UserService
from api.services.bootstrap_service import bootstrap_service

logger = logging.getLogger(__name__)


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Mode-aware authentication middleware that:
    - Skips authentication entirely in local mode
    - Enforces JWT validation and role-based access in hosted mode
    """
    
    def __init__(self, app, app_mode: str = None):
        super().__init__(app)
        self.app_mode = app_mode or settings.app_mode
        
        # Routes that don't require authentication even in hosted mode
        self.public_routes = [
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/public",
            "/api/health",
            "/api/system-status",
            "/api/bootstrap",
            "/api/bootstrap/verify-otp",
            "/api/auth/login",
            "/api/auth/forgot-password",
            "/api/auth/forgot-password/verify-otp",
            "/api/auth/reset-password",
            "/api/auth/verify-invitation",
            "/api/auth/collaborator/set-password",
            "/api/auth/first-time-password",
            "/api/auth/verify-2fa-setup",
        ]
        
        # Routes that are allowed during system lock (bootstrap process)
        self.bootstrap_routes = [
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/health",
            "/api/system-status",
            "/api/bootstrap",
            "/api/bootstrap/verify-otp",
            "/api/auth/first-time-password",
            "/api/auth/verify-2fa-setup",
        ]
        
        # Routes that require admin role
        self.admin_routes = [
            "/api/admin/",
        ]
        
        # Routes that require editor or admin role for write operations
        self.editor_write_routes = [
            "/api/workspaces",
            "/api/collections", 
            "/api/environments",
            "/api/requests",
            "/api/notes",
            "/api/tasks",
        ]
        
        # Routes that all authenticated users can read
        self.read_routes = [
            "/api/workspaces",
            "/api/collections",
            "/api/environments", 
            "/api/requests",
            "/api/notes",
            "/api/tasks",
            "/api/docs",
        ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Main middleware dispatch method."""
        
        # Skip authentication in local mode
        if self.app_mode == "local":
            logger.debug("Local mode: Skipping authentication")
            return await call_next(request)
        
        # Hosted mode: Apply authentication
        try:
            await self._authenticate_request(request)
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "success": False,
                    "error": "AUTHENTICATION_ERROR",
                    "message": e.detail,
                    "timestamp": datetime.now().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Authentication middleware error: {str(e)}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": "INTERNAL_ERROR",
                    "message": "Authentication system error",
                    "timestamp": datetime.now().isoformat()
                }
            )
    
    async def _authenticate_request(self, request: Request) -> None:
        """Authenticate request in hosted mode."""
        
        path = request.url.path
        method = request.method
        
        # Check if system is locked (no admin users exist)
        for session in get_session():
            is_locked = bootstrap_service.is_system_locked(session)
            break
        
        if is_locked:
            # System is locked - only allow bootstrap routes
            if not self._is_bootstrap_route(path):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="System is locked. Please complete the bootstrap process to set up the first admin user."
                )
            logger.debug(f"System locked - allowing bootstrap route: {path}")
            return
        
        # Skip authentication for public routes
        if self._is_public_route(path):
            logger.debug(f"Public route: {path}")
            return
        
        # Extract and validate JWT token
        token = self._extract_token(request)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required"
            )
        
        # Validate token and get user info
        user_data = await self._validate_token(token)
        
        # Check role-based permissions
        await self._check_permissions(path, method, user_data)
        
        # Add user data to request state for use in route handlers
        request.state.user = user_data
    
    def _is_public_route(self, path: str) -> bool:
        """Check if route is public and doesn't require authentication."""
        return any(path == route or path.startswith(route + "/") for route in self.public_routes)
    
    def _is_bootstrap_route(self, path: str) -> bool:
        """Check if route is allowed during system lock (bootstrap process)."""
        return any(path == route or path.startswith(route + "/") for route in self.bootstrap_routes)
    
    def _extract_token(self, request: Request) -> Optional[str]:
        """Extract JWT token from Authorization header."""
        authorization = request.headers.get("Authorization")
        if not authorization:
            return None
        
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                return None
            return token
        except ValueError:
            return None
    
    async def _validate_token(self, token: str) -> dict:
        """Validate JWT token and return user data."""
        try:
            # Decode and validate token
            payload = jwt_service.verify_token(token)
            
            # Ensure it's a session token
            if payload.get("type") != "session":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Get user ID from token
            user_id = payload.get("user_id")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
            
            # Verify user still exists and is active
            for session in get_session():
                user = UserService.get_user_by_id(session, user_id)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found"
                    )
                
                if user.status != "active":
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Account is not active"
                    )
                
                # Check if account is locked
                if user.locked_until and user.locked_until > datetime.now():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Account is temporarily locked"
                    )
                
                return {
                    "user_id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "username": user.username,
                    "name": user.name
                }
                
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed: {str(e)}"
            )
    
    async def _check_permissions(self, path: str, method: str, user_data: dict) -> None:
        """Check role-based permissions for the requested route."""
        
        user_role = user_data.get("role", "viewer")
        
        # Check admin-only routes
        if any(path.startswith(route) for route in self.admin_routes):
            if user_role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
            return
        
        # Check write operations on editor routes
        if any(path.startswith(route) for route in self.editor_write_routes):
            if method in ["POST", "PUT", "PATCH", "DELETE"]:
                if user_role not in ["admin", "editor"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Editor or admin access required for write operations"
                    )
            return
        
        # Check read operations - all authenticated users can read
        if any(path.startswith(route) for route in self.read_routes):
            if method in ["GET", "HEAD", "OPTIONS"]:
                # All authenticated users can read
                return
        
        # All other protected routes allow any authenticated user
        logger.debug(f"Access granted for {user_role} to {path}")


def get_current_user(request: Request) -> Optional[dict]:
    """
    Helper function to get current user from request state.
    Returns None if no user is authenticated (local mode or unauthenticated).
    """
    return getattr(request.state, 'user', None)


def require_auth(request: Request) -> dict:
    """
    Helper function that requires authentication.
    Raises HTTPException if no user is authenticated.
    """
    user = get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user


def require_role(required_roles: List[str]):
    """
    Decorator factory for requiring specific roles.
    
    Args:
        required_roles: List of roles that can access the endpoint
    
    Returns:
        Dependency function for FastAPI
    """
    def role_checker(request: Request) -> dict:
        user = require_auth(request)
        if user["role"] not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}"
            )
        return user
    
    return role_checker


# Convenience role checkers
require_admin = require_role(["admin"])
require_editor = require_role(["admin", "editor"])
require_any_role = require_role(["admin", "editor", "viewer"])