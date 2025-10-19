import { configService } from '../services/config';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateConfiguration = async (): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config = configService.getConfig();

  // Validate API URL
  if (!config.apiUrl) {
    errors.push('API URL is not configured');
  } else {
    try {
      new URL(config.apiUrl);
    } catch {
      errors.push('API URL is not a valid URL');
    }
  }

  // Validate mode configuration
  if (!['hosted', 'local'].includes(config.mode)) {
    errors.push('Invalid app mode. Must be "hosted" or "local"');
  }

  // Hosted mode specific validations
  if (config.mode === 'hosted') {
    try {
      const systemStatus = await configService.getSystemStatus();
      
      if (!systemStatus) {
        warnings.push('Unable to fetch system status from backend');
      } else {
        if (systemStatus.bootstrap_required) {
          warnings.push('System requires bootstrap setup');
        }
        
        if (!systemStatus.smtp_configured) {
          warnings.push('SMTP is not configured - email features will not work');
        }
      }
    } catch (error) {
      warnings.push('Backend connection failed - some features may not work');
    }
  }

  // Development environment warnings
  if (configService.isDevelopment()) {
    warnings.push('Running in development mode');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const getConfigurationSummary = () => {
  const config = configService.getConfig();
  
  return {
    mode: config.mode,
    authEnabled: config.enableAuth,
    apiUrl: config.apiUrl,
    environment: configService.isDevelopment() ? 'development' : 'production',
  };
};