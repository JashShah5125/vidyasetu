import React, { useState, useMemo } from 'react';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { BookOpen, Layers, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

import { INITIAL_SUBJECTS_MAP, INITIAL_BUNDLES_MAP } from '../data/mockData';


export const SubjectSetup: React.FC = () => {
  const { courses } = useApp();

  // State for Cascading Filters
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  // Data State
  const [assignedSubjectsMap, setAssignedSubjectsMap] = useState<Record<string, any[]>>(INITIAL_SUBJECTS_MAP);
  const [bundlesMap, setBundlesMap] = useState<Record<string, any[]>>(INITIAL_BUNDLES_MAP);

  // Modal States
  const [isAddSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [isBundleModalOpen, setBundleModalOpen] = useState(false);
  
  // Form State
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', type: 'Core' });
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleForm, setBundleForm] = useState<{name: string, subjectIds: string[]}>({ name: '', subjectIds: [] });

  // Derive Course options from global state
  const courseOptions = useMemo(() => {
    return courses.map(c => ({ value: c.code, label: c.name }));
  }, [courses]);

  // Derive Program options from the selected course
  const programOptions = useMemo(() => {
    if (!selectedCourse) return [];
    const course = courses.find(c => c.code === selectedCourse);
    if (!course || !course.programs) return [];
    return course.programs.map(p => ({ value: p, label: p }));
  }, [selectedCourse, courses]);

  // Derive mock Levels based on the selected program name
  const levelOptions = useMemo(() => {
    if (!selectedProgram) return [];
    if (selectedProgram.toLowerCase().includes('2 year')) {
      return [
        { value: 'year1', label: 'Year 1' },
        { value: 'year2', label: 'Year 2' }
      ];
    }
    if (selectedProgram.toLowerCase().includes('8th std')) {
      return [{ value: 'class8', label: 'Class 8' }];
    }
    return [{ value: 'year1', label: 'Year 1' }];
  }, [selectedProgram]);
  
  // Composite key for tracking distinct level data
  const activeKey = selectedCourse && selectedProgram && selectedLevel 
    ? `${selectedCourse}-${selectedProgram}-${selectedLevel}` 
    : '';

  // Current data to display
  const assignedSubjects = activeKey ? assignedSubjectsMap[activeKey] || [] : [];
  const levelBundles = activeKey ? bundlesMap[activeKey] || [] : [];

  // Handlers for filter changes to reset downstream selections
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCourse(e.target.value);
    setSelectedProgram('');
    setSelectedLevel('');
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProgram(e.target.value);
    setSelectedLevel('');
  };

  // CRUD Handlers for Subjects
  const handleOpenAddSubject = () => {
    setEditingSubjectId(null);
    setSubjectForm({ name: '', code: '', type: 'Core' });
    setAddSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subject: any) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({ name: subject.name, code: subject.code, type: subject.type });
    setAddSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (!subjectForm.name || !subjectForm.code) return; // Basic validation
    if (!activeKey) return;
    
    setAssignedSubjectsMap(prev => {
      const levelSubjects = prev[activeKey] || [];
      if (editingSubjectId) {
        return {
          ...prev,
          [activeKey]: levelSubjects.map(s => 
            s.id === editingSubjectId ? { ...s, ...subjectForm } : s
          )
        };
      } else {
        const newSubject = { id: `subj-${Date.now()}`, ...subjectForm };
        return {
          ...prev,
          [activeKey]: [...levelSubjects, newSubject]
        };
      }
    });
    setAddSubjectModalOpen(false);
  };

  const handleRemoveSubject = (idToRemove: string) => {
    if (!activeKey) return;
    
    setAssignedSubjectsMap(prev => {
      const levelSubjects = prev[activeKey] || [];
      return {
        ...prev,
        [activeKey]: levelSubjects.filter(s => s.id !== idToRemove)
      };
    });
    
    // Also remove this subject from any bundles in the current level
    setBundlesMap(prev => {
      const levelBundles = prev[activeKey] || [];
      return {
        ...prev,
        [activeKey]: levelBundles.map(b => ({
          ...b,
          subjectIds: b.subjectIds.filter((id: string) => id !== idToRemove)
        }))
      };
    });
  };

  // CRUD Handlers for Bundles
  const handleOpenAddBundle = () => {
    setEditingBundleId(null);
    setBundleForm({ name: '', subjectIds: [] });
    setBundleModalOpen(true);
  };

  const handleOpenEditBundle = (bundle: any) => {
    setEditingBundleId(bundle.id);
    setBundleForm({ name: bundle.name, subjectIds: [...bundle.subjectIds] });
    setBundleModalOpen(true);
  };

  const handleSaveBundle = () => {
    if (!bundleForm.name || bundleForm.subjectIds.length === 0) return;
    if (!activeKey) return;
    
    setBundlesMap(prev => {
      const currentBundles = prev[activeKey] || [];
      if (editingBundleId) {
        return {
          ...prev,
          [activeKey]: currentBundles.map(b => 
            b.id === editingBundleId ? { ...b, ...bundleForm } : b
          )
        };
      } else {
        const newBundle = { id: `bundle-${Date.now()}`, ...bundleForm };
        return {
          ...prev,
          [activeKey]: [...currentBundles, newBundle]
        };
      }
    });
    setBundleModalOpen(false);
  };

  const handleRemoveBundle = (idToRemove: string) => {
    if (!activeKey) return;
    
    setBundlesMap(prev => {
      const currentBundles = prev[activeKey] || [];
      return {
        ...prev,
        [activeKey]: currentBundles.filter(b => b.id !== idToRemove)
      };
    });
  };

  const handleToggleBundleSubject = (subjectId: string) => {
    setBundleForm(prev => {
      if (prev.subjectIds.includes(subjectId)) {
        return { ...prev, subjectIds: prev.subjectIds.filter(id => id !== subjectId) };
      } else {
        return { ...prev, subjectIds: [...prev.subjectIds, subjectId] };
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 h-[calc(100vh-64px)] animate-fade-in overflow-hidden">
      
      {/* LEFT SIDEBAR: Cascading Filters */}
      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4 bg-white border border-slate-200 rounded-xl p-5 h-fit shadow-sm">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Context Filter</h2>
          <p className="text-xs text-slate-500 mt-1">Select the exact level to manage subjects.</p>
        </div>
        
        <Select
          label="1. Select Course"
          options={[{ value: '', label: 'Select a course...' }, ...courseOptions]}
          value={selectedCourse}
          onChange={handleCourseChange}
        />
        
        <Select
          label="2. Select Program"
          options={[{ value: '', label: 'Select a program...' }, ...programOptions]}
          value={selectedProgram}
          onChange={handleProgramChange}
          disabled={!selectedCourse}
          className={!selectedCourse ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}
        />
        
        <Select
          label="3. Select Level"
          options={[{ value: '', label: 'Select a level...' }, ...levelOptions]}
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          disabled={!selectedProgram}
          className={!selectedProgram ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}
        />
      </div>

      {/* RIGHT MAIN AREA */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6">
        
        {!selectedLevel ? (
          // Empty State before selection
          <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center text-slate-500 shadow-sm">
            <Layers className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No Level Selected</h3>
            <p className="text-sm max-w-sm mt-2">Please select a Course, Program, and Level from the sidebar to start managing subjects and bundles.</p>
          </div>
        ) : (
          // Active Management Area
          <>
            {/* ASSIGNED SUBJECTS TABLE */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={20} className="text-blue-600"/> Assigned Subjects
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Subjects currently taught in this level.</p>
                </div>
                <Button size="sm" onClick={handleOpenAddSubject} className="flex items-center gap-1.5">
                  <Plus size={16} /> Add Subject
                </Button>
              </div>
              
              <div className="p-5">
                {assignedSubjects.length === 0 ? (
                   <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-slate-100">No subjects assigned to this level yet.</p>
                ) : (
                  <Table headers={['Subject Code', 'Subject Name', 'Type', 'Actions']}>
                    {assignedSubjects.map((subject, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-xs font-mono font-medium text-slate-600">{subject.code}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{subject.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">{subject.type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleOpenEditSubject(subject)} className="text-blue-500 hover:text-blue-700 font-medium text-xs">Edit</button>
                            <button onClick={() => handleRemoveSubject(subject.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Table>
                )}
              </div>
            </div>

            {/* SUBJECT BUNDLES */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
               <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers size={20} className="text-purple-600"/> Subject Bundles
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Manage pre-packaged groups of subjects.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={handleOpenAddBundle}>
                  Create New Bundle
                </Button>
              </div>
              
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {levelBundles.length === 0 ? (
                   <p className="text-sm text-slate-500 col-span-full text-center py-4">No bundles created for this level.</p>
                 ) : (
                   levelBundles.map(bundle => (
                     <div key={bundle.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white shadow-sm flex flex-col h-full">
                        <h4 className="font-bold text-slate-800 mb-2">{bundle.name}</h4>
                        <ul className="text-xs text-slate-600 space-y-1 mb-4 flex-1">
                          {bundle.subjectIds.map((subId: string, i: number) => {
                            const sub = assignedSubjects.find(s => s.id === subId);
                            return sub ? <li key={i} className="flex items-center gap-1.5"><div className="w-1 h-1 bg-slate-300 rounded-full"></div>{sub.name} <span className="text-slate-400 font-mono">({sub.code})</span></li> : null;
                          })}
                        </ul>
                        <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between gap-2">
                          <button onClick={() => handleOpenEditBundle(bundle)} className="text-xs font-medium text-blue-500 hover:text-blue-700">Edit Bundle</button>
                          <button onClick={() => handleRemoveBundle(bundle.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Delete</button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODALS */}

      {/* Add Subject Modal */}
      <Modal 
        isOpen={isAddSubjectModalOpen} 
        onClose={() => setAddSubjectModalOpen(false)} 
        title={editingSubjectId ? "Edit Subject" : "Create New Subject"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddSubjectModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveSubject} 
              disabled={!subjectForm.name || !subjectForm.code}
              className="disabled:opacity-50"
            >
              {editingSubjectId ? "Save Changes" : "Create & Assign Subject"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
           <p className="text-sm text-slate-500 mb-2">
             {editingSubjectId ? "Update the details for this subject." : "Create a new subject and instantly assign it to the selected level."}
           </p>
           
           <div className="space-y-4 pt-2">
             <Input 
               label="Subject Name" 
               placeholder="e.g. Advanced Mechanics" 
               value={subjectForm.name}
               onChange={e => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
             />
             <Input 
               label="Subject Code" 
               placeholder="e.g. PHY201" 
               value={subjectForm.code}
               onChange={e => setSubjectForm(prev => ({ ...prev, code: e.target.value }))}
             />
             <Select 
               label="Subject Type" 
               options={[
                 { value: 'Core', label: 'Core / Mandatory' },
                 { value: 'Elective', label: 'Elective / Optional' },
                 { value: 'Practical', label: 'Practical / Lab' }
               ]} 
               value={subjectForm.type}
               onChange={e => setSubjectForm(prev => ({ ...prev, type: e.target.value }))}
             />
           </div>
        </div>
      </Modal>

      {/* Create Bundle Modal */}
      <Modal 
        isOpen={isBundleModalOpen} 
        onClose={() => setBundleModalOpen(false)} 
        title={editingBundleId ? "Edit Subject Bundle" : "Create Subject Bundle"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBundleModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveSubject} 
              disabled={!bundleForm.name || bundleForm.subjectIds.length === 0}
              className="disabled:opacity-50"
              onClickCapture={(e) => {
                e.stopPropagation();
                handleSaveBundle();
              }}
            >
              {editingBundleId ? "Save Changes" : "Create Bundle"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
           <div>
             <Input 
               label="Bundle Name" 
               placeholder="e.g. PCM Foundation" 
               value={bundleForm.name}
               onChange={e => setBundleForm(prev => ({ ...prev, name: e.target.value }))}
             />
           </div>
           
           <div>
             <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Select Subjects for Bundle</label>
             <p className="text-xs text-slate-500 mb-2">Select from the subjects currently assigned to this level.</p>
             
             <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
               {assignedSubjects.length === 0 ? (
                 <div className="p-4 text-center text-sm text-slate-500">No subjects available in this level to bundle.</div>
               ) : (
                 assignedSubjects.map(sub => (
                   <label key={sub.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 mr-3 text-blue-600 border-slate-300 rounded" 
                        checked={bundleForm.subjectIds.includes(sub.id)}
                        onChange={() => handleToggleBundleSubject(sub.id)}
                      />
                      <span className="text-sm font-medium text-slate-800 flex-1">{sub.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{sub.code}</span>
                   </label>
                 ))
               )}
             </div>
           </div>
        </div>
      </Modal>

    </div>
  );
};

