import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { branchApi, toBranch } from '../../services/branchApi';
import type { Branch } from '../../types';
import {
  ArrowLeft,
  Download,
  Plus,
  MessageSquare,
  Loader2,
  Paperclip,
  FileText,
  X,
  Building2,
  Send,
  HelpCircle,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import api from '../../services/api';

interface TicketReply {
  sender_id?: number | null;
  sender: string;
  role?: string;
  sender_type?: string;
  is_from_staff: boolean;
  time: string;
  text: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

interface TenantTicket {
  id: string;
  tenantId: number | null;
  tenantName: string;
  branchId?: string | null;
  branchName?: string | null;
  channel: 'SAAS_SUPPORT' | 'INSTITUTE_SUPPORT';
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  created: string;
  replies: TicketReply[];
}

export const SupportTickets: React.FC = () => {
  const { currentUser, branches: contextBranches, addToast } = useApp();
  const [branches, setBranches] = useState<Branch[]>(contextBranches);

  // Load all accessible branches
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await branchApi.list({ limit: 1000 });
        if (!cancelled && res?.status === 'success') {
          setBranches((res.data || []).map((row: any) => toBranch(row)));
        }
      } catch {
        setBranches(contextBranches);
      }
    })();
    return () => { cancelled = true; };
  }, [contextBranches]);

  const userRole = String(currentUser?.role || '');
  const isSaasAdmin = userRole === 'saas-admin';
  const isBranchAdmin = userRole === 'branch-admin' || userRole === 'branch_admin';
  const isInstAdmin = !isSaasAdmin && !isBranchAdmin;

  const accessibleBranches = useMemo(() => {
    if (isBranchAdmin) {
      if (currentUser?.branch) {
        const matched = branches.filter(b => b.name === currentUser.branch || b.code === currentUser.branch || String(b.id) === String(currentUser.branch));
        if (matched.length > 0) return matched;
      }
      return branches;
    }
    return branches;
  }, [branches, currentUser, isBranchAdmin]);

  const activeBranchName = accessibleBranches[0]?.name || currentUser?.branch || (isBranchAdmin ? 'Assigned Branch' : 'All Branches');

  // Active channel for Institute Admin (can toggle between Branch Tickets and SaaS Support)
  const [activeChannel, setActiveChannel] = useState<'INSTITUTE_SUPPORT' | 'SAAS_SUPPORT'>(() => {
    if (isBranchAdmin) return 'INSTITUTE_SUPPORT';
    return isInstAdmin ? 'INSTITUTE_SUPPORT' : 'SAAS_SUPPORT';
  });

  // Effective staff role for answering:
  // In SAAS_SUPPORT: SaaS Admin is staff
  // In INSTITUTE_SUPPORT: Institute Admin is staff
  const isActingAsStaff = isSaasAdmin || (isInstAdmin && activeChannel === 'INSTITUTE_SUPPORT');

  // Data State
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  // Active Ticket Selection
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const replyFileRef = useRef<HTMLInputElement>(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Raise Ticket Form State
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [raiseFile, setRaiseFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const raiseFileRef = useRef<HTMLInputElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isBranchAdmin
        ? '/branch/support'
        : (isInstAdmin && activeChannel === 'INSTITUTE_SUPPORT' ? '/institute/support' : '/admin/support');

      const { data } = await api.get(endpoint, {
        params: {
          channel: isBranchAdmin ? 'INSTITUTE_SUPPORT' : activeChannel,
          status: filterStatus !== 'All' ? filterStatus : '',
          search: searchTerm,
          branchId: filterBranch !== 'All' ? filterBranch : undefined
        }
      });
      setTickets(data.data || []);
      // If active ticket is no longer in current list, clear selection
      if (activeTicketId && !(data.data || []).some((t: TenantTicket) => t.id === activeTicketId)) {
        setActiveTicketId(null);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      addToast('Failed to load support tickets.', 'error');
    } finally {
      setLoading(false);
    }
  }, [isBranchAdmin, isInstAdmin, activeChannel, filterStatus, searchTerm, filterBranch, activeTicketId, addToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch =
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.tenantName && t.tenantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.branchName && t.branchName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
      const matchesBranch = filterBranch === 'All' || String(t.branchId) === String(filterBranch) || t.branchName === filterBranch;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [tickets, searchTerm, filterStatus, filterBranch]);

  const activeTicket = useMemo(() => {
    return tickets.find(t => t.id === activeTicketId);
  }, [tickets, activeTicketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput || !activeTicketId) return;
    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append('message', replyInput);
      if (replyFile) formData.append('attachment', replyFile);

      const endpoint = isBranchAdmin
        ? `/branch/support/${activeTicketId}/replies`
        : `/admin/support/${activeTicketId}/replies`;

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setReplyInput('');
      setReplyFile(null);
      if (replyFileRef.current) replyFileRef.current.value = '';
      await fetchTickets();
      addToast('Response sent successfully.', 'success');
    } catch (error) {
      console.error('Error replying to ticket:', error);
      addToast('Failed to send response.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolve = async () => {
    if (!activeTicketId) return;
    try {
      const endpoint = isBranchAdmin
        ? `/branch/support/${activeTicketId}/resolve`
        : `/admin/support/${activeTicketId}/resolve`;

      await api.patch(endpoint);
      await fetchTickets();
      addToast('Ticket resolved successfully!', 'success');
    } catch (error) {
      console.error('Error resolving ticket:', error);
      addToast('Failed to resolve ticket.', 'error');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeTicketId || !newStatus) return;
    setUpdatingStatus(true);
    try {
      const endpoint = isBranchAdmin
        ? `/branch/support/${activeTicketId}/status`
        : `/admin/support/${activeTicketId}/status`;

      await api.patch(endpoint, { status: newStatus });
      await fetchTickets();
      addToast(`Ticket status changed to ${newStatus} successfully!`, 'success');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      addToast('Failed to update ticket status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newDesc) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', newSubject);
      formData.append('description', newDesc);
      if (raiseFile) formData.append('attachment', raiseFile);

      if (isBranchAdmin) {
        formData.append('channel', 'INSTITUTE_SUPPORT');
      }

      const endpoint = isBranchAdmin ? '/branch/support' : '/admin/support';

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setNewSubject('');
      setNewDesc('');
      setRaiseFile(null);
      if (raiseFileRef.current) raiseFileRef.current.value = '';
      setShowRaiseForm(false);
      await fetchTickets();
      addToast('Support ticket raised successfully!', 'success');
    } catch (error) {
      console.error('Error raising ticket:', error);
      addToast('Failed to raise ticket.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) return;

    const dataToExport = filteredTickets.map(t => ({
      'Ticket ID': t.id,
      'Channel': t.channel === 'INSTITUTE_SUPPORT' ? 'Branch Support' : 'SaaS Support',
      'Branch': t.branchName || 'N/A',
      'Tenant': t.tenantName,
      'Subject': t.subject,
      'Status': t.status,
      'Created Date': t.created,
      'Description': t.description,
      'Replies Log': t.replies.map(r => `${r.sender} (${r.time}): ${r.text}`).join(' | ')
    }));

    const headers = Object.keys(dataToExport[0]);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = row[header as keyof typeof row];
        const escaped = String(val ?? '').replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `support_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = {
    Open: 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-50 text-purple-700 border-purple-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Closed: 'bg-slate-100 text-slate-500 border-slate-300'
  };

  // ── Raise Ticket View ──────────────────────────────────────────────────────
  if (showRaiseForm) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRaiseForm(false)}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket size={24} className="text-blue-600" />
              {isBranchAdmin ? 'Raise Branch Support Ticket' : 'Raise Support Ticket'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isBranchAdmin
                ? 'Submit an operational query, facility maintenance request, or administrative issue to your Institute Head Office.'
                : 'Submit a query or report a technical issue to the platform operators.'}
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4">
            <Input
              label="Ticket Subject *"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              placeholder={isBranchAdmin ? "e.g. Lab equipment maintenance or batch timetable conflict" : "e.g. Invoicing calculations mismatch on custom level plans"}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Requester Branch / Organization */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Requester Branch / Center</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">
                  <Building2 size={16} className="text-slate-500 shrink-0" />
                  <div className="flex flex-col">
                    <span>
                      {isBranchAdmin
                        ? `${activeBranchName} Center`
                        : (currentUser?.tenantName || 'Institute Head Office')}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {currentUser?.tenantName || 'Institute'} · {currentUser?.name || 'Administrator'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Support Queue & Channel */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Assigned Support Desk (Target Channel)</label>
                <div className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-900">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-blue-600 shrink-0" />
                    <span>
                      {isBranchAdmin ? 'Institute Central Administration' : 'VidyaSetu Platform Support'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    {isBranchAdmin ? 'Institute Channel' : 'SaaS Channel'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Detailed Description *</label>
              <textarea
                required
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder={isBranchAdmin ? "Explain the branch issue, facility requirement, or query in detail..." : "Explain what happened, steps to reproduce, and any error message text..."}
                className="w-full min-h-[150px] p-3 border border-slate-200 rounded-lg text-sm bg-white font-sans outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Attachment (optional)</label>
              <input
                ref={raiseFileRef}
                type="file"
                onChange={e => setRaiseFile(e.target.files?.[0] || null)}
                className="mt-1.5 w-full text-sm text-slate-500 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-600 hover:file:bg-blue-100"
              />
              {raiseFile && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-md border border-slate-200 px-3 py-2">
                  <Paperclip size={14} className="text-blue-600 shrink-0" />
                  <span className="truncate flex-1">{raiseFile.name}</span>
                  <span className="text-slate-400">{(raiseFile.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    onClick={() => { setRaiseFile(null); if (raiseFileRef.current) raiseFileRef.current.value = ''; }}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowRaiseForm(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                disabled={submitting}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit Ticket
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ── Main Support Console ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">
            {isBranchAdmin
              ? 'Branch Support Desk'
              : isInstAdmin
              ? 'Support & Communications'
              : 'Support Tickets'}
          </h2>
          <p className="text-base text-slate-500 mt-2">
            {isBranchAdmin
              ? 'Submit queries, track resolution logs, and interact directly with your Institute Head Office.'
              : isInstAdmin
              ? 'Resolve support queries from branch centers or escalate platform requests to SaaS Support.'
              : 'Review issues, debug configurations, and reply directly to Tenant Operators.'}
          </p>
        </div>

        {/* Action Button: Branch Admins can raise to Institute, Institute Admins can raise to SaaS */}
        {(isBranchAdmin || (isInstAdmin && activeChannel === 'SAAS_SUPPORT')) && (
          <Button
            variant="primary"
            onClick={() => setShowRaiseForm(true)}
            className="flex items-center gap-1.5 cursor-pointer px-4 py-2 text-sm shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} /> Raise Ticket
          </Button>
        )}
      </div>

      {/* Channel Switcher Tabs for Institute Admin */}
      {isInstAdmin && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveChannel('INSTITUTE_SUPPORT'); setActiveTicketId(null); }}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-sm transition-all cursor-pointer ${
              activeChannel === 'INSTITUTE_SUPPORT'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={16} />
            Branch Support Requests
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-bold">
              {activeChannel === 'INSTITUTE_SUPPORT' ? filteredTickets.length : ''}
            </span>
          </button>
          <button
            onClick={() => { setActiveChannel('SAAS_SUPPORT'); setActiveTicketId(null); }}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-sm transition-all cursor-pointer ${
              activeChannel === 'SAAS_SUPPORT'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={16} />
            SaaS Platform Support
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full items-end">
          <div className={isInstAdmin && activeChannel === 'INSTITUTE_SUPPORT' ? 'md:col-span-2' : 'md:col-span-2'}>
            <Input
              label="Search"
              placeholder="Search by subject, ticket number, branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isInstAdmin && activeChannel === 'INSTITUTE_SUPPORT' && (
            <Select
              label="Branch"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              options={[
                { value: 'All', label: 'All Branches' },
                ...branches.map(b => ({ value: String(b.id), label: b.name }))
              ]}
            />
          )}

          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Closed', label: 'Closed' }
            ]}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="secondary" onClick={handleExportCSV} style={{ height: '38px' }} className="w-full md:w-auto cursor-pointer text-xs font-semibold px-4 flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Split-pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tickets Register */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              Tickets Register
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-semibold">
                No tickets found matching the filters.
              </div>
            ) : (
              filteredTickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition flex flex-col gap-1.5 ${
                    activeTicketId === t.id ? 'bg-blue-50/40 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-mono text-blue-600 font-bold">{t.id}</span>
                    <span className="text-[11px] text-slate-400">{t.created.split(' ')[0]}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{t.subject}</h4>

                  <div className="flex justify-between items-center text-xs text-slate-500 mt-0.5">
                    <div className="flex items-center gap-1 truncate max-w-[200px]">
                      {t.branchName ? (
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          {t.branchName}
                        </span>
                      ) : (
                        <span className="font-medium">{t.tenantName}</span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${statusColors[t.status]}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Ticket Thread & Conversation */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          {activeTicket ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 animate-fade-in">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 font-mono">{activeTicket.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-medium">{activeTicket.created}</span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 mt-1">{activeTicket.subject}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                      <span>Requester:</span>
                      <strong className="text-slate-900">
                        {activeTicket.branchName ? `${activeTicket.branchName} Center` : activeTicket.tenantName}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${statusColors[activeTicket.status]}`}>
                      {activeTicket.status}
                    </span>

                    <div className="flex gap-2">
                      {/* Status dropdown for handling staff (SaaS admin or Institute admin handling branch tickets) */}
                      {isActingAsStaff ? (
                        <Select
                          value={activeTicket.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          disabled={updatingStatus}
                          options={[
                            { value: 'Open', label: 'Open' },
                            { value: 'In Progress', label: 'In Progress' },
                            { value: 'Resolved', label: 'Resolved' },
                            { value: 'Closed', label: 'Closed' }
                          ]}
                          wrapperClassName="min-w-[130px]"
                          className="text-xs font-semibold"
                        />
                      ) : (
                        activeTicket.status !== 'Resolved' && activeTicket.status !== 'Closed' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleResolve}
                            className="cursor-pointer text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <CheckCircle2 size={13} /> Resolve
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/30">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Original Description</span>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{activeTicket.description}</p>
                </div>

                <div className="space-y-3.5">
                  {activeTicket.replies.map((r, i) => {
                    const isSenderStaff = r.is_from_staff || r.sender_type === 'SAAS_ADMIN' || r.sender_type === 'INSTITUTE_ADMIN' || r.role === 'staff';
                    const isOwnMessage = isActingAsStaff ? isSenderStaff : !isSenderStaff;

                    return (
                      <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <span>{r.sender}</span>
                          {isSenderStaff && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                              {activeTicket.channel === 'INSTITUTE_SUPPORT' ? 'Head Office' : 'Staff'}
                            </span>
                          )}
                          <span>· {r.time}</span>
                        </div>

                        <div className={`p-3.5 rounded-xl text-sm leading-relaxed font-sans ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                            : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none font-medium shadow-sm'
                        }`}>
                          {r.text}
                          {r.attachment_url && (
                            <a
                              href={r.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-2 flex items-center gap-1.5 font-bold underline truncate max-w-[220px] ${
                                isOwnMessage ? 'text-blue-50' : 'text-blue-600'
                              }`}
                            >
                              <FileText size={14} className="shrink-0" />
                              {r.attachment_name || 'Attachment'}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Input form */}
              <form onSubmit={handleSendReply} className="p-3.5 border-t border-slate-100 bg-white flex flex-col gap-2">
                {activeTicket.status !== 'Closed' && (
                  <div className="flex items-end gap-2">
                    <input
                      type="text"
                      placeholder={isActingAsStaff ? 'Write your response or solution...' : 'Write an update or reply for the support team...'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
                      value={replyInput}
                      onChange={e => setReplyInput(e.target.value)}
                    />
                    <input
                      ref={replyFileRef}
                      type="file"
                      className="hidden"
                      onChange={e => setReplyFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => replyFileRef.current?.click()}
                      title="Attach file"
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 bg-slate-50 cursor-pointer"
                    >
                      <Paperclip size={18} />
                    </button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="cursor-pointer text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                      disabled={sendingReply}
                    >
                      {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {isActingAsStaff ? 'Send Response' : 'Send Message'}
                    </Button>
                  </div>
                )}
                {replyFile && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="truncate font-semibold">{replyFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setReplyFile(null); if (replyFileRef.current) replyFileRef.current.value = ''; }}
                      className="ml-auto text-red-500 hover:text-red-700 cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2">
              <MessageSquare size={40} className="text-slate-300" />
              <p className="text-base font-semibold text-slate-600">Select a ticket from the left panel to review and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};