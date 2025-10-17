import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, Globe, History, FileText, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { SidebarItem } from '../components/SidebarItem';
import { Button } from '../components/Button';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: Send, label: 'API Client', path: '/request' },
    { icon: FolderOpen, label: 'Collections', path: '/collections' },
    { icon: Globe, label: 'Environments', path: '/environments' },
    { icon: History, label: 'History', path: '/history', badge: 5 },
    { icon: FileText, label: 'Documentation', path: '/docs' },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-surface-light dark:bg-surface-dark border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-all duration-slow`}
    >
      <div className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <div key={item.path}>
            {collapsed ? (
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-center p-2 rounded transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-dark/50 dark:hover:bg-surface-darker'
                }`}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ) : (
              <SidebarItem
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                badge={item.badge}
              />
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="flex-1 text-left">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
