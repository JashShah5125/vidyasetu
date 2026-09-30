import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { leadService } from '../../services/leadService';
import { planService } from '../../services/planService';
import api from '../../services/api';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import {
  Plus, Download, Eye, Pencil, Edit3, Trash2, RefreshCw, PhoneCall, X, ArrowLeft,
  Loader2, UserRound, Gauge, MapPin, FileText, Send, Flame, Sparkles, Clock,
  CheckCircle2, Snowflake, MessageSquare, Mail, Phone, ChevronDown,
  ArrowRight, UserCheck, TrendingUp, Calendar, AlertCircle,
  Building, User,
  Video
} from 'lucide-react';
import type { SaasLead, SaasLeadFollowup } from '../../types/saas';
import { LEAD_STATUS_MAP, LEAD_SOURCE_MAP, LEAD_STATUS_OPTIONS, LEAD_SOURCE_OPTIONS } from '../../types/saas';

// Format date helper
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const cleanStr = dateStr.split('T')[0].split(' ')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return cleanStr;
  }
  return dateStr;
};

// Stage / Status Definition & Styling
export interface StageConfig {
  id: number;
  label: string;
  shortLabel: string;
  temp: 'Inbound' | 'Outreach' | 'Warm' | 'Proposal' | 'Hot' | 'Won' | 'Cold';
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  stepperActiveBg: string;
  dotColor: string;
  icon: React.ElementType;
}

export const STAGES_CONFIG: Record<number, StageConfig> = {
  1: {
    id: 1,
    label: 'New Lead',
    shortLabel: 'New',
    temp: 'Inbound',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    stepperActiveBg: 'bg-blue-600 text-white',
    dotColor: 'bg-blue-500',
    icon: Sparkles
  },
  2: {
    id: 2,
    label: 'Contacted',
    shortLabel: 'Contacted',
    temp: 'Outreach',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
    stepperActiveBg: 'bg-violet-600 text-white',
    dotColor: 'bg-violet-500',
    icon: PhoneCall
  },
  3: {
    id: 3,
    label: 'Follow-up (Warm)',
    shortLabel: 'Follow-up',
    temp: 'Warm',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    stepperActiveBg: 'bg-amber-500 text-white',
    dotColor: 'bg-amber-500',
    icon: Clock
  },
  4: {
    id: 4,
    label: 'Plan Assigned',
    shortLabel: 'Plan Demo',
    temp: 'Proposal',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    stepperActiveBg: 'bg-indigo-600 text-white',
    dotColor: 'bg-indigo-500',
    icon: FileText
  },
  5: {
    id: 5,
    label: 'Hot Lead (Interested)',
    shortLabel: 'Hot Lead 🔥',
    temp: 'Hot',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    stepperActiveBg: 'bg-rose-600 text-white',
    dotColor: 'bg-rose-500',
    icon: Flame
  },
  6: {
    id: 6,
    label: 'Converted',
    shortLabel: 'Converted 🚀',
    temp: 'Won',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    stepperActiveBg: 'bg-emerald-600 text-white',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2
  },
  7: {
    id: 7,
    label: 'Lost / Cold',
    shortLabel: 'Lost / Cold ❄️',
    temp: 'Cold',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    stepperActiveBg: 'bg-slate-700 text-white',
    dotColor: 'bg-slate-400',
    icon: Snowflake
  }
};

// Sequential active pipeline stages (excluding Lost)
const PIPELINE_STEPPER_STAGES = [1, 2, 3, 4, 5, 6];

const getStatusBadge = (status: number): { label: string; className: string; icon: React.ElementType; temp: string } => {
  const stage = STAGES_CONFIG[status] || STAGES_CONFIG[1];
  return {
    label: stage.label,
    className: `${stage.badgeBg} ${stage.badgeText} ${stage.badgeBorder}`,
    icon: stage.icon,
    temp: stage.temp
  };
};

const getModeIcon = (mode: string) => {
  const lower = (mode || '').toLowerCase();
  if (lower.includes('call') || lower.includes('phone')) return { icon: PhoneCall, bg: 'bg-blue-100 text-blue-700' };
  if (lower.includes('whats') || lower.includes('chat')) return { icon: MessageSquare, bg: 'bg-emerald-100 text-emerald-700' };
  if (lower.includes('demo') || lower.includes('video')) return { icon: Video, bg: 'bg-indigo-100 text-indigo-700' };
  if (lower.includes('meet')) return { icon: UserRound, bg: 'bg-purple-100 text-purple-700' };
  if (lower.includes('mail')) return { icon: Mail, bg: 'bg-amber-100 text-amber-800' };
  return { icon: Clock, bg: 'bg-slate-100 text-slate-700' };
};

const emptyForm = {
  instituteName: '', contactPerson: '', designation: '', email: '', mobile: '', altMobile: '',
  addressLine1: '', city: '', state: '', pincode: '', source: '1', assignedTo: '', status: '1',
  lostReason: '', nextFollowupAt: '', planId: '', preferredSlug: '', remarks: ''
};

interface LeadFormState {
  instituteName: string; contactPerson: string; designation: string; email: string; mobile: string; altMobile: string;
  addressLine1: string; city: string; state: string; pincode: string; source: string; assignedTo: string; status: string;
  lostReason: string; nextFollowupAt: string; planId: string; preferredSlug: string; remarks: string;
}

type PageMode = 'list' | 'create' | 'edit' | 'view';

// Standalone Status Dropdown Menu
interface StatusDropdownMenuProps {
  lead: SaasLead;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelectStatus: (targetStatus: number) => void;
  isUpdating: boolean;
}

