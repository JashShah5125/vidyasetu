import React from 'react';
import { useApp } from '../context/AppContext';
import { SaasAdminDashboard } from '../components/saas-admin/SaasAdminDashboard';
import { InstAdminDashboard } from '../components/inst-admin/InstAdminDashboard';
import { BranchAdminDashboard } from '../components/branch-admin/BranchAdminDashboard';
import { CounsellorDashboard } from '../components/counsellor/CounsellorDashboard';
import { TeacherDashboard } from '../components/teacher/TeacherDashboard';
import { FinanceDashboard } from '../components/finance/FinanceDashboard';

export const Dashboard: React.FC = () => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  switch (currentUser.role) {
    case 'saas-admin':
      return <SaasAdminDashboard />;
    case 'inst-admin':
      return <InstAdminDashboard />;
    case 'branch-admin':
      return <BranchAdminDashboard />;
    case 'counsellor':
      return <CounsellorDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'finance':
      return <FinanceDashboard />;
    default:
      return <InstAdminDashboard />;
  }
};
