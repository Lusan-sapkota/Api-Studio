import React, { useState, useEffect } from 'react';
import { Play, Plus, X, Clock, Search, Copy, Download, Save } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Tabs, Tab } from '../components/Tabs';
import { Card } from '../components/Card';
import { SaveToCollectionModal } from '../components/SaveToCollectionModal';
import { NotesTasksPanel } from '../components/NotesTasksPanel';

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface Param {
  key: string;
  value: string;
  enabled: boolean;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  size: number;
  cookies?: Record<string, string>;
  timing?: {
    dns: number;
    tcp: number;
    tls: number;
    request: number;
    response: number;
    total: number;
  };
}

interface RequestTab {
  id: string;
  title: string;
  method: string;
  url: string;
  headers: Header[];
  params: Param[];
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
  response?: ResponseData | null;
  hasUnsavedChanges?: boolean;
  savedToCollection?: boolean;
}

export function RequestPage() {
  const [activeTab, setActiveTab] = useState('params');
  const [responseTab, setResponseTab] = useState('body');
  const [loading, setLoading] = useState(false);
  const [responseSearch, setResponseSearch] = useState('');
  const [apiRequestTabs, setApiRequestTabs] = useState<RequestTab[]>([
    {
      id: 'tab-1',
      title: 'New Request',
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: '',
      bodyType: 'json',
      authType: 'none',
      authData: {
        bearerToken: '',
        basicUsername: '',
        basicPassword: '',
        apiKey: '',
        apiKeyName: ''
      },
      response: null,
      hasUnsavedChanges: false,
      savedToCollection: false
    }
  ]);
  const [activeRequestTab, setActiveRequestTab] = useState('tab-1');
  const [history, setHistory] = useState<RequestTab[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Get current tab data
  const currentTab = apiRequestTabs.find(tab => tab.id === activeRequestTab) || apiRequestTabs[0];
  const { method, url, headers, params, body, bodyType, authType, authData, response } = currentTab;

  // Environment variables support
  const replaceEnvironmentVariables = (text: string): string => {
    const environments = JSON.parse(localStorage.getItem('api-environments') || '[]');
    const activeEnv = environments.find((env: any) => env.active);
    
    if (!activeEnv) return text;
    
    let result = text;
    activeEnv.variables.forEach((variable: any) => {
      if (variable.enabled) {
        const regex = new RegExp(`{{${variable.key}}}`, 'g');
        result = result.replace(regex, variable.value);
      }
    });
    
    return result;
  };

  const requestTabs: Tab[] = [
    { id: 'params', title: 'Params' },
    { id: 'headers', title: 'Headers' },
    { id: 'body', title: 'Body' },
    { id: 'auth', title: 'Authorization' },
    { id: 'notes', title: 'Notes & Tasks' },
  ];

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('api-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Check if we need to load a request from history
    const loadRequest = sessionStorage.getItem('loadRequest');
    if (loadRequest) {
      try {
        const requestData = JSON.parse(loadRequest);
        const newTabId = `tab-${Date.now()}`;
        const newTab: RequestTab = {
          ...requestData,
          id: newTabId,
        };
        setApiRequestTabs(prev => [...prev, newTab]);
        setActiveRequestTab(newTabId);
        sessionStorage.removeItem('loadRequest');
      } catch (error) {
        console.error('Failed to load request from history:', error);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (requestData: RequestTab) => {
    const historyItem = {
      ...requestData,
      id: `history-${Date.now()}`,
      title: `${requestData.method} ${requestData.url}`,
      timestamp: new Date().toISOString(),
    };
    const newHistory = [historyItem, ...history.slice(0, 49)]; // Keep last 50 requests
    setHistory(newHistory);
    localStorage.setItem('api-history', JSON.stringify(newHistory));
  };

  // Tab management functions
  const addNewTab = () => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: RequestTab = {
      id: newTabId,
      title: 'New Request',
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: '',
      bodyType: 'json',
      authType: 'none',
      authData: {
        bearerToken: '',
        basicUsername: '',
        basicPassword: '',
        apiKey: '',
        apiKeyName: ''
      },
      response: null,
      hasUnsavedChanges: false,
      savedToCollection: false
    };
    setApiRequestTabs([...apiRequestTabs, newTab]);
    setActiveRequestTab(newTabId);
  };

  const closeTab = (tabId: string) => {
    if (apiRequestTabs.length === 1) return; // Don't close the last tab
    
    const newTabs = apiRequestTabs.filter(tab => tab.id !== tabId);
    setApiRequestTabs(newTabs);
    
    if (activeRequestTab === tabId) {
      setActiveRequestTab(newTabs[0].id);
    }
  };

  const updateCurrentTab = (updates: Partial<RequestTab>) => {
    setApiRequestTabs(tabs => 
      tabs.map(tab => 
        tab.id === activeRequestTab 
          ? { 
              ...tab, 
              ...updates, 
              hasUnsavedChanges: true,
              savedToCollection: false 
            }
          : tab
      )
    );
  };

  const duplicateTab = (tabId: string) => {
    const tabToDuplicate = apiRequestTabs.find(tab => tab.id === tabId);
    if (!tabToDuplicate) return;

    const newTabId = `tab-${Date.now()}`;
    const duplicatedTab: RequestTab = {
      ...tabToDuplicate,
      id: newTabId,
      title: `${tabToDuplicate.title} (Copy)`,
      response: null,
      hasUnsavedChanges: true,
      savedToCollection: false
    };
    
    setApiRequestTabs([...apiRequestTabs, duplicatedTab]);
    setActiveRequestTab(newTabId);
  };

  const handleSaveToCollection = (collectionId: number, folderId?: string, requestName?: string) => {
    const collections = JSON.parse(localStorage.getItem('api-collections') || '[]');
    const collection = collections.find((c: any) => c.id === collectionId);
    
    if (!collection) return;
    
    const newRequest = {
      id: Date.now(),
      name: requestName || `${currentTab.method} ${currentTab.url}`,
      method: currentTab.method,
      url: currentTab.url,
      headers: currentTab.headers,
      params: currentTab.params,
      body: currentTab.body,
      bodyType: currentTab.bodyType,
      authType: currentTab.authType,
      authData: currentTab.authData
    };
    
    if (folderId) {
      // Save to folder
      const folder = collection.folders?.find((f: any) => f.id === folderId);
      if (folder) {
        folder.requests.push(newRequest);
      }
    } else {
      // Save to root collection
      collection.requests.push(newRequest);
    }
    
    localStorage.setItem('api-collections', JSON.stringify(collections));
    
    // Mark as saved
    updateCurrentTab({ 
      hasUnsavedChanges: false, 
      savedToCollection: true,
      title: requestName || currentTab.title
    });
  };

  const addHeader = () => {
    const newHeaders = [...headers, { key: '', value: '', enabled: true }];
    updateCurrentTab({ headers: newHeaders });
  };

  const updateHeader = (index: number, field: keyof Header, value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateCurrentTab({ headers: newHeaders });
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    updateCurrentTab({ headers: newHeaders });
  };

  const addParam = () => {
    const newParams = [...params, { key: '', value: '', enabled: true }];
    updateCurrentTab({ params: newParams });
  };

  const updateParam = (index: number, field: keyof Param, value: string | boolean) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    updateCurrentTab({ params: newParams });
  };

  const removeParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    updateCurrentTab({ params: newParams });
  };

  const buildUrlWithParams = () => {
    const enabledParams = params.filter(p => p.enabled && p.key.trim());
    if (enabledParams.length === 0) return url;

    const paramsString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');

    const separator = url.includes('?') ? '&' : '?';
    return url + separator + paramsString;
  };

  const sendRequest = async () => {
    if (!url.trim()) return;

    setLoading(true);
    updateCurrentTab({ response: null });

    try {
      const requestUrl = replaceEnvironmentVariables(buildUrlWithParams());
      const enabledHeaders = headers.filter(h => h.enabled && h.key.trim());

      // Add authentication headers
      const authHeaders: Record<string, string> = {};
      if (authType === 'bearer' && authData.bearerToken) {
        authHeaders['Authorization'] = `Bearer ${authData.bearerToken}`;
      } else if (authType === 'basic' && authData.basicUsername && authData.basicPassword) {
        const credentials = btoa(`${authData.basicUsername}:${authData.basicPassword}`);
        authHeaders['Authorization'] = `Basic ${credentials}`;
      } else if (authType === 'apikey' && authData.apiKeyName && authData.apiKey) {
        authHeaders[authData.apiKeyName] = authData.apiKey;
      }

      const requestData = {
        method,
        url: requestUrl,
        headers: { 
          ...Object.fromEntries(enabledHeaders.map(h => [
            replaceEnvironmentVariables(h.key), 
            replaceEnvironmentVariables(h.value)
          ])), 
          ...authHeaders 
        },
        body: bodyType !== 'none' ? replaceEnvironmentVariables(body) : null
      };

      const startTime = Date.now();
      const res = await fetch('http://localhost:58123/requests/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let responseData: ResponseData;
      if (res.ok) {
        const data = await res.json();
        responseData = {
          status: data.status_code,
          statusText: getStatusText(data.status_code),
          headers: data.headers,
          body: data.body,
          responseTime,
          size: new Blob([data.body]).size
        };
      } else {
        const errorData = await res.json();
        responseData = {
          status: res.status,
          statusText: errorData.detail || 'Request failed',
          headers: {},
          body: errorData.detail || 'Request failed',
          responseTime,
          size: 0
        };
      }

      // Update current tab with response
      updateCurrentTab({ response: responseData });
      
      // Save to history
      saveToHistory({ ...currentTab, response: responseData });
      
      // Update tab title if it's still "New Request"
      if (currentTab.title === 'New Request' && url) {
        const title = url.length > 30 ? `${method} ${url.substring(0, 30)}...` : `${method} ${url}`;
        updateCurrentTab({ title });
      }

    } catch (error) {
      const errorResponse: ResponseData = {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: error instanceof Error ? error.message : 'Unknown error',
        responseTime: 0,
        size: 0
      };
      updateCurrentTab({ response: errorResponse });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number): string => {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
    };
    return statusTexts[status] || 'Unknown';
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatResponseBody = (body: string): string => {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };



  const highlightSearchText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadResponse = (body: string, filename: string = 'response.txt') => {
    const blob = new Blob([body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PanelGroup direction="vertical" className="h-full flex flex-col">
      {/* Request Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-surface-light dark:bg-surface-dark">
        <div className="flex items-center overflow-x-auto">
          {apiRequestTabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 border-r border-neutral-200 dark:border-neutral-800 cursor-pointer min-w-0 ${
                activeRequestTab === tab.id
                  ? 'bg-background-light dark:bg-background-dark border-b-2 border-primary-500'
                  : 'hover:bg-surface-dark/50 dark:hover:bg-surface-darker'
              }`}
              onClick={() => setActiveRequestTab(tab.id)}
            >
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                tab.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                tab.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                tab.method === 'PUT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                tab.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {tab.method}
              </span>
              <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate max-w-32 flex items-center gap-1">
                {tab.title}
                {tab.hasUnsavedChanges && !tab.savedToCollection && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                )}
              </span>
              {tab.response && (
                <div className={`w-2 h-2 rounded-full ${
                  tab.response.status >= 200 && tab.response.status < 300 ? 'bg-green-500' :
                  tab.response.status >= 400 ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
              )}
              {apiRequestTabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addNewTab}
            className="flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-surface-dark/50 dark:hover:bg-surface-darker"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>

      {/* Request URL Bar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Select
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'PATCH', label: 'PATCH' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'HEAD', label: 'HEAD' },
                { value: 'OPTIONS', label: 'OPTIONS' },
              ]}
              value={method}
              onChange={(e) => updateCurrentTab({ method: e.target.value })}
            />
          </div>
          <Input
            placeholder="Enter request URL"
            value={url}
            onChange={(e) => updateCurrentTab({ url: e.target.value })}
            className="flex-1"
          />
          <Button variant="primary" onClick={sendRequest} disabled={loading}>
            {loading ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Send
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowSaveModal(true)} 
            title="Save to collection"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => duplicateTab(activeRequestTab)} title="Duplicate tab">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Panel defaultSize={60} minSize={30} className="flex-1 flex flex-col overflow-hidden">
        <Tabs tabs={requestTabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 p-4 overflow-auto">
          {activeTab === 'params' && (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Query Parameters
                  </h3>
                  <Button variant="ghost" size="sm" onClick={addParam}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {params.map((param, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(e) => updateParam(index, 'enabled', e.target.checked)}
                        className="rounded"
                        title="Enable parameter"
                      />
                      <Input
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => updateParam(index, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => updateParam(index, 'value', e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeParam(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {params.length === 0 && (
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      No parameters added yet
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'headers' && (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Request Headers
                  </h3>
                  <Button variant="ghost" size="sm" onClick={addHeader}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                        className="rounded"
                        title="Enable header"
                      />
                      <Input
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Header value"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeHeader(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'body' && (
            <Card>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Request Body
                </h3>
                <Select
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'json', label: 'JSON' },
                    { value: 'form', label: 'Form Data' },
                    { value: 'raw', label: 'Raw' },
                    { value: 'xml', label: 'XML' },
                    { value: 'html', label: 'HTML' },
                    { value: 'text', label: 'Text' },
                  ]}
                  value={bodyType}
                  onChange={(e) => updateCurrentTab({ bodyType: e.target.value })}
                />
                {bodyType !== 'none' && (
                  <textarea
                    className="w-full h-64 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={
                      bodyType === 'json' ? '{"key": "value"}' :
                      bodyType === 'xml' ? '<root><element>value</element></root>' :
                      bodyType === 'html' ? '<div>Hello World</div>' :
                      bodyType === 'form' ? 'key1=value1&key2=value2' :
                      'Enter request body'
                    }
                    value={body}
                    onChange={(e) => updateCurrentTab({ body: e.target.value })}
                  />
                )}
              </div>
            </Card>
          )}

          {activeTab === 'auth' && (
            <Card>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Authorization
                </h3>
                <Select
                  options={[
                    { value: 'none', label: 'No Auth' },
                    { value: 'bearer', label: 'Bearer Token' },
                    { value: 'basic', label: 'Basic Auth' },
                    { value: 'apikey', label: 'API Key' },
                  ]}
                  value={authType}
                  onChange={(e) => updateCurrentTab({ authType: e.target.value })}
                />
                
                {authType === 'bearer' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Token
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter bearer token"
                      value={authData.bearerToken}
                      onChange={(e) => updateCurrentTab({ authData: {...authData, bearerToken: e.target.value} })}
                    />
                  </div>
                )}
                
                {authType === 'basic' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Username
                      </label>
                      <Input
                        placeholder="Enter username"
                        value={authData.basicUsername}
                        onChange={(e) => updateCurrentTab({ authData: {...authData, basicUsername: e.target.value} })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={authData.basicPassword}
                        onChange={(e) => updateCurrentTab({ authData: {...authData, basicPassword: e.target.value} })}
                      />
                    </div>
                  </div>
                )}
                
                {authType === 'apikey' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Key
                      </label>
                      <Input
                        placeholder="Enter API key name"
                        value={authData.apiKeyName}
                        onChange={(e) => updateCurrentTab({ authData: {...authData, apiKeyName: e.target.value} })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Value
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter API key value"
                        value={authData.apiKey}
                        onChange={(e) => updateCurrentTab({ authData: {...authData, apiKey: e.target.value} })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="header"
                        name="apiKeyLocation"
                        value="header"
                        defaultChecked
                        className="text-primary-500"
                      />
                      <label htmlFor="header" className="text-sm text-neutral-700 dark:text-neutral-300">
                        Add to Header
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'notes' && (
            <NotesTasksPanel 
              contextType="request" 
              contextId={activeRequestTab}
              className="h-full"
            />
          )}
        </div>
      </Panel>

      <PanelResizeHandle className="h-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-row-resize" />

      <Panel defaultSize={40} minSize={20}>
        <div className="h-full border-t border-neutral-200 dark:border-neutral-800">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Response
              </h3>
              {response && (
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-medium ${getStatusColor(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {response.responseTime}ms
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {response.size} B
                  </span>
                </div>
              )}
            </div>
            <Card className="bg-background-light dark:bg-background-dark flex-1 flex flex-col">
              {response ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                    <Tabs
                      tabs={[
                        { id: 'body', title: 'Body' },
                        { id: 'headers', title: 'Headers' },
                        { id: 'cookies', title: 'Cookies' },
                        { id: 'timing', title: 'Timing' },
                      ]}
                      activeTab={responseTab}
                      onTabChange={setResponseTab}
                    />
                    {responseTab === 'body' && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                          <Input
                            placeholder="Search response..."
                            value={responseSearch}
                            onChange={(e) => setResponseSearch(e.target.value)}
                            className="pl-9 w-48"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(response.body)}
                          title="Copy response"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadResponse(response.body)}
                          title="Download response"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    {responseTab === 'body' && (
                      <div className="font-mono text-sm max-h-96 overflow-auto">
                        <pre className="whitespace-pre-wrap text-neutral-900 dark:text-neutral-100 p-3 bg-neutral-50 dark:bg-neutral-900 rounded border">
                          {highlightSearchText(formatResponseBody(response.body), responseSearch)}
                        </pre>
                      </div>
                    )}
                    {responseTab === 'headers' && (
                      <div className="font-mono text-sm space-y-1">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="flex py-1">
                            <span className="text-blue-600 dark:text-blue-400 font-medium min-w-0 flex-1">
                              {key}:
                            </span>
                            <span className="text-neutral-900 dark:text-neutral-100 ml-2 break-all">
                              {value}
                            </span>
                          </div>
                        ))}
                        {Object.keys(response.headers).length === 0 && (
                          <div className="text-neutral-500 dark:text-neutral-400">
                            No headers received
                          </div>
                        )}
                      </div>
                    )}
                    {responseTab === 'cookies' && (
                      <div className="font-mono text-sm">
                        {response.cookies && Object.keys(response.cookies).length > 0 ? (
                          Object.entries(response.cookies).map(([key, value]) => (
                            <div key={key} className="flex py-1">
                              <span className="text-green-600 dark:text-green-400 font-medium min-w-0 flex-1">
                                {key}
                              </span>
                              <span className="text-neutral-900 dark:text-neutral-100 ml-2 break-all">
                                {value}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-neutral-500 dark:text-neutral-400">
                            No cookies received
                          </div>
                        )}
                      </div>
                    )}
                    {responseTab === 'timing' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">Total Time:</span>
                            <span className="ml-2 font-mono">{response.responseTime}ms</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">DNS Lookup:</span>
                            <span className="ml-2 font-mono">{response.timing?.dns || 'N/A'}ms</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">TCP Handshake:</span>
                            <span className="ml-2 font-mono">{response.timing?.tcp || 'N/A'}ms</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">TLS Handshake:</span>
                            <span className="ml-2 font-mono">{response.timing?.tls || 'N/A'}ms</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">Request:</span>
                            <span className="ml-2 font-mono">{response.timing?.request || 'N/A'}ms</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-neutral-600 dark:text-neutral-400">Response:</span>
                            <span className="ml-2 font-mono">{response.timing?.response || 'N/A'}ms</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8 flex-1 flex items-center justify-center">
                  Send a request to see the response
                </div>
              )}
            </Card>
          </div>
        </div>
      </Panel>

      {/* Save to Collection Modal */}
      <SaveToCollectionModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveToCollection}
        defaultRequestName={currentTab.url ? `${currentTab.method} ${currentTab.url}` : 'New Request'}
      />
    </PanelGroup>
  );
}
