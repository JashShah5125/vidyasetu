import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { BookOpen, Plus, Search, ArrowRight, Download } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';

export const CourseSetup: React.FC = () => {
  const { courses } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return courses.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [courses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map(c => ({
      'Course Name': c.name,
      'Code': c.code,
      'Duration': c.duration,
      'Programs': (c.programs || []).join('; ')
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'courses.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Course Management</h2>
          <p className="text-sm text-slate-500 mt-1">Configure academic catalog — courses, programs, and levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/courses/new')}
            style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
          >
            <Plus size={16} className="mr-2" /> Add New Course
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="relative flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search</label>
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by course name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <BookOpen size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800">All Courses</h3>
          <span className="ml-auto text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No courses match your filters.</p>
          </div>
        ) : (
          <>
            <Table headers={['Course', 'Code', 'Programs', 'Actions']}>
              {paginated.map(course => (
                <tr key={course.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{course.name}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 uppercase">{course.code}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(course.programs || []).map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-semibold">
                          {p}
                        </span>
                      ))}
                      {(!course.programs || course.programs.length === 0) && (
                        <span className="text-xs text-slate-400 italic">No programs</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/courses/${course.code}`)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Manage <ArrowRight size={14} />
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
