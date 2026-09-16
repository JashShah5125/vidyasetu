import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  User, Phone, Briefcase, GitBranch, BookOpen,
  DollarSign, FileText, Shield, CheckCircle,
  ChevronRight, ChevronLeft, ArrowLeft, Check, Loader2,
  Filter, Search, X, Layers, AlertTriangle, Edit3, Trash2
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { staffApi } from '../services/staffApi';
import { subjectApi } from '../services/subjectApi';
import { branchApi } from '../services/branchApi';
import { roleApi, type RoleItem } from '../services/roleApi';
import { batchApi, type Batch } from '../services/batchApi';

// ─── Tab Config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'branch', label: 'Branch & Role', icon: GitBranch },
  { id: 'teacher', label: 'Teacher Info', icon: BookOpen },
  { id: 'salary', label: 'Salary & Payroll', icon: DollarSign },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'review', label: 'Review & Create', icon: CheckCircle },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 mt-6 pb-2 border-b border-slate-100 first:mt-0">{children}</h3>
);

const FieldGrid: React.FC<{ cols?: number; children: React.ReactNode }> = ({ cols = 3, children }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>{children}</div>
);

const MultiSelect: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}> = ({ label, options = [], selected = [], onChange }) => {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg bg-white min-h-[42px]">
        {options.map((opt, optIdx) => {
          const strVal = typeof opt === 'string' ? opt : ((opt as any)?.name || (opt as any)?.label || String(opt || ''));
          return (
            <button
              key={`${strVal}-${optIdx}`}
              type="button"
              onClick={() => toggle(strVal)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${selected.includes(strVal)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
            >
              {strVal}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const StaffCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const staffData = state?.staffData;
  const isEditMode = !!id;
  const [isViewOnly, setIsViewOnly] = useState(Boolean(state?.viewOnly));

  const { branches, addToast, currentUser } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin';
  const [activeTab, setActiveTab] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await staffApi.delete(id);
      addToast(`Staff member "${form.firstName} ${form.lastName}".trim() deleted successfully.`, 'success');
      setDeleteModalOpen(false);
      navigate('/staff');
    } catch (err: any) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to delete staff member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };
  const [dbSubjects, setDbSubjects] = useState<Array<{ id: number; name: string; code?: string; type?: string; description?: string }>>([]);
  const [filteredDbSubjects, setFilteredDbSubjects] = useState<Array<{ id: number; name: string; code?: string; type?: string; description?: string }>>([]);
  const [dbBranches, setDbBranches] = useState<Array<{ id: number; name: string; code?: string; city?: string }>>([]);
  const [dbRoles, setDbRoles] = useState<RoleItem[]>([]);
  const [dbBatches, setDbBatches] = useState<Batch[]>([]);

  // Batch Mapping Filter States
  const [courseFilter, setCourseFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  // Subject Mapping Filter States
  const [subjectCourseFilter, setSubjectCourseFilter] = useState('');
  const [subjectProgramFilter, setSubjectProgramFilter] = useState('');
  const [subjectLevelFilter, setSubjectLevelFilter] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '', gender: '', dob: '',
    aadhaar: '', pan: '',
    mobile: '', alternateMobile: '', email: '',
    address: '', city: '', state: '', country: 'India', pinCode: '',
    employeeType: 'Teaching' as 'Teaching' | 'Non-Teaching',
    designation: '', department: '', joiningDate: '', employmentType: 'Full-Time' as any,
    employmentStatus: 'Active' as any, experience: '', qualification: '',
    assignedBranchIds: [] as number[],
    primaryBranchId: null as number | null,
    roles: [] as string[],
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as string[],
    subjects: [] as string[],
    allocatedBatchIds: [] as number[],
    preferredBatches: [] as string[], maxLecturesPerDay: '', maxLecturesPerWeek: '',
    preferredWorkingHours: '',
    salaryType: 'Monthly' as any, monthlySalary: '', hourlyRate: '', contractAmount: '',
    bankName: '', accountHolder: '', accountNumber: '', ifsc: '', upiId: '',
  });

  // Fetch branches from API
  useEffect(() => {
    branchApi.list({ limit: 100 })
      .then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setDbBranches(list.map((b: any) => ({
            id: Number(b.id),
            name: b.name || b.branch_name || `Branch ${b.id}`,
            code: b.code || b.branch_code || '',
            city: b.city || ''
          })));
        }
      })
      .catch(err => {
        console.error('Failed to fetch branches in StaffCreate:', err);
      });
  }, []);

  const availableBranches = (dbBranches.length > 0
    ? dbBranches
    : (branches || []).map((b: any, idx: number) => ({
        id: Number(b.id || idx + 1),
        name: typeof b === 'string' ? b : (b.name || (b as any).branch_name || `Branch ${idx + 1}`),
        code: typeof b === 'string' ? '' : (b.code || ''),
        city: typeof b === 'string' ? '' : (b.city || '')
      }))).filter(b => b.name);

  const authorizedBranchObj = isBranchAdmin
    ? availableBranches.find(b => b.name === currentUser?.branch || String(b.id) === String(currentUser?.branch)) || availableBranches[0]
    : null;
  const authorizedBranchId = authorizedBranchObj ? authorizedBranchObj.id : null;

  const activeBranchId = isBranchAdmin
    ? authorizedBranchId
    : (form.primaryBranchId || form.assignedBranchIds[0] || (availableBranches[0]?.id) || null);

  // Auto-lock branch for Branch Admin in create mode
  useEffect(() => {
    if (isBranchAdmin && authorizedBranchId && !isEditMode) {
      setForm(prev => ({
        ...prev,
        assignedBranchIds: [authorizedBranchId],
        primaryBranchId: authorizedBranchId
      }));
    }
  }, [isBranchAdmin, authorizedBranchId, isEditMode]);

  // Fetch branch-assigned courses and programs strictly from branch API
  const [branchAssignedCourses, setBranchAssignedCourses] = useState<Array<{
    id: string | number;
    name: string;
    code?: string;
    assigned_programs?: Array<{ id: string | number; name: string; code?: string }>;
    programs?: Array<{ id: string | number; name: string; code?: string }>;
  }>>([]);
  const [isBranchCoursesLoading, setIsBranchCoursesLoading] = useState(false);

  useEffect(() => {
    if (!activeBranchId) {
      setBranchAssignedCourses([]);
      return;
    }
    setIsBranchCoursesLoading(true);
    branchApi.getCourses(activeBranchId, { assignment_status: 'assigned' })
      .then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        setBranchAssignedCourses(Array.isArray(list) ? list : []);
      })
      .catch(err => {
        console.error('Failed to fetch assigned courses for branch in StaffCreate:', err);
        setBranchAssignedCourses([]);
      })
      .finally(() => {
        setIsBranchCoursesLoading(false);
      });
  }, [activeBranchId]);

  // Fetch batches scoped to active branch for teacher mapping
  useEffect(() => {
    batchApi.list({ limit: 500, branch: activeBranchId ? String(activeBranchId) : undefined })
      .then(res => {
        const list = res?.data?.batches || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list)) {
          setDbBatches(list);
        }
      })
      .catch(err => {
        console.error('Failed to fetch batches in StaffCreate:', err);
      });
  }, [activeBranchId]);

  // Fetch roles from API (only existing roles from roles table)
  useEffect(() => {
    roleApi.list()
      .then(res => {
        const list = Array.isArray(res) ? res : [];
        setDbRoles(list);
      })
      .catch(err => {
        console.error('Failed to fetch roles in StaffCreate:', err);
      });
  }, []);

  // Fetch all available subjects from API for fallback and lookup
  useEffect(() => {
    subjectApi.list({ limit: 500 })
      .then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            code: s.code || '',
            type: s.type || 'core',
            description: s.description || ''
          }));
          setDbSubjects(mapped);
          setFilteredDbSubjects(mapped);
        }
      })
      .catch(err => {
        console.error('Failed to fetch subjects in StaffCreate:', err);
      });
  }, []);

  // Fetch filtered subjects whenever subject filters change
  useEffect(() => {
    subjectApi.list({
      limit: 500,
      courseId: subjectCourseFilter || undefined,
      programId: subjectProgramFilter || undefined,
      levelId: subjectLevelFilter || undefined,
      search: subjectSearch || undefined
    })
      .then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list)) {
          setFilteredDbSubjects(list.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            code: s.code || '',
            type: s.type || 'core',
            description: s.description || ''
          })));
        }
      })
      .catch(err => {
        console.error('Failed to fetch filtered subjects:', err);
      });
  }, [subjectCourseFilter, subjectProgramFilter, subjectLevelFilter, subjectSearch]);

  // Filter out non-staff roles and administrative roles for Branch Admin
  const FORBIDDEN_ADMIN_ROLES = ['institute_admin', 'inst_admin', 'saas_admin', 'branch_admin', 'super_admin', 'owner', 'platform_admin'];
  const availableRoles = (dbRoles.length > 0
    ? dbRoles.filter(r => {
        const code = (r.code || '').toLowerCase().replace(/[\s-]+/g, '_');
        if (['student', 'parent', 'saas_admin'].includes(code)) return false;
        if (isBranchAdmin && FORBIDDEN_ADMIN_ROLES.includes(code)) return false;
        return true;
      })
    : []
  ).map(r => r.name);

  // Derived unique dropdown filter options for Batches - strictly scoped to branch-assigned courses & programs
  const availableCourseOptions = branchAssignedCourses.map(c => ({
    value: String(c.id),
    label: c.name
  }));

  const availableProgramOptions = Array.from(
    new Map(
      branchAssignedCourses
        .filter(c => !courseFilter || String(c.id) === String(courseFilter) || c.name === courseFilter)
        .flatMap(c => {
          const progs = (c.assigned_programs && c.assigned_programs.length > 0)
            ? c.assigned_programs
            : (c.programs || []);
          return progs.map((p: any) => [String(p.id), { value: String(p.id), label: p.name }]);
        })
    ).values()
  );

  const availableLevelOptions = Array.from(
    new Map(
      dbBatches
        .filter(b => {
          if (activeBranchId && Number(b.branchId) !== Number(activeBranchId)) return false;
          if (courseFilter && String(b.courseId) !== String(courseFilter) && b.courseName !== courseFilter) return false;
          if (programFilter && String(b.programId) !== String(programFilter) && b.programName !== programFilter) return false;
          return Boolean(b.levelId && b.levelName);
        })
        .map(b => [String(b.levelId), { value: String(b.levelId), label: b.levelName }])
    ).values()
  );

  // Derived unique dropdown filter options for Subjects - strictly scoped to branch-assigned courses & programs
  const availableSubjectCourseOptions = availableCourseOptions;

  const availableSubjectProgramOptions = Array.from(
    new Map(
      branchAssignedCourses
        .filter(c => !subjectCourseFilter || String(c.id) === String(subjectCourseFilter) || c.name === subjectCourseFilter)
        .flatMap(c => {
          const progs = (c.assigned_programs && c.assigned_programs.length > 0)
            ? c.assigned_programs
            : (c.programs || []);
          return progs.map((p: any) => [String(p.id), { value: String(p.id), label: p.name }]);
        })
    ).values()
  );

  const availableSubjectLevelOptions = Array.from(
    new Map(
      dbBatches
        .filter(b => {
          if (activeBranchId && Number(b.branchId) !== Number(activeBranchId)) return false;
          if (subjectCourseFilter && String(b.courseId) !== String(subjectCourseFilter) && b.courseName !== subjectCourseFilter) return false;
          if (subjectProgramFilter && String(b.programId) !== String(subjectProgramFilter) && b.programName !== subjectProgramFilter) return false;
          return Boolean(b.levelId && b.levelName);
        })
        .map(b => [String(b.levelId), { value: String(b.levelId), label: b.levelName }])
    ).values()
  );

  const filteredBatches = dbBatches.filter(b => {
    if (activeBranchId && Number(b.branchId) !== Number(activeBranchId)) return false;
    if (courseFilter && String(b.courseId) !== String(courseFilter) && b.courseName !== courseFilter) return false;
    if (programFilter && String(b.programId) !== String(programFilter) && b.programName !== programFilter) return false;
    if (levelFilter && String(b.levelId) !== String(levelFilter) && b.levelName !== levelFilter) return false;
    if (batchSearch) {
      const q = batchSearch.toLowerCase();
      const matchName = b.name?.toLowerCase().includes(q);
      const matchCode = b.code?.toLowerCase().includes(q);
      const matchCourse = b.courseName?.toLowerCase().includes(q);
      const matchBranch = b.branchName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchCourse && !matchBranch) return false;
    }
    return true;
  });

  const toggleBatchAllocation = (batchId: number) => {
    setForm(prev => ({
      ...prev,
      allocatedBatchIds: prev.allocatedBatchIds.includes(batchId)
        ? prev.allocatedBatchIds.filter(id => id !== batchId)
        : [...prev.allocatedBatchIds, batchId]
    }));
  };

  const toggleSubject = (subjectName: string) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectName)
        ? prev.subjects.filter(s => s !== subjectName)
        : [...prev.subjects, subjectName]
    }));
  };

  // Auto-select first branch for new staff if none assigned yet
  useEffect(() => {
    if (!isEditMode && availableBranches.length > 0 && form.assignedBranchIds.length === 0) {
      setForm(prev => ({
        ...prev,
        assignedBranchIds: [availableBranches[0].id],
        primaryBranchId: availableBranches[0].id
      }));
    }
  }, [availableBranches, isEditMode]);

  const populateFormData = (data: any) => {
    if (!data) return;
    
    // Parse branch IDs
    let parsedBranchIds: number[] = [];
    if (Array.isArray(data.branch_ids)) {
      parsedBranchIds = data.branch_ids.map(Number).filter(Boolean);
    } else if (typeof data.branch_ids === 'string') {
      try {
        const parsed = JSON.parse(data.branch_ids);
        if (Array.isArray(parsed)) {
          parsedBranchIds = parsed.map(Number).filter(Boolean);
        }
      } catch (e) {
        console.error('Error parsing branch_ids', e);
      }
    }

    if (parsedBranchIds.length === 0 && data.branch_id) {
      parsedBranchIds = [Number(data.branch_id)];
    }

    const primaryId = parsedBranchIds[0] || (availableBranches[0]?.id) || 1;

    // Parse subjects
    let staffSubjects: string[] = [];
    if (Array.isArray(data.subjects) && data.subjects.length > 0) {
      staffSubjects = data.subjects;
    } else if (data.subjects_taught && typeof data.subjects_taught === 'string') {
      staffSubjects = data.subjects_taught.split(', ').filter(Boolean);
    }

    // Parse working days
    let staffWorkingDays: string[] = [];
    if (Array.isArray(data.working_days) && data.working_days.length > 0) {
      staffWorkingDays = data.working_days;
    } else if (typeof data.working_days === 'string') {
      try {
        const parsed = JSON.parse(data.working_days);
        if (Array.isArray(parsed) && parsed.length > 0) staffWorkingDays = parsed;
      } catch (e) {
        // ignore
      }
    }

    // Parse allocated batch IDs
    let staffAllocatedBatchIds: number[] = [];
    if (Array.isArray(data.allocated_batch_ids)) {
      staffAllocatedBatchIds = data.allocated_batch_ids.map(Number).filter(Boolean);
    } else if (Array.isArray(data.allocated_batches)) {
      staffAllocatedBatchIds = data.allocated_batches.map((b: any) => Number(b.batch_id || b.id)).filter(Boolean);
    } else if (typeof data.allocated_batch_ids === 'string') {
      try {
        const parsed = JSON.parse(data.allocated_batch_ids);
        if (Array.isArray(parsed)) staffAllocatedBatchIds = parsed.map(Number).filter(Boolean);
      } catch (e) {}
    }

    setForm(prev => ({
      ...prev,
      firstName: data.first_name || data.name?.split(' ')[0] || '',
      middleName: data.middle_name || '',
      lastName: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
      gender: data.gender || '',
      dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
      aadhaar: data.aadhaar_number || '',
      pan: data.pan_number || '',
      mobile: data.contact_number || data.mobile || '',
      alternateMobile: data.alternate_mobile || '',
      email: data.email || '',
      address: data.address || data.current_address || data.permanent_address || '',
      city: data.city || '',
      state: data.state || '',
      pinCode: data.pincode || '',
      employeeType: data.employee_type || 'Teaching',
      designation: data.designation || '',
      department: data.department || '',
      joiningDate: data.joining_date ? new Date(data.joining_date).toISOString().split('T')[0] : '',
      employmentType: data.employment_type || 'Full-Time',
      employmentStatus: (data.status || 'Active').toLowerCase() === 'active' ? 'Active' : 'Inactive',
      experience: data.experience || '',
      qualification: data.qualification || '',
      assignedBranchIds: parsedBranchIds.length > 0 ? parsedBranchIds : [primaryId],
      primaryBranchId: primaryId,
      roles: data.role_name ? data.role_name.split(', ') : (data.role ? [data.role] : (data.employee_type === 'Teaching' ? ['Teacher'] : [])),
      workingDays: staffWorkingDays.length > 0 ? staffWorkingDays : prev.workingDays,
      subjects: staffSubjects.length > 0 ? staffSubjects : prev.subjects,
      allocatedBatchIds: (data.allocated_batch_ids !== undefined || data.allocated_batches !== undefined)
        ? staffAllocatedBatchIds
        : (staffAllocatedBatchIds.length > 0 ? staffAllocatedBatchIds : prev.allocatedBatchIds),
      maxLecturesPerDay: data.max_lectures_per_day?.toString() || '',
      maxLecturesPerWeek: data.max_lectures_per_week?.toString() || '',
      salaryType: data.salary_type || 'Monthly',
      monthlySalary: data.salary_amount ? String(data.salary_amount) : '',
      hourlyRate: data.salary_type === 'Hourly' && data.salary_amount ? String(data.salary_amount) : '',
      contractAmount: data.salary_type === 'Contract' && data.salary_amount ? String(data.salary_amount) : '',
      bankName: data.bank_name || '',
      accountNumber: data.bank_account_number || '',
      ifsc: data.bank_ifsc || '',
    }));
  };

  useEffect(() => {
    if (!isEditMode) return;

    // Use passed state data as immediate initial fill if present
    if (staffData) {
      populateFormData(staffData);
    }

    // Always fetch canonical fresh staff record from backend to guarantee complete relations (batches, subjects)
    if (id) {
      staffApi.getById(id)
        .then(res => {
          if (res?.data) {
            populateFormData(res.data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch staff by id:', err);
        });
    }
  }, [isEditMode, id]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const isTeacher = form.roles.includes('Teacher') || form.employeeType === 'Teaching';
  const tabList = TABS.filter(t => t.id !== 'teacher' || isTeacher);
  const currentTabId = tabList[activeTab]?.id;

  const toggleBranch = (branchId: number) => {
    setForm(prev => {
      const current = prev.assignedBranchIds;
      let next: number[];
      let nextPrimary = prev.primaryBranchId;

      if (current.includes(branchId)) {
        next = current.filter(id => id !== branchId);
        if (nextPrimary === branchId) {
          nextPrimary = next[0] || null;
        }
      } else {
        next = [...current, branchId];
        if (!nextPrimary) {
          nextPrimary = branchId;
        }
      }

      return {
        ...prev,
        assignedBranchIds: next,
        primaryBranchId: nextPrimary
      };
    });
  };

  const setPrimaryBranch = (branchId: number) => {
    setForm(prev => ({
      ...prev,
      assignedBranchIds: prev.assignedBranchIds.includes(branchId) ? prev.assignedBranchIds : [...prev.assignedBranchIds, branchId],
      primaryBranchId: branchId
    }));
  };

  const selectAllBranches = () => {
    setForm(prev => {
      const allIds = availableBranches.map(b => b.id);
      return {
        ...prev,
        assignedBranchIds: allIds,
        primaryBranchId: prev.primaryBranchId || allIds[0] || null
      };
    });
  };

  const clearAllBranches = () => {
    setForm(prev => ({
      ...prev,
      assignedBranchIds: [],
      primaryBranchId: null
    }));
  };

  const subjectOptions: string[] = dbSubjects.length > 0
    ? dbSubjects.map(s => s.name)
    : [
        'Physics', 'Mathematics', 'Chemistry', 'Biology', 'Zoology', 'Botany',
        'Science', 'Social Studies', 'English', 'Hindi', 'Marathi', 'Environmental Science',
        'Computer Science', 'Commerce', 'Economics'
      ];

  const validateStep = (tabId: string): { isValid: boolean; error?: string } => {
    if (tabId === 'basic') {
      if (!form.firstName.trim()) {
        return { isValid: false, error: 'Please enter First Name.' };
      }
      if (!form.lastName.trim()) {
        return { isValid: false, error: 'Please enter Last Name.' };
      }
      if (!form.gender) {
        return { isValid: false, error: 'Please select Gender.' };
      }
      if (!form.dob) {
        return { isValid: false, error: 'Please enter Date of Birth.' };
      }
    }
    if (tabId === 'contact') {
      const cleanMobile = form.mobile.replace(/[^0-9]/g, '');
      if (!form.mobile.trim() || cleanMobile.length < 10) {
        return { isValid: false, error: 'Please enter a valid 10-digit Mobile Number.' };
      }
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return { isValid: false, error: 'Please enter a valid Email Address.' };
      }
    }
    if (tabId === 'employment') {
      if (!form.employeeType) {
        return { isValid: false, error: 'Please select Employee Type.' };
      }
      if (!form.joiningDate) {
        return { isValid: false, error: 'Please enter Joining Date.' };
      }
    }
    if (tabId === 'branch') {
      const branches = form.assignedBranchIds.length > 0
        ? form.assignedBranchIds
        : (form.primaryBranchId ? [form.primaryBranchId] : (availableBranches[0] ? [availableBranches[0].id] : []));
      if (branches.length === 0) {
        return { isValid: false, error: 'Please assign at least one branch.' };
      }
      if (form.roles.length === 0) {
        return { isValid: false, error: 'Please assign at least one System Role.' };
      }
    }
    if (tabId === 'teacher' && isTeacher) {
      if (form.subjects.length === 0) {
        return { isValid: false, error: 'Please select at least one Subject for the teacher.' };
      }
    }
    return { isValid: true };
  };

  const handleTabClick = (targetIdx: number) => {
    if (isViewOnly) {
      setActiveTab(targetIdx);
      return;
    }
    if (targetIdx > activeTab) {
      for (let i = 0; i < targetIdx; i++) {
        const stepTab = tabList[i]?.id;
        const res = validateStep(stepTab);
        if (!res.isValid) {
          addToast(res.error || 'Please fill required details in previous steps.', 'error');
          setActiveTab(i);
          return;
        }
      }
    }
    setActiveTab(targetIdx);
  };

  const handleNextStep = () => {
    if (!isViewOnly) {
      const currentStepTab = tabList[activeTab]?.id;
      const res = validateStep(currentStepTab);
      if (!res.isValid) {
        addToast(res.error || 'Please complete all required fields before proceeding.', 'error');
        return;
      }
    }
    setActiveTab(i => Math.min(tabList.length - 1, i + 1));
  };

  const handleSubmit = async () => {
    if (!isViewOnly) {
      for (let i = 0; i < tabList.length; i++) {
        const stepTab = tabList[i]?.id;
        const res = validateStep(stepTab);
        if (!res.isValid) {
          addToast(res.error || 'Please complete all required fields.', 'error');
          setActiveTab(i);
          return;
        }
      }
    }
    setLoading(true);
    setErrorMsg('');
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    const empId = `EMP-${String(Date.now()).slice(-5)}`;
    
    // Multi-branch mapping
    const branchIds = form.assignedBranchIds.length > 0
      ? form.assignedBranchIds
      : (form.primaryBranchId ? [form.primaryBranchId] : (availableBranches[0] ? [availableBranches[0].id] : [1]));
    const primaryBranchId = form.primaryBranchId || branchIds[0] || 1;

    // Map selected subject names to subjectIds
    const subjectIds = form.subjects
      .map(sName => {
        const found = dbSubjects.find(s => s.name.toLowerCase() === sName.toLowerCase());
        return found ? found.id : null;
      })
      .filter(Boolean);

    // Map selected role names to roleIds from roles table
    const roleIds = form.roles
      .map(rName => {
        const found = dbRoles.find(
          r => r.name.toLowerCase() === rName.toLowerCase() ||
               r.code.toLowerCase() === rName.toLowerCase().replace(/[\s-]+/g, '_')
        );
        return found ? found.id : null;
      })
      .filter(Boolean);

    try {
      const payload = {
        employeeId: isEditMode ? (staffData?.employee_id || empId) : empId,
        firstName: form.firstName, middleName: form.middleName, lastName: form.lastName,
        name: fullName, gender: form.gender, dob: form.dob || null,
        aadhaar: form.aadhaar, pan: form.pan,
        mobile: form.mobile, alternateMobile: form.alternateMobile,
        email: form.email,
        address: form.address,
        city: form.city, state: form.state, pinCode: form.pinCode,
        employeeType: form.employeeType, designation: form.designation,
        department: form.department, joiningDate: form.joiningDate || null,
        employmentType: form.employmentType,
        employmentStatus: form.employmentStatus, experience: form.experience,
        qualification: form.qualification,
        primaryBranchId,
        branchIds,
        branch_ids: branchIds,
        roles: form.roles,
        roleIds,
        role: form.roles[0] || (form.employeeType === 'Teaching' ? 'Teacher' : ''),
        workingDays: form.workingDays,
        working_days: form.workingDays,
        subjects: form.subjects,
        subjectIds,
        allocatedBatchIds: form.allocatedBatchIds,
        batchIds: form.allocatedBatchIds,
        maxLecturesPerDay: isTeacher && form.maxLecturesPerDay ? Number(form.maxLecturesPerDay) : null,
        maxLecturesPerWeek: isTeacher && form.maxLecturesPerWeek ? Number(form.maxLecturesPerWeek) : null,
        salaryType: form.salaryType,
        monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : null,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
        contractAmount: form.contractAmount ? Number(form.contractAmount) : null,
        bankName: form.bankName, accountHolder: form.accountHolder,
        accountNumber: form.accountNumber, ifsc: form.ifsc, upiId: form.upiId,
        status: form.employmentStatus || 'Active',
      };

      if (isEditMode) {
        await staffApi.update(id!, payload);
      } else {
        await staffApi.create(payload);
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || `An error occurred while ${isEditMode ? 'updating' : 'creating'} the employee.`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Employee {isEditMode ? 'Updated' : 'Created'} Successfully!</h2>
          <p className="text-slate-500 mt-2">{fullName} has been {isEditMode ? 'updated' : 'added'} in the staff directory.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/staff')}>Back to Staff Directory</Button>
          {!isEditMode && <Button variant="primary" onClick={() => { setSubmitted(false); setActiveTab(0); }}>Add Another Employee</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => navigate('/staff')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={15} /> Staff Directory
          </button>
          <ChevronRight size={13} className="text-slate-300" />
          <span className="font-semibold text-slate-800">
            {isViewOnly ? 'Staff Profile Details' : isEditMode ? 'Edit Employee Details' : 'New Employee Registration'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isViewOnly && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsViewOnly(false)}
              className="flex items-center gap-1.5 font-semibold"
            >
              <Edit3 size={15} /> Edit Profile
            </Button>
          )}
          {isEditMode && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 size={15} /> Delete Staff
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {isViewOnly 
              ? `Staff Profile: ${form.firstName} ${form.lastName}`.trim() || 'Staff Profile'
              : isEditMode 
                ? `Edit Profile: ${form.firstName} ${form.lastName}`.trim() 
                : 'New Employee Registration'}
          </h1>
          {isViewOnly && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              View Only
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {isViewOnly 
            ? 'Review staff details, contact info, employment attributes, branch allocations, and system credentials.' 
            : 'Fill in each section. Teacher-specific fields appear automatically based on assigned roles.'}
        </p>
      </div>

      <div className="flex border-b border-slate-200 gap-2 flex-wrap bg-white rounded-xl shadow-sm px-2 pt-2">
        {tabList.map((tab, idx) => {
          const isActive = idx === activeTab;
          const isDone = idx < activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(idx)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
                }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                } text-[10px] font-bold`}>
              {isDone ? <Check size={10} strokeWidth={3} /> : idx + 1}
              </div>
              <span className={`text-xs font-semibold ${isActive ? 'text-blue-700' : isDone ? 'text-slate-600' : 'text-slate-500'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          {React.createElement(tabList[activeTab].icon, { size: 20, className: 'text-blue-600 flex-shrink-0' })}
          <div>
            <h2 className="font-bold text-slate-900">{tabList[activeTab].label}</h2>
            <p className="text-xs text-slate-400">Step {activeTab + 1} of {tabList.length}</p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[500px]">

          {/* BASIC INFO */}
          {currentTabId === 'basic' && (
            <div className="space-y-5">
              <SectionTitle>Personal Identity</SectionTitle>
              <FieldGrid>
                <Input label="First Name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="e.g. Arvind" />
                <Input label="Middle Name" value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Optional" />
                <Input label="Last Name *" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="e.g. Kelkar" />
              </FieldGrid>
              <FieldGrid cols={2}>
                <Select label="Gender *" value={form.gender} onChange={e => set('gender', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
                <Input label="Date of Birth *" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </FieldGrid>
              <SectionTitle>Identity Documents</SectionTitle>
              <FieldGrid cols={2}>
                <Input label="Aadhaar Number" value={form.aadhaar} onChange={e => set('aadhaar', e.target.value)} placeholder="XXXX XXXX XXXX" />
                <Input label="PAN Number" value={form.pan} onChange={e => set('pan', e.target.value)} placeholder="e.g. ABCDE1234F" />
              </FieldGrid>
            </div>
          )}

          {/* CONTACT */}
          {currentTabId === 'contact' && (
            <div className="space-y-5">
              <SectionTitle>Phone & Email</SectionTitle>
              <FieldGrid>
                <Input label="Mobile Number *" type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit number" />
                <Input label="Alternate Mobile" type="tel" value={form.alternateMobile} onChange={e => set('alternateMobile', e.target.value)} placeholder="Optional" />
                <Input label="Email Address *" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@institute.com" />
              </FieldGrid>
              <SectionTitle>Address Details</SectionTitle>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Address</label>
                <textarea rows={3} value={form.address} onChange={e => set('address', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none" placeholder="House/Flat No, Building, Street, Area..." />
              </div>
              <FieldGrid>
                <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Mumbai" />
                <Input label="State" value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Maharashtra" />
                <Input label="PIN Code" value={form.pinCode} onChange={e => set('pinCode', e.target.value)} placeholder="6-digit PIN" />
              </FieldGrid>
            </div>
          )}

          {/* EMPLOYMENT */}
          {currentTabId === 'employment' && (
            <div className="space-y-5">
              <SectionTitle>Employee Classification</SectionTitle>
              <FieldGrid>
                <Select label="Employee Type *" value={form.employeeType} onChange={e => set('employeeType', e.target.value)}
                  options={[{ value: 'Teaching', label: 'Teaching' }, { value: 'Non-Teaching', label: 'Non-Teaching' }]} />
                <Input label="Designation (HR Title)" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Senior Physics Teacher" />
                <Select label="Department" value={form.department} onChange={e => set('department', e.target.value)}
                  options={[{ value: '', label: 'Select' }, { value: 'Academics', label: 'Academics' }, { value: 'Finance', label: 'Finance' }, { value: 'HR', label: 'HR' }, { value: 'Administration', label: 'Administration' }, { value: 'Admissions', label: 'Admissions' }]} />
              </FieldGrid>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <strong>Note:</strong> "Designation" is the HR title (e.g., Senior Physics Teacher). System roles with permissions are assigned in the next step.
              </div>
              <SectionTitle>Service Details</SectionTitle>
              <FieldGrid>
                <Input label="Joining Date *" type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} />
                <Select label="Employment Type" value={form.employmentType} onChange={e => set('employmentType', e.target.value)}
                  options={[{ value: 'Full-Time', label: 'Full-Time' }, { value: 'Part-Time', label: 'Part-Time' }, { value: 'Contract', label: 'Contract' }, { value: 'Visiting', label: 'Visiting' }]} />
                <Select label="Employment Status" value={form.employmentStatus} onChange={e => set('employmentStatus', e.target.value)}
                  options={[{ value: 'Active', label: 'Active' }, { value: 'On Leave', label: 'On Leave' }, { value: 'Resigned', label: 'Resigned' }, { value: 'Terminated', label: 'Terminated' }]} />
              </FieldGrid>
              <FieldGrid cols={2}>
                <Input label="Experience (Years)" value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="e.g. 5" />
                <Input label="Qualification" value={form.qualification} onChange={e => set('qualification', e.target.value)} placeholder="e.g. M.Sc Physics, B.Ed" />
              </FieldGrid>
            </div>
          )}

          {/* BRANCH & ROLE */}
          {currentTabId === 'branch' && (
            <div className="space-y-6">
              {isBranchAdmin ? (
                <div>
                  <SectionTitle>Branch Assignment</SectionTitle>
                  <p className="text-xs text-slate-500 -mt-2 mb-3">
                    New staff registrations and batch assignments are automatically tied to your authorized branch.
                  </p>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Branch</span>
                      <strong className="text-base font-bold text-slate-900">{authorizedBranchObj?.name || currentUser?.branch || 'Authorized Branch'}</strong>
                      {authorizedBranchObj?.city && (
                        <span className="text-xs text-slate-500 ml-2 font-medium">({authorizedBranchObj.city})</span>
                      )}
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      ★ Active Branch Scope
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <SectionTitle>Branch Assignment</SectionTitle>
                      <p className="text-xs text-slate-500 -mt-2">
                        Assign all branches where this staff member operates. Click to select multiple branches and designate one as the Primary Branch.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        form.assignedBranchIds.length > 0
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {form.assignedBranchIds.length} {form.assignedBranchIds.length === 1 ? 'Branch' : 'Branches'} Assigned
                      </span>
                      <button
                        type="button"
                        onClick={selectAllBranches}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllBranches}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
                    {availableBranches.map(branch => {
                      const isSelected = form.assignedBranchIds.includes(branch.id);
                      const isPrimary = form.primaryBranchId === branch.id || (!form.primaryBranchId && form.assignedBranchIds[0] === branch.id);

                      return (
                        <div
                          key={branch.id}
                          onClick={() => toggleBranch(branch.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">{branch.name}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {branch.code && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {branch.code}
                                  </span>
                                )}
                                {branch.city && (
                                  <span className="text-xs text-slate-500">{branch.city}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                              {isPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  ★ Primary Branch
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrimaryBranch(branch.id);
                                  }}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Set as Primary
                                </button>
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Assigned</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {form.assignedBranchIds.length === 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                      <span>Please assign at least one branch for this employee.</span>
                    </div>
                  )}
                </div>
              )}

              <SectionTitle>System Role Assignment</SectionTitle>
              <p className="text-xs text-slate-500 -mt-3 mb-2">
                One employee can have multiple roles. Adding "Teacher" reveals the Teacher Information tab.
              </p>
              <MultiSelect label="System Roles *" options={availableRoles} selected={form.roles} onChange={v => set('roles', v)} />
              {isTeacher && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700">
                  <Check size={13} strokeWidth={3} /> Teacher role detected — Teacher Information tab is now visible in the sidebar.
                </div>
              )}
              <SectionTitle>Schedule</SectionTitle>
              <MultiSelect label="Working Days" options={DAYS} selected={form.workingDays} onChange={v => set('workingDays', v)} />
            </div>
          )}

          {/* TEACHER INFO */}
          {currentTabId === 'teacher' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <BookOpen size={16} className="text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-medium">This section appears because "Teacher" is assigned as a system role.</p>
              </div>

              {/* Teacher-to-Subject Mapping Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <SectionTitle>Teacher to Subject Mapping</SectionTitle>
                    <p className="text-xs text-slate-500 -mt-3">
                      Filter by Course, Program, and Academic Level to assign subjects taught by this teacher across any stream.
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${
                    form.subjects.length > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {form.subjects.length} {form.subjects.length === 1 ? 'Subject' : 'Subjects'} Mapped
                  </span>
                </div>

                {/* Dropdown Filters & Search */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <Filter size={14} className="text-blue-600" />
                    <span>Filter Subjects</span>
                    {(subjectCourseFilter || subjectProgramFilter || subjectLevelFilter || subjectSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectCourseFilter('');
                          setSubjectProgramFilter('');
                          setSubjectLevelFilter('');
                          setSubjectSearch('');
                        }}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
                      >
                        <X size={12} /> Clear Filters
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <Select
                      label="Course"
                      value={subjectCourseFilter}
                      onChange={e => {
                        setSubjectCourseFilter(e.target.value);
                        setSubjectProgramFilter('');
                        setSubjectLevelFilter('');
                      }}
                      options={[{ value: '', label: 'All Courses' }, ...availableSubjectCourseOptions]}
                    />
                    <Select
                      label="Program"
                      value={subjectProgramFilter}
                      onChange={e => {
                        setSubjectProgramFilter(e.target.value);
                        setSubjectLevelFilter('');
                      }}
                      options={[{ value: '', label: 'All Programs' }, ...availableSubjectProgramOptions]}
                    />
                    <Select
                      label="Academic Level"
                      value={subjectLevelFilter}
                      onChange={e => setSubjectLevelFilter(e.target.value)}
                      options={[{ value: '', label: 'All Levels' }, ...availableSubjectLevelOptions]}
                    />
                    <Input
                      label="Search Subjects"
                      value={subjectSearch}
                      onChange={e => setSubjectSearch(e.target.value)}
                      placeholder="Subject name, code, etc."
                    />
                  </div>
                </div>

                {/* Selected Subjects Chips Summary */}
                {form.subjects.length > 0 && (
                  <div className="mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen size={13} className="text-blue-600" />
                        Selected Subjects ({form.subjects.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, subjects: [] }))}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                      >
                        Clear All Mapped Subjects
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.subjects.map(sName => {
                        const sub = dbSubjects.find(s => s.name.toLowerCase() === sName.toLowerCase());
                        return (
                          <div
                            key={sName}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs shadow-xs font-medium"
                          >
                            <span className="font-bold">{sName}</span>
                            {sub?.code && (
                              <span className="text-[10px] text-slate-500 font-mono">({sub.code})</span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleSubject(sName)}
                              className="text-slate-400 hover:text-red-600 transition-colors ml-1"
                              title="Remove subject mapping"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Matching Subjects List */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Showing {filteredDbSubjects.length} {filteredDbSubjects.length === 1 ? 'subject' : 'subjects'}
                    </span>
                    {filteredDbSubjects.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const names = filteredDbSubjects.map(s => s.name);
                            setForm(prev => ({
                              ...prev,
                              subjects: Array.from(new Set([...prev.subjects, ...names]))
                            }));
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                        >
                          Select All Visible
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const names = filteredDbSubjects.map(s => s.name);
                            setForm(prev => ({
                              ...prev,
                              subjects: prev.subjects.filter(name => !names.includes(name))
                            }));
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                        >
                          Deselect Visible
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredDbSubjects.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <BookOpen size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No subjects match the selected filters</p>
                      <p className="text-xs text-slate-400 mt-1">Try selecting different Course, Program, or Level filters above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                      {filteredDbSubjects.map(sub => {
                        const isSelected = form.subjects.includes(sub.name);
                        return (
                          <div
                            key={sub.id || sub.name}
                            onClick={() => toggleSubject(sub.name)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{sub.name}</h4>
                                  {sub.code && (
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {sub.code}
                                    </span>
                                  )}
                                </div>
                                {sub.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{sub.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {sub.type && (
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                      {sub.type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              <span className={isSelected ? 'text-blue-700 font-bold uppercase tracking-wider' : 'text-slate-400'}>
                                {isSelected ? 'Mapped to Teacher' : 'Click to map'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Teacher-to-Batch Mapping Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <SectionTitle>Teacher to Batch Mapping</SectionTitle>
                    <p className="text-xs text-slate-500 -mt-3">
                      Filter by Course, Program, and Academic Level to assign this teacher to multiple batches across any stream.
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${
                    form.allocatedBatchIds.length > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {form.allocatedBatchIds.length} {form.allocatedBatchIds.length === 1 ? 'Batch' : 'Batches'} Mapped
                  </span>
                </div>

                {/* Dropdown Filters & Search */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <Filter size={14} className="text-blue-600" />
                    <span>Filter Batches</span>
                    {(courseFilter || programFilter || levelFilter || batchSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCourseFilter('');
                          setProgramFilter('');
                          setLevelFilter('');
                          setBatchSearch('');
                        }}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
                      >
                        <X size={12} /> Clear Filters
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <Select
                      label="Course"
                      value={courseFilter}
                      onChange={e => {
                        setCourseFilter(e.target.value);
                        setProgramFilter('');
                        setLevelFilter('');
                      }}
                      options={[{ value: '', label: 'All Courses' }, ...availableCourseOptions]}
                    />
                    <Select
                      label="Program"
                      value={programFilter}
                      onChange={e => {
                        setProgramFilter(e.target.value);
                        setLevelFilter('');
                      }}
                      options={[{ value: '', label: 'All Programs' }, ...availableProgramOptions]}
                    />
                    <Select
                      label="Academic Level"
                      value={levelFilter}
                      onChange={e => setLevelFilter(e.target.value)}
                      options={[{ value: '', label: 'All Levels' }, ...availableLevelOptions]}
                    />
                    <Input
                      label="Search Batches"
                      value={batchSearch}
                      onChange={e => setBatchSearch(e.target.value)}
                      placeholder="Batch name, code, etc."
                    />
                  </div>
                </div>

                {/* Selected Batches Chips Summary */}
                {form.allocatedBatchIds.length > 0 && (
                  <div className="mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={13} className="text-blue-600" />
                        Selected Batches ({form.allocatedBatchIds.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, allocatedBatchIds: [] }))}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                      >
                        Clear All Mapped Batches
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.allocatedBatchIds.map(batchId => {
                        const batch = dbBatches.find(b => Number(b.id) === batchId);
                        return (
                          <div
                            key={batchId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs shadow-xs font-medium"
                          >
                            <span className="font-bold">{batch?.name || `Batch #${batchId}`}</span>
                            {batch?.courseName && (
                              <span className="text-[10px] text-slate-500">({batch.courseName})</span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleBatchAllocation(batchId)}
                              className="text-slate-400 hover:text-red-600 transition-colors ml-1"
                              title="Remove batch mapping"
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Matching Batches List */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Showing {filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'}
                    </span>
                    {filteredBatches.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredBatches.map(b => Number(b.id));
                            setForm(prev => ({
                              ...prev,
                              allocatedBatchIds: Array.from(new Set([...prev.allocatedBatchIds, ...filteredIds]))
                            }));
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                        >
                          Select All Visible
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const filteredIds = filteredBatches.map(b => Number(b.id));
                            setForm(prev => ({
                              ...prev,
                              allocatedBatchIds: prev.allocatedBatchIds.filter(id => !filteredIds.includes(id))
                            }));
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                        >
                          Deselect Visible
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredBatches.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No batches match the selected filters</p>
                      <p className="text-xs text-slate-400 mt-1">Try selecting different Course, Program, or Level filters above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                      {filteredBatches.map(batch => {
                        const batchId = Number(batch.id);
                        const isAllocated = form.allocatedBatchIds.includes(batchId);
                        return (
                          <div
                            key={batch.id}
                            onClick={() => toggleBatchAllocation(batchId)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between gap-2.5 ${
                              isAllocated
                                ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isAllocated ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isAllocated && <Check size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{batch.name}</h4>
                                  {batch.code && (
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {batch.code}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                                  {batch.courseName && (
                                    <div className="truncate font-medium text-slate-700">📚 {batch.courseName}</div>
                                  )}
                                  {(batch.programName || batch.levelName) && (
                                    <div className="truncate text-[10px] text-slate-500">
                                      {[batch.programName, batch.levelName].filter(Boolean).join(' • ')}
                                    </div>
                                  )}
                                  {batch.branchName && (
                                    <div className="truncate text-[10px] text-slate-400">
                                      🏢 {batch.branchName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                              <span className={isAllocated ? 'text-blue-700 font-bold uppercase tracking-wider' : 'text-slate-400'}>
                                {isAllocated ? 'Mapped to Teacher' : 'Click to map'}
                              </span>
                              {batch.status && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                                  {batch.status}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Timetable Preferences */}
              <div>
                <SectionTitle>Timetable Preferences</SectionTitle>
                <FieldGrid>
                  <Input label="Max Lectures / Day" type="number" value={form.maxLecturesPerDay} onChange={e => set('maxLecturesPerDay', e.target.value)} placeholder="e.g. 4" />
                  <Input label="Max Lectures / Week" type="number" value={form.maxLecturesPerWeek} onChange={e => set('maxLecturesPerWeek', e.target.value)} placeholder="e.g. 20" />
                  <Input label="Preferred Working Hours" value={form.preferredWorkingHours} onChange={e => set('preferredWorkingHours', e.target.value)} placeholder="e.g. 9 AM – 4 PM" />
                </FieldGrid>
              </div>
            </div>
          )}

          {/* SALARY & PAYROLL */}
          {currentTabId === 'salary' && (
            <div className="space-y-5">
              <SectionTitle>Salary Structure</SectionTitle>
              <FieldGrid cols={2}>
                <Select label="Salary Type" value={form.salaryType} onChange={e => set('salaryType', e.target.value)}
                  options={[{ value: 'Monthly', label: 'Monthly Fixed' }, { value: 'Hourly', label: 'Hourly Rate' }, { value: 'Contract', label: 'Contract Amount' }]} />
                {form.salaryType === 'Monthly' && <Input label="Monthly Salary (₹)" type="number" value={form.monthlySalary} onChange={e => set('monthlySalary', e.target.value)} placeholder="e.g. 50000" />}
                {form.salaryType === 'Hourly' && <Input label="Hourly Rate (₹)" type="number" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} placeholder="e.g. 500" />}
                {form.salaryType === 'Contract' && <Input label="Contract Amount (₹)" type="number" value={form.contractAmount} onChange={e => set('contractAmount', e.target.value)} placeholder="e.g. 200000" />}
              </FieldGrid>
              <SectionTitle>Bank Details</SectionTitle>
              <FieldGrid>
                <Input label="Bank Name" value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. HDFC Bank" />
                <Input label="Account Holder Name" value={form.accountHolder} onChange={e => set('accountHolder', e.target.value)} placeholder="As per bank records" />
                <Input label="Account Number" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="XXXXXXXX" />
              </FieldGrid>
              <FieldGrid cols={2}>
                <Input label="IFSC Code" value={form.ifsc} onChange={e => set('ifsc', e.target.value)} placeholder="e.g. HDFC0001234" />
                <Input label="UPI ID (Optional)" value={form.upiId} onChange={e => set('upiId', e.target.value)} placeholder="name@upi" />
              </FieldGrid>
            </div>
          )}

          {/* DOCUMENTS */}
          {currentTabId === 'documents' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                <strong className="block mb-1">📎 Document Upload</strong>
                Document uploading will be available once cloud storage is configured. You can upload documents from the employee profile page after creation.
              </div>
              <SectionTitle>Documents Checklist</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {['Aadhaar Card', 'PAN Card', 'Resume / CV', 'Appointment Letter', 'Qualification Certificates', 'Experience Letters', 'Passport Photo', 'Police Verification'].map(doc => (
                  <div key={doc} className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500">
                    <FileText size={16} className="text-slate-300 flex-shrink-0" />
                    <span>{doc}</span>
                    <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-semibold whitespace-nowrap">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REVIEW */}
          {currentTabId === 'review' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-800">
                <strong>✅ Ready to {isEditMode ? 'Update' : 'Create'} Employee Profile</strong>
                <p className="mt-1 text-emerald-700">Review the information below. Click any step in the sidebar to go back and edit.</p>
              </div>
              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800">
                  <strong>❌ Error {isEditMode ? 'Updating' : 'Creating'} Employee</strong>
                  <p className="mt-1">{errorMsg}</p>
                </div>
              )}
              {[
                { title: 'Basic Information', rows: [['Name', [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')], ['Gender', form.gender], ['DOB', form.dob]] },
                { title: 'Contact & Login', rows: [['Mobile', form.mobile], ['Login Email', form.email], ['City', form.city], ['State', form.state]] },
                { title: 'Employment', rows: [['Type', form.employeeType], ['Designation', form.designation], ['Department', form.department], ['Joining Date', form.joiningDate], ['Employment Type', form.employmentType]] },
                { 
                  title: 'Branch & Role', 
                  rows: [
                    [
                      'Assigned Branches', 
                      availableBranches
                        .filter(b => form.assignedBranchIds.includes(b.id))
                        .map(b => (b.id === form.primaryBranchId || (!form.primaryBranchId && form.assignedBranchIds[0] === b.id)) ? `${b.name} (Primary)` : b.name)
                        .join(', ') || 'None Assigned'
                    ], 
                    ['System Roles', form.roles.join(', ')], 
                    ['Working Days', form.workingDays.join(', ')]
                  ] 
                },
                ...(isTeacher ? [{ 
                  title: 'Teacher Information', 
                  rows: [
                    [
                      'Mapped Subjects', 
                      form.subjects.length > 0 
                        ? `${form.subjects.length} Subjects (${form.subjects.slice(0, 5).join(', ')}${form.subjects.length > 5 ? '...' : ''})` 
                        : 'None Assigned'
                    ],
                    [
                      'Mapped Batches', 
                      form.allocatedBatchIds.length > 0 
                        ? `${form.allocatedBatchIds.length} Batches (${dbBatches.filter(b => form.allocatedBatchIds.includes(Number(b.id))).map(b => b.name || b.code).slice(0, 5).join(', ')}${form.allocatedBatchIds.length > 5 ? '...' : ''})` 
                        : 'None Assigned'
                    ],
                    ['Max Lec/Day', form.maxLecturesPerDay], 
                    ['Max Lec/Week', form.maxLecturesPerWeek], 
                    ['Working Hours', form.preferredWorkingHours]
                  ] 
                }] : []),
                { title: 'Salary', rows: [['Salary Type', form.salaryType], ['Bank', form.bankName], ['IFSC', form.ifsc]] },
              ].map(section => (
                <div key={section.title}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{section.title}</p>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100">
                    {section.rows.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} className="flex px-4 py-2.5 text-sm">
                        <span className="text-slate-500 w-40 flex-shrink-0">{k}</span>
                        <span className="font-semibold text-slate-800">{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-b-xl">
          <Button type="button" variant="secondary" onClick={() => setActiveTab(i => Math.max(0, i - 1))} disabled={activeTab === 0}>
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>
          <span className="text-xs text-slate-400 font-medium">Step {activeTab + 1} of {tabList.length}</span>
          {activeTab < tabList.length - 1 ? (
            <Button type="button" variant="primary" onClick={handleNextStep}>
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : isViewOnly ? (
            <Button type="button" variant="primary" onClick={() => setIsViewOnly(false)} className="flex items-center gap-1.5 font-semibold">
              <Edit3 size={16} className="mr-1" /> Edit Profile
            </Button>
          ) : (
            <Button type="button" variant="primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <CheckCircle size={16} className="mr-1.5" />}
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Employee' : 'Create Employee')}
            </Button>
          )}
        </div>
      </div>

      {/* Delete Staff Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete Staff Member"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3.5 p-1">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">
              Are you sure you want to delete <strong className="text-slate-900">{`${form.firstName || ''} ${form.lastName || ''}`.trim() || 'this staff member'}</strong>?
            </p>
            <p className="text-xs text-slate-500">
              This action will mark the staff member as <span className="font-semibold text-red-600">Deleted</span> and revoke their portal access immediately.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
