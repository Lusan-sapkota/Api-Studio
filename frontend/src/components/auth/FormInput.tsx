import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export function FormInput({ 
  label, 
  error, 
  success, 
  helperText, 
  required, 
  icon,
  className = '', 
  ...props 
}: FormInputProps) {
  const hasError = !!error;
  const hasSuccess = success && !hasError;

  const inputClasses = `
    w-full px-3 py-2 bg-background-light dark:bg-background-dark 
    border rounded text-neutral-900 dark:text-neutral-100 
    placeholder-neutral-400 dark:placeholder-neutral-500 
    focus:outline-none focus:ring-2 transition-all
    ${icon ? 'pl-10' : ''}
    ${hasError 
      ? 'border-error-500 focus:ring-error-500 focus:border-error-500' 
      : hasSuccess 
        ? 'border-success-500 focus:ring-success-500 focus:border-success-500'
        : 'border-neutral-300 dark:border-neutral-700 focus:ring-primary-500 focus:border-transparent'
    }
    ${className}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className={`${hasError ? 'text-error-500' : hasSuccess ? 'text-success-500' : 'text-neutral-400'}`}>
              {icon}
            </div>
          </div>
        )}
        <input
          className={inputClasses}
          {...props}
        />
        {hasSuccess && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="h-5 w-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error-500 flex items-center">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{helperText}</p>
      )}
    </div>
  );
}