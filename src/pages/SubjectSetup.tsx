import React, { useState, useMemo } from 'react';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { BookOpen, Layers, Plus, Search, Download, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';

import { INITIAL_SUBJECTS_MAP, INITIAL_BUNDLES_MAP } from '../data/mockData';

export const SubjectSetup: React.FC = () => {
  const { courses, staff } = useApp();
  
  const teachers = useMemo(() => staff.filter(s => s.role === 'Teacher'), [staff]);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');

  const sortOptions = [
    { value: 'name-asc', label: 'Name (A → Z)' },
    { value: 'name-desc', label: 'Name (Z → A)' },
    { value: 'code-asc', label: 'Code (A → Z)' },
    { value: 'type', label: 'Type' },
    { value: 'course-asc', label: 'Course (A → Z)' },
  ];

  // Pagination State
  const [subjPage, setSubjPage] = useState(1);
  const [subjPageSize, setSubjPageSize] = useState(10);
  const [bunPage, setBunPage] = useState(1);
  const [bunPageSize, setBunPageSize] = useState(10);

  // Data State
  const [assignedSubjectsMap, setAssignedSubjectsMap] = useState<Record<string, any[]>>(INITIAL_SUBJECTS_MAP);
  const [bundlesMap, setBundlesMap] = useState<Record<string, any[]>>(INITIAL_BUNDLES_MAP);

  // Modal States
  const [isAddSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [isBundleModalOpen, setBundleModalOpen] = useState(false);
  
  // Form State
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<{name: string, code: string, type: string, formCourse: string, formProgram: string, formLevel: string, teacherIds: string[]}>({ name: '', code: '', type: 'Core', formCourse: '', formProgram: '', formLevel: '', teacherIds: [] });
  
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleForm, setBundleForm] = useState<{name: string, subjectIds: string[], formCourse: string, formProgram: string, formLevel: string}>({ name: '', subjectIds: [], formCourse: '', formProgram: '', formLevel: '' });

  // Filter Options
  const courseOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Courses' },
      ...courses.map(c => ({ value: c.code, label: c.name }))
    ];
  }, [courses]);

  const programOptions = useMemo(() => {
    if (filterCourse === 'All') return [{ value: 'All', label: 'All Programs' }];
    const course = courses.find(c => c.code === filterCourse);
    if (!course || !course.programs) return [{ value: 'All', label: 'All Programs' }];
    return [{ value: 'All', label: 'All Programs' }, ...course.programs.map(p => ({ value: p, label: p }))];
  }, [filterCourse, courses]);

  const levelOptions = useMemo(() => {
    if (filterProgram === 'All') return [{ value: 'All', label: 'All Levels' }];
    let levels: { value: string, label: string }[] = [{ value: 'year1', label: 'Year 1' }];
    if (filterProgram.toLowerCase().includes('2 year')) {
      levels = [{ value: 'year1', label: 'Year 1' }, { value: 'year2', label: 'Year 2' }];
    } else if (filterProgram.toLowerCase().includes('8th std')) {
      levels = [{ value: 'class8', label: 'Class 8' }];
    }
    return [{ value: 'All', label: 'All Levels' }, ...levels];
  }, [filterProgram]);

  // Flattened Data
  const parseKey = (key: string) => {
    let courseCode = '';
    for (const c of courses) {
      if (key.startsWith(c.code + '-')) {
        courseCode = c.code;
        break;
      }
    }
    if (!courseCode) return null;
    
    const remaining = key.substring(courseCode.length + 1);
    const lastDashIdx = remaining.lastIndexOf('-');
    if (lastDashIdx === -1) return null;
    
    const programName = remaining.substring(0, lastDashIdx);
    const levelValue = remaining.substring(lastDashIdx + 1);
    
    const courseName = courses.find(c => c.code === courseCode)?.name || courseCode;
    const levelLabels: any = { year1: 'Year 1', year2: 'Year 2', class8: 'Class 8' };
    const levelLabel = levelLabels[levelValue] || levelValue;

    return { courseCode, courseName, programName, levelValue, levelLabel };
  };

  const flatSubjects = useMemo(() => {
    const list: any[] = [];
    for (const key in assignedSubjectsMap) {
      const parsed = parseKey(key);
      if (!parsed) continue;
      
      assignedSubjectsMap[key].forEach(sub => {
        list.push({ ...sub, activeKey: key, ...parsed });
      });
    }
    return list;
  }, [assignedSubjectsMap, courses]);

  const flatBundles = useMemo(() => {
    const list: any[] = [];
    for (const key in bundlesMap) {
      const parsed = parseKey(key);
      if (!parsed) continue;
      
      bundlesMap[key].forEach(bun => {
        list.push({ ...bun, activeKey: key, ...parsed });
      });
    }
    return list;
  }, [bundlesMap, courses]);

  // Applying Filters
  const filteredSubjects = useMemo(() => {
    const list = flatSubjects.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
      const matchCourse = filterCourse === 'All' || s.courseCode === filterCourse;
      const matchProgram = filterProgram === 'All' || s.programName === filterProgram;
      const matchLevel = filterLevel === 'All' || s.levelValue === filterLevel;
      return matchSearch && matchCourse && matchProgram && matchLevel;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'code-asc') return a.code.localeCompare(b.code);
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      if (sortBy === 'course-asc') return a.courseName.localeCompare(b.courseName);
      return 0;
    });
  }, [flatSubjects, search, filterCourse, filterProgram, filterLevel, sortBy]);

  const filteredBundles = useMemo(() => {
    const list = flatBundles.filter(b => {
      const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
      const matchCourse = filterCourse === 'All' || b.courseCode === filterCourse;
      const matchProgram = filterProgram === 'All' || b.programName === filterProgram;
      const matchLevel = filterLevel === 'All' || b.levelValue === filterLevel;
      return matchSearch && matchCourse && matchProgram && matchLevel;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'course-asc') return a.courseName.localeCompare(b.courseName);
      return 0;
    });
  }, [flatBundles, search, filterCourse, filterProgram, filterLevel, sortBy]);

  // Pagination Data
  const subjTotalPages = Math.max(1, Math.ceil(filteredSubjects.length / subjPageSize));
  const paginatedSubjects = filteredSubjects.slice((subjPage - 1) * subjPageSize, subjPage * subjPageSize);

  const bunTotalPages = Math.max(1, Math.ceil(filteredBundles.length / bunPageSize));
  const paginatedBundles = filteredBundles.slice((bunPage - 1) * bunPageSize, bunPage * bunPageSize);

  // Filter Handlers
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCourse(e.target.value);
    setFilterProgram('All');
    setFilterLevel('All');
    setSubjPage(1);
    setBunPage(1);
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterProgram(e.target.value);
    setFilterLevel('All');
    setSubjPage(1);
    setBunPage(1);
  };

  const handleExportCSV = () => {
    const dataToExport = filteredSubjects.map(s => ({
      'Subject Code': s.code,
      'Subject Name': s.name,
      'Course': s.courseName,
      'Program': s.programName,
      'Level': s.levelLabel,
      'Type': s.type,
      'Teachers': (s.teacherIds || []).map((id: string) => teachers.find(t => t.email === id)?.name || id).join('; ')
    }));
    
    if (dataToExport.length === 0) return;
    const csvRows = [];
    const headers = Object.keys(dataToExport[0]);
    csvRows.push(headers.join(','));
    
    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = row[header as keyof typeof row] || '';
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "subjects_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CRUD Subjects
  const handleOpenAddSubject = () => {
    setEditingSubjectId(null);
    setSubjectForm({ name: '', code: '', type: 'Core', formCourse: filterCourse !== 'All' ? filterCourse : '', formProgram: filterProgram !== 'All' ? filterProgram : '', formLevel: filterLevel !== 'All' ? filterLevel : '', teacherIds: [] });
    setAddSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subject: any) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({ name: subject.name, code: subject.code, type: subject.type, formCourse: subject.courseCode, formProgram: subject.programName, formLevel: subject.levelValue, teacherIds: subject.teacherIds || [] });
    setAddSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (!subjectForm.name || !subjectForm.code || !subjectForm.formCourse || !subjectForm.formProgram || !subjectForm.formLevel) return;
    const activeKey = `${subjectForm.formCourse}-${subjectForm.formProgram}-${subjectForm.formLevel}`;
    
    setAssignedSubjectsMap(prev => {
      const levelSubjects = prev[activeKey] || [];
      if (editingSubjectId) {
        return {
          ...prev,
          [activeKey]: levelSubjects.map(s => 
            s.id === editingSubjectId ? { ...s, name: subjectForm.name, code: subjectForm.code, type: subjectForm.type, teacherIds: subjectForm.teacherIds } : s
          )
        };
      } else {
        const newSubject = { id: `subj-${Date.now()}`, name: subjectForm.name, code: subjectForm.code, type: subjectForm.type, teacherIds: subjectForm.teacherIds };
        return {
          ...prev,
          [activeKey]: [...levelSubjects, newSubject]
        };
      }
    });
    setAddSubjectModalOpen(false);
  };

  const handleToggleSubjectTeacher = (email: string) => {
    setSubjectForm(prev => {
      if (prev.teacherIds.includes(email)) {
        return { ...prev, teacherIds: prev.teacherIds.filter(id => id !== email) };
      }
      return { ...prev, teacherIds: [...prev.teacherIds, email] };
    });
  };

  const handleRemoveSubject = (idToRemove: string, activeKey: string) => {
    setAssignedSubjectsMap(prev => {
      const levelSubjects = prev[activeKey] || [];
      return { ...prev, [activeKey]: levelSubjects.filter(s => s.id !== idToRemove) };
    });
    
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

  // CRUD Bundles
  const handleOpenAddBundle = () => {
    setEditingBundleId(null);
    setBundleForm({ name: '', subjectIds: [], formCourse: filterCourse !== 'All' ? filterCourse : '', formProgram: filterProgram !== 'All' ? filterProgram : '', formLevel: filterLevel !== 'All' ? filterLevel : '' });
    setBundleModalOpen(true);
  };

  const handleOpenEditBundle = (bundle: any) => {
    setEditingBundleId(bundle.id);
    setBundleForm({ name: bundle.name, subjectIds: [...bundle.subjectIds], formCourse: bundle.courseCode, formProgram: bundle.programName, formLevel: bundle.levelValue });
    setBundleModalOpen(true);
  };

  const handleSaveBundle = () => {
    if (!bundleForm.name || bundleForm.subjectIds.length === 0 || !bundleForm.formCourse || !bundleForm.formProgram || !bundleForm.formLevel) return;
    const activeKey = `${bundleForm.formCourse}-${bundleForm.formProgram}-${bundleForm.formLevel}`;
    
    setBundlesMap(prev => {
      const currentBundles = prev[activeKey] || [];
      if (editingBundleId) {
        return {
          ...prev,
          [activeKey]: currentBundles.map(b => 
            b.id === editingBundleId ? { ...b, name: bundleForm.name, subjectIds: bundleForm.subjectIds } : b
          )
        };
      } else {
        const newBundle = { id: `bundle-${Date.now()}`, name: bundleForm.name, subjectIds: bundleForm.subjectIds };
        return {
          ...prev,
          [activeKey]: [...currentBundles, newBundle]
        };
      }
    });
    setBundleModalOpen(false);
  };

  const handleRemoveBundle = (idToRemove: string, activeKey: string) => {
    setBundlesMap(prev => {
      const currentBundles = prev[activeKey] || [];
      return { ...prev, [activeKey]: currentBundles.filter(b => b.id !== idToRemove) };
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

  if (isAddSubjectModalOpen) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddSubjectModalOpen(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingSubjectId ? "Edit Subject" : "Create New Subject"}
            </h2>
            <p className="text-sm text-slate-500">
              {editingSubjectId ? "Update details for this subject profile." : "Create a new subject and select its course level mapping."}
            </p>
          </div>
        </div>

        <div className="w-full space-y-4">
          {!editingSubjectId && (
            <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assignment Context</h4>
              <Select
                label="Assign to Course"
                options={[{ value: '', label: 'Select a course...' }, ...courses.map(c => ({ value: c.code, label: c.name }))]}
                value={subjectForm.formCourse}
                onChange={e => setSubjectForm(prev => ({ ...prev, formCourse: e.target.value, formProgram: '', formLevel: '' }))}
              />
              <Select
                label="Assign to Program"
                options={[{ value: '', label: 'Select a program...' }, ...(courses.find(c => c.code === subjectForm.formCourse)?.programs?.map(p => ({ value: p, label: p })) || [])]}
                value={subjectForm.formProgram}
                onChange={e => setSubjectForm(prev => ({ ...prev, formProgram: e.target.value, formLevel: '' }))}
                disabled={!subjectForm.formCourse}
              />
              <Select
                label="Assign to Level"
                options={[
                  { value: '', label: 'Select a level...' },
                  ...(subjectForm.formProgram.toLowerCase().includes('2 year') ? [{ value: 'year1', label: 'Year 1' }, { value: 'year2', label: 'Year 2' }] : 
                    subjectForm.formProgram.toLowerCase().includes('8th std') ? [{ value: 'class8', label: 'Class 8' }] : 
                    subjectForm.formProgram ? [{ value: 'year1', label: 'Year 1' }] : [])
                ]}
                value={subjectForm.formLevel}
                onChange={e => setSubjectForm(prev => ({ ...prev, formLevel: e.target.value }))}
                disabled={!subjectForm.formProgram}
              />
            </div>
          )}

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

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Map Teachers</label>
            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
              {teachers.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">No teachers found in directory.</div>
              ) : (
                teachers.map(teacher => (
                  <label key={teacher.email} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 mr-3 text-blue-600 border-slate-300 rounded" 
                       checked={subjectForm.teacherIds.includes(teacher.email)}
                       onChange={() => handleToggleSubjectTeacher(teacher.email)}
                     />
                     <span className="text-sm text-slate-800 font-medium">{teacher.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setAddSubjectModalOpen(false)}>Cancel</Button>
            <Button 
              variant="primary"
              onClick={handleSaveSubject} 
              disabled={!subjectForm.name || !subjectForm.code || !subjectForm.formCourse || !subjectForm.formProgram || !subjectForm.formLevel}
              className="disabled:opacity-50"
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              {editingSubjectId ? "Save Changes" : "Create & Assign Subject"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isBundleModalOpen) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBundleModalOpen(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingBundleId ? "Edit Subject Bundle" : "Create Subject Bundle"}
            </h2>
            <p className="text-sm text-slate-500">Configure PCM/PCB core bundles, course contexts, and map subjects.</p>
          </div>
        </div>

        <div className="w-full space-y-5">
          <Input 
            label="Bundle Name" 
            placeholder="e.g. PCM Foundation" 
            value={bundleForm.name}
            onChange={e => setBundleForm(prev => ({ ...prev, name: e.target.value }))}
          />
          
          {!editingBundleId && (
            <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Context</h4>
              <Select
                label="Course"
                options={[{ value: '', label: 'Select a course...' }, ...courses.map(c => ({ value: c.code, label: c.name }))]}
                value={bundleForm.formCourse}
                onChange={e => setBundleForm(prev => ({ ...prev, formCourse: e.target.value, formProgram: '', formLevel: '', subjectIds: [] }))}
              />
              <Select
                label="Program"
                options={[{ value: '', label: 'Select a program...' }, ...(courses.find(c => c.code === bundleForm.formCourse)?.programs?.map(p => ({ value: p, label: p })) || [])]}
                value={bundleForm.formProgram}
                onChange={e => setBundleForm(prev => ({ ...prev, formProgram: e.target.value, formLevel: '', subjectIds: [] }))}
                disabled={!bundleForm.formCourse}
              />
              <Select
                label="Level"
                options={[
                  { value: '', label: 'Select a level...' },
                  ...(bundleForm.formProgram.toLowerCase().includes('2 year') ? [{ value: 'year1', label: 'Year 1' }, { value: 'year2', label: 'Year 2' }] : 
                    bundleForm.formProgram.toLowerCase().includes('8th std') ? [{ value: 'class8', label: 'Class 8' }] : 
                    bundleForm.formProgram ? [{ value: 'year1', label: 'Year 1' }] : [])
                ]}
                value={bundleForm.formLevel}
                onChange={e => setBundleForm(prev => ({ ...prev, formLevel: e.target.value, subjectIds: [] }))}
                disabled={!bundleForm.formProgram}
              />
            </div>
          )}

          {bundleForm.formLevel && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Select Subjects for Bundle</label>
              
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {(() => {
                  const bundleActiveKey = `${bundleForm.formCourse}-${bundleForm.formProgram}-${bundleForm.formLevel}`;
                  const availableSubjects = flatSubjects.filter(s => s.activeKey === bundleActiveKey);
                  
                  if (availableSubjects.length === 0) {
                    return <div className="p-4 text-center text-sm text-slate-500">No subjects available in this level to bundle.</div>;
                  }
                  
                  return availableSubjects.map(sub => (
                    <label key={sub.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="w-4 h-4 mr-3 text-blue-600 border-slate-300 rounded" 
                         checked={bundleForm.subjectIds.includes(sub.id)}
                         onChange={() => handleToggleBundleSubject(sub.id)}
                       />
                       <span className="text-sm text-slate-800 font-medium">{sub.name} <span className="text-slate-400 font-normal">({sub.code})</span></span>
                    </label>
                  ));
                })()}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setBundleModalOpen(false)}>Cancel</Button>
            <Button 
              variant="primary"
              disabled={!bundleForm.name || bundleForm.subjectIds.length === 0 || !bundleForm.formCourse || !bundleForm.formProgram || !bundleForm.formLevel}
              className="disabled:opacity-50"
              onClick={handleSaveBundle}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              {editingBundleId ? "Save Changes" : "Create Bundle"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Subject Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage subjects and bundles across all courses, programs, and levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={16} /> Export CSV
          </Button>
          <Button 
            variant="primary"
            onClick={handleOpenAddSubject} 
            style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
          >
            <Plus size={16} className="mr-2" /> Add Subject
          </Button>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm items-end">
        <div className="relative xl:col-span-2 flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search</label>
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search subjects or bundles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        </div>
        <Select
          label="Course"
          options={courseOptions}
          value={filterCourse}
          onChange={handleCourseChange}
        />
        <Select
          label="Program"
          options={programOptions}
          value={filterProgram}
          onChange={handleProgramChange}
          disabled={filterCourse === 'All'}
        />
        <Select
          label="Level"
          options={levelOptions}
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          disabled={filterProgram === 'All'}
        />
        <Select
          label="Sort By"
          options={sortOptions}
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setSubjPage(1); setBunPage(1); }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-6 pb-6">
        
        {/* ASSIGNED SUBJECTS TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Subjects</h3>
              <span className="ml-2 text-xs text-slate-400 font-medium">{filteredSubjects.length} result{filteredSubjects.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          {filteredSubjects.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
               <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
               <p className="font-medium">No subjects match your filters.</p>
            </div>
          ) : (
            <>
              <Table headers={['Subject Code', 'Subject Name', 'Teachers', 'Course', 'Program', 'Level', 'Type', 'Actions']}>
                {paginatedSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500 uppercase">{subject.code}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{subject.name}</td>
                    <td className="px-6 py-4">
                      {subject.teacherIds && subject.teacherIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subject.teacherIds.map((id: string, i: number) => {
                            const t = teachers.find(t => t.email === id);
                            return (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                                {t?.name || id}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No teachers</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subject.courseName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subject.programName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold border border-slate-200">
                        {subject.levelLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] uppercase font-bold border border-blue-100">{subject.type}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleOpenEditSubject(subject)} className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">Edit</button>
                        <button onClick={() => handleRemoveSubject(subject.id, subject.activeKey)} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                currentPage={subjPage}
                totalPages={subjTotalPages}
                totalItems={filteredSubjects.length}
                pageSize={subjPageSize}
                onPageChange={setSubjPage}
                onPageSizeChange={size => { setSubjPageSize(size); setSubjPage(1); }}
              />
            </>
          )}
        </div>

        {/* SUBJECT BUNDLES */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-purple-600" />
              <h3 className="font-bold text-slate-800">Subject Bundles</h3>
              <span className="ml-2 text-xs text-slate-400 font-medium">{filteredBundles.length} result{filteredBundles.length !== 1 ? 's' : ''}</span>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleOpenAddBundle} 
              className="flex items-center gap-1.5"
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              <Plus size={16} /> Create Bundle
            </Button>
          </div>
          
          <div className="p-5 bg-slate-50/30">
             {filteredBundles.length === 0 ? (
               <div className="py-12 text-center text-slate-400">
                 <Layers size={36} className="mx-auto mb-3 text-slate-300" />
                 <p className="font-medium">No bundles match your filters.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {paginatedBundles.map(bundle => (
                   <div key={bundle.id} className="border border-slate-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 bg-white flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-800">{bundle.name}</h4>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200">
                          {bundle.levelLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-3">
                        {bundle.courseName} • {bundle.programName}
                      </div>
                      <ul className="text-xs text-slate-600 space-y-1.5 mb-4 flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {bundle.subjectIds.map((subId: string, i: number) => {
                          const sub = flatSubjects.find(s => s.id === subId && s.activeKey === bundle.activeKey);
                          return sub ? <li key={i} className="flex items-center gap-2"><div className="w-1 h-1 bg-purple-400 rounded-full"></div>{sub.name} <span className="text-slate-400 font-mono text-[10px]">({sub.code})</span></li> : null;
                        })}
                        {bundle.subjectIds.length === 0 && (
                          <li className="text-slate-400 italic text-center">No subjects selected</li>
                        )}
                      </ul>
                      <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between">
                        <button onClick={() => handleOpenEditBundle(bundle)} className="text-xs font-semibold text-blue-500 hover:text-blue-700">Edit Bundle</button>
                        <button onClick={() => handleRemoveBundle(bundle.id, bundle.activeKey)} className="text-xs font-semibold text-red-500 hover:text-red-700">Delete</button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
          {filteredBundles.length > 0 && (
            <Pagination
              currentPage={bunPage}
              totalPages={bunTotalPages}
              totalItems={filteredBundles.length}
              pageSize={bunPageSize}
              onPageChange={setBunPage}
              onPageSizeChange={size => { setBunPageSize(size); setBunPage(1); }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
