import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface Tab {
  id: string;
  title: string;
  closeable?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange, onTabClose }: TabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 bg-surface-light dark:bg-surface-darker">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'text-primary-500 border-primary-500 bg-background-light dark:bg-background-dark'
              : 'text-neutral-600 dark:text-neutral-400 border-transparent hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-background-light/50 dark:hover:bg-background-dark/50'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.title}</span>
          {tab.closeable && onTabClose && (
            <button
              className="opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded p-0.5 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
