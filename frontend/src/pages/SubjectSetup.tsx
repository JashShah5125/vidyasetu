import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { BookOpen, Plus, Search, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';
import { subjectApi } from '../services/subjectApi';
import type { Subject } from '../services/subjectApi';
import { courseApi } from '../services/courseApi';

export const SubjectSetup: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useApp();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Courses Data
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseData, setSelectedCourseData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 1. Fetch Master List of Courses on Mount
  useEffect(() => {
    courseApi.list({ limit: 1000 }).then(res => {
      if (res?.status === 'success' && res.data) {
        setCourses(res.data);
      }
    }).catch(() => {});
  }, []);

  // 2. Fetch Course Details when a Course is selected to populate Programs/Levels
  useEffect(() => {
    if (selectedCourseCode) {
      courseApi.getByCode(selectedCourseCode).then(res => {
        if (res?.status === 'success' && res.data) {
          setSelectedCourseData(res.data);
        }
      }).catch(() => {});
    } else {
      setSelectedCourseData(null);
      setSelectedProgramId('');
      setSelectedLevelId('');
    }
  }, [selectedCourseCode]);

  // Derived options for dropdowns
  const selectedCourseId = useMemo(() => {
    return courses.find(c => c.code === selectedCourseCode)?.id?.toString() || '';
  }, [courses, selectedCourseCode]);

  const programOptions = useMemo(() => {
    if (!selectedCourseData?.programs) return [{ value: '', label: 'All Programs' }];
    return [
      { value: '', label: 'All Programs' },
      ...selectedCourseData.programs.map((p: any) => ({ value: String(p.id), label: p.name }))
    ];
  }, [selectedCourseData]);

  const levelOptions = useMemo(() => {
    if (!selectedCourseData?.programs || !selectedProgramId) return [{ value: '', label: 'All Levels' }];
    const prog = selectedCourseData.programs.find((p: any) => String(p.id) === selectedProgramId);
    if (!prog?.levels) return [{ value: '', label: 'All Levels' }];
    return [
      { value: '', label: 'All Levels' },
      ...prog.levels.map((l: any) => ({ value: String(l.id), label: l.name }))
    ];
  }, [selectedCourseData, selectedProgramId]);

  // 3. Fetch Subjects based on filters
  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const res = await subjectApi.list({ 
        status: filterStatus,
        courseId: selectedCourseId,
        programId: selectedProgramId,
        levelId: selectedLevelId
      });
      if (res?.status === 'success') {
        setSubjects(res.data || []);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [filterStatus, selectedCourseId, selectedProgramId, selectedLevelId]);

  // Frontend Text Search
  const filtered = useMemo(() => {
    const list = subjects.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Subject Pool</h2>
          <p className="text-sm text-slate-500 mt-1">Manage the global catalog of subjects and filter by hierarchies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => navigate('/subjects/new')}
            style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
          >
            <Plus size={16} className="mr-2" /> Add New Subject
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Course"
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map(c => ({ value: c.code, label: c.name }))
            ]}
            value={selectedCourseCode}
            onChange={e => {
              setSelectedCourseCode(e.target.value);
              setSelectedProgramId('');
              setSelectedLevelId('');
              setCurrentPage(1);
            }}
          />
          <Select
            label="Program"
            options={programOptions}
            value={selectedProgramId}
            onChange={e => {
              setSelectedProgramId(e.target.value);
              setSelectedLevelId('');
              setCurrentPage(1);
            }}
            disabled={!selectedCourseCode}
          />
          <Select
            label="Level"
            options={levelOptions}
            value={selectedLevelId}
            onChange={e => {
              setSelectedLevelId(e.target.value);
              setCurrentPage(1);
            }}
            disabled={!selectedProgramId}
          />
          <Select
            label="Status"
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <div className="relative flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search subjects</label>
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by subject name or code..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Subjects</h3>
            <span className="ml-2 text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50 border-t border-slate-100">
            <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Loading subjects...</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50 border-t border-slate-100">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <BookOpen size={40} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No subjects found</h3>
            <p className="text-slate-500 max-w-sm mb-6">No subjects match the selected filters.</p>
          </div>
        ) : (
          <>
            <Table headers={['Subject', 'Code', 'Type', 'Status', 'Actions']}>
              {paginated.map(subject => (
                <tr key={subject.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{subject.name}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 uppercase">{subject.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">{subject.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${subject.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {subject.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/subjects/${subject.code}`)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Edit
                    </button>
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
