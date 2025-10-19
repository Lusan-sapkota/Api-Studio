import React, { useState, useEffect } from 'react';
import { FileText, Filter, Download, Search, Calendar, User, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { Select } from '../Select';
import { apiService } from '../../services/api';

interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  user?: {
    id: number;
    email: string;
    name?: string;
  };
}

interface AuditLogTableProps {
  onViewDetails: (log: AuditLog) => void;
}

export function AuditLogTable({ onViewDetails }: AuditLogTableProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    user: '',
    dateFrom: '',
    dateTo: '',
    resourceType: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 25;

  const loadLogs = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getAuditLogs(page, pageSize);
      
      if (response.success === false || response.error) {
        setError(response.error || 'Failed to load audit logs');
        return;
      }
      
      const data = response.data!;
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, []);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadLogs(page);
    }
  };

  const handleExport = async () => {
    try {
      // This would typically call an export endpoint
      // For now, we'll create a CSV from current data
      const csvContent = [
        ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details'].join(','),
        ...logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.user?.email || 'System',
          log.action,
          log.resource_type || '',
          log.resource_id || '',
          log.ip_address || '',
          JSON.stringify(log.details).replace(/"/g, '""')
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting logs:', err);
    }
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (actionLower.includes('create') || actionLower.includes('add')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
    if (actionLower.includes('update') || actionLower.includes('modify') || actionLower.includes('change')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getResourceIcon = (resourceType?: string) => {
    switch (resourceType?.toLowerCase()) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'collection':
      case 'request':
      case 'environment':
        return <FileText className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Loading audit logs...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Audit Logs
            </h2>
            <span className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
              {totalLogs} entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="ghost" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="ghost" onClick={() => loadLogs(currentPage)} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded border">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div>
                <Select
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  options={[
                    { value: '', label: 'All Actions' },
                    { value: 'login', label: 'Login' },
                    { value: 'logout', label: 'Logout' },
                    { value: 'create', label: 'Create' },
                    { value: 'update', label: 'Update' },
                    { value: 'delete', label: 'Delete' }
                  ]}
                />
              </div>
              <div>
                <Select
                  value={filters.resourceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, resourceType: e.target.value }))}
                  options={[
                    { value: '', label: 'All Resources' },
                    { value: 'user', label: 'User' },
                    { value: 'collection', label: 'Collection' },
                    { value: 'request', label: 'Request' },
                    { value: 'environment', label: 'Environment' }
                  ]}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="From date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="To date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => setFilters({ search: '', action: '', user: '', dateFrom: '', dateTo: '', resourceType: '' })}
              >
                Clear
              </Button>
              <Button variant="primary" onClick={() => loadLogs(1)}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Timestamp</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">User</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Action</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Resource</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">IP Address</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr 
                  key={log.id} 
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                  onClick={() => onViewDetails(log)}
                >
                  <td className="py-3 px-4">
                    <div className="text-sm text-neutral-900 dark:text-neutral-100">
                      {formatTimestamp(log.timestamp)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {(log.user?.name || log.user?.email || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-neutral-900 dark:text-neutral-100">
                          {log.user?.name || log.user?.email || 'System'}
                        </div>
                        {log.user?.email && log.user?.name && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-500">
                            {log.user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {log.resource_type && (
                      <div className="flex items-center gap-2">
                        {getResourceIcon(log.resource_type)}
                        <div>
                          <div className="text-sm text-neutral-900 dark:text-neutral-100 capitalize">
                            {log.resource_type}
                          </div>
                          {log.resource_id && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-500">
                              ID: {log.resource_id}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                      {log.ip_address || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                      {Object.keys(log.details).length > 0 
                        ? Object.entries(log.details).slice(0, 2).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : '-'
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && !loading && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400">No audit logs found</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                Audit logs will appear here as users perform actions
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}