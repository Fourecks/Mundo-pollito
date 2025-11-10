import React from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ResetIcon from './icons/ResetIcon';

interface MobilePomodoroWidgetProps {
  timeLeft: number;
  isActive: boolean;
  mode: 'work' | 'break';
  onToggle: () => void;
  onOpenModal: () => void;
  onSwitchMode: (mode: 'work' | 'break') => void;
  onReset: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const MobilePomodoroWidget: React.FC<MobilePomodoroWidgetProps> = ({ timeLeft, isActive, mode, onToggle, onOpenModal, onSwitchMode, onReset }) => {
  return (
    <div className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center justify-between relative cursor-pointer" onClick={onOpenModal}>
      <div className="flex items-center gap-3">
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
            <p className="text-2xl font-bold text-pink-500 dark:text-pink-400 tracking-wider">{formatTime(timeLeft)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onReset(); }}
          className="w-12 h-12 bg-white/60 dark:bg-gray-700/60 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-primary-dark dark:hover:text-primary transition-all transform active:scale-90 flex items-center justify-center"
          aria-label="Resetear Pomodoro"
        >
          <ResetIcon />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-16 h-16 bg-primary rounded-full shadow-lg text-white flex items-center justify-center text-2xl hover:bg-primary-dark transition-colors transform active:scale-95"
          aria-label={isActive ? 'Pausar Pomodoro' : 'Iniciar Pomodoro'}
        >
          <div className="w-8 h-8 flex items-center justify-center">
              {isActive ? <PauseIcon /> : <PlayIcon />}
          </div>
        </button>
      </div>
    </div>
  );
};

export default MobilePomodoroWidget;