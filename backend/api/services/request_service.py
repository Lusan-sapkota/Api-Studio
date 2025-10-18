from sqlmodel import Session
from typing import List, Optional
from db.models import Request
from api.schemas.request_schemas import RequestCreate, RequestUpdate


class RequestService:
    @staticmethod
    def get_requests(session: Session, collection_id: Optional[int] = None) -> List[Request]:
        query = session.query(Request)
        if collection_id:
            query = query.filter(Request.collection_id == collection_id)
        return query.all()

    @staticmethod
    def get_request(session: Session, request_id: int) -> Optional[Request]:
        return session.get(Request, request_id)

    @staticmethod
    def create_request(session: Session, request_data: RequestCreate) -> Request:
        request = Request(**request_data.dict())
        session.add(request)
        session.commit()
        session.refresh(request)
        return request

    @staticmethod
    def update_request(session: Session, request_id: int, update_data: RequestUpdate) -> Optional[Request]:
        request = session.get(Request, request_id)
        if not request:
            return None
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(request, field, value)
        session.commit()
        session.refresh(request)
        return request

    @staticmethod
    def delete_request(session: Session, request_id: int) -> bool:
        request = session.get(Request, request_id)
        if not request:
            return False
        session.delete(request)
        session.commit()
        return True