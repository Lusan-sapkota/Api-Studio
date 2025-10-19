import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '../services/api';
import { configService } from '../services/config';

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
  };

  const setTokens = (tokens: AuthTokens | null) => {
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

      if (response.success === false || response.error) {
        setError(response.error || 'Login failed');
        return { success: false, error: response.error };
      }

      const data = response.data!;

      // Check if 2FA is required
      if (data.requires_2fa) {
        return { success: false, requires_2fa: true };
      }

      // Login successful
      if (data.tokens) {
        setTokens(data.tokens);
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
    }
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = apiService.getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await apiService.getCurrentUser();

      if (response.success === false || response.error) {
        // Token might be expired or invalid
        setTokens(null);
        setUser(null);
        return;
      }

      setUser(response.data!);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setTokens(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Skip authentication in local mode
      if (configService.isLocalMode()) {
        setLoading(false);
        return;
      }

      const token = apiService.getToken();
      if (token) {
        await refreshUser();
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for token expiry events
  useEffect(() => {
    const handleTokenExpired = () => {
      setTokens(null);
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
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