import { useState, useEffect } from 'react';
import { Book, Edit2, Save, Plus, Trash2, RefreshCw, Code, Eye } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Tabs, Tab } from '../components/Tabs';

interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters: Parameter[];
  responses: Response[];
  examples: Example[];
  tags: string[];
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface Response {
  status: number;
  description: string;
  schema?: string;
  example?: string;
}

interface Example {
  name: string;
  request: any;
  response: any;
}

interface DocSection {
  id: string;
  title: string;
  content: string;
  editable: boolean;
}

export function DocsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [docSections, setDocSections] = useState<DocSection[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Load saved documentation
    const savedDocs = localStorage.getItem('api-documentation');
    if (savedDocs) {
      const { endpoints: savedEndpoints, sections: savedSections } = JSON.parse(savedDocs);
      setEndpoints(savedEndpoints || []);
      setDocSections(savedSections || getDefaultSections());
    } else {
      setDocSections(getDefaultSections());
    }

    // Auto-generate endpoints from history
    generateEndpointsFromHistory();
  }, []);

  const getDefaultSections = (): DocSection[] => [
    {
      id: 'overview',
      title: 'API Overview',
      content: `# API Documentation

Welcome to the API documentation. This documentation is automatically generated from your API requests and can be customized.

## Base URL
\`{{BASE_URL}}\`

## Authentication
This API uses API key authentication. Include your API key in the header:
\`Authorization: Bearer {{TOKEN}}\`

## Rate Limiting
- 1000 requests per hour per API key
- Rate limit headers are included in responses

## Error Handling
All errors return JSON with the following structure:
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
\`\`\``,
      editable: true
    },
    {
      id: 'authentication',
      title: 'Authentication',
      content: `# Authentication

## API Key Authentication
Include your API key in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Getting an API Key
1. Sign up for an account
2. Navigate to your dashboard
3. Generate a new API key
4. Copy and store it securely`,
      editable: true
    }
  ];

  const generateEndpointsFromHistory = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const history = JSON.parse(localStorage.getItem('api-history') || '[]');
      const endpointMap = new Map<string, ApiEndpoint>();

      history.forEach((request: any) => {
        if (!request.response) return;

        const key = `${request.method}-${request.url}`;
        const path = new URL(request.url).pathname;
        
        if (!endpointMap.has(key)) {
          endpointMap.set(key, {
            id: key,
            method: request.method,
            path,
            summary: `${request.method} ${path}`,
            description: `Auto-generated from request history`,
            parameters: extractParameters(request),
            responses: [{
              status: request.response.status,
              description: request.response.statusText,
              example: request.response.body
            }],
            examples: [{
              name: 'Example Request',
              request: {
                headers: request.headers,
                body: request.body
              },
              response: request.response.body
            }],
            tags: [request.method.toLowerCase()]
          });
        }
      });

      setEndpoints(Array.from(endpointMap.values()));
      setIsGenerating(false);
    }, 1000);
  };

  const extractParameters = (request: any): Parameter[] => {
    const params: Parameter[] = [];
    
    // Extract query parameters
    if (request.params) {
      request.params.forEach((param: any) => {
        if (param.enabled && param.key) {
          params.push({
            name: param.key,
            type: 'string',
            required: true,
            description: `Query parameter`,
            example: param.value
          });
        }
      });
    }

    // Extract headers as parameters
    if (request.headers) {
      request.headers.forEach((header: any) => {
        if (header.enabled && header.key && !['Content-Type', 'Authorization'].includes(header.key)) {
          params.push({
            name: header.key,
            type: 'string',
            required: false,
            description: `Header parameter`,
            example: header.value
          });
        }
      });
    }

    return params;
  };

  const saveDocumentation = () => {
    const docData = {
      endpoints,
      sections: docSections,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('api-documentation', JSON.stringify(docData));
  };

  const updateSection = (sectionId: string, content: string) => {
    setDocSections(sections => 
      sections.map(section => 
        section.id === sectionId ? { ...section, content } : section
      )
    );
  };

  const addCustomSection = () => {
    const title = prompt('Enter section title:');
    if (!title) return;

    const newSection: DocSection = {
      id: `custom-${Date.now()}`,
      title,
      content: `# ${title}\n\nAdd your content here...`,
      editable: true
    };

    setDocSections([...docSections, newSection]);
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Delete this section?')) {
      setDocSections(sections => sections.filter(s => s.id !== sectionId));
    }
  };

  const renderMarkdown = (content: string): string => {
    // Simple markdown rendering (you could use a proper markdown library)
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/`([^`]+)`/g, '<code class="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```json\n([\s\S]*?)\n```/g, '<pre class="bg-neutral-100 dark:bg-neutral-800 p-4 rounded overflow-auto"><code>$1</code></pre>')
      .replace(/```\n([\s\S]*?)\n```/g, '<pre class="bg-neutral-100 dark:bg-neutral-800 p-4 rounded overflow-auto"><code>$1</code></pre>')
      .replace(/\n/g, '<br>');
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const tabs: Tab[] = [
    { id: 'overview', title: 'Overview' },
    { id: 'endpoints', title: 'Endpoints' },
    { id: 'custom', title: 'Custom Docs' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Book className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              API Documentation
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={generateEndpointsFromHistory}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Regenerate
            </Button>
            <Button variant="primary" onClick={saveDocumentation}>
              <Save className="w-4 h-4 mr-2" />
              Save Docs
            </Button>
          </div>
        </div>
        
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {docSections.filter(s => ['overview', 'authentication'].includes(s.id)).map((section) => (
              <Card key={section.id}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                      {section.title}
                    </h2>
                    {section.editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                      >
                        {editingSection === section.id ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  
                  {editingSection === section.id ? (
                    <div className="space-y-3">
                      <textarea
                        className="w-full h-64 p-3 border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm"
                        value={section.content}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setEditingSection(null)}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="max-w-6xl mx-auto">
            {endpoints.length === 0 ? (
              <Card>
                <div className="p-12 text-center">
                  <Code className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    No endpoints documented yet
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    Make some API requests to automatically generate documentation
                  </p>
                  <Button onClick={generateEndpointsFromHistory} disabled={isGenerating}>
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Generate from History
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.id}>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 text-sm font-mono rounded ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                        <code className="text-lg font-mono text-neutral-900 dark:text-neutral-100">
                          {endpoint.path}
                        </code>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        {endpoint.summary}
                      </h3>
                      
                      <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                        {endpoint.description}
                      </p>

                      {endpoint.parameters.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Parameters</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                  <th className="text-left p-2">Name</th>
                                  <th className="text-left p-2">Type</th>
                                  <th className="text-left p-2">Required</th>
                                  <th className="text-left p-2">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {endpoint.parameters.map((param, index) => (
                                  <tr key={index} className="border-b border-neutral-100 dark:border-neutral-800">
                                    <td className="p-2 font-mono">{param.name}</td>
                                    <td className="p-2">{param.type}</td>
                                    <td className="p-2">{param.required ? 'Yes' : 'No'}</td>
                                    <td className="p-2">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {endpoint.responses.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Responses</h4>
                          {endpoint.responses.map((response, index) => (
                            <div key={index} className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                  {response.status}
                                </span>
                                <span className="text-sm">{response.description}</span>
                              </div>
                              {response.example && (
                                <div>
                                  <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Example Response:</h5>
                                  <pre className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded text-sm overflow-auto">
                                    {typeof response.example === 'string' ? response.example : JSON.stringify(response.example, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {endpoint.examples.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Full API Examples</h4>
                          {endpoint.examples.map((example, index) => (
                            <div key={index} className="mb-4 border border-neutral-200 dark:border-neutral-700 rounded">
                              <div className="bg-neutral-50 dark:bg-neutral-800 px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                                <h5 className="font-medium text-sm">{example.name}</h5>
                              </div>
                              <div className="p-3">
                                <div className="mb-3">
                                  <h6 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Request:</h6>
                                  <div className="bg-neutral-100 dark:bg-neutral-900 p-3 rounded text-sm">
                                    <div className="mb-2">
                                      <span className={`inline-block px-2 py-1 text-xs font-mono rounded mr-2 ${getMethodColor(endpoint.method)}`}>
                                        {endpoint.method}
                                      </span>
                                      <code className="text-sm">{endpoint.path}</code>
                                    </div>
                                    {example.request.headers && Object.keys(example.request.headers).length > 0 && (
                                      <div className="mb-2">
                                        <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Headers:</div>
                                        <pre className="text-xs">{JSON.stringify(example.request.headers, null, 2)}</pre>
                                      </div>
                                    )}
                                    {example.request.body && (
                                      <div>
                                        <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Body:</div>
                                        <pre className="text-xs">{typeof example.request.body === 'string' ? example.request.body : JSON.stringify(example.request.body, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h6 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Response:</h6>
                                  <pre className="bg-neutral-100 dark:bg-neutral-900 p-3 rounded text-sm overflow-auto">
                                    {typeof example.response === 'string' ? example.response : JSON.stringify(example.response, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Custom Documentation
              </h2>
              <Button onClick={addCustomSection}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            {docSections.filter(s => !['overview', 'authentication'].includes(s.id)).map((section) => (
              <Card key={section.id}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {section.title}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                      >
                        {editingSection === section.id ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSection(section.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {editingSection === section.id ? (
                    <div className="space-y-3">
                      <Input
                        value={section.title}
                        onChange={(e) => {
                          setDocSections(sections => 
                            sections.map(s => 
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            )
                          );
                        }}
                        placeholder="Section title"
                      />
                      <textarea
                        className="w-full h-64 p-3 border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm"
                        value={section.content}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                        placeholder="Write your documentation in Markdown..."
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setEditingSection(null)}
                      >
                        Done Editing
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                    />
                  )}
                </div>
              </Card>
            ))}

            {docSections.filter(s => !['overview', 'authentication'].includes(s.id)).length === 0 && (
              <Card>
                <div className="p-12 text-center">
                  <Book className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    No custom sections yet
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    Add custom documentation sections for your API
                  </p>
                  <Button onClick={addCustomSection}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Section
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
