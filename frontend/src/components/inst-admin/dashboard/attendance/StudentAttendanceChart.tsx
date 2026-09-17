import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart } from '@mui/x-charts/LineChart';
import { ArrowUpRight } from 'lucide-react';
import type { AttendanceData } from '../types';

interface StudentAttendanceChartProps {
  data?: AttendanceData;
  loading?: boolean;
}

interface TrendPoint {
  label: string;
  pct: number | null;
}

const WEEK_DAYS = [
  { short: 'Mon', aliases: ['mon', 'monday'] },
  { short: 'Tue', aliases: ['tue', 'tues', 'tuesday'] },
  { short: 'Wed', aliases: ['wed', 'wednesday'] },
  { short: 'Thu', aliases: ['thu', 'thur', 'thurs', 'thursday'] },
  { short: 'Fri', aliases: ['fri', 'friday'] },
  { short: 'Sat', aliases: ['sat', 'saturday'] },
  { short: 'Sun', aliases: ['sun', 'sunday'] },
];

const normalizeWeeklyTrend = (trend: any[]): TrendPoint[] => {
  const normalized = trend.map((item) => ({
    originalLabel: String(item?.label ?? '').trim(),
    pct:
      item?.pct === null || item?.pct === undefined
        ? null
        : Number(item.pct),
  }));

  return WEEK_DAYS.map((day) => {
    const match = normalized.find((item) => {
      const label = item.originalLabel.toLowerCase();
      return day.aliases.includes(label);
    });

    return {
      label: day.short,
      pct: match ? match.pct : null,
    };
  });
};

const StudentAttendanceChart: React.FC<StudentAttendanceChartProps> = ({
  data,
  loading,
}) => {
  const navigate = useNavigate();

  const today = data?.today ?? {
    pct: 0,
    present: 0,
    absent: 0,
    leave: 0,
  };

  const rawTrend = data?.trend ?? [];

  const isWeekly =
    rawTrend.length <= 7 &&
    rawTrend.some((item) => {
      const label = String(item?.label ?? '').toLowerCase();
      return WEEK_DAYS.some((day) => day.aliases.includes(label));
    });

  const trend = useMemo(() => {
    if (!isWeekly) {
      return rawTrend.map((item: any) => {
        const rawLabel = String(item?.label ?? '').trim();
        const dayMatch = rawLabel.match(/^(\d+)/);
        const shortLabel = rawTrend.length > 7 && dayMatch ? dayMatch[1] : rawLabel;
        return {
          label: shortLabel,
          pct:
            item?.pct === null || item?.pct === undefined
              ? null
              : Number(item.pct),
        };
      });
    }

    return normalizeWeeklyTrend(rawTrend);
  }, [rawTrend, isWeekly]);

  const xLabels = trend.map((item) => item.label);
  const yValues = trend.map((item) => item.pct);

  const hasChartData = trend.some(
    (item) => item.pct !== null && !Number.isNaN(item.pct),
  );

  const displayPct = Number.isFinite(Number(today.pct))
    ? Number(today.pct)
    : 0;

  // Step sampling for clean non-overlapping labels
  const step = Math.max(1, Math.ceil(xLabels.length / 6));

  return (
    <div
      onClick={() => navigate('/attendance')}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Hover accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header */}
      <div className="border-b border-slate-100 pb-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight group-hover:text-indigo-950 transition-colors">
              Student Attendance
            </h4>
            <ArrowUpRight
              size={12}
              className="text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0"
            />
          </div>
          <p className="h-3 overflow-hidden text-[10px] text-slate-500 font-normal opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
            Today's turnout & period trend
          </p>
        </div>

        <span className="text-base sm:text-lg font-extrabold text-slate-900">
          {displayPct.toFixed(1)}%
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-medium pt-0.5">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Present {Number(today.present ?? 0).toLocaleString('en-IN')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Absent {Number(today.absent ?? 0).toLocaleString('en-IN')}
        </span>
        {Number(today.leave ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Leave {Number(today.leave ?? 0).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="h-[120px] w-full min-w-0 mt-0.5">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Loading trend...
          </div>
        ) : !hasChartData ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No attendance data for period
          </div>
        ) : (
          <LineChart
            xAxis={[
              {
                scaleType: 'point',
                data: xLabels,
                tickLabelStyle: {
                  fontSize: 9,
                  fill: '#64748b',
                },
                tickLabelInterval: (value, index) =>
                  step === 1 || index === 0 || index === xLabels.length - 1 || index % step === 0,
              },
            ]}
            yAxis={[
              {
                min: 0,
                max: 100,
                width: 24,
                tickLabelStyle: {
                  fontSize: 9,
                  fill: '#64748b',
                },
                valueFormatter: (value: number) => `${value}%`,
              },
            ]}
            series={[
              {
                data: yValues,
                color: '#4f46e5',
                curve: 'monotoneX',
                area: true,
                showMark: xLabels.length <= 7,
                connectNulls: false,
                valueFormatter: (value) =>
                  value === null || value === undefined ? 'No data' : `${value}%`,
              },
            ]}
            height={120}
            grid={{ horizontal: true }}
            margin={{
              top: 4,
              bottom: 16,
              left: 24,
              right: 4,
            }}
            sx={{
              width: '100%',
              '& .MuiAreaElement-root': {
                fill: '#4f46e5',
                opacity: 0.12,
              },
              '& .MuiLineElement-root': {
                strokeWidth: 2,
              },
              '& .MuiChartsAxis-line': {
                stroke: '#e2e8f0',
              },
              '& .MuiChartsAxis-tick': {
                stroke: '#e2e8f0',
              },
              '& .MuiChartsGrid-line': {
                stroke: '#f1f5f9',
                strokeDasharray: '3 3',
              },
            }}
            slotProps={{ legend: { hidden: true } as any }}
          />
        )}
      </div>
    </div>
  );
};

export default StudentAttendanceChart;
