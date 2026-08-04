import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Upload, Trash, Edit } from 'lucide-react';
import { formatDate } from '../data/mockData';

export const TenantsManager: React.FC<{ initialOpenCreate?: boolean }> = ({ initialOpenCreate }) => {
  const { tenants, addTenant, updateTenant, toggleTenantStatus } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);

  React.useEffect(() => {
    if (initialOpenCreate) {
      handleOpenAddModal();
    } else {
      setShowAddModal(false);
    }
  }, [initialOpenCreate]);

  // Edit / Create mode trackers
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Forms states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [plan, setPlan] = useState('Growth Plan');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [logoUploaded, setLogoUploaded] = useState(false);
  
  // Resource limit states
  const [maxBranches, setMaxBranches] = useState('5');
  const [maxStudents, setMaxStudents] = useState('1000');
  const [maxStorage, setMaxStorage] = useState('20 GB');
  const [maxFileSize, setMaxFileSize] = useState('20 MB');

  // Alternate email lists states
  const [altEmails, setAltEmails] = useState<string[]>([]);
  const [defaultEmailIdx, setDefaultEmailIdx] = useState<number>(-1);
  
  // Viewer states
  const [viewingTenant, setViewingTenant] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [manageTab, setManageTab] = useState<'profile' | 'billing' | 'limits' | 'status' | 'payments'>('profile');

  const [showSaved, setShowSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Calculate Expiry date automatically based on Plan Duration
  const calculateExpiryDate = (startStr: string, selectedPlan: string) => {
    if (!startStr) return '';
    const date = new Date(startStr);
    if (isNaN(date.getTime())) return '';

    if (selectedPlan === 'Starter Trial') {
      date.setDate(date.getDate() + 14); // 14 Days free trial
    } else if (selectedPlan === 'Pro Enterprise') {
      date.setFullYear(date.getFullYear() + 1); // 1 Year (12 months)
    } else {
      date.setMonth(date.getMonth() + 1); // 1 Month (Growth Plan)
    }
    return date.toISOString().split('T')[0];
  };

  const expiryDate = calculateExpiryDate(startDate, plan);

  const handleOpenAddModal = () => {
    setEditingTenantId(null);
    
    // Auto generate a secure default password
    const generatedPass = 'VS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setDefaultPassword(generatedPass);
    
    setName('');
    setAddress('');
    setGstNo('');
    setOwnerName('');
    setEmail('');
    setMobile('');
    setPlan('Growth Plan');
    setStartDate(new Date().toISOString().split('T')[0]);
    setLogoUploaded(false);
    setAltEmails([]);
    setDefaultEmailIdx(-1);
    
    // Resource limits defaults
    setMaxBranches('5');
    setMaxStudents('1000');
    setMaxStorage('20 GB');
    setMaxFileSize('20 MB');
    
    setShowAddModal(true);
  };

  const handleOpenEditModal = (t: any) => {
    setEditingTenantId(t.id);
    
    setName(t.name || '');
    setAddress(t.address || '401, Western Express Highway, Mumbai');
    setGstNo(t.gstNo || '27AAAAA0000A1Z5');
    setOwnerName(t.ownerName || '');
    setEmail(t.email || '');
    setMobile(t.mobile || '');
    setPlan(t.plan || 'Growth Plan');
    setStartDate(t.startDate || new Date().toISOString().split('T')[0]);
    setDefaultPassword('********'); // prefilled dummy
    setLogoUploaded(true);
    setAltEmails(t.altEmails || []);
    
    if (t.defaultEmail) {
      if (t.defaultEmail === t.email) {
        setDefaultEmailIdx(-1);
      } else {
        const idx = (t.altEmails || []).indexOf(t.defaultEmail);
        setDefaultEmailIdx(idx !== -1 ? idx : -1);
      }
    } else {
      setDefaultEmailIdx(-1);
    }
    
    setMaxBranches(t.maxBranches || '5');
    setMaxStudents(t.maxStudents || '1000');
    setMaxStorage(t.maxStorage || '20 GB');
    setMaxFileSize(t.maxFileSize || '20 MB');
    
    setShowViewModal(false);
    setShowAddModal(true);
  };

  const handleAddAltEmail = () => {
    setAltEmails(prev => [...prev, '']);
  };

  const handleUpdateAltEmail = (idx: number, val: string) => {
    setAltEmails(prev => prev.map((item, i) => i === idx ? val : item));
  };

  const handleRemoveAltEmail = (idx: number) => {
    setAltEmails(prev => prev.filter((_, i) => i !== idx));
    if (defaultEmailIdx === idx) {
      setDefaultEmailIdx(-1);
    } else if (defaultEmailIdx > idx) {
      setDefaultEmailIdx(prev => prev - 1);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogoUploaded(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerName || !email) return;
    
    const cleanAlts = altEmails.filter(Boolean);
    
    let finalDefaultEmail = email;
    if (defaultEmailIdx >= 0 && defaultEmailIdx < cleanAlts.length) {
      finalDefaultEmail = cleanAlts[defaultEmailIdx];
    }
    
    if (editingTenantId) {
      // Edit mode
      updateTenant(editingTenantId, {
        name,
        address,
        gstNo,
        ownerName,
        email,
        mobile,
        plan,
        renewalDate: expiryDate,
        startDate,
        altEmails: cleanAlts,
        defaultEmail: finalDefaultEmail,
        maxBranches,
        maxStudents,
        maxStorage,
        maxFileSize
      });
      setSuccessMsg(`Tenant "${name}" settings updated successfully!`);
    } else {
      // Create mode
      addTenant(
        name, 
        ownerName, 
        email, 
        mobile, 
        plan,
        expiryDate,
        address,
        gstNo,
        maxBranches,
        maxStudents,
        maxStorage,
        maxFileSize,
        startDate,
        cleanAlts,
        finalDefaultEmail
      );
      
      const alternateEmailInfo = cleanAlts.length > 0 ? ` | Alt Emails: ${cleanAlts.join(', ')}` : '';
      const gstInfo = gstNo ? ` | GSTIN: ${gstNo}` : '';
      setSuccessMsg(`New Institute Tenant configured! Admin Email: ${email}${alternateEmailInfo} | Default Login: ${finalDefaultEmail} | Password: ${defaultPassword}${gstInfo}`);
    }
    
    // Reset form
    setName('');
    setAddress('');
    setGstNo('');
    setOwnerName('');
    setEmail('');
    setMobile('');
    setPlan('Growth Plan');
    setLogoUploaded(false);
    setAltEmails([]);
    setDefaultEmailIdx(-1);
    setEditingTenantId(null);
    
    setShowAddModal(false);
    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
      setSuccessMsg('');
    }, 8000);
  };

  return (
    <div className="space-y-6">
      {showSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMsg}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Tenant Institutes Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Provision new coaching center workspaces, set allowed limits, and manage billing statuses.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddModal}>
          <Plus size={16} /> Create Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Tenant Registry</CardTitle>
        </CardHeader>
        <Table headers={['Tenant ID', 'Institute Name', 'Owner', 'Email / Contact', 'Plan Tier', 'Start Date', 'Expiry Date', 'Status', 'Actions']}>
          {tenants.map((t, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-mono font-bold text-xs">{t.id}</td>
              <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
              <td className="px-6 py-4 text-xs font-semibold text-slate-700">{t.ownerName}</td>
              <td className="px-6 py-4">
                <div className="text-slate-800 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold">{t.defaultEmail || t.email}</span>
                  <span className="bg-blue-50 text-blue-600 border border-blue-150 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center shadow-sm">
                    Login
                  </span>
                </div>
                {t.defaultEmail && t.defaultEmail !== t.email && (
                  <div className="text-[10px] text-slate-500 mt-0.5">Primary: {t.email}</div>
                )}
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.mobile}</div>
              </td>
              <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{t.plan}</span></td>
              <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">{formatDate(t.startDate || '2026-04-15')}</td>
              <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">{formatDate(t.renewalDate)}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${t.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {t.status}
                </span>
              </td>
              <td className="px-6 py-4">
                  <button
                     onClick={() => { setViewingTenant(t); setManageTab('profile'); setShowViewModal(true); }}
                     className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    Manage
                  </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Create / Edit Tenant Modal with Wide landscape 3xl Layout */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title={editingTenantId ? `Edit Tenant Settings: ${name}` : "Register Institute Tenant"} 
        size="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Institute Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5 select-none">
              <span>01.</span> Institute Profile & Branding
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Institute / Coaching Name" 
                required 
                placeholder="e.g. Apex IIT Academy" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
              <Input 
                label="GSTIN Number" 
                placeholder="e.g. 27AAAAA0000A1Z5" 
                value={gstNo} 
                onChange={(e) => setGstNo(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <Input 
                label="Institute Physical Address" 
                placeholder="e.g. 401, Western Express Highway, Mumbai" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
              
              {/* Logo upload field with actual file picker triggers */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Brand Logo File</label>
                <input 
                  type="file" 
                  id="logo-file-input" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleLogoChange} 
                />
                <label 
                  htmlFor="logo-file-input"
                  className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-50/50 ${
                    logoUploaded ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200 hover:border-blue-500'
                  }`}
                  style={{ height: '38px' }}
                >
                  {logoUploaded ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm animate-fade-in">
                        {name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'VS'}
                      </div>
                      <span className="text-xs font-bold text-emerald-800 truncate">✓ Brand logo attached successfully</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Upload size={14} className="text-slate-400 animate-pulse" />
                      <span className="text-xs font-semibold text-slate-700">Click to upload logo (JPG/PNG up to 2MB)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Institute Admin Credentials */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              <span>02.</span> Institute Admin Credentials
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Admin Username / Name" 
                required 
                placeholder="Dr. Ramesh Kumar (or admin_apex)" 
                value={ownerName} 
                onChange={(e) => setOwnerName(e.target.value)} 
              />
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex justify-between items-center select-none">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Admin Email Login
                  </label>
                  <button
                    type="button"
                    onClick={() => setDefaultEmailIdx(-1)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      defaultEmailIdx === -1 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {defaultEmailIdx === -1 ? '★ Default Login' : 'Set as Default'}
                  </button>
                </div>
                <input
                  type="email"
                  required
                  placeholder="ramesh@apex.com"
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Alternate Emails Lists */}
            <div className="space-y-3">
              <div className="flex justify-between items-center select-none">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Alternate Email Addresses
                </span>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                  onClick={handleAddAltEmail}
                >
                  <Plus size={12} /> Add Alternate
                </Button>
              </div>
              
              {altEmails.length > 0 && (
                <div className="space-y-3 animate-fade-in pt-1">
                  {altEmails.map((emailVal, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Alternate Email #{idx + 1}
                          </label>
                          <button
                            type="button"
                            onClick={() => setDefaultEmailIdx(idx)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              defaultEmailIdx === idx 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {defaultEmailIdx === idx ? '★ Default Login' : 'Set as Default'}
                          </button>
                        </div>
                        <input
                          type="email"
                          required
                          placeholder={`alternate-${idx + 1}@apex.com`}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
                          value={emailVal}
                          onChange={(e) => handleUpdateAltEmail(idx, e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAltEmail(idx)}
                        className="p-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors shadow-sm self-end"
                        style={{ height: '38px', width: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <Input 
                label="Mobile Contact" 
                placeholder="9876543210" 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value)} 
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Default Password (Auto Generated)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    className="flex-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm font-mono select-all outline-none"
                    value={defaultPassword}
                  />
                  {!editingTenantId && (
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => {
                        const newPass = 'VS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                        setDefaultPassword(newPass);
                      }}
                    >
                      Regen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Subscription Plan */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              <span>03.</span> Subscription Plan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                label="Subscription Tier" 
                value={plan} 
                onChange={(e) => setPlan(e.target.value)} 
                options={[
                  { value: 'Growth Plan', label: 'Growth Plan (Rs. 15,000/mo)' },
                  { value: 'Pro Enterprise', label: 'Pro Enterprise (Rs. 30,000/mo)' },
                  { value: 'Starter Trial', label: 'Starter Trial (Free)' }
                ]} 
              />
              <Input 
                label="Start Date" 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expiration Date (Auto Calculated)</label>
                <input 
                  type="date" 
                  readOnly 
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-lg px-3 py-2 text-sm font-semibold select-none cursor-not-allowed outline-none"
                  value={expiryDate} 
                />
              </div>
            </div>
          </div>

          {/* Section 4: Resource Limits */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
              <span>04.</span> Resource Limits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Maximum Branches" 
                type="number" 
                required 
                value={maxBranches} 
                onChange={(e) => setMaxBranches(e.target.value)} 
              />
              <Input 
                label="Maximum Students Capacity" 
                type="number" 
                required 
                value={maxStudents} 
                onChange={(e) => setMaxStudents(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                label="Allocated Cloud Storage" 
                value={maxStorage} 
                onChange={(e) => setMaxStorage(e.target.value)} 
                options={[
                  { value: '5 GB', label: '5 GB (Starter)' },
                  { value: '20 GB', label: '20 GB (Standard)' },
                  { value: '100 GB', label: '100 GB (Enterprise)' },
                  { value: '500 GB', label: '500 GB (Enterprise Plus)' }
                ]} 
              />
              <Select 
                label="Maximum File Upload Size" 
                value={maxFileSize} 
                onChange={(e) => setMaxFileSize(e.target.value)} 
                options={[
                  { value: '5 MB', label: '5 MB (Basic docs)' },
                  { value: '20 MB', label: '20 MB (Standard attachments)' },
                  { value: '50 MB', label: '50 MB (High Quality PDFs)' },
                  { value: '200 MB', label: '200 MB (Lecture recordings)' }
                ]} 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editingTenantId ? "Save Changes" : "Provision Tenant"}</Button>
          </div>
        </form>
      </Modal>

      {/* Manage Tenant Details Modal */}
      {showViewModal && viewingTenant && (
        <Modal 
          isOpen={showViewModal} 
          onClose={() => { setShowViewModal(false); setViewingTenant(null); }} 
          title={`Manage Tenant: ${viewingTenant.name}`}
          size="4xl"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-150 p-4 rounded-xl shadow-inner">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow flex-shrink-0">
                {viewingTenant.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-slate-900 truncate">{viewingTenant.name}</h4>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Tenant ID: {viewingTenant.id}</div>
              </div>
              <div className="flex items-center gap-3 select-none flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  viewingTenant.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {viewingTenant.status}
                </span>
                <span className="text-[10px] text-slate-550 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full uppercase">
                  {viewingTenant.plan}
                </span>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 gap-1 flex-wrap">
              {[
                { id: 'profile', label: 'General & Admin' },
                { id: 'billing', label: 'Plan & Subscription' },
                { id: 'limits', label: 'Resource Limits' },
                { id: 'payments', label: 'Payment & Invoice History' },
                { id: 'status', label: 'SaaS Status Actions' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setManageTab(t.id as any)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    manageTab === t.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="min-h-[220px]">
              {manageTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Institute Profile</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block">GSTIN Registration:</span>
                        <span className="font-semibold text-slate-800">{viewingTenant.gstNo || '27AAAAA0000A1Z5'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block">Physical Address:</span>
                        <span className="font-semibold text-slate-800 text-xs block mt-0.5">{viewingTenant.address || '401, Western Express Highway, Mumbai'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Admin Account</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block">Admin Username:</span>
                        <span className="font-semibold text-slate-800">{viewingTenant.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block">Admin Email Login:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-slate-800 font-mono text-xs">{viewingTenant.email}</span>
                          {(!viewingTenant.defaultEmail || viewingTenant.defaultEmail === viewingTenant.email) && (
                            <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold px-1.5 py-0.2 rounded shadow-sm">
                              ★ Default Login
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-semibold block">Mobile Contact:</span>
                        <span className="font-semibold text-slate-800 font-mono text-xs">{viewingTenant.mobile}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {manageTab === 'billing' && (
                <div className="space-y-4 text-sm">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Billing Lifecycle &amp; Subscription Terms</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Plan Template:</span>
                      <span className="font-semibold text-slate-800">{viewingTenant.plan}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Start Date:</span>
                      <span className="font-semibold text-slate-800">{formatDate(viewingTenant.startDate || '2026-04-15')}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">Expiration Date:</span>
                      <span className="font-semibold text-slate-800">{formatDate(viewingTenant.renewalDate)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500">
                    ℹ Terms and renewal actions can be configured on the <strong>Tenant Subscriptions</strong> tab under Subscription Management.
                  </div>
                </div>
              )}

              {manageTab === 'limits' && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Scalability Boundaries &amp; Resource Allotments</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Max Branches</span>
                      <span className="text-xl font-bold text-slate-800 block mt-1">{viewingTenant.maxBranches || '5'}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Max Students</span>
                      <span className="text-xl font-bold text-slate-800 block mt-1">{viewingTenant.maxStudents || '1000'}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Cloud Storage</span>
                      <span className="text-xl font-bold text-slate-800 block mt-1">{viewingTenant.maxStorage || '20 GB'}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Max File Size</span>
                      <span className="text-xl font-bold text-slate-800 block mt-1">{viewingTenant.maxFileSize || '20 MB'}</span>
                    </div>
                  </div>
                </div>
              )}

              {manageTab === 'payments' && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Payment &amp; Invoice History</h5>
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                          <th className="px-4 py-3">Invoice ID</th>
                          <th className="px-4 py-3">Billing Cycle</th>
                          <th className="px-4 py-3">Paid Date</th>
                          <th className="px-4 py-3">Amount Paid</th>
                          <th className="px-4 py-3">Gateway Reference</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {[
                          { id: 'INV-2026-081', plan: viewingTenant.plan, date: formatDate(viewingTenant.startDate || '2026-04-15'), amt: '₹15,000 + GST', ref: 'pay_RZP98425102', status: 'Settled' },
                          { id: 'INV-2026-015', plan: viewingTenant.plan, date: '15-01-2026', amt: '₹15,000 + GST', ref: 'pay_RZP88125412', status: 'Settled' }
                        ].map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-bold text-slate-600">{inv.id}</td>
                            <td className="px-4 py-3 font-semibold">{inv.plan}</td>
                            <td className="px-4 py-3 font-mono">{inv.date}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{inv.amt}</td>
                            <td className="px-4 py-3 font-mono text-slate-400">{inv.ref}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {manageTab === 'status' && (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Active Status Suspensions / Activations</h5>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="flex-1">
                      <h6 className="text-xs font-bold text-slate-800">Current Status: {viewingTenant.status}</h6>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Suspending a tenant prevents their staff, teachers, and students from accessing their portals immediately.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        toggleTenantStatus(viewingTenant.id);
                        // Toggle local state to sync layout immediately
                        setViewingTenant((prev: any) => ({ ...prev, status: prev.status === 'Active' ? 'Suspended' : 'Active' }));
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 border rounded-xl cursor-pointer transition-colors shadow-sm ${
                        viewingTenant.status === 'Active'
                          ? 'border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50'
                      }`}
                    >
                      {viewingTenant.status === 'Active' ? 'Suspend Access' : 'Activate Access'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { setShowViewModal(false); setViewingTenant(null); }}>
                Dismiss
              </Button>
              <Button variant="primary" style={{ gap: '6px' }} onClick={() => handleOpenEditModal(viewingTenant)}>
                <Edit size={14} /> Edit Tenant Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
