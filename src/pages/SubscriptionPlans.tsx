import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Edit, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import type { SubscriptionPlan, FeatureAccess, SupportConfig, BrandingConfig, IntegrationConfig } from '../data/mockData';
import {
  DEFAULT_FEATURES, DEFAULT_SUPPORT, DEFAULT_BRANDING, DEFAULT_INTEGRATIONS
} from '../data/mockData';

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

// ─── Section heading ────────────────────────────────────────────────────────
const SectionHead: React.FC<{ n: string; title: string }> = ({ n, title }) => (
  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 select-none mb-4">
    <span className="opacity-60">{n}.</span> {title}
  </h4>
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
  const { plans, addPlan, updatePlan, deletePlan, tenants, addToast } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showUpdateExistingPrompt, setShowUpdateExistingPrompt] = useState(false);
  const [pendingEditFields, setPendingEditFields] = useState<Omit<SubscriptionPlan, 'id'> | null>(null);

  const [managingVisibilityPlan, setManagingVisibilityPlan] = useState<SubscriptionPlan | null>(null);
  const [visAll, setVisAll] = useState(true);
  const [visTenants, setVisTenants] = useState<string[]>([]);
  const [instituteFilter, setInstituteFilter] = useState('all');

  // Section 1
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [displayOrder, setDisplayOrder] = useState('');

  // Section 2
  const [billingType, setBillingType] = useState<'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime'>('Monthly');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [trialDays, setTrialDays] = useState('');
  const [setupFee, setSetupFee] = useState('');
  const [renewalPrice, setRenewalPrice] = useState('');
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
  const [maxApiCalls, setMaxApiCalls] = useState('');

  // Section 4–7
  const [features, setFeatures] = useState<FeatureAccess>({ ...DEFAULT_FEATURES });
  const [support, setSupport] = useState<SupportConfig>({ ...DEFAULT_SUPPORT });
  const [branding, setBranding] = useState<BrandingConfig>({ ...DEFAULT_BRANDING });
  const [integrations, setIntegrations] = useState<IntegrationConfig>({ ...DEFAULT_INTEGRATIONS });

  // Section 8
  const [notes, setNotes] = useState('');

  // View
  const [viewingPlan, setViewingPlan] = useState<SubscriptionPlan | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setCurrentStep(0);
    setName(''); setCode(''); setDescription(''); setStatus('Active'); setDisplayOrder('');
    setBillingType('Monthly'); setPrice(''); setCurrency('INR'); setTrialDays('');
    setSetupFee(''); setRenewalPrice(''); setAutoRenewal(false);
    setMaxInstances(''); setMaxBranches(''); setMaxStaffUsers(''); setMaxStudents('');
    setMaxParents(''); setMaxTeachers(''); setMaxStorage(''); setMaxFileSize('');
    setMaxSmsCredits(''); setMaxWhatsappMsgs(''); setMaxApiCalls('');
    setFeatures({ ...DEFAULT_FEATURES });
    setSupport({ ...DEFAULT_SUPPORT });
    setBranding({ ...DEFAULT_BRANDING });
    setIntegrations({ ...DEFAULT_INTEGRATIONS });
    setNotes('');
  };

  const populateForm = (p: SubscriptionPlan) => {
    setName(p.name); setCode(p.code); setDescription(p.description);
    setStatus(p.status); setDisplayOrder(p.displayOrder.toString());
    setBillingType(p.billingType); setPrice(p.price.toString());
    setCurrency(p.currency); setTrialDays(p.trialDays.toString());
    setSetupFee(p.setupFee.toString()); setRenewalPrice(p.renewalPrice.toString());
    setAutoRenewal(p.autoRenewal);
    setMaxInstances(p.maxInstances.toString()); setMaxBranches(p.maxBranches.toString());
    setMaxStaffUsers(p.maxStaffUsers.toString()); setMaxStudents(p.maxStudents.toString());
    setMaxParents(p.maxParents.toString()); setMaxTeachers(p.maxTeachers.toString());
    setMaxStorage(p.maxStorage); setMaxFileSize(p.maxFileSize);
    setMaxSmsCredits(p.maxSmsCredits.toString()); setMaxWhatsappMsgs(p.maxWhatsappMsgs.toString());
    setMaxApiCalls(p.maxApiCalls.toString());
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
      billingType, price: parseFloat(price) || 0, currency,
      trialDays: parseInt(trialDays) || 0, setupFee: parseFloat(setupFee) || 0,
      renewalPrice: parseFloat(renewalPrice) || 0, autoRenewal,
      maxInstances: parseInt(maxInstances) || 1,
      maxBranches: parseInt(maxBranches) || 0,
      maxStaffUsers: parseInt(maxStaffUsers) || 0,
      maxStudents: parseInt(maxStudents) || 0,
      maxParents: parseInt(maxParents) || 0,
      maxTeachers: parseInt(maxTeachers) || 0,
      maxStorage: maxStorage || '5 GB', maxFileSize: maxFileSize || '5 MB',
      maxSmsCredits: parseInt(maxSmsCredits) || 0,
      maxWhatsappMsgs: parseInt(maxWhatsappMsgs) || 0,
      maxApiCalls: parseInt(maxApiCalls) || 0,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    if (editingPlanId) {
      const fields = buildPlanFields();
      setPendingEditFields(fields);
      setShowAddModal(false);
      setShowUpdateExistingPrompt(true);
    } else {
      addPlan(buildPlanFields());
      setSuccessMsg(`Plan "${name}" created.`);
      setShowAddModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleConfirmUpdate = (propagate: boolean) => {
    if (editingPlanId && pendingEditFields) {
      updatePlan(editingPlanId, pendingEditFields);
      setSuccessMsg(`Plan "${pendingEditFields.name}" updated.${propagate ? ' Existing subscriptions will reflect this change.' : ''}`);
    }
    setPendingEditFields(null);
    setShowUpdateExistingPrompt(false);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDeletePlan = (id: string, planName: string) => {
    deletePlan(id);
    addToast(`Plan "${planName}" deleted successfully.`, 'success');
  };

  const handleDuplicatePlan = (p: SubscriptionPlan) => {
    const { id, ...rest } = p;
    addPlan({
      ...rest,
      name: `${p.name} Copy`
    });
    setSuccessMsg(`Plan "${p.name}" duplicated as "${p.name} Copy".`);
    setTimeout(() => setSuccessMsg(''), 4000);
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
          <SectionHead n="02" title="Billing" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value as typeof billingType)}
              options={[
                { value: 'Monthly', label: 'Monthly' }, { value: 'Quarterly', label: 'Quarterly' },
                { value: 'Yearly', label: 'Yearly' }, { value: 'Lifetime', label: 'Lifetime' }
              ]} />
            <Input label="Price" type="number" placeholder="e.g. 25000" value={price} onChange={e => setPrice(e.target.value)} />
            <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)}
              options={[{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Trial Days" type="number" placeholder="e.g. 15" value={trialDays} onChange={e => setTrialDays(e.target.value)} />
            <Input label="Setup Fee" type="number" placeholder="e.g. 4999" value={setupFee} onChange={e => setSetupFee(e.target.value)} />
            <Input label="Renewal Price" type="number" placeholder="e.g. 25000" value={renewalPrice} onChange={e => setRenewalPrice(e.target.value)} />
          </div>
          <div className="flex items-center gap-2.5 pt-2">
            <button type="button" onClick={() => setAutoRenewal(!autoRenewal)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoRenewal ? 'bg-blue-600' : 'bg-slate-200'}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${autoRenewal ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest select-none cursor-pointer" onClick={() => setAutoRenewal(!autoRenewal)}>
              Auto Renewal Allowed
            </span>
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
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
            <Input label="Max API Calls" type="number" placeholder="-1 = Unlimited" value={maxApiCalls} onChange={e => setMaxApiCalls(e.target.value)} />
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
                { key: 'importExport', label: 'Import / Export' }, { key: 'apiAccess', label: 'API Access' }
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
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Hardware & API</p>
              <ToggleRow label="Biometric Devices" checked={integrations.biometricDevices} onChange={v => setIntegrations(i => ({ ...i, biometricDevices: v }))} />
              <ToggleRow label="API Access" checked={integrations.apiAccess} onChange={v => setIntegrations(i => ({ ...i, apiAccess: v }))} />
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
              {editingPlanId ? `Edit Plan: ${name}` : 'Create New Plan'}
            </h2>
            <p className="text-sm text-slate-500">
              Configure parameters, allowed features, support tier, branding, and billing terms.
            </p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-0">
            {/* Step indicator */}
            <div className="flex gap-1 flex-wrap mb-6">
              {STEPS.map((s, i) => (
                <button key={i} type="button" onClick={() => setCurrentStep(i)}
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-all ${currentStep === i
                    ? 'bg-blue-600 text-white shadow-sm'
                    : i < currentStep ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {i + 1}. {s}
                </button>
              ))}
            </div>

            <div className="min-h-[340px]">
              {renderStep()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-5 mt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => currentStep > 0 ? setCurrentStep(c => c - 1) : setShowAddModal(false)}>
                {currentStep > 0 ? <><ChevronLeft size={14} /> Back</> : 'Cancel'}
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" variant="primary" onClick={() => setCurrentStep(c => c + 1)} style={{ gap: '4px' }}>
                  Next <ChevronRight size={14} />
                </Button>
              ) : (
                <Button type="submit" variant="primary">
                  {editingPlanId ? 'Save Changes' : 'Create Plan'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showViewModal && viewingPlan) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setShowViewModal(false); setViewingPlan(null); }}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Plan Details</h2>
            <p className="text-sm text-slate-500 mt-1">Review system resources, limits, and module configurations for {viewingPlan.name}</p>
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            {/* ── Hero header ── */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl ${viewingPlan.status === 'Active' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-slate-600 to-slate-700'} text-white`}>
              <div className="w-14 h-14 rounded-2xl bg-white/20 font-extrabold flex items-center justify-center text-xl uppercase flex-shrink-0">
                {viewingPlan.name.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-extrabold">{viewingPlan.name}</h3>
                  <span className="text-xs font-bold font-mono bg-white/20 px-2 py-0.5 rounded">{viewingPlan.code}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${viewingPlan.status === 'Active' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>{viewingPlan.status}</span>
                </div>
                <p className="text-sm opacity-75 mt-1">{viewingPlan.description}</p>
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <div className="text-3xl font-extrabold">
                  {viewingPlan.price === 0 ? 'Free' : `${viewingPlan.currency === 'INR' ? '₹' : viewingPlan.currency === 'USD' ? '$' : '€'}${viewingPlan.price.toLocaleString()}`}
                </div>
                <div className="text-xs opacity-75 mt-0.5">
                  per {viewingPlan.billingType.toLowerCase()} · Order #{viewingPlan.displayOrder}
                </div>
              </div>
            </div>

            {/* ── Section 02: Billing ── */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">02 · Billing</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Billing Type', val: viewingPlan.billingType },
                  { label: 'Price', val: viewingPlan.price === 0 ? 'Free' : `${viewingPlan.currency} ${viewingPlan.price.toLocaleString()}` },
                  { label: 'Trial Days', val: viewingPlan.trialDays > 0 ? `${viewingPlan.trialDays} days` : 'None' },
                  { label: 'Setup Fee', val: viewingPlan.setupFee > 0 ? `${viewingPlan.currency} ${viewingPlan.setupFee.toLocaleString()}` : 'None' },
                  { label: 'Renewal Price', val: viewingPlan.renewalPrice > 0 ? `${viewingPlan.currency} ${viewingPlan.renewalPrice.toLocaleString()}` : '—' },
                  { label: 'Currency', val: viewingPlan.currency },
                  { label: 'Auto Renewal', val: viewingPlan.autoRenewal ? 'Enabled' : 'Disabled' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">{label}</span>
                    <span className="text-sm font-semibold text-slate-800 block mt-0.5">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 03: Resource Limits ── */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">03 · Resource Limits</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  { label: 'API Calls', val: displayLimit(viewingPlan.maxApiCalls) },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase">{label}</span>
                    <span className={`text-sm font-bold block mt-0.5 ${val === 'Unlimited' ? 'text-emerald-600' : 'text-slate-800'}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 04: Feature Access (grouped) ── */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">04 · Feature Access</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      { key: 'importExport', label: 'Import / Export' }, { key: 'apiAccess', label: 'API Access' },
                    ]
                  },
                ] as { group: string; items: { key: keyof FeatureAccess; label: string }[] }[]).map(({ group, items }) => (
                  <div key={group} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{group}</p>
                    <div className="space-y-1">
                      {items.map(({ key, label }) => {
                        const on = viewingPlan.features[key];
                        return (
                          <div key={key} className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 ${on ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400'}`}>
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${on ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              {on ? '✓' : '✗'}
                            </span>
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sections 05–07 in 3 columns ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Section 05: Support */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">05 · Support</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                  {([
                    { key: 'emailSupport', label: 'Email Support' },
                    { key: 'chatSupport', label: 'Chat Support' },
                    { key: 'phoneSupport', label: 'Phone Support' },
                    { key: 'dedicatedAccountManager', label: 'Dedicated Account Manager' },
                    { key: 'onboardingAssistance', label: 'Onboarding Assistance' },
                  ] as { key: keyof SupportConfig; label: string }[]).map(({ key, label }) => {
                    const on = viewingPlan.support[key];
                    return (
                      <div key={key} className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 ${on ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${on ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {on ? '✓' : '✗'}
                        </span>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 06: Branding */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">06 · Branding</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                  {([
                    { key: 'whiteLabel', label: 'White Label' },
                    { key: 'customDomain', label: 'Custom Domain' },
                    { key: 'customLogo', label: 'Custom Logo' },
                    { key: 'customEmailTemplates', label: 'Custom Email Templates' },
                  ] as { key: keyof BrandingConfig; label: string }[]).map(({ key, label }) => {
                    const on = viewingPlan.branding[key];
                    return (
                      <div key={key} className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 ${on ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${on ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {on ? '✓' : '✗'}
                        </span>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 07: Integrations */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">07 · Integrations</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                  {([
                    { key: 'razorpay', label: 'Razorpay' },
                    { key: 'cashfree', label: 'Cashfree' },
                    { key: 'biometricDevices', label: 'Biometric Devices' },
                    { key: 'zoom', label: 'Zoom' },
                    { key: 'googleMeet', label: 'Google Meet' },
                    { key: 'googleCalendar', label: 'Google Calendar' },
                    { key: 'whatsappBusiness', label: 'WhatsApp Business' },
                    { key: 'apiAccess', label: 'API Access' },
                  ] as { key: keyof IntegrationConfig; label: string }[]).map(({ key, label }) => {
                    const on = viewingPlan.integrations[key];
                    return (
                      <div key={key} className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 ${on ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${on ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {on ? '✓' : '✗'}
                        </span>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Section 08: Notes ── */}
            {viewingPlan.notes && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-3">08 · Internal Notes</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
                  {viewingPlan.notes}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { setShowViewModal(false); setViewingPlan(null); }}>Back to Plans</Button>
              <Button variant="primary" style={{ gap: '6px' }} onClick={() => { setShowViewModal(false); handleOpenEditModal(viewingPlan); }}>
                <Edit size={14} /> Edit Plan
              </Button>
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Plan Master</h2>
          <p className="text-sm text-slate-500 mt-1">Define plan templates — features, limits, billing. Tenants are assigned plans via <strong>Tenant Subscriptions</strong>.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Institute Filter:</span>
            <select
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 transition cursor-pointer"
              value={instituteFilter}
              onChange={(e) => setInstituteFilter(e.target.value)}
            >
              <option value="all">All Institutes</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="primary" style={{ gap: '4px' }} onClick={handleOpenAddModal}>
            <Plus size={14} /> Create Plan
          </Button>
        </div>
      </div>

      {/* ── Plan Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .filter(p => {
            if (instituteFilter === 'all') return true;
            const isAllVisible = !p.visibleTo || p.visibleTo.includes('All') || p.visibleTo.length === 0;
            if (isAllVisible) return true;
            return p.visibleTo ? p.visibleTo.includes(instituteFilter) : false;
          })
          .map((p) => {
            const isActive = p.status === 'Active';
            const isFree = p.price === 0;
            const currencySymbol = p.currency === 'INR' ? '₹' : p.currency === 'USD' ? '$' : '€';
            const billingLabel = p.billingType === 'Monthly' ? '/mo' : p.billingType === 'Quarterly' ? '/qtr' : p.billingType === 'Yearly' ? '/yr' : ' lifetime';

            // Collect enabled feature labels for the bullet list
            const featureLabels: Record<string, string> = {
              admissions: 'Admissions', studentManagement: 'Student Management',
              parentPortal: 'Parent Portal', teacherPortal: 'Teacher Portal',
              attendance: 'Attendance', timetable: 'Timetable',
              assignments: 'Assignments', exams: 'Exams', results: 'Results', doubts: 'Doubt Resolution',
              fees: 'Fee Management', payroll: 'Payroll', income: 'Income Tracker', expenses: 'Expense Tracker',
              notifications: 'Push Notifications', sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email',
              reports: 'Reports & Analytics', auditLogs: 'Audit Logs', importExport: 'Import / Export', apiAccess: 'API Access'
            };
            const enabledFeatures = (Object.keys(p.features) as (keyof typeof p.features)[])
              .filter(k => p.features[k])
              .map(k => featureLabels[k])
              .filter(Boolean);

            return (
              <div
                key={p.id}
                className={`relative flex flex-col bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 hover:shadow-lg ${
                  isActive
                    ? 'border-blue-500 shadow-blue-100'
                    : 'border-slate-200'
                }`}
              >
                {/* Status badge */}
                <div className="absolute top-4 right-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.status}
                  </span>
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 p-6 gap-4">
                  {/* Plan name + code & Visibility toggle */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 pr-16">{p.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{p.code}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-350" />
                      <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-650`}>
                        Visibility: {(!p.visibleTo || p.visibleTo.includes('All') || p.visibleTo.length === 0) ? 'All' : `${p.visibleTo.length} Inst.`}
                      </span>
                      <button
                        onClick={() => handleOpenVisibilityModal(p)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded transition-all cursor-pointer select-none"
                      >
                        👁 Manage
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-end gap-0.5">
                      {isFree ? (
                        <span className="text-4xl font-extrabold text-slate-900">Free</span>
                      ) : (
                        <>
                          <span className="text-4xl font-extrabold text-slate-900">
                            {currencySymbol}
                            {p.billingType === 'Yearly'
                              ? Math.round(p.price / 12).toLocaleString()
                              : p.price.toLocaleString()
                            }
                          </span>
                          <span className="text-slate-400 text-sm font-medium mb-1">/mo</span>
                        </>
                      )}
                    </div>
                    {!isFree && (
                      <span className="text-xs text-slate-400 font-semibold italic mt-0.5">
                        {p.billingType === 'Yearly' 
                          ? `${currencySymbol}${p.price.toLocaleString()}/year` 
                          : `${currencySymbol}${(p.price * 12).toLocaleString()}/year`
                        }
                      </span>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2">
                    {p.trialDays > 0 && (
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {p.trialDays} Day Trial
                      </span>
                    )}
                    {p.setupFee > 0 && (
                      <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full" title="One-time onboarding and setup fee">
                        {currencySymbol}{p.setupFee.toLocaleString()} Setup (One-time)
                      </span>
                    )}
                    {p.autoRenewal && (
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">Auto Renew</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed">{p.description}</p>

                  {/* Feature bullets */}
                  <ul className="flex-1 space-y-1.5 mt-1">
                    {(() => {
                      const isExpanded = expandedPlans[p.id];
                      const featuresToShow = isExpanded ? enabledFeatures : enabledFeatures.slice(0, 6);
                      return (
                        <>
                          {featuresToShow.map(f => (
                            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                          {enabledFeatures.length > 6 && (
                            <li className="pl-3.5 mt-1">
                              <button
                                type="button"
                                onClick={() => setExpandedPlans(prev => ({ ...prev, [p.id]: !isExpanded }))}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold transition cursor-pointer select-none underline decoration-dotted"
                              >
                                {isExpanded 
                                  ? 'Show less features' 
                                  : `+${enabledFeatures.length - 6} more features…`
                                }
                              </button>
                            </li>
                          )}
                          {enabledFeatures.length === 0 && (
                            <li className="text-xs text-slate-400 italic">No features enabled yet</li>
                          )}
                        </>
                      );
                    })()}
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="px-6 pb-6 pt-0 flex flex-col gap-2 mt-auto">
                  <div className="h-px bg-slate-100 mb-2" />
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Edit Plan
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setViewingPlan(p); setShowViewModal(true); }}
                      className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDuplicatePlan(p)}
                      className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.id, p.name)}
                      className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
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
                onClick={() => {
                  const visibleTo = visAll ? ['All'] : visTenants;
                  updatePlan(managingVisibilityPlan.id, { visibleTo });
                  setSuccessMsg(`Visibility settings updated for "${managingVisibilityPlan.name}".`);
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
