import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface ApprovalRequest {
  id: string;
  type: 'New Tenant Request' | 'Subscription Change' | 'Enterprise Custom Request' | 'Custom Domain Request';
  requester: string;
  details: string;
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string;
}

const parseRequestDetails = (detailsStr: string) => {
  const emailMatch = detailsStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const mobileMatch = detailsStr.match(/(?:mobile:\s*|phone:\s*|\+)?([0-9]{10,12})/i);
  const planMatch = detailsStr.match(/(?:upgrade to|start|plan:)\s*([a-zA-Z0-9\s-]+?)(?:\.|$)/i);
  
  return {
    email: emailMatch ? emailMatch[0] : 'contact@zenith.com',
    mobile: mobileMatch ? mobileMatch[1] : '9876543210',
    plan: planMatch ? planMatch[1].trim() : 'Starter Trial'
  };
};

export const ApprovalCenter: React.FC = () => {
  const { tenants } = useApp();
  const [requests, setRequests] = useState<ApprovalRequest[]>([
    { id: 'REQ-002', type: 'Subscription Change', requester: 'Apex IIT Academy', details: 'Requesting upgrade to Enterprise Custom. Current Plan: Growth Plan.', timestamp: '2026-08-04 09:12:05', status: 'Pending' },
    { id: 'REQ-003', type: 'Custom Domain Request', requester: 'Bright Future Tuition', details: 'Requesting mapping for custom domain: learn.brightfuture.in', timestamp: '2026-08-03 16:45:00', status: 'Pending' },
    { id: 'REQ-004', type: 'Enterprise Custom Request', requester: 'Vanguard Classes', details: 'Requesting 50 branches limit override and custom database isolation settings.', timestamp: '2026-08-03 11:20:00', status: 'Pending' },
    { id: 'REQ-005', type: 'Custom Domain Request', requester: 'Apex IIT Academy', details: 'Mapped portals.apexiit.com successfully.', timestamp: '2026-08-02 14:00:00', status: 'Approved', note: 'Domain verified and mapped successfully' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [toast, setToast] = useState('');
  const [actionPendingRequest, setActionPendingRequest] = useState<{ id: string; action: 'Approved' | 'Rejected' } | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<ApprovalRequest | null>(null);

  const handleAction = (id: string, action: 'Approved' | 'Rejected') => {
    setActionPendingRequest({ id, action });
  };

  const executeAction = (id: string, action: 'Approved' | 'Rejected', note: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        setToast(`Request ${id} has been ${action === 'Approved' ? 'APPROVED' : 'REJECTED'}.${note ? ` Reason: ${note}` : ''}`);
        setTimeout(() => setToast(''), 4000);
        return { ...r, status: action, note };
      }
      return r;
    }));
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end">
        <Input label="Search" placeholder="Search by requester, details, ID..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <Select 
          label="Decision Status" 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Rejected', label: 'Rejected' }
          ]} 
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Awaiting Decisions</h3>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
            {filteredRequests.filter(r => r.status === 'Pending').length} Pending
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No approval requests found matching the filters.
            </div>
          ) : (
            filteredRequests.map((r) => (
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
                  {(() => {
                    const matchedTenant = tenants.find(t => t.name.toLowerCase().includes(r.requester.toLowerCase()) || r.requester.toLowerCase().includes(t.name.toLowerCase()));
                    return matchedTenant ? (
                      <div className="flex gap-2 items-center">
                        <Link 
                          to={`/tenants/${matchedTenant.id}`} 
                          className="text-base font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block"
                        >
                          {r.requester}
                        </Link>
                        <button 
                          onClick={() => setSelectedRequestForDetails(r)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-0.5 rounded border border-blue-200 font-semibold transition cursor-pointer"
                        >
                          Quick View Details
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSelectedRequestForDetails(r)}
                        className="text-base font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block text-left"
                      >
                        {r.requester}
                      </button>
                    );
                  })()}
                  <p className="text-xs text-slate-500 max-w-2xl">{r.details}</p>
                  
                  {r.status !== 'Pending' && r.note && (
                    <div className="mt-2 text-xs bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-2 max-w-xl text-slate-600">
                      <strong className="font-semibold text-slate-500 uppercase text-[9px] block mb-0.5">Decision Note:</strong>
                      {r.note}
                    </div>
                  )}
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
            ))
          )}
        </div>
      </div>

      {actionPendingRequest && (
        <Modal 
          isOpen={true} 
          onClose={() => { setActionPendingRequest(null); setCustomReason(''); }}
          title={`Confirm ${actionPendingRequest.action}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Please enter a reason or note for this decision:
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Decision Note / Reason</span>
              <textarea
                placeholder="Enter details..."
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { setActionPendingRequest(null); setCustomReason(''); }}>
                Cancel
              </Button>
              <Button 
                variant={actionPendingRequest.action === 'Approved' ? 'primary' : 'danger'}
                onClick={() => {
                  executeAction(actionPendingRequest.id, actionPendingRequest.action, customReason);
                  setActionPendingRequest(null);
                  setCustomReason('');
                }}
              >
                Confirm {actionPendingRequest.action}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedRequestForDetails && (() => {
        const parsed = parseRequestDetails(selectedRequestForDetails.details);
        return (
          <Modal
            isOpen={true}
            onClose={() => setSelectedRequestForDetails(null)}
            title="Institute Registration Details"
          >
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{selectedRequestForDetails.requester}</h4>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Request ID: {selectedRequestForDetails.id}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    selectedRequestForDetails.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    selectedRequestForDetails.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {selectedRequestForDetails.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Contact Email</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{parsed.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Contact Mobile</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{parsed.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Requested Plan Tier</span>
                    <span className="font-semibold text-blue-600 mt-0.5 block">{parsed.plan}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Submitted Timestamp</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{selectedRequestForDetails.timestamp}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Request Details / Memo</span>
                <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 mt-1 leading-relaxed whitespace-pre-wrap">{selectedRequestForDetails.details}</p>
              </div>

              {selectedRequestForDetails.note && (
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Decision Note</span>
                  <p className="text-xs text-slate-650 bg-slate-50 border border-slate-150 rounded-lg p-3 mt-1 font-medium">{selectedRequestForDetails.note}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {selectedRequestForDetails.status === 'Pending' && (
                  <>
                    <Button variant="secondary" onClick={() => {
                      setSelectedRequestForDetails(null);
                      handleAction(selectedRequestForDetails.id, 'Rejected');
                    }}>
                      Reject Request
                    </Button>
                    <Button variant="primary" onClick={() => {
                      setSelectedRequestForDetails(null);
                      handleAction(selectedRequestForDetails.id, 'Approved');
                    }}>
                      Approve Request
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setSelectedRequestForDetails(null)}>
                  Close Details
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

    </div>
  );
};
