import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ChevronRight, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { FeeConfigurator } from '../components/FeeConfigurator';

export const StudentRegistration = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { leads, students, convertLeadToStudent, addToast } = useApp();
  
  const lead = leads.find(l => l.id === id);
  const student = students.find(s => s.id === id || s.studentId === id);
  const prefilledFeeData = location.state?.prefilledFeeData;

  const [currentStep, setCurrentStep] = useState(1);

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
      totalFee: 0,
      discount: 0,
      netFee: 0,
      downpayment: 0,
      installments: 1,
      installmentAmount: 0
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

  useEffect(() => {
    if (student) {
      setFormData(prev => ({
        ...prev,
        student: { ...prev.student, name: student.name, mobile: student.mobile, dob: student.dob || '', gender: student.gender || '', category: student.category || 'General', currentClass: student.currentClass || '', board: student.board || '', targetExam: student.targetExam || '', yearOfAttempt: student.yearOfAttempt || '' }
      }));
      if (student.status === 'Documents Submitted' || student.status === 'Verification Pending' || student.status === 'Active Student') {
        setCurrentStep(4);
        setFeeComplete(true);
      }
    } else if (lead) {
      setFormData(prev => ({
        ...prev,
        student: { ...prev.student, name: lead.name, mobile: lead.mobile },
        course: { ...prev.course, course: lead.course || '', program: lead.program || '', level: lead.level || '' },
        parent: { ...prev.parent, mobile: lead.parentMobile || '' }
      }));
    }
  }, [lead, student]);

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

  const handleFileUpload = (type: string, file: File | null) => {
    if (!file) return;
    const newDoc = {
      type,
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    };
    setFormData(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.student.name || !formData.student.mobile || !formData.student.dob) {
        addToast('Please fill Name, Mobile, and DOB', 'error');
        return false;
      }
      if (!formData.student.currentClass || !formData.student.board || !formData.student.targetExam) {
        addToast('Please fill Academic Level, Board, and Target Exam', 'error');
        return false;
      }
    }
    if (step === 2) {
      if (!feeComplete) {
        addToast('Please select a complete Fee Configuration', 'error');
        return false;
      }
      if (formData.fee.netFee < 0) {
        addToast('Net Fee cannot be negative', 'error');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.parent.name || !formData.parent.mobile) {
        addToast('Parent Name and Mobile are mandatory', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    convertLeadToStudent(lead.id, formData);
    addToast('Student successfully registered!', 'success');
    navigate('/students'); // Or wherever
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
            <div className={`flex flex-col items-center gap-2 ${currentStep >= step.num ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                currentStep > step.num ? 'bg-blue-600 text-white' : 
                currentStep === step.num ? 'bg-blue-100 border-2 border-blue-600 text-blue-700' : 
                'bg-slate-100 border border-slate-300'
              }`}>
                {currentStep > step.num ? <CheckCircle size={16} /> : step.num}
              </div>
              <span className="text-xs font-semibold hidden sm:block">{step.label}</span>
            </div>
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
                <Input label="Student Name *" value={formData.student.name} onChange={e => handleStudentChange('name', e.target.value)} />
                <Input label="Mobile Number *" value={formData.student.mobile} onChange={e => handleStudentChange('mobile', e.target.value)} />
                <Input label="Date of Birth *" type="date" value={formData.student.dob} onChange={e => handleStudentChange('dob', e.target.value)} />
                <Select label="Gender" value={formData.student.gender} onChange={e => handleStudentChange('gender', e.target.value)} options={[{value:'',label:'Select'},{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}]} />
                <Input label="Email ID" value={formData.student.email} onChange={e => handleStudentChange('email', e.target.value)} />
                <Select label="Category" value={formData.student.category} onChange={e => handleStudentChange('category', e.target.value)} options={[{value:'General',label:'General'},{value:'OBC',label:'OBC'},{value:'SC',label:'SC'},{value:'ST',label:'ST'}]} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="lg:col-span-4"><Input label="Street Address" value={formData.student.address.street} onChange={e => handleAddressChange('street', e.target.value)} /></div>
                <Input label="City" value={formData.student.address.city} onChange={e => handleAddressChange('city', e.target.value)} />
                <Input label="State" value={formData.student.address.state} onChange={e => handleAddressChange('state', e.target.value)} />
                <Input label="Pincode" value={formData.student.address.pincode} onChange={e => handleAddressChange('pincode', e.target.value)} />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Current Academic Level *" value={formData.student.currentClass} onChange={e => handleStudentChange('currentClass', e.target.value)} options={[{value:'',label:'Select'},{value:'Class 8',label:'Class 8'},{value:'Class 9',label:'Class 9'},{value:'Class 10',label:'Class 10'},{value:'Class 11',label:'Class 11'},{value:'Class 12',label:'Class 12'},{value:'Dropper',label:'Dropper'}]} />
                <Select label="Board *" value={formData.student.board} onChange={e => handleStudentChange('board', e.target.value)} options={[{value:'',label:'Select'},{value:'CBSE',label:'CBSE'},{value:'ICSE',label:'ICSE'},{value:'State Board',label:'State Board'},{value:'Other',label:'Other'}]} />
                <Select label="Target Exam *" value={formData.student.targetExam} onChange={e => handleStudentChange('targetExam', e.target.value)} options={[{value:'',label:'Select'},{value:'JEE',label:'JEE (Main/Adv)'},{value:'NEET',label:'NEET'},{value:'Boards',label:'School Boards'},{value:'Foundation',label:'Foundation / NTSE'}]} />
                <Select label="Target Year of Attempt" value={formData.student.yearOfAttempt} onChange={e => handleStudentChange('yearOfAttempt', e.target.value)} options={[{value:'',label:'Select'},{value:'2026',label:'2026'},{value:'2027',label:'2027'},{value:'2028',label:'2028'}]} />
                <div className="md:col-span-2"><Input label="School / College Name" value={formData.student.schoolName} onChange={e => handleStudentChange('schoolName', e.target.value)} /></div>
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
                <Input label="Parent Name *" value={formData.parent.name} onChange={e => handleParentChange('name', e.target.value)} />
                <Input label="Mobile Number *" value={formData.parent.mobile} onChange={e => handleParentChange('mobile', e.target.value)} />
                <Select label="Relation" value={formData.parent.relation} onChange={e => handleParentChange('relation', e.target.value)} options={[{value:'Father',label:'Father'},{value:'Mother',label:'Mother'},{value:'Guardian',label:'Guardian'}]} />
                <Input label="Email ID" value={formData.parent.email} onChange={e => handleParentChange('email', e.target.value)} />
                <Input label="Occupation" value={formData.parent.occupation} onChange={e => handleParentChange('occupation', e.target.value)} />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">Documents Upload</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Student Photo', 'ID Proof (Aadhar)', 'Previous Marksheet'].map(docType => {
                  const uploaded = formData.documents.find(d => d.type === docType);
                  return (
                    <div key={docType} className="border border-slate-200 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 transition-colors">
                      <div className={`p-2 rounded-full ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {uploaded ? <CheckCircle size={20} /> : <Upload size={20} />}
                      </div>
                      <div className="font-medium text-slate-900">{docType}</div>
                      {uploaded ? (
                        <div className="text-xs text-emerald-600">{uploaded.fileName}</div>
                      ) : (
                        <label className="text-xs text-blue-600 cursor-pointer hover:underline">
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
            <Button variant="primary" onClick={handleSubmit} style={{ backgroundColor: '#10b981', color: 'white' }}>
              Confirm & Create Student <CheckCircle size={16} className="ml-2" />
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};
