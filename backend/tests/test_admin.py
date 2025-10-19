"""
Tests for admin user management functionality including invitations and collaborator management.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from main import app
from core.config import settings

# Set app mode to hosted for testing
settings.app_mode = "hosted"
from db.models import User, Invitation, OTPCode, AuditLog
from api.services.admin_service import admin_service
from core.password_service import password_service
from core.two_factor_service import two_factor_service
from core.jwt_service import jwt_service
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
        status="active",
        two_factor_enabled=False
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
        status="active",
        two_factor_enabled=False
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
        status="active",
        two_factor_enabled=False
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    """Create JWT token for admin user."""
    token_data = {
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role,
        "name": admin_user.name
    }
    return jwt_service.create_token(token_data)


@pytest.fixture
def editor_token(editor_user):
    """Create JWT token for editor user."""
    token_data = {
        "sub": str(editor_user.id),
        "email": editor_user.email,
        "role": editor_user.role,
        "name": editor_user.name
    }
    return jwt_service.create_token(token_data)


class TestUserInvitations:
    """Test user invitation functionality."""
    
    @patch('core.email_service.email_service.send_invitation_email')
    def test_invite_user_success(self, mock_send_email, session, admin_user, admin_token):
        """Test successful user invitation."""
        mock_send_email.return_value = True
        
        # Test invitation creation
        success, invitation_id, message, expires_at = admin_service.invite_user(
            session=session,
            admin_user=admin_user,
            email="newuser@example.com",
            role="editor",
            name="New User"
        )
        
        assert success is True
        assert invitation_id is not None
        assert "successfully" in message.lower()
        assert expires_at is not None
        
        # Verify invitation was created in database
        invitation = session.get(Invitation, invitation_id)
        assert invitation is not None
        assert invitation.email == "newuser@example.com"
        assert invitation.role == "editor"
        assert invitation.invited_by == admin_user.id
        assert invitation.accepted is False
        
        # Verify email was sent
        mock_send_email.assert_called_once()
    
    def test_invite_existing_user_fails(self, session, admin_user, editor_user):
        """Test that inviting existing user fails."""
        success, invitation_id, message, expires_at = admin_service.invite_user(
            session=session,
            admin_user=admin_user,
            email=editor_user.email,
            role="viewer"
        )
        
        assert success is False
        assert invitation_id is None
        assert "already exists" in message.lower()
    
    def test_invite_invalid_role_fails(self, session, admin_user):
        """Test that invalid role fails invitation."""
        success, invitation_id, message, expires_at = admin_service.invite_user(
            session=session,
            admin_user=admin_user,
            email="newuser@example.com",
            role="invalid_role"
        )
        
        assert success is False
        assert invitation_id is None
        assert "invalid role" in message.lower()
    
    @patch('core.email_service.email_service.send_invitation_email')
    def test_invite_duplicate_pending_fails(self, mock_send_email, session, admin_user):
        """Test that duplicate pending invitation fails."""
        mock_send_email.return_value = True
        
        # Create first invitation
        admin_service.invite_user(
            session=session,
            admin_user=admin_user,
            email="newuser@example.com",
            role="editor"
        )
        
        # Try to create duplicate invitation
        success, invitation_id, message, expires_at = admin_service.invite_user(
            session=session,
            admin_user=admin_user,
            email="newuser@example.com",
            role="viewer"
        )
        
        assert success is False
        assert invitation_id is None
        assert "pending invitation" in message.lower()
    
    def test_verify_invitation_success(self, session, admin_user):
        """Test successful invitation verification."""
        # Create invitation
        otp_code = "123456"
        invitation = Invitation(
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code=otp_code,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        # Verify invitation
        success, setup_token, role, expires_at = admin_service.verify_invitation(
            session=session,
            email="newuser@example.com",
            otp_code=otp_code
        )
        
        assert success is True
        assert setup_token is not None
        assert role == "editor"
        assert expires_at is not None
        
        # Verify token can be decoded
        payload = jwt_service.decode_temp_token(setup_token)
        assert payload["email"] == "newuser@example.com"
        assert payload["role"] == "editor"
        assert payload["type"] == "temporary"
    
    def test_verify_invitation_invalid_otp(self, session, admin_user):
        """Test invitation verification with invalid OTP."""
        # Create invitation
        invitation = Invitation(
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code="123456",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        # Try to verify with wrong OTP
        success, setup_token, role, expires_at = admin_service.verify_invitation(
            session=session,
            email="newuser@example.com",
            otp_code="654321"
        )
        
        assert success is False
        assert setup_token is None
    
    def test_verify_invitation_expired(self, session, admin_user):
        """Test verification of expired invitation."""
        # Create expired invitation
        invitation = Invitation(
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code="123456",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Expired
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        # Try to verify expired invitation
        success, setup_token, role, expires_at = admin_service.verify_invitation(
            session=session,
            email="newuser@example.com",
            otp_code="123456"
        )
        
        assert success is False
        assert setup_token is None


class TestCollaboratorSetup:
    """Test collaborator account setup functionality."""
    
    def test_complete_setup_without_2fa(self, session, admin_user):
        """Test completing collaborator setup without 2FA."""
        # Create setup token
        setup_token = jwt_service.create_temp_token({
            "email": "newuser@example.com",
            "role": "editor",
            "invitation_id": 1,
            "type": "collaborator_setup"
        })
        
        # Create invitation record
        invitation = Invitation(
            id=1,
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code="123456",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        # Complete setup
        success, message, response_data = admin_service.complete_collaborator_setup(
            session=session,
            setup_token=setup_token,
            password="NewPassword123!",
            confirm_password="NewPassword123!",
            enable_2fa=False
        )
        
        assert success is True
        assert "successfully" in message.lower()
        assert "access_token" in response_data
        assert "user" in response_data
        
        # Verify user was created
        user = session.exec(select(User).where(User.email == "newuser@example.com")).first()
        assert user is not None
        assert user.role == "editor"
        assert user.status == "active"
        assert user.two_factor_enabled is False
        
        # Verify invitation was marked as accepted
        session.refresh(invitation)
        assert invitation.accepted is True
    
    def test_complete_setup_with_2fa(self, session, admin_user):
        """Test completing collaborator setup with 2FA enabled."""
        # Create setup token
        setup_token = jwt_service.create_temp_token({
            "email": "newuser@example.com",
            "role": "editor",
            "invitation_id": 1,
            "type": "collaborator_setup"
        })
        
        # Create invitation record
        invitation = Invitation(
            id=1,
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code="123456",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        # Complete setup with 2FA
        success, message, response_data = admin_service.complete_collaborator_setup(
            session=session,
            setup_token=setup_token,
            password="NewPassword123!",
            confirm_password="NewPassword123!",
            enable_2fa=True
        )
        
        assert success is True
        assert "two_fa_setup" in response_data
        assert "setup_token" in response_data
        
        # Verify user was created with 2FA secret
        user = session.exec(select(User).where(User.email == "newuser@example.com")).first()
        assert user is not None
        assert user.two_factor_secret is not None
    
    def test_setup_password_mismatch(self, session, admin_user):
        """Test setup fails when passwords don't match."""
        setup_token = jwt_service.create_temp_token({
            "email": "newuser@example.com",
            "role": "editor",
            "invitation_id": 1,
            "type": "collaborator_setup"
        })
        
        success, message, response_data = admin_service.complete_collaborator_setup(
            session=session,
            setup_token=setup_token,
            password="NewPassword123!",
            confirm_password="DifferentPassword123!",
            enable_2fa=False
        )
        
        assert success is False
        assert "do not match" in message.lower()
    
    def test_setup_weak_password(self, session, admin_user):
        """Test setup fails with weak password."""
        setup_token = jwt_service.create_temp_token({
            "email": "newuser@example.com",
            "role": "editor",
            "invitation_id": 1,
            "type": "collaborator_setup"
        })
        
        success, message, response_data = admin_service.complete_collaborator_setup(
            session=session,
            setup_token=setup_token,
            password="weak",
            confirm_password="weak",
            enable_2fa=False
        )
        
        assert success is False
        assert message is not None


