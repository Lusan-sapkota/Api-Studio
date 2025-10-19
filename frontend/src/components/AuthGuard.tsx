import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { configService } from '../services/config';
import { LoadingSpinner } from './auth/LoadingSpinner';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: 'viewer' | 'editor' | 'admin';
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // In local mode, bypass authentication entirely
  if (configService.isLocalMode()) {
    return <>{children}</>;
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole && user) {
    const hasRequiredRole = checkUserRole(user.role, requiredRole);
    if (!hasRequiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Helper function to check if user role meets requirements
const checkUserRole = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
};

// Helper function to check specific permissions
export const checkPermission = (userRole: string, permission: string): boolean => {
  const permissions = {
    viewer: [
      'view_collections',
      'view_environments', 
      'view_requests',
      'view_docs',
      'use_api_clients',
      'view_profile'
    ],
    editor: [
      'view_collections',
      'create_collections',
      'edit_collections',
      'delete_collections',
      'view_environments',
      'create_environments', 
      'edit_environments',
      'delete_environments',
      'view_requests',
      'create_requests',
      'edit_requests',
      'delete_requests',
      'view_docs',
      'create_docs',
      'edit_docs',
      'view_notes',
      'create_notes',
      'edit_notes',
      'delete_notes',
      'view_tasks',
      'create_tasks',
      'edit_tasks',
      'delete_tasks',
      'use_api_clients',
      'view_profile',
      'edit_profile'
    ],
    admin: [
      // All editor permissions plus admin-specific ones
      'view_collections',
      'create_collections',
      'edit_collections',
      'delete_collections',
      'view_environments',
      'create_environments',
      'edit_environments', 
      'delete_environments',
      'view_requests',
      'create_requests',
      'edit_requests',
      'delete_requests',
      'view_docs',
      'create_docs',
      'edit_docs',
      'view_notes',
      'create_notes',
      'edit_notes',
      'delete_notes',
      'view_tasks',
      'create_tasks',
      'edit_tasks',
      'delete_tasks',
      'use_api_clients',
      'view_profile',
      'edit_profile',
      'manage_users',
      'invite_users',
      'remove_users',
      'change_user_roles',
      'view_audit_logs',
      'manage_system_settings',
      'view_system_status'
    ]
  };

  const userPermissions = permissions[userRole as keyof typeof permissions] || [];
  return userPermissions.includes(permission);
};

export default AuthGuard;