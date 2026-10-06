import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Sliders,
  Smartphone,
  Mail,
  MessageCircle,
  Send,
  Zap,
  Check,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Code,
  Type,
  Minus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  HelpCircle,
  Edit2,
  ArrowLeft
} from 'lucide-react';
import { smsTemplateService } from '../../services/smsTemplateService';
import { emailTemplateService } from '../../services/emailTemplateService';
import { whatsappTemplateService } from '../../services/whatsappTemplateService';

// Types
export type ChannelType = 'sms' | 'email' | 'whatsapp';
export type TabType = 'channel-config' | 'sms' | 'email' | 'whatsapp' | 'deliveries';

export interface VariableDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'url';
  example: string;
}

export interface UnifiedTemplate {
  id: string | number;
  channel: ChannelType;
  name: string;
  key: string;
  description: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  status: 'active' | 'inactive';
  version: string;
  variables: VariableDef[];
  isSystem?: boolean;
  dltId?: string;
  buttons?: Array<{ type: 'URL' | 'PHONE' | 'QUICK_REPLY'; text: string; url?: string; phone?: string }>;
}

export interface ChannelConfig {
  id: ChannelType;
  name: string;
  status: 'ENABLED' | 'DISABLED';
  testStatus: 'PASSED' | 'SKIPPED' | 'FAILED';
  summary: string;
  lastTested: string;
  endpoint: string;
  apiKey: string;
  sender: string;
  required: string[];
  provider: string;
  label: string;
  providerOptionsJson: string;
  enabledForSending: boolean;
}

export interface DeliveryLog {
  id: string;
  recipient: string;
  channel: ChannelType;
  templateKey: string;
  templateName: string;
  status: 'SENT' | 'FAILED';
  providerMsgId: string;
  timestamp: string;
  details?: string;
}

// Initial Channels Data (Vidya Setu Cloud Routing)
const INITIAL_CHANNELS: Record<ChannelType, ChannelConfig> = {
  sms: {
    id: 'sms',
    name: 'SMS',
    status: 'DISABLED',
    testStatus: 'SKIPPED',
    summary: 'GENERIC · High-speed Transactional DLT Route · budget 1,000 chars (6 segments)',
    lastTested: '1/10/2026, 6:02:16 pm — No endpoint URL configured',
    endpoint: '-',
    apiKey: '',
    sender: 'VIDSETU',
    required: ['base_url', 'api_key'],
    provider: 'Generic HTTP (any gateway)',
    label: 'Vidya Setu Transactional SMS Gateway',
    providerOptionsJson: '{\n  "route": "transactional",\n  "dlt_entity_id": "1101482910000028471"\n}',
    enabledForSending: false
  },
  email: {
    id: 'email',
    name: 'EMAIL',
    status: 'DISABLED',
    testStatus: 'SKIPPED',
    summary: 'GENERIC · SES / SendGrid Outbound Email · budget no practical limit',
    lastTested: '1/10/2026, 5:45:00 pm — No endpoint URL configured',
    endpoint: '-',
    apiKey: '',
    sender: 'notifications@vidyasetu.com',
    required: ['base_url', 'api_key'],
    provider: 'Generic HTTP (any gateway)',
    label: 'Vidya Setu Institutional Mailer',
    providerOptionsJson: '{\n  "from_name": "Vidya Setu Platform",\n  "reply_to": "support@vidyasetu.com"\n}',
    enabledForSending: false
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WHATSAPP',
    status: 'DISABLED',
    testStatus: 'SKIPPED',
    summary: 'GENERIC · Meta WhatsApp Business API · budget 4,096 chars',
    lastTested: '1/10/2026, 5:46:12 pm — No endpoint URL configured',
    endpoint: '-',
    apiKey: '',
    sender: '919876500000',
    required: ['base_url', 'api_key'],
    provider: 'Generic HTTP (any gateway)',
    label: 'Vidya Setu WhatsApp Business Cloud',
    providerOptionsJson: '{\n  "waba_id": "104928172940182",\n  "phone_number_id": "10928374619283"\n}',
    enabledForSending: false
  }
};

