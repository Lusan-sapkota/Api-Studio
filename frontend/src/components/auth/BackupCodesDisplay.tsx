import { useState } from 'react';
import { ErrorMessage, SuccessMessage } from './ErrorMessage';
import { LoadingButton } from './LoadingSpinner';

interface BackupCodesDisplayProps {
  codes: string[];
  onDownload?: () => void;
  onPrint?: () => void;
  onContinue?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

export function BackupCodesDisplay({ 
  codes, 
  onDownload,
  onPrint,
  onContinue,
  onRegenerate,
  isRegenerating = false,
  className = ''
}: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleCopyAll = async () => {
    try {
      const codesText = codes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy codes:', err);
    }
  };

  const handleDownload = () => {
    try {
      const codesText = codes.join('\n');
      const blob = new Blob([
        `API Studio - Backup Codes\n\n` +
        `Generated: ${new Date().toLocaleString()}\n\n` +
        `Important: Save these backup codes in a secure location.\n` +
        `Each code can only be used once.\n\n` +
        `Backup Codes:\n${codesText}\n\n` +
        `If you lose access to your authenticator app, you can use these codes to sign in.`
      ], { type: 'text/plain' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-studio-backup-codes-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (onDownload) onDownload();
      setDownloadError(null);
    } catch (err) {
      console.error('Failed to download codes:', err);
      setDownloadError('Failed to download backup codes. Please try copying them instead.');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>API Studio - Backup Codes</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { margin-bottom: 20px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
              .code { font-family: monospace; font-size: 14px; padding: 8px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>API Studio - Backup Codes</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            <div class="warning">
              <strong>Important:</strong> Save these backup codes in a secure location. Each code can only be used once.
            </div>
            <div class="codes">
              ${codes.map(code => `<div class="code">${code}</div>`).join('')}
            </div>
            <p>If you lose access to your authenticator app, you can use these codes to sign in.</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      if (onPrint) onPrint();
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Save Your Backup Codes
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400">
          Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-warning-600 dark:text-warning-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-warning-800 dark:text-warning-200 mb-1">
              Important Security Information
            </h4>
            <ul className="text-sm text-warning-700 dark:text-warning-300 space-y-1">
              <li>• Each backup code can only be used once</li>
              <li>• Store these codes in a secure location (password manager, safe, etc.)</li>
              <li>• Don't share these codes with anyone</li>
              <li>• You can regenerate new codes if needed</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Backup Codes Grid */}
      <div className="bg-background-light dark:bg-background-dark border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {codes.map((code, index) => (
            <div
              key={index}
              className="font-mono text-sm bg-surface-light dark:bg-surface-dark p-3 rounded border border-neutral-200 dark:border-neutral-600 text-center"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleCopyAll}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-surface-light dark:bg-surface-dark border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Copy All'}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-surface-light dark:bg-surface-dark border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-surface-light dark:bg-surface-dark border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {onRegenerate && (
            <LoadingButton
              onClick={onRegenerate}
              loading={isRegenerating}
              variant="ghost"
              className="text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate Codes
            </LoadingButton>
          )}
        </div>

        {onContinue && (
          <div className="text-center">
            <LoadingButton
              onClick={onContinue}
              variant="primary"
              size="lg"
              className="px-8"
            >
              I've Saved My Backup Codes
            </LoadingButton>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {copied && (
        <SuccessMessage 
          message="All backup codes copied to clipboard" 
          variant="banner"
          className="mt-4"
        />
      )}

      {downloadError && (
        <ErrorMessage 
          message={downloadError}
          variant="banner"
          className="mt-4"
          onDismiss={() => setDownloadError(null)}
        />
      )}
    </div>
  );
}