import React from 'react';
import { createPortal } from 'react-dom';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-200" onClick={onClose}>
      <div className="relative bg-white dark:bg-[#0a0a0a] p-6 rounded-3xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
        <h2>Reminder Modal</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default ReminderModal;
