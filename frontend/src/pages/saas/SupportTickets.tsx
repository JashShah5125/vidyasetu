import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, Download, Plus, MessageSquare, Upload, Loader2, Paperclip, Trash2, Pencil, FileText, X } from 'lucide-react';
import { BulkImportModal } from '../../components/ui/BulkImportModal';
import api from '../../services/api';

interface TicketReply {
  sender: string;
  role: string;
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
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  created: string;
  replies: TicketReply[];
}

export const SupportTickets: React.FC = () => {
  const { currentUser, addToast } = useApp();

  const isStaff = currentUser?.role === 'saas-admin';

  // Data State
  const [tickets, setTickets] = useState<TenantTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Active Ticket Selection
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const replyFileRef = useRef<HTMLInputElement>(null);

  // Edit Ticket State
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deleting, setDeleting] = useState(false);

  // Raise Ticket Form State
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [raiseFile, setRaiseFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const raiseFileRef = useRef<HTMLInputElement>(null);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/admin/support', {
        params: { status: filterStatus !== 'All' ? filterStatus : '', search: searchTerm }
      });
      setTickets(data.data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      addToast('Failed to load support tickets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, filterStatus]);

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
      await api.post(`/admin/support/${activeTicketId}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReplyInput('');
      setReplyFile(null);
      if (replyFileRef.current) replyFileRef.current.value = '';
      await fetchTickets();
      addToast('Response sent.', 'success');
    } catch (error) {
      console.error('Error replying to ticket:', error);
      addToast('Failed to send response.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStartEdit = () => {
    if (!activeTicket) return;
    setEditSubject(activeTicket.subject);
    setEditDesc(activeTicket.description);
    setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || (!editSubject && !editDesc)) return;
    setSavingEdit(true);
    try {
      await api.patch(`/admin/support/${activeTicketId}`, { subject: editSubject, description: editDesc });
      setEditing(false);
      await fetchTickets();
      addToast('Ticket updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating ticket:', error);
      addToast('Failed to update ticket.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTicketId) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/support/${activeTicketId}`);
      setActiveTicketId(null);
      setEditing(false);
      await fetchTickets();
      addToast('Ticket deleted.', 'success');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      addToast('Failed to delete ticket.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleResolve = async () => {
    if (!activeTicketId) return;
    try {
      await api.patch(`/admin/support/${activeTicketId}/resolve`);
      await fetchTickets();
      addToast('Ticket resolved successfully!', 'success');
    } catch (error) {
      console.error('Error resolving ticket:', error);
      addToast('Failed to resolve ticket.', 'error');
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
      await api.post('/admin/support', formData, {
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
      'Tenant Name': t.tenantName,
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

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "support_tickets.csv");
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

  // Full-screen form view instead of popups
  if (showRaiseForm) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRaiseForm(false)} className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900">Raise Support Ticket</h2>
            <p className="text-xs text-slate-500 mt-0.5">Submit a query or report a technical issue to the platform operators.</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4">
            <Input
              label="Ticket Subject *"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              placeholder="e.g. Invoicing calculations mismatch on custom level plans"
              required
            />
            <Input
              label="Requester Organization"
              value={currentUser?.tenantName || 'General Admin'}
              disabled
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Detailed Description *</label>
              <textarea
                required
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Explain what happened, steps to reproduce, and any error message text..."
                className="w-full min-h-[150px] p-3 border border-slate-200 rounded-lg text-sm bg-white font-sans outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Attachment (optional)</label>
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
              <Button type="button" variant="ghost" onClick={() => setShowRaiseForm(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="primary" className="cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Submit Ticket'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            {isStaff ? 'Support Center Inbox' : 'Support Helpdesk'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isStaff
              ? 'Review issues, debug configurations, and reply directly to Tenant Operators.'
              : 'Submit support queries, track resolution logs, and interact with support engineers.'}
          </p>
        </div>
        {!isStaff && (
          <Button variant="primary" onClick={() => setShowRaiseForm(true)} className="flex items-center gap-1.5 cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>
            <Plus size={14} /> Raise Ticket
          </Button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full items-end">
          <Input label="Search" placeholder="Search by subject, tenant, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} style={{ height: '38px' }} className="w-full md:w-auto cursor-pointer font-bold flex items-center justify-center">
            <Upload size={14} className="mr-1.5" /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} style={{ height: '38px' }} className="w-full md:w-auto cursor-pointer">
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">Tickets Register</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 size={24} className="animate-spin text-slate-300" />
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
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition flex flex-col gap-2 ${activeTicketId === t.id ? 'bg-blue-50/30 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{t.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{t.subject}</h4>
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                    <span>{t.tenantName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${statusColors[t.status]}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Details and Conversations */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px]">
          {activeTicket ? (
            <>
              {/* Ticket header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">{activeTicket.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400">{activeTicket.created}</span>
                    </div>
                    {editing ? (
                      <div className="mt-1 space-y-2">
                        <Input label="Subject" value={editSubject} onChange={e => setEditSubject(e.target.value)} />
                        <textarea
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="w-full min-h-[80px] p-3 border border-slate-200 rounded-lg text-sm bg-white font-sans outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="primary" onClick={handleSaveEdit} className="cursor-pointer" disabled={savingEdit}>
                            {savingEdit ? <Loader2 size={13} className="animate-spin" /> : 'Save Changes'}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} className="cursor-pointer">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-slate-800 mt-1">{activeTicket.subject}</h3>
                        <p className="text-xs text-slate-500 mt-1">Requester: <strong>{activeTicket.tenantName}</strong></p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${statusColors[activeTicket.status]}`}>
                      {activeTicket.status}
                    </span>
                    {!editing && (
                      <div className="flex gap-2">
                        {!isStaff && (
                          <Button variant="secondary" size="sm" onClick={handleStartEdit} className="cursor-pointer">
                            <Pencil size={13} /> Edit
                          </Button>
                        )}
                        {isStaff && activeTicket.status !== 'Resolved' && (
                          <Button variant="secondary" size="sm" onClick={handleResolve} className="cursor-pointer">
                            Mark Resolved
                          </Button>
                        )}
                        {!isStaff && (
                          <Button variant="secondary" size="sm" onClick={handleDelete} className="cursor-pointer text-red-600 border-red-200" disabled={deleting}>
                            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                {!editing && (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Original Description</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{activeTicket.description}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {activeTicket.replies.map((r, i) => {
                    const fromStaff = r.is_from_staff || r.sender === 'SaaS Support Staff' || r.sender === 'SaaS Admin';
                    return (
                      <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${fromStaff ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <span className="text-[10px] text-slate-450 font-semibold">{r.sender} · {r.time}</span>
                        <div className={`p-3 rounded-xl text-xs leading-relaxed font-sans ${
                          fromStaff
                            ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-medium'
                        }`}>
                          {r.text}
                          {r.attachment_url && (
                            <a
                              href={r.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-2 flex items-center gap-1.5 font-bold underline truncate max-w-[200px] ${
                                fromStaff ? 'text-blue-50' : 'text-blue-600'
                              }`}
                            >
                              <FileText size={13} className="shrink-0" />
                              {r.attachment_name || 'Attachment'}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-white flex flex-col gap-2">
                {!editing && activeTicket.status !== 'Resolved' && activeTicket.status !== 'Closed' && (
                  <div className="flex items-end gap-2">
                    <input
                      type="text"
                      placeholder={isStaff ? 'Write your response message...' : 'Write a comment or update for the support team...'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
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
                    <Button type="submit" variant="primary" size="sm" className="cursor-pointer" disabled={sendingReply}>
                      {sendingReply ? <Loader2 size={14} className="animate-spin" /> : isStaff ? 'Send Response' : 'Send Message'}
                    </Button>
                  </div>
                )}
                {replyFile && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <FileText size={14} className="text-blue-600" />
                    <span className="truncate font-semibold">{replyFile.name}</span>
                    <button type="button" onClick={() => { setReplyFile(null); if (replyFileRef.current) replyFileRef.current.value = ''; }} className="ml-auto text-red-500 hover:text-red-700 cursor-pointer font-bold">×</button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2">
              <MessageSquare size={36} />
              <p className="text-sm font-semibold">Select a ticket from the left panel to review and reply.</p>
            </div>
          )}
        </div>
      </div>

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Support Tickets"
        description="Select a CSV spreadsheet to import multiple support tickets at once. Columns must match the template below exactly."
        sampleHeaders={['Subject', 'Description', 'Status']}
        sampleRows={[
          ['Unable to download reports', 'The export CSV button does not trigger downloads on Safari', 'Open'],
          ['Payment gateway failure', 'UPI transactions showing pending indefinitely', 'Open']
        ]}
        onImport={async (importedRows) => {
          for (const row of importedRows) {
            try {
              await api.post('/admin/support', {
                subject: row['Subject'] || 'Imported Support Request',
                description: row['Description'] || 'No details provided.'
              });
            } catch (error) {
              console.error('Error importing ticket:', error);
            }
          }
          await fetchTickets();
        }}
      />
    </div>
  );
};