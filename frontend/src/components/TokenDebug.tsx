import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

export const TokenDebug: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        timestamp: new Date().toISOString(),
        isAuthenticated,
        isLoading,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        } : null,
        token: apiService.getToken(),
        tokenLength: apiService.getToken()?.length || 0,
        localStorage: {
          auth_token: localStorage.getItem('auth_token'),
          user: localStorage.getItem('user'),
        }
      });
    };

    updateDebugInfo();
    
    // Update every 2 seconds
    const interval = setInterval(updateDebugInfo, 2000);
    
    return () => clearInterval(interval);
  }, [user, isAuthenticated, isLoading]);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">Token Debug Info</h3>
      <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
      >
        Refresh Page
      </button>
    </div>
  );
};