
import React, { useEffect, useState } from 'react';

interface MotivationalToastProps {
  message: string | null;
  onClear: () => void;
}

const MotivationalToast: React.FC<MotivationalToastProps> = ({ message, onClear }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade-out animation before clearing the message
        setTimeout(onClear, 300);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out
        ${visible && message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {message && (
        <div className="bg-gradient-to-r from-primary to-secondary-dark text-white font-bold rounded-full px-6 py-3 shadow-2xl">
          {message}
        </div>
      )}
    </div>
  );
};

export default MotivationalToast;