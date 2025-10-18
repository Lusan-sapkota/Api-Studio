import { useState, useEffect } from 'react';
import { Play, Upload, Download, Copy, Zap, Search, FileText, Settings } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Tabs, Tab } from '../components/Tabs';

interface ProtoService {
  name: string;
  methods: ProtoMethod[];
}

interface ProtoMethod {
  name: string;
  inputType: string;
  outputType: string;
  clientStreaming: boolean;
  serverStreaming: boolean;
  description?: string;
}

interface ProtoMessage {
  name: string;
  fields: ProtoField[];
}

interface ProtoField {
  name: string;
  type: string;
  number: number;
  label: 'optional' | 'required' | 'repeated';
}

interface GrpcCall {
  id: string;
  service: string;
  method: string;
  request: string;
  response?: string;
  error?: string;
  timestamp: Date;
  duration?: number;
  status?: string;
}

export function GrpcPage() {
  const [endpoint, setEndpoint] = useState('localhost:50051');
  const [useTLS, setUseTLS] = useState(false);
  const [services, setServices] = useState<ProtoService[]>([]);
  const [messages, setMessages] = useState<ProtoMessage[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [requestData, setRequestData] = useState('{}');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [calls, setCalls] = useState<GrpcCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const [protoContent, setProtoContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const tabs: Tab[] = [
    { id: 'request', title: 'Request' },
    { id: 'metadata', title: 'Metadata' },
    { id: 'proto', title: 'Proto Definition' },
    { id: 'history', title: `History (${calls.length})` },
  ];

  // Mock proto services for demonstration
  useEffect(() => {
    const mockServices: ProtoService[] = [
      {
        name: 'UserService',
        methods: [
          {
            name: 'GetUser',
            inputType: 'GetUserRequest',
            outputType: 'User',
            clientStreaming: false,
            serverStreaming: false,
            description: 'Get a user by ID'
          },
          {
            name: 'ListUsers',
            inputType: 'ListUsersRequest',
            outputType: 'User',
            clientStreaming: false,
            serverStreaming: true,
            description: 'Stream all users'
          },
          {
            name: 'CreateUser',
            inputType: 'CreateUserRequest',
            outputType: 'User',
            clientStreaming: false,
            serverStreaming: false,
            description: 'Create a new user'
          }
        ]
      },
      {
        name: 'ProductService',
        methods: [
          {
            name: 'GetProduct',
            inputType: 'GetProductRequest',
            outputType: 'Product',
            clientStreaming: false,
            serverStreaming: false,
            description: 'Get a product by ID'
          },
          {
            name: 'SearchProducts',
            inputType: 'SearchRequest',
            outputType: 'Product',
            clientStreaming: false,
            serverStreaming: true,
            description: 'Search products with streaming results'
          }
        ]
      }
    ];

    const mockMessages: ProtoMessage[] = [
      {
        name: 'GetUserRequest',
        fields: [
          { name: 'id', type: 'string', number: 1, label: 'required' }
        ]
      },
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'string', number: 1, label: 'required' },
          { name: 'name', type: 'string', number: 2, label: 'required' },
          { name: 'email', type: 'string', number: 3, label: 'optional' },
          { name: 'created_at', type: 'google.protobuf.Timestamp', number: 4, label: 'optional' }
        ]
      },
      {
        name: 'CreateUserRequest',
        fields: [
          { name: 'name', type: 'string', number: 1, label: 'required' },
          { name: 'email', type: 'string', number: 2, label: 'required' }
        ]
      }
    ];

    setServices(mockServices);
    setMessages(mockMessages);
  }, []);

  const connectToServer = async () => {
    setLoading(true);
    try {
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnected(true);
      
      // Mock proto content
      setProtoContent(`syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
  rpc CreateUser(CreateUserRequest) returns (User);
}

message GetUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  google.protobuf.Timestamp created_at = 4;
}`);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeCall = async () => {
    if (!selectedService || !selectedMethod) return;

    setLoading(true);
    
    try {
      // Validate JSON
      JSON.parse(requestData);
      
      const call: GrpcCall = {
        id: Date.now().toString(),
        service: selectedService,
        method: selectedMethod,
        request: requestData,
        timestamp: new Date()
      };

      // Simulate gRPC call
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Mock response based on method
      let mockResponse = {};
      if (selectedMethod === 'GetUser') {
        mockResponse = {
          id: "user_123",
          name: "John Doe",
          email: "john@example.com",
          created_at: new Date().toISOString()
        };
      } else if (selectedMethod === 'CreateUser') {
        const request = JSON.parse(requestData);
        mockResponse = {
          id: `user_${Date.now()}`,
          name: request.name || "New User",
          email: request.email || "user@example.com",
          created_at: new Date().toISOString()
        };
      } else if (selectedMethod === 'ListUsers') {
        mockResponse = [
          { id: "user_1", name: "Alice", email: "alice@example.com" },
          { id: "user_2", name: "Bob", email: "bob@example.com" },
          { id: "user_3", name: "Charlie", email: "charlie@example.com" }
        ];
      }

      call.response = JSON.stringify(mockResponse, null, 2);
      call.duration = 500 + Math.random() * 1000;
      call.status = 'OK';
      
      setCalls(prev => [call, ...prev]);
      
    } catch (error) {
      const call: GrpcCall = {
        id: Date.now().toString(),
        service: selectedService,
        method: selectedMethod,
        request: requestData,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'ERROR'
      };
      
      setCalls(prev => [call, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const loadProtoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setProtoContent(content);
      // Here you would parse the proto file and extract services/messages
    };
    reader.readAsText(file);
  };

  const generateRequestTemplate = () => {
    if (!selectedService || !selectedMethod) return;

    const service = services.find(s => s.name === selectedService);
    const method = service?.methods.find(m => m.name === selectedMethod);
    
    if (!method) return;

    const inputMessage = messages.find(m => m.name === method.inputType);
    if (!inputMessage) return;

    const template: any = {};
    inputMessage.fields.forEach(field => {
      switch (field.type) {
        case 'string':
          template[field.name] = '';
          break;
        case 'int32':
        case 'int64':
          template[field.name] = 0;
          break;
        case 'bool':
          template[field.name] = false;
          break;
        default:
          template[field.name] = null;
      }
    });

    setRequestData(JSON.stringify(template, null, 2));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadResponse = (response: string) => {
    const blob = new Blob([response], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grpc-response-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMethodIcon = (method: ProtoMethod) => {
    if (method.clientStreaming && method.serverStreaming) return '↔️';
    if (method.clientStreaming) return '→';
    if (method.serverStreaming) return '←';
    return '•';
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.methods.some(method => 
      method.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary-500" />
              gRPC Explorer
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              connected ? 'text-green-500' : 'text-neutral-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-neutral-500'}`} />
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".proto"
              onChange={loadProtoFile}
              className="hidden"
              id="proto-upload"
            />
            <Button variant="secondary" onClick={() => document.getElementById('proto-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Load Proto
            </Button>
            {connected ? (
              <Button variant="secondary" onClick={() => setConnected(false)}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" onClick={connectToServer} disabled={loading}>
                {loading ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>
        </div>

        {/* Connection Settings */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="localhost:50051"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="flex-1"
            disabled={connected}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useTLS}
              onChange={(e) => setUseTLS(e.target.checked)}
              className="rounded"
              disabled={connected}
            />
            Use TLS
          </label>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Service Explorer & Request */}
        <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          {/* Service Selection */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search services and methods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setSelectedMethod('');
                }}
                options={[
                  { value: '', label: 'Select Service' },
                  ...filteredServices.map(service => ({
                    value: service.name,
                    label: service.name
                  }))
                ]}
              />
              
              <Select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                options={[
                  { value: '', label: 'Select Method' },
                  ...(services.find(s => s.name === selectedService)?.methods.map(method => ({
                    value: method.name,
                    label: `${getMethodIcon(method)} ${method.name}`
                  })) || [])
                ]}
                disabled={!selectedService}
              />
            </div>

            {selectedService && selectedMethod && (
              <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                <div className="text-sm">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedService}.{selectedMethod}
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 mt-1">
                    {services.find(s => s.name === selectedService)?.methods.find(m => m.name === selectedMethod)?.description}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex-1 p-4 overflow-auto">
            {activeTab === 'request' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Request Data
                  </h3>
                  <Button variant="ghost" size="sm" onClick={generateRequestTemplate}>
                    Generate Template
                  </Button>
                </div>
                
                <textarea
                  value={requestData}
                  onChange={(e) => setRequestData(e.target.value)}
                  placeholder='{"id": "user_123"}'
                  className="w-full h-64 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                
                <Button
                  variant="primary"
                  onClick={executeCall}
                  disabled={loading || !connected || !selectedService || !selectedMethod}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {loading ? 'Calling...' : 'Execute Call'}
                </Button>
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Request Metadata
                </h3>
                
                <div className="space-y-3">
                  {Object.entries(metadata).map(([key, value], index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Metadata key"
                        value={key}
                        onChange={(e) => {
                          const newMetadata = { ...metadata };
                          delete newMetadata[key];
                          newMetadata[e.target.value] = value;
                          setMetadata(newMetadata);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Metadata value"
                        value={value}
                        onChange={(e) => setMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMetadata = { ...metadata };
                          delete newMetadata[key];
                          setMetadata(newMetadata);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMetadata(prev => ({ ...prev, '': '' }))}
                  >
                    Add Metadata
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'proto' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Proto Definition
                </h3>
                
                <textarea
                  value={protoContent}
                  onChange={(e) => setProtoContent(e.target.value)}
                  placeholder="Proto file content will appear here..."
                  className="w-full h-96 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  readOnly
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Call History
                </h3>
                
                {calls.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No calls made yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {calls.map((call) => (
                      <Card key={call.id} className="cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark">
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {call.service}.{call.method}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              call.status === 'OK' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {call.status}
                            </div>
                          </div>
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">
                            {call.timestamp.toLocaleTimeString()}
                            {call.duration && ` • ${Math.round(call.duration)}ms`}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Response */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Response
              </h3>
              
              {calls.length > 0 && calls[0].response && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(calls[0].response!)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadResponse(calls[0].response!)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {calls.length > 0 ? (
              <div className="space-y-4">
                {calls[0].response && (
                  <pre className="whitespace-pre-wrap text-sm font-mono text-neutral-900 dark:text-neutral-100 p-4 bg-neutral-50 dark:bg-neutral-900 rounded border">
                    {calls[0].response}
                  </pre>
                )}
                
                {calls[0].error && (
                  <Card className="border-red-200 dark:border-red-800">
                    <div className="p-4">
                      <div className="text-red-600 dark:text-red-400 font-medium mb-2">
                        Error
                      </div>
                      <div className="text-sm text-neutral-900 dark:text-neutral-100">
                        {calls[0].error}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  No response yet
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Execute a gRPC call to see the response
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}