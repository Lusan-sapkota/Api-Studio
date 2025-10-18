from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import json
import asyncio
from datetime import datetime
import tempfile
import os

router = APIRouter(prefix="/api/grpc", tags=["grpc"])

class GrpcConnectionRequest(BaseModel):
    endpoint: str
    use_tls: bool = False
    metadata: Optional[Dict[str, str]] = {}

class GrpcCallRequest(BaseModel):
    endpoint: str
    service: str
    method: str
    request_data: Dict[str, Any]
    metadata: Optional[Dict[str, str]] = {}
    use_tls: bool = False

class ProtoFile(BaseModel):
    content: str
    filename: str

class GrpcResponse(BaseModel):
    response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status: str
    response_time: float
    metadata: Dict[str, str] = {}

# Mock gRPC services for demonstration
MOCK_SERVICES = {
    "UserService": {
        "methods": {
            "GetUser": {
                "input_type": "GetUserRequest",
                "output_type": "User",
                "streaming": {"client": False, "server": False}
            },
            "ListUsers": {
                "input_type": "ListUsersRequest", 
                "output_type": "User",
                "streaming": {"client": False, "server": True}
            },
            "CreateUser": {
                "input_type": "CreateUserRequest",
                "output_type": "User", 
                "streaming": {"client": False, "server": False}
            }
        }
    },
    "ProductService": {
        "methods": {
            "GetProduct": {
                "input_type": "GetProductRequest",
                "output_type": "Product",
                "streaming": {"client": False, "server": False}
            },
            "SearchProducts": {
                "input_type": "SearchRequest",
                "output_type": "Product",
                "streaming": {"client": False, "server": True}
            }
        }
    }
}

MOCK_MESSAGES = {
    "GetUserRequest": {
        "fields": [
            {"name": "id", "type": "string", "number": 1}
        ]
    },
    "User": {
        "fields": [
            {"name": "id", "type": "string", "number": 1},
            {"name": "name", "type": "string", "number": 2},
            {"name": "email", "type": "string", "number": 3},
            {"name": "created_at", "type": "google.protobuf.Timestamp", "number": 4}
        ]
    },
    "CreateUserRequest": {
        "fields": [
            {"name": "name", "type": "string", "number": 1},
            {"name": "email", "type": "string", "number": 2}
        ]
    }
}

