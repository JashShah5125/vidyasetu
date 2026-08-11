import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface SupportTicket {
  id: string;
  tenantName: string;
  subject: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  created: string;
  replies: { sender: string; text: string; time: string }[];
}

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'TKT-001',
      tenantName: 'Apex IIT Academy',
      subject: 'Payment gateway Razorpay checkout throwing currency mismatch error',
      priority: 'High',
      status: 'Open',
      created: '2026-08-04 11:20:00',
      description: 'During online registration checkout, customers receive a currency parameter mismatch code in console.',
      replies: [
        { sender: 'Apex Operator', text: 'Customers are trying to pay in INR, but API returns USD error logs.', time: '2026-08-04 11:20:00' }
      ]
    },
    {
      id: 'TKT-002',
      tenantName: 'Bright Future Coaching',
      subject: 'Unable to upload logo for branding',
      priority: 'Medium',
      status: 'In Progress',
      created: '2026-08-03 14:00:00',
      description: 'PNG logos bigger than 2MB are getting rejected even though file size limit override was done.',
      replies: [
        { sender: 'Bright Operator', text: 'Kindly look into this sizing check rule.', time: '2026-08-03 14:00:00' },
        { sender: 'SaaS Support Staff', text: 'We have updated the server rule limits to support 5MB now.', time: '2026-08-03 17:30:00' }
      ]
    },
    {
      id: 'TKT-003',
      tenantName: 'Zenith Career Hub',
      subject: 'Cannot login to counsellors portal view',
      priority: 'High',
      status: 'Open',
      created: '2026-08-04 08:00:00',
      description: 'Our counsellors are getting redirected back to general logins page repeatedly.',
      replies: [
        { sender: 'Zenith Admin', text: 'We need this solved urgently since counselor onboarding starts today.', time: '2026-08-04 08:00:00' }
      ]
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [toast, setToast] = useState('');

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput || !activeTicketId) return;

    setTickets(prev => prev.map(t => {
      if (t.id === activeTicketId) {
        return {
          ...t,
          status: 'In Progress',
          replies: [
            ...t.replies,
            { sender: 'SaaS Admin', text: replyInput, time: new Date().toISOString().replace('T', ' ').substring(0, 19) }
          ]
        };
      }
      return t;
    }));

    setReplyInput('');
    setToast('Reply submitted. Ticket status set to In Progress.');
    setTimeout(() => setToast(''), 4000);
  };

  const handleResolve = (id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'Resolved' };
      }
      return t;
    }));
    setToast(`Ticket ${id} marked as RESOLVED.`);
    setTimeout(() => setToast(''), 4000);
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
    Low: 'bg-slate-100 text-slate-700',
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

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Support Center Inbox</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review issues, debug configurations, and reply directly to Tenant Operators.
        </p>
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
        <Button variant="secondary" onClick={handleExportCSV} style={{ height: '38px' }} className="w-full md:w-auto">
          Export CSV
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
              <div className="p-8 text-center text-slate-400 text-sm">
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{t.subject}</h4>
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                    <span>{t.tenantName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColors[t.status]}`}>
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
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
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
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[activeTicket.status]}`}>
                    {activeTicket.status}
                  </span>
                  {activeTicket.status !== 'Resolved' && (
                    <Button variant="secondary" size="sm" onClick={() => handleResolve(activeTicket.id)}>
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Original Description</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{activeTicket.description}</p>
                </div>

                <div className="space-y-3">
                  {activeTicket.replies.map((r, i) => (
                    <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${r.sender === 'SaaS Admin' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <span className="text-[10px] text-slate-400">{r.sender} · {r.time}</span>
                      <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                        r.sender === 'SaaS Admin'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}>
                        {r.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder="Write a message or upload resolution fix detail..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  value={replyInput}
                  onChange={e => setReplyInput(e.target.value)}
                />
                <Button type="submit" variant="primary" size="sm">
                  Send Response
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2">
              <span className="text-4xl">✉</span>
              <p className="text-sm font-semibold">Select a ticket from the left panel to review and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
