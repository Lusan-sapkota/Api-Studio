from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session
from typing import List
from core.database import get_session
from core.rbac import (
    require_collection_create, require_collection_view, require_collection_edit,
    require_collection_delete, require_collection_access, Permission, RBACService
)
from core.middleware import get_current_user
from db.models import Collection
from pydantic import BaseModel

# Enhanced schemas for collections
class CollectionBase(BaseModel):
    name: str
    description: str = None
    workspace_id: int
    folders: dict = {}

class CollectionCreate(CollectionBase):
    pass

class CollectionUpdate(BaseModel):
    name: str = None
    description: str = None
    folders: dict = None

class CollectionResponse(CollectionBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/", response_model=List[CollectionResponse])
async def get_collections(
    workspace_id: int = None, 
    request: Request = None,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_collection_view)
):
    """Get collections. Users can only see collections in workspaces they have access to."""
    query = session.query(Collection)
    
    if workspace_id:
        # Check workspace access if specified
        if current_user and not RBACService.can_access_workspace(
            current_user, workspace_id, session, Permission.VIEW_WORKSPACE
        ):
            raise HTTPException(status_code=403, detail="Access denied to workspace")
        query = query.filter(Collection.workspace_id == workspace_id)
    else:
        # Filter by accessible workspaces for non-admin users
        if current_user and current_user["role"] != "admin":
            from db.models import Workspace
            accessible_workspaces = session.query(Workspace).filter(
                Workspace.owner_id == current_user["user_id"]
            ).all()
            workspace_ids = [w.id for w in accessible_workspaces]
            if workspace_ids:
                query = query.filter(Collection.workspace_id.in_(workspace_ids))
            else:
                return []  # No accessible workspaces
    
    return query.all()


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(
    collection_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_collection_access(Permission.VIEW_COLLECTION))
):
    """Get a specific collection. Users can only access collections in workspaces they own."""
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@router.post("/", response_model=CollectionResponse)
async def create_collection(
    collection_data: CollectionCreate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_collection_create)
):
    """Create a new collection. Users must have access to the target workspace."""
    # Check workspace access
    if current_user and not RBACService.can_access_workspace(
        current_user, collection_data.workspace_id, session, Permission.CREATE_COLLECTION
    ):
        raise HTTPException(status_code=403, detail="Access denied to workspace")
    
    collection = Collection(**collection_data.dict())
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: int, 
    update_data: CollectionUpdate, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_collection_access(Permission.EDIT_COLLECTION))
):
    """Update a collection. Users can only update collections in workspaces they own."""
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(collection, key, value)
    
    session.commit()
    session.refresh(collection)
    return collection


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: int, 
    request: Request,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_collection_access(Permission.DELETE_COLLECTION))
):
    """Delete a collection. Users can only delete collections in workspaces they own."""
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    session.delete(collection)
    session.commit()
    return {"message": "Collection deleted"}