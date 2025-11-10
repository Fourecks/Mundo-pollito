import React, { useState, useEffect } from 'react';
import CloseIcon from './icons/CloseIcon';

type Durations = { work: number; break: number };

interface MobilePomodoroPanelProps {
  isOpen: boolean;
  onClose: () => void;
  durations: Durations;
  onSaveSettings: (newDurations: Durations) => void;
  showBackgroundTimer: boolean;
  onToggleBackgroundTimer: () => void;
  backgroundTimerOpacity: number;
  onSetBackgroundTimerOpacity: (opacity: number) => void;
}

const MobilePomodoroPanel: React.FC<MobilePomodoroPanelProps> = (props) => {
  const { 
    isOpen, onClose, durations, onSaveSettings, showBackgroundTimer, 
    onToggleBackgroundTimer, backgroundTimerOpacity, onSetBackgroundTimerOpacity
  } = props;
  
  const [tempDurations, setTempDurations] = useState({ work: durations.work / 60, break: durations.break / 60 });
  
  useEffect(() => {
    if (isOpen) {
      setTempDurations({ work: durations.work / 60, break: durations.break / 60 });
    }
  }, [isOpen, durations]);
  
  const handleSave = () => {
    onSaveSettings({
      work: tempDurations.work * 60,
      break: tempDurations.break * 60,
    });
    onClose();
  };

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
        <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex items-center justify-center">
            <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Ajustes del Pomodoro</h3>
            <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                <CloseIcon />
            </button>
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
                 <div className="pt-4 border-t border-secondary-light/50 dark:border-gray-600/50 space-y-3">
                  <label htmlFor="bg-timer-toggle-mobile" className="flex items-center justify-between cursor-pointer select-none">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Temporizador de fondo</span>
                      <div className="relative">
                          <input type="checkbox" id="bg-timer-toggle-mobile" className="sr-only" checked={props.showBackgroundTimer} onChange={props.onToggleBackgroundTimer} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${props.showBackgroundTimer ? 'bg-primary-light' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${props.showBackgroundTimer ? 'translate-x-full' : ''}`}></div>
                      </div>
                  </label>
                  <div className={`transition-opacity duration-300 ${!props.showBackgroundTimer ? 'opacity-50' : ''}`}>
                      <label htmlFor="bg-timer-opacity-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-200">Opacidad ({props.backgroundTimerOpacity}%)</label>
                      <input type="range" id="bg-timer-opacity-mobile" min="10" max="100" step="5" value={props.backgroundTimerOpacity} onChange={(e) => props.onSetBackgroundTimerOpacity(Number(e.target.value))} disabled={!props.showBackgroundTimer} className="w-full mt-1 h-2 bg-secondary-light/80 dark:bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary dark:[&::-webkit-slider-thumb]:bg-primary-dark" />
                  </div>
                </div>
            </div>
          </main>
          <footer className="flex-shrink-0 p-4 border-t border-secondary-light/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
              <button onClick={handleSave} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform active:scale-95 transition-all duration-200">
                  Guardar
              </button>
          </footer>
      </div>
    </>
  );
};

export default MobilePomodoroPanel;