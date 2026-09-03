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
import { CourseCurriculumModal } from '../components/courses/CourseCurriculumModal';
import { BookOpen, Plus, Search, ArrowRight, Download, Upload, Loader2, RotateCcw, Eye } from 'lucide-react';

export const CourseSetup: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedCourseForModal, setSelectedCourseForModal] = useState<any | null>(null);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);

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

  const handleOpenCurriculumModal = (course: any) => {
    setSelectedCourseForModal(course);
    setIsCurriculumModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header matching Tenants */}
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

      {/* Filter and Search Bar matching Tenants */}
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

      {/* Card Table Container matching Tenants */}
      <Card>
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
            <Table headers={['Course Name', 'Code', 'Programs', 'Actions']} dense>
              {paginated.map(course => (
                <tr
                  key={course.code}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/courses/${course.code}`)}
                >
                  <td className="px-3 py-3 font-bold text-slate-900 text-sm whitespace-nowrap min-w-[200px]">
                    {course.name}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-blue-600 text-xs whitespace-nowrap uppercase">
                    {course.code}
                  </td>
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/courses/${course.code}/view`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200"
                        title="View Curriculum Overview"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        onClick={() => navigate(`/courses/${course.code}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        Manage <ArrowRight size={14} />
                      </button>
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
      </Card>

      {/* Curriculum Overview Split-Pane Modal */}
      <CourseCurriculumModal
        isOpen={isCurriculumModalOpen}
        onClose={() => setIsCurriculumModalOpen(false)}
        course={selectedCourseForModal}
      />

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
