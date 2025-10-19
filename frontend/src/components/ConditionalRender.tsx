import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface ConditionalRenderProps {
  children: ReactNode;
  permission?: string;
  role?: 'viewer' | 'editor' | 'admin';
  fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({ 
  children, 
  permission,
  role,
  fallback = null
}) => {
  const { hasPermission, hasRole } = usePermissions();

  let shouldRender = true;

  if (permission) {
    shouldRender = hasPermission(permission);
  } else if (role) {
    shouldRender = hasRole(role);
  }

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ConditionalRender role="admin" fallback={fallback}>
    {children}
  </ConditionalRender>
);

export const EditorOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ConditionalRender role="editor" fallback={fallback}>
    {children}
  </ConditionalRender>
);

export const ViewerOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
  <ConditionalRender role="viewer" fallback={fallback}>
    {children}
  </ConditionalRender>
);

export const WithPermission: React.FC<{ children: ReactNode; permission: string; fallback?: ReactNode }> = ({ children, permission, fallback }) => (
  <ConditionalRender permission={permission} fallback={fallback}>
    {children}
  </ConditionalRender>
);