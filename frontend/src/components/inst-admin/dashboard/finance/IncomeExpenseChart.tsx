import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FinancialOverview } from '../types';

interface IncomeExpenseChartProps {
  data?: FinancialOverview;
  loading?: boolean;
}

const formatCurrency = (v: number) => {
  const val = Math.round(v);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ data, loading }) => {
  const navigate = useNavigate();
  const net = data?.net ?? 0;
  const netPositive = net >= 0;

  const categories = ['Fee Inc', 'Other Inc', 'Salary', 'Ledger Exp'];
  const incomeValues = [data?.feeIncome ?? 0, data?.otherIncome ?? 0, 0, 0];
  const expenseValues = [0, 0, data?.salaryExpenses ?? 0, data?.otherExpenses ?? 0];

  return (
    <div
      onClick={() => navigate('/expenses')}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col space-y-2 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-emerald-950 transition-colors">
              Income vs Expenses
            </h4>
            <ArrowUpRight size={13} className="text-slate-300 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
          </div>
          <p className="h-4 overflow-hidden text-xs text-slate-500 font-normal mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
            Net cash flow comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-extrabold ${netPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {netPositive ? '+' : ''}{formatCurrency(net)}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs group-hover:scale-105 transition-transform duration-200 ${
            netPositive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {netPositive ? 'Surplus' : 'Deficit'}
          </span>
        </div>
      </div>

      <div style={{ height: 160, width: '100%' }}>
        {loading || !data ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            {loading ? 'Loading financial overview...' : 'No financial data'}
          </div>
        ) : (
          <BarChart
            xAxis={[{
              scaleType: 'band',
              data: categories,
              tickLabelStyle: { fontSize: 10, fill: '#64748b' },
            }]}
            yAxis={[{
              width: 44,
              tickLabelStyle: { fontSize: 10, fill: '#64748b' },
              valueFormatter: (v: number) => formatCurrency(v),
            }]}
            series={[
              {
                data: incomeValues,
                label: 'Income',
                color: '#10b981',
                valueFormatter: (v) => v ? formatCurrency(v) : '',
              },
              {
                data: expenseValues,
                label: 'Expenses',
                color: '#ef4444',
                valueFormatter: (v) => v ? formatCurrency(v) : '',
              },
            ]}
            sx={{
              '& .MuiBarElement-root': { rx: 3 },
              '& .MuiChartsAxis-line': { stroke: '#e2e8f0' },
              '& .MuiChartsAxis-tick': { stroke: '#e2e8f0' },
              '& .MuiChartsLegend-root text': { fontSize: '11px !important', fill: '#64748b !important' },
            }}
            margin={{ top: 20, bottom: 20, left: 48, right: 8 }}
            slotProps={{
              legend: {
                position: { vertical: 'top', horizontal: 'center' },
              } as any,
            }}
            grid={{ horizontal: true }}
          />
        )}
      </div>

      {/* Summary strip */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>Total In: <strong className="text-slate-900">{formatCurrency(data?.income ?? 0)}</strong></span>
        <span>Total Out: <strong className="text-slate-900">{formatCurrency(data?.expenses ?? 0)}</strong></span>
      </div>
    </div>
  );
};

export default IncomeExpenseChart;
