import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronDown,
  Zap,
  DoorOpen,
  Mail,
  Plug,
  MailOpen,
  Smartphone,
  MessageCircle
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
  const { currentUser, notifications } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (!currentUser) return null;

  interface SidebarLink {
    name: string;
    label: string;
    path: string;
    icon: any;
    badge?: number;
  }

  interface SidebarGroup {
    groupLabel: string;
    groupIcon: any;
    links: SidebarLink[];
  }

  interface SidebarSection {
    title?: string;
    links?: SidebarLink[];
    groups?: SidebarGroup[];
  }

  const getSidebarSections = (role: string): SidebarSection[] => {
    const unreadNotificationsCount = notifications.filter(n => n.direction === 'Incoming' && n.status === 'Unread').length;

    switch (role) {
      case 'saas-admin':
        return [
          { links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
          {
            title: 'Tenant Management',
            links: [{ name: 'Tenants Manager', label: 'Tenants', path: '/tenants', icon: Building2 }]
          },
          {
            title: 'Subscription Management',
            links: [
              { name: 'Plan Master', label: 'Plans', path: '/plans', icon: CreditCard }
            ]
          },
          {
            title: 'Platform',
            links: [
              { name: 'Feature Flags', label: 'Feature Flags', path: '/feature-flags', icon: CheckSquare }
            ]
          },
          {
            title: 'Operations',
            links: [
              { name: 'Support Tickets', label: 'Support Tickets', path: '/support', icon: Ticket, badge: 3 }
            ]
          },
          {
            title: 'Communication',
            links: [
              { name: 'Communication Center', label: 'Communication Center', path: '/communication', icon: MessageSquare }
            ],
            groups: [
              {
                groupLabel: 'Templates',
                groupIcon: MailOpen,
                links: [
                  { name: 'Email Templates', label: 'Email Templates', path: '/email-templates', icon: Mail }
                ]
              }
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
              { name: 'Users & Roles', label: 'Users & Roles', path: '/users-and-roles', icon: Users }
            ],
            groups: [
              {
                groupLabel: 'System Settings',
                groupIcon: Settings,
                links: [
                  { name: 'SMS Configuration', label: 'SMS Configuration', path: '/system-settings/sms', icon: Smartphone },
                  { name: 'Email Configuration', label: 'Email Configuration', path: '/system-settings/email', icon: Mail },
                  { name: 'WhatsApp Configuration', label: 'WhatsApp Configuration', path: '/system-settings/whatsapp', icon: MessageCircle },
                  { name: 'Global Providers', label: 'Integrations', path: '/providers', icon: Plug },
                  { name: 'Audit Logs', label: 'Audit Logs', path: '/audit-logs', icon: ClipboardList },
                  { name: 'System Configuration', label: 'System Config', path: '/system-config', icon: Settings }
                ]
              }
            ]
          }
        ];

      case 'inst-admin':
        return [
          { links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
          {
            title: 'Core Academics',
            links: [
              { name: 'Courses', label: 'Courses', path: '/courses', icon: BookOpen },
              { name: 'Subject Management', label: 'Subject Setup', path: '/subjects', icon: BookOpen },
              { name: 'Batch Management', label: 'Batches', path: '/batches', icon: Layers },
              { name: 'Classroom Master', label: 'Classroom Master', path: '/classrooms', icon: DoorOpen }
            ]
          },
          {
            title: 'ERP & Admissions',
            links: [
              { name: 'Leads & Admissions', label: 'Leads & Enquiries', path: '/leads', icon: Users },
              { name: 'Students Roster', label: 'Students Roster', path: '/students', icon: GraduationCap },
              { name: 'Staff & Roles', label: 'Staff Directory', path: '/staff', icon: ShieldCheck }
            ]
          },
          {
            title: 'Finance Hub',
            links: [
              { name: 'Fees Master', label: 'Fee Structures', path: '/fees-master', icon: DollarSign },
              { name: 'Record Fee', label: 'Collect Payments', path: '/fees', icon: DollarSign }
            ]
          },
          {
            title: 'Classroom Operations',
            links: [
              { name: 'Mark Attendance', label: 'Attendance Roster', path: '/attendance', icon: CheckSquare },
              { name: 'Lecture Schedule', label: 'Lecture Schedule', path: '/admin/timetable', icon: Calendar },
              { name: 'Assignment and Exams', label: 'Homework & Exams', path: '/assignments', icon: BookOpen },
              { name: 'Exam Grading', label: 'Evaluations & Grading', path: '/exams', icon: ClipboardList }
            ]
          },
          {
            title: 'Reports & Auditing',
            links: [
              { name: 'Reports', label: 'Performance Reports', path: '/reports', icon: BarChart3 },
              { name: 'Broadcast Notification', label: 'Broadcast', path: '/notifications', icon: Bell },
              { name: 'Audit Logs', label: 'Audit Trail Logs', path: '/audit-logs', icon: ClipboardList }
            ]
          },
          {
            title: 'Organization Setup',
            links: [
              { name: 'Institute Setup', label: 'Institute Profile', path: '/institute', icon: Settings },
              { name: 'Branches Manager', label: 'Branches Setup', path: '/branches', icon: Building2 },
              { name: 'Support Tickets', label: 'Support Tickets', path: '/support', icon: Ticket },
              { name: 'Settings', label: 'Global Settings', path: '/settings', icon: Settings }
            ]
          }
        ];

      case 'branch-admin':
        return [
          { links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
          {
            title: 'Core Academics',
            links: [
              { name: 'Courses', label: 'Courses', path: '/courses', icon: BookOpen },
              { name: 'Subject Management', label: 'Subjects', path: '/subjects', icon: BookOpen },
              { name: 'Batch Management', label: 'Batches', path: '/batches', icon: Layers },
              { name: 'Classroom Master', label: 'Classroom Master', path: '/classrooms', icon: DoorOpen }
            ]
          },
          {
            title: 'ERP & Admissions',
            links: [
              { name: 'Leads & Admissions', label: 'Leads Pipeline', path: '/leads', icon: Users },
              { name: 'Students Roster', label: 'Student Records', path: '/students', icon: GraduationCap },
              { name: 'Staff & Roles', label: 'Staff Scopes', path: '/staff', icon: ShieldCheck }
            ]
          },
          {
            title: 'Finance Hub',
            links: [
              { name: 'Fees Master', label: 'Fees Master', path: '/fees-master', icon: DollarSign },
              { name: 'Record Fee', label: 'Fee Transactions', path: '/fees', icon: DollarSign },
              { name: 'Defaulters Ledger', label: 'Defaulters Ledger', path: '/defaulters', icon: AlertTriangle }
            ]
          },
          {
            title: 'Classroom Operations',
            links: [
              { name: 'Mark Attendance', label: 'Class Attendance', path: '/attendance', icon: CheckSquare },
              { name: 'Lecture Schedule', label: 'Lecture Schedule', path: '/admin/timetable', icon: Calendar },
              { name: 'Assignment and Exams', label: 'Home Assignments', path: '/assignments', icon: BookOpen },
              { name: 'Exam Grading', label: 'Exams Evaluation', path: '/exams', icon: ClipboardList }
            ]
          },
          {
            title: 'Reports & Auditing',
            links: [
              { name: 'Reports', label: 'Branch Reports', path: '/reports', icon: BarChart3 },
              { name: 'Broadcast Notification', label: 'Broadcast', path: '/notifications', icon: Bell },
              { name: 'Audit Logs', label: 'Branch Audit Logs', path: '/audit-logs', icon: ClipboardList }
            ]
          },
          {
            title: 'Organization Setup',
            links: [
              { name: 'Institute Setup', label: 'Institute Details', path: '/institute', icon: Settings },
              { name: 'Branches Manager', label: 'Branch Details', path: '/branches', icon: Building2 },
              { name: 'Support Tickets', label: 'Support Tickets', path: '/support', icon: Ticket },
              { name: 'Settings', label:  'Settings', path: '/settings', icon: Settings }
            ]
          }
        ];

      case 'counsellor':
        return [
          { links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
          {
            title: 'CRM Pipeline',
            links: [
              { name: 'Lead Pipeline', label: 'Lead Pipeline', path: '/leads', icon: Users },
              { name: 'Fee Discussion', label: 'Fee Discussion', path: '/leads/fee', icon: DollarSign },
              { name: 'Admission & Docs', label: 'Admission & Docs', path: '/leads/admission', icon: ClipboardList },
              { name: 'Batch Allocation', label: 'Batch Allocation', path: '/leads/batch', icon: Layers },
              { name: 'Payment & Activation', label: 'Payment & Activation', path: '/leads/payment', icon: Zap },
              { name: 'Settings', label:  'Settings', path: '/settings', icon: Settings }
            ]
          }
        ];

      case 'teacher':
        return [
          { links: [{ name: 'Dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
          {
            title: 'Classroom Operations',
            links: [
              { name: 'My Schedule', label: 'Academic Schedule', path: '/my-schedule', icon: Calendar },
              { name: 'Mark Attendance', label: 'Roll Call Attendance', path: '/attendance', icon: CheckSquare },
              { name: 'Assignment and Exams', label: 'Homework & Exams', path: '/assignments', icon: BookOpen },
              { name: 'Students Roster', label: 'My Students', path: '/students', icon: GraduationCap }
            ]
          },
          {
            title: 'Communication',
            links: [
              { name: 'Notifications', label: 'Notifications', path: '/teacher-notifications', icon: Bell, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined },
              { name: 'Doubt Chats', label: 'Student Doubt Chats', path: '/doubts', icon: MessageSquare, badge: 1 }
            ]
          },
          {
            title: 'Settings',
            links: [
              { name: 'Settings', label:  'Settings', path: '/settings', icon: Settings }
            ]
          }
        ];

      case 'finance':
        return [
          { links: [{ name: 'Dashboard', label: 'Expense Dashboard', path: '/dashboard', icon: LayoutDashboard }] },
          {
            title: 'Expense Management',
            links: [
              { name: 'Expense Voucher', label: 'Expense Voucher', path: '/expense-voucher', icon: FileText },
              { name: 'Expense Ledger', label: 'Expense Ledger', path: '/expense-ledger', icon: ClipboardList }
            ]
          },
          {
            title: 'Finance Hub',
            links: [
              { name: 'Record Fee', label: 'Collect Payments', path: '/fees', icon: DollarSign },
              { name: 'Defaulters Ledger', label: 'Dues & Defaulters', path: '/defaulters', icon: AlertTriangle }
            ]
          },
          {
            title: 'Analytics',
            links: [
              { name: 'Reports', label: 'Financial Reports', path: '/reports', icon: BarChart3 }
            ]
          },
          {
            title: 'Settings',
            links: [
              { name: 'Settings', label:  'Settings', path: '/settings', icon: Settings }
            ]
          }
        ];

      default:
        return [];
    }
  };

  const sections = getSidebarSections(currentUser.role);

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
    const isCounsellor = currentUser?.role === 'counsellor';
    const isActive = path === '/leads'
      ? (isCounsellor
          ? (location.pathname === '/leads' || location.pathname === '/leads/pipeline')
          : location.pathname.startsWith('/leads')
        )
      : path === '/fees'
        ? location.pathname === '/fees' || location.pathname.startsWith('/fees/')
        : location.pathname.startsWith(path);
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
            ? 'bg-blue-600/10 border-blue-500/20'
            : 'hover:bg-slate-800 border-transparent'
          }
        `}
        title={isCollapsed ? label : undefined}
      >
        {/* Icon */}
        <div className={`relative flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
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
            <span className={`text-sm whitespace-nowrap flex-1 min-w-0 truncate transition-colors duration-150 ${isActive ? 'text-slate-100 font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
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

  // Collapsible group of nav items (e.g. System Settings, Templates)
  const CollapsibleGroup = ({ group }: { group: SidebarGroup }) => {
    const hasActiveChild = group.links.some(l => location.pathname.startsWith(l.path));
    const [open, setOpen] = useState(hasActiveChild);
    const GroupIcon = group.groupIcon;

    return (
      <div>
        {/* Group header toggle */}
        <div
          onClick={() => setOpen(o => !o)}
          className={`
            group relative flex items-center rounded-lg cursor-pointer select-none
            transition-all duration-150 border gap-3 px-3 py-2.5 w-full
            ${hasActiveChild ? 'bg-blue-600/10 border-blue-500/20' : 'hover:bg-slate-800 border-transparent'}
            ${isCollapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}
          `}
          title={isCollapsed ? group.groupLabel : undefined}
        >
          <div className={`relative flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${hasActiveChild ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
            <GroupIcon size={18} />
          </div>
          {!isCollapsed && (
            <>
              <span className={`text-sm whitespace-nowrap flex-1 min-w-0 truncate transition-colors duration-150 ${hasActiveChild ? 'text-slate-100 font-semibold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {group.groupLabel}
              </span>
              <ChevronDown
                size={14}
                className={`flex-shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </div>

        {/* Expandable child links */}
        {!isCollapsed && open && (
          <div className="pl-4 mt-0.5 space-y-0.5 border-l border-slate-800 ml-5">
            {group.links.map((link, i) => (
              <NavItem key={i} path={link.path} icon={link.icon} label={link.label} badge={link.badge} />
            ))}
          </div>
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
          className={`h-16 border-b border-slate-800 flex items-center flex-shrink-0 px-4 justify-between gap-3 ${isCollapsed ? 'cursor-pointer hover:bg-slate-800/30' : ''
            }`}
          title={isCollapsed ? 'Expand sidebar' : undefined}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5 shadow-sm">
              <img src="/logo.png" alt="Logo" className="object-contain w-full h-full" />
            </div>
            <span
              className={`font-display font-bold text-xl text-white tracking-tight whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
          {sections.map((section, sIdx) => (
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
              {/* Flat links */}
              {section.links && (
                <div className="space-y-0.5">
                  {section.links.map((link, idx) => (
                    <NavItem key={idx} path={link.path} icon={link.icon} label={link.label} badge={link.badge} />
                  ))}
                </div>
              )}
              {/* Collapsible groups */}
              {section.groups && (
                <div className="space-y-0.5 mt-0.5">
                  {section.groups.map((group, gIdx) => (
                    <CollapsibleGroup key={gIdx} group={group} />
                  ))}
                </div>
              )}
            </div>
          ))}
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
