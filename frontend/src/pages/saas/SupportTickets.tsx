import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { ArrowLeft, Ticket, FileText, Download, Plus, MessageSquare } from 'lucide-react';
import type { SupportTicket } from '../../data/mockData';

export const SupportTickets: React.FC = () => {
  const {
    tickets,
    addSupportTicket,
    replyToSupportTicket,
    resolveSupportTicket,
    currentUser
  } = useApp();

  const isStaff = currentUser?.role === 'saas-admin';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Active Ticket Selection
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // Raise Ticket Form State
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');

  // Filter tickets by tenant scope
  const tenantScopedTickets = useMemo(() => {
    if (isStaff) return tickets;
    return tickets.filter(t => t.tenantName === currentUser?.tenantName);
  }, [tickets, currentUser, isStaff]);

  const filteredTickets = useMemo(() => {
    return tenantScopedTickets.filter(t => {
      const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
      const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tenantScopedTickets, searchTerm, filterStatus, filterPriority]);

  const activeTicket = useMemo(() => {
    return tickets.find(t => t.id === activeTicketId);
  }, [tickets, activeTicketId]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput || !activeTicketId) return;
    replyToSupportTicket(activeTicketId, replyInput, currentUser?.name || 'Admin');
    setReplyInput('');
  };

  const handleRaiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newDesc) return;
    addSupportTicket(newSubject, newDesc, newPriority, currentUser?.tenantName || 'General');
    setNewSubject('');
    setNewDesc('');
    setNewPriority('Medium');
    setShowRaiseForm(false);
  };

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) return;
    
    const dataToExport = filteredTickets.map(t => ({
      'Ticket ID': t.id,
      'Tenant Name': t.tenantName,
      'Subject': t.subject,
      'Priority': t.priority,
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

  const priorityColors = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-100',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Critical: 'bg-red-50 text-red-700 border-red-200 animate-pulse'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Priority Level"
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                options={[
                  { value: 'Low', label: 'Low - General guidance' },
                  { value: 'Medium', label: 'Medium - Functionality issue' },
                  { value: 'High', label: 'High - Critical feature blocked' },
                  { value: 'Critical', label: 'Critical - System outage' }
                ]}
              />
              <Input
                label="Requester Organization"
                value={currentUser?.tenantName || 'General Admin'}
                disabled
              />
            </div>
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
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowRaiseForm(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="primary" className="cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>Submit Ticket</Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full items-end">
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
          <Select 
            label="Priority" 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)} 
            options={[
              { value: 'All', label: 'All Priorities' },
              { value: 'Low', label: 'Low' },
              { value: 'Medium', label: 'Medium' },
              { value: 'High', label: 'High' },
              { value: 'Critical', label: 'Critical' }
            ]} 
          />
        </div>
        <Button variant="secondary" onClick={handleExportCSV} style={{ height: '38px' }} className="w-full md:w-auto cursor-pointer">
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm">Tickets Register</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
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
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
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
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4 animate-fade-in">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">{activeTicket.id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">{activeTicket.created}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mt-1">{activeTicket.subject}</h3>
                  <p className="text-xs text-slate-500 mt-1">Requester: <strong>{activeTicket.tenantName}</strong></p>
                </div>
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${statusColors[activeTicket.status]}`}>
                    {activeTicket.status}
                  </span>
                  {isStaff && activeTicket.status !== 'Resolved' && (
                    <Button variant="secondary" size="sm" onClick={() => resolveSupportTicket(activeTicket.id)} className="cursor-pointer">
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Original Description</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{activeTicket.description}</p>
                </div>

                <div className="space-y-4">
                  {activeTicket.replies.map((r, i) => {
                    const fromStaff = r.sender === 'SaaS Support Staff' || r.sender === 'SaaS Admin';
                    return (
                      <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${fromStaff ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <span className="text-[10px] text-slate-450 font-semibold">{r.sender} · {r.time}</span>
                        <div className={`p-3 rounded-xl text-xs leading-relaxed font-sans ${
                          fromStaff
                            ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-medium'
                        }`}>
                          {r.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Write your response message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  value={replyInput}
                  onChange={e => setReplyInput(e.target.value)}
                />
                <Button type="submit" variant="primary" size="sm" className="cursor-pointer">
                  Send Response
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2">
              <span className="text-4xl"><MessageSquare size={36} /></span>
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
        sampleHeaders={['Subject', 'Description', 'Priority', 'Status']}
        sampleRows={[
          ['Unable to download reports', 'The export CSV button does not trigger downloads on Safari', 'High', 'Open'],
          ['Payment gateway failure', 'UPI transactions showing pending indefinitely', 'Critical', 'Open']
        ]}
        onImport={(importedRows) => {
          importedRows.forEach((row, rIdx) => {
            addSupportTicket(
              row['Subject'] || 'Imported Support Request',
              row['Description'] || 'No details provided.',
              (row['Priority'] || 'Medium') as any,
              currentUser?.name || 'Apex IIT Academy'
            );
          });
        }}
      />
    </div>
  );
};
