import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart } from '@mui/x-charts/LineChart';
import { ArrowUpRight } from 'lucide-react';
import type { FeeCollectionTrendPoint } from '../types';

interface FeeCollectionTrendChartProps {
  data?: FeeCollectionTrendPoint[];
  loading?: boolean;
}

const formatCurrency = (v: number) => {
  const val = Math.round(v);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const FeeCollectionTrendChart: React.FC<FeeCollectionTrendChartProps> = ({ data, loading }) => {
  const navigate = useNavigate();

  const points = data ?? [];
  const xLabels = points.map(d => d.label);
  const yValues = points.map(d => d.amount);
  const totalCollected = yValues.reduce((a, b) => a + b, 0);

  return (
    <div
      onClick={() => navigate('/fees')}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col space-y-2 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-sky-950 transition-colors">
              Fee Collection Trend
            </h4>
            <ArrowUpRight size={13} className="text-slate-300 group-hover:text-sky-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5 group-hover:text-slate-600 transition-colors">Timeline fee collection cash inflows</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-slate-900">{formatCurrency(totalCollected)}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            Total
          </span>
        </div>
      </div>

      <div style={{ height: 160, width: '100%' }}>
        {loading || points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            {loading ? 'Loading collections...' : 'No fee collection in period'}
          </div>
        ) : (
          <LineChart
            xAxis={[{ scaleType: 'point', data: xLabels, tickLabelStyle: { fontSize: 10, fill: '#64748b' } }]}
            yAxis={[{
              tickLabelStyle: { fontSize: 10, fill: '#64748b' },
              valueFormatter: (v: number) => formatCurrency(v),
            }]}
            series={[{
              data: yValues,
              color: '#0284c7',
              curve: 'monotoneX',
              area: true,
              showMark: false,
              valueFormatter: (v) => formatCurrency(v ?? 0),
            }]}
            sx={{
              '& .MuiAreaElement-root': { fill: '#0284c7', opacity: 0.1 },
              '& .MuiLineElement-root': { strokeWidth: 2 },
              '& .MuiChartsAxis-line': { stroke: '#e2e8f0' },
              '& .MuiChartsAxis-tick': { stroke: '#e2e8f0' },
            }}
            margin={{ top: 8, bottom: 20, left: 48, right: 8 }}
            grid={{ horizontal: true }}
            slotProps={{ legend: { hidden: true } as any }}
          />
        )}
      </div>
    </div>
  );
};

export default FeeCollectionTrendChart;
