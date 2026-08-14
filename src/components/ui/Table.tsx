import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '', dense = false }) => {
  const paddingClass = dense ? 'px-3 py-3' : 'px-6 py-3.5';

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="border border-slate-200/80 rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`${paddingClass} text-xs font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap ${
                      h.toLowerCase() === 'academic year' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {children}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
