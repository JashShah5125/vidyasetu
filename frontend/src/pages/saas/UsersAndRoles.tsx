import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Key,
  Ban,
  CheckCircle2,
  Building2,
  RefreshCw,
  AlertTriangle,
  Mail,
  Phone,
  User,
  Shield,
  Lock,
  Layers,
  Sliders,
  ArrowLeft,
  Check,
  Search,
  GraduationCap,
  Briefcase,
  Calendar,
  MapPin,
  Activity,
  BookOpen,
  Heart,
  Award,
  Globe,
  Laptop,
  CreditCard,
  Clock,
  FileText,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';

interface UserRecord {
  id: number;
  tenant_id: number;
  name: string;
  email: string;
  mobile: string | null;
  user_type: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  app_access_suspended: number;
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
  tenant_name: string | null;
  tenant_slug: string | null;
  role_id: number | null;
  role_name: string | null;
  role_code: string | null;
}

interface AssignedRole {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_system: number;
  assigned_at: string;
}

interface RoleWisePermissionGroup {
  role_id: number;
  role_name: string;
  role_code: string;
  permissions: {
    id: number;
    module: string;
    action: string;
    code: string;
    description: string;
  }[];
}

interface UserOverrideRecord {
  id: number;
  permission_id: number;
  override_type: 'grant' | 'revoke';
  created_at: string;
  module: string;
  action: string;
  permission_code: string;
  description: string;
  base_role_status: 'Granted' | 'Not Granted';
  effective_status: 'Granted' | 'Denied';
}

interface AllPermissionRecord {
  id: number;
  module: string;
  action: string;
  code: string;
  description: string;
}

interface StudentInvoiceItem {
  id: number;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
}

interface StudentGuardian {
  id: number;
  full_name: string;
  relation: string;
  mobile: string;
  email: string | null;
  occupation: string | null;
  is_primary: number;
}

interface StudentEnrollment {
  enrollment_id: number;
  enrolled_date: string;
  enrollment_status: string;
  batch_id: number;
  batch_name: string;
  batch_code: string;
  level_name: string | null;
}

interface StudentProfile {
  id: number;
  student_code: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  mobile: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  category: string | null;
  school_name: string | null;
  current_class: string | null;
  target_exam: string | null;
  year_of_attempt: string | null;
  blood_group: string | null;
  status: string;
  primary_branch_id: number;
  primary_branch_name: string | null;
  primary_branch_code: string | null;
  created_at: string;
  guardians?: StudentGuardian[];
  enrollments?: StudentEnrollment[];
  invoices?: StudentInvoiceItem[];
  attendance_summary?: AttendanceSummary;
}

interface StaffProfile {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  contact_number: string | null;
  alternate_mobile: string | null;
  personal_email?: string | null;
  gender: string | null;
  dob: string | null;
  employee_type: string;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  employment_type: string;
  employment_status: string;
  qualification: string | null;
  experience: string | null;
  salary_type: string | null;
  salary_amount: number | null;
  salary_effective_from?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  tds_applicable?: number | boolean | null;
  professional_tax_applicable?: number | boolean | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  max_lectures_per_day?: number | null;
  max_lectures_per_week?: number | null;
  working_days?: any;
  biometric_mandatory?: number | boolean | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface TeacherAllocation {
  id: number;
  batch_id: number;
  batch_name: string;
  batch_code: string;
  level_name: string | null;
  branch_name: string | null;
}

interface LinkedWard {
  id: number;
  student_code: string;
  full_name: string;
  current_class: string | null;
  gender: string | null;
  school_name: string | null;
  status: string;
  branch_name: string | null;
  branch_code: string | null;
}

interface GuardianProfile {
  id: number;
  full_name: string;
  relation: string;
  mobile: string;
  email: string | null;
  occupation: string | null;
  created_at: string;
  linked_wards?: LinkedWard[];
}

interface BranchAccess {
  id: number;
  branch_id?: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_primary: number;
  granted_at?: string;
  created_at: string;
}

interface TenantSummary {
  id: number;
  name: string;
  slug: string;
  status: string | number;
  created_at: string;
  total_branches: number;
  total_students: number;
  total_staff: number;
}

interface UserSessionItem {
  id: number;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

type CounsellorRoleData = StaffProfile;

interface BranchAdminRoleData extends Partial<StaffProfile> {
  managed_branches?: {
    id: number;
    name: string;
    code: string;
    city: string | null;
    state: string | null;
    phone?: string | null;
    email?: string | null;
    operating_hours?: string | null;
    capacity?: number | null;
    is_primary: number;
    total_students: number;
    total_batches: number;
    total_classrooms?: number;
    total_staff?: number;
    total_invoices?: number;
    total_revenue_collected?: string | number;
  }[];
}

interface TeacherRoleData extends StaffProfile {
  allocations?: {
    id: number;
    batch_id: number;
    batch_name: string;
    batch_code: string;
    level_name?: string;
    branch_name?: string;
  }[];
  subjects?: {
    id: number;
    subject_id: number;
    subject_name: string;
    subject_code: string;
  }[];
  lecture_stats?: {
    total_assigned_lectures: number;
    conducted_lectures: number | string | null;
    upcoming_lectures: number | string | null;
    cancelled_lectures: number | string | null;
  };
  recent_lectures?: {
    id: number;
    lecture_date: string | null;
    start_time: string;
    end_time: string;
    topic: string | null;
    status: string;
    attendance_taken: number;
    batch_name: string;
    batch_code: string;
    subject_name: string;
  }[];
  homework_stats?: {
    total_homeworks: number;
  };
  recent_homeworks?: {
    id: number;
    title: string;
    assignment_type: string;
    due_date: string | null;
    max_marks: string | number;
    status: number;
    subject_name: string;
  }[];
  doubts_answered?: number;
  attendance_summary?: {
    total_marked_days: number;
    present_days: number | string | null;
    absent_days: number | string | null;
    attendance_rate?: number;
  };
  leave_summary?: {
    total_leaves: number;
    approved_leaves: number | string | null;
    pending_leaves: number | string | null;
  };
  salary_history?: {
    id: number;
    salary_month: number;
    salary_year: number;
    amount: string | number;
    paid_date: string;
    payment_mode: string;
    reference: string;
  }[];
}

interface UserRoleData {
  student?: StudentProfile & { exam_results?: any[]; doubt_stats?: any };
  teacher?: TeacherRoleData;
  parent?: GuardianProfile & { linked_wards?: any[] };
  counsellor?: CounsellorRoleData;
  finance?: FinanceRoleData;
  branch_admin?: BranchAdminRoleData;
  workspace_admin?: TenantSummary & { total_batches?: number; owner_name?: string; primary_email?: string };
}

interface UserFullDetails extends UserRecord {
  assigned_roles: AssignedRole[];
  role_wise_permissions: RoleWisePermissionGroup[];
  overridden_permissions?: UserOverrideRecord[];
  branch_access?: BranchAccess[];
  student_profile?: StudentProfile;
  staff_profile?: StaffProfile;
  teacher_allocations?: TeacherAllocation[];
  guardian_profile?: GuardianProfile;
  tenant_summary?: TenantSummary;
  recent_sessions?: UserSessionItem[];
  role_data?: UserRoleData;
}

interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_system: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  users_count: number;
  permissions_count: number;
  permission_ids?: number[];
}

interface PermissionItem {
  id: number;
  module: string;
  action: string;
  code: string;
  description: string;
}

interface TenantItem {
  id: number;
  name: string;
  slug: string;
  status: string;
}

interface InheritedPermissionRow {
  role_id: number;
  role_name: string;
  role_code: string;
  permission_id: number;
  module: string;
  action: string;
  permission_code: string;
  description: string;
}

export const UsersAndRoles: React.FC = () => {
  const { addToast } = useApp();

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<'users' | 'roles'>('users');

  // ================= USERS TAB STATE =================
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);

