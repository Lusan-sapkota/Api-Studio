import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
import { Button } from '../Button';

export type SecurityAlertType = 'warning' | 'error' | 'info' | 'success';

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  persistent?: boolean;
}

interface SecurityAlertBannerProps {
  alert: SecurityAlert;
  onDismiss?: (alertId: string) => void;
  className?: string;
}

export function SecurityAlertBanner({ alert, onDismiss, className = '' }: SecurityAlertBannerProps) {
  const getAlertStyles = (type: SecurityAlertType) => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-800 dark:text-red-200',
          message: 'text-red-700 dark:text-red-300',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-800 dark:text-yellow-200',
          message: 'text-yellow-700 dark:text-yellow-300',
        };
      case 'success':
        return {
          container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          title: 'text-green-800 dark:text-green-200',
          message: 'text-green-700 dark:text-green-300',
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-800 dark:text-blue-200',
          message: 'text-blue-700 dark:text-blue-300',
        };
    }
  };

  const getIcon = (type: SecurityAlertType) => {
    switch (type) {
      case 'error':
        return AlertTriangle;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      case 'info':
      default:
        return Info;
    }
  };

  const styles = getAlertStyles(alert.type);
  const Icon = getIcon(alert.type);

  const handleDismiss = () => {
    if (onDismiss && alert.dismissible) {
      onDismiss(alert.id);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${styles.title}`}>
            {alert.title}
          </h4>
          <p className={`mt-1 text-sm ${styles.message}`}>
            {alert.message}
          </p>
          
          {alert.action && (
            <div className="mt-3">
              <Button
                onClick={alert.action.onClick}
                variant={alert.type === 'error' ? 'danger' : 'primary'}
                size="sm"
              >
                {alert.action.label}
              </Button>
            </div>
          )}
        </div>

        {alert.dismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${styles.icon}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Predefined security alerts
export const createSecurityAlerts = {
  passwordExpiry: (daysLeft: number, onChangePassword: () => void): SecurityAlert => ({
    id: 'password-expiry',
    type: 'warning',
    title: 'Password Expiring Soon',
    message: `Your password will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Change it now to maintain account security.`,
    action: {
      label: 'Change Password',
      onClick: onChangePassword,
    },
    dismissible: true,
  }),

  twoFactorSetup: (onSetup2FA: () => void): SecurityAlert => ({
    id: '2fa-setup-reminder',
    type: 'info',
    title: 'Secure Your Account',
    message: 'Enable two-factor authentication to add an extra layer of security to your account.',
    action: {
      label: 'Enable 2FA',
      onClick: onSetup2FA,
    },
    dismissible: true,
  }),

  accountLocked: (unlockTime: Date): SecurityAlert => ({
    id: 'account-locked',
    type: 'error',
    title: 'Account Temporarily Locked',
    message: `Your account has been locked due to multiple failed login attempts. It will be unlocked at ${unlockTime.toLocaleTimeString()}.`,
    dismissible: false,
    persistent: true,
  }),

  suspiciousActivity: (onReviewActivity: () => void): SecurityAlert => ({
    id: 'suspicious-activity',
    type: 'warning',
    title: 'Suspicious Activity Detected',
    message: 'We detected unusual activity on your account. Please review your recent activity and secure your account.',
    action: {
      label: 'Review Activity',
      onClick: onReviewActivity,
    },
    dismissible: false,
    persistent: true,
  }),

  sessionExpiring: (minutesLeft: number, onExtendSession: () => void): SecurityAlert => ({
    id: 'session-expiring',
    type: 'warning',
    title: 'Session Expiring Soon',
    message: `Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Save your work and extend your session if needed.`,
    action: {
      label: 'Extend Session',
      onClick: onExtendSession,
    },
    dismissible: true,
  }),

  passwordChanged: (): SecurityAlert => ({
    id: 'password-changed',
    type: 'success',
    title: 'Password Changed Successfully',
    message: 'Your password has been updated. All other sessions have been logged out for security.',
    dismissible: true,
  }),

  twoFactorEnabled: (): SecurityAlert => ({
    id: '2fa-enabled',
    type: 'success',
    title: '2FA Enabled Successfully',
    message: 'Two-factor authentication is now active on your account. Your account is more secure.',
    dismissible: true,
  }),

  backupCodesGenerated: (): SecurityAlert => ({
    id: 'backup-codes-generated',
    type: 'info',
    title: 'New Backup Codes Generated',
    message: 'Your previous backup codes are no longer valid. Store the new codes in a secure location.',
    dismissible: true,
  }),

  weakPassword: (onChangePassword: () => void): SecurityAlert => ({
    id: 'weak-password',
    type: 'warning',
    title: 'Weak Password Detected',
    message: 'Your current password may be vulnerable. Consider updating to a stronger password.',
    action: {
      label: 'Update Password',
      onClick: onChangePassword,
    },
    dismissible: true,
  }),

  multipleFailedLogins: (count: number): SecurityAlert => ({
    id: 'failed-logins',
    type: 'warning',
    title: 'Multiple Failed Login Attempts',
    message: `There have been ${count} failed login attempts on your account. If this wasn't you, consider changing your password.`,
    dismissible: true,
  }),
};