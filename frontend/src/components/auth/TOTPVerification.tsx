import { useState, useEffect } from 'react';
import { OTPInput } from './OTPInput';
import { ErrorMessage } from './ErrorMessage';
import { LoadingButton } from './LoadingSpinner';

interface TOTPVerificationProps {
  onVerify: (code: string) => Promise<void>;
  onUseBackupCode?: () => void;
  onResendCode?: () => Promise<void>;
  isVerifying?: boolean;
  isResending?: boolean;
  error?: string;
  title?: string;
  description?: string;
  showBackupOption?: boolean;
  showResendOption?: boolean;
  autoSubmit?: boolean;
  className?: string;
}

export function TOTPVerification({ 
  onVerify,
  onUseBackupCode,
  onResendCode,
  isVerifying = false,
  isResending = false,
  error,
  title = 'Enter Verification Code',
  description = 'Enter the 6-digit code from your authenticator app',
  showBackupOption = true,
  showResendOption = false,
  autoSubmit = true,
  className = ''
}: TOTPVerificationProps) {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend functionality
  useEffect(() => {
    if (showResendOption && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, showResendOption]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleCodeComplete = async (completeCode: string) => {
    if (autoSubmit && completeCode.length === 6) {
      await handleVerify(completeCode);
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code;
    if (codeToVerify.length === 6) {
      await onVerify(codeToVerify);
    }
  };

  const handleResend = async () => {
    if (onResendCode && canResend) {
      await onResendCode();
      setTimeLeft(30);
      setCanResend(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {title}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>

      {/* OTP Input */}
      <div className="mb-6">
        <OTPInput
          value={code}
          onChange={handleCodeChange}
          onComplete={handleCodeComplete}
          error={error}
          disabled={isVerifying}
          autoFocus
        />
      </div>

      {/* Error Message */}
      {error && (
        <ErrorMessage 
          message={error}
          variant="banner"
          className="mb-6"
        />
      )}

      {/* Verify Button (if not auto-submit) */}
      {!autoSubmit && (
        <div className="mb-6">
          <LoadingButton
            onClick={() => handleVerify()}
            loading={isVerifying}
            disabled={code.length !== 6}
            variant="primary"
            className="w-full"
          >
            Verify Code
          </LoadingButton>
        </div>
      )}

      {/* Alternative Options */}
      <div className="space-y-4">
        {/* Backup Code Option */}
        {showBackupOption && onUseBackupCode && (
          <div className="text-center">
            <button
              onClick={onUseBackupCode}
              disabled={isVerifying}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors disabled:opacity-50"
            >
              Use backup code instead
            </button>
          </div>
        )}

        {/* Resend Code Option */}
        {showResendOption && onResendCode && (
          <div className="text-center">
            {canResend ? (
              <LoadingButton
                onClick={handleResend}
                loading={isResending}
                variant="ghost"
                size="sm"
                className="text-neutral-600 dark:text-neutral-400"
              >
                Resend code
              </LoadingButton>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Resend code in {formatTime(timeLeft)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-surface-light dark:bg-surface-dark rounded-lg">
        <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          Having trouble?
        </h4>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
          <li>• Make sure your device's time is synchronized</li>
          <li>• Check that you're using the correct authenticator app</li>
          <li>• Try refreshing the code in your authenticator app</li>
          {showBackupOption && <li>• Use a backup code if you can't access your authenticator</li>}
        </ul>
      </div>
    </div>
  );
}