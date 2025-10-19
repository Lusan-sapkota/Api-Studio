import { useState, useEffect, useCallback } from "react";
import {
  SecurityNotification,
  createSecurityNotifications,
} from "../components/auth/NotificationCenter";
import {
  SecurityAlert,
  createSecurityAlerts,
} from "../components/auth/SecurityAlertBanner";
import { useAuth } from "../contexts/AuthContext";
import sessionService from "../services/sessionService";

interface SecurityNotificationState {
  notifications: SecurityNotification[];
  alerts: SecurityAlert[];
}

export function useSecurityNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<SecurityNotificationState>({
    notifications: [],
    alerts: [],
  });

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("security-notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState((prev) => ({
          ...prev,
          notifications: parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          })),
        }));
      } catch (error) {
        console.error("Failed to load security notifications:", error);
      }
    }
  }, []);

  // Save notifications to localStorage
  const saveNotifications = useCallback(
    (notifications: SecurityNotification[]) => {
      localStorage.setItem(
        "security-notifications",
        JSON.stringify(notifications)
      );
    },
    []
  );

  // Add notification
  const addNotification = useCallback(
    (notification: SecurityNotification) => {
      setState((prev) => {
        const newNotifications = [notification, ...prev.notifications];
        saveNotifications(newNotifications);
        return {
          ...prev,
          notifications: newNotifications,
        };
      });
    },
    [saveNotifications]
  );

  // Add alert
  const addAlert = useCallback((alert: SecurityAlert) => {
    setState((prev) => ({
      ...prev,
      alerts: [alert, ...prev.alerts.filter((a) => a.id !== alert.id)],
    }));
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(
    (notificationId: string) => {
      setState((prev) => {
        const newNotifications = prev.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        saveNotifications(newNotifications);
        return {
          ...prev,
          notifications: newNotifications,
        };
      });
    },
    [saveNotifications]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setState((prev) => {
      const newNotifications = prev.notifications.map((n) => ({
        ...n,
        read: true,
      }));
      saveNotifications(newNotifications);
      return {
        ...prev,
        notifications: newNotifications,
      };
    });
  }, [saveNotifications]);

  // Dismiss notification
  const dismissNotification = useCallback(
    (notificationId: string) => {
      setState((prev) => {
        const newNotifications = prev.notifications.filter(
          (n) => n.id !== notificationId
        );
        saveNotifications(newNotifications);
        return {
          ...prev,
          notifications: newNotifications,
        };
      });
    },
    [saveNotifications]
  );

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((a) => a.id !== alertId),
    }));
  }, []);

  // Check for security conditions and create notifications/alerts
  useEffect(() => {
    if (!user) return;

    const checkSecurityConditions = () => {
      const now = new Date();

      // Check if 2FA is not enabled (show reminder after 7 days)
      if (!user.two_factor_enabled) {
        const userCreated = new Date(user.last_login_at || now);
        const daysSinceCreation = Math.floor(
          (now.getTime() - userCreated.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceCreation >= 7) {
          // Check if we haven't shown this reminder recently
          const lastReminder = localStorage.getItem("last-2fa-reminder");
          const lastReminderDate = lastReminder ? new Date(lastReminder) : null;
          const daysSinceReminder = lastReminderDate
            ? Math.floor(
                (now.getTime() - lastReminderDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : Infinity;

          if (daysSinceReminder >= 7) {
            addAlert(
              createSecurityAlerts.twoFactorSetup(() => {
                // Navigate to security settings
                window.location.hash = "#/settings/security";
              })
            );
            localStorage.setItem("last-2fa-reminder", now.toISOString());
          }
        }
      }

      // Check for password change requirement
      if (user.requires_password_change) {
        addAlert(
          createSecurityAlerts.weakPassword(() => {
            window.location.hash = "#/settings/security";
          })
        );
      }

      // Simulate session expiry warning (in real app, this would come from JWT expiry)
      const sessionExpiry = localStorage.getItem("session-expiry-warning");
      if (!sessionExpiry) {
        // Set a warning for 30 minutes from now (example)
        setTimeout(() => {
          addNotification(
            createSecurityNotifications.sessionExpiring(5, () => {
              // Extend session logic
              console.log("Extending session...");
            })
          );
        }, 25 * 60 * 1000); // 25 minutes
        localStorage.setItem("session-expiry-warning", "set");
      }
    };

    checkSecurityConditions();
  }, [user, addAlert, addNotification]);

  // Listen for session warnings
  useEffect(() => {
    const unsubscribe = sessionService.onSessionWarning((warning) => {
      if (warning.type === "timeout") {
        addNotification(
          createSecurityNotifications.sessionExpiring(
            Math.floor((warning.timeRemaining || 0) / 60000), // Convert to minutes
            () => {
              sessionService.extendSession();
            }
          )
        );
      } else if (warning.type === "concurrent") {
        addAlert(
          createSecurityAlerts.suspiciousActivity(() => {
            window.location.hash = "#/settings/security";
          })
        );
      }
    });

    return unsubscribe;
  }, [addNotification, addAlert]);

  // Security event handlers
  const handlePasswordChanged = useCallback(() => {
    addNotification(createSecurityNotifications.passwordChanged());
    addAlert(createSecurityAlerts.passwordChanged());
  }, [addNotification, addAlert]);

  const handle2FAEnabled = useCallback(() => {
    addNotification(createSecurityNotifications.twoFactorEnabled());
    addAlert(createSecurityAlerts.twoFactorEnabled());
  }, [addNotification, addAlert]);

  const handleBackupCodesGenerated = useCallback(() => {
    addAlert(createSecurityAlerts.backupCodesGenerated());
  }, [addAlert]);

  const handleSuspiciousActivity = useCallback(
    (location: string = "unknown location") => {
      addNotification(
        createSecurityNotifications.suspiciousLogin(location, () => {
          window.location.hash = "#/settings/security";
        })
      );
      addAlert(
        createSecurityAlerts.suspiciousActivity(() => {
          window.location.hash = "#/settings/security";
        })
      );
    },
    [addNotification, addAlert]
  );

  const handleAccountLocked = useCallback(
    (unlockTime: Date) => {
      addNotification(createSecurityNotifications.accountLocked(unlockTime));
      addAlert(createSecurityAlerts.accountLocked(unlockTime));
    },
    [addNotification, addAlert]
  );

  const handleBackupCodeUsed = useCallback(
    (remaining: number) => {
      addNotification(createSecurityNotifications.backupCodesUsed(remaining));
    },
    [addNotification]
  );

  return {
    notifications: state.notifications,
    alerts: state.alerts,
    unreadCount: state.notifications.filter((n) => !n.read).length,
    securityCount: state.notifications.filter(
      (n) => n.type === "security" && !n.read
    ).length,

    // Actions
    addNotification,
    addAlert,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAlert,

    // Event handlers
    handlePasswordChanged,
    handle2FAEnabled,
    handleBackupCodesGenerated,
    handleSuspiciousActivity,
    handleAccountLocked,
    handleBackupCodeUsed,
  };
}