// Seeded Initial Templates (100% Vidya Setu Educational System)
const INITIAL_TEMPLATES: UnifiedTemplate[] = [
  // SMS TEMPLATES
  {
    id: 'sms-1',
    channel: 'sms',
    name: 'Student Admission Confirmed',
    key: 'admission.confirmed',
    description: 'Triggered upon successful enrollment of a student in an institute.',
    body: 'Vidya Setu: Admission confirmed for {{student.name}} in {{class.name}} at {{institute.name}}. Roll No: {{student.roll_no}}. Portal: {{portal.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
      { key: 'class.name', label: 'Class / Grade', type: 'text', example: 'Class 10 - Batch A' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' },
      { key: 'student.roll_no', label: 'Roll Number', type: 'text', example: 'DPA-2026-104' },
      { key: 'portal.url', label: 'Portal URL', type: 'url', example: 'https://vidyasetu.com/login' }
    ]
  },
  {
    id: 'sms-2',
    channel: 'sms',
    name: 'Student Absent Alert',
    key: 'attendance.absent_alert',
    description: 'Sent immediately to parents when student is marked absent in roll call.',
    body: 'Vidya Setu Alert: {{student.name}} was marked absent today ({{attendance.date}}) for {{batch.name}} at {{institute.name}}. Inquiries: {{institute.phone}}.',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Rohan Verma' },
      { key: 'attendance.date', label: 'Date', type: 'date', example: '06 Oct 2026' },
      { key: 'batch.name', label: 'Batch Name', type: 'text', example: 'Morning Batch' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Vidya Mandir Institute' },
      { key: 'institute.phone', label: 'Contact Phone', type: 'text', example: '+91 98200 11223' }
    ]
  },
  {
    id: 'sms-3',
    channel: 'sms',
    name: 'Fee Installment Due Reminder',
    key: 'fee.due_reminder',
    description: 'Sent 3 days prior to term or monthly installment fee due date.',
    body: 'Dear {{parent.name}}, fee installment of ₹{{fee.amount}} for {{student.name}} at {{institute.name}} is due on {{fee.due_date}}. Pay online: {{fee.payment_link}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'parent.name', label: 'Parent Name', type: 'text', example: 'Mr. Rajesh Verma' },
      { key: 'fee.amount', label: 'Fee Amount', type: 'number', example: '12,500' },
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Rohan Verma' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Vidya Mandir Institute' },
      { key: 'fee.due_date', label: 'Due Date', type: 'date', example: '15 Oct 2026' },
      { key: 'fee.payment_link', label: 'Payment Link', type: 'url', example: 'https://pay.vidyasetu.com/inv_8492' }
    ]
  },
  {
    id: 'sms-4',
    channel: 'sms',
    name: 'Fee Payment Received',
    key: 'fee.payment_receipt',
    description: 'Confirmation receipt sent when fee payment is recorded online or at reception.',
    body: 'Vidya Setu: Payment of ₹{{fee.amount}} for {{student.name}} (Receipt: {{fee.receipt_no}}) received by {{institute.name}}. Download receipt: {{receipt.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'fee.amount', label: 'Amount Paid', type: 'number', example: '12,500' },
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Rohan Verma' },
      { key: 'fee.receipt_no', label: 'Receipt No', type: 'text', example: 'REC-2026-9041' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Vidya Mandir Institute' },
      { key: 'receipt.url', label: 'Receipt Download', type: 'url', example: 'https://vidyasetu.com/rec/9041' }
    ]
  },
  {
    id: 'sms-5',
    channel: 'sms',
    name: 'Exam Timetable Published',
    key: 'exam.timetable_published',
    description: 'Notice sent to parents and students when examination schedule is finalized.',
    body: 'Vidya Setu: Date sheet for {{exam.title}} has been published for {{class.name}}. Exams begin on {{exam.start_date}}. Check timetable: {{portal.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'exam.title', label: 'Exam Title', type: 'text', example: 'Term 1 Midterm Exam' },
      { key: 'class.name', label: 'Class', type: 'text', example: 'Class 10' },
      { key: 'exam.start_date', label: 'Start Date', type: 'date', example: '20 Oct 2026' },
      { key: 'portal.url', label: 'Portal Link', type: 'url', example: 'https://vidyasetu.com/exams' }
    ]
  },
  {
    id: 'sms-6',
    channel: 'sms',
    name: 'Exam Results Released',
    key: 'exam.results_published',
    description: 'Scorecard summary notification sent when teacher finalizes marks.',
    body: 'Vidya Setu: Results for {{exam.title}} are now available. {{student.name}} scored {{result.percentage}}% (Rank: {{result.rank}}). Report card: {{result.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'exam.title', label: 'Exam Title', type: 'text', example: 'Term 1 Midterm Exam' },
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
      { key: 'result.percentage', label: 'Score %', type: 'number', example: '92.4' },
      { key: 'result.rank', label: 'Class Rank', type: 'text', example: '2nd' },
      { key: 'result.url', label: 'Report Link', type: 'url', example: 'https://vidyasetu.com/marks/aarav' }
    ]
  },
  {
    id: 'sms-7',
    channel: 'sms',
    name: 'Lecture Rescheduled Notice',
    key: 'schedule.lecture_rescheduled',
    description: 'Timetable shift alert sent to students in the affected batch.',
    body: 'Schedule update: {{subject.name}} lecture for {{batch.name}} on {{lecture.date}} is rescheduled to {{lecture.time}} with {{teacher.name}} in {{room.name}}.',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'subject.name', label: 'Subject', type: 'text', example: 'Mathematics' },
      { key: 'batch.name', label: 'Batch', type: 'text', example: 'Class 10 Morning' },
      { key: 'lecture.date', label: 'Date', type: 'date', example: 'Today' },
      { key: 'lecture.time', label: 'New Time', type: 'text', example: '03:30 PM' },
      { key: 'teacher.name', label: 'Faculty', type: 'text', example: 'Prof. Anjali Saxena' },
      { key: 'room.name', label: 'Room', type: 'text', example: 'Room 302' }
    ]
  },
  {
    id: 'sms-8',
    channel: 'sms',
    name: 'Homework Assignment Posted',
    key: 'homework.assigned',
    description: 'Alert sent when teacher assigns new coursework or problems.',
    body: 'New homework posted for {{subject.name}}: \'{{homework.title}}\'. Due date: {{homework.due_date}}. Access details on Vidya Setu portal: {{portal.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'subject.name', label: 'Subject', type: 'text', example: 'Physics' },
      { key: 'homework.title', label: 'Topic Title', type: 'text', example: 'Newton\'s Laws Assignment 3' },
      { key: 'homework.due_date', label: 'Due Date', type: 'date', example: '08 Oct 2026' },
      { key: 'portal.url', label: 'Portal Link', type: 'url', example: 'https://vidyasetu.com/homework' }
    ]
  },
  {
    id: 'sms-9',
    channel: 'sms',
    name: 'Faculty Attendance Marked',
    key: 'faculty.attendance_marked',
    description: 'Dispatched when teacher logs attendance and hours worked for daily lectures.',
    body: 'Vidya Setu: Attendance for {{teacher.name}} marked {{attendance.status}} for {{lecture.count}} scheduled lectures on {{attendance.date}}. Hours logged: {{hours.worked}}h.',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'teacher.name', label: 'Teacher Name', type: 'text', example: 'Dr. Ramesh Gupta' },
      { key: 'attendance.status', label: 'Status', type: 'text', example: 'Present' },
      { key: 'lecture.count', label: 'Lectures Count', type: 'number', example: '3' },
      { key: 'attendance.date', label: 'Date', type: 'date', example: '06 Oct 2026' },
      { key: 'hours.worked', label: 'Hours', type: 'number', example: '4.5' }
    ]
  },
  {
    id: 'sms-10',
    channel: 'sms',
    name: 'Portal Login Security OTP',
    key: 'auth.login_otp',
    description: 'Multi-factor login verification passcode.',
    body: 'Your Vidya Setu portal security OTP is {{auth.otp_code}}. Valid for 10 minutes. Do not share this OTP with anyone.',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'auth.otp_code', label: 'OTP Code', type: 'number', example: '724195' }
    ]
  },
  {
    id: 'sms-11',
    channel: 'sms',
    name: 'Institute Subscription Renewal',
    key: 'saas.subscription_renewal',
    description: 'SaaS billing notice sent to institute super administrators.',
    body: 'Dear {{institute.name}} Admin, your Vidya Setu {{plan.name}} subscription expires on {{plan.expiry_date}}. Renew today to ensure uninterrupted access: {{billing.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Modern Public School' },
      { key: 'plan.name', label: 'Plan Tier', type: 'text', example: 'Enterprise Annual' },
      { key: 'plan.expiry_date', label: 'Expiry Date', type: 'date', example: '31 Oct 2026' },
      { key: 'billing.url', label: 'Billing Portal', type: 'url', example: 'https://vidyasetu.com/billing' }
    ]
  },
  {
    id: 'sms-12',
    channel: 'sms',
    name: 'Student Doubt Answered',
    key: 'doubt.answered',
    description: 'Notification sent when faculty submits an answer to student query.',
    body: 'Hello {{student.name}}, your doubt on \'{{doubt.topic}}\' in {{subject.name}} has been answered by {{teacher.name}}. View explanation: {{doubt.url}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Sneha Patel' },
      { key: 'doubt.topic', label: 'Topic / Query', type: 'text', example: 'Electromagnetic Induction Q4' },
      { key: 'subject.name', label: 'Subject', type: 'text', example: 'Physics' },
      { key: 'teacher.name', label: 'Teacher', type: 'text', example: 'Prof. Anjali Saxena' },
      { key: 'doubt.url', label: 'Doubt URL', type: 'url', example: 'https://vidyasetu.com/doubts/104' }
    ]
  },

  // EMAIL TEMPLATES (100% Vidya Setu Platform)
  {
    id: 'email-1',
    channel: 'email',
    name: 'Student Admission Confirmation & Welcome',
    key: 'admission.welcome_email',
    description: 'Welcome email with student login credentials and institute guide.',
    subject: 'Welcome to {{institute.name}} — Admission Confirmed for {{student.name}}',
    body: 'Dear {{parent.name}}, we are delighted to confirm the admission of {{student.name}} into {{class.name}} at {{institute.name}}. Roll No: {{student.roll_no}}. Student Portal URL: {{portal.url}} with Username: {{student.username}}.',
    htmlBody: `<h1 style="margin:0 0 12px;color:#1e3a8a;font-size:22px;line-height:1.3;">Welcome to {{institute.name}}</h1>
<p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">Dear <strong>{{parent.name}}</strong>,</p>
<p style="margin:8px 0;color:#334155;font-size:15px;line-height:1.6;">We are pleased to confirm that admission for <strong>{{student.name}}</strong> in <strong>{{class.name}}</strong> has been finalized.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;">
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px;color:#64748b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">Roll Number</td>
    <td style="padding:10px 14px;color:#0f172a;font-size:14px;font-weight:bold;border-bottom:1px solid #e2e8f0;">{{student.roll_no}}</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;color:#64748b;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">Class & Batch</td>
    <td style="padding:10px 14px;color:#0f172a;font-size:14px;font-weight:bold;border-bottom:1px solid #e2e8f0;">{{class.name}}</td>
  </tr>
  <tr style="background:#f8fafc;">
    <td style="padding:10px 14px;color:#64748b;font-size:14px;font-weight:600;">Student Portal Login</td>
    <td style="padding:10px 14px;color:#2563eb;font-size:14px;font-weight:bold;">{{portal.url}}</td>
  </tr>
</table>
<p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">Please keep these credentials safe. For assistance, reach out to your institute administration desk.</p>`,
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'parent.name', label: 'Parent Name', type: 'text', example: 'Mr. Rajesh Sharma' },
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
      { key: 'class.name', label: 'Class / Grade', type: 'text', example: 'Class 10 - Science' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' },
      { key: 'student.roll_no', label: 'Roll Number', type: 'text', example: 'DPA-2026-104' },
      { key: 'portal.url', label: 'Portal Link', type: 'url', example: 'https://vidyasetu.com/portal' }
    ]
  },
  {
    id: 'email-2',
    channel: 'email',
    name: 'Official Fee Payment Receipt',
    key: 'billing.fee_receipt',
    description: 'Itemized fee invoice receipt generated upon fee settlement.',
    subject: 'Fee Receipt #{{receipt.number}} — {{institute.name}}',
    body: 'Receipt for payment ₹{{fee.amount}} against Receipt #{{receipt.number}} for {{student.name}} in {{institute.name}}.',
    htmlBody: `<h2 style="color:#1e3a8a;margin-bottom:8px;">Official Fee Receipt</h2>
<p style="color:#334155;font-size:14px;">Thank you for your fee payment of <strong>₹{{fee.amount}}</strong> for <strong>{{student.name}}</strong> at <strong>{{institute.name}}</strong>.</p>
<table style="width:100%;margin:16px 0;border-collapse:collapse;font-size:13px;">
  <tr><td style="padding:6px 0;color:#64748b;">Receipt Number:</td><td style="font-weight:bold;color:#0f172a;">{{receipt.number}}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Payment Date:</td><td style="font-weight:bold;color:#0f172a;">{{payment.date}}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b;">Payment Mode:</td><td style="font-weight:bold;color:#0f172a;">{{payment.mode}}</td></tr>
</table>
<p style="font-size:13px;color:#64748b;">This is a computer-generated tax receipt generated by Vidya Setu ERP.</p>`,
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'receipt.number', label: 'Receipt No', type: 'text', example: 'REC-2026-9041' },
      { key: 'fee.amount', label: 'Amount Paid', type: 'number', example: '14,500' },
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Rohan Verma' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Vidya Mandir Institute' },
      { key: 'payment.date', label: 'Payment Date', type: 'date', example: '06 Oct 2026' },
      { key: 'payment.mode', label: 'Payment Mode', type: 'text', example: 'UPI / NetBanking' }
    ]
  },
  {
    id: 'email-3',
    channel: 'email',
    name: 'New Institute Onboarding Credentials',
    key: 'saas.institute_onboarded',
    description: 'Sent to institute owners when their Vidya Setu ERP instance is provisioned.',
    subject: 'Welcome to Vidya Setu — {{institute.name}} Portal Active',
    body: 'Congratulations! Your Vidya Setu instance for {{institute.name}} is live. Admin Login: {{admin.email}}, Tier: {{plan.name}}.',
    htmlBody: `<h1 style="color:#1e3a8a;font-size:22px;">Welcome to Vidya Setu</h1>
<p style="color:#334155;font-size:15px;">Hello <strong>{{admin.name}}</strong>,</p>
<p style="color:#334155;font-size:14px;">Your cloud institutional portal for <strong>{{institute.name}}</strong> has been provisioned successfully under the <strong>{{plan.name}}</strong> subscription tier.</p>
<p style="margin:20px 0;"><a href="{{login.url}}" style="background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Access Admin Dashboard</a></p>
<p style="color:#64748b;font-size:13px;">Login Email: <strong>{{admin.email}}</strong></p>`,
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'admin.name', label: 'Admin Name', type: 'text', example: 'Principal Sharma' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Model School' },
      { key: 'plan.name', label: 'Plan Tier', type: 'text', example: 'Pro Enterprise' },
      { key: 'admin.email', label: 'Login Email', type: 'text', example: 'admin@delhischool.edu' },
      { key: 'login.url', label: 'Login URL', type: 'url', example: 'https://vidyasetu.com/login' }
    ]
  },
  {
    id: 'email-4',
    channel: 'email',
    name: 'Password Reset Instructions',
    key: 'auth.password_reset',
    description: 'Password reset link sent to users who request recovery.',
    subject: 'Reset Your Vidya Setu Account Password',
    body: 'Hello {{user.name}}, click the following link to reset your Vidya Setu account password: {{reset.url}}. Valid for {{expiry.minutes}} minutes.',
    htmlBody: `<h2 style="color:#1e3a8a;">Password Reset Request</h2>
<p style="color:#334155;">Hello <strong>{{user.name}}</strong>,</p>
<p style="color:#334155;">We received a request to reset your password on Vidya Setu. Click the button below to choose a new password:</p>
<p style="margin:20px 0;"><a href="{{reset.url}}" style="background:#2563eb;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">Reset Password</a></p>
<p style="color:#64748b;font-size:12px;">This link will expire in {{expiry.minutes}} minutes. If you did not request this, please ignore this email.</p>`,
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'user.name', label: 'User Name', type: 'text', example: 'Aarav Sharma' },
      { key: 'reset.url', label: 'Reset Link', type: 'url', example: 'https://vidyasetu.com/reset?token=90812' },
      { key: 'expiry.minutes', label: 'Expiry Duration', type: 'number', example: '15' }
    ]
  },

  // WHATSAPP TEMPLATES (100% Vidya Setu Platform)
  {
    id: 'whatsapp-1',
    channel: 'whatsapp',
    name: 'Daily Student Attendance Notification',
    key: 'attendance.daily_update',
    description: 'Automated WhatsApp update sent to parents after morning attendance.',
    body: '🎓 *Vidya Setu Attendance Update*\nDear Parent, {{student.name}} has been marked *{{attendance.status}}* today ({{attendance.date}}) at {{institute.name}}.\nBatch: {{batch.name}}',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
      { key: 'attendance.status', label: 'Status', type: 'text', example: 'Present' },
      { key: 'attendance.date', label: 'Date', type: 'date', example: '06 Oct 2026' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' },
      { key: 'batch.name', label: 'Batch Name', type: 'text', example: 'Class 10 - Section A' }
    ],
    buttons: [
      { type: 'URL', text: 'View Attendance Roster', url: 'https://vidyasetu.com/attendance' }
    ]
  },
  {
    id: 'whatsapp-2',
    channel: 'whatsapp',
    name: 'Instant Fee Payment Reminder',
    key: 'fee.reminder_whatsapp',
    description: 'WhatsApp payment notification with 1-click payment link.',
    body: '💳 *Vidya Setu Fee Alert*\nDear {{parent.name}}, the upcoming fee installment of *₹{{fee.amount}}* for {{student.name}} at {{institute.name}} is due on *{{fee.due_date}}*.\nPay easily online via the button below:',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'parent.name', label: 'Parent Name', type: 'text', example: 'Mr. Rajesh Sharma' },
      { key: 'fee.amount', label: 'Fee Amount', type: 'number', example: '12,500' },
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' },
      { key: 'fee.due_date', label: 'Due Date', type: 'date', example: '15 Oct 2026' }
    ],
    buttons: [
      { type: 'URL', text: 'Pay Fees Online', url: 'https://pay.vidyasetu.com/quick' },
      { type: 'PHONE', text: 'Call Accounts Desk', phone: '+919820011223' }
    ]
  },
  {
    id: 'whatsapp-3',
    channel: 'whatsapp',
    name: 'Emergency Institute Notice / Holiday',
    key: 'notice.emergency_circular',
    description: 'Urgent circular sent to all registered guardians and staff.',
    body: '📢 *Vidya Setu Institute Circular*\n{{institute.name}} Notice: *{{notice.title}}*\n{{notice.summary}}\nEffective Date: *{{notice.date}}*',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' },
      { key: 'notice.title', label: 'Circular Title', type: 'text', example: 'Holiday Notice - Heavy Rainfall Warning' },
      { key: 'notice.summary', label: 'Notice Summary', type: 'text', example: 'Classes suspended tomorrow as per government advisory. Online lectures active.' },
      { key: 'notice.date', label: 'Date', type: 'date', example: '07 Oct 2026' }
    ],
    buttons: [
      { type: 'URL', text: 'Read Circular', url: 'https://vidyasetu.com/notices' }
    ]
  },
  {
    id: 'whatsapp-4',
    channel: 'whatsapp',
    name: 'Student Doubt Resolved Notification',
    key: 'doubt.resolved_whatsapp',
    description: 'WhatsApp alert to student when faculty posts solution.',
    body: '💡 *Vidya Setu Doubt Solver*\nHello {{student.name}}, your doubt on *{{doubt.topic}}* in {{subject.name}} has been answered by *{{teacher.name}}*.\nCheck the complete explanation on your portal.',
    status: 'active',
    version: 'v1',
    variables: [
      { key: 'student.name', label: 'Student Name', type: 'text', example: 'Sneha Patel' },
      { key: 'doubt.topic', label: 'Doubt Query', type: 'text', example: 'Calculus Integration by Parts' },
      { key: 'subject.name', label: 'Subject', type: 'text', example: 'Mathematics' },
      { key: 'teacher.name', label: 'Teacher', type: 'text', example: 'Prof. Anjali Saxena' }
    ],
    buttons: [
      { type: 'URL', text: 'View Solution', url: 'https://vidyasetu.com/doubts' }
    ]
  }
];

