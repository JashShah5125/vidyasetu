import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, logout } = useApp();

  if (!currentUser) return null;

  const roleLabels: Record<string, string> = {
    'saas-admin': 'SaaS Super Admin',
    'inst-admin': 'Institute Admin',
    'branch-admin': 'Branch Admin',
    'counsellor': 'Counsellor / Admissions',
    'teacher': 'Teacher / Faculty',
    'finance': 'Finance Staff'
  };

  const currentRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'saas-admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'inst-admin': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'branch-admin': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'counsellor': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'teacher': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'finance': return 'bg-pink-50 text-pink-700 border-pink-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="h-16 border-b border-slate-200/80 bg-white flex items-center justify-between px-4 md:px-8 flex-shrink-0">

      {/* Mapped Tenant badge indicators */}
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="whitespace-nowrap truncate max-w-[100px] sm:max-w-none">{currentUser.tenantName}</span>
        </div>
        {currentUser.branch && (
          <span className="hidden sm:inline-block text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
            Branch: {currentUser.branch}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">

        {/* Current Role badge indicator */}
        <span className={`px-2.5 py-1.5 border rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider select-none whitespace-nowrap ${currentRoleBadgeColor(currentUser.role)}`}>
          {roleLabels[currentUser.role]}
        </span>

        {/* Global logout button */}
        <button
          onClick={logout}
          className="p-2 border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer shadow-sm"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>

      </div>
    </div>
  );
};
