import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { TwoFactorSetupWizard } from '../components/auth/TwoFactorSetupWizard';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { configService } from '../services/config';

interface LocationState {
  email?: string;
  verified?: boolean;
  temp_token?: string;
}

type SetupStep = 'password' | '2fa-setup' | 'complete';

export function FirstTimeSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setTokens } = useAuth();
  const state = location.state as LocationState;

  const [currentStep, setCurrentStep] = useState<SetupStep>('password');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email] = useState(state?.email || '');
  const [setupData, setSetupData] = useState<{
    qrCodeUrl: string;
    secret: string;
    backupCodes: string[];
  } | null>(null);
  
  const hasInitialized = useRef(false);

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (hasInitialized.current) {
      console.log('FirstTimeSetupPage - useEffect already ran, skipping');
      return;
    }
    
    console.log('FirstTimeSetupPage - useEffect triggered (first time)');
    console.log('FirstTimeSetupPage - configService.isLocalMode():', configService.isLocalMode());
    
    if (configService.isLocalMode()) {
      console.log('FirstTimeSetupPage - Local mode detected, redirecting to /');
      navigate('/');
      return;
    }

    // Get temp token from session storage or navigation state
    let tempToken = sessionStorage.getItem('temp_token');
    console.log('FirstTimeSetupPage - temp token from storage:', tempToken);
    
    // Fallback to navigation state if not in sessionStorage
    if (!tempToken && state?.temp_token) {
      tempToken = state.temp_token;
      console.log('FirstTimeSetupPage - temp token from navigation state:', tempToken);
      // Store it in sessionStorage for future use
      sessionStorage.setItem('temp_token', tempToken);
    }
    
    if (!tempToken) {
      console.log('FirstTimeSetupPage - No temp token found, redirecting to bootstrap in 3 seconds...');
      console.log('FirstTimeSetupPage - sessionStorage temp_token:', sessionStorage.getItem('temp_token'));
      console.log('FirstTimeSetupPage - navigation state:', state);
      setTimeout(() => {
        console.log('FirstTimeSetupPage - Executing redirect to bootstrap');
        navigate('/bootstrap');
      }, 3000);
      return;
    }

    console.log('FirstTimeSetupPage - Setting temp token for API calls');
    // Set the temp token for API calls
    apiService.setToken(tempToken);
    console.log('FirstTimeSetupPage - Token set successfully, component should stay mounted');
    
    // Mark as initialized
    hasInitialized.current = true;

    // Cleanup function - DON'T remove temp token to prevent issues
    return () => {
      console.log('FirstTimeSetupPage - Cleanup function called, but NOT removing temp token');
      alert('FirstTimeSetupPage is unmounting! This should not happen.');
      // sessionStorage.removeItem('temp_token'); // Commented out to prevent issues
    };
    apiService.setToken(tempToken);
  }, [navigate]); // Only depend on navigate, not state

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { password, confirmPassword } = formData;

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.setFirstTimePassword({
        password
      });

      if (response.success === false || response.error) {
        setError(response.error || 'Failed to set password');
        return;
      }

      const data = response.data!;

      // If 2FA setup data is returned, proceed to 2FA setup
      if (data.qr_code && data.backup_codes) {
        setSetupData({
          qrCodeUrl: data.qr_code,
          secret: '', // The secret is embedded in the QR code
          backupCodes: data.backup_codes
        });
        setCurrentStep('2fa-setup');
        setSuccess('Password set successfully! Now let\'s set up two-factor authentication.');
      } else if (data.tokens) {
        // If tokens are returned, setup is complete
        setTokens(data.tokens);
        setCurrentStep('complete');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2faVerification = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.verify2faSetup(code);

      if (response.success === false || response.error) {
        throw new Error(response.error || '2FA verification failed');
      }

      const data = response.data!;

      // Set user and tokens
      setTokens(data.tokens);
      setUser(data.user);

      // Clear temp token
      sessionStorage.removeItem('temp_token');

      setCurrentStep('complete');

    } catch (err) {
      throw err; // Re-throw to be handled by TwoFactorSetupWizard
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    // Clear any remaining session data
    sessionStorage.removeItem('temp_token');

    // Navigate to dashboard
    navigate('/', { replace: true });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'password':
        return 'Set Your Password';
      case '2fa-setup':
        return 'Set Up Two-Factor Authentication';
      case 'complete':
        return 'Setup Complete';
      default:
        return 'Account Setup';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'password':
        return 'Create a strong password for your admin account';
      case '2fa-setup':
        return 'Secure your account with two-factor authentication';
      case 'complete':
        return 'Your API Studio instance is ready to use';
      default:
        return 'Complete your account setup';
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {getStepTitle()}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">
              {getStepDescription()}
            </p>
            {/* DEBUG INDICATOR */}
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
              ✅ FirstTimeSetupPage is mounted and stable
            </div>
            
            {email && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Setting up account for: <span className="font-medium">{email}</span>
              </p>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${currentStep === 'password' ? 'bg-primary-500 text-white' : 'bg-success-500 text-white'
                }`}>
                {currentStep === 'password' ? '1' : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className={`w-16 h-0.5 ${['2fa-setup', 'complete'].includes(currentStep) ? 'bg-success-500' : 'bg-neutral-200 dark:bg-neutral-700'
                }`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${currentStep === '2fa-setup' ? 'bg-primary-500 text-white' :
                currentStep === 'complete' ? 'bg-success-500 text-white' :
                  'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                }`}>
                {currentStep === 'complete' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : '2'}
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-neutral-500">Password</span>
              <span className="text-xs text-neutral-500">Two-Factor Auth</span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <ErrorMessage
              message={error}
              variant="banner"
              className="mb-6"
              onDismiss={() => setError(null)}
            />
          )}

          {success && (
            <SuccessMessage
              message={success}
              variant="banner"
              className="mb-6"
            />
          )}

          {/* Step Content */}
          {currentStep === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <PasswordInput
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />

              {formData.password && (
                <PasswordStrengthIndicator
                  password={formData.password}
                  showRequirements={true}
                />
              )}

              <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                success={formData.confirmPassword && formData.password === formData.confirmPassword ? true : undefined}
                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
              />

              <LoadingButton
                type="submit"
                loading={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
              >
                {isLoading ? 'Setting Password...' : 'Set Password & Continue'}
              </LoadingButton>
            </form>
          )}

          {currentStep === '2fa-setup' && setupData && (
            <TwoFactorSetupWizard
              setupData={setupData}
              userEmail={email}
              onSetupComplete={handleSetupComplete}
              onVerifyCode={handle2faVerification}
              isVerifying={isLoading}
              error={error || undefined}
            />
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Welcome to API Studio!
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                Your admin account has been successfully created and secured with two-factor authentication.
                You can now start using API Studio to manage your APIs and collaborate with your team.
              </p>

              <LoadingButton
                onClick={handleSetupComplete}
                variant="primary"
                size="lg"
                className="px-8"
              >
                Go to Dashboard
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};