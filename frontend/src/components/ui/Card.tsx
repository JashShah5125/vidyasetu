import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const hasPadding = /\bp(?:[xytb]|)-\d+/.test(className) || className.includes('p-0');
  const defaultPadding = hasPadding ? '' : 'p-6';

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.02),0_1px_2px_0_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow duration-200 ${onClick ? 'cursor-pointer hover:border-slate-300' : ''} ${defaultPadding} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const hasBorder = className.includes('border-');
  const hasMargin = className.includes('mb-') || className.includes('m-');
  const hasPadding = className.includes('pb-') || className.includes('p-');
  
  const borderClass = hasBorder ? '' : 'border-b border-slate-100';
  const marginClass = hasMargin ? '' : 'mb-4';
  const paddingClass = hasPadding ? '' : 'pb-4';

  return (
    <div className={`flex items-center justify-between ${borderClass} ${paddingClass} ${marginClass} ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>
      {children}
    </h3>
  );
};
