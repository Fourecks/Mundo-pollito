


import React, { useState, useEffect, useMemo } from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ResetIcon from './icons/ResetIcon';
import SettingsIcon from './icons/SettingsIcon';

type Mode = 'work' | 'break';

type Durations = {
  work: number;
  break: number;
};

interface PomodoroProps {
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

const Pomodoro: React.FC<PomodoroProps> = ({
  timeLeft,
  isActive,
  mode,
  durations,
  onToggle,
  onReset,
  onSwitchMode,
  onSaveSettings,
  showBackgroundTimer,
  onToggleBackgroundTimer,
  backgroundTimerOpacity,
  onSetBackgroundTimerOpacity,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempDurations, setTempDurations] = useState({ work: durations.work / 60, break: durations.break / 60 });
  
  useEffect(() => {
    setTempDurations({ work: durations.work / 60, break: durations.break / 60 });
  }, [durations]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleSettingsSave = () => {
    const newDurations: Durations = {
        work: tempDurations.work * 60,
        break: tempDurations.break * 60,
    };
    onSaveSettings(newDurations);
    setShowSettings(false);
  }

  const progress = useMemo(() => {
    const duration = durations[mode];
    if (duration === 0 || timeLeft > duration) return 0;
    if (timeLeft <= 0) return 100;
    return ((duration - timeLeft) / duration) * 100;
  }, [timeLeft, mode, durations]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 w-full h-full relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <button onClick={() => setShowSettings(s => !s)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200">
          <SettingsIcon />
        </button>
      </div>

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
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="var(--color-primary)"
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transform -rotate-90 origin-center transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-gray-800 dark:text-gray-100">{formatTime(timeLeft)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-6">
        <button onClick={onReset} className="p-2 bg-white/60 dark:bg-gray-700/60 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-primary-dark dark:hover:text-primary transition-colors">
          <ResetIcon />
        </button>
        <button onClick={onToggle} className="w-16 h-16 bg-primary rounded-full shadow-lg text-white flex items-center justify-center text-2xl hover:bg-primary-dark transition-colors">
          {isActive ? <PauseIcon /> : <PlayIcon />}
        </button>
        {/* Placeholder for alignment */}
        <div className="p-2 w-10 h-10"></div>
      </div>

      {showSettings && (
        <div className="absolute inset-0 bg-white/80 dark:bg-black/30 backdrop-blur-sm z-10 flex items-center justify-center p-4 animate-pop-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl w-full max-w-xs">
                <h3 className="font-bold text-lg text-primary-dark dark:text-primary mb-4 text-center">Ajustes</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Pomodoro (min)</label>
                        <input type="number" min="0" value={tempDurations.work} onChange={(e) => setTempDurations(d => ({...d, work: Math.max(0, parseInt(e.target.value, 10) || 0)}))} className="w-full mt-1 bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Descanso (min)</label>
                        <input type="number" min="0" value={tempDurations.break} onChange={(e) => setTempDurations(d => ({...d, break: Math.max(0, parseInt(e.target.value, 10) || 0)}))} className="w-full mt-1 bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"/>
                    </div>
                </div>
                 <div className="mt-4 pt-3 border-t border-secondary-lighter/50 dark:border-gray-600/50 space-y-3">
                    <label htmlFor="bg-timer-toggle" className="flex items-center justify-between cursor-pointer select-none">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Temporizador de fondo</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="bg-timer-toggle"
                                className="sr-only"
                                checked={showBackgroundTimer}
                                onChange={onToggleBackgroundTimer}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${showBackgroundTimer ? 'bg-primary-light' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showBackgroundTimer ? 'translate-x-full' : ''}`}></div>
                        </div>
                    </label>
                    <div className={`transition-opacity duration-300 ${!showBackgroundTimer ? 'opacity-50' : ''}`}>
                        <label htmlFor="bg-timer-opacity" className="text-sm font-medium text-gray-700 dark:text-gray-200">Opacidad ({backgroundTimerOpacity}%)</label>
                        <input
                            type="range"
                            id="bg-timer-opacity"
                            min="10"
                            max="100"
                            step="5"
                            value={backgroundTimerOpacity}
                            onChange={(e) => onSetBackgroundTimerOpacity(Number(e.target.value))}
                            disabled={!showBackgroundTimer}
                            className="w-full mt-1 h-2 bg-secondary-light/80 dark:bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary dark:[&::-webkit-slider-thumb]:bg-primary-dark"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setShowSettings(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSettingsSave} className="bg-primary text-white font-bold rounded-full px-4 py-2 shadow-md hover:bg-primary-dark transition-colors">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Pomodoro;