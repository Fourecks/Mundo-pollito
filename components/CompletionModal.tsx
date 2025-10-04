import React from 'react';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: string;
}

const CompletionModal: React.FC<CompletionModalProps> = ({ isOpen, onClose, quote }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[50000] p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-secondary-lighter to-primary-light/30 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl p-8 pt-10 text-center relative max-w-sm mx-auto transform transition-all duration-300 scale-95 opacity-0 animate-pop-in border-4 border-white dark:border-gray-700"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <h2 className="text-3xl md:text-4xl font-bold text-primary-dark dark:text-primary drop-shadow-sm">
          ¡Felicidades Pollito! 🎉
        </h2>
        <p className="text-gray-600 dark:text-gray-100 mt-3 text-lg">
          ¡Has completado todas tus tareas!
        </p>
        <p className="text-gray-500 dark:text-gray-300 mt-4 text-md italic">
            "{quote}"
        </p>
        <button
          onClick={onClose}
          className="mt-6 bg-primary text-white font-bold rounded-full px-8 py-3 shadow-md hover:bg-primary-dark transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          ¡Seguir así!
        </button>
      </div>
    </div>
  );
};

export default CompletionModal;