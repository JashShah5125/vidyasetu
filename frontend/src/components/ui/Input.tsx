import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  wrapperClassName = '',
  id,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${wrapperClassName}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-xs font-semibold text-slate-700 flex items-center"
        >
          {label}
          {props.required && <span className="text-red-500 font-bold ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        className={`w-full border ${props.disabled ? 'bg-slate-50 text-slate-400 cursor-default border-slate-200' : 'bg-white text-slate-800 border-slate-200 focus:border-blue-500 focus:ring-blue-100'} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''} rounded-lg px-3 py-2 text-sm placeholder-slate-400 outline-none transition duration-150 focus:ring-4 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
