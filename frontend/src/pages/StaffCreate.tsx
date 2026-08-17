import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  User, Phone, Briefcase, GitBranch, BookOpen,
  DollarSign, FileText, Shield, AlertTriangle, CheckCircle,
  ChevronRight, ChevronLeft, ArrowLeft, Check
} from 'lucide-react';

// ─── Tab Config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'branch', label: 'Branch & Role', icon: GitBranch },
  { id: 'teacher', label: 'Teacher Info', icon: BookOpen },
  { id: 'salary', label: 'Salary & Payroll', icon: DollarSign },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'access', label: 'System Access', icon: Shield },
  { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
  { id: 'review', label: 'Review & Create', icon: CheckCircle },
];

const SYSTEM_ROLES = ['Teacher', 'Academic Coordinator', 'Branch Admin', 'Counsellor', 'Finance Staff', 'Receptionist', 'HR', 'Super Admin'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 mt-6 pb-2 border-b border-slate-100 first:mt-0">{children}</h3>
);

const FieldGrid: React.FC<{ cols?: number; children: React.ReactNode }> = ({ cols = 3, children }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>{children}</div>
);

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
    <div
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}
    >
      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
    </div>
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

const MultiSelect: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}> = ({ label, options, selected, onChange }) => {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg bg-white min-h-[42px]">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${selected.includes(opt)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const StaffCreate: React.FC = () => {
  const navigate = useNavigate();
  const { addStaff, branches, courses } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '', gender: '', dob: '',
    bloodGroup: '', maritalStatus: '', aadhaar: '', pan: '',
    mobile: '', alternateMobile: '', email: '', personalEmail: '',
    currentAddress: '', permanentAddress: '', city: '', state: '', country: 'India', pinCode: '',
    employeeType: 'Teaching' as 'Teaching' | 'Non-Teaching',
    designation: '', department: '', joiningDate: '', employmentType: 'Full-Time' as any,
    reportingManager: '', employmentStatus: 'Active' as any, experience: '', qualification: '',
    primaryBranch: '', additionalBranches: [] as string[],
    roles: [] as string[], workingDays: [] as string[], defaultShift: '',
    subjects: [] as string[], coursesAssigned: [] as string[],
    programsAssigned: [] as string[], academicLevels: [] as string[],
    preferredBatches: [] as string[], maxLecturesPerDay: '', maxLecturesPerWeek: '',
    preferredWorkingHours: '', unavailableDays: [] as string[], preferredBreakTime: '',
    teachingMode: [] as string[], biometricMandatory: false,
    salaryType: 'Monthly' as any, monthlySalary: '', hourlyRate: '', contractAmount: '',
    bankName: '', accountHolder: '', accountNumber: '', ifsc: '', upiId: '',
    pfNumber: '', esicNumber: '', professionalTax: false, tdsApplicable: false,
    createLogin: true, username: '', mobileLogin: false, tempPassword: '',
    permissionProfile: '', forcePasswordReset: true, mobileApp: false, accountStatus: 'Active',
    emergencyContact: '', emergencyRelationship: '', emergencyMobile: '',
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const isTeacher = form.roles.includes('Teacher');
  const tabList = TABS.filter(t => t.id !== 'teacher' || isTeacher);
  const currentTabId = tabList[activeTab]?.id;

  const branchOptions = branches.map(b => ({ value: b.name, label: b.name }));
  const courseOptions = courses.map(c => c.name);
  const allPrograms = courses.flatMap(c => c.programs || []);
  const uniquePrograms = Array.from(new Set(allPrograms));

  const allSubjects: string[] = [
    'Physics (Mechanics)', 'Physics (Electromagnetism)', 'Chemistry (Physical)',
    'Chemistry (Organic)', 'Mathematics (Algebra)', 'Mathematics (Calculus)',
    'Botany', 'Zoology', 'English', 'Social Science', 'Advanced Math', 'Science Foundations'
  ];

  const handleSubmit = () => {
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    const empId = `EMP-${String(Date.now()).slice(-5)}`;
    addStaff({
      id: empId, employeeId: empId,
      firstName: form.firstName, middleName: form.middleName, lastName: form.lastName,
      name: fullName, gender: form.gender, dob: form.dob,
      bloodGroup: form.bloodGroup, maritalStatus: form.maritalStatus,
      aadhaar: form.aadhaar, pan: form.pan,
      mobile: form.mobile, alternateMobile: form.alternateMobile,
      email: form.email, personalEmail: form.personalEmail,
      currentAddress: form.currentAddress, permanentAddress: form.permanentAddress,
      city: form.city, state: form.state, country: form.country, pinCode: form.pinCode,
      employeeType: form.employeeType, designation: form.designation,
      department: form.department, joiningDate: form.joiningDate,
      employmentType: form.employmentType, reportingManager: form.reportingManager,
      employmentStatus: form.employmentStatus, experience: form.experience,
      qualification: form.qualification,
      branch: form.primaryBranch, primaryBranch: form.primaryBranch,
      additionalBranches: form.additionalBranches,
      roles: form.roles, role: form.roles[0] || '',
      workingDays: form.workingDays, defaultShift: form.defaultShift,
      subjects: isTeacher ? form.subjects : undefined,
      coursesAssigned: isTeacher ? form.coursesAssigned : undefined,
      programsAssigned: isTeacher ? form.programsAssigned : undefined,
      academicLevels: isTeacher ? form.academicLevels : undefined,
      maxLecturesPerDay: isTeacher && form.maxLecturesPerDay ? Number(form.maxLecturesPerDay) : undefined,
      maxLecturesPerWeek: isTeacher && form.maxLecturesPerWeek ? Number(form.maxLecturesPerWeek) : undefined,
      preferredWorkingHours: isTeacher ? form.preferredWorkingHours : undefined,
      unavailableDays: isTeacher ? form.unavailableDays : undefined,
      preferredBreakTime: isTeacher ? form.preferredBreakTime : undefined,
      teachingMode: isTeacher ? form.teachingMode as any : undefined,
      biometricMandatory: isTeacher ? form.biometricMandatory : undefined,
      salaryType: form.salaryType,
      monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : undefined,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      contractAmount: form.contractAmount ? Number(form.contractAmount) : undefined,
      bankName: form.bankName, accountHolder: form.accountHolder,
      accountNumber: form.accountNumber, ifsc: form.ifsc, upiId: form.upiId,
      pfNumber: form.pfNumber, esicNumber: form.esicNumber,
      professionalTax: form.professionalTax, tdsApplicable: form.tdsApplicable,
      createLogin: form.createLogin, username: form.username,
      mobileLogin: form.mobileLogin, tempPassword: form.tempPassword,
      permissionProfile: form.permissionProfile, forcePasswordReset: form.forcePasswordReset,
      mobileApp: form.mobileApp,
      emergencyContact: form.emergencyContact, emergencyRelationship: form.emergencyRelationship,
      emergencyMobile: form.emergencyMobile,
      status: 'Active',
    });
    setSubmitted(true);
  };

  if (submitted) {
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Employee Created Successfully!</h2>
          <p className="text-slate-500 mt-2">{fullName} has been added to the staff directory.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/staff')}>Back to Staff Directory</Button>
          <Button variant="primary" onClick={() => { setSubmitted(false); setActiveTab(0); }}>Add Another Employee</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button type="button" onClick={() => navigate('/staff')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={15} /> Staff Directory
        </button>
        <ChevronRight size={13} className="text-slate-300" />
        <span className="font-semibold text-slate-800">New Employee Registration</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Employee Registration</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in each section. Teacher-specific fields appear automatically based on assigned roles.</p>
      </div>

      <div className="flex border-b border-slate-200 gap-2 flex-wrap bg-white rounded-xl shadow-sm px-2 pt-2">
        {tabList.map((tab, idx) => {
          const isActive = idx === activeTab;
          const isDone = idx < activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
                }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                } text-[10px] font-bold`}>
                {isDone ? <Check size={10} strokeWidth={3} /> : idx + 1}
              </div>
              <span className={`text-xs font-semibold ${isActive ? 'text-blue-700' : isDone ? 'text-slate-600' : 'text-slate-500'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          {React.createElement(tabList[activeTab].icon, { size: 20, className: 'text-blue-600 flex-shrink-0' })}
          <div>
            <h2 className="font-bold text-slate-900">{tabList[activeTab].label}</h2>
            <p className="text-xs text-slate-400">Step {activeTab + 1} of {tabList.length}</p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[500px]">

          {/* BASIC INFO */}
          {currentTabId === 'basic' && (
            <div className="space-y-5">
              <SectionTitle>Personal Identity</SectionTitle>
              <FieldGrid>
                <Input label="First Name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="e.g. Arvind" />
                <Input label="Middle Name" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Optional" />
                <Input label="Last Name *" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="e.g. Kelkar" />
              </FieldGrid>
              <FieldGrid>
                <Select label="Gender *" value={form.gender} onChange={e => set('gender', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
                <Input label="Date of Birth *" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                <Select label="Blood Group (Optional)" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}
                  options={[{ value: '', label: 'Select' }, ...BLOOD_GROUPS.map(b => ({ value: b, label: b }))]} />
              </FieldGrid>
              <FieldGrid cols={2}>
                <Select label="Marital Status" value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Divorced', label: 'Divorced' }, { value: 'Widowed', label: 'Widowed' }]} />
              </FieldGrid>
              <SectionTitle>Identity Documents</SectionTitle>
              <FieldGrid cols={2}>
                <Input label="Aadhaar Number" value={form.aadhaar} onChange={e => set('aadhaar', e.target.value)} placeholder="XXXX XXXX XXXX" />
                <Input label="PAN Number" value={form.pan} onChange={e => set('pan', e.target.value)} placeholder="e.g. ABCDE1234F" />
              </FieldGrid>
            </div>
          )}

          {/* CONTACT */}
          {currentTabId === 'contact' && (
            <div className="space-y-5">
              <SectionTitle>Phone & Email</SectionTitle>
              <FieldGrid>
                <Input label="Mobile Number *" type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit number" />
                <Input label="Alternate Mobile" type="tel" value={form.alternateMobile} onChange={e => set('alternateMobile', e.target.value)} placeholder="Optional" />
                <Input label="Official Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@institute.com" />
              </FieldGrid>
              <FieldGrid cols={2}>
                <Input label="Personal Email" type="email" value={form.personalEmail} onChange={e => set('personalEmail', e.target.value)} placeholder="Optional" />
              </FieldGrid>
              <SectionTitle>Address</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Current Address</label>
                  <textarea rows={3} value={form.currentAddress} onChange={e => set('currentAddress', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none" placeholder="Flat, Building, Street..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Permanent Address</label>
                  <textarea rows={3} value={form.permanentAddress} onChange={e => set('permanentAddress', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none" placeholder="If same as current, leave blank" />
                </div>
              </div>
              <FieldGrid>
                <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Mumbai" />
                <Input label="State" value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Maharashtra" />
                <Input label="PIN Code" value={form.pinCode} onChange={e => set('pinCode', e.target.value)} placeholder="6-digit PIN" />
              </FieldGrid>
            </div>
          )}

          {/* EMPLOYMENT */}
          {currentTabId === 'employment' && (
            <div className="space-y-5">
              <SectionTitle>Employee Classification</SectionTitle>
              <FieldGrid>
                <Select label="Employee Type *" value={form.employeeType} onChange={e => set('employeeType', e.target.value)}
                  options={[{ value: 'Teaching', label: 'Teaching' }, { value: 'Non-Teaching', label: 'Non-Teaching' }]} />
                <Input label="Designation (HR Title)" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Senior Physics Teacher" />
                <Select label="Department" value={form.department} onChange={e => set('department', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Academics', label: 'Academics' }, { value: 'Finance', label: 'Finance' }, { value: 'HR', label: 'HR' }, { value: 'Administration', label: 'Administration' }, { value: 'Admissions', label: 'Admissions' }]} />
              </FieldGrid>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <strong>Note:</strong> "Designation" is the HR title (e.g., Senior Physics Teacher). System roles with permissions are assigned in the next step.
              </div>
              <SectionTitle>Service Details</SectionTitle>
              <FieldGrid>
                <Input label="Joining Date *" type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} />
                <Select label="Employment Type" value={form.employmentType} onChange={e => set('employmentType', e.target.value)}
                  options={[{ value: 'Full-Time', label: 'Full-Time' }, { value: 'Part-Time', label: 'Part-Time' }, { value: 'Contract', label: 'Contract' }, { value: 'Visiting', label: 'Visiting' }]} />
                <Select label="Employment Status" value={form.employmentStatus} onChange={e => set('employmentStatus', e.target.value)}
                  options={[{ value: 'Active', label: 'Active' }, { value: 'On Leave', label: 'On Leave' }, { value: 'Resigned', label: 'Resigned' }, { value: 'Terminated', label: 'Terminated' }]} />
              </FieldGrid>
              <FieldGrid>
                <Input label="Reporting Manager" value={form.reportingManager} onChange={e => set('reportingManager', e.target.value)} placeholder="Name or Employee ID" />
                <Input label="Experience (Years)" value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="e.g. 5" />
                <Input label="Qualification" value={form.qualification} onChange={e => set('qualification', e.target.value)} placeholder="e.g. M.Sc Physics, B.Ed" />
              </FieldGrid>
            </div>
          )}

          {/* BRANCH & ROLE */}
          {currentTabId === 'branch' && (
            <div className="space-y-5">
              <SectionTitle>Branch Assignment</SectionTitle>
              <FieldGrid cols={2}>
                <Select label="Primary Branch *" value={form.primaryBranch} onChange={e => set('primaryBranch', e.target.value)}
                  options={[{ value: '', label: 'Select branch' }, ...branchOptions]} />
              </FieldGrid>
              <MultiSelect label="Additional Branches" options={branches.map(b => b.name)} selected={form.additionalBranches} onChange={v => set('additionalBranches', v)} />
              <SectionTitle>System Role Assignment</SectionTitle>
              <p className="text-xs text-slate-500 -mt-3 mb-2">
                One employee can have multiple roles. Adding "Teacher" reveals the Teacher Information tab.
              </p>
              <MultiSelect label="System Roles *" options={SYSTEM_ROLES} selected={form.roles} onChange={v => set('roles', v)} />
              {isTeacher && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700">
                  <Check size={13} strokeWidth={3} /> Teacher role detected — Teacher Information tab is now visible in the sidebar.
                </div>
              )}
              <SectionTitle>Schedule</SectionTitle>
              <MultiSelect label="Working Days" options={DAYS} selected={form.workingDays} onChange={v => set('workingDays', v)} />
              <FieldGrid cols={2}>
                <Select label="Default Shift" value={form.defaultShift} onChange={e => set('defaultShift', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Morning', label: 'Morning (7am–1pm)' }, { value: 'Afternoon', label: 'Afternoon (1pm–7pm)' }, { value: 'Evening', label: 'Evening (3pm–9pm)' }, { value: 'Full Day', label: 'Full Day' }]} />
              </FieldGrid>
            </div>
          )}

          {/* TEACHER INFO */}
          {currentTabId === 'teacher' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <BookOpen size={16} className="text-blue-600" />
                <p className="text-xs text-blue-700 font-medium">This section appears because "Teacher" is assigned as a system role.</p>
              </div>
              <SectionTitle>Academic Information</SectionTitle>
              <MultiSelect label="Subjects Taught" options={allSubjects} selected={form.subjects} onChange={v => set('subjects', v)} />
              <MultiSelect label="Courses Assigned" options={courseOptions} selected={form.coursesAssigned} onChange={v => set('coursesAssigned', v)} />
              <MultiSelect label="Programs Assigned" options={uniquePrograms} selected={form.programsAssigned} onChange={v => set('programsAssigned', v)} />
              <MultiSelect label="Academic Levels" options={['Class 8', 'Class 9', 'Class 10', 'Year 1 (11th)', 'Year 2 (12th)', 'Repeater']} selected={form.academicLevels} onChange={v => set('academicLevels', v)} />
              <SectionTitle>Timetable Preferences</SectionTitle>
              <FieldGrid>
                <Input label="Max Lectures / Day" type="number" value={form.maxLecturesPerDay} onChange={e => set('maxLecturesPerDay', e.target.value)} placeholder="e.g. 4" />
                <Input label="Max Lectures / Week" type="number" value={form.maxLecturesPerWeek} onChange={e => set('maxLecturesPerWeek', e.target.value)} placeholder="e.g. 20" />
                <Input label="Preferred Working Hours" value={form.preferredWorkingHours} onChange={e => set('preferredWorkingHours', e.target.value)} placeholder="e.g. 9 AM – 4 PM" />
              </FieldGrid>
              <MultiSelect label="Unavailable Days" options={DAYS} selected={form.unavailableDays} onChange={v => set('unavailableDays', v)} />
              <FieldGrid cols={2}>
                <Input label="Preferred Break Time" value={form.preferredBreakTime} onChange={e => set('preferredBreakTime', e.target.value)} placeholder="e.g. 1 PM – 2 PM" />
              </FieldGrid>
              <SectionTitle>Teaching Mode</SectionTitle>
              <MultiSelect label="Preferred Modes" options={['Online', 'Offline', 'Hybrid']} selected={form.teachingMode} onChange={v => set('teachingMode', v)} />
              <SectionTitle>Attendance</SectionTitle>
              <Checkbox label="Biometric attendance is mandatory for this teacher" checked={form.biometricMandatory} onChange={v => set('biometricMandatory', v)} />
            </div>
          )}

          {/* SALARY & PAYROLL */}
          {currentTabId === 'salary' && (
            <div className="space-y-5">
              <SectionTitle>Salary Structure</SectionTitle>
              <FieldGrid cols={2}>
                <Select label="Salary Type" value={form.salaryType} onChange={e => set('salaryType', e.target.value)}
                  options={[{ value: 'Monthly', label: 'Monthly Fixed' }, { value: 'Hourly', label: 'Hourly Rate' }, { value: 'Contract', label: 'Contract Amount' }]} />
                {form.salaryType === 'Monthly' && <Input label="Monthly Salary (₹)" type="number" value={form.monthlySalary} onChange={e => set('monthlySalary', e.target.value)} placeholder="e.g. 50000" />}
                {form.salaryType === 'Hourly' && <Input label="Hourly Rate (₹)" type="number" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} placeholder="e.g. 500" />}
                {form.salaryType === 'Contract' && <Input label="Contract Amount (₹)" type="number" value={form.contractAmount} onChange={e => set('contractAmount', e.target.value)} placeholder="e.g. 200000" />}
              </FieldGrid>
              <SectionTitle>Bank Details</SectionTitle>
              <FieldGrid>
                <Input label="Bank Name" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. HDFC Bank" />
                <Input label="Account Holder Name" value={form.accountHolder} onChange={e => set('accountHolder', e.target.value)} placeholder="As per bank records" />
                <Input label="Account Number" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="XXXXXXXX" />
              </FieldGrid>
              <FieldGrid cols={2}>
                <Input label="IFSC Code" value={form.ifsc} onChange={e => set('ifsc', e.target.value)} placeholder="e.g. HDFC0001234" />
                <Input label="UPI ID (Optional)" value={form.upiId} onChange={e => set('upiId', e.target.value)} placeholder="name@upi" />
              </FieldGrid>
              <SectionTitle>Statutory (Optional)</SectionTitle>
              <p className="text-xs text-slate-400 -mt-3 mb-3">Skip if your institute does not use PF / ESIC.</p>
              <FieldGrid cols={2}>
                <Input label="PF Number" value={form.pfNumber} onChange={e => set('pfNumber', e.target.value)} placeholder="Optional" />
                <Input label="ESIC Number" value={form.esicNumber} onChange={e => set('esicNumber', e.target.value)} placeholder="Optional" />
              </FieldGrid>
              <div className="flex gap-6 mt-1">
                <Checkbox label="Professional Tax Applicable" checked={form.professionalTax} onChange={v => set('professionalTax', v)} />
                <Checkbox label="TDS Applicable" checked={form.tdsApplicable} onChange={v => set('tdsApplicable', v)} />
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {currentTabId === 'documents' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                <strong className="block mb-1">📎 Document Upload</strong>
                Document uploading will be available once cloud storage is configured. You can upload documents from the employee profile page after creation.
              </div>
              <SectionTitle>Documents Checklist</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {['Aadhaar Card', 'PAN Card', 'Resume / CV', 'Appointment Letter', 'Qualification Certificates', 'Experience Letters', 'Passport Photo', 'Police Verification'].map(doc => (
                  <div key={doc} className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">
                    <FileText size={16} className="text-slate-300 flex-shrink-0" />
                    <span>{doc}</span>
                    <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-semibold whitespace-nowrap">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SYSTEM ACCESS */}
          {currentTabId === 'access' && (
            <div className="space-y-5">
              <SectionTitle>Login Account</SectionTitle>
              <Checkbox label="Create a system login account for this employee" checked={form.createLogin} onChange={v => set('createLogin', v)} />
              {form.createLogin && (
                <>
                  <FieldGrid>
                    <Input label="Username" value={form.username} onChange={e => set('username', e.target.value)} placeholder="e.g. arvind.kelkar" />
                    <Input label="Login Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Prefilled from Contact" />
                    <Input label="Temporary Password" type="password" value={form.tempPassword} onChange={e => set('tempPassword', e.target.value)} placeholder="Min 8 characters" />
                  </FieldGrid>
                  <SectionTitle>Security Settings</SectionTitle>
                  <FieldGrid cols={2}>
                    <Select label="Account Status" value={form.accountStatus} onChange={e => set('accountStatus', e.target.value)}
                      options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive (No Login)' }]} />
                    <Select label="Permission Profile" value={form.permissionProfile} onChange={e => set('permissionProfile', e.target.value)}
                      options={[{ value: '', label: 'Based on Role (Default)' }, { value: 'Custom', label: 'Custom Profile' }]} />
                  </FieldGrid>
                  <div className="flex flex-col gap-3 mt-1">
                    <Checkbox label="Force password reset on first login" checked={form.forcePasswordReset} onChange={v => set('forcePasswordReset', v)} />
                    <Checkbox label="Enable mobile app access" checked={form.mobileApp} onChange={v => set('mobileApp', v)} />
                    <Checkbox label="Allow mobile number login" checked={form.mobileLogin} onChange={v => set('mobileLogin', v)} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* EMERGENCY */}
          {currentTabId === 'emergency' && (
            <div className="space-y-5">
              <SectionTitle>Emergency Contact</SectionTitle>
              <FieldGrid>
                <Input label="Contact Name" value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="e.g. Sunita Kelkar" />
                <Select label="Relationship" value={form.emergencyRelationship} onChange={e => set('emergencyRelationship', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Spouse', label: 'Spouse' }, { value: 'Parent', label: 'Parent' }, { value: 'Sibling', label: 'Sibling' }, { value: 'Child', label: 'Child' }, { value: 'Friend', label: 'Friend' }, { value: 'Other', label: 'Other' }]} />
                <Input label="Mobile Number" type="tel" value={form.emergencyMobile} onChange={e => set('emergencyMobile', e.target.value)} placeholder="10-digit number" />
              </FieldGrid>
            </div>
          )}

          {/* REVIEW */}
          {currentTabId === 'review' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">
                <strong>✅ Ready to Create Employee Profile</strong>
                <p className="mt-1 text-emerald-700">Review the information below. Click any step in the sidebar to go back and edit.</p>
              </div>
              {[
                { title: 'Basic Information', rows: [['Name', [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')], ['Gender', form.gender], ['DOB', form.dob], ['Blood Group (Optional)', form.bloodGroup]] },
                { title: 'Contact', rows: [['Mobile', form.mobile], ['Email', form.email], ['City', form.city], ['State', form.state]] },
                { title: 'Employment', rows: [['Type', form.employeeType], ['Designation', form.designation], ['Department', form.department], ['Joining Date', form.joiningDate], ['Employment Type', form.employmentType]] },
                { title: 'Branch & Role', rows: [['Primary Branch', form.primaryBranch], ['Additional Branches', form.additionalBranches.join(', ')], ['System Roles', form.roles.join(', ')], ['Working Days', form.workingDays.join(', ')]] },
                ...(isTeacher ? [{ title: 'Teacher Information', rows: [['Subjects', form.subjects.join(', ')], ['Courses', form.coursesAssigned.join(', ')], ['Teaching Mode', form.teachingMode.join(', ')], ['Max Lec/Day', form.maxLecturesPerDay]] }] : []),
                { title: 'Salary', rows: [['Salary Type', form.salaryType], ['Bank', form.bankName], ['IFSC', form.ifsc]] },
                { title: 'System Access', rows: [['Create Login', form.createLogin ? 'Yes' : 'No'], ['Username', form.username], ['Force Reset', form.forcePasswordReset ? 'Yes' : 'No']] },
                { title: 'Emergency Contact', rows: [['Name', form.emergencyContact], ['Relationship', form.emergencyRelationship], ['Mobile', form.emergencyMobile]] },
              ].map(section => (
                <div key={section.title}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{section.title}</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100">
                    {section.rows.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} className="flex px-4 py-2.5 text-sm">
                        <span className="text-slate-500 w-40 flex-shrink-0">{k}</span>
                        <span className="font-semibold text-slate-800">{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-b-xl">
          <Button type="button" variant="secondary" onClick={() => setActiveTab(i => Math.max(0, i - 1))} disabled={activeTab === 0}>
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>
          <span className="text-xs text-slate-400 font-medium">Step {activeTab + 1} of {tabList.length}</span>
          {activeTab < tabList.length - 1 ? (
            <Button type="button" variant="primary" onClick={() => setActiveTab(i => Math.min(tabList.length - 1, i + 1))}>
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button type="button" variant="primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleSubmit}>
              <CheckCircle size={16} className="mr-1.5" /> Create Employee
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
