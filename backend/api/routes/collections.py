from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from core.database import get_session
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
async def get_collections(workspace_id: int = None, session: Session = Depends(get_session)):
    query = session.query(Collection)
    if workspace_id:
        query = query.filter(Collection.workspace_id == workspace_id)
    return query.all()


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: int, session: Session = Depends(get_session)):
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@router.post("/", response_model=CollectionResponse)
async def create_collection(collection_data: CollectionCreate, session: Session = Depends(get_session)):
    collection = Collection(**collection_data.dict())
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(collection_id: int, update_data: CollectionUpdate, session: Session = Depends(get_session)):
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
async def delete_collection(collection_id: int, session: Session = Depends(get_session)):
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    session.delete(collection)
    session.commit()
    return {"message": "Collection deleted"}