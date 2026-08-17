import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Layers, Plus, Search, Clock, BookOpen, Download, ArrowLeft } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';

export const BatchSetup: React.FC = () => {
  const { batches, courses, branches, currentUser } = useApp();

  const myCourses = useMemo(() => {
    return currentUser?.role === 'branch-admin'
      ? courses.filter(c => (c.branches || []).includes(currentUser.branch || ''))
      : courses;
  }, [courses, currentUser]);

  // Local batch state since batches aren't managed via context mutations yet
  const [batchList, setBatchList] = useState(batches);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', branch: '', course: '', program: '', level: '', academicYear: '', startTime: '', endTime: '', room: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28'];

  const courseOptions = useMemo(() => {
    return [
      { value: 'All', label: 'All Courses' },
      ...myCourses.map(c => ({ value: c.name, label: c.name }))
    ];
  }, [myCourses]);

  const formCourseOptions = useMemo(() => {
    return myCourses.map(c => ({ value: c.name, label: c.name }));
  }, [myCourses]);

  const formBranchOptions = useMemo(() => {
    if (currentUser?.role === 'branch-admin') {
      return [{ value: currentUser.branch || '', label: currentUser.branch || '' }];
    }
    return branches.map(b => ({ value: b.name, label: b.name }));
  }, [branches, currentUser]);

  const filterBranchOptions = useMemo(() => {
    if (currentUser?.role === 'branch-admin') {
      return [{ value: currentUser.branch || '', label: currentUser.branch || '' }];
    }
    return [{ value: 'All', label: 'All Branches' }, ...branches.map(b => ({ value: b.name, label: b.name }))];
  }, [branches, currentUser]);

  const filterProgramOptions = useMemo(() => {
    if (filterCourse === 'All') return [{ value: 'All', label: 'All Programs' }];
    const course = myCourses.find(c => c.name === filterCourse);
    if (!course || !course.programs) return [{ value: 'All', label: 'All Programs' }];
    return [{ value: 'All', label: 'All Programs' }, ...course.programs.map(p => ({ value: p, label: p }))];
  }, [filterCourse, myCourses]);

  const formProgramOptions = useMemo(() => {
    if (!form.course) return [];
    const course = myCourses.find(c => c.name === form.course);
    if (!course || !course.programs) return [];
    return course.programs.map(p => ({ value: p, label: p }));
  }, [form.course, myCourses]);

  const deriveLevels = (progName: string) => {
    if (!progName) return [];
    if (progName.toLowerCase().includes('2 year')) {
      return [{ value: 'year1', label: 'Year 1' }, { value: 'year2', label: 'Year 2' }];
    }
    if (progName.toLowerCase().includes('8th std')) {
      return [{ value: 'class8', label: 'Class 8' }];
    }
    return [{ value: 'year1', label: 'Year 1' }];
  };

  const formatLevelLabel = (val: string) => {
    if (!val) return '—';
    if (val === 'year1') return 'Year 1';
    if (val === 'year2') return 'Year 2';
    if (val === 'class8') return 'Class 8';
    return val;
  };

  const filterLevelOptions = useMemo(() => {
    if (filterProgram === 'All') return [{ value: 'All', label: 'All Levels' }];
    const levels = deriveLevels(filterProgram);
    return [{ value: 'All', label: 'All Levels' }, ...levels];
  }, [filterProgram]);

  const formLevelOptions = useMemo(() => {
    return deriveLevels(form.program);
  }, [form.program]);



  const filtered = useMemo(() => {
    const list = batchList.filter(b => {
      const matchSearch =
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.room || '').toLowerCase().includes(search.toLowerCase());
      const matchBranch = currentUser?.role === 'branch-admin'
        ? b.branch === currentUser.branch
        : (filterBranch === 'All' || b.branch === filterBranch);
      const matchCourse = filterCourse === 'All' || b.course === filterCourse;
      const matchProgram = filterProgram === 'All' || b.program === filterProgram;
      const matchLevel = filterLevel === 'All' || b.level === filterLevel;
      const matchYear = filterYear === 'All' || b.academicYear === filterYear;
      return matchSearch && matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [batchList, search, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, currentUser]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const format12h = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const parseTo24h = (time12: string) => {
    if (!time12) return '';
    const parts = time12.trim().split(' ');
    if (parts.length < 2) return time12;
    const [time, ampm] = parts;
    let [h, m] = time.split(':');
    let hours = parseInt(h, 10);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${m}`;
  };

  const handleOpenAdd = () => {
    setEditingIdx(null);
    const initialBranch = currentUser?.role === 'branch-admin' ? currentUser.branch || '' : (branches[0]?.name || '');
    const initialCourse = myCourses[0]?.name || '';
    const initialProgram = myCourses[0]?.programs?.[0] || '';
    const initialLevel = deriveLevels(initialProgram)[0]?.value || '';
    setForm({ name: '', branch: initialBranch, course: initialCourse, program: initialProgram, level: initialLevel, academicYear: '2026-27', startTime: '', endTime: '', room: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (idx: number) => {
    const b = filtered[idx];
    const realIdx = batchList.findIndex(x => x.name === b.name && x.course === b.course);
    setEditingIdx(realIdx);
    
    let st = '', et = '';
    if (b.timing) {
      const parts = b.timing.split(' - ');
      st = parts[0] ? parseTo24h(parts[0]) : '';
      et = parts[1] ? parseTo24h(parts[1]) : '';
    }
    
    setForm({ name: b.name, branch: b.branch || branches[0]?.name || '', course: b.course, program: b.program || '', level: b.level || '', academicYear: b.academicYear || '2026-27', startTime: st, endTime: et, room: b.room });
    setIsModalOpen(true);
  };

  const handleDelete = (idx: number) => {
    const b = filtered[idx];
    setBatchList(prev => prev.filter(x => !(x.name === b.name && x.course === b.course)));
  };

  const handleSave = () => {
    if (!form.name || !form.course || !form.branch) return;
    
    let timingStr = '';
    if (form.startTime && form.endTime) {
      timingStr = `${format12h(form.startTime)} - ${format12h(form.endTime)}`;
    }
    
    const finalBatch = {
      name: form.name,
      branch: form.branch,
      course: form.course,
      program: form.program,
      level: form.level,
      academicYear: form.academicYear,
      timing: timingStr,
      room: form.room
    };

    if (editingIdx !== null) {
      setBatchList(prev => prev.map((b, i) => i === editingIdx ? finalBatch : b));
    } else {
      setBatchList(prev => [...prev, finalBatch]);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map(b => ({
      'Batch Name': b.name,
      'Course': b.course,
      'Program': b.program || '',
      'Level': formatLevelLabel(b.level || ''),
      'Academic Year': b.academicYear || '',
      'Timing': b.timing,
      'Room': b.room
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'batches.csv';
    a.click();
  };

  if (isModalOpen) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingIdx !== null ? 'Edit Batch' : 'Create New Batch'}
            </h2>
            <p className="text-sm text-slate-500">Configure academic year, course alignment, programs levels, times, and lecture rooms.</p>
          </div>
        </div>

        <div className="w-full space-y-4">
          <Select
            label="Branch"
            options={formBranchOptions}
            value={form.branch}
            onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}
            disabled={currentUser?.role === 'branch-admin'}
          />
          <Input
            label="Batch Name"
            placeholder="e.g. JEE-Morning-A"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Course"
              options={formCourseOptions}
              value={form.course}
              onChange={e => {
                const newCourse = e.target.value;
                const courseObj = myCourses.find(c => c.name === newCourse);
                const newProg = courseObj?.programs?.[0] || '';
                const newLvl = deriveLevels(newProg)[0]?.value || '';
                setForm(p => ({ ...p, course: newCourse, program: newProg, level: newLvl }));
              }}
            />
            <Select
              label="Academic Year"
              options={ACADEMIC_YEARS.map(y => ({ value: y, label: y }))}
              value={form.academicYear}
              onChange={e => setForm(p => ({ ...p, academicYear: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Program"
              options={formProgramOptions}
              value={form.program}
              onChange={e => {
                const newProg = e.target.value;
                const newLvl = deriveLevels(newProg)[0]?.value || '';
                setForm(p => ({ ...p, program: newProg, level: newLvl }));
              }}
              disabled={!form.course}
            />
            <Select
              label="Level"
              options={formLevelOptions}
              value={form.level}
              onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
              disabled={!form.program}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start Time"
              value={form.startTime}
              onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
            />
            <Input
              type="time"
              label="End Time"
              value={form.endTime}
              onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
            />
          </div>
          <Input
            label="Room"
            placeholder="e.g. Classroom 101"
            value={form.room}
            onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.course} className="disabled:opacity-50">
              {editingIdx !== null ? 'Save Changes' : 'Create Batch'}
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
          <h2 className="text-2xl font-display font-bold text-slate-900">Batch Management</h2>
          <p className="text-sm text-slate-500 mt-1">Configure and manage batches across programs and levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
          >
            <Plus size={16} className="mr-2" /> Create New Batch
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 xl:grid-cols-7 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm items-end">
        <div className="relative xl:col-span-2 flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search</label>
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by batch name or room..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        </div>
        <Select
          label="Branch"
          options={filterBranchOptions}
          value={filterBranch}
          onChange={e => {
            setFilterBranch(e.target.value);
            setCurrentPage(1);
          }}
          disabled={currentUser?.role === 'branch-admin'}
        />
        <Select
          label="Course"
          options={courseOptions}
          value={filterCourse}
          onChange={e => {
            setFilterCourse(e.target.value);
            setFilterProgram('All');
            setFilterLevel('All');
          }}
        />
        <Select
          label="Program"
          options={filterProgramOptions}
          value={filterProgram}
          onChange={e => {
            setFilterProgram(e.target.value);
            setFilterLevel('All');
          }}
          disabled={filterCourse === 'All'}
        />
        <Select
          label="Level"
          options={filterLevelOptions}
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          disabled={filterProgram === 'All'}
        />
        <Select
          label="Academic Year"
          options={[{ value: 'All', label: 'All Years' }, ...ACADEMIC_YEARS.map(y => ({ value: y, label: y }))]}
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">All Batches</h3>
            <span className="ml-2 text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Layers size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No batches match your filters.</p>
          </div>
        ) : (
          <>
            <Table dense headers={['Batch Name', 'Course', 'Program', 'Level', 'Academic Year', 'Timing', 'Room', 'Actions']}>
              {paginated.map((batch, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3 font-semibold text-slate-800">{batch.name}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <BookOpen size={13} className="text-purple-400 shrink-0" /> {batch.course}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600">{batch.program || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold border border-slate-200">
                      {formatLevelLabel(batch.level || '')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-slate-600 whitespace-nowrap text-center">{batch.academicYear || '—'}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
                      <Clock size={13} className="text-blue-400 shrink-0" /> {batch.timing}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600">{batch.room}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleOpenEdit(idx)} className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(idx)} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
};
