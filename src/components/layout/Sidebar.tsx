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
  CreditCard,
  FileText,
  Ticket,
  BarChart3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
          { name: 'Courses & Batches', path: '/courses', icon: BookOpen },
          { name: 'Staff & Roles', path: '/staff', icon: ShieldCheck },
          { name: 'Leads CRM', path: '/leads', icon: Users },
          { name: 'Admissions', path: '/admissions', icon: ClipboardList },
          { name: 'Students Roster', path: '/students', icon: GraduationCap },
          { name: 'Record Fee', path: '/fees', icon: DollarSign },
          { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
          { name: 'Assignments', path: '/assignments', icon: BookOpen },
          { name: 'Exam Marks', path: '/exams', icon: ClipboardList },
          { name: 'Reports', path: '/reports', icon: ClipboardList },
          { name: 'Notifications', path: '/notifications', icon: Bell },
          { name: 'Settings', path: '/settings', icon: Settings },
          { name: 'Audit Logs', path: '/audit-logs', icon: ClipboardList }
        ];
      case 'branch-admin':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Students Roster', path: '/students', icon: GraduationCap },
          { name: 'Leads CRM', path: '/leads', icon: Users },
          { name: 'Admissions', path: '/admissions', icon: ClipboardList },
          { name: 'Courses & Batches', path: '/courses', icon: BookOpen },
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
          { name: 'Leads CRM', path: '/leads', icon: Users },
          { name: 'Convert Wizard', path: '/convert-wizard', icon: ShieldCheck },
          { name: 'Admissions', path: '/admissions', icon: ClipboardList }
        ];
      case 'teacher':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'My Schedule', path: '/my-schedule', icon: Calendar },
          { name: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
          { name: 'Assignments', path: '/assignments', icon: BookOpen },
          { name: 'Exam Marks', path: '/exams', icon: ClipboardList },
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
    {
      links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }]
    },
    {
      title: 'Tenant Management',
      links: [
        { name: 'Tenants Manager', label: 'Tenants', path: '/tenants', icon: Building2 }
      ]
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
      links: [
        { name: 'Settings', label: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  const links = getSidebarLinks(currentUser.role);
  const isSaasAdmin = currentUser.role === 'saas-admin';

  return (
    <>
      {/* Backdrop overlay for mobile view */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer animate-fade-in"
        />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      {/* Brand Branding logo */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
          VS
        </div>
        <span className="font-display font-bold text-xl text-white tracking-tight">
          Vidya Setu
        </span>
      </div>

      {/* Navigation menu list */}
      <div className="flex-1 py-6 px-4 overflow-y-auto space-y-4">
        {isSaasAdmin ? (
          saasAdminSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {section.title && (
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1 border-t border-slate-800/40 first:border-0 first:pt-0">
                  {section.title}
                </div>
              )}
              {section.links.map((link, idx) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <div
                    key={idx}
                    onClick={() => { navigate(link.path); onClose(); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                        : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                    {link.badge !== undefined && (
                      <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              Management Desk
            </div>
            {links.map((link: any, idx) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <div
                  key={idx}
                  onClick={() => { navigate(link.path); onClose(); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.name}</span>
                  {link.badge !== undefined && (
                    <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sidebar Footer User Details */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div 
          onClick={() => { navigate('/settings'); onClose(); }}
          className="flex items-center gap-3 p-2 bg-slate-800/20 hover:bg-slate-800/40 rounded-xl border border-slate-800/40 cursor-pointer select-none transition-all duration-150"
        >
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-wider mt-0.5">
              {roleLabels[currentUser.role]}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

const roleLabels: Record<string, string> = {
  'saas-admin': 'SaaS Owner',
  'inst-admin': 'Inst Owner',
  'branch-admin': 'Branch Admin',
  'counsellor': 'Counsellor',
  'teacher': 'Teacher',
  'finance': 'Finance Staff'
};
