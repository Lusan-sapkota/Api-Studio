import { useState } from 'react';
import { SuccessMessage } from './ErrorMessage';

interface QRCodeDisplayProps {
  qrCodeUrl: string;
  secret: string;
  appName?: string;
  userEmail?: string;
  onManualEntryToggle?: () => void;
  className?: string;
}

export function QRCodeDisplay({ 
  qrCodeUrl, 
  secret, 
  appName = 'API Studio',
  userEmail,
  onManualEntryToggle,
  className = ''
}: QRCodeDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy secret:', err);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Set up Two-Factor Authentication
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Scan the QR code with your authenticator app or enter the secret manually
        </p>
      </div>

      {/* QR Code Display */}
      <div className="bg-white p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-6">
        {!imageError ? (
          <div className="relative">
            {!imageLoaded && (
              <div className="flex items-center justify-center w-64 h-64 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            )}
            <img
              src={qrCodeUrl}
              alt="QR Code for 2FA setup"
              className={`w-64 h-64 mx-auto ${imageLoaded ? 'block' : 'hidden'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="w-64 h-64 mx-auto flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <div className="text-center">
              <svg className="w-12 h-12 text-neutral-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-neutral-500">Failed to load QR code</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Section */}
      <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Manual Entry
          </h4>
          <button
            onClick={handleCopySecret}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
          >
            {secretCopied ? 'Copied!' : 'Copy Secret'}
          </button>
        </div>
        
        <div className="space-y-2">
          {userEmail && (
            <div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Account
              </span>
              <p className="text-sm text-neutral-900 dark:text-neutral-100 font-mono break-all">
                {userEmail}
              </p>
            </div>
          )}
          
          <div>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Secret Key
            </span>
            <p className="text-sm text-neutral-900 dark:text-neutral-100 font-mono break-all bg-background-light dark:bg-background-dark p-2 rounded border">
              {secret}
            </p>
          </div>
          
          <div>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Issuer
            </span>
            <p className="text-sm text-neutral-900 dark:text-neutral-100">
              {appName}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-semibold">
            1
          </div>
          <p>Download an authenticator app like Google Authenticator, Authy, or 1Password</p>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-semibold">
            2
          </div>
          <p>Scan the QR code above or manually enter the secret key</p>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-semibold">
            3
          </div>
          <p>Enter the 6-digit code from your authenticator app to complete setup</p>
        </div>
      </div>

      {/* Alternative Setup Button */}
      {onManualEntryToggle && (
        <div className="mt-6 text-center">
          <button
            onClick={onManualEntryToggle}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            Can't scan the code? Enter it manually
          </button>
        </div>
      )}

      {secretCopied && (
        <SuccessMessage 
          message="Secret key copied to clipboard" 
          variant="banner"
          className="mt-4"
        />
      )}
    </div>
  );
}