interface ErrorMessageProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'card';
  className?: string;
}

export function ErrorMessage({ 
  message, 
  title = 'Error',
  onRetry,
  onDismiss,
  variant = 'inline',
  className = ''
}: ErrorMessageProps) {
  if (!message) return null;

  const baseClasses = 'flex items-start space-x-3';
  
  const variantClasses = {
    inline: 'text-sm',
    banner: 'p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md',
    card: 'p-6 bg-background-light dark:bg-background-dark border border-error-200 dark:border-error-800 rounded-lg shadow-sm',
  };

  const iconClasses = variant === 'inline' ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="flex-shrink-0">
        <svg 
          className={`${iconClasses} text-error-500`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
      
      <div className="flex-1 min-w-0">
        {variant !== 'inline' && (
          <h3 className="text-sm font-medium text-error-800 dark:text-error-200 mb-1">
            {title}
          </h3>
        )}
        <div className={`text-error-700 dark:text-error-300 ${variant === 'inline' ? 'text-sm' : 'text-sm'}`}>
          {message.split('\n').map((line, index) => (
            <p key={index} className={index > 0 ? 'mt-2' : ''}>
              {line}
            </p>
          ))}
        </div>
        
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex space-x-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-medium text-error-600 dark:text-error-400 hover:text-error-500 dark:hover:text-error-300 transition-colors"
              >
                Try again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm font-medium text-error-600 dark:text-error-400 hover:text-error-500 dark:hover:text-error-300 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
      
      {onDismiss && variant !== 'inline' && (
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="text-error-400 hover:text-error-500 dark:text-error-500 dark:hover:text-error-400 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

interface SuccessMessageProps {
  message?: string;
  title?: string;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'card';
  className?: string;
}

export function SuccessMessage({ 
  message, 
  title = 'Success',
  onDismiss,
  variant = 'inline',
  className = ''
}: SuccessMessageProps) {
  if (!message) return null;

  const baseClasses = 'flex items-start space-x-3';
  
  const variantClasses = {
    inline: 'text-sm',
    banner: 'p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md',
    card: 'p-6 bg-background-light dark:bg-background-dark border border-success-200 dark:border-success-800 rounded-lg shadow-sm',
  };

  const iconClasses = variant === 'inline' ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="flex-shrink-0">
        <svg 
          className={`${iconClasses} text-success-500`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
      
      <div className="flex-1 min-w-0">
        {variant !== 'inline' && (
          <h3 className="text-sm font-medium text-success-800 dark:text-success-200 mb-1">
            {title}
          </h3>
        )}
        <p className={`text-success-700 dark:text-success-300 ${variant === 'inline' ? 'text-sm' : 'text-sm'}`}>
          {message}
        </p>
      </div>
      
      {onDismiss && variant !== 'inline' && (
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="text-success-400 hover:text-success-500 dark:text-success-500 dark:hover:text-success-400 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}