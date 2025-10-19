import React, { useState, useEffect, ReactNode } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface NetworkErrorHandlerProps {
  children: ReactNode;
}

interface NetworkState {
  isOnline: boolean;
  hasNetworkError: boolean;
  retryCount: number;
  lastError: string | null;
}

const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    hasNetworkError: false,
    retryCount: 0,
    lastError: null,
  });

  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  useEffect(() => {
    const handleOnline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: true,
        hasNetworkError: false,
        retryCount: 0,
        lastError: null,
      }));
    };

    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        hasNetworkError: true,
        lastError: 'No internet connection',
      }));
    };

    // Listen for network status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for custom network error events
    const handleNetworkError = (event: CustomEvent) => {
      setNetworkState(prev => ({
        ...prev,
        hasNetworkError: true,
        lastError: event.detail?.message || 'Network error occurred',
      }));
    };

    window.addEventListener('network-error', handleNetworkError as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-error', handleNetworkError as EventListener);
    };
  }, []);

  const handleRetry = async () => {
    if (networkState.retryCount >= maxRetries) {
      return;
    }

    setNetworkState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
    }));

    // Wait for retry delay
    await new Promise(resolve => setTimeout(resolve, retryDelay));

    // Test network connectivity
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      if (response.ok) {
        setNetworkState(prev => ({
          ...prev,
          hasNetworkError: false,
          retryCount: 0,
          lastError: null,
        }));
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      setNetworkState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Show network error UI if there's a network issue
  if (networkState.hasNetworkError || !networkState.isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            {!networkState.isOnline ? (
              <WifiOff className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {!networkState.isOnline ? 'No Internet Connection' : 'Network Error'}
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {!networkState.isOnline 
                ? 'Please check your internet connection and try again.'
                : networkState.lastError || 'Unable to connect to the server.'
              }
            </p>

            {networkState.retryCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Retry attempt {networkState.retryCount} of {maxRetries}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {networkState.retryCount < maxRetries && (
              <Button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2"
                disabled={networkState.retryCount >= maxRetries}
              >
                <RefreshCw className="w-4 h-4" />
                {networkState.retryCount === 0 ? 'Retry Connection' : 'Retry Again'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleReload}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>

            {networkState.retryCount >= maxRetries && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Maximum retry attempts reached. Please check your connection and reload the page.
                </p>
              </div>
            )}
          </div>

          {/* Network status indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              networkState.isOnline ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-gray-500 dark:text-gray-400">
              {networkState.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Utility function to dispatch network error events
export const dispatchNetworkError = (message: string) => {
  window.dispatchEvent(new CustomEvent('network-error', {
    detail: { message }
  }));
};

export default NetworkErrorHandler;