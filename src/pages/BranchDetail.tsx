import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ChevronLeft, MapPin, Building, Clock, Landmark, ShieldAlert, GraduationCap, Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import type { Branch } from '../data/mockData';

// Type for a course-program mapping on a branch
interface BranchCourseMapping {
  id: string;
  courseCode: string;
  courseName: string;
  programs: string[];
}

export const BranchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branches, setBranches, courses, addToast, currentUser } = useApp();
  
  const isNew = id === 'new';
  const existingBranch = branches.find(b => b.id === id || b.code === id);
  const isReadOnly = currentUser?.role === 'branch-admin'
    ? (existingBranch ? existingBranch.name !== currentUser.branch : true)
    : false;

  useEffect(() => {
    if (currentUser?.role === 'branch-admin' && isNew) {
      addToast('Access denied: Branch Admins cannot create branches.');
      navigate('/branches');
    }
  }, [currentUser, isNew, navigate, addToast]);

  const [activeTab, setActiveTab] = useState<'general' | 'admin' | 'courses' | 'operations'>('general');

  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '', code: '', admin: '', adminEmail: '', adminMobile: '', capacity: 0, status: 'Active',
    address: '', email: '', phone: '', operatingHours: '', programs: [],
    altEmails: [], defaultEmail: '',
    bankDetails: { accountName: '', accountNumber: '', ifsc: '', bankName: '' }
  });

  const [altEmailInput, setAltEmailInput] = useState('');

  // Course-program mappings state
  const [courseMappings, setCourseMappings] = useState<BranchCourseMapping[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // Modal state
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

  // Course modal form state
  const [modalCourseCode, setModalCourseCode] = useState('');

  useEffect(() => {
    if (existingBranch && !isNew) {
      setFormData({ ...existingBranch });
      // Load mock initial mappings for existing branches
      if (existingBranch.id === 'B-001') {
        setCourseMappings([
          {
            id: 'cm-1',
            courseCode: 'JEE-PREP',
            courseName: 'JEE Prep Course',
            programs: ['2 Year', '1 Year']
          },
          {
            id: 'cm-2',
            courseCode: 'NEET-PREM',
            courseName: 'NEET Batch Premium',
            programs: ['1 Year']
          },
          {
            id: 'cm-3',
            courseCode: 'FOUND-10',
            courseName: 'Class 10 Foundation',
            programs: ['2 Year']
          }
        ]);
      }
    }
  }, [existingBranch, isNew]);

  const handleSave = () => {
    if (isNew) {
      const newBranch = { ...formData, id: `B-${Date.now()}` } as Branch;
      setBranches([...branches, newBranch]);
      addToast('New branch created successfully.');
    } else {
      setBranches(branches.map(b => (b.id === existingBranch?.id ? (formData as Branch) : b)));
      addToast('Branch details updated successfully.');
    }
    navigate('/branches');
  };

  // Already-mapped course codes
  const mappedCourseCodes = new Set(courseMappings.map(cm => cm.courseCode));

  // Available courses to add (not yet mapped)
  const availableCourses = useMemo(() => {
    return courses.filter(c => !mappedCourseCodes.has(c.code));
  }, [courses, mappedCourseCodes]);

  // Open modal to add a new course
  const handleOpenAddCourse = () => {
    setEditingMappingId(null);
    setModalCourseCode('');
    setCourseModalOpen(true);
  };

  // Save the course mapping
  const handleSaveCourse = () => {
    if (!modalCourseCode) return;
    const course = courses.find(c => c.code === modalCourseCode);
    if (!course) return;

    const newMapping: BranchCourseMapping = {
      id: `cm-${Date.now()}`,
      courseCode: course.code,
      courseName: course.name,
      programs: []
    };
    setCourseMappings(prev => [...prev, newMapping]);
    setExpandedCourse(newMapping.id);
    setCourseModalOpen(false);
    addToast(`"${course.name}" has been added to this branch.`);
  };

  const handleRemoveCourse = (mappingId: string) => {
    const mapping = courseMappings.find(cm => cm.id === mappingId);
    setCourseMappings(prev => prev.filter(cm => cm.id !== mappingId));
    addToast(`"${mapping?.courseName}" removed from branch.`);
  };

  const handleToggleProgram = (mappingId: string, programName: string) => {
    setCourseMappings(prev => prev.map(cm => {
      if (cm.id !== mappingId) return cm;
      const hasProg = cm.programs.includes(programName);
      return { 
        ...cm, 
        programs: hasProg ? cm.programs.filter(p => p !== programName) : [...cm.programs, programName] 
      };
    }));
  };

  if (!isNew && !existingBranch) {
    return <div className="p-8 text-center">Branch not found.</div>;
  }

  const tabClass = (tab: string) =>
    `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
      activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="w-full animate-fade-in">
      {isReadOnly && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 shadow-sm flex items-center gap-2">
          <ShieldAlert size={16} /> Read-Only Mode: Only Institute Owners can modify branch parameters.
        </div>
      )}
      <div className="flex flex-col gap-2 p-6 pb-0">
        <button onClick={() => navigate('/branches')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit transition-colors">
          <ChevronLeft size={16} /> Back to Branches
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-display font-bold text-slate-900">
            {isNew ? 'Create New Branch' : `Manage Branch: ${formData.name}`}
          </h2>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/branches')}>
              {isReadOnly ? 'Back' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button variant="primary" onClick={handleSave} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
                Save Branch Details
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none mt-6 px-6">
        <button onClick={() => setActiveTab('general')} className={tabClass('general')}>General Setup</button>
        <button onClick={() => setActiveTab('admin')} className={tabClass('admin')}>Admin & Access</button>
        <button onClick={() => setActiveTab('courses')} className={tabClass('courses')}>
          Courses & Programs
          {courseMappings.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
              {courseMappings.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('operations')} className={tabClass('operations')}>Operations & Finance</button>
      </div>

      <fieldset disabled={isReadOnly} className="contents">
        <div className="grid grid-cols-1 gap-6 p-6 pt-6">

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Building size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Basic Details</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <Input label="Branch Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Mumbai West" />
                <Input label="Branch Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g., MUM-WEST" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <Input label="Student Intake Capacity" type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} />
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Location & Contact</h3>
              </div>
              <div className="p-5 space-y-4">
                <Input label="Full Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street, City, State, Pincode" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Branch Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@branch.com" />
                  <Input label="Branch Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="022-XXXXXXX" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 rounded-t-xl">
                <ShieldAlert size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800">Branch Admin</h3>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-xs text-slate-500">The assigned administrator has full operational control over this branch.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Admin Name" value={formData.admin} onChange={e => setFormData({...formData, admin: e.target.value})} placeholder="Full Name" />
                  <Input label="Admin Mobile" value={formData.adminMobile} onChange={e => setFormData({...formData, adminMobile: e.target.value})} placeholder="For SMS alerts" />
                </div>

                {/* Primary Admin Email */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">Admin Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-400"
                      placeholder="primary@branch.com"
                      value={formData.adminEmail || ''}
                      onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, defaultEmail: formData.adminEmail})}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                        formData.defaultEmail === formData.adminEmail || !formData.defaultEmail
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 cursor-pointer'
                      }`}
                    >
                      {formData.defaultEmail === formData.adminEmail || !formData.defaultEmail ? '✓ Default' : 'Set Default'}
                    </button>
                  </div>
                </div>

                {/* Alternate Emails */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Alternate Emails</label>

                  {/* Existing alt emails list */}
                  {(formData.altEmails || []).length > 0 && (
                    <div className="space-y-2 mb-3">
                      {(formData.altEmails || []).map((email, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                          formData.defaultEmail === email ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                        }`}>
                          <span className="flex-1 text-sm text-slate-700 truncate">{email}</span>
                          {formData.defaultEmail === email && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">DEFAULT</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, defaultEmail: email})}
                            className={`text-xs font-semibold px-2 py-1 rounded border transition-colors ${
                              formData.defaultEmail === email
                                ? 'text-emerald-600 border-emerald-200 bg-emerald-50 cursor-default'
                                : 'text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'
                            }`}
                          >
                            {formData.defaultEmail === email ? '✓ Default' : 'Set Default'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formData.altEmails || []).filter((_, i) => i !== idx);
                              const newDefault = formData.defaultEmail === email
                                ? (formData.adminEmail || '')
                                : formData.defaultEmail;
                              setFormData({...formData, altEmails: updated, defaultEmail: newDefault});
                            }}
                            className="text-red-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded border border-transparent hover:border-red-200 hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new alt email */}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-400 bg-white"
                      placeholder="Enter alternate email address..."
                      value={altEmailInput}
                      onChange={e => setAltEmailInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const email = altEmailInput.trim();
                          if (!email) {
                            addToast('Please enter an email address.');
                            return;
                          }
                          if ((formData.altEmails || []).includes(email)) {
                            addToast('This email is already in the alternate emails list.');
                            return;
                          }
                          setFormData({...formData, altEmails: [...(formData.altEmails || []), email]});
                          setAltEmailInput('');
                          addToast('Alternate email added.');
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      onClick={() => {
                        const email = altEmailInput.trim();
                        if (!email) {
                          addToast('Please enter an email address.');
                          return;
                        }
                        if ((formData.altEmails || []).includes(email)) {
                          addToast('This email is already in the alternate emails list.');
                          return;
                        }
                        setFormData({...formData, altEmails: [...(formData.altEmails || []), email]});
                        setAltEmailInput('');
                        addToast('Alternate email added.');
                      }}
                      style={{ backgroundColor: '#1e293b', color: 'white', borderColor: '#1e293b' }}
                      className="whitespace-nowrap"
                    >
                      + Add
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Press Enter or click Add. Notifications will be sent to the default email.</p>
                </div>

                <Button 
                  variant="secondary" 
                  className="w-full text-xs font-bold"
                  onClick={() => addToast('Login credentials and welcome email sent to branch admin.')}
                >
                  Send / Reset Login Credentials
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* COURSES & PROGRAMS TAB */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Courses & Programs Offered</h3>
                <p className="text-sm text-slate-500 mt-0.5">Map courses and their programs available at this branch with academic year availability.</p>
              </div>
              <Button
                variant="primary"
                onClick={handleOpenAddCourse}
                disabled={availableCourses.length === 0}
                style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
                className="flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={16} /> Add Course
              </Button>
            </div>

            {courseMappings.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl py-16 text-center">
                <GraduationCap size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-600">No courses mapped to this branch yet.</p>
                <p className="text-sm text-slate-400 mt-1">Click "Add Course" to start mapping courses and their programs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseMappings.map(mapping => (
                  <div key={mapping.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Course Header Row */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedCourse(expandedCourse === mapping.id ? null : mapping.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedCourse === mapping.id
                          ? <ChevronDown size={16} className="text-blue-600" />
                          : <ChevronRight size={16} className="text-slate-400" />
                        }
                        <BookOpen size={18} className="text-blue-600" />
                        <div>
                          <span className="font-bold text-slate-800">{mapping.courseName}</span>
                          <span className="ml-3 text-xs font-mono text-slate-400 uppercase">{mapping.courseCode}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium">
                          {mapping.programs.length} program{mapping.programs.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveCourse(mapping.id); }}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Programs List */}
                    {expandedCourse === mapping.id && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select available programs for this course</p>
                        <div className="flex flex-wrap gap-4">
                          {courses.find(c => c.code === mapping.courseCode)?.programs?.map(prog => (
                            <label key={prog} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={mapping.programs.includes(prog)}
                                onChange={() => handleToggleProgram(mapping.id, prog)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-sm font-semibold text-slate-700">{prog}</span>
                            </label>
                          )) || <p className="text-xs text-slate-400">No programs available in this course.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OPERATIONS TAB */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Operating Hours</h3>
              </div>
              <div className="p-5">
                 <Input label="Standard Timings" value={formData.operatingHours} onChange={e => setFormData({...formData, operatingHours: e.target.value})} placeholder="e.g. 08:00 AM - 08:00 PM" />
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Landmark size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Local Bank Details</h3>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-4">Leave blank to use Institute's global collection account. Fill this only if this branch collects fees in a separate local account.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Bank Name" value={formData.bankDetails?.bankName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, bankName: e.target.value}})} />
                  <Input label="Account Name" value={formData.bankDetails?.accountName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, accountName: e.target.value}})} />
                  <Input label="Account Number" value={formData.bankDetails?.accountNumber} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, accountNumber: e.target.value}})} />
                  <Input label="IFSC Code" value={formData.bankDetails?.ifsc} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, ifsc: e.target.value}})} />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      </fieldset>

      {/* Bottom navigation */}
      <div className="flex justify-end gap-3 p-6 pt-0 border-t border-slate-200 mt-6 pb-6">
        {activeTab === 'general' && (
          <Button variant="primary" onClick={() => setActiveTab('admin')} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
            {isReadOnly ? 'Next' : 'Save & Next'} <ChevronLeft size={16} className="ml-2 rotate-180" />
          </Button>
        )}
        {activeTab === 'admin' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('general')}>Back</Button>
            <Button variant="primary" onClick={() => setActiveTab('courses')} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
              {isReadOnly ? 'Next' : 'Save & Next'} <ChevronLeft size={16} className="ml-2 rotate-180" />
            </Button>
          </>
        )}
        {activeTab === 'courses' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('admin')}>Back</Button>
            <Button variant="primary" onClick={() => setActiveTab('operations')} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
              {isReadOnly ? 'Next' : 'Save & Next'} <ChevronLeft size={16} className="ml-2 rotate-180" />
            </Button>
          </>
        )}
        {activeTab === 'operations' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('courses')}>Back</Button>
            {!isReadOnly && (
              <Button variant="primary" onClick={handleSave} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
                Save Branch Details
              </Button>
            )}
          </>
        )}
      </div>

      {/* ADD COURSE MODAL */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        title="Add Course to Branch"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCourseModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSaveCourse}
              disabled={!modalCourseCode}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
              className="disabled:opacity-50"
            >
              Add Course
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Select an existing course to add to this branch. You can then configure which programs and academic years are offered.</p>
          
          {availableCourses.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 font-medium">
              All available courses have already been added to this branch.
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block">Select Course</label>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                {availableCourses.map(course => (
                  <label
                    key={course.code}
                    className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                      modalCourseCode === course.code ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courseSelect"
                      className="mt-0.5 text-blue-600"
                      checked={modalCourseCode === course.code}
                      onChange={() => setModalCourseCode(course.code)}
                    />
                    <div>
                      <div className="font-semibold text-slate-800">{course.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">{course.code} • {course.duration}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(course.programs || []).map(p => (
                          <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{p}</span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};
