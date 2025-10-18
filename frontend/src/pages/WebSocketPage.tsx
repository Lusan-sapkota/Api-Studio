import { useState, useEffect, useRef } from 'react';
import { Play, Square, Send, Trash2, Download, Copy, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Tabs, Tab } from '../components/Tabs';

interface Message {
  id: string;
  type: 'sent' | 'received' | 'system';
  content: string;
  timestamp: Date;
}

interface WebSocketConnection {
  url: string;
  protocols: string[];
  headers: Record<string, string>;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export function WebSocketPage() {
  const [connection, setConnection] = useState<WebSocketConnection>({
    url: 'ws://localhost:8080',
    protocols: [],
    headers: {},
    status: 'disconnected'
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'json'>('text');
  const [activeTab, setActiveTab] = useState('connection');
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [maxReconnectAttempts] = useState(5);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tabs: Tab[] = [
    { id: 'connection', title: 'Connection' },
    { id: 'headers', title: 'Headers' },
    { id: 'messages', title: `Messages (${messages.length})` },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (type: Message['type'], content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnection(prev => ({ ...prev, status: 'connecting' }));
    addMessage('system', `Connecting to ${connection.url}...`);

    try {
      const ws = new WebSocket(connection.url, connection.protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnection(prev => ({ ...prev, status: 'connected' }));
        setReconnectAttempts(0);
        addMessage('system', 'Connected successfully');
      };

      ws.onmessage = (event) => {
        addMessage('received', event.data);
      };

      ws.onclose = (event) => {
        setConnection(prev => ({ ...prev, status: 'disconnected' }));
        addMessage('system', `Connection closed: ${event.code} ${event.reason || 'No reason provided'}`);
        
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, 2000 * (reconnectAttempts + 1)); // Exponential backoff
        }
      };

      ws.onerror = () => {
        setConnection(prev => ({ ...prev, status: 'error' }));
        addMessage('system', 'Connection error occurred');
      };

    } catch (error) {
      setConnection(prev => ({ ...prev, status: 'error' }));
      addMessage('system', `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
  };

  const sendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !messageInput.trim()) {
      return;
    }

    let messageToSend = messageInput.trim();
    
    if (messageType === 'json') {
      try {
        JSON.parse(messageToSend); // Validate JSON
      } catch (error) {
        addMessage('system', 'Invalid JSON format');
        return;
      }
    }

    wsRef.current.send(messageToSend);
    addMessage('sent', messageToSend);
    setMessageInput('');
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const exportMessages = () => {
    const exportData = {
      connection: connection.url,
      timestamp: new Date().toISOString(),
      messages: messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websocket-messages-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-neutral-500';
    }
  };

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting': return <Wifi className="w-4 h-4 animate-pulse" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              WebSocket Playground
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="capitalize">{connection.status}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {connection.status === 'connected' ? (
              <Button variant="secondary" onClick={disconnect}>
                <Square className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={connect}
                disabled={connection.status === 'connecting'}
              >
                <Play className="w-4 h-4 mr-2" />
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Connection URL */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="ws://localhost:8080"
            value={connection.url}
            onChange={(e) => setConnection(prev => ({ ...prev, url: e.target.value }))}
            className="flex-1"
            disabled={connection.status === 'connected'}
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="rounded"
              />
              Auto-reconnect
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Configuration */}
        <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex-1 p-4 overflow-auto">
            {activeTab === 'connection' && (
              <div className="space-y-4">
                <Card>
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Connection Settings
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        WebSocket URL
                      </label>
                      <Input
                        placeholder="ws://localhost:8080"
                        value={connection.url}
                        onChange={(e) => setConnection(prev => ({ ...prev, url: e.target.value }))}
                        disabled={connection.status === 'connected'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Protocols (comma-separated)
                      </label>
                      <Input
                        placeholder="protocol1, protocol2"
                        value={connection.protocols.join(', ')}
                        onChange={(e) => setConnection(prev => ({ 
                          ...prev, 
                          protocols: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                        }))}
                        disabled={connection.status === 'connected'}
                      />
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Connection Status
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Status:</span>
                        <span className={`font-medium ${getStatusColor()}`}>
                          {connection.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">URL:</span>
                        <span className="font-mono text-xs">{connection.url}</span>
                      </div>
                      {autoReconnect && (
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Reconnect attempts:</span>
                          <span>{reconnectAttempts}/{maxReconnectAttempts}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'headers' && (
              <Card>
                <div className="p-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                    Connection Headers
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Custom headers for WebSocket handshake (coming soon)
                  </p>
                  <div className="space-y-2">
                    <Input placeholder="Header name" disabled />
                    <Input placeholder="Header value" disabled />
                    <Button variant="ghost" size="sm" disabled>
                      Add Header
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'messages' && (
              <Card>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Message History
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={exportMessages}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={clearMessages}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Total messages:</span>
                      <span>{messages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Sent:</span>
                      <span>{messages.filter(m => m.type === 'sent').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Received:</span>
                      <span>{messages.filter(m => m.type === 'received').length}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Right Panel - Messages */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-auto bg-neutral-50 dark:bg-neutral-900">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Wifi className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    No messages yet
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Connect to a WebSocket server and start sending messages
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.type === 'sent'
                          ? 'bg-primary-500 text-white'
                          : message.type === 'received'
                          ? 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs mb-1 ${
                            message.type === 'sent' 
                              ? 'text-primary-100' 
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}>
                            {message.type === 'sent' ? 'Sent' : message.type === 'received' ? 'Received' : 'System'} • {message.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="font-mono text-sm break-all">
                            {message.content}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyMessage(message.content)}
                          className={`ml-2 ${
                            message.type === 'sent' 
                              ? 'text-primary-100 hover:text-white' 
                              : 'text-neutral-400 hover:text-neutral-600'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800">
            <div className="flex items-center gap-3 mb-3">
              <Select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'text' | 'json')}
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'json', label: 'JSON' }
                ]}
                className="w-24"
              />
            </div>
            
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={messageType === 'json' ? '{"message": "Hello WebSocket!"}' : 'Type your message...'}
                  className="w-full h-20 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      sendMessage();
                    }
                  }}
                />
              </div>
              <Button
                variant="primary"
                onClick={sendMessage}
                disabled={connection.status !== 'connected' || !messageInput.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Press Ctrl+Enter to send • {messageInput.length} characters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}