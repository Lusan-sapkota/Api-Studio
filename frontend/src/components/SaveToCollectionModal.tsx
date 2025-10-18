import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Folder } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

interface Collection {
    id: number;
    name: string;
    requests: any[];
    folders?: Folder[];
}

interface Folder {
    id: string;
    name: string;
    requests: any[];
    folders?: Folder[];
}

interface SaveToCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (collectionId: number, folderId?: string, requestName?: string) => void;
    defaultRequestName?: string;
}

export function SaveToCollectionModal({
    isOpen,
    onClose,
    onSave,
    defaultRequestName = ''
}: SaveToCollectionModalProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [requestName, setRequestName] = useState(defaultRequestName);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [showNewCollection, setShowNewCollection] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const savedCollections = JSON.parse(localStorage.getItem('api-collections') || '[]');
            setCollections(savedCollections);
            setRequestName(defaultRequestName);

            // Auto-select first collection if available
            if (savedCollections.length > 0 && !selectedCollectionId) {
                setSelectedCollectionId(savedCollections[0].id);
            }
        }
    }, [isOpen, defaultRequestName]);

    const selectedCollection = collections.find(c => c.id === selectedCollectionId);

    const handleSave = () => {
        if (!selectedCollectionId || !requestName.trim()) return;

        onSave(selectedCollectionId, selectedFolderId || undefined, requestName.trim());
        onClose();

        // Reset form
        setSelectedFolderId(null);
        setRequestName('');
        setNewCollectionName('');
        setNewFolderName('');
        setShowNewCollection(false);
        setShowNewFolder(false);
    };

    const handleCreateCollection = () => {
        if (!newCollectionName.trim()) return;

        const newCollection: Collection = {
            id: Date.now(),
            name: newCollectionName.trim(),
            requests: [],
            folders: []
        };

        const updatedCollections = [...collections, newCollection];
        setCollections(updatedCollections);
        localStorage.setItem('api-collections', JSON.stringify(updatedCollections));

        setSelectedCollectionId(newCollection.id);
        setNewCollectionName('');
        setShowNewCollection(false);
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim() || !selectedCollectionId) return;

        const newFolder = {
            id: `folder-${Date.now()}`,
            name: newFolderName.trim(),
            requests: [],
            folders: []
        };

        const updatedCollections = collections.map(c =>
            c.id === selectedCollectionId
                ? { ...c, folders: [...(c.folders || []), newFolder] }
                : c
        );

        setCollections(updatedCollections);
        localStorage.setItem('api-collections', JSON.stringify(updatedCollections));

        setSelectedFolderId(newFolder.id);
        setNewFolderName('');
        setShowNewFolder(false);
    };

    const getFolderOptions = () => {
        if (!selectedCollection) return [];

        return [
            { value: '', label: 'Root (No folder)' },
            ...(selectedCollection.folders || []).map(folder => ({
                value: folder.id,
                label: folder.name
            }))
        ];
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save Request to Collection" size="md">
            <div className="p-6 space-y-6">
                {/* Request Name */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Request Name *
                    </label>
                    <Input
                        value={requestName}
                        onChange={(e) => setRequestName(e.target.value)}
                        placeholder="Enter request name"
                        required
                    />
                </div>

                {/* Collection Selection */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Collection *
                        </label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewCollection(!showNewCollection)}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            New Collection
                        </Button>
                    </div>

                    {showNewCollection ? (
                        <div className="flex gap-2">
                            <Input
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="Collection name"
                                className="flex-1"
                            />
                            <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
                                Create
                            </Button>
                            <Button variant="ghost" onClick={() => setShowNewCollection(false)}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Select
                            options={[
                                { value: '', label: 'Select a collection' },
                                ...collections.map(collection => ({
                                    value: collection.id.toString(),
                                    label: collection.name
                                }))
                            ]}
                            value={selectedCollectionId?.toString() || ''}
                            onChange={(e) => {
                                setSelectedCollectionId(e.target.value ? parseInt(e.target.value) : null);
                                setSelectedFolderId(null); // Reset folder selection
                            }}
                            required
                        />
                    )}
                </div>

                {/* Folder Selection */}
                {selectedCollectionId && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Folder (Optional)
                            </label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNewFolder(!showNewFolder)}
                            >
                                <Folder className="w-4 h-4 mr-1" />
                                New Folder
                            </Button>
                        </div>

                        {showNewFolder ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Folder name"
                                    className="flex-1"
                                />
                                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                                    Create
                                </Button>
                                <Button variant="ghost" onClick={() => setShowNewFolder(false)}>
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Select
                                options={getFolderOptions()}
                                value={selectedFolderId || ''}
                                onChange={(e) => setSelectedFolderId(e.target.value || null)}
                            />
                        )}
                    </div>
                )}

                {/* Collection Preview */}
                {selectedCollection && (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <FolderOpen className="w-4 h-4" />
                            <span>{selectedCollection.name}</span>
                            {selectedFolderId && (
                                <>
                                    <span>/</span>
                                    <Folder className="w-4 h-4" />
                                    <span>{selectedCollection.folders?.find(f => f.id === selectedFolderId)?.name}</span>
                                </>
                            )}
                            {requestName && (
                                <>
                                    <span>/</span>
                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                        {requestName}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!selectedCollectionId || !requestName.trim()}
                    >
                        Save Request
                    </Button>
                </div>
            </div>
        </Modal>
    );
}