import React, { createContext, useContext, ReactNode } from 'react';
import { useSecurityNotifications } from '../hooks/useSecurityNotifications';
import { SecurityNotification } from '../components/auth/NotificationCenter';
import { SecurityAlert } from '../components/auth/SecurityAlertBanner';

interface SecurityNotificationContextType {
  notifications: SecurityNotification[];
  alerts: SecurityAlert[];
  unreadCount: number;
  securityCount: number;
  
  // Actions
  addNotification: (notification: SecurityNotification) => void;
  addAlert: (alert: SecurityAlert) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  dismissAlert: (alertId: string) => void;
  
  // Event handlers
  handlePasswordChanged: () => void;
  handle2FAEnabled: () => void;
  handleBackupCodesGenerated: () => void;
  handleSuspiciousActivity: (location?: string) => void;
  handleAccountLocked: (unlockTime: Date) => void;
  handleBackupCodeUsed: (remaining: number) => void;
}

const SecurityNotificationContext = createContext<SecurityNotificationContextType | undefined>(undefined);

interface SecurityNotificationProviderProps {
  children: ReactNode;
}

export const SecurityNotificationProvider: React.FC<SecurityNotificationProviderProps> = ({ children }) => {
  const securityNotifications = useSecurityNotifications();

  return (
    <SecurityNotificationContext.Provider value={securityNotifications}>
      {children}
    </SecurityNotificationContext.Provider>
  );
};

export const useSecurityNotificationContext = (): SecurityNotificationContextType => {
  const context = useContext(SecurityNotificationContext);
  if (context === undefined) {
    throw new Error('useSecurityNotificationContext must be used within a SecurityNotificationProvider');
  }
  return context;
};

export default SecurityNotificationContext;