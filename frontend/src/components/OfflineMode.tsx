import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle, Save } from 'lucide-react';
import { Button } from './Button';

interface OfflineModeProps {
  children: React.ReactNode;
}

interface OfflineData {
  requests: any[];
  collections: any[];
  environments: any[];
  notes: any[];
  lastSync: string | null;
}

const OfflineMode: React.FC<OfflineModeProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    requests: [],
    collections: [],
    environments: [],
    notes: [],
    lastSync: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      // Attempt to sync offline data
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      // Load offline data from localStorage
      loadOfflineData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    try {
      const stored = localStorage.getItem('offline-data');
      if (stored) {
        setOfflineData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };



  const syncOfflineData = async () => {
    // This would sync offline changes with the server
    // Implementation depends on your API structure
    console.log('Syncing offline data...');
    
    try {
      // Example sync logic
      const syncPromises: Promise<any>[] = [];
      
      // Sync requests, collections, etc.
      // This is a placeholder - implement based on your API
      
      await Promise.all(syncPromises);
      
      // Clear offline data after successful sync
      localStorage.removeItem('offline-data');
      setOfflineData({
        requests: [],
        collections: [],
        environments: [],
        notes: [],
        lastSync: new Date().toISOString(),
      });
      
      console.log('Offline data synced successfully');
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  };

  const dismissBanner = () => {
    setShowOfflineBanner(false);
  };

  return (
    <div className="relative">
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              You're offline. Changes will be saved locally.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {offlineData.lastSync && (
              <span className="text-xs opacity-75">
                Last sync: {new Date(offlineData.lastSync).toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissBanner}
              className="text-white hover:bg-orange-600"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Offline Status Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-orange-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">Offline</span>
          </div>
        </div>
      )}

      {/* Sync Status Indicator */}
      {isOnline && offlineData.requests.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span className="text-sm">Syncing changes...</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={showOfflineBanner ? 'pt-12' : ''}>
        {children}
      </div>

      {/* Offline Mode Features */}
      {!isOnline && (
        <div className="fixed bottom-20 right-4 z-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Limited Functionality
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Some features are unavailable offline. Your work is being saved locally.
                </p>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <div>• API requests: View only</div>
                  <div>• Collections: Local changes saved</div>
                  <div>• Environments: Local changes saved</div>
                  <div>• Notes: Local changes saved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineMode;