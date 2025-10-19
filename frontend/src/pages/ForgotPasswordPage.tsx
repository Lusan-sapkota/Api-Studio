import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FormInput } from '../components/auth/FormInput';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { configService } from '../services/config';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.forgotPassword({ email: email.trim() });

      if (response.success === false && response.error) {
        // Handle specific errors
        if (response.error.includes('SYSTEM_LOCKED')) {
          navigate('/bootstrap');
          return;
        }
        
        if (response.error.includes('SMTP not configured')) {
          setError('Email service is not configured. Please contact your administrator.');
          return;
        }
        
        // For other errors, still show generic success message to prevent enumeration
        setError('Unable to send reset code. Please try again later or contact support.');
        return;
      }

      // Always show success message to prevent email enumeration
      // The backend will return success even if the email doesn't exist
      setIsSubmitted(true);
      setSuccess('If an account with that email exists, we\'ve sent you a password reset code.');
      
      // Navigate to OTP verification page after a short delay
      setTimeout(() => {
        navigate('/verify-otp', { 
          state: { 
            email: email.trim(),
            type: 'forgot-password'
          }
        });
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      
      if (errorMessage.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError('Unable to send reset code. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendRequest = () => {
    setIsSubmitted(false);
    setSuccess(null);
    setError(null);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-light dark:bg-surface-dark border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Reset Your Password
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {isSubmitted 
                ? 'Check your email for the reset code'
                : 'Enter your email address and we\'ll send you a reset code'
              }
            </p>
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

          {!isSubmitted ? (
            /* Email Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                disabled={isLoading}
                helperText="We'll send a 6-digit reset code to this email"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />

              <LoadingButton
                type="submit"
                loading={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!email.trim()}
              >
                {isLoading ? 'Sending Reset Code...' : 'Send Reset Code'}
              </LoadingButton>
            </form>
          ) : (
            /* Success State */
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Check Your Email
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  We've sent a 6-digit reset code to:
                </p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 bg-surface-light dark:bg-surface-dark p-2 rounded border">
                  {email}
                </p>
              </div>

              <div className="space-y-3">
                <LoadingButton
                  onClick={() => navigate('/verify-otp', { 
                    state: { 
                      email: email.trim(),
                      type: 'forgot-password'
                    }
                  })}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Enter Reset Code
                </LoadingButton>

                <button
                  onClick={handleResendRequest}
                  className="w-full text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                >
                  Use a different email address
                </button>
              </div>
            </div>
          )}

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>

            {/* Security Info */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Security Information
                  </h4>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• Reset codes expire in 15 minutes</li>
                    <li>• Each code can only be used once</li>
                    <li>• Check your spam folder if you don't see the email</li>
                    <li>• Contact support if you need additional help</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}