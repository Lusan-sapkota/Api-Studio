"""
Role-Based Access Control (RBAC) system for API Studio.
Provides decorators, permission checking, and resource access control.
"""

from functools import wraps
from typing import List, Optional, Dict, Any, Callable
from fastapi import HTTPException, Request, Depends
from sqlmodel import Session
from enum import Enum

from core.config import settings
from core.middleware import get_current_user, require_auth
from db.models import User, Workspace, Collection, Request as APIRequest
from db.session import get_session


class Role(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class Permission(str, Enum):
    """System permissions."""
    # User management
    MANAGE_USERS = "manage_users"
    INVITE_USERS = "invite_users"
    VIEW_USERS = "view_users"
    
    # Workspace permissions
    CREATE_WORKSPACE = "create_workspace"
    VIEW_WORKSPACE = "view_workspace"
    EDIT_WORKSPACE = "edit_workspace"
    DELETE_WORKSPACE = "delete_workspace"
    
    # Collection permissions
    CREATE_COLLECTION = "create_collection"
    VIEW_COLLECTION = "view_collection"
    EDIT_COLLECTION = "edit_collection"
    DELETE_COLLECTION = "delete_collection"
    
    # Request permissions
    CREATE_REQUEST = "create_request"
    VIEW_REQUEST = "view_request"
    EDIT_REQUEST = "edit_request"
    DELETE_REQUEST = "delete_request"
    SEND_REQUEST = "send_request"
    
    # Environment permissions
    CREATE_ENVIRONMENT = "create_environment"
    VIEW_ENVIRONMENT = "view_environment"
    EDIT_ENVIRONMENT = "edit_environment"
    DELETE_ENVIRONMENT = "delete_environment"
    
    # System permissions
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_SYSTEM = "manage_system"


# Role-Permission mapping
ROLE_PERMISSIONS: Dict[Role, List[Permission]] = {
    Role.ADMIN: [
        # All permissions for admin
        Permission.MANAGE_USERS,
        Permission.INVITE_USERS,
        Permission.VIEW_USERS,
        Permission.CREATE_WORKSPACE,
        Permission.VIEW_WORKSPACE,
        Permission.EDIT_WORKSPACE,
        Permission.DELETE_WORKSPACE,
        Permission.CREATE_COLLECTION,
        Permission.VIEW_COLLECTION,
        Permission.EDIT_COLLECTION,
        Permission.DELETE_COLLECTION,
        Permission.CREATE_REQUEST,
        Permission.VIEW_REQUEST,
        Permission.EDIT_REQUEST,
        Permission.DELETE_REQUEST,
        Permission.SEND_REQUEST,
        Permission.CREATE_ENVIRONMENT,
        Permission.VIEW_ENVIRONMENT,
        Permission.EDIT_ENVIRONMENT,
        Permission.DELETE_ENVIRONMENT,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_SYSTEM,
    ],
    Role.EDITOR: [
        # Editor can create, view, edit, and delete content but not manage users
        Permission.CREATE_WORKSPACE,
        Permission.VIEW_WORKSPACE,
        Permission.EDIT_WORKSPACE,
        Permission.DELETE_WORKSPACE,
        Permission.CREATE_COLLECTION,
        Permission.VIEW_COLLECTION,
        Permission.EDIT_COLLECTION,
        Permission.DELETE_COLLECTION,
        Permission.CREATE_REQUEST,
        Permission.VIEW_REQUEST,
        Permission.EDIT_REQUEST,
        Permission.DELETE_REQUEST,
        Permission.SEND_REQUEST,
        Permission.CREATE_ENVIRONMENT,
        Permission.VIEW_ENVIRONMENT,
        Permission.EDIT_ENVIRONMENT,
        Permission.DELETE_ENVIRONMENT,
    ],
    Role.VIEWER: [
        # Viewer can only view content and send requests
        Permission.VIEW_WORKSPACE,
        Permission.VIEW_COLLECTION,
        Permission.VIEW_REQUEST,
        Permission.SEND_REQUEST,
        Permission.VIEW_ENVIRONMENT,
    ]
}


class RBACService:
    """Service for role-based access control operations."""
    
    @staticmethod
    def has_permission(user_role: str, permission: Permission) -> bool:
        """
        Check if a user role has a specific permission.
        
        Args:
            user_role: User's role (admin, editor, viewer)
            permission: Permission to check
            
        Returns:
            True if user has permission, False otherwise
        """
        # Import here to avoid circular imports during testing
        from core.config import settings
        
        if settings.app_mode == "local":
            return True  # Local mode has no restrictions
        
        try:
            role = Role(user_role)
            return permission in ROLE_PERMISSIONS.get(role, [])
        except ValueError:
            return False
    
    @staticmethod
    def has_any_permission(user_role: str, permissions: List[Permission]) -> bool:
        """
        Check if a user role has any of the specified permissions.
        
        Args:
            user_role: User's role
            permissions: List of permissions to check
            
        Returns:
            True if user has at least one permission, False otherwise
        """
        return any(RBACService.has_permission(user_role, perm) for perm in permissions)
    
    @staticmethod
    def can_access_workspace(user: dict, workspace_id: int, session: Session, permission: Permission) -> bool:
        """
        Check if user can access a specific workspace with given permission.
        
        Args:
            user: User data from JWT token
            workspace_id: ID of the workspace
            session: Database session
            permission: Required permission
            
        Returns:
            True if user can access workspace, False otherwise
        """
        # Import here to avoid circular imports during testing
        from core.config import settings
        
        if settings.app_mode == "local":
            return True
        
        # Check if user has the required permission
        if not RBACService.has_permission(user["role"], permission):
            return False
        
        # Get workspace
        workspace = session.get(Workspace, workspace_id)
        if not workspace:
            return False
        
        # Admin can access all workspaces
        if user["role"] == Role.ADMIN:
            return True
        
        # Owner can access their own workspace
        if workspace.owner_id == user["user_id"]:
            return True
        
        # For now, only owners can access workspaces
        # TODO: Implement workspace sharing/collaboration
        return False
    
    @staticmethod
    def can_access_collection(user: dict, collection_id: int, session: Session, permission: Permission) -> bool:
        """
        Check if user can access a specific collection with given permission.
        
        Args:
            user: User data from JWT token
            collection_id: ID of the collection
            session: Database session
            permission: Required permission
            
        Returns:
            True if user can access collection, False otherwise
        """
        # Import here to avoid circular imports during testing
        from core.config import settings
        
        if settings.app_mode == "local":
            return True
        
        # Check if user has the required permission
        if not RBACService.has_permission(user["role"], permission):
            return False
        
        # Get collection and its workspace
        collection = session.get(Collection, collection_id)
        if not collection:
            return False
        
        # Check workspace access
        return RBACService.can_access_workspace(user, collection.workspace_id, session, permission)
    
    @staticmethod
    def can_access_request(user: dict, request_id: int, session: Session, permission: Permission) -> bool:
        """
        Check if user can access a specific request with given permission.
        
        Args:
            user: User data from JWT token
            request_id: ID of the request
            session: Database session
            permission: Required permission
            
        Returns:
            True if user can access request, False otherwise
        """
        # Import here to avoid circular imports during testing
        from core.config import settings
        
        if settings.app_mode == "local":
            return True
        
        # Check if user has the required permission
        if not RBACService.has_permission(user["role"], permission):
            return False
        
        # Get request and its collection
        request = session.get(APIRequest, request_id)
        if not request:
            return False
        
        # Check collection access
        return RBACService.can_access_collection(user, request.collection_id, session, permission)


def require_permission(permission: Permission):
    """
    Decorator factory for requiring specific permissions.
    
    Args:
        permission: Required permission
        
    Returns:
        Dependency function for FastAPI
    """
    def permission_checker(request: Request) -> dict:
        user = require_auth(request)
        
        if not RBACService.has_permission(user["role"], permission):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required permission: {permission.value}"
            )
        
        return user
    
    return permission_checker


