import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, Globe, History, FileText, ChevronLeft, ChevronRight, Send, Network, StickyNote, CheckSquare, Layers, Settings, Wifi, Zap, Database, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { SidebarItem } from '../components/SidebarItem';
import { Button } from '../components/Button';



export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [apiClientsExpanded, setApiClientsExpanded] = useState(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);


  const navigate = useNavigate();
  const location = useLocation();

  const handleApiClientsClick = () => {
    if (clickTimeout) {
      // Double click - navigate to API clients page
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      navigate('/api-clients');
    } else {
      // Single click - toggle dropdown
      const timeout = setTimeout(() => {
        setApiClientsExpanded(!apiClientsExpanded);
        setClickTimeout(null);
      }, 200);
      setClickTimeout(timeout);
    }
  };

  React.useEffect(() => {
    const updateHistoryCount = () => {
      const history = JSON.parse(localStorage.getItem('api-history') || '[]');
      setHistoryCount(history.length);
    };

    updateHistoryCount();
    
    // Listen for storage changes
    window.addEventListener('storage', updateHistoryCount);
    
    // Check periodically for changes (in case localStorage is updated from same tab)
    const interval = setInterval(() => {
      updateHistoryCount();
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', updateHistoryCount);
      clearInterval(interval);
    };
  }, []);

  const apiClients = [
    { icon: Send, label: 'REST Client', path: '/request' },
    { icon: Wifi, label: 'WebSocket', path: '/websocket' },
    { icon: Database, label: 'GraphQL', path: '/graphql' },
    { icon: Zap, label: 'gRPC', path: '/grpc' },
    { icon: Mail, label: 'SMTP', path: '/smtp' },
  ];

  const menuItems = [
    { icon: Network, label: 'Interceptor', path: '/interceptor' },
    { icon: FolderOpen, label: 'Collections', path: '/collections' },
    { icon: Globe, label: 'Environments', path: '/environments' },
    { icon: StickyNote, label: 'Notes', path: '/notes' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: History, label: 'History', path: '/history', badge: historyCount },
    { icon: FileText, label: 'Documentation', path: '/docs' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];



  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-surface-light dark:bg-surface-dark border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-all duration-slow`}
    >
      <div className="flex-1 p-3 space-y-1 overflow-auto">
        {/* API Clients Dropdown */}
        <div>
          {collapsed ? (
            <button
              onClick={() => navigate('/api-clients')}
              className={`w-full flex items-center justify-center p-2 rounded transition-colors ${
                location.pathname.startsWith('/api-clients') || 
                location.pathname === '/request' || 
                location.pathname === '/websocket' || 
                location.pathname === '/graphql' || 
                location.pathname === '/grpc' || 
                location.pathname === '/smtp'
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-dark/50 dark:hover:bg-surface-darker'
              }`}
              title="API Clients"
            >
              <Layers className="w-5 h-5" />
            </button>
          ) : (
            <div>
              <button
                onClick={handleApiClientsClick}
                className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                  location.pathname.startsWith('/api-clients') || 
                  location.pathname === '/request' || 
                  location.pathname === '/websocket' || 
                  location.pathname === '/graphql' || 
                  location.pathname === '/grpc' || 
                  location.pathname === '/smtp'
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-dark/50 dark:hover:bg-surface-darker'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5" />
                  <span className="font-medium">API Clients</span>
                </div>
                {apiClientsExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {apiClientsExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {apiClients.map((client) => (
                    <button
                      key={client.path}
                      onClick={() => navigate(client.path)}
                      className={`w-full flex items-center gap-3 p-2 rounded text-sm transition-colors ${
                        location.pathname === client.path
                          ? 'bg-primary-500/10 text-primary-500'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-dark/50 dark:hover:bg-surface-darker'
                      }`}
                    >
                      <client.icon className="w-4 h-4" />
                      <span>{client.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Regular Menu Items */}
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
