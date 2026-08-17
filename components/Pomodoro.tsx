import React, { useState, useEffect, useMemo } from 'react';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import ResetIcon from './icons/ResetIcon';
import SettingsIcon from './icons/SettingsIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CheckIcon from './icons/CheckIcon';
import { Todo } from '../types';

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
  tasks?: Todo[];
  activeTaskId?: number | null;
  onSelectTask?: (taskId: number | null) => void;
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
  tasks = [],
  activeTaskId = null,
  onSelectTask,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempDurations, setTempDurations] = useState({ work: durations.work / 60, break: durations.break / 60 });
  
  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === activeTaskId);
  }, [tasks, activeTaskId]);

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
  };

  const progress = useMemo(() => {
    const duration = durations[mode];
    if (!duration || duration === 0 || timeLeft > duration) return 0;
    if (timeLeft <= 0) return 100;
    return Math.min(100, Math.max(0, ((duration - timeLeft) / duration) * 100));
  }, [timeLeft, mode, durations]);

  return (
    <div className="flex flex-col justify-between w-full h-full p-2.5 sm:p-3 select-none relative bg-white/40 dark:bg-slate-900/30">
      
      {/* TOP HEADER: MODE TOGGLE & SETTINGS BUTTON */}
      <div className="flex items-center justify-between w-full mb-0.5">
        {showSettings ? (
          <div className="flex items-center gap-1.5 px-0.5">
            <SettingsIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Configuración de Duración</span>
          </div>
        ) : (
          /* Mode Switcher */
          <div className="inline-flex p-0.5 bg-slate-200/60 dark:bg-slate-800/70 rounded-full border border-slate-300/40 dark:border-slate-700/50">
            <button 
              onClick={() => onSwitchMode('work')} 
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                mode === 'work' 
                  ? 'bg-primary text-white shadow-sm ring-1 ring-primary/30' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pomodoro
            </button>
            <button 
              onClick={() => onSwitchMode('break')} 
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                mode === 'break' 
                  ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400/30' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Descanso
            </button>
          </div>
        )}

        {/* Dedicated Settings Button */}
        <button 
          onClick={() => setShowSettings(s => !s)} 
          className={`p-1 rounded-lg transition-colors z-20 ${
            showSettings 
              ? 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={showSettings ? "Volver al temporizador" : "Configuración del Pomodoro"}
          aria-label="Ajustes del Pomodoro"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>

      {showSettings ? (
        /* INLINE SETTINGS VIEW - Fits securely within window boundaries */
        <div className="flex-1 flex flex-col justify-between py-0.5 gap-1.5 animate-fade-in">
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                <label className="block text-[8.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                  Trabajo (min)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  value={tempDurations.work ?? 25} 
                  onChange={(e) => setTempDurations(d => ({...d, work: Math.max(1, parseInt(e.target.value, 10) || 1)}))} 
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded py-0.5 px-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                <label className="block text-[8.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                  Descanso (min)
                </label>
                <input 
                  type="number" 
                  min="1" 
                  value={tempDurations.break ?? 5} 
                  onChange={(e) => setTempDurations(d => ({...d, break: Math.max(1, parseInt(e.target.value, 10) || 1)}))} 
                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded py-0.5 px-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Background Timer Option */}
            <div className="bg-white/80 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!showBackgroundTimer}
                  onChange={onToggleBackgroundTimer}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5 flex-shrink-0"
                />
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight">
                  Reloj de fondo
                </span>
              </label>

              {showBackgroundTimer && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 font-medium">{backgroundTimerOpacity ?? 20}%</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={backgroundTimerOpacity ?? 20}
                    onChange={(e) => onSetBackgroundTimerOpacity(Number(e.target.value))}
                    className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end items-center gap-1.5 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
            <button 
              onClick={() => setShowSettings(false)} 
              className="px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSettingsSave} 
              className="px-3.5 py-0.5 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-lg shadow-sm transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        /* MAIN HORIZONTAL BODY: TIMER & FOCUS TASK */
        <div className="flex-1 flex items-center justify-between gap-3 w-full py-1">
          
          {/* LEFT: TIMER & CONTROLS */}
          <div className="flex items-center gap-3 w-1/2">
            <div className="flex flex-col">
              <span className="text-3xl font-mono font-black tracking-tight text-slate-800 dark:text-slate-100 leading-none">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                {isActive ? (mode === 'work' ? 'Enfoque activo' : 'Descanso activo') : 'En pausa'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button 
                onClick={onReset} 
                className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center border border-slate-200/70 dark:border-slate-700/70 shadow-sm transition-all active:scale-95" 
                title="Reiniciar"
                aria-label="Reiniciar temporizador"
              >
                <ResetIcon className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={onToggle} 
                className={`w-9 h-9 rounded-full text-white flex items-center justify-center shadow-md transition-all transform active:scale-95 ${
                  mode === 'work' ? 'bg-primary hover:bg-primary-dark' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
                title={isActive ? "Pausar" : "Iniciar"}
                aria-label={isActive ? "Pausar" : "Iniciar"}
              >
                {isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* VERTICAL DIVIDER */}
          <div className="w-px h-12 bg-slate-200/60 dark:bg-slate-800/60 flex-shrink-0" />

          {/* RIGHT: FOCUS TASK SELECTOR */}
          <div className="w-1/2 relative flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tarea de Enfoque
              </label>
              {selectedTask && (
                <span className="text-[9px] font-semibold text-primary">
                  {selectedTask.due_date ? 'Hoy' : 'Sin fecha'}
                </span>
              )}
            </div>

            {/* Custom dropdown selector */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(o => !o)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-primary truncate text-left cursor-pointer font-medium flex items-center justify-between shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                <span className="truncate flex items-center gap-1.5 pr-2">
                  {selectedTask ? (
                    <>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive && mode === 'work' ? 'bg-red-500 animate-pulse' : 'bg-sky-500'
                      }`} />
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{selectedTask.text}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Sin tarea (Enfoque libre)</span>
                  )}
                </span>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transform transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover list */}
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 py-1 animate-pop-in custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTask?.(null);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        !activeTaskId ? 'text-primary bg-primary/5 dark:bg-primary/10' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>Sin tarea (Enfoque libre)</span>
                      </span>
                      {!activeTaskId && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
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
                            className={`w-full text-left px-2.5 py-1.5 text-xs truncate flex items-center justify-between gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              isCurrent ? 'text-primary font-bold bg-primary/5 dark:bg-primary/10' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5 flex-1 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                              }`} />
                              <span className="truncate">{task.text}</span>
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 flex-shrink-0">
                              {isUndated ? 'Sin fecha' : (task.start_time || 'Hoy')}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
                        No hay tareas pendientes
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM: SLEEK HORIZONTAL PROGRESS LINE (Only visible in timer view) */}
      {!showSettings && (
        <div className="w-full pt-1">
          <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/40">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                mode === 'work' ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-medium px-0.5 pt-1">
            <span>{Math.round(progress)}% transcurrido</span>
            <span>{formatTime(timeLeft)} restantes</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default Pomodoro;
