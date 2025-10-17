import React from 'react';
import { Clock } from 'lucide-react';
import { Card } from '../components/Card';

export function HistoryPage() {
  const historyItems = [
    { method: 'GET', url: '/api/users', status: 200, time: '2 minutes ago' },
    { method: 'POST', url: '/api/auth/login', status: 200, time: '5 minutes ago' },
    { method: 'GET', url: '/api/products', status: 404, time: '10 minutes ago' },
    { method: 'PUT', url: '/api/users/123', status: 200, time: '15 minutes ago' },
    { method: 'DELETE', url: '/api/posts/456', status: 204, time: '20 minutes ago' },
  ];

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
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Request History
          </h1>
        </div>

        <div className="space-y-2">
          {historyItems.map((item, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" padding="sm">
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(item.method)}`}>
                  {item.method}
                </span>
                <span className="flex-1 font-mono text-sm text-neutral-700 dark:text-neutral-300">
                  {item.url}
                </span>
                <span className={`text-sm font-semibold ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {item.time}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
