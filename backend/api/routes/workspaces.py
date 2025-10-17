from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from core.database import get_session
from api.schemas.workspace_schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from api.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(owner_id: int = None, session: Session = Depends(get_session)):
    return WorkspaceService.get_workspaces(session, owner_id)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: int, session: Session = Depends(get_session)):
    workspace = WorkspaceService.get_workspace(session, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.post("/", response_model=WorkspaceResponse)
def create_workspace(workspace_data: WorkspaceCreate, owner_id: int, session: Session = Depends(get_session)):
    # TODO: Get owner_id from authenticated user
    return WorkspaceService.create_workspace(session, workspace_data, owner_id)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(workspace_id: int, update_data: WorkspaceUpdate, session: Session = Depends(get_session)):
    workspace = WorkspaceService.update_workspace(session, workspace_id, update_data)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: int, session: Session = Depends(get_session)):
    success = WorkspaceService.delete_workspace(session, workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"message": "Workspace deleted"}