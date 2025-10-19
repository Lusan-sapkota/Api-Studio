import { useState, useEffect } from 'react';
import { Server, CheckCircle, AlertTriangle, XCircle, RefreshCw, Globe, Lock, Mail } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { apiService } from '../../services/api';
import { configService } from '../../services/config';

interface SystemStatus {
  mode: string;
  bootstrap_required: boolean;
  smtp_configured: boolean;
  database_healthy?: boolean;
  uptime?: number;
  version?: string;
}

export function SystemStatusCard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getSystemStatus();
      
      if (response.success === false || response.error) {
        setError(response.error || 'Failed to load system status');
        return;
      }
      
      setStatus(response.data!);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load system status');
      console.error('Error loading system status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (isHealthy: boolean, isWarning: boolean = false) => {
    if (isHealthy) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (isWarning) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (isHealthy: boolean, isWarning: boolean = false) => {
    if (isHealthy) return 'text-green-600 dark:text-green-400';
    if (isWarning) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getModeInfo = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'hosted':
        return {
          label: 'Hosted Mode',
          description: 'Multi-user collaborative platform with authentication',
          icon: <Globe className="w-4 h-4" />,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        };
      case 'local':
        return {
          label: 'Local Mode',
          description: 'Single-user workspace without authentication',
          icon: <Lock className="w-4 h-4" />,
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        };
      default:
        return {
          label: 'Unknown Mode',
          description: 'Mode configuration not detected',
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        };
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !status) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              System Status
            </h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </Card>
    );
  }

  const modeInfo = getModeInfo(status?.mode || configService.getAppMode());
  const isHostedMode = status?.mode === 'hosted' || configService.isHostedMode();

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              System Status
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSystemStatus}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Application Mode */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                {modeInfo.icon}
              </div>
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  Application Mode
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {modeInfo.description}
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm rounded font-medium ${modeInfo.color}`}>
              {modeInfo.label}
            </span>
          </div>

          {/* System Health Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bootstrap Status */}
            {isHostedMode && (
              <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(!status?.bootstrap_required)}
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Bootstrap
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {status?.bootstrap_required ? 'Setup required' : 'Completed'}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(!status?.bootstrap_required)}`}>
                  {status?.bootstrap_required ? 'Required' : 'Complete'}
                </span>
              </div>
            )}

            {/* SMTP Configuration */}
            {isHostedMode && (
              <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status?.smtp_configured || false)}
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Email Service
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      SMTP configuration
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(status?.smtp_configured || false)}`}>
                  {status?.smtp_configured ? 'Configured' : 'Not Set'}
                </span>
              </div>
            )}

            {/* Database Health */}
            <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(status?.database_healthy !== false)}
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Database
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    SQLite connection
                  </div>
                </div>
              </div>
              <span className={`text-sm font-medium ${getStatusColor(status?.database_healthy !== false)}`}>
                {status?.database_healthy !== false ? 'Healthy' : 'Error'}
              </span>
            </div>

            {/* System Uptime */}
            <div className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Uptime
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    System availability
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {formatUptime(status?.uptime)}
              </span>
            </div>
          </div>

          {/* System Information */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Version:</span>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {status?.version || 'v1.0.0'}
                </div>
              </div>
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Last Updated:</span>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {lastUpdated.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {isHostedMode && status?.bootstrap_required && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    Bootstrap Required
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300">
                    System setup is incomplete. Complete the bootstrap process to enable full functionality.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isHostedMode && !status?.smtp_configured && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800 dark:text-orange-200">
                    Email Service Not Configured
                  </div>
                  <div className="text-orange-700 dark:text-orange-300">
                    SMTP settings are required for user invitations and password resets.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}