// Enquiry status/source code maps. Codes mirror the TINYINT mapping documented
// in migrations_v2/131_redesign_enquiries.sql (status) and 134 (source) and
// backend/src/models/enquiryModel.js.

export interface EnquiryStatusOption {
  code: number;
  label: string;
}

export interface EnquirySourceOption {
  code: number;
  label: string;
}

export const ENQUIRY_STATUSES: EnquiryStatusOption[] = [
  { code: 0, label: 'New Enquiry' },
  { code: 1, label: 'Assigned' },
  { code: 2, label: 'Contacted' },
  { code: 3, label: 'Follow-up' },
  { code: 4, label: 'Interested' },
  { code: 5, label: 'Demo Scheduled' },
  { code: 6, label: 'Fee Discussion' },
  { code: 7, label: 'Converted' },
  { code: -1, label: 'Lost' },
  { code: -2, label: 'Cancelled' }
];

export const ENQUIRY_SOURCES: EnquirySourceOption[] = [
  { code: 0, label: 'Walk-in' },
  { code: 1, label: 'Phone Call' },
  { code: 2, label: 'Website' },
  { code: 3, label: 'Social Media' },
  { code: 4, label: 'WhatsApp' },
  { code: 5, label: 'Referral' },
  { code: 6, label: 'Campaign/Event' },
  { code: 7, label: 'Google Ads' },
  { code: 8, label: 'Other' }
];

const STATUS_CODE_BY_LABEL: Record<string, number> = {};
ENQUIRY_STATUSES.forEach(s => {
  STATUS_CODE_BY_LABEL[s.label.toLowerCase()] = s.code;
});
STATUS_CODE_BY_LABEL['not interested'] = -1;
STATUS_CODE_BY_LABEL['lost'] = -1;
// Legacy page label for campaign source
STATUS_CODE_BY_LABEL['flyer campaign'] = 6;

const SOURCE_CODE_BY_LABEL: Record<string, number> = {};
ENQUIRY_SOURCES.forEach(s => {
  SOURCE_CODE_BY_LABEL[s.label.toLowerCase()] = s.code;
});
SOURCE_CODE_BY_LABEL['flyer campaign'] = 6;
SOURCE_CODE_BY_LABEL['campaign/event'] = 6;

export const statusLabelOf = (code: number | string | null | undefined): string => {
  const num = Number(code);
  const found = ENQUIRY_STATUSES.find(s => s.code === num);
  return found ? found.label : 'New Enquiry';
};

export const statusCodeOf = (label: string | undefined | null): number => {
  if (!label) return 0;
  const code = STATUS_CODE_BY_LABEL[String(label).trim().toLowerCase()];
  return code !== undefined ? code : 0;
};

export const sourceLabelOf = (code: number | string | null | undefined): string => {
  const num = Number(code);
  const found = ENQUIRY_SOURCES.find(s => s.code === num);
  return found ? found.label : 'Walk-in';
};

export const sourceCodeOf = (label: string | undefined | null): number => {
  if (!label) return 0;
  const code = SOURCE_CODE_BY_LABEL[String(label).trim().toLowerCase()];
  return code !== undefined ? code : 0;
};

export const STATUS_BADGES: Record<string, string> = {
  'New Enquiry':          'bg-blue-50 text-blue-700 border-blue-200',
  'Assigned':             'bg-slate-100 text-slate-700 border-slate-200',
  'Contacted':            'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Follow-up':            'bg-amber-50 text-amber-700 border-amber-200',
  'Demo Scheduled':       'bg-purple-50 text-purple-700 border-purple-200',
  'Fee Discussion':       'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Interested':           'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Not Interested':       'bg-red-50 text-red-600 border-red-200',
  'Lost':                 'bg-rose-50 text-rose-700 border-rose-200',
  'Converted':            'bg-slate-100 text-slate-600 border-slate-300',
  'Cancelled':            'bg-slate-50 text-slate-500 border-slate-200'
};

export const statusBadgeOf = (status: string): string =>
  STATUS_BADGES[status] || 'bg-slate-50 text-slate-600 border-slate-200';