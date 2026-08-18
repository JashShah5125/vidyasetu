import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';

interface MastersProps {
  initialSubTab?: 'courses' | 'batches' | 'subjects' | 'branches';
}

export const Masters: React.FC<MastersProps> = ({ initialSubTab = 'courses' }) => {
  const {
    courses, 
    batches, 
    branches,
    addCourse, 
    addBatch, 
    setCourses,
    setBatches,
    setBranches,
    addToast
  } = useApp();
  const [subTab, setSubTab] = useState<'courses' | 'batches' | 'subjects' | 'branches'>(initialSubTab);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  const [branchesPage, setBranchesPage] = useState(1);
  const [coursesPage, setCoursesPage] = useState(1);
  const [batchesPage, setBatchesPage] = useState(1);
  const [subjectsPage, setSubjectsPage] = useState(1);
  const itemsPerPage = 3;

  const [searchTerm, setSearchTerm] = useState('');

  const [subjects] = useState([
    { name: 'Organic Chemistry', department: 'Chemistry Department', batches: 'JEE-Morning-A, NEET-Regular-B' },
    { name: 'Electromagnetism', department: 'Physics Department', batches: 'JEE-Evening-B' }
  ]);

  // Form states - Branch
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAdmin, setBranchAdmin] = useState('');
  const [branchCapacity, setBranchCapacity] = useState(100);

  // Form states - Course
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseFees, setCourseFees] = useState(120000);
  const [courseDuration, setCourseDuration] = useState('2 Years');

  // Form states - Batch
  const [batchName, setBatchName] = useState('');
  const [batchCourse, setBatchCourse] = useState('');
  const [batchTiming, setBatchTiming] = useState('09:00 AM - 10:30 AM');
  const [batchRoom, setBatchRoom] = useState('Room 101');
  const [batchTeacher, setBatchTeacher] = useState('Prof. Arvind Kelkar');

  React.useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const handleOpenAddModal = () => {
    if (subTab === 'subjects') {
      addToast('Adding new Subject Masters is disabled in Demo Mode.', 'info');
      return;
    }
    setEditingName(null);

    setCourseName('');
    setCourseCode('');
    setCourseFees(120000);
    setCourseDuration('2 Years');

    setBatchName('');
    setBatchCourse(courses[0]?.name || 'JEE Prep');
    setBatchTiming('09:00 AM - 10:30 AM');
    setBatchRoom('Room 101');
    setBatchTeacher('Prof. Arvind Kelkar');

    setShowAddModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingName(item.name);
    if (subTab === 'courses') {
      setCourseName(item.name);
      setCourseCode(item.code);
      setCourseFees(item.fees);
      setCourseDuration(item.duration);
    } else if (subTab === 'batches') {
      setBatchName(item.name);
      setBatchCourse(item.course);
      setBatchTiming(item.timing);
      setBatchRoom(item.room);
      setBatchTeacher(item.teacher);
    }
    setShowAddModal(true);
  };

  const handleDelete = (name: string) => {
    if (subTab === 'branches') {
      setBranches(prev => prev.filter(b => b.name !== name));
    } else if (subTab === 'courses') {
      setCourses(prev => prev.filter(c => c.name !== name));
    } else if (subTab === 'batches') {
      setBatches(prev => prev.filter(b => b.name !== name));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subTab === 'courses') {
      if (!courseName || !courseCode) return;
      if (editingName) {
        setCourses(prev => prev.map(c => c.name === editingName 
          ? { ...c, name: courseName, code: courseCode, fees: courseFees, duration: courseDuration } 
          : c
        ));
      } else {
        addCourse({
          name: courseName,
          code: courseCode,
          fees: Number(courseFees),
          duration: courseDuration,
          batches: '0 Batches',
          programs: []
        });
      }
    } else if (subTab === 'batches') {
      if (!batchName) return;
      if (editingName) {
        setBatches(prev => prev.map(b => b.name === editingName 
          ? { ...b, name: batchName, course: batchCourse, timing: batchTiming, room: batchRoom, teacher: batchTeacher } 
          : b
        ));
      } else {
        addBatch({
          name: batchName,
          course: batchCourse || courses[0]?.name || 'JEE Prep',
          timing: batchTiming,
          room: batchRoom,
          teacher: batchTeacher
        });
      }
    }
    setShowAddModal(false);
    setEditingName(null);
  };

  const filteredAndSortedBranches = branches
    .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredAndSortedCourses = courses
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredAndSortedBatches = batches
    .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.course.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredAndSortedSubjects = subjects
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.department.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleExportCSV = () => {
    let dataToExport: any[] = [];
    let filename = '';
    
    if (subTab === 'branches') {
      dataToExport = filteredAndSortedBranches.map(b => ({ 'Branch Name': b.name, 'Branch Code': b.code, 'Admin Owner': b.admin, 'Capacity': b.capacity }));
      filename = 'branches.csv';
    } else if (subTab === 'courses') {
      dataToExport = filteredAndSortedCourses.map(c => ({ 'Course Name': c.name, 'Course Code': c.code, 'Fees (Rs.)': c.fees, 'Duration': c.duration }));
      filename = 'courses.csv';
    } else if (subTab === 'batches') {
      dataToExport = filteredAndSortedBatches.map(b => ({ 'Batch Name': b.name, 'Course': b.course, 'Room': b.room, 'Teacher': b.teacher, 'Timings': b.timing }));
      filename = 'batches.csv';
    } else if (subTab === 'subjects') {
      dataToExport = filteredAndSortedSubjects.map(s => ({ 'Subject Name': s.name, 'Department': s.department, 'Batches': s.batches }));
      filename = 'subjects.csv';
    }
    
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
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showAddModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingName ? `Edit Record: ${editingName}` : `Create Master Record: ${subTab.toUpperCase()}`}
            </h2>
            <p className="text-sm text-slate-500">Configure core attributes for course templates, branch locations, batches, or subject structures.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {subTab === 'courses' && (
              <>
                <Input label="Course Title Name" required placeholder="e.g. NEET Batch Premium" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Course Unique Code" required placeholder="e.g. NEET-PREM" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
                  <Input label="Target Duration" placeholder="e.g. 1 Year" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} />
                </div>
                <Input label="Course Fee Amount (Rs.)" type="number" value={courseFees} onChange={(e) => setCourseFees(Number(e.target.value))} />
              </>
            )}

            {subTab === 'batches' && (
              <>
                <Input label="Batch Name Label" required placeholder="e.g. NEET-Regular-B" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
                <Select 
                  label="Target Course Mapping" 
                  value={batchCourse} 
                  onChange={(e) => setBatchCourse(e.target.value)} 
                  options={courses.map(c => ({ value: c.name, label: c.name }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Daily Lecture Timings" placeholder="e.g. 09:00 AM - 10:30 AM" value={batchTiming} onChange={(e) => setBatchTiming(e.target.value)} />
                  <Input label="Allotted Classroom" placeholder="e.g. Room 102" value={batchRoom} onChange={(e) => setBatchRoom(e.target.value)} />
                </div>
                <Input label="Primary Lecturer / Teacher" placeholder="Prof. Arvind Kelkar" value={batchTeacher} onChange={(e) => setBatchTeacher(e.target.value)} />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">
                {editingName ? 'Update Record' : 'Save Master Record'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Masters Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">Configure active branches, course details, timetable sessions, and subjects master.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Master Record
          </Button>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="flex bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <Input 
          placeholder={`Search ${subTab}...`} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          wrapperClassName="w-full"
        />
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setSubTab('courses')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
            subTab === 'courses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Courses
        </button>
        <button
          onClick={() => setSubTab('batches')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
            subTab === 'batches' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Batches
        </button>
        <button
          onClick={() => setSubTab('subjects')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
            subTab === 'subjects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Subjects Master
        </button>
      </div>

      {/* Render sub-tabs */}

      {subTab === 'courses' && (
        (() => {
          const paginatedCourses = filteredAndSortedCourses.slice((coursesPage - 1) * itemsPerPage, coursesPage * itemsPerPage);
          const totalPages = Math.ceil(filteredAndSortedCourses.length / itemsPerPage);
          return (
            <Card>
              <CardHeader>
                <CardTitle>Offered Courses &amp; Curriculums</CardTitle>
              </CardHeader>
              <Table headers={['Course Title', 'Code', 'Course Fees', 'Duration', 'Actions']}>
                {paginatedCourses.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-xs">{c.code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">Rs. {c.fees}</td>
                    <td className="px-6 py-4">{c.duration}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(c)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.name)}
                          className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                currentPage={coursesPage}
                totalPages={totalPages}
                totalItems={filteredAndSortedCourses.length}
                pageSize={itemsPerPage}
                onPageChange={setCoursesPage}
              />
            </Card>
          );
        })()
      )}

      {subTab === 'batches' && (
        (() => {
          const paginatedBatches = filteredAndSortedBatches.slice((batchesPage - 1) * itemsPerPage, batchesPage * itemsPerPage);
          const totalPages = Math.ceil(filteredAndSortedBatches.length / itemsPerPage);
          return (
            <Card>
              <CardHeader>
                <CardTitle>Academic Batches Allocation</CardTitle>
              </CardHeader>
              <Table headers={['Batch Name', 'Mapped Course', 'Lecture Timings', 'Allotted Classroom', 'Primary Teacher', 'Actions']}>
                {paginatedBatches.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{b.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{b.course}</td>
                    <td className="px-6 py-4 font-mono text-xs">{b.timing}</td>
                    <td className="px-6 py-4">{b.room}</td>
                    <td className="px-6 py-4">{b.teacher}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(b)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(b.name)}
                          className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-650 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                currentPage={batchesPage}
                totalPages={totalPages}
                totalItems={filteredAndSortedBatches.length}
                pageSize={itemsPerPage}
                onPageChange={setBatchesPage}
              />
            </Card>
          );
        })()
      )}

      {subTab === 'subjects' && (
        (() => {
          const paginatedSubjects = filteredAndSortedSubjects.slice((subjectsPage - 1) * itemsPerPage, subjectsPage * itemsPerPage);
          const totalPages = Math.ceil(filteredAndSortedSubjects.length / itemsPerPage);
          return (
            <Card>
              <CardHeader>
                <CardTitle>Subjects Syllabus Config</CardTitle>
              </CardHeader>
              <Table headers={['Subject Name', 'Primary Department', 'Assigned Batches', 'Actions']}>
                {paginatedSubjects.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-6 py-4">{s.department}</td>
                    <td className="px-6 py-4 text-xs">{s.batches}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(s)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.name)}
                          className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-650 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                currentPage={subjectsPage}
                totalPages={totalPages}
                totalItems={filteredAndSortedSubjects.length}
                pageSize={itemsPerPage}
                onPageChange={setSubjectsPage}
              />
            </Card>
          );
        })()
      )}    </div>
  );
};
