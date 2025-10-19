import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormInput } from '../components/auth/FormInput';
import { OTPInput } from '../components/auth/OTPInput';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { configService } from '../services/config';

type InvitationStep = 'email' | 'otp' | 'success';

export function InvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<InvitationStep>('email');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitationRole, setInvitationRole] = useState<string>('');

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }

    // If email is provided in URL, go directly to OTP step
    if (email) {
      setCurrentStep('otp');
    }
  }, [navigate, email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setCurrentStep('otp');
    setSuccess('Please enter the invitation code from your email');
  };

  const handleOtpComplete = async (value: string) => {
    await handleVerifyInvitation(value);
  };

  const handleVerifyInvitation = async (otpValue: string = otp) => {
    if (!otpValue || otpValue.length !== 6) {
      setError('Please enter a valid 6-digit invitation code');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.verifyInvitation(email.trim(), otpValue);

      if (response.success === false || response.error) {
        setError(response.error || 'Invitation verification failed');
        return;
      }

      const data = response.data!;
      
      // Store temp token and role for collaborator setup
      sessionStorage.setItem('temp_token', data.temp_token);
      sessionStorage.setItem('user_role', data.role);
      
      setInvitationRole(data.role);
      setCurrentStep('success');
      setSuccess('Invitation verified successfully!');

      // Navigate to collaborator setup after a short delay
      setTimeout(() => {
        navigate('/collaborator-setup', {
          state: { 
            email: email.trim(),
            role: data.role,
            verified: true
          }
        });
      }, 2000);

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
        return 'Full access to all features including user management';
      case 'editor':
        return 'Can create, modify, and delete API collections and environments';
      case 'viewer':
        return 'Read-only access to shared collections and environments';
      default:
        return 'Access level will be determined by your administrator';
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
              {currentStep === 'email' && 'Join API Studio'}
              {currentStep === 'otp' && 'Verify Your Invitation'}
              {currentStep === 'success' && 'Invitation Accepted'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {currentStep === 'email' && 'Enter your email to accept the team invitation'}
              {currentStep === 'otp' && 'Enter the 6-digit code from your invitation email'}
              {currentStep === 'success' && 'Welcome to the team! Let\'s set up your account'}
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

          {/* Email Step */}
          {currentStep === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email address"
                required
                disabled={isLoading}
                helperText="This should match the email where you received the invitation"
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
                Continue
              </LoadingButton>
            </form>
          )}

          {/* OTP Step */}
          {currentStep === 'otp' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Invitation code sent to:
                </p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 bg-surface-light dark:bg-surface-dark p-2 rounded border mb-6">
                  {email}
                </p>
              </div>

              <OTPInput
                value={otp}
                onChange={handleOtpChange}
                onComplete={handleOtpComplete}
                error={error || undefined}
                disabled={isLoading}
                autoFocus
              />

              <LoadingButton
                onClick={() => handleVerifyInvitation()}
                loading={isLoading}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={otp.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify Invitation'}
              </LoadingButton>

              <div className="text-center">
                <button
                  onClick={() => setCurrentStep('email')}
                  disabled={isLoading}
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Invitation Verified!
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  You've been invited to join the team. Let's complete your account setup.
                </p>
              </div>

              {/* Role Information */}
              {invitationRole && (
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-primary-600 dark:text-primary-400">
                      {getRoleIcon(invitationRole)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">
                        Your Role: {getRoleDisplayName(invitationRole)}
                      </h4>
                      <p className="text-sm text-primary-700 dark:text-primary-300">
                        {getRoleDescription(invitationRole)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <LoadingButton
                onClick={() => navigate('/collaborator-setup', {
                  state: { 
                    email: email.trim(),
                    role: invitationRole,
                    verified: true
                  }
                })}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Set Up My Account
              </LoadingButton>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Need Help?
                </h4>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>• Check your email for the invitation code</li>
                  <li>• Invitation codes expire in 24 hours</li>
                  <li>• Contact your administrator if you need a new invitation</li>
                  <li>• Make sure to use the same email address that received the invitation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}