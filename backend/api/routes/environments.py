from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from typing import List
from core.database import get_session
from core.rbac import (
    require_workspace_access, Permission, RBACService
)
from core.middleware import get_current_user
from db.models import Environment
from pydantic import BaseModel

# Enhanced schemas for environments
class EnvironmentBase(BaseModel):
    name: str
    description: str = None
    variables: dict = {}
    workspace_id: int
    active: bool = False

class EnvironmentCreate(EnvironmentBase):
    pass

class EnvironmentUpdate(BaseModel):
    name: str = None
    description: str = None
    variables: dict = None
    active: bool = None

class EnvironmentResponse(EnvironmentBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

router = APIRouter(prefix="/environments", tags=["environments"])


@router.get("/", response_model=List[EnvironmentResponse])
async def get_environments(
    workspace_id: int = None, 
    request: Request = None,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Get environments. Users can only see environments in workspaces they have access to."""
    query = session.query(Environment)
    
    if workspace_id:
        # Check workspace access if specified
        if current_user and not RBACService.can_access_workspace(
            current_user, workspace_id, session, Permission.VIEW_ENVIRONMENT
        ):
            raise HTTPException(status_code=403, detail="Access denied to workspace")
        query = query.filter(Environment.workspace_id == workspace_id)
    else:
        # Filter by accessible workspaces for non-admin users
        if current_user and current_user["role"] != "admin":
            from db.models import Workspace
            accessible_workspaces = session.query(Workspace).filter(
                Workspace.owner_id == current_user["user_id"]
            ).all()
            workspace_ids = [w.id for w in accessible_workspaces]
            if workspace_ids:
                query = query.filter(Environment.workspace_id.in_(workspace_ids))
            else:
                return []  # No accessible workspaces
    
    return query.all()


@router.get("/{environment_id}", response_model=EnvironmentResponse)
async def get_environment(
    environment_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific environment. Users can only access environments in workspaces they own."""
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Check workspace access
    if current_user and not RBACService.can_access_workspace(
        current_user, environment.workspace_id, session, Permission.VIEW_ENVIRONMENT
    ):
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    return environment


@router.post("/", response_model=EnvironmentResponse)
async def create_environment(
    environment_data: EnvironmentCreate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_workspace_access(Permission.CREATE_ENVIRONMENT))
):
    """Create a new environment. Users must have access to the target workspace."""
    # Check workspace access
    if current_user and not RBACService.can_access_workspace(
        current_user, environment_data.workspace_id, session, Permission.CREATE_ENVIRONMENT
    ):
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    # If this environment is being set as active, deactivate others in the same workspace
    if environment_data.active:
        session.query(Environment).filter(
            Environment.workspace_id == environment_data.workspace_id,
            Environment.active == True
        ).update({"active": False})
    
    environment = Environment(**environment_data.dict())
    session.add(environment)
    session.commit()
    session.refresh(environment)
    return environment


@router.put("/{environment_id}", response_model=EnvironmentResponse)
async def update_environment(
    environment_id: int, 
    update_data: EnvironmentUpdate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Update an environment. Users can only update environments in workspaces they own."""
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Check workspace access
    if current_user and not RBACService.can_access_workspace(
        current_user, environment.workspace_id, session, Permission.EDIT_ENVIRONMENT
    ):
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    update_dict = update_data.dict(exclude_unset=True)
    
    # If setting this environment as active, deactivate others in the same workspace
    if update_dict.get("active"):
        session.query(Environment).filter(
            Environment.workspace_id == environment.workspace_id,
            Environment.id != environment_id,
            Environment.active == True
        ).update({"active": False})
    
    for key, value in update_dict.items():
        setattr(environment, key, value)
    
    session.commit()
    session.refresh(environment)
    return environment


@router.post("/{environment_id}/activate", response_model=EnvironmentResponse)
async def activate_environment(
    environment_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Activate an environment. Users can only activate environments in workspaces they own."""
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Check workspace access
    if current_user and not RBACService.can_access_workspace(
        current_user, environment.workspace_id, session, Permission.EDIT_ENVIRONMENT
    ):
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    # Deactivate all other environments in the same workspace
    session.query(Environment).filter(
        Environment.workspace_id == environment.workspace_id,
        Environment.active == True
    ).update({"active": False})
    
    # Activate this environment
    environment.active = True
    session.commit()
    session.refresh(environment)
    return environment


@router.delete("/{environment_id}")
async def delete_environment(
    environment_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Delete an environment. Users can only delete environments in workspaces they own."""
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Check workspace access
    if current_user and not RBACService.can_access_workspace(
        current_user, environment.workspace_id, session, Permission.DELETE_ENVIRONMENT
    ):
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    session.delete(environment)
    session.commit()
    return {"message": "Environment deleted"}