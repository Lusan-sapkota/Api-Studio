import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={`bg-surface-light dark:bg-surface-dark rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
