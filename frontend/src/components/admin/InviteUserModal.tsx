import React, { useState } from 'react';
import { Mail, User, Shield, AlertCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';
import { apiService } from '../../services/api';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.inviteUser({
        email: formData.email.trim(),
        role: formData.role
      });

      if (response.success === false || response.error) {
        setError(response.error || 'Failed to send invitation');
        return;
      }

      setSuccess(true);
      
      // Auto-close after showing success message
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 2000);

    } catch (err) {
      setError('Failed to send invitation');
      console.error('Error sending invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', role: 'viewer' });
    setError(null);
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin - Full system access' },
    { value: 'editor', label: 'Editor - Can create and modify content' },
    { value: 'viewer', label: 'Viewer - Read-only access' }
  ];

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to all features including user management and system settings';
      case 'editor':
        return 'Can create, modify, and delete API collections, environments, and requests';
      case 'viewer':
        return 'Read-only access to shared collections and environments';
      default:
        return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite New User" size="md">
      <form onSubmit={handleSubmit} className="p-6">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Invitation Sent!
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              An invitation has been sent to {formData.email}. They will receive an email with instructions to join your team.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Add a new team member
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Send an invitation to collaborate on your API projects
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="colleague@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Role
                </label>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  options={roleOptions}
                  disabled={loading}
                />
                <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-neutral-500" />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 capitalize">
                      {formData.role} Access
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {getRoleDescription(formData.role)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                    What happens next?
                  </p>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• An invitation email will be sent to the user</li>
                    <li>• They'll receive a secure link to join your team</li>
                    <li>• They can set up their account and start collaborating</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !formData.email.trim()}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}