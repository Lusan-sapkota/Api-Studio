import React from 'react';
import { Settings, Moon, Sun, Code2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { useTheme } from '../hooks/useTheme';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-12 bg-surface-dark dark:bg-background-darker border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary-500" />
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            API Studio
          </span>
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: 'default', label: 'Default Workspace' },
              { value: 'personal', label: 'Personal' },
              { value: 'team', label: 'Team Workspace' },
            ]}
            defaultValue="default"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
