import { useState, useEffect } from 'react';
import { Plus, StickyNote, CheckSquare, Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Select } from './Select';
import { Tabs, Tab } from './Tabs';

interface Note {
  id: string;
  title: string;
  content: string;
  context_type: string;
  context_id?: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  context_type: string;
  context_id?: string;
  created_at: string;
  updated_at: string;
}

interface NotesTasksPanelProps {
  contextType: string;
  contextId?: string;
  className?: string;
}

export function NotesTasksPanel({ contextType, contextId, className = '' }: NotesTasksPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('notes');
  const [showNewNote, setShowNewNote] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const tabs: Tab[] = [
    { id: 'notes', title: `Notes (${notes.length})` },
    { id: 'tasks', title: `Tasks (${tasks.length})` },
  ];

  useEffect(() => {
    loadNotesAndTasks();
  }, [contextType, contextId]);

  const loadNotesAndTasks = () => {
    // Load notes
    const savedNotes = JSON.parse(localStorage.getItem('api-notes') || '[]');
    const contextNotes = savedNotes.filter((note: Note) => 
      note.context_type === contextType && 
      (!contextId || note.context_id === contextId)
    );
    setNotes(contextNotes);

    // Load tasks
    const savedTasks = JSON.parse(localStorage.getItem('api-tasks') || '[]');
    const contextTasks = savedTasks.filter((task: Task) => 
      task.context_type === contextType && 
      (!contextId || task.context_id === contextId)
    );
    setTasks(contextTasks);
  };

  const saveNotes = (newNotes: Note[]) => {
    const allNotes = JSON.parse(localStorage.getItem('api-notes') || '[]');
    const otherNotes = allNotes.filter((note: Note) => 
      !(note.context_type === contextType && (!contextId || note.context_id === contextId))
    );
    const updatedNotes = [...otherNotes, ...newNotes];
    localStorage.setItem('api-notes', JSON.stringify(updatedNotes));
    setNotes(newNotes);
  };

  const saveTasks = (newTasks: Task[]) => {
    const allTasks = JSON.parse(localStorage.getItem('api-tasks') || '[]');
    const otherTasks = allTasks.filter((task: Task) => 
      !(task.context_type === contextType && (!contextId || task.context_id === contextId))
    );
    const updatedTasks = [...otherTasks, ...newTasks];
    localStorage.setItem('api-tasks', JSON.stringify(updatedTasks));
    setTasks(newTasks);
  };

  const createNote = () => {
    if (!newNoteTitle.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title: newNoteTitle,
      content: '',
      context_type: contextType,
      context_id: contextId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveNotes([...notes, newNote]);
    setNewNoteTitle('');
    setShowNewNote(false);
  };

  const createTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: 'todo',
      priority: 'medium',
      context_type: contextType,
      context_id: contextId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setShowNewTask(false);
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
    const updatedNotes = notes.map(note => 
      note.id === noteId 
        ? { ...note, ...updates, updated_at: new Date().toISOString() }
        : note
    );
    saveNotes(updatedNotes);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, ...updates, updated_at: new Date().toISOString() }
        : task
    );
    saveTasks(updatedTasks);
  };

  const deleteNote = (noteId: string) => {
    saveNotes(notes.filter(note => note.id !== noteId));
  };

  const deleteTask = (taskId: string) => {
    saveTasks(tasks.filter(task => task.id !== taskId));
  };

  const toggleTaskStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let newStatus: Task['status'];
    if (task.status === 'todo') newStatus = 'in_progress';
    else if (task.status === 'in_progress') newStatus = 'done';
    else newStatus = 'todo';
    
    updateTask(taskId, { status: newStatus });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-neutral-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return CheckSquare;
      case 'in_progress': return Clock;
      default: return CheckSquare;
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => activeTab === 'notes' ? setShowNewNote(true) : setShowNewTask(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 p-3 overflow-auto">
        {activeTab === 'notes' && (
          <div className="space-y-3">
            {showNewNote && (
              <Card>
                <div className="p-3 space-y-2">
                  <Input
                    placeholder="Note title..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createNote();
                      if (e.key === 'Escape') setShowNewNote(false);
                    }}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={createNote}>
                      Create
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewNote(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {notes.length === 0 && !showNewNote ? (
              <div className="text-center py-8">
                <StickyNote className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No notes yet
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <Card key={note.id}>
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                        {note.title}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <textarea
                      value={note.content}
                      onChange={(e) => updateNote(note.id, { content: e.target.value })}
                      placeholder="Add note content..."
                      className="w-full h-16 text-xs bg-transparent border-none resize-none text-neutral-600 dark:text-neutral-400 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
                    />
                    <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {showNewTask && (
              <Card>
                <div className="p-3 space-y-2">
                  <Input
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createTask();
                      if (e.key === 'Escape') setShowNewTask(false);
                    }}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={createTask}>
                      Create
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewTask(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {tasks.length === 0 && !showNewTask ? (
              <div className="text-center py-8">
                <CheckSquare className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No tasks yet
                </p>
              </div>
            ) : (
              tasks.map((task) => {
                const StatusIcon = getStatusIcon(task.status);
                
                return (
                  <Card key={task.id}>
                    <div className="p-3">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`mt-0.5 ${
                            task.status === 'done' 
                              ? 'text-green-500' 
                              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                          }`}
                        >
                          <StatusIcon className="w-4 h-4" />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className={`font-medium text-sm ${
                              task.status === 'done' 
                                ? 'line-through text-neutral-500 dark:text-neutral-400' 
                                : 'text-neutral-900 dark:text-neutral-100'
                            }`}>
                              {task.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Select
                              value={task.priority}
                              onChange={(e) => updateTask(task.id, { priority: e.target.value as Task['priority'] })}
                              options={[
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' }
                              ]}
                              className="text-xs w-20"
                            />
                            
                            <Input
                              type="date"
                              value={task.due_date ? task.due_date.split('T')[0] : ''}
                              onChange={(e) => updateTask(task.id, { 
                                due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                              })}
                              className="text-xs w-28"
                            />
                          </div>
                          
                          <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                            {new Date(task.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}