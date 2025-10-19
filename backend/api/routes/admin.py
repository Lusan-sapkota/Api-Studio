"""
Admin routes for user management, invitations, and system administration.
Handles collaborator management, role updates, and admin operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from typing import Optional

from core.database import get_session
from core.config import settings
from core.rbac import require_admin, require_user_management, require_user_invite, require_user_view
from db.models import User
from api.routes.auth import get_current_user, get_client_info
from api.schemas.admin_schemas import (
    InviteUserRequest, InviteUserResponse, CollaboratorListResponse,
    UpdateCollaboratorRequest, UpdateCollaboratorResponse, RemoveCollaboratorResponse,
    AuditLogListResponse, AuditLogFilters
)
from api.services.admin_service import admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


# Remove the old require_admin function since we're using the RBAC version


@router.post("/invite", response_model=InviteUserResponse)
def invite_user(
    invite_data: InviteUserRequest,
    request: Request,
    session: Session = Depends(get_session),
    admin_user: dict = Depends(require_user_invite)
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
    
    # Get the actual User object for the admin service
    admin_user_obj = session.get(User, admin_user["user_id"])
    if not admin_user_obj:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    success, invitation_id, message, expires_at = admin_service.invite_user(
        session=session,
        admin_user=admin_user_obj,
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
    session: Session = Depends(get_session),
    admin_user: dict = Depends(require_user_view)
):
    """
    List all collaborators in the system.
    
    Returns user information including roles, status, and invitation details.
    Requires admin privileges.
    """
    # Get the actual User object for the admin service
    admin_user_obj = session.get(User, admin_user["user_id"])
    if not admin_user_obj:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    collaborators = admin_service.list_collaborators(session, admin_user_obj)
    
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
    session: Session = Depends(get_session),
    admin_user: dict = Depends(require_user_management)
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
    
    # Get the actual User object for the admin service
    admin_user_obj = session.get(User, admin_user["user_id"])
    if not admin_user_obj:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    success, message, user_data = admin_service.update_collaborator_role(
        session=session,
        admin_user=admin_user_obj,
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
    session: Session = Depends(get_session),
    admin_user: dict = Depends(require_user_management)
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
    
    # Get the actual User object for the admin service
    admin_user_obj = session.get(User, admin_user["user_id"])
    if not admin_user_obj:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    success, message = admin_service.remove_collaborator(
        session=session,
        admin_user=admin_user_obj,
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


@router.get("/audit-logs", response_model=AuditLogListResponse)
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    session: Session = Depends(get_session),
    admin_user: dict = Depends(require_admin)
):
    """
    Get audit logs with optional filtering.
    
    - **limit**: Maximum number of logs to return (1-1000, default 100)
    - **offset**: Number of logs to skip for pagination (default 0)
    - **user_id**: Filter by user ID (optional)
    - **action**: Filter by action type (optional)
    - **resource_type**: Filter by resource type (optional)
    
    Requires admin privileges.
    """
    if settings.app_mode == "local":
        raise HTTPException(
            status_code=400,
            detail="Audit logs are not available in local mode"
        )
    
    # Validate limit
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 1000"
        )
    
    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset must be non-negative"
        )
    
    # Get the actual User object for the admin service
    admin_user_obj = session.get(User, admin_user["user_id"])
    if not admin_user_obj:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    logs, total_count = admin_service.get_audit_logs(
        session=session,
        admin_user=admin_user_obj,
        limit=limit,
        offset=offset,
        user_id=user_id,
        action=action,
        resource_type=resource_type
    )
    
    return AuditLogListResponse(
        success=True,
        logs=logs,
        total=total_count,
        limit=limit,
        offset=offset
    )