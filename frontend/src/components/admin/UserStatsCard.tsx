import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Shield, Activity } from 'lucide-react';
import { Card } from '../Card';
import { apiService } from '../../services/api';

interface UserStats {
  total: number;
  active: number;
  locked: number;
  admins: number;
  editors: number;
  viewers: number;
  twoFactorEnabled: number;
  recentLogins: number;
}

export function UserStatsCard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getCollaborators();
      
      if (response.success === false || response.error) {
        setError(response.error || 'Failed to load user statistics');
        return;
      }
      
      const users = response.data || [];
      
      // Calculate statistics
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const calculatedStats: UserStats = {
        total: users.length,
        active: users.filter((u: any) => u.status === 'active').length,
        locked: users.filter((u: any) => u.locked_until && new Date(u.locked_until) > now).length,
        admins: users.filter((u: any) => u.role === 'admin').length,
        editors: users.filter((u: any) => u.role === 'editor').length,
        viewers: users.filter((u: any) => u.role === 'viewer').length,
        twoFactorEnabled: users.filter((u: any) => u.two_factor_enabled).length,
        recentLogins: users.filter((u: any) => u.last_login_at && new Date(u.last_login_at) > oneDayAgo).length
      };
      
      setStats(calculatedStats);
    } catch (err) {
      setError('Failed to load user statistics');
      console.error('Error loading user stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              User Statistics
            </h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary-500" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              User Statistics
            </h3>
          </div>
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-primary-500" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            User Statistics
          </h3>
        </div>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Total Users
              </div>
            </div>
            
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.active}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Active
              </div>
            </div>
            
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.locked}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Locked
              </div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.recentLogins}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                Recent Logins
              </div>
            </div>
          </div>

          {/* Role Distribution */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-neutral-500" />
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                Role Distribution
              </h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Admins</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {stats.admins}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    ({getPercentage(stats.admins, stats.total)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Editors</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {stats.editors}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    ({getPercentage(stats.editors, stats.total)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded"></div>
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Viewers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {stats.viewers}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    ({getPercentage(stats.viewers, stats.total)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Stats */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-neutral-500" />
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                Security Overview
              </h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    2FA Enabled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {stats.twoFactorEnabled} / {stats.total}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    ({getPercentage(stats.twoFactorEnabled, stats.total)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Active Sessions (24h)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {stats.recentLogins}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500">
                    ({getPercentage(stats.recentLogins, stats.total)}%)
                  </span>
                </div>
              </div>
              
              {stats.locked > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Locked Accounts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      {stats.locked}
                    </span>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Requires attention
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-xs text-neutral-500 dark:text-neutral-500 text-center">
              Statistics updated in real-time • Last refresh: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}