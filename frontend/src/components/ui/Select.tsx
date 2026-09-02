import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  wrapperClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  wrapperClassName = '',
  id,
  disabled,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${wrapperClassName}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-xs font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`
            w-full pl-3 pr-8 py-2 bg-white border rounded-lg text-sm appearance-none
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            transition-all duration-200 cursor-pointer text-slate-700
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200'}
            ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}
            ${className}
          `}
          disabled={disabled}
          {...props}
        >
          {options.map((opt, i) => {
            const labelStr = typeof opt.label === 'string' ? opt.label : (opt.label as any)?.name || 'Unknown';
            return (
              <option key={i} value={opt.value}>
                {labelStr}
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
