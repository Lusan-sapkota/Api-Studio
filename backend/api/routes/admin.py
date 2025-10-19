"""
Admin routes for user management, invitations, and system administration.
Handles collaborator management, role updates, and admin operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from typing import Optional

from core.database import get_session
from core.config import settings
from db.models import User
from api.routes.auth import get_current_user, get_client_info
from api.schemas.admin_schemas import (
    InviteUserRequest, InviteUserResponse, CollaboratorListResponse,
    UpdateCollaboratorRequest, UpdateCollaboratorResponse, RemoveCollaboratorResponse
)
from api.services.admin_service import admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure current user has admin role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object if admin, raises HTTPException otherwise
    """
    if settings.app_mode == "local":
        return current_user  # In local mode, all users are effectively admin
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    
    return current_user


@router.post("/invite", response_model=InviteUserResponse)
def invite_user(
    invite_data: InviteUserRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Invite a new user to the system.
    
    - **email**: Email address of the user to invite
    - **role**: Role to assign (admin, editor, viewer)
    - **name**: Optional display name for the user
    
    Requires admin privileges.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="User invitations are not available in local mode"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    success, invitation_id, message, expires_at = admin_service.invite_user(
        session=session,
        admin_user=admin_user,
        email=invite_data.email,
        role=invite_data.role,
        name=invite_data.name,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return InviteUserResponse(
        success=True,
        message=message,
        invitation_id=invitation_id,
        expires_at=expires_at
    )


@router.get("/collaborators", response_model=CollaboratorListResponse)
def list_collaborators(
    admin_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    List all collaborators in the system.
    
    Returns user information including roles, status, and invitation details.
    Requires admin privileges.
    """
    collaborators = admin_service.list_collaborators(session, admin_user)
    
    return CollaboratorListResponse(
        success=True,
        collaborators=collaborators,
        total=len(collaborators)
    )


@router.patch("/collaborators/{collaborator_id}", response_model=UpdateCollaboratorResponse)
def update_collaborator_role(
    collaborator_id: int,
    update_data: UpdateCollaboratorRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Update a collaborator's role.
    
    - **collaborator_id**: ID of the user to update
    - **role**: New role to assign (admin, editor, viewer)
    
    Requires admin privileges. Cannot modify own role.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="Role management is not available in local mode"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    success, message, user_data = admin_service.update_collaborator_role(
        session=session,
        admin_user=admin_user,
        collaborator_id=collaborator_id,
        new_role=update_data.role,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return UpdateCollaboratorResponse(
        success=True,
        message=message,
        user=user_data
    )


@router.delete("/collaborators/{collaborator_id}", response_model=RemoveCollaboratorResponse)
def remove_collaborator(
    collaborator_id: int,
    request: Request,
    admin_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Remove a collaborator from the system.
    
    - **collaborator_id**: ID of the user to remove
    
    Requires admin privileges. Cannot remove own account or the last admin.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="User removal is not available in local mode"
        )
    
    ip_address, user_agent = get_client_info(request)
    
    success, message = admin_service.remove_collaborator(
        session=session,
        admin_user=admin_user,
        collaborator_id=collaborator_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return RemoveCollaboratorResponse(
        success=True,
        message=message
    )