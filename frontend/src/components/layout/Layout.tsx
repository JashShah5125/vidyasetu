import React, { useState, createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, ShieldCheck, Building2, Sparkles } from 'lucide-react';

// Sidebar collapse context — lets any child toggle or read sidebar state
interface LayoutContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
const LayoutContext = createContext<LayoutContextType>({
  isSidebarCollapsed: false,
  toggleSidebar: () => {},
});
export const useLayout = () => useContext(LayoutContext);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, toasts } = useApp();
  const { isImpersonating, exitImpersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  const handleExitImpersonation = () => {
    exitImpersonation();
    navigate('/tenants');
  };

  if (!currentUser) {
    return <div className="w-full h-full">{children}</div>;
  }

  const isVoucherPage = location.pathname === '/expense-voucher';

  return (
    <LayoutContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
      <div className="flex w-screen h-screen overflow-hidden bg-slate-50 flex-col">
        
        {/* Persistent Global Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-slate-900 text-slate-300 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md z-[999999] border-b border-slate-800">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-semibold text-white bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
                <Building2 size={14} className="text-blue-400 shrink-0" />
                <span>{currentUser?.tenantName || currentUser?.name || 'Tenant Workspace'}</span>
              </div>

              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Institute Admin
              </span>

              <span className="hidden lg:flex items-center gap-1.5 text-slate-400 text-xs">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>Operating with full tenant permissions</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleExitImpersonation}
              className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Return to SaaS Admin</span>
            </button>
          </div>
        )}

        <div className="flex-1 flex w-full h-full overflow-hidden">
          {/* Sidebar navigation */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />

          {/* Main Content Workspace */}
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            {!isVoucherPage && (
              <Header
                onMenuClick={() => setIsSidebarOpen(true)}
              />
            )}

            {/* Dynamic content scroll workspace */}
            <div id="main-scroll-container" className={`flex-1 overflow-y-auto ${isVoucherPage ? 'p-0' : 'px-4 md:px-8 py-6 md:py-8'} animate-fade-in`}>
              <div className={isVoucherPage ? 'w-full h-full' : 'max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-12'}>
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Toast Notification Stack */}
        <div className="fixed bottom-6 right-6 z-[100000] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-slate-900 border border-slate-800/80 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                t.type === 'warning' ? 'bg-amber-400' :
                t.type === 'error' ? 'bg-red-500' :
                t.type === 'info' ? 'bg-blue-400' : 'bg-emerald-400'
              } animate-pulse`} />
              <p className="text-xs font-semibold text-slate-100">{t.message}</p>
            </div>
          ))}
        </div>
      </div>
    </LayoutContext.Provider>
  );
};
