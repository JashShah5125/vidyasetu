import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  BookOpen,
  GraduationCap,
  Calendar,
  CheckSquare,
  DollarSign,
  MessageSquare,
  ClipboardList,
  Settings,
  AlertTriangle,
  Bell,
  Layers,
  CreditCard,
  FileText,
  Ticket,
  BarChart3,
  ChevronLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const roleLabels: Record<string, string> = {
  'saas-admin': 'SaaS Owner',
  'inst-admin': 'Inst Owner',
  'branch-admin': 'Branch Admin',
  'counsellor': 'Counsellor',
  'teacher': 'Teacher',
  'finance': 'Finance Staff'
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

  const getSidebarLinks = (role: string) => {
    switch (role) {
      case 'saas-admin':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Tenants Manager', path: '/tenants', icon: Building2 },
          { name: 'Plan Master', path: '/plans', icon: CreditCard },
          { name: 'Tenant Subscriptions', path: '/tenant-subscriptions', icon: FileText },
          { name: 'Global Providers', path: '/providers', icon: Settings },
          { name: 'Audit Logs', path: '/audit-logs', icon: ClipboardList }
        ];
      case 'inst-admin':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Institute Setup', path: '/institute', icon: Settings },
          { name: 'Branches Manager', path: '/branches', icon: Building2 },
          { name: 'Courses', path: '/courses', icon: BookOpen },
          { name: 'Subject Management', path: '/subjects', icon: BookOpen },
          { name: 'Batch Management', path: '/batches', icon: Layers },
          { name: 'Fees Master', path: '/fees-master', icon: DollarSign },
          { name: 'Staff & Roles', path: '/staff', icon: ShieldCheck },
          { name: 'Leads & Admissions', path: '/leads', icon: Users },
          { name: 'Students Roster', path: '/students', icon: GraduationCap },
          { name: 'Record Fee', path: '/fees', icon: DollarSign },
          { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
          { name: 'Assignment and Exams', path: '/assignments', icon: BookOpen },
          { name: 'Exam Grading', path: '/exams', icon: ClipboardList },
          { name: 'Reports', path: '/reports', icon: ClipboardList },
          { name: 'Broadcast Notification', path: '/notifications', icon: Bell },
          { name: 'Settings', path: '/settings', icon: Settings },
          { name: 'Audit Logs', path: '/audit-logs', icon: ClipboardList }
        ];
      case 'branch-admin':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Students Roster', path: '/students', icon: GraduationCap },
          { name: 'Leads & Admissions', path: '/leads', icon: Users },
          { name: 'Courses', path: '/courses', icon: BookOpen },
          { name: 'Subject Management', path: '/subjects', icon: BookOpen },
          { name: 'Batch Management', path: '/batches', icon: Layers },
          { name: 'Fees Master', path: '/fees-master', icon: DollarSign },
          { name: 'Staff & Roles', path: '/staff', icon: ShieldCheck },
          { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
          { name: 'Record Fee', path: '/fees', icon: DollarSign },
          { name: 'Defaulters Ledger', path: '/defaulters', icon: AlertTriangle },
          { name: 'Academic Timetable', path: '/timetable', icon: Calendar },
          { name: 'Reports', path: '/reports', icon: ClipboardList }
        ];
      case 'counsellor':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Leads & Admissions', path: '/leads', icon: Users }
        ];
      case 'teacher':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'My Schedule', path: '/my-schedule', icon: Calendar },
          { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
          { name: 'Assignment and Exams', path: '/assignments', icon: BookOpen },
          { name: 'Exam Grading', path: '/exams', icon: ClipboardList },
          { name: 'Doubt Chats', path: '/doubts', icon: MessageSquare, badge: 1 }
        ];
      case 'finance':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Record Fee', path: '/fees', icon: DollarSign },
          { name: 'Defaulters Ledger', path: '/defaulters', icon: AlertTriangle },
          { name: 'Reports', path: '/reports', icon: ClipboardList }
        ];
      default:
        return [];
    }
  };

  const saasAdminSections: {
    title?: string;
    links: { name: string; label: string; path: string; icon: any; badge?: number }[];
  }[] = [
    { links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
    {
      title: 'Tenant Management',
      links: [{ name: 'Tenants Manager', label: 'Tenants', path: '/tenants', icon: Building2 }]
    },
    {
      title: 'Subscription Management',
      links: [
        { name: 'Plan Master', label: 'Plans', path: '/plans', icon: CreditCard },
        { name: 'Tenant Subscriptions', label: 'Tenant Subscriptions', path: '/tenant-subscriptions', icon: FileText }
      ]
    },
    {
      title: 'Platform',
      links: [
        { name: 'Feature Flags', label: 'Feature Flags', path: '/feature-flags', icon: CheckSquare },
        { name: 'Module Management', label: 'Module Management', path: '/modules', icon: BookOpen }
      ]
    },
    {
      title: 'Operations',
      links: [
        { name: 'Approval Center', label: 'Approval Center', path: '/approvals', icon: CheckSquare },
        { name: 'Support Tickets', label: 'Support Tickets', path: '/support', icon: Ticket, badge: 3 },
        { name: 'Communication', label: 'Communication', path: '/communication', icon: MessageSquare }
      ]
    },
    {
      title: 'Business',
      links: [
        { name: 'Billing & Revenue', label: 'Billing & Revenue', path: '/billing', icon: DollarSign },
        { name: 'SaaS Reports', label: 'Reports', path: '/saas-reports', icon: ClipboardList },
        { name: 'Product Analytics', label: 'Product Analytics', path: '/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'System',
      links: [
        { name: 'Global Providers', label: 'Integrations', path: '/providers', icon: Settings },
        { name: 'Audit Logs', label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList },
        { name: 'System Configuration', label: 'System Configuration', path: '/system-config', icon: Settings }
      ]
    },
    {
      title: 'Support Desk',
      links: [{ name: 'Settings', label: 'Settings', path: '/settings', icon: Settings }]
    }
  ];

  const links = getSidebarLinks(currentUser.role);
  const isSaasAdmin = currentUser.role === 'saas-admin';

  // Render a single nav item — works in both expanded and collapsed mode
  const NavItem = ({
    path,
    icon: Icon,
    label,
    badge,
  }: {
    path: string;
    icon: any;
    label: string;
    badge?: number;
  }) => {
    const isActive = location.pathname.startsWith(path);
    return (
      <div
        onClick={() => { navigate(path); onClose(); }}
        className={`
          group relative flex items-center rounded-lg cursor-pointer select-none
          transition-all duration-150 border
          ${isCollapsed
            ? 'w-10 h-10 mx-auto justify-center px-0'
            : 'gap-3 px-3 py-2.5 w-full'
          }
          ${isActive
            ? 'bg-blue-600/10 text-blue-400 border-blue-500/20'
            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-transparent'
          }
        `}
        title={isCollapsed ? label : undefined}
      >
        {/* Icon */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <Icon size={18} />
          {/* Badge in collapsed mode: dot on icon */}
          {isCollapsed && badge !== undefined && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {badge}
            </span>
          )}
        </div>

        {/* Tooltip when collapsed */}
        {isCollapsed && (
          <span className="
            absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2
            z-[200] whitespace-nowrap
            bg-slate-800 border border-slate-700
            text-slate-100 text-xs font-semibold
            px-2.5 py-1.5 rounded-lg shadow-xl
            opacity-0 group-hover:opacity-100
            pointer-events-none
            transition-opacity duration-150
          ">
            {label}
            {/* Arrow */}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-800" />
          </span>
        )}

        {/* Label (expanded only) */}
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium whitespace-nowrap flex-1 min-w-0 truncate">
              {label}
            </span>
            {badge !== undefined && (
              <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                {badge}
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
        />
      )}

      {/* Sidebar */}
      <div
        style={{ width: isCollapsed ? '72px' : '288px' }}
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-slate-900 border-r border-slate-800
          flex flex-col h-full flex-shrink-0 text-slate-300
          transition-[width] duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-hidden
        `}
      >
        {/* Brand header */}
        <div 
          onClick={isCollapsed ? onToggleCollapse : undefined}
          className={`h-16 border-b border-slate-800 flex items-center flex-shrink-0 px-4 justify-between gap-3 ${
            isCollapsed ? 'cursor-pointer hover:bg-slate-800/30' : ''
          }`}
          title={isCollapsed ? 'Expand sidebar' : undefined}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20 flex-shrink-0">
              VS
            </div>
            <span
              className={`font-display font-bold text-xl text-white tracking-tight whitespace-nowrap transition-opacity duration-300 ${
                isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              Vidya Setu
            </span>
          </div>
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer flex items-center justify-center"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
          {isSaasAdmin ? (
            saasAdminSections.map((section, sIdx) => (
              <div key={sIdx}>
                {/* Section heading */}
                {section.title && (
                  <div className={`transition-all duration-200 overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-3 pb-1 border-t border-slate-800/50">
                      {section.title}
                    </div>
                  </div>
                )}
                {section.title && isCollapsed && sIdx > 0 && (
                  <div className="my-2 border-t border-slate-800/50 mx-2" />
                )}
                <div className="space-y-0.5">
                  {section.links.map((link, idx) => (
                    <NavItem key={idx} path={link.path} icon={link.icon} label={link.label} badge={link.badge} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <>
              {!isCollapsed && (
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                  Management Desk
                </div>
              )}
              <div className="space-y-0.5">
                {links.map((link: any, idx) => (
                  <NavItem key={idx} path={link.path} icon={link.icon} label={link.name} badge={link.badge} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 flex-shrink-0">

          <div className="p-3">
            <div
              onClick={() => { navigate('/settings'); onClose(); }}
              className={`flex items-center gap-3 bg-slate-800/20 hover:bg-slate-800/50 rounded-xl border border-slate-800/40 cursor-pointer transition-all duration-150 overflow-hidden ${isCollapsed ? 'p-1.5 justify-center' : 'p-2'}`}
              title={isCollapsed ? `${currentUser.name} (${roleLabels[currentUser.role]})` : undefined}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentUser.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className={`min-w-0 flex-1 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate mt-0.5">
                  {roleLabels[currentUser.role]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
