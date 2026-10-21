import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Building2, Users, TrendingUp, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2, Phone, Mail,
  MapPin, AlertCircle, FileText, Upload, Check, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface SubscriptionPlanOption {
  id: number;
  name: string;
  code: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh'
];

export const RegisterTenant: React.FC = () => {
  const navigate = useNavigate();

  // 1 = Institution Details, 2 = Admin Details, 3 = Required Documents, 4 = Preferences & Submit
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form State: Strictly fields that map 1:1 to saas_leads columns
  const [formData, setFormData] = useState({
    // Step 1: Institution Details
    instituteName: '',
    state: '',
    city: '',
    pincode: '',
    addressLine1: '',

    // Step 2: Admin / Contact Details
    contactPerson: '',
    designation: '',
    mobile: '',
    altMobile: '',
    email: '',

    // Step 4: Preferences
    planId: '',
    remarks: ''
  });

  // Step 3: Document Files State
  const [docFiles, setDocFiles] = useState<{
    regDoc: File | null;
    panDoc: File | null;
    adminIdDoc: File | null;
    gstDoc: File | null;
    logo: File | null;
  }>({
    regDoc: null,
    panDoc: null,
    adminIdDoc: null,
    gstDoc: null,
    logo: null
  });

  // Load public plans for dropdown
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get('/api/public/subscription-plans');
        if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
          setPlans(res.data.data);
          if (res.data.data.length > 0) {
            setFormData(prev => ({ ...prev, planId: String(res.data.data[0].id) }));
          }
        }
      } catch (err) {
        console.error('Failed to load subscription plans:', err);
      }
    };
    fetchPlans();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMessage('');
  };

  const handleFileChange = (field: keyof typeof docFiles, file: File | null) => {
    if (!file) {
      setDocFiles(prev => ({ ...prev, [field]: null }));
      return;
    }

    // Size limit check: 5MB for documents, 2MB for logo
    const maxSizeBytes = field === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`${file.name} is too large. Maximum size allowed is ${field === 'logo' ? '2MB' : '5MB'}.`);
      return;
    }

    setDocFiles(prev => ({ ...prev, [field]: file }));
    setErrorMessage('');
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!formData.instituteName.trim()) {
      setErrorMessage('Please enter the Institution Name');
      return false;
    }
    if (!formData.state) {
      setErrorMessage('Please select a State');
      return false;
    }
    if (!formData.city.trim()) {
      setErrorMessage('Please enter a City');
      return false;
    }
    if (formData.pincode.trim()) {
      const cleanPin = formData.pincode.replace(/[^0-9]/g, '');
      if (cleanPin.length !== 6) {
        setErrorMessage('Pin code must be exactly 6 digits');
        return false;
      }
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!formData.contactPerson.trim()) {
      setErrorMessage('Please enter the Contact Person Name');
      return false;
    }
    const cleanMobile = formData.mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit mobile number (e.g. 9876543210)');
      return false;
    }
    if (formData.altMobile.trim()) {
      const cleanAlt = formData.altMobile.replace(/[^0-9]/g, '');
      if (cleanAlt.length !== 10 || !/^[6-9]\d{9}$/.test(cleanAlt)) {
        setErrorMessage('Alternate mobile must be a valid 10-digit number');
        return false;
      }
    }
    if (!formData.email.trim()) {
      setErrorMessage('Please enter an Email Address (used for your onboarding & login notifications)');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    return true;
  };

  // Step 3 Validation (Documents)
  const validateStep3 = (): boolean => {
    if (!docFiles.regDoc) {
      setErrorMessage('Please upload the Institution Registration Proof (Trust deed / Gumasta / Incorporation / MSME)');
      return false;
    }
    if (!docFiles.panDoc) {
      setErrorMessage('Please upload the Institute / Owner PAN Card');
      return false;
    }
    if (!docFiles.adminIdDoc) {
      setErrorMessage('Please upload the Director / Admin ID Proof (Aadhaar Card or Passport)');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = new FormData();
      payload.append('instituteName', formData.instituteName.trim());
      if (formData.addressLine1.trim()) payload.append('addressLine1', formData.addressLine1.trim());
      payload.append('city', formData.city.trim());
      payload.append('state', formData.state);
      if (formData.pincode.trim()) payload.append('pincode', formData.pincode.trim());
      payload.append('contactPerson', formData.contactPerson.trim());
      if (formData.designation.trim()) payload.append('designation', formData.designation.trim());
      payload.append('mobile', formData.mobile.replace(/[^0-9]/g, ''));
      if (formData.altMobile.trim()) payload.append('altMobile', formData.altMobile.replace(/[^0-9]/g, ''));
      payload.append('email', formData.email.trim());
      if (formData.planId) payload.append('planId', formData.planId);
      if (formData.remarks.trim()) payload.append('remarks', formData.remarks.trim());

      // Append files
      if (docFiles.regDoc) payload.append('reg_doc', docFiles.regDoc);
      if (docFiles.panDoc) payload.append('pan_doc', docFiles.panDoc);
      if (docFiles.adminIdDoc) payload.append('admin_id_doc', docFiles.adminIdDoc);
      if (docFiles.gstDoc) payload.append('gst_doc', docFiles.gstDoc);
      if (docFiles.logo) payload.append('logo', docFiles.logo);

      const res = await axios.post('/api/public/leads', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.status === 'success') {
        setSubmitSuccess(true);
      } else {
        setErrorMessage(res.data?.message || 'Failed to submit registration request.');
      }
    } catch (err: any) {
      console.error('Error submitting tenant registration:', err);
      setErrorMessage(err.response?.data?.message || 'Server error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Institution' },
    { num: 2, title: 'Admin' },
    { num: 3, title: 'Documents' },
    { num: 4, title: 'Submit' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-100/90 overflow-y-auto py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 mb-16">

        {/* ── Left Hero Side (Branding & Community) ── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-emerald-50/60 p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80 relative overflow-hidden">
          {/* Subtle Decorative Background Blob */}
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

          {/* Top: Logo & Slogan */}
          <div className="space-y-6 relative z-10">
            <Link to="/login" className="inline-block group">
              <img
                src="/logo.png"
                alt="Vidya Setu Logo"
                className="h-16 sm:h-20 w-auto object-contain transition-transform group-hover:scale-102"
              />
            </Link>

            <div className="space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight whitespace-nowrap">
                Join the <span className="text-blue-600">Community</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Register your institution and start connecting learners with opportunities.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Building2 size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Showcase Your Institution</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Launch branded course catalogs and reach more students across branches.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Users size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Manage Programs & Batches</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Control admissions, lectures, timetable schedules, and faculty registers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Grow Together</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Real-time fee collections, biometric attendance, and student performance tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Illustration Graphic */}
          <div className="mt-8 relative z-10 pt-6 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <span>© {new Date().getFullYear()} VidyaSetu EdTech</span>
            <span className="font-semibold text-blue-600">Enterprise Edition</span>
          </div>
        </div>

        {/* ── Right Content Side (Registration Form Stepper) ── */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white relative">
          {submitSuccess ? (
            /* Success Confirmation Screen */
            <div className="my-auto text-center space-y-5 py-12 px-4 animate-fade-in max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registration Request Received!</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Thank you for registering <strong className="text-slate-900">{formData.instituteName}</strong>! Your request has been submitted successfully. Further updates regarding your account will be sent to your registered {formData.email ? <>email (<strong className="text-slate-900 font-mono">{formData.email}</strong>)</> : <>mobile number (<strong className="text-slate-900 font-mono">+91 {formData.mobile}</strong>)</>}.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-left space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Person:</span>
                  <span className="font-semibold">{formData.contactPerson}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile Number:</span>
                  <span className="font-mono font-semibold">{formData.mobile}</span>
                </div>
                {formData.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono">{formData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span>{formData.city}, {formData.state}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate('/login')}
                  className="py-3 font-bold"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Title & Subtitle */}
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tenant Registration</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Create your institution account to get started on Vidya Setu.
                </p>
              </div>

              {/* Progress Stepper Bar (3 Simple Steps) */}
              <div className="py-2">
                <div className="flex items-center justify-between relative">
                  {/* Stepper Line */}
                  <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />
                  <div
                    className="absolute top-3.5 left-8 h-0.5 bg-blue-600 -z-0 transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / (stepsList.length - 1)) * 88}%` }}
                  />

                  {stepsList.map(s => {
                    const isActive = currentStep === s.num;
                    const isPassed = currentStep > s.num;
                    return (
                      <div key={s.num} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isPassed
                              ? 'bg-blue-600 text-white'
                              : isActive
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 size={14} /> : s.num}
                        </div>
                        <span
                          className={`text-[10px] mt-1.5 font-semibold text-center whitespace-nowrap ${
                            isActive ? 'text-blue-600' : isPassed ? 'text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Card Container */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5">

                {/* ── STEP 1: Institution Details ── */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Institution Details</h3>
                      <p className="text-xs text-slate-500">Provide your institution name and location.</p>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Institution Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Institution Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Allen Career Institute / Apex Academy"
                          value={formData.instituteName}
                          onChange={e => handleChange('instituteName', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        />
                      </div>

                      {/* State & City */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            State <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.state}
                            onChange={e => handleChange('state', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium cursor-pointer"
                          >
                            <option value="">Select state</option>
                            {INDIAN_STATES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Pune / Kota / Jaipur"
                            value={formData.city}
                            onChange={e => handleChange('city', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* Pincode & Full Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Pin Code
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 411001"
                            value={formData.pincode}
                            onChange={e => handleChange('pincode', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Campus Address
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Main Road, Sector 4"
                            value={formData.addressLine1}
                            onChange={e => handleChange('addressLine1', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Admin Details ── */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Admin & Contact Details</h3>
                      <p className="text-xs text-slate-500">Provide official contact information for onboarding.</p>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Contact Person Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Contact Person Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Kumar"
                          value={formData.contactPerson}
                          onChange={e => handleChange('contactPerson', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        />
                      </div>

                      {/* Designation */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Director / Owner / Principal"
                          value={formData.designation}
                          onChange={e => handleChange('designation', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        />
                      </div>

                      {/* Mobile & Alt Mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Mobile Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                              +91
                            </span>
                            <input
                              type="tel"
                              maxLength={10}
                              placeholder="9876543210"
                              value={formData.mobile}
                              onChange={e => handleChange('mobile', e.target.value)}
                              className="w-full pl-12 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Alternate Mobile
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="Optional backup phone"
                            value={formData.altMobile}
                            onChange={e => handleChange('altMobile', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono font-medium"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. rajesh@apexacademy.com"
                          value={formData.email}
                          onChange={e => handleChange('email', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Document Uploads & KYC ── */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Institution Verification Documents</h3>
                      <p className="text-xs text-slate-500">
                        Upload required legal KYC documents for your academy's verification and approval.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Document 1: Registration Proof (Mandatory) */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        docFiles.regDoc ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              docFiles.regDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>Institution Registration Proof</span>
                                <span className="text-red-500">*</span>
                                {docFiles.regDoc && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                    <Check size={10} /> Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Trust deed, Gumasta, Incorporation certificate, or MSME (PDF, JPG, PNG &bull; Max 5MB)
                              </p>
                              {docFiles.regDoc && (
                                <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate max-w-[280px]">
                                  {docFiles.regDoc.name} ({(docFiles.regDoc.size / (1024 * 1024)).toFixed(2)} MB)
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            {docFiles.regDoc ? (
                              <button
                                type="button"
                                onClick={() => handleFileChange('regDoc', null)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-md transition"
                              >
                                <X size={16} />
                              </button>
                            ) : (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:text-blue-600 transition">
                                <Upload size={13} />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept=".pdf,image/jpeg,image/png,image/jpg"
                                  className="hidden"
                                  onChange={e => handleFileChange('regDoc', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Document 2: PAN Card (Mandatory) */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        docFiles.panDoc ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              docFiles.panDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>Institute / Owner PAN Card</span>
                                <span className="text-red-500">*</span>
                                {docFiles.panDoc && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                    <Check size={10} /> Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Official institution PAN or Owner/Director PAN (PDF, JPG, PNG &bull; Max 5MB)
                              </p>
                              {docFiles.panDoc && (
                                <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate max-w-[280px]">
                                  {docFiles.panDoc.name} ({(docFiles.panDoc.size / (1024 * 1024)).toFixed(2)} MB)
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            {docFiles.panDoc ? (
                              <button
                                type="button"
                                onClick={() => handleFileChange('panDoc', null)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-md transition"
                              >
                                <X size={16} />
                              </button>
                            ) : (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:text-blue-600 transition">
                                <Upload size={13} />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept=".pdf,image/jpeg,image/png,image/jpg"
                                  className="hidden"
                                  onChange={e => handleFileChange('panDoc', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Document 3: Admin ID Proof (Mandatory) */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        docFiles.adminIdDoc ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              docFiles.adminIdDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>Director / Admin ID Proof</span>
                                <span className="text-red-500">*</span>
                                {docFiles.adminIdDoc && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                    <Check size={10} /> Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Aadhaar card, Passport, or Voter ID of the contact person (PDF, JPG, PNG &bull; Max 5MB)
                              </p>
                              {docFiles.adminIdDoc && (
                                <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate max-w-[280px]">
                                  {docFiles.adminIdDoc.name} ({(docFiles.adminIdDoc.size / (1024 * 1024)).toFixed(2)} MB)
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            {docFiles.adminIdDoc ? (
                              <button
                                type="button"
                                onClick={() => handleFileChange('adminIdDoc', null)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-md transition"
                              >
                                <X size={16} />
                              </button>
                            ) : (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:text-blue-600 transition">
                                <Upload size={13} />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept=".pdf,image/jpeg,image/png,image/jpg"
                                  className="hidden"
                                  onChange={e => handleFileChange('adminIdDoc', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Document 4: GST Certificate (Optional) */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        docFiles.gstDoc ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              docFiles.gstDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>GST Certificate</span>
                                <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                                {docFiles.gstDoc && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                    <Check size={10} /> Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                GST registration certificate for tax invoices (PDF, JPG, PNG &bull; Max 5MB)
                              </p>
                              {docFiles.gstDoc && (
                                <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate max-w-[280px]">
                                  {docFiles.gstDoc.name} ({(docFiles.gstDoc.size / (1024 * 1024)).toFixed(2)} MB)
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            {docFiles.gstDoc ? (
                              <button
                                type="button"
                                onClick={() => handleFileChange('gstDoc', null)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-md transition"
                              >
                                <X size={16} />
                              </button>
                            ) : (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:text-blue-600 transition">
                                <Upload size={13} />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept=".pdf,image/jpeg,image/png,image/jpg"
                                  className="hidden"
                                  onChange={e => handleFileChange('gstDoc', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Document 5: Institution Logo (Optional) */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        docFiles.logo ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              docFiles.logo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                              <Upload size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>Institution Logo</span>
                                <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                                {docFiles.logo && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                    <Check size={10} /> Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Used on your portal header and student fee receipts (JPG, PNG, SVG &bull; Max 2MB)
                              </p>
                              {docFiles.logo && (
                                <p className="text-[11px] text-emerald-700 font-medium mt-1 truncate max-w-[280px]">
                                  {docFiles.logo.name} ({(docFiles.logo.size / (1024 * 1024)).toFixed(2)} MB)
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            {docFiles.logo ? (
                              <button
                                type="button"
                                onClick={() => handleFileChange('logo', null)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-md transition"
                              >
                                <X size={16} />
                              </button>
                            ) : (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:text-blue-600 transition">
                                <Upload size={13} />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/jpg,image/svg+xml"
                                  className="hidden"
                                  onChange={e => handleFileChange('logo', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* ── STEP 4: Preferences & Submit ── */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Preferences & Remarks</h3>
                      <p className="text-xs text-slate-500">Select a preferred plan or add notes for onboarding.</p>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Subscription Plan Selection */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Interested Subscription Plan
                        </label>
                        <select
                          value={formData.planId}
                          onChange={e => handleChange('planId', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium cursor-pointer"
                        >
                          <option value="">No preference / Let team recommend</option>
                          {plans.map(p => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name} {p.monthly_price ? `(₹${Number(p.monthly_price).toLocaleString('en-IN')}/mo)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Remarks / Requirements
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Tell us about your branches, batch size, or requirements..."
                          value={formData.remarks}
                          onChange={e => handleChange('remarks', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium resize-none"
                        />
                      </div>

                      {/* Summary Review Box */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-blue-600 block">Summary Review</span>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Institution:</span>
                          <span className="font-semibold text-slate-900">{formData.instituteName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Contact Person:</span>
                          <span className="font-medium">{formData.contactPerson} (+91 {formData.mobile})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Documents Attached:</span>
                          <span className="text-emerald-700 font-semibold">
                            {[docFiles.regDoc, docFiles.panDoc, docFiles.adminIdDoc, docFiles.gstDoc, docFiles.logo].filter(Boolean).length} Files Selected
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2 animate-fade-in">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="flex items-center justify-between pt-2">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <ArrowLeft size={14} /> Back
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 text-xs font-bold px-6 py-2.5"
                  >
                    {currentStep === 1 && 'Next: Admin Details'}
                    {currentStep === 2 && 'Next: Upload Documents'}
                    {currentStep === 3 && 'Next: Preferences'}
                    <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-xs font-bold px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Submit Registration
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Bottom Login Link */}
              <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-bold hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