  const [userLoading, setUserLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // User Filters
  const [userSearch, setUserSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // FULL PAGE MANAGE USER STATE
  const [selectedManageUserId, setSelectedManageUserId] = useState<number | null>(null);
  const [manageUserTab, setManageUserTab] = useState<string>('profile');
  const [managedUser, setManagedUser] = useState<UserFullDetails | null>(null);
  const [manageLoading, setManageLoading] = useState(false);

  // Role-Wise Inherited Permissions Server-Side Pagination & Filtering State
  const [inheritedPermsList, setInheritedPermsList] = useState<InheritedPermissionRow[]>([]);
  const [inheritedPage, setInheritedPage] = useState(1);
  const [inheritedLimit, setInheritedLimit] = useState(10);
  const [inheritedTotalPages, setInheritedTotalPages] = useState(1);
  const [inheritedTotalCount, setInheritedTotalCount] = useState(0);
  const [inheritedSearch, setInheritedSearch] = useState('');
  const [inheritedRoleFilter, setInheritedRoleFilter] = useState('');
  const [inheritedLoading, setInheritedLoading] = useState(false);

  // Assign Role Modal (Inside Sub-Tab 2)
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [assigningRoleId, setAssigningRoleId] = useState<number | null>(null);

  // Revoke Role Confirmation Modal
  const [revokingRole, setRevokingRole] = useState<{ roleId: number; roleName: string } | null>(null);
  const [revokingSubmitting, setRevokingSubmitting] = useState(false);

  // Revoke Permission Confirmation Modal
  const [revokingPermission, setRevokingPermission] = useState<{ id: number; code: string; module: string; description: string } | null>(null);
  const [revokingPermissionSubmitting, setRevokingPermissionSubmitting] = useState(false);

  // User-Specific Overrides State (Inside Sub-Tab 3)
  const [showAddOverridePanel, setShowAddOverridePanel] = useState(false);
  const [allPermissionsList, setAllPermissionsList] = useState<AllPermissionRecord[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [overrideSearchQuery, setOverrideSearchQuery] = useState('');
  const [selectedOverridePermissionId, setSelectedOverridePermissionId] = useState<number | ''>('');
  const [selectedOverrideType, setSelectedOverrideType] = useState<'grant' | 'revoke'>('grant');
  const [savingOverride, setSavingOverride] = useState(false);

  // Edit / Form fields inside Manage View
  const [formTenantId, setFormTenantId] = useState<number | ''>('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formUserType, setFormUserType] = useState('saas-admin');
  const [formRoleId, setFormRoleId] = useState<number | ''>('');
  const [formUserStatus, setFormUserStatus] = useState<'active' | 'inactive'>('active');
  const [formPassword, setFormPassword] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Delete User Modal
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ================= ROLES TAB STATE =================
  const [rolesList, setRolesList] = useState<RoleRecord[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, PermissionItem[]>>({});
  const [rawPermissions, setRawPermissions] = useState<PermissionItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Role Filters
  const [roleSearch, setRoleSearch] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<'all' | 'system' | 'custom'>('all');

  // Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleIsActive, setRoleIsActive] = useState(true);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Delete Role Modal
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleRecord | null>(null);

  // Password Reset Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;

    if (!newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('New password and confirm password do not match.', 'error');
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await api.post(`/admin/users/${resetUser.id}/reset-password`, {
        newPassword
      });
      if (res.data.status === 'success') {
        addToast(`Password for "${resetUser.name}" reset successfully.`, 'info');
        setShowResetModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setResetUser(null);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to reset password.', 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  const generateRandomPass = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
  };

  // Load Meta
  const fetchMeta = async () => {
    try {
      const [rolesRes, tenantsRes] = await Promise.all([
        api.get('/admin/users/roles'),
        api.get('/admin/users/tenants')
      ]);
      if (rolesRes.data.status === 'success') setRoles(rolesRes.data.data || []);
      if (tenantsRes.data.status === 'success') setTenants(tenantsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load meta:', err);
    }
  };

  // Fetch Users List
  const fetchUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: {
          page: userPage,
          limit: userLimit,
          search: userSearch,
          tenantId: selectedTenant,
          roleId: selectedRole,
          status: selectedStatus
        }
      });
      if (res.data.status === 'success') {
        setUsers(res.data.data.users || []);
        setUserTotalPages(res.data.data.pagination.totalPages || 1);
        setTotalUsers(res.data.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      addToast('Failed to load users list.', 'error');
    } finally {
      setUserLoading(false);
    }
  }, [userPage, userLimit, userSearch, selectedTenant, selectedRole, selectedStatus, addToast]);

  // Fetch Roles & Permissions Data
  const fetchRolesData = useCallback(async () => {
    setRolesLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles', { params: { search: roleSearch } }),
        api.get('/admin/roles/permissions')
      ]);
      if (rolesRes.data.status === 'success') {
        setRolesList(rolesRes.data.data.roles || []);
      }
      if (permsRes.data.status === 'success') {
        setGroupedPermissions(permsRes.data.data.grouped || {});
        setRawPermissions(permsRes.data.data.raw || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles & permissions:', err);
      addToast('Failed to load roles list.', 'error');
    } finally {
      setRolesLoading(false);
    }
  }, [roleSearch, addToast]);

  useEffect(() => {
    fetchMeta();
    fetchRolesData(); // Pre-fetch roles data so rolesList is populated
  }, []);

  useEffect(() => {
    if (activeMainTab === 'users' && !selectedManageUserId) {
      fetchUsers();
    } else if (activeMainTab === 'roles') {
      fetchRolesData();
    }
  }, [activeMainTab, selectedManageUserId, fetchUsers, fetchRolesData]);

  // Fetch Managed User Full Details when selectedManageUserId changes
  useEffect(() => {
    if (selectedManageUserId) {
      setManageLoading(true);
      api.get(`/admin/users/${selectedManageUserId}`)
        .then((res) => {
          if (res.data.status === 'success') {
            const u: UserFullDetails = res.data.data;
            setManagedUser(u);
            setFormTenantId(u.tenant_id);
            setFormName(u.name);
            setFormEmail(u.email);
            setFormMobile(u.mobile || '');
            setFormUserType(u.user_type);
            setFormRoleId(u.role_id || '');
            setFormUserStatus(u.status === 'inactive' ? 'inactive' : 'active');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user full details:', err);
          addToast('Failed to load user details.', 'error');
        })
        .finally(() => {
          setManageLoading(false);
        });
    }
  }, [selectedManageUserId, addToast]);

  // Fetch Inherited Permissions (Server-Side Paginated)
  const fetchInheritedPermissions = useCallback(async () => {
    if (!selectedManageUserId) return;
    setInheritedLoading(true);
    try {
      const res = await api.get(`/admin/users/${selectedManageUserId}/inherited-permissions`, {
        params: {
          page: inheritedPage,
          limit: inheritedLimit,
          search: inheritedSearch,
          roleId: inheritedRoleFilter
        }
      });
      if (res.data.status === 'success') {
        setInheritedPermsList(res.data.data.permissions || []);
        setInheritedTotalPages(res.data.data.pagination?.totalPages || 1);
        setInheritedTotalCount(res.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load inherited permissions:', err);
    } finally {
      setInheritedLoading(false);
    }
  }, [selectedManageUserId, inheritedPage, inheritedLimit, inheritedSearch, inheritedRoleFilter]);

  useEffect(() => {
    if (selectedManageUserId && manageUserTab === 'permissions') {
      fetchInheritedPermissions();
    }
  }, [selectedManageUserId, manageUserTab, fetchInheritedPermissions]);

  // Open Assign Role Modal (Ensures Roles List is fresh)
  const handleOpenAssignRoleModal = () => {
    fetchRolesData();
    setShowAssignRoleModal(true);
  };

  // Clear User Filters
  const handleClearUserFilters = () => {
    setUserSearch('');
    setSelectedTenant('');
    setSelectedRole('');
    setSelectedStatus('');
    setUserPage(1);
  };

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setFormTenantId(tenants[0]?.id || 1);
    setFormName('');
    setFormEmail('');
    setFormMobile('');
    setFormUserType('saas-admin');
    setFormRoleId(roles[0]?.id || '');
    setFormUserStatus('active');
    setFormPassword('');
    setShowCreateModal(true);
  };

  // Open FULL PAGE MANAGE View
  const handleOpenManageUser = (u: UserRecord) => {
    setSelectedManageUserId(u.id);
    setManageUserTab('profile');
    setInheritedPage(1);
    setInheritedSearch('');
    setInheritedRoleFilter('');
  };

  // Reload Managed User Data
  const reloadManagedUser = async (userId: number) => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      if (res.data.status === 'success') {
        const u: UserFullDetails = res.data.data;
        setManagedUser(u);
        setFormTenantId(u.tenant_id);
        setFormName(u.name);
        setFormEmail(u.email);
        setFormMobile(u.mobile || '');
        setFormUserType(u.user_type);
        setFormRoleId(u.role_id || '');
        setFormUserStatus(u.status === 'inactive' ? 'inactive' : 'active');
        fetchInheritedPermissions();
      }
    } catch (err) {
      console.error('Error reloading managed user:', err);
    }
  };

  // Submit Create User Form
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formTenantId || !formUserType || !formPassword) {
      addToast('Please fill in all required fields.', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.post('/admin/users', {
        tenant_id: formTenantId,
        name: formName,
        email: formEmail,
        mobile: formMobile,
        user_type: formUserType,
        password: formPassword,
        status: formUserStatus,
        role_id: formRoleId || null
      });
      if (res.data.status === 'success') {
        addToast(`User "${formName}" created successfully!`, 'info');
        setShowCreateModal(false);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to create user.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit User Form (Inside Manage View)
  const handleUpdateManagedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedUser) return;

    setFormSubmitting(true);
    try {
      const res = await api.put(`/admin/users/${managedUser.id}`, {
        name: formName,
        email: formEmail,
        mobile: formMobile,
        user_type: formUserType,
        status: formUserStatus,
        role_id: formRoleId || null
      });
      if (res.data.status === 'success') {
        addToast(`User "${formName}" profile updated successfully.`, 'info');
        reloadManagedUser(managedUser.id);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to update user profile.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Assign Role to User Handler (Supports Multiple Roles)
  const handleAssignRoleToUser = async (roleId: number, roleNameStr: string) => {
    if (!managedUser) return;
    setAssigningRoleId(roleId);
    try {
      const res = await api.post(`/admin/users/${managedUser.id}/roles`, {
        role_id: roleId
      });
      if (res.data.status === 'success') {
        addToast(`Role "${roleNameStr}" assigned to ${managedUser.name} successfully!`, 'info');
        reloadManagedUser(managedUser.id);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to assign role.', 'error');
    } finally {
      setAssigningRoleId(null);
    }
  };

  // Revoke Role from User Handler (With Modal Confirmation)
  const handleConfirmRevokeRole = async () => {
    if (!managedUser || !revokingRole) return;
    setRevokingSubmitting(true);
    try {
      const res = await api.delete(`/admin/users/${managedUser.id}/roles/${revokingRole.roleId}`);
      if (res.data.status === 'success') {
        addToast(`Role "${revokingRole.roleName}" revoked from ${managedUser.name}.`, 'info');
        setRevokingRole(null);
        reloadManagedUser(managedUser.id);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to revoke role.', 'error');
    } finally {
      setRevokingSubmitting(false);
    }
  };

  // Change / Edit Role Assignment Handler
  const [editingPossessedRoleId, setEditingPossessedRoleId] = useState<number | null>(null);
  const [targetNewRoleId, setTargetNewRoleId] = useState<string>('');

  const handleChangeUserRole = async (oldRoleId: number, newRoleId: number, oldRoleName: string) => {
    if (!managedUser || !newRoleId) return;
    try {
      const res = await api.put(`/admin/users/${managedUser.id}/roles/${oldRoleId}`, {
        new_role_id: newRoleId
      });
      if (res.data.status === 'success') {
        addToast(`Role "${oldRoleName}" updated successfully.`, 'info');
        setEditingPossessedRoleId(null);
        setTargetNewRoleId('');
        reloadManagedUser(managedUser.id);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to update user role.', 'error');
    }
  };

  // Fetch all platform permissions list for override drawer/selector
  const fetchAllPermissionsData = async () => {
    if (allPermissionsList.length > 0) return;
    setPermissionsLoading(true);
    try {
      const res = await api.get('/admin/roles/permissions');
      if (res.data.status === 'success') {
        const payload = res.data.data;
        const flatList: AllPermissionRecord[] = Array.isArray(payload)
          ? payload
          : (payload?.raw || []);
        setAllPermissionsList(flatList);
      }
    } catch (err: any) {
      console.error('Error fetching all permissions:', err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleOpenAddOverridePanel = () => {
    fetchAllPermissionsData();
    setShowAddOverridePanel(!showAddOverridePanel);
    setOverrideSearchQuery('');
    setSelectedOverridePermissionId('');
    setSelectedOverrideType('grant');
  };

  const [savingOverrideId, setSavingOverrideId] = useState<number | null>(null);

  const handleQuickSaveOverride = async (permissionId: number, type: 'grant' | 'revoke') => {
    if (!managedUser) return;
    setSavingOverrideId(permissionId);
    try {
      const res = await api.post(`/admin/users/${managedUser.id}/overrides`, {
        permission_id: permissionId,
        override_type: type
      });
      if (res.data.status === 'success') {
        addToast(`Permission override ${type === 'grant' ? 'GRANTED' : 'REVOKED'} successfully!`, 'info');
        reloadManagedUser(managedUser.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save permission override.', 'error');
    } finally {
      setSavingOverrideId(null);
    }
  };

  // Confirm Revoke Permission Exception Handler
  const handleConfirmRevokePermission = async () => {
    if (!managedUser || !revokingPermission) return;
    setRevokingPermissionSubmitting(true);
    try {
      const res = await api.post(`/admin/users/${managedUser.id}/overrides`, {
        permission_id: revokingPermission.id,
        override_type: 'revoke'
      });
      if (res.data.status === 'success') {
        addToast(`Permission "${revokingPermission.code}" REVOKED (DENIED) for ${managedUser.name}.`, 'info');
        setRevokingPermission(null);
        reloadManagedUser(managedUser.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to revoke permission.', 'error');
    } finally {
      setRevokingPermissionSubmitting(false);
    }
  };

  const handleRemoveOverride = async (overrideId: number, permCode: string) => {
    if (!managedUser) return;
    try {
      const res = await api.delete(`/admin/users/${managedUser.id}/overrides/${overrideId}`);
      if (res.data.status === 'success') {
        addToast(`Permission override for "${permCode}" removed. Reverted to role default.`, 'info');
        reloadManagedUser(managedUser.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to remove permission override.', 'error');
    }
  };

  // Toggle User Suspension
  const handleToggleSuspension = async (u: UserRecord) => {
    const nextState = u.app_access_suspended === 1 ? 0 : 1;
    try {
      const res = await api.put(`/admin/users/${u.id}`, {
        app_access_suspended: nextState
      });
      if (res.data.status === 'success') {
        addToast(
          `User "${u.name}" access ${nextState === 1 ? 'SUSPENDED' : 'RESTORED'}.`,
          'info'
        );
        if (managedUser && managedUser.id === u.id) {
          reloadManagedUser(u.id);
        }
        fetchUsers();
      }
    } catch (err) {
      addToast('Failed to change suspension status.', 'error');
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      const res = await api.delete(`/admin/users/${deletingUser.id}`);
      if (res.data.status === 'success') {
        addToast(`User "${deletingUser.name}" deleted successfully.`, 'info');
        setShowDeleteUserModal(false);
        if (selectedManageUserId === deletingUser.id) {
          setSelectedManageUserId(null);
        }
        setDeletingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete user.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ================= ROLES & PERMISSIONS LOGIC =================
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleCode('');
    setRoleDescription('');
    setRoleIsActive(true);
    setSelectedPermissionIds([]);
    setShowRoleModal(true);
  };

  const handleOpenEditRole = async (r: RoleRecord) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleCode(r.code);
    setRoleDescription(r.description || '');
    setRoleIsActive(r.is_active === 1);
    setSelectedPermissionIds([]);
    setShowRoleModal(true);

    try {
      const res = await api.get(`/admin/roles/${r.id}`);
      if (res.data.status === 'success') {
        const details = res.data.data;
        setSelectedPermissionIds(details.permission_ids || []);
      }
    } catch (err) {
      console.error('Failed to load role details:', err);
    }
  };

  const handleTogglePermission = (id: number) => {
    setSelectedPermissionIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleToggleModulePermissions = (moduleName: string) => {
    const modulePerms = groupedPermissions[moduleName] || [];
    const modulePermIds = modulePerms.map(p => p.id);
    const allSelected = modulePermIds.every(id => selectedPermissionIds.includes(id));

    if (allSelected) {
      setSelectedPermissionIds(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      const toAdd = modulePermIds.filter(id => !selectedPermissionIds.includes(id));
      setSelectedPermissionIds(prev => [...prev, ...toAdd]);
    }
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) {
      addToast('Role Name is required.', 'error');
      return;
    }

    if (!editingRole && !roleCode) {
      addToast('Role Code is required for new custom roles.', 'error');
      return;
    }

    setRoleSubmitting(true);
    try {
      if (editingRole) {
        const res = await api.put(`/admin/roles/${editingRole.id}`, {
          name: roleName,
          description: roleDescription,
          is_active: roleIsActive ? 1 : 0,
          permission_ids: selectedPermissionIds
        });
        if (res.data.status === 'success') {
          addToast(`Role "${roleName}" permissions updated successfully.`, 'info');
          setShowRoleModal(false);
          fetchRolesData();
        }
      } else {
        const res = await api.post('/admin/roles', {
          name: roleName,
          code: roleCode,
          description: roleDescription,
          is_active: roleIsActive ? 1 : 0,
          permission_ids: selectedPermissionIds
        });
        if (res.data.status === 'success') {
          addToast(`Custom Role "${roleName}" created successfully!`, 'info');
          setShowRoleModal(false);
          fetchRolesData();
        }
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save role.', 'error');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      const res = await api.delete(`/admin/roles/${deletingRole.id}`);
      if (res.data.status === 'success') {
        addToast(`Role "${deletingRole.name}" deleted successfully.`, 'info');
        setShowDeleteRoleModal(false);
        setDeletingRole(null);
        fetchRolesData();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete role.', 'error');
    }
  };

  // Filtered Roles List
  const filteredRoles = rolesList.filter(r => {
    if (roleTypeFilter === 'system') return r.is_system === 1;
    if (roleTypeFilter === 'custom') return r.is_system === 0;
    return true;
  });

  const activeUserCount = users.filter(u => u.status === 'active' && u.app_access_suspended === 0).length;
  const suspendedUserCount = users.filter(u => u.app_access_suspended === 1 || u.status === 'suspended').length;
  const systemRolesCount = rolesList.filter(r => r.is_system === 1).length;
  const customRolesCount = rolesList.filter(r => r.is_system === 0).length;

  // =========================================================================
  // CONDITIONAL RENDER: FULL PAGE MANAGE USER VIEW
  // =========================================================================
  if (selectedManageUserId) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
        {/* Back Button & Breadcrumbs */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedManageUserId(null); setManagedUser(null); }}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition cursor-pointer"
          >
            <ArrowLeft size={18} /> Back to Users Directory
          </button>

          <div className="flex items-center gap-2">
            {managedUser && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 ${managedUser.app_access_suspended === 1
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                <span className={`w-2 h-2 rounded-full ${managedUser.app_access_suspended === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                {managedUser.app_access_suspended === 1 ? 'Access Suspended' : 'Access Active'}
              </span>
            )}
          </div>
        </div>

        {manageLoading || !managedUser ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
            <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-slate-300" />
            Loading user profile & permissions matrix...
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Hero Banner Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 font-extrabold flex items-center justify-center text-xl shadow-2xs">
                  {managedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{managedUser.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Mail size={13} className="text-slate-400" /> {managedUser.email}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" /> {managedUser.mobile || 'No Mobile'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Building2 size={13} className="text-slate-400" /> {managedUser.tenant_name || `Tenant #${managedUser.tenant_id}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs uppercase tracking-wider border border-blue-100">
                  {managedUser.user_type}
                </span>
              </div>
            </div>

            {/* Sub-Tabs Bar (Clean Standard Underline Style) */}
            <div className="flex border-b border-slate-200 gap-2 sm:gap-6 pt-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setManageUserTab('profile')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <User size={17} /> Overview & Account
              </button>

              {/* DYNAMIC ROLE-BASED TABS */}
              {managedUser.role_data?.student && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_student')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_student'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <GraduationCap size={17} /> Student Record
                </button>
              )}

              {managedUser.role_data?.teacher && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_teacher')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_teacher'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Briefcase size={17} /> Faculty &amp; Teaching
                </button>
              )}

              {managedUser.role_data?.parent && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_parent')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_parent'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Users size={17} /> Guardian &amp; Wards
                </button>
              )}

              {managedUser.role_data?.counsellor && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_counsellor')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_counsellor'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Briefcase size={17} /> Counsellor Profile
                </button>
              )}

              {managedUser.role_data?.finance && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_finance')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_finance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <CreditCard size={17} /> Finance Profile
                </button>
              )}

              {managedUser.role_data?.branch_admin && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_branch_admin')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_branch_admin'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Building2 size={17} /> Branch Admin Profile
                </button>
              )}

              {managedUser.role_data?.workspace_admin && (
                <button
                  type="button"
                  onClick={() => setManageUserTab('role_workspace')}
                  className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'role_workspace'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Globe size={17} /> Workspace Profile
                </button>
              )}

              <button
                type="button"
                onClick={() => setManageUserTab('branches')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'branches'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Building2 size={17} /> Branch Access ({managedUser.branch_access?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setManageUserTab('roles')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'roles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <ShieldCheck size={17} /> User Roles ({managedUser.assigned_roles?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setManageUserTab('permissions')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'permissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Layers size={17} /> Role-Wise Permissions Breakdown
              </button>

              <button
                type="button"
                onClick={() => setManageUserTab('sessions')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 shrink-0 ${manageUserTab === 'sessions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Laptop size={17} /> Sessions & Security ({managedUser.recent_sessions?.length || 0})
              </button>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="space-y-6">
              {/* TAB 1: OVERVIEW & ACCOUNT SETTINGS */}
              {manageUserTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Account Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account ID & Type</div>
                      <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                        <span>User #{managedUser.id}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 uppercase">
                          {managedUser.user_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Tenant: {managedUser.tenant_name || `#${managedUser.tenant_id}`}</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account State</div>
                      <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${managedUser.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="capitalize">{managedUser.status}</span>
                        {managedUser.app_access_suspended === 1 && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 font-semibold">
                            Suspended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Last Active: {managedUser.last_login_at ? new Date(managedUser.last_login_at).toLocaleString() : 'Never logged in'}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membership & Creation</div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {new Date(managedUser.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Password Change Required: {managedUser.must_change_password === 1 ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {/* Account Edit Form */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleUpdateManagedUser} className="space-y-6 max-w-4xl">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">User Account Credentials & Settings</h3>
                          <p className="text-xs text-slate-500">Update account credentials, tenant mapping, and active system category.</p>
                        </div>
                        <span className="text-xs text-slate-400">
                          Joined: {new Date(managedUser.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Tenant Workspace</label>
                          <input
                            type="text"
                            disabled
                            value={managedUser.tenant_name || `Tenant #${managedUser.tenant_id}`}
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 font-semibold cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Address <span className="text-red-500">*</span></label>
                          <input
                            type="email"
                            required
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Mobile Number</label>
                          <input
                            type="text"
                            value={formMobile}
                            onChange={(e) => setFormMobile(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">User Type Category</label>
                          <select
                            value={formUserType}
                            onChange={(e) => setFormUserType(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                          >
                            <option value="saas-admin">SaaS Owner</option>
                            <option value="inst-admin">Inst Owner</option>
                            <option value="branch-admin">Branch Admin</option>
                            <option value="teacher">Teacher / Faculty</option>
                            <option value="student">Student</option>
                            <option value="parent">Parent / Guardian</option>
                            <option value="counsellor">Counsellor</option>
                            <option value="finance">Finance Staff</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">Account Status</label>
                          <select
                            value={formUserStatus}
                            onChange={(e) => setFormUserStatus(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      {/* Account Quick Actions Box */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Security & Quick Actions</h4>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSuspension(managedUser)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${managedUser.app_access_suspended === 1
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                          >
                            {managedUser.app_access_suspended === 1 ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                            {managedUser.app_access_suspended === 1 ? 'Restore Access' : 'Suspend App Access'}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setResetUser(managedUser); setNewPassword(''); setConfirmPassword(''); setShowResetModal(true); }}
                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 border border-amber-200"
                          >
                            <Key size={15} /> Reset User Password
                          </button>

                          <button
                            type="button"
                            onClick={() => { setDeletingUser(managedUser); setShowDeleteUserModal(true); }}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-2 border border-red-200"
                          >
                            <Trash2 size={15} /> Delete Account
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="submit" variant="primary" disabled={formSubmitting}>
                          {formSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB: ROLE - STUDENT */}
              {manageUserTab === 'role_student' && managedUser.role_data?.student && (() => {
                const stu = managedUser.role_data.student;
                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            <GraduationCap size={26} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">{stu.full_name || managedUser.name}</h3>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase border border-blue-200">
                                {stu.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Student Code: <span className="font-mono font-bold text-slate-800">{stu.student_code}</span>
                              {stu.created_at && ` • Enrolled: ${new Date(stu.created_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>

                        {stu.primary_branch_name && (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs">
                            <Building2 size={14} className="text-slate-500" />
                            Primary Branch: <strong className="text-slate-900">{stu.primary_branch_name}</strong>
                          </div>
                        )}
                      </div>

                      {/* Academic Meta Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Class / Level</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{stu.current_class || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Exam</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{stu.target_exam || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Year of Attempt</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{stu.year_of_attempt || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{stu.category || 'General'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">School / College</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{stu.school_name || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gender & Blood Group</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {stu.gender || '—'} {stu.blood_group ? `(${stu.blood_group})` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {stu.dob ? new Date(stu.dob).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">City & State</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {stu.city ? `${stu.city}, ${stu.state || ''}` : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Enrolled Batches Section */}
                      {stu.enrollments && stu.enrollments.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen size={14} className="text-blue-600" />
                            Enrolled Batches & Programs ({stu.enrollments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {stu.enrollments.map((enr) => (
                              <div key={enr.enrollment_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                                <div>
                                  <div className="font-bold text-xs text-slate-900">{enr.batch_name}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {enr.level_name ? `${enr.level_name} • ` : ''}Code: <span className="font-mono">{enr.batch_code}</span>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${enr.enrollment_status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                                  {enr.enrollment_status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked Guardians */}
                      {stu.guardians && stu.guardians.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={14} className="text-blue-600" />
                            Linked Parent / Guardian Contacts
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {stu.guardians.map((g) => (
                              <div key={g.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900">{g.full_name}</span>
                                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded uppercase border border-purple-200">
                                    {g.relation} {g.is_primary === 1 ? '(Primary)' : ''}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                  <span><Phone size={11} className="inline mr-1 text-slate-400" />{g.mobile}</span>
                                  {g.email && <span><Mail size={11} className="inline mr-1 text-slate-400" />{g.email}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Attendance & Billing Split View */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Attendance Summary */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Clock size={16} className="text-blue-600" /> Attendance Overview
                        </h4>
                        {stu.attendance_summary ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Days</div>
                              <div className="text-lg font-bold text-slate-800 mt-1">{stu.attendance_summary.total_days}</div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                              <div className="text-[10px] font-bold text-emerald-700 uppercase">Present</div>
                              <div className="text-lg font-bold text-emerald-800 mt-1">{stu.attendance_summary.present_days || 0}</div>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                              <div className="text-[10px] font-bold text-red-700 uppercase">Absent</div>
                              <div className="text-lg font-bold text-red-800 mt-1">{stu.attendance_summary.absent_days || 0}</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                              <div className="text-[10px] font-bold text-amber-700 uppercase">Late</div>
                              <div className="text-lg font-bold text-amber-800 mt-1">{stu.attendance_summary.late_days || 0}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 py-4 text-center">No attendance records logged.</div>
                        )}
                      </div>

                      {/* Recent Invoices */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                          <CreditCard size={16} className="text-emerald-600" /> Fee Invoices & Financials
                        </h4>
                        {stu.invoices && stu.invoices.length > 0 ? (
                          <div className="space-y-2.5">
                            {stu.invoices.map((inv) => (
                              <div key={inv.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-mono font-bold text-slate-800">{inv.invoice_number}</span>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-slate-900">₹{Number(inv.total_amount).toLocaleString()}</div>
                                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {inv.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 py-4 text-center">No fee invoices recorded.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: ROLE - TEACHER / FACULTY */}
              {manageUserTab === 'role_teacher' && managedUser.role_data?.teacher && (() => {
                const teacher = managedUser.role_data.teacher;
                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-6">
                      {/* 1. TEACHER HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Briefcase size={26} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">
                                {teacher.first_name ? `${teacher.first_name} ${teacher.last_name || ''}` : managedUser.name}
                              </h3>
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded uppercase border border-emerald-200">
                                {teacher.employment_status || teacher.status || 'Active'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Employee ID: <span className="font-mono font-bold text-slate-800">{teacher.employee_id || '—'}</span>
                              {teacher.designation && ` • Designation: ${teacher.designation}`}
                              {teacher.department && ` • Department: ${teacher.department}`}
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 font-semibold rounded-xl text-xs border border-emerald-200">
                          {teacher.employee_type || 'Faculty'}
                        </div>
                      </div>

                      {/* 2. KEY PERFORMANCE & ACTIVITY METRICS GRID */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Batches</div>
                          <div className="text-xl font-extrabold text-slate-900 mt-1">{teacher.allocations?.length || 0}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Active Classrooms</div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Conducted Lectures</div>
                          <div className="text-xl font-extrabold text-emerald-800 mt-1">
                            {teacher.lecture_stats?.conducted_lectures || 0}
                          </div>
                          <div className="text-[10px] text-emerald-600 mt-0.5">
                            of {teacher.lecture_stats?.total_assigned_lectures || 0} Assigned
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-center">
                          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Assignments Created</div>
                          <div className="text-xl font-extrabold text-blue-800 mt-1">
                            {teacher.homework_stats?.total_homeworks || 0}
                          </div>
                          <div className="text-[10px] text-blue-600 mt-0.5">Homeworks & Tasks</div>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-center">
                          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Doubts Answered</div>
                          <div className="text-xl font-extrabold text-purple-800 mt-1">
                            {teacher.doubts_answered || 0}
                          </div>
                          <div className="text-[10px] text-purple-600 mt-0.5">Student Queries</div>
                        </div>

                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
                          <div className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Attendance Rate</div>
                          <div className="text-xl font-extrabold text-teal-800 mt-1">
                            {teacher.attendance_summary?.attendance_rate ?? 0}%
                          </div>
                          <div className="text-[10px] text-teal-600 mt-0.5">
                            {teacher.attendance_summary?.present_days || 0} / {teacher.attendance_summary?.total_marked_days || 0} Days
                          </div>
                        </div>
                      </div>

                      {/* 3. STAFF PROFILE & EMPLOYMENT META GRID */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Designation</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{teacher.designation || 'Faculty'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{teacher.department || 'Academics'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employment Type</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{teacher.employment_type?.replace('_', ' ') || 'Full Time'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Joining Date</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qualification</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{teacher.qualification || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Experience</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">{teacher.experience || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Salary Structure</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {teacher.salary_type || 'Monthly'} {teacher.salary_amount ? `(₹${Number(teacher.salary_amount).toLocaleString()})` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily / Weekly Lecture Limits</div>
                          <div className="text-sm font-bold text-slate-800 mt-0.5">
                            {teacher.max_lectures_per_day ? `${teacher.max_lectures_per_day}/day` : '—'} • {teacher.max_lectures_per_week ? `${teacher.max_lectures_per_week}/wk` : '—'}
                          </div>
                        </div>
                      </div>

                      {/* 4. TEACHING SUBJECTS SPECIALIZATION */}
                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} className="text-emerald-600" />
                            Teaching Subjects & Specializations ({teacher.subjects.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {teacher.subjects.map((sub: any) => (
                              <div key={sub.id} className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center gap-2 shadow-2xs">
                                <span className="font-bold text-xs text-emerald-900">{sub.subject_name}</span>
                                <span className="font-mono text-[10px] font-bold bg-white text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                  {sub.subject_code}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. ALLOCATED TEACHING BATCHES */}
                      {teacher.allocations && teacher.allocations.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen size={14} className="text-emerald-600" />
                            Allocated Teaching Batches ({teacher.allocations.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {teacher.allocations.map((ta: any) => (
                              <div key={ta.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                                <div>
                                  <div className="font-bold text-xs text-slate-900">{ta.batch_name}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {ta.level_name ? `${ta.level_name} • ` : ''}Branch: <strong className="text-slate-700">{ta.branch_name || 'Main Campus'}</strong>
                                  </div>
                                </div>
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase rounded font-mono border border-emerald-200">
                                  {ta.batch_code}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. RECENT & UPCOMING LECTURES */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={14} className="text-emerald-600" />
                          Lectures & Class Schedule ({teacher.recent_lectures?.length || 0})
                        </h4>
                        {teacher.recent_lectures && teacher.recent_lectures.length > 0 ? (
                          <div className="space-y-2">
                            {teacher.recent_lectures.map((lec: any) => (
                              <div key={lec.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 flex items-center gap-2">
                                    <span>{lec.subject_name || 'Class Lecture'}</span>
                                    <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      {lec.batch_name} ({lec.batch_code})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {lec.topic ? `Topic: ${lec.topic}` : 'Regular Curriculum Session'}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right text-[11px] text-slate-600">
                                    <div>{lec.lecture_date ? new Date(lec.lecture_date).toLocaleDateString() : 'Scheduled'}</div>
                                    <div className="font-mono text-slate-400">{lec.start_time?.slice(0, 5)} - {lec.end_time?.slice(0, 5)}</div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    lec.status === 'completed' || lec.attendance_taken === 1
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : lec.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {lec.attendance_taken === 1 ? 'Conducted' : (lec.status || 'Scheduled')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 py-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            No recent lecture schedule records found.
                          </div>
                        )}
                      </div>

                      {/* 7. ASSIGNMENTS & HOMEWORKS CREATED */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={14} className="text-emerald-600" />
                          Assignments & Homeworks Created ({teacher.recent_homeworks?.length || 0})
                        </h4>
                        {teacher.recent_homeworks && teacher.recent_homeworks.length > 0 ? (
                          <div className="space-y-2">
                            {teacher.recent_homeworks.map((hw: any) => (
                              <div key={hw.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs">
                                <div>
                                  <div className="font-bold text-slate-900">{hw.title}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Subject: <strong className="text-slate-700">{hw.subject_name || 'General'}</strong>
                                    {hw.max_marks && ` • Max Marks: ${hw.max_marks}`}
                                    {hw.due_date && ` • Due: ${new Date(hw.due_date).toLocaleDateString()}`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase">
                                    {hw.assignment_type || 'Assignment'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${hw.status === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {hw.status === 1 ? 'Active' : 'Closed'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 py-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            No homeworks or assignments published by this teacher yet.
                          </div>
                        )}
                      </div>

                      {/* 8. ATTENDANCE, LEAVES & SALARY HISTORY */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Attendance & Leave Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={14} className="text-emerald-600" />
                            Staff Attendance & Leave Status
                          </h4>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Marked Days</div>
                              <div className="text-base font-extrabold text-slate-900 mt-0.5">{teacher.attendance_summary?.total_marked_days || 0}</div>
                            </div>
                            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                              <div className="text-[10px] text-emerald-700 font-bold uppercase">Present Days</div>
                              <div className="text-base font-extrabold text-emerald-800 mt-0.5">{teacher.attendance_summary?.present_days || 0}</div>
                            </div>
                            <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                              <div className="text-[10px] text-purple-700 font-bold uppercase">Leaves Taken</div>
                              <div className="text-base font-extrabold text-purple-800 mt-0.5">{teacher.leave_summary?.approved_leaves || 0}</div>
                            </div>
                          </div>
                        </div>

                        {/* Salary Payments Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard size={14} className="text-emerald-600" />
                            Salary Disbursements & Payroll
                          </h4>
                          {teacher.salary_history && teacher.salary_history.length > 0 ? (
                            <div className="space-y-2">
                              {teacher.salary_history.map((sal: any) => (
                                <div key={sal.id} className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                                  <div>
                                    <div className="font-bold text-slate-900">
                                      Month {sal.salary_month}/{sal.salary_year}
                                    </div>
                                    <div className="text-[10px] text-slate-400">{sal.reference || sal.payment_mode || 'Disbursed'}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-extrabold text-emerald-700">₹{Number(sal.amount).toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-400">{sal.paid_date ? new Date(sal.paid_date).toLocaleDateString() : 'Paid'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 py-3 text-center">
                              Salary Base: <strong className="text-slate-700">{teacher.salary_type || 'Monthly'} {teacher.salary_amount ? `₹${Number(teacher.salary_amount).toLocaleString()}` : '—'}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: ROLE - PARENT / GUARDIAN */}
              {manageUserTab === 'role_parent' && managedUser.role_data?.parent && (() => {
                const parent = managedUser.role_data.parent;
                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-white border border-purple-200 rounded-2xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-3 border-b border-purple-100 pb-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          <Users size={26} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{parent.full_name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Relationship: <strong className="text-slate-800 capitalize">{parent.relation}</strong>
                            {parent.occupation ? ` • Occupation: ${parent.occupation}` : ''}
                            {parent.mobile ? ` • Phone: ${parent.mobile}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Linked Student Wards */}
                      {parent.linked_wards && parent.linked_wards.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <GraduationCap size={14} className="text-purple-600" />
                            Linked Student Wards ({parent.linked_wards.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {parent.linked_wards.map((ward: any) => (
                              <div key={ward.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                                <div>
                                  <div className="font-bold text-sm text-slate-900">{ward.full_name}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    Class: <span className="font-semibold text-slate-700">{ward.current_class || '—'}</span>
                                    {ward.branch_name ? ` • Branch: ${ward.branch_name}` : ''}
                                  </div>
                                  {ward.total_balance_due > 0 && (
                                    <div className="text-[11px] font-bold text-amber-700 mt-1">
                                      Outstanding Fee: ₹{Number(ward.total_balance_due).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold uppercase rounded font-mono border border-purple-200">
                                  {ward.student_code}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                          No student wards currently linked to this guardian account.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB: ROLE - COUNSELLOR (STAFF PROFILE) */}
              {manageUserTab === 'role_counsellor' && managedUser.role_data?.counsellor && (() => {
                const counsellor = managedUser.role_data.counsellor;
                const fullName = `${counsellor.first_name || ''} ${counsellor.last_name || ''}`.trim() || managedUser.name;
                const fullAddress = [counsellor.address, counsellor.city, counsellor.state, counsellor.pincode].filter(Boolean).join(', ') || '—';
                const workingDaysDisplay = Array.isArray(counsellor.working_days)
                  ? counsellor.working_days.join(', ')
                  : (typeof counsellor.working_days === 'string' && counsellor.working_days ? counsellor.working_days : 'Monday - Saturday');

                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* 1. COUNSELLOR MAIN HEADER CARD */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold border border-amber-200/50">
                            <Briefcase size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-xl font-bold text-slate-900">{fullName}</h3>
                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase border ${
                                (counsellor.status || 'active').toLowerCase() === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {counsellor.status || 'Active'}
                              </span>
                              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full uppercase">
                                {counsellor.employment_status || 'Staff Profile'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span>Employee ID: <strong className="font-mono text-slate-800">{counsellor.employee_id || '—'}</strong></span>
                              <span>•</span>
                              <span>Designation: <strong className="text-slate-800">{counsellor.designation || 'Counsellor'}</strong></span>
                              <span>•</span>
                              <span>Department: <strong className="text-slate-800">{counsellor.department || 'Admissions & Counselling'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-3.5 py-1.5 bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200">
                            Category: <strong className="text-slate-900">{counsellor.employee_type || 'Staff'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 2. SUMMARY STAT CARDS */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employment Type</div>
                          <div className="text-base font-extrabold text-slate-900 mt-1 capitalize">
                            {counsellor.employment_type?.replace('_', ' ') || 'Full Time'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Status: {counsellor.employment_status || 'Confirmed'}</div>
                        </div>

                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Joining Date</div>
                          <div className="text-base font-extrabold text-blue-950 mt-1">
                            {counsellor.joining_date ? new Date(counsellor.joining_date).toLocaleDateString() : '—'}
                          </div>
                          <div className="text-[11px] text-blue-700/80 mt-0.5">Experience: {counsellor.experience || '—'}</div>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Salary Structure</div>
                          <div className="text-base font-extrabold text-emerald-950 mt-1">
                            ₹{Number(counsellor.salary_amount || 0).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-emerald-700/80 mt-0.5">Cycle: {counsellor.salary_type || 'Monthly'}</div>
                        </div>

                        <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Location / Campus</div>
                          <div className="text-base font-extrabold text-purple-950 mt-1 truncate">
                            {counsellor.city ? `${counsellor.city}, ${counsellor.state || ''}` : 'Main Campus'}
                          </div>
                          <div className="text-[11px] text-purple-700/80 mt-0.5">PIN: {counsellor.pincode || '—'}</div>
                        </div>
                      </div>

                      {/* 3. FOUR DETAILED STAFF PROFILE CARDS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                        {/* CARD A: PERSONAL & CONTACT INFORMATION */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <User size={15} className="text-amber-600" />
                            Personal &amp; Contact Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Primary Contact:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.contact_number || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Alternate Mobile:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.alternate_mobile || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Personal Email:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.personal_email || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Gender &amp; DOB:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {counsellor.gender ? counsellor.gender.toUpperCase() : '—'}{counsellor.dob ? ` (${new Date(counsellor.dob).toLocaleDateString()})` : ''}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-medium">Residential Address:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{fullAddress}</div>
                            </div>
                          </div>
                        </div>

                        {/* CARD B: PROFESSIONAL & EMPLOYMENT PROFILE */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <Briefcase size={15} className="text-blue-600" />
                            Professional &amp; Employment Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Employee Code:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{counsellor.employee_id || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Employee Category:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.employee_type || 'Staff'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Department:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.department || 'Admissions & Counselling'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Designation:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.designation || 'Counsellor'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Highest Qualification:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.qualification || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Prior Experience:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.experience || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Working Days:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{workingDaysDisplay}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Biometric Attendance:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {counsellor.biometric_mandatory === 1 || counsellor.biometric_mandatory === true ? 'Mandatory (Yes)' : 'Not Mandatory / Exempt'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CARD C: SALARY & STATUTORY COMPLIANCE */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <CreditCard size={15} className="text-emerald-600" />
                            Compensation &amp; Statutory Settings
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Salary Structure:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.salary_type || 'Monthly Fixed'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Salary Amount:</span>
                              <div className="font-bold text-emerald-700 mt-0.5 text-sm">₹{Number(counsellor.salary_amount || 0).toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Effective From:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {counsellor.salary_effective_from ? new Date(counsellor.salary_effective_from).toLocaleDateString() : 'From Joining Date'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">TDS Applicable:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {counsellor.tds_applicable === 1 || counsellor.tds_applicable === true ? 'Applicable (Yes)' : 'Not Applicable / Exempt'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Professional Tax (PT):</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {counsellor.professional_tax_applicable === 1 || counsellor.professional_tax_applicable === true ? 'Applicable (Yes)' : 'Not Applicable / Exempt'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Employment Status:</span>
                              <div className="font-bold text-slate-900 mt-0.5 capitalize">{counsellor.employment_status || 'Active'}</div>
                            </div>
                          </div>
                        </div>

                        {/* CARD D: BANKING & DISBURSEMENT DETAILS */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <Building2 size={15} className="text-purple-600" />
                            Banking &amp; Disbursement Account
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Bank Name:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{counsellor.bank_name || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Account Number:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{counsellor.bank_account_number || '—'}</div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-medium">IFSC Code:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{counsellor.bank_ifsc || '—'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. FOOTER AUDIT METADATA */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                        <span>Staff Profile ID: #{counsellor.id}</span>
                        <span>
                          {counsellor.created_at ? `Profile Created: ${new Date(counsellor.created_at).toLocaleDateString()}` : ''}
                          {counsellor.updated_at ? ` • Updated: ${new Date(counsellor.updated_at).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: ROLE - FINANCE (STAFF PROFILE) */}
              {manageUserTab === 'role_finance' && managedUser.role_data?.finance && (() => {
                const finance = managedUser.role_data.finance;
                const fullName = `${finance.first_name || ''} ${finance.last_name || ''}`.trim() || managedUser.name;
                const fullAddress = [finance.address, finance.city, finance.state, finance.pincode].filter(Boolean).join(', ') || '—';
                const workingDaysDisplay = Array.isArray(finance.working_days)
                  ? finance.working_days.join(', ')
                  : (typeof finance.working_days === 'string' && finance.working_days ? finance.working_days : 'Monday - Saturday');

                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* 1. FINANCE MAIN HEADER CARD */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200/50">
                            <CreditCard size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-xl font-bold text-slate-900">{fullName}</h3>
                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase border ${
                                (finance.status || 'active').toLowerCase() === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {finance.status || 'Active'}
                              </span>
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full uppercase">
                                {finance.employment_status || 'Staff Profile'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span>Employee ID: <strong className="font-mono text-slate-800">{finance.employee_id || '—'}</strong></span>
                              <span>•</span>
                              <span>Designation: <strong className="text-slate-800">{finance.designation || 'Accounts Executive'}</strong></span>
                              <span>•</span>
                              <span>Department: <strong className="text-slate-800">{finance.department || 'Finance & Accounts'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-3.5 py-1.5 bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200">
                            Category: <strong className="text-slate-900">{finance.employee_type || 'Staff'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 2. SUMMARY STAT CARDS */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employment Type</div>
                          <div className="text-base font-extrabold text-slate-900 mt-1 capitalize">
                            {finance.employment_type?.replace('_', ' ') || 'Full Time'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Status: {finance.employment_status || 'Confirmed'}</div>
                        </div>

                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Joining Date</div>
                          <div className="text-base font-extrabold text-blue-950 mt-1">
                            {finance.joining_date ? new Date(finance.joining_date).toLocaleDateString() : '—'}
                          </div>
                          <div className="text-[11px] text-blue-700/80 mt-0.5">Experience: {finance.experience || '—'}</div>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Salary Structure</div>
                          <div className="text-base font-extrabold text-emerald-950 mt-1">
                            ₹{Number(finance.salary_amount || 0).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-emerald-700/80 mt-0.5">Cycle: {finance.salary_type || 'Monthly'}</div>
                        </div>

                        <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Location / Campus</div>
                          <div className="text-base font-extrabold text-purple-950 mt-1 truncate">
                            {finance.city ? `${finance.city}, ${finance.state || ''}` : 'Main Campus'}
                          </div>
                          <div className="text-[11px] text-purple-700/80 mt-0.5">PIN: {finance.pincode || '—'}</div>
                        </div>
                      </div>

                      {/* 3. FOUR DETAILED STAFF PROFILE CARDS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                        {/* CARD A: PERSONAL & CONTACT INFORMATION */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <User size={15} className="text-emerald-600" />
                            Personal &amp; Contact Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Primary Contact:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.contact_number || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Alternate Mobile:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.alternate_mobile || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Personal Email:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.personal_email || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Gender &amp; DOB:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {finance.gender ? finance.gender.toUpperCase() : '—'}{finance.dob ? ` (${new Date(finance.dob).toLocaleDateString()})` : ''}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-medium">Residential Address:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{fullAddress}</div>
                            </div>
                          </div>
                        </div>

                        {/* CARD B: PROFESSIONAL & EMPLOYMENT PROFILE */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <Briefcase size={15} className="text-blue-600" />
                            Professional &amp; Employment Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Employee Code:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{finance.employee_id || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Employee Category:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.employee_type || 'Staff'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Department:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.department || 'Finance & Accounts'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Designation:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.designation || 'Accounts Executive'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Highest Qualification:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.qualification || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Prior Experience:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.experience || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Working Days:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{workingDaysDisplay}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Biometric Attendance:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {finance.biometric_mandatory === 1 || finance.biometric_mandatory === true ? 'Mandatory (Yes)' : 'Not Mandatory / Exempt'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CARD C: SALARY & STATUTORY COMPLIANCE */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <CreditCard size={15} className="text-emerald-600" />
                            Compensation &amp; Statutory Settings
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Salary Structure:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.salary_type || 'Monthly Fixed'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Salary Amount:</span>
                              <div className="font-bold text-emerald-700 mt-0.5 text-sm">₹{Number(finance.salary_amount || 0).toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Effective From:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {finance.salary_effective_from ? new Date(finance.salary_effective_from).toLocaleDateString() : 'From Joining Date'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">TDS Applicable:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {finance.tds_applicable === 1 || finance.tds_applicable === true ? 'Applicable (Yes)' : 'Not Applicable / Exempt'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Professional Tax (PT):</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {finance.professional_tax_applicable === 1 || finance.professional_tax_applicable === true ? 'Applicable (Yes)' : 'Not Applicable / Exempt'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Employment Status:</span>
                              <div className="font-bold text-slate-900 mt-0.5 capitalize">{finance.employment_status || 'Active'}</div>
                            </div>
                          </div>
                        </div>

                        {/* CARD D: BANKING & DISBURSEMENT DETAILS */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <Building2 size={15} className="text-purple-600" />
                            Banking &amp; Disbursement Account
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Bank Name:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{finance.bank_name || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Account Number:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{finance.bank_account_number || '—'}</div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-medium">IFSC Code:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{finance.bank_ifsc || '—'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. FOOTER AUDIT METADATA */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                        <span>Staff Profile ID: #{finance.id}</span>
                        <span>
                          {finance.created_at ? `Profile Created: ${new Date(finance.created_at).toLocaleDateString()}` : ''}
                          {finance.updated_at ? ` • Updated: ${new Date(finance.updated_at).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: ROLE - BRANCH ADMIN (STAFF PROFILE & ADMINISTERED CAMPUSES) */}
              {manageUserTab === 'role_branch_admin' && managedUser.role_data?.branch_admin && (() => {
                const bAdmin = managedUser.role_data.branch_admin;
                const fullName = (bAdmin.first_name || bAdmin.last_name)
                  ? `${bAdmin.first_name || ''} ${bAdmin.last_name || ''}`.trim()
                  : managedUser.name;
                const fullAddress = [bAdmin.address, bAdmin.city, bAdmin.state, bAdmin.pincode].filter(Boolean).join(', ') || '—';
                const workingDaysDisplay = Array.isArray(bAdmin.working_days)
                  ? bAdmin.working_days.join(', ')
                  : (typeof bAdmin.working_days === 'string' && bAdmin.working_days ? bAdmin.working_days : 'Monday - Saturday');

                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* 1. BRANCH ADMIN HEADER CARD */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold border border-blue-200/50">
                            <Building2 size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-xl font-bold text-slate-900">{fullName}</h3>
                              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase border ${
                                (bAdmin.status || 'active').toLowerCase() === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {bAdmin.status || 'Active'}
                              </span>
                              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full uppercase">
                                {bAdmin.employment_status || 'Branch Admin'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span>Employee ID: <strong className="font-mono text-slate-800">{bAdmin.employee_id || '—'}</strong></span>
                              <span>•</span>
                              <span>Designation: <strong className="text-slate-800">{bAdmin.designation || 'Branch Admin'}</strong></span>
                              <span>•</span>
                              <span>Department: <strong className="text-slate-800">{bAdmin.department || 'Administration'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-3.5 py-1.5 bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200">
                            Category: <strong className="text-slate-900">{bAdmin.employee_type || 'Staff'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 2. SUMMARY KPI STAT CARDS */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employment Type</div>
                          <div className="text-base font-extrabold text-slate-900 mt-1 capitalize">
                            {bAdmin.employment_type?.replace('_', ' ') || 'Full Time'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Status: {bAdmin.employment_status || 'Confirmed'}</div>
                        </div>

                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Joining Date</div>
                          <div className="text-base font-extrabold text-blue-950 mt-1">
                            {bAdmin.joining_date ? new Date(bAdmin.joining_date).toLocaleDateString() : '—'}
                          </div>
                          <div className="text-[11px] text-blue-700/80 mt-0.5">Experience: {bAdmin.experience || '—'}</div>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Salary Structure</div>
                          <div className="text-base font-extrabold text-emerald-950 mt-1">
                            ₹{Number(bAdmin.salary_amount || 0).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-emerald-700/80 mt-0.5">Cycle: {bAdmin.salary_type || 'Monthly'}</div>
                        </div>

                        <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4">
                          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Campuses Managed</div>
                          <div className="text-base font-extrabold text-purple-950 mt-1">
                            {bAdmin.managed_branches?.length || 0} Physical Campus{(bAdmin.managed_branches?.length || 0) === 1 ? '' : 'es'}
                          </div>
                          <div className="text-[11px] text-purple-700/80 mt-0.5 truncate">
                            Primary: {bAdmin.managed_branches?.find(b => b.is_primary)?.name || 'None Assigned'}
                          </div>
                        </div>
                      </div>

                      {/* 3. FOUR DETAILED STAFF PROFILE CARDS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                        {/* CARD A: PERSONAL & CONTACT INFORMATION */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <User size={15} className="text-blue-600" />
                            Personal &amp; Contact Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Primary Contact:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.contact_number || managedUser.mobile || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Alternate Mobile:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.alternate_mobile || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Personal Email:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.personal_email || managedUser.email || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Gender &amp; DOB:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {bAdmin.gender ? bAdmin.gender.toUpperCase() : '—'}{bAdmin.dob ? ` (${new Date(bAdmin.dob).toLocaleDateString()})` : ''}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-medium">Residential Address:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{fullAddress}</div>
                            </div>
                          </div>
                        </div>

                        {/* CARD B: PROFESSIONAL & EMPLOYMENT PROFILE */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <Briefcase size={15} className="text-blue-600" />
                            Professional &amp; Employment Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Employee Code:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{bAdmin.employee_id || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Employee Category:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.employee_type || 'Staff'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Department:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.department || 'Administration'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Designation:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.designation || 'Branch Admin'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Highest Qualification:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.qualification || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Prior Experience:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.experience || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Working Days:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{workingDaysDisplay}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Biometric Attendance:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {bAdmin.biometric_mandatory === 1 || bAdmin.biometric_mandatory === true ? 'Mandatory (Yes)' : 'Not Mandatory / Exempt'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CARD C: SALARY & STATUTORY COMPLIANCE */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <CreditCard size={15} className="text-emerald-600" />
                            Compensation &amp; Statutory Settings
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Salary Structure:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.salary_type || 'Monthly Fixed'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Salary Amount:</span>
                              <div className="font-bold text-emerald-700 mt-0.5 text-sm">₹{Number(bAdmin.salary_amount || 0).toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Effective From:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {bAdmin.salary_effective_from ? new Date(bAdmin.salary_effective_from).toLocaleDateString() : 'From Joining Date'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">TDS Applicable:</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {bAdmin.tds_applicable === 1 || bAdmin.tds_applicable === true ? 'Applicable (Yes)' : 'Not Applicable / Exempt'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Professional Tax (PT):</span>
                              <div className="font-bold text-slate-900 mt-0.5">
                                {bAdmin.professional_tax_applicable === 1 || bAdmin.professional_tax_applicable === true ? 'Applicable (Yes)' : 'Not Applicable / Exempt'}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Employment Status:</span>
                              <div className="font-bold text-slate-900 mt-0.5 capitalize">{bAdmin.employment_status || 'Active'}</div>
                            </div>
                          </div>
                        </div>

                        {/* CARD D: BANKING & DISBURSEMENT DETAILS */}
                        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                            <Building2 size={15} className="text-purple-600" />
                            Banking &amp; Disbursement Account
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Bank Name:</span>
                              <div className="font-bold text-slate-900 mt-0.5">{bAdmin.bank_name || '—'}</div>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Account Number:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{bAdmin.bank_account_number || '—'}</div>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-medium">IFSC Code:</span>
                              <div className="font-bold font-mono text-slate-900 mt-0.5">{bAdmin.bank_ifsc || '—'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. ADMINISTERED PHYSICAL CAMPUSES & OPERATIONAL BREAKDOWN */}
                      <div className="pt-2 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Building2 size={17} className="text-blue-600" />
                              Administered Physical Campuses ({bAdmin.managed_branches?.length || 0})
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Real-time campus infrastructure, active academic batches, student rosters, and fee collections.
                            </p>
                          </div>
                        </div>

                        {bAdmin.managed_branches && bAdmin.managed_branches.length > 0 ? (
                          <div className="space-y-4">
                            {bAdmin.managed_branches.map((branch) => (
                              <div key={branch.id} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                      <Building2 size={20} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-bold text-sm text-slate-900">{branch.name}</h5>
                                        <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                          {branch.code}
                                        </span>
                                        {branch.is_primary === 1 && (
                                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] uppercase rounded-full border border-blue-200">
                                            Primary Campus
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5">
                                        Location: {branch.city || '—'}{branch.state ? `, ${branch.state}` : ''}
                                        {branch.operating_hours ? ` • Hours: ${branch.operating_hours}` : ''}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-slate-600">
                                    {branch.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone size={13} className="text-slate-400" /> {branch.phone}
                                      </span>
                                    )}
                                    {branch.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail size={13} className="text-slate-400" /> {branch.email}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Students</div>
                                    <div className="text-lg font-extrabold text-slate-900 mt-1">{branch.total_students || 0}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Active Roster</div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Active Batches</div>
                                    <div className="text-lg font-extrabold text-blue-700 mt-1">{branch.total_batches || 0}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Running Programs</div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Classrooms</div>
                                    <div className="text-lg font-extrabold text-purple-700 mt-1">{branch.total_classrooms || 0}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Cap: {branch.capacity || '—'}</div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Campus Staff</div>
                                    <div className="text-lg font-extrabold text-slate-900 mt-1">{branch.total_staff || 0}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Teaching & Admin</div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Student Invoices</div>
                                    <div className="text-lg font-extrabold text-amber-700 mt-1">{branch.total_invoices || 0}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">Fee Bills Issued</div>
                                  </div>

                                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                                    <div className="text-[10px] font-bold text-emerald-700 uppercase">Revenue Collected</div>
                                    <div className="text-lg font-extrabold text-emerald-800 mt-1">
                                      ₹{Number(branch.total_revenue_collected || 0).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 mt-0.5">Realized Fees</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                            No physical branches currently assigned to this Branch Admin.
                          </div>
                        )}
                      </div>

                      {/* 5. FOOTER AUDIT METADATA */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                        <span>Staff Profile ID: #{bAdmin.id || 'N/A'}</span>
                        <span>
                          {bAdmin.created_at ? `Profile Created: ${new Date(bAdmin.created_at).toLocaleDateString()}` : ''}
                          {bAdmin.updated_at ? ` • Updated: ${new Date(bAdmin.updated_at).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: ROLE - WORKSPACE PROFILE */}
              {manageUserTab === 'role_workspace' && managedUser.role_data?.workspace_admin && (() => {
                const ws = managedUser.role_data.workspace_admin;
                return (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <Globe size={26} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{ws.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Workspace Slug: <span className="font-mono">{ws.slug}</span></p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs uppercase rounded-full">
                          {ws.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Branches</div>
                            <div className="text-lg font-extrabold text-slate-800">{ws.total_branches || 0}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                            <GraduationCap size={18} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students</div>
                            <div className="text-lg font-extrabold text-slate-800">{ws.total_students || 0}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                            <Users size={18} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff Members</div>
                            <div className="text-lg font-extrabold text-slate-800">{ws.total_staff || 0}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batches</div>
                            <div className="text-lg font-extrabold text-slate-800">{ws.total_batches || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 3: BRANCH ACCESS MATRIX */}
              {manageUserTab === 'branches' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-600" />
                        Authorized Branches & Locations
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Institutes and physical branches this user has permission to access and operate within.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-100">
                      {managedUser.branch_access?.length || 0} Branches Configured
                    </span>
                  </div>

                  {managedUser.branch_access && managedUser.branch_access.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {managedUser.branch_access.map((ba) => (
                        <div key={ba.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2 hover:border-blue-300 transition shadow-2xs">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-900">{ba.name}</h4>
                            {ba.is_primary === 1 && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase rounded-full">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <div>Branch Code: <span className="font-mono font-semibold text-slate-700">{ba.code}</span></div>
                            <div>Location: <span className="text-slate-700">{ba.city ? `${ba.city}, ${ba.state || ''}` : ba.address || '—'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl text-slate-400 text-sm border border-dashed border-slate-200">
                      No explicit branch mappings recorded. This user operates with standard tenant-wide access.
                    </div>
                  )}
                </div>
              )}

              {/* SUB TAB 2: USER ROLES */}
              {manageUserTab === 'roles' && (
                <div className="space-y-6">
                  {/* Possessed Roles Header with Assign Role Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Possessed Global Roles</h3>
                      <p className="text-xs text-slate-500">Global RBAC roles currently assigned to {managedUser.name}.</p>
                    </div>
                    <Button
                      type="button"
                      variant={showAssignRoleModal ? "secondary" : "primary"}
                      onClick={handleOpenAssignRoleModal}
                      className="px-4 py-2 text-xs shadow-sm gap-1.5 shrink-0"
                    >
                      {showAssignRoleModal ? '✕ Close Assign Panel' : '+ Assign Role'}
                    </Button>
                  </div>

                  {/* INLINE ASSIGN ROLE SELECTION PANEL (NO SCREEN DIMMING) */}
                  {showAssignRoleModal && (
                    <div className="bg-slate-50 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-blue-600" />
                            Select Global Role to Assign
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Pick an available role below to grant RBAC access permissions to <strong className="text-slate-800">{managedUser.name}</strong>.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAssignRoleModal(false)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer text-xs font-bold"
                        >
                          ✕ Close
                        </button>
                      </div>

                      {rolesLoading ? (
                        <div className="py-8 text-center text-slate-400">
                          <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-slate-300" />
                          Loading platform roles list...
                        </div>
                      ) : rolesList.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No roles found in system database.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rolesList.map((r) => {
                            const isAssigned = managedUser.assigned_roles?.some(ar => ar.id === r.id);
                            const isAssigningThis = assigningRoleId === r.id;
                            return (
                              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-blue-300 transition">
                                <div>
                                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    {r.name}
                                    <code className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      {r.code}
                                    </code>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {r.description || 'System global role'}
                                  </div>
                                </div>

                                <div>
                                  {isAssigned ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs inline-flex items-center gap-1">
                                      <Check size={14} /> Assigned
                                    </span>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="primary"
                                      disabled={isAssigningThis}
                                      onClick={() => handleAssignRoleToUser(r.id, r.name)}
                                      className="px-3 py-1.5 text-xs shadow-2xs"
                                    >
                                      {isAssigningThis ? 'Assigning...' : 'Assign Role'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assigned Roles List */}
                  {managedUser.assigned_roles?.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl text-slate-400 text-sm border border-dashed border-slate-200">
                      No active roles currently assigned to this user. Click <strong>Assign Role</strong> above to assign a role.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {managedUser.assigned_roles.map((r) => (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center">
                                <ShieldCheck size={22} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                                  {r.name}
                                  <code className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                    {r.code}
                                  </code>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {r.description || 'Global RBAC system role'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  fetchRolesData();
                                  setEditingPossessedRoleId(editingPossessedRoleId === r.id ? null : r.id);
                                  setTargetNewRoleId('');
                                }}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1 border border-slate-200"
                                title="Change / Replace Role"
                              >
                                <Edit size={13} /> Edit Role
                              </button>

                              <button
                                type="button"
                                onClick={() => setRevokingRole({ roleId: r.id, roleName: r.name })}
                                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1 border border-red-200"
                                title="Revoke / Delete Role Assignment"
                              >
                                <Trash2 size={13} /> Revoke Role
                              </button>
                            </div>
                          </div>

                          {/* INLINE EDIT ROLE SELECTION GRID (SAME VISUAL GRID AS ASSIGN ROLE) */}
                          {editingPossessedRoleId === r.id && (
                            <div className="pt-4 border-t border-slate-100 space-y-4 bg-slate-50/90 p-4 rounded-xl border border-blue-200 animate-fade-in">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-600" />
                                    Select Replacement Role for "{r.name}"
                                  </h4>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Pick an available platform role below to replace <strong className="text-slate-800 font-semibold">{r.name}</strong> for {managedUser.name}.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingPossessedRoleId(null)}
                                  className="text-slate-400 hover:text-slate-600 p-1 rounded transition text-xs font-bold"
                                >
                                  ✕ Cancel Edit
                                </button>
                              </div>

                              {rolesLoading ? (
                                <div className="py-6 text-center text-slate-400">
                                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-slate-300" />
                                  Loading platform roles...
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {rolesList.map((targetRole) => {
                                    const isThisRoleBeingEdited = targetRole.id === r.id;
                                    const isOtherAssignedRole = managedUser.assigned_roles?.some(ar => ar.id === targetRole.id && ar.id !== r.id);
                                    const isChangingThis = assigningRoleId === targetRole.id;

                                    return (
                                      <div key={targetRole.id} className={`bg-white border rounded-xl p-3.5 flex items-center justify-between shadow-2xs transition ${isThisRoleBeingEdited ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'
                                        }`}>
                                        <div>
                                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                            {targetRole.name}
                                            <code className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              {targetRole.code}
                                            </code>
                                          </div>
                                          <div className="text-[11px] text-slate-500 mt-0.5">
                                            {targetRole.description || 'System global role'}
                                          </div>
                                        </div>

                                        <div>
                                          {isThisRoleBeingEdited ? (
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-bold rounded-lg text-[11px]">
                                              Current Role
                                            </span>
                                          ) : isOtherAssignedRole ? (
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
                                              <Check size={12} /> Possessed
                                            </span>
                                          ) : (
                                            <Button
                                              type="button"
                                              variant="primary"
                                              disabled={isChangingThis}
                                              onClick={() => handleChangeUserRole(r.id, targetRole.id, r.name)}
                                              className="px-2.5 py-1 text-xs shadow-2xs"
                                            >
                                              {isChangingThis ? 'Updating...' : 'Select Role'}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB TAB 3: ROLE & USER-SPECIFIC PERMISSIONS MATRIX */}
              {manageUserTab === 'permissions' && (
                <div className="space-y-8">
                  {/* CARD 1: USER-SPECIFIC OVERRIDES SECTION */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Sliders size={20} className="text-blue-600" />
                          User-Specific Overrides
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Explicit permission exceptions granted or revoked specifically for <strong className="text-slate-800 font-semibold">{managedUser.name}</strong>.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={showAddOverridePanel ? "secondary" : "primary"}
                        onClick={handleOpenAddOverridePanel}
                        className="px-4 py-2 text-xs shadow-sm gap-1.5 shrink-0"
                      >
                        {showAddOverridePanel ? '✕ Close Override Panel' : '+ Add Override'}
                      </Button>
                    </div>

                    {/* INLINE ADD OVERRIDE DRAWER / PANEL (NO SCREEN DIMMING) */}
                    {showAddOverridePanel && (() => {
                      // Calculate currently possessed permission IDs for this user
                      const inheritedPermIds = new Set<number>();
                      managedUser.role_wise_permissions?.forEach(group => {
                        group.permissions?.forEach(perm => inheritedPermIds.add(perm.id));
                      });

                      const overrideGrantPermIds = new Set<number>();
                      const overrideRevokePermIds = new Set<number>();
                      managedUser.overridden_permissions?.forEach(op => {
                        if (op.override_type === 'grant') overrideGrantPermIds.add(op.permission_id);
                        if (op.override_type === 'revoke') overrideRevokePermIds.add(op.permission_id);
                      });

                      const currentlyPossessedIds = new Set<number>();
                      allPermissionsList.forEach(p => {
                        const isInherited = inheritedPermIds.has(p.id);
                        const isOverriddenGrant = overrideGrantPermIds.has(p.id);
                        const isOverriddenRevoke = overrideRevokePermIds.has(p.id);
                        if ((isInherited || isOverriddenGrant) && !isOverriddenRevoke) {
                          currentlyPossessedIds.add(p.id);
                        }
                      });

                      const targetList = allPermissionsList.filter(p => {
                        const matchesSearch = !overrideSearchQuery ||
                          p.code.toLowerCase().includes(overrideSearchQuery.toLowerCase()) ||
                          p.module.toLowerCase().includes(overrideSearchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(overrideSearchQuery.toLowerCase());

                        if (!matchesSearch) return false;

                        if (selectedOverrideType === 'grant') {
                          // Show permissions user DOES NOT currently possess
                          return !currentlyPossessedIds.has(p.id);
                        } else {
                          // Show permissions user DOES currently possess
                          return currentlyPossessedIds.has(p.id);
                        }
                      });

                      return (
                        <div className="bg-slate-50 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck size={18} className="text-blue-600" />
                                Add User Permission Exception
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Select an override action mode first, then choose a target permission below.
                              </p>
                            </div>
                            <button
                              onClick={() => setShowAddOverridePanel(false)}
                              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer text-xs font-bold shrink-0"
                            >
                              ✕ Close Panel
                            </button>
                          </div>

                          {/* STEP 1: MODE SELECTION (GRANT vs REVOKE) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 block">
                              1. Select Override Mode
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label
                                onClick={() => setSelectedOverrideType('grant')}
                                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${selectedOverrideType === 'grant'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name="override_type_select"
                                  checked={selectedOverrideType === 'grant'}
                                  onChange={() => setSelectedOverrideType('grant')}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-700">
                                    Grant Permission (Allow)
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Shows permissions {managedUser.name} currently does NOT possess.
                                  </div>
                                </div>
                              </label>

                              <label
                                onClick={() => setSelectedOverrideType('revoke')}
                                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${selectedOverrideType === 'revoke'
                                  ? 'bg-red-50 border-red-500 text-red-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name="override_type_select"
                                  checked={selectedOverrideType === 'revoke'}
                                  onChange={() => setSelectedOverrideType('revoke')}
                                  className="text-red-600 focus:ring-red-500"
                                />
                                <div>
                                  <div className="font-bold text-xs flex items-center gap-1.5 text-red-700">
                                    Revoke Permission (Deny)
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Shows permissions {managedUser.name} currently possesses to revoke.
                                  </div>
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* STEP 2: SEARCH FILTER & PERMISSIONS LIST */}
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                              <span>2. Choose Permission to {selectedOverrideType === 'grant' ? 'Grant' : 'Revoke'}</span>
                              <span className="text-[11px] text-slate-500 font-normal">
                                Showing {targetList.length} permissions ({selectedOverrideType === 'grant' ? 'Not possessed' : 'Currently possessed'})
                              </span>
                            </label>

                            <input
                              type="text"
                              placeholder={`Search permissions to ${selectedOverrideType}...`}
                              value={overrideSearchQuery}
                              onChange={(e) => setOverrideSearchQuery(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 shadow-2xs"
                            />

                            {permissionsLoading ? (
                              <div className="py-8 text-center text-slate-400">
                                <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-slate-300" />
                                Loading system permissions...
                              </div>
                            ) : targetList.length === 0 ? (
                              <div className="p-8 text-center bg-white rounded-xl text-slate-400 text-xs border border-dashed border-slate-200">
                                {selectedOverrideType === 'grant'
                                  ? 'No unpossessed permissions available to grant.'
                                  : 'No active possessed permissions available to revoke.'
                                }
                              </div>
                            ) : (
                              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                                {targetList.map((p) => {
                                  const isSavingThis = savingOverrideId === p.id;
                                  return (
                                    <div
                                      key={p.id}
                                      className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition"
                                    >
                                      <div className="space-y-1">
                                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                          <code className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                                            {p.code}
                                          </code>
                                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded">
                                            {p.module}
                                          </span>
                                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] uppercase rounded">
                                            {p.action}
                                          </span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {p.description}
                                        </div>
                                      </div>

                                      <div className="shrink-0">
                                        {selectedOverrideType === 'grant' ? (
                                          <button
                                            type="button"
                                            disabled={isSavingThis}
                                            onClick={() => handleQuickSaveOverride(p.id, 'grant')}
                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                                          >
                                            <Check size={13} /> {isSavingThis ? 'Granting...' : 'Grant Permission'}
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setRevokingPermission({ id: p.id, code: p.code, module: p.module, description: p.description })}
                                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                                          >
                                            <Ban size={13} /> Revoke Permission
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* OVERRIDES DATA TABLE */}
                    {!managedUser.overridden_permissions || managedUser.overridden_permissions.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs border border-dashed border-slate-200">
                        No user-specific permission overrides configured. This user strictly inherits permissions from their assigned global roles. Click <strong>+ Add Override</strong> to configure a custom exception.
                      </div>
                    ) : (
                      <Table
                        dense
                        minWidth="950px"
                        colWidths={['220px', '140px', 'auto', '160px', '150px', '120px', '100px']}
                        headers={[
                          'Permission Code',
                          'Module / Action',
                          'Description',
                          'Base Role Status',
                          'Override State',
                          'Effective Status',
                          { label: 'Actions', align: 'right' }
                        ]}
                      >
                        {managedUser.overridden_permissions.map((op) => (
                          <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Check size={14} className="text-blue-600 shrink-0" />
                                <code className="text-sm font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-900 border border-slate-200">
                                  {op.permission_code}
                                </code>
                              </div>
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs uppercase rounded border border-slate-200">
                                  {op.module}
                                </span>
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded border border-blue-100">
                                  {op.action}
                                </span>
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-slate-700 text-sm max-w-xs truncate">
                              {op.description}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              {op.base_role_status === 'Granted' ? (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-full text-xs inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Granted by Role
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 border border-slate-200 font-semibold rounded-full text-xs inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Not Granted by Role
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              {op.override_type === 'grant' ? (
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-semibold rounded-full text-xs inline-flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Direct Grant
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 font-semibold rounded-full text-xs inline-flex items-center gap-1.5">
                                  <Ban size={13} /> Revoked (Denied)
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap font-bold">
                              {op.effective_status === 'Granted' ? (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs inline-flex items-center gap-1.5 border border-emerald-200">
                                  🟢 Granted
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold text-xs inline-flex items-center gap-1.5 border border-red-200">
                                  🔴 Denied
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveOverride(op.id, op.permission_code)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1.5 border border-red-200"
                                title="Remove override and revert to role default"
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </div>

                  {/* CARD 2: ROLE-WISE INHERITED PERMISSIONS BREAKDOWN */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">Role-Wise Inherited Permissions Breakdown</h3>
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                            {inheritedTotalCount} Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Read-only breakdown of permissions automatically inherited from {managedUser.name}'s assigned global roles.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fetchInheritedPermissions()}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
                          title="Refresh inherited permissions"
                        >
                          <RefreshCw size={13} className={inheritedLoading ? 'animate-spin' : ''} /> Refresh
                        </button>
                      </div>
                    </div>

                    {/* FILTER & SEARCH BAR */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={inheritedSearch}
                          onChange={(e) => {
                            setInheritedSearch(e.target.value);
                            setInheritedPage(1);
                          }}
                          placeholder="Search permissions by code, module, action, description, or role..."
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                        {inheritedSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setInheritedSearch('');
                              setInheritedPage(1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {managedUser.assigned_roles && managedUser.assigned_roles.length > 1 && (
                        <div className="sm:w-56">
                          <select
                            value={inheritedRoleFilter}
                            onChange={(e) => {
                              setInheritedRoleFilter(e.target.value);
                              setInheritedPage(1);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 cursor-pointer"
                          >
                            <option value="">All Assigned Roles ({managedUser.assigned_roles.length})</option>
                            {managedUser.assigned_roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* PERMISSIONS TABLE */}
                    {inheritedLoading ? (
                      <div className="p-12 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-blue-600" />
                        Loading inherited permissions...
                      </div>
                    ) : inheritedPermsList.length === 0 ? (
                      <div className="p-12 text-center bg-slate-50 rounded-2xl text-slate-400 text-sm border border-dashed border-slate-200 space-y-2">
                        <ShieldCheck size={28} className="mx-auto text-slate-300" />
                        <div className="font-semibold text-slate-600">No Inherited Permissions Found</div>
                        <p className="text-xs text-slate-400">
                          {inheritedSearch || inheritedRoleFilter
                            ? 'No permissions matched your filter criteria. Try clearing your search filters.'
                            : "This user has no permissions inherited from their currently assigned roles."}
                        </p>
                        {(inheritedSearch || inheritedRoleFilter) && (
                          <button
                            type="button"
                            onClick={() => {
                              setInheritedSearch('');
                              setInheritedRoleFilter('');
                              setInheritedPage(1);
                            }}
                            className="mt-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Table
                          dense
                          minWidth="1050px"
                          colWidths={['190px', '250px', '130px', '110px', 'auto', '140px']}
                          headers={[
                            'Source Role',
                            'Permission Code',
                            'Module',
                            'Action',
                            'Description',
                            { label: 'Inherited Status', align: 'center' }
                          ]}
                        >
                          {inheritedPermsList.map((p, idx) => (
                            <tr key={`${p.role_id}-${p.permission_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                                  <div>
                                    <div className="font-semibold text-slate-900 text-sm">{p.role_name}</div>
                                    <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {p.role_code}
                                    </code>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3.5 py-3 font-mono text-sm font-semibold text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    <Check size={12} />
                                  </span>
                                  <span>{p.permission_code}</span>
                                </div>
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded text-xs uppercase font-mono border border-slate-200">
                                  {p.module}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded text-xs border border-blue-100">
                                  {p.action}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-slate-700 text-sm leading-relaxed">
                                {p.description}
                              </td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  Granted
                                </span>
                              </td>
                            </tr>
                          ))}
                        </Table>

                        {/* PAGINATION COMPONENT */}
                        <Pagination
                          currentPage={inheritedPage}
                          totalPages={inheritedTotalPages}
                          totalItems={inheritedTotalCount}
                          pageSize={inheritedLimit}
                          onPageChange={(p) => setInheritedPage(p)}
                          onPageSizeChange={(s) => {
                            setInheritedLimit(s);
                            setInheritedPage(1);
                          }}
                          pageSizeOptions={[10, 25, 50, 100]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: SESSIONS & SECURITY */}
              {manageUserTab === 'sessions' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Security Health Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Shield size={20} />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Authorization</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                            {managedUser.app_access_suspended === 1 ? (
                              <span className="text-amber-600 flex items-center gap-1 font-bold">
                                <Ban size={14} /> Suspended
                              </span>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                <CheckCircle size={14} /> Active & Authorized
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                          <Lock size={20} />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password Health</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {managedUser.must_change_password === 1 ? 'Change Required On Next Login' : 'Password Current & Verified'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                          <Clock size={20} />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Last Recorded Activity</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {managedUser.last_login_at ? new Date(managedUser.last_login_at).toLocaleString() : 'No activity logged'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active & Recent Device Sessions Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Laptop size={18} className="text-blue-600" />
                          Logged-in Devices & Web Sessions
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Authentication session tokens, connected IP addresses, and expiry status for {managedUser.name}.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                        {managedUser.recent_sessions?.length || 0} Recorded Sessions
                      </span>
                    </div>

                    {managedUser.recent_sessions && managedUser.recent_sessions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                              <th className="px-4 py-3">Device / User Agent</th>
                              <th className="px-4 py-3">IP Address</th>
                              <th className="px-4 py-3">Login Timestamp</th>
                              <th className="px-4 py-3">Session Expiry</th>
                              <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {managedUser.recent_sessions.map((sess) => {
                              const isRevoked = sess.revoked_at !== null;
                              const isExpired = sess.expires_at ? new Date(sess.expires_at).getTime() < Date.now() : false;
                              const isActive = !isRevoked && !isExpired;

                              return (
                                <tr key={sess.id} className="hover:bg-slate-50/60 transition">
                                  <td className="px-4 py-3 text-slate-900 font-medium max-w-xs truncate" title={sess.user_agent || 'Unknown device'}>
                                    <div className="flex items-center gap-2">
                                      <Laptop size={14} className="text-slate-400 shrink-0" />
                                      <span className="truncate">{sess.user_agent || 'Browser Session'}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-slate-700">
                                    {sess.ip_address || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {new Date(sess.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {sess.expires_at ? new Date(sess.expires_at).toLocaleString() : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {isActive ? (
                                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px] uppercase">
                                        Active
                                      </span>
                                    ) : isRevoked ? (
                                      <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full font-bold text-[10px] uppercase">
                                        Revoked
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px] uppercase">
                                        Expired
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs border border-dashed border-slate-200">
                        No active login sessions recorded for this user yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODAL FOR MANAGE VIEW */}
        {showResetModal && resetUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Key size={18} className="text-amber-500" />
                  Reset Password for {resetUser.name}
                </h3>
                <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800">
                    ⚠ New password and confirm password do not match.
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">New Password <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                    />
                    <Button type="button" variant="secondary" onClick={generateRandomPass}>Generate</Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Confirm New Password <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={() => setShowResetModal(false)}>Cancel</Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={resetSubmitting || (Boolean(newPassword) && newPassword !== confirmPassword)}
                  >
                    {resetSubmitting ? 'Resetting...' : 'Confirm Reset Password'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE USER MODAL FOR MANAGE VIEW */}
        {showDeleteUserModal && deletingUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete User Account?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to soft-delete user <span className="font-bold text-slate-800">"{deletingUser.name}"</span>?
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowDeleteUserModal(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDeleteUser}>Confirm Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // NORMAL RENDER: TABBED MAIN VIEW (USERS DIRECTORY / ROLES MATRIX)
  // =========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Users &amp; Roles</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage system users, global roles, and security permissions
          </p>
        </div>

        {activeMainTab === 'users' ? (
          <Button variant="primary" onClick={handleOpenCreateUser} className="px-5 py-2.5 text-sm shadow-sm gap-2">
            <Plus size={18} /> Add New User
          </Button>
        ) : (
          <Button variant="primary" onClick={handleOpenCreateRole} className="px-5 py-2.5 text-sm shadow-sm gap-2">
            <Plus size={18} /> Create Custom Role
          </Button>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-8 pt-2">
        <button
          onClick={() => setActiveMainTab('users')}
          className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${activeMainTab === 'users'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Users size={17} /> Users Directory ({totalUsers})
        </button>

        <button
          onClick={() => setActiveMainTab('roles')}
          className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${activeMainTab === 'roles'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <ShieldCheck size={17} /> Roles & Permissions Matrix ({rolesList.length})
        </button>
      </div>

      {/* ================= TAB 1: USERS DIRECTORY ================= */}
      {activeMainTab === 'users' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{totalUsers}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Access</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{activeUserCount}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Ban size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspended</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{suspendedUserCount}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Building2 size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenants Count</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{tenants.length}</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full items-end">
              <div className="relative sm:col-span-1">
                <Input
                  label="Search"
                  placeholder="Search name, email, mobile..."
                  value={userSearch}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s@._-]/g, '');
                    setUserSearch(sanitized);
                    setUserPage(1);
                  }}
                  className="pr-8"
                  wrapperClassName="mb-0"
                />
                <Search size={14} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none" />
              </div>
              <Select
                label="Tenant"
                value={selectedTenant}
                onChange={(e) => { setSelectedTenant(e.target.value); setUserPage(1); }}
                options={[
                  { value: '', label: 'All Tenants' },
                  ...tenants.map(t => ({ value: t.id.toString(), label: t.name }))
                ]}
              />
              <Select
                label="Role"
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setUserPage(1); }}
                options={[
                  { value: '', label: 'All Roles' },
                  ...(roles.length > 0 ? roles : rolesList).map(r => ({ value: r.id.toString(), label: r.name }))
                ]}
              />
              <Select
                label="Status"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setUserPage(1); }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" onClick={handleClearUserFilters} className="text-slate-500 hover:text-slate-700">Clear</Button>
            </div>
          </div>

          {/* Users Directory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Platform User Registry</CardTitle>
            </CardHeader>
            <Table
              dense
              minWidth="1100px"
              colWidths={['25%', '15%', '18%', '16%', '11%', '15%']}
              headers={['User Details', 'Contact', 'Tenant Workspace', 'Role Mapping', 'Status', 'Actions']}
            >
              {userLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-300" />
                    Loading users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    No users found matching your query or filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleOpenManageUser(u)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900 text-sm">{u.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {u.email}
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                        {u.mobile ? (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone size={12} className="text-slate-400" /> {u.mobile}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs">
                          <Building2 size={12} className="text-slate-400" />
                          {u.tenant_name || `Tenant #${u.tenant_id}`}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] uppercase tracking-wider border border-blue-100">
                          {u.role_name || u.user_type}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-xs uppercase border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-full text-xs uppercase border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenManageUser(u)}
                            title="Manage User & Permissions"
                            className="text-xs px-2.5 py-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-semibold gap-1"
                          >
                            <Sliders size={13} />
                            Manage
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => { setDeletingUser(u); setShowDeleteUserModal(true); }}
                            title="Delete User"
                            className="text-xs px-2.5 py-1 font-semibold gap-1"
                          >
                            <Trash2 size={13} />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </Table>

            <Pagination
              currentPage={userPage}
              totalPages={userTotalPages}
              totalItems={totalUsers}
              pageSize={userLimit}
              onPageChange={setUserPage}
              onPageSizeChange={setUserLimit}
            />
          </Card>
        </div>
      )}

      {/* ================= TAB 2: ROLES & PERMISSIONS MATRIX ================= */}
      {activeMainTab === 'roles' && (
        <div className="space-y-6">
          {/* Roles KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Roles</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{rolesList.length}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Lock size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Roles</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{systemRolesCount}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Shield size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custom Roles</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{customRolesCount}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Layers size={22} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permissions</div>
                <div className="text-2xl font-extrabold text-slate-800 mt-0.5">{rawPermissions.length}</div>
              </div>
            </div>
          </div>

          {/* Roles Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full items-end">
              <Input
                label="Search Roles"
                placeholder="Search role name..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                wrapperClassName="sm:col-span-2"
              />
              <Select
                label="Role Category"
                value={roleTypeFilter}
                onChange={(e) => setRoleTypeFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'system', label: 'Built-in System Roles' },
                  { value: 'custom', label: 'Custom Global Roles' }
                ]}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" onClick={() => { setRoleSearch(''); setRoleTypeFilter('all'); }} className="text-slate-500 hover:text-slate-700">Clear</Button>
            </div>
          </div>

          {/* Roles Table Format */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Roles Registry</CardTitle>
            </CardHeader>
            <Table
              dense
              minWidth="1050px"
              colWidths={['22%', '28%', '14%', '12%', '12%', '12%']}
              headers={['Role Name', 'Description', 'Type', 'Assigned Users', 'Permissions', 'Status', 'Actions']}
            >
              {rolesLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-300" />
                    Loading roles list...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    No roles found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((r) => {
                  const isSystem = r.is_system === 1;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleOpenEditRole(r)}>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-sm">{r.name}</div>
                      </td>

                      <td className="px-3.5 py-3 text-sm">
                        <span className="text-slate-600 max-w-xs block truncate" title={r.description || ''}>
                          {r.description || <span className="text-slate-300">No description</span>}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${isSystem
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {isSystem ? (
                            <span className="inline-flex items-center gap-1">
                              <Lock size={12} /> System Role
                            </span>
                          ) : (
                            'Custom Role'
                          )}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs">
                          <Users size={12} className="text-slate-400" /> {r.users_count} Users
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-100">
                          <Layers size={12} className="text-blue-500" /> {r.permissions_count} Perms
                        </span>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {r.is_active === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-xs uppercase border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-full text-xs uppercase border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRole(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Permissions Matrix"
                          >
                            <ShieldCheck size={15} />
                          </button>

                          {!isSystem && (
                            <button
                              type="button"
                              onClick={() => { setDeletingRole(r); setShowDeleteRoleModal(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Custom Role"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </Table>
          </Card>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in relative z-10 my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> Provision New Platform User
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Belongs To Tenant <span className="text-red-500">*</span></label>
                <select value={formTenantId} onChange={(e) => setFormTenantId(Number(e.target.value))} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition">
                  {tenants.map(t => (<option key={t.id} value={t.id}>{t.name} ({t.slug})</option>))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="ramesh@tenant.com" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Mobile Number</label>
                  <input type="text" value={formMobile} onChange={(e) => setFormMobile(e.target.value)} placeholder="+91 9876543210" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">User Type / Category <span className="text-red-500">*</span></label>
                  <select value={formUserType} onChange={(e) => setFormUserType(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition">
                    <option value="saas-admin">SaaS Owner</option>
                    <option value="inst-admin">Inst Owner</option>
                    <option value="branch-admin">Branch Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="counsellor">Counsellor</option>
                    <option value="finance">Finance Staff</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Global Role Mapping</label>
                  <select value={formRoleId} onChange={(e) => setFormRoleId(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition">
                    <option value="">No Role (Default)</option>
                    {rolesList.map(r => (<option key={r.id} value={r.id}>{r.name} ({r.code})</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Account Status</label>
                  <select value={formUserStatus} onChange={(e) => setFormUserStatus(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Initial Password <span className="text-red-500">*</span></label>
                <input type="password" required value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Enter initial secure password..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {showRoleModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRoleModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in relative z-10 my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                {editingRole ? `Edit Role & Permissions: ${editingRole.name}` : 'Create Custom Global Role'}
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitRole} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Role Display Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Content Manager" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Unique Role Code <span className="text-red-500">*</span></label>
                    <input type="text" required disabled={!!editingRole} value={roleCode} onChange={(e) => setRoleCode(e.target.value)} placeholder="e.g. content_manager" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Description</label>
                  <textarea rows={2} value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} placeholder="Describe role responsibilities..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition resize-none" />
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Permission Assignment Matrix</h4>
                      <p className="text-xs text-slate-500">Select fine-grained access control permissions for this role.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {selectedPermissionIds.length} Selected
                    </span>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                      const modulePermIds = perms.map(p => p.id);
                      const allSelected = modulePermIds.every(id => selectedPermissionIds.includes(id));
                      return (
                        <div key={moduleName} className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Shield size={14} className="text-blue-600" />
                              {moduleName.replace('_', ' ')} Module ({perms.length})
                            </span>
                            <button type="button" onClick={() => handleToggleModulePermissions(moduleName)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
                              {allSelected ? 'Unselect All' : 'Select All'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {perms.map((p) => {
                              const isChecked = selectedPermissionIds.includes(p.id);
                              return (
                                <label key={p.id} onClick={() => handleTogglePermission(p.id)} className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition cursor-pointer select-none ${isChecked ? 'bg-blue-50/80 border-blue-200 text-blue-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                                  <input type="checkbox" checked={isChecked} onChange={() => { }} className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold leading-tight flex items-center justify-between">
                                      <span>{p.code}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{p.description}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
                <Button type="button" variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={roleSubmitting}>
                  {roleSubmitting ? 'Saving Matrix...' : editingRole ? 'Update Role Matrix' : 'Create Role'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && resetUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowResetModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative z-10 my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key size={18} className="text-amber-500" />
                Reset Password for {resetUser.name}
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800">
                  ⚠ New password and confirm password do not match.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">New Password <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                  />
                  <Button type="button" variant="secondary" onClick={generateRandomPass}>Generate</Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Confirm New Password <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setShowResetModal(false)}>Cancel</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={resetSubmitting || (Boolean(newPassword) && newPassword !== confirmPassword)}
                >
                  {resetSubmitting ? 'Resetting...' : 'Confirm Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE USER MODAL */}
      {showDeleteUserModal && deletingUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteUserModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in relative z-10 my-auto">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete User Account?</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                Are you sure you want to delete user <span className="font-bold text-slate-900">"{deletingUser.name}"</span>?
              </p>
              {deletingUser.email && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {deletingUser.email}
                </p>
              )}
              <div className="mt-3 p-3 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-700 text-left flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 text-red-500 mt-0.5" />
                <span>
                  This action will revoke login access and mark this account as deleted.
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteUserModal(false)}
                disabled={deleteSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                disabled={deleteSubmitting}
                className="gap-1.5"
              >
                {deleteSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Confirm Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE ROLE MODAL */}
      {showDeleteRoleModal && deletingRole && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteRoleModal(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in relative z-10 my-auto">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Custom Role?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to soft-delete custom role <span className="font-bold text-slate-800">"{deletingRole.name}"</span> ({deletingRole.code})?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowDeleteRoleModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteRole}>Confirm Delete</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REVOKE ROLE CONFIRMATION MODAL */}
      {revokingRole && managedUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setRevokingRole(null)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in relative z-10 my-auto">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revoke Role Assignment?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to revoke role <span className="font-bold text-slate-800">"{revokingRole.roleName}"</span> from user <span className="font-bold text-slate-800">{managedUser.name}</span>?
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                This will immediately remove all permissions associated with this role from the user.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setRevokingRole(null)} disabled={revokingSubmitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmRevokeRole} disabled={revokingSubmitting}>
                {revokingSubmitting ? 'Revoking...' : 'Confirm Revoke'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REVOKE PERMISSION OVERRIDE CONFIRMATION MODAL */}
      {revokingPermission && managedUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setRevokingPermission(null)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in relative z-10 my-auto">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revoke Permission Access?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to explicitly revoke permission <code className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{revokingPermission.code}</code> for user <span className="font-bold text-slate-800">{managedUser.name}</span>?
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                This will block access to this specific permission even if assigned through a global role.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setRevokingPermission(null)} disabled={revokingPermissionSubmitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmRevokePermission} disabled={revokingPermissionSubmitting}>
                {revokingPermissionSubmitting ? 'Revoking...' : 'Confirm Revoke'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
