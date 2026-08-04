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

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  const getSidebarLinks = (role: string) => {
    switch (role) {
      case 'saas-admin':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Tenants Manager', icon: Building2 },
          { name: 'Plan Master', icon: CreditCard },
          { name: 'Tenant Subscriptions', icon: FileText },
          { name: 'Global Providers', icon: Settings },
          { name: 'Audit Logs', icon: ClipboardList }
        ];
      case 'inst-admin':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Institute Setup', icon: Settings },
          { name: 'Branches Manager', icon: Building2 },
          { name: 'Courses & Batches', icon: BookOpen },
          { name: 'Staff & Roles', icon: ShieldCheck },
          { name: 'Leads CRM', icon: Users },
          { name: 'Admissions', icon: ClipboardList },
          { name: 'Students Roster', icon: GraduationCap },
          { name: 'Record Fee', icon: DollarSign },
          { name: 'Mark Attendance', icon: CheckSquare },
          { name: 'Assignments', icon: BookOpen },
          { name: 'Exam Marks', icon: ClipboardList },
          { name: 'Reports', icon: ClipboardList },
          { name: 'Notifications', icon: Bell },
          { name: 'Settings', icon: Settings },
          { name: 'Audit Logs', icon: ClipboardList }
        ];
      case 'branch-admin':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Students Roster', icon: GraduationCap },
          { name: 'Leads CRM', icon: Users },
          { name: 'Admissions', icon: ClipboardList },
          { name: 'Courses & Batches', icon: BookOpen },
          { name: 'Staff & Roles', icon: ShieldCheck },
          { name: 'Mark Attendance', icon: CheckSquare },
          { name: 'Record Fee', icon: DollarSign },
          { name: 'Defaulters Ledger', icon: AlertTriangle },
          { name: 'Academic Timetable', icon: Calendar },
          { name: 'Reports', icon: ClipboardList }
        ];
      case 'counsellor':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Leads CRM', icon: Users },
          { name: 'Convert Wizard', icon: ShieldCheck },
          { name: 'Admissions', icon: ClipboardList }
        ];
      case 'teacher':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'My Schedule', icon: Calendar },
          { name: 'Mark Attendance', icon: CheckSquare },
          { name: 'Assignments', icon: BookOpen },
          { name: 'Exam Marks', icon: ClipboardList },
          { name: 'Doubt Chats', icon: MessageSquare, badge: 1 }
        ];
      case 'finance':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Record Fee', icon: DollarSign },
          { name: 'Defaulters Ledger', icon: AlertTriangle },
          { name: 'Reports', icon: ClipboardList }
        ];
      default:
        return [];
    }
  };

  const saasAdminSections: {
    title?: string;
    links: { name: string; label: string; icon: any; badge?: number }[];
  }[] = [
    {
      links: [{ name: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard }]
    },
    {
      title: 'Tenant Management',
      links: [
        { name: 'Tenants Manager', label: 'Tenants', icon: Building2 }
      ]
    },
    {
      title: 'Subscription Management',
      links: [
        { name: 'Plan Master', label: 'Plans', icon: CreditCard },
        { name: 'Tenant Subscriptions', label: 'Tenant Subscriptions', icon: FileText }
      ]
    },
    {
      title: 'Platform',
      links: [
        { name: 'Feature Flags', label: 'Feature Flags', icon: CheckSquare },
        { name: 'Module Management', label: 'Module Management', icon: BookOpen }
      ]
    },
    {
      title: 'Operations',
      links: [
        { name: 'Approval Center', label: 'Approval Center', icon: CheckSquare },
        { name: 'Support Tickets', label: 'Support Tickets', icon: Ticket, badge: 3 },
        { name: 'Communication', label: 'Communication', icon: MessageSquare }
      ]
    },
    {
      title: 'Business',
      links: [
        { name: 'Billing & Revenue', label: 'Billing & Revenue', icon: DollarSign },
        { name: 'SaaS Reports', label: 'Reports', icon: ClipboardList },
        { name: 'Product Analytics', label: 'Product Analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'System',
      links: [
        { name: 'Global Providers', label: 'Integrations', icon: Settings },
        { name: 'Audit Logs', label: 'Audit Logs', icon: ClipboardList },
        { name: 'System Configuration', label: 'System Configuration', icon: Settings }
      ]
    },
    {
      title: 'Support Desk',
      links: [
        { name: 'Settings', label: 'Settings', icon: Settings }
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
                const isActive = activeTab === link.name;
                return (
                  <div
                    key={idx}
                    onClick={() => { setActiveTab(link.name); onClose(); }}
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
            {links.map((link, idx) => {
              const Icon = link.icon;
              const isActive = activeTab === link.name;
              return (
                <div
                  key={idx}
                  onClick={() => { setActiveTab(link.name); onClose(); }}
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
          onClick={() => { setActiveTab('Settings'); onClose(); }}
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
