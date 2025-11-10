import React, { useState, useEffect, useMemo } from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ResetIcon from './icons/ResetIcon';
import SettingsIcon from './icons/SettingsIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

type Mode = 'work' | 'break';
type Durations = { work: number; break: number };

interface MobilePomodoroPanelProps {
  isOpen: boolean;
  onClose: () => void;
  timeLeft: number;
  isActive: boolean;
  mode: Mode;
  durations: Durations;
  onToggle: () => void;
  onReset: () => void;
  onSwitchMode: (mode: Mode) => void;
  onSaveSettings: (newDurations: Durations) => void;
  showBackgroundTimer: boolean;
  onToggleBackgroundTimer: () => void;
  backgroundTimerOpacity: number;
  onSetBackgroundTimerOpacity: (opacity: number) => void;
}

const MobilePomodoroPanel: React.FC<MobilePomodoroPanelProps> = (props) => {
  const { 
    isOpen, onClose, timeLeft, isActive, mode, durations, onToggle, onReset, 
    onSwitchMode, onSaveSettings
  } = props;
  
  const [view, setView] = useState<'timer' | 'settings'>('timer');
  const [tempDurations, setTempDurations] = useState({ work: durations.work / 60, break: durations.break / 60 });
  
  useEffect(() => {
    if (isOpen) {
      setView('timer'); // Reset to timer view when panel opens
      setTempDurations({ work: durations.work / 60, break: durations.break / 60 });
    }
  }, [isOpen, durations]);
  
  const handleSave = () => {
    onSaveSettings({
      work: tempDurations.work * 60,
      break: tempDurations.break * 60,
    });
    setView('timer');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const progress = useMemo(() => {
    const duration = durations[mode];
    if (duration === 0 || timeLeft > duration) return 0;
    if (timeLeft <= 0) return 100;
    return ((duration - timeLeft) / duration) * 100;
  }, [timeLeft, mode, durations]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60000] animate-fade-in" 
        onClick={onClose}
      ></div>
      <div 
        className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[60001] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {view === 'timer' && (
          <>
            <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50">
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" onClick={onClose}></div>
            </header>
            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center justify-center text-center w-full h-full">
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => onSwitchMode('work')} className={`px-4 py-1 rounded-full text-sm font-semibold transition-colors ${mode === 'work' ? 'bg-primary text-white' : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-200'}`}>
                    Pomodoro
                  </button>
                  <button onClick={() => onSwitchMode('break')} className={`px-4 py-1 rounded-full text-sm font-semibold transition-colors ${mode === 'break' ? 'bg-primary text-white' : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-200'}`}>
                    Descanso
                  </button>
                </div>
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r={radius} stroke="var(--color-secondary-lighter)" strokeWidth="10" fill="transparent" className="dark:stroke-gray-700" />
                    <circle cx="100" cy="100" r={radius} stroke="var(--color-primary)" strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transform -rotate-90 origin-center transition-all duration-300"/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800 dark:text-gray-100">{formatTime(timeLeft)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full max-w-xs mt-6">
                  <button onClick={onReset} className="p-2.5 bg-white/60 dark:bg-gray-700/60 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-primary-dark dark:hover:text-primary transition-all"><ResetIcon /></button>
                  <button onClick={onToggle} className="w-16 h-16 bg-primary rounded-full shadow-lg text-white flex items-center justify-center text-2xl hover:bg-primary-dark transition-colors transform active:scale-95">{isActive ? <PauseIcon /> : <PlayIcon />}</button>
                  <button onClick={() => setView('settings')} className="p-2.5 bg-white/60 dark:bg-gray-700/60 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-primary-dark dark:hover:text-primary transition-all"><SettingsIcon /></button>
                </div>
              </div>
            </main>
          </>
        )}

        {view === 'settings' && (
          <>
            <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex items-center justify-center">
               <button onClick={() => setView('timer')} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <ChevronLeftIcon />
              </button>
              <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Ajustes</h3>
            </header>
            <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-sm mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                      <label className="font-medium text-gray-700 dark:text-gray-200">Pomodoro</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={tempDurations.work} onChange={(e) => setTempDurations(d => ({...d, work: Math.max(1, parseInt(e.target.value, 10) || 1)}))} className="w-24 bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-center"/>
                        <span className="font-medium text-gray-500 dark:text-gray-400">min</span>
                      </div>
                  </div>
                  <div className="flex items-center justify-between">
                      <label className="font-medium text-gray-700 dark:text-gray-200">Descanso</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={tempDurations.break} onChange={(e) => setTempDurations(d => ({...d, break: Math.max(1, parseInt(e.target.value, 10) || 1)}))} className="w-24 bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-center"/>
                        <span className="font-medium text-gray-500 dark:text-gray-400">min</span>
                      </div>
                  </div>
              </div>
            </main>
            <footer className="flex-shrink-0 p-4 border-t border-secondary-light/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
                <button onClick={handleSave} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform active:scale-95 transition-all duration-200">
                    Guardar
                </button>
            </footer>
          </>
        )}
      </div>
    </>
  );
};

export default MobilePomodoroPanel;