const StatusDropdownMenu: React.FC<StatusDropdownMenuProps> = ({
  lead,
  isOpen,
  onToggle,
  onSelectStatus,
  isUpdating
}) => {
  const badge = getStatusBadge(lead.status);
  const Icon = badge.icon;

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={isUpdating}
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${badge.className}`}
      >
        {isUpdating ? (
          <Loader2 size={13} className="animate-spin text-current" />
        ) : (
          <Icon size={13} className="shrink-0" />
        )}
        <span>{badge.label}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 left-0 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 text-xs animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Change CRM Status
          </div>
          <div className="py-1">
            {Object.values(STAGES_CONFIG).map((stage) => {
              const StageIcon = stage.icon;
              const isSelected = lead.status === stage.id;

              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStatus(stage.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                    <StageIcon size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                    <span>{stage.label}</span>
                  </div>
                  {isSelected && <CheckCircle2 size={14} className="text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Standalone Visual Interactive Pipeline Stepper Bar
interface InteractivePipelineStepperProps {
  lead: SaasLead;
  updatingLeadId: number | null;
  onQuickStatusChange: (lead: SaasLead, targetStatus: number) => void;
}

const InteractivePipelineStepper: React.FC<InteractivePipelineStepperProps> = ({
  lead,
  updatingLeadId,
  onQuickStatusChange
}) => {
  const currentStatus = lead.status;
  const isLost = currentStatus === 7;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">CRM Stage Pipeline</h3>
          <span className="text-xs text-slate-400">• Click any stage to instantly transition this lead</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickStatusChange(lead, 7)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLost
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Snowflake size={13} className={isLost ? 'text-cyan-300' : 'text-slate-400'} />
            {isLost ? 'Marked as Lost / Cold' : 'Mark Lost / Cold ❄️'}
          </button>
        </div>
      </div>

      {/* Stepper Chevrons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {PIPELINE_STEPPER_STAGES.map((stageId, index) => {
          const stage = STAGES_CONFIG[stageId];
          const Icon = stage.icon;
          const isCurrent = currentStatus === stageId;
          const isPassed = !isLost && currentStatus > stageId;
          const isUpdating = updatingLeadId === lead.id;

          return (
            <button
              key={stageId}
              type="button"
              disabled={isUpdating || (stageId === 6 && isCurrent)}
              onClick={() => onQuickStatusChange(lead, stageId)}
              title={`Click to set status to ${stage.label}`}
              className={`relative group flex flex-col p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isCurrent
                  ? `${stage.stepperActiveBg} border-transparent shadow-md scale-[1.02] ring-2 ring-offset-1 ring-blue-500`
                  : isPassed
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isCurrent ? 'text-white/80' : isPassed ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Step {index + 1}
                </span>
                {isPassed ? (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                ) : (
                  <Icon size={15} className={isCurrent ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'} />
                )}
              </div>
              <div className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                {stage.shortLabel}
              </div>
              <div className={`text-[10px] font-medium mt-0.5 ${isCurrent ? 'text-white/90' : 'text-slate-400'}`}>
                {stage.temp}
              </div>

              {isCurrent && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-slate-200" />
              )}
            </button>
          );
        })}
      </div>

      {isLost && lead.lostReason && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
          <AlertCircle size={15} className="text-slate-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800">Lead marked as Lost:</strong> {lead.lostReason}
          </div>
        </div>
      )}
    </div>
  );
};

// Standalone Support-Ticket Style Follow-up Console with ISOLATED local state
interface SupportStyleFollowupConsoleProps {
  lead: SaasLead;
  onFollowupRecorded: () => void;
  openStatusMenuId: number | null;
  setOpenStatusMenuId: React.Dispatch<React.SetStateAction<number | null>>;
  onSelectStatus: (lead: SaasLead, targetStatus: number) => void;
  isUpdatingStatus: boolean;
}

