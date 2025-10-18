from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from core.database import get_session
from db.models import Environment
from pydantic import BaseModel

# Enhanced schemas for environments
class EnvironmentBase(BaseModel):
    name: str
    description: str = None
    variables: dict = {}
    workspace_id: int
    active: bool = False

class EnvironmentCreate(EnvironmentBase):
    pass

class EnvironmentUpdate(BaseModel):
    name: str = None
    description: str = None
    variables: dict = None
    active: bool = None

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
async def create_environment(environment_data: EnvironmentCreate, session: Session = Depends(get_session)):
    # If this environment is being set as active, deactivate others in the same workspace
    if environment_data.active:
        session.query(Environment).filter(
            Environment.workspace_id == environment_data.workspace_id,
            Environment.active == True
        ).update({"active": False})
    
    environment = Environment(**environment_data.dict())
    session.add(environment)
    session.commit()
    session.refresh(environment)
    return environment


@router.put("/{environment_id}", response_model=EnvironmentResponse)
async def update_environment(environment_id: int, update_data: EnvironmentUpdate, session: Session = Depends(get_session)):
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    
    # If setting this environment as active, deactivate others in the same workspace
    if update_dict.get("active"):
        session.query(Environment).filter(
            Environment.workspace_id == environment.workspace_id,
            Environment.id != environment_id,
            Environment.active == True
        ).update({"active": False})
    
    for key, value in update_dict.items():
        setattr(environment, key, value)
    
    session.commit()
    session.refresh(environment)
    return environment


@router.post("/{environment_id}/activate", response_model=EnvironmentResponse)
async def activate_environment(environment_id: int, session: Session = Depends(get_session)):
    environment = session.get(Environment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    # Deactivate all other environments in the same workspace
    session.query(Environment).filter(
        Environment.workspace_id == environment.workspace_id,
        Environment.active == True
    ).update({"active": False})
    
    # Activate this environment
    environment.active = True
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