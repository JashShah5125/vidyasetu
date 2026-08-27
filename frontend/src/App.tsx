import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FeeConfigProvider } from './context/FeeConfigContext';
import { SchedulerProvider } from './features/scheduler/context/SchedulerContext';
import { Layout } from './components/layout/Layout';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { Pagination } from './components/ui/Pagination';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { Institute } from './pages/Institute';
import { InstituteUpgradePlan } from './pages/InstituteUpgradePlan';
import { InstituteCheckout } from './pages/InstituteCheckout';
import { LectureScheduler } from './features/scheduler/components/LectureScheduler';
import { BranchSetup } from './pages/BranchSetup';
import { BranchDetail } from './pages/BranchDetail';
import { CourseSetup } from './pages/CourseSetup';
import { CourseDetail } from './pages/CourseDetail';
import { BatchSetup } from './pages/BatchSetup';
import { SubjectSetup } from './pages/SubjectSetup';
import { ClassroomSetup } from './pages/ClassroomSetup';
import { Users } from './pages/Users';
import { StaffCreate } from './pages/StaffCreate';
import { LeadsAdmissions } from './pages/LeadsAdmissions';
import { StudentRegistration } from './pages/StudentRegistration';
import { Students } from './pages/Students';
import { Fees } from './pages/Fees';
import { FeesMaster } from './pages/FeesMaster';
import { Attendance } from './pages/Attendance';
import { Assignments } from './pages/Assignments';
import { ExamMarks } from './pages/ExamMarks';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { TenantsManager } from './pages/TenantsManager';
import { ExpenseVoucher } from './pages/ExpenseVoucher';
import { ExpenseLedger } from './pages/ExpenseLedger';
import { SubscriptionPlans } from './pages/SubscriptionPlans';
import { TenantDetails } from './pages/TenantDetails';

// Teacher components
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherAttendance } from './components/teacher/TeacherAttendance';
import { TeacherAssignments } from './components/teacher/TeacherAssignments';
import { TeacherDoubts } from './components/teacher/TeacherDoubts';
import { TeacherStudents } from './components/teacher/TeacherStudents';
import { TeacherSchedule } from './components/teacher/TeacherSchedule';
import { TeacherNotifications } from './components/teacher/TeacherNotifications';

// SaaS Admin pages
import { FeatureFlags } from './pages/saas/FeatureFlags';
import { ModuleManagement } from './pages/saas/ModuleManagement';
import { ApprovalCenter } from './pages/saas/ApprovalCenter';
import { SupportTickets } from './pages/saas/SupportTickets';
import { CommunicationCenter } from './pages/saas/CommunicationCenter';
import { EmailTemplates } from './pages/saas/EmailTemplates';
import { BillingRevenue } from './pages/saas/BillingRevenue';
import { ProductAnalytics } from './pages/saas/ProductAnalytics';
import { SystemConfiguration } from './pages/saas/SystemConfiguration';

const GlobalProvidersPlaceholder = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Global Infrastructure Providers</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">SMS Gateway API</span>
        <strong className="text-slate-700">Twilio SMS (Active)</strong>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">WhatsApp Provider</span>
        <strong className="text-slate-700">Meta Business API (Active)</strong>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">SMTP Email Client</span>
        <strong className="text-slate-700">Amazon SES (Active)</strong>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">Payment Gateway</span>
        <strong className="text-slate-700">Razorpay (Active)</strong>
      </div>
    </div>
  </div>
);

