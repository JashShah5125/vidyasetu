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
  minWidth?: string;
}

export const Table: React.FC<TableProps> = ({ 
  headers, 
  children, 
  className = '', 
  dense = false, 
  colWidths, 
  headerClassName, 
  borderless = false,
  minWidth
}) => {
  const paddingClass = dense ? 'px-3.5 py-3' : 'px-4 py-3.5';

  const renderHeaderCell = (h: TableHeaderItem, i: number) => {
    const isObj = typeof h === 'object' && h !== null && 'label' in h;
    const label = isObj ? h.label : h;
    const align = isObj && h.align ? h.align : 'left';
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    const customClass = isObj ? (h.className || '') : '';
    const style = isObj && h.minWidth ? { minWidth: h.minWidth } : undefined;
    const defaultHeaderFont = headerClassName || 'text-xs font-bold text-slate-600 uppercase tracking-wider';

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

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div 
        style={minWidth ? { minWidth } : undefined}
        className={borderless ? "w-full" : "w-full border border-slate-200/80 rounded-xl bg-white shadow-sm overflow-hidden"}
      >
        <table 
          style={minWidth ? { minWidth } : undefined}
          className={`w-full ${colWidths ? 'table-fixed' : 'table-auto'} border-collapse tabular-nums font-sans text-sm break-words [word-break:break-word]`}
        >
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
          <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-700 break-words [&_td]:break-words [&_td]:overflow-hidden">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};
