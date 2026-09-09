import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, LayoutGrid, Calendar, CheckSquare, Wallet, GraduationCap, FileText, Settings, UserCircle, PieChart, Focus, X, Pin } from 'lucide-react';
import { Todo, GoogleCalendarEvent as CalendarEvent } from '../types';

interface MobileDashboardProps {
  userName: string;
  setActiveTab: (tab: string) => void;
  tasks: Todo[];
  calendarEvents: CalendarEvent[];
}

const ALL_MODULES = [
  { id: 'tasks', category: 'PRODUCTIVIDAD', label: 'Tareas', icon: CheckSquare, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'projects', category: 'PRODUCTIVIDAD', label: 'Proyectos', icon: LayoutGrid, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'calendar', category: 'PRODUCTIVIDAD', label: 'Calendario', icon: Calendar, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'habits', category: 'PRODUCTIVIDAD', label: 'Hábitos', icon: Focus, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'notes', category: 'CONOCIMIENTO', label: 'Notas', icon: FileText, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'finance', category: 'PERSONAL', label: 'Finanzas', icon: Wallet, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'student', category: 'PERSONAL', label: 'Estudio', icon: GraduationCap, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
];

const DEFAULT_PINNED = ['tasks', 'projects', 'calendar', 'notes'];

const MobileDashboard: React.FC<MobileDashboardProps> = ({ userName, setActiveTab, tasks, calendarEvents }) => {
  const [voiceInput, setVoiceInput] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED);
  const [showAllModules, setShowAllModules] = useState(false);
  
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const pinnedModules = ALL_MODULES.filter(m => pinnedIds.includes(m.id));

  const togglePin = (id: string) => {
    if (pinnedIds.includes(id)) {
      setPinnedIds(pinnedIds.filter(pid => pid !== id));
    } else {
      setPinnedIds([...pinnedIds, id]);
    }
  };

  const categories = Array.from(new Set(ALL_MODULES.map(m => m.category)));

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-40 px-4 pt-12 space-y-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Bienvenido de nuevo,</h2>
          <h1 className="text-2xl font-semibold tracking-tight">{userName}</h1>
        </div>
        <button onClick={() => setActiveTab('more')} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
          <UserCircle className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
        </button>
      </div>

      {/* Voice/Text Input Box for future AI */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-black dark:bg-white animate-pulse" />
        </div>
        <input 
          type="text" 
          placeholder="¿Qué quieres agregar hoy?"
          value={voiceInput}
          onChange={(e) => setVoiceInput(e.target.value)}
          className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-3xl py-4 pl-10 pr-12 text-sm focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all outline-none"
        />
        <button className="absolute inset-y-0 right-2 flex items-center justify-center w-10 h-10 my-auto rounded-full bg-black dark:bg-white hover:scale-105 active:scale-95 transition-transform">
          <Mic className="w-5 h-5 text-white dark:text-black" />
        </button>
      </div>

      {/* Pinned Modules (Grid Layout) */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-semibold">Módulos</h3>
          <button 
            onClick={() => setShowAllModules(true)}
            className="text-xs text-zinc-500 dark:text-zinc-400 font-medium active:opacity-70 transition-opacity"
          >
            Ver todos
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {pinnedModules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className="flex flex-col items-center justify-center w-full aspect-square rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${mod.bg} flex items-center justify-center mb-1.5`}>
                <mod.icon className={`w-4 h-4 ${mod.color}`} />
              </div>
              <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{mod.label}</span>
            </button>
          ))}
          {pinnedModules.length === 0 && (
            <div className="col-span-4 py-6 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              No hay módulos fijados. <br/>Toca "Ver todos" para agregar.
            </div>
          )}
        </div>
      </div>

      {/* General Progress Button */}
      <button 
        onClick={() => setActiveTab('progreso')}
        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-zinc-100 dark:border-zinc-800 flex items-center justify-center relative">
            <svg className="w-12 h-12 absolute -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-black dark:text-white"
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xs font-semibold">{progressPercent}%</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Progreso General</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{completedTasks} de {tasks.length} tareas hoy</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-zinc-400" />
      </button>

      {/* Today's Brief */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Hoy</h3>
        {tasks.slice(0, 3).map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${task.completed ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white text-white dark:text-zinc-900' : 'border-zinc-300 dark:border-zinc-600'}`}>
                {task.completed && <CheckSquare className="w-3 h-3" />}
             </div>
             <div className="flex-1 min-w-0">
               <p className={`text-sm truncate ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-800 dark:text-zinc-200 font-medium'}`}>{task.text}</p>
             </div>
          </div>
        ))}
        {tasks.length > 3 && (
          <button onClick={() => setActiveTab('tasks')} className="w-full py-3 text-sm font-medium text-zinc-500 text-center rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.99]">
            Ver todas las tareas
          </button>
        )}
        {tasks.length === 0 && (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tu día está libre.</p>
            <p className="text-xs text-zinc-500 mt-1">No tienes tareas para hoy.</p>
          </div>
        )}
      </div>

      {/* All Modules Bottom Sheet */}
      <AnimatePresence>
        {showAllModules && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllModules(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-black rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              </div>
              <div className="px-6 pb-4 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900">
                <h2 className="text-xl font-bold">Todos los Módulos</h2>
                <button onClick={() => setShowAllModules(false)} className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 space-y-8 pb-safe-bottom">
                {categories.map(category => (
                  <div key={category} className="space-y-4">
                    <h4 className="text-xs font-bold text-zinc-400 tracking-wider">{category}</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {ALL_MODULES.filter(m => m.category === category).map(mod => {
                        const isPinned = pinnedIds.includes(mod.id);
                        return (
                          <div key={mod.id} className="relative group flex flex-col items-center">
                            <button
                              onClick={() => {
                                setShowAllModules(false);
                                setActiveTab(mod.id);
                              }}
                              className="w-14 h-14 rounded-[1.25rem] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center active:scale-95 transition-transform mb-2 relative overflow-hidden"
                            >
                              <mod.icon className={`w-6 h-6 ${mod.color}`} />
                            </button>
                            <span className="text-[11px] font-medium text-center text-zinc-600 dark:text-zinc-400 leading-tight">{mod.label}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin(mod.id); }}
                              className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                                isPinned ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400'
                              }`}
                            >
                              <Pin className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MobileDashboard;
