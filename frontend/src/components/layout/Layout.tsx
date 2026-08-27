import React, { useState, createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { useLocation } from 'react-router-dom';

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
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  if (!currentUser) {
    return <div className="w-full h-full">{children}</div>;
  }

  const isVoucherPage = location.pathname === '/expense-voucher';

  return (
    <LayoutContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
      <div className="flex w-screen h-screen overflow-hidden bg-slate-50">

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

        {/* Floating Toast Notification Stack */}
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
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
