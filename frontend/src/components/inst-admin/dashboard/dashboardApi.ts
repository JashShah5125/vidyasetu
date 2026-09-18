import api from '../../../services/api';
import type { DashboardData, DashboardQueryParams } from './types';

export const fetchDashboardData = async (
  params: DashboardQueryParams = {},
  isBranchAdmin: boolean = false
): Promise<DashboardData> => {
  const query: Record<string, string> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (!isBranchAdmin && params.branchId != null && params.branchId !== 'all') {
    query.branchId = String(params.branchId);
  }
  if (params.academicYearId != null && params.academicYearId !== 'all') {
    query.academicYearId = String(params.academicYearId);
  }
  if (params.courseId != null && params.courseId !== 'all') {
    query.courseId = String(params.courseId);
  }
  if (params.programId != null && params.programId !== 'all') {
    query.programId = String(params.programId);
  }
  if (params.levelId != null && params.levelId !== 'all') {
    query.levelId = String(params.levelId);
  }
  if (params.batchId != null && params.batchId !== 'all') {
    query.batchId = String(params.batchId);
  }

  const endpoint = isBranchAdmin ? '/admin/dashboard/branch' : '/admin/dashboard/institute';
  const response = await api.get(endpoint, { params: query });
  return response.data.data as DashboardData;
};

// Backwards-compatible alias
export const fetchInstituteDashboard = (
  params: DashboardQueryParams = {},
  isBranchAdmin: boolean = false
): Promise<DashboardData> => fetchDashboardData(params, isBranchAdmin);
