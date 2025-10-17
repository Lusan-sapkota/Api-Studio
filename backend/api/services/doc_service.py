from sqlmodel import Session
from typing import List, Optional
from db.models import Doc
from api.schemas.doc_schemas import DocCreate, DocUpdate
from docs.generator import generate_doc_from_request


class DocService:
    @staticmethod
    def get_docs(session: Session, request_id: Optional[int] = None) -> List[Doc]:
        query = session.query(Doc)
        if request_id:
            query = query.filter(Doc.request_id == request_id)
        return query.all()

    @staticmethod
    def get_doc(session: Session, doc_id: int) -> Optional[Doc]:
        return session.get(Doc, doc_id)

    @staticmethod
    def create_doc(session: Session, doc_data: DocCreate) -> Doc:
        doc = Doc(**doc_data.dict())
        session.add(doc)
        session.commit()
        session.refresh(doc)
        return doc

    @staticmethod
    def update_doc(session: Session, doc_id: int, update_data: DocUpdate) -> Optional[Doc]:
        doc = session.get(Doc, doc_id)
        if not doc:
            return None
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(doc, field, value)
        session.commit()
        session.refresh(doc)
        return doc

    @staticmethod
    def delete_doc(session: Session, doc_id: int) -> bool:
        doc = session.get(Doc, doc_id)
        if not doc:
            return False
        session.delete(doc)
        session.commit()
        return True

    @staticmethod
    def generate_doc_from_request_data(session: Session, request_data: dict, request_id: int) -> Doc:
        """
        Generate documentation from request data.
        TODO: Integrate with real doc generation logic.
        """
        content = generate_doc_from_request(request_data)
        doc_data = DocCreate(
            title=f"Documentation for Request {request_id}",
            content=content,
            request_id=request_id
        )
        return DocService.create_doc(session, doc_data)