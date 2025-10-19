import { useState } from 'react';
import { User, Shield, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, Activity } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Card } from '../Card';

interface UserData {
  id: number;
  email: string;
  name?: string;
  role: string;
  two_factor_enabled: boolean;
  requires_password_change: boolean;
  last_login_at?: string;
  status: string;
  failed_login_attempts: number;
  locked_until?: string;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
}

export function UserDetailsModal({ isOpen, onClose, user }: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity'>('overview');

  if (!user) return null;

  const isAccountLocked = user.locked_until && new Date(user.locked_until) > new Date();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'locked':
        return 'text-red-600 dark:text-red-400';
      case 'suspended':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-neutral-600 dark:text-neutral-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'editor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Details" size="lg">
      <div className="flex flex-col h-[600px]">
        {/* User Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {user.name || user.email.split('@')[0]}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">{user.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-1 text-xs rounded font-medium ${getRoleColor(user.role)}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <span className={`text-sm font-medium ${getStatusColor(user.status)}`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-neutral-500" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        Account Information
                      </h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">User ID:</span>
                        <span className="text-neutral-900 dark:text-neutral-100">#{user.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Email:</span>
                        <span className="text-neutral-900 dark:text-neutral-100">{user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Role:</span>
                        <span className={`px-2 py-1 text-xs rounded ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Status:</span>
                        <span className={`font-medium ${getStatusColor(user.status)}`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-neutral-500" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        Activity
                      </h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Last Login:</span>
                        <span className="text-neutral-900 dark:text-neutral-100">
                          {formatDate(user.last_login_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Failed Attempts:</span>
                        <span className={`font-medium ${user.failed_login_attempts > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {user.failed_login_attempts}
                        </span>
                      </div>
                      {isAccountLocked && (
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Locked Until:</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {formatDate(user.locked_until)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Alerts */}
              <div className="space-y-3">
                {isAccountLocked && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 dark:text-red-200 font-medium">Account Locked</p>
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        This account is locked until {formatDate(user.locked_until)}
                      </p>
                    </div>
                  </div>
                )}

                {user.requires_password_change && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">Password Change Required</p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                        User must change their password on next login
                      </p>
                    </div>
                  </div>
                )}

                {user.failed_login_attempts > 3 && !isAccountLocked && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                    <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-orange-800 dark:text-orange-200 font-medium">Multiple Failed Login Attempts</p>
                      <p className="text-orange-700 dark:text-orange-300 text-sm">
                        {user.failed_login_attempts} failed attempts detected
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-neutral-500" />
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                      Security Settings
                    </h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          user.two_factor_enabled 
                            ? 'bg-green-100 dark:bg-green-900/20' 
                            : 'bg-gray-100 dark:bg-gray-900/20'
                        }`}>
                          {user.two_factor_enabled ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            Two-Factor Authentication
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {user.two_factor_enabled ? 'Enabled and active' : 'Not configured'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        user.two_factor_enabled 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          user.requires_password_change 
                            ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                            : 'bg-green-100 dark:bg-green-900/20'
                        }`}>
                          {user.requires_password_change ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            Password Status
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {user.requires_password_change ? 'Change required on next login' : 'Password is current'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        user.requires_password_change 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {user.requires_password_change ? 'Change Required' : 'Current'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isAccountLocked 
                            ? 'bg-red-100 dark:bg-red-900/20' 
                            : 'bg-green-100 dark:bg-green-900/20'
                        }`}>
                          {isAccountLocked ? (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            Account Access
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {isAccountLocked ? `Locked until ${formatDate(user.locked_until)}` : 'Full access available'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        isAccountLocked 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {isAccountLocked ? 'Locked' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {user.failed_login_attempts > 0 && (
                <Card>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        Security Alerts
                      </h4>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                      <p className="text-orange-800 dark:text-orange-200 font-medium">
                        Failed Login Attempts: {user.failed_login_attempts}
                      </p>
                      <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                        Monitor this user for potential security issues
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-neutral-500" />
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                      Recent Activity
                    </h4>
                  </div>
                  
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Activity tracking coming soon
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                      Login history, actions, and audit logs will be displayed here
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}