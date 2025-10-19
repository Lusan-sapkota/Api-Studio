import { useState, useEffect } from 'react';
import { Users, Mail, Shield, Trash2, Edit3, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
import { ConfirmModal } from '../Modal';
import { apiService } from '../../services/api';

interface User {
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

interface UserManagementTableProps {
  onInviteUser: () => void;
  onViewUserDetails: (user: User) => void;
  onRefresh?: () => void;
}

export function UserManagementTable({ onInviteUser, onViewUserDetails, onRefresh }: UserManagementTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: number; newRole: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCollaborators();
      
      if (response.success === false || response.error) {
        setError(response.error || 'Failed to load users');
        return;
      }
      
      // Map backend user data to frontend user interface
      const mappedUsers = (response.data || []).map((user: any) => ({
        ...user,
        status: user.status || 'active',
        failed_login_attempts: user.failed_login_attempts || 0
      }));
      setUsers(mappedUsers);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (onRefresh) {
      loadUsers();
    }
  }, [onRefresh]);

  const handleRoleChange = (user: User, newRole: string) => {
    if (user.role === newRole) return;
    
    setPendingRoleChange({ userId: user.id, newRole });
    setSelectedUser(user);
    setShowRoleChangeConfirm(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    
    try {
      setActionLoading(pendingRoleChange.userId);
      const response = await apiService.updateUserRole(pendingRoleChange.userId, pendingRoleChange.newRole);
      
      if (response.success === false || response.error) {
        setError(response.error || 'Failed to update user role');
        return;
      }
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === pendingRoleChange.userId 
          ? { ...user, role: pendingRoleChange.newRole }
          : user
      ));
      
      setShowRoleChangeConfirm(false);
      setPendingRoleChange(null);
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to update user role');
      console.error('Error updating user role:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(selectedUser.id);
      const response = await apiService.removeUser(selectedUser.id);
      
      if (response.success === false || response.error) {
        setError(response.error || 'Failed to remove user');
        return;
      }
      
      // Remove from local state
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to remove user');
      console.error('Error removing user:', err);
    } finally {
      setActionLoading(null);
    }
  };



  const getStatusIcon = (user: User) => {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return <div title="Account locked"><XCircle className="w-4 h-4 text-red-500" /></div>;
    }
    if (user.status === 'active') {
      return <div title="Active"><CheckCircle className="w-4 h-4 text-green-500" /></div>;
    }
    return <div title="Pending"><Clock className="w-4 h-4 text-yellow-500" /></div>;
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Loading users...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary-500" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                User Management
              </h2>
              <span className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                {users.length} users
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={loadUsers} disabled={loading}>
                Refresh
              </Button>
              <Button variant="primary" onClick={onInviteUser}>
                <Mail className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">2FA</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Last Login</th>
                  <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {user.name || user.email.split('@')[0]}
                          </div>
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        disabled={actionLoading === user.id}
                        className="px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user)}
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {user.two_factor_enabled ? (
                          <div title="2FA Enabled"><Shield className="w-4 h-4 text-green-500" /></div>
                        ) : (
                          <div title="2FA Disabled"><Shield className="w-4 h-4 text-gray-400" /></div>
                        )}
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {formatLastLogin(user.last_login_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewUserDetails(user)}
                          disabled={actionLoading === user.id}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={actionLoading === user.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {actionLoading === user.id && (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-400">No users found</p>
                <Button variant="primary" onClick={onInviteUser} className="mt-3">
                  Invite your first user
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Role Change Confirmation */}
      <ConfirmModal
        isOpen={showRoleChangeConfirm}
        onClose={() => {
          setShowRoleChangeConfirm(false);
          setPendingRoleChange(null);
          setSelectedUser(null);
        }}
        onConfirm={confirmRoleChange}
        title="Confirm Role Change"
        message={`Are you sure you want to change ${selectedUser?.name || selectedUser?.email}'s role to ${pendingRoleChange?.newRole}?`}
        confirmText="Change Role"
        variant="warning"
      />

      {/* Delete User Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmDeleteUser}
        title="Remove User"
        message={`Are you sure you want to remove ${selectedUser?.name || selectedUser?.email}? This action cannot be undone and will immediately revoke their access.`}
        confirmText="Remove User"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}