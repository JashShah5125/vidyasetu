import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserPlus,
  Banknote,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import type { DashboardKpis } from '../types';

interface ExecutiveKpiRowProps {
  kpis: DashboardKpis | undefined;
  loading?: boolean;
}

const formatCurrency = (v: number) => {
  const val = Math.round(v);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  bg,
  border,
  accentBar,
  subtext,
  badge,
  onClick,
  loading
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  accentBar: string;
  subtext?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) => (
  <div
    onClick={onClick}
    className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:shadow-slate-200/60 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
  >
    {/* Subtle Accent Glow on Hover */}
    <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentBar} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

    <div className="relative z-10 flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 uppercase tracking-widest block transition-colors">
        {label}
      </span>
      <div className={`w-9 h-9 ${bg} ${color} rounded-xl flex items-center justify-center ${border} transition-all duration-300 group-hover:scale-110 group-hover:shadow-xs shrink-0`}>
        <Icon size={18} className="transition-transform duration-300 group-hover:scale-105" />
      </div>
    </div>

    <div className="relative z-10 mt-2.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-2xl font-extrabold text-slate-900 tracking-tight block">
          {loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : value}
        </span>
        <div className="flex items-center gap-1">
          {badge}
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-slate-300 group-hover:text-slate-600 group-hover:bg-slate-100 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0">
            <ArrowUpRight size={13} />
          </div>
        </div>
      </div>
      {subtext && (
        <div className="h-4 mt-0.5 overflow-hidden text-[11px] text-slate-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
          {subtext}
        </div>
      )}
    </div>
  </div>
);

const TrendIndicator = ({ change }: { change: number }) => {
  const isPositive = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-transform group-hover:scale-105 ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
    >
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(change)}%
    </span>
  );
};

const ExecutiveKpiRow: React.FC<ExecutiveKpiRowProps> = ({ kpis, loading }) => {
  const navigate = useNavigate();

  const cards = [
    {
      label: 'Active Students',
      value: kpis?.activeStudents?.value.toLocaleString('en-IN') ?? '0',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/80',
      border: 'border border-indigo-100',
      accentBar: 'bg-indigo-500',
      subtext: 'Filtered enrollment count',
      onClick: () => navigate('/students'),
    },
    {
      label: 'Active Staff',
      value: kpis?.activeStaff?.value.toLocaleString('en-IN') ?? '0',
      icon: UserCheck,
      color: 'text-sky-600',
      bg: 'bg-sky-50/80',
      border: 'border border-sky-100',
      accentBar: 'bg-sky-500',
      subtext: `${kpis?.activeStaff?.teachingCount ?? 0} Teaching · ${kpis?.activeStaff?.nonTeachingCount ?? 0} Non-teaching`,
      onClick: () => navigate('/staff'),
    },
    {
      label: 'Admissions',
      value: kpis?.admissions?.value.toLocaleString('en-IN') ?? '0',
      icon: UserPlus,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/80',
      border: 'border border-emerald-100',
      accentBar: 'bg-emerald-500',
      badge: kpis?.admissions?.change !== undefined ? <TrendIndicator change={kpis.admissions.change} /> : undefined,
      subtext: 'New enrollments in period',
      onClick: () => navigate('/leads-admissions'),
    },
    {
      label: 'Fee Collected',
      value: formatCurrency(kpis?.feeCollection?.value ?? 0),
      icon: Banknote,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/80',
      border: 'border border-emerald-100',
      accentBar: 'bg-emerald-500',
      badge: kpis?.feeCollection?.change !== undefined && kpis?.feeCollection?.change !== 0
        ? <TrendIndicator change={kpis.feeCollection.change} />
        : undefined,
      subtext: 'Net fees received in range',
      onClick: () => navigate('/fees'),
    },
    {
      label: 'Pending Fees',
      value: formatCurrency(kpis?.pendingFees?.value ?? 0),
      icon: AlertOctagon,
      color: 'text-amber-600',
      bg: 'bg-amber-50/80',
      border: 'border border-amber-100',
      accentBar: 'bg-amber-500',
      subtext: `${kpis?.pendingFees?.dueCount ?? 0} students overdue`,
      onClick: () => navigate('/fees'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-5">
      {cards.map(c => (
        <StatCard key={c.label} {...c} loading={loading} />
      ))}
    </div>
  );
};

export default ExecutiveKpiRow;
