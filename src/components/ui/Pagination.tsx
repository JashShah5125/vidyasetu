import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}) => {
  const [gotoInput, setGotoInput] = React.useState('');

  React.useEffect(() => {
    if (gotoInput) {
      const num = Number(gotoInput);
      if (!isNaN(num) && (num > totalPages || num < 1)) {
        setGotoInput(totalPages > 0 ? '1' : '');
      }
    }
  }, [totalPages, gotoInput]);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Build page number array with ellipsis
  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const btnBase =
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded-lg text-sm font-medium transition-all duration-150 select-none';
  const btnActive = 'bg-blue-600 text-white shadow-sm';
  const btnIdle = 'text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white rounded-b-xl">
      {/* Left: item range + rows per page */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          {totalItems === 0 ? 'No items' : `${startItem}–${endItem} of ${totalItems}`}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              className="border border-slate-200 rounded-md px-2 py-0.5 text-sm text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer"
            >
              {pageSizeOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: page controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${btnBase} ${btnIdle}`}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          type="button"
          className={`${btnBase} ${btnIdle}`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm select-none">…</span>
          ) : (
            <button
              type="button"
              key={p}
              className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className={`${btnBase} ${btnIdle}`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          title="Next page"
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          className={`${btnBase} ${btnIdle}`}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          title="Last page"
        >
          <ChevronsRight size={15} />
        </button>

        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-100 pl-3">
          <span className="text-xs text-slate-400">Go to:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={gotoInput}
            onChange={e => {
              const val = e.target.value;
              if (val === '') {
                setGotoInput('');
                return;
              }
              const num = Number(val);
              if (!isNaN(num) && num <= totalPages && num >= 1) {
                setGotoInput(val);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const page = Number(gotoInput);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                  setGotoInput('');
                }
              }
            }}
            className="w-24 border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-center"
          />
          <button
            type="button"
            onClick={() => {
              const page = Number(gotoInput);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
                setGotoInput('');
              }
            }}
            disabled={!gotoInput}
            className="px-2 py-0.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
};