const INITIAL_DELIVERIES: DeliveryLog[] = [
  {
    id: 'del-101',
    recipient: '+91 98201 12450',
    channel: 'sms',
    templateKey: 'attendance.absent_alert',
    templateName: 'Student Absent Alert',
    status: 'SENT',
    providerMsgId: 'msg_8492018402',
    timestamp: 'Today, 09:15 AM',
    details: 'Provider response HTTP 200 OK - Dispatched via Transactional DLT Route'
  },
  {
    id: 'del-102',
    recipient: 'parent.sharma@gmail.com',
    channel: 'email',
    templateKey: 'admission.welcome_email',
    templateName: 'Student Admission Confirmation & Welcome',
    status: 'SENT',
    providerMsgId: 'eml_9481029481',
    timestamp: 'Today, 08:42 AM',
    details: 'Delivered to SES mailer - Queued for recipient inbox'
  },
  {
    id: 'del-103',
    recipient: '+91 94120 44521',
    channel: 'whatsapp',
    templateKey: 'fee.reminder_whatsapp',
    templateName: 'Instant Fee Payment Reminder',
    status: 'SENT',
    providerMsgId: 'wa_391058201948',
    timestamp: 'Today, 08:30 AM',
    details: 'Meta WhatsApp Cloud API msg_id 391058201948'
  },
  {
    id: 'del-104',
    recipient: '+91 91234 56789',
    channel: 'sms',
    templateKey: 'fee.due_reminder',
    templateName: 'Fee Installment Due Reminder',
    status: 'FAILED',
    providerMsgId: 'err_gateway_unreachable',
    timestamp: 'Yesterday, 04:12 PM',
    details: 'HTTP 502 Bad Gateway - Endpoint timeout after 5000ms'
  }
];

