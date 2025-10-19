import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/auth/LoadingSpinner';
import { configService } from '../services/config';

interface LoadingState {
  message: string;
  progress: number;
}

const AuthLoadingPage: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    message: 'Initializing...',
    progress: 0,
  });

  useEffect(() => {
    const loadingSteps = [
      { message: 'Checking application mode...', delay: 500 },
      { message: 'Loading configuration...', delay: 800 },
      { message: 'Verifying authentication...', delay: 1000 },
      { message: 'Preparing workspace...', delay: 1200 },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingState({
          message: loadingSteps[currentStep].message,
          progress: ((currentStep + 1) / loadingSteps.length) * 100,
        });
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const isLocalMode = configService.isLocalMode();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center max-w-md w-full px-4">
        <div className="mb-8">
          <LoadingSpinner />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isLocalMode ? 'Starting API Studio' : 'Authenticating'}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400">
            {loadingState.message}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>

          {isLocalMode && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Running in Local Mode - No authentication required
              </p>
            </div>
          )}
        </div>

        {/* Timeout fallback */}
        <div className="mt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Taking longer than expected? Try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLoadingPage;