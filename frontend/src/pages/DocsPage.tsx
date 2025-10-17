import React from 'react';
import { Book } from 'lucide-react';
import { Card } from '../components/Card';

export function DocsPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Book className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            API Documentation
          </h1>
        </div>

        <Card>
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Getting Started
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Welcome to API Studio. This tool helps you test, document, and organize your API requests.
            </p>

            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Features
            </h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
              <li>Create and organize API collections</li>
              <li>Test requests with multiple HTTP methods</li>
              <li>Manage multiple environments</li>
              <li>Track request history</li>
              <li>Generate API documentation</li>
            </ul>

            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
              Quick Start
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
              <li>Create a new collection from the Collections page</li>
              <li>Set up your environments with base URLs and variables</li>
              <li>Start making requests and organize them in collections</li>
              <li>Review your request history to track API interactions</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
