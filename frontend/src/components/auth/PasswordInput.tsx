import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  required?: boolean;
  showToggle?: boolean;
}

export function PasswordInput({ 
  label, 
  error, 
  success, 
  helperText, 
  required,
  showToggle = true,
  className = '', 
  ...props 
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error;
  const hasSuccess = success && !hasError;

  const inputClasses = `
    w-full px-3 py-2 pr-10 bg-background-light dark:bg-background-dark 
    border rounded text-neutral-900 dark:text-neutral-100 
    placeholder-neutral-400 dark:placeholder-neutral-500 
    focus:outline-none focus:ring-2 transition-all
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
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          className={inputClasses}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {(error || helperText) && (
        <div className="mt-1">
          {error && (
            <p className="text-sm text-error-600 dark:text-error-400">
              {error}
            </p>
          )}
          {helperText && !error && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}