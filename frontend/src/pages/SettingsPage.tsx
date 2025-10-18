import { useState, useEffect } from 'react';
import { Settings, User, Users, Bell, Shield, Database, Palette, Globe, Save } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Tabs, Tab } from '../components/Tabs';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    desktop: boolean;
    sounds: boolean;
  };
  editor: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
  };
  api: {
    timeout: number;
    retries: number;
    followRedirects: boolean;
  };
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  lastActive: Date;
  status: 'online' | 'offline' | 'away';
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      desktop: true,
      sounds: false
    },
    editor: {
      fontSize: 14,
      tabSize: 2,
      wordWrap: true,
      lineNumbers: true
    },
    api: {
      timeout: 30000,
      retries: 3,
      followRedirects: true
    }
  });

  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      lastActive: new Date(),
      status: 'online'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      lastActive: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      status: 'away'
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'viewer',
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: 'offline'
    }
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  const tabs: Tab[] = [
    { id: 'general', title: 'General' },
    { id: 'editor', title: 'Editor' },
    { id: 'api', title: 'API Settings' },
    { id: 'notifications', title: 'Notifications' },
    { id: 'collaborators', title: 'Collaborators' },
    { id: 'security', title: 'Security' },
  ];

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    // Here you would also send to backend API
    console.log('Settings saved:', settings);
  };

  const updateSettings = (section: keyof UserSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  const inviteCollaborator = () => {
    if (!inviteEmail.trim()) return;

    const newCollaborator: Collaborator = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      lastActive: new Date(),
      status: 'offline'
    };

    setCollaborators(prev => [...prev, newCollaborator]);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const removeCollaborator = (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
  };

  const updateCollaboratorRole = (id: string, role: Collaborator['role']) => {
    setCollaborators(prev => prev.map(c => 
      c.id === id ? { ...c, role } : c
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-neutral-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200';
    }
  };

  return (
    <div className="h-full flex">
      {/* Main Settings */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary-500" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Settings
              </h1>
            </div>
            <Button variant="primary" onClick={saveSettings}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="w-64 border-r border-neutral-200 dark:border-neutral-800">
            <div className="p-4">
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-500/10 text-primary-500 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-light dark:hover:bg-surface-dark'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Appearance
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Theme
                        </label>
                        <Select
                          value={settings.theme}
                          onChange={(e) => updateSettings('theme', e.target.value)}
                          options={[
                            { value: 'light', label: 'Light' },
                            { value: 'dark', label: 'Dark' },
                            { value: 'system', label: 'System' }
                          ]}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Language
                        </label>
                        <Select
                          value={settings.language}
                          onChange={(e) => updateSettings('language', e.target.value)}
                          options={[
                            { value: 'en', label: 'English' },
                            { value: 'es', label: 'Spanish' },
                            { value: 'fr', label: 'French' },
                            { value: 'de', label: 'German' }
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Timezone
                      </label>
                      <Select
                        value={settings.timezone}
                        onChange={(e) => updateSettings('timezone', e.target.value)}
                        options={[
                          { value: 'UTC', label: 'UTC' },
                          { value: 'America/New_York', label: 'Eastern Time' },
                          { value: 'America/Los_Angeles', label: 'Pacific Time' },
                          { value: 'Europe/London', label: 'London' },
                          { value: 'Europe/Paris', label: 'Paris' },
                          { value: 'Asia/Tokyo', label: 'Tokyo' }
                        ]}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Editor Preferences
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Font Size
                        </label>
                        <Input
                          type="number"
                          min="10"
                          max="24"
                          value={settings.editor.fontSize}
                          onChange={(e) => updateSettings('editor', { fontSize: parseInt(e.target.value) })}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Tab Size
                        </label>
                        <Select
                          value={settings.editor.tabSize.toString()}
                          onChange={(e) => updateSettings('editor', { tabSize: parseInt(e.target.value) })}
                          options={[
                            { value: '2', label: '2 spaces' },
                            { value: '4', label: '4 spaces' },
                            { value: '8', label: '8 spaces' }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.editor.wordWrap}
                          onChange={(e) => updateSettings('editor', { wordWrap: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          Word wrap
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.editor.lineNumbers}
                          onChange={(e) => updateSettings('editor', { lineNumbers: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          Show line numbers
                        </span>
                      </label>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      API Configuration
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Request Timeout (ms)
                        </label>
                        <Input
                          type="number"
                          min="1000"
                          max="300000"
                          value={settings.api.timeout}
                          onChange={(e) => updateSettings('api', { timeout: parseInt(e.target.value) })}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Max Retries
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={settings.api.retries}
                          onChange={(e) => updateSettings('api', { retries: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.api.followRedirects}
                        onChange={(e) => updateSettings('api', { followRedirects: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Follow redirects automatically
                      </span>
                    </label>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Notification Preferences
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={(e) => updateSettings('notifications', { email: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          Email notifications
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.notifications.desktop}
                          onChange={(e) => updateSettings('notifications', { desktop: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          Desktop notifications
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.notifications.sounds}
                          onChange={(e) => updateSettings('notifications', { sounds: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          Sound notifications
                        </span>
                      </label>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'collaborators' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        Team Members
                      </h3>
                      <Button variant="primary" onClick={() => setShowInviteModal(true)}>
                        <Users className="w-4 h-4 mr-2" />
                        Invite Member
                      </Button>
                    </div>

                    {showInviteModal && (
                      <div className="mb-4 p-4 bg-surface-light dark:bg-surface-dark rounded border">
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">
                          Invite New Member
                        </h4>
                        <div className="space-y-3">
                          <Input
                            placeholder="Email address"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                          <Select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                            options={[
                              { value: 'editor', label: 'Editor' },
                              { value: 'viewer', label: 'Viewer' }
                            ]}
                          />
                          <div className="flex items-center gap-2">
                            <Button variant="primary" onClick={inviteCollaborator}>
                              Send Invite
                            </Button>
                            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center justify-between p-3 bg-surface-light dark:bg-surface-dark rounded">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                                {collaborator.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-800 ${getStatusColor(collaborator.status)}`} />
                            </div>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                {collaborator.name}
                              </div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                {collaborator.email}
                              </div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-500">
                                Last active: {collaborator.lastActive.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Select
                              value={collaborator.role}
                              onChange={(e) => updateCollaboratorRole(collaborator.id, e.target.value as Collaborator['role'])}
                              options={[
                                { value: 'admin', label: 'Admin' },
                                { value: 'editor', label: 'Editor' },
                                { value: 'viewer', label: 'Viewer' }
                              ]}
                              className="text-xs w-24"
                            />
                            <span className={`px-2 py-1 text-xs rounded ${getRoleColor(collaborator.role)}`}>
                              {collaborator.role}
                            </span>
                            {collaborator.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCollaborator(collaborator.id)}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Security Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Current Password
                        </label>
                        <Input type="password" placeholder="Enter current password" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          New Password
                        </label>
                        <Input type="password" placeholder="Enter new password" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Confirm New Password
                        </label>
                        <Input type="password" placeholder="Confirm new password" />
                      </div>
                      
                      <Button variant="primary">
                        Update Password
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collaborators Sidebar */}
      <div className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-surface-light dark:bg-surface-dark">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Active Collaborators
            </h2>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {collaborators.filter(c => c.status !== 'offline').map((collaborator) => (
            <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded hover:bg-surface-dark/50 dark:hover:bg-surface-darker">
              <div className="relative">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {collaborator.name.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-neutral-800 ${getStatusColor(collaborator.status)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {collaborator.name}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {collaborator.status} • {collaborator.role}
                </div>
              </div>
            </div>
          ))}
          
          {collaborators.filter(c => c.status !== 'offline').length === 0 && (
            <div className="text-center py-8">
              <User className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No active collaborators
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}