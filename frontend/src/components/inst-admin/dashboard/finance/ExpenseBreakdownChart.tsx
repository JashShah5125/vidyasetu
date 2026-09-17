import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ExpenseBreakdownItem } from '../types';

interface ExpenseBreakdownChartProps {
  data?: ExpenseBreakdownItem[];
  loading?: boolean;
}

const formatCurrency = (v: number) => {
  const val = Math.round(v);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const CATEGORY_COLORS = [
  '#f59e0b', // Amber (Salaries/Primary)
  '#3b82f6', // Blue (Rent/Ops)
  '#8b5cf6', // Purple (Marketing)
  '#10b981', // Emerald (Supplies)
  '#06b6d4', // Cyan (Maintenance)
  '#64748b', // Slate (Other)
];

const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ data, loading }) => {
  const navigate = useNavigate();
  const items = (data ?? []).slice(0, 5);
  const total = items.reduce((a, b) => a + (b.amount || 0), 0);

  return (
    <div
      onClick={() => navigate('/expenses')}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col space-y-2 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-amber-950 transition-colors">
              Expense Category Allocation
            </h4>
            <ArrowUpRight size={13} className="text-slate-300 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
          </div>
          <p className="h-4 overflow-hidden text-xs text-slate-500 font-normal mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
            Estimated cost breakdown by department
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-slate-900">{formatCurrency(total)}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            Estimated
          </span>
        </div>
      </div>

      {/* Category breakdown table / progress list */}
      <div className="h-[160px] flex flex-col justify-between py-1">
        {loading || items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            {loading ? 'Loading expenses...' : 'No expense breakdown'}
          </div>
        ) : (
          items.map((item, idx) => {
            const pct = total > 0 ? Math.round((item.amount / total) * 100) : (item.pct || 0);
            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

            return (
              <div
                key={item.category || idx}
                className="flex items-center justify-between gap-3 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors text-xs"
              >
                {/* Category label with color indicator */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-slate-800 truncate" title={item.category}>
                    {item.category}
                  </span>
                </div>

                {/* Progress bar & percentage */}
                <div className="flex items-center gap-2 w-32 sm:w-40 shrink-0">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 w-8 text-right shrink-0">
                    {pct}%
                  </span>
                </div>

                {/* Formatted amount */}
                <div className="font-bold text-slate-900 text-right w-16 shrink-0">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
        <span>Includes payroll disbursement estimation</span>
        <span className="text-slate-500 font-semibold">{items.length} Active categories</span>
      </div>
    </div>
  );
};

export default ExpenseBreakdownChart;

