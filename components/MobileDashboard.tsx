import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ArrowRight, LayoutGrid, Calendar, CheckSquare, Wallet, GraduationCap, FileText, Settings, UserCircle, PieChart, Focus } from 'lucide-react';
import { Todo, GoogleCalendarEvent as CalendarEvent } from '../types';

interface MobileDashboardProps {
  userName: string;
  setActiveTab: (tab: string) => void;
  tasks: Todo[];
  calendarEvents: CalendarEvent[];
}

const modules = [
  { id: 'tasks', label: 'Tareas', icon: CheckSquare, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'projects', label: 'Proyectos', icon: LayoutGrid, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'calendar', label: 'Calendario', icon: Calendar, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'notes', label: 'Notas', icon: FileText, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'finance', label: 'Finanzas', icon: Wallet, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'student', label: 'Estudio', icon: GraduationCap, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'habits', label: 'Hábitos', icon: Focus, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-100 dark:bg-zinc-800' },
];

const MobileDashboard: React.FC<MobileDashboardProps> = ({ userName, setActiveTab, tasks, calendarEvents }) => {
  const [voiceInput, setVoiceInput] = useState('');
  
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-24 px-4 pt-12 space-y-8">
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

      {/* Quick Access Modules (Horizontal Scroll) */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-medium">Módulos</h3>
          <button className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Fijar</button>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 -mx-4 px-4">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className="flex flex-col items-center justify-center min-w-[80px] w-20 h-24 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              <div className={`w-12 h-12 rounded-full ${mod.bg} flex items-center justify-center mb-2`}>
                <mod.icon className={`w-5 h-5 ${mod.color}`} />
              </div>
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{mod.label}</span>
            </button>
          ))}
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
        <h3 className="text-lg font-medium">Hoy</h3>
        {tasks.slice(0, 3).map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                {task.completed && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
             </div>
             <div className="flex-1 min-w-0">
               <p className={`text-sm truncate ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-800 dark:text-zinc-200 font-medium'}`}>{task.text}</p>
             </div>
          </div>
        ))}
        {tasks.length > 3 && (
          <button onClick={() => setActiveTab('tasks')} className="w-full py-3 text-sm font-medium text-zinc-500 text-center rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
            Ver todas las tareas
          </button>
        )}
        {tasks.length === 0 && (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">No hay tareas para hoy.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default MobileDashboard;
