import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, ArrowLeft, BookOpen, ClipboardList, CheckCircle2, Edit3, FileSpreadsheet, Download } from 'lucide-react';
import type { ExamItem } from '../data/mockData';

export interface AssignmentItem {
  title: string;
  batch: string;
  subject: string;
  dueDate: string;
  status: string;
  attachmentName?: string;
}

export const Assignments: React.FC = () => {
  const { batches, branches, courses, exams, setExams, currentUser, students } = useApp();
  
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<'assignments' | 'exams'>('assignments');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditingExam, setIsEditingExam] = useState(false);

  // ----------------------------------------------------
  // OPTIONS FOR SELECTORS
  // ----------------------------------------------------
  const uniqueBranches = currentUser?.role === 'branch-admin'
    ? [currentUser.branch || '']
    : branches.map(b => b.name);
  const uniqueCourses = (
    currentUser?.role === 'branch-admin'
      ? courses.filter(c => (c.branches || []).includes(currentUser.branch || ''))
      : courses
  ).map(c => c.name);
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[];
  const uniqueYears = Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[];

  // ----------------------------------------------------
  // HOMEWORK ASSIGNMENTS STATES & LOGIC
  // ----------------------------------------------------
  const [assignments, setAssignments] = useState<AssignmentItem[]>([
    { title: 'Electrophilic Addition Quiz Problems', batch: 'JEE-Morning-A1', subject: 'Chemistry', dueDate: '2026-07-25', status: 'Active' },
    { title: 'Rotational Dynamics Exercise sheet', batch: 'JEE-Evening-B1', subject: 'Physics', dueDate: '2026-07-28', status: 'Active' }
  ]);
  const [assignSearch, setAssignSearch] = useState('');
  const [showAddAssignModal, setShowAddAssignModal] = useState(false);
  const [assignCurrentPage, setAssignCurrentPage] = useState(1);
  
  // Creation state
  const [assignTitle, setAssignTitle] = useState('');
  const [assignBatch, setAssignBatch] = useState('');
  const [assignSubject, setAssignSubject] = useState('Chemistry');
  const [assignDueDate, setAssignDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);

  // List Filters
  const [assignFilterBranch, setAssignFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [assignFilterCourse, setAssignFilterCourse] = useState('All');
  const [assignFilterProgram, setAssignFilterProgram] = useState('All');
  const [assignFilterLevel, setAssignFilterLevel] = useState('All');
  const [assignFilterYear, setAssignFilterYear] = useState('All');
  const [assignFilterBatch, setAssignFilterBatch] = useState('All');

  // Filter available batches for the Assignments list filters dropdown
  const assignDropdownBatches = batches.filter(b => {
    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = assignFilterBranch === 'All' || batchBranch === assignFilterBranch;
    const matchCourse = assignFilterCourse === 'All' || b.course === assignFilterCourse;
    const matchProgram = assignFilterProgram === 'All' || b.program === assignFilterProgram;
    const matchLevel = assignFilterLevel === 'All' || b.level === assignFilterLevel;
    const matchYear = assignFilterYear === 'All' || b.academicYear === assignFilterYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  });

  // Keep batch list filter in sync
  useEffect(() => {
    if (assignFilterBatch !== 'All') {
      const exists = assignDropdownBatches.some(b => b.name === assignFilterBatch);
      if (!exists) setAssignFilterBatch('All');
    }
  }, [assignFilterBranch, assignFilterCourse, assignFilterProgram, assignFilterLevel, assignFilterYear]);

  // ----------------------------------------------------
  // CLASSROOM EVALUATION EXAMS STATES & LOGIC
  // ----------------------------------------------------
  const [examSearch, setExamSearch] = useState('');
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [examCurrentPage, setExamCurrentPage] = useState(1);

  // Creation state
  const [examName, setExamName] = useState('');
  const [examBatch, setExamBatch] = useState('');
  const [examTotalMarks, setExamTotalMarks] = useState(100);
  const [examPassingMarks, setExamPassingMarks] = useState(40);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);

  useEffect(() => {
    setIsEditingExam(selectedExam?.status !== 'Marks Published');
  }, [selectedExam]);

  // List Filters
  const [examFilterBranch, setExamFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [examFilterCourse, setExamFilterCourse] = useState('All');
  const [examFilterProgram, setExamFilterProgram] = useState('All');
  const [examFilterLevel, setExamFilterLevel] = useState('All');
  const [examFilterYear, setExamFilterYear] = useState('All');
  const [examFilterBatch, setExamFilterBatch] = useState('All');

  // Filter available batches for the Exams list filters dropdown
  const examDropdownBatches = batches.filter(b => {
    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = examFilterBranch === 'All' || batchBranch === examFilterBranch;
    const matchCourse = examFilterCourse === 'All' || b.course === examFilterCourse;
    const matchProgram = examFilterProgram === 'All' || b.program === examFilterProgram;
    const matchLevel = examFilterLevel === 'All' || b.level === examFilterLevel;
    const matchYear = examFilterYear === 'All' || b.academicYear === examFilterYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  });

  // Keep batch list filter in sync
  useEffect(() => {
    if (examFilterBatch !== 'All') {
      const exists = examDropdownBatches.some(b => b.name === examFilterBatch);
      if (!exists) setExamFilterBatch('All');
    }
  }, [examFilterBranch, examFilterCourse, examFilterProgram, examFilterLevel, examFilterYear]);

  // ----------------------------------------------------
  // HIERARCHICAL FILTERS FOR CREATION MODALS
  // ----------------------------------------------------
  const [selectedBranch, setSelectedBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

  const creationAvailableBatches = batches.filter(b => {
    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = selectedBranch === 'All' || batchBranch === selectedBranch;
    const matchCourse = selectedCourse === 'All' || b.course === selectedCourse;
    const matchProgram = selectedProgram === 'All' || b.program === selectedProgram;
    const matchLevel = selectedLevel === 'All' || b.level === selectedLevel;
    const matchYear = selectedYear === 'All' || b.academicYear === selectedYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  });

  // Keep target batch synchronized when filters update
  useEffect(() => {
    if (creationAvailableBatches.length > 0) {
      const isAssignStillAvailable = creationAvailableBatches.some(b => b.name === assignBatch);
      if (!isAssignStillAvailable) {
        setAssignBatch(creationAvailableBatches[0].name);
      }
      const isExamStillAvailable = creationAvailableBatches.some(b => b.name === examBatch);
      if (!isExamStillAvailable) {
        setExamBatch(creationAvailableBatches[0].name);
      }
    } else {
      setAssignBatch('');
      setExamBatch('');
    }
  }, [selectedBranch, selectedCourse, selectedProgram, selectedLevel, selectedYear]);

  const itemsPerPage = 5;

  // Filter and sort assignments list
  const filteredAndSortedAssignments = assignments
    .filter(a => {
      const matchSearch = a.title.toLowerCase().includes(assignSearch.toLowerCase());
      
      const matchedBatch = batches.find(b => b.name === a.batch);
      const batchBranch = matchedBatch?.branch || 'Mumbai West';
      
      const matchBranch = currentUser?.role === 'branch-admin'
        ? batchBranch === currentUser.branch
        : (assignFilterBranch === 'All' || batchBranch === assignFilterBranch);
      const matchCourse = assignFilterCourse === 'All' || matchedBatch?.course === assignFilterCourse;
      const matchProgram = assignFilterProgram === 'All' || matchedBatch?.program === assignFilterProgram;
      const matchLevel = assignFilterLevel === 'All' || matchedBatch?.level === assignFilterLevel;
      const matchYear = assignFilterYear === 'All' || matchedBatch?.academicYear === assignFilterYear;
      const matchBatch = assignFilterBatch === 'All' || a.batch === assignFilterBatch;
      
      return matchSearch && matchBranch && matchCourse && matchProgram && matchLevel && matchYear && matchBatch;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const assignTotalPages = Math.ceil(filteredAndSortedAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAndSortedAssignments.slice((assignCurrentPage - 1) * itemsPerPage, assignCurrentPage * itemsPerPage);

  // Filter and sort exams list
  const filteredAndSortedExams = exams
    .filter(e => {
      const matchSearch = e.name.toLowerCase().includes(examSearch.toLowerCase());
      
      const matchedBatch = batches.find(b => b.name === e.batch);
      const batchBranch = matchedBatch?.branch || 'Mumbai West';
      
      const matchBranch = currentUser?.role === 'branch-admin'
        ? batchBranch === currentUser.branch
        : (examFilterBranch === 'All' || batchBranch === examFilterBranch);
      const matchCourse = examFilterCourse === 'All' || matchedBatch?.course === examFilterCourse;
      const matchProgram = examFilterProgram === 'All' || matchedBatch?.program === examFilterProgram;
      const matchLevel = examFilterLevel === 'All' || matchedBatch?.level === examFilterLevel;
      const matchYear = examFilterYear === 'All' || matchedBatch?.academicYear === examFilterYear;
      const matchBatch = examFilterBatch === 'All' || e.batch === examFilterBatch;
      
      return matchSearch && matchBranch && matchCourse && matchProgram && matchLevel && matchYear && matchBatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const examTotalPages = Math.ceil(filteredAndSortedExams.length / itemsPerPage);
  const paginatedExams = filteredAndSortedExams.slice((examCurrentPage - 1) * itemsPerPage, examCurrentPage * itemsPerPage);

  const handleOpenAddAssignModal = () => {
    setSelectedBranch('All');
    setSelectedCourse('All');
    setSelectedProgram('All');
    setSelectedLevel('All');
    setSelectedYear('All');
    setAssignmentFile(null);
    setAssignTitle('');
    if (batches.length > 0) {
      setAssignBatch(batches[0].name);
    }
    setShowAddAssignModal(true);
  };

  const handleOpenAddExamModal = () => {
    setSelectedBranch('All');
    setSelectedCourse('All');
    setSelectedProgram('All');
    setSelectedLevel('All');
    setSelectedYear('All');
    setExamName('');
    setExamTotalMarks(100);
    setExamPassingMarks(40);
    if (batches.length > 0) {
      setExamBatch(batches[0].name);
    }
    setShowAddExamModal(true);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle || !assignBatch) return;
    setAssignments(prev => [...prev, {
      title: assignTitle,
      batch: assignBatch,
      subject: assignSubject,
      dueDate: assignDueDate,
      status: 'Active',
      attachmentName: assignmentFile?.name
    }]);
    setShowAddAssignModal(false);
    setSuccessMessage('New homework assignment published and assigned successfully!');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName || !examBatch) return;
    setExams(prev => [...prev, {
      id: `EXAM-${Math.floor(Math.random() * 1000)}`,
      type: 'Exam',
      subject: 'Subject',
      examDate: new Date().toISOString().split('T')[0],
      name: examName,
      batch: examBatch,
      totalMarks: examTotalMarks,
      passingMarks: examPassingMarks,
      average: 'TBD',
      status: 'Scheduled'
    } as any]);
    setShowAddExamModal(false);
    setSuccessMessage('New classroom evaluation test scheduled successfully!');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // ----------------------------------------------------
  // FULL SCREEN DETAILS VIEWS
  // ----------------------------------------------------
  if (selectedAssignment) {
    const matchedBatch = batches.find(b => b.name === selectedAssignment.batch);
    const branchVal = matchedBatch?.branch || 'Mumbai West';
    const courseVal = matchedBatch?.course || 'JEE Prep Course';
    const programVal = matchedBatch?.program || '2 Year';
    const levelVal = matchedBatch?.level || 'year1';
    const yearVal = matchedBatch?.academicYear || '2026-27';

    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedAssignment(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Assignment Details</h2>
            <p className="text-sm text-slate-500">View configuration, batch mapping, and attachments for this assignment.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignment Title</span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{selectedAssignment.title}</h3>
              </div>
              
              <hr className="border-slate-100" />
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Submission Deadline</span>
                  <span className="text-sm font-semibold text-slate-700 mt-1.5 block font-mono">{selectedAssignment.dueDate}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 mt-1.5">
                    {selectedAssignment.status}
                  </span>
                </div>
              </div>

              {selectedAssignment.attachmentName && (
                <>
                  <hr className="border-slate-100" />
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Attached Document</span>
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 mt-2 max-w-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <span className="text-xs font-semibold text-slate-700 font-mono block">{selectedAssignment.attachmentName}</span>
                          <span className="text-[10px] text-slate-400 block">Adobe PDF Document</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Downloading attached document: ${selectedAssignment.attachmentName}`);
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button onClick={() => setSelectedAssignment(null)} variant="secondary">Back to List</Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Target Batch Mapping</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Branch</span>
                  <span className="font-semibold text-slate-700">{branchVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Course</span>
                  <span className="font-semibold text-slate-700">{courseVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Program</span>
                  <span className="font-semibold text-slate-700">{programVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Level</span>
                  <span className="font-semibold text-slate-700">{levelVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Academic Year</span>
                  <span className="font-semibold text-slate-700 font-mono">{yearVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 pt-3">
                  <span className="text-slate-500 font-bold">Target Batch</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">{selectedAssignment.batch}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedExam) {
    const matchedBatch = batches.find(b => b.name === selectedExam.batch);
    const branchVal = matchedBatch?.branch || 'Mumbai West';
    const courseVal = matchedBatch?.course || 'JEE Prep Course';
    const programVal = matchedBatch?.program || '2 Year';
    const levelVal = matchedBatch?.level || 'year1';
    const yearVal = matchedBatch?.academicYear || '2026-27';

    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedExam(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Classroom Test Details</h2>
            <p className="text-sm text-slate-500">View configuration, batch mapping, and passing thresholds for this evaluation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Test Title</span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{selectedExam.name}</h3>
              </div>
              
              <hr className="border-slate-100" />
              
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
                  <span className="text-2xl font-bold text-slate-800 mt-2 block font-mono">{selectedExam.totalMarks}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Passing Threshold</span>
                  <span className="text-2xl font-bold text-slate-800 mt-2 block font-mono">{selectedExam.passingMarks}</span>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block">Class Average</span>
                  <span className="text-2xl font-bold text-blue-600 mt-2 block font-mono">{selectedExam.average}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold mt-1.5 ${
                    selectedExam.status === 'Scheduled' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    {selectedExam.status}
                  </span>
                </div>
                <Button onClick={() => setSelectedExam(null)} variant="secondary">Back to List</Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Target Batch Mapping</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Branch</span>
                  <span className="font-semibold text-slate-700">{branchVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Course</span>
                  <span className="font-semibold text-slate-700">{courseVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Program</span>
                  <span className="font-semibold text-slate-700">{programVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Level</span>
                  <span className="font-semibold text-slate-700">{levelVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Academic Year</span>
                  <span className="font-semibold text-slate-700 font-mono">{yearVal}</span>
                </div>
                <div className="flex justify-between items-center py-2 pt-3">
                  <span className="text-slate-500 font-bold">Target Batch</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">{selectedExam.batch}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADD MODAL SCREEN RENDERERS
  // ----------------------------------------------------
  if (showAddAssignModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddAssignModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Create Homework Assignment</h2>
            <p className="text-sm text-slate-500">Publish coursework or quiz tasks for active student batches.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleAssignSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <Input label="Assignment Title" required placeholder="e.g. Electrophilic Addition Quiz Problems" value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Select 
                label="Branch" 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)} 
                options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
                disabled={currentUser?.role === 'branch-admin'}
              />
              <Select 
                label="Course" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)} 
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select 
                label="Program" 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)} 
                options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
              />
              <Select 
                label="Level" 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)} 
                options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
              />
              <Select 
                label="Academic Year" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)} 
                options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
              />
              <Select 
                label="Allocate to Batch" 
                required
                value={assignBatch} 
                onChange={(e) => setAssignBatch(e.target.value)} 
                options={creationAvailableBatches.map(b => ({ value: b.name, label: b.name }))}
                disabled={creationAvailableBatches.length === 0}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select 
                label="Subject Area" 
                value={assignSubject} 
                onChange={(e) => setAssignSubject(e.target.value)} 
                options={[
                  { value: 'Chemistry', label: 'Chemistry' },
                  { value: 'Physics', label: 'Physics' },
                  { value: 'Mathematics', label: 'Mathematics' },
                  { value: 'Biology', label: 'Biology' }
                ]}
              />
              <Input label="Submission Deadline" type="date" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block font-display">Assignment Details Document (PDF)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm font-semibold transition-all">
                  <span>Choose PDF File</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAssignmentFile(file);
                    }}
                  />
                </label>
                {assignmentFile ? (
                  <span className="text-xs text-emerald-655 font-medium font-mono">
                    ✓ {assignmentFile.name}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No file chosen</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddAssignModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!assignBatch}>Publish Assignment</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showAddExamModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddExamModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Schedule Classroom Test</h2>
            <p className="text-sm text-slate-500">Define offline evaluation tests, assign target batches, and record scores.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleExamSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <Input label="Test Name Title" required placeholder="e.g. Periodic Chemistry Evaluation Test #4" value={examName} onChange={(e) => setExamName(e.target.value)} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Select 
                label="Branch" 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)} 
                options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
                disabled={currentUser?.role === 'branch-admin'}
              />
              <Select 
                label="Course" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)} 
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select 
                label="Program" 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)} 
                options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
              />
              <Select 
                label="Level" 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)} 
                options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
              />
              <Select 
                label="Academic Year" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)} 
                options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
              />
              <Select 
                label="Allocate Target Batch" 
                required
                value={examBatch} 
                onChange={(e) => setExamBatch(e.target.value)} 
                options={creationAvailableBatches.map(b => ({ value: b.name, label: b.name }))}
                disabled={creationAvailableBatches.length === 0}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Total Score Marks" type="number" value={examTotalMarks} onChange={(e) => setExamTotalMarks(Number(e.target.value))} />
              <Input label="Passing Threshold" type="number" value={examPassingMarks} onChange={(e) => setExamPassingMarks(Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddExamModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!examBatch}>Schedule Test</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Assignment and Exams</h2>
          <p className="text-sm text-slate-500 mt-1">Manage all batch homework assignments, evaluative classroom tests, and study files.</p>
        </div>
        
        {activeTab === 'assignments' ? (
          <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddAssignModal}>
            <Plus size={16} /> Create Assignment
          </Button>
        ) : (
          <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddExamModal}>
            <Plus size={16} /> Schedule Test
          </Button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen size={16} />
          Homework Assignments
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'exams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList size={16} />
          Classroom Evaluations
        </button>
      </div>

      {activeTab === 'assignments' ? (
        <>
          {/* ASSIGNMENTS LIST VIEW - HIERARCHICAL FILTERS */}
          <div className="space-y-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm animate-fade-in">
            <Input label="Search" placeholder="Search assignments by name..." 
              value={assignSearch} 
              onChange={(e) => setAssignSearch(e.target.value)} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <Select 
                label="Branch" 
                value={assignFilterBranch} 
                onChange={(e) => setAssignFilterBranch(e.target.value)} 
                options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
                disabled={currentUser?.role === 'branch-admin'}
              />
              <Select 
                label="Course" 
                value={assignFilterCourse} 
                onChange={(e) => setAssignFilterCourse(e.target.value)} 
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select 
                label="Program" 
                value={assignFilterProgram} 
                onChange={(e) => setAssignFilterProgram(e.target.value)} 
                options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
              />
              <Select 
                label="Level" 
                value={assignFilterLevel} 
                onChange={(e) => setAssignFilterLevel(e.target.value)} 
                options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
              />
              <Select 
                label="Academic Year" 
                value={assignFilterYear} 
                onChange={(e) => setAssignFilterYear(e.target.value)} 
                options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
              />
              <Select 
                label="Target Batch" 
                value={assignFilterBatch} 
                onChange={(e) => setAssignFilterBatch(e.target.value)} 
                options={[{ value: 'All', label: 'All Batches' }, ...assignDropdownBatches.map(b => ({ value: b.name, label: b.name }))]}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Homeworks &amp; Worksheets</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => {
                const headers = ['Assignment Title', 'Allotted Batch', 'Subject Name', 'Due Deadline', 'Status'];
                const rows = filteredAndSortedAssignments.map(a => [
                  a.title, a.batch, a.subject, a.dueDate, a.status
                ]);
                const csvContent = "data:text/csv;charset=utf-8,"
                  + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
                const link = document.createElement('a');
                link.setAttribute('href', encodeURI(csvContent));
                link.setAttribute('download', 'homeworks_worksheets.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            </CardHeader>
            <Table headers={['Assignment Title', 'Allotted Batch', 'Subject Name', 'Due Deadline', 'Status']}>
              {paginatedAssignments.map((a, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedAssignment(a)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{a.title}</div>
                    {a.attachmentName && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold font-mono">
                        📄 {a.attachmentName}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{a.batch}</td>
                  <td className="px-6 py-4">{a.subject}</td>
                  <td className="px-6 py-4 font-mono text-xs">{a.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={assignCurrentPage}
              totalPages={assignTotalPages}
              totalItems={filteredAndSortedAssignments.length}
              pageSize={itemsPerPage}
              onPageChange={setAssignCurrentPage}
            />
          </Card>
        </>
      ) : (
        <>
          {/* EVALUATIONS LIST VIEW - HIERARCHICAL FILTERS */}
          <div className="space-y-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm animate-fade-in">
            <Input label="Search" placeholder="Search exams by name..." 
              value={examSearch} 
              onChange={(e) => setExamSearch(e.target.value)} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
              <Select 
                label="Branch" 
                value={examFilterBranch} 
                onChange={(e) => setExamFilterBranch(e.target.value)} 
                options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
                disabled={currentUser?.role === 'branch-admin'}
              />
              <Select 
                label="Course" 
                value={examFilterCourse} 
                onChange={(e) => setExamFilterCourse(e.target.value)} 
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select 
                label="Program" 
                value={examFilterProgram} 
                onChange={(e) => setExamFilterProgram(e.target.value)} 
                options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
              />
              <Select 
                label="Level" 
                value={examFilterLevel} 
                onChange={(e) => setExamFilterLevel(e.target.value)} 
                options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
              />
              <Select 
                label="Academic Year" 
                value={examFilterYear} 
                onChange={(e) => setExamFilterYear(e.target.value)} 
                options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
              />
              <Select 
                label="Target Batch" 
                value={examFilterBatch} 
                onChange={(e) => setExamFilterBatch(e.target.value)} 
                options={[{ value: 'All', label: 'All Batches' }, ...examDropdownBatches.map(b => ({ value: b.name, label: b.name }))]}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Examinations &amp; Quizzes</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => {
                const headers = ['Test Name', 'Batch', 'Total Marks', 'Passing Threshold', 'Class Average', 'Status'];
                const rows = filteredAndSortedExams.map(e => [
                  e.name, e.batch, `${e.totalMarks} Marks`, `${e.passingMarks} Marks`, e.average, e.status
                ]);
                const csvContent = "data:text/csv;charset=utf-8,"
                  + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
                const link = document.createElement('a');
                link.setAttribute('href', encodeURI(csvContent));
                link.setAttribute('download', 'scheduled_examinations.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            </CardHeader>
            <Table headers={['Test Name', 'Batch', 'Total Marks', 'Passing Threshold', 'Class average', 'Status']}>
              {paginatedExams.map((e, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedExam(e)}
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
              ))}
            </Table>
            <Pagination
              currentPage={examCurrentPage}
              totalPages={examTotalPages}
              totalItems={filteredAndSortedExams.length}
              pageSize={itemsPerPage}
              onPageChange={setExamCurrentPage}
            />
          </Card>
        </>
      )}
    </div>
  );
};
