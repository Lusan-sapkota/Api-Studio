# Quick Start Guide

This guide will walk you through the basic features of API Studio and help you make your first API request.

## First Launch

After [installing API Studio](installation.md), you should have both the backend and frontend running:

- **Frontend**: http://localhost:56173
- **Backend**: http://localhost:58123

When you first open API Studio, you'll see the **API Clients Hub** with all available protocol clients.

## Making Your First Request

Let's start with a simple REST API request:

### Step 1: Open the REST Client

1. Click on **REST Client** from the API Clients hub
2. You'll see the request builder interface with tabs for different request components

### Step 2: Configure the Request

=== "Basic Request"

    1. **Method**: Select `GET` (default)
    2. **URL**: Enter `https://jsonplaceholder.typicode.com/posts/1`
    3. **Click Send**: Press the blue "Send" button
    
    You should see a JSON response with post data.

=== "With Headers"

    1. **Method**: Select `GET`
    2. **URL**: Enter `https://httpbin.org/headers`
    3. **Headers Tab**: Click on the "Headers" tab
    4. **Add Header**: Click "Add" and enter:
       - Key: `User-Agent`
       - Value: `API-Studio/1.0`
    5. **Send**: Click the "Send" button

=== "POST Request"

    1. **Method**: Select `POST`
    2. **URL**: Enter `https://jsonplaceholder.typicode.com/posts`
    3. **Body Tab**: Click on the "Body" tab
    4. **Body Type**: Select "JSON"
    5. **Body Content**: Enter:
       ```json
       {
         "title": "My First Post",
         "body": "This is a test post from API Studio",
         "userId": 1
       }
       ```
    6. **Send**: Click the "Send" button

### Step 3: Analyze the Response

The response panel shows:

- **Status Code**: HTTP status (200, 404, etc.)
- **Response Time**: How long the request took
- **Response Size**: Size of the response
- **Response Body**: The actual response data
- **Headers**: Response headers from the server

## Working with Collections

Collections help you organize your API requests:

### Creating a Collection

1. **Navigate to Collections**: Click "Collections" in the sidebar
2. **New Collection**: Click the "New Collection" button
3. **Name**: Enter "My First Collection"
4. **Create**: Click "Create"

### Saving Requests

1. **Make a Request**: Create any request in the REST client
2. **Save Button**: Click the "Save" button (disk icon) next to "Send"
3. **Choose Collection**: Select your collection
4. **Request Name**: Enter a descriptive name
5. **Save**: Click "Save"

### 70-30 Rule Interface

Collections use a special interface:

- **Left 70%**: Click to expand/collapse the collection
- **Right 30%**: Click to open the collection's dedicated page

## Environment Variables

Environment variables let you reuse values across requests:

### Creating an Environment

1. **Navigate to Environments**: Click "Environments" in the sidebar
2. **You'll see default environments**: Local and Production
3. **Add Variable**: Click "Add Variable" in any environment
4. **Configure**:
   - Key: `base_url`
   - Value: `https://jsonplaceholder.typicode.com`
   - Enable: ✓ (checked)

### Using Variables

In any request URL or header, use the syntax: `{{variable_name}}`

Example: `{{base_url}}/posts/1`

### Activating an Environment

1. **Environment List**: Go to the Environments page
2. **Activate**: Click "Activate" next to your desired environment
3. **Active Badge**: The active environment shows an "Active" badge

## Exploring Other Clients

### GraphQL Studio

1. **Open GraphQL Studio**: From the API Clients hub
2. **Endpoint**: Enter a GraphQL endpoint (e.g., `https://api.github.com/graphql`)
3. **Headers**: Add authorization if needed
4. **Query**: Write your GraphQL query
5. **Execute**: Click "Execute"

### WebSocket Playground

1. **Open WebSocket Playground**: From the API Clients hub
2. **URL**: Enter a WebSocket URL (e.g., `wss://echo.websocket.org`)
3. **Connect**: Click "Connect"
4. **Send Messages**: Type messages and click "Send"
5. **View History**: See all sent and received messages

## Notes and Tasks

API Studio includes a built-in notes and tasks system:

### Adding Notes

1. **Any Request Page**: Go to the "Notes & Tasks" tab
2. **New Note**: Click the "+" button in the Notes section
3. **Title**: Enter a note title
4. **Content**: Add your note content
5. **Context**: Notes are automatically linked to the current context

### Managing Tasks

1. **Tasks Section**: In the "Notes & Tasks" tab
2. **New Task**: Click the "+" button in the Tasks section
3. **Configure**:
   - Title: Task description
   - Priority: Low, Medium, or High
   - Due Date: Optional deadline
4. **Status**: Click the checkbox to change status (Todo → In Progress → Done)

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Action | Shortcut |
|--------|----------|
| Send Request | `Ctrl + Enter` |
| New Tab | `Ctrl + T` |
| Save Request | `Ctrl + S` |
| Focus URL Bar | `Ctrl + L` |
| Toggle Sidebar | `Ctrl + B` |

## Tips for Productivity

### 1. Use the Sidebar Dropdown

- **Single Click**: "API Clients" to see the dropdown menu
- **Double Click**: "API Clients" to go to the hub page

### 2. Organize with Collections

- Group related requests together
- Use folders for better organization
- Save frequently used requests

### 3. Leverage Environment Variables

- Create environments for different stages (dev, staging, prod)
- Use variables for base URLs, API keys, and common headers
- Switch environments easily without changing requests

### 4. Take Advantage of Tabs

- Open multiple requests in tabs
- Duplicate tabs to test variations
- Each tab maintains its own state

### 5. Use Notes and Tasks

- Document API behavior and quirks
- Track testing progress with tasks
- Share knowledge with team members

## What's Next?

Now that you're familiar with the basics:

1. **Explore Advanced Features**: Learn about [authentication](../api-clients/rest-client.md#authentication), [file uploads](../api-clients/rest-client.md#file-uploads), and more
2. **Try Other Protocols**: Experiment with [GraphQL](../api-clients/graphql-studio.md), [WebSocket](../api-clients/websocket-playground.md), and [gRPC](../api-clients/grpc-explorer.md)
3. **Set Up Collaboration**: Configure [team settings](../features/collaboration.md) and [user management](../features/settings.md)
4. **Customize Your Workspace**: Explore [configuration options](configuration.md) and [preferences](../features/settings.md)

## Getting Help

If you need assistance:

- **Documentation**: Browse the full documentation
- **GitHub Issues**: [Report bugs or request features](https://github.com/Lusan-sapkota/Api-Studio/issues)
- **Email Support**: [sapkotalusan@gmail.com](mailto:sapkotalusan@gmail.com)