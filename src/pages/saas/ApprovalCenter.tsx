import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';

interface ApprovalRequest {
  id: string;
  type: 'New Tenant Request' | 'Subscription Change' | 'Enterprise Custom Request' | 'Custom Domain Request';
  requester: string;
  details: string;
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export const ApprovalCenter: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([
    { id: 'REQ-001', type: 'New Tenant Request', requester: 'Zenith Career Hub', details: 'Wants to start Starter Trial. Email: contact@zenith.com. Mobile: 9876543210', timestamp: '2026-08-04 10:15:30', status: 'Pending' },
    { id: 'REQ-002', type: 'Subscription Change', requester: 'Apex IIT Academy', details: 'Requesting upgrade to Enterprise Custom. Current Plan: Growth Plan.', timestamp: '2026-08-04 09:12:05', status: 'Pending' },
    { id: 'REQ-003', type: 'Custom Domain Request', requester: 'Bright Future Coaching', details: 'Requesting mapping for custom domain: learn.brightfuture.in', timestamp: '2026-08-03 16:45:00', status: 'Pending' },
    { id: 'REQ-004', type: 'Enterprise Custom Request', requester: 'Vanguard Global', details: 'Requesting 50 branches limit override and custom database isolation settings.', timestamp: '2026-08-03 11:20:00', status: 'Pending' },
    { id: 'REQ-005', type: 'Custom Domain Request', requester: 'Apex IIT Academy', details: 'Mapped portals.apexiit.com successfully.', timestamp: '2026-08-02 14:00:00', status: 'Approved' }
  ]);

  const [toast, setToast] = useState('');

  const handleAction = (id: string, action: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        setToast(`Request ${id} has been ${action === 'Approved' ? 'APPROVED' : 'REJECTED'}.`);
        setTimeout(() => setToast(''), 4000);
        return { ...r, status: action };
      }
      return r;
    }));
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Platform Approval Center</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review and execute platform-level administrative requests from tenant operators.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Awaiting Decisions</h3>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
            {requests.filter(r => r.status === 'Pending').length} Pending
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {requests.map((r) => (
            <div key={r.id} className="p-6 hover:bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded border border-blue-100">
                    {r.type}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{r.id}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400 font-mono">{r.timestamp}</span>
                </div>
                <h4 className="text-base font-bold text-slate-800">{r.requester}</h4>
                <p className="text-xs text-slate-500 max-w-2xl">{r.details}</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {r.status === 'Pending' ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => handleAction(r.id, 'Rejected')}>
                      Reject
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleAction(r.id, 'Approved')}>
                      Approve Request
                    </Button>
                  </>
                ) : (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                    r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {r.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
