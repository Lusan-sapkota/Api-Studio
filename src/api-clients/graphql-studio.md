# GraphQL Studio

The GraphQL Studio provides a comprehensive interface for testing GraphQL APIs with schema exploration, query building, and real-time error detection.

## Features

- **Schema Introspection**: Automatic discovery and exploration of GraphQL schemas
- **Query Builder**: Visual query building with autocomplete and syntax highlighting
- **Variables Support**: Dynamic query variables with JSON validation
- **Error Handling**: Detailed GraphQL error reporting with location information
- **Operation Types**: Support for queries, mutations, and subscriptions

## Getting Started

1. **Set Endpoint**: Enter your GraphQL endpoint URL
2. **Load Schema**: Click "Load Schema" to introspect the API
3. **Write Query**: Use the query editor with syntax highlighting
4. **Add Variables**: Define variables in JSON format
5. **Execute**: Run your query and analyze the response

## Query Examples

### Basic Query
```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
```

### Mutation Example
```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    success
  }
}
```

### Variables
```json
{
  "id": "1",
  "input": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Schema Explorer

The schema explorer allows you to:

- Browse all available types and fields
- View field descriptions and deprecation notices
- Understand input and output types
- Navigate complex schema relationships

## Authentication

Configure authentication in the Headers tab:

```
Authorization: Bearer your-jwt-token
X-API-Key: your-api-key
```

## Tips

- Use Ctrl+Space for autocomplete in the query editor
- Click on schema types to explore their fields
- Use the "Generate Template" feature for quick query scaffolding
- Save frequently used queries to collections