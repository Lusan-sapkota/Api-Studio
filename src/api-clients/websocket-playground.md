# WebSocket Playground

The WebSocket Playground enables real-time testing of WebSocket connections with message history, auto-reconnection, and comprehensive connection monitoring.

## Features

- **Real-time Connection**: Persistent WebSocket connections with status monitoring
- **Message History**: Complete history of sent and received messages
- **Auto-reconnection**: Automatic reconnection with exponential backoff
- **Message Types**: Support for both text and JSON message formats
- **Connection Status**: Real-time connection status and error reporting

## Getting Started

1. **Enter URL**: Input your WebSocket endpoint (ws:// or wss://)
2. **Configure Protocols**: Add subprotocols if required
3. **Connect**: Establish the WebSocket connection
4. **Send Messages**: Type and send messages in real-time
5. **Monitor**: View all communication in the message history

## Connection Examples

### Basic WebSocket
```
ws://localhost:8080/websocket
```

### Secure WebSocket with Authentication
```
wss://api.example.com/ws?token=your-auth-token
```

### With Subprotocols
```
ws://localhost:8080/chat
Protocols: chat, echo
```

## Message Formats

### Text Messages
```
Hello, WebSocket!
```

### JSON Messages
```json
{
  "type": "message",
  "content": "Hello from API Studio",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Connection Management

### Auto-reconnection
- Automatically attempts to reconnect on connection loss
- Uses exponential backoff to prevent overwhelming the server
- Configurable maximum retry attempts
- Visual indicators for connection status

### Connection Status
- **Connected**: Green indicator, ready to send/receive
- **Connecting**: Yellow indicator, establishing connection
- **Disconnected**: Red indicator, connection lost
- **Error**: Red indicator with error details

## Message History

The message history shows:
- **Sent Messages**: Messages you've sent (blue background)
- **Received Messages**: Messages from the server (white background)
- **System Messages**: Connection events and errors (yellow background)
- **Timestamps**: When each message was sent/received
- **Copy Function**: Click to copy any message content

## Advanced Features

### Message Filtering
- Filter by message type (sent/received/system)
- Search message content
- Clear history when needed

### Export/Import
- Export message history as JSON
- Import previous sessions
- Save connection configurations

## Troubleshooting

### Connection Issues
- Verify the WebSocket URL is correct
- Check if the server supports WebSocket connections
- Ensure proper authentication if required
- Check network connectivity and firewall settings

### Message Problems
- Validate JSON format for JSON messages
- Check message size limits
- Verify the server expects the message format you're sending

## Use Cases

### Real-time Chat Testing
```json
{
  "action": "join_room",
  "room": "general",
  "user": "test_user"
}
```

### Live Data Streaming
```json
{
  "subscribe": "stock_prices",
  "symbols": ["AAPL", "GOOGL", "MSFT"]
}
```

### Gaming Protocol Testing
```json
{
  "type": "player_move",
  "x": 100,
  "y": 200,
  "direction": "north"
}
```