import React, { useState } from 'react';
import { Play, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Tabs, Tab } from '../components/Tabs';
import { Card } from '../components/Card';

export function RequestPage() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState('params');

  const requestTabs: Tab[] = [
    { id: 'params', title: 'Params' },
    { id: 'headers', title: 'Headers' },
    { id: 'body', title: 'Body' },
    { id: 'auth', title: 'Authorization' },
  ];

  return (
    <div className="h-full flex flex-col">
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
              ]}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
          <Input
            placeholder="Enter request URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button variant="primary">
            <Play className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs tabs={requestTabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 p-4 overflow-auto">
          {activeTab === 'params' && (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Query Parameters
                  </h3>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  No parameters added yet
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
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  No headers added yet
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
                  ]}
                />
                <textarea
                  className="w-full h-64 p-3 bg-background-light dark:bg-background-dark border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter request body"
                />
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
                />
              </div>
            </Card>
          )}
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Response
            </h3>
            <Card className="bg-background-light dark:bg-background-dark">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                Send a request to see the response
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
