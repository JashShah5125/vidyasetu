import type { StudentStatusCode, StudentStatusLabel } from '../types';

export interface StudentStatusOption {
  code: StudentStatusCode;
  label: StudentStatusLabel;
  phase: 'Phase 3' | 'Phase 4' | 'Phase 5' | 'Lifecycle';
  phaseName: string;
  description: string;
}

export const STUDENT_STATUS_OPTIONS: StudentStatusOption[] = [
  {
    code: 0,
    label: 'Inactive',
    phase: 'Lifecycle',
    phaseName: 'Account Status',
    description: 'Account deactivated or suspended'
  },
  {
    code: 1,
    label: 'Active Student',
    phase: 'Phase 5',
    phaseName: 'Payment & Activation',
    description: 'Enrolled, batch allocated, downpayment verified & portal activated'
  },
  {
    code: 2,
    label: 'Deleted',
    phase: 'Lifecycle',
    phaseName: 'Cancelled',
    description: 'Soft deleted or cancelled admission'
  },
  {
    code: 3,
    label: 'Registration Pending',
    phase: 'Phase 3',
    phaseName: 'Admission & Docs',
    description: 'Lead converted, initial profile created, awaiting document upload'
  },
  {
    code: 4,
    label: 'Documents Submitted',
    phase: 'Phase 3',
    phaseName: 'Admission & Docs',
    description: 'KYC & academic documents uploaded, pending admin review'
  },
  {
    code: 5,
    label: 'Documents Verified',
    phase: 'Phase 3',
    phaseName: 'Admission & Docs',
    description: 'Documents verified and approved, ready for batch allocation'
  },
  {
    code: 6,
    label: 'Pending Batch Allocation',
    phase: 'Phase 4',
    phaseName: 'Batch Allocation',
    description: 'Admitted student awaiting classroom batch assignment'
  },
  {
    code: 7,
    label: 'Batch Allocated',
    phase: 'Phase 4',
    phaseName: 'Batch Allocation',
    description: 'Assigned to course, program, level, and classroom batch'
  },
  {
    code: 8,
    label: 'Payment Pending',
    phase: 'Phase 5',
    phaseName: 'Payment & Activation',
    description: 'Batch allocated, awaiting initial fee / downpayment clearance'
  },
  {
    code: 9,
    label: 'On Hold',
    phase: 'Phase 3',
    phaseName: 'Admission Review',
    description: 'Admission paused or verification on hold'
  },
  {
    code: 10,
    label: 'Passed Out',
    phase: 'Lifecycle',
    phaseName: 'Alumni',
    description: 'Course completed / graduated'
  }
];

export const studentStatusLabelOf = (codeOrLabel: number | string | undefined | null): StudentStatusLabel => {
  if (codeOrLabel === undefined || codeOrLabel === null) return 'Registration Pending';
  if (typeof codeOrLabel === 'number') {
    const found = STUDENT_STATUS_OPTIONS.find(o => o.code === codeOrLabel);
    return found ? found.label : 'Active Student';
  }
  const str = String(codeOrLabel).trim();
  const num = Number(str);
  if (!isNaN(num)) {
    const found = STUDENT_STATUS_OPTIONS.find(o => o.code === num);
    if (found) return found.label;
  }
  const match = STUDENT_STATUS_OPTIONS.find(
    o => o.label.toLowerCase() === str.toLowerCase()
  );
  if (match) return match.label;
  if (str.toLowerCase() === 'draft') return 'Registration Pending';
  if (str.toLowerCase() === 'verification pending') return 'Documents Submitted';
  if (str.toLowerCase() === 'active') return 'Active Student';
  return (str as StudentStatusLabel) || 'Active Student';
};

export const studentStatusCodeOf = (labelOrCode: number | string | undefined | null): StudentStatusCode => {
  if (labelOrCode === undefined || labelOrCode === null) return 3;
  if (typeof labelOrCode === 'number') {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(labelOrCode as StudentStatusCode)
      ? (labelOrCode as StudentStatusCode)
      : 3;
  }
  const str = String(labelOrCode).trim();
  const num = Number(str);
  if (!isNaN(num) && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(num as StudentStatusCode)) {
    return num as StudentStatusCode;
  }
  const match = STUDENT_STATUS_OPTIONS.find(
    o => o.label.toLowerCase() === str.toLowerCase()
  );
  return match ? match.code : 3;
};

export const studentStatusBadgeStyle = (codeOrLabel: number | string | undefined | null): string => {
  const label = studentStatusLabelOf(codeOrLabel);
  switch (label) {
    case 'Active Student':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'Documents Verified':
      return 'bg-teal-50 text-teal-700 border-teal-300';
    case 'Batch Allocated':
      return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'Documents Submitted':
    case 'Verification Pending':
      return 'bg-indigo-50 text-indigo-700 border-indigo-300';
    case 'Registration Pending':
    case 'Draft':
      return 'bg-amber-50 text-amber-700 border-amber-300';
    case 'Pending Batch Allocation':
      return 'bg-sky-50 text-sky-700 border-sky-300';
    case 'Payment Pending':
      return 'bg-orange-50 text-orange-700 border-orange-300';
    case 'On Hold':
      return 'bg-rose-50 text-rose-700 border-rose-300';
    case 'Inactive':
      return 'bg-slate-100 text-slate-600 border-slate-300';
    case 'Deleted':
      return 'bg-red-100 text-red-600 border-red-300';
    case 'Passed Out':
      return 'bg-purple-50 text-purple-700 border-purple-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};
