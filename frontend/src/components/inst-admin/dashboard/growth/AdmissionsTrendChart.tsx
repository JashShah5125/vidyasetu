import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart } from '@mui/x-charts/PieChart';
import { ArrowUpRight } from 'lucide-react';
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
  const hasAdmissions = monthlyData.some((item) => item.count > 0);

  const activeMonths = useMemo(
    () => monthlyData.filter((m) => m.count > 0),
    [monthlyData],
  );

  const maxMonth = useMemo(() => {
    if (activeMonths.length === 0) return null;
    return activeMonths.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), activeMonths[0]);
  }, [activeMonths]);

  const minMonth = useMemo(() => {
    if (activeMonths.length === 0) return null;
    return activeMonths.reduce((prev, curr) => (curr.count < prev.count ? curr : prev), activeMonths[0]);
  }, [activeMonths]);

  const pieData = monthlyData.map((item, index) => ({
    id: index,
    value: item.count,
    label: item.label,
    color: MONTH_COLORS[index],
  }));

  return (
    <div
      onClick={() => navigate('/leads-admissions')}
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

      {/* Content: Chart on Left, Max/Least Stats on Right */}
      <div className="h-[120px] w-full min-w-0 flex items-center justify-between gap-1.5 mt-0.5">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
            Loading admissions...
          </div>
        ) : !hasAdmissions ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
            No admissions data for period
          </div>
        ) : (
          <>
            {/* Donut Chart on Left */}
            <div className="relative w-[120px] h-[120px] flex items-center justify-center shrink-0">
              <PieChart
                series={[
                  {
                    data: pieData,
                    innerRadius: 32,
                    outerRadius: 48,
                    paddingAngle: 2,
                    cornerRadius: 3,
                    highlightScope: {
                      faded: 'global',
                      highlighted: 'item',
                    },
                    faded: {
                      innerRadius: 30,
                      additionalRadius: -2,
                      color: '#cbd5e1',
                    },
                    valueFormatter: (item) =>
                      `${item.value.toLocaleString('en-IN')} (${total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)`,
                  },
                ]}
                width={120}
                height={120}
                hideLegend
                margin={{ top: 2, bottom: 2, left: 2, right: 2 }}
                sx={{ width: '100%', height: '100%' }}
              />

              {/* Center value overlay */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-extrabold text-slate-900 leading-none">
                  {total.toLocaleString('en-IN')}
                </span>
                <span className="text-[8px] text-slate-400 font-semibold tracking-tight mt-0.5 uppercase">
                  Total
                </span>
              </div>
            </div>

            {/* Max & Least Stats on Right */}
            <div className="flex-1 flex flex-col justify-center gap-1.5 pl-1.5 pr-0.5">
              {/* Max Month */}
              {maxMonth && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100 shadow-2xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block leading-tight">
                        Max Month
                      </span>
                      <span className="text-xs font-extrabold text-emerald-950">
                        {maxMonth.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-950 block leading-tight">
                      {maxMonth.count}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-medium">
                      {total > 0 ? ((maxMonth.count / total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Least Month */}
              {minMonth && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100 shadow-2xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block leading-tight">
                        Least Month
                      </span>
                      <span className="text-xs font-extrabold text-amber-950">
                        {minMonth.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-amber-950 block leading-tight">
                      {minMonth.count}
                    </span>
                    <span className="text-[9px] text-amber-700 font-medium">
                      {total > 0 ? ((minMonth.count / total) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdmissionsTrendChart;
