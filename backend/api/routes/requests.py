from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from core.database import get_session
from api.schemas.request_schemas import RequestCreate, RequestUpdate, RequestResponse
from api.services.request_service import RequestService

router = APIRouter(prefix="/requests", tags=["requests"])


@router.get("/", response_model=List[RequestResponse])
def get_requests(collection_id: int = None, session: Session = Depends(get_session)):
    return RequestService.get_requests(session, collection_id)


@router.get("/{request_id}", response_model=RequestResponse)
def get_request(request_id: int, session: Session = Depends(get_session)):
    request = RequestService.get_request(session, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.post("/", response_model=RequestResponse)
def create_request(request_data: RequestCreate, session: Session = Depends(get_session)):
    return RequestService.create_request(session, request_data)


@router.put("/{request_id}", response_model=RequestResponse)
def update_request(request_id: int, update_data: RequestUpdate, session: Session = Depends(get_session)):
    request = RequestService.update_request(session, request_id, update_data)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.delete("/{request_id}")
def delete_request(request_id: int, session: Session = Depends(get_session)):
    success = RequestService.delete_request(session, request_id)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted"}