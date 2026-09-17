import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart } from '@mui/x-charts/BarChart';
import { ArrowUpRight } from 'lucide-react';
import type { BranchPerformanceItem } from '../types';

interface BranchPerformanceChartProps {
  data?: BranchPerformanceItem[];
  loading?: boolean;
}

type Metric = 'students' | 'admissions' | 'attendancePct';

const METRIC_OPTIONS: { label: string; value: Metric }[] = [
  { label: 'Students', value: 'students' },
  { label: 'Admissions', value: 'admissions' },
  { label: 'Attendance %', value: 'attendancePct' },
];

const BranchPerformanceChart: React.FC<BranchPerformanceChartProps> = ({ data, loading }) => {
  const navigate = useNavigate();
  const [metric, setMetric] = useState<Metric>('students');

  const sorted = [...(data ?? [])].sort((a, b) => b[metric] - a[metric]).slice(0, 6);
  const branchNames = sorted.map(b => b.branchName);
  const values = sorted.map(b => b[metric]);
  const isPct = metric === 'attendancePct';

  return (
    <div className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col space-y-2 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 overflow-hidden select-none">
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div onClick={() => navigate('/branches')} className="cursor-pointer">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-950 transition-colors">
              Branch Performance
            </h4>
            <ArrowUpRight size={13} className="text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5 group-hover:text-slate-600 transition-colors">Cross-branch student capacity & attendance rate</p>
        </div>

        {/* Metric selector pills */}
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
          {METRIC_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMetric(opt.value);
              }}
              className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer active:scale-95 ${
                metric === opt.value
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 160, width: '100%' }} onClick={() => navigate('/branches')} className="cursor-pointer">
        {loading || sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            {loading ? 'Loading performance...' : 'No branch data available'}
          </div>
        ) : (
          <BarChart
            layout="horizontal"
            yAxis={[{
              scaleType: 'band',
              data: branchNames,
              tickLabelStyle: { fontSize: 11, fill: '#334155', fontWeight: 500 },
            }]}
            xAxis={[{
              tickLabelStyle: { fontSize: 10, fill: '#64748b' },
              valueFormatter: isPct ? (v: number) => `${v}%` : undefined,
            }]}
            series={[{
              data: values,
              color: '#6366f1',
              valueFormatter: (v) => isPct ? `${v}%` : `${v}`,
            }]}
            sx={{
              '& .MuiBarElement-root': { rx: 4 },
              '& .MuiChartsAxis-line': { stroke: '#e2e8f0' },
              '& .MuiChartsAxis-tick': { stroke: '#e2e8f0' },
            }}
            margin={{ top: 5, bottom: 20, left: 115, right: 16 }}
            slotProps={{ legend: { hidden: true } as any }}
            grid={{ vertical: true }}
          />
        )}
      </div>
    </div>
  );
};

export default BranchPerformanceChart;
