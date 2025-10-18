import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { ConfirmModal, InputModal } from '../components/Modal';

interface Note {
  id: string;
  title: string;
  content: string;
  context_type: string;
  context_id?: number;
  created_at: string;
  updated_at: string;
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContext, setFilterContext] = useState('all');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Load notes from localStorage for now
    const savedNotes = localStorage.getItem('api-notes');
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      setNotes(parsedNotes);
      setFilteredNotes(parsedNotes);
    }
  }, []);

  useEffect(() => {
    // Filter notes based on search and context
    let filtered = notes;
    
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterContext !== 'all') {
      filtered = filtered.filter(note => note.context_type === filterContext);
    }
    
    setFilteredNotes(filtered);
  }, [notes, searchTerm, filterContext]);

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem('api-notes', JSON.stringify(newNotes));
  };

  const createNote = (title: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content: '',
      context_type: 'workspace',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    saveNotes([...notes, newNote]);
    setEditingNote(newNote);
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
    const updatedNotes = notes.map(note => 
      note.id === noteId 
        ? { ...note, ...updates, updated_at: new Date().toISOString() }
        : note
    );
    saveNotes(updatedNotes);
  };

  const deleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteModal(true);
  };

  const confirmDeleteNote = () => {
    if (noteToDelete) {
      saveNotes(notes.filter(note => note.id !== noteToDelete));
      setNoteToDelete(null);
      if (editingNote?.id === noteToDelete) {
        setEditingNote(null);
      }
    }
  };

  const contextOptions = [
    { value: 'all', label: 'All Contexts' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'environment', label: 'Environment' },
    { value: 'collection', label: 'Collection' },
    { value: 'request', label: 'Request' }
  ];

  return (
    <div className="h-full flex">
      {/* Notes List */}
      <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Notes
            </h1>
            <Button variant="primary" size="sm" onClick={() => setShowNewNoteModal(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filterContext}
              onChange={(e) => setFilterContext(e.target.value)}
              options={contextOptions}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
              {notes.length === 0 ? 'No notes yet' : 'No notes match your search'}
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-colors ${
                    editingNote?.id === note.id
                      ? 'ring-2 ring-primary-500'
                      : 'hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  <div className="p-3" onClick={() => setEditingNote(note)}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {note.title}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                        {note.context_type}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {note.content || 'No content'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        {editingNote ? (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <Input
                  value={editingNote.title}
                  onChange={(e) => {
                    const updatedNote = { ...editingNote, title: e.target.value };
                    setEditingNote(updatedNote);
                    updateNote(editingNote.id, { title: e.target.value });
                  }}
                  className="text-lg font-semibold border-none bg-transparent p-0"
                  placeholder="Note title..."
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={editingNote.context_type}
                    onChange={(e) => {
                      const updatedNote = { ...editingNote, context_type: e.target.value };
                      setEditingNote(updatedNote);
                      updateNote(editingNote.id, { context_type: e.target.value });
                    }}
                    options={contextOptions.slice(1)} // Remove 'all' option
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNote(editingNote.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <textarea
                value={editingNote.content}
                onChange={(e) => {
                  const updatedNote = { ...editingNote, content: e.target.value };
                  setEditingNote(updatedNote);
                  updateNote(editingNote.id, { content: e.target.value });
                }}
                placeholder="Write your note here..."
                className="w-full h-full resize-none border-none bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Select a note to edit
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Choose a note from the list or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <InputModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
        onSubmit={createNote}
        title="Create New Note"
        label="Note Title"
        placeholder="Enter note title"
        required
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setNoteToDelete(null);
        }}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}