import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center text-sm font-medium text-slate-500 mb-4 overflow-x-auto whitespace-nowrap hide-scrollbar">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center">
            {item.href && !isLast ? (
              <button
                onClick={() => navigate(item.href!)}
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-slate-800 font-bold' : ''}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight size={14} className="mx-2 shrink-0 text-slate-400" />}
          </div>
        );
      })}
    </nav>
  );
};
