import React, { useState, useEffect, useMemo } from 'react';
import CloseIcon from './icons/CloseIcon';
import { Todo } from '../types';

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
  tasks?: Todo[];
  activeTaskId?: number | null;
  onSelectTask?: (taskId: number | null) => void;
  isFocusTimerRunning?: boolean;
}

const MobilePomodoroPanel: React.FC<MobilePomodoroPanelProps> = (props) => {
  const { 
    isOpen, onClose, durations, onSaveSettings, showBackgroundTimer, 
    onToggleBackgroundTimer, backgroundTimerOpacity, onSetBackgroundTimerOpacity,
    tasks = [], activeTaskId = null, onSelectTask, isFocusTimerRunning = false
  } = props;
  
  const [tempDurations, setTempDurations] = useState({ work: durations.work / 60, break: durations.break / 60 });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === activeTaskId);
  }, [tasks, activeTaskId]);
  
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90000] animate-fade-in" 
        onClick={onClose}
      ></div>
      <div 
        className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[90001] animate-slide-up"
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
                {/* Tarea de enfoque */}
                <div className="bg-white/50 dark:bg-gray-700/30 p-3 rounded-xl border border-secondary-light/40 dark:border-gray-700/50 relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Tarea de Enfoque Activa
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(o => !o)}
                        className="w-full text-sm bg-white dark:bg-gray-700 border border-secondary-light dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-lg py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary truncate text-left cursor-pointer font-medium flex items-center justify-between"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          {selectedTask ? (
                            <>
                              <span className={`w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 ${isFocusTimerRunning ? 'animate-pulse' : ''}`} />
                              <span className="truncate">{selectedTask.text}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">General (Sin tarea)</span>
                          )}
                        </span>
                        <span className="text-slate-400 absolute right-2.5">
                          <svg className={`w-4 h-4 transform transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>

                      {isDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-1 z-50 max-h-[180px] overflow-y-auto bg-white dark:bg-gray-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 animate-pop-in scrollbar-none">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTask?.(null);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${!activeTaskId ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                              <span>General (Sin tarea)</span>
                            </button>
                            {tasks && tasks.length > 0 ? (
                              tasks.map((task) => {
                                const isCurrent = activeTaskId === task.id;
                                const isUndated = !task.due_date;
                                return (
                                  <button
                                    type="button"
                                    key={task.id}
                                    onClick={() => {
                                      onSelectTask?.(task.id);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs truncate flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isCurrent ? 'text-primary font-bold bg-primary/5' : 'text-slate-600 dark:text-slate-300'}`}
                                  >
                                    <span className="truncate flex items-center gap-2 flex-1 min-w-0">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                      <span className="truncate">{task.text}</span>
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 flex-shrink-0">
                                      {isUndated ? 'Sin fecha' : (task.start_time || 'Hoy')}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2.5 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
                                No hay tareas pendientes
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="font-medium text-gray-700 dark:text-gray-200">Pomodoro</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" value={tempDurations.work ?? 25} onChange={(e) => setTempDurations(d => ({...d, work: Math.max(1, parseInt(e.target.value, 10) || 1)}))} className="w-24 bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-center"/>
                      <span className="font-medium text-gray-500 dark:text-gray-400">min</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <label className="font-medium text-gray-700 dark:text-gray-200">Descanso</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" value={tempDurations.break ?? 5} onChange={(e) => setTempDurations(d => ({...d, break: Math.max(1, parseInt(e.target.value, 10) || 1)}))} className="w-24 bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-center"/>
                      <span className="font-medium text-gray-500 dark:text-gray-400">min</span>
                    </div>
                </div>
                  <div className="pt-4 border-t border-secondary-light/50 dark:border-gray-600/50 space-y-3">
                  <label htmlFor="bg-timer-toggle-mobile" className="flex items-center justify-between cursor-pointer select-none">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Temporizador de fondo</span>
                      <div className="relative">
                          <input type="checkbox" id="bg-timer-toggle-mobile" className="sr-only" checked={!!props.showBackgroundTimer} onChange={props.onToggleBackgroundTimer} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${props.showBackgroundTimer ? 'bg-primary-light' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${props.showBackgroundTimer ? 'translate-x-full' : ''}`}></div>
                      </div>
                  </label>
                  <div className={`transition-opacity duration-300 ${!props.showBackgroundTimer ? 'opacity-50' : ''}`}>
                      <label htmlFor="bg-timer-opacity-mobile" className="text-sm font-medium text-gray-700 dark:text-gray-200">Opacidad ({props.backgroundTimerOpacity ?? 20}%)</label>
                      <input type="range" id="bg-timer-opacity-mobile" min="10" max="100" step="5" value={props.backgroundTimerOpacity ?? 20} onChange={(e) => props.onSetBackgroundTimerOpacity(Number(e.target.value))} disabled={!props.showBackgroundTimer} className="w-full mt-1 h-2 bg-secondary-light/80 dark:bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary dark:[&::-webkit-slider-thumb]:bg-primary-dark" />
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