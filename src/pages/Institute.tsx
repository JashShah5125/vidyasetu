import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { 
  Download, UploadCloud, CheckCircle, Save,
  Plus, Trash2, Star
} from 'lucide-react';
import { formatDate } from '../data/mockData';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ value: number; max: number; label: string; limitText: string }> = ({ value, max, label, limitText }) => {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color = isUnlimited ? 'bg-blue-500' : pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold text-slate-800">
          {value.toLocaleString()} <span className="text-slate-400 font-medium">/ {limitText}</span>
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: isUnlimited ? '100%' : `${pct}%` }} />
      </div>
    </div>
  );
};

export const Institute: React.FC = () => {
  const { currentUser, tenants, plans, tenantSubscriptions, logAction, addToast } = useApp();
  const navigate = useNavigate();
  
  // ── Data Resolution ──
  const myTenant = tenants.find(t => t.id === currentUser?.tenantId);
  const mySub = tenantSubscriptions.find(s => s.tenantId === currentUser?.tenantId && s.status === 'Active');
  const myPlan = plans.find(p => p.id === mySub?.planId);

  // ── State ──
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'billing' | 'limits' | 'features' | 'integrations'>('profile');
  
  // Profile State
  const [emails, setEmails] = useState<{address: string, isDefault: boolean}[]>([
    { address: myTenant?.email || 'contact@institute.com', isDefault: true }
  ]);
  const [phones, setPhones] = useState<{number: string, isDefault: boolean}[]>([
    { number: myTenant?.mobile || '9876543210', isDefault: true }
  ]);
  const [address, setAddress] = useState(myTenant?.address || '123 Main Street');
  const [academicYear, setAcademicYear] = useState('2026 - 2027');

  // Integrations State
  const [razorpayKey, setRazorpayKey] = useState('');
  const [whatsappKey, setWhatsappKey] = useState('');
  const [overrideRequests, setOverrideRequests] = useState([{ resource: 'Max Students', value: '' }]);
  const [pastRequests, setPastRequests] = useState([
    { resource: 'Max Branches', value: '3', status: 'Approved', date: '2026-07-15' },
    { resource: 'SMS Credits', value: '10000', status: 'Pending', date: '2026-08-01' }
  ]);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!myTenant) return <div>Tenant profile not found.</div>;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      logAction('UPDATE_INSTITUTE_SETUP', `Updated profile settings for ${myTenant.name}`);
      addToast('Institute configuration saved successfully.');
      setIsSaving(false);
    }, 800);
  };

  const handleUploadLogo = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      addToast('Custom logo uploaded to preview.');
    }, 1500);
  };

  // ── Computed effective limits ──
  // Takes plan default, applies override if present
  const getLimit = (key: 'maxBranches' | 'maxStaffUsers' | 'maxStudents' | 'maxParents' | 'maxTeachers' | 'maxSmsCredits' | 'maxWhatsappMsgs'): number => {
    if (!myPlan) return -1;
    const ov = mySub?.overrides?.[key] as number | undefined;
    return ov !== undefined ? ov : (myPlan[key] as number);
  };
  const getStorageLimit = () => mySub?.overrides?.maxStorage ?? myPlan?.maxStorage ?? 'Unlimited';
  const getFileSizeLimit = () => mySub?.overrides?.maxFileSize ?? myPlan?.maxFileSize ?? 'Unlimited';

  const fmtLimit = (val: number) => val === -1 ? 'Unlimited' : val.toLocaleString();

  // Feature map translation
  const featureLabels: Record<string, { label: string; group: string }> = {
    admissions: { label: 'Admissions', group: 'Core ERP' },
    studentManagement: { label: 'Student Management', group: 'Core ERP' },
    parentPortal: { label: 'Parent Portal', group: 'Core ERP' },
    teacherPortal: { label: 'Teacher Portal', group: 'Core ERP' },
    attendance: { label: 'Attendance', group: 'Core ERP' },
    timetable: { label: 'Timetable', group: 'Core ERP' },
    assignments: { label: 'Assignments', group: 'Academic' },
    exams: { label: 'Exams', group: 'Academic' },
    results: { label: 'Results', group: 'Academic' },
    doubts: { label: 'Doubt Resolution', group: 'Academic' },
    fees: { label: 'Fee Management', group: 'Finance' },
    payroll: { label: 'Payroll', group: 'Finance' },
    income: { label: 'Income Tracker', group: 'Finance' },
    expenses: { label: 'Expense Tracker', group: 'Finance' },
    notifications: { label: 'Push Notifications', group: 'Communication' },
    sms: { label: 'SMS Alerts', group: 'Communication' },
    whatsapp: { label: 'WhatsApp', group: 'Communication' },
    email: { label: 'Email', group: 'Communication' },
    reports: { label: 'Reports & Analytics', group: 'Administration' },
    auditLogs: { label: 'Audit Logs', group: 'Administration' },
    importExport: { label: 'Import / Export', group: 'Administration' },
    apiAccess: { label: 'API Access', group: 'Administration' }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Institute Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your identity, view subscription limits, and configure integrations.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        
        {/* Top Info Banner (mimicking Tenant Details style) */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-150 p-5 rounded-xl shadow-inner">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow flex-shrink-0">
            {myTenant.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-bold text-slate-900 truncate">{myTenant.name}</h4>
            <div className="text-sm text-slate-500 font-mono mt-1">Tenant ID: {myTenant.id}</div>
          </div>
          <div className="flex items-center gap-3 select-none flex-shrink-0">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
              myTenant.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {myTenant.status}
            </span>
            {myPlan && (
              <span className="text-[11px] text-slate-600 font-bold bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full uppercase tracking-wider">
                {myPlan.name}
              </span>
            )}
          </div>
        </div>

        {/* Horizontal Tabs Selector */}
        <div className="flex border-b border-slate-200 gap-2 flex-wrap">
          {[
            { id: 'profile', label: 'General Profile' },
            { id: 'branding', label: 'Branding & Identity' },
            { id: 'billing', label: 'Plan & Billing' },
            { id: 'limits', label: 'Resource Quotas' },
            { id: 'features', label: 'Features & Support' },
            { id: 'integrations', label: 'Integrations' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[300px] pt-4">
          
          {/* TAB: General Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">

              <Card>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                  <div>
                    <h3 className="font-bold text-slate-800">Locked Identity Data</h3>
                    <p className="text-xs text-slate-500 mt-1">Managed by SaaS Super Admin.</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                    myTenant.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {myTenant.status}
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute Name</span>
                    <span className="font-bold text-slate-800">{myTenant.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tenant ID</span>
                    <span className="font-mono font-bold text-slate-600">{myTenant.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">GSTIN Number</span>
                    <span className="font-mono font-bold text-slate-800">{myTenant.gstNo || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Primary Owner</span>
                    <span className="font-bold text-slate-800">{myTenant.ownerName}</span>
                  </div>
                </div>
              </Card>

              <form onSubmit={handleSave}>
                <Card>
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Editable Profile</h3>
                    <p className="text-xs text-slate-500 mt-1">Updates will reflect across student and parent portals.</p>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contact Emails</label>
                          <button type="button" onClick={() => setEmails([...emails, { address: '', isDefault: false }])} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            <Plus size={12} /> Add Alternate
                          </button>
                        </div>
                        <div className="space-y-3">
                          {emails.map((em, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1">
                                <Input 
                                  placeholder="Enter email address"
                                  value={em.address} 
                                  onChange={(e) => {
                                    const newEmails = [...emails];
                                    newEmails[idx].address = e.target.value;
                                    setEmails(newEmails);
                                  }} 
                                />
                              </div>
                              {em.isDefault ? (
                                <span className="flex-shrink-0 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-2 rounded font-bold uppercase flex items-center gap-1.5 shadow-sm">
                                  <Star size={12} className="fill-amber-500 text-amber-500" /> Default
                                </span>
                              ) : (
                                <>
                                  <button type="button" onClick={() => {
                                    const newEmails = emails.map((e, i) => ({ ...e, isDefault: i === idx }));
                                    setEmails(newEmails);
                                  }} className="flex-shrink-0 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 px-3 py-2 rounded uppercase transition-colors">
                                    Make Default
                                  </button>
                                  <button type="button" onClick={() => setEmails(emails.filter((_, i) => i !== idx))} className="flex-shrink-0 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 rounded transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contact Phones</label>
                          <button type="button" onClick={() => setPhones([...phones, { number: '', isDefault: false }])} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            <Plus size={12} /> Add Alternate
                          </button>
                        </div>
                        <div className="space-y-3">
                          {phones.map((ph, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1">
                                <Input 
                                  placeholder="Enter phone number"
                                  value={ph.number} 
                                  onChange={(e) => {
                                    const newPhones = [...phones];
                                    newPhones[idx].number = e.target.value;
                                    setPhones(newPhones);
                                  }} 
                                />
                              </div>
                              {ph.isDefault ? (
                                <span className="flex-shrink-0 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-2 rounded font-bold uppercase flex items-center gap-1.5 shadow-sm">
                                  <Star size={12} className="fill-amber-500 text-amber-500" /> Default
                                </span>
                              ) : (
                                <>
                                  <button type="button" onClick={() => {
                                    const newPhones = phones.map((p, i) => ({ ...p, isDefault: i === idx }));
                                    setPhones(newPhones);
                                  }} className="flex-shrink-0 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 px-3 py-2 rounded uppercase transition-colors">
                                    Make Default
                                  </button>
                                  <button type="button" onClick={() => setPhones(phones.filter((_, i) => i !== idx))} className="flex-shrink-0 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 rounded transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Input label="Physical Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    <Input label="Active Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-2xl">
                    <Button type="submit" variant="primary" disabled={isSaving} style={{ gap: '8px' }}>
                      <Save size={16} /> {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          )}

          {/* TAB: Branding & Identity */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">Institute Logo</h3>
                    <p className="text-xs text-slate-500 mt-1">Displays on invoices, receipts, and portals.</p>
                  </div>
                  {!myPlan?.branding.customLogo && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-widest">Locked by Plan</span>
                  )}
                </div>
                <div className="p-6 flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl mx-6 mb-6 bg-slate-50/50">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-4xl shadow-lg shadow-blue-500/30 mb-6">
                    {myTenant.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                  <Button variant="secondary" onClick={handleUploadLogo} disabled={isUploading || !myPlan?.branding.customLogo} style={{ gap: '8px' }}>
                    <UploadCloud size={16} /> {isUploading ? 'Uploading...' : 'Upload Custom Logo'}
                  </Button>
                  {!myPlan?.branding.customLogo && (
                    <p className="text-xs text-amber-600 mt-4 font-semibold">Upgrade to Professional plan to enable custom logos.</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <h3 className="font-bold text-slate-800 mb-4">White Label Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                      <div>
                        <p className="font-bold text-sm text-slate-800">Custom Domain</p>
                        <p className="text-xs text-slate-500 mt-0.5">e.g. portal.yourinstitute.com</p>
                      </div>
                      {myPlan?.branding.customDomain ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest bg-emerald-100 text-emerald-700">
                          Enabled
                        </span>
                      ) : (
                        <Button 
                          type="button"
                          variant="primary"
                          style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}
                          onClick={() => navigate('/institute/upgrade')}
                        >
                          Upgrade to Unlock
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                      <div>
                        <p className="font-bold text-sm text-slate-800">Custom Email Templates</p>
                        <p className="text-xs text-slate-500 mt-0.5">Send emails from your own domain</p>
                      </div>
                      {myPlan?.branding.customEmailTemplates ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest bg-emerald-100 text-emerald-700">
                          Enabled
                        </span>
                      ) : (
                        <Button 
                          type="button"
                          variant="primary"
                          style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}
                          onClick={() => navigate('/institute/upgrade')}
                        >
                          Upgrade to Unlock
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB: Plan & Billing */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-fade-in">
              {!mySub ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-800">No Active Subscription</h3>
                  <p className="text-sm text-slate-500 mt-2">Please contact SaaS administrator to activate your plan.</p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Current Plan</span>
                        <div className="flex items-center gap-3">
                          <h3 className="text-3xl font-display font-extrabold">{mySub.planName}</h3>
                          <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold tracking-wider">{myPlan?.code}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider ${mySub.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{mySub.status}</span>
                        </div>
                        <p className="text-slate-300 text-sm mt-2 max-w-md leading-relaxed">{myPlan?.description || 'Your current subscription plan.'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Billing Cycle</span>
                        <span className="text-xl font-bold">{mySub.billingCycle}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-white/10 relative z-10">
                      <div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Started On</span>
                        <span className="text-sm font-bold">{formatDate(mySub.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">End / Renewal Date</span>
                        <span className="text-sm font-bold text-emerald-400">{formatDate(mySub.expiryDate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Subscription Fee</span>
                        <span className="text-sm font-bold">{mySub.finalPrice === 0 ? 'Free' : `₹${mySub.finalPrice.toLocaleString()}`}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-1">Latest Invoice</span>
                        <span className="text-sm font-bold font-mono">{mySub.invoiceNumber || '—'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/10 relative z-10">
                       <Button type="button" variant="primary" style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }} onClick={() => navigate(`/institute/checkout/${mySub.planId}`)}>
                         Renew Subscription
                       </Button>
                       <Button type="button" variant="secondary" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }} onClick={() => navigate('/institute/upgrade')}>
                         Choose a Different Plan
                       </Button>
                    </div>
                  </div>



                  <Card>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">Invoice History</h3>
                      <Button variant="secondary" size="sm" style={{ gap: '6px' }}><Download size={14} /> Download All</Button>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">Invoice ID</th>
                          <th className="px-6 py-4">Plan</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        {mySub.invoiceNumber ? (
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-mono font-bold">{mySub.invoiceNumber}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800">{mySub.planName}</td>
                            <td className="px-6 py-4">{formatDate(mySub.startDate)}</td>
                            <td className="px-6 py-4 font-bold">₹{mySub.finalPrice.toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">Paid</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-blue-600 hover:underline text-xs font-bold">Download</button>
                            </td>
                          </tr>
                        ) : (
                          <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No invoices generated yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* TAB: Resource Quotas */}
          {activeTab === 'limits' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 font-medium">
                Resource limits are governed by your subscription plan. Contact support to upgrade limits.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProgressBar value={2} max={getLimit('maxBranches')} label="Branches" limitText={fmtLimit(getLimit('maxBranches'))} />
                <ProgressBar value={850} max={getLimit('maxStudents')} label="Students" limitText={fmtLimit(getLimit('maxStudents'))} />
                <ProgressBar value={45} max={getLimit('maxStaffUsers')} label="Staff Users" limitText={fmtLimit(getLimit('maxStaffUsers'))} />
                <ProgressBar value={28} max={getLimit('maxTeachers')} label="Teachers" limitText={fmtLimit(getLimit('maxTeachers'))} />
                <ProgressBar value={4500} max={getLimit('maxSmsCredits')} label="SMS Credits (This Month)" limitText={fmtLimit(getLimit('maxSmsCredits'))} />
                <ProgressBar value={1200} max={getLimit('maxWhatsappMsgs')} label="WhatsApp Msgs (This Month)" limitText={fmtLimit(getLimit('maxWhatsappMsgs'))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Cloud Storage</span>
                  <span className="text-2xl font-bold text-slate-800">3.4 GB <span className="text-sm text-slate-400 font-medium">/ {getStorageLimit()}</span></span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Max File Upload Size</span>
                  <span className="text-2xl font-bold text-slate-800">{getFileSizeLimit()}</span>
                </div>
              </div>
              
              <Card>
                <div className="p-6 border-b border-slate-100">
                   <h3 className="font-bold text-slate-800">Request Limit Override</h3>
                   <p className="text-xs text-slate-500 mt-1">Need more resources without changing your entire plan? Request a custom limit increase.</p>
                </div>
                <div className="p-6 space-y-4">
                   {overrideRequests.map((req, idx) => {
                     const currentLimitMap: Record<string, string> = {
                       'Max Branches': fmtLimit(getLimit('maxBranches')),
                       'Max Students': fmtLimit(getLimit('maxStudents')),
                       'Max Cloud Storage': getStorageLimit(),
                       'SMS Credits': fmtLimit(getLimit('maxSmsCredits'))
                     };
                     const currentLimit = currentLimitMap[req.resource] || '—';

                     return (
                       <div key={idx} className="flex flex-col md:flex-row gap-4 items-start bg-slate-50/70 p-4 rounded-xl border border-slate-100 relative group transition-colors hover:bg-slate-50">
                         <div className="flex-1 w-full">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Resource</label>
                           <select 
                             className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:bg-white transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none font-medium text-slate-800"
                             value={req.resource}
                             onChange={e => {
                               const newReqs = [...overrideRequests];
                               newReqs[idx].resource = e.target.value;
                               setOverrideRequests(newReqs);
                             }}
                           >
                             <option>Max Branches</option>
                             <option>Max Students</option>
                             <option>Max Cloud Storage</option>
                             <option>SMS Credits</option>
                           </select>
                         </div>
                         <div className="w-full md:w-32 flex-shrink-0">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Limit</label>
                           <div className="h-11 flex items-center px-3 font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed text-sm">
                             {currentLimit}
                           </div>
                         </div>
                         <div className="flex-1 w-full relative">
                           <Input 
                             label="Requested New Limit" 
                             placeholder="e.g. 5000" 
                             type="text" 
                             value={req.value}
                             onChange={e => {
                               const newReqs = [...overrideRequests];
                               newReqs[idx].value = e.target.value;
                               setOverrideRequests(newReqs);
                             }}
                           />
                         </div>
                         {overrideRequests.length > 1 && (
                           <button 
                             type="button" 
                             onClick={() => setOverrideRequests(overrideRequests.filter((_, i) => i !== idx))}
                             className="absolute -right-2 -top-2 bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 p-1.5 rounded-full shadow-sm transition-all z-10"
                           >
                             <Trash2 size={14} />
                           </button>
                         )}
                       </div>
                     );
                   })}
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 pt-4 border-t border-slate-100">
                     <button 
                       type="button" 
                       onClick={() => setOverrideRequests([...overrideRequests, { resource: 'Max Branches', value: '' }])}
                       className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors bg-blue-50/50 hover:bg-blue-50 px-3 py-2 rounded-lg"
                     >
                       <Plus size={14} /> Add Another Resource
                     </button>
                     <Button type="button" variant="primary" style={{ gap: '6px' }} onClick={() => {
                       const validReqs = overrideRequests.filter(r => r.value.trim() !== '');
                       if (validReqs.length === 0) return;
                       
                       const newPast = validReqs.map(r => ({
                         resource: r.resource,
                         value: r.value,
                         status: 'Pending',
                         date: new Date().toISOString().split('T')[0]
                       }));
                       
                       setPastRequests([...newPast, ...pastRequests]);
                       addToast(`${validReqs.length} override request(s) submitted to SaaS admin.`);
                       setOverrideRequests([{ resource: 'Max Students', value: '' }]);
                     }}>
                       Submit Request(s)
                     </Button>
                   </div>
                </div>
                
                {/* Submitted Requests History */}
                {pastRequests.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                    <div className="p-4 border-b border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Submitted Requests</h4>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Resource</th>
                          <th className="px-4 py-3 font-medium">Requested Limit</th>
                          <th className="px-4 py-3 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pastRequests.map((pr, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{pr.date}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{pr.resource}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 text-xs">{pr.value}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                                pr.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                pr.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' : 
                                'bg-amber-50 text-amber-600 border-amber-200'
                              }`}>
                                {pr.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB: Features & Support */}
          {activeTab === 'features' && myPlan && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">Enabled Modules</h3>
                    <p className="text-xs text-slate-500 mt-1">Features accessible to your institute based on the {myPlan.name} plan.</p>
                  </div>
                  <Button 
                    type="button"
                    variant="primary"
                    style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}
                    onClick={() => navigate('/institute/upgrade')}
                  >
                    Upgrade to Unlock
                  </Button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(
                    Object.entries(myPlan.features).reduce((acc, [k, enabled]) => {
                      const meta = featureLabels[k];
                      if (!meta) return acc;
                      if (!acc[meta.group]) acc[meta.group] = [];
                      acc[meta.group].push({ label: meta.label, enabled });
                      return acc;
                    }, {} as Record<string, {label: string, enabled: boolean}[]>)
                  ).map(([groupName, items]) => (
                    <div key={groupName} className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{groupName}</p>
                      {items.map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          {item.enabled ? (
                            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.enabled ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Support Entitlements</h3>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className={`p-4 rounded-xl border ${myPlan.support.emailSupport ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                    <span className="font-bold text-sm block text-slate-800">Email</span>
                    <span className="text-xs text-slate-500 mt-1">{myPlan.support.emailSupport ? 'Included' : 'Unavailable'}</span>
                  </div>
                  <div className={`p-4 rounded-xl border ${myPlan.support.chatSupport ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                    <span className="font-bold text-sm block text-slate-800">Live Chat</span>
                    <span className="text-xs text-slate-500 mt-1">{myPlan.support.chatSupport ? 'Included' : 'Unavailable'}</span>
                  </div>
                  <div className={`p-4 rounded-xl border ${myPlan.support.phoneSupport ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                    <span className="font-bold text-sm block text-slate-800">Phone Support</span>
                    <span className="text-xs text-slate-500 mt-1">{myPlan.support.phoneSupport ? 'Included' : 'Unavailable'}</span>
                  </div>
                  <div className={`p-4 rounded-xl border ${myPlan.support.dedicatedAccountManager ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                    <span className="font-bold text-sm block text-slate-800">Account Manager</span>
                    <span className="text-xs text-slate-500 mt-1">{myPlan.support.dedicatedAccountManager ? 'Included' : 'Unavailable'}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB: Integrations */}
          {activeTab === 'integrations' && myPlan && (
            <div className="space-y-6 animate-fade-in">
              <form onSubmit={handleSave}>
                <Card>
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                      <h3 className="font-bold text-slate-800">3rd Party Integrations</h3>
                      <p className="text-xs text-slate-500 mt-1">Configure your own gateways and API keys.</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    
                    {/* Razorpay */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">Razorpay Payment Gateway</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Collect fees online directly into your account.</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${myPlan.integrations.razorpay ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                          {myPlan.integrations.razorpay ? 'Allowed' : 'Locked'}
                        </span>
                      </div>
                      <div className="max-w-md">
                        <Input 
                          label="Razorpay Key ID" 
                          placeholder={myPlan.integrations.razorpay ? 'rzp_live_xxxxxxxxxxx' : 'Upgrade plan to unlock'} 
                          value={razorpayKey} 
                          onChange={e => setRazorpayKey(e.target.value)}
                          disabled={!myPlan.integrations.razorpay}
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">WhatsApp Business API</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Automated attendance and fee reminders.</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${myPlan.integrations.whatsappBusiness ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                          {myPlan.integrations.whatsappBusiness ? 'Allowed' : 'Locked'}
                        </span>
                      </div>
                      <div className="max-w-md">
                        <Input 
                          label="WABA Auth Token" 
                          placeholder={myPlan.integrations.whatsappBusiness ? 'EAAxxxxxxxxx' : 'Upgrade plan to unlock'} 
                          value={whatsappKey} 
                          onChange={e => setWhatsappKey(e.target.value)}
                          disabled={!myPlan.integrations.whatsappBusiness}
                        />
                      </div>
                    </div>

                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-2xl">
                    <Button type="submit" variant="primary" disabled={isSaving} style={{ gap: '8px' }}>
                      <Save size={16} /> {isSaving ? 'Saving...' : 'Save Keys'}
                    </Button>
                  </div>
                </Card>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
