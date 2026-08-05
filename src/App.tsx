import React, { useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Button } from './components/ui/Button';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Institute } from './pages/Institute';
import { InstituteUpgradePlan } from './pages/InstituteUpgradePlan';
import { InstituteCheckout } from './pages/InstituteCheckout';
import { BranchSetup } from './pages/BranchSetup';
import { BranchDetail } from './pages/BranchDetail';
import { Masters } from './pages/Masters';
import { Users } from './pages/Users';
import { Enquiry } from './pages/Enquiry';
import { Admissions } from './pages/Admissions';
import { Students } from './pages/Students';
import { Fees } from './pages/Fees';
import { Attendance } from './pages/Attendance';
import { Assignments } from './pages/Assignments';
import { Exams } from './pages/Exams';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { TenantsManager } from './pages/TenantsManager';
import { SubscriptionPlans } from './pages/SubscriptionPlans';
import { TenantSubscriptions } from './pages/TenantSubscriptions';
import { TenantDetails } from './pages/TenantDetails';

// SaaS Admin pages
import { FeatureFlags } from './pages/saas/FeatureFlags';
import { ModuleManagement } from './pages/saas/ModuleManagement';
import { ApprovalCenter } from './pages/saas/ApprovalCenter';
import { SupportTickets } from './pages/saas/SupportTickets';
import { CommunicationCenter } from './pages/saas/CommunicationCenter';
import { BillingRevenue } from './pages/saas/BillingRevenue';
import { ProductAnalytics } from './pages/saas/ProductAnalytics';
import { SystemConfiguration } from './pages/saas/SystemConfiguration';

const GlobalProvidersPlaceholder = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Global Infrastructure Providers</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">SMS Gateway API</span> 
        <strong className="text-slate-700">Twilio SMS (Configured)</strong>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">WhatsApp Business Key</span> 
        <strong className="text-slate-700">Meta Business API (Active)</strong>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">SMTP Email Client</span> 
        <strong className="text-slate-700">Amazon SES (Verified Relay)</strong>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 font-semibold uppercase text-[10px]">Payment Gateway</span> 
        <strong className="text-slate-700">Razorpay Key (live_xxx)</strong>
      </div>
    </div>
  </div>
);

const AuditLogsPlaceholder = () => {
  const { auditLogs } = useApp();
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">Platform Audit Registers</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Timestamp</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Actor</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Action</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
            {auditLogs.map((log, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs">{log.timestamp}</td>
                <td className="px-6 py-4 font-semibold text-slate-800">
                  {log.actor} <span className="text-[10px] text-slate-400 uppercase font-normal">({log.role})</span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-blue-600">{log.action}</td>
                <td className="px-6 py-4">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DoubtChatsPlaceholder = () => {
  const { doubts, sendDoubtReply } = useApp();
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
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tenants" element={<TenantsManager initialOpenCreate={false} />} />
      <Route path="/tenants/create" element={<TenantsManager initialOpenCreate={true} />} />
      <Route path="/tenants/:id" element={<TenantDetailsWrapper />} />
      <Route path="/plans" element={<SubscriptionPlans />} />
      <Route path="/tenant-subscriptions" element={<TenantSubscriptions />} />
      <Route path="/feature-flags" element={<FeatureFlags />} />
      <Route path="/modules" element={<ModuleManagement />} />
      <Route path="/approvals" element={<ApprovalCenter />} />
      <Route path="/support" element={<SupportTickets />} />
      <Route path="/communication" element={<CommunicationCenter />} />
      <Route path="/billing" element={<BillingRevenue />} />
      <Route path="/analytics" element={<ProductAnalytics />} />
      <Route path="/system-config" element={<SystemConfiguration />} />
      <Route path="/saas-reports" element={<Reports />} />
      <Route path="/institute" element={<Institute />} />
      <Route path="/institute/upgrade" element={<InstituteUpgradePlan />} />
      <Route path="/institute/checkout/:planId" element={<InstituteCheckout />} />
      <Route path="/providers" element={<GlobalProvidersPlaceholder />} />
      <Route path="/audit-logs" element={<AuditLogsPlaceholder />} />
      <Route path="/branches" element={<BranchSetup />} />
      <Route path="/branches/:id" element={<BranchDetail />} />
      <Route path="/courses" element={<Masters initialSubTab="courses" />} />
      <Route path="/staff" element={<Users />} />
      <Route path="/admissions" element={<Admissions />} />
      <Route path="/students" element={<Students />} />
      <Route path="/timetable" element={<Attendance initialTab="timetable" />} />
      <Route path="/my-schedule" element={<Attendance initialTab="timetable" />} />
      <Route path="/leads" element={<Enquiry initialTab="pipeline" />} />
      <Route path="/convert-wizard" element={<Enquiry initialTab="convert" />} />
      <Route path="/attendance" element={<Attendance initialTab="sheet" />} />
      <Route path="/assignments" element={<Assignments />} />
      <Route path="/exams" element={<Exams />} />
      <Route path="/fees" element={<Fees initialTab="record" />} />
      <Route path="/defaulters" element={<Fees initialTab="defaulters" />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/doubts" element={<DoubtChatsPlaceholder />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const MainContent: React.FC = () => {
  const { currentUser } = useApp();

  if (!currentUser) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <ContentRouter />
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
