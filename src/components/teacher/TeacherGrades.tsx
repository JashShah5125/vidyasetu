import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Table } from '../ui/Table';
import { Pagination } from '../ui/Pagination';
import { Award, Search, FileSpreadsheet, CheckCircle2, ArrowLeft, Edit3 } from 'lucide-react';
import { TEACHER_ASSIGNED_BATCHES } from '../../data/mockData';
import teachersList from '../../data/teachers.json';
import courseHierarchy from '../../data/courseHierarchy.json';

export const TeacherGrades: React.FC = () => {
  const { exams, students, batches, branches, courses, currentUser, addToast } = useApp();
  const [selectedExamName, setSelectedExamName] = useState<string | null>(null);

  // Find logged-in teacher from teachers.json
  const currentTeacher = useMemo(() => {
    return teachersList.find(t =>
      t.id === currentUser?.id ||
      t.name === currentUser?.name ||
      (currentUser?.email && t.name.toLowerCase().includes(currentUser.email.split('@')[0]))
    ) || teachersList.find(t => t.id === 'EMP-002') || teachersList[0];
  }, [currentUser]);

  const teacherAssignedBatches = useMemo(() => {
    if (currentTeacher?.batches && currentTeacher.batches.length > 0) {
      return currentTeacher.batches;
    }
    return TEACHER_ASSIGNED_BATCHES;
  }, [currentTeacher]);
  
  // Extract unique filter options
  const uniqueBranches = useMemo(() => currentUser?.role === 'branch-admin'
    ? [currentUser.branch || '']
    : branches.map(b => b.name), [currentUser, branches]);
  const uniqueCourses = useMemo(() => courseHierarchy.map(c => c.courseName), []);
  const uniquePrograms = useMemo(() => Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[], [batches]);
  const uniqueLevels = useMemo(() => Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[], [batches]);
  const uniqueYears = useMemo(() => Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[], [batches]);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  
  // Filter exams to only those belonging to the teacher's assigned batches
  const assignedExams = useMemo(() => exams.filter(e => teacherAssignedBatches.includes(e.batch)), [exams, teacherAssignedBatches]);
  
  const selectedExam = assignedExams.find(e => e.name === selectedExamName);

  useEffect(() => {
    setIsEditing(selectedExam?.status !== 'Marks Published');
  }, [selectedExam]);

  // Filter available batches for the dropdown
  const dropdownBatches = useMemo(() => batches.filter(b => {
    // We only want batches that the teacher is assigned to
    if (!teacherAssignedBatches.includes(b.name)) return false;

    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = filterBranch === 'All' || batchBranch === filterBranch || (branches.find(br => br.code === filterBranch)?.name === batchBranch);
    const matchCourse = filterCourse === 'All' || b.course === filterCourse;
    const matchProgram = filterProgram === 'All' || b.program === filterProgram;
    const matchLevel = filterLevel === 'All' || b.level === filterLevel;
    const matchYear = filterYear === 'All' || b.academicYear === filterYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  }), [batches, teacherAssignedBatches, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, branches]);

  // Keep batch list filter in sync
  useEffect(() => {
    if (filterBatch !== 'All') {
      const exists = dropdownBatches.some(b => b.name === filterBatch);
      if (!exists) setFilterBatch('All');
    }
  }, [filterBranch, filterCourse, filterProgram, filterLevel, filterYear]);

  // Filters logic for list
  const filteredExams = assignedExams.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchedBatch = batches.find(b => b.name === e.batch);
    const batchBranch = matchedBatch?.branch || 'Mumbai West';
    
    const matchBranch = filterBranch === 'All' || batchBranch === filterBranch;
    const matchCourse = filterCourse === 'All' || matchedBatch?.course === filterCourse;
    const matchProgram = filterProgram === 'All' || matchedBatch?.program === filterProgram;
    const matchLevel = filterLevel === 'All' || matchedBatch?.level === filterLevel;
    const matchYear = filterYear === 'All' || matchedBatch?.academicYear === filterYear;
    const matchBatch = filterBatch === 'All' || e.batch === filterBatch;

    return matchSearch && matchBranch && matchCourse && matchProgram && matchLevel && matchYear && matchBatch;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const paginatedExams = filteredExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, filterBatch]);

  if (selectedExam) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedExamName(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Classroom Test Details</h2>
            <p className="text-sm text-slate-500">View configuration, batch mapping, and record scores.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedExam.name}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Batch: {selectedExam.batch} • Total Marks: {selectedExam.totalMarks} • Passing: {selectedExam.passingMarks}
                </p>
              </div>
              {selectedExam.status === 'Marks Published' && (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <CheckCircle2 size={16} /> Published
                  </span>
                  {!isEditing && (
                    <Button variant="secondary" className="flex items-center gap-2" onClick={() => setIsEditing(true)}>
                      <Edit3 size={16} /> Edit Marks
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4 text-center">Marks Obtained</th>
                    <th className="px-6 py-4 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.filter(s => s.batch === selectedExam.batch).map(student => {
                    const marks = selectedExam.studentMarks?.[student.studentId];
                    const hasMarks = marks !== undefined;
                    const isPassing = hasMarks && marks >= selectedExam.passingMarks;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-600">{student.studentId}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                        <td className="px-6 py-4 text-center">
                          {!isEditing ? (
                            <span className="font-bold text-slate-700">{hasMarks ? marks : '-'}</span>
                          ) : (
                            <input 
                              type="number" 
                              defaultValue={marks}
                              max={selectedExam.totalMarks}
                              className="w-20 text-center border border-slate-300 rounded-md py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasMarks ? (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${isPassing ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isPassing ? 'PASS' : 'FAIL'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {isEditing && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                {selectedExam.status === 'Marks Published' && (
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                )}
                <Button variant="primary" className="flex items-center gap-2" onClick={() => {
                  addToast('Marks saved successfully!', 'success');
                  setIsEditing(false);
                }}>
                  <FileSpreadsheet size={16} /> Save Marks
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Grades & Marks Entry</h2>
        <p className="text-sm text-slate-500 mt-1">Enter marks for assigned exams and review student performance.</p>
      </div>

      {/* EVALUATIONS LIST VIEW - FILTERS */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
          <Input label="Search" placeholder="Search exams..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <Select 
            label="Branch" 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)} 
            options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
            disabled={currentUser?.role === 'branch-admin'}
          />
          <Select 
            label="Course" 
            value={filterCourse} 
            onChange={(e) => setFilterCourse(e.target.value)} 
            options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
          />
          <Select 
            label="Program" 
            value={filterProgram} 
            onChange={(e) => setFilterProgram(e.target.value)} 
            options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
          />
          <Select 
            label="Level" 
            value={filterLevel} 
            onChange={(e) => setFilterLevel(e.target.value)} 
            options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
          />
          <Select 
            label="Academic Year" 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)} 
            options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
          />
          <Select 
            label="Target Batch" 
            value={filterBatch} 
            onChange={(e) => setFilterBatch(e.target.value)} 
            options={[{ value: 'All', label: 'All Batches' }, ...dropdownBatches.map(b => ({ value: b.name, label: b.name }))]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <CardTitle>Scheduled Examinations & Quizzes</CardTitle>
          </div>
        </CardHeader>
        <Table headers={['Test Name', 'Batch', 'Total Marks', 'Passing Threshold', 'Class Average', 'Status']}>
          {paginatedExams.length > 0 ? (
            paginatedExams.map((e, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedExamName(e.name)}
              >
                <td className="px-6 py-4 font-semibold text-slate-800">{e.name}</td>
                <td className="px-6 py-4">{e.batch}</td>
                <td className="px-6 py-4 font-mono text-xs">{e.totalMarks} Marks</td>
                <td className="px-6 py-4 font-mono text-xs">{e.passingMarks} Marks</td>
                <td className="px-6 py-4 font-mono text-xs text-blue-600 font-semibold">{e.average}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                    e.status === 'Marks Published' ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Award size={48} className="mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-bold text-slate-800">No exams found</h3>
                <p className="text-slate-500 text-sm mt-1">Adjust your filters or wait for new assignments.</p>
              </td>
            </tr>
          )}
        </Table>
        {filteredExams.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredExams.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
};
