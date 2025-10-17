import pytest
from sqlmodel import Session
from api.services.workspace_service import WorkspaceService
from api.schemas.workspace_schemas import WorkspaceCreate


def test_create_workspace(session: Session):
    workspace_data = WorkspaceCreate(
        name="Test Workspace",
        description="A test workspace"
    )
    workspace = WorkspaceService.create_workspace(session, workspace_data, owner_id=1)
    assert workspace.name == "Test Workspace"
    assert workspace.owner_id == 1


def test_get_workspace(session: Session):
    workspace = WorkspaceService.get_workspace(session, 1)
    assert workspace is not None


# TODO: Add more comprehensive tests