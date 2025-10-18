from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocBase(BaseModel):
    title: str
    content: str


class DocCreate(DocBase):
    request_id: int


class DocUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class DocResponse(DocBase):
    id: int
    request_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True