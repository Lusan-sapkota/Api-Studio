import { useAuth } from '../contexts/AuthContext';
import { checkPermission } from '../components/AuthGuard';
import { configService } from '../services/config';

export const usePermissions = () => {
  // In local mode, provide default permissions without requiring auth context
  if (configService.isLocalMode()) {
    return {
      hasPermission: () => true,
      hasRole: (role: 'viewer' | 'editor' | 'admin') => role === 'admin',
      canCreateContent: () => true,
      canManageUsers: () => true,
      canViewAuditLogs: () => true,
      canManageSystem: () => true,
      userRole: 'admin' as const,
      isAdmin: true,
      isEditor: true,
      isViewer: true
    };
  }

  const { user, isAuthenticated } = useAuth();

  const hasPermission = (permission: string): boolean => {
    // In local mode, all permissions are granted
    if (configService.isLocalMode()) {
      return true;
    }

    // If not authenticated, no permissions
    if (!isAuthenticated || !user) {
      return false;
    }

    return checkPermission(user.role, permission);
  };

  const hasRole = (role: 'viewer' | 'editor' | 'admin'): boolean => {
    // In local mode, assume admin role
    if (configService.isLocalMode()) {
      return role === 'admin';
    }

    if (!isAuthenticated || !user) {
      return false;
    }

    const roleHierarchy = {
      viewer: 1,
      editor: 2,
      admin: 3,
    };

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[role] || 0;

    return userLevel >= requiredLevel;
  };

  const canCreateContent = (): boolean => {
    return hasRole('editor');
  };

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users');
  };

  const canViewAuditLogs = (): boolean => {
    return hasPermission('view_audit_logs');
  };

  const canManageSystem = (): boolean => {
    return hasPermission('manage_system_settings');
  };

  return {
    hasPermission,
    hasRole,
    canCreateContent,
    canManageUsers,
    canViewAuditLogs,
    canManageSystem,
    userRole: user?.role || 'viewer',
    isAdmin: hasRole('admin'),
    isEditor: hasRole('editor'),
    isViewer: hasRole('viewer')
  };
};