import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 12 characters', test: (pwd) => pwd.length >= 12 },
  { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Contains number', test: (pwd) => /\d/.test(pwd) },
  { label: 'Contains special character', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const getStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: 'Enter password', color: 'neutral' };

    const passedRequirements = requirements.filter(req => req.test(password)).length;
    
    if (passedRequirements <= 2) {
      return { score: 1, label: 'Weak', color: 'error' };
    } else if (passedRequirements <= 3) {
      return { score: 2, label: 'Fair', color: 'warning' };
    } else if (passedRequirements <= 4) {
      return { score: 3, label: 'Good', color: 'primary' };
    } else {
      return { score: 4, label: 'Strong', color: 'success' };
    }
  };

  const strength = getStrength(password);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'error':
        return 'bg-error-500 text-error-500';
      case 'warning':
        return 'bg-warning-500 text-warning-500';
      case 'primary':
        return 'bg-primary-500 text-primary-500';
      case 'success':
        return 'bg-success-500 text-success-500';
      default:
        return 'bg-neutral-300 text-neutral-500';
    }
  };

  const colorClasses = getColorClasses(strength.color);

  return (
    <div className="w-full">
      {/* Strength Bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Password Strength
          </span>
          <span className={`text-sm font-medium ${colorClasses.split(' ')[1]}`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${colorClasses.split(' ')[0]}`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Password Requirements:
          </p>
          {requirements.map((requirement, index) => {
            const isPassed = requirement.test(password);
            return (
              <div key={index} className="flex items-center space-x-2">
                <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                  isPassed 
                    ? 'bg-success-500 text-white' 
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
                }`}>
                  {isPassed ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                  )}
                </div>
                <span className={`text-sm ${
                  isPassed 
                    ? 'text-success-600 dark:text-success-400' 
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}>
                  {requirement.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}