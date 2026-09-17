import api from './api';
import { getAcademicOptions } from './studentApi';
import { statusLabelOf, sourceLabelOf, statusCodeOf, sourceCodeOf } from './enquiryMaps';
import type { Lead } from '../types';

// ─── Backend row shapes ─────────────────────────────────────────────────────

export interface EnquiryRow {
  id: number;
  tenant_id: number;
  preferred_branch_id: number | null;
  assigned_branch_id: number | null;
  source: number | null;
  student_name: string;
  student_mobile: string;
  student_email: string | null;
  parent_name: string | null;
  parent_mobile: string | null;
  parent_email: string | null;
  interested_course_id: number | null;
  interested_program_id: number | null;
  package_type: number | null; // 1: Program Wise, 2: Bundle Wise, 3: Subject Wise
  package_details: any; // JSON payload: program_id, bundle_id, or subject_ids array
  interested_academic_year_id: number | null;
  interested_level_id: number | null;
  counsellor_id: number | null;
  status: number;
  lost_reason: string | null;
  demo_scheduled_at: string | null;
  next_followup_at: string | null;
  admission_confirmed_at: string | null;
  actual_price: number | null;
  concession_amount: number | null;
  final_price: number | null;
  down_payment: number | null;
  installment_months: number | null;
  installment_amount: number | null;
  counselling_notes: string | null;
  lost_at: string | null;
  converted_student_id: number | null;
  converted_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  course_name: string | null;
  program_name: string | null;
  level_name: string | null;
  academic_year_name: string | null;
  preferred_branch_name: string | null;
  assigned_branch_name: string | null;
  counsellor_name: string | null;
}

export interface EnquiryFollowupRow {
  id: number;
  enquiry_id: number;
  notes: string | null;
  next_followup_date: string | null;
  created_at: string;
  created_by: number;
  created_by_name?: string | null;
}

export interface ReferenceMaps {
  courseIdByName: Record<string, number>;
  programIdByName: Record<string, number>;
  branchIdByName: Record<string, number>;
  academicYearIdByName: Record<string, number>;
}

// ─── Reference data (course/program/branch name <-> id) ────────────────────

let cachedMaps: ReferenceMaps | null = null;

const EMPTY_MAPS: ReferenceMaps = {
  courseIdByName: {},
  programIdByName: {},
  branchIdByName: {},
  academicYearIdByName: {}
};

export const getReferenceMaps = async (): Promise<ReferenceMaps> => {
  if (cachedMaps) return cachedMaps;
  try {
    const response: any = await getAcademicOptions();
    const data = response?.data || {};
    const courseIdByName: Record<string, number> = {};
    (data.courses || []).forEach((c: any) => {
      if (c?.name) courseIdByName[String(c.name).toLowerCase()] = Number(c.id);
    });
    const programIdByName: Record<string, number> = {};
    (data.programs || []).forEach((p: any) => {
      if (p?.name) programIdByName[String(p.name).toLowerCase()] = Number(p.id);
    });
    const branchIdByName: Record<string, number> = {};
    const branches = Array.isArray(data.branches)
      ? data.branches
      : data.branch ? [data.branch] : [];
    branches.forEach((b: any) => {
      if (b?.name) branchIdByName[String(b.name).toLowerCase()] = Number(b.id);
    });
    const academicYearIdByName: Record<string, number> = {};
    (data.academicYears || []).forEach((y: any) => {
      if (y?.name) academicYearIdByName[String(y.name).toLowerCase()] = Number(y.id);
    });
    cachedMaps = { courseIdByName, programIdByName, branchIdByName, academicYearIdByName };
  } catch {
    cachedMaps = EMPTY_MAPS;
  }
  return cachedMaps;
};

export const clearReferenceMaps = (): void => {
  cachedMaps = null;
};

// ─── Role-aware base path ───────────────────────────────────────────────────

const getEnquiryBasePath = (): string => {
  try {
    const savedUser = localStorage.getItem('vs_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const role = String(user.role || '').toLowerCase().replace(/_/g, '-');
      if (role === 'branch-admin') {
        return '/branch/enquiries';
      }
    }
  } catch {
    // fall through to admin path
  }
  return '/admin/enquiries';
};

// ─── API functions ──────────────────────────────────────────────────────────

export const getEnquiries = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: number | string;
  source?: number | string;
  branchId?: number | string;
  courseId?: number | string;
  programId?: number | string;
  counsellorId?: number | string;
}): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.get(basePath, { params });
  return response.data;
};

export const getEnquiryById = async (id: number | string): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.get(`${basePath}/${id}`);
  return response.data;
};

export const getEnquiryFollowups = async (id: number | string): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.get(`${basePath}/${id}/followups`);
  return response.data;
};

export const createEnquiry = async (payload: Record<string, any>): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.post(basePath, payload);
  return response.data;
};

export const updateEnquiry = async (id: number | string, payload: Record<string, any>): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.put(`${basePath}/${id}`, payload);
  return response.data;
};

