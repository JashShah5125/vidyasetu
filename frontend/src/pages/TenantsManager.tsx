import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { tenantService } from '../services/tenantService';
import { planService } from '../services/planService';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, Upload, Trash, ArrowLeft, X, Image as ImageIcon } from 'lucide-react';
import { formatDate, getTenantStatus } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

export const TenantsManager: React.FC<{ initialOpenCreate?: boolean }> = ({ initialOpenCreate }) => {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      // Map frontend filters to backend expectations
      let statusFilter = '';
      if (filterStatus === 'Active') statusFilter = 'active';
      else if (filterStatus === 'Suspended') statusFilter = 'suspended';

      const result = await tenantService.getTenants({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: statusFilter,
        plan: filterPlan !== 'All' ? filterPlan : undefined
      });
      setTenants(result.data || []);
      setTotalItems(result.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [currentPage, searchTerm, filterStatus, filterPlan]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await planService.getPlans(['Active']);
        setAvailablePlans(res.data || []);
      } catch (e) {
        console.error('Failed to fetch plans', e);
      }
    };
    fetchPlans();
  }, []);

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
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [panNo, setPanNo] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [billingCycle, setBillingCycle] = useState('annual');
  const [customSlug, setCustomSlug] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [plan, setPlan] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Commercial states
  const [discount, setDiscount] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [tax, setTax] = useState('18');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Override limit states
  const [ovMaxBranches, setOvMaxBranches] = useState('');
  const [ovMaxStaffUsers, setOvMaxStaffUsers] = useState('');
  const [ovMaxStudents, setOvMaxStudents] = useState('');
  const [ovMaxParents, setOvMaxParents] = useState('');
  const [ovMaxTeachers, setOvMaxTeachers] = useState('');
  const [ovMaxStorage, setOvMaxStorage] = useState('');
  const [ovMaxFileSize, setOvMaxFileSize] = useState('');
  const [ovMaxSmsCredits, setOvMaxSmsCredits] = useState('');
  const [ovMaxWhatsappMsgs, setOvMaxWhatsappMsgs] = useState('');

  // Alternate email lists states
  const [altEmails, setAltEmails] = useState<string[]>([]);
  const [defaultEmailIdx, setDefaultEmailIdx] = useState<number>(-1);
  


  const [showSaved, setShowSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const autoFinalPrice = () => {
    let base = 0;
    if (plan === 'Growth Plan') {
      base = billingCycle === 'annual' ? 15000 * 12 : 15000;
    } else if (plan === 'Pro Enterprise') {
      base = billingCycle === 'annual' ? 30000 * 12 : 30000;
    }
    const d = parseFloat(discount) || 0;
    return Math.round(base - (base * d / 100)).toString();
  };

  const handleOpenAddModal = () => {
    setEditingTenantId(null);
    
    setDefaultPassword('Generated securely after submission');
    
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setPincode('');
    setPanNo('');
    setTimezone('Asia/Kolkata');
    setBillingCycle('annual');
    setCustomSlug('');
    setGstNo('');
    setOwnerName('');
    setEmail('');
    setMobile('');
    setPlan(availablePlans.length > 0 ? availablePlans[0].id.toString() : '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setLogoUploaded(false);
    setLogoFile(null);
    setLogoPreview(null);
    setUploadProgress(0);
    setIsUploading(false);
    setAltEmails([]);
    setDefaultEmailIdx(-1);

    setDiscount('');
    setFinalPrice('');
    setTax('18');
    setInvoiceNumber('');
    setOvMaxBranches('');
    setOvMaxStaffUsers('');
    setOvMaxStudents('');
    setOvMaxParents('');
    setOvMaxTeachers('');
    setOvMaxStorage('');
    setOvMaxFileSize('');
    setOvMaxSmsCredits('');
    setOvMaxWhatsappMsgs('');

    setShowSaved(false);
    setErrorMsg('');
    
    setShowAddModal(true);
    setTimeout(() => {
      document.getElementById('tenant-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleEditTenant = (t: any) => {
    setEditingTenantId(t.id);
    setName(t.name || '');
    setCustomSlug(t.slug || '');
    setGstNo(t.gst_number || '');
    setPanNo(t.pan_number || '');
    setAddress(t.address_line1 || '');
    setCity(t.city || '');
    setState(t.state || '');
    setPincode(t.pincode || '');
    setTimezone(t.timezone || 'Asia/Kolkata');
    setBillingCycle(t.billing_cycle || 'annual');
    setOwnerName(t.owner_name || t.legal_name || t.admin_name || '');
    setEmail(t.primary_email || t.contact_email || t.admin_email || '');
    setMobile(t.owner_mobile || t.contact_phone || '');
    setPlan(t.plan_id ? String(t.plan_id) : (t.planId ? String(t.planId) : (availablePlans.length > 0 ? availablePlans[0].id.toString() : '')));
    setStartDate(t.created_at ? t.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    setLogoUploaded(!!t.logo_url);
    setLogoFile(null);
    setLogoPreview(t.logo_url || null);
    setDefaultPassword('********'); // Placeholder for edit mode

    // Parse alternate emails if any
    if (t.alternate_emails) {
      try {
        const alts = typeof t.alternate_emails === 'string' ? JSON.parse(t.alternate_emails) : t.alternate_emails;
        setAltEmails(Array.isArray(alts) ? alts : []);
      } catch (e) {
        setAltEmails([]);
      }
    } else {
      setAltEmails([]);
    }
    
    setDefaultEmailIdx(-1);
    
    setDiscount(t.subscription_discount !== null ? String(t.subscription_discount) : '');
    setFinalPrice(t.subscription_final_price !== null ? String(t.subscription_final_price) : '');
    setTax(t.subscription_tax !== null ? String(t.subscription_tax) : '18');
    setInvoiceNumber(t.subscription_invoice_number || '');
    setOvMaxBranches(t.override_max_branches !== null ? String(t.override_max_branches) : '');
    setOvMaxStaffUsers(t.override_max_staff_users !== null ? String(t.override_max_staff_users) : '');
    setOvMaxStudents(t.override_max_students !== null ? String(t.override_max_students) : '');
    setOvMaxParents(t.override_max_parents !== null ? String(t.override_max_parents) : '');
    setOvMaxTeachers(t.override_max_teachers !== null ? String(t.override_max_teachers) : '');
    setOvMaxStorage(t.override_max_storage || '');
    setOvMaxFileSize(t.override_max_file_size || '');
    setOvMaxSmsCredits(t.override_max_sms_credits !== null ? String(t.override_max_sms_credits) : '');
    setOvMaxWhatsappMsgs(t.override_max_whatsapp_msgs !== null ? String(t.override_max_whatsapp_msgs) : '');
    
    setShowAddModal(true);
    setTimeout(() => {
      document.getElementById('tenant-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
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
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        alert("Invalid file format! Only JPG, PNG, and SVG are allowed.");
        e.target.value = '';
        return;
      }
      if (file.size > 500 * 1024) {
        alert("File size exceeds 500KB. Please upload a smaller image.");
        e.target.value = ''; // Reset the input
        return;
      }
      setLogoUploaded(true);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerName || !email) return;
    
    const cleanAlts = altEmails.filter(Boolean);
    
    const currentPrimaryEmail = email.trim();
    const selectedAlternateEmail = defaultEmailIdx >= 0 ? altEmails[defaultEmailIdx]?.trim() : '';
    const finalDefaultEmail = selectedAlternateEmail || currentPrimaryEmail;
    const alternateEmailsForSave = Array.from(new Set([
      ...cleanAlts.filter(value => value !== finalDefaultEmail),
      ...(finalDefaultEmail !== currentPrimaryEmail ? [currentPrimaryEmail] : [])
    ]));
    
    // Auto-generate slug from name
    const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const finalSlug = customSlug.trim() || generatedSlug;

    // Data Validation Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[0-9]{10}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const pincodeRegex = /^[0-9]{6}$/;
    const slugRegex = /^[a-z0-9-]+$/;

    if (!slugRegex.test(finalSlug)) {
        alert("Invalid format: Custom URL Subdomain can only contain lowercase letters, numbers, and hyphens.");
        return;
    }
    if (!emailRegex.test(email)) {
        alert("Invalid format: Admin Email is incorrectly formatted.");
        return;
    }
    if (mobile && !mobileRegex.test(mobile)) {
        alert("Invalid format: Mobile Number must be exactly 10 digits.");
        return;
    }
    if (panNo && !panRegex.test(panNo.toUpperCase())) {
        alert("Invalid format: PAN Number must be 10 alphanumeric characters (e.g., ABCDE1234F).");
        return;
    }
    if (gstNo && !gstRegex.test(gstNo.toUpperCase())) {
        alert("Invalid format: GSTIN is incorrectly formatted.");
        return;
    }
    if (pincode && !pincodeRegex.test(pincode)) {
        alert("Invalid format: Pincode must be exactly 6 digits.");
        return;
    }

    // Map plan to planId
    let planId = plan;

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('legal_name', ownerName);
        formData.append('slug', finalSlug);
        formData.append('adminEmail', finalDefaultEmail);
        if (planId) formData.append('planId', String(planId));
        if (address) formData.append('address', address);
        if (city) formData.append('city', city);
        if (state) formData.append('state', state);
        if (pincode) formData.append('pincode', pincode);
        if (panNo) formData.append('panNo', panNo);
        if (gstNo) formData.append('gstNo', gstNo);
        if (mobile) formData.append('mobile', mobile);
        if (timezone) formData.append('timezone', timezone);
        if (billingCycle) formData.append('billingCycle', billingCycle);
        if (logoFile) {
            formData.append('logo', logoFile);
        } else if (!logoPreview && editingTenantId) {
            formData.append('removeLogo', 'true');
        }
        formData.append('alternate_emails', JSON.stringify(alternateEmailsForSave));

        if (discount) formData.append('discount', discount);
        if (finalPrice) formData.append('finalPrice', finalPrice);
        if (tax) formData.append('tax', tax);
        if (invoiceNumber) formData.append('invoiceNumber', invoiceNumber);
        if (ovMaxBranches) formData.append('maxBranches', ovMaxBranches);
        if (ovMaxStaffUsers) formData.append('maxStaffUsers', ovMaxStaffUsers);
        if (ovMaxStudents) formData.append('maxStudents', ovMaxStudents);
        if (ovMaxParents) formData.append('maxParents', ovMaxParents);
        if (ovMaxTeachers) formData.append('maxTeachers', ovMaxTeachers);
        if (ovMaxStorage) formData.append('maxStorage', ovMaxStorage);
        if (ovMaxFileSize) formData.append('maxFileSize', ovMaxFileSize);
        if (ovMaxSmsCredits) formData.append('maxSmsCredits', ovMaxSmsCredits);
        if (ovMaxWhatsappMsgs) formData.append('maxWhatsappMsgs', ovMaxWhatsappMsgs);

        setIsUploading(true);
        setUploadProgress(0);

        const onProgress = (progressEvent: any) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        };

        if (editingTenantId) {
          // Edit mode using real backend
          await tenantService.updateTenant(editingTenantId.toString(), formData, onProgress);
          setSuccessMsg(`Tenant "${name}" settings updated successfully!`);
          addToast(`Tenant "${name}" settings updated successfully!`, 'success');
        } else {
          // Create mode using real backend
          const result = await tenantService.createTenant(formData, onProgress);
          const emailStatus = result?.data?.welcomeEmailSent
            ? ' Welcome email sent.'
            : ' Tenant created, but the welcome email could not be sent.';
          setSuccessMsg(`Tenant "${name}" created successfully.${emailStatus}`);
          addToast(
            result?.data?.welcomeEmailSent
              ? `Tenant "${name}" created successfully. Welcome email sent.`
              : `Tenant "${name}" created, but the welcome email could not be sent.`,
            result?.data?.welcomeEmailSent ? 'success' : 'warning'
          );
        }
        
        setIsUploading(false);
        fetchTenants();
      
      // Reset form
      setName('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setPanNo('');
      setTimezone('Asia/Kolkata');
      setBillingCycle('annual');
      setCustomSlug('');
      setGstNo('');
      setOwnerName('');
      setEmail('');
      setMobile('');
      setPlan(availablePlans.length > 0 ? availablePlans[0].id.toString() : '');
      setLogoUploaded(false);
      setLogoFile(null);
      setAltEmails([]);
      setDefaultEmailIdx(-1);
      setEditingTenantId(null);
      
      setShowAddModal(false);
      setShowSaved(true);
      setTimeout(() => {
        setShowSaved(false);
        setSuccessMsg('');
      }, 8000);
    } catch (error: any) {
      console.error('Failed to save tenant:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to save tenant. Please check your inputs and try again.');
      setIsUploading(false);
    }
  };

  // With server-side pagination, 'tenants' is already the current page of items
  const filteredAndSortedTenants = tenants;

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
      <div id="tenant-form-top" className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer animate-fade-in"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {editingTenantId ? `Edit Tenant Settings: ${name}` : "Register Institute Tenant"}
            </h2>
            <p className="text-base text-slate-500 mt-1">
              Configure profile fields, admin account logins, alternative emails, and system limits.
            </p>
          </div>
        </div>

        <div className="w-full">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 shadow-sm animate-fade-in flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">!</span>
              <div>{errorMsg}</div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Institute Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5 select-none">
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
                  label="Custom URL Subdomain (Optional)" 
                  placeholder="e.g. apex-academy" 
                  value={customSlug} 
                  onChange={(e) => setCustomSlug(e.target.value)} 
                />
              </div>


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mt-6">
                
                {/* Left Column: Logo Upload */}
                <div className="flex flex-col gap-1.5 w-full md:w-3/4 mx-auto lg:w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Brand Logo File</label>
                  <div className="flex flex-col gap-1.5 w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm justify-start items-center">
                    <div className="text-center mb-4 mt-2 w-full">
                       <h3 className="text-lg font-bold text-slate-900">{logoPreview ? (isUploading ? 'Uploading...' : 'File Uploaded') : 'File Upload'}</h3>
                       <p className="text-xs text-slate-500 font-semibold">{logoPreview ? (isUploading ? 'It may take a while. Please wait.' : 'Ready to submit') : 'Select and upload your file.'}</p>
                    </div>
                    <input 
                      type="file" 
                      id="logo-file-input" 
                      accept=".jpg,.jpeg,.png,.svg" 
                      className="hidden" 
                      onChange={handleLogoChange} 
                    />
                    {logoPreview ? (
                        <div className="flex flex-col items-center w-full mb-2">
                           <div className="w-full aspect-square max-w-[280px] flex flex-col relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                               {!isUploading && (
                                 <button type="button" onClick={(e) => { e.preventDefault(); setLogoFile(null); setLogoPreview(null); setLogoUploaded(false); }} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-slate-500 hover:text-red-500 hover:bg-white shadow-sm transition-colors z-10">
                                    <X size={14} />
                                 </button>
                               )}
                               <div className="w-full flex-1 bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
                                   <img src={logoPreview} alt="preview" className="max-w-full max-h-[160px] object-contain drop-shadow-sm mb-4" />
                                   
                                   {/* Progress inside the square boundary */}
                                   <div className="w-full flex flex-col gap-2 mt-auto">
                                       <div className="flex justify-between items-center w-full">
                                          <div className="flex flex-col overflow-hidden pr-2 text-left">
                                            <span className="text-xs font-bold text-slate-700 truncate">
                                              {logoFile?.name || (logoPreview ? logoPreview.split('/').pop() : 'logo.png')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                              {logoFile ? (logoFile.size / 1024 / 1024).toFixed(2) + ' MB' : 'Uploaded File'}
                                            </span>
                                          </div>
                                       </div>
                                       <div className="flex flex-col gap-1 w-full">
                                         <div className="w-full bg-slate-200 rounded-full h-1.5">
                                           <div className={`h-1.5 rounded-full transition-all duration-300 ${isUploading ? 'bg-blue-600' : 'bg-emerald-500'}`} style={{ width: `${isUploading ? uploadProgress : 100}%` }}></div>
                                         </div>
                                         <div className="flex justify-between items-center text-[9px] font-bold">
                                           <span className={isUploading ? 'text-slate-500' : 'text-emerald-600'}>
                                             {isUploading ? `${uploadProgress}% done` : '✓ Done'}
                                           </span>
                                           {isUploading && (
                                             <span className="text-slate-400">Uploading...</span>
                                           )}
                                         </div>
                                       </div>
                                   </div>
                               </div>
                           </div>
                           
                           {isUploading && (
                             <div className="mt-4 flex justify-center w-full max-w-[280px]">
                               <button type="button" className="px-6 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors w-full">Cancel</button>
                             </div>
                           )}
                        </div>
                    ) : (
                       <label htmlFor="logo-file-input" className="flex flex-col items-center justify-center aspect-square w-full max-w-[280px] p-8 gap-5 bg-[#F8F9FA] border-[2px] border-dashed border-[#D1D5DB] rounded-2xl cursor-pointer hover:border-blue-500 transition-colors mb-2">
                          <ImageIcon size={32} className="text-slate-400" />
                          <div className="flex flex-col items-center gap-1">
                             <span className="text-[14px] font-bold text-slate-600 text-center">Drag files to upload</span>
                             <span className="text-[11px] font-semibold text-slate-400 text-center">or</span>
                          </div>
                          <div className="bg-blue-600 text-white text-[13px] font-bold py-2.5 px-8 rounded-lg shadow-sm hover:bg-blue-700 transition-colors w-full text-center mt-2">
                            Browse file
                          </div>
                       </label>
                    )}
                  </div>
                </div>

                {/* Right Column: Location & Settings */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 items-start">
                    <Input 
                      label="Address Line 1" 
                      placeholder="e.g. 401, Western Express Highway, Mumbai" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="GSTIN Number" 
                      placeholder="e.g. 27AAAAA0000A1Z5" 
                      value={gstNo} 
                      onChange={(e) => setGstNo(e.target.value)} 
                    />
                    <Input 
                      label="PAN Number" 
                      placeholder="e.g. ABCDE1234F" 
                      value={panNo} 
                      onChange={(e) => setPanNo(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="City" 
                      placeholder="e.g. Mumbai" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                    />
                    <Input 
                      label="State" 
                      placeholder="e.g. Maharashtra" 
                      value={state} 
                      onChange={(e) => setState(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Pincode" 
                      placeholder="e.g. 400001" 
                      value={pincode} 
                      onChange={(e) => setPincode(e.target.value)} 
                    />
                    <Select
                      label="Timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      options={[
                        { value: 'Asia/Kolkata', label: 'India (IST)' },
                        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
                        { value: 'Europe/London', label: 'London (GMT)' },
                        { value: 'America/New_York', label: 'New York (EST)' }
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Institute Admin Credentials */}
            <div className="space-y-4 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                <span>02.</span> Institute Admin Credentials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Owner / Primary Admin Name" 
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
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-3 py-2 text-base text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
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
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-3 py-2 text-base text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Temporary Password (Sent by Email)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly
                      className="flex-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-base font-semibold select-all outline-none"
                      value={editingTenantId ? defaultPassword : 'Generated securely after submission'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Subscription Plan */}
            <div className="space-y-4 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                <span>03.</span> Subscription Plan
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  label="Subscription Tier" 
                  value={plan} 
                  onChange={(e) => setPlan(e.target.value)} 
                  options={availablePlans.map((p) => ({ value: p.id.toString(), label: p.name }))}
                />
                <Select
                  label="Billing Cycle"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  options={[
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Half-Yearly', label: 'Half-Yearly' },
                    { value: 'Yearly', label: 'Yearly' },
                    { value: 'Lifetime', label: 'Lifetime' }
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
                    className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-base font-semibold select-none cursor-not-allowed outline-none"
                    value={expiryDate} 
                  />
                </div>
              </div>
            </div>

            {/* Section 03: Commercial */}
            <div className="space-y-4 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                <span>03.</span> Commercial
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input label="Discount %" type="number" min={0} max={100} placeholder="e.g. 10"
                    value={discount} onChange={e => { setDiscount(e.target.value); setFinalPrice(autoFinalPrice()); }} />
                </div>
                <div>
                  <Input label="Final Price" type="number" placeholder="Auto-calculated or override"
                    value={finalPrice || autoFinalPrice()} onChange={e => setFinalPrice(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Tax %" type="number" placeholder="e.g. 18" value={tax} onChange={e => setTax(e.target.value)} />
                <Input label="Invoice Number" placeholder="e.g. INV-2026-042" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
            </div>

            {/* Section 04: Override Limits */}
            <div className="space-y-4 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                <span>04.</span> Override Limits <span className="text-slate-400 font-normal normal-case tracking-normal text-xs ml-2">(leave blank to use plan defaults)</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Input label="Max Branches" type="number" placeholder="Plan default" value={ovMaxBranches} onChange={e => setOvMaxBranches(e.target.value)} />
                <Input label="Max Staff Users" type="number" placeholder="Plan default" value={ovMaxStaffUsers} onChange={e => setOvMaxStaffUsers(e.target.value)} />
                <Input label="Max Students" type="number" placeholder="Plan default" value={ovMaxStudents} onChange={e => setOvMaxStudents(e.target.value)} />
                <Input label="Max Parents" type="number" placeholder="Plan default" value={ovMaxParents} onChange={e => setOvMaxParents(e.target.value)} />
                <Input label="Max Teachers" type="number" placeholder="Plan default" value={ovMaxTeachers} onChange={e => setOvMaxTeachers(e.target.value)} />
                <Select label="Max Storage" value={ovMaxStorage} onChange={e => setOvMaxStorage(e.target.value)}
                  options={[{ value: '', label: 'Plan default' }, { value: '5 GB', label: '5 GB' }, { value: '20 GB', label: '20 GB' }, { value: '100 GB', label: '100 GB' }, { value: '500 GB', label: '500 GB' }]} />
                <Select label="Max File Size" value={ovMaxFileSize} onChange={e => setOvMaxFileSize(e.target.value)}
                  options={[{ value: '', label: 'Plan default' }, { value: '5 MB', label: '5 MB' }, { value: '20 MB', label: '20 MB' }, { value: '50 MB', label: '50 MB' }, { value: '200 MB', label: '200 MB' }]} />
                <Input label="Max SMS Credits" type="number" placeholder="Plan default" value={ovMaxSmsCredits} onChange={e => setOvMaxSmsCredits(e.target.value)} />
                <Input label="Max WhatsApp Msgs" type="number" placeholder="Plan default" value={ovMaxWhatsappMsgs} onChange={e => setOvMaxWhatsappMsgs(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isUploading}>
                {isUploading ? (editingTenantId ? 'Saving Changes...' : 'Creating Institute...') : (editingTenantId ? 'Save Changes' : 'Provision Tenant')}
              </Button>
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
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Tenant Institutes Directory</h2>
          <p className="text-base text-slate-500 mt-2">Provision new coaching center workspaces, set allowed limits, and manage billing statuses.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={handleOpenAddModal}>
          <Plus size={18} /> Create Tenant
        </Button>
      </div>

      {/* Search, Filter, Sort Controls & Export CSV */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full items-end">
          <Input label="Search" placeholder="Search by ID, name, owner..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            wrapperClassName="sm:col-span-2"
          />
          <Select 
            label="Plan" 
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            options={[
              { value: 'All', label: 'All Plans' },
              ...availablePlans.map((p) => ({ value: p.id.toString(), label: p.name }))
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
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Tenant Registry</CardTitle>
        </CardHeader>
        <Table dense headers={['ID', 'Institute Name', 'Owner', 'Email / Contact', 'Plan Tier', 'Start Date', 'Expiry Date', 'Status']}>
          {(() => {
            const itemsPerPage = 10; // Match backend limit
            const paginatedTenants = filteredAndSortedTenants;
            return (
              <>
                {paginatedTenants.map((t, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => handleEditTenant(t)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{t.id}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900 text-base min-w-[200px]">{t.name}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-800">{t.legal_name || t.admin_name || 'N/A'}</td>
                    <td className="px-3 py-3 min-w-[200px]">
                      <div className="text-slate-800 flex items-center gap-1.5 flex-wrap text-sm">
                        <span className="font-semibold break-all">{t.contact_email || t.admin_email || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.contact_phone || 'N/A'}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-sm font-medium">{t.plan_name || 'Standard'}</span></td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">{formatDate(t.created_at || '2026-04-15')}</td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">N/A</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {(() => {
                        const status = t.status || 'Unknown';
                        let badgeColors = 'bg-red-50 text-red-600';
                        if (status === 'active') {
                          badgeColors = 'bg-emerald-50 text-emerald-600';
                        } else if (status === 'suspended') {
                          badgeColors = 'bg-amber-50 text-amber-600';
                        }
                        return (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize ${badgeColors}`}>
                            {status}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </>
            );
          })()}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / 10)}
          totalItems={totalItems}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      </Card>    </div>
  );
};
