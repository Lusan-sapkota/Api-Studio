interface AppConfig {
  apiUrl: string;
  mode: 'hosted' | 'local';
  enableAuth: boolean;
}

interface SystemStatus {
  mode: string;
  bootstrap_required: boolean;
  smtp_configured: boolean;
}

class ConfigService {
  private config: AppConfig;
  private systemStatus: SystemStatus | null = null;

  constructor() {
    this.config = {
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:58123',
      mode: (import.meta.env.VITE_APP_MODE as 'hosted' | 'local') || 'local',
      enableAuth: import.meta.env.VITE_ENABLE_AUTH === 'true' || import.meta.env.VITE_APP_MODE === 'hosted',
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  isHostedMode(): boolean {
    return this.config.mode === 'hosted';
  }

  isLocalMode(): boolean {
    return this.config.mode === 'local';
  }

  isAuthEnabled(): boolean {
    return this.config.enableAuth && this.isHostedMode();
  }

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      // Only fetch system status in hosted mode
      if (!this.isHostedMode()) {
        return {
          mode: 'local',
          bootstrap_required: false,
          smtp_configured: false,
        };
      }

      const response = await fetch(`${this.config.apiUrl}/api/admin/system-status`);
      
      if (!response.ok) {
        console.warn('Failed to fetch system status:', response.status);
        return null;
      }

      const data = await response.json();
      this.systemStatus = data.data || data;
      return this.systemStatus;
    } catch (error) {
      console.error('Error fetching system status:', error);
      return null;
    }
  }

  getCachedSystemStatus(): SystemStatus | null {
    return this.systemStatus;
  }

  async isBootstrapRequired(): Promise<boolean> {
    if (!this.isHostedMode()) {
      return false;
    }

    const status = await this.getSystemStatus();
    return status?.bootstrap_required || false;
  }

  async isSmtpConfigured(): Promise<boolean> {
    if (!this.isHostedMode()) {
      return true; // Not applicable in local mode
    }

    const status = await this.getSystemStatus();
    return status?.smtp_configured || false;
  }

  // Environment variable helpers
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  getAppMode(): 'hosted' | 'local' {
    return this.config.mode;
  }

  // Development helpers
  isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

export const configService = new ConfigService();
export default configService;