import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Upload, Trash, ArrowLeft } from 'lucide-react';
import { formatDate } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

export const TenantsManager: React.FC<{ initialOpenCreate?: boolean }> = ({ initialOpenCreate }) => {
  const { tenants, addTenant, updateTenant } = useApp();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');

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

  const filteredAndSortedTenants = tenants
    .filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPlan = filterPlan === 'All' || t.plan === filterPlan;
      const matchStatus = filterStatus === 'All' || t.status === filterStatus;
      return matchSearch && matchPlan && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      if (sortBy === 'startDate') return (a.startDate || '').localeCompare(b.startDate || '');
      return 0;
    });

  const handleExportCSV = () => {
    if (filteredAndSortedTenants.length === 0) return;
    
    const dataToExport = filteredAndSortedTenants.map(t => ({
      'Tenant ID': t.id,
      'Institute Name': t.name,
      'Owner': t.ownerName,
      'Email': t.email,
      'Mobile': t.mobile,
      'Status': t.status,
      'Plan Tier': t.plan,
      'Start Date': t.startDate || '',
      'Renewal Date': t.renewalDate || '',
      'Branch Count': t.branchCount,
      'Student Count': t.studentCount,
      'Address': t.address || '123 Educational Way, Block C, New Delhi',
      'GST Number': t.gstNo || '07AAAAA1111A1Z1',
      'Max Branches Limit': t.maxBranches || '10',
      'Max Students Limit': t.maxStudents || '500',
      'Max Storage Limit': t.maxStorage || '20 GB',
      'Max File Size Limit': t.maxFileSize || '10 MB',
      'Default Email': t.defaultEmail || t.email,
      'Alternative Emails': (t.altEmails || []).join('; ')
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
    link.setAttribute("download", "institutes_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showAddModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer animate-fade-in"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingTenantId ? `Edit Tenant Settings: ${name}` : "Register Institute Tenant"}
            </h2>
            <p className="text-sm text-slate-500">
              Configure profile fields, admin account logins, alternative emails, and system limits.
            </p>
          </div>
        </div>

        <div className="w-full">
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
        </div>
      </div>
    );
  }

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

      {/* Search, Filter, Sort Controls & Export CSV */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full items-end">
          <Input 
            placeholder="Search by ID, name, owner..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <Select 
            label="Plan Tier" 
            value={filterPlan} 
            onChange={(e) => setFilterPlan(e.target.value)} 
            options={[
              { value: 'All', label: 'All Plans' },
              { value: 'Basic Plan', label: 'Basic Plan' },
              { value: 'Growth Plan', label: 'Growth Plan' },
              { value: 'Enterprise Plan', label: 'Enterprise Plan' }
            ]} 
          />
          <Select 
            label="Status" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'Suspended', label: 'Suspended' }
            ]} 
          />
          <Select 
            label="Sort By" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            options={[
              { value: 'name', label: 'Institute Name' },
              { value: 'id', label: 'Tenant ID' },
              { value: 'startDate', label: 'Start Date' }
            ]} 
          />
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Tenant Registry</CardTitle>
        </CardHeader>
        <Table headers={['Tenant ID', 'Institute Name', 'Owner', 'Email / Contact', 'Plan Tier', 'Start Date', 'Expiry Date', 'Status']}>
          {(() => {
            const itemsPerPage = 3;
            const paginatedTenants = filteredAndSortedTenants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
              <>
                {paginatedTenants.map((t, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => navigate(`/tenants/${t.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
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
                        <div className="text-[10px] text-slate-550 mt-0.5">Primary: {t.email}</div>
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
                  </tr>
                ))}
              </>
            );
          })()}
        </Table>
        {(() => {
          const itemsPerPage = 3;
          const totalPages = Math.ceil(filteredAndSortedTenants.length / itemsPerPage);
          if (totalPages <= 1) return null;
          return (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 shadow-sm select-none">
              <div>
                Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedTenants.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, filteredAndSortedTenants.length)}</span> of <span className="text-slate-855 font-bold">{filteredAndSortedTenants.length}</span> tenants
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                      currentPage === i + 1
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </Card>    </div>
  );
};
