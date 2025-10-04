import React from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';

interface MobilePomodoroWidgetProps {
  timeLeft: number;
  isActive: boolean;
  mode: 'work' | 'break';
  onToggle: () => void;
  onOpenModal: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const MobilePomodoroWidget: React.FC<MobilePomodoroWidgetProps> = ({ timeLeft, isActive, mode, onToggle, onOpenModal }) => {
  return (
    <div className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-3" onClick={onOpenModal}>
        <div className={`w-2 h-10 rounded-full ${mode === 'work' ? 'bg-red-400' : 'bg-green-400'}`}></div>
        <div>
            <p className="font-bold text-gray-700 dark:text-gray-100">{mode === 'work' ? 'Concentración' : 'Descanso'}</p>
            <p className="text-2xl font-bold text-pink-500 dark:text-pink-400 tracking-wider">{formatTime(timeLeft)}</p>
        </div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-16 h-16 bg-pink-400 rounded-full shadow-lg text-white flex items-center justify-center text-2xl hover:bg-pink-500 transition-colors"
        aria-label={isActive ? 'Pausar Pomodoro' : 'Iniciar Pomodoro'}
      >
        <div className="w-8 h-8 flex items-center justify-center">
            {isActive ? <PauseIcon /> : <PlayIcon />}
        </div>
      </button>
    </div>
  );
};

export default MobilePomodoroWidget;