import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, Globe, History, FileText, ChevronLeft, ChevronRight, Send, Network, StickyNote, CheckSquare, Layers, Settings, Wifi, Zap, Database, Mail, ChevronDown, ChevronUp, Users, Shield, Activity, LucideIcon } from 'lucide-react';
import { SidebarItem } from '../components/SidebarItem';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { configService } from '../services/config';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [apiClientsExpanded, setApiClientsExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { canCreateContent, canManageUsers, canViewAuditLogs, canManageSystem } = usePermissions();

  // Determine what features to show based on mode and authentication
  const isLocalMode = configService.isLocalMode();
  const isHostedMode = configService.isHostedMode();
  const showAuthFeatures = isHostedMode && isAuthenticated;

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

  const handleAdminClick = () => {
    if (clickTimeout) {
      // Double click - navigate to admin settings
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      navigate('/settings');
    } else {
      // Single click - toggle dropdown
      const timeout = setTimeout(() => {
        setAdminExpanded(!adminExpanded);
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

  interface MenuItem {
    icon: LucideIcon;
    label: string;
    path: string;
    badge?: number;
  }

  const apiClients: MenuItem[] = [
    { icon: Send, label: 'REST Client', path: '/request' },
    { icon: Wifi, label: 'WebSocket', path: '/websocket' },
    { icon: Database, label: 'GraphQL', path: '/graphql' },
    { icon: Zap, label: 'gRPC', path: '/grpc' },
    { icon: Mail, label: 'SMTP', path: '/smtp' },
  ];

  // Core menu items available to all users
  const coreMenuItems: MenuItem[] = [
    { icon: Network, label: 'Interceptor', path: '/interceptor' },
    { icon: History, label: 'History', path: '/history', badge: historyCount },
    { icon: FileText, label: 'Documentation', path: '/docs' },
  ];

  // Content creation items (editor+ or local mode)
  const contentMenuItems: MenuItem[] = [
    { icon: FolderOpen, label: 'Collections', path: '/collections' },
    { icon: Globe, label: 'Environments', path: '/environments' },
    { icon: StickyNote, label: 'Notes', path: '/notes' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  ];

  // Admin menu items
  const adminMenuItems: MenuItem[] = [
    { icon: Users, label: 'User Management', path: '/settings?tab=users' },
    { icon: Activity, label: 'Audit Logs', path: '/settings?tab=audit' },
    { icon: Settings, label: 'System Settings', path: '/settings?tab=system' },
  ];

  // Filter admin menu items based on permissions
  const visibleAdminMenuItems = adminMenuItems.filter(item => {
    if (item.path.includes('users')) return canManageUsers();
    if (item.path.includes('audit')) return canViewAuditLogs();
    if (item.path.includes('system')) return canManageSystem();
    return false;
  });

  // Combine menu items based on permissions
  const menuItems = [
    ...coreMenuItems,
    ...(canCreateContent() ? contentMenuItems : []),
    ...(isLocalMode ? [{ icon: Settings, label: 'Settings', path: '/settings' }] : []),
  ];



  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-white dark:bg-surface-dark border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-all duration-300 shadow-sm`}
    >
      <div className="flex-1 p-3 space-y-1 overflow-auto scrollbar-thin">
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
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
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
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
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
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
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
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
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

        {/* Admin Section - Only show in hosted mode for users with admin permissions */}
        {showAuthFeatures && visibleAdminMenuItems.length > 0 && (
          <div>
            {collapsed ? (
              <button
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center justify-center p-2 rounded transition-colors ${
                  location.pathname.startsWith('/settings')
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
                }`}
                title="Administration"
              >
                <Shield className="w-5 h-5" />
              </button>
            ) : (
              <div>
                <button
                  onClick={handleAdminClick}
                  className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                    location.pathname.startsWith('/settings')
                      ? 'bg-primary-500/10 text-primary-500'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Administration</span>
                  </div>
                  {adminExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {adminExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {visibleAdminMenuItems.map((adminItem) => (
                      <button
                        key={adminItem.path}
                        onClick={() => navigate(adminItem.path)}
                        className={`w-full flex items-center gap-3 p-2 rounded text-sm transition-colors ${
                          location.pathname === adminItem.path || 
                          (adminItem.path.includes('?tab=') && location.search.includes(adminItem.path.split('?tab=')[1]))
                            ? 'bg-primary-500/10 text-primary-500'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-surface-darker'
                        }`}
                      >
                        <adminItem.icon className="w-4 h-4" />
                        <span>{adminItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
