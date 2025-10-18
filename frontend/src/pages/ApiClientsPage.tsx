
import { Send, Wifi, Zap, Database, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface ApiClient {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  status: 'available' | 'coming_soon';
  features: string[];
}

export function ApiClientsPage() {
  const navigate = useNavigate();
  
  const apiClients: ApiClient[] = [
    {
      id: 'rest',
      name: 'REST Client',
      description: 'Test REST APIs with full HTTP method support, authentication, and response analysis',
      icon: Send,
      path: '/request',
      status: 'available',
      features: ['HTTP Methods', 'Authentication', 'Headers & Params', 'Response Analysis', 'Environment Variables']
    },
    {
      id: 'websocket',
      name: 'WebSocket Playground',
      description: 'Connect to WebSocket endpoints, send messages, and monitor real-time communication',
      icon: Wifi,
      path: '/websocket',
      status: 'available',
      features: ['Real-time Connection', 'Message History', 'Auto-reconnect', 'JSON/Text Support']
    },
    {
      id: 'grpc',
      name: 'gRPC Explorer',
      description: 'Explore gRPC services, invoke methods, and test protobuf-based APIs',
      icon: Zap,
      path: '/grpc',
      status: 'available',
      features: ['Service Discovery', 'Method Invocation', 'Protobuf Support', 'Streaming']
    },
    {
      id: 'graphql',
      name: 'GraphQL Studio',
      description: 'Query GraphQL APIs with schema exploration, query building, and introspection',
      icon: Database,
      path: '/graphql',
      status: 'available',
      features: ['Schema Explorer', 'Query Builder', 'Introspection', 'Variables Support']
    },
    {
      id: 'smtp',
      name: 'SMTP Tester',
      description: 'Test email sending functionality with HTML preview and delivery tracking',
      icon: Mail,
      path: '/smtp',
      status: 'available',
      features: ['HTML Preview', 'Attachment Support', 'Delivery Tracking', 'Template Testing']
    }
  ];

  const handleClientClick = (client: ApiClient) => {
    if (client.status === 'available') {
      navigate(client.path);
    }
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            API Clients
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Choose your protocol and start testing APIs with specialized tools for each communication method
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apiClients.map((client) => {
            const IconComponent = client.icon;
            
            return (
              <Card 
                key={client.id}
                className={`relative overflow-hidden transition-all duration-200 ${
                  client.status === 'available' 
                    ? 'hover:shadow-lg hover:scale-105 cursor-pointer' 
                    : 'opacity-75'
                }`}
              >
                <div className="p-6" onClick={() => handleClientClick(client)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${
                      client.status === 'available' 
                        ? 'bg-primary-500/10 text-primary-500' 
                        : 'bg-neutral-500/10 text-neutral-500'
                    }`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    
                    {client.status === 'coming_soon' && (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                        Coming Soon
                      </span>
                    )}
                    
                    {client.status === 'available' && (
                      <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    {client.name}
                  </h3>
                  
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4 text-sm leading-relaxed">
                    {client.description}
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Features:
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {client.features.map((feature, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {client.status === 'available' && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <Button variant="primary" size="sm" className="w-full">
                        Open {client.name}
                      </Button>
                    </div>
                  )}
                </div>
                
                {client.status === 'available' && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary-500/20 to-transparent" />
                )}
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-primary-500 mb-2">
                {apiClients.filter(c => c.status === 'available').length}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Available Clients
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-2">
                {apiClients.filter(c => c.status === 'coming_soon').length}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Coming Soon
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">
                {apiClients.reduce((acc, client) => acc + client.features.length, 0)}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Features
              </div>
            </div>
          </Card>
        </div>

        {/* Getting Started */}
        <div className="mt-12">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Getting Started
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    REST API Testing
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                    Start with the REST Client to test HTTP APIs. It supports all HTTP methods, authentication, and environment variables.
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => navigate('/request')}
                  >
                    Open REST Client
                  </Button>
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Organize Your Work
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                    Use Collections to organize your requests, Environments for different configurations, and Notes for documentation.
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => navigate('/collections')}
                  >
                    View Collections
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}