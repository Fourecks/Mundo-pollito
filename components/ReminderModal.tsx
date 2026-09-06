import React from 'react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto border-t sm:border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <h2>Reminder Modal</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ReminderModal;
