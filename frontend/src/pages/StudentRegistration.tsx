import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ChevronRight, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { FeeConfigurator } from '../components/FeeConfigurator';
import { getEnquiryById, toLead, convertEnquiry, buildConvertPayload } from '../services/enquiryApi';
import { uploadStudentDocumentFile } from '../services/studentApi';
import type { Lead } from '../types';

export const StudentRegistration = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { students, parents, approveStudentRegistration, addToast } = useApp();

  const [apiLead, setApiLead] = useState<Lead | null>(null);
  const [leadLoading, setLeadLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const student = students.find(s => s.id === id || s.studentId === id);
  const prefilledFeeData = location.state?.prefilledFeeData;

  useEffect(() => {
    let cancelled = false;
    if (student) {
      setApiLead(null);
      setLeadLoading(false);
      return () => { cancelled = true; };
    }
    if (id) {
      getEnquiryById(id)
        .then(res => {
          if (!cancelled) {
            setApiLead(res?.data ? toLead(res.data) : null);
            setLeadLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setApiLead(null);
            setLeadLoading(false);
          }
        });
    } else {
      setLeadLoading(false);
    }
    return () => { cancelled = true; };
  }, [id, student]);

  const lead = apiLead;

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (location.state && typeof location.state.startStep === 'number') {
      return location.state.startStep;
    }
    return 1;
  });

  const [formData, setFormData] = useState({
    student: {
      name: '',
      mobile: '',
      dob: '',
      gender: '',
      email: '',
      address: { street: '', city: '', state: '', pincode: '' },
      category: 'General',
      schoolName: '',
      currentClass: '',
      board: '',
      targetExam: '',
      yearOfAttempt: ''
    },
    course: {
      course: '',
      program: '',
      level: ''
    },
    fee: {
      enrollType: 'Standard',
      course: '',
      program: '',
      level: '',
      feeSelectedStandard: '',
      feeSelectedBundle: '',
      feeSelectedSubjects: [] as string[],
      totalFee: 0,
      discount: 0,
      netFee: 0,
      downpayment: 0,
      installments: 1,
      installmentAmount: 0,
      paymentMode: ''
    },
    parent: {
      name: '',
      mobile: '',
      email: '',
      relation: 'Father',
      occupation: ''
    },
    documents: [] as { type: string, fileName: string, fileSize: string }[]
  });

  const [feeComplete, setFeeComplete] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      const parentObj = parents.find(p => p.id === student.parentId);
      setFormData({
        student: {
          name: student.name || '',
          mobile: student.mobile || '',
          dob: student.dob || '2010-05-14',
          gender: student.gender || 'Male',
          email: student.email || `${student.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          address: {
            street: student.address?.street || '',
            city: student.address?.city || '',
            state: student.address?.state || '',
            pincode: student.address?.pincode || ''
          },
          category: student.category || 'General',
          schoolName: student.schoolName || 'National Public School',
          currentClass: student.currentClass || 'Class 11',
          board: student.board || 'CBSE',
          targetExam: student.targetExam || 'JEE',
          yearOfAttempt: student.yearOfAttempt || '2028'
        },
        course: {
          course: student.course || 'JEE Prep Course',
          program: student.program || '2 Year',
          level: student.level || 'year1'
        },
        fee: {
          enrollType: 'Standard',
          course: student.course || 'JEE Prep Course',
          program: student.program || '2 Year',
          level: student.level || 'year1',
          feeSelectedStandard: 'FP-01',
          feeSelectedBundle: '',
          feeSelectedSubjects: [],
          totalFee: student.feePlan?.total || 120000,
          discount: 0,
          netFee: student.feePlan?.total || 120000,
          downpayment: student.feePlan?.paid || 30000,
          installments: 10,
          installmentAmount: 9000,
          paymentMode: 'Online'
        },
        parent: {
          name: parentObj?.name || 'Mr. ' + (student.name.split(' ')[1] || student.name),
          mobile: parentObj?.mobile || student.mobile || '9877112200',
          email: parentObj?.email || 'parent@example.com',
          relation: parentObj?.relation || 'Father',
          occupation: 'Business'
        },
        documents: [
          { type: 'Student Photo', fileName: `${student.name.toLowerCase().replace(/\s+/g, '_')}_photo.jpg`, fileSize: '1.2 MB' },
          { type: 'ID Proof (Aadhar)', fileName: 'aadhar_card.pdf', fileSize: '2.4 MB' },
          { type: 'Previous Marksheet', fileName: 'class10_marksheet.pdf', fileSize: '1.8 MB' }
        ]
      });
      setFeeComplete(true);
    } else if (lead) {
      const feeCfg = prefilledFeeData || lead.feeConfig;
      setFormData(prev => ({
        ...prev,
        student: {
          ...prev.student,
          name: lead.name || prev.student.name || '',
          mobile: lead.mobile || prev.student.mobile || '',
          dob: prev.student.dob || '2010-01-01',
          gender: prev.student.gender || 'Male',
          email: lead.email || prev.student.email || (lead.name ? `${lead.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student'}@student.vidyasetu.com` : ''),
          address: {
            street: prev.student.address?.street || '123 Central Avenue',
            city: lead.branch || lead.preferredBranch || prev.student.address?.city || 'Main City',
            state: prev.student.address?.state || 'Maharashtra',
            pincode: prev.student.address?.pincode || '400001'
          },
          category: prev.student.category || 'General',
          schoolName: prev.student.schoolName || 'National Public High School',
          currentClass: lead.level || prev.student.currentClass || 'Class 11',
          board: prev.student.board || 'CBSE',
          targetExam: prev.student.targetExam || (lead.course && lead.course.toLowerCase().includes('jee') ? 'JEE' : lead.course && lead.course.toLowerCase().includes('neet') ? 'NEET' : 'Boards'),
          yearOfAttempt: prev.student.yearOfAttempt || '2028'
        },
        course: {
          course: feeCfg?.course || lead.course || '',
          program: feeCfg?.program || lead.program || '',
          level: feeCfg?.level || lead.level || 'year1'
        },
        fee: feeCfg ? {
          enrollType: feeCfg.enrollType || 'Standard',
          course: feeCfg.course || lead.course || '',
          program: feeCfg.program || lead.program || '',
          level: feeCfg.level || lead.level || 'year1',
          feeSelectedStandard: feeCfg.feeSelectedStandard || '',
          feeSelectedBundle: feeCfg.feeSelectedBundle || '',
          feeSelectedSubjects: feeCfg.feeSelectedSubjects || [],
          totalFee: feeCfg.totalFee || feeCfg.netFee || 0,
          discount: feeCfg.discount || 0,
          netFee: feeCfg.netFee || feeCfg.totalFee || 0,
          downpayment: feeCfg.downpayment || 0,
          installments: feeCfg.installments || 1,
          installmentAmount: feeCfg.installmentAmount || 0,
          paymentMode: feeCfg.paymentMode || 'Cash'
        } : prev.fee,
        parent: {
          ...prev.parent,
          name: lead.parentName || prev.parent.name || ('Parent of ' + lead.name),
          mobile: lead.parentMobile || prev.parent.mobile || lead.mobile || '',
          email: lead.parentEmail || prev.parent.email || (lead.parentMobile ? `parent.${lead.parentMobile}@parent.vidyasetu.com` : (lead.mobile ? `parent.${lead.mobile}@parent.vidyasetu.com` : 'parent@vidyasetu.com')),
          relation: prev.parent.relation || 'Father',
          occupation: prev.parent.occupation || 'Service / Professional'
        }
      }));
      if (feeCfg) {
        setFeeComplete(true);
      }
    }
  }, [lead, student, parents, prefilledFeeData]);

  if (leadLoading && !student) {
    return <div className="p-8 text-center text-slate-400">Loading lead details...</div>;
  }

  if (!lead && !student) {
    return <div className="p-8 text-center text-red-500">Record not found.</div>;
  }

  const targetEntity = student || lead;

  const handleStudentChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, student: { ...prev.student, [field]: value } }));
  };
  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, student: { ...prev.student, address: { ...prev.student.address, [field]: value } } }));
  };
  const handleParentChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, parent: { ...prev.parent, [field]: value } }));
  };

  const handleFileUpload = async (type: string, file: File | null) => {
    if (!file) return;
    try {
      setUploadingDoc(type);
      const uploaded = await uploadStudentDocumentFile(file);
      const newDoc = {
        type,
        fileName: uploaded.fileName || file.name,
        fileSize: uploaded.fileSize || (file.size / 1024 / 1024).toFixed(2) + ' MB',
        storage_key: uploaded.storageKey,
        mime_type: uploaded.mimeType,
        status: 0
      };
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents.filter(d => d.type !== type), newDoc]
      }));
      addToast(`${type} uploaded successfully!`, 'success');
    } catch (err: any) {
      console.warn('Backend upload fallback:', err);
      const newDoc = {
        type,
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        status: 0
      };
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents.filter(d => d.type !== type), newDoc]
      }));
      addToast(`${type} attached.`, 'info');
    } finally {
      setUploadingDoc(null);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.student.name?.trim()) {
        addToast('Please enter Student Full Name', 'error');
        return false;
      }
      if (!formData.student.mobile?.trim() || formData.student.mobile.trim().length < 7) {
        addToast('Please enter a valid Student Mobile Number (at least 7 digits)', 'error');
        return false;
      }
      if (!formData.student.dob?.trim()) {
        addToast('Please select Student Date of Birth', 'error');
        return false;
      }
      if (!formData.student.gender?.trim()) {
        addToast('Please select Student Gender', 'error');
        return false;
      }
      if (!formData.student.email?.trim() || !formData.student.email.includes('@')) {
        addToast('Please enter a valid Student Email ID', 'error');
        return false;
      }
      if (!formData.student.address.street?.trim()) {
        addToast('Please enter Street Address', 'error');
        return false;
      }
      if (!formData.student.address.city?.trim()) {
        addToast('Please enter City', 'error');
        return false;
      }
      if (!formData.student.address.state?.trim()) {
        addToast('Please enter State', 'error');
        return false;
      }
      if (!formData.student.address.pincode?.trim()) {
        addToast('Please enter Pincode', 'error');
        return false;
      }
      if (!formData.student.currentClass?.trim()) {
        addToast('Please select Current Academic Level', 'error');
        return false;
      }
      if (!formData.student.board?.trim()) {
        addToast('Please select Academic Board', 'error');
        return false;
      }
      if (!formData.student.targetExam?.trim()) {
        addToast('Please select Target Exam', 'error');
        return false;
      }
      if (!formData.student.yearOfAttempt?.trim()) {
        addToast('Please select Target Year of Attempt', 'error');
        return false;
      }
      if (!formData.student.schoolName?.trim()) {
        addToast('Please enter School / College Name', 'error');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.course.course || !formData.course.program) {
        addToast('Please select Course and Program in Fee Configurator', 'error');
        return false;
      }
      if (!feeComplete) {
        addToast('Please complete Fee Configuration (select standard package / subjects)', 'error');
        return false;
      }
      if (formData.fee.netFee < 0) {
        addToast('Net Fee cannot be negative', 'error');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.parent.name?.trim()) {
        addToast('Please enter Parent / Guardian Name', 'error');
        return false;
      }
      if (!formData.parent.mobile?.trim() || formData.parent.mobile.trim().length < 7) {
        addToast('Please enter a valid Parent Mobile Number', 'error');
        return false;
      }
      if (!formData.parent.relation?.trim()) {
        addToast('Please select Parent Relation', 'error');
        return false;
      }
      if (!formData.parent.email?.trim() || !formData.parent.email.includes('@')) {
        addToast('Please enter a valid Parent Email ID', 'error');
        return false;
      }
      if (!formData.parent.occupation?.trim()) {
        addToast('Please enter Parent Occupation', 'error');
        return false;
      }
    }
    return true;
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep > currentStep) {
      for (let s = currentStep; s < targetStep; s++) {
        if (!validateStep(s)) {
          return;
        }
      }
    }
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    if (student) {
      approveStudentRegistration(student.id);
      addToast('Admission approved successfully!', 'success');
      navigate('/leads/admission');
      return;
    }
    if (lead) {
      try {
        setConverting(true);
        await convertEnquiry(id as string, buildConvertPayload(formData));
        addToast('Student successfully registered!', 'success');
        navigate('/leads/admission');
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to register student.';
        addToast(msg, 'error');
        setConverting(false);
      }
    }
  };

  const steps = [
    { num: 1, label: 'Basic + Academic' },
    { num: 2, label: 'Course + Fee' },
    { num: 3, label: 'Parent + Documents' },
    { num: 4, label: 'Review' }
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
          <ArrowLeft size={16} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {student ? 'Review Admission' : 'Convert to Student'}
          </h1>
          <p className="text-sm text-slate-500">
            {student ? 'Student Record:' : 'Registering Lead:'} <span className="font-semibold text-slate-700">{targetEntity?.name}</span>
          </p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8 px-4 sm:px-8">
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <button
              type="button"
              onClick={() => handleStepClick(step.num)}
              className={`flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 ${currentStep >= step.num ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                currentStep > step.num ? 'bg-blue-600 text-white' : 
                currentStep === step.num ? 'bg-blue-100 border-2 border-blue-600 text-blue-700' : 
                'bg-slate-100 border border-slate-300'
              }`}>
                {currentStep > step.num ? <CheckCircle size={16} /> : step.num}
              </div>
              <span className="text-xs font-semibold hidden sm:block">{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${currentStep > step.num ? 'bg-blue-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Step 1: Basic + Academic */}
        {currentStep === 1 && (
          <div className="p-6 space-y-8 animate-fade-in">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Student Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Student Name *" required value={formData.student.name} onChange={e => handleStudentChange('name', e.target.value)} />
                <Input label="Mobile Number *" required value={formData.student.mobile} onChange={e => handleStudentChange('mobile', e.target.value)} />
                <Input label="Date of Birth *" required type="date" value={formData.student.dob} onChange={e => handleStudentChange('dob', e.target.value)} />
                <Select label="Gender *" value={formData.student.gender} onChange={e => handleStudentChange('gender', e.target.value)} options={[{value:'',label:'Select'},{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}]} />
                <Input label="Email ID *" required type="email" value={formData.student.email} onChange={e => handleStudentChange('email', e.target.value)} />
                <Select label="Category" value={formData.student.category} onChange={e => handleStudentChange('category', e.target.value)} options={[{value:'General',label:'General'},{value:'OBC',label:'OBC'},{value:'SC',label:'SC'},{value:'ST',label:'ST'}]} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="lg:col-span-4"><Input label="Street Address *" required value={formData.student.address.street} onChange={e => handleAddressChange('street', e.target.value)} /></div>
                <Input label="City *" required value={formData.student.address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                <Input label="State *" required value={formData.student.address.state} onChange={e => handleAddressChange('state', e.target.value)} />
                <Input label="Pincode *" required value={formData.student.address.pincode} onChange={e => handleAddressChange('pincode', e.target.value)} />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Current Academic Level *" value={formData.student.currentClass} onChange={e => handleStudentChange('currentClass', e.target.value)} options={[{value:'',label:'Select'},{value:'Class 8',label:'Class 8'},{value:'Class 9',label:'Class 9'},{value:'Class 10',label:'Class 10'},{value:'Class 11',label:'Class 11'},{value:'Class 12',label:'Class 12'},{value:'Dropper',label:'Dropper'}]} />
                <Select label="Board *" value={formData.student.board} onChange={e => handleStudentChange('board', e.target.value)} options={[{value:'',label:'Select'},{value:'CBSE',label:'CBSE'},{value:'ICSE',label:'ICSE'},{value:'State Board',label:'State Board'},{value:'Other',label:'Other'}]} />
                <Select label="Target Exam *" value={formData.student.targetExam} onChange={e => handleStudentChange('targetExam', e.target.value)} options={[{value:'',label:'Select'},{value:'JEE',label:'JEE (Main/Adv)'},{value:'NEET',label:'NEET'},{value:'Boards',label:'School Boards'},{value:'Foundation',label:'Foundation / NTSE'}]} />
                <Select label="Target Year of Attempt *" value={formData.student.yearOfAttempt} onChange={e => handleStudentChange('yearOfAttempt', e.target.value)} options={[{value:'',label:'Select'},{value:'2026',label:'2026'},{value:'2027',label:'2027'},{value:'2028',label:'2028'}]} />
                <div className="md:col-span-2"><Input label="School / College Name *" required value={formData.student.schoolName} onChange={e => handleStudentChange('schoolName', e.target.value)} /></div>
              </div>
            </section>
          </div>
        )}

        {/* Step 2: Course & Fee */}
        {currentStep === 2 && (
          <div className="p-6 animate-fade-in space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Course & Fee Assignment</h3>
            <FeeConfigurator 
              initialState={prefilledFeeData || formData.fee}
              initialCourse={formData.course.course}
              initialProgram={formData.course.program}
              initialLevel={formData.course.level}
              onChange={(feeData, complete) => {
                setFeeComplete(complete);
                setFormData(prev => ({
                  ...prev,
                  course: { course: feeData.course, program: feeData.program, level: feeData.level },
                  fee: feeData
                }));
              }}
            />
          </div>
        )}

        {/* Step 3: Parent & Documents */}
        {currentStep === 3 && (
          <div className="p-6 space-y-8 animate-fade-in">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Parent / Guardian Details</h3>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-4">
                Parent Account will be created automatically. Parent login will be their Mobile Number.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Parent Name *" required value={formData.parent.name} onChange={e => handleParentChange('name', e.target.value)} />
                <Input label="Mobile Number *" required value={formData.parent.mobile} onChange={e => handleParentChange('mobile', e.target.value)} />
                <Select label="Relation *" value={formData.parent.relation} onChange={e => handleParentChange('relation', e.target.value)} options={[{value:'Father',label:'Father'},{value:'Mother',label:'Mother'},{value:'Guardian',label:'Guardian'}]} />
                <Input label="Email ID *" required type="email" value={formData.parent.email} onChange={e => handleParentChange('email', e.target.value)} />
                <Input label="Occupation *" required value={formData.parent.occupation} onChange={e => handleParentChange('occupation', e.target.value)} />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Documents Upload</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Student Photo', 'ID Proof (Aadhar)', 'Previous Marksheet'].map(docType => {
                  const uploaded = formData.documents.find(d => d.type === docType);
                  const isUploading = uploadingDoc === docType;
                  return (
                    <div key={docType} className="border border-slate-200 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 transition-colors">
                      <div className={`p-2 rounded-full ${uploaded ? 'bg-emerald-100 text-emerald-600' : isUploading ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                        {uploaded ? <CheckCircle size={20} /> : <Upload size={20} />}
                      </div>
                      <div className="font-medium text-slate-900">{docType}</div>
                      {isUploading ? (
                        <div className="text-xs text-blue-600 font-semibold animate-pulse">Uploading file...</div>
                      ) : uploaded ? (
                        <div className="space-y-1">
                          <div className="text-xs text-emerald-600 font-semibold truncate max-w-[180px]">{uploaded.fileName}</div>
                          <label className="text-[11px] text-slate-400 hover:text-blue-600 cursor-pointer block underline">
                            Change File
                            <input type="file" className="hidden" onChange={e => handleFileUpload(docType, e.target.files?.[0] || null)} />
                          </label>
                        </div>
                      ) : (
                        <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                          Browse File
                          <input type="file" className="hidden" onChange={e => handleFileUpload(docType, e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="p-6 space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Final Review & Confirmation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Student Info</h4>
                <div className="text-sm space-y-1 text-slate-600">
                  <div><strong>Name:</strong> {formData.student.name}</div>
                  <div><strong>Mobile:</strong> {formData.student.mobile}</div>
                  <div><strong>DOB:</strong> {formData.student.dob} ({formData.student.gender})</div>
                  <div><strong>Academics:</strong> {formData.student.currentClass}, {formData.student.board} for {formData.student.targetExam}</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Parent Info</h4>
                <div className="text-sm space-y-1 text-slate-600">
                  <div><strong>Name:</strong> {formData.parent.name} ({formData.parent.relation})</div>
                  <div><strong>Mobile:</strong> {formData.parent.mobile}</div>
                  <div><strong>Email:</strong> {formData.parent.email || 'N/A'}</div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 md:col-span-2">
                <h4 className="font-semibold text-blue-800 mb-2">Enrollment & Fee Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-900 mt-4">
                  <div>
                    <div className="text-xs text-blue-600/80 uppercase font-bold">Course</div>
                    <div className="font-semibold">{formData.course.course}</div>
                    <div className="text-xs opacity-80">{formData.course.program} {formData.course.level ? `(${formData.course.level})` : ''}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600/80 uppercase font-bold">Total Fee</div>
                    <div className="font-semibold text-lg">₹{formData.fee.totalFee.toLocaleString()}</div>
                    {formData.fee.discount > 0 && <div className="text-xs text-emerald-600">Discount: -₹{formData.fee.discount.toLocaleString()}</div>}
                  </div>
                  <div>
                    <div className="text-xs text-blue-600/80 uppercase font-bold">Downpayment</div>
                    <div className="font-semibold text-lg">₹{formData.fee.downpayment.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600/80 uppercase font-bold">Installment Schedule</div>
                    <div className="font-semibold text-lg">{formData.fee.installments} Months</div>
                    <div className="text-xs opacity-80">₹{formData.fee.installmentAmount.toLocaleString()} / mo</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg text-amber-800 text-sm">
              <CheckCircle className="shrink-0 text-amber-500" />
              <span>By confirming, you will create a new Student record, a Parent account, an Enrollment ledger, and a Fee plan. The lead will be marked as Converted.</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <Button variant="secondary" onClick={handleBack} disabled={currentStep === 1}>
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          {currentStep < 4 ? (
            <Button variant="primary" onClick={handleNext}>
              Next Step <ChevronRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} style={{ backgroundColor: '#10b981', color: 'white' }} disabled={converting}>
              {student ? 'Approve & Verify Admission' : (converting ? 'Creating Student...' : 'Confirm & Create Student')} <CheckCircle size={16} className="ml-2" />
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};
