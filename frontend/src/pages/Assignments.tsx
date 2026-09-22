import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import {
  Plus,
  ArrowLeft,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Edit3,
  Trash2,
  Eye,
  FileSpreadsheet,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import {
  assignmentApi,
  type HomeworkItem,
  type HomeworkScoping,
  type EvaluationRosterResponse
} from '../services/assignmentApi';

export const Assignments: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin';

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<'assignments' | 'exams'>('assignments');
  const [loading, setLoading] = useState(false);

  // Scoping options from backend
  const [scoping, setScoping] = useState<HomeworkScoping | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Active branch resolution matching Students.tsx pattern
  const activeBranchId = scoping?.branch?.id?.toString() || (scoping?.branches && scoping.branches.length === 1 ? scoping.branches[0].id.toString() : currentUser?.branchId || '');
  const activeBranchName = scoping?.branch?.name || (scoping?.branches && scoping.branches.length === 1 ? scoping.branches[0].name : currentUser?.branch || 'Assigned Branch');

  // Homeworks / Exams List state
  const [items, setItems] = useState<HomeworkItem[]>([]);

  // Modals & Selected Views state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HomeworkItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Evaluation Roster state
  const [viewingRosterHw, setViewingRosterHw] = useState<HomeworkItem | null>(null);
  const [rosterData, setRosterData] = useState<EvaluationRosterResponse | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [gradingState, setGradingState] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');

  // Create / Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formAcademicYearId, setFormAcademicYearId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formBatchIds, setFormBatchIds] = useState<number[]>([]);
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMaxMarks, setFormMaxMarks] = useState<string>('100');
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Scoping on mount
  useEffect(() => {
    const fetchScoping = async () => {
      try {
        const data = await assignmentApi.getScoping();
        setScoping(data);

        const defaultBranchId = data.branch?.id?.toString() || (data.branches && data.branches.length === 1 ? data.branches[0].id.toString() : data.branches?.[0]?.id?.toString() || '');
        setFormBranchId(defaultBranchId);

        if (data.academicYears && data.academicYears.length > 0) {
          setFormAcademicYearId(data.academicYears[0].id.toString());
        }
        if (data.subjects && data.subjects.length > 0) {
          setFormSubjectId(data.subjects[0].id.toString());
        }
      } catch (err: any) {
        console.error('Failed to load scoping:', err);
        addToast(err.message || 'Failed to load branch scoping options', 'error');
      }
    };
    fetchScoping();
  }, []);

  // 2. Fetch Homeworks & Exams List
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const type = activeTab === 'assignments' ? 'homework' : 'exam';
      const data = await assignmentApi.getHomeworks({
        assignmentType: type,
        status: filterStatus === 'All' ? undefined : filterStatus,
        subject: filterSubject === 'All' ? undefined : filterSubject,
        batch: filterBatch === 'All' ? undefined : filterBatch,
        branch: isBranchAdmin ? undefined : (filterBranch === 'All' ? undefined : filterBranch),
        search: searchTerm.trim() || undefined
      });
      setItems(data);
    } catch (err: any) {
      console.error('Failed to fetch homework list:', err);
      addToast(err.message || 'Failed to fetch items', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus, filterSubject, filterBatch, filterBranch, searchTerm, isBranchAdmin]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Fetch Evaluation Roster
  const openRoster = async (hw: HomeworkItem) => {
    setViewingRosterHw(hw);
    setRosterLoading(true);
    try {
      const res = await assignmentApi.getEvaluationRoster(hw.id);
      setRosterData(res);
      // Initialize grading state
      const initial: Record<string, { marks: string; feedback: string }> = {};
      res.students.forEach(st => {
        initial[st.studentId] = {
          marks: st.marksObtained !== null ? String(st.marksObtained) : '',
          feedback: st.feedback || ''
        };
      });
      setGradingState(initial);
    } catch (err: any) {
      addToast(err.message || 'Failed to load evaluation roster', 'error');
      setViewingRosterHw(null);
    } finally {
      setRosterLoading(false);
    }
  };

  // Grade Single Student
  const handleSaveGrade = async (studentId: string, submissionId: string | null) => {
    if (!viewingRosterHw) return;
    const g = gradingState[studentId];
    if (!g || g.marks === '') {
      addToast('Please enter marks before saving', 'error');
      return;
    }
    const marksNum = parseFloat(g.marks);
    if (isNaN(marksNum) || marksNum < 0) {
      addToast('Please enter a valid positive score', 'error');
      return;
    }
    if (viewingRosterHw.maxMarks !== null && marksNum > viewingRosterHw.maxMarks) {
      addToast(`Marks cannot exceed maximum limit (${viewingRosterHw.maxMarks})`, 'error');
      return;
    }

    try {
      await assignmentApi.gradeSubmission(viewingRosterHw.id, submissionId || studentId, {
        marksObtained: marksNum,
        feedback: g.feedback,
        studentId
      });
      addToast('Grade saved successfully!', 'success');
      // Refresh roster
      const res = await assignmentApi.getEvaluationRoster(viewingRosterHw.id);
      setRosterData(res);
    } catch (err: any) {
      addToast(err.message || 'Failed to save grade', 'error');
    }
  };

  // Bulk Grade Submission
  const handleBulkGradeSubmit = async () => {
    if (!viewingRosterHw || !bulkCsvText.trim()) {
      addToast('Please paste CSV data with Student ID and Marks', 'error');
      return;
    }
    try {
      const lines = bulkCsvText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        addToast('CSV must have a header row and at least one data row', 'error');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = parts[idx] ?? '';
        });
        return obj;
      });

      const res = await assignmentApi.bulkGradeHomework(viewingRosterHw.id, rows);
      if (res.errorCount > 0) {
        addToast(`Processed ${res.successCount} grades with ${res.errorCount} errors. Check console for details.`, 'warning');
        console.warn('Bulk grading errors:', res.errors);
      } else {
        addToast(`Successfully graded ${res.successCount} students!`, 'success');
      }
      setShowBulkModal(false);
      setBulkCsvText('');
      // Reload roster
      const updatedRoster = await assignmentApi.getEvaluationRoster(viewingRosterHw.id);
      setRosterData(updatedRoster);
    } catch (err: any) {
      addToast(err.message || 'Bulk grade import failed', 'error');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormTitle('');
    setFormDescription('');
    setFormBranchId(activeBranchId);
    if (scoping?.academicYears && scoping.academicYears.length > 0) {
      setFormAcademicYearId(scoping.academicYears[0].id.toString());
    }
    if (scoping?.subjects && scoping.subjects.length > 0) {
      setFormSubjectId(scoping.subjects[0].id.toString());
    }
    if (scoping?.batches && scoping.batches.length > 0) {
      setFormBatchIds([Number(scoping.batches[0].id)]);
    } else {
      setFormBatchIds([]);
    }
    setFormDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setFormMaxMarks(activeTab === 'assignments' ? '50' : '100');
    setFormFiles([]);
    setShowCreateModal(true);
  };

  // Submit Create / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('Please enter a title', 'error');
      return;
    }
    if (!formSubjectId) {
      addToast('Please select a subject', 'error');
      return;
    }
    if (!formBatchIds.length) {
      addToast('Please select at least one target batch', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        branchId: isBranchAdmin ? Number(activeBranchId) : Number(formBranchId),
        academicYearId: Number(formAcademicYearId),
        subjectId: Number(formSubjectId),
        assignmentType: activeTab === 'assignments' ? 'homework' : 'exam',
        batchIds: formBatchIds,
        dueDate: formDueDate,
        maxMarks: formMaxMarks ? parseFloat(formMaxMarks) : null
      };

      if (isEditing && selectedItem) {
        await assignmentApi.updateHomework(selectedItem.id, payload, formFiles);
        addToast('Assignment updated successfully!', 'success');
      } else {
        await assignmentApi.createHomework(payload, formFiles);
        addToast('New assignment draft created successfully!', 'success');
      }

      setShowCreateModal(false);
      setSelectedItem(null);
      fetchList();
    } catch (err: any) {
      addToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Publish / Close / Delete
  const handlePublish = async (id: string) => {
    try {
      await assignmentApi.publishHomework(id);
      addToast('Assignment published successfully! Students can now submit.', 'success');
      fetchList();
      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, status: 'Published' } : null);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to publish assignment', 'error');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await assignmentApi.closeHomework(id);
      addToast('Assignment closed successfully.', 'info');
      fetchList();
      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, status: 'Closed' } : null);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to close assignment', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await assignmentApi.deleteHomework(id);
      addToast('Record deleted successfully.', 'success');
      fetchList();
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete record', 'error');
    }
  };

  // Filtered pagination
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ----------------------------------------------------
  // ROSTER & EVALUATION VIEW
  // ----------------------------------------------------
  if (viewingRosterHw) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewingRosterHw(null);
                setRosterData(null);
              }}
              className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-slate-900">{viewingRosterHw.title}</h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  viewingRosterHw.status === 'Published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : viewingRosterHw.status === 'Draft'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {viewingRosterHw.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Evaluation Roster • Subject: <strong className="text-slate-700">{viewingRosterHw.subjectName}</strong> • Max Marks:{' '}
                <strong className="text-slate-700 font-mono">{viewingRosterHw.maxMarks ?? 'N/A'}</strong> • Due:{' '}
                <strong className="text-slate-700 font-mono">{viewingRosterHw.dueDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!rosterData) return;
                const headers = ['Student ID / Roll No', 'Student Name', 'Batch', 'Status', 'Marks Obtained', 'Teacher Feedback'];
                const rows = rosterData.students.map(s => [
                  s.studentCode || s.studentId,
                  s.studentName,
                  s.batchName,
                  s.submissionStatus || 'Not Submitted',
                  s.marksObtained ?? '',
                  s.feedback ?? ''
                ]);
                const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
                const link = document.createElement('a');
                link.href = encodeURI(csv);
                link.download = `${viewingRosterHw.title.replace(/\s+/g, '_')}_evaluation_roster.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="w-4 h-4 mr-1.5" /> Export Roster
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBulkModal(true)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Bulk Grade CSV
            </Button>
          </div>
        </div>

        {rosterLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading evaluation roster...</div>
        ) : !rosterData || rosterData.students.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-xl text-center text-slate-400">
            No enrolled students found in target batches.
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students ({rosterData.students.length})</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Roll No / Student</th>
                    <th className="px-6 py-3">Batch</th>
                    <th className="px-6 py-3">Submission</th>
                    <th className="px-6 py-3">Marks (Max: {viewingRosterHw.maxMarks ?? '—'})</th>
                    <th className="px-6 py-3">Teacher Remarks</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rosterData.students.map(st => {
                    const g = gradingState[st.studentId] || { marks: '', feedback: '' };
                    return (
                      <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{st.studentName}</div>
                          <div className="text-xs text-slate-400 font-mono">{st.studentCode || `ID: ${st.studentId}`}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                            {st.batchName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {st.submissionStatus ? (
                            <div>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                st.submissionStatus === 'Graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {st.submissionStatus}
                              </span>
                              {st.files && st.files.length > 0 && (
                                <div className="mt-1">
                                  <a
                                    href={st.files[0]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-mono"
                                  >
                                    <FileText size={12} /> View Submission
                                  </a>
                                </div>
                              )}
                              {st.responseText && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">"{st.responseText}"</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Pending submission</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            max={viewingRosterHw.maxMarks ?? 100}
                            placeholder="0.0"
                            value={g.marks}
                            onChange={e =>
                              setGradingState(prev => ({
                                ...prev,
                                [st.studentId]: { ...prev[st.studentId], marks: e.target.value }
                              }))
                            }
                            className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Add remarks..."
                            value={g.feedback}
                            onChange={e =>
                              setGradingState(prev => ({
                                ...prev,
                                [st.studentId]: { ...prev[st.studentId], feedback: e.target.value }
                              }))
                            }
                            className="w-full max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveGrade(st.studentId, st.submissionId)}
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Bulk Grade Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-600" /> Bulk Grade Import
                </h3>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Paste CSV data with columns: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">Roll No, Marks, Remarks</code>
              </p>
              <textarea
                rows={8}
                placeholder={`Roll No,Marks,Remarks\nSTU001,48,Good Work\nSTU002,42,Well done`}
                value={bulkCsvText}
                onChange={e => setBulkCsvText(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleBulkGradeSubmit}>
                  Process Import
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // FULL SCREEN DETAILS VIEW
  // ----------------------------------------------------
  if (selectedItem) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedItem(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Assignment Details</h2>
            <p className="text-sm text-slate-500">View configuration, target batches, and attachments.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</span>
                  <h3 className="text-xl font-bold text-slate-800 mt-1">{selectedItem.title}</h3>
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                  selectedItem.status === 'Published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedItem.status === 'Draft'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {selectedItem.status}
                </span>
              </div>

              {selectedItem.description && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Description / Instructions</span>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{selectedItem.description}</p>
                </div>
              )}

              <hr className="border-slate-100" />

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Subject</span>
                  <span className="text-sm font-semibold text-slate-800 mt-1 block">{selectedItem.subjectName}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Submission Deadline</span>
                  <span className="text-sm font-semibold text-slate-800 mt-1 block font-mono">{selectedItem.dueDate}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Max Marks</span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block font-mono">{selectedItem.maxMarks ?? 'N/A'}</span>
                </div>
              </div>

              {selectedItem.files && selectedItem.files.length > 0 && (
                <>
                  <hr className="border-slate-100" />
                  <div>
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Attached File(s)</span>
                    <div className="space-y-2 mt-2">
                      {selectedItem.files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 max-w-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📄</span>
                            <span className="text-xs font-semibold text-slate-700 font-mono truncate max-w-xs">{f.split('/').pop()}</span>
                          </div>
                          <a
                            href={f}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {selectedItem.status === 'Draft' && (
                    <Button variant="primary" size="sm" onClick={() => handlePublish(selectedItem.id)}>
                      Publish Now
                    </Button>
                  )}
                  {selectedItem.status === 'Published' && (
                    <Button variant="outline" size="sm" onClick={() => handleClose(selectedItem.id)}>
                      Close Submissions
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => openRoster(selectedItem)}>
                    Evaluation Roster ({selectedItem.submittedCount} / {selectedItem.totalCount})
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {selectedItem.status === 'Draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(true);
                        setFormTitle(selectedItem.title);
                        setFormDescription(selectedItem.description);
                        setFormBranchId(selectedItem.branchId);
                        setFormAcademicYearId(selectedItem.academicYearId);
                        setFormSubjectId(selectedItem.subjectId);
                        setFormBatchIds(selectedItem.batchIds);
                        setFormDueDate(selectedItem.dueDate);
                        setFormMaxMarks(selectedItem.maxMarks !== null ? String(selectedItem.maxMarks) : '');
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit3 size={14} className="mr-1" /> Edit
                    </Button>
                  )}
                  {selectedItem.status !== 'Published' && (
                    <Button variant="outline" size="sm" onClick={() => handleDelete(selectedItem.id)} className="text-rose-600 hover:text-rose-700">
                      <Trash2 size={14} className="mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Branch &amp; Batch Mapping</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Branch</span>
                  <span className="font-semibold text-slate-700">{selectedItem.branchName || 'Authorized Branch'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Academic Year</span>
                  <span className="font-semibold text-slate-700">{selectedItem.academicYearName || '2026-27'}</span>
                </div>
                <div className="py-2">
                  <span className="text-slate-400 font-medium block mb-2">Target Batches</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.batchNames && selectedItem.batchNames.length > 0 ? (
                      selectedItem.batchNames.map((bn, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {bn}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">All assigned batches</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CREATE / EDIT MODAL
  // ----------------------------------------------------
  if (showCreateModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {isEditing ? 'Edit Assignment' : activeTab === 'assignments' ? 'Create Homework Assignment' : 'Schedule Evaluation Test'}
            </h2>
            <p className="text-sm text-slate-500">
              {activeTab === 'assignments'
                ? 'Publish homework tasks and study materials for your branch batches.'
                : 'Configure classroom test schedule and score thresholds.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl">
          <Input
            label="Title *"
            required
            placeholder={activeTab === 'assignments' ? 'e.g. Electrophilic Addition Quiz Problems' : 'e.g. Physics Chapter 4 Evaluation Test'}
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block font-display mb-1.5">
              Description / Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Enter instructions, question breakdown, or syllabus covered..."
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Branch Field */}
            {!isBranchAdmin ? (
              <Select
                label="Branch"
                value={formBranchId}
                onChange={e => setFormBranchId(e.target.value)}
                options={(scoping?.branches || []).map(b => ({ value: b.id.toString(), label: b.name }))}
              />
            ) : (
              <Select
                label="Branch"
                value={activeBranchId}
                disabled={true}
                options={[
                  { value: activeBranchId, label: activeBranchName }
                ]}
              />
            )}

            <Select
              label="Academic Year *"
              value={formAcademicYearId}
              onChange={e => setFormAcademicYearId(e.target.value)}
              options={(scoping?.academicYears || []).map(ay => ({ value: ay.id.toString(), label: ay.name }))}
            />

            <Select
              label="Subject Area *"
              value={formSubjectId}
              onChange={e => setFormSubjectId(e.target.value)}
              options={(scoping?.subjects || []).map(s => ({ value: s.id.toString(), label: `${s.name} (${s.code || 'SUB'})` }))}
            />
          </div>

          {/* Target Batches Multi-Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block font-display mb-2">
              Target Batches * ({scoping?.batches?.length || 0} available)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50">
              {(scoping?.batches || []).map(b => {
                const bIdNum = Number(b.id);
                const isSelected = formBatchIds.includes(bIdNum);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormBatchIds(prev => [...prev, bIdNum]);
                        } else {
                          setFormBatchIds(prev => prev.filter(id => id !== bIdNum));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span className="truncate">{b.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Submission Deadline *"
              type="date"
              required
              value={formDueDate}
              onChange={e => setFormDueDate(e.target.value)}
            />
            <Input
              label="Total Maximum Marks"
              type="number"
              placeholder="e.g. 100"
              value={formMaxMarks}
              onChange={e => setFormMaxMarks(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block font-display">
              Attach Resource Document(s)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm font-semibold transition-all">
                <Upload size={14} /> Choose File(s)
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      setFormFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </label>
              {formFiles.length > 0 ? (
                <span className="text-xs text-emerald-600 font-semibold font-mono">
                  ✓ {formFiles.length} file(s) selected ({formFiles.map(f => f.name).join(', ')})
                </span>
              ) : (
                <span className="text-xs text-slate-400">No new files selected</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || formBatchIds.length === 0}>
              {submitting ? 'Saving...' : isEditing ? 'Update Assignment' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN LIST VIEW
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Homework &amp; Exams</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage course assignments, evaluative classroom tests, and student grade rosters.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={16} className="mr-1.5" />
          {activeTab === 'assignments' ? 'Create Homework' : 'Schedule Test'}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab('assignments');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen size={16} /> Homework &amp; Assignments
        </button>
        <button
          onClick={() => {
            setActiveTab('exams');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'exams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList size={16} /> Classroom Tests &amp; Exams
        </button>
      </div>

      {/* Scope & Filters Section - Matching Students.tsx design */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end animate-fade-in">
        <Input
          label="Search"
          placeholder="Search by title, subject, or batch..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          wrapperClassName="sm:col-span-2"
        />

        {!isBranchAdmin ? (
          <Select
            label="Filter Branch"
            value={filterBranch}
            onChange={e => { setFilterBranch(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'All', label: 'All Branches' },
              ...(scoping?.branches || []).map(b => ({ value: b.id.toString(), label: b.name }))
            ]}
          />
        ) : (
          <Select
            label="Filter Branch"
            value={activeBranchId}
            disabled={true}
            options={[
              { value: activeBranchId, label: activeBranchName }
            ]}
          />
        )}

        <Select
          label="Filter Batch"
          value={filterBatch}
          onChange={e => { setFilterBatch(e.target.value); setCurrentPage(1); }}
          options={[
            { value: 'All', label: 'All Batches' },
            ...(scoping?.batches || []).map(bat => ({ value: bat.id.toString(), label: bat.name }))
          ]}
        />

        <Select
          label="Filter Subject"
          value={filterSubject}
          onChange={e => { setFilterSubject(e.target.value); setCurrentPage(1); }}
          options={[
            { value: 'All', label: 'All Subjects' },
            ...(scoping?.subjects || []).map(s => ({ value: s.id.toString(), label: s.name }))
          ]}
        />
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'assignments' ? 'Homework Assignments' : 'Scheduled Evaluations'} ({items.length})
          </CardTitle>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const headers = ['Title', 'Subject', 'Target Batches', 'Due Date', 'Submissions', 'Status'];
              const rows = items.map(item => [
                item.title,
                item.subjectName,
                (item.batchNames || []).join('; '),
                item.dueDate,
                `${item.submittedCount} / ${item.totalCount}`,
                item.status
              ]);
              const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
              const link = document.createElement('a');
              link.href = encodeURI(csv);
              link.download = `${activeTab}_export.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        </CardHeader>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No {activeTab === 'assignments' ? 'homework assignments' : 'evaluations'} found for this scope.
          </div>
        ) : (
          <Table
            dense
            borderless
            minWidth="1020px"
            colWidths={['26%', '14%', '15%', '12%', '11%', '10%', '12%']}
            headers={[
              { label: 'Title', align: 'left' },
              { label: 'Subject', align: 'left' },
              { label: 'Target Batch', align: 'left' },
              { label: 'Due Date', align: 'left' },
              { label: 'Submissions', align: 'center' },
              { label: 'Status', align: 'center' },
              { label: 'Actions', align: 'right' }
            ]}
          >
            {paginatedItems.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 text-left">
                  <div className="font-semibold text-slate-900 text-sm truncate max-w-[240px]" title={item.title}>
                    {item.title}
                  </div>
                  {item.files && item.files.length > 0 && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-semibold font-mono">
                      📄 {item.files.length} attachment(s)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-left text-slate-700 font-medium text-xs truncate max-w-[140px]" title={item.subjectName}>
                  {item.subjectName}
                </td>
                <td className="px-4 py-3 text-left text-slate-600 text-xs truncate max-w-[160px]" title={item.batchNames?.join(', ') || ''}>
                  {item.batchNames && item.batchNames.length > 0 ? (
                    item.batchNames.join(', ')
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-left font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{item.dueDate}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <button
                    onClick={() => openRoster(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold font-mono transition-colors cursor-pointer border border-blue-200"
                  >
                    {item.submittedCount} / {item.totalCount} <span className="font-sans font-normal text-[11px] text-blue-500">graded</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      item.status === 'Published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'Draft'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      title="View Details"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openRoster(item)}
                      title="Grade Roster"
                      className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={15} />
                    </button>
                    {item.status === 'Draft' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(item.id)}
                        title="Publish Assignment"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    {item.status !== 'Published' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={items.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
