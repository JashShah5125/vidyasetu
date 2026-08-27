import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { Check, ClipboardList, PenTool, Plus, ArrowLeft, Upload } from 'lucide-react';
import type { ExamItem } from '../data/mockData';
import { BulkImportModal } from '../components/ui/BulkImportModal';

export const ExamMarks: React.FC = () => {
  const { branches, courses, batches, students, exams, setExams, currentUser, addToast } = useApp();

  // Active sub-tab: 'registry' (Test Registry) or 'grade' (Grade Students score card entry)
  const [activeTab, setActiveTab] = useState<'registry' | 'grade'>('registry');

  // Registry List state
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryFilterBatch, setRegistryFilterBatch] = useState('All');
  const [registrySortBy, setRegistrySortBy] = useState('name');
  const [registryPage, setRegistryPage] = useState(1);
  const itemsPerPage = 5;

  // Grade Screen selection state
  const [selectedBranch, setSelectedBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedExamName, setSelectedExamName] = useState('');

  // Local student marks state for editing
  const [localMarks, setLocalMarks] = useState<{ [studentId: string]: string }>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Scheduling test direct drawer/modal inside this module
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examBatch, setExamBatch] = useState('');
  const [examTotalMarks, setExamTotalMarks] = useState(100);
  const [examPassingMarks, setExamPassingMarks] = useState(40);

  // Extract filter options
  const uniqueBranches = currentUser?.role === 'branch-admin'
    ? [currentUser.branch || '']
    : branches.map(b => b.name);
  const uniqueCourses = courses.map(c => c.name);
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[];
  const uniqueYears = Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[];
  const uniqueExamBatches = useMemo(() => {
    const list = exams.map(e => e.batch);
    const filtered = list.filter(batchName => {
      const batchObj = batches.find(b => b.name === batchName);
      return currentUser?.role === 'branch-admin' ? batchObj?.branch === currentUser.branch : true;
    });
    return Array.from(new Set(filtered));
  }, [exams, batches, currentUser]);

  // Filter batches by selected hierarchy
  const availableBatches = batches.filter(b => {
    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = selectedBranch === 'All' || batchBranch === selectedBranch;
    const matchCourse = selectedCourse === 'All' || b.course === selectedCourse;
    const matchProgram = selectedProgram === 'All' || b.program === selectedProgram;
    const matchLevel = selectedLevel === 'All' || b.level === selectedLevel;
    const matchYear = selectedYear === 'All' || b.academicYear === selectedYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  });

  // Filter exams by selected batch
  const availableExams = exams.filter(e => e.batch === selectedBatch);

  // Filter students by selected batch
  const targetStudents = students.filter(s => s.batch === selectedBatch);

  // Synchronize batch when filters update
  useEffect(() => {
    if (availableBatches.length > 0) {
      const isBatchAvailable = availableBatches.some(b => b.name === selectedBatch);
      if (!isBatchAvailable) {
        setSelectedBatch(availableBatches[0].name);
      }
    } else {
      setSelectedBatch('');
    }
    setIsSaved(false);
  }, [selectedBranch, selectedCourse, selectedProgram, selectedLevel, selectedYear]);

  // Synchronize exams when batch updates
  useEffect(() => {
    if (availableExams.length > 0) {
      setSelectedExamName(availableExams[0].name);
    } else {
      setSelectedExamName('');
    }
    setIsSaved(false);
  }, [selectedBatch]);

  // Load existing marks when exam updates
  useEffect(() => {
    const currentExam = exams.find(e => e.name === selectedExamName && e.batch === selectedBatch);
    if (currentExam && currentExam.studentMarks) {
      const formatted: { [studentId: string]: string } = {};
      Object.keys(currentExam.studentMarks).forEach(sid => {
        formatted[sid] = String(currentExam.studentMarks?.[sid] ?? '');
      });
      setLocalMarks(formatted);
    } else {
      const defaults: { [studentId: string]: string } = {};
      targetStudents.forEach(s => {
        defaults[s.studentId] = '';
      });
      setLocalMarks(defaults);
    }
    setIsSaved(false);
  }, [selectedExamName, selectedBatch]);

  const activeExam = exams.find(e => e.name === selectedExamName && e.batch === selectedBatch);

  const handleMarkChange = (studentId: string, value: string) => {
    setIsSaved(false);
    if (activeExam && value !== '') {
      const num = Number(value);
      if (num > activeExam.totalMarks) {
        setLocalMarks(prev => ({ ...prev, [studentId]: String(activeExam.totalMarks) }));
        return;
      }
      if (num < 0) {
        setLocalMarks(prev => ({ ...prev, [studentId]: '0' }));
        return;
      }
    }
    setLocalMarks(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSaveMarks = () => {
    if (!activeExam) return;

    const marksToSave: { [studentId: string]: number } = {};
    let totalScoreSum = 0;
    let countedStudents = 0;

    targetStudents.forEach(s => {
      const val = localMarks[s.studentId];
      if (val !== '' && val !== undefined) {
        const score = Number(val);
        marksToSave[s.studentId] = score;
        totalScoreSum += score;
        countedStudents++;
      }
    });

    const classAverageStr = countedStudents > 0 
      ? `${((totalScoreSum / (countedStudents * activeExam.totalMarks)) * 100).toFixed(1)}%`
      : 'TBD';

    setExams(prev => prev.map(e => {
      if (e.name === activeExam.name && e.batch === activeExam.batch) {
        return {
          ...e,
          average: classAverageStr,
          status: countedStudents > 0 ? 'Marks Published' : 'Scheduled',
          studentMarks: marksToSave
        };
      }
      return e;
    }));

    setIsSaved(true);
    setSuccessMessage(`Exam marks for "${activeExam.name}" saved successfully!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleExportCSV = () => {
    if (!activeExam || targetStudents.length === 0) return;

    const headersList = [
      'Student ID',
      'Student Name',
      'Marks Obtained',
      'Total Marks',
      'Passing Marks',
      'Status Threshold',
      'Mobile Number',
      'Parent Mobile',
      'Branch',
      'Course',
      'Admission Date'
    ];

    const rows = targetStudents.map(s => {
      const scoreStr = localMarks[s.studentId] || '';
      const scoreNum = scoreStr !== '' ? Number(scoreStr) : null;
      let status = 'TBD';
      if (scoreNum !== null) {
        status = scoreNum >= activeExam.passingMarks ? 'Passed' : 'Failed';
      }

      return [
        s.studentId,
        s.name,
        scoreStr,
        activeExam.totalMarks,
        activeExam.passingMarks,
        status,
        s.mobile || '',
        s.parentMobile || '',
        s.branch || '',
        s.course || '',
        s.admissionDate || ''
      ];
    });

    const csvContent = [
      headersList.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeExam.name.replace(/\s+/g, '_')}_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct trigger from Test Registry to Grade screen
  const triggerGradeExam = (exam: ExamItem) => {
    // Resolve batch mapping to populate filters
    const matchedBatch = batches.find(b => b.name === exam.batch);
    if (matchedBatch) {
      setSelectedBranch(matchedBatch.branch || 'Mumbai West');
      setSelectedCourse(matchedBatch.course || 'All');
      setSelectedProgram(matchedBatch.program || 'All');
      setSelectedLevel(matchedBatch.level || 'All');
      setSelectedYear(matchedBatch.academicYear || 'All');
      setSelectedBatch(exam.batch);
    } else {
      setSelectedBatch(exam.batch);
    }
    setSelectedExamName(exam.name);
    setActiveTab('grade');
  };

  // Schedule Test form handler
  const handleOpenAddExamModal = () => {
    setSelectedBranch(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
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

  // Filter & sort exams for Test Registry
  const filteredAndSortedExams = exams
    .filter(e => {
      const matchSearch = e.name.toLowerCase().includes(registrySearch.toLowerCase());
      const matchBatch = registryFilterBatch === 'All' || e.batch === registryFilterBatch;
      
      const batchObj = batches.find(b => b.name === e.batch);
      const isMyBranch = currentUser?.role === 'branch-admin'
        ? batchObj?.branch === currentUser.branch
        : true;
      
      return matchSearch && matchBatch && isMyBranch;
    })
    .sort((a, b) => {
      if (registrySortBy === 'name') return a.name.localeCompare(b.name);
      if (registrySortBy === 'totalMarks') return b.totalMarks - a.totalMarks;
      return 0;
    });

  const registryTotalPages = Math.ceil(filteredAndSortedExams.length / itemsPerPage);
  const paginatedExams = filteredAndSortedExams.slice((registryPage - 1) * itemsPerPage, registryPage * itemsPerPage);

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
              options={availableBatches.map(b => ({ value: b.name, label: b.name }))}
              disabled={availableBatches.length === 0}
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
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 shadow-sm animate-fade-in">
          ✓ {successMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Exams Grading </h2>
          <p className="text-sm text-slate-500 mt-1">Select target batch evaluation sheets and enter score cards for students.</p>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in">
        {/* Hierarchical Selection Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm items-end animate-fade-in">
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
            label="Target Batch" 
            value={selectedBatch} 
            onChange={(e) => setSelectedBatch(e.target.value)} 
            options={availableBatches.map(b => ({ value: b.name, label: b.name }))}
            disabled={availableBatches.length === 0}
          />
          <Select 
            label="Select Evaluation Exam" 
            value={selectedExamName} 
            onChange={(e) => setSelectedExamName(e.target.value)} 
            options={availableExams.map(e => ({ value: e.name, label: e.name }))}
            disabled={availableExams.length === 0}
            wrapperClassName="sm:col-span-2"
          />
        </div>

        {/* Student Marks Entry Table */}
        {selectedBatch && selectedExamName && activeExam ? (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Score Entry sheet: {activeExam.name}</CardTitle>
                <div className="text-xs text-slate-400 mt-1 font-semibold uppercase">
                  Total Marks: {activeExam.totalMarks} | Passing Threshold: {activeExam.passingMarks} | Batch: {activeExam.batch}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" size="sm" className="flex items-center gap-1 font-bold">
                  <Upload size={14} /> Bulk Import
                </Button>
                <Button onClick={handleExportCSV} variant="secondary" size="sm">
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            
            {targetStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                No students enrolled in this batch.
              </div>
            ) : (
              <>
                <Table headers={['Student ID', 'Student Name', 'Marks Obtained', 'Status Threshold']}>
                  {targetStudents.map((s, idx) => {
                    const scoreStr = localMarks[s.studentId] || '';
                    const scoreNum = scoreStr !== '' ? Number(scoreStr) : null;
                    
                    let badge = (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">
                        TBD
                      </span>
                    );
                    
                    if (scoreNum !== null) {
                      if (scoreNum >= activeExam.passingMarks) {
                        badge = (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Passed
                          </span>
                        );
                      } else {
                        badge = (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-500 border border-red-100">
                            Failed
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={activeExam.totalMarks}
                              value={scoreStr}
                              placeholder="Enter score..."
                              onChange={(e) => handleMarkChange(s.studentId, e.target.value)}
                              className="w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                            />
                            <span className="text-xs text-slate-400 font-semibold font-mono">
                              / {activeExam.totalMarks}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{badge}</td>
                      </tr>
                    );
                  })}
                </Table>

                <div className="flex justify-end p-4 border-t border-slate-100">
                  <Button
                    onClick={handleSaveMarks}
                    className={`flex items-center gap-1.5 transition-all ${
                      isSaved ? '!bg-emerald-600 !text-white' : ''
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <Check size={16} /> Saved
                      </>
                    ) : (
                      'Save Evaluation Sheet'
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        ) : (
          <Card>
            <div className="py-16 text-center text-slate-400 animate-fade-in">
              <span className="text-4xl block mb-3">📝</span>
              <p className="font-semibold text-slate-600">No batch evaluation exam chosen.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Please choose a target batch and an exam from the filters above to load the sheet.
              </p>
            </div>
          </Card>
        )}
      </div>

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Exam Evaluation Scores"
        description="Select a CSV spreadsheet to import student marks. Columns must match the template below exactly."
        sampleHeaders={['Student ID', 'Marks Obtained']}
        sampleRows={[
          ['S-201', '85'],
          ['S-202', '62'],
          ['S-204', '38']
        ]}
        onImport={(importedRows) => {
          const updated = { ...localMarks };
          importedRows.forEach((row) => {
            const studentId = row['Student ID'] || row['StudentId'];
            const score = row['Marks Obtained'] || row['Score'] || '0';
            if (studentId) {
              updated[studentId] = String(score);
            }
          });
          setLocalMarks(updated);
          setIsSaved(false);
          addToast('Marks loaded. Click Save Evaluation Sheet to commit.', 'success');
        }}
      />
    </div>
  );
};