def require_any_permission(permissions: List[Permission]):
    """
    Decorator factory for requiring any of the specified permissions.
    
    Args:
        permissions: List of acceptable permissions
        
    Returns:
        Dependency function for FastAPI
    """
    def permission_checker(request: Request) -> dict:
        user = require_auth(request)
        
        if not RBACService.has_any_permission(user["role"], permissions):
            permission_names = [p.value for p in permissions]
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required permissions: {', '.join(permission_names)}"
            )
        
        return user
    
    return permission_checker


def require_role(roles: List[Role]):
    """
    Decorator factory for requiring specific roles.
    
    Args:
        roles: List of acceptable roles
        
    Returns:
        Dependency function for FastAPI
    """
    def role_checker(request: Request) -> dict:
        user = require_auth(request)
        
        if user["role"] not in [role.value for role in roles]:
            role_names = [role.value for role in roles]
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(role_names)}"
            )
        
        return user
    
    return role_checker


def require_workspace_access(permission: Permission):
    """
    Decorator factory for requiring workspace access with specific permission.
    
    Args:
        permission: Required permission for workspace access
        
    Returns:
        Dependency function for FastAPI
    """
    def workspace_access_checker(
        workspace_id: int,
        request: Request,
        session: Session = Depends(get_session)
    ) -> dict:
        user = require_auth(request)
        
        if not RBACService.can_access_workspace(user, workspace_id, session, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to workspace. Required permission: {permission.value}"
            )
        
        return user
    
    return workspace_access_checker


