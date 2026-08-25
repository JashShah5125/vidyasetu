import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { planService } from '../services/planService';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Edit, ChevronRight, ChevronLeft, ArrowLeft, Check, Trash2 } from 'lucide-react';
import type { SubscriptionPlan, FeatureAccess, SupportConfig, BrandingConfig, IntegrationConfig } from '../types/saas';
import {
  DEFAULT_FEATURES, DEFAULT_SUPPORT, DEFAULT_BRANDING, DEFAULT_INTEGRATIONS
} from '../types/saas';
import { getPrimaryPlanPrice } from '../types/saas';

// ─── Helper: display -1 as "Unlimited" ─────────────────────────────────────
const displayLimit = (val: number) => val === -1 ? 'Unlimited' : val.toLocaleString();

// ─── Toggle Row component ───────────────────────────────────────────────────
const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
    <span className="text-sm text-slate-700 font-medium">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
);

const SectionHead: React.FC<{ n: string; title: string }> = ({ n, title }) => (
  <div className="mb-8 border-b border-slate-100 pb-4">
    <h4 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 text-sm">{n}</span>
      {title}
    </h4>
  </div>
);

// ─── Feature group ──────────────────────────────────────────────────────────
const FeatureGroup: React.FC<{
  title: string;
  items: { key: keyof FeatureAccess; label: string }[];
  features: FeatureAccess;
  onChange: (k: keyof FeatureAccess, v: boolean) => void;
}> = ({ title, items, features, onChange }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
    {items.map(({ key, label }) => (
      <ToggleRow key={key} label={label} checked={features[key]} onChange={v => onChange(key, v)} />
    ))}
  </div>
);

// ─── Steps ──────────────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Billing', 'Resource Limits', 'Features', 'Support', 'Branding', 'Integrations', 'Notes'];

