import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, ClipboardX, UserX, FileQuestion, ArrowRight } from 'lucide-react';
import type { AttentionRequired } from '../types';

interface AttentionSectionProps {
  data?: AttentionRequired;
  loading?: boolean;
}

interface TileConfig {
  key: keyof AttentionRequired;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  navigate: string;
  navState?: any;
}

const TILES: TileConfig[] = [
  {
    key: 'feeDues',
    label: 'Fee Dues',
    description: 'Students with overdue installments',
    icon: IndianRupee,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    navigate: '/fees',
  },
  {
    key: 'attendancePending',
    label: 'Attendance Pending',
    description: 'Past lectures not yet marked',
    icon: ClipboardX,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    navigate: '/attendance',
    navState: { tab: 'teachers' },
  },
  {
    key: 'lowAttendance',
    label: 'Low Attendance',
    description: 'Students below 75% threshold',
    icon: UserX,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    navigate: '/attendance',
    navState: { tab: 'students' },
  },
  {
    key: 'resultsPending',
    label: 'Results Pending',
    description: 'Exams awaiting result entry',
    icon: FileQuestion,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    navigate: '/assignments',
  },
];

const AttentionSection: React.FC<AttentionSectionProps> = ({ data, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs mb-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h4 className="font-bold text-slate-900 text-sm leading-tight">Actionable Items & Operations Alerts</h4>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TILES.map(tile => {
          const count = data ? (data[tile.key] ?? 0) : 0;
          const Icon = tile.icon;
          return (
            <div
              key={tile.key}
              onClick={() => navigate(tile.navigate, tile.navState ? { state: tile.navState } : undefined)}
              className="group relative border border-slate-200/80 hover:border-slate-300 rounded-xl p-3 bg-slate-50/50 hover:bg-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-950 transition-colors">{tile.label}</span>
                <div className={`w-7 h-7 rounded-lg ${tile.bg} ${tile.color} border ${tile.border} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xs`}>
                  <Icon size={14} className="transition-transform duration-300 group-hover:scale-105" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {loading ? '...' : count.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-800 flex items-center gap-0.5 transition-all">
                  View <ArrowRight size={10} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors mt-1 leading-tight">{tile.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttentionSection;
