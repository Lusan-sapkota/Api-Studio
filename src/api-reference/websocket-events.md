# WebSocket Events Reference

API Studio uses WebSockets for real-time communication and WebSocket client functionality. This document describes all WebSocket events and their payloads.

## Base WebSocket Endpoints

### Main WebSocket Connection
```
ws://localhost:58123/ws
```
Used for general real-time updates and collaboration features.

### WebSocket Client Proxy
```
ws://localhost:58123/api/websocket/connect/{client_id}
```
Used for proxying connections to external WebSocket servers through the WebSocket client.

## WebSocket Client Events

The WebSocket client uses a proxy pattern where the backend establishes connections to external WebSocket servers on behalf of the frontend client.

### Client to Server Events

#### Connect to External WebSocket
```json
{
  "type": "connect_external",
  "url": "wss://echo.websocket.org",
  "protocols": ["protocol1", "protocol2"],
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

**Parameters:**
- `url` (string, required): The WebSocket URL to connect to
- `protocols` (array, optional): List of WebSocket subprotocols
- `headers` (object, optional): Additional headers for the connection

#### Send Message to External WebSocket
```json
{
  "type": "send_message",
  "content": "Hello WebSocket server!",
  "message_type": "text"
}
```

**Parameters:**
- `content` (string, required): Message content to send
- `message_type` (string, optional): Type of message ("text" or "binary")

#### Disconnect from External WebSocket
```json
{
  "type": "disconnect_external"
}
```

### Server to Client Events

#### Connection Status Updates
```json
{
  "type": "connection_status",
  "status": "connected",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**Status Values:**
- `connected`: Successfully connected to external WebSocket
- `disconnected`: Disconnected from external WebSocket
- `connecting`: Attempting to connect
- `error`: Connection failed

#### Connection Errors
```json
{
  "type": "connection_error",
  "error": "Connection refused",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Message Received from External WebSocket
```json
{
  "type": "message_received",
  "content": "Response from server",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Message Send Confirmation
```json
{
  "type": "message_sent",
  "content": "Original message content",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Send Error
```json
{
  "type": "send_error",
  "error": "Failed to send message",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Real-time Collaboration Events

*Note: Real-time collaboration features are currently in development.*

### Planned Collaboration Events

#### User Presence
```json
{
  "type": "user_presence",
  "user_id": "user123",
  "status": "online",
  "workspace_id": "workspace456"
}
```

#### Collection Updates
```json
{
  "type": "collection_updated",
  "collection_id": "collection789",
  "changes": {
    "name": "New Collection Name",
    "updated_by": "user123"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Request Sharing
```json
{
  "type": "request_shared",
  "request_id": "request456",
  "shared_by": "user123",
  "shared_with": ["user456", "user789"],
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Connection Management

### Connection Manager

The backend maintains active connections using a `ConnectionManager` class:

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.external_connections: Dict[str, websockets.WebSocketClientProtocol] = {}
```

### Active Connections API

Get information about active WebSocket connections:

```http
GET /api/websocket/active-connections
```

**Response:**
```json
{
  "active_connections": ["client1", "client2"],
  "external_connections": ["client1"]
}
```

## Error Handling

### Common Error Types

#### Invalid Message Format
```json
{
  "type": "error",
  "error": "Invalid message format",
  "code": "INVALID_FORMAT",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Connection Timeout
```json
{
  "type": "connection_error",
  "error": "Connection timeout",
  "code": "TIMEOUT",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

#### Authentication Error
```json
{
  "type": "connection_error",
  "error": "Authentication failed",
  "code": "AUTH_FAILED",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Usage Examples

### JavaScript Client Example

```javascript
// Connect to WebSocket client proxy
const ws = new WebSocket('ws://localhost:58123/api/websocket/connect/client123');

// Connect to external WebSocket
ws.send(JSON.stringify({
  type: 'connect_external',
  url: 'wss://echo.websocket.org',
  protocols: []
}));

// Send message to external WebSocket
ws.send(JSON.stringify({
  type: 'send_message',
  content: 'Hello World!'
}));

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'connection_status':
      console.log('Connection status:', message.status);
      break;
    case 'message_received':
      console.log('Received:', message.content);
      break;
    case 'connection_error':
      console.error('Error:', message.error);
      break;
  }
};

// Disconnect from external WebSocket
ws.send(JSON.stringify({
  type: 'disconnect_external'
}));
```

### Python Client Example

```python
import asyncio
import websockets
import json

async def websocket_client():
    uri = "ws://localhost:58123/api/websocket/connect/client123"
    
    async with websockets.connect(uri) as websocket:
        # Connect to external WebSocket
        await websocket.send(json.dumps({
            "type": "connect_external",
            "url": "wss://echo.websocket.org"
        }))
        
        # Send a message
        await websocket.send(json.dumps({
            "type": "send_message",
            "content": "Hello from Python!"
        }))
        
        # Listen for responses
        async for message in websocket:
            data = json.loads(message)
            print(f"Received: {data}")

# Run the client
asyncio.run(websocket_client())
```

## Testing WebSocket Connections

### Test Connection Endpoint

Before establishing a persistent WebSocket connection, you can test connectivity:

```http
POST /api/websocket/test-connection
Content-Type: application/json

{
  "url": "wss://echo.websocket.org",
  "protocols": [],
  "headers": {}
}
```

**Response:**
```json
{
  "status": "success",
  "message": "WebSocket connection test successful",
  "url": "wss://echo.websocket.org"
}
```

## Security Considerations

### Connection Limits
- Maximum 10 concurrent external connections per client
- Connection timeout: 30 seconds
- Message size limit: 1MB

### Headers and Authentication
- Custom headers are supported for external connections
- Bearer tokens and API keys can be passed through headers
- SSL/TLS connections are supported for secure WebSocket connections

### Rate Limiting
- Maximum 100 messages per minute per connection
- Automatic disconnection on rate limit exceeded

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if the external WebSocket server is running
2. **Authentication Failed**: Verify headers and credentials
3. **Message Not Sent**: Check connection status before sending
4. **Timeout**: Increase timeout or check network connectivity

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
WEBSOCKET_DEBUG=true
```

This will log all WebSocket events and connection details to the console.