def require_collection_access(permission: Permission):
    """
    Decorator factory for requiring collection access with specific permission.
    
    Args:
        permission: Required permission for collection access
        
    Returns:
        Dependency function for FastAPI
    """
    def collection_access_checker(
        collection_id: int,
        request: Request,
        session: Session = Depends(get_session)
    ) -> dict:
        user = require_auth(request)
        
        if not RBACService.can_access_collection(user, collection_id, session, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to collection. Required permission: {permission.value}"
            )
        
        return user
    
    return collection_access_checker


def require_request_access(permission: Permission):
    """
    Decorator factory for requiring request access with specific permission.
    
    Args:
        permission: Required permission for request access
        
    Returns:
        Dependency function for FastAPI
    """
    def request_access_checker(
        request_id: int,
        request: Request,
        session: Session = Depends(get_session)
    ) -> dict:
        user = require_auth(request)
        
        if not RBACService.can_access_request(user, request_id, session, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied to request. Required permission: {permission.value}"
            )
        
        return user
    
    return request_access_checker


# Convenience decorators for common permissions
require_admin = require_role([Role.ADMIN])
require_editor = require_role([Role.ADMIN, Role.EDITOR])
require_any_role = require_role([Role.ADMIN, Role.EDITOR, Role.VIEWER])

# User management permissions
require_user_management = require_permission(Permission.MANAGE_USERS)
require_user_invite = require_permission(Permission.INVITE_USERS)
require_user_view = require_permission(Permission.VIEW_USERS)

# Workspace permissions
require_workspace_create = require_permission(Permission.CREATE_WORKSPACE)
require_workspace_view = require_permission(Permission.VIEW_WORKSPACE)
require_workspace_edit = require_permission(Permission.EDIT_WORKSPACE)
require_workspace_delete = require_permission(Permission.DELETE_WORKSPACE)

# Collection permissions
require_collection_create = require_permission(Permission.CREATE_COLLECTION)
require_collection_view = require_permission(Permission.VIEW_COLLECTION)
require_collection_edit = require_permission(Permission.EDIT_COLLECTION)
require_collection_delete = require_permission(Permission.DELETE_COLLECTION)

# Request permissions
require_request_create = require_permission(Permission.CREATE_REQUEST)
require_request_view = require_permission(Permission.VIEW_REQUEST)
require_request_edit = require_permission(Permission.EDIT_REQUEST)
require_request_delete = require_permission(Permission.DELETE_REQUEST)
require_request_send = require_permission(Permission.SEND_REQUEST)

# System permissions
require_audit_view = require_permission(Permission.VIEW_AUDIT_LOGS)
require_system_manage = require_permission(Permission.MANAGE_SYSTEM)