import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import sessionService from '../services/sessionService';

interface SessionTimeoutWarningProps {
  onExtendSession?: () => void;
  onLogout?: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  onExtendSession,
  onLogout
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    const unsubscribe = sessionService.onSessionWarning((warning) => {
      setShowWarning(true);
      setWarningMessage(warning.message);
      setTimeRemaining(warning.timeRemaining || 0);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!showWarning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setShowWarning(false);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, timeRemaining]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      const success = await sessionService.refreshSession();
      if (success) {
        setShowWarning(false);
        onExtendSession?.();
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    setShowWarning(false);
    onLogout?.();
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark border border-warning-200 dark:border-warning-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Session Timeout Warning
            </h3>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {warningMessage}
            </p>

            {timeRemaining > 0 && (
              <div className="flex items-center space-x-2 mb-4 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                <Clock className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                <span className="text-sm font-medium text-warning-800 dark:text-warning-200">
                  Time remaining: {formatTime(timeRemaining)}
                </span>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={handleExtendSession}
                disabled={isExtending}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                {isExtending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Extending...
                  </>
                ) : (
                  'Extend Session'
                )}
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                Logout Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};