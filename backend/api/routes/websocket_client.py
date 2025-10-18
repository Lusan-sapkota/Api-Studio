from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import asyncio
import websockets
from datetime import datetime

router = APIRouter(prefix="/api/websocket", tags=["websocket"])

class WebSocketConnectionRequest(BaseModel):
    url: str
    protocols: Optional[List[str]] = []
    headers: Optional[Dict[str, str]] = {}

class WebSocketMessage(BaseModel):
    content: str
    message_type: str = "text"  # text or binary

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.external_connections: Dict[str, websockets.WebSocketClientProtocol] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.external_connections:
            asyncio.create_task(self.external_connections[client_id].close())
            del self.external_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@router.websocket("/connect/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "connect_external":
                # Connect to external WebSocket
                try:
                    external_ws = await websockets.connect(
                        message_data["url"],
                        subprotocols=message_data.get("protocols", [])
                    )
                    manager.external_connections[client_id] = external_ws
                    
                    # Start listening for messages from external WebSocket
                    asyncio.create_task(listen_external_websocket(client_id, external_ws))
                    
                    await manager.send_personal_message(json.dumps({
                        "type": "connection_status",
                        "status": "connected",
                        "timestamp": datetime.now().isoformat()
                    }), client_id)
                    
                except Exception as e:
                    await manager.send_personal_message(json.dumps({
                        "type": "connection_error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }), client_id)
            
            elif message_data.get("type") == "send_message":
                # Send message to external WebSocket
                if client_id in manager.external_connections:
                    try:
                        await manager.external_connections[client_id].send(message_data["content"])
                        await manager.send_personal_message(json.dumps({
                            "type": "message_sent",
                            "content": message_data["content"],
                            "timestamp": datetime.now().isoformat()
                        }), client_id)
                    except Exception as e:
                        await manager.send_personal_message(json.dumps({
                            "type": "send_error",
                            "error": str(e),
                            "timestamp": datetime.now().isoformat()
                        }), client_id)
            
            elif message_data.get("type") == "disconnect_external":
                # Disconnect from external WebSocket
                if client_id in manager.external_connections:
                    await manager.external_connections[client_id].close()
                    del manager.external_connections[client_id]
                    await manager.send_personal_message(json.dumps({
                        "type": "connection_status",
                        "status": "disconnected",
                        "timestamp": datetime.now().isoformat()
                    }), client_id)
                    
    except WebSocketDisconnect:
        manager.disconnect(client_id)

async def listen_external_websocket(client_id: str, external_ws: websockets.WebSocketClientProtocol):
    """Listen for messages from external WebSocket and forward to client"""
    try:
        async for message in external_ws:
            await manager.send_personal_message(json.dumps({
                "type": "message_received",
                "content": message,
                "timestamp": datetime.now().isoformat()
            }), client_id)
    except websockets.exceptions.ConnectionClosed:
        await manager.send_personal_message(json.dumps({
            "type": "connection_status",
            "status": "disconnected",
            "reason": "External connection closed",
            "timestamp": datetime.now().isoformat()
        }), client_id)
    except Exception as e:
        await manager.send_personal_message(json.dumps({
            "type": "connection_error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), client_id)

@router.post("/test-connection")
async def test_websocket_connection(request: WebSocketConnectionRequest):
    """Test WebSocket connection without establishing persistent connection"""
    try:
        # Test connection
        async with websockets.connect(
            request.url,
            subprotocols=request.protocols,
            extra_headers=request.headers
        ) as websocket:
            # Send a ping to test the connection
            await websocket.ping()
            
        return {
            "status": "success",
            "message": "WebSocket connection test successful",
            "url": request.url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"WebSocket connection failed: {str(e)}")

@router.get("/active-connections")
async def get_active_connections():
    """Get list of active WebSocket connections"""
    return {
        "active_connections": list(manager.active_connections.keys()),
        "external_connections": list(manager.external_connections.keys())
    }