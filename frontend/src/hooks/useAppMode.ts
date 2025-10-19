import { useState, useEffect } from 'react';
import { configService } from '../services/config';

interface SystemStatus {
  mode: string;
  bootstrap_required: boolean;
  smtp_configured: boolean;
}

interface AppModeState {
  mode: 'hosted' | 'local';
  isAuthEnabled: boolean;
  systemStatus: SystemStatus | null;
  isBootstrapRequired: boolean;
  isSmtpConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAppMode = () => {
  const [state, setState] = useState<AppModeState>({
    mode: configService.getAppMode(),
    isAuthEnabled: configService.isAuthEnabled(),
    systemStatus: null,
    isBootstrapRequired: false,
    isSmtpConfigured: false,
    isLoading: true,
    error: null,
  });

  const refreshSystemStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const systemStatus = await configService.getSystemStatus();
      
      setState(prev => ({
        ...prev,
        systemStatus,
        isBootstrapRequired: systemStatus?.bootstrap_required || false,
        isSmtpConfigured: systemStatus?.smtp_configured || false,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch system status',
        isLoading: false,
      }));
    }
  };

  useEffect(() => {
    // Only fetch system status in hosted mode
    if (configService.isHostedMode()) {
      refreshSystemStatus();
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        systemStatus: {
          mode: 'local',
          bootstrap_required: false,
          smtp_configured: false,
        },
      }));
    }
  }, []);

  return {
    ...state,
    refreshSystemStatus,
    isHostedMode: configService.isHostedMode(),
    isLocalMode: configService.isLocalMode(),
  };
};