export const addEnquiryFollowup = async (
  id: number | string,
  payload: { notes?: string; next_followup_date?: string }
): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.post(`${basePath}/${id}/followups`, payload);
  return response.data;
};

export const convertEnquiry = async (id: number | string, payload: Record<string, any>): Promise<any> => {
  const basePath = getEnquiryBasePath();
  const response = await api.post(`${basePath}/${id}/convert`, payload);
  return response.data;
};

// ─── Mappers: backend rows -> frontend shapes ───────────────────────────────

const isoDay = (value: string | null | undefined): string =>
  value ? String(value).slice(0, 10) : '';

const shortDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return String(value).slice(0, 10) || '';
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

export const toLead = (row: EnquiryRow): Lead => {
  const feeConfig = {
    enrollType: 'Standard',
    course: row.course_name || '',
    program: row.program_name || '',
    level: '',
    feeSelectedStandard: '',
    feeSelectedBundle: '',
    feeSelectedSubjects: [],
    totalFee: row.actual_price ?? 0,
    discount: row.concession_amount ?? 0,
    netFee: row.final_price ?? 0,
    downpayment: row.down_payment ?? 0,
    installments: row.installment_months ?? 1,
    installmentAmount: row.installment_amount ?? 0,
    paymentMode: ''
  };
  let parsedPackageDetails: any = row.package_details;
  if (typeof parsedPackageDetails === 'string') {
    try {
      parsedPackageDetails = JSON.parse(parsedPackageDetails);
    } catch {
      // keep as string if not valid JSON
    }
  }

  return {
    id: String(row.id),
    name: row.student_name || '',
    email: row.student_email || '',
    mobile: row.student_mobile || '',
    parentName: row.parent_name || '',
    parentMobile: row.parent_mobile || '',
    parentEmail: row.parent_email || '',
    course: row.course_name || '',
    program: row.program_name || '',
    level: row.level_name || '',
    interestedLevelId: row.interested_level_id,
    packageType: row.package_type,
    packageDetails: parsedPackageDetails,
    academicYear: row.academic_year_name || '',
    academicYearId: row.interested_academic_year_id,
    branch: row.assigned_branch_name || row.preferred_branch_name || '',
    preferredBranch: row.preferred_branch_name || '',
    source: sourceLabelOf(row.source),
    counsellor: row.counsellor_name || '',
    counsellorId: row.counsellor_id,
    status: statusLabelOf(row.status) as Lead['status'],
    lostReason: row.lost_reason || '',
    lostAt: row.lost_at || '',
    demoScheduledOn: isoDay(row.demo_scheduled_at),
    nextFollowUp: isoDay(row.next_followup_at),
    remarks: row.remarks || '',
    followups: [],
    feeConfig
  };
};

export const toFollowup = (row: EnquiryFollowupRow): { date: string; type: string; outcome: string; nextDate: string; counsellor?: string } => ({
  date: shortDate(row.created_at),
  type: 'Call',
  outcome: row.notes || '',
  nextDate: row.next_followup_date ? shortDate(row.next_followup_date) : '',
  counsellor: row.created_by_name || ''
});

// ─── Payload builders ───────────────────────────────────────────────────────

export const leadPatchToEnquiry = async (updates: Partial<Lead>): Promise<Record<string, any>> => {
  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.student_name = updates.name;
  if (updates.email !== undefined) patch.student_email = updates.email || null;
  if (updates.mobile !== undefined) patch.student_mobile = updates.mobile;
  if (updates.parentName !== undefined) patch.parent_name = updates.parentName || null;
  if (updates.parentMobile !== undefined) patch.parent_mobile = updates.parentMobile || null;
  if (updates.parentEmail !== undefined) patch.parent_email = updates.parentEmail || null;
  if (updates.remarks !== undefined) patch.remarks = updates.remarks || null;
  if (updates.status !== undefined) patch.status = statusCodeOf(updates.status);
  if ((updates as any).lostReason !== undefined) patch.lost_reason = (updates as any).lostReason;
  if ((updates as any).lost_reason !== undefined) patch.lost_reason = (updates as any).lost_reason;
  if (updates.lostAt !== undefined) patch.lost_at = updates.lostAt || null;
  if (updates.deletedAt !== undefined) patch.deleted_at = updates.deletedAt || null;
  if (updates.source !== undefined) patch.source = sourceCodeOf(updates.source);
  if (updates.demoScheduledOn !== undefined) patch.demo_scheduled_at = updates.demoScheduledOn || null;
  if (updates.nextFollowUp !== undefined) patch.next_followup_at = updates.nextFollowUp || null;
  if (updates.packageType !== undefined) patch.package_type = updates.packageType;
  if (updates.packageDetails !== undefined) patch.package_details = updates.packageDetails;
  if (updates.interestedLevelId !== undefined) patch.interested_level_id = updates.interestedLevelId;
  if (updates.academicYearId !== undefined) patch.interested_academic_year_id = updates.academicYearId;

  if (updates.course || updates.program || updates.branch || updates.preferredBranch) {
    const maps = await getReferenceMaps();
    if (updates.course) {
      const courseId = maps.courseIdByName[String(updates.course).toLowerCase()];
      if (courseId) patch.interested_course_id = courseId;
    }
    if (updates.program) {
      const programId = maps.programIdByName[String(updates.program).toLowerCase()];
      if (programId) patch.interested_program_id = programId;
    }
    if (updates.branch) {
      const branchId = maps.branchIdByName[String(updates.branch).toLowerCase()];
      if (branchId) patch.assigned_branch_id = branchId;
    }
    if (updates.preferredBranch) {
      const branchId = maps.branchIdByName[String(updates.preferredBranch).toLowerCase()];
      if (branchId) patch.preferred_branch_id = branchId;
    }
  }

  const fee = updates.feeConfig;
  if (fee) {
    if (fee.totalFee !== undefined) patch.actual_price = fee.totalFee;
    if (fee.discount !== undefined) patch.concession_amount = fee.discount;
    if (fee.netFee !== undefined) patch.final_price = fee.netFee;
    if (fee.downpayment !== undefined) patch.down_payment = fee.downpayment;
    if (fee.installments !== undefined) patch.installment_months = fee.installments;
  }

  return patch;
};

