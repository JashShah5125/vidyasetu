import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { tenantService } from '../services/tenantService';
import { leadService } from '../services/leadService';
import { planService } from '../services/planService';
import { billingService } from '../services/billingService';
import api from '../services/api';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { 
  Plus, Upload, Trash, Trash2, ArrowLeft, X, 
  Image as ImageIcon, AlertTriangle, Check, Eye, Edit3, ShieldAlert,
  ChevronLeft, ChevronRight, Pencil, Users, CreditCard, Building, 
  GraduationCap, Calendar, CheckCircle2, Clock, FileText, Search,
  Download, ExternalLink, ShieldCheck, Activity, Phone, Mail,
  MapPin, Server, HardDrive, Smartphone, DollarSign, Receipt,
  BadgePercent, Layers, Sparkles, RefreshCw
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getTenantStatusLabel } from '../types';

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return cleanStr;
  }
  return dateStr;
};

const getPlanMonthlyPrice = (p: any): number => {
  if (!p) return 0;
  return Number(p.monthlyPrice ?? p.monthly_price ?? p.price_per_month ?? p.price_monthly ?? p.price ?? 0);
};

const normalizeBillingCycle = (c: string): string => {
  if (!c) return 'yearly';
  const lower = c.toLowerCase().trim();
  if (lower === 'annual' || lower === 'annually' || lower === 'yearly' || lower === 'year') return 'yearly';
  if (lower === 'half-yearly' || lower === 'half_yearly' || lower === 'half-year') return 'half_yearly';
  if (lower === 'quarterly' || lower === 'quarter') return 'quarterly';
  if (lower === 'lifetime') return 'lifetime';
  if (lower === 'monthly' || lower === 'month') return 'monthly';
  return 'yearly';
};

const getPlanPriceForCycle = (p: any, cycle: string): number => {
  if (!p) return 0;
  const c = (cycle || 'monthly').toLowerCase();
  if (c.includes('year') || c.includes('annual')) {
    const yr = Number(p.yearlyPrice ?? p.yearly_price ?? p.price_per_year ?? p.price_yearly ?? 0);
    if (yr > 0) return yr;
    const m = getPlanMonthlyPrice(p);
    return m > 0 ? m * 12 : 0;
  }
  if (c.includes('quarter')) {
    const qtr = Number(p.quarterlyPrice ?? p.quarterly_price ?? p.price_quarterly ?? 0);
    if (qtr > 0) return qtr;
    const m = getPlanMonthlyPrice(p);
    return m > 0 ? m * 3 : 0;
  }
  if (c.includes('half')) {
    const hf = Number(p.halfYearlyPrice ?? p.half_yearly_price ?? p.price_half_yearly ?? 0);
    if (hf > 0) return hf;
    const m = getPlanMonthlyPrice(p);
    return m > 0 ? m * 6 : 0;
  }
  return getPlanMonthlyPrice(p);
};

const AUDIT_FIELD_LABELS: Record<string, string> = {
  maxStudents: 'Max Students',
  maxTeachers: 'Max Teachers',
  maxStaffUsers: 'Max Staff Users',
  maxBranches: 'Max Branches',
  maxParents: 'Max Parents',
  maxStorage: 'Storage Limit',
  maxFileSize: 'Max File Size',
  maxSmsCredits: 'SMS Credits',
  maxWhatsappMsgs: 'WhatsApp Credits',
  name: 'Institute Name',
  legal_name: 'Legal / Owner Name',
  slug: 'Subdomain Slug',
  planId: 'Subscription Plan',
  status: 'Operational Status',
  address: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'PIN Code',
  panNo: 'PAN Number',
  gstNo: 'GST Number',
  mobile: 'Primary Mobile',
  timezone: 'Timezone',
  billingCycle: 'Billing Cycle',
  discount: 'Contract Discount',
  finalPrice: 'Final Price',
  tax: 'Tax %',
  invoiceNumber: 'Invoice Reference',
  startDate: 'Contract Start Date',
  endDate: 'Contract End Date',
  renewalDate: 'Renewal Date',
  alternateEmails: 'Alternate Emails'
};

interface StudentHistoryRecord {
  id: string | number;
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  parentMobile: string;
  course: string;
  batch: string;
  branch: string;
  status: string;
  admissionDate: string;
  feePlan: { total: number; paid: number; pending: number };
  receipts: { id: string; date: string; amount: number; mode: string; status: string }[];
  attendanceRate: string;
  loginLogs: { date: string; time: string; device: string }[];
  assignments: { name: string; score: string; date: string }[];
}

