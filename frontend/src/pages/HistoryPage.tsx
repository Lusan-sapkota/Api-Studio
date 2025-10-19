import { useState, useEffect } from 'react';
import { Clock, Search, Trash2, Play, Copy } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Select } from '../components/Select';

interface HistoryItem {
  id: string;
  title: string;
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  body: string;
  bodyType: string;
  authType: string;
  authData: {
    bearerToken: string;
    basicUsername: string;
    basicPassword: string;
    apiKey: string;
    apiKeyName: string;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
    size: number;
  } | null;
  timestamp: string;
}

export function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const savedHistory = localStorage.getItem('api-history');
    if (savedHistory) {
      setHistoryItems(JSON.parse(savedHistory));
    }
  }, []);

  const filteredItems = historyItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === 'all' || item.method === methodFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === '2xx' && item.response && item.response.status >= 200 && item.response.status < 300) ||
      (statusFilter === '3xx' && item.response && item.response.status >= 300 && item.response.status < 400) ||
      (statusFilter === '4xx' && item.response && item.response.status >= 400 && item.response.status < 500) ||
      (statusFilter === '5xx' && item.response && item.response.status >= 500) ||
      (statusFilter === 'error' && (!item.response || item.response.status === 0));
    
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const clearHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem('api-history');
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = historyItems.filter(item => item.id !== id);
    setHistoryItems(newHistory);
    localStorage.setItem('api-history', JSON.stringify(newHistory));
  };

  const loadRequestInNewTab = (item: HistoryItem) => {
    // This would ideally communicate with the RequestPage to open a new tab
    // For now, we'll store it in sessionStorage and navigate
    sessionStorage.setItem('loadRequest', JSON.stringify(item));
    window.location.href = '/request';
  };

  const copyRequestAsCurl = (item: HistoryItem) => {
    let curl = `curl -X ${item.method}`;
    
    // Add headers
    item.headers.filter(h => h.enabled && h.key.trim()).forEach(header => {
      curl += ` -H "${header.key}: ${header.value}"`;
    });
    
    // Add auth headers
    if (item.authType === 'bearer' && item.authData.bearerToken) {
      curl += ` -H "Authorization: Bearer ${item.authData.bearerToken}"`;
    } else if (item.authType === 'basic' && item.authData.basicUsername && item.authData.basicPassword) {
      const credentials = btoa(`${item.authData.basicUsername}:${item.authData.basicPassword}`);
      curl += ` -H "Authorization: Basic ${credentials}"`;
    } else if (item.authType === 'apikey' && item.authData.apiKeyName && item.authData.apiKey) {
      curl += ` -H "${item.authData.apiKeyName}: ${item.authData.apiKey}"`;
    }
    
    // Add body
    if (item.bodyType !== 'none' && item.body) {
      curl += ` -d '${item.body}'`;
    }
    
    // Add URL with params
    let url = item.url;
    const enabledParams = item.params.filter(p => p.enabled && p.key.trim());
    if (enabledParams.length > 0) {
      const paramsString = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      const separator = url.includes('?') ? '&' : '?';
      url = url + separator + paramsString;
    }
    
    curl += ` "${url}"`;
    
    navigator.clipboard.writeText(curl);
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-success-600 dark:text-success-500 bg-success-500/10',
      POST: 'text-primary-600 dark:text-primary-500 bg-primary-500/10',
      PUT: 'text-accent-600 dark:text-accent-500 bg-accent-500/10',
      DELETE: 'text-error-600 dark:text-error-500 bg-error-500/10',
    };
    return colors[method] || 'text-neutral-600 dark:text-neutral-500 bg-neutral-500/10';
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-success-600 dark:text-success-500';
    if (status >= 400 && status < 500) return 'text-warning-600 dark:text-warning-500';
    if (status >= 500) return 'text-error-600 dark:text-error-500';
    return 'text-neutral-600 dark:text-neutral-500';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Request History
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {historyItems.length} requests
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
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
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              {historyItems.length === 0 ? 'No history yet' : 'No matching requests'}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {historyItems.length === 0 
                ? 'Send some requests to see them here' 
                : 'Try adjusting your search or filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-6xl mx-auto">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow" padding="sm">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(item.method)}`}>
                    {item.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-neutral-700 dark:text-neutral-300 truncate">
                      {item.url}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {item.title}
                    </div>
                  </div>
                  {item.response && (
                    <span className={`text-sm font-semibold ${getStatusColor(item.response.status)}`}>
                      {item.response.status}
                    </span>
                  )}
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadRequestInNewTab(item)}
                      title="Load in new tab"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyRequestAsCurl(item)}
                      title="Copy as cURL"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHistoryItem(item.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
