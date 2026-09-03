import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { courseApi } from '../services/courseApi';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import {
  BookOpen, Plus, ArrowRight, Download, Upload, Loader2, RotateCcw, Eye, EyeOff, GraduationCap, Layers, BookOpenCheck, ChevronRight, ChevronUp, Clock, Settings
} from 'lucide-react';

export const CourseSetup: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  // Accordion Expansion State with Smooth Opening and Closing Transitions
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);
  const [activeCourseCode, setActiveCourseCode] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const [inspectorCourse, setInspectorCourse] = useState<any | null>(null);
  const [isInspectorLoading, setIsInspectorLoading] = useState(false);
  const [selectedProgramIdx, setSelectedProgramIdx] = useState<number | null>(null);
  const [selectedLevelIdx, setSelectedLevelIdx] = useState<number | null>(null);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const res = await courseApi.list({ status: filterStatus });
      if (res?.status === 'success') {
        setCourses(res.data || []);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch courses', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [filterStatus]);

  // Fetch complete course details when a row is expanded below
  useEffect(() => {
    if (selectedCourseCode) {
      fetchInspectorCourseDetails(selectedCourseCode);
    } else {
      setInspectorCourse(null);
      setSelectedProgramIdx(null);
      setSelectedLevelIdx(null);
    }
  }, [selectedCourseCode]);

  const fetchInspectorCourseDetails = async (code: string) => {
    try {
      setIsInspectorLoading(true);
      const res = await courseApi.getByCode(code);
      if (res?.status === 'success' && res.data) {
        setInspectorCourse(res.data);
        setSelectedProgramIdx(null);
        setSelectedLevelIdx(null);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch course details', 'error');
    } finally {
      setIsInspectorLoading(false);
    }
  };

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = courses.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [courses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleClearFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map(c => ({
      'Course Name': c.name,
      'Code': c.code,
      'Duration': c.duration,
      'Programs': (c.programs || []).map((p: any) => p.name || p).join('; ')
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'courses.csv';
    a.click();
  };

  const handleRowClick = (courseCode: string) => {
    if (selectedCourseCode === courseCode && !isClosing) {
      handleClose();
    } else {
      setIsClosing(false);
      setSelectedCourseCode(courseCode);
      setActiveCourseCode(courseCode);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedCourseCode(null);
      setActiveCourseCode(null);
      setIsClosing(false);
    }, 240);
  };

  const programs = inspectorCourse?.programs || [];
  const activeProgram = selectedProgramIdx !== null ? programs[selectedProgramIdx] : null;
  const levels = activeProgram?.levels || [];
  const activeLevel = selectedLevelIdx !== null ? levels[selectedLevelIdx] : null;
  const subjects = activeLevel?.subjects || [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen size={32} className="text-indigo-600" />
            Academic Courses Directory
          </h2>
          <p className="text-base text-slate-500 mt-2">
            Configure academic catalog — courses, programs, subject levels, and branch assignments.
          </p>
        </div>

        {currentUser?.role !== 'branch-admin' && (
          <Button
            variant="primary"
            onClick={() => navigate('/courses/new')}
            className="px-5 py-2.5 text-sm shadow-sm gap-2"
          >
            <Plus size={18} /> Create Course
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full items-end">
          <Input
            label="Search"
            placeholder="Search by course name or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            wrapperClassName="sm:col-span-3"
          />

          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
            <RotateCcw size={14} /> Clear
          </Button>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 font-semibold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Table Container */}
      <Card className="shadow-sm border border-slate-200 overflow-hidden">
        <CardHeader>
          <CardTitle>Academic Courses Directory</CardTitle>
        </CardHeader>

        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <Loader2 size={36} className="text-blue-500 animate-spin mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Loading courses directory...</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <div className="bg-blue-50 p-4 rounded-full mb-3">
              <BookOpen size={36} className="text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No courses found</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-5">Get started by creating your first course, or adjust your filters.</p>
            <Button
              variant="primary"
              onClick={() => navigate('/courses/new')}
              className="px-4 py-2 text-sm font-bold"
            >
              <Plus size={16} className="mr-1.5" /> Create Course
            </Button>
          </div>
        ) : (
          <>
            <Table headers={['Course Name', 'Code', 'Programs', 'Status', 'Actions']} dense>
              {paginated.map(course => {
                const isSelected = selectedCourseCode === course.code;
                const isVisible = activeCourseCode === course.code;
                return (
                  <React.Fragment key={course.code}>
                    {/* Main Course Row */}
                    <tr
                      onClick={() => handleRowClick(course.code)}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected && !isClosing
                          ? 'bg-indigo-50/60 font-semibold text-indigo-950 border-b-0'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-3.5 font-bold text-slate-900 text-sm whitespace-nowrap min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {course.name}
                          {isSelected && !isClosing && <ChevronUp size={16} className="text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-mono font-bold text-blue-600 text-xs whitespace-nowrap uppercase">
                        {course.code}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(course.programs || []).map((p: any, i: number) => (
                            <span key={i} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold uppercase">
                              {p.name || p}
                            </span>
                          ))}
                          {(!course.programs || course.programs.length === 0) && (
                            <span className="text-xs text-slate-400 italic">No programs</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {course.is_active !== false ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          {isSelected && !isClosing ? (
                            <button
                              onClick={() => handleClose()}
                              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer px-3.5 py-1.5 rounded-xl shadow-xs"
                            >
                              <EyeOff size={14} /> Hide Details
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRowClick(course.code)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl border border-indigo-200"
                            >
                              <Eye size={14} /> View
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/courses/${course.code}`)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          >
                            Manage <ArrowRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Smooth Opening & Closing Accordion Panel DIRECTLY BELOW the Selected Course */}
                    {isVisible && (
                      <tr className="bg-[rgb(248,249,255)]">
                        <td colSpan={5} className="p-0">
                          <div className={`border-t border-b border-indigo-200/90 bg-[rgb(248,249,255)] p-4 shadow-2xs ${
                            isClosing ? 'animate-accordion-up' : 'animate-accordion-down'
                          }`}>
                            
                            {/* Inner Header Card */}
                            <div className="flex justify-between items-center bg-blue-50/40 p-3 rounded-2xl border border-blue-100/70 mb-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                                  <BookOpen size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-base">
                                      {inspectorCourse?.name || course.name}
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-md text-xs font-mono font-semibold uppercase">
                                      {course.code}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                                    Manage programs, levels, and subjects for this course.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => navigate(`/courses/${course.code}`)}
                                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <Settings size={14} /> Manage Setup
                                </button>
                                <button
                                  onClick={() => handleClose()}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                  title="Hide Details"
                                >
                                  <ChevronUp size={18} />
                                </button>
                              </div>
                            </div>

                            {/* 3 Columns Split Pane Grid with Division Lines */}
                            {isInspectorLoading ? (
                              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                                <Loader2 size={36} className="text-indigo-600 animate-spin" />
                                <span className="text-sm font-bold text-slate-600">Loading curriculum details...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200/90 gap-4 md:gap-0 items-start">
                                
                                {/* ── COLUMN 1: PROGRAMS ── */}
                                <div className="space-y-2.5 md:pr-4">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <GraduationCap size={16} className="text-indigo-600" />
                                    PROGRAMS ({programs.length})
                                  </div>

                                  <div className="space-y-2">
                                    {programs.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200">
                                        No programs defined.
                                      </div>
                                    ) : (
                                      programs.map((program: any, pIdx: number) => {
                                        const isActive = selectedProgramIdx === pIdx;
                                        return (
                                          <div
                                            key={program.id || pIdx}
                                            onClick={() => {
                                              setSelectedProgramIdx(pIdx);
                                              setSelectedLevelIdx(null);
                                            }}
                                            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer border ${
                                              isActive
                                                ? 'bg-indigo-600 text-white shadow-md border-indigo-600 font-semibold'
                                                : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 shadow-2xs'
                                            }`}
                                          >
                                            <div>
                                              <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                {program.name || `Program #${pIdx + 1}`}
                                              </div>
                                              {program.code && (
                                                <div className={`text-xs font-mono font-semibold mt-0.5 ${isActive ? 'text-indigo-200' : 'text-blue-600'}`}>
                                                  {program.code}
                                                </div>
                                              )}
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0 ${
                                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                              {program.levels?.length || 0} Lvl <ChevronRight size={14} />
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>

                                {/* ── COLUMN 2: LEVELS ── */}
                                <div className="space-y-2.5 md:px-4">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <Layers size={16} className="text-blue-600" />
                                    LEVELS {activeProgram ? `(${levels.length})` : ''}
                                  </div>

                                  <div className="space-y-2">
                                    {!activeProgram ? (
                                      <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200/80 min-h-[140px]">
                                        <GraduationCap size={28} className="text-slate-300 mb-1" />
                                        <span className="text-xs font-bold text-slate-600">Select a Program</span>
                                        <span className="text-[11px] text-slate-400">Click a program in Col 1 to view its levels</span>
                                      </div>
                                    ) : levels.length === 0 ? (
                                      <div className="p-6 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200">
                                        No academic levels added.
                                      </div>
                                    ) : (
                                      levels.map((level: any, lIdx: number) => {
                                        const isActive = selectedLevelIdx === lIdx;
                                        return (
                                          <div
                                            key={level.id || lIdx}
                                            onClick={() => setSelectedLevelIdx(lIdx)}
                                            className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer border ${
                                              isActive
                                                ? 'bg-blue-600 text-white shadow-md border-blue-600 font-semibold'
                                                : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 shadow-2xs'
                                            }`}
                                          >
                                            <div>
                                              <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                {level.name || `Level #${lIdx + 1}`}
                                              </div>
                                              {level.duration && (
                                                <div className={`text-xs flex items-center gap-1 mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                                  <Clock size={12} /> {level.duration}
                                                </div>
                                              )}
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0 ${
                                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                              {level.subjects?.length || 0} Subjects <ChevronRight size={14} />
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>

                                {/* ── COLUMN 3: SUBJECTS ── */}
                                <div className="space-y-2.5 md:pl-4">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <BookOpenCheck size={16} className="text-emerald-600" />
                                    SUBJECTS {activeLevel ? `(${subjects.length})` : ''}
                                  </div>

                                  <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
                                    {!activeLevel ? (
                                      <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-slate-400 bg-white rounded-xl min-h-[140px]">
                                        <Layers size={28} className="text-slate-300 mb-1" />
                                        <span className="text-xs font-bold text-slate-600">Select a Level</span>
                                        <span className="text-[11px] text-slate-400">Click a level in Col 2 to view mapped subjects</span>
                                      </div>
                                    ) : subjects.length === 0 ? (
                                      <div className="p-4 text-center text-xs text-slate-400 italic">
                                        No subjects mapped to {activeLevel.name}
                                      </div>
                                    ) : (
                                      subjects.map((subject: any, sIdx: number) => (
                                        <div
                                          key={subject.id || sIdx}
                                          className="p-2.5 px-3 flex items-center gap-3 hover:bg-slate-50/80 transition"
                                        >
                                          <BookOpen size={16} className="text-slate-400 shrink-0" />
                                          <span className="font-bold text-slate-800 text-sm">
                                            {subject.name}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
      </Card>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Courses"
        description="Select a CSV spreadsheet to import multiple academic courses at once. Columns must match the template below exactly."
        sampleHeaders={['Name', 'Code', 'Description']}
        sampleRows={[
          ['NEET Foundation', 'NEET-FOUND', 'NEET Pre-foundation for class X'],
          ['JEE Advanced Crash', 'JEE-CRASH', 'JEE Advanced crash practice program']
        ]}
        onImport={(importedRows) => {
          const newCourses = importedRows.map((row, rIdx) => {
            return {
              id: `CRS-${Math.floor(10000 + Math.random() * 90000)}-${rIdx}`,
              name: row['Name'] || 'Imported Course',
              code: row['Code'] || `C-${Math.floor(100 + Math.random() * 900)}`,
              description: row['Description'] || '',
              branches: [],
              programs: []
            };
          });
          setCourses(prev => [...newCourses, ...prev]);
        }}
      />
    </div>
  );
};
