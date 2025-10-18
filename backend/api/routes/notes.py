from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from db.models import Note
from core.database import get_session
from pydantic import BaseModel

router = APIRouter(prefix="/api/notes", tags=["notes"])


class NoteCreate(BaseModel):
    title: str
    content: str
    context_type: str
    context_id: Optional[int] = None
    workspace_id: int


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


@router.get("/", response_model=List[Note])
def get_notes(
    context_type: Optional[str] = None,
    context_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """Get notes with optional filtering"""
    query = select(Note)
    
    if context_type:
        query = query.where(Note.context_type == context_type)
    if context_id:
        query = query.where(Note.context_id == context_id)
    if workspace_id:
        query = query.where(Note.workspace_id == workspace_id)
    
    notes = session.exec(query).all()
    return notes


@router.post("/", response_model=Note)
def create_note(note_data: NoteCreate, session: Session = Depends(get_session)):
    """Create a new note"""
    note = Note(**note_data.model_dump())
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.get("/{note_id}", response_model=Note)
def get_note(note_id: int, session: Session = Depends(get_session)):
    """Get a specific note"""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=Note)
def update_note(
    note_id: int, 
    note_data: NoteUpdate, 
    session: Session = Depends(get_session)
):
    """Update a note"""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    for field, value in note_data.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(note_id: int, session: Session = Depends(get_session)):
    """Delete a note"""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    session.delete(note)
    session.commit()
    return {"message": "Note deleted successfully"}