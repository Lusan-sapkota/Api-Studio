from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from core.database import get_session
from api.schemas.doc_schemas import DocCreate, DocUpdate, DocResponse
from api.services.doc_service import DocService

router = APIRouter(prefix="/docs", tags=["docs"])


@router.get("/", response_model=List[DocResponse])
def get_docs(request_id: int = None, session: Session = Depends(get_session)):
    return DocService.get_docs(session, request_id)


@router.get("/{doc_id}", response_model=DocResponse)
def get_doc(doc_id: int, session: Session = Depends(get_session)):
    doc = DocService.get_doc(session, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doc not found")
    return doc


@router.post("/", response_model=DocResponse)
def create_doc(doc_data: DocCreate, session: Session = Depends(get_session)):
    return DocService.create_doc(session, doc_data)


@router.put("/{doc_id}", response_model=DocResponse)
def update_doc(doc_id: int, update_data: DocUpdate, session: Session = Depends(get_session)):
    doc = DocService.update_doc(session, doc_id, update_data)
    if not doc:
        raise HTTPException(status_code=404, detail="Doc not found")
    return doc


@router.delete("/{doc_id}")
def delete_doc(doc_id: int, session: Session = Depends(get_session)):
    success = DocService.delete_doc(session, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Doc not found")
    return {"message": "Doc deleted"}


@router.post("/generate/{request_id}", response_model=DocResponse)
def generate_doc_from_request(request_id: int, request_data: dict, session: Session = Depends(get_session)):
    # TODO: Get actual request data from database
    return DocService.generate_doc_from_request_data(session, request_data, request_id)