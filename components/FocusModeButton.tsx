import React from 'react';
import FocusIcon from './icons/FocusIcon';
import CloseIcon from './icons/CloseIcon';

interface FocusModeButtonProps {
  isFocusMode: boolean;
  onToggle: () => void;
}

const FocusModeButton: React.FC<FocusModeButtonProps> = ({ isFocusMode, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-400 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
      aria-label={isFocusMode ? 'Salir del modo concentración' : 'Entrar al modo concentración'}
    >
      {isFocusMode ? <CloseIcon /> : <FocusIcon />}
    </button>
  );
};

export default FocusModeButton;