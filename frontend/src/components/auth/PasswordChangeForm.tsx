import React, { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

interface PasswordChangeFormProps {
  onSubmit: (data: { current_password: string; new_password: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function PasswordChangeForm({ onSubmit, loading = false, error, className = '' }: PasswordChangeFormProps) {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (!formData.current_password) {
      setLocalError('Current password is required');
      return;
    }

    if (!formData.new_password) {
      setLocalError('New password is required');
      return;
    }

    if (formData.new_password.length < 12) {
      setLocalError('New password must be at least 12 characters long');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setLocalError('New passwords do not match');
      return;
    }

    if (formData.current_password === formData.new_password) {
      setLocalError('New password must be different from current password');
      return;
    }

    try {
      await onSubmit({
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      
      // Clear form on success
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      // Error handling is done by parent component
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const displayError = error || localError;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {displayError && <ErrorMessage message={displayError} />}
      
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Current Password
        </label>
        <div className="relative">
          <Input
            type={showPasswords.current ? 'text' : 'password'}
            value={formData.current_password}
            onChange={(e) => setFormData(prev => ({ ...prev, current_password: e.target.value }))}
            placeholder="Enter your current password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('current')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            disabled={loading}
          >
            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          New Password
        </label>
        <div className="relative">
          <Input
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.new_password}
            onChange={(e) => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
            placeholder="Enter your new password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('new')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            disabled={loading}
          >
            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {formData.new_password && (
          <div className="mt-2">
            <PasswordStrengthIndicator password={formData.new_password} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <Input
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirm_password}
            onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
            placeholder="Confirm your new password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility('confirm')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            disabled={loading}
          >
            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {formData.confirm_password && formData.new_password && formData.confirm_password !== formData.new_password && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            Passwords do not match
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={loading || !formData.current_password || !formData.new_password || !formData.confirm_password}
        className="w-full"
      >
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <Key className="w-4 h-4 mr-2" />
            Change Password
          </>
        )}
      </Button>
    </form>
  );
}