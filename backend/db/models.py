from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, Dict, Any
from datetime import datetime


class BaseModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class User(BaseModel, table=True):
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_admin: bool = Field(default=False)

    # Relationships
    workspaces: List["Workspace"] = Relationship(back_populates="owner")


class Workspace(BaseModel, table=True):
    name: str
    description: Optional[str] = None
    owner_id: int = Field(foreign_key="user.id")

    # Relationships
    owner: User = Relationship(back_populates="workspaces")
    collections: List["Collection"] = Relationship(back_populates="workspace")
    environments: List["Environment"] = Relationship(back_populates="workspace")


class Collection(BaseModel, table=True):
    name: str
    description: Optional[str] = None
    workspace_id: int = Field(foreign_key="workspace.id")

    # Relationships
    workspace: Workspace = Relationship(back_populates="collections")
    requests: List["Request"] = Relationship(back_populates="collection")


class Request(BaseModel, table=True):
    method: str  # GET, POST, etc.
    url: str
    headers: Optional[Dict[str, str]] = Field(default_factory=dict)
    body: Optional[str] = None
    collection_id: int = Field(foreign_key="collection.id")

    # Relationships
    collection: Collection = Relationship(back_populates="requests")
    docs: List["Doc"] = Relationship(back_populates="request")


class Environment(BaseModel, table=True):
    name: str
    variables: Dict[str, str] = Field(default_factory=dict)  # key-value pairs
    workspace_id: int = Field(foreign_key="workspace.id")

    # Relationships
    workspace: Workspace = Relationship(back_populates="environments")


class Doc(BaseModel, table=True):
    title: str
    content: str  # Generated documentation
    request_id: int = Field(foreign_key="request.id")

    # Relationships
    request: Request = Relationship(back_populates="docs")