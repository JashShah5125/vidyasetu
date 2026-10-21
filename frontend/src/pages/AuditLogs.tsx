import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditLogService } from '../services/auditLogService';
import type { AuditLogItem, AuditLogMeta, AuditLogPagination } from '../services/auditLogService';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  ClipboardList,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  AlertCircle,
  Eye,
  Building,
  Shield,
  User
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const isSaasAdmin = Boolean(user?.isSaasAdmin);
  const isBranchAdmin = user?.userType === 'branch_admin' || (user as any)?.role === 'branch_admin' || user?.userType === 'branch-admin';

  // Data & Pagination
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<AuditLogPagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [meta, setMeta] = useState<AuditLogMeta>({
    actions: [],
    entityTypes: [],
    severities: ['info', 'warning', 'critical'],
    tenants: [],
    branches: []
  });

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('All');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Log Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Load Metadata
  const loadMeta = useCallback(async () => {
    try {
      const data = await auditLogService.getMeta();
      if (data) setMeta(data);
    } catch (err) {
      console.error('Failed to load audit metadata:', err);
    }
  }, []);

  // Load Logs
  const loadLogs = useCallback(async (pageToLoad: number = 1) => {
    setLoading(true);
    try {
      const res = await auditLogService.getLogs({
        page: pageToLoad,
        limit: 20,
        tenantId: selectedTenant !== 'All' ? selectedTenant : undefined,
        branchId: selectedBranch !== 'All' ? selectedBranch : undefined,
        action: selectedAction !== 'All' ? selectedAction : undefined,
        entityType: selectedEntityType !== 'All' ? selectedEntityType : undefined,
        severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (res) {
        setLogs(res.items || []);
        setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, selectedBranch, selectedAction, selectedEntityType, selectedSeverity, search, startDate, endDate]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  // Export CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      'Log ID',
      'Timestamp',
      'Actor Name',
      'Actor Email',
      'Role',
      'Tenant / Institute',
      'Branch',
      'Action',
      'Entity Type',
      'Entity ID',
      'Severity',
      'HTTP Method',
      'Endpoint',
      'IP Address'
    ];

    const rows = logs.map(log => [
      log.id,
      log.createdAt,
      log.userName || 'System',
      log.userEmail || '',
      log.userRole || '',
      log.tenantName || 'Platform',
      log.branchName || 'All Branches',
      log.action,
      log.entityType,
      log.entityId ?? '',
      log.severity,
      log.requestMethod || '',
      log.endpoint || '',
      log.ipAddress || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedTenant('All');
    setSelectedBranch('All');
    setSelectedAction('All');
    setSelectedEntityType('All');
    setSelectedSeverity('All');
    setStartDate('');
    setEndDate('');
  };

  const formatActionName = (action: string) => {
    switch (action) {
      case 'IMPERSONATION_STARTED':
      case 'ADMIN_LOGIN_AS_TENANT':
        return 'LOGIN AS TENANT';
      case 'LOGIN_SUCCESS':
        return 'LOGIN';
      case 'LOGIN_FAILED':
        return 'FAILED LOGIN';
      case 'PASSWORD_CHANGE':
        return 'PASSWORD CHANGE';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('FAILED')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('CREATE') || act.includes('SUCCESS') || act.includes('INSERT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('MODIFY') || act.includes('PATCH')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('AUTH') || act.includes('IMPERSONATION')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle size={12} className="text-red-600" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-600" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info size={12} className="text-blue-500" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit Trail & Security Logs</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive activity records for authentication, data modifications, and system events.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={() => loadLogs(pagination.page)}
            disabled={loading}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 text-xs"
          >
            <Download size={14} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Actor / Action / Endpoint
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. John, CREATE, /students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Tenant Selector (SaaS Admin Only) */}
          {isSaasAdmin && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Institute / Tenant
              </label>
              <select
                value={selectedTenant}
                onChange={e => setSelectedTenant(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
              >
                <option value="All">All Institutes</option>
                {meta.tenants.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Branch Selector (Inst Admin Only) */}
          {!isSaasAdmin && !isBranchAdmin && meta.branches.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
              >
                <option value="All">All Branches</option>
                {meta.branches.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Action
            </label>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
            >
              <option value="All">All Actions</option>
              {meta.actions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Entity Type
            </label>
            <select
              value={selectedEntityType}
              onChange={e => setSelectedEntityType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
            >
              <option value="All">All Entities</option>
              {meta.entityTypes.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
            >
              <option value="All">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
            />
          </div>

          {/* Date Range: To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={resetFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="px-5 py-3.5 whitespace-nowrap">Timestamp</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Actor</th>
                {isSaasAdmin && <th className="px-5 py-3.5 whitespace-nowrap">Institute</th>}
                <th className="px-5 py-3.5 whitespace-nowrap">Action</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Entity</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Severity</th>
                <th className="px-5 py-3.5 whitespace-nowrap">IP Address</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={isSaasAdmin ? 8 : 7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin inline-block mb-2 text-blue-600" />
                    <p className="font-medium">Loading audit trail records...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={isSaasAdmin ? 8 : 7} className="px-5 py-12 text-center text-slate-400">
                    <Shield size={24} className="inline-block mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No audit records found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    {/* Actor */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        {log.userName || 'System / Guest'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                        {log.userEmail || log.userRole || 'Automated'}
                      </div>
                    </td>

                    {/* Institute (SaaS Admin only) */}
                    {isSaasAdmin && (
                      <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building size={13} className="text-slate-400" />
                          {log.tenantName || 'Global Platform'}
                        </div>
                        {log.branchName && (
                          <div className="text-[10px] text-slate-400 ml-4.5">{log.branchName}</div>
                        )}
                      </td>
                    )}

                    {/* Action Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{log.entityType}</span>
                      {log.entityId !== null && (
                        <span className="ml-1 text-[11px] text-slate-400 font-mono">#{log.entityId}</span>
                      )}
                    </td>

                    {/* Severity */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </td>

                    {/* IP */}
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.ipAddress || '-'}
                    </td>

                    {/* View Action */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-semibold text-slate-700">{logs.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> total entries
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => loadLogs(page)}
          />
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log Entry #${selectedLog.id}`}
        >
          <div className="space-y-5">
            {/* Human-Readable Action Summary Banner */}
            {(() => {
              const actor = selectedLog.userName || 'System / Automated Process';
              const rawModule = (selectedLog.entityType || 'record').replace(/_/g, ' ');
              const moduleName = rawModule.charAt(0).toUpperCase() + rawModule.slice(1);
              const entityIdStr = selectedLog.entityId !== null && selectedLog.entityId !== undefined ? ` #${selectedLog.entityId}` : '';
              const action = selectedLog.action;

              let bannerBg = 'bg-blue-50/70 border-blue-200/80 text-blue-900';
              let actionTitle = '';
              let actionStory = '';

              if (action === 'CREATE') {
                bannerBg = 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950';
                actionTitle = `Created New ${moduleName} Record`;
                actionStory = `${actor} created a new record in the ${moduleName} module with the initial attributes below.`;
              } else if (action === 'UPDATE') {
                bannerBg = 'bg-amber-50/70 border-amber-200/80 text-amber-950';
                actionTitle = `Updated ${moduleName}${entityIdStr}`;
                actionStory = `${actor} modified existing information in the ${moduleName} module. Check the field-by-field diff below for exact changes.`;
              } else if (action === 'DELETE') {
                bannerBg = 'bg-rose-50/70 border-rose-200/80 text-rose-950';
                actionTitle = `Deleted ${moduleName}${entityIdStr}`;
                actionStory = `${actor} deleted this record from the ${moduleName} module. A snapshot of the removed data is preserved below.`;
              } else if (action === 'STATUS_CHANGE') {
                bannerBg = 'bg-purple-50/70 border-purple-200/80 text-purple-950';
                actionTitle = `Changed Status in ${moduleName}${entityIdStr}`;
                actionStory = `${actor} toggled or updated the operational status of this ${moduleName} record.`;
              } else if (action === 'LOGIN_AS_TENANT' || action === 'ADMIN_LOGIN_AS_TENANT' || action === 'IMPERSONATION_START') {
                bannerBg = 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950';
                actionTitle = `Super Admin Logged In as Tenant`;
                actionStory = `${actor} initiated an impersonation session to access and manage the tenant's account.`;
              } else {
                bannerBg = 'bg-slate-50 border-slate-200 text-slate-900';
                actionTitle = `${formatActionName(action)} on ${moduleName}${entityIdStr}`;
                actionStory = `${actor} executed ${action.toLowerCase()} in the ${moduleName} module.`;
              }

              return (
                <div className={`p-4 rounded-xl border ${bannerBg} space-y-1`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                      {actionTitle}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadgeColor(selectedLog.action)}`}>
                      {formatActionName(selectedLog.action)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90 font-medium">
                    {actionStory}
                  </p>
                </div>
              );
            })()}

            {/* Structured Event & Context Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/75 p-3.5 rounded-xl border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Actor / Performed By</span>
                <span className="font-semibold text-slate-900 text-xs block">{selectedLog.userName || 'System / Guest'}</span>
                <span className="text-slate-500 font-mono text-[10px] block">{selectedLog.userEmail || '-'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Module & Target</span>
                <span className="font-semibold text-slate-800 text-xs block font-mono capitalize">
                  {selectedLog.entityType} {selectedLog.entityId !== null && selectedLog.entityId !== undefined ? `[ID: ${selectedLog.entityId}]` : ''}
                </span>
                <span className="text-slate-500 text-[10px] block">
                  Role: <span className="capitalize font-medium">{selectedLog.userRole || 'Standard'}</span> {selectedLog.tenantName ? `(${selectedLog.tenantName})` : ''}
                </span>
              </div>

              <div className="space-y-0.5 pt-1.5 border-t border-slate-200/60">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Date & Time</span>
                <span className="font-mono text-slate-800 text-[11px] block">
                  {new Date(selectedLog.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'medium'
                  })}
                </span>
              </div>

              <div className="space-y-0.5 pt-1.5 border-t border-slate-200/60">
                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Network / Request</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800 text-[11px]">IP: {selectedLog.ipAddress || '::1'}</span>
                  <span className="text-slate-300">•</span>
                  <div className="inline-block">{getSeverityBadge(selectedLog.severity)}</div>
                </div>
              </div>
            </div>

            {/* Detailed Changes & Payload Section */}
            {(() => {
              const hasOld = selectedLog.oldValues && typeof selectedLog.oldValues === 'object' && Object.keys(selectedLog.oldValues).length > 0;
              const hasNew = selectedLog.newValues && typeof selectedLog.newValues === 'object' && Object.keys(selectedLog.newValues).length > 0;

              // 1. UPDATE or STATUS CHANGE: Both Old and New are present -> Show Side-by-Side Diff Table
              if (hasOld && hasNew) {
                const changedKeys = Array.from(new Set([...Object.keys(selectedLog.oldValues!), ...Object.keys(selectedLog.newValues!)]));
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                        Field-by-Field Changes ({changedKeys.length} modified)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Comparing previous state vs new state</span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="px-4 py-2.5 w-1/3">Field / Attribute</th>
                            <th className="px-4 py-2.5 w-1/3 text-red-600 bg-red-50/50">Previous Value</th>
                            <th className="px-4 py-2.5 w-1/3 text-emerald-700 bg-emerald-50/50">Updated Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {changedKeys.map(key => {
                            const oldVal = (selectedLog.oldValues as any)[key];
                            const newVal = (selectedLog.newValues as any)[key];
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();

                            return (
                              <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-2.5 font-semibold text-slate-700 capitalize font-mono text-[11px]">
                                  {label}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-red-700 bg-red-50/30 break-all">
                                  {oldVal !== undefined && oldVal !== null ? (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : <span className="text-slate-400 italic">null</span>}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50/30 break-all">
                                  {newVal !== undefined && newVal !== null ? (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : <span className="text-slate-400 italic">null</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              // 2. DELETE: Only Old values exist -> Show Snapshot of Deleted Record
              if (hasOld && !hasNew) {
                return (
                  <div>
                    <span className="font-bold text-red-700 block uppercase tracking-wider text-[11px] mb-2">
                      Snapshot of Deleted Record (Data Before Removal)
                    </span>
                    <div className="bg-slate-50 border border-red-200/80 rounded-xl p-3.5 divide-y divide-slate-200/60 text-xs">
                      {Object.entries(selectedLog.oldValues!).map(([key, val]) => (
                        <div key={key} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <span className="font-semibold text-slate-600 capitalize text-[11px] font-mono">
                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()}
                          </span>
                          <span className="font-mono text-slate-900 font-medium text-[11px] break-all">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // 3. CREATE or Event Payload: Only New values exist -> Show Key-Value Summary
              if (hasNew) {
                const labelMap: Record<string, string> = {
                  impersonatedUser: 'Accessed Account Email',
                  impersonatedName: 'Accessed Account Name',
                  targetAccountEmail: 'Target Account Email',
                  targetAccountName: 'Target Account Name',
                  saasAdminUserId: 'Super Admin User ID',
                  adminUserId: 'Super Admin User ID',
                  email: 'Email',
                  role: 'Security Role',
                  reason: 'Failure Reason'
                };

                return (
                  <div>
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px] mb-2">
                      Record Attributes & Captured Parameters
                    </span>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 divide-y divide-slate-200/60 text-xs">
                      {Object.entries(selectedLog.newValues!).map(([key, val]) => {
                        const readableLabel = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
                        return (
                          <div key={key} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                            <span className="font-semibold text-slate-600 capitalize text-[11px]">{readableLabel}</span>
                            <span className="font-mono text-slate-900 font-medium text-[11px] break-all">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            {/* Collapsible Technical & Diagnostics Details */}
            {(selectedLog.endpoint || selectedLog.userAgent) && (
              <details className="group border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50">
                <summary className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 transition-colors flex items-center justify-between select-none">
                  <span>Technical & Diagnostics Information</span>
                  <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-3.5 pt-2 border-t border-slate-200/60 space-y-2.5 text-xs">
                  {selectedLog.endpoint && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">API Endpoint & Method</span>
                      <span className="font-mono text-slate-800 text-[11px] block mt-0.5">
                        {selectedLog.requestMethod} {selectedLog.endpoint}
                      </span>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client Browser / User Agent</span>
                      <p className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 rounded p-2 mt-0.5 break-all leading-relaxed">
                        {selectedLog.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={() => setSelectedLog(null)}>Close View</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default AuditLogs;
