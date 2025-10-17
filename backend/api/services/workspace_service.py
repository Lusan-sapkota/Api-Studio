from sqlmodel import Session
from typing import List, Optional
from db.models import Workspace
from api.schemas.workspace_schemas import WorkspaceCreate, WorkspaceUpdate


class WorkspaceService:
    @staticmethod
    def get_workspaces(session: Session, owner_id: Optional[int] = None) -> List[Workspace]:
        query = session.query(Workspace)
        if owner_id:
            query = query.filter(Workspace.owner_id == owner_id)
        return query.all()

    @staticmethod
    def get_workspace(session: Session, workspace_id: int) -> Optional[Workspace]:
        return session.get(Workspace, workspace_id)

    @staticmethod
    def create_workspace(session: Session, workspace_data: WorkspaceCreate, owner_id: int) -> Workspace:
        workspace = Workspace(**workspace_data.dict(), owner_id=owner_id)
        session.add(workspace)
        session.commit()
        session.refresh(workspace)
        return workspace

    @staticmethod
    def update_workspace(session: Session, workspace_id: int, update_data: WorkspaceUpdate) -> Optional[Workspace]:
        workspace = session.get(Workspace, workspace_id)
        if not workspace:
            return None
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(workspace, field, value)
        session.commit()
        session.refresh(workspace)
        return workspace

    @staticmethod
    def delete_workspace(session: Session, workspace_id: int) -> bool:
        workspace = session.get(Workspace, workspace_id)
        if not workspace:
            return False
        session.delete(workspace)
        session.commit()
        return True