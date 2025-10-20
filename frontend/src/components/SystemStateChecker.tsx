import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { configService } from '../services/config';

interface SystemStateCheckerProps {
  children: React.ReactNode;
}

export function SystemStateChecker({ children }: SystemStateCheckerProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [systemState, setSystemState] = useState<'unknown' | 'ready' | 'locked' | 'error'>('unknown');
  const navigate = useNavigate();
  const location = useLocation();
  const hasCheckedForPath = useRef<string | null>(null);

  useEffect(() => {
    const checkSystemState = async () => {
      // FIRST PRIORITY: Completely disable during bootstrap flow
      const tempToken = sessionStorage.getItem('temp_token');
      if (tempToken) {
        setSystemState('ready');
        setIsChecking(false);
        return;
      }

      // SECOND PRIORITY: Disable for setup page
      if (location.pathname === '/setup') {
        setSystemState('ready');
        setIsChecking(false);
        return;
      }

      // Prevent multiple checks for the same path
      if (hasCheckedForPath.current === location.pathname) {
        return;
      }

      // Skip check for local mode
      if (configService.isLocalMode()) {
        setSystemState('ready');
        setIsChecking(false);
        hasCheckedForPath.current = location.pathname;
        return;
      }



      // Skip check if already on auth-related pages
      const authPages = ['/bootstrap', '/verify-otp', '/login', '/auth-loading'];
      const isAuthPage = authPages.some(page => location.pathname.startsWith(page));

      if (isAuthPage) {
        setSystemState('ready');
        setIsChecking(false);
        hasCheckedForPath.current = location.pathname;
        return;
      }

      try {
        // Check system status with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${configService.getApiUrl()}/api/health`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const healthData = await response.json();

        // Check if system is locked (no admin users)
        if (healthData.bootstrap && healthData.bootstrap.is_locked) {
          setSystemState('locked');
          // Redirect to bootstrap page
          navigate('/bootstrap', { replace: true });
          return;
        }

        // System is ready
        setSystemState('ready');
        hasCheckedForPath.current = location.pathname;
      } catch (error) {
        console.error('System state check failed:', error);

        // Try to determine if it's a system lock error (503)
        if (error instanceof Error && error.message.includes('503')) {
          setSystemState('locked');
          navigate('/bootstrap', { replace: true });
          return;
        }

        // For other errors, set error state but don't block the app completely
        // This allows users to still access the app even if health check fails
        setSystemState('error');
        hasCheckedForPath.current = location.pathname;
      } finally {
        setIsChecking(false);
      }
    };

    checkSystemState();
  }, [navigate, location.pathname]);

  // BYPASS SystemStateChecker completely for bootstrap flow (after all hooks)
  const tempToken = sessionStorage.getItem('temp_token');
  const isSetupPage = location.pathname === '/setup';
  
  if (tempToken || isSetupPage) {
    return <>{children}</>;
  }

  // Show loading while checking system state
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Checking system status...</p>
        </div>
      </div>
    );
  }

  // For error state, show children with a warning banner instead of blocking
  if (systemState === 'error') {
    return (
      <>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Backend connection issue - some features may not work properly
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
            >
              Retry
            </button>
          </div>
        </div>
        {children}
      </>
    );
  }

  // System is ready or locked (locked will redirect), show children
  return <>{children}</>;
}