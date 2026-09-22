import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { leadService } from '../../services/leadService';
import { planService } from '../../services/planService';
import api from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import {
  Plus, Download, Eye, Pencil, Edit3, Trash2, RefreshCw, PhoneCall, X, ArrowLeft,
  Loader2, UserRound, Gauge, MapPin, FileText, Send
} from 'lucide-react';
import type { SaasLead, SaasLeadFollowup } from '../../types/saas';
import { LEAD_STATUS_MAP, LEAD_SOURCE_MAP, LEAD_STATUS_OPTIONS, LEAD_SOURCE_OPTIONS } from '../../types/saas';

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const cleanStr = dateStr.split('T')[0].split(' ')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return cleanStr;
  }
  return dateStr;
};

const getStatusBadge = (status: number): { label: string; className: string } => {
  const label = LEAD_STATUS_MAP[status] || 'Unknown';
  let className = 'bg-slate-50 text-slate-700 border-slate-200';
  if (status === 1) className = 'bg-blue-50 text-blue-700 border-blue-200';
  else if (status === 2) className = 'bg-violet-50 text-violet-700 border-violet-200';
  else if (status === 3) className = 'bg-amber-50 text-amber-800 border-amber-200';
  else if (status === 4) className = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  else if (status === 5) className = 'bg-cyan-50 text-cyan-700 border-cyan-200';
  else if (status === 6) className = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  else if (status === 7) className = 'bg-slate-100 text-slate-600 border-slate-300';
  return { label, className };
};

const emptyForm = {
  instituteName: '', contactPerson: '', designation: '', email: '', mobile: '', altMobile: '',
  addressLine1: '', city: '', state: '', pincode: '', source: '1', assignedTo: '', status: '1',
  lostReason: '', nextFollowupAt: '', planId: '', preferredSlug: '', remarks: ''
};

interface LeadFormState {
  instituteName: string; contactPerson: string; designation: string; email: string; mobile: string; altMobile: string;
  addressLine1: string; city: string; state: string; pincode: string; source: string; assignedTo: string; status: string;
  lostReason: string; nextFollowupAt: string; planId: string; preferredSlug: string; remarks: string;
}

type PageMode = 'list' | 'create' | 'edit' | 'view';

