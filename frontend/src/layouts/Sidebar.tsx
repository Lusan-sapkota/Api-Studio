import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, Globe, History, FileText, ChevronLeft, ChevronRight, Send, Network, ChevronDown, ChevronUp, File, Plus, Trash2 } from 'lucide-react';
import { SidebarItem } from '../components/SidebarItem';
import { Button } from '../components/Button';

interface Collection {
  id: number;
  name: string;
  requests: any[];
  folders?: Folder[];
  expanded?: boolean;
}

interface Folder {
  id: string;
  name: string;
  requests: any[];
  folders?: Folder[];
  expanded?: boolean;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsExpanded, setCollectionsExpanded] = useState(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const updateHistoryCount = () => {
      const history = JSON.parse(localStorage.getItem('api-history') || '[]');
      setHistoryCount(history.length);
    };

    const updateCollections = () => {
      const savedCollections = JSON.parse(localStorage.getItem('api-collections') || '[]');
      setCollections(savedCollections);
    };

    updateHistoryCount();
    updateCollections();
    
    // Listen for storage changes
    window.addEventListener('storage', updateHistoryCount);
    window.addEventListener('storage', updateCollections);
    
    // Check periodically for changes (in case localStorage is updated from same tab)
    const interval = setInterval(() => {
      updateHistoryCount();
      updateCollections();
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', updateHistoryCount);
      window.removeEventListener('storage', updateCollections);
      clearInterval(interval);
    };
  }, []);

  const menuItems = [
    { icon: Send, label: 'API Client', path: '/request' },
    { icon: Network, label: 'Interceptor', path: '/interceptor' },
    { icon: Globe, label: 'Environments', path: '/environments' },
    { icon: History, label: 'History', path: '/history', badge: historyCount },
    { icon: FileText, label: 'Documentation', path: '/docs' },
  ];

  const handleCollectionClick = (collection: Collection) => {
    if (clickTimeout) {
      // Double click - navigate to dedicated page
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      navigate(`/collections/${collection.id}`);
    } else {
      // Single click - toggle expansion (70% rule)
      setClickTimeout(setTimeout(() => {
        const newCollections = collections.map(c => 
          c.id === collection.id ? { ...c, expanded: !c.expanded } : c
        );
        setCollections(newCollections);
        localStorage.setItem('api-collections', JSON.stringify(newCollections));
        setClickTimeout(null);
      }, 250));
    }
  };

  const loadRequestInNewTab = (request: any, e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('loadRequest', JSON.stringify(request));
    navigate('/request');
  };

  const deleteCollection = (collectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this collection?')) {
      const newCollections = collections.filter(c => c.id !== collectionId);
      setCollections(newCollections);
      localStorage.setItem('api-collections', JSON.stringify(newCollections));
    }
  };

  const createFolder = (collectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const newCollections = collections.map(c => {
      if (c.id === collectionId) {
        const newFolder = {
          id: `folder-${Date.now()}`,
          name: folderName,
          requests: [],
          folders: [],
          expanded: false
        };
        return { ...c, folders: [...(c.folders || []), newFolder] };
      }
      return c;
    });
    
    setCollections(newCollections);
    localStorage.setItem('api-collections', JSON.stringify(newCollections));
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-green-600',
      POST: 'text-blue-600',
      PUT: 'text-orange-600',
      DELETE: 'text-red-600',
      PATCH: 'text-purple-600',
    };
    return colors[method] || 'text-gray-600';
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-surface-light dark:bg-surface-dark border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-all duration-slow`}
    >
      <div className="flex-1 p-3 space-y-1 overflow-auto">
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

        {/* Collections Section */}
        {!collapsed && (
          <div className="mt-4">
            <div 
              className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-surface-dark/50 dark:hover:bg-surface-darker"
              onClick={() => setCollectionsExpanded(!collectionsExpanded)}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Collections</span>
              </div>
              {collectionsExpanded ? (
                <ChevronUp className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              )}
            </div>

            {collectionsExpanded && (
              <div className="ml-2 mt-2 space-y-1">
                {collections.map((collection) => (
                  <div key={collection.id}>
                    <div 
                      className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-surface-dark/50 dark:hover:bg-surface-darker group"
                      onClick={() => handleCollectionClick(collection)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {collection.expanded ? (
                            <ChevronDown className="w-3 h-3 text-neutral-500" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-neutral-500" />
                          )}
                          <FolderOpen className="w-4 h-4 text-primary-500" />
                        </div>
                        <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {collection.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => createFolder(collection.id, e)}
                          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                          title="Add folder"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => deleteCollection(collection.id, e)}
                          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                          title="Delete collection"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {collection.expanded && (
                      <div className="ml-4 space-y-1">
                        {/* Folders */}
                        {collection.folders?.map((folder) => (
                          <div key={folder.id} className="ml-2">
                            <div className="flex items-center gap-2 p-1 rounded hover:bg-surface-dark/50 dark:hover:bg-surface-darker">
                              <FolderOpen className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate">
                                {folder.name}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {/* Requests */}
                        {collection.requests?.map((request) => (
                          <div 
                            key={request.id}
                            className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-surface-dark/50 dark:hover:bg-surface-darker group"
                            onClick={(e) => loadRequestInNewTab(request, e)}
                          >
                            <File className="w-3 h-3 text-neutral-400" />
                            <span className={`text-xs font-mono ${getMethodColor(request.method)}`}>
                              {request.method}
                            </span>
                            <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1">
                              {request.name}
                            </span>
                          </div>
                        ))}
                        
                        {(!collection.requests || collection.requests.length === 0) && 
                         (!collection.folders || collection.folders.length === 0) && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 p-2 text-center">
                            Empty collection
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {collections.length === 0 && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 p-2 text-center">
                    No collections yet
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