export const SubscriptionPlans: React.FC = () => {
  const { tenants, addToast } = useApp();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('Active');

  const loadPlans = async (filter: string = statusFilter) => {
    try {
      setLoading(true);
      
      let statusesToFetch: string[] = [];
      if (filter === 'All') {
        statusesToFetch = ['Active', 'Inactive', 'Deleted'];
      } else {
        statusesToFetch = [filter];
      }

      const data = await planService.getPlans(statusesToFetch);
      if (data && data.data) setPlans(data.data);
    } catch (e) {
      addToast('Failed to load plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans(statusFilter);
  }, [statusFilter]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showUpdateExistingPrompt, setShowUpdateExistingPrompt] = useState(false);
  const [pendingEditFields, setPendingEditFields] = useState<Omit<SubscriptionPlan, 'id'> | null>(null);

  const [managingVisibilityPlan, setManagingVisibilityPlan] = useState<SubscriptionPlan | null>(null);
  const [visAll, setVisAll] = useState(true);
  const [visTenants, setVisTenants] = useState<string[]>([]);
  // Section 1
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [displayOrder, setDisplayOrder] = useState('');

  // Section 2
  const [monthlyPrice, setMonthlyPrice] = useState('0');
  const [quarterlyPrice, setQuarterlyPrice] = useState('0');
  const [halfYearlyPrice, setHalfYearlyPrice] = useState('0');
  const [yearlyPrice, setYearlyPrice] = useState('0');
  const [lifetimePrice, setLifetimePrice] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [trialDays, setTrialDays] = useState('0');
  const [setupFee, setSetupFee] = useState('0');
  const [autoRenewal, setAutoRenewal] = useState(false);

  // Section 3
  const [maxInstances, setMaxInstances] = useState('');
  const [maxBranches, setMaxBranches] = useState('');
  const [maxStaffUsers, setMaxStaffUsers] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [maxParents, setMaxParents] = useState('');
  const [maxTeachers, setMaxTeachers] = useState('');
  const [maxStorage, setMaxStorage] = useState('');
  const [maxFileSize, setMaxFileSize] = useState('');
  const [maxSmsCredits, setMaxSmsCredits] = useState('');
  const [maxWhatsappMsgs, setMaxWhatsappMsgs] = useState('');

  // Section 4–7
  const [features, setFeatures] = useState<FeatureAccess>({ ...DEFAULT_FEATURES });
  const [support, setSupport] = useState<SupportConfig>({ ...DEFAULT_SUPPORT });
  const [branding, setBranding] = useState<BrandingConfig>({ ...DEFAULT_BRANDING });
  const [integrations, setIntegrations] = useState<IntegrationConfig>({ ...DEFAULT_INTEGRATIONS });

  // Section 8
  const [notes, setNotes] = useState('');
  
  const topRef = React.useRef<HTMLDivElement>(null);


  // View
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedViewingPlan, setViewingPlan] = useState<SubscriptionPlan | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (showAddModal || showViewModal) {
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [showAddModal, showViewModal]);
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'features' | 'config' | 'notes'>('overview');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && plans.length > 0) {
      const plan = plans.find(p => p.id === viewId);
      if (plan) {
        setViewingPlan(plan);
        setShowViewModal(true);
      }
    } else {
      setShowViewModal(false);
      setViewingPlan(null);
    }
  }, [searchParams, plans]);

  const resetForm = () => {
    setCurrentStep(0);
    setName(''); setCode(''); setDescription(''); setStatus('Active'); setDisplayOrder('');
    setMonthlyPrice('0'); setQuarterlyPrice('0'); setHalfYearlyPrice('0');
    setYearlyPrice('0'); setLifetimePrice('0');
    setCurrency('INR');
    setTrialDays('0');
    setSetupFee('0');
    setAutoRenewal(false);
    setMaxInstances(''); setMaxBranches(''); setMaxStaffUsers(''); setMaxStudents('');
    setMaxParents(''); setMaxTeachers(''); setMaxStorage(''); setMaxFileSize('');
    setMaxSmsCredits(''); setMaxWhatsappMsgs('');
    setFeatures({ ...DEFAULT_FEATURES });
    setSupport({ ...DEFAULT_SUPPORT });
    setBranding({ ...DEFAULT_BRANDING });
    setIntegrations({ ...DEFAULT_INTEGRATIONS });
    setNotes('');
  };

  const populateForm = (p: SubscriptionPlan) => {
    setName(p.name); setCode(p.code); setDescription(p.description);
    setStatus(p.status); setDisplayOrder(p.displayOrder.toString());
    setMonthlyPrice((p.monthlyPrice || 0).toString());
    setQuarterlyPrice((p.quarterlyPrice || 0).toString());
    setHalfYearlyPrice((p.halfYearlyPrice || 0).toString());
    setYearlyPrice((p.yearlyPrice || 0).toString());
    setLifetimePrice((p.lifetimePrice || 0).toString());
    setCurrency(p.currency || 'INR');
    setTrialDays((p.trialDays || 0).toString());
    setSetupFee((p.setupFee || 0).toString());
    setAutoRenewal(p.autoRenewal || false);
    setMaxInstances(p.maxInstances.toString()); setMaxBranches(p.maxBranches.toString());
    setMaxStaffUsers(p.maxStaffUsers.toString()); setMaxStudents(p.maxStudents.toString());
    setMaxParents(p.maxParents.toString()); setMaxTeachers(p.maxTeachers.toString());
    setMaxStorage(p.maxStorage); setMaxFileSize(p.maxFileSize);
    setMaxSmsCredits(p.maxSmsCredits.toString());
    setMaxWhatsappMsgs(p.maxWhatsappMsgs.toString());
    setFeatures({ ...p.features }); setSupport({ ...p.support });
    setBranding({ ...p.branding }); setIntegrations({ ...p.integrations });
    setNotes(p.notes);
  };

  const buildPlanFields = (): Omit<SubscriptionPlan, 'id'> => {
    const existing = plans.find(p => p.id === editingPlanId);
    const visibleTo = existing ? existing.visibleTo : ['All'];

    return {
      name, code: code.toUpperCase().replace(/\s+/g, '-'), description, status,
      displayOrder: parseInt(displayOrder) || 1,
      monthlyPrice: parseFloat(monthlyPrice) || 0,
      quarterlyPrice: parseFloat(quarterlyPrice) || 0,
      halfYearlyPrice: parseFloat(halfYearlyPrice) || 0,
      yearlyPrice: parseFloat(yearlyPrice) || 0,
      lifetimePrice: parseFloat(lifetimePrice) || 0,
      currency,
      trialDays: parseInt(trialDays) || 0,
      setupFee: parseFloat(setupFee) || 0,
      autoRenewal,
      maxInstances: parseInt(maxInstances) || 1,
      maxBranches: parseInt(maxBranches) || 0,
      maxStaffUsers: parseInt(maxStaffUsers) || 0,
      maxStudents: parseInt(maxStudents) || 0,
      maxParents: parseInt(maxParents) || 0,
      maxTeachers: parseInt(maxTeachers) || 0,
      maxStorage: maxStorage || '5 GB', maxFileSize: maxFileSize || '5 MB',
      maxSmsCredits: parseInt(maxSmsCredits) || 0,
      maxWhatsappMsgs: parseInt(maxWhatsappMsgs) || 0,
      features, support, branding, integrations, notes,
      visibleTo
    };
  };

  const handleOpenVisibilityModal = (p: SubscriptionPlan) => {
    setManagingVisibilityPlan(p);
    const hasAll = !p.visibleTo || p.visibleTo.includes('All') || p.visibleTo.length === 0;
    setVisAll(hasAll);
    setVisTenants(p.visibleTo ? p.visibleTo.filter(t => t !== 'All') : []);
  };

  const handleOpenAddModal = () => {
    setEditingPlanId(null); resetForm(); setShowAddModal(true);
  };

  const handleOpenEditModal = (p: SubscriptionPlan) => {
    setEditingPlanId(p.id); populateForm(p);
    setCurrentStep(0); setShowViewModal(false); setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    if (editingPlanId) {
      const fields = buildPlanFields();
      setPendingEditFields(fields);
      setShowAddModal(false);
      setShowUpdateExistingPrompt(true);
    } else {
      try {
        await planService.createPlan(buildPlanFields());
        setSuccessMsg(`Plan "${name}" created.`);
        loadPlans();
        setShowAddModal(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        addToast(err.response?.data?.message || 'Error creating plan', 'error');
      }
    }
  };

  const handleConfirmUpdate = async (propagate: boolean) => {
    if (editingPlanId && pendingEditFields) {
      try {
        await planService.updatePlan(editingPlanId, pendingEditFields);
        setSuccessMsg(`Plan "${pendingEditFields.name}" updated.${propagate ? ' Existing subscriptions will reflect this change.' : ''}`);
        loadPlans();
      } catch (err: any) {
        addToast(err.response?.data?.message || 'Error updating plan', 'error');
      }
    }
    setPendingEditFields(null);
    setShowUpdateExistingPrompt(false);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDeletePlan = async (id: string, planName: string) => {
    try {
      await planService.deletePlan(id);
      addToast(`Plan "${planName}" deleted successfully.`, 'success');
      loadPlans();
    } catch (err) {
      addToast('Error deleting plan', 'error');
    }
  };

  const handleDuplicatePlan = async (p: SubscriptionPlan) => {
    const { id, ...rest } = p;
    try {
      await planService.createPlan({
        ...rest,
        name: `${p.name} Copy`
      });
      setSuccessMsg(`Plan "${p.name}" duplicated as "${p.name} Copy".`);
      loadPlans();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Error duplicating plan', 'error');
    }
  };

  // ─── Step renderer ────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: return (
        <div className="space-y-4">
          <SectionHead n="01" title="Basic Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Plan Name" required placeholder="e.g. Professional" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Plan Code" required placeholder="e.g. PRO" value={code} onChange={e => setCode(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Status" value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
              options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
            <Input label="Display Order" type="number" min={1} placeholder="e.g. 1" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
            <textarea placeholder="Internal or public-facing plan description…"
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-24 resize-none"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
      );

      case 1: return (
        <div className="space-y-4">
          <SectionHead n="02" title="Billing Options" />
          
          <p className="text-sm text-slate-500">Set the price for every supported billing cycle. Enter 0 for a free or unavailable cycle.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Monthly Price" type="number" min="0" placeholder="e.g. 2500" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} />
            <Input label="Quarterly Price" type="number" min="0" placeholder="e.g. 7000" value={quarterlyPrice} onChange={e => setQuarterlyPrice(e.target.value)} />
            <Input label="Half-Yearly Price" type="number" min="0" placeholder="e.g. 13000" value={halfYearlyPrice} onChange={e => setHalfYearlyPrice(e.target.value)} />
            <Input label="Yearly Price" type="number" min="0" placeholder="e.g. 25000" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} />
            <Input label="Lifetime Price" type="number" min="0" placeholder="e.g. 100000" value={lifetimePrice} onChange={e => setLifetimePrice(e.target.value)} />
            <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)} options={[{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} />
            <Input label="Trial Days" type="number" min="0" placeholder="e.g. 15" value={trialDays} onChange={e => setTrialDays(e.target.value)} />
            <Input label="Setup Fee" type="number" min="0" placeholder="e.g. 4999" value={setupFee} onChange={e => setSetupFee(e.target.value)} />
          </div>
          <ToggleRow label="Auto Renewal Allowed" checked={autoRenewal} onChange={setAutoRenewal} />

          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mt-4">
            💡 Use <strong>-1</strong> in Resource Limits to denote Unlimited quantities.
          </p>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <SectionHead n="03" title="Resource Limits" />
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 -mt-2 mb-2">
            Enter <strong>-1</strong> for any field to set it as <strong>Unlimited</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Max Instances" type="number" placeholder="-1 = Unlimited" value={maxInstances} onChange={e => setMaxInstances(e.target.value)} />
            <Input label="Max Branches" type="number" placeholder="-1 = Unlimited" value={maxBranches} onChange={e => setMaxBranches(e.target.value)} />
            <Input label="Max Staff Users" type="number" placeholder="-1 = Unlimited" value={maxStaffUsers} onChange={e => setMaxStaffUsers(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Max Students" type="number" placeholder="-1 = Unlimited" value={maxStudents} onChange={e => setMaxStudents(e.target.value)} />
            <Input label="Max Parents" type="number" placeholder="-1 = Unlimited" value={maxParents} onChange={e => setMaxParents(e.target.value)} />
            <Input label="Max Teachers" type="number" placeholder="-1 = Unlimited" value={maxTeachers} onChange={e => setMaxTeachers(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Max Storage" value={maxStorage} onChange={e => setMaxStorage(e.target.value)}
              options={[
                { value: '', label: 'Select Storage Quota' }, { value: '5 GB', label: '5 GB' },
                { value: '20 GB', label: '20 GB' }, { value: '100 GB', label: '100 GB' }, { value: '500 GB', label: '500 GB' }
              ]} />
            <Select label="Max File Size" value={maxFileSize} onChange={e => setMaxFileSize(e.target.value)}
              options={[
                { value: '', label: 'Select File Size Quota' }, { value: '5 MB', label: '5 MB' },
                { value: '20 MB', label: '20 MB' }, { value: '50 MB', label: '50 MB' }, { value: '200 MB', label: '200 MB' }
              ]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Max SMS Credits" type="number" placeholder="-1 = Unlimited" value={maxSmsCredits} onChange={e => setMaxSmsCredits(e.target.value)} />
            <Input label="Max WhatsApp Messages" type="number" placeholder="-1 = Unlimited" value={maxWhatsappMsgs} onChange={e => setMaxWhatsappMsgs(e.target.value)} />
          </div>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <SectionHead n="04" title="Feature Access" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureGroup title="Core ERP" features={features} onChange={(k, v) => setFeatures(f => ({ ...f, [k]: v }))}
              items={[
                { key: 'admissions', label: 'Admissions' }, { key: 'studentManagement', label: 'Student Management' },
                { key: 'parentPortal', label: 'Parent Portal' }, { key: 'teacherPortal', label: 'Teacher Portal' },
                { key: 'attendance', label: 'Attendance' }, { key: 'timetable', label: 'Timetable' }
              ]} />
            <FeatureGroup title="Academic" features={features} onChange={(k, v) => setFeatures(f => ({ ...f, [k]: v }))}
              items={[
                { key: 'assignments', label: 'Assignments' }, { key: 'exams', label: 'Exams' },
                { key: 'results', label: 'Results' }, { key: 'doubts', label: 'Doubts & Q&A' }
              ]} />
            <FeatureGroup title="Finance" features={features} onChange={(k, v) => setFeatures(f => ({ ...f, [k]: v }))}
              items={[
                { key: 'fees', label: 'Fees' }, { key: 'payroll', label: 'Payroll' },
                { key: 'income', label: 'Income Tracker' }, { key: 'expenses', label: 'Expense Tracker' }
              ]} />
            <FeatureGroup title="Communication" features={features} onChange={(k, v) => setFeatures(f => ({ ...f, [k]: v }))}
              items={[
                { key: 'notifications', label: 'Push Notifications' }, { key: 'sms', label: 'SMS' },
                { key: 'whatsapp', label: 'WhatsApp' }, { key: 'email', label: 'Email' }
              ]} />
            <FeatureGroup title="Administration" features={features} onChange={(k, v) => setFeatures(f => ({ ...f, [k]: v }))}
              items={[
                { key: 'reports', label: 'Reports' }, { key: 'auditLogs', label: 'Audit Logs' },
                { key: 'importExport', label: 'Import / Export' }
              ]} />
          </div>
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <SectionHead n="05" title="Support" />
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <ToggleRow label="Email Support" checked={support.emailSupport} onChange={v => setSupport(s => ({ ...s, emailSupport: v }))} />
            <ToggleRow label="Chat Support" checked={support.chatSupport} onChange={v => setSupport(s => ({ ...s, chatSupport: v }))} />
            <ToggleRow label="Phone Support" checked={support.phoneSupport} onChange={v => setSupport(s => ({ ...s, phoneSupport: v }))} />
            <ToggleRow label="Dedicated Account Manager" checked={support.dedicatedAccountManager} onChange={v => setSupport(s => ({ ...s, dedicatedAccountManager: v }))} />
            <ToggleRow label="Onboarding Assistance" checked={support.onboardingAssistance} onChange={v => setSupport(s => ({ ...s, onboardingAssistance: v }))} />
          </div>
        </div>
      );

      case 5: return (
        <div className="space-y-4">
          <SectionHead n="06" title="Branding" />
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <ToggleRow label="White Label" checked={branding.whiteLabel} onChange={v => setBranding(b => ({ ...b, whiteLabel: v }))} />
            <ToggleRow label="Custom Domain" checked={branding.customDomain} onChange={v => setBranding(b => ({ ...b, customDomain: v }))} />
            <ToggleRow label="Custom Logo" checked={branding.customLogo} onChange={v => setBranding(b => ({ ...b, customLogo: v }))} />
            <ToggleRow label="Custom Email Templates" checked={branding.customEmailTemplates} onChange={v => setBranding(b => ({ ...b, customEmailTemplates: v }))} />
          </div>
        </div>
      );

      case 6: return (
        <div className="space-y-4">
          <SectionHead n="07" title="Integrations" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Payments</p>
              <ToggleRow label="Razorpay" checked={integrations.razorpay} onChange={v => setIntegrations(i => ({ ...i, razorpay: v }))} />
              <ToggleRow label="Cashfree" checked={integrations.cashfree} onChange={v => setIntegrations(i => ({ ...i, cashfree: v }))} />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Communication</p>
              <ToggleRow label="WhatsApp Business" checked={integrations.whatsappBusiness} onChange={v => setIntegrations(i => ({ ...i, whatsappBusiness: v }))} />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Productivity</p>
              <ToggleRow label="Zoom" checked={integrations.zoom} onChange={v => setIntegrations(i => ({ ...i, zoom: v }))} />
              <ToggleRow label="Google Meet" checked={integrations.googleMeet} onChange={v => setIntegrations(i => ({ ...i, googleMeet: v }))} />
              <ToggleRow label="Google Calendar" checked={integrations.googleCalendar} onChange={v => setIntegrations(i => ({ ...i, googleCalendar: v }))} />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Hardware</p>
              <ToggleRow label="Biometric Devices" checked={integrations.biometricDevices} onChange={v => setIntegrations(i => ({ ...i, biometricDevices: v }))} />
            </div>
          </div>
        </div>
      );

      case 7: return (
        <div className="space-y-4">
          <SectionHead n="08" title="Internal Notes" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes</label>
            <textarea placeholder="Internal notes for this plan (not visible to tenants)…"
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-40 resize-none"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
      );
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (showAddModal) {
    return (
      <div ref={topRef} className="space-y-8 w-full animate-fade-in pb-12">
        {/* Header */}
        <div className="flex items-center gap-5 mb-2">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm cursor-pointer hover:-translate-x-1"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {editingPlanId ? `Edit Plan: ${name}` : 'Create New Plan'}
            </h2>
            <p className="text-base text-slate-500 font-medium mt-1">
              Configure parameters, allowed features, support tier, branding, and billing terms.
            </p>
          </div>
        </div>

        <div className="w-full relative">
          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            
            {/* Elegant Horizontal Stepper */}
            <div className="relative flex justify-between items-center px-4">
              {/* Background Line */}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-100 z-0 rounded-full"></div>
              {/* Progress Line */}
              <div 
                className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-indigo-600 z-0 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              ></div>
              
              {/* Steps */}
              {STEPS.map((s, i) => {
                const isActive = currentStep === i;
                const isCompleted = i < currentStep;
                
                return (
                  <div key={i} className="relative z-10 flex flex-col items-center group cursor-pointer" onClick={() => setCurrentStep(i)}>
                    <div 
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 font-bold text-sm outline-none
                        ${isActive 
                          ? 'bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(79,70,229,0.15)] ring-2 ring-white scale-110' 
                          : isCompleted 
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 ring-2 ring-white' 
                            : 'bg-white border-[3px] border-slate-100 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-500 ring-2 ring-white'
                        }`}
                    >
                      {isCompleted ? <Check size={18} strokeWidth={3} /> : (i + 1)}
                    </div>
                    <span className={`absolute -bottom-8 text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap
                      ${isActive ? 'text-indigo-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Elevated Form Card */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-8 md:p-10 min-h-[400px] transition-all duration-300">
              <div className="animate-fade-in">
                {renderStep()}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <button 
                type="button" 
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2
                  ${currentStep > 0 
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200 shadow-sm' 
                    : 'text-slate-400 bg-transparent hover:bg-slate-50'}`}
                onClick={() => currentStep > 0 ? setCurrentStep(c => c - 1) : setShowAddModal(false)}
              >
                {currentStep > 0 ? <><ChevronLeft size={18} /> Back</> : 'Cancel'}
              </button>
              
              {currentStep < STEPS.length - 1 ? (
                <button 
                  type="button" 
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all duration-200 flex items-center gap-2 hover:-translate-y-[1px]"
                  onClick={() => setCurrentStep(c => c + 1)}
                >
                  Next Step <ChevronRight size={18} />
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all duration-200 flex items-center gap-2 hover:-translate-y-[1px]"
                >
                  {editingPlanId ? 'Save Changes' : 'Create Plan'} <Check size={18} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showViewModal && selectedViewingPlan) {
    const viewingPlan = selectedViewingPlan;
    const primaryBilling = getPrimaryPlanPrice(viewingPlan);
    return (
      <div ref={topRef} className="space-y-6 w-full animate-fade-in">
        <div className="relative pl-[72px] mb-2">
          <button 
            onClick={() => {
              searchParams.delete('view');
              setSearchParams(searchParams);
            }}
            className="absolute left-0 top-1.5 p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">Plan Details</h2>
            <p className="text-base text-slate-500 mt-2">Review system resources, limits, and module configurations for <strong>{viewingPlan.name}</strong></p>
          </div>
        </div>

        <div className="flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* ── Hero header ── */}
            <div className="pl-[72px] pr-8 py-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-extrabold text-slate-900">{viewingPlan.name}</h3>
                  <span className="text-sm font-bold font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded">{viewingPlan.code}</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${viewingPlan.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{viewingPlan.status}</span>
                </div>
                <p className="text-base text-slate-500">{viewingPlan.description}</p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1">
                <div className="text-4xl font-extrabold text-slate-900">
                  {primaryBilling.price === 0 ? 'Free' : `${viewingPlan.currency === 'INR' ? '₹' : viewingPlan.currency === 'USD' ? '$' : '€'}${primaryBilling.price.toLocaleString()}`}
                  <span className="text-lg text-slate-500 font-semibold ml-1">/ {primaryBilling.billingCycle.toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button 
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this plan? Historical data will be preserved, but it will be removed from the active catalog.')) {
                        try {
                          await planService.deletePlan(viewingPlan.id.toString());
                          setSuccessMsg('Plan soft deleted successfully');
                          setTimeout(() => setSuccessMsg(''), 3000);
                          searchParams.delete('view'); 
                          setSearchParams(searchParams); 
                          loadPlans();
                        } catch (err) {
                          alert('Failed to delete plan');
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg transition-colors shadow-sm"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  <Button variant="secondary" onClick={() => { 
                    searchParams.delete('view'); 
                    setSearchParams(searchParams); 
                  }}>Back to Plans</Button>
                  <Button variant="primary" style={{ gap: '6px' }} onClick={() => { 
                    searchParams.delete('view'); 
                    setSearchParams(searchParams); 
                    handleOpenEditModal(viewingPlan); 
                  }}>
                    <Edit size={14} /> Edit Plan
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Tabs Navigation ── */}
            <div className="flex items-center gap-10 pl-[72px] pr-8 border-b border-slate-100 bg-slate-50/50">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'features', label: 'Feature Access' },
                { id: 'config', label: 'Configuration' },
                ...(viewingPlan.notes ? [{ id: 'notes', label: 'Internal Notes' }] : [])
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveViewTab(tab.id as any)}
                  className={`py-5 text-[17px] font-bold border-b-2 transition-colors ${activeViewTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div className="pl-[72px] pr-8 py-8">
              {/* Overview Tab */}
              {activeViewTab === 'overview' && (
                <div className="space-y-10 animate-fade-in">
                  {/* Billing Details */}
                  <section>
                    <h4 className="text-lg font-bold text-slate-900 mb-4">Billing & Terms</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Monthly', val: `${viewingPlan.currency} ${viewingPlan.monthlyPrice.toLocaleString()}` },
                        { label: 'Quarterly', val: `${viewingPlan.currency} ${viewingPlan.quarterlyPrice.toLocaleString()}` },
                        { label: 'Half-Yearly', val: `${viewingPlan.currency} ${viewingPlan.halfYearlyPrice.toLocaleString()}` },
                        { label: 'Yearly', val: `${viewingPlan.currency} ${viewingPlan.yearlyPrice.toLocaleString()}` },
                        { label: 'Lifetime', val: `${viewingPlan.currency} ${viewingPlan.lifetimePrice.toLocaleString()}` },
                        { label: 'Setup Fee', val: viewingPlan.setupFee > 0 ? `${viewingPlan.currency} ${viewingPlan.setupFee.toLocaleString()}` : 'None' },
                        { label: 'Trial Period', val: viewingPlan.trialDays > 0 ? `${viewingPlan.trialDays} days` : 'None' },
                        { label: 'Auto Renewal', val: viewingPlan.autoRenewal ? 'Enabled' : 'Disabled' },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50/70 border border-slate-100 rounded-xl px-4 py-3">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                          <div className="text-lg font-bold text-slate-800">{val}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Resource Limits */}
                  <section>
                    <h4 className="text-lg font-bold text-slate-900 mb-4">Resource Limits</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Instances', val: displayLimit(viewingPlan.maxInstances) },
                        { label: 'Branches', val: displayLimit(viewingPlan.maxBranches) },
                        { label: 'Staff Users', val: displayLimit(viewingPlan.maxStaffUsers) },
                        { label: 'Students', val: displayLimit(viewingPlan.maxStudents) },
                        { label: 'Parents', val: displayLimit(viewingPlan.maxParents) },
                        { label: 'Teachers', val: displayLimit(viewingPlan.maxTeachers) },
                        { label: 'Storage', val: viewingPlan.maxStorage },
                        { label: 'File Size', val: viewingPlan.maxFileSize },
                        { label: 'SMS Credits', val: displayLimit(viewingPlan.maxSmsCredits) },
                        { label: 'WhatsApp', val: displayLimit(viewingPlan.maxWhatsappMsgs) },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50/70 border border-slate-100 rounded-xl px-3.5 py-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                          <div className={`text-2xl font-black ${val === 'Unlimited' ? 'text-emerald-600' : 'text-slate-800'}`}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* Features Tab */}
              {activeViewTab === 'features' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 animate-fade-in">
                  {([
                    {
                      group: 'Core ERP',
                      items: [
                        { key: 'admissions', label: 'Admissions' }, { key: 'studentManagement', label: 'Student Management' },
                        { key: 'parentPortal', label: 'Parent Portal' }, { key: 'teacherPortal', label: 'Teacher Portal' },
                        { key: 'attendance', label: 'Attendance' }, { key: 'timetable', label: 'Timetable' },
                      ]
                    },
                    {
                      group: 'Academic',
                      items: [
                        { key: 'assignments', label: 'Assignments' }, { key: 'exams', label: 'Exams' },
                        { key: 'results', label: 'Results' }, { key: 'doubts', label: 'Doubts & Q&A' },
                      ]
                    },
                    {
                      group: 'Finance',
                      items: [
                        { key: 'fees', label: 'Fees' }, { key: 'payroll', label: 'Payroll' },
                        { key: 'income', label: 'Income Tracker' }, { key: 'expenses', label: 'Expense Tracker' },
                      ]
                    },
                    {
                      group: 'Communication',
                      items: [
                        { key: 'notifications', label: 'Push Notifications' }, { key: 'sms', label: 'SMS' },
                        { key: 'whatsapp', label: 'WhatsApp' }, { key: 'email', label: 'Email' },
                      ]
                    },
                    {
                      group: 'Administration',
                      items: [
                        { key: 'reports', label: 'Reports' }, { key: 'auditLogs', label: 'Audit Logs' },
                        { key: 'importExport', label: 'Import / Export' },
                      ]
                    },
                  ] as { group: string; items: { key: keyof FeatureAccess; label: string }[] }[]).map(({ group, items }) => (
                    <div key={group}>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">{group}</h4>
                      <div className="space-y-4">
                        {items.map(({ key, label }) => {
                          const on = viewingPlan.features[key];
                          return (
                            <div key={key} className="flex items-center gap-3">
                              {on ? (
                                <Check size={20} className="text-emerald-500 shrink-0 stroke-[3]" />
                              ) : (
                                <Plus size={20} className="text-slate-300 shrink-0 rotate-45 stroke-[3]" />
                              )}
                              <span className={`text-base font-medium ${on ? 'text-slate-800' : 'text-slate-400'}`}>
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Configuration Tab */}
              {activeViewTab === 'config' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-fade-in">
                  {/* Support */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Support</h4>
                    <div className="space-y-4">
                      {([
                        { key: 'emailSupport', label: 'Email Support' },
                        { key: 'chatSupport', label: 'Chat Support' },
                        { key: 'phoneSupport', label: 'Phone Support' },
                        { key: 'dedicatedAccountManager', label: 'Dedicated Account Manager' },
                        { key: 'onboardingAssistance', label: 'Onboarding Assistance' },
                      ] as { key: keyof SupportConfig; label: string }[]).map(({ key, label }) => {
                        const on = viewingPlan.support[key];
                        return (
                          <div key={key} className="flex items-center gap-3">
                            {on ? <Check size={20} className="text-emerald-500 shrink-0 stroke-[3]" /> : <Plus size={20} className="text-slate-300 shrink-0 rotate-45 stroke-[3]" />}
                            <span className={`text-base font-medium ${on ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Branding */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Branding</h4>
                    <div className="space-y-4">
                      {([
                        { key: 'whiteLabel', label: 'White Label' },
                        { key: 'customDomain', label: 'Custom Domain' },
                        { key: 'customLogo', label: 'Custom Logo' },
                        { key: 'customEmailTemplates', label: 'Custom Email Templates' },
                      ] as { key: keyof BrandingConfig; label: string }[]).map(({ key, label }) => {
                        const on = viewingPlan.branding[key];
                        return (
                          <div key={key} className="flex items-center gap-3">
                            {on ? <Check size={20} className="text-emerald-500 shrink-0 stroke-[3]" /> : <Plus size={20} className="text-slate-300 shrink-0 rotate-45 stroke-[3]" />}
                            <span className={`text-base font-medium ${on ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Integrations</h4>
                    <div className="space-y-4">
                      {([
                        { key: 'razorpay', label: 'Razorpay' },
                        { key: 'cashfree', label: 'Cashfree' },
                        { key: 'biometricDevices', label: 'Biometric Devices' },
                        { key: 'zoom', label: 'Zoom' },
                        { key: 'googleMeet', label: 'Google Meet' },
                        { key: 'googleCalendar', label: 'Google Calendar' },
                        { key: 'whatsappBusiness', label: 'WhatsApp Business' },
                      ] as { key: keyof IntegrationConfig; label: string }[]).map(({ key, label }) => {
                        const on = viewingPlan.integrations[key];
                        return (
                          <div key={key} className="flex items-center gap-3">
                            {on ? <Check size={20} className="text-emerald-500 shrink-0 stroke-[3]" /> : <Plus size={20} className="text-slate-300 shrink-0 rotate-45 stroke-[3]" />}
                            <span className={`text-base font-medium ${on ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeViewTab === 'notes' && viewingPlan.notes && (
                <div className="max-w-3xl animate-fade-in">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Internal Notes</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-base text-amber-900 leading-relaxed shadow-sm">
                    {viewingPlan.notes}
                  </div>
                </div>
              )}
            </div>
        </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">✓ {successMsg}</div>
      )}

      <div className="flex flex-col gap-2 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">Plan Master</h2>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Filter:</span>
              <select
                className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg pl-3.5 pr-2 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition cursor-pointer shadow-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Deleted">Deleted</option>
                <option value="All">All</option>
              </select>
            </div>
            <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={handleOpenAddModal}>
              <Plus size={18} /> Create Plan
            </Button>
          </div>
        </div>
        <p className="text-base text-slate-500">Define plan templates — features, limits, billing. Tenants are assigned plans via <strong>Tenant Subscriptions</strong>.</p>
      </div>

      {/* ── Plan Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((p) => {
            const isActive = p.status === 'Active';
            const defaultBilling = getPrimaryPlanPrice(p);
            const isFree = defaultBilling.price === 0;
            const currencySymbol = defaultBilling && defaultBilling.currency === 'INR' ? '₹' : defaultBilling?.currency === 'USD' ? '$' : '€';

            // Collect enabled feature labels dynamically from the database record
            const featureLabels: Record<string, string> = {
              admissions: 'Admissions', studentManagement: 'Student Management',
              parentPortal: 'Parent Portal', teacherPortal: 'Teacher Portal',
              attendance: 'Attendance', timetable: 'Timetable',
              assignments: 'Assignments', exams: 'Exams', results: 'Results', doubts: 'Doubt Resolution',
              fees: 'Fee Management', payroll: 'Payroll', income: 'Income Tracker', expenses: 'Expense Tracker',
              notifications: 'Push Notifications', sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email',
              reports: 'Reports & Analytics', auditLogs: 'Audit Logs', importExport: 'Import / Export'
            };
            const enabledFeatures = (Object.keys(p.features) as (keyof typeof p.features)[])
              .filter(k => p.features[k])
              .map(k => featureLabels[k])
              .filter(Boolean);

            const activeModulesText = enabledFeatures.length > 0 
              ? `Includes ${enabledFeatures.slice(0, 4).join(', ')}${enabledFeatures.length > 4 ? '...' : ''}`
              : 'No modules enabled';

            return (
              <div
                key={p.id}
                className="flex flex-col bg-white rounded-[32px] border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden p-3"
              >
                {/* Upper Section Container (Design A/B inspired) */}
                <div className={`relative flex flex-col p-6 rounded-[24px] gap-4 ${
                  isActive 
                    ? 'bg-gradient-to-tr from-blue-50 via-blue-50/50 to-indigo-50/50 border border-blue-200/60' 
                    : 'bg-slate-50 border border-slate-100'
                }`}>
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Plan Name & Tagline */}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                      {p.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed min-h-[36px]">
                      {p.description}
                    </p>
                  </div>

                  {/* Price display */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        {isFree ? '₹0' : `${currencySymbol}${defaultBilling?.price.toLocaleString()}`}
                      </span>
                      <span className="text-slate-500 text-sm font-semibold">
                        /{defaultBilling.billingCycle === 'Yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {isFree ? '14-day evaluation trial' : `Billed ${defaultBilling.billingCycle.toLowerCase()}`}
                    </span>
                  </div>

                  {/* CTA Button: View Details */}
                  <button
                    onClick={() => { 
                      setActiveViewTab('overview');
                      setSearchParams({ view: p.id.toString() }); 
                    }}
                    className="w-full py-2.5 rounded-full text-[15px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer text-center select-none shadow-sm hover:shadow"
                  >
                    View Details
                  </button>
                </div>

                {/* Lower Section (Capabilities, Visibility, Actions) */}
                <div className="flex flex-col flex-1 px-5 pt-5 pb-3 gap-5">
                  {/* Highlights list */}
                  <ul className="space-y-3 flex-1">
                    {[
                      p.maxBranches === -1 ? 'Unlimited active branches' : `Up to ${p.maxBranches} active branch${p.maxBranches > 1 ? 'es' : ''}`,
                      p.maxStudents === -1 ? 'Unlimited student capacity' : `Up to ${p.maxStudents.toLocaleString()} enrolled students`,
                      p.maxStorage === '-1' ? 'Unlimited cloud storage' : `${p.maxStorage} storage capacity`,
                      activeModulesText
                    ].map((h, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium leading-tight">
                        {/* Circle outline check icon */}
                        <div className="rounded-full border border-slate-300 p-1 mt-0.5 shrink-0 bg-white">
                          <Check size={12} className="text-slate-600 stroke-[3]" />
                        </div>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Visibility info row */}
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-100">
                    <span className="font-semibold text-slate-500">
                      Visibility: {(!p.visibleTo || p.visibleTo.includes('All') || p.visibleTo.length === 0) ? 'All Institutes' : `${p.visibleTo.length} Inst.`}
                    </span>
                    <button
                      onClick={() => handleOpenVisibilityModal(p)}
                      className="font-bold px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200 shadow-sm transition-all cursor-pointer text-sm"
                    >
                      👁 Manage
                    </button>
                  </div>

                  {/* Utility actions (Edit, Duplicate, Delete) */}
                  <div className="flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="flex-1 py-2 rounded-full text-sm font-bold border border-slate-350 text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-center"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicatePlan(p)}
                      className="flex-1 py-2 rounded-full text-sm font-bold border border-blue-200 text-blue-700 hover:bg-blue-50/50 bg-blue-50/20 transition-colors cursor-pointer text-center"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.id, p.name)}
                      className="flex-1 py-2 rounded-full text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50/50 bg-red-50/20 transition-colors cursor-pointer text-center"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ── Update Existing Subscriptions Prompt ── */}
      <Modal isOpen={showUpdateExistingPrompt} onClose={() => setShowUpdateExistingPrompt(false)}
        title="Update Existing Subscriptions?" size="md">
        <div className="space-y-4 pb-2">
          <p className="text-sm text-slate-600">
            You've edited <strong className="text-slate-900">{pendingEditFields?.name}</strong>. Should these changes also apply to tenants currently on this plan?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-medium">
            ⚠️ Propagating changes will immediately update all active tenant subscriptions on this plan. Existing pricing will not be changed — only feature access and limits.
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button type="button" onClick={() => handleConfirmUpdate(false)}
              className="w-full text-left px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="text-sm font-bold text-slate-800">No — only update the plan template</div>
              <div className="text-xs text-slate-400 mt-0.5">Existing subscriptions remain unchanged (recommended for pricing changes)</div>
            </button>
            <button type="button" onClick={() => handleConfirmUpdate(true)}
              className="w-full text-left px-4 py-3 border border-blue-200 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors">
              <div className="text-sm font-bold text-blue-800">Yes — propagate to existing subscriptions</div>
              <div className="text-xs text-blue-400 mt-0.5">Feature access and limits update for all active tenants on this plan</div>
            </button>
          </div>
        </div>
      </Modal>



      {/* ── Visibility Manager Modal ── */}
      {managingVisibilityPlan && (
        <Modal 
          isOpen={!!managingVisibilityPlan} 
          onClose={() => setManagingVisibilityPlan(null)} 
          title={`Plan Visibility: ${managingVisibilityPlan.name}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              Define which institutes can view and subscribe to this plan. Private plans will be hidden from other tenants.
            </p>
            
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={visAll} 
                  onChange={(e) => {
                    setVisAll(e.target.checked);
                    if (e.target.checked) {
                      setVisTenants([]);
                    }
                  }}
                  className="rounded border-slate-300 h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800">All Institutes (Public Plan)</span>
                  <span className="text-xs text-slate-400 block mt-0.5">Visible to every tenant on the platform.</span>
                </div>
              </label>
            </div>

            {!visAll && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Select Permitted Institutes</label>
                <div className="border border-slate-200 rounded-xl bg-white max-h-[220px] overflow-y-auto divide-y divide-slate-100 shadow-inner">
                  {tenants.map(t => {
                    const isChecked = visTenants.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVisTenants(prev => [...prev, t.id]);
                            } else {
                              setVisTenants(prev => prev.filter(tid => tid !== t.id));
                            }
                          }}
                          className="rounded border-slate-300 h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-850 block">{t.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">ID: {t.id} • Owner: {t.ownerName}</span>
                        </div>
                      </label>
                    );
                  })}
                  {tenants.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 italic">No registered institutes found</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <Button variant="secondary" onClick={() => setManagingVisibilityPlan(null)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={async () => {
                  const visibleTo = visAll ? ['All'] : visTenants;
                  try {
                    await planService.updatePlanVisibility(managingVisibilityPlan.id, visibleTo);
                    setSuccessMsg(`Visibility settings updated for "${managingVisibilityPlan.name}".`);
                    loadPlans();
                  } catch (err) {
                    addToast('Failed to update visibility settings', 'error');
                  }
                  setManagingVisibilityPlan(null);
                  setTimeout(() => setSuccessMsg(''), 4000);
                }}
              >
                Save Visibility Config
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