export const TenantsManager: React.FC<{ initialOpenCreate?: boolean }> = ({ initialOpenCreate }) => {
  const { addToast, plans = [] } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const fetchTenants = async () => {
    try {
      const statusFilter = filterStatus !== 'All' ? filterStatus : '';

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
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterPlan('All');
    setFilterStatus('All');
    setCurrentPage(1);
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

  // ── Lead-based conversion prefill ──
  const [searchParams] = useSearchParams();
  const [sourceLead, setSourceLead] = useState<any | null>(null);
  const [leadPrefillApplied, setLeadPrefillApplied] = useState(false);

  React.useEffect(() => {
    const leadId = searchParams.get('leadId');
    if (!leadId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await leadService.getLead(leadId);
        if (!cancelled && res?.data) setSourceLead(res.data);
        else if (!cancelled) addToast('Could not load the linked lead', 'error');
      } catch (e) {
        console.error('Failed to load lead for conversion:', e);
        if (!cancelled) addToast('Could not load the linked lead for conversion', 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, addToast]);

  // Forms states
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Full tenant object loaded from database
  const [viewingTenantData, setViewingTenantData] = useState<any | null>(null);
  const [viewingInvoices, setViewingInvoices] = useState<any[]>([]);
  const [viewingStudents, setViewingStudents] = useState<StudentHistoryRecord[]>([]);
  const [viewingAuditLogs, setViewingAuditLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Deep inspection drawers / modals in View Mode
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentHistoryRecord | null>(null);
  const [selectedInvoiceHistory, setSelectedInvoiceHistory] = useState<any | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('All');
  const [studentListPage, setStudentListPage] = useState(1);

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
  const [_logoUploaded, setLogoUploaded] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [_uploadProgress, setUploadProgress] = useState<number>(0);
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

  // Add Invoice Dialog state (Tab 4)
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [newInvoicePlanId, setNewInvoicePlanId] = useState('');
  const [newInvoiceCycle, setNewInvoiceCycle] = useState('yearly');
  const [newInvoiceStartDate, setNewInvoiceStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [newInvoiceEndDate, setNewInvoiceEndDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().substring(0, 10));
  const [newInvoiceAmount, setNewInvoiceAmount] = useState('');
  const [newInvoiceSetupFee, setNewInvoiceSetupFee] = useState('0');
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState('0');
  const [newInvoiceTaxRate, setNewInvoiceTaxRate] = useState('18');
  const [newInvoiceStatus, setNewInvoiceStatus] = useState('paid');
  const [newInvoiceMethod, setNewInvoiceMethod] = useState('UPI');
  const [newInvoicePayDate, setNewInvoicePayDate] = useState(new Date().toISOString().substring(0, 10));
  const [newInvoiceRef, setNewInvoiceRef] = useState('');
  const [newInvoiceCustomNo, setNewInvoiceCustomNo] = useState('');
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');

  const [showSaved, setShowSaved] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'billing' | 'lifecycle' | 'limits'>('all');
  const [errorMsg, setErrorMsg] = useState('');

  // All 7 unified tabs with icons (present in BOTH View and Edit modes)
  const [activeTab, setActiveTab] = useState('profile');
  
  const allTenantTabs = [
    { id: 'profile', label: 'Institute Profile', icon: Building },
    { id: 'admin', label: 'Admin Credentials', icon: Users },
    { id: 'plan', label: 'Subscription Plan', icon: CreditCard },
    { id: 'commercial', label: 'Invoices & Billing', icon: Receipt },
    { id: 'students', label: 'Enrolled Students', icon: GraduationCap },
    { id: 'limits', label: 'Resource Limits', icon: Layers },
    { id: 'activity', label: 'Activity & Audit', icon: Activity }
  ];

  const formTabs = allTenantTabs;

  // Validation function per tab/step (enforcing compulsory fields)
  const validateStep = (tabId: string): { isValid: boolean; error?: string } => {
    if (tabId === 'profile') {
      if (!name.trim()) {
        return { isValid: false, error: 'Institute / Coaching Name is compulsory. Please enter a name.' };
      }
      if (!address.trim()) {
        return { isValid: false, error: 'Address Line 1 is compulsory. Please enter the institute address.' };
      }
      if (!city.trim()) {
        return { isValid: false, error: 'City is compulsory. Please enter the city.' };
      }
      if (!state.trim()) {
        return { isValid: false, error: 'State is compulsory. Please enter the state.' };
      }
      if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
        return { isValid: false, error: 'PIN Code is compulsory and must be exactly 6 digits.' };
      }
      if (customSlug.trim() && !/^[a-zA-Z0-9-]+$/.test(customSlug.trim())) {
        return { isValid: false, error: 'Custom subdomain can only contain letters, numbers, and hyphens.' };
      }
      if (panNo.trim() && !/^[A-Za-z0-9]{10}$/.test(panNo.trim())) {
        return { isValid: false, error: 'PAN number must be a 10-character alphanumeric code (e.g. ABCDE1234F).' };
      }
      if (gstNo.trim() && !/^[A-Za-z0-9]{15}$/.test(gstNo.trim())) {
        return { isValid: false, error: 'GSTIN must be a 15-character alphanumeric code.' };
      }
    }

    if (tabId === 'admin') {
      if (!ownerName.trim()) {
        return { isValid: false, error: 'Owner / Primary Admin Name is compulsory.' };
      }
      const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
        return { isValid: false, error: 'Admin Email Login is compulsory and must be a valid email address.' };
      }
      for (const alt of altEmails) {
        if (alt && alt.trim() && !EMAIL_REGEX.test(alt.trim())) {
          return { isValid: false, error: `Alternate Email "${alt}" is invalid.` };
        }
      }
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      if (!mobile.trim() || cleanMobile.length < 10) {
        return { isValid: false, error: 'Primary Mobile Number is compulsory and must be at least 10 digits.' };
      }
    }

    if (tabId === 'plan') {
      if (!plan) {
        return { isValid: false, error: 'Subscription Plan is compulsory. Please select a tier.' };
      }
      if (!billingCycle) {
        return { isValid: false, error: 'Billing Cycle is compulsory. Please select a billing interval.' };
      }
      if (!startDate) {
        return { isValid: false, error: 'Plan Start Date is compulsory. Please enter a valid start date.' };
      }
    }

    return { isValid: true };
  };

  const canNavigateToTab = (targetTabId: string): { allowed: boolean; error?: string; firstInvalidTab?: string } => {
    // When viewing or editing an existing tenant, allow free navigation between any tab
    if (isViewOnly || editingTenantId) return { allowed: true };
    
    const tabOrder = ['profile', 'admin', 'plan', 'commercial', 'students', 'limits', 'activity'];
    const targetIdx = tabOrder.indexOf(targetTabId);
    const currentIdx = tabOrder.indexOf(activeTab);

    if (targetIdx <= currentIdx) {
      return { allowed: true };
    }

    for (let i = 0; i < targetIdx; i++) {
      const res = validateStep(tabOrder[i]);
      if (!res.isValid) {
        return { allowed: false, error: res.error, firstInvalidTab: tabOrder[i] };
      }
    }
    return { allowed: true };
  };

  const handleTabClick = (targetTabId: string) => {
    const check = canNavigateToTab(targetTabId);
    if (!check.allowed) {
      setErrorMsg(check.error || 'Please complete all required fields in the previous step before proceeding.');
      if (check.firstInvalidTab && check.firstInvalidTab !== activeTab) {
        setActiveTab(check.firstInvalidTab);
      }
      return;
    }
    setErrorMsg('');
    setActiveTab(targetTabId);
  };

  const handleNextStep = () => {
    const tabOrder = ['profile', 'admin', 'plan', 'commercial', 'students', 'limits', 'activity'];
    const currentIdx = tabOrder.indexOf(activeTab);
    if (!isViewOnly && !editingTenantId) {
      const currentValidation = validateStep(activeTab);
      if (!currentValidation.isValid) {
        setErrorMsg(currentValidation.error || 'Please complete all required fields before proceeding.');
        return;
      }
    }
    setErrorMsg('');
    if (currentIdx < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIdx + 1]);
    }
  };

  const handlePrevStep = () => {
    const tabOrder = ['profile', 'admin', 'plan', 'commercial', 'students', 'limits', 'activity'];
    const currentIdx = tabOrder.indexOf(activeTab);
    setErrorMsg('');
    if (currentIdx > 0) {
      setActiveTab(tabOrder[currentIdx - 1]);
    }
  };

  const calculateExpiryDate = (startStr: string, selectedPlan: string, cycle?: string) => {
    if (!startStr) return '';
    const date = new Date(startStr);
    if (isNaN(date.getTime())) return '';

    const matchedPlan = availablePlans.find(p => String(p.id) === String(selectedPlan) || p.name === selectedPlan);
    const planName = matchedPlan?.name || selectedPlan;
    const currentCycle = (cycle || billingCycle).toLowerCase();

    if (planName === 'Starter Trial' || (matchedPlan && matchedPlan.trial_days > 0)) {
      date.setDate(date.getDate() + (matchedPlan?.trial_days || 14));
    } else if (currentCycle === 'yearly' || currentCycle === 'annual') {
      date.setFullYear(date.getFullYear() + 1);
    } else if (currentCycle === 'quarterly') {
      date.setMonth(date.getMonth() + 3);
    } else if (currentCycle === 'half-yearly' || currentCycle === 'half_yearly') {
      date.setMonth(date.getMonth() + 6);
    } else if (currentCycle === 'lifetime') {
      date.setFullYear(date.getFullYear() + 99);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString().split('T')[0];
  };

  const expiryDate = calculateExpiryDate(startDate, plan, billingCycle);

  const autoFinalPrice = (discVal?: string, planVal?: string, cycleVal?: string) => {
    const currentPlanId = planVal !== undefined ? planVal : plan;
    const currentCycle = (cycleVal !== undefined ? cycleVal : billingCycle).toLowerCase();
    const currentDiscount = discVal !== undefined ? discVal : discount;

    const matchedPlan = availablePlans.find(p => String(p.id) === String(currentPlanId) || p.name === currentPlanId || p.code === currentPlanId);
    let base = 0;
    if (matchedPlan) {
      if (currentCycle === 'yearly' || currentCycle === 'annual') {
        base = Number(matchedPlan.yearly_price ?? matchedPlan.yearlyPrice ?? matchedPlan.price_yearly ?? (Number(matchedPlan.monthly_price || 0) * 12)) || 0;
      } else if (currentCycle === 'quarterly') {
        base = Number(matchedPlan.quarterly_price ?? matchedPlan.quarterlyPrice ?? matchedPlan.price_quarterly ?? (Number(matchedPlan.monthly_price || 0) * 3)) || 0;
      } else if (currentCycle === 'half-yearly' || currentCycle === 'half_yearly') {
        base = Number(matchedPlan.half_yearly_price ?? matchedPlan.halfYearlyPrice ?? matchedPlan.price_half_yearly ?? (Number(matchedPlan.monthly_price || 0) * 6)) || 0;
      } else if (currentCycle === 'lifetime') {
        base = Number(matchedPlan.lifetime_price ?? matchedPlan.lifetimePrice ?? matchedPlan.price_lifetime ?? 0) || 0;
      } else {
        base = Number(matchedPlan.monthly_price ?? matchedPlan.monthlyPrice ?? matchedPlan.price_monthly ?? 0) || 0;
      }
    } else {
      if (currentPlanId === 'Growth Plan' || currentPlanId === '2') {
        base = (currentCycle === 'yearly' || currentCycle === 'annual') ? 49990 : 4999;
      } else if (currentPlanId === 'Pro Enterprise' || currentPlanId === '3') {
        base = (currentCycle === 'yearly' || currentCycle === 'annual') ? 199990 : 19999;
      }
    }
    const d = parseFloat(currentDiscount) || 0;
    return Math.max(0, Math.round(base - (base * d / 100))).toString();
  };

  const handleOpenAddModal = () => {
    setEditingTenantId(null);
    setIsViewOnly(false);
    setViewingTenantData(null);
    setViewingInvoices([]);
    setViewingStudents([]);
    
    setActiveTab('profile');
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
    setLogoError(false);
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

  // Loads full tenant data strictly from the database (tenants, saas_invoices, students)
  const handleLoadTenantForm = async (t: any, viewOnlyMode = false) => {
    setEditingTenantId(t.id);
    setIsViewOnly(viewOnlyMode);
    setActiveTab('profile');
    setSelectedStudentHistory(null);
    setSelectedInvoiceHistory(null);

    // Initial state from list row
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
    setStartDate(t.created_at ? t.created_at.split('T')[0] : (t.start_date ? t.start_date.split('T')[0] : new Date().toISOString().split('T')[0]));
    setLogoUploaded(!!t.logo_url);
    setLogoFile(null);
    setLogoPreview(t.logo_url || null);
    setLogoError(false);
    setDefaultPassword('********');

    // Parse alternate emails
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
    
    setDiscount(t.subscription_discount !== null && t.subscription_discount !== undefined ? String(t.subscription_discount) : '');
    setFinalPrice(t.subscription_final_price !== null && t.subscription_final_price !== undefined ? String(t.subscription_final_price) : '');
    setTax(t.subscription_tax !== null && t.subscription_tax !== undefined ? String(t.subscription_tax) : '18');
    setInvoiceNumber(t.subscription_invoice_number || '');
    setOvMaxBranches(t.override_max_branches !== null && t.override_max_branches !== undefined ? String(t.override_max_branches) : '');
    setOvMaxStaffUsers(t.override_max_staff_users !== null && t.override_max_staff_users !== undefined ? String(t.override_max_staff_users) : '');
    setOvMaxStudents(t.override_max_students !== null && t.override_max_students !== undefined ? String(t.override_max_students) : '');
    setOvMaxParents(t.override_max_parents !== null && t.override_max_parents !== undefined ? String(t.override_max_parents) : '');
    setOvMaxTeachers(t.override_max_teachers !== null && t.override_max_teachers !== undefined ? String(t.override_max_teachers) : '');
    setOvMaxStorage(t.override_max_storage || '');
    setOvMaxFileSize(t.override_max_file_size || '');
    setOvMaxSmsCredits(t.override_max_sms_credits !== null && t.override_max_sms_credits !== undefined ? String(t.override_max_sms_credits) : '');
    setOvMaxWhatsappMsgs(t.override_max_whatsapp_msgs !== null && t.override_max_whatsapp_msgs !== undefined ? String(t.override_max_whatsapp_msgs) : '');
    
    setViewingTenantData(t);
    setShowAddModal(true);

    setTimeout(() => {
      document.getElementById('tenant-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    await loadTenantDeepHistory(t.id);
  };

  // Loads full live database records: tenant details, saas_invoices, and students
  const loadTenantDeepHistory = async (tenantId: string | number) => {
    if (!tenantId) return;
    try {
      setIsLoadingHistory(true);
      const idStr = String(tenantId);
      
      const [tenantRes, invoicesRes, studentsRes, auditLogsRes] = await Promise.allSettled([
        tenantService.getTenantById(idStr),
        billingService.getInvoices(1, 100, '', 'All', idStr),
        api.get('/admin/students', { params: { tenantId: idStr, limit: 100 } }),
        api.get(`/admin/tenants/${idStr}/audit-logs`)
      ]);

      if (tenantRes.status === 'fulfilled' && tenantRes.value?.data) {
        const full = tenantRes.value.data;
        setViewingTenantData(full);
        if (full.logo_url) setLogoPreview(full.logo_url);
        if (full.plan_id) setPlan(String(full.plan_id));
        if (full.name) setName(full.name);
        if (full.owner_name || full.legal_name || full.admin_name) setOwnerName(full.owner_name || full.legal_name || full.admin_name);
        if (full.primary_email || full.contact_email || full.admin_email) setEmail(full.primary_email || full.contact_email || full.admin_email);
      }

      // Process Invoices from DB
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.data && Array.isArray(invoicesRes.value.data)) {
        const rawInvoices = invoicesRes.value.data.filter((inv: any) => 
          String(inv.tenantId) === idStr || (viewingTenantData && inv.tenantName === viewingTenantData.name)
        );
        setViewingInvoices(rawInvoices);
      } else {
        setViewingInvoices([]);
      }

      // Process Students from DB
      if (studentsRes.status === 'fulfilled' && studentsRes.value?.data?.data && Array.isArray(studentsRes.value.data.data)) {
        const rawStudents = studentsRes.value.data.data;
        const studentsList: StudentHistoryRecord[] = rawStudents.map((s: any) => ({
          id: s.id,
          studentId: s.student_code || `STU-${s.id}`,
          name: s.full_name || s.name || 'Student',
          email: s.email || 'N/A',
          mobile: s.mobile || 'N/A',
          parentMobile: s.guardian_mobile || 'N/A',
          course: s.course_name || s.target_exam || 'N/A',
          batch: s.batch_name || s.batch_code || 'Unassigned',
          branch: s.branch_name || 'Main Campus',
          status: s.status === 1 || s.status === '1' || s.status === 'active' ? 'Active Student' : 'Registered',
          admissionDate: formatDate(s.created_at),
          feePlan: {
            total: Number(s.total_fees || s.gross_amount || 0),
            paid: Number(s.fees_paid || s.paid_amount || 0),
            pending: Number(s.fees_remaining || s.balance_due || 0)
          },
          receipts: [],
          attendanceRate: 'N/A',
          loginLogs: [],
          assignments: []
        }));
        setViewingStudents(studentsList);
      } else {
        setViewingStudents([]);
      }

      // Process Audit Logs from DB
      if (auditLogsRes.status === 'fulfilled' && auditLogsRes.value?.data?.data && Array.isArray(auditLogsRes.value.data.data)) {
        setViewingAuditLogs(auditLogsRes.value.data.data);
      } else {
        setViewingAuditLogs([]);
      }

    } catch (err) {
      console.error('Failed to load deep tenant history from DB:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleViewTenant = (t: any) => {
    handleLoadTenantForm(t, true);
  };

  const handleEditTenant = (t: any) => {
    handleLoadTenantForm(t, false);
  };

  const handleCancelEdit = () => {
    if (!isViewOnly && editingTenantId) {
      setIsViewOnly(true);
      setErrorMsg('');
      if (viewingTenantData) {
        handleLoadTenantForm(viewingTenantData, true);
      }
    } else {
      setShowAddModal(false);
    }
  };

  const handleOpenAddInvoice = () => {
    const plansList = (availablePlans && availablePlans.length > 0) ? availablePlans : (plans || []);
    const selectedPlanId = String(plan || (viewingTenantData ? viewingTenantData.plan_id : '') || (plansList[0]?.id || '1'));
    const selectedPlan = plansList.find((p: any) => String(p.id) === selectedPlanId) || plansList[0];
    const cycle = normalizeBillingCycle(billingCycle);
    const baseAmt = selectedPlan 
      ? getPlanPriceForCycle(selectedPlan, cycle)
      : (parseFloat(finalPrice) || 0);

    const setupFee = selectedPlan ? Number(selectedPlan.setupFee ?? selectedPlan.setup_fee ?? 0) : 0;

    setNewInvoicePlanId(selectedPlan ? String(selectedPlan.id) : selectedPlanId);
    setNewInvoiceCycle(cycle);
    setNewInvoiceStartDate(new Date().toISOString().substring(0, 10));
    setNewInvoiceEndDate(new Date(Date.now() + (cycle === 'yearly' ? 365 : (cycle === 'quarterly' ? 90 : (cycle === 'half_yearly' ? 180 : 30))) * 86400000).toISOString().substring(0, 10));
    setNewInvoiceAmount(String(baseAmt || '0'));
    setNewInvoiceSetupFee(String(setupFee));
    setNewInvoiceDiscount(discount || '0');
    setNewInvoiceTaxRate(tax || '18');
    setNewInvoiceStatus('paid');
    setNewInvoiceMethod('UPI');
    setNewInvoicePayDate(new Date().toISOString().substring(0, 10));
    setNewInvoiceRef('');
    setNewInvoiceCustomNo('');
    setNewInvoiceNotes('');
    setShowAddInvoiceModal(true);
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantId) {
      addToast('Please select/save the tenant before generating invoices.', 'error');
      return;
    }
    setIsSavingInvoice(true);
    try {
      const payload = {
        tenant_id: Number(editingTenantId),
        plan_id: Number(newInvoicePlanId || plan || 1),
        billing_cycle: normalizeBillingCycle(newInvoiceCycle),
        billing_period_start: newInvoiceStartDate,
        billing_period_end: newInvoiceEndDate,
        plan_amount: parseFloat(newInvoiceAmount) || 0,
        setup_fee: parseFloat(newInvoiceSetupFee) || 0,
        discount_percent: parseFloat(newInvoiceDiscount) || 0,
        tax_rate: parseFloat(newInvoiceTaxRate) || 0,
        currency: 'INR',
        status: newInvoiceStatus,
        payment_date: (newInvoiceStatus === 'paid' ? (newInvoicePayDate || new Date().toISOString().substring(0, 10)) : null),
        payment_method: newInvoiceMethod || null,
        payment_reference: newInvoiceRef || null,
        invoice_number: newInvoiceCustomNo?.trim() || null,
        notes: newInvoiceNotes || null,
      };

      await billingService.createInvoice(payload);
      addToast('Invoice created and recorded successfully!', 'success');
      setShowAddInvoiceModal(false);
      await loadTenantDeepHistory(editingTenantId);
    } catch (err: any) {
      console.error('Failed to create invoice:', err);
      addToast(err?.response?.data?.message || 'Failed to create invoice', 'error');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    try {
      setIsDeleting(true);
      await tenantService.updateTenantStatus(tenantToDelete.id, 3);
      addToast(`Tenant "${tenantToDelete.name}" soft-deleted successfully.`, 'success');
      setTenantToDelete(null);
      fetchTenants();
    } catch (err: any) {
      console.error('Failed to delete tenant:', err);
      addToast(err.response?.data?.message || 'Failed to delete tenant.', 'error');
    } finally {
      setIsDeleting(false);
    }
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
        e.target.value = '';
        return;
      }
      setLogoUploaded(true);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setLogoError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly || isUploading) return;
    
    // Validate required fields
    const requiredSteps = ['profile', 'admin', 'plan'];
    for (const stepId of requiredSteps) {
      const res = validateStep(stepId);
      if (!res.isValid) {
        setErrorMsg(res.error || 'Please complete all required fields.');
        setActiveTab(stepId);
        return;
      }
    }
    setErrorMsg('');

    const cleanAlts = altEmails.filter(Boolean);
    const currentPrimaryEmail = email.trim();
    let finalPrimaryEmail = currentPrimaryEmail;
    let finalAlts = cleanAlts;

    if (defaultEmailIdx >= 0 && defaultEmailIdx < cleanAlts.length) {
      const chosenDefault = cleanAlts[defaultEmailIdx];
      finalPrimaryEmail = chosenDefault;
      finalAlts = [currentPrimaryEmail, ...cleanAlts.filter((_, i) => i !== defaultEmailIdx)];
    }

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('legal_name', ownerName.trim());
      formData.append('slug', customSlug.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
      formData.append('adminEmail', finalPrimaryEmail);
      formData.append('planId', plan);
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('pincode', pincode.trim());
      formData.append('panNo', panNo.trim());
      formData.append('gstNo', gstNo.trim());
      formData.append('mobile', mobile.trim());
      formData.append('timezone', timezone);
      formData.append('billingCycle', billingCycle);
      formData.append('startDate', startDate);
      formData.append('endDate', expiryDate);
      formData.append('renewalDate', expiryDate);
      
      if (sourceLead && !editingTenantId) {
        formData.append('leadId', String(sourceLead.id));
      }

      if (finalAlts.length > 0) {
        formData.append('alternate_emails', JSON.stringify(finalAlts));
      }

      if (logoFile) {
        formData.append('logo', logoFile);
      }

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
        await tenantService.updateTenant(editingTenantId.toString(), formData, onProgress);
        setSuccessMsg(`Tenant "${name}" settings updated successfully!`);
        addToast(`Tenant "${name}" settings updated successfully!`, 'success');
        // Refresh local view data and deep history from database
        await loadTenantDeepHistory(editingTenantId);
      } else {
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
        const newId = result?.data?.tenantId || result?.data?.id || result?.data?.tenant?.id;
        if (newId) {
          setEditingTenantId(String(newId));
          await loadTenantDeepHistory(String(newId));
        }
      }
      
      setIsUploading(false);
      await fetchTenants();
      setIsViewOnly(true);
      setShowSaved(true);
      setTimeout(() => {
        setShowSaved(false);
        setSuccessMsg('');
      }, 5000);
    } catch (error: any) {
      console.error('Failed to save tenant:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to save tenant. Please check your inputs and try again.');
      setIsUploading(false);
    }
  };

  const filteredAndSortedTenants = tenants;

  const handleExportCSV = () => {
    if (filteredAndSortedTenants.length === 0) return;
    
    const dataToExport = filteredAndSortedTenants.map(t => ({
      'Tenant ID': t.id,
      'Institute Name': t.name,
      'Owner': t.owner_name || t.legal_name || t.admin_name || 'N/A',
      'Email': t.primary_email || t.contact_email || t.admin_email || 'N/A',
      'Mobile': t.owner_mobile || t.contact_phone || 'N/A',
      'Status': getTenantStatusLabel(t.status),
      'Plan Tier': t.plan_name || 'Standard',
      'Start Date': t.start_date ? formatDate(t.start_date) : '',
      'Renewal Date': t.end_date ? formatDate(t.end_date) : '',
      'Branch Count': t.branch_count || 1,
      'Address': t.address_line1 || 'N/A',
      'GST Number': t.gst_number || 'N/A',
      'City': t.city || 'N/A',
      'State': t.state || 'N/A'
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

  // ── Render Tenant View / Form Modal ──
  if (showAddModal) {
    const activeTenantObj = viewingTenantData || {};
    const planName = availablePlans.find(p => String(p.id) === String(plan))?.name || activeTenantObj.plan_name || 'Standard Subscription';
    const statusLabel = getTenantStatusLabel(activeTenantObj.status ?? 1);

    // Filter students for the students tab in view/edit mode
    const studentList = viewingStudents;
    const uniqueCourses = Array.from(new Set(studentList.map(s => s.course).filter(c => c && c !== 'N/A')));
    const filteredStudents = studentList.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                          s.email.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                          s.mobile.includes(studentSearchTerm);
      const matchCourse = studentCourseFilter === 'All' || s.course === studentCourseFilter;
      return matchSearch && matchCourse;
    });

    const studentItemsPerPage = 5;
    const studentTotalPages = Math.ceil(filteredStudents.length / studentItemsPerPage) || 1;
    const paginatedStudents = filteredStudents.slice((studentListPage - 1) * studentItemsPerPage, studentListPage * studentItemsPerPage);

    // Invoices summary metrics calculated from DB rows
    const totalInvoicedAmt = viewingInvoices.reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.total_amount) || 0), 0);
    const totalPaidAmt = viewingInvoices.filter(i => (i.status || '').toLowerCase() === 'paid').reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.total_amount) || 0), 0);
    const totalPendingAmt = Math.max(0, totalInvoicedAmt - totalPaidAmt);

    // Live database counts
    const liveStudentCount = activeTenantObj.student_count ?? viewingStudents.length;
    const liveBranchCount = activeTenantObj.branch_count ?? 1;
    const liveUserCount = activeTenantObj.user_count ?? 1;

    return (
      <div id="tenant-form-top" className="space-y-6 w-full animate-fade-in pb-12">
        {showSaved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm flex items-center gap-2">
            <Check size={18} className="text-emerald-600" />
            {successMsg || 'Tenant settings successfully updated.'}
          </div>
        )}

        {sourceLead && !editingTenantId && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800 shadow-sm animate-fade-in flex items-start gap-2">
            <ShieldAlert size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              Converting lead <strong>#{sourceLead.id} — {sourceLead.instituteName}</strong> into a tenant.
              On submission the lead will be marked as converted. Fields below are pre-filled from the lead record.
            </div>
          </div>
        )}

        {/* Top Header & Context Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3.5">
            <button
              onClick={handleCancelEdit}
              className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {isViewOnly ? `Tenant Information: ${name || 'Coaching Institute'}` : (editingTenantId ? `Edit Tenant Settings: ${name}` : "Register Institute Tenant")}
                </h2>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
                  statusLabel === 'Active' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {statusLabel}
                </span>
                {!isViewOnly && editingTenantId && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Pencil size={11} /> Editing Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {isViewOnly 
                  ? "Real-time overview of workspace profile, credentials, subscription, payment history, and students." 
                  : "Modify profile fields, admin account logins, alternative emails, limits, and pricing."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {isViewOnly ? (
              <>
                <Button 
                  variant="primary" 
                  onClick={() => setIsViewOnly(false)}
                  className="flex items-center gap-1.5 font-semibold shadow-sm"
                >
                  <Pencil size={15} /> Edit Tenant
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAddModal(false)}
                  className="font-semibold"
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="secondary" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSubmit} 
                  disabled={isUploading}
                  className="flex items-center gap-1.5 shadow-sm"
                >
                  <Check size={16} /> {isUploading ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Top Summary Banner Card (Visible in both View and Edit modes for instant context) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-700">
          <div className="flex items-center gap-4 md:col-span-2">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shrink-0">
              {logoPreview && !logoError ? (
                <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <Building size={32} className="text-blue-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold truncate">{name || 'Institute Workspace'}</div>
              <div className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                <span>ID: #{editingTenantId || 'N/A'}</span>
                <span>•</span>
                <span>Slug: {customSlug || 'default'}</span>
                {customSlug && (
                  <span className="text-blue-300 font-mono text-[11px] underline">
                    {customSlug}.vidyasetu.com
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex flex-col justify-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Subscription Plan</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5 truncate">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              {planName}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Expires: {expiryDate ? formatDate(expiryDate) : 'Ongoing'}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex flex-col justify-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Workspace Stats</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {liveStudentCount} Enrolled Students
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
              <span>{liveBranchCount} Branch{liveBranchCount !== 1 ? 'es' : ''}</span>
              <span>•</span>
              <span>{liveUserCount} User{liveUserCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="w-full">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 shadow-sm animate-fade-in flex items-start gap-2">
              <span className="text-red-500 font-bold mt-0.5">!</span>
              <div>{errorMsg}</div>
            </div>
          )}

          {/* All 7 Unified Executive Horizontal Tabs */}
          <div className="mb-6 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
            <nav className="flex items-center gap-1.5 min-w-max">
              {formTabs.map((tab, idx) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                const stepNum = String(idx + 1).padStart(2, '0');

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 ring-2 ring-blue-500/15'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 border border-transparent'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'bg-slate-200/80 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      {TabIcon ? <TabIcon size={13} /> : <span className="text-[10px] font-mono">{stepNum}</span>}
                    </div>
                    
                    <div className="flex items-center">
                      <span className="tracking-tight">{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          <form 
            onSubmit={handleSubmit} 
            noValidate 
            className="space-y-6"
          >
            <div className="space-y-6">
            
            {/* === TAB 1: Institute Profile & Branding === */}
            {activeTab === 'profile' && (
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1.5 select-none">
                <span>Institute Profile &amp; Branding</span>
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
                {/* Left Column: Logo Upload / Display */}
                <div className="flex flex-col gap-1.5 w-full md:w-3/4 mx-auto lg:w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Brand Logo File</label>
                  <div className="flex flex-col gap-1.5 w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm justify-start items-center">
                    <div className="text-center mb-4 mt-1 w-full">
                       <h3 className="text-lg font-bold text-slate-900">
                         {logoPreview && !logoError ? (logoFile ? 'New Logo Selected' : 'Current Brand Logo') : 'Brand Logo'}
                       </h3>
                       <p className="text-xs text-slate-500 font-medium">
                         {logoPreview && !logoError ? (logoFile ? 'Ready to save with institute profile' : 'Active logo for tenant portal branding') : (isViewOnly ? 'No custom brand logo is currently configured' : 'Select a PNG, JPG, or SVG image (Max 500KB)')}
                       </p>
                    </div>
                    {!isViewOnly && (
                      <input 
                        type="file" 
                        id="logo-file-input" 
                        accept=".jpg,.jpeg,.png,.svg" 
                        className="hidden" 
                        onChange={handleLogoChange} 
                      />
                    )}
                    {logoPreview && !logoError ? (
                        <div className="flex flex-col items-center w-full mb-2">
                           <div className="w-full aspect-square max-w-[280px] flex flex-col relative bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                               {!isViewOnly && (
                                 <button 
                                   type="button" 
                                   onClick={(e) => { 
                                     e.preventDefault(); 
                                     setLogoFile(null); 
                                     setLogoPreview(null); 
                                     setLogoUploaded(false); 
                                     setLogoError(false);
                                   }} 
                                   title="Remove logo"
                                   className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-slate-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors z-10 cursor-pointer"
                                 >
                                    <X size={14} />
                                 </button>
                               )}
                               <div className="w-full flex-1 flex flex-col items-center justify-center p-4">
                                   <img 
                                     src={logoPreview} 
                                     alt="Brand Logo" 
                                     onError={() => setLogoError(true)}
                                     className="max-w-full max-h-[140px] object-contain drop-shadow-sm mb-3" 
                                   />
                                   <div className="text-xs font-semibold text-slate-700 truncate max-w-[220px]">
                                     {logoFile?.name || (logoPreview ? logoPreview.split('/').pop()?.split('?')[0] : 'logo.png')}
                                   </div>
                                   <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                     <Check size={12} /> {logoFile ? 'Ready to upload' : 'Active on platform'}
                                   </div>
                               </div>
                           </div>
                           
                           {!isViewOnly && (
                             <div className="flex gap-2 w-full max-w-[280px] mt-3.5">
                               <label 
                                 htmlFor="logo-file-input" 
                                 className="flex-1 py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 border border-blue-100"
                               >
                                 <Upload size={13} />
                                 Change Logo
                               </label>
                               <button 
                                 type="button" 
                                 onClick={() => {
                                   setLogoFile(null);
                                   setLogoPreview(null);
                                   setLogoUploaded(false);
                                   setLogoError(false);
                                 }} 
                                 className="py-2 px-3.5 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
                               >
                                 Remove
                               </button>
                             </div>
                           )}
                        </div>
                    ) : (
                       isViewOnly ? (
                         <div className="flex flex-col items-center justify-center aspect-square w-full max-w-[280px] p-6 gap-3 bg-slate-50 border border-slate-200 rounded-2xl mb-2 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                              <ImageIcon size={24} />
                            </div>
                            <span className="text-sm font-bold text-slate-600">No Logo Uploaded</span>
                            <span className="text-xs text-slate-400">Default brand avatar active</span>
                         </div>
                       ) : (
                         <label htmlFor="logo-file-input" className="flex flex-col items-center justify-center aspect-square w-full max-w-[280px] p-6 gap-3.5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all mb-2 text-center group">
                            <div className="w-12 h-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <ImageIcon size={24} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                               <span className="text-sm font-bold text-slate-700">
                                 {logoError ? 'Logo preview unavailable' : 'No Logo Uploaded'}
                               </span>
                               <span className="text-xs text-slate-400 max-w-[190px]">
                                 {logoError ? 'Upload a fresh file to replace it' : 'Supports PNG, JPG, or SVG up to 500KB'}
                               </span>
                            </div>
                            <div className="bg-blue-600 text-white text-xs font-bold py-2 px-5 rounded-lg shadow-sm group-hover:bg-blue-700 transition-colors mt-1 flex items-center gap-1.5">
                              <Upload size={13} />
                              Browse &amp; Upload Logo
                            </div>
                         </label>
                       )
                    )}
                  </div>
                </div>

                {/* Right Column: Location & Settings */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 items-start">
                    <Input 
                      label="Address Line 1" 
                      required
                      placeholder="e.g. 401, Western Express Highway, Mumbai" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="GSTIN Number (Optional)" 
                      placeholder="e.g. 27AAAAA0000A1Z5" 
                      value={gstNo} 
                      onChange={(e) => setGstNo(e.target.value)} 
                    />
                    <Input 
                      label="PAN Number (Optional)" 
                      placeholder="e.g. ABCDE1234F" 
                      value={panNo} 
                      onChange={(e) => setPanNo(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                      label="City" 
                      required
                      placeholder="e.g. Mumbai" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                    />
                    <Input 
                      label="State" 
                      required
                      placeholder="e.g. Maharashtra" 
                      value={state} 
                      onChange={(e) => setState(e.target.value)} 
                    />
                    <Input 
                      label="PIN Code" 
                      required
                      placeholder="e.g. 400001" 
                      value={pincode} 
                      onChange={(e) => setPincode(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Timezone"
                      required
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      options={[
                        { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                        { value: 'UTC', label: 'UTC' },
                        { value: 'America/New_York', label: 'America/New_York (EST)' }
                      ]}
                    />
                    <Input 
                      label="Country" 
                      value="India" 
                      disabled
                      placeholder="India" 
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* === TAB 2: Admin Credentials === */}
            {activeTab === 'admin' && (
            <div className="space-y-4 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center justify-between select-none">
                <span>Admin User Credentials</span>
                <span className="text-[11px] font-semibold text-slate-400 normal-case tracking-normal">Primary admin for initial institute access</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Owner / Primary Admin Name" 
                  required 
                  placeholder="Dr. Ramesh Kumar" 
                  value={ownerName} 
                  onChange={(e) => setOwnerName(e.target.value)} 
                />
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between items-center select-none">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                      Admin Email Login <span className="text-red-500 font-bold ml-1">*</span>
                    </label>
                    {!isViewOnly && (
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
                    )}
                  </div>
                  <input
                    type="email"
                    required
                    disabled={isViewOnly}
                    placeholder="ramesh@apex.com"
                    className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-600 border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-3 py-2 text-base text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Alternate Emails Lists */}
              <div className="space-y-3">
                <div className="flex justify-between items-center select-none">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Alternate Email Addresses (Optional)
                  </span>
                  {!isViewOnly && (
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm"
                      style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                      onClick={handleAddAltEmail}
                    >
                      <Plus size={12} /> Add Alternate
                    </Button>
                  )}
                </div>
                
                {altEmails.length > 0 ? (
                  <div className="space-y-3 animate-fade-in pt-1">
                    {altEmails.map((emailVal, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1 flex flex-col gap-1.5 w-full">
                          <div className="flex justify-between items-center select-none">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Alternate Email #{idx + 1}
                            </label>
                            {!isViewOnly && (
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
                            )}
                          </div>
                          <input
                            type="email"
                            required
                            disabled={isViewOnly}
                            placeholder={`alternate-${idx + 1}@apex.com`}
                            className="w-full bg-white disabled:bg-slate-50 disabled:text-slate-600 border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg px-3 py-2 text-base text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
                            value={emailVal}
                            onChange={(e) => handleUpdateAltEmail(idx, e.target.value)}
                          />
                        </div>
                        {!isViewOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAltEmail(idx)}
                            className="p-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors shadow-sm self-end"
                            style={{ height: '38px', width: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  isViewOnly && (
                    <p className="text-xs text-slate-400 italic py-1">No alternate emails configured.</p>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <Input 
                  label="Primary Mobile Contact" 
                  required
                  placeholder="9876543210" 
                  value={mobile} 
                  maxLength={10}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Temporary Password (Sent by Email)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-base font-semibold select-all outline-none"
                      value={editingTenantId ? defaultPassword : 'Generated securely after submission'}
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* === TAB 3: Subscription Plan === */}
            {activeTab === 'plan' && (
            <div className="space-y-4 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Subscription Plan &amp; Lifecycle</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Active Subscription
                </span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select 
                  label="Subscription Tier" 
                  required
                  value={plan} 
                  onChange={(e) => {
                    const newPlan = e.target.value;
                    setPlan(newPlan);
                    setFinalPrice(autoFinalPrice(discount, newPlan, billingCycle));
                  }} 
                  options={availablePlans.map((p) => ({ value: p.id.toString(), label: p.name }))}
                />
                <Select
                  label="Billing Cycle"
                  required
                  value={billingCycle}
                  onChange={(e) => {
                    const newCycle = e.target.value;
                    setBillingCycle(newCycle);
                    setFinalPrice(autoFinalPrice(discount, plan, newCycle));
                  }}
                  options={[
                    { value: 'Monthly', label: 'Monthly' },
                    { value: 'Quarterly', label: 'Quarterly' },
                    { value: 'Half-Yearly', label: 'Half-Yearly' },
                    { value: 'Yearly', label: 'Yearly' },
                    { value: 'Lifetime', label: 'Lifetime' }
                  ]}
                />
                <Input 
                  label="Plan Start Date" 
                  type="date" 
                  required
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expiration / Renewal Date</label>
                  <input 
                    type="date" 
                    readOnly 
                    className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-base font-semibold select-none cursor-not-allowed outline-none"
                    value={expiryDate} 
                  />
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-900 flex items-start gap-3">
                <Sparkles size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Subscription Terms &amp; Entitlements</div>
                  <div className="text-xs text-blue-700 mt-0.5">
                    This workspace is currently configured on <strong>{planName}</strong> with an active renewal interval on <strong>{billingCycle}</strong> terms.
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* === TAB 4: Commercial Pricing & Invoices / Payment History === */}
            {activeTab === 'commercial' && (
            <div className="space-y-6 pt-1 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Receipt size={18} />
                  <span>Commercial Pricing &amp; Billing History</span>
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  {viewingInvoices.length} Invoices Recorded
                </span>
              </div>

              {/* Editable Commercial Settings Inputs */}
              <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Commercial Pricing Terms
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input label="Discount %" type="number" min={0} max={100} placeholder="e.g. 10"
                      value={discount} onChange={e => { 
                        const newDisc = e.target.value;
                        setDiscount(newDisc); 
                        setFinalPrice(autoFinalPrice(newDisc)); 
                      }} />
                  </div>
                  <div>
                    <Input label="Final Price" type="number" placeholder="Auto-calculated or override"
                      value={finalPrice !== '' ? finalPrice : autoFinalPrice()} onChange={e => setFinalPrice(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Tax %" type="number" placeholder="e.g. 18" value={tax} onChange={e => setTax(e.target.value)} />
                  <Input label="Invoice Number" placeholder="e.g. INV-2026-042" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                </div>
              </div>

              {/* Invoices & Payment Receipts History */}
              <div className="space-y-4">
                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">₹{totalInvoicedAmt.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{viewingInvoices.length} total invoice records</div>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl">
                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Collected Revenue</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">₹{totalPaidAmt.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Paid billing invoices</div>
                  </div>
                  <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl">
                    <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Balance Due</div>
                    <div className="text-2xl font-black text-amber-800 mt-1">₹{totalPendingAmt.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-amber-700 mt-0.5">{totalPendingAmt === 0 ? 'No pending invoice balance' : 'Unpaid/overdue balance'}</div>
                  </div>
                </div>

                {/* Payment & Invoice Records Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Invoice Records &amp; Payment History</span>
                      <span className="text-xs text-slate-500 block sm:inline sm:ml-3">Recorded transactions for this workspace</span>
                    </div>
                    {!isViewOnly && (
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="primary" 
                        onClick={handleOpenAddInvoice}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm cursor-pointer"
                      >
                        <Plus size={14} /> Add Invoice
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Invoice #</th>
                          <th className="px-4 py-3">Plan / Cycle</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Subtotal</th>
                          <th className="px-4 py-3">GST Tax</th>
                          <th className="px-4 py-3">Total Amount</th>
                          <th className="px-4 py-3">Payment Method</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {viewingInvoices.length > 0 ? (
                          viewingInvoices.map((inv, i) => (
                            <tr 
                              key={i} 
                              onClick={() => setSelectedInvoiceHistory(inv)}
                              className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 font-bold text-blue-700 whitespace-nowrap">{inv.id}</td>
                              <td className="px-4 py-3 font-medium whitespace-nowrap">
                                <div>{inv.planName || planName}</div>
                                <div className="text-xs text-slate-400 capitalize">{inv.billingCycle || billingCycle}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.date || 'N/A'}</td>
                              <td className="px-4 py-3 font-semibold text-slate-700">₹{(inv.amount || 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-slate-500">₹{(inv.tax || 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">₹{(inv.total || 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                <div>{inv.paymentMethod || 'Online Gateway'}</div>
                                {inv.payment_reference && (
                                  <div className="font-mono text-[10px] text-slate-400">{inv.payment_reference}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  (inv.status || '').toLowerCase() === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {inv.status || 'Draft'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs py-1 px-3 border-slate-200 hover:border-blue-400 text-slate-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoiceHistory(inv);
                                  }}
                                >
                                  View Itemization
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                              No SaaS invoices recorded for this tenant yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* === TAB 5: Students Roster & Academic Records === */}
            {activeTab === 'students' && (
            <div className="space-y-6 pt-1 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-2">
                <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={18} />
                  <span>Enrolled Students Roster</span>
                </h4>
                <div className="text-xs font-semibold text-slate-500">
                  Total Enrolled: <span className="font-bold text-slate-800">{filteredStudents.length}</span>
                </div>
              </div>

              {/* Student Search & Course Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 items-end">
                <div className="sm:col-span-2">
                  <Input 
                    label="Search Enrolled Students" 
                    placeholder="Search by student name, roll code, email, or mobile..." 
                    value={studentSearchTerm}
                    onChange={(e) => {
                      setStudentSearchTerm(e.target.value);
                      setStudentListPage(1);
                    }}
                  />
                </div>
                <div>
                  <Select 
                    label="Filter Course"
                    value={studentCourseFilter}
                    onChange={(e) => {
                      setStudentCourseFilter(e.target.value);
                      setStudentListPage(1);
                    }}
                    options={[
                      { value: 'All', label: 'All Courses' },
                      ...uniqueCourses.map(c => ({ value: c, label: c }))
                    ]}
                  />
                </div>
              </div>

              {/* Students Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Student Code</th>
                        <th className="px-4 py-3">Name &amp; Contact</th>
                        <th className="px-4 py-3">Course &amp; Batch</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Admission Date</th>
                        <th className="px-4 py-3">Fee Plan Status</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedStudents.length > 0 ? (
                        paginatedStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{st.studentId}</td>
                            <td className="px-4 py-3 font-medium">
                              <div className="text-slate-900 font-semibold">{st.name}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Mail size={11} /> {st.email}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone size={11} /> {st.mobile}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{st.course}</div>
                              <div className="text-xs text-slate-400">{st.batch}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{st.branch}</td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{st.admissionDate || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <div className="text-xs space-y-0.5 whitespace-nowrap">
                                <div><span className="text-slate-400">Total:</span> <span className="font-bold text-slate-800">₹{st.feePlan.total.toLocaleString()}</span></div>
                                <div><span className="text-slate-400">Paid:</span> <span className="font-bold text-emerald-600">₹{st.feePlan.paid.toLocaleString()}</span></div>
                                {st.feePlan.pending > 0 ? (
                                  <div><span className="text-slate-400">Pending:</span> <span className="font-bold text-rose-500">₹{st.feePlan.pending.toLocaleString()}</span></div>
                                ) : (
                                  <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">Paid in Full</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                st.status === 'Active Student' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {st.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs py-1 px-3 border-blue-200 text-blue-700 bg-blue-50/30 hover:bg-blue-100/50"
                                onClick={() => setSelectedStudentHistory(st)}
                              >
                                View History
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                            {isLoadingHistory ? 'Loading student records...' : 'No students currently enrolled for this tenant workspace.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {studentTotalPages > 1 && (
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                    <div>
                      Page {studentListPage} of {studentTotalPages}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        disabled={studentListPage === 1}
                        onClick={() => setStudentListPage(p => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        disabled={studentListPage === studentTotalPages}
                        onClick={() => setStudentListPage(p => Math.min(studentTotalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* === TAB 6: Override Limits & Resource Allotments === */}
            {activeTab === 'limits' && (
            <div className="space-y-6 pt-1">
              <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Resource Limits &amp; System Usage</span>
              </h4>

              {/* Editable Limit Inputs (Always available in Edit mode) */}
              {!isViewOnly && (
                <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Configure Resource Boundaries</div>
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
              )}

              {/* Resource Cards & System Usage Comparison */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Max Branches Limit</div>
                  <div className="text-3xl font-black text-slate-800 mt-1">{ovMaxBranches || activeTenantObj.override_max_branches || '5'}</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">Current Branches: {liveBranchCount}</div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Max Students Limit</div>
                  <div className="text-3xl font-black text-slate-800 mt-1">{ovMaxStudents || activeTenantObj.override_max_students || '1,000'}</div>
                  <div className="text-xs text-blue-600 font-semibold mt-1">Current Students: {liveStudentCount}</div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Max Staff Users</div>
                  <div className="text-3xl font-black text-slate-800 mt-1">{ovMaxStaffUsers || activeTenantObj.override_max_staff_users || '25'}</div>
                  <div className="text-xs text-indigo-600 font-semibold mt-1">Current Users: {liveUserCount}</div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cloud Storage</div>
                  <div className="text-3xl font-black text-slate-800 mt-1">{ovMaxStorage || activeTenantObj.override_max_storage || '20 GB'}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">Tier Limit</div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Max File Size</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{ovMaxFileSize || activeTenantObj.override_max_file_size || '20 MB'}</div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SMS Credits</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{ovMaxSmsCredits || activeTenantObj.override_max_sms_credits || '5,000'}</div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Messages</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{ovMaxWhatsappMsgs || activeTenantObj.override_max_whatsapp_msgs || '10,000'}</div>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Teachers Limit</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{ovMaxTeachers || activeTenantObj.override_max_teachers || '50'}</div>
                </div>
              </div>
            </div>
            )}

            {/* === TAB 7: Activity & Audit Timeline === */}
            {activeTab === 'activity' && (
            <div className="space-y-6 pt-1 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={18} />
                    <span>Activity &amp; Audit Trail</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Chronological system ledger, invoice transactions, resource allocations, and lifecycle events.</p>
                </div>
                
                {/* Audit Category Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                  {(['all', 'billing', 'lifecycle', 'limits'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAuditFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                        auditFilter === cat 
                          ? 'bg-white text-blue-600 shadow-xs font-bold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cat === 'all' ? 'All Events' : cat === 'billing' ? 'Billing & Invoices' : cat === 'lifecycle' ? 'Lifecycle' : 'Limits & Governance'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Operational Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Operational Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeTenantObj.status === 1 ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : activeTenantObj.status === 0 ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    <span className="text-sm font-extrabold text-slate-900">{statusLabel}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">ID #{editingTenantId || 'N/A'}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Invoiced Receipts</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-extrabold text-slate-900">{viewingInvoices.length}</span>
                    <span className="text-xs text-slate-500">records</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                    ₹{viewingInvoices.filter(i => (i.status || '').toLowerCase() === 'paid').reduce((acc, curr) => acc + (Number(curr.total_amount ?? curr.total ?? curr.amount ?? 0)), 0).toLocaleString('en-IN')} paid
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Enrolled Students</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-extrabold text-slate-900">{viewingStudents.length}</span>
                    <span className="text-xs text-slate-400">/ {ovMaxStudents || 'Unlimited'} max</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-semibold block mt-0.5">Live enrolled base</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subscription Contract</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-1 truncate">{planName}</div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5 capitalize">{billingCycle} renewal</span>
                </div>
              </div>

              {/* Chronological Audit Timeline (Newest First) */}
              <div className="relative pl-7 space-y-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                
                {/* 1. Live System Change Logs (from audit_logs table - Newest First!) */}
                {viewingAuditLogs.filter((log) => {
                  if (auditFilter === 'all') return true;
                  if (auditFilter === 'billing') return log.action === 'INVOICE_GENERATED';
                  
                  let parsedChanges: any = null;
                  try {
                    if (log.new_values) parsedChanges = JSON.parse(log.new_values);
                  } catch (e) {}

                  const limitKeys = [
                    'maxStudents', 'maxTeachers', 'maxStaffUsers', 'maxBranches', 
                    'maxParents', 'maxStorage', 'maxFileSize', 'maxSmsCredits', 'maxWhatsappMsgs'
                  ];

                  const hasLimitKeys = parsedChanges && Object.keys(parsedChanges).some(k => limitKeys.includes(k));
                  const hasLifecycleKeys = log.action === 'STATUS_CHANGE' || log.action === 'CREATE' || (parsedChanges && Object.keys(parsedChanges).some(k => !limitKeys.includes(k)));

                  if (auditFilter === 'limits') return hasLimitKeys;
                  if (auditFilter === 'lifecycle') return hasLifecycleKeys;
                  return true;
                }).map((log) => {
                  let parsedChanges: any = null;
                  let parsedOld: any = null;
                  try {
                    if (log.new_values) parsedChanges = JSON.parse(log.new_values);
                  } catch (e) {}
                  try {
                    if (log.old_values) parsedOld = JSON.parse(log.old_values);
                  } catch (e) {}

                  return (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs flex items-center justify-center text-white">
                        <Activity size={10} />
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs hover:border-blue-200 transition-all text-sm bg-gradient-to-r from-blue-50/20 to-transparent">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {log.action === 'STATUS_CHANGE' ? 'Operational Status Changed' : log.action === 'SETTINGS_UPDATE' ? 'Tenant Settings & Limits Updated' : log.action === 'INVOICE_GENERATED' ? 'Billing Document Generated' : `${log.action} Recorded`}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{log.created_at || 'Recently'}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Action by {log.user_name ? <strong>{log.user_name} ({log.user_email})</strong> : 'Super Admin'} | Entity: {log.entity_type} #{log.entity_id} | IP: {log.ip_address || '127.0.0.1'}
                        </p>
                        {parsedChanges && Object.keys(parsedChanges).length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                            {Object.entries(parsedChanges).map(([k, v]) => {
                              const label = AUDIT_FIELD_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                              const oldVal = parsedOld && parsedOld[k] !== undefined && parsedOld[k] !== null ? String(parsedOld[k]) : null;
                              const newVal = String(v ?? '');
                              return (
                                <span key={k} className="inline-flex items-center gap-1.5 text-xs bg-slate-50 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 font-medium shadow-2xs">
                                  <span className="text-slate-500 font-semibold">{label}:</span>
                                  {oldVal !== null && oldVal !== newVal ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="line-through text-slate-400">{oldVal}</span>
                                      <span className="text-slate-400 font-bold">→</span>
                                      <span className="font-bold text-blue-700">{newVal}</span>
                                    </span>
                                  ) : (
                                    <span className="font-bold text-slate-900">{newVal}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Live Invoice Events (Loop over viewingInvoices) */}
                {(auditFilter === 'all' || auditFilter === 'billing') && viewingInvoices.map((inv, idx) => {
                  let invNum = inv.invoice_number || inv.invoiceNumber || `INV-${String(inv.id || idx + 1).padStart(4, '0')}`;
                  if (invNum.startsWith('INV-INV-')) invNum = invNum.replace('INV-INV-', 'INV-');
                  const invAmt = Number(inv.total_amount ?? inv.total ?? inv.amount ?? 0);
                  const invStatus = (inv.status || 'paid').toLowerCase();
                  const invDate = inv.payment_date || inv.paymentDate || inv.date || inv.created_at;
                  const invMethod = inv.payment_method || inv.paymentMethod || 'UPI / Transfer';
                  return (
                    <div key={inv.id || idx} className="relative">
                      <div className={`absolute -left-7 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-white ${
                        invStatus === 'paid' ? 'bg-emerald-600' : invStatus === 'overdue' ? 'bg-red-600' : 'bg-amber-500'
                      }`}>
                        <Receipt size={10} />
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">Invoice {invNum} Recorded</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border capitalize ${
                              invStatus === 'paid' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : invStatus === 'overdue'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {invStatus === 'paid' ? 'Payment Settled' : invStatus}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{formatDate(invDate)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5">
                          Amount: <strong className="text-slate-900 font-extrabold">₹{invAmt.toLocaleString('en-IN')}</strong> | Payment Method: <strong>{invMethod}</strong>
                          {inv.payment_date || inv.paymentDate ? ` | Settled on: ${formatDate(inv.payment_date || inv.paymentDate)}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Subscription Tier & Commercial Terms */}
                {(auditFilter === 'all' || auditFilter === 'billing' || auditFilter === 'lifecycle') && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xs flex items-center justify-center text-white">
                      <Layers size={10} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Active Subscription: {planName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 capitalize">{billingCycle} Billing</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Valid: {formatDate(startDate)} to {formatDate(expiryDate)}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Base Price</span>
                          <span className="font-extrabold text-slate-800">₹{(parseFloat(finalPrice) || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Discount</span>
                          <span className="font-extrabold text-emerald-600">{discount || '0'}% Applied</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Tax Rate</span>
                          <span className="font-extrabold text-slate-800">{tax || '18'}% GST</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Renewal Due</span>
                          <span className="font-extrabold text-indigo-700">{formatDate(expiryDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Resource Limits & Quotas Allocated */}
                {(auditFilter === 'all' || auditFilter === 'limits') && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-cyan-600 border-2 border-white shadow-xs flex items-center justify-center text-white">
                      <HardDrive size={10} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Infrastructure Limits &amp; Resource Quotas Provisioned</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-bold border border-cyan-200">Capacity Policy</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{ovMaxStudents || 'Standard'} Student Capacity</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Branches</span>
                          <span className="font-bold text-slate-800">{ovMaxBranches || 'Default'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Staff Users</span>
                          <span className="font-bold text-slate-800">{ovMaxStaffUsers || 'Default'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Cloud Storage</span>
                          <span className="font-bold text-slate-800">{ovMaxStorage ? `${ovMaxStorage} GB` : 'Default'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">SMS / WhatsApp</span>
                          <span className="font-bold text-slate-800">{ovMaxSmsCredits || '0'} / {ovMaxWhatsappMsgs || '0'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Primary Admin Setup */}
                {(auditFilter === 'all' || auditFilter === 'lifecycle') && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs flex items-center justify-center text-white">
                      <ShieldCheck size={10} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Primary Administrator Credentials Configured</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">Admin Security</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{email}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        Designated Super Administrator: <strong>{ownerName}</strong> | Primary Contact: <strong>{mobile || 'N/A'}</strong>. 
                        {altEmails.length > 0 ? ` Configured with ${altEmails.length} alternate notification recipient(s).` : ' Direct root authorization granted.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. Enrolled Students Milestone */}
                {(auditFilter === 'all' || auditFilter === 'lifecycle') && viewingStudents.length > 0 && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-purple-600 border-2 border-white shadow-xs flex items-center justify-center text-white">
                      <GraduationCap size={10} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Student Admissions &amp; Intake Milestone</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">Active Intake</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{viewingStudents.length} Students Active</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        Latest admitted student: <strong>{viewingStudents[0]?.name}</strong> (Roll: {viewingStudents[0]?.studentId || viewingStudents[0]?.id}) enrolled into course <strong>{viewingStudents[0]?.course || 'Standard'}</strong> on {viewingStudents[0]?.admissionDate || 'recently'}.
                      </p>
                    </div>
                  </div>
                )}

                {/* 7. Statutory & Legal Details */}
                {(auditFilter === 'all' || auditFilter === 'limits') && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-amber-600 border-2 border-white shadow-xs flex items-center justify-center text-white">
                      <Building size={10} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Statutory Tax &amp; Business Profile Verified</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">Compliance</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{activeTenantObj.gst_number || activeTenantObj.pan_number || 'PAN/GST Configured'}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        GSTIN: <strong>{activeTenantObj.gst_number || 'Not provided'}</strong> | PAN: <strong>{activeTenantObj.pan_number || 'Not provided'}</strong> | Registered Location: <strong>{activeTenantObj.city || 'Headquarters'}, {activeTenantObj.state || 'India'}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* 8. Account Created & Genesis (Base of the timeline) */}
                {(auditFilter === 'all' || auditFilter === 'lifecycle') && (
                  <div className="relative">
                    <div className="absolute -left-7 top-1.5 w-4 h-4 rounded-full bg-slate-400 border-2 border-white shadow-xs flex items-center justify-center text-white">
                      <Plus size={10} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Workspace Initialized &amp; Account Created</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">Genesis</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{activeTenantObj.created_at || formatDate(startDate)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        Tenant account was registered with Workspace ID <strong>#{editingTenantId || 'N/A'}</strong>, assigned code <strong>{activeTenantObj.code || 'N/A'}</strong>, and dedicated subdomain slug <code className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">{customSlug || 'default'}.vidyasetu.com</code>.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
            )}
            </div>

            {/* Unified Bottom Nav Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-200 mt-8">
              <div className="flex gap-2">
                {formTabs.findIndex(t => t.id === activeTab) > 0 && (
                  <Button type="button" variant="secondary" onClick={handlePrevStep} className="flex items-center gap-1">
                    <ChevronLeft size={16} /> Previous Section
                  </Button>
                )}
                {formTabs.findIndex(t => t.id === activeTab) < formTabs.length - 1 && (
                  <Button type="button" variant="secondary" onClick={handleNextStep} className="flex items-center gap-1">
                    Next Section <ChevronRight size={16} />
                  </Button>
                )}
              </div>

              <div className="flex gap-3 items-center">
                {isViewOnly ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Back to Directory</Button>
                    <Button 
                      type="button" 
                      variant="primary" 
                      onClick={() => setIsViewOnly(false)} 
                      className="flex items-center gap-1.5 shadow-sm"
                    >
                      <Pencil size={15} /> Edit Tenant Settings
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      variant="primary" 
                      onClick={handleSubmit} 
                      disabled={isUploading}
                      className="flex items-center gap-1.5 shadow-sm"
                    >
                      <Check size={16} /> {isUploading ? 'Saving Changes...' : (editingTenantId ? 'Save Changes' : 'Provision Tenant')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal: Student Deep-Dive History */}
        {selectedStudentHistory && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => setSelectedStudentHistory(null)}
          >
            <div 
              className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedStudentHistory.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Roll ID: {selectedStudentHistory.studentId} • {selectedStudentHistory.branch}</p>
                </div>
                <button 
                  onClick={() => setSelectedStudentHistory(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Course</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedStudentHistory.course}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Batch</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedStudentHistory.batch}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Admission Date</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedStudentHistory.admissionDate || 'N/A'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">Student Fee Breakdown</h4>
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-400 block">Total Fee</span>
                    <span className="font-bold text-slate-800 text-sm">₹{selectedStudentHistory.feePlan.total.toLocaleString()}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-800">
                    <span className="text-[11px] block">Paid</span>
                    <span className="font-bold text-sm">₹{selectedStudentHistory.feePlan.paid.toLocaleString()}</span>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-rose-800">
                    <span className="text-[11px] block">Remaining</span>
                    <span className="font-bold text-sm">₹{selectedStudentHistory.feePlan.pending.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Email:</strong> {selectedStudentHistory.email}</div>
                  <div><strong>Student Mobile:</strong> {selectedStudentHistory.mobile}</div>
                  <div><strong>Guardian Mobile:</strong> {selectedStudentHistory.parentMobile}</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setSelectedStudentHistory(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal: Itemized Invoice Detail */}
        {selectedInvoiceHistory && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => setSelectedInvoiceHistory(null)}
          >
            <div 
              className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">SaaS Invoice Details</div>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedInvoiceHistory.id}</h3>
                </div>
                <button 
                  onClick={() => setSelectedInvoiceHistory(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Institute Workspace</span>
                  <span className="font-bold text-slate-800">{name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Subscription Tier</span>
                  <span className="font-semibold text-slate-800">{selectedInvoiceHistory.planName || planName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Billing Interval</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedInvoiceHistory.billingCycle || billingCycle}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Payment Date</span>
                  <span className="font-semibold text-slate-800">{selectedInvoiceHistory.date || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Base Subtotal</span>
                  <span className="font-semibold text-slate-800">₹{(selectedInvoiceHistory.amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">GST Tax</span>
                  <span className="font-semibold text-slate-800">₹{(selectedInvoiceHistory.tax || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg text-base font-bold">
                  <span className="text-slate-800">Total Invoiced Amount</span>
                  <span className="text-emerald-700">₹{(selectedInvoiceHistory.total || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setSelectedInvoiceHistory(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal: Add / Generate Workspace Invoice */}
        {showAddInvoiceModal && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={() => setShowAddInvoiceModal(false)}
          >
            <div 
              className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Billing &amp; Financials</div>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">Generate Workspace Invoice</h3>
                </div>
                <button 
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
                {(() => {
                  const plansList = (availablePlans && availablePlans.length > 0) ? availablePlans : (plans || []);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Select 
                          label="Subscription Plan" 
                          value={newInvoicePlanId} 
                          onChange={(e) => {
                            const pid = e.target.value;
                            setNewInvoicePlanId(pid);
                            const selP = plansList.find((p: any) => String(p.id) === pid);
                            if (selP) {
                              const base = getPlanPriceForCycle(selP, newInvoiceCycle);
                              setNewInvoiceAmount(String(base));
                              if (selP.setupFee !== undefined || selP.setup_fee !== undefined) {
                                setNewInvoiceSetupFee(String(selP.setupFee ?? selP.setup_fee ?? 0));
                              }
                            }
                          }}
                          options={plansList.map((p: any) => {
                            const mPrice = getPlanMonthlyPrice(p);
                            const isFreeOrTrial = mPrice <= 0 || p.name?.toLowerCase().includes('starter') || p.name?.toLowerCase().includes('trial') || p.name?.toLowerCase().includes('free');
                            const priceDisplay = isFreeOrTrial ? 'Free' : `₹${mPrice.toLocaleString('en-IN')}/mo`;
                            return {
                              value: String(p.id),
                              label: `${p.name} (${priceDisplay})`
                            };
                          })}
                        />
                      </div>
                      <div>
                        <Select 
                          label="Billing Cycle" 
                          value={newInvoiceCycle} 
                          onChange={(e) => {
                            const cyc = normalizeBillingCycle(e.target.value);
                            setNewInvoiceCycle(cyc);
                            const selP = plansList.find((p: any) => String(p.id) === newInvoicePlanId);
                            if (selP) {
                              const base = getPlanPriceForCycle(selP, cyc);
                              setNewInvoiceAmount(String(base));
                            }
                            const days = (cyc === 'yearly') ? 365 : (cyc === 'quarterly' ? 90 : (cyc === 'half_yearly' ? 180 : 30));
                            setNewInvoiceEndDate(new Date(Date.now() + days * 86400000).toISOString().substring(0, 10));
                          }}
                          options={[
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'quarterly', label: 'Quarterly' },
                            { value: 'half_yearly', label: 'Half-Yearly' },
                            { value: 'yearly', label: 'Annual / Yearly' },
                            { value: 'lifetime', label: 'Lifetime' }
                          ]}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Billing Period Start" 
                    type="date" 
                    value={newInvoiceStartDate} 
                    onChange={(e) => setNewInvoiceStartDate(e.target.value)} 
                    required 
                  />
                  <Input 
                    label="Billing Period End" 
                    type="date" 
                    value={newInvoiceEndDate} 
                    onChange={(e) => setNewInvoiceEndDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input 
                    label="Plan Amount (₹)" 
                    type="number" 
                    min="0"
                    step="any"
                    value={newInvoiceAmount} 
                    onChange={(e) => setNewInvoiceAmount(e.target.value)} 
                    required 
                  />
                  <Input 
                    label="Setup Fee (₹)" 
                    type="number" 
                    min="0"
                    step="any"
                    value={newInvoiceSetupFee} 
                    onChange={(e) => setNewInvoiceSetupFee(e.target.value)} 
                  />
                  <Input 
                    label="Discount %" 
                    type="number" 
                    min="0" 
                    max="100"
                    value={newInvoiceDiscount} 
                    onChange={(e) => setNewInvoiceDiscount(e.target.value)} 
                  />
                  <Input 
                    label="GST Tax %" 
                    type="number" 
                    min="0"
                    value={newInvoiceTaxRate} 
                    onChange={(e) => setNewInvoiceTaxRate(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select 
                    label="Invoice Status" 
                    value={newInvoiceStatus} 
                    onChange={(e) => setNewInvoiceStatus(e.target.value)}
                    options={[
                      { value: 'paid', label: 'Paid in Full' },
                      { value: 'issued', label: 'Issued / Pending' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'overdue', label: 'Overdue' }
                    ]}
                  />
                  <Select 
                    label="Payment Method" 
                    value={newInvoiceMethod} 
                    onChange={(e) => setNewInvoiceMethod(e.target.value)}
                    options={[
                      { value: 'UPI', label: 'UPI / QR Payment' },
                      { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/IMPS)' },
                      { value: 'Razorpay', label: 'Razorpay Gateway' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Cheque', label: 'Cheque' }
                    ]}
                  />
                </div>

                {newInvoiceStatus === 'paid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <Input 
                      label="Payment Date" 
                      type="date" 
                      value={newInvoicePayDate} 
                      onChange={(e) => setNewInvoicePayDate(e.target.value)} 
                    />
                    <Input 
                      label="Transaction Ref / UTR" 
                      placeholder="e.g. UTR-9283741982" 
                      value={newInvoiceRef} 
                      onChange={(e) => setNewInvoiceRef(e.target.value)} 
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Custom Invoice # (Optional)" 
                    placeholder="Leave empty for auto-generation" 
                    value={newInvoiceCustomNo} 
                    onChange={(e) => setNewInvoiceCustomNo(e.target.value)} 
                  />
                  <Input 
                    label="Invoice Notes (Optional)" 
                    placeholder="e.g. Quarterly subscription renewal" 
                    value={newInvoiceNotes} 
                    onChange={(e) => setNewInvoiceNotes(e.target.value)} 
                  />
                </div>

                {/* Calculation Summary Box */}
                {(() => {
                  const b = parseFloat(newInvoiceAmount) || 0;
                  const s = parseFloat(newInvoiceSetupFee) || 0;
                  const sub = b + s;
                  const disc = (sub * (parseFloat(newInvoiceDiscount) || 0)) / 100;
                  const taxb = sub - disc;
                  const taxAmt = (taxb * (parseFloat(newInvoiceTaxRate) || 0)) / 100;
                  const tot = Math.round(taxb + taxAmt);
                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Base Plan + Setup Fee:</span>
                        <span className="font-semibold">₹{sub.toLocaleString('en-IN')}</span>
                      </div>
                      {disc > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount ({newInvoiceDiscount}%):</span>
                          <span className="font-semibold">-₹{disc.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>GST Tax ({newInvoiceTaxRate}%):</span>
                        <span className="font-semibold">₹{taxAmt.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold text-sm pt-1.5 border-t border-slate-200">
                        <span>Total Invoice Amount:</span>
                        <span className="text-blue-700">₹{tot.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowAddInvoiceModal(false)}
                    disabled={isSavingInvoice}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={isSavingInvoice}
                    className="flex items-center gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSavingInvoice ? 'Creating...' : 'Save & Record Invoice'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
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
          <p className="text-base text-slate-500 mt-2">Provision new coaching center workspaces, set allowed limits, inspect complete history, and manage billing statuses.</p>
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
            onChange={(e) => {
              setSearchTerm(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''));
              setCurrentPage(1);
            }} 
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
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }} 
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
              { value: '2', label: 'Draft' },
              { value: '3', label: 'Deleted' }
            ]} 
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700">Clear</Button>
          <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Tenant Registry</CardTitle>
        </CardHeader>
        <Table 
          dense 
          minWidth="1200px"
          colWidths={['55px', '190px', '140px', '210px', '120px', '110px', '140px', '100px', '135px']}
          headers={['ID', 'Institute Name', 'Owner', 'Email / Contact', 'Plan Tier', 'Start Date', 'Expiry Date', 'Status', 'Actions']}
        >
          {(() => {
            const paginatedTenants = filteredAndSortedTenants;
            return (
              <>
                {paginatedTenants.map((t, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => handleViewTenant(t)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{t.id}</td>
                    <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm">{t.name}</td>
                    <td className="px-3.5 py-3 text-sm text-slate-700 whitespace-nowrap">{t.legal_name || t.admin_name || 'N/A'}</td>
                    <td className="px-3.5 py-3 text-sm">
                      <div className="text-slate-800 font-medium truncate">
                        {t.contact_email || t.admin_email || 'N/A'}
                      </div>
                      {t.contact_phone && (
                        <div className="text-sm text-slate-500 mt-0.5">{t.contact_phone}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-sm font-medium">
                        {t.plan_name || 'Standard'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-sm text-slate-700 whitespace-nowrap">{t.start_date ? formatDate(t.start_date) : 'N/A'}</td>
                    <td className="px-3.5 py-3 text-sm text-slate-700 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span>{t.end_date ? formatDate(t.end_date) : 'N/A'}</span>
                        {t.is_expiring_soon === 1 && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 font-medium rounded text-[11px] flex items-center gap-1 border border-amber-200 w-fit whitespace-nowrap">
                            <AlertTriangle size={11} className="shrink-0 text-amber-600" /> Expiring Soon
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {(() => {
                        const s = t.status;
                        const label = getTenantStatusLabel(s);
                        let badgeColors = 'bg-slate-50 text-slate-700 border-slate-200';
                        if (s === 1 || s === '1' || label === 'Active') {
                          badgeColors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        } else if (s === 0 || s === '0' || label === 'Inactive') {
                          badgeColors = 'bg-red-50 text-red-700 border-red-200';
                        } else if (s === 2 || s === '2' || label === 'Draft') {
                          badgeColors = 'bg-amber-50 text-amber-800 border-amber-200';
                        } else if (s === 3 || s === '3' || label === 'Deleted') {
                          badgeColors = 'bg-slate-100 text-slate-600 border-slate-300';
                        }
                        return (
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${badgeColors}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleViewTenant(t)}
                          title="View Complete History & Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditTenant(t)}
                          title="Edit Tenant Settings"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTenantToDelete(t)}
                          title="Delete Tenant"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
      </Card>

      {/* Soft Delete Confirmation Modal */}
      {tenantToDelete && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => !isDeleting && setTenantToDelete(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Tenant Institute</h3>
                <p className="text-xs text-slate-500">Soft-delete confirmation warning</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{tenantToDelete.name}"</span>? 
              This action will soft-delete the institute workspace, revoke portal access for its users, and remove it from active directories.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setTenantToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 size={15} />
                {isDeleting ? 'Deleting...' : 'Yes, Delete Tenant'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
