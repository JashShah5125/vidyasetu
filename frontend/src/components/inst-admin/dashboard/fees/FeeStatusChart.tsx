import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart } from '@mui/x-charts/PieChart';
import { ArrowUpRight } from 'lucide-react';
import type { FeeStatusItem } from '../types';

interface FeeStatusChartProps {
  data?: FeeStatusItem[];
  loading?: boolean;
}

const formatCurrency = (v: number) => {
  const val = Math.round(v);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const STATUS_COLORS: Record<string, string> = {
  paid: '#10b981',
  partial: '#f59e0b',
  unpaid: '#ef4444',
};

const FeeStatusChart: React.FC<FeeStatusChartProps> = ({ data, loading }) => {
  const navigate = useNavigate();

  const items = data ?? [];
  const totalCount = items.reduce((s, d) => s + d.count, 0);
  const paidItem = items.find(d => d.status === 'paid');
  const paidPct = totalCount > 0 ? Math.round(((paidItem?.count ?? 0) / totalCount) * 100) : 0;

  // We omit `label` from slice object so MUI doesn't render overlapping SVG text on the pie
  const pieData = items
    .filter(d => d.count > 0)
    .map(d => ({
      id: d.status,
      value: d.count,
      color: STATUS_COLORS[d.status] || '#94a3b8',
    }));

  return (
    <div
      onClick={() => navigate('/fees')}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col space-y-2 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-emerald-950 transition-colors">
              Fee Settlement Status
            </h4>
            <ArrowUpRight size={13} className="text-slate-300 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5 group-hover:text-slate-600 transition-colors">Paid vs partially paid vs unpaid balances</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-slate-900">{paidPct}%</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            Collected
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 pt-1" style={{ minHeight: 160 }}>
        {/* Donut Chart */}
        <div className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style={{ width: 140, height: 140 }}>
          {loading || pieData.length === 0 ? (
            <div className="text-xs text-slate-400">No data</div>
          ) : (
            <>
              <PieChart
                series={[{
                  data: pieData,
                  innerRadius: 44,
                  outerRadius: 64,
                  paddingAngle: 3,
                  cornerRadius: 3,
                }]}
                width={140}
                height={140}
                margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                slotProps={{ legend: { hidden: true } as any }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-extrabold text-slate-900">{totalCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
              </div>
            </>
          )}
        </div>

        {/* Legend List */}
        <div className="flex-1 space-y-1.5 pr-1">
          {items.map(item => (
            <div
              key={item.status}
              className="flex items-center justify-between text-xs p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }}
                />
                <span className="font-semibold text-slate-700">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900">{item.count.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-slate-400 block">{formatCurrency(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeeStatusChart;
