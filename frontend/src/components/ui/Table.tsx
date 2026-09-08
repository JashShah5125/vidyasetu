import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
  colWidths?: string[];
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '', dense = false, colWidths }) => {
  const paddingClass = dense ? 'px-3 py-3' : 'px-6 py-3.5';

  const renderTable = () => (
    <div className="align-middle">
      <div className="border border-slate-200/80 rounded-xl bg-white shadow-sm overflow-hidden">
        {dense ? (
          <table className="w-full table-fixed border-collapse text-left">
            {colWidths && (
              <colgroup>
                {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
            )}
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200/80">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`${paddingClass} text-xs font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap bg-slate-50 ${
                      h.toLowerCase() === 'academic year' || h.toLowerCase() === 'action' || h.toLowerCase() === 'actions' ? 'text-center' : 'text-left'
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
        ) : (
          <table className="min-w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200/80">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`${paddingClass} text-xs font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap bg-slate-50 ${
                      h.toLowerCase() === 'academic year' || h.toLowerCase() === 'action' || h.toLowerCase() === 'actions' ? 'text-center' : 'text-left'
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
        )}
      </div>
    </div>
  );

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full align-middle">
        {renderTable()}
      </div>
    </div>
  );
};