class TestCollaboratorManagement:
    """Test collaborator management functionality."""
    
    def test_list_collaborators(self, session, admin_user, editor_user, viewer_user):
        """Test listing all collaborators."""
        collaborators = admin_service.list_collaborators(session, admin_user)
        
        assert len(collaborators) == 3
        
        # Check that all users are included
        emails = [c["email"] for c in collaborators]
        assert admin_user.email in emails
        assert editor_user.email in emails
        assert viewer_user.email in emails
    
    def test_update_collaborator_role_success(self, session, admin_user, editor_user):
        """Test successful role update."""
        success, message, user_data = admin_service.update_collaborator_role(
            session=session,
            admin_user=admin_user,
            collaborator_id=editor_user.id,
            new_role="viewer"
        )
        
        assert success is True
        assert "successfully" in message.lower()
        assert user_data["role"] == "viewer"
        
        # Verify role was updated in database
        session.refresh(editor_user)
        assert editor_user.role == "viewer"
    
    def test_update_own_role_fails(self, session, admin_user):
        """Test that admin cannot update their own role."""
        success, message, user_data = admin_service.update_collaborator_role(
            session=session,
            admin_user=admin_user,
            collaborator_id=admin_user.id,
            new_role="editor"
        )
        
        assert success is False
        assert "cannot modify your own role" in message.lower()
    
    def test_update_role_invalid_role(self, session, admin_user, editor_user):
        """Test role update with invalid role."""
        success, message, user_data = admin_service.update_collaborator_role(
            session=session,
            admin_user=admin_user,
            collaborator_id=editor_user.id,
            new_role="invalid_role"
        )
        
        assert success is False
        assert "invalid role" in message.lower()
    
    def test_remove_collaborator_success(self, session, admin_user, editor_user):
        """Test successful collaborator removal."""
        success, message = admin_service.remove_collaborator(
            session=session,
            admin_user=admin_user,
            collaborator_id=editor_user.id
        )
        
        assert success is True
        assert "successfully" in message.lower()
        
        # Verify user was removed from database
        removed_user = session.get(User, editor_user.id)
        assert removed_user is None
    
    def test_remove_self_fails(self, session, admin_user):
        """Test that admin cannot remove themselves."""
        success, message = admin_service.remove_collaborator(
            session=session,
            admin_user=admin_user,
            collaborator_id=admin_user.id
        )
        
        assert success is False
        assert "cannot remove your own account" in message.lower()
    
    def test_remove_last_admin_fails(self, session, admin_user):
        """Test that last admin cannot be removed."""
        # Make sure admin_user is the only admin
        success, message = admin_service.remove_collaborator(
            session=session,
            admin_user=admin_user,
            collaborator_id=admin_user.id
        )
        
        assert success is False
        assert "cannot remove" in message.lower()


