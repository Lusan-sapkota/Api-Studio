import { useState, useEffect } from 'react';
import { Plus, Globe, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';

interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  secret?: boolean;
}

interface Environment {
  id: string;
  name: string;
  description: string;
  variables: EnvironmentVariable[];
  active: boolean;
}

export function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedEnvironments = localStorage.getItem('api-environments');
    if (savedEnvironments) {
      setEnvironments(JSON.parse(savedEnvironments));
    } else {
      // Default environments
      const defaultEnvs: Environment[] = [
        {
          id: 'dev',
          name: 'Development',
          description: 'Local development environment',
          active: true,
          variables: [
            { key: 'BASE_URL', value: 'http://localhost:3000', enabled: true },
            { key: 'API_KEY', value: 'dev_key_123', enabled: true, secret: true },
            { key: 'TOKEN', value: 'dev_token_abc', enabled: true, secret: true }
          ]
        },
        {
          id: 'staging',
          name: 'Staging',
          description: 'Staging environment for testing',
          active: false,
          variables: [
            { key: 'BASE_URL', value: 'https://staging.api.example.com', enabled: true },
            { key: 'API_KEY', value: 'staging_key_456', enabled: true, secret: true },
            { key: 'TOKEN', value: 'staging_token_def', enabled: true, secret: true }
          ]
        },
        {
          id: 'prod',
          name: 'Production',
          description: 'Production environment',
          active: false,
          variables: [
            { key: 'BASE_URL', value: 'https://api.example.com', enabled: true },
            { key: 'API_KEY', value: 'prod_key_789', enabled: true, secret: true },
            { key: 'TOKEN', value: 'prod_token_ghi', enabled: true, secret: true }
          ]
        }
      ];
      setEnvironments(defaultEnvs);
      localStorage.setItem('api-environments', JSON.stringify(defaultEnvs));
    }
  }, []);

  const saveEnvironments = (newEnvironments: Environment[]) => {
    setEnvironments(newEnvironments);
    localStorage.setItem('api-environments', JSON.stringify(newEnvironments));
  };

  const createNewEnvironment = () => {
    const name = prompt('Enter environment name:');
    if (!name) return;

    const newEnv: Environment = {
      id: Date.now().toString(),
      name,
      description: '',
      active: false,
      variables: [
        { key: 'BASE_URL', value: '', enabled: true },
        { key: 'API_KEY', value: '', enabled: true, secret: true },
        { key: 'TOKEN', value: '', enabled: true, secret: true }
      ]
    };

    saveEnvironments([...environments, newEnv]);
  };

  const setActiveEnvironment = (envId: string) => {
    const newEnvironments = environments.map(env => ({
      ...env,
      active: env.id === envId
    }));
    saveEnvironments(newEnvironments);
  };

  const deleteEnvironment = (envId: string) => {
    if (confirm('Are you sure you want to delete this environment?')) {
      saveEnvironments(environments.filter(env => env.id !== envId));
    }
  };

  const addVariable = (envId: string) => {
    const newVar: EnvironmentVariable = {
      key: '',
      value: '',
      enabled: true,
      secret: false
    };

    saveEnvironments(environments.map(env => 
      env.id === envId 
        ? { ...env, variables: [...env.variables, newVar] }
        : env
    ));
  };

  const updateVariable = (envId: string, index: number, field: keyof EnvironmentVariable, value: any) => {
    saveEnvironments(environments.map(env => 
      env.id === envId 
        ? {
            ...env,
            variables: env.variables.map((variable, i) => 
              i === index ? { ...variable, [field]: value } : variable
            )
          }
        : env
    ));
  };

  const removeVariable = (envId: string, index: number) => {
    saveEnvironments(environments.map(env => 
      env.id === envId 
        ? { ...env, variables: env.variables.filter((_, i) => i !== index) }
        : env
    ));
  };

  const toggleSecretVisibility = (envId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [envId]: !prev[envId]
    }));
  };

  const maskValue = (value: string, isSecret: boolean, envId: string): string => {
    if (!isSecret) return value;
    if (showSecrets[envId]) return value;
    return '*'.repeat(Math.min(value.length, 8));
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Environments
          </h1>
          <Button variant="primary" onClick={createNewEnvironment}>
            <Plus className="w-4 h-4 mr-2" />
            New Environment
          </Button>
        </div>

        <div className="space-y-4">
          {environments.map((env) => (
            <Card key={env.id}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded ${
                      env.active 
                        ? 'bg-success-500/10' 
                        : 'bg-neutral-500/10'
                    }`}>
                      <Globe className={`w-6 h-6 ${
                        env.active 
                          ? 'text-success-500' 
                          : 'text-neutral-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {env.name}
                        </h3>
                        {env.active && (
                          <span className="px-2 py-1 text-xs font-semibold bg-success-500/10 text-success-600 dark:text-success-500 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {env.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!env.active && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveEnvironment(env.id)}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSecretVisibility(env.id)}
                      title={showSecrets[env.id] ? 'Hide secrets' : 'Show secrets'}
                    >
                      {showSecrets[env.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingEnv(editingEnv === env.id ? null : env.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEnvironment(env.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Variables */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                      Variables ({env.variables.length})
                    </h4>
                    {editingEnv === env.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addVariable(env.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Variable
                      </Button>
                    )}
                  </div>

                  {env.variables.length === 0 ? (
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">
                      No variables defined
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {env.variables.map((variable, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-surface-light dark:bg-surface-dark rounded">
                          {editingEnv === env.id ? (
                            <>
                              <input
                                type="checkbox"
                                checked={variable.enabled}
                                onChange={(e) => updateVariable(env.id, index, 'enabled', e.target.checked)}
                                className="rounded"
                              />
                              <Input
                                placeholder="Variable name"
                                value={variable.key}
                                onChange={(e) => updateVariable(env.id, index, 'key', e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Variable value"
                                type={variable.secret && !showSecrets[env.id] ? 'password' : 'text'}
                                value={variable.value}
                                onChange={(e) => updateVariable(env.id, index, 'value', e.target.value)}
                                className="flex-1"
                              />
                              <label className="flex items-center gap-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={variable.secret || false}
                                  onChange={(e) => updateVariable(env.id, index, 'secret', e.target.checked)}
                                  className="rounded"
                                />
                                Secret
                              </label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariable(env.id, index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className={`w-3 h-3 rounded-full ${
                                variable.enabled ? 'bg-success-500' : 'bg-neutral-400'
                              }`} />
                              <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300 min-w-0 flex-1">
                                {variable.key}
                              </span>
                              <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400 min-w-0 flex-1">
                                {maskValue(variable.value, variable.secret || false, env.id)}
                              </span>
                              {variable.secret && (
                                <span className="text-xs px-2 py-1 bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200 rounded">
                                  Secret
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {environments.length === 0 && (
            <div 
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer rounded-lg p-4"
              onClick={createNewEnvironment}
            >
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  No environments yet
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Create your first environment to manage variables
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