interface MessagingTemplatesProps {
  defaultTab?: TabType;
}

export const MessagingTemplates: React.FC<MessagingTemplatesProps> = ({ defaultTab = 'channel-config' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabType | null;

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>(urlTab || defaultTab);

  // Sync tab with URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Channels state
  const [channels, setChannels] = useState<Record<ChannelType, ChannelConfig>>(INITIAL_CHANNELS);
  const [configuringChannelId, setConfiguringChannelId] = useState<ChannelType | null>(null);
  const [showApiKeyMap, setShowApiKeyMap] = useState<Record<string, boolean>>({});

  // Templates state
  const [templates, setTemplates] = useState<UnifiedTemplate[]>(INITIAL_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Deliveries state
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>(INITIAL_DELIVERIES);

  // Modals
  const [editingTemplate, setEditingTemplate] = useState<UnifiedTemplate | null>(null);
  const [isPreviewHidden, setIsPreviewHidden] = useState(false);
  const [isTestSendModalOpen, setIsTestSendModalOpen] = useState(false);
  const [testSendRecipient, setTestSendRecipient] = useState('');
  const [isTestingChannel, setIsTestingChannel] = useState<ChannelType | null>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch backend templates on load and augment (ignoring any legacy mock rows with 'aipta')
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const [smsRes, emailRes, waRes] = await Promise.allSettled([
          smsTemplateService.getTemplates({ limit: 100 }),
          emailTemplateService.getTemplates({ limit: 100 }),
          whatsappTemplateService.getTemplates({ limit: 100 })
        ]);

        const extraTemplates: UnifiedTemplate[] = [];

        if (smsRes.status === 'fulfilled' && smsRes.value?.data) {
          smsRes.value.data.forEach((st: any) => {
            const isAipta = (st.message_body || '').toLowerCase().includes('aipta') || (st.template_key || '').toLowerCase().includes('membership');
            if (!isAipta && !INITIAL_TEMPLATES.some(t => t.key === st.template_key && t.channel === 'sms')) {
              extraTemplates.push({
                id: `backend-sms-${st.id}`,
                channel: 'sms',
                name: st.template_name || st.name || 'SMS Template',
                key: st.template_key || `sms.${st.id}`,
                description: st.category ? `Category: ${st.category}` : 'SMS message template',
                body: st.message_body || '',
                status: st.status === 'active' ? 'active' : 'inactive',
                version: 'v1',
                variables: [
                  { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav' }
                ]
              });
            }
          });
        }

        if (emailRes.status === 'fulfilled' && emailRes.value?.data) {
          emailRes.value.data.forEach((et: any) => {
            const isAipta = (et.subject || '').toLowerCase().includes('aipta') || (et.template_key || '').toLowerCase().includes('membership');
            if (!isAipta && !INITIAL_TEMPLATES.some(t => t.key === et.template_key && t.channel === 'email')) {
              extraTemplates.push({
                id: `backend-email-${et.id}`,
                channel: 'email',
                name: et.name || 'Email Template',
                key: et.template_key || `email.${et.id}`,
                description: et.description || 'Email notification template',
                subject: et.subject || '',
                body: et.text_body || '',
                htmlBody: et.html_body || '',
                status: et.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
                version: 'v1',
                variables: [
                  { key: 'student_name', label: 'Student Name', type: 'text', example: 'Aarav' }
                ]
              });
            }
          });
        }

        if (waRes.status === 'fulfilled' && waRes.value?.data) {
          waRes.value.data.forEach((wt: any) => {
            const isAipta = (wt.message_body || '').toLowerCase().includes('aipta') || (wt.template_key || '').toLowerCase().includes('membership');
            if (!isAipta && !INITIAL_TEMPLATES.some(t => t.key === wt.template_key && t.channel === 'whatsapp')) {
              extraTemplates.push({
                id: `backend-wa-${wt.id}`,
                channel: 'whatsapp',
                name: wt.template_name || wt.name || 'WhatsApp Template',
                key: wt.template_key || `wa.${wt.id}`,
                description: wt.category ? `Category: ${wt.category}` : 'WhatsApp notification template',
                body: wt.message_body || '',
                status: wt.status === 'active' ? 'active' : 'inactive',
                version: 'v1',
                variables: [
                  { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav' }
                ]
              });
            }
          });
        }

        if (extraTemplates.length > 0) {
          setTemplates(prev => [...prev, ...extraTemplates]);
        }
      } catch (err) {
        console.error('Failed to sync backend templates', err);
      }
    };
    loadBackendData();
  }, []);

  // Filter templates for current active channel tab
  const currentChannelTemplates = useMemo(() => {
    if (activeTab !== 'sms' && activeTab !== 'email' && activeTab !== 'whatsapp') return [];
    return templates
      .filter(t => t.channel === activeTab)
      .filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.key.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
      });
  }, [templates, activeTab, searchQuery]);

  // Counts
  const smsCount = templates.filter(t => t.channel === 'sms').length;
  const emailCount = templates.filter(t => t.channel === 'email').length;
  const whatsappCount = templates.filter(t => t.channel === 'whatsapp').length;
  const deliveriesCount = deliveries.length;

  // Toggle template active / inactive
  const handleToggleStatus = (templateId: string | number) => {
    setTemplates(prev =>
      prev.map(t => {
        if (t.id === templateId) {
          const newStatus = t.status === 'active' ? 'inactive' : 'active';
          showToast(`Template marked as ${newStatus}`);
          return { ...t, status: newStatus };
        }
        return t;
      })
    );
  };

  // Open Template Editor (Edit or Create New)
  const handleOpenEditor = (template?: UnifiedTemplate) => {
    if (template) {
      setEditingTemplate(JSON.parse(JSON.stringify(template)));
    } else {
      const channel = (activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp') ? activeTab : 'sms';
      const newTemp: UnifiedTemplate = {
        id: `custom-${Date.now()}`,
        channel,
        name: `New ${channel.toUpperCase()} Template`,
        key: `custom.${channel}_${Date.now().toString().slice(-4)}`,
        description: `Custom ${channel} template for Vidya Setu`,
        subject: channel === 'email' ? 'Notification from Vidya Setu' : undefined,
        body: channel === 'email'
          ? 'Dear {{parent.name}}, this is an update regarding {{student.name}} from {{institute.name}}.'
          : 'Vidya Setu: Hello {{student.name}}, your update for {{batch.name}} is ready.',
        htmlBody: channel === 'email'
          ? `<h1 style="color:#1e3a8a;font-size:20px;">Notification from Vidya Setu</h1><p>Dear {{parent.name}},</p><p>This is an update regarding <strong>{{student.name}}</strong> from <strong>{{institute.name}}</strong>.</p>`
          : undefined,
        status: 'active',
        version: 'v1',
        variables: [
          { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
          { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' }
        ]
      };
      setEditingTemplate(newTemp);
    }
  };

  // Save template from editor
  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim() || !editingTemplate.key.trim()) {
      showToast('Name and Template Key are required');
      return;
    }

    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === editingTemplate.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = editingTemplate;
        return copy;
      } else {
        return [editingTemplate, ...prev];
      }
    });

    showToast(`Template "${editingTemplate.name}" saved successfully`);
    setEditingTemplate(null);
  };

  // Delete template
  const handleDeleteTemplate = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted');
      setEditingTemplate(null);
    }
  };

  // Execute channel test
  const handleTestChannel = (channelKey: ChannelType) => {
    setIsTestingChannel(channelKey);
    setTimeout(() => {
      const ch = channels[channelKey];
      const hasConfig = ch.endpoint !== '-' && ch.endpoint.startsWith('http');
      const nowStr = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).toLowerCase();

      setChannels(prev => ({
        ...prev,
        [channelKey]: {
          ...prev[channelKey],
          testStatus: hasConfig ? 'PASSED' : 'SKIPPED',
          lastTested: hasConfig
            ? `Last tested ${nowStr} — HTTP 200 OK (${prev[channelKey].label})`
            : `Last tested ${nowStr} — No endpoint URL configured`
        }
      }));

      // Add a test delivery
      const newDel: DeliveryLog = {
        id: `del-${Date.now()}`,
        recipient: channelKey === 'email' ? 'admin@vidyasetu.com' : '+91 98765 00000',
        channel: channelKey,
        templateKey: 'system.channel_test_ping',
        templateName: `${channelKey.toUpperCase()} Self-Test Probe`,
        status: hasConfig ? 'SENT' : 'FAILED',
        providerMsgId: hasConfig ? `test_ack_${Date.now()}` : 'ERR_NO_ENDPOINT',
        timestamp: 'Just now',
        details: hasConfig
          ? `Ping dispatched to ${ch.endpoint} with provider ${ch.provider}`
          : 'Channel test skipped because endpoint URL is unconfigured'
      };
      setDeliveries(prev => [newDel, ...prev]);

      setIsTestingChannel(null);
      showToast(hasConfig ? `${channelKey.toUpperCase()} Test Succeeded!` : `${channelKey.toUpperCase()} Test: No endpoint configured`);
    }, 800);
  };

  // Save channel configuration
  const handleSaveChannelConfig = (channelKey: ChannelType) => {
    showToast(`${channels[channelKey].name} channel configuration saved`);
    setConfiguringChannelId(null);
  };

  // Dispatch test send from template modal
  const handleSendTestFromTemplate = () => {
    if (!editingTemplate) return;
    const recipient = testSendRecipient.trim() || (editingTemplate.channel === 'email' ? 'parent.sharma@gmail.com' : '+91 98201 12450');

    const newDelivery: DeliveryLog = {
      id: `del-${Date.now()}`,
      recipient,
      channel: editingTemplate.channel,
      templateKey: editingTemplate.key,
      templateName: editingTemplate.name,
      status: 'SENT',
      providerMsgId: `msg_${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      timestamp: 'Just now',
      details: `Test dispatch delivered to provider adapter for ${recipient}`
    };

    setDeliveries(prev => [newDelivery, ...prev]);
    setIsTestSendModalOpen(false);
    showToast(`Test message dispatched to ${recipient}!`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {editingTemplate ? (
          <TemplateEditorModal
            template={editingTemplate}
            onChange={setEditingTemplate}
            onClose={() => setEditingTemplate(null)}
            onSave={handleSaveTemplate}
            onDelete={() => handleDeleteTemplate(editingTemplate.id)}
            onTestSend={() => setIsTestSendModalOpen(true)}
            isPreviewHidden={isPreviewHidden}
            onTogglePreview={() => setIsPreviewHidden(!isPreviewHidden)}
            showToast={showToast}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono mb-1">
                  MESSAGING
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Templates
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Channel configuration, SMS / email / WhatsApp templates and the outbound delivery log.
                </p>
              </div>

              {/* Top Action Button (Vidya Setu Blue Accent) */}
              {(activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp') && (
                <button
                  onClick={() => handleOpenEditor()}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-xs transition-all transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    New {activeTab === 'sms' ? 'SMS' : activeTab === 'email' ? 'email' : 'WhatsApp'} template
                  </span>
                </button>
              )}
            </div>

            {/* Navigation Tabs Bar (Vidya Setu Theme) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 flex items-center gap-1.5 mb-8 shadow-xs overflow-x-auto">
          {/* Tab: Channel Config */}
          <button
            onClick={() => handleTabChange('channel-config')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'channel-config'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Channel Config</span>
          </button>

          {/* Tab: SMS */}
          <button
            onClick={() => handleTabChange('sms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>SMS</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'sms' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {smsCount}
            </span>
          </button>

          {/* Tab: Email */}
          <button
            onClick={() => handleTabChange('email')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'email' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {emailCount}
            </span>
          </button>

          {/* Tab: WhatsApp */}
          <button
            onClick={() => handleTabChange('whatsapp')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'whatsapp' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {whatsappCount}
            </span>
          </button>

          {/* Tab: Deliveries */}
          <button
            onClick={() => handleTabChange('deliveries')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'deliveries'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Deliveries</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'deliveries' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deliveriesCount}
            </span>
          </button>
        </div>

        {/* TAB CONTENT 1: CHANNEL CONFIG */}
        {activeTab === 'channel-config' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Channels Cards */}
            {(['sms', 'email', 'whatsapp'] as ChannelType[]).map(channelKey => {
              const ch = channels[channelKey];
              const isConfiguring = configuringChannelId === channelKey;

              return (
                <div
                  key={channelKey}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all"
                >
                  {/* Card Header & Summary Bar */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Icon, Title, Badges & Subtitle */}
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-600 flex-shrink-0 mt-0.5">
                          {channelKey === 'sms' && <Smartphone className="w-5 h-5" />}
                          {channelKey === 'email' && <Mail className="w-5 h-5" />}
                          {channelKey === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center flex-wrap gap-2.5">
                            <span className="font-extrabold text-base tracking-wide text-slate-900 uppercase">
                              {ch.name}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                ch.status === 'ENABLED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {ch.status}
                            </span>
                            {ch.testStatus && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                TEST: {ch.testStatus}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 font-medium mt-1">
                            {ch.summary}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {ch.lastTested}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start lg:self-center">
                        {isConfiguring ? (
                          <button
                            onClick={() => setConfiguringChannelId(null)}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfiguringChannelId(channelKey)}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Configure
                          </button>
                        )}

                        <button
                          onClick={() => handleTestChannel(channelKey)}
                          disabled={isTestingChannel === channelKey}
                          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Zap className={`w-3.5 h-3.5 text-blue-600 ${isTestingChannel === channelKey ? 'animate-spin' : ''}`} />
                          <span>Test</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          ENDPOINT
                        </div>
                        <div className="font-medium text-slate-700 mt-1 truncate">
                          {ch.endpoint || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          API KEY
                        </div>
                        <div className="font-semibold text-amber-600 mt-1">
                          {ch.apiKey ? '••••••••' : 'Not configured'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          {channelKey === 'email' ? 'FROM ADDRESS' : 'SENDER'}
                        </div>
                        <div className="font-medium text-slate-700 mt-1 truncate">
                          {ch.sender || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          REQUIRED
                        </div>
                        <div className="font-medium text-amber-600 flex items-center gap-1 mt-1">
                          <span>⚠</span>
                          <span>{ch.required.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channel Editor Inline Drawer */}
                  {isConfiguring && (
                    <div className="bg-slate-50/70 border-t border-slate-200 p-6 space-y-5 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Provider */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            PROVIDER
                          </label>
                          <select
                            value={ch.provider}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], provider: e.target.value }
                              }))
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Generic HTTP (any gateway)">Generic HTTP (any gateway)</option>
                            <option value="Twilio">Twilio</option>
                            <option value="AWS SNS / SES">AWS SNS / SES</option>
                            <option value="Gupshup">Gupshup</option>
                            <option value="Msg91">Msg91</option>
                            <option value="SendGrid">SendGrid</option>
                          </select>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Configure method, path, auth header and a JSON body skeleton below.
                          </p>
                        </div>

                        {/* Label */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            LABEL
                          </label>
                          <input
                            type="text"
                            value={ch.label}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], label: e.target.value }
                              }))
                            }
                            placeholder="e.g. Vidya Setu Transactional Gateway"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Endpoint URL */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          ENDPOINT URL
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            value={ch.endpoint === '-' ? '' : ch.endpoint}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], endpoint: e.target.value }
                              }))
                            }
                            placeholder="https://api.example.com/v1/send"
                            className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                          />
                          <Link2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      {/* API Key & Sender ID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* API Key */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            API KEY / TOKEN
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKeyMap[channelKey] ? 'text' : 'password'}
                              value={ch.apiKey}
                              onChange={e =>
                                setChannels(prev => ({
                                  ...prev,
                                  [channelKey]: { ...prev[channelKey], apiKey: e.target.value }
                                }))
                              }
                              placeholder="Paste the key"
                              className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowApiKeyMap(p => ({ ...p, [channelKey]: !p[channelKey] }))
                              }
                              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                            >
                              {showApiKeyMap[channelKey] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-600 inline" />
                            <span>Stored securely. Masked on every read and never written to audit logs.</span>
                          </p>
                        </div>

                        {/* Sender ID */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            {channelKey === 'email' ? 'FROM ADDRESS' : 'SENDER ID'}
                          </label>
                          <input
                            type="text"
                            value={ch.sender}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], sender: e.target.value }
                              }))
                            }
                            placeholder={channelKey === 'email' ? 'notifications@vidyasetu.com' : 'VIDSETU'}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Alphanumeric sender id approved with your SMS gateway / DLT template header.
                          </p>
                        </div>
                      </div>

                      {/* Provider Options (JSON) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          PROVIDER OPTIONS (JSON)
                        </label>
                        <textarea
                          rows={4}
                          value={ch.providerOptionsJson}
                          onChange={e =>
                            setChannels(prev => ({
                              ...prev,
                              [channelKey]: { ...prev[channelKey], providerOptionsJson: e.target.value }
                            }))
                          }
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Auth header/scheme and JSON body skeleton. Placeholders &#123;&#123;to&#125;&#125;, &#123;&#123;from&#125;&#125;, &#123;&#123;subject&#125;&#125;, &#123;&#123;text&#125;&#125; and &#123;&#123;html&#125;&#125; each fill a whole string value.
                        </p>
                      </div>

                      {/* Enable Checkbox & Save Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800 select-none">
                          <input
                            type="checkbox"
                            checked={ch.enabledForSending}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: {
                                  ...prev[channelKey],
                                  enabledForSending: e.target.checked,
                                  status: e.target.checked ? 'ENABLED' : 'DISABLED'
                                }
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span>Enable this channel for sending</span>
                        </label>

                        <button
                          onClick={() => handleSaveChannelConfig(channelKey)}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-xs transition-all cursor-pointer"
                        >
                          <span>Save channel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* How a send works */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-6 text-xs text-slate-600 space-y-3">
              <div className="font-bold text-sm text-slate-900">
                How a send works
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-slate-600">
                <li>A SaaS or Institute admin picks an educational template and enters recipients (or triggers automated alerts on attendance, fees, or doubts).</li>
                <li>Each recipient's variables are rendered into the template body and subject dynamically.</li>
                <li>The matching channel config is read and the provider adapter builds the HTTP request — body shape comes from the channel's extra_config.</li>
                <li>Every recipient gets its own delivery-log row: SENT with the provider message id, or FAILED with the reason.</li>
              </ol>
              <div className="flex items-start gap-2 pt-2 text-amber-700 text-xs">
                <span className="font-bold">⚠</span>
                <span>
                  Delivery receipts from the gateway (DELIVERED / READ) are logged when webhook callbacks are triggered. Outbound dispatches settle at SENT or FAILED.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT 2, 3, 4: TEMPLATE LIST */}
        {(activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp') && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search and Count Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              {/* Search input with label */}
              <div className="w-full sm:max-w-md">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                  SEARCH
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Name or key"
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Right: Template count & + New template */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-semibold text-slate-500">
                  {currentChannelTemplates.length} templates
                </span>
                <button
                  onClick={() => handleOpenEditor()}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New template</span>
                </button>
              </div>
            </div>

            {/* Template Cards List */}
            {currentChannelTemplates.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <p className="text-slate-500 text-sm">No templates found matching your search.</p>
              </div>
            ) : (
              currentChannelTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  {/* Left: Template info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="font-bold text-slate-900 text-base">
                        {tpl.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          tpl.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tpl.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{tpl.status}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {tpl.version}
                      </span>
                    </div>

                    {/* Monospace Template Key */}
                    <div className="font-mono text-xs text-slate-400 tracking-tight">
                      {tpl.key}
                    </div>

                    {/* Subject preview if email */}
                    {tpl.subject && (
                      <div className="text-xs font-semibold text-slate-700">
                        Subject: <span className="font-normal text-slate-600">{tpl.subject}</span>
                      </div>
                    )}

                    {/* Message Body preview */}
                    <div className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-2">
                      {tpl.body}
                    </div>

                    {/* Clickable Variable Tag Pills */}
                    {tpl.variables && tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tpl.variables.map(v => (
                          <span
                            key={v.key}
                            className="bg-slate-50 border border-slate-200/80 text-slate-600 font-mono text-[11px] px-2 py-0.5 rounded-md"
                          >
                            {v.key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Edit & Deactivate */}
                  <div className="flex items-center gap-2 self-end md:self-start flex-shrink-0 pt-1">
                    <button
                      onClick={() => handleOpenEditor(tpl)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tpl.id)}
                      className="px-2 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      {tpl.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CONTENT 5: DELIVERIES (Outbound Delivery Log) */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Outbound Delivery Log
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live delivery status records generated by provider adapters across Vidya Setu channels.
                  </p>
                </div>
                <button
                  onClick={() => showToast('Delivery log refreshed')}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Recipient</th>
                      <th className="px-5 py-3.5">Channel</th>
                      <th className="px-5 py-3.5">Template</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Provider Msg ID</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveries.map(del => (
                      <tr key={del.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900 font-mono">
                          {del.recipient}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              del.channel === 'sms'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : del.channel === 'email'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {del.channel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="font-semibold">{del.templateName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{del.templateKey}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              del.status === 'SENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {del.status === 'SENT' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            )}
                            <span>{del.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                          {del.providerMsgId}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {del.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* TEST SEND DISPATCH MODAL */}
      {isTestSendModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <span>Test Dispatch Template</span>
              </h3>
              <button
                onClick={() => setIsTestSendModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Send a test message using template <span className="font-mono text-slate-700">{editingTemplate.key}</span> with live substitution tokens.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {editingTemplate.channel === 'email' ? 'Recipient Email Address' : 'Recipient Phone Number'}
              </label>
              <input
                type={editingTemplate.channel === 'email' ? 'email' : 'tel'}
                value={testSendRecipient}
                onChange={e => setTestSendRecipient(e.target.value)}
                placeholder={editingTemplate.channel === 'email' ? 'parent.sharma@gmail.com' : '+91 98201 12345'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsTestSendModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTestFromTemplate}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Dispatch Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// TEMPLATE EDITOR MODAL (SPLIT-VIEW)
// ==========================================
interface TemplateEditorModalProps {
  template: UnifiedTemplate;
  onChange: (t: UnifiedTemplate) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onTestSend: () => void;
  isPreviewHidden: boolean;
  onTogglePreview: () => void;
  showToast: (msg: string) => void;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  template,
  onChange,
  onClose,
  onSave,
  onDelete,
  onTestSend,
  isPreviewHidden,
  onTogglePreview,
  showToast
}) => {
  const isEmail = template.channel === 'email';
  const isSMS = template.channel === 'sms';
  const isWhatsApp = template.channel === 'whatsapp';

  // Refs for tracking cursor position across fields
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  const lastCursorRef = useRef<{
    field: 'subject' | 'body' | 'htmlBody';
    start: number;
    end: number;
  }>({ field: 'body', start: (template.body || '').length, end: (template.body || '').length });

  const recordCursor = (
    field: 'subject' | 'body' | 'htmlBody',
    el: HTMLInputElement | HTMLTextAreaElement | null
  ) => {
    if (!el) return;
    lastCursorRef.current = {
      field,
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length
    };
  };

  // Cursor-accurate variable insertion
  const handleInsertVariable = (varKey: string) => {
    const token = `{{${varKey}}}`;
    const { field, start, end } = lastCursorRef.current;

    if (field === 'subject' && isEmail) {
      const current = template.subject || '';
      const s = Math.min(start, current.length);
      const e = Math.min(end, current.length);
      const updated = current.substring(0, s) + token + current.substring(e);
      onChange({ ...template, subject: updated });
      const nextPos = s + token.length;
      lastCursorRef.current = { field: 'subject', start: nextPos, end: nextPos };
      setTimeout(() => {
        if (subjectInputRef.current) {
          subjectInputRef.current.focus();
          subjectInputRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    } else if (field === 'htmlBody' && isEmail) {
      const current = template.htmlBody || '';
      const s = Math.min(start, current.length);
      const e = Math.min(end, current.length);
      const updated = current.substring(0, s) + token + current.substring(e);
      onChange({ ...template, htmlBody: updated });
      const nextPos = s + token.length;
      lastCursorRef.current = { field: 'htmlBody', start: nextPos, end: nextPos };
      setTimeout(() => {
        if (htmlTextareaRef.current) {
          htmlTextareaRef.current.focus();
          htmlTextareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    } else {
      const current = template.body || '';
      const s = Math.min(start, current.length);
      const e = Math.min(end, current.length);
      const updated = current.substring(0, s) + token + current.substring(e);
      onChange({ ...template, body: updated });
      const nextPos = s + token.length;
      lastCursorRef.current = { field: 'body', start: nextPos, end: nextPos };
      setTimeout(() => {
        if (bodyTextareaRef.current) {
          bodyTextareaRef.current.focus();
          bodyTextareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    }
    showToast(`Inserted {{${varKey}}}`);
  };

  const handleAddVariable = () => {
    const newVarKey = `custom.var_${(template.variables?.length || 0) + 1}`;
    const newVars = [
      ...(template.variables || []),
      { key: newVarKey, label: 'Custom Var', type: 'text' as const, example: 'Example' }
    ];
    onChange({ ...template, variables: newVars });
  };

  const handleUpdateVariable = (idx: number, patch: Partial<VariableDef>) => {
    const copy = [...(template.variables || [])];
    copy[idx] = { ...copy[idx], ...patch };
    onChange({ ...template, variables: copy });
  };

  const handleRemoveVariable = (idx: number) => {
    const copy = [...(template.variables || [])];
    copy.splice(idx, 1);
    onChange({ ...template, variables: copy });
  };

  const handleCopyToken = (varKey: string) => {
    navigator.clipboard.writeText(`{{${varKey}}}`);
    showToast(`Copied {{${varKey}}} to clipboard`);
  };

  // Safe regex token replacement escaping special characters like dots
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderTokens = (rawText: string) => {
    if (!rawText) return '';
    let rendered = rawText;
    (template.variables || []).forEach(v => {
      if (!v.key) return;
      try {
        const reg = new RegExp(`\\{\\{${escapeRegex(v.key)}\\}\\}`, 'g');
        rendered = rendered.replace(reg, v.example || `[${v.label || v.key}]`);
      } catch (e) {
        // Fallback for safety
        rendered = rendered.split(`{{${v.key}}}`).join(v.example || `[${v.label || v.key}]`);
      }
    });
    return rendered;
  };

  const renderedSubject = renderTokens(template.subject || '');
  const renderedBody = renderTokens(template.body || '');
  const renderedHtml = renderTokens(template.htmlBody || template.body || '');

  // Exact telecom segment calculation
  const calculateSegments = (len: number) => {
    if (len === 0) return 1;
    if (len <= 160) return 1;
    return Math.ceil(len / 153);
  };

  const smsBodyLength = template.body?.length || 0;
  const smsRenderedLength = renderedBody?.length || 0;
  const smsSegments = calculateSegments(smsBodyLength);
  const renderedSmsSegments = calculateSegments(smsRenderedLength);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div className="pb-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {template.channel.toUpperCase()} templates</span>
        </button>
      </div>

      {/* Editor Full-Page Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {/* Card Header Title */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              {isSMS && <Smartphone className="w-5 h-5" />}
              {isEmail && <Mail className="w-5 h-5" />}
              {isWhatsApp && <MessageCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {template.name || 'Untitled Template'}
                </h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {template.version || 'v1'}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {template.key} · {template.channel.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              title="Close editor"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split View Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          {/* LEFT COLUMN: FORM EDITOR */}
          <div className={`${isPreviewHidden ? 'lg:col-span-12' : 'lg:col-span-7'} p-6 space-y-6`}>
            {/* Name & Template Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  NAME
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={e => onChange({ ...template, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  TEMPLATE KEY
                </label>
                <input
                  type="text"
                  value={template.key}
                  onChange={e => onChange({ ...template, key: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The key is the integration contract and cannot be changed.
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                DESCRIPTION
              </label>
              <input
                type="text"
                value={template.description}
                onChange={e => onChange({ ...template, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Subject (for Email) */}
            {isEmail && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    SUBJECT
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {(template.subject || '').length} / 120
                  </span>
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={template.subject || ''}
                  onFocus={e => recordCursor('subject', e.target)}
                  onClick={e => recordCursor('subject', e.currentTarget)}
                  onKeyUp={e => recordCursor('subject', e.currentTarget)}
                  onSelect={e => recordCursor('subject', e.currentTarget)}
                  onChange={e => {
                    recordCursor('subject', e.target);
                    onChange({ ...template, subject: e.target.value });
                  }}
                  maxLength={120}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            )}

            {/* Plain-text / Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {isEmail ? 'PLAIN-TEXT BODY (FALLBACK)' : 'MESSAGE BODY'}
                </label>
                {isSMS && (
                  <span className={`text-[11px] font-mono font-semibold ${smsSegments > 1 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {smsBodyLength} / 1,000 ({smsSegments} segment{smsSegments > 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <textarea
                ref={bodyTextareaRef}
                rows={isEmail ? 4 : 6}
                value={template.body}
                onFocus={e => recordCursor('body', e.target)}
                onClick={e => recordCursor('body', e.currentTarget)}
                onKeyUp={e => recordCursor('body', e.currentTarget)}
                onSelect={e => recordCursor('body', e.currentTarget)}
                onChange={e => {
                  recordCursor('body', e.target);
                  onChange({ ...template, body: e.target.value });
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed shadow-2xs"
              />

              {/* Progress bar for SMS */}
              {isSMS && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      smsBodyLength > 160 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (smsBodyLength / 1000) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* INSERT VARIABLE PILLS */}
            {template.variables && template.variables.length > 0 && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  CLICK TO INSERT VARIABLE AT CURSOR
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.variables.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      title={`Insert {{${v.key}}} at cursor position`}
                      className="bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 font-mono text-[11px] px-2.5 py-1 rounded-lg transition-all border border-slate-200 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      +{v.key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* HTML Body Editor (for Email only) */}
            {isEmail && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  HTML BODY
                </label>
                {/* Mini Formatting Toolbar */}
                <div className="bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl px-3 py-1.5 flex items-center gap-1 text-slate-600 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<strong>bold</strong>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs font-bold cursor-pointer"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<em>italic</em>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs italic cursor-pointer"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<h2 style="color:#1e3a8a;">Title</h2>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs font-semibold cursor-pointer"
                  >
                    T
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<a href="https://" style="color:#2563eb;">Link</a>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs flex items-center cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                  </button>
                </div>
                <textarea
                  ref={htmlTextareaRef}
                  rows={8}
                  value={template.htmlBody || ''}
                  onFocus={e => recordCursor('htmlBody', e.target)}
                  onClick={e => recordCursor('htmlBody', e.currentTarget)}
                  onKeyUp={e => recordCursor('htmlBody', e.currentTarget)}
                  onSelect={e => recordCursor('htmlBody', e.currentTarget)}
                  onChange={e => {
                    recordCursor('htmlBody', e.target);
                    onChange({ ...template, htmlBody: e.target.value });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-b-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Table-based inline styles only — Gmail and Outlook strip &lt;style&gt; blocks and external CSS.
                </p>
              </div>
            )}

            {/* VARIABLE CATALOGUE */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    VARIABLE CATALOGUE
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Declared tokens become insertable in the editor. Undeclared tokens are flagged on save.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 text-slate-700 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add variable</span>
                </button>
              </div>

              {/* Variables Rows */}
              <div className="space-y-3">
                {(template.variables || []).map((v, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl p-3 transition-colors"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                      {/* KEY */}
                      <div className="sm:col-span-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">KEY</div>
                        <input
                          type="text"
                          value={v.key}
                          onChange={e => handleUpdateVariable(idx, { key: e.target.value })}
                          placeholder="variable.key"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>

                      {/* LABEL */}
                      <div className="sm:col-span-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">LABEL</div>
                        <input
                          type="text"
                          value={v.label}
                          onChange={e => handleUpdateVariable(idx, { label: e.target.value })}
                          placeholder="Human label"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>

                      {/* TYPE */}
                      <div className="sm:col-span-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">TYPE</div>
                        <select
                          value={v.type}
                          onChange={e => handleUpdateVariable(idx, { type: e.target.value as any })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        >
                          <option value="text">text</option>
                          <option value="number">number</option>
                          <option value="date">date</option>
                          <option value="url">url</option>
                        </select>
                      </div>

                      {/* EXAMPLE */}
                      <div className="sm:col-span-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">EXAMPLE VALUE</div>
                        <input
                          type="text"
                          value={v.example}
                          onChange={e => handleUpdateVariable(idx, { example: e.target.value })}
                          placeholder="Preview example value"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>

                      {/* ACTIONS */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleCopyToken(v.key)}
                          title="Copy token to clipboard"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(idx)}
                          title="Remove variable"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={template.status === 'active'}
                  onChange={e => onChange({ ...template, status: e.target.checked ? 'active' : 'inactive' })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span>Active — inactive templates cannot be sent to real recipients</span>
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY LIVE PREVIEW */}
          {!isPreviewHidden && (
            <div className="lg:col-span-5 p-6 bg-slate-50/70">
              <div className="sticky top-6 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>LIVE PREVIEW</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Real-Time Token Substitution
                  </span>
                </div>

                {/* EMAIL LIVE PREVIEW */}
                {isEmail && (
                  <div className="space-y-4">
                    {/* Subject Box */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        SUBJECT
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {renderedSubject || 'No subject configured'}
                      </div>
                    </div>

                    {/* Rendered Email Content Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 min-h-[160px]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        RENDERED EMAIL
                      </div>
                      {template.htmlBody ? (
                        <div
                          className="text-xs leading-relaxed text-slate-800 prose prose-slate max-w-none"
                          dangerouslySetInnerHTML={{ __html: renderedHtml }}
                        />
                      ) : (
                        <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {renderedBody}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-400">
                      {(renderedHtml || renderedBody).length} chars
                    </div>
                  </div>
                )}

                {/* SMS LIVE PREVIEW */}
                {isSMS && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      MESSAGE BUBBLE
                    </div>

                    {/* Dark Navy / Indigo Phone Bubble */}
                    <div className="bg-[#0f172a] text-white p-5 rounded-2xl rounded-tl-xs text-sm leading-relaxed shadow-lg max-w-sm">
                      {renderedBody || 'Your message preview will appear here.'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                      <span>{renderedSmsSegments} SMS segment{renderedSmsSegments > 1 ? 's' : ''}</span>
                      <span>{smsRenderedLength} chars</span>
                    </div>
                  </div>
                )}

                {/* WHATSAPP LIVE PREVIEW */}
                {isWhatsApp && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      WHATSAPP CHAT PREVIEW
                    </div>

                    {/* WhatsApp chat container */}
                    <div className="bg-[#efeae2] border border-[#d1d7db] p-4 rounded-2xl max-w-sm shadow-xs space-y-3">
                      <div className="bg-white p-3.5 rounded-xl rounded-tr-none text-slate-800 text-sm leading-relaxed shadow-2xs">
                        <div className="whitespace-pre-wrap">
                          {renderedBody}
                        </div>
                        <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                          <span>12:00 PM</span>
                          <span className="text-sky-500 font-bold">✓✓</span>
                        </div>
                      </div>

                      {/* WhatsApp action buttons */}
                      {template.buttons && template.buttons.length > 0 && (
                        <div className="space-y-1.5">
                          {template.buttons.map((btn, bidx) => (
                            <div
                              key={bidx}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 text-center py-2 px-3 rounded-lg text-xs font-semibold shadow-2xs"
                            >
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between flex-shrink-0">
          {/* Delete Template (Left) */}
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete template</span>
          </button>

          {/* Right: Cancel, Test send, Save changes */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onTestSend}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>Test send</span>
            </button>

            <button
              type="button"
              onClick={onSave}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