class TestAdminAPIEndpoints:
    """Test admin API endpoints."""
    
    def test_invite_user_endpoint_success(self, session, admin_user, admin_token):
        """Test POST /api/admin/invite endpoint."""
        with patch('core.email_service.email_service.send_invitation_email', return_value=True):
            response = client.post(
                "/api/admin/invite",
                json={
                    "email": "newuser@example.com",
                    "role": "editor",
                    "name": "New User"
                },
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "invitation_id" in data
    
    def test_invite_user_requires_admin(self, session, editor_user, editor_token):
        """Test that invitation requires admin role."""
        response = client.post(
            "/api/admin/invite",
            json={
                "email": "newuser@example.com",
                "role": "editor"
            },
            headers={"Authorization": f"Bearer {editor_token}"}
        )
        
        assert response.status_code == 403
        assert "admin privileges required" in response.json()["detail"].lower()
    
    def test_list_collaborators_endpoint(self, session, admin_user, editor_user, admin_token):
        """Test GET /api/admin/collaborators endpoint."""
        response = client.get(
            "/api/admin/collaborators",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "collaborators" in data
        assert len(data["collaborators"]) >= 2
    
    def test_update_collaborator_role_endpoint(self, session, admin_user, editor_user, admin_token):
        """Test PATCH /api/admin/collaborators/{id} endpoint."""
        response = client.patch(
            f"/api/admin/collaborators/{editor_user.id}",
            json={"role": "viewer"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user"]["role"] == "viewer"
    
    def test_remove_collaborator_endpoint(self, session, admin_user, editor_user, admin_token):
        """Test DELETE /api/admin/collaborators/{id} endpoint."""
        response = client.delete(
            f"/api/admin/collaborators/{editor_user.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_verify_invitation_endpoint(self, session, admin_user):
        """Test POST /api/auth/verify-invitation endpoint."""
        # Create invitation
        otp_code = "123456"
        invitation = Invitation(
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code=otp_code,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        response = client.post(
            "/api/auth/verify-invitation",
            json={
                "email": "newuser@example.com",
                "otp_code": otp_code
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "setup_token" in data
        assert data["role"] == "editor"
    
    def test_collaborator_set_password_endpoint(self, session, admin_user):
        """Test POST /api/auth/collaborator/set-password endpoint."""
        # Create setup token
        setup_token = jwt_service.create_temp_token({
            "email": "newuser@example.com",
            "role": "editor",
            "invitation_id": 1,
            "type": "collaborator_setup"
        })
        
        # Create invitation record
        invitation = Invitation(
            id=1,
            email="newuser@example.com",
            role="editor",
            invited_by=admin_user.id,
            otp_code="123456",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            accepted=False
        )
        session.add(invitation)
        session.commit()
        
        response = client.post(
            "/api/auth/collaborator/set-password",
            json={
                "password": "NewPassword123!",
                "confirm_password": "NewPassword123!",
                "enable_2fa": False
            },
            headers={"Authorization": f"Bearer {setup_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "access_token" in data
        assert "user" in data


class TestAuditLogging:
    """Test audit logging for admin operations."""
    
    @patch('core.email_service.email_service.send_invitation_email')
    def test_invitation_audit_logging(self, mock_send_email, session, admin_user):
        """Test that invitation events are logged."""
        mock_send_email.return_value = True
        
        admin_service.invite_user(
            session=session,
            admin_user=admin_user,
            email="newuser@example.com",
            role="editor",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        # Check audit log was created
        audit_log = session.exec(
            select(AuditLog).where(
                AuditLog.user_id == admin_user.id,
                AuditLog.action == "user_invited"
            )
        ).first()
        
        assert audit_log is not None
        assert audit_log.ip_address == "127.0.0.1"
        assert audit_log.user_agent == "test-agent"
        assert "email" in audit_log.details
    
    def test_role_update_audit_logging(self, session, admin_user, editor_user):
        """Test that role updates are logged."""
        admin_service.update_collaborator_role(
            session=session,
            admin_user=admin_user,
            collaborator_id=editor_user.id,
            new_role="viewer",
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        # Check audit log was created
        audit_log = session.exec(
            select(AuditLog).where(
                AuditLog.user_id == admin_user.id,
                AuditLog.action == "role_updated"
            )
        ).first()
        
        assert audit_log is not None
        assert audit_log.details["old_role"] == "editor"
        assert audit_log.details["new_role"] == "viewer"
    
    def test_user_removal_audit_logging(self, session, admin_user, editor_user):
        """Test that user removal is logged."""
        admin_service.remove_collaborator(
            session=session,
            admin_user=admin_user,
            collaborator_id=editor_user.id,
            ip_address="127.0.0.1",
            user_agent="test-agent"
        )
        
        # Check audit log was created
        audit_log = session.exec(
            select(AuditLog).where(
                AuditLog.user_id == admin_user.id,
                AuditLog.action == "user_removed"
            )
        ).first()
        
        assert audit_log is not None
        assert audit_log.details["target_email"] == editor_user.email