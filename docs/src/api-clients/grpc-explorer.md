# gRPC Explorer

The gRPC Explorer provides comprehensive tools for testing gRPC services with proto file support, service discovery, and streaming capabilities.

## Features

- **Service Discovery**: Automatic discovery of gRPC services and methods
- **Proto File Support**: Upload and parse .proto files for schema definition
- **Streaming Support**: Client, server, and bidirectional streaming
- **Server Reflection**: Automatic service introspection when supported
- **Request Templates**: Auto-generated request templates based on proto definitions

## Getting Started

1. **Connect to Server**: Enter your gRPC server endpoint
2. **Load Proto Files**: Upload .proto files or use server reflection
3. **Select Service**: Choose from discovered services
4. **Choose Method**: Select the method to invoke
5. **Configure Request**: Fill in the request data
6. **Execute**: Make the gRPC call and analyze the response

## Connection Setup

### Basic Connection
```
localhost:50051
```

### TLS Connection
```
api.example.com:443
☑ Use TLS
```

### With Metadata
```
Authorization: Bearer your-jwt-token
X-API-Key: your-api-key
```

## Proto File Management

### Upload Proto Files
1. Click "Load Proto" button
2. Select your .proto file
3. The service definitions will be parsed automatically
4. Available services and methods will appear in the dropdown

### Server Reflection
If your gRPC server supports reflection:
1. Connect to the server
2. Services will be discovered automatically
3. No proto file upload needed

## Request Examples

### Unary RPC
```json
{
  "id": "user_123",
  "include_profile": true
}
```

### Server Streaming
```json
{
  "query": "active users",
  "limit": 100
}
```

### Client Streaming
Send multiple messages:
```json
{"chunk": 1, "data": "first part"}
{"chunk": 2, "data": "second part"}
{"chunk": 3, "data": "final part"}
```

### Bidirectional Streaming
Interactive communication:
```json
{"type": "subscribe", "channel": "updates"}
{"type": "message", "content": "hello"}
```

## Service Types

### User Service Example
```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
  rpc CreateUser(CreateUserRequest) returns (User);
}
```

### Streaming Examples
```protobuf
// Server streaming
rpc GetUpdates(UpdateRequest) returns (stream Update);

// Client streaming  
rpc UploadData(stream DataChunk) returns (UploadResponse);

// Bidirectional streaming
rpc Chat(stream ChatMessage) returns (stream ChatMessage);
```

## Request Template Generation

The gRPC Explorer can automatically generate request templates:

1. Select a service and method
2. Click "Generate Template"
3. A JSON template will be created based on the proto definition
4. Fill in the required fields
5. Execute the request

## Metadata Configuration

Add metadata (headers) to your gRPC calls:

```
Content-Type: application/grpc
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Request-ID: 12345
Custom-Header: custom-value
```

## Response Analysis

### Successful Response
```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Error Response
```
Status: INVALID_ARGUMENT
Message: Invalid user ID format
Details: User ID must be a valid UUID
```

## Streaming Responses

### Server Streaming
Multiple responses from a single request:
```json
{"user": {"id": "1", "name": "Alice"}}
{"user": {"id": "2", "name": "Bob"}}  
{"user": {"id": "3", "name": "Charlie"}}
```

### Status Information
- **Connection Status**: Connected/Disconnected
- **Stream Status**: Active/Completed/Error
- **Message Count**: Number of messages sent/received
- **Response Time**: Time taken for each call

## Advanced Features

### Health Checks
Test server health:
```json
{
  "service": "UserService"
}
```

### Load Testing
- Send multiple concurrent requests
- Measure response times and success rates
- Identify performance bottlenecks

### Error Handling
- Detailed gRPC status codes
- Error message parsing
- Retry mechanisms for failed requests

## Troubleshooting

### Connection Issues
- Verify server is running and accessible
- Check TLS configuration
- Ensure correct port and protocol
- Validate network connectivity

### Proto File Issues
- Ensure proto file syntax is correct
- Check import dependencies
- Verify service and method definitions
- Validate message field types

### Authentication Problems
- Check metadata/header configuration
- Verify token format and expiration
- Ensure proper authentication method
- Test with server authentication requirements