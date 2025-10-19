import { useState } from 'react';
import { Settings, Moon, Sun, Code2, User, LogOut, ChevronDown, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { configService } from '../services/config';

export function Navbar() {
  const { effectiveTheme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setUserMenuOpen(false);
  };

  // Show mode indicator in local mode
  const showModeIndicator = configService.isLocalMode();
  const showAuthFeatures = configService.isHostedMode() && isAuthenticated;

  return (
    <header className="h-12 bg-white dark:bg-surface-dark border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary-500" />
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            API Studio
          </span>
          {showModeIndicator && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              Local Mode
            </span>
          )}
        </div>
        <div className="w-48">
          <Select
            options={
              showModeIndicator
                ? [{ value: 'local', label: 'Local Workspace' }]
                : [
                  { value: 'default', label: 'Default Workspace' },
                  { value: 'personal', label: 'Personal' },
                  { value: 'team', label: 'Team Workspace' },
                ]
            }
            defaultValue={showModeIndicator ? 'local' : 'default'}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {effectiveTheme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>

        {/* Collaborators - Only in hosted mode */}
        {showAuthFeatures && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollaboratorsOpen(!collaboratorsOpen)}
              title="Active Collaborators"
            >
              <Users className="w-4 h-4" />
            </Button>

            {collaboratorsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Active Collaborators
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">2 online</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                        JD
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          John Doe
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Owner</div>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                        JS
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          Jane Smith
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Editor</div>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                      Manage collaborators
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings - Always visible */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>

        {/* User Menu - Only in hosted mode when authenticated */}
        {showAuthFeatures ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.name || user?.email}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.name || user?.email}
                    </div>
                    <div className="text-xs capitalize">
                      {user?.role} • {user?.two_factor_enabled ? '2FA Enabled' : '2FA Disabled'}
                    </div>
                  </div>

                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !showAuthFeatures && configService.isHostedMode() ? (
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        ) : null}
      </div>

      {/* Click outside to close menus */}
      {(userMenuOpen || collaboratorsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
            setCollaboratorsOpen(false);
          }}
        />
      )}
    </header>
  );
}
