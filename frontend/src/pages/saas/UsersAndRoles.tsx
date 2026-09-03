import React, { useState, useEffect, useCallback } from 'react';
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
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';

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

interface UserFullDetails extends UserRecord {
  assigned_roles: AssignedRole[];
  role_wise_permissions: RoleWisePermissionGroup[];
  overridden_permissions?: UserOverrideRecord[];
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
  const [manageUserTab, setManageUserTab] = useState<'profile' | 'roles' | 'permissions'>('profile');
  const [managedUser, setManagedUser] = useState<UserFullDetails | null>(null);
  const [manageLoading, setManageLoading] = useState(false);

  // Assign Role Modal (Inside Sub-Tab 2)
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [assigningRoleId, setAssigningRoleId] = useState<number | null>(null);

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
          userType: selectedRole,
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

  // Revoke Role from User Handler
  const handleRevokeUserRole = async (roleId: number, roleNameStr: string) => {
    if (!managedUser) return;
    try {
      const res = await api.delete(`/admin/users/${managedUser.id}/roles/${roleId}`);
      if (res.data.status === 'success') {
        addToast(`Role "${roleNameStr}" revoked from ${managedUser.name}.`, 'info');
        reloadManagedUser(managedUser.id);
        fetchUsers();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to revoke role.', 'error');
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
    } catch (err) {
      addToast('Failed to delete user.', 'error');
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
            <div className="flex border-b border-slate-200 gap-8 pt-2">
              <button
                onClick={() => setManageUserTab('profile')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${manageUserTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <User size={17} /> 1. Overview & Profile
              </button>

              <button
                onClick={() => setManageUserTab('roles')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${manageUserTab === 'roles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <ShieldCheck size={17} /> User Roles ({managedUser.assigned_roles?.length || 0})
              </button>

              <button
                onClick={() => setManageUserTab('permissions')}
                className={`pb-3 text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${manageUserTab === 'permissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Layers size={17} /> Role-Wise Permissions Breakdown
              </button>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {/* SUB TAB 1: OVERVIEW & PROFILE */}
              {manageUserTab === 'profile' && (
                <form onSubmit={handleUpdateManagedUser} className="space-y-6 max-w-4xl">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">User Profile Settings</h3>
                    <p className="text-xs text-slate-500">Update account details, tenant assignment, and access privileges.</p>
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
                        <option value="teacher">Teacher</option>
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
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Quick Actions</h4>
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
                              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${r.is_system === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                {r.is_system === 1 ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Lock size={12} /> System Role
                                  </span>
                                ) : (
                                  'Custom Role'
                                )}
                              </span>

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
                                onClick={() => handleRevokeUserRole(r.id, r.name)}
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
                                            disabled={isSavingThis}
                                            onClick={() => handleQuickSaveOverride(p.id, 'revoke')}
                                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                                          >
                                            <Ban size={13} /> {isSavingThis ? 'Revoking...' : 'Revoke Permission'}
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
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                            <tr>
                              <th className="p-3.5">Permission Code</th>
                              <th className="p-3.5">Module / Action</th>
                              <th className="p-3.5">Description</th>
                              <th className="p-3.5">Base Role Status</th>
                              <th className="p-3.5">Override State</th>
                              <th className="p-3.5">Effective Status</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700">
                            {managedUser.overridden_permissions.map((op) => (
                              <tr key={op.id} className="hover:bg-slate-50/70 transition">
                                <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                                  <Check size={14} className="text-blue-600" />
                                  <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                                    {op.permission_code}
                                  </code>
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded">
                                      {op.module}
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] uppercase rounded">
                                      {op.action}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-slate-500 max-w-xs truncate">
                                  {op.description}
                                </td>
                                <td className="p-3.5">
                                  {op.base_role_status === 'Granted' ? (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-full text-[11px] inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Granted by Role
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 font-bold rounded-full text-[11px] inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Not Granted by Role
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  {op.override_type === 'grant' ? (
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-extrabold rounded-full text-[11px] inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Direct Grant
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 font-extrabold rounded-full text-[11px] inline-flex items-center gap-1">
                                      <Ban size={12} /> Revoked (Denied)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 font-bold">
                                  {op.effective_status === 'Granted' ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-extrabold text-xs inline-flex items-center gap-1">
                                      🟢 Granted
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-extrabold text-xs inline-flex items-center gap-1">
                                      🔴 Denied
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOverride(op.id, op.permission_code)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1 border border-red-200"
                                    title="Remove override and revert to role default"
                                  >
                                    <Trash2 size={13} /> Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: ROLE-WISE INHERITED PERMISSIONS BREAKDOWN */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900">Role-Wise Inherited Permissions Breakdown</h3>
                      <p className="text-xs text-slate-500">
                        Read-only view of permissions automatically inherited from assigned global roles.
                      </p>
                    </div>

                    {managedUser.role_wise_permissions?.length === 0 ? (
                      <div className="p-12 text-center bg-slate-50 rounded-2xl text-slate-400 text-sm">
                        No permissions found for this user's assigned roles.
                      </div>
                    ) : (
                      managedUser.role_wise_permissions.map((group) => (
                        <div key={group.role_code} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                          {/* Role Group Header */}
                          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-3">
                              <ShieldCheck size={20} className="text-blue-600" />
                              <h4 className="text-base font-bold text-slate-900">{group.role_name}</h4>
                              <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                {group.role_code}
                              </code>
                            </div>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                              {group.permissions.length} Active Permissions
                            </span>
                          </div>

                          {/* Permissions Table */}
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  <th className="px-4 py-3">Permission Code</th>
                                  <th className="px-4 py-3">Module</th>
                                  <th className="px-4 py-3">Action</th>
                                  <th className="px-4 py-3">Description</th>
                                  <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                                {group.permissions.map((p) => (
                                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                      <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                                          <Check size={10} />
                                        </span>
                                        {p.code}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-extrabold rounded text-[10px] uppercase font-mono border border-slate-200">
                                        {p.module}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded text-[11px]">
                                        {p.action}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {p.description}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        Granted
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
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
          <h2 className="text-2xl font-bold font-display text-slate-900">Users & Roles Center</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage system users, define custom global roles, and configure security permission assignment matrices.
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
              <Input
                label="Search"
                placeholder="Search name, email, mobile..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                wrapperClassName="sm:col-span-1"
              />
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
                label="User Type / Role"
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setUserPage(1); }}
                options={[
                  { value: '', label: 'All Roles / Types' },
                  { value: 'saas-admin', label: 'SaaS Owner' },
                  { value: 'inst-admin', label: 'Inst Owner' },
                  { value: 'branch-admin', label: 'Branch Admin' },
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'counsellor', label: 'Counsellor' },
                  { value: 'finance', label: 'Finance Staff' }
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">User Details</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Tenant Workspace</th>
                    <th className="px-5 py-3.5">Role Mapping</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">App Access</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {userLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-300" />
                        Loading users directory...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        No users found matching your query or filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSuspended = u.app_access_suspended === 1;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                {u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                                <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                                  <Mail size={12} /> {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            {u.mobile ? (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Phone size={12} className="text-slate-400" /> {u.mobile}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs">
                              <Building2 size={12} className="text-slate-400" />
                              {u.tenant_name || `Tenant #${u.tenant_id}`}
                            </span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] uppercase tracking-wider border border-blue-100">
                                {u.role_name || u.user_type}
                              </span>
                              {u.role_code && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  code: {u.role_code}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            {u.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] uppercase border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-full text-[10px] uppercase border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggleSuspension(u)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1 ${isSuspended
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                }`}
                              title={isSuspended ? 'Click to Restore Access' : 'Click to Suspend Access'}
                            >
                              {isSuspended ? (
                                <>
                                  <Ban size={12} /> Suspended
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={12} /> Allowed
                                </>
                              )}
                            </button>
                          </td>

                          {/* ACTIONS COLUMN: Single Manage Button */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleOpenManageUser(u)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition cursor-pointer inline-flex items-center gap-1.5 border border-blue-200/60 shadow-2xs"
                            >
                              <Sliders size={14} /> Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={userPage}
              totalPages={userTotalPages}
              totalItems={totalUsers}
              pageSize={userLimit}
              onPageChange={setUserPage}
              onPageSizeChange={setUserLimit}
            />
          </div>
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
                placeholder="Search role name, code..."
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Role & System Code</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5 text-center">Assigned Users</th>
                    <th className="px-5 py-3.5 text-center">Permissions</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {rolesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-300" />
                        Loading roles list...
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        No roles found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((r) => {
                      const isSystem = r.is_system === 1;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs flex-shrink-0 ${isSystem ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                <ShieldCheck size={18} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                                <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                                  code: {r.code}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-slate-600 max-w-xs block truncate" title={r.description || ''}>
                              {r.description || <span className="text-slate-300">No description</span>}
                            </span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
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

                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs">
                              <Users size={12} className="text-slate-400" /> {r.users_count} Users
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-100">
                              <Layers size={12} className="text-blue-500" /> {r.permissions_count} Perms
                            </span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            {r.is_active === 1 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px] uppercase border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-full text-[10px] uppercase border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditRole(r)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                title="Edit Permissions Matrix"
                              >
                                <ShieldCheck size={14} className="text-blue-600" /> Matrix
                              </button>

                              {!isSystem && (
                                <button
                                  onClick={() => { setDeletingRole(r); setShowDeleteRoleModal(true); }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
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
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
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
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
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

      {/* DELETE USER MODAL */}
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

      {/* DELETE ROLE MODAL */}
      {showDeleteRoleModal && deletingRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in">
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
        </div>
      )}
    </div>
  );
};