export const Leads: React.FC = () => {
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<SaasLead[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);

  const [pageMode, setPageMode] = useState<PageMode>('list');
  const [viewTab, setViewTab] = useState<'details' | 'followups'>('details');
  const [editTab, setEditTab] = useState<'details' | 'followups'>('details');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [currentLead, setCurrentLead] = useState<SaasLead | null>(null);
  const [form, setForm] = useState<LeadFormState>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SaasLead | null>(null);
  const [deleteLostReason, setDeleteLostReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [ffMode, setFfMode] = useState('');
  const [ffOutcome, setFfOutcome] = useState('');
  const [ffNotes, setFfNotes] = useState('');
  const [ffNextAt, setFfNextAt] = useState('');
  const [ffStatus, setFfStatus] = useState('');
  const [isAddingFollowup, setIsAddingFollowup] = useState(false);

  const starterPlanId = availablePlans.find((p) => p.code === 'STARTER')?.id ||
    (availablePlans.length > 0 ? availablePlans[0].id.toString() : '');

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const result = await leadService.getLeads({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: filterStatus,
        source: filterSource,
        plan: filterPlan,
        assignedTo: filterAssignedTo
      });
      setLeads(result.data || []);
      setTotalItems(result.pagination?.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch leads:', error);
      addToast(error?.response?.data?.message || 'Failed to fetch leads', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, searchTerm, filterStatus, filterSource, filterPlan, filterAssignedTo]);

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

  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const res = await api.get('/admin/users', { params: { limit: 200 } });
        const users = res?.data?.data?.users || [];
        const saasUsers = users.filter((u: any) => !u.tenant_id);
        setAssignees(saasUsers.length > 0 ? saasUsers : users);
      } catch (e) {
        console.error('Failed to fetch assignees', e);
      }
    };
    fetchAssignees();
  }, []);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterSource('');
    setFilterPlan('');
    setFilterAssignedTo('');
    setCurrentPage(1);
  };

  const resetForm = (lead?: SaasLead | null) => {
    if (lead) {
      setForm({
        instituteName: lead.instituteName || '',
        contactPerson: lead.contactPerson || '',
        designation: lead.designation || '',
        email: lead.email || '',
        mobile: lead.mobile || '',
        altMobile: lead.altMobile || '',
        addressLine1: lead.addressLine1 || '',
        city: lead.city || '',
        state: lead.state || '',
        pincode: lead.pincode || '',
        source: lead.source ? String(lead.source) : '1',
        assignedTo: lead.assignedTo ? String(lead.assignedTo) : '',
        status: lead.status ? String(lead.status) : '1',
        lostReason: lead.lostReason || '',
        nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.slice(0, 10) : '',
        planId: lead.planId ? String(lead.planId) : '',
        preferredSlug: lead.preferredSlug || '',
        remarks: lead.remarks || ''
      });
    } else {
      setForm({
        ...emptyForm,
        planId: starterPlanId,
        source: '1',
        status: '1'
      });
    }
    setFormErrors({});
  };

  const goToList = () => {
    setPageMode('list');
  };

  const handleOpenAdd = () => {
    setEditingLeadId(null);
    resetForm(null);
    setPageMode('create');
    setEditTab('details');
  };

  const handleEditLead = async (lead: SaasLead) => {
    setEditingLeadId(String(lead.id));
    resetForm(lead);
    setCurrentLead(lead);
    setPageMode('edit');
    setEditTab('details');
    setFfMode('');
    setFfOutcome('');
    setFfNotes('');
    setFfNextAt('');
    setFfStatus('');
    try {
      const res = await leadService.getLead(String(lead.id));
      if (res?.data) {
        setCurrentLead(res.data);
        resetForm(res.data);
      }
    } catch (error) {
      console.error('Failed to load lead detail:', error);
    }
  };

  const handleViewLead = async (lead: SaasLead) => {
    setEditingLeadId(String(lead.id));
    resetForm(lead);
    setCurrentLead(null);
    setPageMode('view');
    setViewTab('details');
    setFfMode('');
    setFfOutcome('');
    setFfNotes('');
    setFfNextAt('');
    setFfStatus('');
    try {
      const res = await leadService.getLead(String(lead.id));
      if (res?.data) {
        setCurrentLead(res.data);
        resetForm(res.data);
      }
    } catch (error) {
      console.error('Failed to load lead detail:', error);
      addToast('Failed to load lead details', 'error');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.instituteName.trim()) errors.instituteName = 'Institute name is compulsory';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person name is compulsory';
    const cleanMobile = form.mobile.replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) errors.mobile = 'Mobile number is compulsory and must be at least 10 digits';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Invalid email format';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = (): any => ({
    instituteName: form.instituteName.trim(),
    contactPerson: form.contactPerson.trim(),
    designation: form.designation || null,
    email: form.email ? form.email.trim() : null,
    mobile: form.mobile.replace(/[^0-9]/g, ''),
    altMobile: form.altMobile ? form.altMobile.replace(/[^0-9]/g, '') : null,
    addressLine1: form.addressLine1 || null,
    city: form.city || null,
    state: form.state || null,
    pincode: form.pincode || null,
    source: Number(form.source),
    assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
    status: Number(form.status),
    lostReason: form.lostReason || null,
    nextFollowupAt: form.nextFollowupAt || null,
    planId: form.planId ? Number(form.planId) : null,
    preferredSlug: form.preferredSlug || null,
    remarks: form.remarks || null
  });

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editingLeadId) {
        await leadService.updateLead(editingLeadId, buildPayload());
        addToast('Lead updated successfully', 'success');
      } else {
        await leadService.createLead(buildPayload());
        addToast('Lead created successfully', 'success');
      }
      goToList();
      fetchLeads();
    } catch (error: any) {
      console.error('Failed to save lead:', error);
      addToast(error?.response?.data?.message || 'Failed to save lead', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await leadService.deleteLead(String(deleteTarget.id), deleteLostReason);
      addToast('Lead deleted successfully', 'success');
      setDeleteTarget(null);
      setDeleteLostReason('');
      fetchLeads();
    } catch (error: any) {
      console.error('Failed to delete lead:', error);
      addToast(error?.response?.data?.message || 'Failed to delete lead', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChangeInline = async (lead: SaasLead, status: number) => {
    try {
      await leadService.updateLeadStatus(String(lead.id), status);
      addToast('Lead status updated', 'success');
      if (pageMode === 'view') {
        const res = await leadService.getLead(String(lead.id));
        if (res?.data) {
          setCurrentLead(res.data);
          resetForm(res.data);
        }
      } else {
        fetchLeads();
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      addToast(error?.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleConvert = (lead: SaasLead) => {
    if (lead.status === 6) return;
    navigate(`/tenants/create?leadId=${lead.id}`);
  };

  const handleAddFollowup = async () => {
    const leadId = editingLeadId || (currentLead ? String(currentLead.id) : null);
    if (!leadId) return;
    if (!ffMode.trim()) { addToast('Follow-up mode is compulsory', 'error'); return; }
    if (!ffOutcome.trim()) { addToast('Follow-up outcome is compulsory', 'error'); return; }
    setIsAddingFollowup(true);
    try {
      await leadService.addFollowup(leadId, {
        followupMode: ffMode.trim(),
        outcome: ffOutcome.trim(),
        notes: ffNotes || null,
        nextFollowupAt: ffNextAt || null
      });
      addToast('Follow-up added successfully', 'success');
      if (ffStatus) {
        try {
          await leadService.updateLeadStatus(leadId, Number(ffStatus));
        } catch { /* status auto-advance already handled server-side */ }
      }
      const res = await leadService.getLead(leadId);
      if (res?.data) {
        setCurrentLead(res.data);
        resetForm(res.data);
      }
      setFfMode(''); setFfOutcome(''); setFfNotes(''); setFfNextAt(''); setFfStatus('');
      await fetchLeads();
    } catch (error: any) {
      console.error('Failed to add follow-up:', error);
      addToast(error?.response?.data?.message || 'Failed to add follow-up', 'error');
    } finally {
      setIsAddingFollowup(false);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Institute', 'Contact Person', 'Designation', 'Mobile', 'Email', 'Source', 'Assigned To', 'Plan', 'Status', 'Next Follow-up', 'Created'];
    const rows = leads.map((l) => [
      String(l.id), (l.instituteName || '').replace(/,/g, ' '), (l.contactPerson || '').replace(/,/g, ' '),
      (l.designation || '').replace(/,/g, ' '), l.mobile || '', (l.email || '').replace(/,/g, ' '),
      LEAD_SOURCE_MAP[l.source] || '', (l.assignedToName || '').replace(/,/g, ' '), l.planName || '',
      LEAD_STATUS_MAP[l.status] || '', formatDate(l.nextFollowupAt), formatDate(l.createdAt)
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const assigneeOptions = assignees.map((u) => ({ value: String(u.id), label: u.name || u.email || `User ${u.id}` }));

  const renderFormField = (label: string, key: keyof LeadFormState, required = false) => (
    <div key={key} className="flex flex-col gap-1">
      <Input
        label={label + (required ? ' *' : '')}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        error={formErrors[key]}
        placeholder=""
      />
    </div>
  );

  const formSelect = (label: string, key: keyof LeadFormState, options: { value: string; label: string }[]) => (
    <Select
      key={key}
      label={label}
      value={form[key]}
      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      options={options}
    />
  );

  const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={goToList}
          title="Back to Leads"
          className="mt-1 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
            {pageMode === 'view' && currentLead && (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${getStatusBadge(currentLead.status).className}`}>
                {getStatusBadge(currentLead.status).label}
              </span>
            )}
          </div>
          {subtitle && <p className="text-base text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {pageMode === 'view' && currentLead && (
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => handleEditLead(currentLead)} className="flex items-center gap-1.5">
            <Pencil size={15} /> Edit Lead
          </Button>
          {currentLead.status !== 6 && (
            <Button variant="primary" onClick={() => handleConvert(currentLead)} className="flex items-center gap-1.5">
              <RefreshCw size={15} /> Convert to Tenant
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Institute Details</div>
      </div>
      {renderFormField('Institute Name', 'instituteName', true)}
      {renderFormField('Contact Person', 'contactPerson', true)}
      {renderFormField('Designation', 'designation')}
      {renderFormField('Mobile', 'mobile', true)}
      {renderFormField('Alt Mobile', 'altMobile')}
      {renderFormField('Email', 'email')}
      <div className="md:col-span-2">
        {renderFormField('Address Line 1', 'addressLine1')}
      </div>
      {renderFormField('City', 'city')}
      {renderFormField('State', 'state')}
      {renderFormField('PIN Code', 'pincode')}
      {formSelect('Source', 'source', LEAD_SOURCE_OPTIONS)}
      {formSelect('Assigned To', 'assignedTo', [{ value: '', label: 'Unassigned' }, ...assigneeOptions])}
      {formSelect('Status', 'status', LEAD_STATUS_OPTIONS)}
      {formSelect('Plan', 'planId', [{ value: '', label: 'No plan assigned' }, ...availablePlans.map((p) => ({ value: String(p.id), label: p.name }))])}
      {renderFormField('Preferred Slug', 'preferredSlug')}
      {renderFormField('Next Follow-up Date', 'nextFollowupAt')}
      {Number(form.status) === 7 && renderFormField('Lost Reason', 'lostReason')}
      <div className="md:col-span-2">
        <Input label="Remarks" value={form.remarks}
          onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} />
      </div>
    </div>
  );

  /* ------------------------------ Reusable chunks ------------------------------ */
  const Tabs = ({ active, onChange, count }: {
    active: 'details' | 'followups';
    onChange: (t: 'details' | 'followups') => void;
    count?: number;
  }) => (
    <div className="mb-8 border-b border-slate-200 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        <button type="button" onClick={() => onChange('details')}
          className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-[3px] -mb-px transition-colors cursor-pointer ${active === 'details'
            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          Details
        </button>
        <button type="button" onClick={() => onChange('followups')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-[3px] -mb-px transition-colors cursor-pointer ${active === 'followups'
            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          Follow-up History
          {typeof count === 'number' && count > 0 && (
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </button>
      </nav>
    </div>
  );

  const SectionCard = ({ icon, title, children, className = '', iconClass = 'text-blue-600' }: {
    icon: React.ReactNode; title: string; children: React.ReactNode; className?: string; iconClass?: string;
  }) => (
    <Card className={`h-full ${className}`}>
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 mb-3">
          <span className={`shrink-0 ${iconClass}`}>{icon}</span>
          <h3 className="text-sm font-bold text-slate-800 tracking-wide">{title}</h3>
        </div>
        {children}
      </div>
    </Card>
  );

  const DetailField = ({ label, value, className = '' }: {
    label: string; value?: React.ReactNode; className?: string;
  }) => (
    <div className={className}>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900 break-words leading-snug">{value || '—'}</div>
    </div>
  );

  const FollowupTimeline = ({ followups }: { followups?: SaasLeadFollowup[] }) => {
    if (!followups || followups.length === 0) {
      return <p className="text-sm text-slate-400">No follow-ups recorded yet.</p>;
    }
    return (
      <ol className="relative border-l-2 border-slate-100 ml-1.5 pl-6 space-y-6">
        {followups.map((fup) => (
          <li key={fup.id} className="relative">
            <span className="absolute -left-[37px] mt-0.5 h-3 w-3 rounded-full bg-white border-2 border-blue-400" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{fup.followupMode}</span>
                <span className="text-xs text-slate-400">{formatDate(fup.createdAt)}</span>
              </div>
              {fup.nextFollowupAt && <span className="text-xs text-slate-400">Next: {formatDate(fup.nextFollowupAt)}</span>}
            </div>
            <p className="text-sm text-slate-700 mt-1.5">{fup.outcome}</p>
            {fup.notes && <p className="text-xs text-slate-500 mt-1 italic">{fup.notes}</p>}
          </li>
        ))}
      </ol>
    );
  };

  const renderAddFollowupForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-1.5">
            <PhoneCall size={15} className="text-blue-600" /> Add Follow-up
          </div>
        </CardTitle>
      </CardHeader>
      <div className="px-5 md:px-6 pb-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Mode (Call / WhatsApp / Meeting / Email)" value={ffMode} onChange={(e) => setFfMode(e.target.value)} placeholder="e.g. Phone Call" />
          <Input label="Status after this follow-up" value={ffStatus}
            onChange={(e) => setFfStatus(e.target.value)} placeholder="Optional" type="text" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUS_OPTIONS.filter((o) => o.value !== '6').map((o) => (
            <button key={o.value} type="button"
              onClick={() => setFfStatus(ffStatus === o.value ? '' : o.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${ffStatus === o.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <Input label="Outcome" value={ffOutcome} onChange={(e) => setFfOutcome(e.target.value)} placeholder="e.g. Shared demo, asked for brochure" />
        <Input label="Notes" value={ffNotes} onChange={(e) => setFfNotes(e.target.value)} placeholder="Optional notes" />
        <div className="flex items-end gap-2">
          <Input label="Next Follow-up Date" type="date" value={ffNextAt} onChange={(e) => setFfNextAt(e.target.value)} wrapperClassName="flex-1" />
          <Button type="button" variant="primary" onClick={handleAddFollowup} disabled={isAddingFollowup} className="flex items-center gap-1.5">
            {isAddingFollowup ? 'Saving...' : <><Send size={14} /> Add Follow-up</>}
          </Button>
        </div>
      </div>
    </Card>
  );

  /* ------------------------------ CREATE / EDIT full page ------------------------------ */
  if (pageMode === 'create' || pageMode === 'edit') {
    const isEdit = pageMode === 'edit';
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <PageHeader
          title={isEdit ? 'Edit Lead' : 'Add New Lead'}
          subtitle={isEdit ? `Updating lead record for ${form.instituteName || 'selected institute'}.` : 'Capture a prospective institute into the sales pipeline.'}
        />
        {isEdit && (
          <Tabs active={editTab} onChange={setEditTab} count={currentLead?.followups?.length} />
        )}

        {!(isEdit && editTab === 'followups') ? (
          <Card>
            <div className="p-5 md:p-6">
              {renderFormFields()}
              <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 mt-6">
                <Button type="button" variant="secondary" onClick={goToList}>Cancel</Button>
                <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Lead')}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Number(form.status) !== 6 && renderAddFollowupForm()}

            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-1.5">
                    <PhoneCall size={15} className="text-blue-600" /> Follow-up History
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="px-5 md:px-6 pb-6">
                <FollowupTimeline followups={currentLead?.followups} />
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  /* --------------------------------- VIEW full page --------------------------------- */
  if (pageMode === 'view') {
    const lead = currentLead;
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <PageHeader
          title={lead ? lead.instituteName : 'Lead Details'}
          subtitle={lead ? `Lead #${lead.id} • Pipeline record and follow-up activity.` : 'Loading lead details...'}
        />

        {!lead ? (
          <Card><div className="p-6 text-center text-slate-400">Loading lead details...</div></Card>
        ) : (
          <>
            <Tabs active={viewTab} onChange={setViewTab} count={lead.followups?.length} />

            {viewTab === 'details' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <SectionCard icon={<UserRound size={16} />} title="Contact Information">
                  <div className="space-y-3">
                    <DetailField label="Contact Person" value={lead.contactPerson} />
                    <DetailField label="Designation" value={lead.designation} />
                    <DetailField label="Email" value={lead.email} />
                    <DetailField label="Mobile" value={lead.mobile} />
                    <DetailField label="Alt Mobile" value={lead.altMobile} />
                  </div>
                </SectionCard>

                <SectionCard icon={<Gauge size={16} />} title="Pipeline" iconClass="text-sky-600">
                  <div className="space-y-3">
                    <DetailField label="Status" value={
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${getStatusBadge(lead.status).className}`}>
                        {getStatusBadge(lead.status).label}
                      </span>
                    } />
                    <DetailField label="Source" value={LEAD_SOURCE_MAP[lead.source] || '—'} />
                    <DetailField label="Plan" value={lead.planName} />
                    <DetailField label="Assigned To" value={lead.assignedToName || 'Unassigned'} />
                    <DetailField label="Next Follow-up" value={formatDate(lead.nextFollowupAt)} />
                    <DetailField label="Created" value={formatDate(lead.createdAt)} />
                    {lead.status === 6 && (
                      <DetailField label="Converted" value={
                        <span className="text-emerald-700 font-semibold">Tenant #{lead.convertedTenantId} on {formatDate(lead.convertedAt)}</span>
                      } />
                    )}
                    {lead.status === 7 && lead.lostReason && <DetailField label="Lost Reason" value={lead.lostReason} />}
                  </div>
                </SectionCard>

                <SectionCard icon={<MapPin size={16} />} title="Address & Location" iconClass="text-indigo-600">
                  <div className="space-y-3">
                    <DetailField label="Address Line 1" value={lead.addressLine1} />
                    <DetailField label="Preferred Slug" value={lead.preferredSlug} />
                    <DetailField label="City · State · PIN" value={[lead.city, lead.state, lead.pincode].filter(Boolean).join(', ')} />
                  </div>
                </SectionCard>

                <SectionCard icon={<FileText size={16} />} title="Remarks" className="lg:col-span-3" iconClass="text-cyan-600">
                  <p className="text-sm text-slate-700 leading-relaxed">{lead.remarks || 'No remarks recorded.'}</p>
                </SectionCard>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-1.5">
                      <PhoneCall size={15} className="text-blue-600" /> Follow-up History
                    </div>
                  </CardTitle>
                </CardHeader>
                <div className="px-5 md:px-6 pb-6">
                  <FollowupTimeline followups={lead.followups} />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  /* ------------------------------------ LIST page ------------------------------------ */
  return (
    <div className="space-y-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Sales &amp; Acquisition Leads</h2>
          <p className="text-base text-slate-500 mt-2">Manage prospective institutes, run the follow-up pipeline, and convert them into tenants.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Lead
        </Button>
      </div>

      {/* Search, Filter & Export */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 flex-1 w-full items-end">
          <Input label="Search" placeholder="Institute, contact, mobile, email..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')); setCurrentPage(1); }} wrapperClassName="sm:col-span-2 lg:col-span-1" />
          <Select label="Status" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Statuses' }, ...LEAD_STATUS_OPTIONS]} />
          <Select label="Source" value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Sources' }, ...LEAD_SOURCE_OPTIONS]} />
          <Select label="Plan" value={filterPlan} onChange={(e) => { setFilterPlan(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Plans' }, ...availablePlans.map((p) => ({ value: String(p.id), label: p.name }))]} />
          <Select label="Assigned To" value={filterAssignedTo} onChange={(e) => { setFilterAssignedTo(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Assignees' }, ...assigneeOptions]} />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700">Clear</Button>
          <Button variant="secondary" onClick={handleExportCSV} disabled={leads.length === 0} className="flex items-center gap-1.5 cursor-pointer">
            <Download size={15} /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <Table
          dense
          minWidth="1700px"
          colWidths={['60px', '250px', '210px', '270px', '110px', '150px', '140px', '150px', '150px', '160px']}
          headers={['ID', 'Institute', 'Contact', 'Mobile / Email', 'Source', 'Plan', 'Status', 'Next Follow-up', 'Created', 'Actions']}
        >
          {isLoading && leads.length === 0 ? (
            <tr><td colSpan={10} className="px-3.5 py-8 text-center text-slate-400">Loading leads...</td></tr>
          ) : leads.length === 0 ? (
            <tr><td colSpan={10} className="px-3.5 py-8 text-center text-slate-400">No leads found.</td></tr>
          ) : (
            leads.map((l) => {
              const badge = getStatusBadge(l.status);
              return (
                <tr key={l.id} onClick={() => handleViewLead(l)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{l.id}</td>
                  <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{l.instituteName}</td>
                  <td className="px-3.5 py-3 text-sm text-slate-700 whitespace-nowrap">
                    <span className="font-medium text-slate-800">{l.contactPerson}</span>
                    {l.designation && <span className="text-slate-400"> · {l.designation}</span>}
                  </td>
                  <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                    <span className="font-medium text-slate-800">{l.mobile}</span>
                    {l.email && <span className="text-slate-400"> · {l.email}</span>}
                  </td>
                  <td className="px-3.5 py-3 text-sm text-slate-600 whitespace-nowrap">{LEAD_SOURCE_MAP[l.source] || '—'}</td>
                  <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-sm font-medium">{l.planName || '—'}</span>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="px-3.5 py-3 text-sm text-slate-700 whitespace-nowrap">{formatDate(l.nextFollowupAt)}</td>
                  <td className="px-3.5 py-3 text-sm text-slate-700 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => handleViewLead(l)} title="View Details"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                        <Eye size={16} />
                      </button>
                      <button type="button" onClick={() => handleEditLead(l)} title="Edit Lead"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer">
                        <Edit3 size={16} />
                      </button>
                      {l.status !== 6 && (
                        <button type="button" onClick={() => handleConvert(l)} title="Convert to Tenant"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer">
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => { setDeleteTarget(l); setDeleteLostReason(''); }} title="Delete Lead"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
        {totalItems > 10 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination totalItems={totalItems} totalPages={Math.ceil(totalItems / 10)} currentPage={currentPage} onPageChange={setCurrentPage} pageSize={10} />
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteLostReason(''); }}
          title="Delete Lead"
          size="sm"
          footer={
            <span className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteLostReason(''); }} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-1.5">
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />} {isDeleting ? 'Deleting...' : 'Delete Lead'}
              </Button>
            </span>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={16} className="text-red-600" />
              </span>
              <div>
                <p className="font-bold text-red-900">Warning: This action cannot be undone.</p>
                <p className="mt-1 text-red-700 leading-relaxed">
                  Are you sure you want to delete lead <strong className="text-slate-900 font-bold">{deleteTarget.instituteName}</strong>?
                  This will mark it as lost and remove it from the pipeline.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lost Reason (optional)</label>
              <textarea
                value={deleteLostReason}
                onChange={(e) => setDeleteLostReason(e.target.value)}
                placeholder="e.g. Not interested, budget constraints, went with a competitor..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors resize-y"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};