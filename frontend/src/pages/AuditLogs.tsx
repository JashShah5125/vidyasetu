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
  User,
  Activity,
  Users,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Trash2,
  PlusCircle,
  CheckCircle2,
  CornerDownRight,
  Layers
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { currentUser: user } = useAuth();
  const isSaasAdmin = Boolean(user?.isSaasAdmin);
  const isBranchAdmin = (user as any)?.userType === 'branch_admin' || (user as any)?.role === 'branch_admin' || (user as any)?.userType === 'branch-admin' || user?.role === 'branch-admin';

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

  // Selected Log Modal & Expanded Row
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const IGNORED_KEYS = new Set([
    'id', 'tenant_id', 'created_at', 'updated_at', 'deleted_at',
    'created_by', 'updated_by', 'correlation_id', 'password',
    'password_hash', 'token', 'refresh_token', 'ip_address', 'user_agent',
    'entity_id', 'branch_id'
  ]);

  const formatStatus = (val: any): string => {
    if (val === 1 || val === '1' || val === true || val === 'active') return 'Active';
    if (val === 0 || val === '0' || val === false || val === 'inactive') return 'Inactive';
    if (val === 'pending' || val === 'pending_payment') return 'Pending Payment';
    if (val === 'pending_batch') return 'Needs Batch Allocation';
    if (val === 'converted') return 'Enrolled / Converted';
    if (val === null || val === undefined) return 'None';
    return String(val);
  };

  const formatIpDisplay = (ip?: string | null): string => {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
      return '127.0.0.1 (Local Session / This Machine)';
    }
    let cleanIp = String(ip).trim();
    if (cleanIp.startsWith('::ffff:')) {
      cleanIp = cleanIp.replace('::ffff:', '');
    }
    if (cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.')) {
      return `${cleanIp} (Office Wi-Fi / Local Network)`;
    }
    return `${cleanIp} (Public Network)`;
  };

  const formatValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return 'None';
    const k = key.toLowerCase();
    if (k.includes('status') || k.includes('is_active')) {
      return formatStatus(val);
    }
    if (k.includes('amount') || k.includes('fee') || k.includes('price') || k.includes('salary')) {
      const num = Number(val);
      if (!isNaN(num)) return `₹${num.toLocaleString('en-IN')}`;
    }
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const getChangedFields = (log: AuditLogItem): { key: string; label: string; oldVal: string; newVal: string }[] => {
    if (log.action === 'CREATE' || log.action === 'DELETE') {
      return [];
    }

    const oldVals = log.oldValues && typeof log.oldValues === 'object' ? log.oldValues : {};
    const newVals = log.newValues && typeof log.newValues === 'object' ? log.newValues : {};

    const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));
    const diffs: { key: string; label: string; oldVal: string; newVal: string }[] = [];

    for (const k of allKeys) {
      if (IGNORED_KEYS.has(k.toLowerCase())) continue;

      const o = oldVals[k];
      const n = newVals[k];
      const isBoolNumEq = (o === 1 && n === true) || (o === 0 && n === false);
      if (!isBoolNumEq && o != n && String(o ?? '') !== String(n ?? '')) {
        diffs.push({
          key: k,
          label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase(),
          oldVal: formatValue(k, o),
          newVal: formatValue(k, n)
        });
      }
    }

    return diffs;
  };

  interface Narrative {
    title: string;
    badge?: string;
    badgeColor?: string;
    subtitle?: string;
  }

  const getNarrativeBadgeColor = (badge?: string, action?: string): string => {
    if (!badge) return 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';
    const b = badge.toLowerCase();
    const act = (action || '').toUpperCase();

    // 1. Auth Sessions
    if (b.includes('portal login') || b.includes('login')) {
      return 'bg-purple-100 text-purple-700 border-purple-200 font-semibold';
    }
    if (b.includes('portal logout') || b.includes('logout')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 font-semibold';
    }

    // 2. Payments & Money
    if (b.includes('₹') || b.includes('payment') || b.includes('fee') || b.includes('receipt') || b.includes('paid')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    }

    // 3. Statuses
    if (b.includes('active') || b.includes('enrolled') || b.includes('success') || b.includes('converted')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold';
    }
    if (b.includes('inactive') || b.includes('pending') || b.includes('warning')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 font-semibold';
    }
    if (b.includes('delete') || b.includes('removed') || b.includes('critical') || b.includes('failed') || b.includes('archived')) {
      return 'bg-rose-100 text-rose-700 border-rose-200 font-semibold';
    }

    // 4. Batches & Courses
    if (b.includes('batch')) {
      return 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold';
    }
    if (b.includes('course') || b.includes('timetable') || b.includes('lecture') || b.includes('schedule')) {
      return 'bg-sky-100 text-sky-700 border-sky-200 font-semibold';
    }

    // 5. Updates & Generic Actions
    if (b.includes('modified') || b.includes('changes') || b.includes('updated') || b.includes('edit')) {
      return 'bg-blue-100 text-blue-700 border-blue-200 font-semibold';
    }

    // Action Fallbacks
    if (act.includes('LOGIN')) {
      return 'bg-purple-100 text-purple-700 border-purple-200 font-semibold';
    }
    if (act.includes('LOGOUT')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 font-semibold';
    }
    if (act === 'CREATE' || act === 'INSERT') {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold';
    }
    if (act === 'DELETE') {
      return 'bg-rose-100 text-rose-700 border-rose-200 font-semibold';
    }
    if (act === 'UPDATE') {
      return 'bg-blue-100 text-blue-700 border-blue-200 font-semibold';
    }

    return 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';
  };

  const getProfessionalAuditNarrative = (log: AuditLogItem): Narrative => {
    const entity = (log.entityType || '').toLowerCase();
    const action = (log.action || '').toUpperCase();
    const newVals = log.newValues || {};
    const oldVals = log.oldValues || {};

    // 0. AUTH / LOGIN / LOGOUT
    if (action.includes('LOGIN') || (log.endpoint && log.endpoint.includes('/login'))) {
      return {
        title: `Staff logged in to administrative portal`,
        badge: 'Portal Login',
        badgeColor: 'bg-purple-100 text-purple-700 border-purple-200 font-semibold',
        subtitle: `${log.userEmail || log.userName || 'Admin'} from IP ${formatIpDisplay(log.ipAddress)}`
      };
    }
    if (action.includes('LOGOUT') || (log.endpoint && log.endpoint.includes('/logout'))) {
      return {
        title: `Staff logged out of administrative portal`,
        badge: 'Portal Logout',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
        subtitle: `Session terminated for ${log.userEmail || log.userName || 'Admin'}`
      };
    }

    // 1. PAYMENTS & FEES
    if (entity.includes('payment') || entity.includes('receipt') || entity.includes('fee')) {
      const amount = newVals.amount ?? newVals.amount_paid ?? newVals.paid_amount ?? newVals.amount_collected ?? oldVals.amount;
      const studentId = newVals.student_id ?? newVals.studentId ?? oldVals.student_id ?? log.entityId;
      const studentName = newVals.student_name ?? oldVals.student_name;
      const mode = newVals.payment_mode ?? newVals.mode ?? 'Direct Entry';
      const component = newVals.payment_type ?? newVals.component ?? 'fee payment';
      const amountStr = amount ? `₹${Number(amount).toLocaleString('en-IN')}` : null;

      if (action === 'CREATE' || action === 'INSERT' || action === 'POST') {
        return {
          title: amountStr 
            ? `Recorded ${component.toLowerCase()} of ${amountStr}`
            : `Recorded fee payment receipt`,
          badge: amountStr || 'Payment Received',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
          subtitle: `${studentName ? studentName + ' • ' : ''}${studentId ? 'Student #' + studentId : ''} • Mode: ${mode}`
        };
      }
    }

    // 2. STUDENTS / ADMISSIONS / LEADS
    if (entity.includes('student') || entity.includes('enquir') || entity.includes('admission') || entity.includes('lead')) {
      const studentName = newVals.full_name ?? newVals.name ?? newVals.student_name ?? oldVals.full_name ?? oldVals.name ?? oldVals.student_name;
      const course = newVals.course ?? newVals.course_name ?? oldVals.course;

      if (action === 'DELETE') {
        return {
          title: studentName ? `Deleted student profile: ${studentName}` : `Deleted student record #${log.entityId || ''}`,
          badge: 'Record Deleted',
          badgeColor: 'bg-rose-100 text-rose-700 border-rose-200 font-semibold',
          subtitle: `Archived from student roster • ID #${log.entityId || ''}`
        };
      }

      if (action === 'CREATE') {
        return {
          title: studentName ? `Enrolled student: ${studentName}` : `Admitted new student #${log.entityId || ''}`,
          badge: 'New Enrollment',
          badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
          subtitle: `${course ? 'Course: ' + course + ' • ' : ''}Student ID #${log.entityId || 'New'}`
        };
      }

      if (action === 'UPDATE' || action === 'STATUS_CHANGE') {
        const diffs = getChangedFields(log);
        const statusDiff = diffs.find(d => d.key.includes('status') || d.key.includes('active'));
        const batchDiff = diffs.find(d => d.key.includes('batch'));

        if (statusDiff) {
          const isAct = statusDiff.newVal === 'Active';
          return {
            title: `Updated student status to ${statusDiff.newVal}`,
            badge: statusDiff.newVal,
            badgeColor: isAct ? 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold' : 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
            subtitle: `Student #${log.entityId || ''}${studentName ? ' (' + studentName + ')' : ''} • Changed from ${statusDiff.oldVal}`
          };
        }

        if (batchDiff) {
          return {
            title: `Assigned batch to student #${log.entityId || ''}`,
            badge: 'Batch Assigned',
            badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold',
            subtitle: `Allocated to ${batchDiff.newVal}`
          };
        }

        if (diffs.length > 0) {
          const fieldNames = diffs.map(d => d.label).slice(0, 3).join(', ');
          return {
            title: `Updated ${diffs.length} attribute${diffs.length > 1 ? 's' : ''} for Student #${log.entityId || ''}`,
            badge: `${diffs.length} Modified`,
            badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
            subtitle: `Fields changed: ${fieldNames}`
          };
        }
      }
    }

    // 3. BATCHES
    if (entity.includes('batch')) {
      const batchName = newVals.name ?? newVals.batch_name ?? oldVals.name ?? oldVals.batch_name;
      if (action === 'CREATE') {
        return {
          title: `Created batch: ${batchName || '#' + (log.entityId || '')}`,
          badge: 'Batch Created',
          badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold',
          subtitle: `Course batch initialized for academic roster`
        };
      }
      if (action === 'UPDATE') {
        return {
          title: `Updated batch settings: ${batchName || '#' + (log.entityId || '')}`,
          badge: 'Batch Modified',
          badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
          subtitle: `Capacity and schedule roster updated`
        };
      }
    }

    // 4. TIMETABLE & LECTURES
    if (entity.includes('timetable') || entity.includes('lecture')) {
      return {
        title: action === 'CREATE' ? `Scheduled new classroom lecture` : `Updated timetable lecture schedule`,
        badge: 'Timetable',
        badgeColor: 'bg-sky-100 text-sky-700 border-sky-200 font-semibold',
        subtitle: `${newVals.subject || 'Academic Session'} • ${newVals.classroom || 'Classroom'}`
      };
    }

    // 5. DEFAULT / FALLBACK
    const diffs = getChangedFields(log);
    if (diffs.length > 0) {
      return {
        title: `Modified ${diffs.length} field${diffs.length > 1 ? 's' : ''} in ${entity}`,
        badge: `${diffs.length} Changes`,
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
        subtitle: diffs.slice(0, 3).map(d => `${d.label}: ${d.oldVal} → ${d.newVal}`).join(' • ')
      };
    }

    const ep = log.endpoint || '';
    if (ep.includes('/leads/') && ep.includes('/convert')) {
      return {
        title: 'Converted lead to enrolled student record',
        badge: 'Lead Converted',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
        subtitle: `Enquiry converted into registered student profile`
      };
    }
    if (ep.includes('/batches') && action === 'UPDATE') {
      return {
        title: 'Allocated student to batch roster',
        badge: 'Batch Allocation',
        badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold',
        subtitle: `Class batch assigned successfully`
      };
    }
    if (ep.includes('/payments')) {
      return {
        title: 'Collected student fee payment receipt',
        badge: 'Fee Collection',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        subtitle: `Payment transaction recorded in accounts`
      };
    }
    if (ep.includes('/activate')) {
      return {
        title: 'Activated student portal and LMS access',
        badge: 'Activated',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold',
        subtitle: `Student marked active in roster`
      };
    }

    return {
      title: `${formatActionName(action)} on ${entity} #${log.entityId || ''}`,
      badge: formatActionName(action),
      badgeColor: getNarrativeBadgeColor(formatActionName(action), action),
      subtitle: `Action executed on ${log.endpoint || entity || 'system API'}`
    };
  };

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

      {/* Metric Cards Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Audit Logs</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{pagination.total.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Recorded across lifecycle</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <ClipboardList size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mutations & Changes</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {logs.filter(l => ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'].includes(l.action)).length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">In current page view</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Security & Warnings</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
              {logs.filter(l => l.severity === 'warning' || l.severity === 'critical').length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">High attention events</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Actors</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-0.5">
              {new Set(logs.map(l => l.userName || 'System')).size}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Unique staff / system</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-end">
          {/* Search Actor / Action / Endpoint */}
          <div className={isSaasAdmin ? 'sm:col-span-1 lg:col-span-1' : 'sm:col-span-2 lg:col-span-2'}>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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

          {/* Severity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                <th className="w-9 px-2 py-3.5 text-center"></th>
                <th className="px-4 py-3.5 whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Actor</th>
                {isSaasAdmin && <th className="px-4 py-3.5 whitespace-nowrap">Institute</th>}
                <th className="px-4 py-3.5 whitespace-nowrap">Action & Entity</th>
                <th className="px-5 py-3.5 min-w-[280px]">What Changes Were Made</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Severity</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Inspect</th>
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
                logs.map((log) => {
                  const diffs = getChangedFields(log);
                  const isExpanded = expandedRowId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer group select-none ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {/* Expand Toggle */}
                        <td className="w-9 px-2 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRowId(isExpanded ? null : log.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                            title={isExpanded ? 'Collapse changes' : 'Expand changes'}
                          >
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-blue-600" />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
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
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            {log.userName || 'System / Guest'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">
                            {log.userEmail || log.userRole || 'Automated'}
                          </div>
                        </td>

                        {/* Institute (SaaS Admin only) */}
                        {isSaasAdmin && (
                          <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Building size={13} className="text-slate-400" />
                              {log.tenantName || 'Global Platform'}
                            </div>
                            {log.branchName && (
                              <div className="text-[10px] text-slate-400 ml-4.5">{log.branchName}</div>
                            )}
                          </td>
                        )}

                        {/* Action & Entity */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                              {formatActionName(log.action)}
                            </span>
                            <span className="font-semibold text-slate-800 font-mono text-xs capitalize">
                              {log.entityType}
                            </span>
                            {log.entityId !== null && (
                              <span className="text-[11px] text-slate-400 font-mono">#{log.entityId}</span>
                            )}
                          </div>
                        </td>

                        {/* What Changes Were Made (Inline Professional Narrative) */}
                        <td className="px-5 py-3.5">
                          {(() => {
                            const narrative = getProfessionalAuditNarrative(log);
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 text-xs tracking-tight">
                                    {narrative.title}
                                  </span>
                                  {narrative.badge && (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] border select-none transition-colors ${
                                        narrative.badgeColor || getNarrativeBadgeColor(narrative.badge, log.action)
                                      }`}
                                    >
                                      {narrative.badge}
                                    </span>
                                  )}
                                </div>
                                {narrative.subtitle && (
                                  <p className="text-[11px] text-slate-500 font-normal truncate max-w-[420px]">
                                    {narrative.subtitle}
                                  </p>
                                )}
                                {diffs.length > 0 && log.action === 'UPDATE' && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {diffs.slice(0, 2).map((d) => (
                                      <span
                                        key={d.key}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-700"
                                      >
                                        <span className="text-slate-600 capitalize">{d.label}:</span>
                                        <span className="text-red-600 line-through max-w-[70px] truncate">{d.oldVal}</span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-emerald-700 font-bold max-w-[90px] truncate">{d.newVal}</span>
                                      </span>
                                    ))}
                                    {diffs.length > 2 && (
                                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                        +{diffs.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Inspect / View Action */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
                            title="Open full inspector modal"
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Before-and-After Diff Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200/90 animate-fadeIn">
                          <td colSpan={isSaasAdmin ? 8 : 7} className="px-6 py-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                                    {formatActionName(log.action)}
                                  </span>
                                  <span className="font-bold text-slate-800 text-xs capitalize">
                                    {log.entityType} {log.entityId !== null ? `Record #${log.entityId}` : ''}
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-xs text-slate-500">
                                    Performed by <span className="font-semibold text-slate-800">{log.userName || 'System'}</span> ({log.userEmail || 'Automated'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-mono text-slate-500">
                                    IP: {formatIpDisplay(log.ipAddress)}
                                  </span>
                                </div>
                              </div>

                              {/* Diff Table */}
                              {diffs.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                                      Modified Attributes ({diffs.length} total changes)
                                    </span>
                                    <span className="text-[10px] text-slate-400">Previous vs Updated Values</span>
                                  </div>
                                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                          <th className="px-3.5 py-2 w-1/3">Field Name</th>
                                          <th className="px-3.5 py-2 w-1/3 text-red-600 bg-red-50/40">Previous Value</th>
                                          <th className="px-3.5 py-2 w-1/3 text-emerald-700 bg-emerald-50/40">Updated Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                        {diffs.map((d) => (
                                          <tr key={d.key} className="hover:bg-slate-50/60">
                                            <td className="px-3.5 py-2 font-semibold text-slate-800 capitalize font-sans text-xs">
                                              {d.label}
                                            </td>
                                            <td className="px-3.5 py-2 text-red-700 bg-red-50/20 break-all">
                                              {d.oldVal}
                                            </td>
                                            <td className="px-3.5 py-2 font-semibold text-emerald-800 bg-emerald-50/20 break-all">
                                              {d.newVal}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : log.oldValues && log.action === 'DELETE' ? (
                                <div className="space-y-2">
                                  <span className="font-bold text-red-700 uppercase tracking-wider text-[10px] block">
                                    Deleted Record Snapshot (Data Before Removal)
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-red-200/60 text-xs">
                                    {Object.entries(log.oldValues)
                                      .filter(([k]) => !IGNORED_KEYS.has(k.toLowerCase()))
                                      .map(([k, v]) => (
                                        <div key={k} className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                            {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                          </span>
                                          <span className="font-semibold text-slate-900 text-xs truncate block mt-0.5">
                                            {formatValue(k, v)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ) : log.newValues ? (
                                <div className="space-y-2">
                                  <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block">
                                    Configured Attributes & Parameters
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-emerald-200/60 text-xs">
                                    {Object.entries(log.newValues)
                                      .filter(([k]) => !IGNORED_KEYS.has(k.toLowerCase()))
                                      .map(([k, v]) => (
                                        <div key={k} className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                            {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                          </span>
                                          <span className="font-semibold text-slate-900 text-xs truncate block mt-0.5">
                                            {formatValue(k, v)}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 py-1 font-medium">
                                  Request Endpoint: <span className="font-mono text-slate-700">{log.requestMethod || 'API'} {log.endpoint || '-'}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
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
                  <span className="font-mono text-slate-800 text-[11px]">IP: {formatIpDisplay(selectedLog.ipAddress)}</span>
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
                const changedKeys = Array.from(new Set([...Object.keys(selectedLog.oldValues!), ...Object.keys(selectedLog.newValues!)]))
                  .filter(k => !IGNORED_KEYS.has(k.toLowerCase()));

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
                                <td className="px-4 py-2.5 font-semibold text-slate-700 capitalize text-xs">
                                  {label}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-red-700 bg-red-50/30 break-all font-medium">
                                  {formatValue(key, oldVal)}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50/30 break-all">
                                  {formatValue(key, newVal)}
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
                      {Object.entries(selectedLog.oldValues!)
                        .filter(([key]) => !IGNORED_KEYS.has(key.toLowerCase()))
                        .map(([key, val]) => (
                          <div key={key} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                            <span className="font-semibold text-slate-600 capitalize text-xs">
                              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <span className="text-slate-900 font-semibold text-xs break-all">
                              {formatValue(key, val)}
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
                      {Object.entries(selectedLog.newValues!)
                        .filter(([key]) => !IGNORED_KEYS.has(key.toLowerCase()))
                        .map(([key, val]) => {
                          const readableLabel = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
                          return (
                            <div key={key} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                              <span className="font-semibold text-slate-600 capitalize text-xs">{readableLabel}</span>
                              <span className="text-slate-900 font-semibold text-xs break-all">
                                {formatValue(key, val)}
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