const AuditLogsPlaceholder = () => {
  const { auditLogs: allLogs, currentUser, staff } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const itemsPerPage = 5;

  const auditLogs = useMemo(() => {
    if (currentUser?.role === 'branch-admin') {
      const branchStaffNames = staff
        .filter(s => s.branch === currentUser.branch)
        .map(s => s.name.toLowerCase());
      if (currentUser.name) {
        branchStaffNames.push(currentUser.name.toLowerCase());
      }
      return allLogs.filter(log =>
        branchStaffNames.includes(log.actor.toLowerCase())
      );
    }
    return allLogs;
  }, [allLogs, currentUser, staff]);

  const totalPages = Math.ceil(auditLogs.length / itemsPerPage);
  const paginatedLogs = auditLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'Actor', 'Role', 'Institute', 'IP Address', 'Action', 'Details'];
    const rows = auditLogs.map(log => [
      log.id,
      log.timestamp,
      log.actor,
      log.role,
      log.institute || 'System / Platform',
      log.ipAddress || '192.168.1.1',
      log.action,
      log.details
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'audit_logs.csv';
    a.click();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Platform Audit Registers</h3>
        <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Timestamp</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Actor</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Institute</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Action</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
            {paginatedLogs.map((log, idx) => (
              <tr
                key={idx}
                onClick={() => setSelectedLog(log)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                <td className="px-6 py-4 font-semibold text-slate-800">
                  {log.actor} <span className="text-[10px] text-slate-400 uppercase font-normal">({log.role})</span>
                </td>
                <td className="px-6 py-4 text-slate-700 font-semibold">{log.institute || 'System / Platform'}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.ipAddress || '192.168.1.1'}</td>
                <td className="px-6 py-4 font-mono text-xs text-blue-600">{log.action}</td>
                <td className="px-6 py-4 max-w-xs" title={log.details}>
                  <div className="truncate text-slate-700">{log.details}</div>
                  <div className="text-blue-600 text-[10px] font-bold mt-1 hover:underline cursor-pointer inline-flex items-center">
                    View Details &rarr;
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Entry Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase">Log Entry ID</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.id}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Timestamp</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.timestamp}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Actor / Operator</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedLog.actor}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Operator Role</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.role}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Action Identifier</span>
                <span className="font-mono text-blue-600 font-bold mt-0.5 block">{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Origin IP Address</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.ipAddress || '192.168.1.1'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Institute / Tenant</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedLog.institute || 'System / Platform'}</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 block uppercase">Operation Details</span>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1 leading-relaxed whitespace-pre-wrap">{selectedLog.details}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)}>Close View</Button>
            </div>
          </div>
        </Modal>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={auditLogs.length}
        pageSize={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

const DoubtChatsPlaceholder = () => {
  const appContext = useApp();
  const { doubts } = appContext;
  const sendDoubtReply = ((appContext as any).sendDoubtReply as ((id: string, text: string) => void) | undefined) ?? (() => { });
  const [chatInput, setChatInput] = useState('');
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Doubt Resolution Hub</h3>
      {doubts.map((d, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
            <span>Student: <strong>{d.studentName}</strong></span>
            <span>Subject: <strong>{d.subject}</strong></span>
          </div>
          <div className="space-y-2 h-44 overflow-y-auto p-2 bg-slate-50/50 rounded-lg">
            {d.messages.map((m, idx) => (
              <div key={idx} className={`p-2.5 rounded-lg max-w-[80%] text-xs ${m.sender === 'student' ? 'bg-slate-100 text-slate-800 mr-auto' : 'bg-blue-600 text-white ml-auto'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput) {
                sendDoubtReply(d.id, chatInput);
                setChatInput('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Type chemical mechanism explanation..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button type="submit" variant="primary" size="sm">Send Reply</Button>
          </form>
        </div>
      ))}
    </div>
  );
};

const TenantDetailsWrapper = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return <TenantDetails tenantId={id!} onBack={() => navigate('/tenants')} />;
};

const ContentRouter = () => {
  const { currentUser } = useAuth();
  const isTeacher = currentUser?.role === 'teacher';

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/dashboard" element={isTeacher ? <TeacherDashboard /> : <Dashboard />} />
      <Route path="/tenants" element={<TenantsManager initialOpenCreate={false} />} />
      <Route path="/tenants/create" element={<TenantsManager initialOpenCreate={true} />} />
      <Route path="/tenants/:id" element={<TenantDetailsWrapper />} />
      <Route path="/plans" element={<SubscriptionPlans />} />
      <Route path="/feature-flags" element={<FeatureFlags />} />
      <Route path="/modules" element={<ModuleManagement />} />
      <Route path="/approvals" element={<ApprovalCenter />} />
      <Route path="/support" element={<SupportTickets />} />
      <Route path="/communication" element={<CommunicationCenter />} />
      <Route path="/email-templates" element={<EmailTemplates />} />
      <Route path="/billing" element={<BillingRevenue />} />
      <Route path="/analytics" element={<ProductAnalytics />} />
      <Route path="/system-config" element={<SystemConfiguration />} />
      <Route path="/saas-reports" element={<Reports mode="saas" />} />
      <Route path="/institute" element={<Institute />} />
      <Route path="/institute/upgrade" element={<InstituteUpgradePlan />} />
      <Route path="/institute/checkout/:planId" element={<InstituteCheckout />} />
      <Route path="/providers" element={<GlobalProvidersPlaceholder />} />
      <Route path="/audit-logs" element={<AuditLogsPlaceholder />} />
      <Route path="/branches" element={<BranchSetup />} />
      <Route path="/branches/:id" element={<BranchDetail />} />
      <Route path="/courses" element={<CourseSetup />} />
      <Route path="/courses/:code" element={<CourseDetail />} />
      <Route path="/batches" element={<BatchSetup />} />
      <Route path="/subjects" element={<SubjectSetup />} />
      <Route path="/classrooms" element={<ClassroomSetup />} />
      <Route path="/staff" element={<Users />} />
      <Route path="/staff/new" element={<StaffCreate />} />
      <Route path="/admissions" element={<LeadsAdmissions initialTab="admission" />} />
      <Route path="/students" element={isTeacher ? <TeacherStudents /> : <Students />} />
      <Route path="/admin/timetable" element={<LectureScheduler />} />
      <Route path="/timetable" element={<Attendance initialTab="timetable" />} />
      <Route path="/my-schedule" element={isTeacher ? <TeacherSchedule /> : <Attendance initialTab="timetable" />} />
      <Route path="/leads" element={<LeadsAdmissions initialTab="pipeline" />} />
      <Route path="/leads/:id/convert" element={<StudentRegistration />} />
      <Route path="/admission/:id" element={<StudentRegistration />} />
      <Route path="/leads/fee" element={<LeadsAdmissions initialTab="fee" />} />
      <Route path="/leads/admission" element={<LeadsAdmissions initialTab="admission" />} />
      <Route path="/leads/batch" element={<LeadsAdmissions initialTab="batch" />} />
      <Route path="/leads/payment" element={<LeadsAdmissions initialTab="payment" />} />
      <Route path="/convert-wizard" element={<LeadsAdmissions initialTab="pipeline" />} />
      <Route path="/attendance" element={isTeacher ? <TeacherAttendance /> : <Attendance initialTab="sheet" />} />
      <Route path="/assignments" element={isTeacher ? <TeacherAssignments /> : <Assignments />} />
      <Route path="/exams" element={isTeacher ? <Navigate to="/assignments" replace /> : <ExamMarks />} />
      <Route path="/teacher-notifications" element={<TeacherNotifications />} />
      <Route path="/fees" element={<Fees initialTab="record" />} />
      <Route path="/fees-master" element={<FeesMaster />} />
      <Route path="/defaulters" element={<Fees initialTab="defaulters" />} />
      <Route path="/expense-voucher" element={<ExpenseVoucher />} />
      <Route path="/expense-ledger" element={<ExpenseLedger />} />
      <Route path="/reports" element={<Reports mode="institute" />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/doubts" element={isTeacher ? <TeacherDoubts /> : <DoubtChatsPlaceholder />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const MainContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <ContentRouter />
    </Layout>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      const scrollContainers = document.querySelectorAll('.overflow-y-auto');
      scrollContainers.forEach(container => {
        if (container.closest('aside') || container.closest('.bg-slate-900')) {
          return;
        }
        container.scrollTop = 0;
      });
      const mainContainer = document.getElementById('main-scroll-container');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
      const mainTags = document.getElementsByTagName('main');
      for (let i = 0; i < mainTags.length; i++) {
        mainTags[i].scrollTop = 0;
      }
    };

    resetScroll();
    const animId = requestAnimationFrame(resetScroll);
    const timeoutId = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl as HTMLInputElement).type === 'number') {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const ensureHeadersHaveIcons = () => {
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const ths = table.querySelectorAll('th');
        ths.forEach(sibling => {
          const thText = sibling.textContent?.trim().toLowerCase() || '';
          if (thText === 'actions' || thText === 'action' || thText === 'options') return;

          let icon = sibling.querySelector('.sort-icon');
          if (!icon) {
            const span = document.createElement('span');
            span.className = 'sort-icon ml-1.5 inline-block text-slate-300 text-[10px] font-bold shrink-0';
            span.innerHTML = ' ⇅';
            sibling.appendChild(span);
          }
        });
      });
    };

    // Run immediately and setup fast interval scan
    ensureHeadersHaveIcons();
    const interval = setInterval(ensureHeadersHaveIcons, 100);

    const handleTableClick = (e: MouseEvent) => {
      const th = (e.target as HTMLElement).closest('th');
      if (!th) return;

      const table = th.closest('table');
      if (!table) return;

      const tbody = table.querySelector('tbody');
      if (!tbody) return;

      const ths = Array.from(th.parentElement?.children || []) as HTMLElement[];
      const colIndex = ths.indexOf(th);
      if (colIndex === -1) return;

      // Prevent sorting on actions/button columns
      const thText = th.textContent?.trim().toLowerCase() || '';
      if (thText === 'actions' || thText === 'action' || thText === 'options') return;

      // Determine sort direction
      const currentSort = th.getAttribute('data-sort-dir');
      const nextSort = currentSort === 'asc' ? 'desc' : 'asc';

      // Set sort attribute on clicked header
      th.setAttribute('data-sort-dir', nextSort);

      // Update indicators for all headers
      ths.forEach(sibling => {
        const sibText = sibling.textContent?.trim().toLowerCase() || '';
        if (sibText === 'actions' || sibText === 'action' || sibText === 'options') return;

        let icon = sibling.querySelector('.sort-icon');
        if (!icon) {
          const span = document.createElement('span');
          span.className = 'sort-icon ml-1.5 inline-block text-slate-300 text-[10px] font-bold shrink-0';
          sibling.appendChild(span);
          icon = span;
        }

        if (sibling === th) {
          icon.className = 'sort-icon ml-1.5 inline-block text-blue-600 font-bold shrink-0';
          icon.innerHTML = nextSort === 'asc' ? ' ↑' : ' ↓';
        } else {
          sibling.removeAttribute('data-sort-dir');
          icon.className = 'sort-icon ml-1.5 inline-block text-slate-300 font-bold shrink-0';
          icon.innerHTML = ' ⇅';
        }
      });

      // Get rows
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (rows.length === 0) return;

      // ── Intelligent column-type detection & sorting ──

      const getCleanVal = (tr: HTMLTableRowElement, idx: number): string => {
        const cell = tr.children[idx];
        if (!cell) return '';
        const input = cell.querySelector('input, select') as HTMLInputElement | HTMLSelectElement;
        if (input && input.value !== undefined) return input.value;
        return cell.textContent?.trim() || '';
      };

      // ── Type detection helpers ──

      // Date patterns: "2024-01-15", "15 Jan 2024", "Jan 15, 2024", "01/15/2024", "15/01/2024", "15-01-2024"
      const datePatterns = [
        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,                            // 2024-01-15
        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,                          // 15/01/2024 or 01-15-24
        /^\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[,]?\s+\d{2,4}$/i, // 15 Jan 2024
        /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}[,]?\s+\d{2,4}$/i, // Jan 15, 2024
      ];
      const isDateLike = (val: string): boolean => {
        if (!val) return false;
        const clean = val.trim();
        return datePatterns.some(p => p.test(clean));
      };
      const parseDate = (val: string): number => {
        if (!val) return 0;
        const d = new Date(val.replace(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/, (_m, a, b, c) => {
          // Try to handle DD/MM/YYYY vs MM/DD/YYYY intelligently
          const year = c.length === 2 ? '20' + c : c;
          // If first part > 12, it's DD/MM/YYYY
          if (Number(a) > 12) return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
          // If second part > 12, it's MM/DD/YYYY
          if (Number(b) > 12) return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
          // Default: MM/DD/YYYY (US format fallback)
          return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
        }));
        const ts = d.getTime();
        return isNaN(ts) ? 0 : ts;
      };

      // Number patterns: "₹1,23,456", "Rs. 1,500", "$100", "95%", "1,234.56", plain digits
      const isNumericLike = (val: string): boolean => {
        if (!val) return false;
        const stripped = val.replace(/[₹$€£,\s%]|rs\.?/gi, '').trim();
        if (stripped === '' || stripped === '-' || stripped === '.') return false;
        return !isNaN(Number(stripped));
      };
      const parseNumeric = (val: string): number => {
        if (!val) return 0;
        const stripped = val.replace(/[₹$€£,\s%]|rs\.?/gi, '').trim();
        const n = Number(stripped);
        return isNaN(n) ? 0 : n;
      };

      // ── Determine column type by sampling all non-empty values ──
      const sampleVals = rows.map(r => getCleanVal(r, colIndex)).filter(v => v !== '' && v !== '-' && v !== '—');

      let colType: 'date' | 'number' | 'text' = 'text';
      if (sampleVals.length > 0) {
        const dateCount = sampleVals.filter(isDateLike).length;
        const numCount = sampleVals.filter(isNumericLike).length;
        const threshold = sampleVals.length * 0.5; // >50% of values must match

        if (dateCount >= threshold && dateCount >= numCount) {
          colType = 'date';
        } else if (numCount >= threshold) {
          colType = 'number';
        }
      }

      // ── Sort using the detected type ──
      rows.sort((a, b) => {
        const aRaw = getCleanVal(a, colIndex);
        const bRaw = getCleanVal(b, colIndex);

        // Push empty values to the bottom regardless of direction
        if (!aRaw && bRaw) return 1;
        if (aRaw && !bRaw) return -1;
        if (!aRaw && !bRaw) return 0;

        let cmp = 0;

        if (colType === 'date') {
          const aTs = parseDate(aRaw);
          const bTs = parseDate(bRaw);
          cmp = aTs - bTs;
        } else if (colType === 'number') {
          const aNum = parseNumeric(aRaw);
          const bNum = parseNumeric(bRaw);
          cmp = aNum - bNum;
        } else {
          // Text: locale-aware alphabetical comparison
          cmp = aRaw.localeCompare(bRaw, undefined, { numeric: true, sensitivity: 'base' });
        }

        return nextSort === 'asc' ? cmp : -cmp;
      });

      // Re-append sorted rows
      rows.forEach(row => tbody.appendChild(row));
    };

    document.addEventListener('click', handleTableClick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleTableClick);
    };
  }, []);

  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <FeeConfigProvider>
          <SchedulerProvider>
            <ScrollToTop />
            <MainContent />
          </SchedulerProvider>
        </FeeConfigProvider>
      </AppProvider>
    </AuthProvider>
  );
}

