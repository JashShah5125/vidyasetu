import React from 'react';

export type TableHeaderItem = string | {
  label: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  minWidth?: string;
  className?: string;
};

interface TableProps {
  headers: TableHeaderItem[];
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
  colWidths?: string[];
  headerClassName?: string;
  borderless?: boolean;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '', dense = false, colWidths, headerClassName, borderless = false }) => {
  const paddingClass = dense ? 'px-2 py-2' : 'px-3 py-2.5';

  const renderHeaderCell = (h: TableHeaderItem, i: number) => {
    const isObj = typeof h === 'object' && h !== null && 'label' in h;
    const label = isObj ? h.label : h;
    let align = isObj && h.align ? h.align : 'left';
    if (!isObj && typeof h === 'string') {
      const lower = h.toLowerCase().trim();
      if (lower === 'action' || lower === 'actions' || lower === 'status' || lower === 'flag' || lower === 'mode' || lower === 'date' || lower === 'compliance' || lower === 'academic year') {
        align = 'center';
      }
    }
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    const customClass = isObj ? (h.className || '') : '';
    const style = isObj && h.minWidth ? { minWidth: h.minWidth } : undefined;
    const defaultHeaderFont = headerClassName || 'text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider';

    return (
      <th
        key={i}
        style={style}
        className={`${paddingClass} ${defaultHeaderFont} select-none bg-slate-50 ${alignClass} ${customClass} whitespace-nowrap`}
      >
        {label}
      </th>
    );
  };

  const renderTable = () => (
    <div className="align-middle">
      <div className={borderless ? "" : "border border-slate-200/80 rounded-xl bg-white shadow-sm overflow-hidden"}>
        {dense ? (
          <table className={`w-full ${colWidths ? 'table-fixed' : 'table-auto'} border-collapse`}>
            {colWidths && (
              <colgroup>
                {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
            )}
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200/80">
                {headers.map((h, i) => renderHeaderCell(h, i))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {children}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200/80">
                {headers.map((h, i) => renderHeaderCell(h, i))}
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
      <div className="w-full align-middle">
        {renderTable()}
      </div>
    </div>
  );
};
