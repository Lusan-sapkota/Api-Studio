import React from 'react';
import { Plus, FolderOpen, File } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function CollectionsPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Collections
          </h1>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-500/10 rounded">
                <FolderOpen className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  My API Collection
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                  12 requests
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 text-xs font-medium bg-success-500/10 text-success-600 dark:text-success-500 rounded">
                    GET
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-500 rounded">
                    POST
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent-500/10 rounded">
                <FolderOpen className="w-6 h-6 text-accent-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  External APIs
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                  8 requests
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 text-xs font-medium bg-success-500/10 text-success-600 dark:text-success-500 rounded">
                    GET
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Plus className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mb-2" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Create New Collection
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
