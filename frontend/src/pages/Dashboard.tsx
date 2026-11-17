import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SaasAdminDashboard } from '../components/saas-admin/SaasAdminDashboard';
import { InstAdminDashboard } from '../components/inst-admin/InstAdminDashboard';
import { CounsellorDashboard } from '../components/counsellor/CounsellorDashboard';
import { TeacherDashboard } from '../components/teacher/TeacherDashboard';
import { FinanceDashboard } from '../components/finance/FinanceDashboard';
import { StudentDashboard } from './StudentDashboard';

export const Dashboard: React.FC = () => {
  const { currentUser } = useApp();

  if (!currentUser) return null;

  switch (currentUser.role) {
    case 'saas-admin':
      return <SaasAdminDashboard />;
    case 'inst-admin':
      return <InstAdminDashboard />;
    case 'branch-admin':
      return <InstAdminDashboard />;
    case 'counsellor':
      return <CounsellorDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'finance':
      return <FinanceDashboard />;
    case 'student':
    case 'parent':
      return <StudentDashboard />;
    default:
      return <InstAdminDashboard />;
  }
};
