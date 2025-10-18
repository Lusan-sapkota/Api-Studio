from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class RequestBase(BaseModel):
    method: str
    url: str
    headers: Optional[Dict[str, str]] = {}
    body: Optional[str] = None


class RequestCreate(RequestBase):
    collection_id: int


class RequestUpdate(BaseModel):
    method: Optional[str] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = None


class RequestResponse(RequestBase):
    id: int
    collection_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True