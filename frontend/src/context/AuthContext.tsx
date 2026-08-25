import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Role, UserProfile } from '../data/mockData';
import api from '../services/api';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load user from local storage initially
    const savedUser = localStorage.getItem('vs_current_user');
    const accessToken = localStorage.getItem('vs_token');
    if (savedUser && accessToken) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
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
      localStorage.removeItem('vs_current_user');
    };

    window.addEventListener('auth:force-logout', handleForceLogout);
    return () => {
      window.removeEventListener('auth:force-logout', handleForceLogout);
    };
  }, []);

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
          name: user.name,
          email: user.email,
          role: (user.isSaasAdmin ? 'saas-admin' : user.userType || 'inst-admin') as Role,
          tenantId: user.tenantId,
          tenantName: user.tenantId === 'SYSTEM' ? 'Vidya Setu Platform' : 'Institute Name', // Could be fetched from backend
          branch: user.branch || '',
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
      setCurrentUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
