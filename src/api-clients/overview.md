# API Clients Overview

API Studio provides specialized clients for testing different types of APIs and protocols. Each client is designed with protocol-specific features and optimizations.

## Available Clients

<div class="grid cards" markdown>

-   :material-api:{ .lg .middle } **REST Client**

    ---

    Test HTTP/REST APIs with full method support, authentication, and response analysis.

    [:octicons-arrow-right-24: REST Client Guide](rest-client.md)

-   :material-graphql:{ .lg .middle } **GraphQL Studio**

    ---

    Query GraphQL APIs with schema exploration, introspection, and query building.

    [:octicons-arrow-right-24: GraphQL Studio Guide](graphql-studio.md)

-   :material-wifi:{ .lg .middle } **WebSocket Playground**

    ---

    Connect to WebSocket endpoints for real-time communication and message testing.

    [:octicons-arrow-right-24: WebSocket Playground Guide](websocket-playground.md)

-   :material-lightning-bolt:{ .lg .middle } **gRPC Explorer**

    ---

    Explore gRPC services with proto file support and streaming capabilities.

    [:octicons-arrow-right-24: gRPC Explorer Guide](grpc-explorer.md)

-   :material-email:{ .lg .middle } **SMTP Tester**

    ---

    Test email functionality with HTML composition and delivery tracking.

    [:octicons-arrow-right-24: SMTP Tester Guide](smtp-tester.md)

</div>

## Client Features Comparison

| Feature | REST | GraphQL | WebSocket | gRPC | SMTP |
|---------|------|---------|-----------|------|------|
| **Request/Response** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Real-time Communication** | ❌ | ❌ | ✅ | ✅* | ❌ |
| **Schema Introspection** | ❌ | ✅ | ❌ | ✅ | ❌ |
| **File Upload** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Authentication** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Environment Variables** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **History** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Collections** | ✅ | ✅ | ✅ | ✅ | ✅ |

*gRPC supports streaming which enables real-time communication

## Common Features

All API clients share these common features:

### Environment Variables

Use environment variables across all clients with the `{{variable_name}}` syntax:

```
# In any URL, header, or body field
{{base_url}}/api/v1/users
Authorization: Bearer {{api_token}}
```

### Request History

Every request is automatically saved to history:

- **Automatic Saving**: All successful requests are saved
- **Search and Filter**: Find previous requests quickly
- **Replay Requests**: Load and modify previous requests
- **Export History**: Export request history for backup

### Collections Integration

Save and organize requests in collections:

- **Save to Collection**: Save any request to a collection
- **Folder Organization**: Organize requests in folders
- **Bulk Operations**: Perform operations on multiple requests
- **Sharing**: Share collections with team members

### Notes and Tasks

Add context to your API testing:

- **Request Notes**: Document API behavior and quirks
- **Task Management**: Track testing progress and issues
- **Context Awareness**: Notes are linked to specific requests
- **Collaboration**: Share notes with team members

## Navigation

### API Clients Hub

Access all clients from the main hub:

1. **Navigate**: Go to `/api-clients` or click "API Clients" in the sidebar
2. **Overview**: See all available clients and their status
3. **Quick Access**: Click any client to start using it immediately

### Sidebar Dropdown

Use the smart sidebar navigation:

- **Single Click**: Click "API Clients" to see dropdown menu
- **Double Click**: Double-click to go to the main hub
- **Quick Access**: Select any client from the dropdown

### Tabs and Windows

Manage multiple requests efficiently:

- **Multiple Tabs**: Open multiple requests in tabs
- **Tab Management**: Close, duplicate, and reorder tabs
- **State Persistence**: Each tab maintains its own state
- **Unsaved Changes**: Visual indicators for unsaved changes

## Protocol-Specific Features

### HTTP/REST Features

- **All HTTP Methods**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Authentication**: Bearer, Basic, API Key, OAuth (coming soon)
- **Request Body Types**: JSON, Form Data, Raw, XML, HTML
- **File Uploads**: Multipart form data with file attachments
- **Response Analysis**: Status codes, headers, timing, size

### GraphQL Features

- **Schema Introspection**: Automatic schema discovery and exploration
- **Query Builder**: Visual query building with autocomplete
- **Variables Support**: Dynamic query variables with validation
- **Operation Types**: Queries, mutations, and subscriptions
- **Error Handling**: Detailed GraphQL error reporting

### WebSocket Features

- **Real-time Connection**: Persistent WebSocket connections
- **Message Types**: Text and binary message support
- **Auto-reconnection**: Automatic reconnection with exponential backoff
- **Connection Status**: Real-time connection status monitoring
- **Message History**: Complete history of sent and received messages

### gRPC Features

- **Service Discovery**: Automatic service and method discovery
- **Proto File Support**: Upload and parse .proto files
- **Streaming**: Client, server, and bidirectional streaming
- **Server Reflection**: Automatic service introspection
- **Request Templates**: Auto-generated request templates

### SMTP Features

- **Email Composition**: Rich HTML and plain text email creation
- **Attachment Support**: File attachments with multiple formats
- **Template Management**: Reusable email templates
- **SMTP Configuration**: Flexible SMTP server configuration
- **Delivery Tracking**: Email delivery status and error reporting

## Best Practices

### Organization

1. **Use Collections**: Group related requests together
2. **Folder Structure**: Create logical folder hierarchies
3. **Naming Conventions**: Use descriptive names for requests
4. **Documentation**: Add notes to document API behavior

### Environment Management

1. **Multiple Environments**: Create separate environments for dev/staging/prod
2. **Secret Variables**: Mark sensitive data as secret
3. **Variable Naming**: Use consistent naming conventions
4. **Environment Switching**: Test across different environments

### Collaboration

1. **Shared Collections**: Share collections with team members
2. **Notes and Tasks**: Document findings and track progress
3. **Version Control**: Use Git for collection versioning (coming soon)
4. **Team Settings**: Configure team access and permissions

### Performance

1. **Request Optimization**: Minimize request size and complexity
2. **Caching**: Leverage HTTP caching where appropriate
3. **Connection Reuse**: Use persistent connections for WebSocket/gRPC
4. **Monitoring**: Track response times and error rates

## Integration with Other Tools

### Import/Export (Coming Soon)

- **Postman Collections**: Import existing Postman collections
- **Insomnia**: Import Insomnia workspaces
- **OpenAPI**: Generate requests from OpenAPI specifications
- **cURL**: Convert cURL commands to requests

### CI/CD Integration (Coming Soon)

- **CLI Tool**: Command-line interface for automation
- **Test Runners**: Integration with testing frameworks
- **Reporting**: Generate test reports and metrics
- **Pipeline Integration**: Use in CI/CD pipelines

### Development Workflow

- **Local Development**: Test local APIs during development
- **API Documentation**: Generate documentation from requests
- **Mock Servers**: Create mock servers from collections (coming soon)
- **Performance Testing**: Load testing capabilities (coming soon)

## Getting Started

1. **Choose a Client**: Select the appropriate client for your API type
2. **Configure Environment**: Set up environment variables for your API
3. **Make First Request**: Start with a simple request to test connectivity
4. **Organize**: Save requests to collections and add documentation
5. **Collaborate**: Share with team members and gather feedback

## Next Steps

- **Try Each Client**: Explore the different protocol clients
- **Set Up Collections**: Organize your API requests
- **Configure Environments**: Set up different environments for testing
- **Explore Advanced Features**: Learn about authentication, file uploads, and more