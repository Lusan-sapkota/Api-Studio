import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Smartphone, Eye, EyeOff, Save, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/auth/LoadingSpinner';
import { ErrorMessage } from '../components/auth/ErrorMessage';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { QRCodeDisplay } from '../components/auth/QRCodeDisplay';
import { BackupCodesDisplay } from '../components/auth/BackupCodesDisplay';
import { OTPInput } from '../components/auth/OTPInput';
import { useAuth } from '../contexts/AuthContext';
import { useSecurityNotificationContext } from '../contexts/SecurityNotificationContext';
import { apiService } from '../services/api';

interface SecuritySettings {
  two_factor_enabled: boolean;
  backup_codes_count: number;
  last_password_change?: string;
  active_sessions_count: number;
}

interface UserSession {
  id: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
}

export function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { handlePasswordChanged, handle2FAEnabled, handleBackupCodesGenerated } = useSecurityNotificationContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // 2FA state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [twoFASetup, setTwoFASetup] = useState<{
    qr_code?: string;
    backup_codes?: string[];
    step: 'idle' | 'setup' | 'verify';
  }>({ step: 'idle' });
  const [totpCode, setTotpCode] = useState('');
  const [disable2FAData, setDisable2FAData] = useState({
    password: '',
    totp_code: '',
  });

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'security') {
      loadSecuritySettings();
    } else if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSecuritySettings();
      if (response.success && response.data) {
        setSecuritySettings(response.data);
      } else {
        setError(response.error || 'Failed to load security settings');
      }
    } catch (err) {
      setError('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserSessions();
      if (response.success && response.data) {
        setSessions(response.data.sessions);
      } else {
        setError(response.error || 'Failed to load sessions');
      }
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!profileData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.updateUserProfile({
        name: profileData.name.trim(),
        email: profileData.email,
      });

      if (response.success) {
        setSuccess('Profile updated successfully');
        await refreshUser();
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 12) {
      setError('New password must be at least 12 characters long');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      if (response.success) {
        setSuccess('Password changed successfully. Please log in again.');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        handlePasswordChanged();
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    clearMessages();
    try {
      setLoading(true);
      const response = await apiService.enable2FA();
      if (response.success && response.data) {
        setTwoFASetup({
          qr_code: response.data.qr_code,
          backup_codes: response.data.backup_codes,
          step: 'setup',
        });
      } else {
        setError(response.error || 'Failed to enable 2FA');
      }
    } catch (err) {
      setError('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    clearMessages();
    try {
      setLoading(true);
      const response = await apiService.verify2FASetup(totpCode);
      if (response.success) {
        setSuccess('2FA enabled successfully');
        setTwoFASetup({ step: 'idle' });
        setTotpCode('');
        await loadSecuritySettings();
        await refreshUser();
        handle2FAEnabled();
      } else {
        setError(response.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disable2FAData.password) {
      setError('Password is required to disable 2FA');
      return;
    }

    clearMessages();
    try {
      setLoading(true);
      const response = await apiService.disable2FA({
        password: disable2FAData.password,
        totp_code: disable2FAData.totp_code,
      });

      if (response.success) {
        setSuccess('2FA disabled successfully');
        setDisable2FAData({ password: '', totp_code: '' });
        await loadSecuritySettings();
        await refreshUser();
      } else {
        setError(response.error || 'Failed to disable 2FA');
      }
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    clearMessages();
    try {
      setLoading(true);
      const response = await apiService.regenerateBackupCodes();
      if (response.success && response.data) {
        setSuccess('New backup codes generated');
        setTwoFASetup({
          backup_codes: response.data.backup_codes,
          step: 'setup',
        });
        await loadSecuritySettings();
        handleBackupCodesGenerated();
      } else {
        setError(response.error || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      setError('Failed to regenerate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', title: 'Profile', icon: User },
    { id: 'security', title: 'Security', icon: Shield },
    { id: 'sessions', title: 'Sessions', icon: Key },
  ];

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-primary-500" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Profile Settings
            </h1>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="w-64 border-r border-neutral-200 dark:border-neutral-800">
            <div className="p-4">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${activeTab === tab.id
                        ? 'bg-primary-500/10 text-primary-500 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-surface-light dark:hover:bg-surface-dark'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {error && <ErrorMessage message={error} className="mb-4" />}
            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-200">{success}</span>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Profile Information
                    </h3>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Full Name
                        </label>
                        <Input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter your email address"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Role
                        </label>
                        <Input
                          type="text"
                          value={user?.role || ''}
                          disabled
                          className="bg-neutral-50 dark:bg-neutral-800"
                        />
                      </div>

                      <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Change */}
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Change Password
                    </h3>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordData.current_password}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                            placeholder="Enter current password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
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
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                            placeholder="Enter new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordData.new_password && (
                          <PasswordStrengthIndicator password={passwordData.new_password} />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordData.confirm_password}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : <Key className="w-4 h-4 mr-2" />}
                        Change Password
                      </Button>
                    </form>
                  </div>
                </Card>

                {/* 2FA Management */}
                <Card>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        Two-Factor Authentication
                      </h3>
                      {securitySettings && (
                        <span className={`px-2 py-1 text-xs rounded ${securitySettings.two_factor_enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
                          }`}>
                          {securitySettings.two_factor_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>

                    {loading && !securitySettings ? (
                      <LoadingSpinner />
                    ) : securitySettings ? (
                      <div className="space-y-4">
                        {!securitySettings.two_factor_enabled ? (
                          // Enable 2FA
                          <div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                              Add an extra layer of security to your account by enabling two-factor authentication.
                            </p>

                            {twoFASetup.step === 'idle' && (
                              <Button onClick={handleEnable2FA} variant="primary" disabled={loading}>
                                <Smartphone className="w-4 h-4 mr-2" />
                                Enable 2FA
                              </Button>
                            )}

                            {twoFASetup.step === 'setup' && twoFASetup.qr_code && (
                              <div className="space-y-4">
                                <QRCodeDisplay qrCodeUrl={twoFASetup.qr_code} secret="" />

                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    Enter verification code from your authenticator app
                                  </label>
                                  <OTPInput
                                    value={totpCode}
                                    onChange={setTotpCode}
                                    onComplete={handleVerify2FA}
                                  />
                                </div>

                                <Button onClick={handleVerify2FA} variant="primary" disabled={loading || totpCode.length !== 6}>
                                  {loading ? <LoadingSpinner size="sm" /> : 'Verify & Enable 2FA'}
                                </Button>

                                {twoFASetup.backup_codes && (
                                  <BackupCodesDisplay codes={twoFASetup.backup_codes} />
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Manage 2FA
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Two-factor authentication is enabled</span>
                            </div>

                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                              <p>Backup codes available: {securitySettings.backup_codes_count}</p>
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handleRegenerateBackupCodes} variant="secondary" disabled={loading}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Regenerate Backup Codes
                              </Button>
                            </div>

                            {/* Disable 2FA */}
                            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                              <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                                Disable Two-Factor Authentication
                              </h4>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                This will remove the extra security layer from your account.
                              </p>

                              <div className="space-y-3">
                                <Input
                                  type="password"
                                  placeholder="Enter your password"
                                  value={disable2FAData.password}
                                  onChange={(e) => setDisable2FAData(prev => ({ ...prev, password: e.target.value }))}
                                />
                                <Input
                                  placeholder="Enter TOTP code"
                                  value={disable2FAData.totp_code}
                                  onChange={(e) => setDisable2FAData(prev => ({ ...prev, totp_code: e.target.value }))}
                                />
                                <Button onClick={handleDisable2FA} variant="danger" disabled={loading || !disable2FAData.password}>
                                  {loading ? <LoadingSpinner size="sm" /> : 'Disable 2FA'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {twoFASetup.step === 'setup' && twoFASetup.backup_codes && !twoFASetup.qr_code && (
                          <BackupCodesDisplay codes={twoFASetup.backup_codes} />
                        )}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Active Sessions
                    </h3>

                    {loading ? (
                      <LoadingSpinner />
                    ) : sessions.length > 0 ? (
                      <div className="space-y-3">
                        {sessions.map((session) => (
                          <div key={session.id} className="p-4 bg-surface-light dark:bg-surface-dark rounded border">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                    {session.is_current ? 'Current Session' : 'Session'}
                                  </span>
                                  {session.is_current && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                  <p>IP: {session.ip_address || 'Unknown'}</p>
                                  <p>Device: {session.user_agent || 'Unknown'}</p>
                                  <p>Last active: {new Date(session.last_active).toLocaleString()}</p>
                                </div>
                              </div>

                              {!session.is_current && (
                                <Button variant="secondary" size="sm">
                                  Revoke
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-neutral-600 dark:text-neutral-400">No active sessions found.</p>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}