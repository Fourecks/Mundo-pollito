import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
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
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-100 font-bold rounded-full px-6 py-2 shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 text-white font-bold rounded-full px-6 py-2 shadow-md hover:bg-red-600 transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;