@router.post("/connect")
async def test_grpc_connection(request: GrpcConnectionRequest):
    """Test gRPC server connection"""
    try:
        # Simulate connection test
        await asyncio.sleep(0.5)  # Simulate network delay
        
        # Mock successful connection
        return {
            "status": "connected",
            "endpoint": request.endpoint,
            "tls": request.use_tls,
            "services": list(MOCK_SERVICES.keys()),
            "message": "Successfully connected to gRPC server"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

@router.post("/call", response_model=GrpcResponse)
async def make_grpc_call(request: GrpcCallRequest):
    """Make a gRPC method call"""
    try:
        start_time = datetime.now()
        
        # Validate service and method exist
        if request.service not in MOCK_SERVICES:
            raise HTTPException(status_code=404, detail=f"Service '{request.service}' not found")
        
        service = MOCK_SERVICES[request.service]
        if request.method not in service["methods"]:
            raise HTTPException(status_code=404, detail=f"Method '{request.method}' not found in service '{request.service}'")
        
        # Simulate gRPC call delay
        await asyncio.sleep(0.2 + (len(str(request.request_data)) / 1000))
        
        # Generate mock response based on method
        mock_response = generate_mock_response(request.service, request.method, request.request_data)
        
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        return GrpcResponse(
            response=mock_response,
            status="OK",
            response_time=response_time,
            metadata={"content-type": "application/grpc", "grpc-status": "0"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        return GrpcResponse(
            error=str(e),
            status="ERROR",
            response_time=response_time,
            metadata={"grpc-status": "2", "grpc-message": str(e)}
        )

def generate_mock_response(service: str, method: str, request_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate mock response based on service and method"""
    
    if service == "UserService":
        if method == "GetUser":
            return {
                "id": request_data.get("id", "user_123"),
                "name": "John Doe",
                "email": "john@example.com",
                "created_at": datetime.now().isoformat()
            }
        elif method == "CreateUser":
            return {
                "id": f"user_{int(datetime.now().timestamp())}",
                "name": request_data.get("name", "New User"),
                "email": request_data.get("email", "user@example.com"),
                "created_at": datetime.now().isoformat()
            }
        elif method == "ListUsers":
            return [
                {"id": "user_1", "name": "Alice", "email": "alice@example.com"},
                {"id": "user_2", "name": "Bob", "email": "bob@example.com"},
                {"id": "user_3", "name": "Charlie", "email": "charlie@example.com"}
            ]
    
    elif service == "ProductService":
        if method == "GetProduct":
            return {
                "id": request_data.get("id", "product_123"),
                "name": "Sample Product",
                "price": 29.99,
                "description": "A sample product for testing"
            }
        elif method == "SearchProducts":
            query = request_data.get("query", "")
            return [
                {"id": "product_1", "name": f"Product matching '{query}'", "price": 19.99},
                {"id": "product_2", "name": f"Another product for '{query}'", "price": 39.99}
            ]
    
    return {"message": "Mock response", "timestamp": datetime.now().isoformat()}

@router.get("/services")
async def list_services():
    """List available gRPC services and methods"""
    return {
        "services": MOCK_SERVICES,
        "messages": MOCK_MESSAGES
    }

@router.post("/upload-proto")
async def upload_proto_file(file: UploadFile = File(...)):
    """Upload and parse a .proto file"""
    try:
        if not file.filename.endswith('.proto'):
            raise HTTPException(status_code=400, detail="File must be a .proto file")
        
        content = await file.read()
        proto_content = content.decode('utf-8')
        
        # In a real implementation, you would parse the proto file
        # For now, we'll just return the content and mock parsed data
        
        return {
            "filename": file.filename,
            "content": proto_content,
            "parsed_services": MOCK_SERVICES,  # Mock parsed services
            "parsed_messages": MOCK_MESSAGES,  # Mock parsed messages
            "status": "success",
            "message": "Proto file uploaded and parsed successfully"
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid proto file encoding")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process proto file: {str(e)}")

@router.post("/generate-request")
async def generate_request_template(service: str, method: str):
    """Generate a request template for a specific method"""
    try:
        if service not in MOCK_SERVICES:
            raise HTTPException(status_code=404, detail=f"Service '{service}' not found")
        
        service_def = MOCK_SERVICES[service]
        if method not in service_def["methods"]:
            raise HTTPException(status_code=404, detail=f"Method '{method}' not found")
        
        method_def = service_def["methods"][method]
        input_type = method_def["input_type"]
        
        if input_type in MOCK_MESSAGES:
            template = {}
            for field in MOCK_MESSAGES[input_type]["fields"]:
                field_name = field["name"]
                field_type = field["type"]
                
                # Generate default values based on type
                if field_type == "string":
                    template[field_name] = ""
                elif field_type in ["int32", "int64"]:
                    template[field_name] = 0
                elif field_type == "bool":
                    template[field_name] = False
                elif field_type == "double" or field_type == "float":
                    template[field_name] = 0.0
                else:
                    template[field_name] = None
            
            return {
                "service": service,
                "method": method,
                "input_type": input_type,
                "template": template
            }
        
        return {
            "service": service,
            "method": method,
            "input_type": input_type,
            "template": {}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")

@router.get("/reflection/{endpoint}")
async def server_reflection(endpoint: str):
    """Perform gRPC server reflection"""
    try:
        # Mock server reflection response
        await asyncio.sleep(0.3)  # Simulate reflection call
        
        return {
            "endpoint": endpoint,
            "services": MOCK_SERVICES,
            "messages": MOCK_MESSAGES,
            "reflection_supported": True,
            "server_info": {
                "version": "1.0.0",
                "capabilities": ["reflection", "health_check"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server reflection failed: {str(e)}")

@router.get("/health/{endpoint}")
async def check_server_health(endpoint: str):
    """Check gRPC server health"""
    try:
        # Mock health check
        await asyncio.sleep(0.1)
        
        return {
            "endpoint": endpoint,
            "status": "SERVING",
            "timestamp": datetime.now().isoformat(),
            "response_time": 100  # ms
        }
        
    except Exception as e:
        return {
            "endpoint": endpoint,
            "status": "NOT_SERVING",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }