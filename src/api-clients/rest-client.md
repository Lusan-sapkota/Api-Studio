# REST Client

The REST Client is API Studio's most comprehensive client for testing HTTP/REST APIs. It supports all HTTP methods, advanced authentication, file uploads, and detailed response analysis.

## Interface Overview

The REST Client interface consists of several key areas:

- **Request Builder**: Configure your HTTP request
- **Response Viewer**: Analyze the response
- **Tabs System**: Manage multiple requests
- **History Panel**: Access previous requests

## Making Requests

### Basic Request

1. **Select Method**: Choose from GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
2. **Enter URL**: Type or paste your API endpoint
3. **Click Send**: Execute the request

```
Method: GET
URL: https://jsonplaceholder.typicode.com/posts/1
```

### Request Configuration

#### URL Parameters

Add query parameters in the **Params** tab:

| Key | Value | Enabled |
|-----|-------|---------|
| `limit` | `10` | ✓ |
| `offset` | `0` | ✓ |
| `sort` | `created_at` | ✓ |

Or include them directly in the URL:
```
https://api.example.com/posts?limit=10&offset=0&sort=created_at
```

#### Headers

Configure request headers in the **Headers** tab:

| Key | Value | Enabled |
|-----|-------|---------|
| `Content-Type` | `application/json` | ✓ |
| `User-Agent` | `API-Studio/1.0` | ✓ |
| `Accept` | `application/json` | ✓ |

Common headers are auto-suggested as you type.

#### Request Body

Configure the request body in the **Body** tab:

=== "JSON"

    ```json
    {
      "title": "My New Post",
      "content": "This is the post content",
      "author": "John Doe",
      "tags": ["api", "testing"]
    }
    ```

=== "Form Data"

    | Key | Value | Type |
    |-----|-------|------|
    | `title` | `My New Post` | Text |
    | `file` | `[Choose File]` | File |
    | `category` | `blog` | Text |

=== "Raw Text"

    ```
    This is raw text content that will be sent as-is.
    Useful for custom formats or plain text APIs.
    ```

=== "XML"

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <post>
        <title>My New Post</title>
        <content>This is the post content</content>
        <author>John Doe</author>
    </post>
    ```

## Authentication

Configure authentication in the **Auth** tab:

### Bearer Token

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Use for JWT tokens and API keys that use Bearer authentication.

### Basic Auth

```
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

Automatically encodes username:password in Base64.

### API Key

Add API keys as headers or query parameters:

- **Header**: `X-API-Key: your-api-key`
- **Query Parameter**: `?api_key=your-api-key`

### OAuth 2.0 (Coming Soon)

Full OAuth 2.0 flow support with automatic token refresh.

## Environment Variables

Use environment variables throughout your requests:

### In URLs
```
{{base_url}}/api/v1/users/{{user_id}}
```

### In Headers
```
Authorization: Bearer {{access_token}}
X-API-Key: {{api_key}}
```

### In Request Body
```json
{
  "environment": "{{env_name}}",
  "api_version": "{{api_version}}"
}
```

## Response Analysis

### Response Overview

The response panel shows:

- **Status Code**: HTTP status (200, 404, 500, etc.)
- **Response Time**: Request duration in milliseconds
- **Response Size**: Size of the response body
- **Status Text**: Human-readable status description

### Response Body

View the response in different formats:

=== "Pretty JSON"

    ```json
    {
      "id": 1,
      "title": "My Post",
      "content": "Post content here",
      "created_at": "2024-01-15T10:30:00Z"
    }
    ```

=== "Raw"

    ```
    {"id":1,"title":"My Post","content":"Post content here","created_at":"2024-01-15T10:30:00Z"}
    ```

=== "Preview"

    Rendered HTML preview for HTML responses.

### Response Headers

View all response headers:

```
Content-Type: application/json; charset=utf-8
Content-Length: 1234
Cache-Control: no-cache
X-RateLimit-Remaining: 99
```

### Response Cookies

View cookies set by the server:

```
session_id=abc123; Path=/; HttpOnly
csrf_token=xyz789; Path=/; Secure
```

## Advanced Features

### File Uploads

Upload files using multipart/form-data:

1. **Body Tab**: Select "Form Data"
2. **Add Field**: Click "Add" and select "File" type
3. **Choose File**: Click "Choose File" and select your file
4. **Additional Fields**: Add other form fields as needed

### Request Chaining (Coming Soon)

Use response data from one request in another:

```json
{
  "user_id": "{{response.user.id}}",
  "token": "{{response.access_token}}"
}
```

### Pre-request Scripts (Coming Soon)

Execute JavaScript before sending requests:

```javascript
// Set dynamic timestamp
pm.environment.set("timestamp", Date.now());

// Generate random data
pm.environment.set("random_id", Math.random().toString(36));
```

### Post-response Scripts (Coming Soon)

Process responses automatically:

```javascript
// Extract token from response
const response = pm.response.json();
pm.environment.set("access_token", response.token);

// Validate response
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send Request | `Ctrl + Enter` |
| New Tab | `Ctrl + T` |
| Close Tab | `Ctrl + W` |
| Duplicate Tab | `Ctrl + D` |
| Save Request | `Ctrl + S` |
| Focus URL | `Ctrl + L` |

## Tips and Best Practices

### Organization

1. **Use Collections**: Group related requests together
2. **Descriptive Names**: Use clear, descriptive request names
3. **Folder Structure**: Organize requests in logical folders
4. **Documentation**: Add notes to document API behavior

### Performance

1. **Connection Reuse**: HTTP/1.1 keep-alive is used automatically
2. **Compression**: Gzip compression is supported
3. **Timeouts**: Configure appropriate timeouts for your APIs
4. **Caching**: Leverage HTTP caching headers

### Security

1. **Environment Variables**: Store sensitive data in environment variables
2. **Secret Variables**: Mark sensitive variables as secret
3. **HTTPS**: Always use HTTPS for production APIs
4. **Token Rotation**: Regularly rotate API keys and tokens

### Debugging

1. **Response Headers**: Check headers for debugging information
2. **Status Codes**: Understand HTTP status code meanings
3. **Error Messages**: Read error response bodies carefully
4. **Network Tab**: Use browser dev tools for additional debugging

## Common Use Cases

### API Development

Test your own APIs during development:

```
# Local development
GET http://localhost:56173/api/users

# Staging environment
GET https://staging-api.example.com/api/users

# Production environment
GET https://api.example.com/api/users
```

### Third-party Integration

Test third-party APIs before integration:

```
# GitHub API
GET https://api.github.com/user
Authorization: Bearer {{github_token}}

# Stripe API
GET https://api.stripe.com/v1/customers
Authorization: Bearer {{stripe_secret_key}}
```

### Webhook Testing

Test webhook endpoints:

```
POST https://your-app.com/webhooks/payment
Content-Type: application/json

{
  "event": "payment.completed",
  "data": {
    "payment_id": "pay_123",
    "amount": 1000
  }
}
```

## Troubleshooting

### Common Issues

=== "CORS Errors"

    **Problem**: Browser blocks request due to CORS policy
    
    **Solutions**:
    - Use API Studio's proxy (automatic)
    - Configure CORS headers on your server
    - Use a CORS browser extension for development

=== "SSL Certificate Errors"

    **Problem**: SSL certificate validation fails
    
    **Solutions**:
    - Check certificate validity
    - Use proper HTTPS URLs
    - Configure certificate trust (for self-signed certificates)

=== "Timeout Errors"

    **Problem**: Request times out
    
    **Solutions**:
    - Increase timeout in settings
    - Check network connectivity
    - Verify server is responding

=== "Authentication Failures"

    **Problem**: 401 Unauthorized responses
    
    **Solutions**:
    - Verify credentials are correct
    - Check token expiration
    - Ensure proper authentication method

### Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](../support/troubleshooting.md)
2. Search [GitHub Issues](https://github.com/Lusan-sapkota/Api-Studio/issues)
3. Contact support at [sapkotalusan@gmail.com](mailto:sapkotalusan@gmail.com)