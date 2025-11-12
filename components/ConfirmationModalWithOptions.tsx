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
            return 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500';
        case 'primary':
            return 'bg-primary text-white hover:bg-primary-dark focus:ring-primary';
        case 'default':
        default:
            return 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-gray-400';
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
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[70000] p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-secondary-lighter to-primary-light/30 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl p-8 text-center relative max-w-sm mx-auto transform transition-all duration-300 scale-95 opacity-0 animate-pop-in border-4 border-white dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary drop-shadow-sm">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-100 mt-4 text-md">
          {message}
        </p>
        <div className="flex flex-col gap-3 mt-6">
          {options.map((option, index) => (
             <button
                key={index}
                onClick={option.onClick}
                className={`w-full font-bold rounded-full px-6 py-3 shadow-md transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonStyle(option.style)}`}
            >
                {option.label}
            </button>
          ))}
          <button
            onClick={onClose}
            className="w-full text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModalWithOptions;