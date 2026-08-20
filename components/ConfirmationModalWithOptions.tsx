import React from 'react';

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
            return 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500';
        case 'primary':
            return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white';
        case 'default':
        default:
            return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700';
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

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[95000] p-4 animate-fade-in"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 text-left z-[95001] animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          {options.map((option, index) => (
             <button
                key={index}
                type="button"
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${getButtonStyle(option.style)}`}
            >
                {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModalWithOptions;