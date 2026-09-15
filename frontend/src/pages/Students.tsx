import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ArrowLeft, UserPlus, Upload, BookOpen, User, Phone, Layers, CheckCircle, IndianRupee, CreditCard, FileText, Clock, AlertCircle, Calendar, Pencil, Trash2, Loader2 } from 'lucide-react';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { AddStudentForm } from '../components/students/AddStudentForm';
import { 
  getStudents, 
  getStudentById, 
  getAcademicOptions,
  deleteStudent
} from '../services/studentApi';
import type { CreateStudentPayload } from '../services/studentApi';
import type { 
  StudentRosterItem, 
  StudentDetail, 
  AcademicOptions 
} from '../services/studentApi';
import { formatDate } from '../utils/dateFormatter';

export const Students: React.FC = () => {
  const { addToast, currentUser } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin';

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [academicOptions, setAcademicOptions] = useState<AcademicOptions | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterBundle, setFilterBundle] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const activeBranchId = academicOptions?.branch?.id?.toString() || (academicOptions?.branches && academicOptions.branches.length === 1 ? academicOptions.branches[0].id.toString() : currentUser?.branchId || '');
  const activeBranchName = academicOptions?.branch?.name || (academicOptions?.branches && academicOptions.branches.length === 1 ? academicOptions.branches[0].name : currentUser?.branch || 'Assigned Branch');

  // Modals & Detailed Profile
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'academic' | 'parents' | 'fees' | 'documents'>('overview');

  // Edit & Delete state
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<Partial<CreateStudentPayload> | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<number | undefined>(undefined);
  const [editingProgramId, setEditingProgramId] = useState<number | undefined>(undefined);
  const [editingLevelId, setEditingLevelId] = useState<number | undefined>(undefined);
  const [deletingStudent, setDeletingStudent] = useState<StudentRosterItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load dropdown options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await getAcademicOptions();
        const data = res?.data ?? res;
        if (data && (data.courses || data.branches)) {
          setAcademicOptions(data);
        } else {
          console.warn('Academic options returned unexpected shape:', res);
        }
      } catch (err) {
        console.error('Failed to load academic options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch Student Roster
  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await getStudents({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        branchId: isBranchAdmin ? undefined : filterBranch,
        batchId: filterBatch,
        bundleId: filterBundle,
        status: filterStatus
      });
      if (res.data) {
        setStudents(res.data);
        setTotalItems(res.pagination?.total || res.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch student roster:', err);
      addToast('Failed to load student roster from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [currentPage, searchTerm, filterBranch, filterBatch, filterBundle, filterStatus]);

  // Fetch Detailed Profile when a student is selected
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentDetail(null);
      return;
    }
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const res = await getStudentById(selectedStudentId);
        if (res.data) {
          setSelectedStudentDetail(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch student profile:', err);
        addToast('Failed to fetch student profile details', 'error');
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedStudentId]);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const handleExportCSV = () => {
    if (students.length === 0) {
      addToast('No student records available to export', 'error');
      return;
    }
    const dataToExport = students.map(s => ({
      'Student Code': s.student_code,
      'Full Name': s.full_name,
      'Branch': s.branch_name || '',
      'Batch': s.batch_name || '',
      'Mobile': s.mobile || '',
      'Email': s.email || '',
      'Status': s.status
    }));

    const csvRows = [];
    const headers = Object.keys(dataToExport[0]);
    csvRows.push(headers.join(','));

    for (const row of dataToExport) {
      const values = headers.map(h => `"${(row[h as keyof typeof row] || '').toString().replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_roster_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Student roster exported to CSV successfully.', 'success');
  };

  const handleEditStudent = (studentId: number) => {
    const fetchEditDetail = async () => {
      try {
        const res = await getStudentById(studentId);
        if (res.data) {
          const d = res.data as StudentDetail;

          let courseId: number | undefined;
          let programId: number | undefined;
          let levelId: number | undefined;

          // Resolve cascade hierarchy from the student's enrolled batch
          const batch = (academicOptions?.batches || []).find(b => Number(b.id) === Number(d.batch_id));
          if (batch) {
            levelId = Number(batch.level_id);
            const level = (academicOptions?.levels || []).find(l => Number(l.id) === Number(batch.level_id));
            if (level) {
              courseId = level.course_id ? Number(level.course_id) : undefined;
              programId = level.program_id ? Number(level.program_id) : undefined;
            }
          }

          setEditingInitialData({
            primary_branch_id: d.primary_branch_id,
            full_name: d.full_name,
            mobile: d.mobile,
            email: d.email,
            dob: d.dob ? String(d.dob).slice(0, 10) : '',
            gender: d.gender,
            blood_group: d.blood_group,
            street: d.street,
            city: d.city,
            state: d.state,
            pincode: d.pincode,
            category: d.category,
            school_name: d.school_name,
            current_class: d.current_class,
            target_exam: d.target_exam,
            year_of_attempt: d.year_of_attempt,
            status: d.status !== undefined && d.status !== null ? String(d.status) : '1',
            guardian_name: d.guardian_name,
            guardian_mobile: d.guardian_mobile,
            guardian_relation: d.guardian_relation,
            guardian_email: d.guardian_email,
            academic_year_id: d.academic_year_id,
            batch_id: d.batch_id,
            bundle_id: d.bundle_id ?? undefined,
            subject_selection_type: d.subject_selection_type || 'bundle',
            custom_subject_ids: d.custom_subject_ids ?? [],
            gross_amount: d.feeAssignment?.gross_amount ?? d.total_fees_gross ?? '',
            discount_amount: d.feeAssignment?.total_concession ?? d.feeAssignment?.discount_amount ?? d.total_concession ?? '',
            downpayment_amount: d.feeAssignment?.down_payment ?? d.feeAssignment?.downpayment_amount ?? d.down_payment ?? '',
            installment_count: d.feeAssignment?.installment_count || 1
          });
          setEditingCourseId(courseId);
          setEditingProgramId(programId);
          setEditingLevelId(levelId);
          setEditingStudentId(studentId);
        }
      } catch (err) {
        console.error('Failed to fetch student for edit:', err);
        addToast('Failed to load student details for editing', 'error');
      }
    };
    fetchEditDetail();
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      const res = await deleteStudent(deletingStudent.id);
      if (res?.status === 'success') {
        addToast('Student removed from roster (soft delete).', 'success');
        setDeletingStudent(null);
        fetchRoster();
      } else {
        addToast(res?.message || 'Failed to delete student', 'error');
      }
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      addToast(err?.response?.data?.message || 'Failed to delete student', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Render Full-Page Create Active Student Form
  if (isAddModalOpen) {
    return (
      <AddStudentForm
        onCancel={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchRoster();
        }}
        academicOptions={academicOptions}
        addToast={addToast}
      />
    );
  }

  // Render Full-Page Edit Student Form (same form, pre-filled)
  if (editingStudentId && editingInitialData) {
    return (
      <AddStudentForm
        key={editingStudentId}
        mode="edit"
        studentId={editingStudentId}
        initialData={editingInitialData}
        initialCourseId={editingCourseId}
        initialProgramId={editingProgramId}
        initialLevelId={editingLevelId}
        onCancel={() => {
          setEditingStudentId(null);
          setEditingInitialData(null);
        }}
        onSuccess={() => {
          setEditingStudentId(null);
          setEditingInitialData(null);
          fetchRoster();
        }}
        academicOptions={academicOptions}
        addToast={addToast}
      />
    );
  }

  // Render Detailed Student Profile
  if (selectedStudentId && selectedStudentDetail) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStudentId(null)}
            className="flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Student Profile: {selectedStudentDetail.full_name}
            </h2>
            <p className="text-sm text-slate-500">
              Student Code: <span className="font-mono font-bold text-slate-700">{selectedStudentDetail.student_code}</span> &bull; Branch: <span className="font-bold text-slate-700">{selectedStudentDetail.branch_name || 'Main Branch'}</span>
            </p>
          </div>
        </div>

        <div className="space-y-6 flex flex-col bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex border-b border-slate-200 bg-slate-50 p-2 rounded-xl">
            {[
              { id: 'overview', label: 'Personal Details' },
              { id: 'academic', label: 'Batch & Subject Bundle' },
              { id: 'parents', label: 'Parent / Guardian' },
              { id: 'fees', label: 'Fee Plan & Invoices' },
              { id: 'documents', label: 'Documents' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id as any)}
                className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer rounded-lg ${
                  profileTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm border-blue-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-2">
            {/* Overview */}
            {profileTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                    {selectedStudentDetail.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 text-lg">{selectedStudentDetail.full_name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-medium text-slate-500">
                      <span>Status: <strong className={`uppercase font-bold ${Number(selectedStudentDetail.status) === 1 || selectedStudentDetail.status === 'active' ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {Number(selectedStudentDetail.status) === 1 || selectedStudentDetail.status === 'active' ? 'Active' : (Number(selectedStudentDetail.status) === 2 ? 'Deleted' : 'Inactive')}
                      </strong></span>
                      <span>&bull;</span>
                      <span>Category: <strong className="text-slate-700">{selectedStudentDetail.category || 'General'}</strong></span>
                      <span>&bull;</span>
                      <span>Enrolled Date: <strong className="text-slate-700">{selectedStudentDetail.enrolled_date ? formatDate(selectedStudentDetail.enrolled_date) : 'Active'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Personal Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Date of Birth</span>
                        <strong className="text-slate-700">{selectedStudentDetail.dob ? formatDate(selectedStudentDetail.dob) : 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Gender</span>
                        <strong className="text-slate-700">{selectedStudentDetail.gender || 'Male'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Mobile Contact</span>
                        <strong className="text-slate-700 font-mono">{selectedStudentDetail.mobile || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Email Address</span>
                        <strong className="text-slate-700 font-mono text-xs">{selectedStudentDetail.email || 'N/A'}</strong>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      School & Entrance Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="col-span-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">School Name</span>
                        <strong className="text-slate-700">{selectedStudentDetail.school_name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Current Class</span>
                        <strong className="text-slate-700">{selectedStudentDetail.current_class || 'Class 11'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Target Exam</span>
                        <strong className="text-slate-700">{selectedStudentDetail.target_exam || 'JEE Prep'}</strong>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Academic Linkage */}
            {profileTab === 'academic' && (
              <div className="space-y-6">
                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Enrolled Batch & Academic Session
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Enrolled Batch</span>
                      <strong className="text-blue-700 font-mono text-base">{selectedStudentDetail.batch_name || 'Not Enrolled'}</strong>
                      {selectedStudentDetail.batch_code && (
                        <span className="text-xs text-slate-500 font-mono block mt-0.5">Code: {selectedStudentDetail.batch_code}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Academic Session Year</span>
                      <strong className="text-slate-700">{selectedStudentDetail.academic_year_name || 'Current Year'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Registered Branch</span>
                      <strong className="text-slate-700">{selectedStudentDetail.branch_name}</strong>
                    </div>
                  </div>
                </Card>

                {/* Subject Bundle / Custom Subjects Card */}
                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" />
                    Mapped Curriculum & Enrolled Subjects
                  </h3>
                  
                  {selectedStudentDetail.subject_selection_type === 'custom' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            Custom Subject Enrollment
                          </span>
                          <h4 className="font-bold text-indigo-950 text-base mt-1">Individual Subjects Selection</h4>
                          <p className="text-xs text-slate-600 mt-0.5">Student has opted for customized subject combination.</p>
                        </div>
                        <span className="text-sm font-bold text-indigo-700 font-mono bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs">
                          {selectedStudentDetail.subjectsList?.length || 0} Subjects
                        </span>
                      </div>

                      {selectedStudentDetail.subjectsList && selectedStudentDetail.subjectsList.length > 0 ? (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Enrolled Subjects:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {selectedStudentDetail.subjectsList.map((sub, idx) => (
                              <div key={idx} className="p-3 bg-white border border-indigo-100 rounded-xl flex items-center gap-2.5 shadow-xs">
                                <BookOpen size={16} className="text-indigo-600 shrink-0" />
                                <div>
                                  <div className="font-semibold text-slate-800 text-xs">{sub.name}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{sub.code}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">No custom subject list found</div>
                      )}
                    </div>
                  ) : selectedStudentDetail.subjectBundle ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Predefined Bundle
                          </span>
                        </div>
                        <h4 className="font-bold text-blue-900 text-base mt-1">{selectedStudentDetail.subjectBundle.name}</h4>
                        <p className="text-xs text-slate-600 mt-1">{selectedStudentDetail.subjectBundle.description || 'Core Level Bundle'}</p>
                      </div>

                      {selectedStudentDetail.subjectsList && selectedStudentDetail.subjectsList.length > 0 ? (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Individual Subjects Included:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {selectedStudentDetail.subjectsList.map((sub, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-600 shrink-0" />
                                <div>
                                  <div className="font-semibold text-slate-800 text-xs">{sub.name}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{sub.code}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">No subject list attached</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-100">
                      No active subject bundle or custom subjects mapped to this student.
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Parent Info */}
            {profileTab === 'parents' && (
              <Card className="p-5 border border-slate-200/80 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                  Parent / Guardian Contact Info
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Full Name</span>
                    <strong className="text-slate-800">{selectedStudentDetail.guardian_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Relation</span>
                    <strong className="text-slate-700">{selectedStudentDetail.guardian_relation || 'Parent'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Mobile</span>
                    <strong className="text-slate-700 font-mono">{selectedStudentDetail.guardian_mobile || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Email ID</span>
                    <strong className="text-slate-700 font-mono text-xs">{selectedStudentDetail.guardian_email || 'N/A'}</strong>
                  </div>
                </div>
              </Card>
            )}

            {/* Fee Plan & Invoices */}
            {profileTab === 'fees' && (
              <div className="space-y-6">
                {selectedStudentDetail.feeAssignment ? (
                  <>
                    {/* KPI Financial Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Fee</span>
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <IndianRupee size={18} />
                          </div>
                        </div>
                        <div className="text-xl font-extrabold text-slate-900 mt-2">
                          ₹{Number(selectedStudentDetail.feeAssignment.net_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Gross: ₹{Number(selectedStudentDetail.feeAssignment.gross_amount || 0).toLocaleString('en-IN')}
                          {Number(selectedStudentDetail.feeAssignment.total_concession ?? selectedStudentDetail.feeAssignment.discount_amount ?? 0) > 0 && (
                            <span className="text-emerald-600 font-semibold ml-1">
                              (-₹{Number(selectedStudentDetail.feeAssignment.total_concession ?? selectedStudentDetail.feeAssignment.discount_amount ?? 0).toLocaleString('en-IN')})
                            </span>
                          )}
                        </div>
                      </Card>

                      <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Downpayment</span>
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <CreditCard size={18} />
                          </div>
                        </div>
                        <div className="text-xl font-extrabold text-slate-900 mt-2">
                          ₹{Number(selectedStudentDetail.feeAssignment.down_payment ?? selectedStudentDetail.feeAssignment.downpayment_amount ?? 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Initial Admission Amount</div>
                      </Card>

                      <Card className="p-4 border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Paid Till Date</span>
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <CheckCircle size={18} />
                          </div>
                        </div>
                        <div className="text-xl font-extrabold text-emerald-700 mt-2">
                          ₹{Number(selectedStudentDetail.feeAssignment.paid_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-1">
                          {Math.round((Number(selectedStudentDetail.feeAssignment.paid_amount || 0) / (Number(selectedStudentDetail.feeAssignment.net_amount) || 1)) * 100)}% Cleared
                        </div>
                      </Card>

                      <Card className="p-4 border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Outstanding Dues</span>
                          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                            <Clock size={18} />
                          </div>
                        </div>
                        <div className="text-xl font-extrabold text-amber-700 mt-2">
                          ₹{Number(selectedStudentDetail.feeAssignment.balance_amount ?? selectedStudentDetail.feeAssignment.balance_due ?? 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-amber-600 font-medium mt-1">
                          {Number(selectedStudentDetail.feeAssignment.balance_amount ?? selectedStudentDetail.feeAssignment.balance_due ?? 0) === 0 ? 'Fully Settled' : 'Pending Installments'}
                        </div>
                      </Card>
                    </div>

                    {/* Plan Structure Details Card */}
                    <Card className="p-5 border border-slate-200/80 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText size={16} className="text-blue-600" />
                          Agreed Master Fee Contract Plan
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                          selectedStudentDetail.feeAssignment.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedStudentDetail.feeAssignment.status === 'partially_paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          Status: {(selectedStudentDetail.feeAssignment.status || 'pending').replace('_', ' ')}
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Gross Course Fee</span>
                          <strong className="text-slate-800">₹{Number(selectedStudentDetail.feeAssignment.gross_amount || 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Discount Concession</span>
                          <strong className="text-emerald-600">₹{Number(selectedStudentDetail.feeAssignment.total_concession ?? selectedStudentDetail.feeAssignment.discount_amount ?? 0).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Installment Plan</span>
                          <strong className="text-slate-800">
                            {selectedStudentDetail.feeAssignment.installment_count || 1} x ₹{Number(selectedStudentDetail.feeAssignment.installment_amount || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Contract Created Date</span>
                          <strong className="text-slate-700">
                            {selectedStudentDetail.feeAssignment.created_at ? formatDate(selectedStudentDetail.feeAssignment.created_at) : 'N/A'}
                          </strong>
                        </div>
                      </div>
                    </Card>

                    {/* Invoice & Payment History Timeline */}
                    <Card className="p-5 border border-slate-200/80 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-blue-600" />
                          Invoice & Installment History ({selectedStudentDetail.invoicesList?.length || 0} Invoices)
                        </span>
                      </h3>

                      {selectedStudentDetail.invoicesList && selectedStudentDetail.invoicesList.length > 0 ? (
                        <Table dense headers={['Invoice #', 'Installment', 'Due Date', 'Billed Amount', 'Paid Amount', 'Balance Due', 'Payment Info', 'Status']}>
                          {selectedStudentDetail.invoicesList.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 font-mono font-bold text-xs text-blue-700">
                                {inv.invoice_number}
                              </td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                                {inv.installment_number === 0 ? 'Downpayment' : `Installment #${inv.installment_number}`}
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-600">
                                {inv.due_date ? formatDate(inv.due_date) : '-'}
                              </td>
                              <td className="px-3 py-2 text-xs font-bold text-slate-800">
                                ₹{Number(inv.amount ?? inv.billed_amount ?? 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2 text-xs font-bold text-emerald-600">
                                ₹{Number(inv.paid_amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2 text-xs font-bold text-amber-600">
                                ₹{Number(inv.balance_due || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-500">
                                {inv.payment_mode ? (
                                  <div>
                                    <span className="font-semibold text-slate-700">{inv.payment_mode}</span>
                                    {inv.payment_date && (
                                      <div className="text-[10px] text-slate-400">{formatDate(inv.payment_date)}</div>
                                    )}
                                    {(inv.transaction_reference || inv.transaction_ref) && (
                                      <div className="text-[10px] font-mono text-slate-400">{inv.transaction_reference || inv.transaction_ref}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Not paid</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                  inv.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : inv.status === 'partially_paid'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </Table>
                      ) : (
                        <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl text-center">
                          No invoices generated for this student contract yet.
                        </div>
                      )}
                    </Card>
                  </>
                ) : (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <AlertCircle size={32} className="mx-auto text-slate-400 mb-2" />
                    <h4 className="font-bold text-slate-700 text-base">No Active Fee Plan Assigned</h4>
                    <p className="text-xs text-slate-500 mt-1">This student has not been assigned a custom fee contract or installment plan yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Documents */}
            {profileTab === 'documents' && (
              <Card className="p-5 border border-slate-200/80 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                  Admission Proof Documents
                </h3>
                <Table headers={['Document Category', 'Filename', 'Status', 'Actions']}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">Govt ID (Aadhaar Proof)</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">aadhaar_proof.pdf</td>
                    <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold">Verified</span></td>
                    <td className="px-6 py-4"><Button variant="secondary" size="sm">Download</Button></td>
                  </tr>
                </Table>
              </Card>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="secondary" onClick={() => setSelectedStudentId(null)}>
              Close Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Student Profile Roster</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage active students, assigned batches, subject bundles, and guardian records.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <Button 
            variant="primary" 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center gap-1.5 font-bold"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
          >
            <UserPlus size={16} /> Add Active Student
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <Upload size={14} /> Bulk Import <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">UI Only</span>
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input
          label="Search Roster"
          placeholder="Search by student name, code, or mobile..."
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
              ...(academicOptions?.branches || []).map(b => ({ value: b.id.toString(), label: b.name }))
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
            ...(academicOptions?.batches || []).map(bat => ({ value: bat.id.toString(), label: bat.name }))
          ]}
        />

        <Select
          label="Status"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          options={[
            { value: 'All', label: 'All Status' },
            { value: '1', label: 'Active Enrolled' },
            { value: '0', label: 'Inactive' }
          ]}
        />
      </div>

      {/* Roster Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Enrolled Students ({totalItems})</CardTitle>
        </CardHeader>

        <Table headers={['Student Code', 'Full Name', 'Branch', 'Enrolled Batch', 'Mobile Contact', 'Status', 'Actions']}>
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading student roster...</td>
            </tr>
          ) : students.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No active student records found matching filters.</td>
            </tr>
          ) : (
            students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                <td className="px-6 py-4 font-mono font-bold text-xs text-blue-600">{s.student_code}</td>
                <td className="px-6 py-4 font-semibold text-slate-800">{s.full_name}</td>
                <td className="px-6 py-4 text-xs text-slate-600">{s.branch_name || 'Main Branch'}</td>
                <td className="px-6 py-4 font-mono text-xs text-emerald-700 font-bold">{s.batch_name || 'Unassigned'}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-600">{s.mobile || 'N/A'}</td>
                <td className="px-6 py-4 text-xs">
                  {Number(s.status) === 1 || s.status === 'active' ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  ) : Number(s.status) === 2 || s.status === 'deleted' ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                      Deleted
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedStudentId(s.id)}
                      className="font-bold text-xs"
                    >
                      View Profile
                    </Button>
                    <button
                      onClick={() => handleEditStudent(s.id)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer"
                      title="Edit Student"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingStudent(s)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>



      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Student Roster (UI Only)"
        description="Upload CSV spreadsheet to import student enrollment records (demonstration mode)."
        sampleHeaders={['Full Name', 'Mobile', 'Email', 'Class', 'Branch ID', 'Batch ID']}
        sampleRows={[
          ['Aarav Sharma', '9812457812', 'aarav.sharma@gmail.com', 'Class 11', '1', '1'],
          ['Divya Rao', '9645123078', 'divya.rao@outlook.com', 'Class 12', '1', '2']
        ]}
        onImport={() => {
          fetchRoster();
          addToast('Bulk import processed (UI Only)', 'success');
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingStudent}
        onClose={() => setDeletingStudent(null)}
        title="Delete Student"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingStudent(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteStudent}
              disabled={deleting}
              className="flex items-center gap-1.5 font-bold"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-full bg-red-50 text-red-500 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm text-slate-700">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deletingStudent?.full_name}</strong> from the roster?
            </p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This is a <strong>soft delete</strong> — the record will be hidden from the roster but its historical
              data (enrollments, fees, documents) will be preserved. This action cannot be undone from this screen.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
