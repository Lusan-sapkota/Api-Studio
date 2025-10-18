import { useState, useEffect } from 'react';
import { Globe, Search, X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Select } from './Select';

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  responseTime: number;
  size: number;
  timestamp: Date;
  headers: Record<string, string>;
  requestHeaders: Record<string, string>;
  responseBody: string;
  requestBody?: string;
  type: 'xhr' | 'fetch' | 'intercepted';
}

interface NetworkInterceptorProps {
  isActive: boolean;
  onToggle: () => void;
  targetUrl?: string;
  onTargetUrlChange: (url: string) => void;
}

export function NetworkInterceptor({ isActive, onToggle, targetUrl = '', onTargetUrlChange }: NetworkInterceptorProps) {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    if (!isActive) return;

    // Store original fetch and XMLHttpRequest
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // Intercept fetch requests
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      // Check if URL matches target (if specified)
      if (targetUrl && !url.includes(targetUrl)) {
        return originalFetch(input, init);
      }

      const startTime = Date.now();

      try {
        const response = await originalFetch(input, init);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Clone response to read body without consuming it
        const responseClone = response.clone();
        const responseBody = await responseClone.text();

        const networkRequest: NetworkRequest = {
          id: `fetch-${Date.now()}-${Math.random()}`,
          method: method.toUpperCase(),
          url,
          status: response.status,
          statusText: response.statusText,
          responseTime,
          size: responseBody.length,
          timestamp: new Date(),
          headers: Object.fromEntries(response.headers.entries()),
          requestHeaders: init?.headers ? Object.fromEntries(Object.entries(init.headers)) : {},
          responseBody,
          requestBody: init?.body ? String(init.body) : undefined,
          type: 'fetch'
        };

        setRequests(prev => [networkRequest, ...prev.slice(0, 99)]); // Keep last 100 requests

        return response;
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const networkRequest: NetworkRequest = {
          id: `fetch-error-${Date.now()}-${Math.random()}`,
          method: method.toUpperCase(),
          url,
          status: 0,
          statusText: 'Network Error',
          responseTime,
          size: 0,
          timestamp: new Date(),
          headers: {},
          requestHeaders: init?.headers ? Object.fromEntries(Object.entries(init.headers)) : {},
          responseBody: error instanceof Error ? error.message : 'Unknown error',
          requestBody: init?.body ? String(init.body) : undefined,
          type: 'fetch'
        };

        setRequests(prev => [networkRequest, ...prev.slice(0, 99)]);
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
      const urlString = typeof url === 'string' ? url : url.href;

      // Check if URL matches target (if specified)
      if (targetUrl && !urlString.includes(targetUrl)) {
        return originalXHROpen.call(this, method, url, async ?? true, user ?? null, password ?? null);
      }

      (this as any)._intercepted = {
        method: method.toUpperCase(),
        url: urlString,
        startTime: 0,
        requestHeaders: {}
      };

      const originalSetRequestHeader = this.setRequestHeader;
      this.setRequestHeader = function (name: string, value: string) {
        if ((this as any)._intercepted) {
          (this as any)._intercepted.requestHeaders[name] = value;
        }
        return originalSetRequestHeader.call(this, name, value);
      };

      return originalXHROpen.call(this, method, url, async ?? true, user ?? null, password ?? null);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      if ((this as any)._intercepted) {
        (this as any)._intercepted.startTime = Date.now();
        (this as any)._intercepted.requestBody = body ? String(body) : undefined;

        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function () {
          if (this.readyState === 4 && (this as any)._intercepted) {
            const endTime = Date.now();
            const responseTime = endTime - (this as any)._intercepted.startTime;

            const networkRequest: NetworkRequest = {
              id: `xhr-${Date.now()}-${Math.random()}`,
              method: (this as any)._intercepted.method,
              url: (this as any)._intercepted.url,
              status: this.status,
              statusText: this.statusText,
              responseTime,
              size: this.responseText.length,
              timestamp: new Date(),
              headers: this.getAllResponseHeaders().split('\r\n').reduce((acc: Record<string, string>, line: string) => {
                const [key, value] = line.split(': ');
                if (key && value) acc[key] = value;
                return acc;
              }, {}),
              requestHeaders: (this as any)._intercepted.requestHeaders,
              responseBody: this.responseText,
              requestBody: (this as any)._intercepted.requestBody,
              type: 'xhr'
            };

            setRequests(prev => [networkRequest, ...prev.slice(0, 99)]);
          }

          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, new Event('readystatechange'));
          }
        };
      }

      return originalXHRSend.call(this, body);
    };

    // Cleanup function
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, [isActive, targetUrl]);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm ||
      request.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.method.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === '2xx' && request.status >= 200 && request.status < 300) ||
      (statusFilter === '3xx' && request.status >= 300 && request.status < 400) ||
      (statusFilter === '4xx' && request.status >= 400 && request.status < 500) ||
      (statusFilter === '5xx' && request.status >= 500) ||
      (statusFilter === 'error' && request.status === 0);

    const matchesMethod = methodFilter === 'all' || request.method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
    if (status >= 400 && status < 500) return 'text-yellow-600 dark:text-yellow-400';
    if (status >= 500) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatTime = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString();
  };

  const formatResponseBody = (body: string): string => {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  const clearRequests = () => {
    setRequests([]);
    setSelectedRequest(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Network Interceptor
            </h3>
            <Button
              variant={isActive ? "primary" : "secondary"}
              size="sm"
              onClick={onToggle}
            >
              <Globe className="w-4 h-4 mr-2" />
              {isActive ? 'Active' : 'Inactive'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearRequests}>
              Clear
            </Button>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {requests.length} requests
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Target URL to intercept (e.g., https://api.example.com)"
            value={targetUrl}
            onChange={(e) => onTargetUrlChange(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="primary"
            onClick={() => {
              if (targetUrl) {
                // Make a test request to the target URL to trigger interception
                fetch(targetUrl, { method: 'GET' }).catch(() => {
                  // Ignore errors, we just want to trigger the interceptor
                });
              }
            }}
            disabled={!targetUrl || !isActive}
          >
            Test URL
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            options={[
              { value: 'all', label: 'All Status' },
              { value: '2xx', label: '2xx Success' },
              { value: '3xx', label: '3xx Redirect' },
              { value: '4xx', label: '4xx Client Error' },
              { value: '5xx', label: '5xx Server Error' },
              { value: 'error', label: 'Network Error' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            options={[
              { value: 'all', label: 'All Methods' },
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' },
              { value: 'PATCH', label: 'PATCH' },
            ]}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 flex">
        <div className="w-1/2 border-r border-neutral-200 dark:border-neutral-800 overflow-auto">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
              {isActive ? 'No network requests captured yet' : 'Activate interceptor to capture requests'}
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-3 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark ${selectedRequest?.id === request.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-mono ${request.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        request.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          request.method === 'PUT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            request.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                        {request.method}
                      </span>
                      <span className={`text-sm font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{request.responseTime}ms</span>
                      <span>{formatTime(request.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                    {request.url}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {request.size} bytes • {request.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Details */}
        <div className="w-1/2 overflow-auto">
          {selectedRequest ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Request Details
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* General Info */}
                <Card>
                  <div className="p-4">
                    <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">General</h5>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-neutral-500 dark:text-neutral-400">URL:</span> {selectedRequest.url}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-400">Method:</span> {selectedRequest.method}</div>
                      <div><span className="text-neutral-500 dark:text-neutral-400">Status:</span> <span className={getStatusColor(selectedRequest.status)}>{selectedRequest.status} {selectedRequest.statusText}</span></div>
                      <div><span className="text-neutral-500 dark:text-neutral-400">Time:</span> {selectedRequest.responseTime}ms</div>
                      <div><span className="text-neutral-500 dark:text-neutral-400">Size:</span> {selectedRequest.size} bytes</div>
                      <div><span className="text-neutral-500 dark:text-neutral-400">Timestamp:</span> {selectedRequest.timestamp.toLocaleString()}</div>
                    </div>
                  </div>
                </Card>

                {/* Request Headers */}
                <Card>
                  <div className="p-4">
                    <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Request Headers</h5>
                    <div className="font-mono text-sm space-y-1">
                      {Object.entries(selectedRequest.requestHeaders).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="text-blue-600 dark:text-blue-400 font-medium min-w-0 flex-1">{key}:</span>
                          <span className="text-neutral-900 dark:text-neutral-100 ml-2 break-all">{value}</span>
                        </div>
                      ))}
                      {Object.keys(selectedRequest.requestHeaders).length === 0 && (
                        <div className="text-neutral-500 dark:text-neutral-400">No request headers</div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Request Body */}
                {selectedRequest.requestBody && (
                  <Card>
                    <div className="p-4">
                      <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Request Body</h5>
                      <pre className="font-mono text-sm bg-neutral-50 dark:bg-neutral-900 p-3 rounded overflow-auto max-h-48">
                        {formatResponseBody(selectedRequest.requestBody)}
                      </pre>
                    </div>
                  </Card>
                )}

                {/* Response Headers */}
                <Card>
                  <div className="p-4">
                    <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Response Headers</h5>
                    <div className="font-mono text-sm space-y-1">
                      {Object.entries(selectedRequest.headers).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="text-green-600 dark:text-green-400 font-medium min-w-0 flex-1">{key}:</span>
                          <span className="text-neutral-900 dark:text-neutral-100 ml-2 break-all">{value}</span>
                        </div>
                      ))}
                      {Object.keys(selectedRequest.headers).length === 0 && (
                        <div className="text-neutral-500 dark:text-neutral-400">No response headers</div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Response Body */}
                <Card>
                  <div className="p-4">
                    <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Response Body</h5>
                    <pre className="font-mono text-sm bg-neutral-50 dark:bg-neutral-900 p-3 rounded overflow-auto max-h-64">
                      {formatResponseBody(selectedRequest.responseBody)}
                    </pre>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
              Select a request to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}