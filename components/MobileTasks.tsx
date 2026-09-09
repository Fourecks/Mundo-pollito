import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Todo, Project } from '../types';
import { CheckCircle2, Circle, Plus, MoreVertical, Flag, CheckSquare } from 'lucide-react';

interface MobileTasksProps {
    allTodos: { [key: string]: Todo[] };
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    toggleTodo: (id: number) => void;
    onEditTodo: (todo: Todo) => void;
    projects: Project[];
    onAddTask: () => void;
}

const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getRelativeDateLabel = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays === -1) return 'Ayer';
    
    return target.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
};

const MobileTasks: React.FC<MobileTasksProps> = ({
    allTodos,
    selectedDate,
    setSelectedDate,
    toggleTodo,
    onEditTodo,
    projects,
    onAddTask
}) => {
    const [view, setView] = useState<'today' | 'upcoming'>('today');
    
    const today = new Date();
    const todayKey = formatDateKey(today);
    
    const todayTasks = useMemo(() => allTodos[todayKey] || [], [allTodos, todayKey]);
    
    // Sort tasks: uncompleted first, then by priority, then completed
    const sortedTasks = useMemo(() => {
        const tasks = view === 'today' ? todayTasks : (allTodos['undated'] || []);
        
        return [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        });
    }, [view, todayTasks, allTodos]);

    const completedCount = sortedTasks.filter(t => t.completed).length;
    const totalCount = sortedTasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-12 px-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Tareas</h1>
                    <p className="text-sm font-medium text-zinc-500 mt-1">{getRelativeDateLabel(today)}</p>
                </div>
                <button 
                    onClick={onAddTask}
                    className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-xl"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="flex space-x-2 mb-6">
                <button 
                    onClick={() => setView('today')}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${view === 'today' ? 'bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white' : 'text-zinc-500'}`}
                >
                    Hoy
                </button>
                <button 
                    onClick={() => setView('upcoming')}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${view === 'upcoming' ? 'bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white' : 'text-zinc-500'}`}
                >
                    Sin Fecha
                </button>
            </div>

            {totalCount > 0 && (
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-zinc-500">{progress}%</span>
                </div>
            )}

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {sortedTasks.map(task => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={task.id}
                            className={`group flex items-start gap-4 p-4 rounded-3xl border transition-all active:scale-[0.98] ${
                                task.completed 
                                    ? 'bg-zinc-50 dark:bg-zinc-900/50 border-transparent opacity-60' 
                                    : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm'
                            }`}
                        >
                            <button 
                                onClick={() => toggleTodo(task.id)}
                                className="mt-0.5 shrink-0"
                            >
                                {task.completed ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-500/20" />
                                ) : (
                                    <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                                )}
                            </button>
                            
                            <div className="flex-1 min-w-0" onClick={() => onEditTodo(task)}>
                                <h3 className={`text-base font-medium truncate ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {task.text}
                                </h3>
                                
                                {(task.project_id || task.priority !== 'low') && (
                                    <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                                        {task.project_id && (
                                            <span className="flex items-center gap-1.5 text-zinc-500">
                                                <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                                {projects.find(p => p.id === task.project_id)?.name || 'Proyecto'}
                                            </span>
                                        )}
                                        {task.priority !== 'low' && (
                                            <span className={`flex items-center gap-1 ${task.priority === 'high' ? 'text-red-500' : 'text-zinc-500'}`}>
                                                <Flag className="w-3 h-3" />
                                                {task.priority === 'high' ? 'Alta' : 'Media'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <button className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
                
                {sortedTasks.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                            <CheckSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                        </div>
                        <p className="text-zinc-500 font-medium">No hay tareas para esta vista.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileTasks;
