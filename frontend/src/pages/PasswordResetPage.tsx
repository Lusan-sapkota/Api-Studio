import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FormInput } from '../components/auth/FormInput';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { configService } from '../services/config';

interface LocationState {
  email?: string;
  verified?: boolean;
}

export function PasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email] = useState(state?.email || '');
  const [isComplete, setIsComplete] = useState(false);

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }

    // Check if user came from verification
    if (!state?.verified) {
      navigate('/forgot-password');
      return;
    }

    // Check for reset token
    const resetToken = sessionStorage.getItem('reset_token');
    if (!resetToken) {
      navigate('/forgot-password');
      return;
    }
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

    const resetToken = sessionStorage.getItem('reset_token');
    if (!resetToken) {
      setError('Reset session expired. Please start the password reset process again.');
      navigate('/forgot-password');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.resetPassword({
        token: resetToken,
        password
      });

      if (response.success === false || response.error) {
        setError(response.error || 'Failed to reset password');
        return;
      }

      // Clear reset token
      sessionStorage.removeItem('reset_token');
      
      setIsComplete(true);
      setSuccess('Your password has been successfully reset!');

      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login', {
          state: { 
            message: 'Password reset successful. Please sign in with your new password.' 
          }
        });
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {isComplete ? 'Password Reset Complete' : 'Set New Password'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">
              {isComplete 
                ? 'Your password has been successfully updated'
                : 'Create a strong new password for your account'
              }
            </p>
            {email && !isComplete && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Resetting password for: <span className="font-medium">{email}</span>
              </p>
            )}
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

          {!isComplete ? (
            /* Password Reset Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormInput
                label="New Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your new password"
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
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
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
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
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
                Password Successfully Reset
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                Your password has been updated. You can now sign in with your new password.
                You'll be redirected to the login page shortly.
              </p>
              
              <LoadingButton
                onClick={() => navigate('/login', {
                  state: { 
                    message: 'Password reset successful. Please sign in with your new password.' 
                  }
                })}
                variant="primary"
                size="lg"
                className="px-8"
              >
                Go to Sign In
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
                    Password Security Tips
                  </h4>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• Use a unique password you haven't used before</li>
                    <li>• Consider using a password manager</li>
                    <li>• Don't share your password with anyone</li>
                    <li>• All existing sessions will be logged out for security</li>
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