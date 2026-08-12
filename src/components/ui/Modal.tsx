import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full h-full'
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className={`relative w-full ${sizeClasses[size]} mx-auto z-50 ${size === 'full' ? 'h-[calc(100vh-32px)]' : 'my-auto'}`}>
        <div className={`relative flex flex-col w-full bg-white border border-slate-100 rounded-2xl shadow-2xl outline-none focus:outline-none transform transition-all duration-300 scale-100 ${
          size === 'full' ? 'h-full' : 'max-h-[calc(100vh-48px)]'
        }`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 rounded-t-2xl flex-shrink-0">
            <h3 className="text-lg font-semibold text-slate-900">
              {title}
            </h3>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 outline-none focus:outline-none"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
