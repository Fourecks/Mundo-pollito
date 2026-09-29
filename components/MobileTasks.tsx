import React, { useState, useMemo, useEffect } from 'react';
import { Todo, Project, Subtask } from '../types';
import MobileTaskDrawer from './MobileTaskDrawer';
import { formatTime12h, formatDateRangeSafe } from '../src/utils/dateFormatter';
import { 
    CheckCircle2, 
    Circle, 
    Plus, 
    Flag, 
    CheckSquare, 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Clock, 
    Check, 
    ChevronDown,
    ListTodo
} from 'lucide-react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface MobileTasksProps {
    allTodos: { [key: string]: Todo[] };
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    toggleTodo: (id: number) => void;
    onEditTodo?: (todo: Todo) => void;
    projects: Project[];
    onAddTask?: () => void;
    onAddTodo?: (text: string, options?: any) => Promise<void> | void;
    onUpdateTodo?: (todo: Todo) => void;
    onDeleteTodo?: (id: number) => void;
    onRemoveFromCalendar?: (todoId: number) => Promise<void> | void;
    onSyncToCalendar?: (todo: Todo, provider?: any) => Promise<void> | void;
    taskToEdit?: Todo | null;
    setTaskToEdit?: (todo: Todo | null) => void;
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
    
    return format(target, "EEEE, d 'de' MMMM", { locale: es });
};

