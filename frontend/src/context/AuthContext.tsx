import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Role, UserProfile } from '../types';
import api from '../services/api';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  isImpersonating: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  impersonateTenant: (tenantId: string | number) => Promise<boolean>;
  exitImpersonation: () => void;
  error: string | null;
  updateCurrentUser: (fields: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRole = (userType: string | undefined): Role => {
  const t = (userType || '').trim().toLowerCase();
  if (!t) return 'inst-admin';
  // Backend stores snake_case user types (inst_admin, branch_admin, ...)
  return t.replace(/_/g, '-') as Role;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load user from local storage initially
    const savedUser = localStorage.getItem('vs_current_user');
    const accessToken = localStorage.getItem('vs_token');
    const hasImpersonationBackup = Boolean(localStorage.getItem('vs_impersonator_backup'));
    setIsImpersonating(hasImpersonationBackup);

    if (savedUser && accessToken) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch {
        localStorage.removeItem('vs_current_user');
      }
    } else if (savedUser) {
      // Do not restore an authenticated UI state when its access token is gone.
      localStorage.removeItem('vs_current_user');
      localStorage.removeItem('vs_refresh_token');
    }
    setIsLoading(false);

    const handleForceLogout = () => {
      setCurrentUser(null);
      setIsImpersonating(false);
      localStorage.removeItem('vs_current_user');
      localStorage.removeItem('vs_impersonator_backup');
    };

    window.addEventListener('auth:force-logout', handleForceLogout);
    return () => {
      window.removeEventListener('auth:force-logout', handleForceLogout);
    };
  }, []);

  const updateCurrentUser = (fields: Partial<UserProfile>) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      localStorage.setItem('vs_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.status === 'success') {
        const { token, refreshToken, user } = response.data.data;
        
        // Store tokens
        localStorage.setItem('vs_token', token);
        if (refreshToken) {
          localStorage.setItem('vs_refresh_token', refreshToken);
        }

        // Map backend user to frontend UserProfile
        const profile: UserProfile = {
          id: user.id ? String(user.id) : undefined,
          name: user.name,
          email: user.email,
          role: (user.isSaasAdmin ? 'saas-admin' : normalizeRole(user.userType)) as Role,
          tenantId: user.tenantId !== undefined && user.tenantId !== null ? String(user.tenantId) : undefined,
          tenantName: user.tenantName || (user.isSaasAdmin ? 'Vidya Setu Platform' : 'Institute Name'),
          branch: user.branch || '',
          branchId: user.branchId ? String(user.branchId) : undefined,
          branchCode: user.branchCode || undefined,
          mustChangePassword: Boolean(user.mustChangePassword)
        };

        setCurrentUser(profile);
        localStorage.setItem('vs_current_user', JSON.stringify(profile));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const impersonateTenant = async (tenantId: string | number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Backup current SaaS Super Admin credentials before switching
      if (!localStorage.getItem('vs_impersonator_backup')) {
        const backup = {
          token: localStorage.getItem('vs_token'),
          refreshToken: localStorage.getItem('vs_refresh_token'),
          user: localStorage.getItem('vs_current_user')
        };
        localStorage.setItem('vs_impersonator_backup', JSON.stringify(backup));
      }

      // 2. Call backend impersonation endpoint
      const response = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      if (response.data.status === 'success') {
        const { token, refreshToken, user } = response.data.data;

        localStorage.setItem('vs_token', token);
        if (refreshToken) {
          localStorage.setItem('vs_refresh_token', refreshToken);
        }

        const profile: UserProfile = {
          id: user.id ? String(user.id) : undefined,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.userType),
          tenantId: user.tenantId !== undefined && user.tenantId !== null ? String(user.tenantId) : undefined,
          tenantName: user.tenantName || 'Institute Name',
          branch: user.branch || '',
          branchId: user.branchId ? String(user.branchId) : undefined,
          branchCode: user.branchCode || undefined,
          mustChangePassword: false,
          isImpersonated: true
        };

        setCurrentUser(profile);
        setIsImpersonating(true);
        localStorage.setItem('vs_current_user', JSON.stringify(profile));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login as tenant.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const exitImpersonation = () => {
    const backupRaw = localStorage.getItem('vs_impersonator_backup');
    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw);
        if (backup.token) localStorage.setItem('vs_token', backup.token);
        if (backup.refreshToken) localStorage.setItem('vs_refresh_token', backup.refreshToken);
        if (backup.user) {
          localStorage.setItem('vs_current_user', backup.user);
          setCurrentUser(JSON.parse(backup.user));
        }
      } catch (e) {
        console.error('Failed to restore SaaS Admin session:', e);
      } finally {
        localStorage.removeItem('vs_impersonator_backup');
        setIsImpersonating(false);
      }
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const refreshToken = localStorage.getItem('vs_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear all auth state regardless of API success
      localStorage.removeItem('vs_token');
      localStorage.removeItem('vs_refresh_token');
      localStorage.removeItem('vs_current_user');
      localStorage.removeItem('vs_impersonator_backup');
      setCurrentUser(null);
      setIsImpersonating(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, isImpersonating, login, logout, impersonateTenant, exitImpersonation, error, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const defaultAuthContext: AuthContextType = {
  currentUser: null,
  isLoading: false,
  isImpersonating: false,
  login: async () => false,
  logout: async () => {},
  impersonateTenant: async () => false,
  exitImpersonation: () => {},
  error: null,
  updateCurrentUser: () => {},
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return defaultAuthContext;
  }
  return context;
};

