import { apiService } from "./api";

interface SessionInfo {
  id: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
}

interface SessionWarning {
  type: "timeout" | "concurrent" | "suspicious";
  message: string;
  timeRemaining?: number;
}

class SessionService {
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private sessionWarningCallbacks: ((warning: SessionWarning) => void)[] = [];
  private lastActivity: number = Date.now();
  private sessionWarningTimeout: NodeJS.Timeout | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;

  // Session timeout settings (in milliseconds)
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
  private readonly ACTIVITY_CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes

  constructor() {
    this.setupActivityTracking();
    // Temporarily disable session monitoring to debug
    // this.startSessionMonitoring();
  }

  private setupActivityTracking() {
    // Track user activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.resetSessionTimeout();
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    // Track API calls as activity by listening to fetch events
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      updateActivity();
      return originalFetch.apply(window, args);
    };
  }

  private startSessionMonitoring() {
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionStatus();
    }, this.ACTIVITY_CHECK_INTERVAL);

    this.resetSessionTimeout();
  }

  private resetSessionTimeout() {
    // Clear existing timeouts
    if (this.sessionWarningTimeout) {
      clearTimeout(this.sessionWarningTimeout);
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // Set warning timeout
    this.sessionWarningTimeout = setTimeout(() => {
      this.emitWarning({
        type: "timeout",
        message: "Your session will expire in 5 minutes due to inactivity.",
        timeRemaining: this.WARNING_TIME,
      });
    }, this.SESSION_TIMEOUT - this.WARNING_TIME);

    // Set session timeout
    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.SESSION_TIMEOUT);
  }

  private async checkSessionStatus() {
    try {
      const token = apiService.getToken();
      if (!token) return;

      // Check if token is still valid by making a lightweight API call
      const response = await apiService.getCurrentUser();

      if (response.success === false && response.error?.includes("token")) {
        this.handleSessionExpiry();
      }
    } catch (error) {
      console.warn("Session check failed:", error);
    }
  }

  private handleSessionTimeout() {
    this.emitWarning({
      type: "timeout",
      message:
        "Your session has expired due to inactivity. Please log in again.",
    });

    // Clear token and redirect to login
    apiService.setToken(null);
    window.location.href = "/login?reason=timeout";
  }

  private handleSessionExpiry() {
    this.emitWarning({
      type: "timeout",
      message: "Your session has expired. Please log in again.",
    });

    // Clear token and redirect to login
    apiService.setToken(null);
    window.location.href = "/login?reason=expired";
  }

  private emitWarning(warning: SessionWarning) {
    this.sessionWarningCallbacks.forEach((callback) => callback(warning));
  }

  // Public methods
  public onSessionWarning(callback: (warning: SessionWarning) => void) {
    this.sessionWarningCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.sessionWarningCallbacks.indexOf(callback);
      if (index > -1) {
        this.sessionWarningCallbacks.splice(index, 1);
      }
    };
  }

  public async getUserSessions(): Promise<SessionInfo[]> {
    try {
      const response = await apiService.getUserSessions();
      if (response.success && response.data) {
        return response.data.sessions;
      }
      return [];
    } catch (error) {
      console.error("Failed to get user sessions:", error);
      return [];
    }
  }

  public async refreshSession(): Promise<boolean> {
    try {
      // Make an API call to refresh the session
      const response = await apiService.getCurrentUser();
      if (response.success) {
        this.lastActivity = Date.now();
        this.resetSessionTimeout();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      return false;
    }
  }

  public extendSession() {
    this.lastActivity = Date.now();
    this.resetSessionTimeout();
  }

  public getTimeUntilExpiry(): number {
    const timeSinceActivity = Date.now() - this.lastActivity;
    return Math.max(0, this.SESSION_TIMEOUT - timeSinceActivity);
  }

  public isSessionExpiringSoon(): boolean {
    return this.getTimeUntilExpiry() <= this.WARNING_TIME;
  }

  public destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    if (this.sessionWarningTimeout) {
      clearTimeout(this.sessionWarningTimeout);
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    this.sessionWarningCallbacks = [];
  }
}

export const sessionService = new SessionService();
export default sessionService;
