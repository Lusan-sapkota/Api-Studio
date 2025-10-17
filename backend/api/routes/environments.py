from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from core.database import get_session
from db.models import Environment
from pydantic import BaseModel

# Placeholder schemas
class EnvironmentBase(BaseModel):
    name: str
    variables: dict = {}
    workspace_id: int

class EnvironmentResponse(EnvironmentBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

router = APIRouter(prefix="/environments", tags=["environments"])


@router.get("/", response_model=List[EnvironmentResponse])
async def get_environments(workspace_id: int = None, session: Session = Depends(get_session)):
    query = session.query(Environment)
    if workspace_id:
        query = query.filter(Environment.workspace_id == workspace_id)
    return query.all()


@router.get("/{environment_id}", response_model=EnvironmentResponse)
async def get_environment(environment_id: int, session: Session = Depends(get_session)):
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    return environment


@router.post("/", response_model=EnvironmentResponse)
async def create_environment(environment_data: EnvironmentBase, session: Session = Depends(get_session)):
    environment = Environment(**environment_data.dict())
    session.add(environment)
    session.commit()
    session.refresh(environment)
    return environment


@router.put("/{environment_id}", response_model=EnvironmentResponse)
async def update_environment(environment_id: int, update_data: dict, session: Session = Depends(get_session)):
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    for key, value in update_data.items():
        setattr(environment, key, value)
    session.commit()
    session.refresh(environment)
    return environment


@router.delete("/{environment_id}")
async def delete_environment(environment_id: int, session: Session = Depends(get_session)):
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    session.delete(environment)
    session.commit()
    return {"message": "Environment deleted"}