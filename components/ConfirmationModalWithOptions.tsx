import React from 'react';
import { createPortal } from 'react-dom';

interface ModalOption {
    label: string;
    onClick: () => void;
    style?: 'default' | 'primary' | 'danger';
}

interface ConfirmationModalWithOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  options: ModalOption[];
}

const ConfirmationModalWithOptions: React.FC<ConfirmationModalWithOptionsProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  options 
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100010] transition-opacity duration-200"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-[#111113] border-t sm:border border-zinc-200/90 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 text-left z-[100000] animate-in fade-in slide-in-from-bottom-3 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-2 mb-4 sm:hidden" />

        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-2 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          {options.map((option, index) => {
            const isPrimary = option.style === 'primary' || option.style === 'danger';
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className={`w-full py-2.5 px-4 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isPrimary
                    ? 'bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800'
                }`}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default ConfirmationModalWithOptions;