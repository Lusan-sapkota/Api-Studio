import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FormInput } from '../components/auth/FormInput';

import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';
import { configService } from '../services/config';

interface LocationState {
  from?: { pathname: string };
  message?: string;
}

type LoginStep = 'credentials' | 'success';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: authLoading, error: authError, clearError } = useAuth();
  const state = location.state as LocationState;

  const [currentStep, setCurrentStep] = useState<LoginStep>('credentials');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    totpCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }

    // Redirect if already authenticated
    if (isAuthenticated && !authLoading) {
      const from = state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [navigate, isAuthenticated, authLoading, state]);

  // Display message from location state
  useEffect(() => {
    if (state?.message) {
      setSuccess(state.message);
    }
  }, [state]);

  // Handle lockout timer
  useEffect(() => {
    if (lockoutTime && lockoutTime > Date.now()) {
      const timer = setInterval(() => {
        if (Date.now() >= lockoutTime) {
          setIsLocked(false);
          setLockoutTime(null);
          setLoginAttempts(0);
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (authError) clearError();
    if (success) setSuccess(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      const remainingTime = Math.ceil((lockoutTime! - Date.now()) / 1000 / 60);
      setError(`Account is locked. Please try again in ${remainingTime} minute(s).`);
      return;
    }

    const { email, password, totpCode } = formData;

    if (!email.trim() || !password.trim() || !totpCode.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate TOTP code (required)
    if (totpCode.length !== 6 || !/^\d{6}$/.test(totpCode)) {
      setError('TOTP code must be exactly 6 digits');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await login(email.trim(), password, totpCode.trim());

      if (result.success) {
        setCurrentStep('success');
        setSuccess('Login successful! Redirecting...');

        // Redirect after a short delay
        setTimeout(() => {
          const from = state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }, 1500);
      } else {
        // Handle specific error types
        const errorMessage = result.error || 'Login failed';

        if (errorMessage.includes('SYSTEM_LOCKED')) {
          navigate('/bootstrap');
          return;
        }

        if (errorMessage.includes('Invalid credentials') || errorMessage.includes('User not found')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (errorMessage.includes('Account locked')) {
          setIsLocked(true);
          setLockoutTime(Date.now() + 15 * 60 * 1000);
          setError('Your account has been temporarily locked due to multiple failed login attempts.');
        } else {
          setError(errorMessage);
        }

        setLoginAttempts(prev => prev + 1);

        // Lock account after 5 failed attempts (client-side protection)
        if (loginAttempts >= 4) {
          setIsLocked(true);
          setLockoutTime(Date.now() + 15 * 60 * 1000); // 15 minutes
          setError('Too many failed login attempts. Account locked for 15 minutes.');
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

      if (errorMessage.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError(errorMessage);
      }

      setLoginAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };



  const getRemainingLockoutTime = (): string => {
    if (!lockoutTime) return '';
    const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Sign In
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Welcome back to API Studio
            </p>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Two-factor authentication is required for all accounts
              </p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {(error || authError) && (
            <ErrorMessage
              message={error || authError || ''}
              variant="banner"
              className="mb-6"
              onDismiss={() => {
                setError(null);
                clearError();
              }}
            />
          )}

          {success && (
            <SuccessMessage
              message={success}
              variant="banner"
              className="mb-6"
            />
          )}

          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-6 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                    Account Temporarily Locked
                  </h4>
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    Too many failed attempts. Try again in {getRemainingLockoutTime()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          {currentStep === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                disabled={isLoading || isLocked}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />

              <FormInput
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={isLoading || isLocked}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              <FormInput
                label="Authenticator Code"
                name="totpCode"
                type="text"
                value={formData.totpCode}
                onChange={handleInputChange}
                placeholder="Enter 6-digit code"
                required
                disabled={isLoading || isLocked}
                maxLength={6}
                pattern="[0-9]{6}"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              />

              <LoadingButton
                type="submit"
                loading={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!formData.email.trim() || !formData.password.trim() || !formData.totpCode.trim() || isLocked}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </LoadingButton>
            </form>
          )}



          {/* Success State */}
          {currentStep === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Welcome Back!
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                You have been successfully signed in.
              </p>
            </div>
          )}

          {/* Footer Links */}
          {currentStep === 'credentials' && (
            <div className="mt-8 space-y-4">
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Login Attempts Warning */}
              {loginAttempts > 0 && loginAttempts < 5 && (
                <div className="text-center">
                  <p className="text-sm text-warning-600 dark:text-warning-400">
                    {5 - loginAttempts} attempt(s) remaining before account lockout
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}