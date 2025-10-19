import { useState } from 'react';
import { Bell, X, Check, AlertTriangle, Info, Shield } from 'lucide-react';
import { Button } from '../Button';

export interface SecurityNotification {
  id: string;
  type: 'security' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface NotificationCenterProps {
  notifications: SecurityNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (notificationId: string) => void;
  className?: string;
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  className = ''
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'security'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const securityCount = notifications.filter(n => n.type === 'security' && !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'security':
        return notification.type === 'security';
      default:
        return true;
    }
  });

  const getNotificationIcon = (type: SecurityNotification['type']) => {
    switch (type) {
      case 'security':
        return Shield;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return Check;
      case 'info':
      default:
        return Info;
    }
  };

  const getNotificationStyles = (type: SecurityNotification['type'], read: boolean) => {
    const baseStyles = read ? 'opacity-60' : '';
    
    switch (type) {
      case 'security':
        return `${baseStyles} border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20`;
      case 'warning':
        return `${baseStyles} border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20`;
      case 'success':
        return `${baseStyles} border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20`;
      case 'info':
      default:
        return `${baseStyles} border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20`;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {securityCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 w-2 h-2 rounded-full animate-pulse" />
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm text-neutral-500">
                      ({unreadCount} unread)
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 mt-3">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'unread', label: 'Unread' },
                  { key: 'security', label: 'Security' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      filter === key
                        ? 'bg-primary-500 text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              {unreadCount > 0 && (
                <div className="mt-3">
                  <Button
                    onClick={onMarkAllAsRead}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Mark all as read
                  </Button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 ${getNotificationStyles(notification.type, notification.read)}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            notification.type === 'security' ? 'text-red-600 dark:text-red-400' :
                            notification.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                            notification.type === 'success' ? 'text-green-600 dark:text-green-400' :
                            'text-blue-600 dark:text-blue-400'
                          }`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className={`font-medium text-sm ${
                                notification.read ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                              }`}>
                                {notification.title}
                              </h4>
                              
                              <div className="flex items-center gap-1 ml-2">
                                {!notification.read && (
                                  <button
                                    onClick={() => onMarkAsRead(notification.id)}
                                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                                
                                {!notification.persistent && (
                                  <button
                                    onClick={() => onDismiss(notification.id)}
                                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    title="Dismiss"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className={`text-xs mt-1 ${
                              notification.read ? 'text-neutral-500 dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-300'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <p className="text-xs text-neutral-400 mt-1">
                              {formatTimestamp(notification.timestamp)}
                            </p>

                            {notification.action && (
                              <div className="mt-2">
                                <Button
                                  onClick={notification.action.onClick}
                                  variant={notification.type === 'security' ? 'danger' : 'primary'}
                                  size="sm"
                                  className="text-xs"
                                >
                                  {notification.action.label}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper functions to create common security notifications
export const createSecurityNotifications = {
  passwordExpiry: (daysLeft: number, onChangePassword: () => void): SecurityNotification => ({
    id: `password-expiry-${Date.now()}`,
    type: 'warning',
    title: 'Password Expiring Soon',
    message: `Your password will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Change it now to maintain account security.`,
    timestamp: new Date(),
    read: false,
    action: {
      label: 'Change Password',
      onClick: onChangePassword,
    },
  }),

  accountLocked: (unlockTime: Date): SecurityNotification => ({
    id: `account-locked-${Date.now()}`,
    type: 'security',
    title: 'Account Locked',
    message: `Your account has been temporarily locked due to multiple failed login attempts. It will be unlocked at ${unlockTime.toLocaleTimeString()}.`,
    timestamp: new Date(),
    read: false,
    persistent: true,
  }),

  suspiciousLogin: (location: string, onSecureAccount: () => void): SecurityNotification => ({
    id: `suspicious-login-${Date.now()}`,
    type: 'security',
    title: 'Suspicious Login Detected',
    message: `A login attempt was made from ${location}. If this wasn't you, secure your account immediately.`,
    timestamp: new Date(),
    read: false,
    action: {
      label: 'Secure Account',
      onClick: onSecureAccount,
    },
    persistent: true,
  }),

  twoFactorSetupReminder: (onSetup2FA: () => void): SecurityNotification => ({
    id: `2fa-reminder-${Date.now()}`,
    type: 'info',
    title: 'Enable Two-Factor Authentication',
    message: 'Secure your account with 2FA for enhanced protection against unauthorized access.',
    timestamp: new Date(),
    read: false,
    action: {
      label: 'Enable 2FA',
      onClick: onSetup2FA,
    },
  }),

  passwordChanged: (): SecurityNotification => ({
    id: `password-changed-${Date.now()}`,
    type: 'success',
    title: 'Password Changed',
    message: 'Your password has been successfully updated. All other sessions have been logged out.',
    timestamp: new Date(),
    read: false,
  }),

  twoFactorEnabled: (): SecurityNotification => ({
    id: `2fa-enabled-${Date.now()}`,
    type: 'success',
    title: '2FA Enabled',
    message: 'Two-factor authentication is now active on your account.',
    timestamp: new Date(),
    read: false,
  }),

  sessionExpiring: (minutesLeft: number, onExtendSession: () => void): SecurityNotification => ({
    id: `session-expiring-${Date.now()}`,
    type: 'warning',
    title: 'Session Expiring',
    message: `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Save your work.`,
    timestamp: new Date(),
    read: false,
    action: {
      label: 'Extend Session',
      onClick: onExtendSession,
    },
  }),

  backupCodesUsed: (remaining: number): SecurityNotification => ({
    id: `backup-codes-used-${Date.now()}`,
    type: 'warning',
    title: 'Backup Code Used',
    message: `A backup code was used to access your account. ${remaining} codes remaining.`,
    timestamp: new Date(),
    read: false,
  }),
};