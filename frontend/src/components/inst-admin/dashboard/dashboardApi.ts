import api from '../../../services/api';
import type { DashboardData, DashboardQueryParams } from './types';

export const fetchInstituteDashboard = async (
  params: DashboardQueryParams = {}
): Promise<DashboardData> => {
  const query: Record<string, string> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.branchId != null && params.branchId !== 'all') {
    query.branchId = String(params.branchId);
  }
  if (params.academicYearId != null && params.academicYearId !== 'all') {
    query.academicYearId = String(params.academicYearId);
  }
  if (params.courseId != null && params.courseId !== 'all') {
    query.courseId = String(params.courseId);
  }

  const response = await api.get('/admin/dashboard/institute', { params: query });
  return response.data.data as DashboardData;
};
