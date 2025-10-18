import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, File, ChevronRight, ChevronDown, Trash2, Edit2, Send } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useNavigate } from 'react-router-dom';

interface Request {
  id: number;
  name: string;
  method: string;
  url: string;
  headers: any[];
  params: any[];
  body: string;
  bodyType: string;
  authType: string;
  authData: any;
}

interface Collection {
  id: number;
  name: string;
  requests: Request[];
  expanded?: boolean;
}

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCollections = localStorage.getItem('api-collections');
    if (savedCollections) {
      setCollections(JSON.parse(savedCollections));
    }
  }, []);

  const saveCollections = (newCollections: Collection[]) => {
    setCollections(newCollections);
    localStorage.setItem('api-collections', JSON.stringify(newCollections));
  };

  const createNewCollection = () => {
    const name = prompt('Enter collection name:');
    if (!name) return;

    const newCollection: Collection = {
      id: Date.now(),
      name,
      requests: [],
      expanded: false
    };

    saveCollections([...collections, newCollection]);
  };

  const deleteCollection = (collectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this collection?')) {
      saveCollections(collections.filter(c => c.id !== collectionId));
    }
  };

  const renameCollection = (collectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const newName = prompt('Enter new collection name:', collection.name);
    if (!newName) return;

    saveCollections(collections.map(c => 
      c.id === collectionId ? { ...c, name: newName } : c
    ));
  };

  const handleCollectionClick = (collection: Collection) => {
    if (clickTimeout) {
      // Double click - navigate to dedicated page
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      navigate(`/collections/${collection.id}`);
    } else {
      // Single click - toggle expansion
      setClickTimeout(setTimeout(() => {
        saveCollections(collections.map(c => 
          c.id === collection.id ? { ...c, expanded: !c.expanded } : c
        ));
        setClickTimeout(null);
      }, 250));
    }
  };

  const loadRequestInNewTab = (request: Request, e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('loadRequest', JSON.stringify(request));
    navigate('/request');
  };

  const deleteRequest = (collectionId: number, requestId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this request?')) {
      saveCollections(collections.map(c => 
        c.id === collectionId 
          ? { ...c, requests: c.requests.filter(r => r.id !== requestId) }
          : c
      ));
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Collections
          </h1>
          <Button variant="primary" onClick={createNewCollection}>
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        <div className="space-y-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark"
                onClick={() => handleCollectionClick(collection)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {collection.expanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    )}
                    <FolderOpen className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {collection.requests.length} requests
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => renameCollection(collection.id, e)}
                    title="Rename collection"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteCollection(collection.id, e)}
                    title="Delete collection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {collection.expanded && (
                <div className="border-t border-neutral-200 dark:border-neutral-800">
                  {collection.requests.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                      No requests in this collection yet
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {collection.requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 hover:bg-surface-light dark:hover:bg-surface-dark"
                        >
                          <div className="flex items-center gap-3">
                            <File className="w-4 h-4 text-neutral-400" />
                            <span className={`text-xs px-2 py-1 rounded font-mono ${getMethodColor(request.method)}`}>
                              {request.method}
                            </span>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                {request.name}
                              </div>
                              <div className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                                {request.url}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => loadRequestInNewTab(request, e)}
                              title="Open in new tab"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deleteRequest(collection.id, request.id, e)}
                              title="Delete request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}

          {collections.length === 0 && (
            <div 
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer rounded-lg p-4"
              onClick={createNewCollection}
            >
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Plus className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  No collections yet
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Create your first collection to organize your API requests
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
