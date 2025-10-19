import { useState } from 'react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { TOTPVerification } from './TOTPVerification';
import { BackupCodesDisplay } from './BackupCodesDisplay';
import { ErrorMessage, SuccessMessage } from './ErrorMessage';
import { LoadingButton } from './LoadingSpinner';

interface TwoFactorSetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

interface TwoFactorSetupWizardProps {
  setupData?: TwoFactorSetupData;
  userEmail?: string;
  onSetupComplete: () => void;
  onCancel?: () => void;
  onVerifyCode: (code: string) => Promise<void>;
  onRegenerateBackupCodes?: () => Promise<string[]>;
  isLoading?: boolean;
  isVerifying?: boolean;
  error?: string;
  className?: string;
}

type SetupStep = 'scan' | 'verify' | 'backup' | 'complete';

export function TwoFactorSetupWizard({
  setupData,
  userEmail,
  onSetupComplete,
  onCancel,
  onVerifyCode,
  onRegenerateBackupCodes,
  isLoading = false,
  isVerifying = false,
  error,
  className = ''
}: TwoFactorSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('scan');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>(setupData?.backupCodes || []);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleVerifyCode = async (code: string) => {
    try {
      setVerificationError(null);
      await onVerifyCode(code);
      setCurrentStep('backup');
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!onRegenerateBackupCodes) return;
    
    try {
      setIsRegenerating(true);
      const newCodes = await onRegenerateBackupCodes();
      setBackupCodes(newCodes);
    } catch (err) {
      console.error('Failed to regenerate backup codes:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleBackupCodesComplete = () => {
    setCurrentStep('complete');
  };

  const handleFinalComplete = () => {
    onSetupComplete();
  };

  const getStepNumber = (step: SetupStep): number => {
    const steps = { scan: 1, verify: 2, backup: 3, complete: 4 };
    return steps[step];
  };

  const isStepComplete = (step: SetupStep): boolean => {
    const currentStepNumber = getStepNumber(currentStep);
    const stepNumber = getStepNumber(step);
    return stepNumber < currentStepNumber;
  };

  const isStepActive = (step: SetupStep): boolean => {
    return step === currentStep;
  };

  if (isLoading || !setupData) {
    return (
      <div className={`w-full max-w-2xl mx-auto ${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Setting up two-factor authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {(['scan', 'verify', 'backup', 'complete'] as SetupStep[]).map((step, index) => {
            const stepNumber = index + 1;
            const isComplete = isStepComplete(step);
            const isActive = isStepActive(step);
            
            return (
              <div key={step} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                  ${isComplete 
                    ? 'bg-success-500 text-white' 
                    : isActive 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                  }
                `}>
                  {isComplete ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                {index < 3 && (
                  <div className={`
                    w-16 h-0.5 mx-2
                    ${isComplete ? 'bg-success-500' : 'bg-neutral-200 dark:bg-neutral-700'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-2">
          <span className="text-xs text-neutral-500">Scan QR</span>
          <span className="text-xs text-neutral-500">Verify</span>
          <span className="text-xs text-neutral-500">Backup</span>
          <span className="text-xs text-neutral-500">Complete</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <ErrorMessage 
          message={error}
          variant="banner"
          className="mb-6"
        />
      )}

      {/* Step Content */}
      <div className="bg-background-light dark:bg-background-dark border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
        {currentStep === 'scan' && (
          <div>
            <QRCodeDisplay
              qrCodeUrl={setupData.qrCodeUrl}
              secret={setupData.secret}
              userEmail={userEmail}
            />
            <div className="mt-6 flex justify-between">
              {onCancel && (
                <LoadingButton
                  onClick={onCancel}
                  variant="ghost"
                >
                  Cancel
                </LoadingButton>
              )}
              <LoadingButton
                onClick={() => setCurrentStep('verify')}
                variant="primary"
                className="ml-auto"
              >
                I've Added the Account
              </LoadingButton>
            </div>
          </div>
        )}

        {currentStep === 'verify' && (
          <div>
            <TOTPVerification
              onVerify={handleVerifyCode}
              isVerifying={isVerifying}
              error={verificationError || undefined}
              title="Verify Your Setup"
              description="Enter the 6-digit code from your authenticator app to confirm the setup"
              showBackupOption={false}
              autoSubmit={true}
            />
            <div className="mt-6 flex justify-between">
              <LoadingButton
                onClick={() => setCurrentStep('scan')}
                variant="ghost"
                disabled={isVerifying}
              >
                Back
              </LoadingButton>
            </div>
          </div>
        )}

        {currentStep === 'backup' && (
          <div>
            <BackupCodesDisplay
              codes={backupCodes}
              onContinue={handleBackupCodesComplete}
              onRegenerate={onRegenerateBackupCodes ? handleRegenerateBackupCodes : undefined}
              isRegenerating={isRegenerating}
            />
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Two-Factor Authentication Enabled
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Your account is now protected with two-factor authentication. You'll need your authenticator app or backup codes to sign in.
            </p>
            
            <SuccessMessage 
              message="Two-factor authentication has been successfully enabled for your account."
              variant="banner"
              className="mb-6"
            />

            <LoadingButton
              onClick={handleFinalComplete}
              variant="primary"
              size="lg"
            >
              Continue to Dashboard
            </LoadingButton>
          </div>
        )}
      </div>
    </div>
  );
}