const SupportStyleFollowupConsole: React.FC<SupportStyleFollowupConsoleProps> = ({
  lead,
  onFollowupRecorded,
  openStatusMenuId,
  setOpenStatusMenuId,
  onSelectStatus,
  isUpdatingStatus
}) => {
  const { addToast } = useApp();
  const [localMode, setLocalMode] = useState('Phone Call');
  const [localOutcome, setLocalOutcome] = useState('');
  const [localNotes, setLocalNotes] = useState('');
  const [localNextAt, setLocalNextAt] = useState('');
  const [localStatus, setLocalStatus] = useState('');
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false);

  const followups = lead.followups || [];
  const interactionModes = [
    { label: 'Phone Call', icon: PhoneCall },
    { label: 'WhatsApp', icon: MessageSquare },
    { label: 'Meeting', icon: UserRound },
    { label: 'Demo', icon: Video },
    { label: 'Email', icon: Mail }
  ];

  const handleLogSubmit = async () => {
    if (!localOutcome.trim()) {
      addToast('Please write interaction summary or discussion points', 'error');
      return;
    }
    setIsSubmittingFollowup(true);
    try {
      await leadService.addFollowup(String(lead.id), {
        followupMode: localMode.trim() || 'Phone Call',
        outcome: localOutcome.trim(),
        notes: localNotes.trim() || null,
        nextFollowupAt: localNextAt || null
      });

      if (localStatus) {
        try {
          await leadService.updateLeadStatus(String(lead.id), Number(localStatus));
        } catch { /* status update */ }
      }

      addToast('Follow-up interaction recorded successfully', 'success');
      setLocalOutcome('');
      setLocalNotes('');
      setLocalNextAt('');
      setLocalStatus('');
      onFollowupRecorded();
    } catch (error: any) {
      console.error('Failed to add follow-up:', error);
      addToast(error?.response?.data?.message || 'Failed to add follow-up', 'error');
    } finally {
      setIsSubmittingFollowup(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Console Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <PhoneCall size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Follow-up Interactions &amp; Activity Log
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-extrabold">
                {followups.length} logged
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Log outreach calls, WhatsApp discussions, meetings, and update pipeline stage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusDropdownMenu
            lead={lead}
            isOpen={openStatusMenuId === lead.id}
            onToggle={(e) => {
              e.stopPropagation();
              setOpenStatusMenuId(openStatusMenuId === lead.id ? null : lead.id);
            }}
            onSelectStatus={(targetStatus) => {
              setOpenStatusMenuId(null);
              onSelectStatus(lead, targetStatus);
            }}
            isUpdating={isUpdatingStatus}
          />
        </div>
      </div>

      {/* Message Thread Stream */}
      <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto bg-slate-50/30">
        {/* Initial Lead Inbound Card */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              Lead Inbound Registration
            </span>
            <span className="text-slate-400 font-medium">{formatDate(lead.createdAt)}</span>
          </div>
          <p className="text-sm text-slate-700 font-medium">
            Registered via {LEAD_SOURCE_MAP[lead.source] || 'Manual'}. Contact: <strong>{lead.contactPerson}</strong> ({lead.mobile})
            {lead.planName ? ` • Interested in ${lead.planName}` : ''}.
          </p>
          {lead.remarks && (
            <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
              Initial remarks: {lead.remarks}
            </div>
          )}
        </div>

        {/* Chronological Follow-up Notes (Chat Style) */}
        {followups.length === 0 ? (
          <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/60">
            <MessageSquare size={26} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No follow-up interactions logged yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Use the response box below to record your first conversation.</p>
          </div>
        ) : (
          followups.map((fup, idx) => {
            const modeMeta = getModeIcon(fup.followupMode);
            const ModeIcon = modeMeta.icon;

            return (
              <div key={fup.id || idx} className="flex gap-3 items-start">
                <div className={`w-8 h-8 rounded-xl ${modeMeta.bg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}>
                  <ModeIcon size={15} />
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide ${modeMeta.bg}`}>
                        {fup.followupMode}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        Staff Representative
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">{formatDate(fup.createdAt)}</span>
                      {fup.nextFollowupAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Calendar size={11} /> Next: {formatDate(fup.nextFollowupAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {fup.outcome}
                  </p>

                  {fup.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      <strong>Internal Notes:</strong> {fup.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Support-Ticket Style Follow-up Composer */}
      {lead.status !== 6 ? (
        <div className="p-4 border-t border-slate-200 bg-white space-y-3.5">
          {/* Mode Selector Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Mode:</span>
              {interactionModes.map((item) => {
                const Icon = item.icon;
                const isSelected = localMode === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setLocalMode(item.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Advance Status pills */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs font-bold text-slate-400 mr-1">Advance Stage:</span>
              {Object.values(STAGES_CONFIG).filter(s => s.id !== 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLocalStatus(localStatus === String(s.id) ? '' : String(s.id))}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    localStatus === String(s.id)
                      ? `${s.stepperActiveBg} border-transparent shadow-xs`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome & Notes Textarea */}
          <textarea
            rows={3}
            value={localOutcome}
            onChange={(e) => setLocalOutcome(e.target.value)}
            placeholder={`Write summary of ${localMode.toLowerCase()} (e.g. Discussed pricing plans, sent demo credentials, scheduled live walkthrough...) *`}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all resize-y"
          />

          {/* Optional internal notes & scheduling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Optional internal remarks / key requirements..."
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Next Date:</span>
                <input
                  type="date"
                  value={localNextAt}
                  onChange={(e) => setLocalNextAt(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none w-full"
                />
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleLogSubmit}
                disabled={isSubmittingFollowup || !localOutcome.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold shadow-sm bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isSubmittingFollowup ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{isSubmittingFollowup ? 'Logging...' : 'Log Interaction'}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={15} /> Lead converted to Tenant #{lead.convertedTenantId}. Follow-up cycle complete.
        </div>
      )}
    </div>
  );
};

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  iconClass?: string;
  extraHeader?: React.ReactNode;
}> = ({ icon, title, children, className = '', iconClass = 'text-blue-600', extraHeader }) => (
  <Card className={`h-full rounded-2xl shadow-sm ${className}`}>
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={`shrink-0 ${iconClass}`}>{icon}</span>
          <h3 className="text-sm font-bold text-slate-800 tracking-wide">{title}</h3>
        </div>
        {extraHeader}
      </div>
      {children}
    </div>
  </Card>
);

const DetailField: React.FC<{ label: string; value?: React.ReactNode; className?: string }> = ({
  label,
  value,
  className = ''
}) => (
  <div className={className}>
    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
    <div className="mt-1 text-sm font-medium text-slate-900 break-words leading-snug">{value || '—'}</div>
  </div>
);

const Tabs: React.FC<{
  active: 'details' | 'followups';
  onChange: (t: 'details' | 'followups') => void;
  count?: number;
}> = ({ active, onChange, count }) => (
  <div className="mb-6 border-b border-slate-200 overflow-x-auto">
    <nav className="flex gap-1 min-w-max">
      <button
        type="button"
        onClick={() => onChange('details')}
        className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-[3px] -mb-px transition-colors cursor-pointer ${
          active === 'details'
            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
      >
        Lead Profile &amp; Pipeline
      </button>
      <button
        type="button"
        onClick={() => onChange('followups')}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-[3px] -mb-px transition-colors cursor-pointer ${
          active === 'followups'
            ? 'border-blue-600 text-blue-700 bg-blue-50/50'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
      >
        Interaction Console &amp; Follow-up History
        {typeof count === 'number' && count > 0 && (
          <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </button>
    </nav>
  </div>
);

// Main Leads Component
export const Leads: React.FC = () => {
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<SaasLead[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [dbStatusCounts, setDbStatusCounts] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);

  const [pageMode, setPageMode] = useState<PageMode>('list');
  const [viewTab, setViewTab] = useState<'details' | 'followups'>('details');
  const [editTab, setEditTab] = useState<'details' | 'followups'>('details');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [currentLead, setCurrentLead] = useState<SaasLead | null>(null);
  const [form, setForm] = useState<LeadFormState>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Quick status update state
  const [updatingStatusLeadId, setUpdatingStatusLeadId] = useState<number | null>(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<number | null>(null);
  const [promptLostModalLead, setPromptLostModalLead] = useState<SaasLead | null>(null);
  const [quickLostReason, setQuickLostReason] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SaasLead | null>(null);
  const [deleteLostReason, setDeleteLostReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick follow-up modal for any lead from list/kanban
  const [quickFollowupLead, setQuickFollowupLead] = useState<SaasLead | null>(null);
  const [loadingQuickLead, setLoadingQuickLead] = useState(false);

  const starterPlanId = availablePlans.find((p) => p.code === 'STARTER')?.id ||
    (availablePlans.length > 0 ? availablePlans[0].id.toString() : '');

  // Close status dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setOpenStatusMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const result = await leadService.getLeads({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: filterStatus,
        source: filterSource,
        plan: filterPlan,
        assignedTo: filterAssignedTo
      });
      setLeads(result.data || []);
      setTotalItems(result.pagination?.total || result.total || 0);
      if (result.statusCounts) {
        setDbStatusCounts(result.statusCounts);
      }
    } catch (error: any) {
      console.error('Failed to fetch leads:', error);
      addToast(error?.response?.data?.message || 'Failed to fetch leads', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, searchTerm, filterStatus, filterSource, filterPlan, filterAssignedTo]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await planService.getPlans(['Active']);
        setAvailablePlans(res.data || []);
      } catch (e) {
        console.error('Failed to fetch plans', e);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const res = await api.get('/admin/users', { params: { limit: 200 } });
        const users = res?.data?.data?.users || [];
        const saasUsers = users.filter((u: any) => !u.tenant_id);
        setAssignees(saasUsers.length > 0 ? saasUsers : users);
      } catch (e) {
        console.error('Failed to fetch assignees', e);
      }
    };
    fetchAssignees();
  }, []);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterSource('');
    setFilterPlan('');
    setFilterAssignedTo('');
    setCurrentPage(1);
  };

  // Pipeline stats computed from accurate database counts
  const pipelineStats = useMemo(() => {
    if (Object.keys(dbStatusCounts).length > 0) {
      const grandTotal = Object.values(dbStatusCounts).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
      return {
        total: grandTotal,
        new: dbStatusCounts[1] || 0,
        contacted: dbStatusCounts[2] || 0,
        followup: dbStatusCounts[3] || 0,
        planAssigned: dbStatusCounts[4] || 0,
        hot: dbStatusCounts[5] || 0,
        converted: dbStatusCounts[6] || 0,
        lost: dbStatusCounts[7] || 0
      };
    }
    const counts = {
      total: totalItems,
      new: 0,
      contacted: 0,
      followup: 0,
      planAssigned: 0,
      hot: 0,
      converted: 0,
      lost: 0
    };
    leads.forEach((l) => {
      if (l.status === 1) counts.new++;
      else if (l.status === 2) counts.contacted++;
      else if (l.status === 3) counts.followup++;
      else if (l.status === 4) counts.planAssigned++;
      else if (l.status === 5) counts.hot++;
      else if (l.status === 6) counts.converted++;
      else if (l.status === 7) counts.lost++;
    });
    return counts;
  }, [leads, totalItems, dbStatusCounts]);

  const resetForm = (lead?: SaasLead | null) => {
    if (lead) {
      setForm({
        instituteName: lead.instituteName || '',
        contactPerson: lead.contactPerson || '',
        designation: lead.designation || '',
        email: lead.email || '',
        mobile: lead.mobile || '',
        altMobile: lead.altMobile || '',
        addressLine1: lead.addressLine1 || '',
        city: lead.city || '',
        state: lead.state || '',
        pincode: lead.pincode || '',
        source: lead.source ? String(lead.source) : '1',
        assignedTo: lead.assignedTo ? String(lead.assignedTo) : '',
        status: lead.status ? String(lead.status) : '1',
        lostReason: lead.lostReason || '',
        nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.slice(0, 10) : '',
        planId: lead.planId ? String(lead.planId) : '',
        preferredSlug: lead.preferredSlug || '',
        remarks: lead.remarks || ''
      });
    } else {
      setForm({
        ...emptyForm,
        planId: starterPlanId,
        source: '1',
        status: '1'
      });
    }
    setFormErrors({});
  };

  const goToList = () => {
    setPageMode('list');
  };

  const handleOpenAdd = () => {
    setEditingLeadId(null);
    resetForm(null);
    setPageMode('create');
    setEditTab('details');
  };

  const handleEditLead = async (lead: SaasLead) => {
    setEditingLeadId(String(lead.id));
    resetForm(lead);
    setCurrentLead(lead);
    setPageMode('edit');
    setEditTab('details');
    try {
      const res = await leadService.getLead(String(lead.id));
      if (res?.data) {
        setCurrentLead(res.data);
        resetForm(res.data);
      }
    } catch (error) {
      console.error('Failed to load lead detail:', error);
    }
  };

  const handleViewLead = async (lead: SaasLead) => {
    setEditingLeadId(String(lead.id));
    resetForm(lead);
    setCurrentLead(lead);
    setPageMode('view');
    setViewTab('details');
    try {
      const res = await leadService.getLead(String(lead.id));
      if (res?.data) {
        setCurrentLead(res.data);
        resetForm(res.data);
      }
    } catch (error) {
      console.error('Failed to load lead detail:', error);
      addToast('Failed to load lead details', 'error');
    }
  };

  const refreshLeadData = async (leadId: number | string) => {
    try {
      const res = await leadService.getLead(String(leadId));
      if (res?.data) {
        if (currentLead?.id === Number(leadId)) {
          setCurrentLead(res.data);
          resetForm(res.data);
        }
        if (quickFollowupLead?.id === Number(leadId)) {
          setQuickFollowupLead(res.data);
        }
      }
      fetchLeads();
    } catch (e) {
      console.error('Failed to refresh lead data', e);
    }
  };

  // Open quick follow-up modal with full interaction history loaded
  const handleOpenQuickFollowup = async (lead: SaasLead) => {
    setQuickFollowupLead(lead);
    setLoadingQuickLead(true);
    try {
      const res = await leadService.getLead(String(lead.id));
      if (res?.data) {
        setQuickFollowupLead(res.data);
      }
    } catch (e) {
      console.error('Failed to load quick lead followups', e);
    } finally {
      setLoadingQuickLead(false);
    }
  };

  // Quick direct status updater (1-click transition)
  const handleQuickStatusChange = async (lead: SaasLead, targetStatus: number, lostReasonInput?: string) => {
    if (targetStatus === 7 && lostReasonInput === undefined) {
      setPromptLostModalLead(lead);
      setQuickLostReason(lead.lostReason || '');
      return;
    }

    if (targetStatus === 6) {
      handleConvert(lead);
      return;
    }

    try {
      setUpdatingStatusLeadId(lead.id);
      if (targetStatus === 7 && lostReasonInput) {
        await leadService.updateLead(String(lead.id), { status: 7, lostReason: lostReasonInput });
      } else {
        await leadService.updateLeadStatus(String(lead.id), targetStatus);
      }
      
      const stageName = STAGES_CONFIG[targetStatus]?.label || 'Updated';
      addToast(`Status updated to "${stageName}"`, 'success');

      if (pageMode === 'view' && currentLead?.id === lead.id) {
        const res = await leadService.getLead(String(lead.id));
        if (res?.data) {
          setCurrentLead(res.data);
          resetForm(res.data);
        }
      }

      if (quickFollowupLead?.id === lead.id) {
        setQuickFollowupLead(prev => prev ? { ...prev, status: targetStatus } : null);
      }
      
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: targetStatus, lostReason: lostReasonInput || l.lostReason } : l))
      );

      setPromptLostModalLead(null);
      setQuickLostReason('');
      fetchLeads();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      addToast(error?.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatusLeadId(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.instituteName.trim()) errors.instituteName = 'Institute name is compulsory';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person name is compulsory';
    const cleanMobile = form.mobile.replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) errors.mobile = 'Mobile number is compulsory and must be at least 10 digits';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Invalid email format';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = (): any => ({
    instituteName: form.instituteName.trim(),
    contactPerson: form.contactPerson.trim(),
    designation: form.designation || null,
    email: form.email ? form.email.trim() : null,
    mobile: form.mobile.replace(/[^0-9]/g, ''),
    altMobile: form.altMobile ? form.altMobile.replace(/[^0-9]/g, '') : null,
    addressLine1: form.addressLine1 || null,
    city: form.city || null,
    state: form.state || null,
    pincode: form.pincode || null,
    source: Number(form.source),
    assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
    status: Number(form.status),
    lostReason: form.lostReason || null,
    nextFollowupAt: form.nextFollowupAt || null,
    planId: form.planId ? Number(form.planId) : null,
    preferredSlug: form.preferredSlug || null,
    remarks: form.remarks || null
  });

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (editingLeadId) {
        await leadService.updateLead(editingLeadId, buildPayload());
        addToast('Lead updated successfully', 'success');
      } else {
        await leadService.createLead(buildPayload());
        addToast('Lead created successfully', 'success');
      }
      goToList();
      fetchLeads();
    } catch (error: any) {
      console.error('Failed to save lead:', error);
      addToast(error?.response?.data?.message || 'Failed to save lead', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await leadService.deleteLead(String(deleteTarget.id), deleteLostReason);
      addToast('Lead deleted successfully', 'success');
      setDeleteTarget(null);
      setDeleteLostReason('');
      fetchLeads();
    } catch (error: any) {
      console.error('Failed to delete lead:', error);
      addToast(error?.response?.data?.message || 'Failed to delete lead', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConvert = (lead: SaasLead) => {
    if (lead.status === 6) return;
    navigate(`/tenants/create?leadId=${lead.id}`);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Institute', 'Contact Person', 'Designation', 'Mobile', 'Email', 'Source', 'Assigned To', 'Plan', 'Status', 'Next Follow-up', 'Created'];
    const rows = leads.map((l) => [
      String(l.id), (l.instituteName || '').replace(/,/g, ' '), (l.contactPerson || '').replace(/,/g, ' '),
      (l.designation || '').replace(/,/g, ' '), l.mobile || '', (l.email || '').replace(/,/g, ' '),
      LEAD_SOURCE_MAP[l.source] || '', (l.assignedToName || '').replace(/,/g, ' '), l.planName || '',
      LEAD_STATUS_MAP[l.status] || '', formatDate(l.nextFollowupAt), formatDate(l.createdAt)
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const assigneeOptions = assignees.map((u) => ({ value: String(u.id), label: u.name || u.email || `User ${u.id}` }));

  // Quick Action Contact Helpers
  const openWhatsApp = (mobile: string, name: string, institute: string) => {
    const cleanNumber = mobile.replace(/[^0-9]/g, '');
    const num = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const text = encodeURIComponent(`Hi ${name || 'Sir/Madam'}, following up regarding Vidya Setu management portal for ${institute || 'your academy'}. Let us know if you'd like a quick live demonstration.`);
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  const openCall = (mobile: string) => {
    window.location.href = `tel:${mobile}`;
  };

  const openEmail = (email: string, institute: string) => {
    const subject = encodeURIComponent(`Vidya Setu Software - Next Steps for ${institute || 'Institute'}`);
    window.location.href = `mailto:${email}?subject=${subject}`;
  };

  const renderFormField = (label: string, key: keyof LeadFormState, required = false, placeholder = '') => (
    <div key={key} className="flex flex-col gap-1">
      <Input
        label={label + (required ? ' *' : '')}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        error={formErrors[key]}
        placeholder={placeholder}
      />
    </div>
  );

  const formSelect = (label: string, key: keyof LeadFormState, options: { value: string; label: string }[]) => (
    <Select
      key={key}
      label={label}
      value={form[key]}
      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      options={options}
    />
  );

  const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goToList}
          title="Back to Leads"
          className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
            {pageMode === 'create' && (
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                New Sales Entry
              </span>
            )}
            {pageMode === 'edit' && currentLead && (
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Lead #{currentLead.id}
              </span>
            )}
            {pageMode === 'view' && currentLead && (
              <StatusDropdownMenu
                lead={currentLead}
                isOpen={openStatusMenuId === currentLead.id}
                onToggle={(e) => {
                  e.stopPropagation();
                  setOpenStatusMenuId(openStatusMenuId === currentLead.id ? null : currentLead.id);
                }}
                onSelectStatus={(targetStatus) => {
                  setOpenStatusMenuId(null);
                  handleQuickStatusChange(currentLead, targetStatus);
                }}
                isUpdating={updatingStatusLeadId === currentLead.id}
              />
            )}
          </div>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>

      {pageMode === 'create' && (
        <div className="flex items-center gap-2.5 shrink-0">
          <Button type="button" variant="secondary" onClick={goToList} className="cursor-pointer font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4">
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 cursor-pointer font-bold text-xs px-5 shadow-sm">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
            <span>{isSubmitting ? 'Creating...' : 'Save & Create Lead'}</span>
          </Button>
        </div>
      )}

      {pageMode === 'edit' && editTab === 'details' && (
        <div className="flex items-center gap-2.5 shrink-0">
          <Button type="button" variant="secondary" onClick={goToList} className="cursor-pointer font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4">
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 cursor-pointer font-bold text-xs px-5 shadow-sm">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
            <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      )}

      {pageMode === 'view' && currentLead && (
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="secondary" onClick={() => handleEditLead(currentLead)} className="flex items-center gap-1.5">
            <Pencil size={15} /> Edit Lead
          </Button>
          {currentLead.status !== 6 && (
            <Button variant="primary" onClick={() => handleConvert(currentLead)} className="flex items-center gap-1.5 shadow-sm">
              <RefreshCw size={15} /> Convert to Tenant
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderFormFields = () => (
    <div className="space-y-6">
      {/* Top Grid: 2 Core Cards (Institute & Contact) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Institute Information */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Institute Details</h3>
              <p className="text-xs text-slate-400">Academy name and portal subscription interest</p>
            </div>
          </div>
          <div className="space-y-4">
            {renderFormField('Institute Name', 'instituteName', true, 'e.g. Apex Science Academy')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderFormField('Subdomain Slug', 'preferredSlug', false, 'e.g. apex-academy')}
              {formSelect('Interested Plan Tier', 'planId', [
                { value: '', label: 'No plan selected' },
                ...availablePlans.map((p) => ({ value: String(p.id), label: p.name }))
              ])}
            </div>
          </div>
        </div>

        {/* Card 2: Primary Contact Person */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Primary Contact Person</h3>
              <p className="text-xs text-slate-400">Decision maker & key representative details</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderFormField('Contact Person Name', 'contactPerson', true, 'e.g. Dr. Rajesh Sharma')}
              {renderFormField('Designation', 'designation', false, 'e.g. Director / Dean / Owner')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderFormField('Primary Mobile Number', 'mobile', true, '10-digit primary mobile')}
              {renderFormField('Alt Mobile Number', 'altMobile', false, 'Secondary contact')}
            </div>
            {renderFormField('Email Address', 'email', false, 'e.g. director@apexacademy.com')}
          </div>
        </div>
      </div>

      {/* Middle Grid: Address & Pipeline Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card 3: Location & Address */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Location & Campus Address</h3>
              <p className="text-xs text-slate-400">Head office or main campus physical address</p>
            </div>
          </div>
          <div className="space-y-4">
            {renderFormField('Address Line 1', 'addressLine1', false, 'e.g. Plot 42, Sector 17, Main Road')}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {renderFormField('City', 'city', false, 'e.g. Mumbai')}
              {renderFormField('State', 'state', false, 'e.g. Maharashtra')}
              {renderFormField('PIN Code', 'pincode', false, 'e.g. 400001')}
            </div>
          </div>
        </div>

        {/* Card 4: Pipeline & Assignment */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Gauge size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sales Pipeline & Allocation</h3>
              <p className="text-xs text-slate-400">Lead discovery channel & staff assignment</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formSelect('Discovery Source', 'source', LEAD_SOURCE_OPTIONS)}
              {formSelect('Assigned Sales Rep', 'assignedTo', [{ value: '', label: 'Unassigned' }, ...assigneeOptions])}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formSelect('CRM Stage / Status', 'status', LEAD_STATUS_OPTIONS)}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Next Follow-up Date</label>
                <input
                  type="date"
                  value={form.nextFollowupAt ? form.nextFollowupAt.split('T')[0] : ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextFollowupAt: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            {Number(form.status) === 7 && renderFormField('Reason for Lost / Drop', 'lostReason', false, 'e.g. Budget constraints, opted for alternate platform...')}
          </div>
        </div>
      </div>

      {/* Card 5: Internal Remarks */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Internal Remarks & Specific Requirements</h3>
            <p className="text-xs text-slate-400">Add notes on student strength, branches count, custom requirements, or initial discussions</p>
          </div>
        </div>
        <textarea
          rows={3}
          value={form.remarks}
          onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
          placeholder="Enter notes, key requirements, student capacity, or initial discussion summary..."
          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all resize-y"
        />
      </div>
    </div>
  );

  /* ------------------------------ CREATE / EDIT Page ------------------------------ */
  if (pageMode === 'create' || pageMode === 'edit') {
    const isEdit = pageMode === 'edit';
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <PageHeader
          title={isEdit ? 'Edit Lead' : 'Add New Lead'}
          subtitle={isEdit ? `Updating lead record for ${form.instituteName || 'selected institute'}.` : 'Record prospective academy details, decision makers, and sales assignment.'}
        />
        {isEdit && (
          <Tabs active={editTab} onChange={setEditTab} count={currentLead?.followups?.length} />
        )}

        {!(isEdit && editTab === 'followups') ? (
          <div className="space-y-6">
            {renderFormFields()}
            
            {/* Action Bar Footer */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-medium">
                Fields marked with <span className="text-red-500 font-bold">*</span> are required.
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" onClick={goToList} className="px-5">
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 px-6 shadow-sm">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
                  <span>{isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Save & Create Lead')}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {currentLead && (
              <SupportStyleFollowupConsole
                lead={currentLead}
                onFollowupRecorded={() => refreshLeadData(currentLead.id)}
                openStatusMenuId={openStatusMenuId}
                setOpenStatusMenuId={setOpenStatusMenuId}
                onSelectStatus={handleQuickStatusChange}
                isUpdatingStatus={updatingStatusLeadId === currentLead.id}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  /* --------------------------------- VIEW Lead Full Page --------------------------------- */
  if (pageMode === 'view') {
    const lead = currentLead;
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <PageHeader
          title={lead ? lead.instituteName : 'Lead Details'}
          subtitle={lead ? `Lead #${lead.id} • Registered ${formatDate(lead.createdAt)}` : 'Loading lead details...'}
        />

        {!lead ? (
          <Card className="rounded-2xl"><div className="p-8 text-center text-slate-400">Loading lead details...</div></Card>
        ) : (
          <>
            {/* Visual Interactive Pipeline Stepper */}
            <InteractivePipelineStepper
              lead={lead}
              updatingLeadId={updatingStatusLeadId}
              onQuickStatusChange={handleQuickStatusChange}
            />

            <Tabs active={viewTab} onChange={setViewTab} count={lead.followups?.length} />

            {viewTab === 'details' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                  
                  {/* Contact Card with Quick Communication triggers */}
                  <SectionCard
                    icon={<UserRound size={17} />}
                    title="Contact Information"
                    extraHeader={
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openWhatsApp(lead.mobile, lead.contactPerson, lead.instituteName)}
                          title="WhatsApp chat"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <MessageSquare size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openCall(lead.mobile)}
                          title="Phone Call"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Phone size={15} />
                        </button>
                        {lead.email && (
                          <button
                            type="button"
                            onClick={() => openEmail(lead.email!, lead.instituteName)}
                            title="Send Email"
                            className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors cursor-pointer"
                          >
                            <Mail size={15} />
                          </button>
                        )}
                      </div>
                    }
                  >
                    <div className="space-y-3.5">
                      <DetailField label="Contact Person" value={
                        <div className="font-bold text-slate-900">{lead.contactPerson}</div>
                      } />
                      <DetailField label="Designation" value={lead.designation} />
                      <DetailField label="Phone / WhatsApp" value={
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{lead.mobile}</span>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(lead.mobile, lead.contactPerson, lead.instituteName)}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                          >
                            Chat
                          </button>
                        </div>
                      } />
                      <DetailField label="Alt Mobile" value={lead.altMobile} />
                      <DetailField label="Email Address" value={
                        lead.email ? (
                          <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                            {lead.email}
                          </a>
                        ) : '—'
                      } />
                    </div>
                  </SectionCard>

                  {/* CRM Pipeline Card */}
                  <SectionCard icon={<Gauge size={17} />} title="CRM Pipeline &amp; Stage" iconClass="text-sky-600">
                    <div className="space-y-3.5">
                      <DetailField label="Current Stage" value={
                        <div className="flex items-center gap-2">
                          <StatusDropdownMenu
                            lead={lead}
                            isOpen={openStatusMenuId === lead.id}
                            onToggle={(e) => {
                              e.stopPropagation();
                              setOpenStatusMenuId(openStatusMenuId === lead.id ? null : lead.id);
                            }}
                            onSelectStatus={(targetStatus) => {
                              setOpenStatusMenuId(null);
                              handleQuickStatusChange(lead, targetStatus);
                            }}
                            isUpdating={updatingStatusLeadId === lead.id}
                          />
                        </div>
                      } />
                      <DetailField label="Source" value={
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {LEAD_SOURCE_MAP[lead.source] || '—'}
                        </span>
                      } />
                      <DetailField label="Interested Plan" value={
                        lead.planName ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                            {lead.planName}
                          </span>
                        ) : 'No plan selected'
                      } />
                      <DetailField label="Assigned Rep" value={
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <UserCheck size={14} className="text-slate-400" />
                          <span>{lead.assignedToName || 'Unassigned'}</span>
                        </div>
                      } />
                      <DetailField label="Next Follow-up" value={
                        lead.nextFollowupAt ? (
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                            {formatDate(lead.nextFollowupAt)}
                          </span>
                        ) : 'None scheduled'
                      } />
                      {lead.status === 6 && (
                        <DetailField label="Conversion Status" value={
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            Converted to Tenant #{lead.convertedTenantId} on {formatDate(lead.convertedAt)}
                          </span>
                        } />
                      )}
                      {lead.status === 7 && lead.lostReason && (
                        <DetailField label="Reason Lost" value={
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-xs">
                            {lead.lostReason}
                          </span>
                        } />
                      )}
                    </div>
                  </SectionCard>

                  {/* Address & Location */}
                  <SectionCard icon={<MapPin size={17} />} title="Address &amp; Location" iconClass="text-indigo-600">
                    <div className="space-y-3.5">
                      <DetailField label="Address Line 1" value={lead.addressLine1} />
                      <DetailField label="Preferred Slug" value={
                        lead.preferredSlug ? (
                          <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono">
                            {lead.preferredSlug}
                          </code>
                        ) : '—'
                      } />
                      <DetailField label="City · State · PIN" value={[lead.city, lead.state, lead.pincode].filter(Boolean).join(', ')} />
                      <DetailField label="Record Created" value={formatDate(lead.createdAt)} />
                    </div>
                  </SectionCard>

                  {/* Remarks Box */}
                  <SectionCard icon={<FileText size={17} />} title="Internal Remarks &amp; Notes" className="lg:col-span-3" iconClass="text-cyan-600">
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {lead.remarks || 'No remarks recorded for this lead.'}
                    </p>
                  </SectionCard>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <SupportStyleFollowupConsole
                  lead={lead}
                  onFollowupRecorded={() => refreshLeadData(lead.id)}
                  openStatusMenuId={openStatusMenuId}
                  setOpenStatusMenuId={setOpenStatusMenuId}
                  onSelectStatus={handleQuickStatusChange}
                  isUpdatingStatus={updatingStatusLeadId === lead.id}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ------------------------------------ LIST Page ------------------------------------ */
  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Sales &amp; Acquisition CRM</h2>
          <p className="text-base text-slate-500 mt-1.5">
            Track leads across sales stages, manage follow-ups, and convert high-intent academies into tenants.
          </p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} className="px-4 py-2.5 text-sm shadow-sm" onClick={handleOpenAdd}>
          <Plus size={18} /> Add Lead
        </Button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => { setFilterStatus(''); setCurrentPage(1); }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === '' ? 'bg-blue-50/50 border-blue-200 ring-2 ring-blue-500 ring-offset-1' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{pipelineStats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('1'); setCurrentPage(1); }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === '1' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500 ring-offset-1' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} /> New Leads
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">{pipelineStats.new}</div>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('2'); setCurrentPage(1); }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === '2' ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-500 ring-offset-1' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
            <PhoneCall size={12} /> Contacted
          </div>
          <div className="text-2xl font-black text-violet-700 mt-1">{pipelineStats.contacted}</div>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('3'); setCurrentPage(1); }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === '3' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500 ring-offset-1' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} /> Follow-up (Warm)
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{pipelineStats.followup}</div>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('5'); setCurrentPage(1); }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === '5' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500 ring-offset-1' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <Flame size={12} /> Hot Leads 🔥
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{pipelineStats.hot}</div>
        </button>

        <button
          type="button"
          onClick={() => { setFilterStatus('6'); setCurrentPage(1); }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === '6' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500 ring-offset-1' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} /> Converted 🚀
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{pipelineStats.converted}</div>
        </button>
      </div>

      {/* Search, Filter & Export Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1 w-full items-end">
          <Input
            label="Search"
            placeholder="Institute, contact, mobile, email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')); setCurrentPage(1); }}
            wrapperClassName="sm:col-span-2 lg:col-span-1"
          />
          <Select
            label="CRM Stage"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Stages' }, ...LEAD_STATUS_OPTIONS]}
          />
          <Select
            label="Source"
            value={filterSource}
            onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Sources' }, ...LEAD_SOURCE_OPTIONS]}
          />
          <Select
            label="Plan"
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Plans' }, ...availablePlans.map((p) => ({ value: String(p.id), label: p.name }))]}
          />
          <Select
            label="Assigned Rep"
            value={filterAssignedTo}
            onChange={(e) => { setFilterAssignedTo(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Assignees' }, ...assigneeOptions]}
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700">Clear</Button>
          <Button variant="secondary" onClick={handleExportCSV} disabled={leads.length === 0} className="flex items-center gap-1.5 cursor-pointer">
            <Download size={15} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <Table
          dense
          borderless
          minWidth="1050px"
          headers={[
            { label: 'ID', minWidth: '50px' },
            { label: 'Institute', minWidth: '170px' },
            { label: 'Contact Person', minWidth: '140px' },
            { label: 'Mobile / Email', minWidth: '160px' },
            { label: 'Source', minWidth: '85px' },
            { label: 'Plan', minWidth: '100px' },
            { label: 'Stage / Status', minWidth: '170px' },
            { label: 'Next Follow-up', minWidth: '125px' },
            { label: 'Actions', align: 'center', minWidth: '140px' }
          ]}
        >
          {isLoading && leads.length === 0 ? (
            <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-400">Loading leads...</td></tr>
          ) : leads.length === 0 ? (
            <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-400">No leads found.</td></tr>
          ) : (
            leads.map((l) => (
              <tr key={l.id} onClick={() => handleViewLead(l)} className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                <td className="px-3 py-2.5 font-semibold text-slate-900 text-xs whitespace-nowrap">#{l.id}</td>
                <td className="px-3 py-2.5 font-bold text-slate-900 text-sm">
                  <div className="truncate max-w-[200px]" title={l.instituteName}>
                    {l.instituteName}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-700">
                  <div className="font-semibold text-slate-800 truncate max-w-[160px]" title={l.contactPerson}>
                    {l.contactPerson}
                  </div>
                  {l.designation && (
                    <div className="text-[11px] text-slate-400 truncate max-w-[160px]" title={l.designation}>
                      {l.designation}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="font-semibold text-slate-800">{l.mobile || '—'}</div>
                  {l.email && (
                    <div className="text-[11px] text-slate-400 truncate max-w-[190px]" title={l.email}>
                      {l.email}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                  {LEAD_SOURCE_MAP[l.source] || '—'}
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                  {l.planName ? (
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">{l.planName}</span>
                  ) : '—'}
                </td>
                
                {/* Interactive Status Dropdown Menu inside table cell */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <StatusDropdownMenu
                    lead={l}
                    isOpen={openStatusMenuId === l.id}
                    onToggle={(e) => {
                      e.stopPropagation();
                      setOpenStatusMenuId(openStatusMenuId === l.id ? null : l.id);
                    }}
                    onSelectStatus={(targetStatus) => {
                      setOpenStatusMenuId(null);
                      handleQuickStatusChange(l, targetStatus);
                    }}
                    isUpdating={updatingStatusLeadId === l.id}
                  />
                </td>

                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                  {l.nextFollowupAt ? (
                    <span className="inline-flex items-center font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-xs">
                      {formatDate(l.nextFollowupAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">—</span>
                  )}
                </td>
                
                <td className="px-3 py-2.5 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickFollowup(l)}
                      title="Log Follow-up Interaction"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <PhoneCall size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewLead(l)}
                      title="View Lead Details"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditLead(l)}
                      title="Edit Lead"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    {l.status !== 6 && (
                      <button
                        type="button"
                        onClick={() => handleConvert(l)}
                        title="Convert to Tenant"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setDeleteTarget(l); setDeleteLostReason(''); }}
                      title="Delete Lead"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>
        {totalItems > 10 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination totalItems={totalItems} totalPages={Math.ceil(totalItems / 10)} currentPage={currentPage} onPageChange={setCurrentPage} pageSize={10} />
          </div>
        )}
      </Card>

      {/* Support-Ticket Style Follow-up Modal */}
      {quickFollowupLead && (
        <Modal
          isOpen={!!quickFollowupLead}
          onClose={() => setQuickFollowupLead(null)}
          title={`Follow-up Conversation: ${quickFollowupLead.instituteName}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Quick Header Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                  {quickFollowupLead.contactPerson?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{quickFollowupLead.contactPerson}</div>
                  <div className="text-slate-500">{quickFollowupLead.mobile} {quickFollowupLead.email ? `• ${quickFollowupLead.email}` : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openWhatsApp(quickFollowupLead.mobile, quickFollowupLead.contactPerson, quickFollowupLead.instituteName)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 cursor-pointer"
                >
                  <MessageSquare size={13} /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => openCall(quickFollowupLead.mobile)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 cursor-pointer"
                >
                  <Phone size={13} /> Call
                </button>
              </div>
            </div>

            {loadingQuickLead ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <SupportStyleFollowupConsole
                lead={quickFollowupLead}
                onFollowupRecorded={() => refreshLeadData(quickFollowupLead.id)}
                openStatusMenuId={openStatusMenuId}
                setOpenStatusMenuId={setOpenStatusMenuId}
                onSelectStatus={handleQuickStatusChange}
                isUpdatingStatus={updatingStatusLeadId === quickFollowupLead.id}
              />
            )}
          </div>
        </Modal>
      )}

      {/* Lost Reason Modal (when switching to Lost) */}
      {promptLostModalLead && (
        <Modal
          isOpen={!!promptLostModalLead}
          onClose={() => { setPromptLostModalLead(null); setQuickLostReason(''); }}
          title="Mark Lead as Lost / Cold"
          size="sm"
          footer={
            <span className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => { setPromptLostModalLead(null); setQuickLostReason(''); }}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => handleQuickStatusChange(promptLostModalLead, 7, quickLostReason)}
                disabled={updatingStatusLeadId === promptLostModalLead.id}
              >
                {updatingStatusLeadId === promptLostModalLead.id ? 'Updating...' : 'Mark Lost / Cold'}
              </Button>
            </span>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Please specify the reason why <strong>{promptLostModalLead.instituteName}</strong> is lost or inactive:
            </p>
            <textarea
              value={quickLostReason}
              onChange={(e) => setQuickLostReason(e.target.value)}
              placeholder="e.g. Budget constraints, opted for competitor, no response after 5 attempts..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors resize-y"
            />
          </div>
        </Modal>
      )}

      {/* Delete confirm Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteLostReason(''); }}
          title="Delete Lead"
          size="sm"
          footer={
            <span className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteLostReason(''); }} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete} disabled={isDeleting} className="flex items-center gap-1.5">
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />} {isDeleting ? 'Deleting...' : 'Delete Lead'}
              </Button>
            </span>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={16} className="text-red-600" />
              </span>
              <div>
                <p className="font-bold text-red-900">Warning: This action cannot be undone.</p>
                <p className="mt-1 text-red-700 leading-relaxed">
                  Are you sure you want to delete lead <strong className="text-slate-900 font-bold">{deleteTarget.instituteName}</strong>?
                  This will mark it as lost and remove it from the pipeline.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lost Reason (optional)</label>
              <textarea
                value={deleteLostReason}
                onChange={(e) => setDeleteLostReason(e.target.value)}
                placeholder="e.g. Not interested, budget constraints, went with a competitor..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors resize-y"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};