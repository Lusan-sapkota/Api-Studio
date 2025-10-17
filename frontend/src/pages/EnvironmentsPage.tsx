import React from 'react';
import { Plus, Globe } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function EnvironmentsPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Environments
          </h1>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Environment
          </Button>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-success-500/10 rounded">
                <Globe className="w-6 h-6 text-success-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Development
                  </h3>
                  <span className="px-2 py-1 text-xs font-semibold bg-success-500/10 text-success-600 dark:text-success-500 rounded">
                    Active
                  </span>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                  Local development environment
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs font-mono bg-surface-dark/50 dark:bg-surface-darker text-neutral-700 dark:text-neutral-300 rounded">
                    BASE_URL: http://localhost:3000
                  </span>
                  <span className="px-2 py-1 text-xs font-mono bg-surface-dark/50 dark:bg-surface-darker text-neutral-700 dark:text-neutral-300 rounded">
                    API_KEY: dev_***
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-warning-500/10 rounded">
                <Globe className="w-6 h-6 text-warning-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Staging
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                  Staging environment for testing
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs font-mono bg-surface-dark/50 dark:bg-surface-darker text-neutral-700 dark:text-neutral-300 rounded">
                    BASE_URL: https://staging.api.example.com
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-500/10 rounded">
                <Globe className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Production
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                  Production environment
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs font-mono bg-surface-dark/50 dark:bg-surface-darker text-neutral-700 dark:text-neutral-300 rounded">
                    BASE_URL: https://api.example.com
                  </span>
                  <span className="px-2 py-1 text-xs font-mono bg-surface-dark/50 dark:bg-surface-darker text-neutral-700 dark:text-neutral-300 rounded">
                    API_KEY: prod_***
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
