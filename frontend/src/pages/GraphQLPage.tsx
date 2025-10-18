import { useState } from 'react';
import { Play, Book, Download, Copy, Database, Search, Eye } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Tabs, Tab } from '../components/Tabs';

interface GraphQLSchema {
  types: SchemaType[];
  queries: SchemaField[];
  mutations: SchemaField[];
  subscriptions: SchemaField[];
}

interface SchemaType {
  name: string;
  kind: 'OBJECT' | 'SCALAR' | 'ENUM' | 'INPUT_OBJECT' | 'INTERFACE' | 'UNION';
  description?: string;
  fields?: SchemaField[];
  enumValues?: { name: string; description?: string }[];
}

interface SchemaField {
  name: string;
  type: string;
  description?: string;
  args?: { name: string; type: string; defaultValue?: string }[];
}

interface GraphQLResponse {
  data?: any;
  errors?: Array<{ message: string; locations?: any[]; path?: any[] }>;
  extensions?: any;
}

export function GraphQLPage() {
  const [endpoint, setEndpoint] = useState('https://api.github.com/graphql');
  const [headers, setHeaders] = useState<Record<string, string>>({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  });
  const [query, setQuery] = useState(`query {
  viewer {
    login
    name
    email
    bio
    avatarUrl
    repositories(first: 5) {
      nodes {
        name
        description
        stargazerCount
        forkCount
        primaryLanguage {
          name
          color
        }
      }
    }
  }
}`);
  const [variables, setVariables] = useState('{}');
  const [response, setResponse] = useState<GraphQLResponse | null>(null);
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('query');
  const [schemaSearch, setSchemaSearch] = useState('');
  const [selectedType, setSelectedType] = useState<SchemaType | null>(null);

  const tabs: Tab[] = [
    { id: 'query', title: 'Query' },
    { id: 'variables', title: 'Variables' },
    { id: 'headers', title: 'Headers' },
    { id: 'schema', title: 'Schema' },
  ];

  const responseTabs: Tab[] = [
    { id: 'response', title: 'Response' },
    { id: 'errors', title: response?.errors ? `Errors (${response.errors.length})` : 'Errors' },
  ];

  const [activeResponseTab, setActiveResponseTab] = useState('response');

  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          ...FullType
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
  `;

  const executeQuery = async () => {
    if (!endpoint.trim() || !query.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      let parsedVariables = {};
      if (variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (error) {
          setResponse({
            errors: [{ message: 'Invalid JSON in variables' }]
          });
          setLoading(false);
          return;
        }
      }

      const requestBody = {
        query: query.trim(),
        variables: parsedVariables
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      const responseData = await res.json();
      setResponse(responseData);

    } catch (error) {
      setResponse({
        errors: [{ 
          message: error instanceof Error ? error.message : 'Network error occurred' 
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchema = async () => {
    if (!endpoint.trim()) return;

    setSchemaLoading(true);
    setSchema(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query: introspectionQuery })
      });

      const responseData = await res.json();
      
      if (responseData.data?.__schema) {
        const schemaData = responseData.data.__schema;
        const processedSchema: GraphQLSchema = {
          types: schemaData.types.filter((type: any) => 
            !type.name.startsWith('__') && type.kind !== 'SCALAR'
          ),
          queries: schemaData.queryType ? 
            schemaData.types.find((t: any) => t.name === schemaData.queryType.name)?.fields || [] : [],
          mutations: schemaData.mutationType ? 
            schemaData.types.find((t: any) => t.name === schemaData.mutationType.name)?.fields || [] : [],
          subscriptions: schemaData.subscriptionType ? 
            schemaData.types.find((t: any) => t.name === schemaData.subscriptionType.name)?.fields || [] : []
        };
        setSchema(processedSchema);
      } else {
        console.error('Failed to load schema:', responseData);
      }

    } catch (error) {
      console.error('Schema loading error:', error);
    } finally {
      setSchemaLoading(false);
    }
  };

  const formatResponse = (data: any): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadResponse = () => {
    if (!response) return;
    
    const blob = new Blob([formatResponse(response)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graphql-response-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const insertQueryExample = (type: 'query' | 'mutation') => {
    const examples = {
      query: `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}`,
      mutation: `mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}`
    };
    setQuery(examples[type]);
    setVariables(type === 'query' ? '{"id": "1"}' : '{"input": {"name": "John Doe", "email": "john@example.com"}}');
  };

  const filteredTypes = schema?.types.filter(type =>
    type.name.toLowerCase().includes(schemaSearch.toLowerCase()) ||
    type.description?.toLowerCase().includes(schemaSearch.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
            <Database className="w-8 h-8 text-primary-500" />
            GraphQL Studio
          </h1>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={loadSchema} disabled={schemaLoading}>
              <Book className="w-4 h-4 mr-2" />
              {schemaLoading ? 'Loading...' : 'Load Schema'}
            </Button>
            <Button variant="primary" onClick={executeQuery} disabled={loading}>
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Executing...' : 'Execute'}
            </Button>
          </div>
        </div>

        {/* Endpoint */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="https://api.example.com/graphql"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Query Builder */}
        <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex-1 p-4 overflow-auto">
            {activeTab === 'query' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    GraphQL Query
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => insertQueryExample('query')}>
                      Query Example
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => insertQueryExample('mutation')}>
                      Mutation Example
                    </Button>
                  </div>
                </div>
                
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your GraphQL query or mutation..."
                  className="w-full h-96 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            )}

            {activeTab === 'variables' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Query Variables
                </h3>
                
                <textarea
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full h-96 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Request Headers
                </h3>
                
                <div className="space-y-3">
                  {Object.entries(headers).map(([key, value], index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Header name"
                        value={key}
                        onChange={(e) => {
                          const newHeaders = { ...headers };
                          delete newHeaders[key];
                          newHeaders[e.target.value] = value;
                          setHeaders(newHeaders);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Header value"
                        value={value}
                        onChange={(e) => setHeaders(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newHeaders = { ...headers };
                          delete newHeaders[key];
                          setHeaders(newHeaders);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHeaders(prev => ({ ...prev, '': '' }))}
                  >
                    Add Header
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Schema Explorer
                  </h3>
                  {!schema && (
                    <Button variant="secondary" size="sm" onClick={loadSchema} disabled={schemaLoading}>
                      {schemaLoading ? 'Loading...' : 'Load Schema'}
                    </Button>
                  )}
                </div>

                {schema ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input
                        placeholder="Search types..."
                        value={schemaSearch}
                        onChange={(e) => setSchemaSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="space-y-2 max-h-96 overflow-auto">
                      {filteredTypes.map((type) => (
                        <Card
                          key={type.name}
                          className={`cursor-pointer transition-colors ${
                            selectedType?.name === type.name
                              ? 'ring-2 ring-primary-500'
                              : 'hover:bg-surface-light dark:hover:bg-surface-dark'
                          }`}
                        >
                          <div className="p-3" onClick={() => setSelectedType(selectedType?.name === type.name ? null : type)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs rounded font-mono ${
                                  type.kind === 'OBJECT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  type.kind === 'ENUM' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  type.kind === 'INPUT_OBJECT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {type.kind}
                                </span>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {type.name}
                                </span>
                              </div>
                              <Eye className="w-4 h-4 text-neutral-400" />
                            </div>
                            {type.description && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {type.description}
                              </p>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>

                    {selectedType && (
                      <Card>
                        <div className="p-4">
                          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                            {selectedType.name} Fields
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-auto">
                            {selectedType.fields?.map((field) => (
                              <div key={field.name} className="text-sm">
                                <div className="font-mono text-neutral-900 dark:text-neutral-100">
                                  {field.name}: {field.type}
                                </div>
                                {field.description && (
                                  <div className="text-neutral-600 dark:text-neutral-400 ml-2">
                                    {field.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Load the schema to explore types and fields
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Response */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
            <Tabs tabs={responseTabs} activeTab={activeResponseTab} onTabChange={setActiveResponseTab} />
            
            {response && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(formatResponse(response))}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadResponse}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {response ? (
              <div>
                {activeResponseTab === 'response' && (
                  <pre className="whitespace-pre-wrap text-sm font-mono text-neutral-900 dark:text-neutral-100 p-4 bg-neutral-50 dark:bg-neutral-900 rounded border">
                    {formatResponse(response.data)}
                  </pre>
                )}
                
                {activeResponseTab === 'errors' && (
                  <div className="space-y-3">
                    {response.errors && response.errors.length > 0 ? (
                      response.errors.map((error, index) => (
                        <Card key={index} className="border-red-200 dark:border-red-800">
                          <div className="p-4">
                            <div className="text-red-600 dark:text-red-400 font-medium mb-2">
                              Error {index + 1}
                            </div>
                            <div className="text-sm text-neutral-900 dark:text-neutral-100 mb-2">
                              {error.message}
                            </div>
                            {error.locations && (
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                Location: Line {error.locations[0]?.line}, Column {error.locations[0]?.column}
                              </div>
                            )}
                            {error.path && (
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                Path: {error.path.join(' → ')}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-green-500 mb-2">✓</div>
                        <p className="text-neutral-500 dark:text-neutral-400">No errors</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  No response yet
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Execute a GraphQL query to see the response
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}