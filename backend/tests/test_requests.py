import pytest
from sqlmodel import Session
from api.services.request_service import RequestService
from api.schemas.request_schemas import RequestCreate


def test_create_request(session: Session):
    request_data = RequestCreate(
        method="GET",
        url="https://api.example.com/test",
        collection_id=1
    )
    request = RequestService.create_request(session, request_data)
    assert request.method == "GET"
    assert request.url == "https://api.example.com/test"


def test_get_request(session: Session):
    # Assuming a request exists
    request = RequestService.get_request(session, 1)
    assert request is not None


# TODO: Add more comprehensive tests