const MobileTasks: React.FC<MobileTasksProps> = ({
    allTodos,
    selectedDate,
    setSelectedDate,
    toggleTodo,
    projects = [],
    onAddTodo,
    onUpdateTodo,
    taskToEdit: externalTaskToEdit,
    setTaskToEdit: externalSetTaskToEdit
}) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [tabView, setTabView] = useState<'dated' | 'undated'>('dated');
    const [activeEditingTask, setActiveEditingTask] = useState<Todo | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<number[]>([]);

    const toggleExpandTask = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    // Sync external task to edit if triggered from outside
    useEffect(() => {
        if (externalTaskToEdit) {
            setActiveEditingTask(externalTaskToEdit);
            setIsDrawerOpen(true);
        }
    }, [externalTaskToEdit]);

    const handleOpenCreateDrawer = () => {
        setActiveEditingTask(null);
        setIsDrawerOpen(true);
    };

    const handleOpenEditDrawer = (task: Todo) => {
        setActiveEditingTask(task);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setActiveEditingTask(null);
        if (externalSetTaskToEdit) {
            externalSetTaskToEdit(null);
        }
    };

    // Day Switchers
    const handlePrevDay = () => {
        setSelectedDate(subDays(selectedDate, 1));
    };

    const handleNextDay = () => {
        setSelectedDate(addDays(selectedDate, 1));
    };

    const handleResetToToday = () => {
        setSelectedDate(new Date());
    };

    const selectedDateKey = formatDateKey(selectedDate);
    const isSelectedToday = isSameDay(selectedDate, new Date());

    // Filter Tasks for the selected view
    const currentTasks = useMemo(() => {
        if (tabView === 'undated') {
            return allTodos['undated'] || [];
        }
        return allTodos[selectedDateKey] || [];
    }, [allTodos, tabView, selectedDateKey]);

    // Sorted Tasks
    const sortedTasks = useMemo(() => {
        return [...currentTasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
            if (pDiff !== 0) return pDiff;
            return (a.start_time || '23:59').localeCompare(b.start_time || '23:59');
        });
    }, [currentTasks]);

    const completedCount = sortedTasks.filter(t => t.completed).length;
    const totalCount = sortedTasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const undatedCount = (allTodos['undated'] || []).length;
    const datedCount = (allTodos[selectedDateKey] || []).length;

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-40 pt-8 px-4 sm:px-6">
            {/* Header: Title and Add Task Button */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Tareas</h1>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {completedCount} de {totalCount} completadas
                    </p>
                </div>
                <button 
                    type="button"
                    onClick={handleOpenCreateDrawer}
                    className="w-10 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer"
                    title="Nueva Tarea"
                    aria-label="Nueva Tarea"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Selector de Día */}
            <div className="flex items-center justify-between mb-3 bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60">
                <button 
                    type="button"
                    onClick={handlePrevDay} 
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                    aria-label="Día anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button 
                    type="button"
                    onClick={handleResetToToday}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-colors text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isSelectedToday ? `Hoy (${format(selectedDate, 'd MMM', { locale: es })})` : getRelativeDateLabel(selectedDate)}</span>
                </button>

                <button 
                    type="button"
                    onClick={handleNextDay} 
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                    aria-label="Día siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* View Filter Tabs: Para este día vs Sin Fecha */}
            <div className="flex space-x-1.5 mb-3">
                <button 
                    type="button"
                    onClick={() => setTabView('dated')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        tabView === 'dated' 
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
                            : 'bg-zinc-100 dark:bg-zinc-900/60 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Para este día</span>
                    {datedCount > 0 && (
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                            tabView === 'dated' ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}>
                            {datedCount}
                        </span>
                    )}
                </button>
                <button 
                    type="button"
                    onClick={() => setTabView('undated')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        tabView === 'undated' 
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
                            : 'bg-zinc-100 dark:bg-zinc-900/60 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Sin Fecha</span>
                    {undatedCount > 0 && (
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                            tabView === 'undated' ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}>
                            {undatedCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Barra de Progreso Minimalista */}
            {totalCount > 0 && (
                <div className="mb-4 flex items-center gap-2.5 px-1">
                    <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-zinc-900 dark:bg-white transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{progress}%</span>
                </div>
            )}

            {/* Lista de Tareas Minimalista */}
            <div className="space-y-2">
                {sortedTasks.map(task => {
                    const project = projects.find(p => p.id === task.project_id);
                    const subtasksCount = task.subtasks?.length || 0;
                    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

                    return (
                        <div key={task.id} className="flex flex-col">
                            <div
                                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                                    task.completed 
                                        ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-150/60 dark:border-zinc-800/40 opacity-60' 
                                        : 'bg-white dark:bg-[#121214] border-zinc-150 dark:border-zinc-800/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                            >
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTodo(task.id);
                                    }}
                                    className="mt-0.5 shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                                    aria-label={`Marcar ${task.text} como ${task.completed ? 'incompleta' : 'completada'}`}
                                >
                                    {task.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500" />
                                    )}
                                </button>
                                
                                <div 
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleOpenEditDrawer(task)}
                                >
                                    <p className={`text-sm font-medium leading-snug break-words ${
                                        task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                                    }`}>
                                        {task.text}
                                    </p>
                                    
                                    {/* Badges / Tags Minimalistas */}
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {/* Project Tag */}
                                        {project && (
                                            <span className="inline-flex items-center gap-1 font-medium">
                                                <span 
                                                    className="w-2 h-2 rounded-full shrink-0" 
                                                    style={{ backgroundColor: project.color || '#a1a1aa' }}
                                                />
                                                <span>{project.name}</span>
                                            </span>
                                        )}

                                        {/* Time */}
                                        {task.start_time && (
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-zinc-400" />
                                                <span>{formatTime12h(task.start_time)}{task.end_time ? ` - ${formatTime12h(task.end_time)}` : ''}</span>
                                            </span>
                                        )}

                                        {/* Date Range if different from selected day */}
                                        {task.due_date && tabView === 'undated' && (
                                            <span className="inline-flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3 text-zinc-400" />
                                                <span>{formatDateRangeSafe(task.due_date, task.end_date)}</span>
                                            </span>
                                        )}

                                        {/* Priority Indicator */}
                                        {task.priority === 'high' && (
                                            <span className="inline-flex items-center gap-0.5 text-rose-500 font-semibold">
                                                <Flag className="w-3 h-3" />
                                                <span>Alta</span>
                                            </span>
                                        )}
                                        {task.priority === 'medium' && (
                                            <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium">
                                                <Flag className="w-3 h-3" />
                                                <span>Media</span>
                                            </span>
                                        )}

                                        {/* Subtasks pill */}
                                        {subtasksCount > 0 && (
                                            <span 
                                                className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                                                onClick={(e) => toggleExpandTask(task.id, e)}
                                            >
                                                <CheckSquare className="w-3 h-3" />
                                                <span>{completedSubtasks}/{subtasksCount}</span>
                                                <ChevronDown className={`w-3 h-3 transition-transform ${expandedTasks.includes(task.id) ? 'rotate-180' : ''}`} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Expanded Subtasks */}
                            {expandedTasks.includes(task.id) && subtasksCount > 0 && (
                                <div className="pl-11 pr-3 pb-2 pt-1.5 space-y-1.5" onClick={e => e.stopPropagation()}>
                                    {task.subtasks?.map(subtask => (
                                        <label key={subtask.id} className="flex items-center gap-2.5 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={subtask.completed}
                                                    onChange={() => {
                                                        const newSubtasks = task.subtasks!.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                                                        if (onUpdateTodo) {
                                                            onUpdateTodo({ ...task, subtasks: newSubtasks });
                                                        }
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${subtask.completed ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                                    {subtask.completed && <Check className="w-2.5 h-2.5 text-white dark:text-zinc-900" strokeWidth={3} />}
                                                </div>
                                            </div>
                                            <span className={`text-xs ${subtask.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                {subtask.title || subtask.text}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            
                {sortedTasks.length === 0 && (
                    <div className="text-center py-16 px-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-2.5 text-zinc-400">
                            <CheckSquare className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {tabView === 'dated' ? 'No hay tareas para este día' : 'No hay tareas sin fecha'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Toca el botón + para añadir una tarea.
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Task Drawer for Add & Edit */}
            <MobileTaskDrawer 
                isOpen={isDrawerOpen} 
                onClose={handleCloseDrawer} 
                onAddTask={onAddTodo}
                onEditTask={(_, text, options) => {
                    if (activeEditingTask && onUpdateTodo) {
                         const updatedTask: Todo = { 
                             ...activeEditingTask, 
                             text, 
                             ...options,
                             end_date: options?.end_date !== undefined ? options.end_date : (options?.endDate !== undefined ? options.endDate : null)
                         };
                         onUpdateTodo(updatedTask);
                    }
                }}
                taskToEdit={activeEditingTask}
                projects={projects}
            />
        </div>
    );
};

export default React.memo(MobileTasks);
