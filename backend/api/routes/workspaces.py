from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from typing import List
from core.database import get_session
from core.rbac import (
    require_workspace_create, require_workspace_view, require_workspace_edit, 
    require_workspace_delete, require_workspace_access, Permission, RBACService
)
from core.middleware import get_current_user
from api.schemas.workspace_schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from api.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(
    request: Request,
    owner_id: int = None, 
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_workspace_view)
):
    """Get workspaces. Users can only see their own workspaces unless they're admin."""
    # In hosted mode, filter by user unless admin
    if current_user and current_user["role"] != "admin":
        owner_id = current_user["user_id"]
    
    return WorkspaceService.get_workspaces(session, owner_id)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_workspace_access(Permission.VIEW_WORKSPACE))
):
    """Get a specific workspace. Users can only access workspaces they own unless they're admin."""
    workspace = WorkspaceService.get_workspace(session, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.post("/", response_model=WorkspaceResponse)
def create_workspace(
    workspace_data: WorkspaceCreate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_workspace_create)
):
    """Create a new workspace. Owner is set to the current user."""
    owner_id = current_user["user_id"] if current_user else 1  # Default to user 1 in local mode
    return WorkspaceService.create_workspace(session, workspace_data, owner_id)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: int, 
    update_data: WorkspaceUpdate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_workspace_access(Permission.EDIT_WORKSPACE))
):
    """Update a workspace. Users can only update workspaces they own unless they're admin."""
    workspace = WorkspaceService.update_workspace(session, workspace_id, update_data)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_workspace_access(Permission.DELETE_WORKSPACE))
):
    """Delete a workspace. Users can only delete workspaces they own unless they're admin."""
    success = WorkspaceService.delete_workspace(session, workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"message": "Workspace deleted"}