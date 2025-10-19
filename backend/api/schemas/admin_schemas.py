"""
Pydantic schemas for admin endpoints including user management and invitations.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class InviteUserRequest(BaseModel):
    """Schema for inviting a new user."""
    email: EmailStr = Field(..., description="Email address of the user to invite")
    role: str = Field(..., description="Role to assign (admin, editor, viewer)")
    name: Optional[str] = Field(None, description="Optional display name for the user")


class InviteUserResponse(BaseModel):
    """Schema for invite user response."""
    success: bool
    message: str
    invitation_id: int
    expires_at: datetime


class VerifyInvitationRequest(BaseModel):
    """Schema for verifying an invitation."""
    email: EmailStr = Field(..., description="Email address")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class VerifyInvitationResponse(BaseModel):
    """Schema for invitation verification response."""
    success: bool
    message: str
    setup_token: str
    role: str
    expires_at: datetime


class CollaboratorSetPasswordRequest(BaseModel):
    """Schema for collaborator password setup."""
    password: str = Field(..., min_length=12, description="New password")
    confirm_password: str = Field(..., min_length=12, description="Password confirmation")
    enable_2fa: Optional[bool] = Field(False, description="Whether to enable 2FA")


class CollaboratorSetPasswordResponse(BaseModel):
    """Schema for collaborator password setup response."""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    two_fa_setup: Optional[dict] = None
    user: Optional[dict] = None


class CollaboratorResponse(BaseModel):
    """Schema for collaborator information."""
    id: int
    username: str
    email: str
    name: Optional[str]
    role: str
    status: str
    two_factor_enabled: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    invited_by: Optional[str] = None


class UpdateCollaboratorRequest(BaseModel):
    """Schema for updating collaborator role."""
    role: str = Field(..., description="New role (admin, editor, viewer)")


class UpdateCollaboratorResponse(BaseModel):
    """Schema for update collaborator response."""
    success: bool
    message: str
    user: CollaboratorResponse


class CollaboratorListResponse(BaseModel):
    """Schema for listing collaborators."""
    success: bool
    collaborators: List[CollaboratorResponse]
    total: int


class RemoveCollaboratorResponse(BaseModel):
    """Schema for removing collaborator response."""
    success: bool
    message: str


class AuditLogResponse(BaseModel):
    """Schema for audit log entry."""
    id: int
    user_id: Optional[int]
    username: Optional[str]
    email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


class AuditLogListResponse(BaseModel):
    """Schema for listing audit logs."""
    success: bool
    logs: List[AuditLogResponse]
    total: int
    limit: int
    offset: int


class AuditLogFilters(BaseModel):
    """Schema for audit log filtering."""
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)