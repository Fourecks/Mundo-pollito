import React from 'react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white p-4 rounded-lg" onClick={e => e.stopPropagation()}>
        <h2>Reminder Modal</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ReminderModal;
