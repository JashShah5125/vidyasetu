import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart } from '@mui/x-charts/PieChart';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import type { AdmissionsTrendPoint } from '../types';

interface AdmissionsTrendChartProps {
  data?: AdmissionsTrendPoint[];
  loading?: boolean;
}

const MONTHS = [
  { short: 'Jan', aliases: ['jan', 'january'] },
  { short: 'Feb', aliases: ['feb', 'february'] },
  { short: 'Mar', aliases: ['mar', 'march'] },
  { short: 'Apr', aliases: ['apr', 'april'] },
  { short: 'May', aliases: ['may'] },
  { short: 'Jun', aliases: ['jun', 'june'] },
  { short: 'Jul', aliases: ['jul', 'july'] },
  { short: 'Aug', aliases: ['aug', 'august'] },
  { short: 'Sep', aliases: ['sep', 'sept', 'september'] },
  { short: 'Oct', aliases: ['oct', 'october'] },
  { short: 'Nov', aliases: ['nov', 'november'] },
  { short: 'Dec', aliases: ['dec', 'december'] },
];

const MONTH_COLORS = [
  '#3b82f6',
  '#10b981',
  '#fbbf24',
  '#fb923c',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#6366f1',
  '#06b6d4',
  '#14b8a6',
  '#94a3b8',
  '#a78bfa',
];

const normalizeMonth = (label: string): string => {
  const normalized = label.trim().toLowerCase();
  const month = MONTHS.find((item) => item.aliases.includes(normalized));
  return month?.short ?? label;
};

const AdmissionsTrendChart: React.FC<AdmissionsTrendChartProps> = ({
  data,
  loading,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isBranchAdmin = currentUser?.role === 'branch-admin';

  const handleClick = () => {
    const targetPath = isBranchAdmin ? '/branch/students' : '/admin/students';
    navigate(targetPath);
  };

  const points = data ?? [];

  const monthlyData = useMemo(() => {
    return MONTHS.map((month) => {
      const matchingPoint = points.find(
        (point) => normalizeMonth(String(point?.label ?? '')) === month.short,
      );

      return {
        label: month.short,
        count: matchingPoint?.count ? Number(matchingPoint.count) : 0,
      };
    });
  }, [points]);

  const total = monthlyData.reduce((sum, item) => sum + item.count, 0);

  const pieData = useMemo(() => {
    if (total === 0) {
      return [
        {
          id: 'empty',
          value: 1,
          label: 'No Intake',
          color: '#e2e8f0',
        },
      ];
    }
    return monthlyData.map((item, index) => ({
      id: index,
      value: item.count,
      label: item.label,
      color: MONTH_COLORS[index],
    }));
  }, [monthlyData, total]);

  return (
    <div
      onClick={handleClick}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Hover accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header */}
      <div className="border-b border-slate-100 pb-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight group-hover:text-indigo-950 transition-colors">
              Admissions Intake Trend
            </h4>
            <ArrowUpRight
              size={12}
              className="text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0"
            />
          </div>
          <p className="h-3 overflow-hidden text-[10px] text-slate-500 font-normal opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
            Month-by-month intake distribution
          </p>
        </div>

        <span className="text-base sm:text-lg font-extrabold text-slate-900">
          {total.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Content: Centered Larger Donut Chart */}
      <div className="h-[140px] w-full min-w-0 flex items-center justify-center mt-1">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
            Loading admissions...
          </div>
        ) : (
          <div
            className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{ width: 140, height: 140 }}
          >
            <PieChart
              series={[
                {
                  data: pieData,
                  innerRadius: 44,
                  outerRadius: 66,
                  paddingAngle: total > 0 ? 2 : 0,
                  cornerRadius: total > 0 ? 3 : 0,
                  highlightScope: {
                    fade: 'global',
                    highlight: 'item',
                  },
                  faded: {
                    innerRadius: 42,
                    additionalRadius: -2,
                    color: '#cbd5e1',
                  },
                  valueFormatter: (item) =>
                    total > 0
                      ? `${item.value.toLocaleString('en-IN')} (${((item.value / total) * 100).toFixed(1)}%)`
                      : '0 (0.0%)',
                },
              ]}
              width={140}
              height={140}
              hideLegend
              margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            />

            {/* Center value overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                {total.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5 uppercase">
                Total
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionsTrendChart;
