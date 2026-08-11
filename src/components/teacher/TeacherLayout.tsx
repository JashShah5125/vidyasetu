import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  BookOpen, 
  Award, 
  Users, 
  MessageCircle, 
  LogOut 
} from 'lucide-react';

export const TeacherLayout: React.FC = () => {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  if (currentUser?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-slate-500 mt-2">You do not have permission to view this portal.</p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Schedule', path: '/teacher/schedule', icon: Calendar },
    { name: 'Attendance', path: '/teacher/attendance', icon: CheckSquare },
    { name: 'Assignments', path: '/teacher/assignments', icon: BookOpen },
    { name: 'Grades', path: '/teacher/grades', icon: Award },
    { name: 'Students', path: '/teacher/students', icon: Users },
    { name: 'Doubts', path: '/teacher/doubts', icon: MessageCircle },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="font-display font-bold text-xl text-slate-900 tracking-tight">VidyaSetu</span>
          </div>
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Faculty Portal</div>
          <div className="font-semibold text-slate-800 truncate">{currentUser.name}</div>
          <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
