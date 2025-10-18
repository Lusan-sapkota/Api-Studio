from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from db.models import Task
from core.database import get_session
from pydantic import BaseModel

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    context_type: str
    context_id: Optional[int] = None
    workspace_id: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


@router.get("/", response_model=List[Task])
def get_tasks(
    context_type: Optional[str] = None,
    context_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get tasks with optional filtering"""
    query = select(Task)
    
    if context_type:
        query = query.where(Task.context_type == context_type)
    if context_id:
        query = query.where(Task.context_id == context_id)
    if workspace_id:
        query = query.where(Task.workspace_id == workspace_id)
    if status:
        query = query.where(Task.status == status)
    
    tasks = session.exec(query).all()
    return tasks


@router.post("/", response_model=Task)
def create_task(task_data: TaskCreate, session: Session = Depends(get_session)):
    """Create a new task"""
    task = Task(**task_data.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: int, session: Session = Depends(get_session)):
    """Get a specific task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=Task)
def update_task(
    task_id: int, 
    task_data: TaskUpdate, 
    session: Session = Depends(get_session)
):
    """Update a task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for field, value in task_data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    """Delete a task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully"}