# Backend API Reference

Complete reference for API Studio's backend API endpoints with detailed request/response examples.

## Base URL

```
http://localhost:58123
```

## Authentication

Authentication system is currently in development. Most endpoints are publicly accessible during development.

```http
Authorization: Bearer <jwt-token>
```

## HTTP Requests API

### Send HTTP Request

Execute HTTP requests to external APIs.

```http
POST /requests/send
Content-Type: application/json
```

**Request Body:**
```json
{
  "method": "GET",
  "url": "https://api.example.com/users",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "body": "{\"name\": \"John Doe\"}"
}
```

**Response:**
```json
{
  "status_code": 200,
  "headers": {
    "content-type": "application/json",
    "content-length": "123"
  },
  "body": "{\"users\": [...]}",
  "response_time": 245.67
}
```

**Supported Methods:** GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

### Request History

```http
GET /requests/history
POST /requests/history
```

Save and retrieve request history (currently handled by frontend localStorage).

## Collections API

### List Collections

```http
GET /collections/?workspace_id=1
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "API Tests",
    "description": "Collection of API test requests",
    "workspace_id": 1,
    "folders": {},
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:00:00Z"
  }
]
```

### Create Collection

```http
POST /collections/
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Collection",
  "description": "Description of the collection",
  "workspace_id": 1,
  "folders": {}
}
```

### Get Collection

```http
GET /collections/{collection_id}
```

### Update Collection

```http
PUT /collections/{collection_id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Collection Name",
  "description": "Updated description",
  "folders": {
    "folder1": {
      "name": "Authentication",
      "requests": ["req1", "req2"]
    }
  }
}
```

### Delete Collection

```http
DELETE /collections/{collection_id}
```

## GraphQL Client API

### Execute GraphQL Query

```http
POST /api/graphql/execute
Content-Type: application/json
```

**Request Body:**
```json
{
  "endpoint": "https://api.github.com/graphql",
  "query": "query { viewer { login } }",
  "variables": {},
  "headers": {
    "Authorization": "Bearer github_token"
  },
  "operation_name": "GetViewer"
}
```

**Response:**
```json
{
  "data": {
    "viewer": {
      "login": "username"
    }
  },
  "errors": null,
  "extensions": null,
  "status_code": 200,
  "response_time": 156.78,
  "headers": {
    "content-type": "application/json"
  }
}
```

### Schema Introspection

```http
POST /api/graphql/introspect
Content-Type: application/json
```

**Request Body:**
```json
{
  "endpoint": "https://api.github.com/graphql",
  "headers": {
    "Authorization": "Bearer github_token"
  }
}
```

### Validate Query

```http
POST /api/graphql/validate
Content-Type: application/json
```

**Request Body:**
```json
{
  "endpoint": "https://api.github.com/graphql",
  "query": "query { viewer { login } }",
  "variables": {}
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Query syntax is valid"
}
```

### Get Examples

```http
GET /api/graphql/examples
```

Returns example GraphQL queries for common use cases.

### Format Query

```http
POST /api/graphql/format
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "query{viewer{login}}"
}
```

**Response:**
```json
{
  "formatted_query": "query {\n  viewer {\n    login\n  }\n}",
  "original_query": "query{viewer{login}}"
}
```

## WebSocket Client API

### Test WebSocket Connection

```http
POST /api/websocket/test-connection
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "wss://echo.websocket.org",
  "protocols": ["protocol1"],
  "headers": {
    "Authorization": "Bearer token"
  }
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

### Get Active Connections

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

### WebSocket Proxy Connection

```
WebSocket: ws://localhost:58123/api/websocket/connect/{client_id}
```

See [WebSocket Events Reference](websocket-events.md) for detailed event documentation.

## gRPC Client API

*gRPC client endpoints are currently in development.*

### Test gRPC Connection

```http
POST /api/grpc/connect
```

### Make gRPC Call

```http
POST /api/grpc/call
```

### Upload Proto Files

```http
POST /api/grpc/upload-proto
```

## SMTP Client API

*SMTP client endpoints are currently in development.*

### Send Email

```http
POST /api/smtp/send
```

### Test SMTP Connection

```http
POST /api/smtp/test-connection
```

## Environments API

*Environment management endpoints are currently in development.*

### List Environments

```http
GET /environments/
```

### Create Environment

```http
POST /environments/
```

### Update Environment

```http
PUT /environments/{environment_id}
```

### Activate Environment

```http
POST /environments/{environment_id}/activate
```

## Workspaces API

*Workspace management endpoints are currently in development.*

### List Workspaces

```http
GET /workspaces/
```

### Create Workspace

```http
POST /workspaces/
```

## Notes & Tasks API

*Notes and tasks endpoints are currently in development.*

### Notes Endpoints

- `GET /api/notes/` - List notes
- `POST /api/notes/` - Create note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### Tasks Endpoints

- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

## Authentication API

*Authentication endpoints are currently in development.*

### Login

```http
POST /auth/login
```

### Register

```http
POST /auth/register
```

### Refresh Token

```http
POST /auth/refresh
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error message",
  "status_code": 400,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `408` - Request Timeout
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

*Rate limiting is currently in development.*

- Default: 100 requests per minute per IP
- GraphQL: 50 queries per minute per IP
- WebSocket: 100 messages per minute per connection

## Interactive Documentation

Visit the following URLs for interactive API documentation:

- **Swagger UI**: [http://localhost:58123/docs](http://localhost:58123/docs)
- **ReDoc**: [http://localhost:58123/redoc](http://localhost:58123/redoc)
- **OpenAPI JSON**: [http://localhost:58123/openapi.json](http://localhost:58123/openapi.json)

## Development Status

API Studio is in active development. The following features are planned or in progress:

### Implemented
- HTTP request execution
- GraphQL client with introspection
- WebSocket client proxy
- Collections management (basic)
- Request/response handling

### In Development
- Authentication system
- gRPC client
- SMTP client
- Environment management
- Notes & tasks system
- Workspaces
- Real-time collaboration

### Planned
- Rate limiting
- API versioning
- Caching
- Performance monitoring
- Import/export functionality