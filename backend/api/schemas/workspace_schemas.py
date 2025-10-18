from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WorkspaceResponse(WorkspaceBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True