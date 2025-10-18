import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, File, ChevronRight, ChevronDown, Trash2, Edit2, Send, ArrowLeft, Folder } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmModal, InputModal } from '../components/Modal';

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

interface Folder {
  id: string;
  name: string;
  requests: Request[];
  folders?: Folder[];
  expanded?: boolean;
}

interface Collection {
  id: number;
  name: string;
  description?: string;
  requests: Request[];
  folders?: Folder[];
  expanded?: boolean;
}

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const navigate = useNavigate();
  const { collectionId } = useParams();
  
  // Modal states
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string | number; collectionId?: number } | null>(null);
  const [itemToRename, setItemToRename] = useState<{ type: string; id: string | number; currentName: string } | null>(null);
  const [folderCollectionId, setFolderCollectionId] = useState<number | null>(null);

  useEffect(() => {
    const savedCollections = localStorage.getItem('api-collections');
    if (savedCollections) {
      const parsedCollections = JSON.parse(savedCollections);
      setCollections(parsedCollections);
      
      // If we have a collectionId in the URL, find and set the selected collection
      if (collectionId) {
        const collection = parsedCollections.find((c: Collection) => c.id === parseInt(collectionId));
        setSelectedCollection(collection || null);
      }
    }
  }, [collectionId]);

  const saveCollections = (newCollections: Collection[]) => {
    setCollections(newCollections);
    localStorage.setItem('api-collections', JSON.stringify(newCollections));
  };

  const createNewCollection = (name: string) => {
    const newCollection: Collection = {
      id: Date.now(),
      name,
      description: '',
      requests: [],
      folders: [],
      expanded: false
    };

    saveCollections([...collections, newCollection]);
  };

  const deleteCollection = (collectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ type: 'collection', id: collectionId });
    setShowDeleteModal(true);
  };

  const renameCollection = (collectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    setItemToRename({ type: 'collection', id: collectionId, currentName: collection.name });
    setShowRenameModal(true);
  };

  const handleCollectionClick = (collection: Collection, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const elementWidth = rect.width;
    const clickPercentage = (clickX / elementWidth) * 100;

    if (clickPercentage <= 70) {
      // Left 70% - toggle expansion
      saveCollections(collections.map(c => 
        c.id === collection.id ? { ...c, expanded: !c.expanded } : c
      ));
    } else {
      // Right 30% - navigate to dedicated page
      navigate(`/collections/${collection.id}`);
    }
  };

  const loadRequestInNewTab = (request: Request, e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('loadRequest', JSON.stringify(request));
    navigate('/request');
  };

  const deleteRequest = (collectionId: number, requestId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ type: 'request', id: requestId, collectionId });
    setShowDeleteRequestModal(true);
  };

  const createFolder = (collectionId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderCollectionId(collectionId);
    setShowNewFolderModal(true);
  };

  const handleCreateFolder = (name: string) => {
    if (!folderCollectionId) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      requests: [],
      folders: [],
      expanded: false
    };

    saveCollections(collections.map(c => 
      c.id === folderCollectionId 
        ? { ...c, folders: [...(c.folders || []), newFolder] }
        : c
    ));
    
    setFolderCollectionId(null);
  };

  const toggleFolder = (collectionId: number, folderId: string) => {
    saveCollections(collections.map(c => 
      c.id === collectionId 
        ? {
            ...c,
            folders: c.folders?.map(f => 
              f.id === folderId ? { ...f, expanded: !f.expanded } : f
            )
          }
        : c
    ));
  };

  const deleteFolder = (collectionId: number, folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ type: 'folder', id: folderId, collectionId });
    setShowDeleteFolderModal(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'collection') {
      saveCollections(collections.filter(c => c.id !== itemToDelete.id));
    } else if (itemToDelete.type === 'folder' && itemToDelete.collectionId) {
      saveCollections(collections.map(c => 
        c.id === itemToDelete.collectionId 
          ? { ...c, folders: c.folders?.filter(f => f.id !== itemToDelete.id) }
          : c
      ));
    } else if (itemToDelete.type === 'request' && itemToDelete.collectionId) {
      saveCollections(collections.map(c => 
        c.id === itemToDelete.collectionId 
          ? { ...c, requests: c.requests.filter(r => r.id !== itemToDelete.id) }
          : c
      ));
    }
    
    setItemToDelete(null);
  };

  const confirmRename = (newName: string) => {
    if (!itemToRename) return;

    if (itemToRename.type === 'collection') {
      saveCollections(collections.map(c => 
        c.id === itemToRename.id ? { ...c, name: newName } : c
      ));
    }
    
    setItemToRename(null);
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

  // If we're viewing a specific collection
  if (selectedCollection) {
    return (
      <div className="h-full p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/collections')}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedCollection.name}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {selectedCollection.description || 'No description'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => createFolder(selectedCollection.id)}>
                <Folder className="w-4 h-4 mr-2" />
                New Folder
              </Button>
              <Button variant="primary" onClick={() => navigate('/request')}>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Folders */}
            {selectedCollection.folders?.map((folder) => (
              <Card key={folder.id}>
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark"
                  onClick={() => toggleFolder(selectedCollection.id, folder.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {folder.expanded ? (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      )}
                      <Folder className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {folder.name}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {folder.requests.length} requests
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteFolder(selectedCollection.id, folder.id, e)}
                    title="Delete folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {folder.expanded && (
                  <div className="border-t border-neutral-200 dark:border-neutral-800">
                    {folder.requests.length === 0 ? (
                      <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                        No requests in this folder yet
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {folder.requests.map((request) => (
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
                                title="Open request"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => deleteRequest(selectedCollection.id, request.id, e)}
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

            {/* Root level requests */}
            {selectedCollection.requests.length > 0 && (
              <Card>
                <div className="p-4">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    Requests ({selectedCollection.requests.length})
                  </h3>
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {selectedCollection.requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
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
                            title="Open request"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteRequest(selectedCollection.id, request.id, e)}
                            title="Delete request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {(!selectedCollection.folders || selectedCollection.folders.length === 0) && 
             selectedCollection.requests.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Empty Collection
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  Start organizing your requests by creating folders or adding requests
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="secondary" onClick={() => createFolder(selectedCollection.id)}>
                    <Folder className="w-4 h-4 mr-2" />
                    Create Folder
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/request')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Request
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main collections overview
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Collections
          </h1>
          <Button variant="primary" onClick={() => setShowNewCollectionModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        <div className="space-y-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-light dark:hover:bg-surface-dark relative"
                onClick={(e) => handleCollectionClick(collection, e)}
                title="Click left side to expand/collapse, right side to open collection page"
              >
                {/* Visual indicator for 70-30 split */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-[70%] h-full border-r border-neutral-300/10 dark:border-neutral-600/10"></div>
                </div>
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
                <div className="flex items-center gap-2 relative z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => createFolder(collection.id, e)}
                    title="Add folder"
                  >
                    <Folder className="w-4 h-4" />
                  </Button>
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
              onClick={() => setShowNewCollectionModal(true)}
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

      {/* Modals */}
      <InputModal
        isOpen={showNewCollectionModal}
        onClose={() => setShowNewCollectionModal(false)}
        onSubmit={createNewCollection}
        title="Create New Collection"
        label="Collection Name"
        placeholder="Enter collection name"
        required
      />

      <InputModal
        isOpen={showNewFolderModal}
        onClose={() => {
          setShowNewFolderModal(false);
          setFolderCollectionId(null);
        }}
        onSubmit={handleCreateFolder}
        title="Create New Folder"
        label="Folder Name"
        placeholder="Enter folder name"
        required
      />

      <InputModal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setItemToRename(null);
        }}
        onSubmit={confirmRename}
        title={`Rename ${itemToRename?.type || 'Item'}`}
        label="New Name"
        placeholder="Enter new name"
        defaultValue={itemToRename?.currentName || ''}
        required
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? This action cannot be undone and will delete all requests and folders within it."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteFolderModal}
        onClose={() => {
          setShowDeleteFolderModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Folder"
        message="Are you sure you want to delete this folder? This action cannot be undone and will delete all requests within it."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteRequestModal}
        onClose={() => {
          setShowDeleteRequestModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
