import React from 'react';
import { FileText, User, Globe, Monitor, Calendar, Code, MapPin, Activity } from 'lucide-react';
import { Modal } from '../Modal';
import { Card } from '../Card';

interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

interface AuditLogDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

export function AuditLogDetails({ isOpen, onClose, log }: AuditLogDetailsProps) {
  if (!log) return null;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZoneName: 'short'
      })
    };
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (actionLower.includes('create') || actionLower.includes('add')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    if (actionLower.includes('update') || actionLower.includes('modify') || actionLower.includes('change')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const parseUserAgent = (userAgent?: string) => {
    if (!userAgent) return null;
    
    // Simple user agent parsing - in production, you might want to use a library
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/?([\d.]+)/);
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);
    
    return {
      browser: browserMatch ? `${browserMatch[1]} ${browserMatch[2]}` : 'Unknown',
      os: osMatch ? osMatch[1] : 'Unknown',
      full: userAgent
    };
  };

  const userAgentInfo = parseUserAgent(log.user_agent);
  const timestampInfo = formatTimestamp(log.timestamp);

  const renderDetailsValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Log Details" size="lg">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-3 py-1 text-sm rounded font-medium ${getActionColor(log.action)}`}>
                {log.action}
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-500">
                Log ID: #{log.id}
              </span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">
              {timestampInfo.date} at {timestampInfo.time}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-neutral-500" />
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  User Information
                </h3>
              </div>
              
              <div className="space-y-3">
                {log.user ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {(log.user.name || log.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {log.user.name || log.user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          {log.user.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="font-medium">User ID:</span> #{log.user.id}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Activity className="w-4 h-4" />
                    <span>System Action</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Session Information */}
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-neutral-500" />
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Session Information
                </h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">IP Address:</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-mono">
                    {log.ip_address || 'Unknown'}
                  </span>
                </div>
                
                {userAgentInfo && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Browser:</span>
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {userAgentInfo.browser}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Operating System:</span>
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {userAgentInfo.os}
                      </span>
                    </div>
                  </>
                )}
                
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-600 dark:text-neutral-400 text-xs">Full User Agent:</span>
                  <div className="mt-1 p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-xs font-mono text-neutral-700 dark:text-neutral-300 break-all">
                    {log.user_agent || 'Not available'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Resource Information */}
        {(log.resource_type || log.resource_id) && (
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-neutral-500" />
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Resource Information
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {log.resource_type && (
                  <div>
                    <span className="text-neutral-600 dark:text-neutral-400">Resource Type:</span>
                    <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                      {log.resource_type}
                    </div>
                  </div>
                )}
                
                {log.resource_id && (
                  <div>
                    <span className="text-neutral-600 dark:text-neutral-400">Resource ID:</span>
                    <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 font-mono">
                      {log.resource_id}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Action Details */}
        {Object.keys(log.details).length > 0 && (
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-neutral-500" />
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Action Details
                </h3>
              </div>
              
              <div className="space-y-3">
                {Object.entries(log.details).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded text-sm">
                      <pre className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap font-mono text-xs">
                        {renderDetailsValue(value)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Timestamp Details */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-neutral-500" />
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                Timestamp Information
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Local Time:</span>
                <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                  {timestampInfo.date}
                </div>
                <div className="text-neutral-600 dark:text-neutral-400">
                  {timestampInfo.time}
                </div>
              </div>
              
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">UTC Time:</span>
                <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 font-mono">
                  {new Date(log.timestamp).toISOString()}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}