from fastapi import APIRouter, Depends, HTTPException, Request as FastAPIRequest
from sqlmodel import Session
from typing import List
from core.database import get_session
from core.rbac import (
    require_request_create, require_request_view, require_request_edit,
    require_request_delete, require_request_send, require_request_access, 
    Permission, RBACService
)
from core.middleware import get_current_user
from api.schemas.request_schemas import RequestCreate, RequestUpdate, RequestResponse
from api.services.request_service import RequestService
import httpx
from pydantic import BaseModel

router = APIRouter(prefix="/requests", tags=["requests"])


class SendRequestData(BaseModel):
    method: str
    url: str
    headers: dict = {}
    body: str = None


class SendRequestResponse(BaseModel):
    status_code: int
    headers: dict
    body: str
    response_time: float


@router.post("/send", response_model=SendRequestResponse)
async def send_request(
    request_data: SendRequestData,
    request: FastAPIRequest,
    current_user: dict = Depends(require_request_send)
):
    """Send an HTTP request to an external API. All authenticated users can send requests."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Prepare request
            method = request_data.method.upper()
            url = request_data.url
            headers = request_data.headers or {}
            body = request_data.body

            # Send request
            import time
            start_time = time.time()

            if method == "GET":
                response = await client.get(url, headers=headers)
            elif method == "POST":
                response = await client.post(url, headers=headers, content=body)
            elif method == "PUT":
                response = await client.put(url, headers=headers, content=body)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers)
            elif method == "PATCH":
                response = await client.patch(url, headers=headers, content=body)
            elif method == "HEAD":
                response = await client.head(url, headers=headers)
            elif method == "OPTIONS":
                response = await client.options(url, headers=headers)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")

            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # milliseconds

            # Return response
            return SendRequestResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                body=response.text,
                response_time=round(response_time, 2)
            )

    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/", response_model=List[RequestResponse])
def get_requests(
    collection_id: int = None, 
    request: FastAPIRequest = None,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_request_view)
):
    """Get requests. Users can only see requests in collections they have access to."""
    if collection_id:
        # Check collection access if specified
        if current_user and not RBACService.can_access_collection(
            current_user, collection_id, session, Permission.VIEW_COLLECTION
        ):
            raise HTTPException(status_code=403, detail="Access denied to collection")
    
    return RequestService.get_requests(session, collection_id)


@router.get("/{request_id}", response_model=RequestResponse)
def get_request(
    request_id: int, 
    request: FastAPIRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_request_access(Permission.VIEW_REQUEST))
):
    """Get a specific request. Users can only access requests in collections they own."""
    api_request = RequestService.get_request(session, request_id)
    if not api_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return api_request


@router.post("/", response_model=RequestResponse)
def create_request(
    request_data: RequestCreate, 
    request: FastAPIRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_request_create)
):
    """Create a new request. Users must have access to the target collection."""
    # Check collection access
    if current_user and not RBACService.can_access_collection(
        current_user, request_data.collection_id, session, Permission.CREATE_REQUEST
    ):
        raise HTTPException(status_code=403, detail="Access denied to collection")
    
    return RequestService.create_request(session, request_data)


@router.put("/{request_id}", response_model=RequestResponse)
def update_request(
    request_id: int, 
    update_data: RequestUpdate, 
    request: FastAPIRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_request_access(Permission.EDIT_REQUEST))
):
    """Update a request. Users can only update requests in collections they own."""
    api_request = RequestService.update_request(session, request_id, update_data)
    if not api_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return api_request


@router.delete("/{request_id}")
def delete_request(
    request_id: int, 
    request: FastAPIRequest,
    session: Session = Depends(get_session),
    current_user: dict = Depends(require_request_access(Permission.DELETE_REQUEST))
):
    """Delete a request. Users can only delete requests in collections they own."""
    success = RequestService.delete_request(session, request_id)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted"}


class HistoryItem(BaseModel):
    id: str
    title: str
    method: str
    url: str
    headers: List[dict] = []
    params: List[dict] = []
    body: str = ""
    bodyType: str = "json"
    authType: str = "none"
    authData: dict = {}
    response: dict = None
    timestamp: str


@router.post("/history", response_model=dict)
async def save_to_history(
    history_item: HistoryItem,
    request: FastAPIRequest,
    current_user: dict = Depends(require_request_send)
):
    """Save a request to history. All authenticated users can save to history."""
    # In a real app, you'd save this to a database
    # For now, we'll just return success since the frontend handles localStorage
    return {"message": "Request saved to history", "id": history_item.id}


@router.get("/history", response_model=List[HistoryItem])
async def get_history(
    request: FastAPIRequest,
    current_user: dict = Depends(require_request_view)
):
    """Get request history. All authenticated users can view their history."""
    # In a real app, you'd fetch from database
    # For now, return empty list since frontend uses localStorage
    return []