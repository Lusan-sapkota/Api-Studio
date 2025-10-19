import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FormInput } from '../components/auth/FormInput';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { configService } from '../services/config';

interface LocationState {
  email?: string;
  role?: string;
  verified?: boolean;
}

export function CollaboratorSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setTokens } = useAuth();
  const state = location.state as LocationState;
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email] = useState(state?.email || '');
  const [role] = useState(state?.role || '');
  const [isComplete, setIsComplete] = useState(false);

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }

    // Check if user came from invitation verification
    if (!state?.verified) {
      navigate('/invitation');
      return;
    }

    // Check for temp token
    const tempToken = sessionStorage.getItem('temp_token');
    if (!tempToken) {
      navigate('/invitation');
      return;
    }

    // Set temp token for API calls
    apiService.setToken(tempToken);
  }, [navigate, state]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const response = await apiService.setCollaboratorPassword(password);

      if (response.success === false || response.error) {
        setError(response.error || 'Failed to set password');
        return;
      }

      const data = response.data!;
      
      // Set user and tokens
      setTokens(data.tokens);
      setUser(data.user);
      
      // Clear temp token and role
      sessionStorage.removeItem('temp_token');
      sessionStorage.removeItem('user_role');
      
      setIsComplete(true);
      setSuccess('Account setup completed successfully!');

      // Navigate to dashboard after a delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getRoleDescription = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'You have full access to all features including user management and system settings.';
      case 'editor':
        return 'You can create, modify, and delete API collections and environments.';
      case 'viewer':
        return 'You have read-only access to shared collections and environments.';
      default:
        return 'Your access level has been configured by your administrator.';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'editor':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'viewer':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  const getWelcomeMessage = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Welcome to the admin team! You\'ll have full control over the API Studio instance.';
      case 'editor':
        return 'Welcome to the team! You\'ll be able to create and manage API collections.';
      case 'viewer':
        return 'Welcome to the team! You\'ll have access to view and explore shared API collections.';
      default:
        return 'Welcome to the team! Your administrator has configured your access level.';
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              {role ? (
                <div className="text-primary-600 dark:text-primary-400">
                  {getRoleIcon(role)}
                </div>
              ) : (
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {isComplete ? 'Welcome to API Studio!' : 'Complete Your Setup'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">
              {isComplete 
                ? getWelcomeMessage(role)
                : 'Create a secure password to complete your account setup'
              }
            </p>
            {email && !isComplete && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Setting up account for: <span className="font-medium">{email}</span>
              </p>
            )}
          </div>

          {/* Role Information */}
          {role && !isComplete && (
            <div className="mb-8 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 text-primary-600 dark:text-primary-400">
                  {getRoleIcon(role)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">
                    Your Role: {getRoleDisplayName(role)}
                  </h4>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {getRoleDescription(role)}
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {!isComplete ? (
            /* Password Setup Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              {formData.password && (
                <PasswordStrengthIndicator 
                  password={formData.password}
                  showRequirements={true}
                />
              )}

              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                success={formData.confirmPassword && formData.password === formData.confirmPassword ? true : undefined}
                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <LoadingButton
                type="submit"
                loading={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
              >
                {isLoading ? 'Creating Account...' : 'Complete Setup'}
              </LoadingButton>
            </form>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Account Setup Complete!
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                Your account has been successfully created. You can now start using API Studio 
                with your {getRoleDisplayName(role).toLowerCase()} privileges.
              </p>
              
              <LoadingButton
                onClick={() => navigate('/', { replace: true })}
                variant="primary"
                size="lg"
                className="px-8"
              >
                Go to Dashboard
              </LoadingButton>
            </div>
          )}

          {/* Security Info */}
          {!isComplete && (
            <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Account Security
                  </h4>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• Two-factor authentication is optional for collaborators</li>
                    <li>• You can enable 2FA later in your account settings</li>
                    <li>• Use a strong, unique password for your account</li>
                    <li>• Your role determines what features you can access</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}