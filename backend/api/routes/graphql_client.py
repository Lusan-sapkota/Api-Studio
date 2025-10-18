from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import json
from datetime import datetime

router = APIRouter(prefix="/api/graphql", tags=["graphql"])

class GraphQLRequest(BaseModel):
    endpoint: str
    query: str
    variables: Optional[Dict[str, Any]] = {}
    headers: Optional[Dict[str, str]] = {}
    operation_name: Optional[str] = None

class GraphQLIntrospectionRequest(BaseModel):
    endpoint: str
    headers: Optional[Dict[str, str]] = {}

class GraphQLResponse(BaseModel):
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[Dict[str, Any]]] = None
    extensions: Optional[Dict[str, Any]] = None
    status_code: int
    response_time: float
    headers: Dict[str, str]

# Standard GraphQL introspection query
INTROSPECTION_QUERY = """
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
    }
  }
}

fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args {
      ...InputValue
    }
    type {
      ...TypeRef
    }
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
  }
}

fragment InputValue on __InputValue {
  name
  description
  type { ...TypeRef }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}
"""

@router.post("/execute", response_model=GraphQLResponse)
async def execute_graphql_query(request: GraphQLRequest):
    """Execute a GraphQL query"""
    try:
        # Prepare the request payload
        payload = {
            "query": request.query,
            "variables": request.variables or {}
        }
        
        if request.operation_name:
            payload["operationName"] = request.operation_name

        # Set default headers
        headers = {
            "Content-Type": "application/json",
            **request.headers
        }

        start_time = datetime.now()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                request.endpoint,
                json=payload,
                headers=headers
            )
            
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000

        # Parse response
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = {"errors": [{"message": "Invalid JSON response"}]}

        return GraphQLResponse(
            data=response_data.get("data"),
            errors=response_data.get("errors"),
            extensions=response_data.get("extensions"),
            status_code=response.status_code,
            response_time=response_time,
            headers=dict(response.headers)
        )

    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/introspect")
async def introspect_graphql_schema(request: GraphQLIntrospectionRequest):
    """Perform GraphQL schema introspection"""
    try:
        # Create introspection request
        introspection_request = GraphQLRequest(
            endpoint=request.endpoint,
            query=INTROSPECTION_QUERY,
            headers=request.headers
        )
        
        # Execute introspection query
        result = await execute_graphql_query(introspection_request)
        
        if result.errors:
            raise HTTPException(
                status_code=400, 
                detail=f"Introspection failed: {result.errors}"
            )
        
        return {
            "schema": result.data,
            "response_time": result.response_time,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Introspection failed: {str(e)}")

@router.post("/validate")
async def validate_graphql_query(request: GraphQLRequest):
    """Validate a GraphQL query without executing it"""
    try:
        # Basic syntax validation
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Check for basic GraphQL syntax
        query_lower = request.query.lower().strip()
        if not (query_lower.startswith('query') or 
                query_lower.startswith('mutation') or 
                query_lower.startswith('subscription') or
                query_lower.startswith('{')):
            raise HTTPException(
                status_code=400, 
                detail="Query must start with 'query', 'mutation', 'subscription', or '{'"
            )
        
        # Validate variables JSON
        if request.variables:
            try:
                json.dumps(request.variables)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="Variables must be valid JSON")
        
        return {
            "valid": True,
            "message": "Query syntax is valid"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return {
            "valid": False,
            "message": f"Validation error: {str(e)}"
        }

@router.get("/examples")
async def get_graphql_examples():
    """Get example GraphQL queries"""
    return {
        "examples": [
            {
                "name": "Basic Query",
                "description": "Simple query to fetch user data",
                "query": """query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}""",
                "variables": {"id": "1"}
            },
            {
                "name": "Mutation Example",
                "description": "Create a new user",
                "query": """mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    success
  }
}""",
                "variables": {
                    "input": {
                        "name": "John Doe",
                        "email": "john@example.com"
                    }
                }
            },
            {
                "name": "Nested Query",
                "description": "Query with nested relationships",
                "query": """query GetUserWithPosts($userId: ID!) {
  user(id: $userId) {
    id
    name
    posts(first: 10) {
      edges {
        node {
          id
          title
          content
          createdAt
        }
      }
    }
  }
}""",
                "variables": {"userId": "1"}
            }
        ]
    }

@router.post("/format")
async def format_graphql_query(query: str):
    """Format and prettify a GraphQL query"""
    try:
        # Basic formatting - in a real implementation, you'd use a proper GraphQL parser
        formatted = query.strip()
        
        # Simple indentation logic
        lines = formatted.split('\n')
        formatted_lines = []
        indent_level = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
                
            # Decrease indent for closing braces
            if stripped.startswith('}'):
                indent_level = max(0, indent_level - 1)
            
            # Add indented line
            formatted_lines.append('  ' * indent_level + stripped)
            
            # Increase indent for opening braces
            if stripped.endswith('{'):
                indent_level += 1
        
        return {
            "formatted_query": '\n'.join(formatted_lines),
            "original_query": query
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Formatting failed: {str(e)}")