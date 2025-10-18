import { useState, useEffect } from 'react';
import { Plus, CheckSquare, Square, Clock, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { ConfirmModal, InputModal } from '../components/Modal';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  context_type: string;
  context_id?: number;
  created_at: string;
  updated_at: string;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterContext, setFilterContext] = useState('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Load tasks from localStorage for now
    const savedTasks = localStorage.getItem('api-tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      setTasks(parsedTasks);
      setFilteredTasks(parsedTasks);
    }
  }, []);

  useEffect(() => {
    // Filter tasks
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (filterContext !== 'all') {
      filtered = filtered.filter(task => task.context_type === filterContext);
    }

    setFilteredTasks(filtered);
  }, [tasks, filterStatus, filterPriority, filterContext]);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('api-tasks', JSON.stringify(newTasks));
  };

  const createTask = (title: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      status: 'todo',
      priority: 'medium',
      context_type: 'workspace',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveTasks([...tasks, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, ...updates, updated_at: new Date().toISOString() }
        : task
    );
    saveTasks(updatedTasks);
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

  const deleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteModal(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      saveTasks(tasks.filter(task => task.id !== taskToDelete));
      setTaskToDelete(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'text-neutral-500 bg-neutral-50 dark:bg-neutral-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return CheckSquare;
      case 'in_progress': return Clock;
      default: return Square;
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const contextOptions = [
    { value: 'all', label: 'All Contexts' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'environment', label: 'Environment' },
    { value: 'collection', label: 'Collection' },
    { value: 'request', label: 'Request' }
  ];

  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Tasks
          </h1>
          <Button variant="primary" onClick={() => setShowNewTaskModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={statusOptions}
          />
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            options={priorityOptions}
          />
          <Select
            value={filterContext}
            onChange={(e) => setFilterContext(e.target.value)}
            options={contextOptions}
          />
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {tasks.filter(t => t.status === 'todo').length}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">To Do</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">
                {tasks.filter(t => t.status === 'in_progress').length}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">In Progress</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">
                {tasks.filter(t => t.status === 'done').length}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Done</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">
                {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Overdue</div>
            </div>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <CheckSquare className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {tasks.length === 0 ? 'Create your first task to get started' : 'Try adjusting your filters'}
                </p>
              </div>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const StatusIcon = getStatusIcon(task.status);
              const isOverdue = task.due_date && new Date(task.due_date) < new Date();

              return (
                <Card key={task.id} className="hover:shadow-sm transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`mt-1 ${task.status === 'done'
                          ? 'text-green-500'
                          : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                          }`}
                      >
                        <StatusIcon className="w-5 h-5" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className={`font-medium ${task.status === 'done'
                            ? 'line-through text-neutral-500 dark:text-neutral-400'
                            : 'text-neutral-900 dark:text-neutral-100'
                            }`}>
                            {task.title}
                          </h3>

                          <div className="flex items-center gap-2 ml-4">
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                              {task.context_type}
                            </span>
                            {isOverdue && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                          <div className="flex items-center gap-4">
                            <span className={`px-2 py-1 rounded text-xs ${task.status === 'todo' ? 'bg-neutral-100 dark:bg-neutral-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                                'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              }`}>
                              {task.status.replace('_', ' ')}
                            </span>

                            {task.due_date && (
                              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(task.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={task.due_date ? task.due_date.split('T')[0] : ''}
                              onChange={(e) => updateTask(task.id, {
                                due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined
                              })}
                              className="text-xs w-32"
                            />
                            <Select
                              value={task.priority}
                              onChange={(e) => updateTask(task.id, { priority: e.target.value as Task['priority'] })}
                              options={priorityOptions.slice(1)}
                              className="text-xs w-24"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      <InputModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onSubmit={createTask}
        title="Create New Task"
        label="Task Title"
        placeholder="Enter task title"
        required
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}