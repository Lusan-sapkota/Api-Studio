import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '../services/api';
import { configService } from '../services/config';
import sessionService from '../services/sessionService';

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  two_factor_enabled: boolean;
  requires_password_change: boolean;
  last_login_at?: string;
}

interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; requires_2fa?: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const setUser = (user: User | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
    }));
    
    // Persist user data to localStorage
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  };

  const setTokens = (tokens: AuthTokens | null) => {
    console.log('AUTH: Setting tokens:', { hasTokens: !!tokens });
    if (tokens) {
      apiService.setToken(tokens.access_token);
    } else {
      apiService.setToken(null);
    }
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const clearError = () => {
    setError(null);
  };

  const setLoading = (isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  };

  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.login({ email, password, totp_code: totpCode });

      // Check if 2FA is required first (even when success is false)
      if (response.requires_2fa) {
        return { success: false, requires_2fa: true };
      }

      if (response.success === false || response.error) {
        setError(response.error || 'Login failed');
        return { success: false, error: response.error };
      }

      const data = response.data!;

      // Login successful
      if (data.access_token && data.token_type) {
        setTokens({
          access_token: data.access_token,
          token_type: data.token_type
        });
      }
      setUser(data.user);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setTokens(null);
      setUser(null);
      setLoading(false);
      // Destroy session monitoring
      sessionService.destroy();
    }
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = apiService.getToken();
      console.log('RefreshUser - Token check:', { hasToken: !!token, tokenLength: token?.length });
      
      if (!token) {
        console.log('RefreshUser - No token found, clearing user');
        setUser(null);
        return;
      }

      // Check if token is expired before making API call
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        console.log('RefreshUser - Token payload:', { exp: payload.exp, now, expired: payload.exp < now });
        
        if (payload.exp && payload.exp < now) {
          console.log('RefreshUser - Token is expired, clearing');
          setTokens(null);
          setUser(null);
          return;
        }
      } catch (e) {
        console.error('RefreshUser - Failed to decode token:', e);
      }

      console.log('RefreshUser - Making API call to getCurrentUser');
      const response = await apiService.getCurrentUser();
      console.log('RefreshUser - API response:', { success: response.success, error: response.error });

      if (response.success === false || response.error) {
        // Token might be expired or invalid
        console.error('RefreshUser - Token validation failed:', response.error);
        console.error('RefreshUser - Full response:', response);
        
        // Only clear tokens if it's actually an auth error
        if (response.error?.includes('token') || response.error?.includes('auth') || response.error?.includes('expired')) {
          setTokens(null);
          setUser(null);
        }
        return;
      }

      // Update user data (this will also save to localStorage)
      console.log('RefreshUser - Success, updating user data');
      setUser(response.data!);
    } catch (error) {
      console.error('RefreshUser - Exception occurred:', error);
      // Don't clear tokens on network errors
      if (error instanceof Error && error.message.includes('fetch')) {
        console.log('RefreshUser - Network error, keeping tokens');
        return;
      }
      setTokens(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // In local mode, set authenticated state without user
      if (configService.isLocalMode()) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          user: null
        }));
        return;
      }

      const token = apiService.getToken();
      const savedUser = localStorage.getItem('user');
      const directToken = localStorage.getItem('auth_token');
      
      console.log('=== AUTH INITIALIZATION START ===');
      console.log('Auth initialization:', { 
        hasToken: !!token, 
        tokenLength: token?.length || 0,
        hasSavedUser: !!savedUser,
        directTokenLength: directToken?.length || 0,
        tokenPreview: token ? token.substring(0, 50) + '...' : null,
        directTokenPreview: directToken ? directToken.substring(0, 50) + '...' : null
      });
      
      // If API service doesn't have token but localStorage does, set it
      if (!token && directToken) {
        console.log('API service missing token, setting from localStorage');
        apiService.setToken(directToken);
      }
      
      const finalToken = token || directToken;
      
      if (finalToken && savedUser) {
        // Load user from localStorage first for immediate UI update
        try {
          const savedData = JSON.parse(savedUser);
          // Handle both old and new user data formats
          const user = savedData.user || savedData;
          console.log('Loading saved user:', user.email, user.role);
          setUser(user);
          setLoading(false); // Set loading to false immediately for better UX
          
          // Then refresh user data from server in background
          console.log('Token found, refreshing user in background. Token length:', finalToken.length);
          refreshUser().catch(error => {
            console.error('Background refresh failed:', error);
            // Don't clear user on background refresh failure
          });
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('user');
          // Fallback to server refresh
          await refreshUser();
        }
      } else if (finalToken) {
        // Token exists but no saved user, refresh from server
        console.log('Token found but no saved user, refreshing from server. Token length:', finalToken.length);
        await refreshUser();
      } else {
        console.log('No token found, user not authenticated');
        setLoading(false);
      }
      
      console.log('=== AUTH INITIALIZATION END ===');
    };

    initializeAuth();
  }, []);

  // Handle browser navigation events for SPA routing
  useEffect(() => {
    const handlePopState = () => {
      // This ensures the auth context is aware of navigation changes
      // and can handle authentication state properly
      if (!configService.isLocalMode() && !state.isAuthenticated && !state.isLoading) {
        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/bootstrap', '/setup', '/verify-otp', '/forgot-password', '/reset-password', '/invitation', '/collaborator-setup'];
        
        if (!publicPaths.some(path => currentPath.startsWith(path))) {
          // User is on a protected route without authentication
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.isAuthenticated, state.isLoading]);

  // Listen for token expiry and system events
  useEffect(() => {
    const handleTokenExpired = () => {
      console.log('AUTH: Token expired event received');
      setTokens(null);
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    const handleSystemLocked = () => {
      setTokens(null);
      setUser(null);
      // Redirect to bootstrap page
      window.location.href = '/bootstrap';
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);
    window.addEventListener('system:locked', handleSystemLocked);

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
      window.removeEventListener('system:locked', handleSystemLocked);
    };
  }, []);

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
    clearError,
    setUser,
    setTokens,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;