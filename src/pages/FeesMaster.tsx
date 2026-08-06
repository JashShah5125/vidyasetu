import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { INITIAL_COURSES, INITIAL_BUNDLES_MAP, INITIAL_SUBJECTS_MAP } from '../data/mockData';
import { useFeeConfig, type FeePlan } from '../context/FeeConfigContext';
import { Modal } from '../components/ui/Modal';
import { Save, Calculator, Plus, ArrowLeft, Edit2 } from 'lucide-react';



export const FeesMaster: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'full-course' | 'custom-bundles' | 'subject-wise'>('full-course');
  const [view, setView] = useState<'list' | 'form'>('list');
  const { plans, setPlans, customBundles, setCustomBundles, subjectsData, setSubjectsData } = useFeeConfig();

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  
  const [totalFees, setTotalFees] = useState<number | ''>('');
  const [downPayment, setDownPayment] = useState<number | ''>('');
  const [months, setMonths] = useState<number | ''>('');

  const [successMsg, setSuccessMsg] = useState('');

  // Get available programs for the selected course
  const availablePrograms = useMemo(() => {
    if (!selectedCourse) return [];
    const course = INITIAL_COURSES.find(c => c.name === selectedCourse);
    return course ? course.programs : [];
  }, [selectedCourse]);

  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [bundleForm, setBundleForm] = useState({
    courseName: '',
    programDetails: '',
    name: '',
    fee: ''
  });

  const handleOpenBundleModal = (bundle?: any) => {
    if (bundle) {
      setEditingBundle(bundle);
      setBundleForm({
        courseName: bundle.courseName,
        programDetails: bundle.programDetails,
        name: bundle.name,
        fee: bundle.fee?.toString() || '0'
      });
    } else {
      setEditingBundle(null);
      setBundleForm({ courseName: '', programDetails: '', name: '', fee: '' });
    }
    setIsBundleModalOpen(true);
  };

  const handleSaveBundle = () => {
    if (!bundleForm.name || !bundleForm.fee) {
      alert("Please enter bundle name and fee.");
      return;
    }

    if (editingBundle) {
      setCustomBundles(prev => prev.map(b => b.id === editingBundle.id ? { ...b, ...bundleForm, fee: Number(bundleForm.fee) } : b));
      setSuccessMsg('Bundle updated successfully!');
    } else {
      const newBundle = {
        id: Math.random().toString(36).substring(7),
        ...bundleForm,
        levelDetails: '-',
        fee: Number(bundleForm.fee)
      };
      setCustomBundles(prev => [...prev, newBundle]);
      setSuccessMsg('New bundle created successfully!');
    }
    setIsBundleModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // -----------------------------------------------------
  // Subject-wise Fees State & Logic
  // -----------------------------------------------------
  const [subjectFilterCourse, setSubjectFilterCourse] = useState('');
  const [subjectFilterProgram, setSubjectFilterProgram] = useState('');
  const [subjectFilterLevel, setSubjectFilterLevel] = useState('');

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [subjectForm, setSubjectForm] = useState({
    fee: ''
  });

  // Derived available options for Subject filters
  const subjectAvailablePrograms = useMemo(() => {
    if (!subjectFilterCourse) return [];
    const course = INITIAL_COURSES.find(c => c.name === subjectFilterCourse);
    return course ? course.programs : [];
  }, [subjectFilterCourse]);

  const subjectAvailableLevels = useMemo(() => {
    if (!subjectFilterCourse || !subjectFilterProgram) return [];
    const course = INITIAL_COURSES.find(c => c.name === subjectFilterCourse);
    if (!course) return [];
    
    const prefix = `${course.code}-${subjectFilterProgram}-`;
    const levels = new Set<string>();
    
    Object.keys(INITIAL_SUBJECTS_MAP).forEach(key => {
      if (key.startsWith(prefix)) {
        levels.add(key.substring(prefix.length));
      }
    });
    return Array.from(levels);
  }, [subjectFilterCourse, subjectFilterProgram]);

  // Derived subject list based on selected filters
  const filteredSubjects = useMemo(() => {
    if (!subjectFilterCourse || !subjectFilterProgram || !subjectFilterLevel) return [];
    const course = INITIAL_COURSES.find(c => c.name === subjectFilterCourse);
    if (!course) return [];
    const categoryKey = `${course.code}-${subjectFilterProgram}-${subjectFilterLevel}`;
    return subjectsData.filter(s => s.category === categoryKey);
  }, [subjectFilterCourse, subjectFilterProgram, subjectFilterLevel, subjectsData]);

  const handleOpenSubjectModal = (subject: any) => {
    setEditingSubject(subject);
    setSubjectForm({ fee: subject.fee?.toString() || '0' });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (!subjectForm.fee) {
      alert("Please enter a fee amount.");
      return;
    }
    setSubjectsData(prev => prev.map(s => 
      s.id === editingSubject.id && s.category === editingSubject.category 
        ? { ...s, fee: Number(subjectForm.fee) } 
        : s
    ));
    setSuccessMsg('Subject fee updated successfully!');
    setIsSubjectModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Handle course change to reset dependent fields
  const handleCourseChange = (val: string) => {
    setSelectedCourse(val);
    setSelectedProgram('');
  };

  // Calculations
  const balance = (Number(totalFees) || 0) - (Number(downPayment) || 0);
  const monthlyInstallment = (Number(months) || 0) > 0 ? balance / (Number(months) as number) : 0;

  const handleSave = () => {
    if (!selectedCourse || !selectedProgram || totalFees === '' || downPayment === '' || months === '') {
      alert("Please fill in all fields before saving.");
      return;
    }
    
    const newPlan: FeePlan = {
      id: Math.random().toString(36).substring(7),
      course: selectedCourse,
      program: selectedProgram,
      totalFees: Number(totalFees),
      downPayment: Number(downPayment),
      months: Number(months),
      installment: monthlyInstallment
    };

    setPlans([...plans, newPlan]);
    setSuccessMsg('Fee Configuration Saved Successfully!');
    setView('list');
    setTimeout(() => setSuccessMsg(''), 4000);
    
    // Reset form
    setSelectedCourse('');
    setSelectedProgram('');
    setTotalFees('');
    setDownPayment('');
    setMonths('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fees Master</h2>
          <p className="text-sm text-slate-500 mt-1">Configure full package payments and standard installment plans.</p>
        </div>
        {activeMainTab === 'full-course' && view === 'list' && (
          <Button variant="primary" onClick={() => setView('form')} className="flex items-center gap-2">
            <Plus size={16} /> Configure New Plan
          </Button>
        )}
        {activeMainTab === 'custom-bundles' && (
          <Button variant="primary" onClick={() => handleOpenBundleModal()} className="flex items-center gap-2">
            <Plus size={16} /> Create Bundle Plan
          </Button>
        )}
        {activeMainTab === 'full-course' && view === 'form' && (
          <Button variant="secondary" onClick={() => setView('list')} className="flex items-center gap-2">
            <ArrowLeft size={16} /> Back to List
          </Button>
        )}
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveMainTab('full-course')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${activeMainTab === 'full-course' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Full Course Fees
          </button>
          <button
            onClick={() => setActiveMainTab('custom-bundles')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${activeMainTab === 'custom-bundles' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Custom Bundles
          </button>
          <button
            onClick={() => setActiveMainTab('subject-wise')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${activeMainTab === 'subject-wise' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Subject-wise Fees
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          {successMsg}
          <button onClick={() => setSuccessMsg('')} className="hover:text-emerald-900">&times;</button>
        </div>
      )}

      {activeMainTab === 'full-course' && (
        <>
          {view === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Program</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total Fees</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Down Payment</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Installments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No plans configured yet.</td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{plan.course}</td>
                      <td className="px-6 py-4 text-slate-600">{plan.program}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800">₹{plan.totalFees.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">₹{plan.downPayment.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-blue-600">{plan.months} months</div>
                        <div className="text-xs text-slate-500">@ ₹{plan.installment.toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">1. Program Selection</CardTitle>
            </CardHeader>
            <div className="p-6 pt-0 space-y-4">
              <Select
                label="Select Course"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                options={[
                  { value: '', label: 'Choose a course...' },
                  ...INITIAL_COURSES.map(c => ({ value: c.name, label: c.name }))
                ]}
              />

              <Select
                label="Select Program"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                disabled={!selectedCourse}
                options={[
                  { value: '', label: 'Choose a program...' },
                  ...availablePrograms.map(p => ({ value: p, label: p }))
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">2. Fee Configuration</CardTitle>
            </CardHeader>
            <div className="p-6 pt-0 space-y-4">
              <Input
                label="Total Program Fees (₹)"
                type="number"
                placeholder="e.g. 150000"
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value ? Number(e.target.value) : '')}
              />
              <Input
                label="Down Payment / Initial Deposit (₹)"
                type="number"
                placeholder="e.g. 30000"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value ? Number(e.target.value) : '')}
              />
              <Input
                label="Installment Duration (Months)"
                type="number"
                placeholder="e.g. 10"
                value={months}
                onChange={(e) => setMonths(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-50 border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <Calculator size={20} />
                Installment Projection
              </CardTitle>
            </CardHeader>
            <div className="p-6 pt-0 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Remaining Balance</div>
                  <div className="text-xl font-bold text-slate-800">
                    ₹{balance > 0 ? balance.toLocaleString() : 0}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Duration</div>
                  <div className="text-xl font-bold text-slate-800">
                    {months || 0} Months
                  </div>
                </div>
              </div>

              <div className="bg-blue-600 text-white p-6 rounded-xl shadow-inner text-center">
                <div className="text-blue-100 font-semibold uppercase tracking-wide mb-2 text-sm">Monthly Installment</div>
                <div className="text-4xl font-bold">
                  ₹{monthlyInstallment > 0 ? monthlyInstallment.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0}
                </div>
                <div className="text-blue-200 text-xs mt-2 font-medium">per month</div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <Button variant="primary" onClick={handleSave} className="flex items-center gap-2 w-full justify-center">
                  <Save size={16} /> Save Configuration
                </Button>
              </div>

            </div>
          </Card>
        </div>
      </div>
      )}
      </>
      )}

      {activeMainTab === 'custom-bundles' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Bundle Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Program</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Level</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Fee Amount (₹)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customBundles.map((bundle, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{bundle.name}</td>
                    <td className="px-6 py-4 text-slate-600">{bundle.courseName}</td>
                    <td className="px-6 py-4 text-slate-500">{bundle.programDetails}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{bundle.levelDetails}</td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                      ₹{bundle.fee?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpenBundleModal(bundle)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                        <Edit2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeMainTab === 'subject-wise' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <Card>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Filter by Course"
                value={subjectFilterCourse}
                onChange={(e) => {
                  setSubjectFilterCourse(e.target.value);
                  setSubjectFilterProgram('');
                  setSubjectFilterLevel('');
                }}
                options={[
                  { value: '', label: 'All Courses...' },
                  ...INITIAL_COURSES.map(c => ({ value: c.name, label: c.name }))
                ]}
              />
              <Select
                label="Filter by Program"
                value={subjectFilterProgram}
                onChange={(e) => {
                  setSubjectFilterProgram(e.target.value);
                  setSubjectFilterLevel('');
                }}
                disabled={!subjectFilterCourse}
                options={[
                  { value: '', label: 'All Programs...' },
                  ...subjectAvailablePrograms.map(p => ({ value: p, label: p }))
                ]}
              />
              <Select
                label="Filter by Level"
                value={subjectFilterLevel}
                onChange={(e) => setSubjectFilterLevel(e.target.value)}
                disabled={!subjectFilterProgram}
                options={[
                  { value: '', label: 'All Levels...' },
                  ...subjectAvailableLevels.map(l => ({ value: l, label: l }))
                ]}
              />
            </div>
          </Card>

          {subjectFilterCourse && subjectFilterProgram && subjectFilterLevel && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Subject Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Subject Code</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Fee Amount (₹)</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No subjects configured for this selection.</td>
                      </tr>
                    ) : (
                      filteredSubjects.map((subject, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{subject.name}</td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{subject.code}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${subject.type === 'Core' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                              {subject.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                            ₹{subject.fee?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenSubjectModal(subject)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                              <Edit2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {(!subjectFilterCourse || !subjectFilterProgram || !subjectFilterLevel) && (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl border-dashed">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                <Calculator className="text-slate-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Select filters to view subjects</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">Please select a Course, Program, and Level from the filters above to view and manage subject-wise fees.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Subject Modal */}
      <Modal isOpen={isSubjectModalOpen} title="Edit Subject Fee" onClose={() => setIsSubjectModalOpen(false)}>
        <div className="space-y-4 pt-2">
          {editingSubject && (
            <>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                <div className="text-sm text-slate-500 mb-1">Subject</div>
                <div className="font-semibold text-slate-900">{editingSubject.name} <span className="font-mono text-xs text-slate-400 ml-2">({editingSubject.code})</span></div>
              </div>
              
              <Input
                label="Fee Amount (₹)"
                type="number"
                placeholder="e.g. 25000"
                value={subjectForm.fee}
                onChange={(e) => setSubjectForm({...subjectForm, fee: e.target.value})}
              />

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setIsSubjectModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveSubject}>Save Subject Fee</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add / Edit Bundle Modal */}
      <Modal isOpen={isBundleModalOpen} title={editingBundle ? 'Edit Bundle Plan' : 'Create Bundle Plan'} onClose={() => setIsBundleModalOpen(false)}>
          <div className="space-y-4 pt-2">
            {!editingBundle && (
              <>
                <Select
                  label="Select Course"
                  value={bundleForm.courseName}
                  onChange={(e) => setBundleForm({...bundleForm, courseName: e.target.value, programDetails: ''})}
                  options={[
                    { value: '', label: 'Choose a course...' },
                    ...INITIAL_COURSES.map(c => ({ value: c.name, label: c.name }))
                  ]}
                />
                <Input
                  label="Program Name"
                  placeholder="e.g. 2 Year"
                  value={bundleForm.programDetails}
                  onChange={(e) => setBundleForm({...bundleForm, programDetails: e.target.value})}
                />
              </>
            )}
            
            <Input
              label="Bundle Name"
              placeholder="e.g. PCM Complete"
              value={bundleForm.name}
              onChange={(e) => setBundleForm({...bundleForm, name: e.target.value})}
            />
            
            <Input
              label="Fee Amount (₹)"
              type="number"
              placeholder="e.g. 110000"
              value={bundleForm.fee}
              onChange={(e) => setBundleForm({...bundleForm, fee: e.target.value})}
            />

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsBundleModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveBundle}>Save Bundle</Button>
            </div>
          </div>
        </Modal>
    </div>
  );
};
