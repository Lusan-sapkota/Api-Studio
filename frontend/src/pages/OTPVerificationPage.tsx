import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OTPInput } from '../components/auth/OTPInput';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { configService } from '../services/config';

interface LocationState {
  email?: string;
  type?: 'bootstrap' | 'forgot-password' | 'invitation';
  redirectTo?: string;
}

export function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState(state?.email || '');
  const [verificationType, setVerificationType] = useState<'bootstrap' | 'forgot-password' | 'invitation'>(
    state?.type || 'bootstrap'
  );

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }

    // Redirect if no email provided
    if (!email) {
      navigate('/bootstrap');
      return;
    }
  }, [navigate, email]);

  const handleOtpChange = (value: string) => {
    setOtp(value);
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleOtpComplete = async (value: string) => {
    await handleVerifyOtp(value);
  };

  const handleVerifyOtp = async (otpValue: string = otp) => {
    if (!otpValue || otpValue.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      let nextRoute = '/';

      switch (verificationType) {
        case 'bootstrap':
          response = await apiService.verifyBootstrapOtp(email, otpValue);
          nextRoute = '/first-time-setup';
          break;
        case 'forgot-password':
          response = await apiService.verifyForgotPasswordOtp(email, otpValue);
          nextRoute = '/reset-password';
          break;
        case 'invitation':
          response = await apiService.verifyInvitation(email, otpValue);
          nextRoute = '/collaborator-setup';
          break;
        default:
          throw new Error('Invalid verification type');
      }

      if (response.success === false || response.error) {
        setError(response.error || 'Verification failed');
        return;
      }

      setSuccess('Code verified successfully!');

      // Navigate to next step after a short delay
      setTimeout(() => {
        if (verificationType === 'bootstrap' && response.data?.temp_token) {
          // Store temp token for first-time setup
          sessionStorage.setItem('temp_token', response.data.temp_token);
        } else if (verificationType === 'forgot-password' && response.data?.reset_token) {
          // Store reset token for password reset
          sessionStorage.setItem('reset_token', response.data.reset_token);
        } else if (verificationType === 'invitation' && response.data?.temp_token) {
          // Store temp token and role for collaborator setup
          sessionStorage.setItem('temp_token', response.data.temp_token);
          sessionStorage.setItem('user_role', response.data.role);
        }

        navigate(state?.redirectTo || nextRoute, {
          state: { email, verified: true }
        });
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;

      switch (verificationType) {
        case 'bootstrap':
          // For bootstrap, we need to call the bootstrap endpoint again
          // This would require the token, which we don't have here
          setError('Please go back to the bootstrap page to request a new code');
          return;
        case 'forgot-password':
          response = await apiService.forgotPassword({ email });
          break;
        case 'invitation':
          // Invitations can't be resent by the user
          setError('Please contact your administrator to resend the invitation');
          return;
        default:
          throw new Error('Invalid verification type');
      }

      if (response && (response.success === false || response.error)) {
        setError(response.error || 'Failed to resend code');
        return;
      }

      setSuccess('A new verification code has been sent to your email');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const getPageTitle = () => {
    switch (verificationType) {
      case 'bootstrap':
        return 'Verify Bootstrap Email';
      case 'forgot-password':
        return 'Verify Password Reset';
      case 'invitation':
        return 'Verify Invitation';
      default:
        return 'Verify Email';
    }
  };

  const getPageDescription = () => {
    switch (verificationType) {
      case 'bootstrap':
        return 'Enter the 6-digit code sent to your email to complete the bootstrap process';
      case 'forgot-password':
        return 'Enter the 6-digit code sent to your email to reset your password';
      case 'invitation':
        return 'Enter the 6-digit code from your invitation email to join the team';
      default:
        return 'Enter the 6-digit verification code sent to your email';
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {getPageTitle()}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">
              {getPageDescription()}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Code sent to: <span className="font-medium">{email}</span>
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

          {/* OTP Input */}
          <div className="mb-8">
            <OTPInput
              value={otp}
              onChange={handleOtpChange}
              onComplete={handleOtpComplete}
              error={error || undefined}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <LoadingButton
              onClick={() => handleVerifyOtp()}
              loading={isLoading}
              variant="primary"
              size="lg"
              className="w-full"
              disabled={otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </LoadingButton>

            {/* Resend Code */}
            {verificationType === 'forgot-password' && (
              <div className="text-center">
                <button
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Didn't receive the code? Resend it
                </button>
              </div>
            )}

            {/* Back Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  switch (verificationType) {
                    case 'bootstrap':
                      navigate('/bootstrap');
                      break;
                    case 'forgot-password':
                      navigate('/forgot-password');
                      break;
                    case 'invitation':
                      navigate('/login');
                      break;
                    default:
                      navigate('/');
                  }
                }}
                disabled={isLoading}
                className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Back to {verificationType === 'bootstrap' ? 'Bootstrap' : verificationType === 'forgot-password' ? 'Password Reset' : 'Login'}
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Verification Code Tips
                </h4>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• The code expires in 10 minutes</li>
                  <li>• Check your spam folder if you don't see the email</li>
                  <li>• The code is case-sensitive</li>
                  <li>• Each code can only be used once</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}