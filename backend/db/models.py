from sqlmodel import SQLModel, Field, Relationship, JSON
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
    
    # New authentication fields
    name: Optional[str] = None
    role: str = Field(default="viewer")  # admin, editor, viewer
    two_factor_enabled: bool = Field(default=False)
    two_factor_secret: Optional[str] = None
    backup_codes: Optional[str] = None  # JSON string of hashed codes
    requires_password_change: bool = Field(default=False)
    last_login_at: Optional[datetime] = None
    failed_login_attempts: int = Field(default=0)
    locked_until: Optional[datetime] = None
    status: str = Field(default="active")  # active, locked, suspended

    # Relationships
    workspaces: List["Workspace"] = Relationship(back_populates="owner")
    audit_logs: List["AuditLog"] = Relationship(back_populates="user")
    sent_invitations: List["Invitation"] = Relationship(back_populates="inviter")


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
    folders: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    workspace: Workspace = Relationship(back_populates="collections")
    requests: List["Request"] = Relationship(back_populates="collection")


class Request(BaseModel, table=True):
    name: str
    method: str  # GET, POST, etc.
    url: str
    headers: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_type=JSON)
    params: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_type=JSON)
    body: Optional[str] = None
    body_type: Optional[str] = Field(default="json")
    auth_type: Optional[str] = Field(default="none")
    auth_data: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_type=JSON)
    collection_id: int = Field(foreign_key="collection.id")
    folder_id: Optional[str] = None

    # Relationships
    collection: Collection = Relationship(back_populates="requests")
    docs: List["Doc"] = Relationship(back_populates="request")


class Environment(BaseModel, table=True):
    name: str
    description: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    workspace_id: int = Field(foreign_key="workspace.id")
    active: bool = Field(default=False)

    # Relationships
    workspace: Workspace = Relationship(back_populates="environments")


class Note(BaseModel, table=True):
    title: str
    content: str
    context_type: str  # 'workspace', 'environment', 'collection', 'request'
    context_id: Optional[int] = None  # ID of the related entity
    workspace_id: int = Field(foreign_key="workspace.id")
    
    # Relationships
    workspace: Workspace = Relationship()


class Task(BaseModel, table=True):
    title: str
    status: str = Field(default="todo")  # todo, in_progress, done
    priority: str = Field(default="medium")  # low, medium, high
    due_date: Optional[datetime] = None
    context_type: str  # 'workspace', 'environment', 'collection', 'request'
    context_id: Optional[int] = None  # ID of the related entity
    workspace_id: int = Field(foreign_key="workspace.id")
    
    # Relationships
    workspace: Workspace = Relationship()


class Doc(BaseModel, table=True):
    title: str
    content: str  # Generated documentation
    request_id: int = Field(foreign_key="request.id")

    # Relationships
    request: Request = Relationship(back_populates="docs")


class OTPCode(BaseModel, table=True):
    email: str = Field(index=True)
    otp_code: str
    otp_type: str  # bootstrap, forgot_password, invitation
    expires_at: datetime
    attempts: int = Field(default=0)
    used: bool = Field(default=False)


class Invitation(BaseModel, table=True):
    email: str
    role: str
    invited_by: int = Field(foreign_key="user.id")
    otp_code: str
    expires_at: datetime
    accepted: bool = Field(default=False)
    
    # Relationships
    inviter: User = Relationship(back_populates="sent_invitations")


class AuditLog(BaseModel, table=True):
    user_id: Optional[int] = Field(foreign_key="user.id")
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_type=JSON)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="audit_logs")