import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ArrowLeft } from 'lucide-react';

interface NotificationBroadcast {
  id: string;
  type: 'Maintenance' | 'Announcement' | 'Emergency Alert' | 'Email Campaign';
  title: string;
  body: string;
  targetAudience: 'All Tenants' | 'Trial Tenants Only' | 'Active Tenants Only' | 'Enterprise Only';
  status: 'Sent' | 'Scheduled' | 'Draft';
  sentAt: string;
  channels?: string[];
}

export const CommunicationCenter: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<NotificationBroadcast[]>([
    { id: 'BC-01', type: 'Maintenance', title: 'Scheduled Database Upgrades (Sunday 2AM-4AM IST)', body: 'Routine security patching and read-replica index rebuilds. Expected downtime is 15 minutes max.', targetAudience: 'All Tenants', status: 'Sent', sentAt: '2026-08-01 10:00:00', channels: ['Email', 'In-App System Notification'] },
    { id: 'BC-02', type: 'Announcement', title: 'New Payment Gateways Released!', body: 'Cashfree is now supported natively. You can configure credentials in Global Settings under your admin panel.', targetAudience: 'Active Tenants Only', status: 'Sent', sentAt: '2026-07-28 14:30:00', channels: ['Email', 'WhatsApp', 'In-App System Notification'] },
    { id: 'BC-03', type: 'Email Campaign', title: 'Upgrade offer: Lock in 20% savings on Yearly plans', body: 'Annual renewal subscriptions have dynamic savings toggles enabled for this week.', targetAudience: 'Trial Tenants Only', status: 'Scheduled', sentAt: '2026-08-10 09:00:00', channels: ['Email'] }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<'Maintenance' | 'Announcement' | 'Emergency Alert' | 'Email Campaign'>('Announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'All Tenants' | 'Trial Tenants Only' | 'Active Tenants Only' | 'Enterprise Only'>('All Tenants');
  const [status, setStatus] = useState<'Sent' | 'Scheduled' | 'Draft'>('Sent');
  const [channels, setChannels] = useState<string[]>(['Email']);
  const [toast, setToast] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Sent' | 'Scheduled' | 'Draft'>('All');

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter(bc => {
      if (filterStatus === 'All') return true;
      return bc.status === filterStatus;
    });
  }, [broadcasts, filterStatus]);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newBc: NotificationBroadcast = {
      id: `BC-0${broadcasts.length + 1}`,
      type,
      title,
      body,
      targetAudience,
      status,
      sentAt: status === 'Sent' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : 'Scheduled',
      channels
    };

    setBroadcasts([newBc, ...broadcasts]);
    setShowAddModal(false);
    setTitle(''); setBody('');
    setChannels(['Email']);
    setToast(`Broadcast campaign "${title}" created/dispatched.`);
    setTimeout(() => setToast(''), 4000);
  };

  const typeBadges = {
    Maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    Announcement: 'bg-blue-50 text-blue-700 border-blue-200',
    'Emergency Alert': 'bg-red-50 text-red-700 border-red-200 animate-pulse',
    'Email Campaign': 'bg-purple-50 text-purple-700 border-purple-200'
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (showAddModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Create New Broadcast Alert
            </h2>
            <p className="text-sm text-slate-500">
              Draft or dispatch platform-wide announcements, emergency notices, or email campaign updates.
            </p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Broadcast Type" value={type} onChange={e => setType(e.target.value as typeof type)}
                options={[
                  { value: 'Announcement', label: 'Announcement' },
                  { value: 'Maintenance', label: 'Maintenance Warning' },
                  { value: 'Emergency Alert', label: 'Emergency Alert' },
                  { value: 'Email Campaign', label: 'Email Campaign' }
                ]} />
              <Select label="Target Audience" value={targetAudience} onChange={e => setTargetAudience(e.target.value as typeof targetAudience)}
                options={[
                  { value: 'All Tenants', label: 'All Tenants' },
                  { value: 'Trial Tenants Only', label: 'Trial Tenants Only' },
                  { value: 'Active Tenants Only', label: 'Active Tenants Only' },
                  { value: 'Enterprise Only', label: 'Enterprise Custom Only' }
                ]} />
            </div>

            <Input label="Title / Header" required placeholder="e.g. Server updates notice" value={title} onChange={e => setTitle(e.target.value)} />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message Body</label>
              <textarea required placeholder="Write details here..."
                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-28 resize-none"
                value={body} onChange={e => setBody(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Delivery Channels</label>
              <div className="flex flex-wrap gap-4 bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                {['Email', 'WhatsApp', 'SMS', 'In-App System Notification'].map(ch => {
                  const isChecked = channels.includes(ch);
                  return (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setChannels(prev => [...prev, ch]);
                          } else {
                            if (channels.length > 1) {
                              setChannels(prev => prev.filter(item => item !== ch));
                            }
                          }
                        }}
                        className="rounded border-slate-350 h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      {ch}
                    </label>
                  );
                })}
              </div>
            </div>

            <Select label="Dispatch Schedule" value={status} onChange={e => setStatus(e.target.value as typeof status)}
              options={[
                { value: 'Sent', label: 'Send Immediately' },
                { value: 'Scheduled', label: 'Schedule for Later Date' },
                { value: 'Draft', label: 'Save as Draft Template' }
              ]} />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Disseminate Campaign</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {toast}
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Communication Center</h2>
          <p className="text-sm text-slate-500 mt-1">
            Send platform-wide notifications, maintenance schedules, alerts, or targeted email campaigns to tenant owners.
          </p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} onClick={() => setShowAddModal(true)}>
          ✉ Create Broadcast
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-3">
          <h3 className="font-bold text-slate-800 text-sm">Campaigns &amp; Outbox Register</h3>
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['All', 'Sent', 'Scheduled', 'Draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                  filterStatus === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredBroadcasts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No campaigns found matching the status "{filterStatus}".
            </div>
          ) : (
            filteredBroadcasts.map(bc => (
              <div key={bc.id} className="p-6 hover:bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${typeBadges[bc.type]}`}>
                      {bc.type}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{bc.id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">Target: <strong>{bc.targetAudience}</strong></span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800">{bc.title}</h4>
                  <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">{bc.body}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold select-none">DELIVERY CHANNELS:</span>
                    {(bc.channels || ['Email']).map(ch => (
                      <span key={ch} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-650">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col gap-1 items-end">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                    bc.status === 'Sent' ? 'bg-emerald-50 text-emerald-700' : bc.status === 'Scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500'
                  }`}>
                    {bc.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">{bc.sentAt}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
