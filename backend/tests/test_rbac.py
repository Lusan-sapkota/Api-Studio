"""
Tests for Role-Based Access Control (RBAC) system.
Tests role validation, permission checking, and resource access control.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session
from unittest.mock import patch

from main import app
from db.models import User, Workspace, Collection, Request as APIRequest, Environment
from core.rbac import RBACService, Permission, Role
from core.jwt_service import jwt_service
from core.password_service import password_service
from core.config import settings


client = TestClient(app)


@pytest.fixture
def admin_user(session: Session):
    """Create an admin user for testing."""
    user = User(
        username="admin",
        email="admin@example.com",
        hashed_password=password_service.hash_password("AdminPassword123!"),
        name="Admin User",
        role="admin",
        status="active"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def editor_user(session: Session):
    """Create an editor user for testing."""
    user = User(
        username="editor",
        email="editor@example.com",
        hashed_password=password_service.hash_password("EditorPassword123!"),
        name="Editor User",
        role="editor",
        status="active"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def viewer_user(session: Session):
    """Create a viewer user for testing."""
    user = User(
        username="viewer",
        email="viewer@example.com",
        hashed_password=password_service.hash_password("ViewerPassword123!"),
        name="Viewer User",
        role="viewer",
        status="active"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def test_workspace(session: Session, admin_user: User):
    """Create a test workspace owned by admin."""
    workspace = Workspace(
        name="Test Workspace",
        description="Test workspace for RBAC testing",
        owner_id=admin_user.id
    )
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    return workspace


@pytest.fixture
def test_collection(session: Session, test_workspace: Workspace):
    """Create a test collection in the test workspace."""
    collection = Collection(
        name="Test Collection",
        description="Test collection for RBAC testing",
        workspace_id=test_workspace.id
    )
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


@pytest.fixture
def test_request(session: Session, test_collection: Collection):
    """Create a test request in the test collection."""
    request = APIRequest(
        name="Test Request",
        method="GET",
        url="https://api.example.com/test",
        collection_id=test_collection.id
    )
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


@pytest.fixture
def test_environment(session: Session, test_workspace: Workspace):
    """Create a test environment in the test workspace."""
    environment = Environment(
        name="Test Environment",
        description="Test environment for RBAC testing",
        workspace_id=test_workspace.id,
        variables={"API_KEY": "test-key"}
    )
    session.add(environment)
    session.commit()
    session.refresh(environment)
    return environment


def get_auth_headers(user: User) -> dict:
    """Get authorization headers for a user."""
    token = jwt_service.create_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "type": "session"
    })
    return {"Authorization": f"Bearer {token}"}


class TestRBACService:
    """Test the RBACService class methods."""
    
    def test_has_permission_admin(self):
        """Test that admin has all permissions."""
        assert RBACService.has_permission("admin", Permission.MANAGE_USERS)
        assert RBACService.has_permission("admin", Permission.CREATE_WORKSPACE)
        assert RBACService.has_permission("admin", Permission.VIEW_AUDIT_LOGS)
    
    @patch('core.rbac.settings.app_mode', 'hosted')
    def test_has_permission_editor(self):
        """Test that editor has content permissions but not user management."""
        assert RBACService.has_permission("editor", Permission.CREATE_WORKSPACE)
        assert RBACService.has_permission("editor", Permission.EDIT_COLLECTION)
        assert not RBACService.has_permission("editor", Permission.MANAGE_USERS)
        assert not RBACService.has_permission("editor", Permission.VIEW_AUDIT_LOGS)
    
    @patch('core.rbac.settings.app_mode', 'hosted')
    def test_has_permission_viewer(self):
        """Test that viewer has only read permissions."""
        assert RBACService.has_permission("viewer", Permission.VIEW_WORKSPACE)
        assert RBACService.has_permission("viewer", Permission.SEND_REQUEST)
        assert not RBACService.has_permission("viewer", Permission.CREATE_WORKSPACE)
        assert not RBACService.has_permission("viewer", Permission.EDIT_COLLECTION)
    
    @patch('core.rbac.settings.app_mode', 'hosted')
    def test_has_permission_invalid_role(self):
        """Test that invalid roles have no permissions."""
        assert not RBACService.has_permission("invalid", Permission.VIEW_WORKSPACE)
    
    @patch('core.rbac.settings.app_mode', 'local')
    def test_local_mode_bypass(self):
        """Test that local mode bypasses all permission checks."""
        assert RBACService.has_permission("viewer", Permission.MANAGE_USERS)
        assert RBACService.has_permission("invalid", Permission.VIEW_AUDIT_LOGS)
    
    @patch('core.rbac.settings.app_mode', 'hosted')
    def test_can_access_workspace_owner(self, session: Session, admin_user: User, test_workspace: Workspace):
        """Test that workspace owner can access their workspace."""
        user_data = {"user_id": admin_user.id, "role": "admin"}
        assert RBACService.can_access_workspace(
            user_data, test_workspace.id, session, Permission.VIEW_WORKSPACE
        )
    
    @patch('core.rbac.settings.app_mode', 'hosted')
    def test_can_access_workspace_non_owner(self, session: Session, editor_user: User, test_workspace: Workspace):
        """Test that non-owner cannot access workspace."""
        user_data = {"user_id": editor_user.id, "role": "editor"}
        assert not RBACService.can_access_workspace(
            user_data, test_workspace.id, session, Permission.VIEW_WORKSPACE
        )
    
    @patch('core.rbac.settings.app_mode', 'hosted')
    def test_can_access_workspace_admin_override(self, session: Session, editor_user: User, test_workspace: Workspace):
        """Test that admin can access any workspace."""
        # Make editor user an admin
        user_data = {"user_id": editor_user.id, "role": "admin"}
        assert RBACService.can_access_workspace(
            user_data, test_workspace.id, session, Permission.VIEW_WORKSPACE
        )


class TestWorkspaceAccess:
    """Test workspace access control."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_admin_can_access_all_workspaces(self, session: Session, admin_user: User, test_workspace: Workspace):
        """Test that admin can access all workspaces."""
        headers = get_auth_headers(admin_user)
        
        # Get all workspaces
        response = client.get("/workspaces/", headers=headers)
        assert response.status_code == 200
        
        # Get specific workspace
        response = client.get(f"/workspaces/{test_workspace.id}", headers=headers)
        assert response.status_code == 200
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_can_access_own_workspace(self, session: Session, editor_user: User):
        """Test that editor can access their own workspace."""
        # Create workspace owned by editor
        workspace = Workspace(
            name="Editor Workspace",
            description="Workspace owned by editor",
            owner_id=editor_user.id
        )
        session.add(workspace)
        session.commit()
        session.refresh(workspace)
        
        headers = get_auth_headers(editor_user)
        
        # Get specific workspace
        response = client.get(f"/workspaces/{workspace.id}", headers=headers)
        assert response.status_code == 200
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_cannot_access_others_workspace(self, session: Session, editor_user: User, test_workspace: Workspace):
        """Test that editor cannot access workspace they don't own."""
        headers = get_auth_headers(editor_user)
        
        # Try to access admin's workspace
        response = client.get(f"/workspaces/{test_workspace.id}", headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_viewer_cannot_create_workspace(self, session: Session, viewer_user: User):
        """Test that viewer cannot create workspaces."""
        headers = get_auth_headers(viewer_user)
        
        workspace_data = {
            "name": "Viewer Workspace",
            "description": "Should not be created"
        }
        
        response = client.post("/workspaces/", json=workspace_data, headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_can_create_workspace(self, session: Session, editor_user: User):
        """Test that editor can create workspaces."""
        headers = get_auth_headers(editor_user)
        
        workspace_data = {
            "name": "Editor Workspace",
            "description": "Created by editor"
        }
        
        response = client.post("/workspaces/", json=workspace_data, headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "Editor Workspace"


class TestCollectionAccess:
    """Test collection access control."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_admin_can_access_all_collections(self, session: Session, admin_user: User, test_collection: Collection):
        """Test that admin can access all collections."""
        headers = get_auth_headers(admin_user)
        
        # Get specific collection
        response = client.get(f"/collections/{test_collection.id}", headers=headers)
        assert response.status_code == 200
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_cannot_access_others_collection(self, session: Session, editor_user: User, test_collection: Collection):
        """Test that editor cannot access collections in workspaces they don't own."""
        headers = get_auth_headers(editor_user)
        
        # Try to access collection in admin's workspace
        response = client.get(f"/collections/{test_collection.id}", headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_viewer_cannot_create_collection(self, session: Session, viewer_user: User, test_workspace: Workspace):
        """Test that viewer cannot create collections."""
        headers = get_auth_headers(viewer_user)
        
        collection_data = {
            "name": "Viewer Collection",
            "description": "Should not be created",
            "workspace_id": test_workspace.id
        }
        
        response = client.post("/collections/", json=collection_data, headers=headers)
        assert response.status_code == 403


class TestRequestAccess:
    """Test request access control."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_admin_can_access_all_requests(self, session: Session, admin_user: User, test_request: APIRequest):
        """Test that admin can access all requests."""
        headers = get_auth_headers(admin_user)
        
        # Get specific request
        response = client.get(f"/requests/{test_request.id}", headers=headers)
        assert response.status_code == 200
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_cannot_access_others_request(self, session: Session, editor_user: User, test_request: APIRequest):
        """Test that editor cannot access requests in collections they don't own."""
        headers = get_auth_headers(editor_user)
        
        # Try to access request in admin's collection
        response = client.get(f"/requests/{test_request.id}", headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_all_users_can_send_requests(self, session: Session, viewer_user: User):
        """Test that all authenticated users can send HTTP requests."""
        headers = get_auth_headers(viewer_user)
        
        request_data = {
            "method": "GET",
            "url": "https://httpbin.org/get",
            "headers": {},
            "body": None
        }
        
        response = client.post("/requests/send", json=request_data, headers=headers)
        # Note: This might fail due to network, but should not fail due to permissions
        assert response.status_code != 403


class TestAdminAccess:
    """Test admin-only functionality access control."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_admin_can_list_collaborators(self, session: Session, admin_user: User):
        """Test that admin can list collaborators."""
        headers = get_auth_headers(admin_user)
        
        response = client.get("/api/admin/collaborators", headers=headers)
        assert response.status_code == 200
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_cannot_list_collaborators(self, session: Session, editor_user: User):
        """Test that editor cannot list collaborators."""
        headers = get_auth_headers(editor_user)
        
        response = client.get("/api/admin/collaborators", headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_viewer_cannot_list_collaborators(self, session: Session, viewer_user: User):
        """Test that viewer cannot list collaborators."""
        headers = get_auth_headers(viewer_user)
        
        response = client.get("/api/admin/collaborators", headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_cannot_invite_users(self, session: Session, editor_user: User):
        """Test that editor cannot invite users."""
        headers = get_auth_headers(editor_user)
        
        invite_data = {
            "email": "newuser@example.com",
            "role": "viewer",
            "name": "New User"
        }
        
        response = client.post("/api/admin/invite", json=invite_data, headers=headers)
        assert response.status_code == 403


class TestEnvironmentAccess:
    """Test environment access control."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_admin_can_access_all_environments(self, session: Session, admin_user: User, test_environment: Environment):
        """Test that admin can access all environments."""
        headers = get_auth_headers(admin_user)
        
        # Get specific environment
        response = client.get(f"/environments/{test_environment.id}", headers=headers)
        assert response.status_code == 200
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_editor_cannot_access_others_environment(self, session: Session, editor_user: User, test_environment: Environment):
        """Test that editor cannot access environments in workspaces they don't own."""
        headers = get_auth_headers(editor_user)
        
        # Try to access environment in admin's workspace
        response = client.get(f"/environments/{test_environment.id}", headers=headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_viewer_cannot_create_environment(self, session: Session, viewer_user: User, test_workspace: Workspace):
        """Test that viewer cannot create environments."""
        headers = get_auth_headers(viewer_user)
        
        environment_data = {
            "name": "Viewer Environment",
            "description": "Should not be created",
            "workspace_id": test_workspace.id,
            "variables": {}
        }
        
        response = client.post("/environments/", json=environment_data, headers=headers)
        assert response.status_code == 403


class TestCrossUserResourceAccess:
    """Test prevention of cross-user resource access."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_user_cannot_access_others_workspace_resources(self, session: Session, editor_user: User, viewer_user: User):
        """Test that users cannot access resources in workspaces they don't own."""
        # Create workspace owned by editor
        editor_workspace = Workspace(
            name="Editor Workspace",
            description="Workspace owned by editor",
            owner_id=editor_user.id
        )
        session.add(editor_workspace)
        session.commit()
        session.refresh(editor_workspace)
        
        # Create collection in editor's workspace
        editor_collection = Collection(
            name="Editor Collection",
            description="Collection in editor's workspace",
            workspace_id=editor_workspace.id
        )
        session.add(editor_collection)
        session.commit()
        session.refresh(editor_collection)
        
        # Viewer tries to access editor's resources
        viewer_headers = get_auth_headers(viewer_user)
        
        # Try to access workspace
        response = client.get(f"/workspaces/{editor_workspace.id}", headers=viewer_headers)
        assert response.status_code == 403
        
        # Try to access collection
        response = client.get(f"/collections/{editor_collection.id}", headers=viewer_headers)
        assert response.status_code == 403
    
    @patch('core.config.settings.app_mode', 'local')
    def test_local_mode_allows_all_access(self, session: Session, viewer_user: User, test_workspace: Workspace):
        """Test that local mode allows access to all resources."""
        headers = get_auth_headers(viewer_user)
        
        # In local mode, viewer should be able to access admin's workspace
        response = client.get(f"/workspaces/{test_workspace.id}", headers=headers)
        assert response.status_code == 200


class TestUnauthenticatedAccess:
    """Test that unauthenticated requests are properly blocked."""
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_unauthenticated_workspace_access_blocked(self, test_workspace: Workspace):
        """Test that unauthenticated users cannot access workspaces."""
        response = client.get(f"/workspaces/{test_workspace.id}")
        assert response.status_code == 401
    
    @patch('core.config.settings.app_mode', 'hosted')
    def test_unauthenticated_admin_access_blocked(self):
        """Test that unauthenticated users cannot access admin endpoints."""
        response = client.get("/api/admin/collaborators")
        assert response.status_code == 401
    
    @patch('core.config.settings.app_mode', 'local')
    def test_local_mode_allows_unauthenticated_access(self, test_workspace: Workspace):
        """Test that local mode allows unauthenticated access."""
        response = client.get(f"/workspaces/{test_workspace.id}")
        # In local mode, should not require authentication
        assert response.status_code != 401