export const buildCreateEnquiryPayload = async (form: {
  name: string;
  email?: string;
  mobile: string;
  parentName?: string;
  parentMobile?: string;
  parentEmail?: string;
  course: string;
  program?: string;
  level?: string;
  interestedLevelId?: number | null;
  packageType?: number | null;
  packageDetails?: any;
  academicYear?: string;
  academicYearId?: number | null;
  source: string;
  remarks: string;
  branch?: string;
  counsellor?: string;
  counsellorId?: number | null;
}): Promise<Record<string, any>> => {
  const maps = await getReferenceMaps();
  const courseName = String(form.course || '').toLowerCase();
  const programName = String(form.program || '').toLowerCase();
  const branchName = String(form.branch || '').toLowerCase();
  const firstBranchId = Object.values(maps.branchIdByName)[0] || 1;
  const branchId = maps.branchIdByName[branchName] || firstBranchId;

  const payload: Record<string, any> = {
    student_name: form.name.trim(),
    student_email: form.email?.trim() || null,
    student_mobile: form.mobile.trim(),
    parent_name: form.parentName?.trim() || null,
    parent_mobile: form.parentMobile?.trim() || null,
    parent_email: form.parentEmail?.trim() || null,
    source: sourceCodeOf(form.source),
    remarks: form.remarks || null,
    status: 0,
    interested_course_id: maps.courseIdByName[courseName] || null,
    interested_program_id: maps.programIdByName[programName] || null,
    package_type: form.packageType !== undefined ? form.packageType : null,
    package_details: form.packageDetails !== undefined ? form.packageDetails : null,
    interested_level_id: form.interestedLevelId !== undefined ? form.interestedLevelId : null,
    interested_academic_year_id: form.academicYearId || null,
    counsellor_id: form.counsellorId || null,
    assigned_branch_id: branchId,
    preferred_branch_id: branchId
  };
  return payload;
};

export const buildConvertPayload = (formData: any): Record<string, any> => ({
  full_name: formData?.student?.name?.trim() || null,
  mobile: formData?.student?.mobile?.trim() || null,
  email: formData?.student?.email?.trim() || null,
  dob: formData?.student?.dob || null,
  gender: formData?.student?.gender || 'Male',
  street: formData?.student?.address?.street?.trim() || null,
  city: formData?.student?.address?.city?.trim() || null,
  state: formData?.student?.address?.state?.trim() || null,
  pincode: formData?.student?.address?.pincode?.trim() || null,
  category: formData?.student?.category || 'General',
  school_name: formData?.student?.schoolName?.trim() || null,
  current_class: formData?.student?.currentClass || null,
  board: formData?.student?.board || null,
  target_exam: formData?.student?.targetExam || null,
  year_of_attempt: formData?.student?.yearOfAttempt || null,
  course: formData?.course?.course || null,
  program: formData?.course?.program || null,
  level: formData?.course?.level || null,
  guardian_name: formData?.parent?.name?.trim() || null,
  guardian_mobile: formData?.parent?.mobile?.trim() || null,
  guardian_email: formData?.parent?.email?.trim() || null,
  guardian_relation: formData?.parent?.relation || 'Parent',
  guardian_occupation: formData?.parent?.occupation?.trim() || null,
  gross_amount: formData?.fee?.totalFee || null,
  discount: formData?.fee?.discount || 0,
  net_amount: formData?.fee?.netFee || null,
  down_payment: formData?.fee?.downpayment || 0,
  installments: formData?.fee?.installments || 1,
  installment_amount: formData?.fee?.installmentAmount || 0,
  payment_mode: formData?.fee?.paymentMode || 'Cash',
  admission_mode: 'staff_assisted',
  status: formData?.documents && formData?.documents.length > 0 ? 4 : 3,
  documents: formData?.documents || []
});