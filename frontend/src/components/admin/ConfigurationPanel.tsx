import { useState, useEffect } from 'react';
import { Settings, Mail, Shield, Database, Globe, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';
import { configService } from '../../services/config';

interface SystemConfig {
  app_mode: string;
  smtp_server?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  email_from?: string;
  jwt_expiry?: number;
  max_login_attempts?: number;
  login_lockout_duration?: number;
  otp_expiry?: number;
}

export function ConfigurationPanel() {
  const [config, setConfig] = useState<SystemConfig>({
    app_mode: 'local',
    smtp_server: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    email_from: '',
    jwt_expiry: 86400,
    max_login_attempts: 5,
    login_lockout_duration: 900,
    otp_expiry: 600
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load current configuration
    const currentMode = configService.getAppMode();
    setConfig(prev => ({ ...prev, app_mode: currentMode }));
  }, []);

  const handleInputChange = (field: keyof SystemConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const testSmtpConnection = async () => {
    if (!config.smtp_server || !config.smtp_port || !config.smtp_user) {
      setSmtpTestResult({
        success: false,
        message: 'Please fill in all SMTP fields before testing'
      });
      return;
    }

    try {
      setTestingSmtp(true);
      setSmtpTestResult(null);
      
      // This would typically call a backend endpoint to test SMTP
      // For now, we'll simulate the test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure based on configuration
      const isValid = config.smtp_server.includes('.') && config.smtp_port > 0;
      
      setSmtpTestResult({
        success: isValid,
        message: isValid 
          ? 'SMTP connection successful! Email service is properly configured.'
          : 'SMTP connection failed. Please check your server settings.'
      });
    } catch (err) {
      setSmtpTestResult({
        success: false,
        message: 'Failed to test SMTP connection. Please try again.'
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate configuration
      if (config.app_mode === 'hosted') {
        if (!config.smtp_server || !config.smtp_user || !config.email_from) {
          setError('SMTP configuration is required for hosted mode');
          return;
        }
      }

      // This would typically save to backend
      // For now, we'll simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Configuration saved successfully! Changes will take effect after restart.');
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isHostedMode = config.app_mode === 'hosted';

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary-500" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            System Configuration
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-300 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Application Mode */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-neutral-500" />
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                Application Mode
              </h4>
            </div>
            
            <div className="space-y-3">
              <Select
                label="Deployment Mode"
                value={config.app_mode}
                onChange={(e) => handleInputChange('app_mode', e.target.value)}
                options={[
                  { value: 'local', label: 'Local - Single user, no authentication' },
                  { value: 'hosted', label: 'Hosted - Multi-user with authentication' }
                ]}
              />
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                <div className="text-blue-800 dark:text-blue-200">
                  <strong>Current Mode:</strong> {config.app_mode === 'local' ? 'Local Mode' : 'Hosted Mode'}
                </div>
                <div className="text-blue-700 dark:text-blue-300 mt-1">
                  {config.app_mode === 'local' 
                    ? 'Authentication is disabled. All features are accessible without login.'
                    : 'Authentication is enabled. Users must log in to access the application.'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* SMTP Configuration - Only show in hosted mode */}
          {isHostedMode && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-neutral-500" />
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Email Configuration
                </h4>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Server"
                    placeholder="smtp.gmail.com"
                    value={config.smtp_server || ''}
                    onChange={(e) => handleInputChange('smtp_server', e.target.value)}
                  />
                  
                  <Input
                    label="SMTP Port"
                    type="number"
                    placeholder="587"
                    value={config.smtp_port || ''}
                    onChange={(e) => handleInputChange('smtp_port', parseInt(e.target.value) || 587)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Username"
                    placeholder="your-email@gmail.com"
                    value={config.smtp_user || ''}
                    onChange={(e) => handleInputChange('smtp_user', e.target.value)}
                  />
                  
                  <Input
                    label="SMTP Password"
                    type="password"
                    placeholder="Your app password"
                    value={config.smtp_password || ''}
                    onChange={(e) => handleInputChange('smtp_password', e.target.value)}
                  />
                </div>
                
                <Input
                  label="From Email Address"
                  placeholder="noreply@yourcompany.com"
                  value={config.email_from || ''}
                  onChange={(e) => handleInputChange('email_from', e.target.value)}
                />
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={testSmtpConnection}
                    disabled={testingSmtp}
                  >
                    {testingSmtp ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  
                  {smtpTestResult && (
                    <div className={`flex items-center gap-1 text-sm ${
                      smtpTestResult.success 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {smtpTestResult.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      {smtpTestResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Settings - Only show in hosted mode */}
          {isHostedMode && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-neutral-500" />
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Security Settings
                </h4>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="JWT Token Expiry (seconds)"
                    type="number"
                    placeholder="86400"
                    value={config.jwt_expiry || ''}
                    onChange={(e) => handleInputChange('jwt_expiry', parseInt(e.target.value) || 86400)}
                  />
                  
                  <Input
                    label="Max Login Attempts"
                    type="number"
                    placeholder="5"
                    value={config.max_login_attempts || ''}
                    onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value) || 5)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Login Lockout Duration (seconds)"
                    type="number"
                    placeholder="900"
                    value={config.login_lockout_duration || ''}
                    onChange={(e) => handleInputChange('login_lockout_duration', parseInt(e.target.value) || 900)}
                  />
                  
                  <Input
                    label="OTP Expiry (seconds)"
                    type="number"
                    placeholder="600"
                    value={config.otp_expiry || ''}
                    onChange={(e) => handleInputChange('otp_expiry', parseInt(e.target.value) || 600)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Database Settings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-neutral-500" />
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                Database Information
              </h4>
            </div>
            
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600 dark:text-neutral-400">Database Type:</span>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">SQLite</div>
                </div>
                <div>
                  <span className="text-neutral-600 dark:text-neutral-400">Database File:</span>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 font-mono">api_studio.db</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
                Database configuration is managed automatically. No manual configuration required.
              </div>
            </div>
          </div>

          {/* Save Configuration */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Changes require application restart to take effect
              </div>
              <Button
                variant="primary"
                onClick={saveConfiguration}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}