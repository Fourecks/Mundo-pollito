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

const getButtonStyle = (style: ModalOption['style']) => {
    switch (style) {
        case 'danger':
            return 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200';
        case 'primary':
            return 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200';
        case 'default':
        default:
            return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700';
    }
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
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100010] overflow-y-auto animate-fade-in"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-left z-[100000] animate-pop-in max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed font-normal">
          {message}
        </p>

        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          {options.map((option, index) => (
             <button
                key={index}
                type="button"
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${getButtonStyle(option.style)}`}
            >
                {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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