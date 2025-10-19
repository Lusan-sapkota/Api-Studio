import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormInput } from '../components/auth/FormInput';
import { LoadingButton } from '../components/auth/LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../components/auth/ErrorMessage';
import { apiService } from '../services/api';
import { configService } from '../services/config';

export function BootstrapPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    token: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if we're in local mode and redirect if so
  useEffect(() => {
    if (configService.isLocalMode()) {
      navigate('/');
      return;
    }
  }, [navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.token.trim() || !formData.email.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.bootstrap({
        token: formData.token.trim(),
        email: formData.email.trim()
      });

      if (response.success === false || response.error) {
        setError(response.error || 'Bootstrap failed');
        return;
      }

      setSuccess('Bootstrap token verified! Check your email for the verification code.');
      
      // Navigate to OTP verification page after a short delay
      setTimeout(() => {
        navigate('/bootstrap/verify-otp', { 
          state: { email: formData.email.trim() }
        });
      }, 2000);

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
              Bootstrap API Studio
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Initialize your API Studio instance with the first admin account
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

          {/* Bootstrap Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput
              label="Bootstrap Token"
              name="token"
              type="password"
              value={formData.token}
              onChange={handleInputChange}
              placeholder="Enter your bootstrap token"
              required
              disabled={isLoading}
              helperText="This token was provided during system setup"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              }
            />

            <FormInput
              label="Admin Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="admin@example.com"
              required
              disabled={isLoading}
              helperText="This will be your admin account email address"
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
              disabled={!formData.token.trim() || !formData.email.trim()}
            >
              {isLoading ? 'Verifying...' : 'Initialize System'}
            </LoadingButton>
          </form>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-primary-800 dark:text-primary-200 mb-1">
                  What happens next?
                </h4>
                <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
                  <li>• We'll verify your bootstrap token and test SMTP configuration</li>
                  <li>• A verification code will be sent to your email</li>
                  <li>• You'll set up your admin password and two-factor authentication</li>
                  <li>• Your API Studio instance will be ready for use</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}