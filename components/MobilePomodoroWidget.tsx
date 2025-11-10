import React from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';

interface MobilePomodoroWidgetProps {
  timeLeft: number;
  isActive: boolean;
  mode: 'work' | 'break';
  onToggle: () => void;
  onOpenModal: () => void;
  onSwitchMode: (mode: 'work' | 'break') => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const MobilePomodoroWidget: React.FC<MobilePomodoroWidgetProps> = ({ timeLeft, isActive, mode, onToggle, onOpenModal, onSwitchMode }) => {
  return (
    <div className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-3" onClick={onOpenModal}>
        <div className={`w-2 h-10 rounded-full ${mode === 'work' ? 'bg-red-400' : 'bg-green-400'}`}></div>
        <div>
            <div className="flex items-center gap-2 mb-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onSwitchMode('work'); }} 
                    className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-colors ${mode === 'work' ? 'bg-primary text-white' : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-200'}`}
                >
                    Pomodoro
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onSwitchMode('break'); }} 
                    className={`px-3 py-0.5 rounded-full text-xs font-semibold transition-colors ${mode === 'break' ? 'bg-primary text-white' : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-200'}`}
                >
                    Descanso
                </button>
            </div>
            <p className="text-2xl font-bold text-pink-500 dark:text-pink-400 tracking-wider cursor-pointer">{formatTime(timeLeft)}</p>
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
