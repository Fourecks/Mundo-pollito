import React, { useState } from 'react';
import { Todo, Project } from '../types';
import { 
    ArrowLeft, Plus, Check, Trash2, GripVertical, 
    Calendar as CalendarIcon, Settings, CheckSquare, 
    LayoutList, Columns, ChevronRight 
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectKanbanViewProps {
    project: Project;
    projectTasks: Todo[];
    allProjects: Project[];
    toggleTodo: (id: number) => void;
    toggleSubtask: (taskId: number, subtaskId: number) => void;
    deleteTodo: (id: number) => void;
    updateTodo: (todo: Todo) => void;
    onEditTodo?: (todo: Todo) => void;
    onBack: () => void;
    onOpenProjectEditor?: (project: Project) => void;
    onUpdateProject?: (projectId: number, name: string, emoji: string | null, color: string | null) => Promise<void>;
    addTodo: (text: string, options?: { projectId?: number | null; isUndated?: boolean }) => Promise<void>;
}

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
    project,
    projectTasks,
    toggleTodo,
    toggleSubtask,
    deleteTodo,
    updateTodo,
    onEditTodo,
    onBack,
    onOpenProjectEditor,
    addTodo
}) => {
    const safeParseDate = (d: any): Date | null => {
        if (!d) return null;
        if (typeof d === 'string') {
            try {
                const parsed = parseISO(d);
                return isNaN(parsed.getTime()) ? null : parsed;
            } catch {
                return null;
            }
        }
        if (typeof d === 'object' && d.year && d.month && d.day) {
            return new Date(d.year, d.month - 1, d.day);
        }
        return null;
    };

    const formatDueDateStr = (d: any, formatPattern = 'd MMM'): string => {
        const parsed = safeParseDate(d);
        if (!parsed) return typeof d === 'string' ? d : '';
        try {
            return format(parsed, formatPattern, { locale: es });
        } catch {
            return '';
        }
    };

    const isPastDueDate = (d: any): boolean => {
        const parsed = safeParseDate(d);
        if (!parsed) return false;
        return isPast(parsed) && !isToday(parsed);
    };

    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [addingToCol, setAddingToCol] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    const [listNewTask, setListNewTask] = useState('');

    const columns = project.kanban_columns && project.kanban_columns.length > 0 
        ? project.kanban_columns 
        : ['To Do', 'In Progress', 'Done'];

    const completedTasks = projectTasks.filter(t => t.completed).length;
    const totalTasks = projectTasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        try {
            e.dataTransfer.setData('taskId', taskId.toString());
            e.dataTransfer.setData('text/plain', taskId.toString());
            e.dataTransfer.effectAllowed = 'move';
        } catch {
            // ignore
        }
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, col: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumn !== col) {
            setDragOverColumn(col);
        }
    };

    const handleDrop = (e: React.DragEvent, targetCol: string) => {
        e.preventDefault();
        e.stopPropagation();

        let taskId: number | null = draggedTaskId;
        try {
            const taskIdStr = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('text/plain');
            if (taskIdStr) {
                const parsed = parseInt(taskIdStr, 10);
                if (!isNaN(parsed)) taskId = parsed;
            }
        } catch {
            // fallback
        }

        setDraggedTaskId(null);
        setDragOverColumn(null);

        if (!taskId) return;
        const task = projectTasks.find(t => t.id === taskId);
        if (!task) return;

        const isTargetDone = /done|complet|finaliz|termin/i.test(targetCol);
        const isCurrentDone = /done|complet|finaliz|termin/i.test(task.kanban_column || '');
        let newCompleted = task.completed;
        if (isTargetDone) {
            newCompleted = true;
        } else if (isCurrentDone && !isTargetDone) {
            newCompleted = false;
        }

        updateTodo({
            ...task,
            kanban_column: targetCol,
            completed: newCompleted,
            project_id: project.id
        });
    };

    const handleQuickAdd = async (col: string) => {
        if (!newTaskText.trim()) return;
        const text = newTaskText.trim();
        setNewTaskText('');
        setAddingToCol(null);
        await addTodo(text, { projectId: project.id });
    };

    const getColumnStyle = (col: string) => {
        const lower = col.toLowerCase();
        if (/done|complet|finaliz|termin/i.test(lower)) return { dot: 'bg-emerald-500', headerBg: 'bg-emerald-50/60 dark:bg-emerald-950/30' };
        if (/in progress|en progreso|en curso|haciendo|doing/i.test(lower)) return { dot: 'bg-blue-500', headerBg: 'bg-blue-50/60 dark:bg-blue-950/30' };
        return { dot: 'bg-amber-500', headerBg: 'bg-amber-50/60 dark:bg-amber-950/30' };
    };

    return (
        <div className="flex flex-col h-full bg-secondary-lighter/30 dark:bg-gray-900/60">
            {/* Header */}
            <div className="p-4 border-b border-secondary-light/40 dark:border-gray-800 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Volver a la lista de proyectos"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-2.5">
                            {project.emoji && <span className="text-2xl select-none">{project.emoji}</span>}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h2>
                                    {project.color && (
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    <span>{completedTasks}/{totalTasks} completadas ({progress}%)</span>
                                    {project.target_date && (
                                        <span className="flex items-center gap-1">
                                            • <CalendarIcon className="w-3 h-3 text-gray-400" />
                                            Límite: {formatDueDateStr(project.target_date, 'd MMM yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Switcher */}
                        <div className="flex items-center bg-black/5 dark:bg-black/20 p-0.5 rounded-lg">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                                    viewMode === 'kanban' 
                                        ? 'bg-white dark:bg-gray-700 text-primary-dark dark:text-primary shadow-xs' 
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                                title="Vista Tablero Kanban"
                            >
                                <Columns className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                                    viewMode === 'list' 
                                        ? 'bg-white dark:bg-gray-700 text-primary-dark dark:text-primary shadow-xs' 
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                                title="Vista Lista"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                        </div>

                        {onOpenProjectEditor && (
                            <button
                                onClick={() => onOpenProjectEditor(project)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-black/5 dark:bg-black/20 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
                            >
                                <Settings className="w-3.5 h-3.5" /> Configuración
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/5 dark:bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%`, backgroundColor: project.color || 'var(--color-primary)' }}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-4">
                {viewMode === 'kanban' ? (
                    <div className="h-full flex overflow-x-auto gap-4 pb-2">
                        {columns.map(col => {
                            const colTasks = projectTasks.filter(t => (t.kanban_column || 'To Do') === col);
                            const isDragOver = dragOverColumn === col && draggedTaskId !== null;
                            const style = getColumnStyle(col);

                            return (
                                <div
                                    key={col}
                                    className={`flex-shrink-0 w-72 flex flex-col rounded-2xl bg-white/70 dark:bg-gray-800/70 border transition-all duration-200 overflow-hidden shadow-sm ${
                                        isDragOver 
                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
                                            : 'border-secondary-light/40 dark:border-gray-700/60'
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, col)}
                                    onDragLeave={() => dragOverColumn === col && setDragOverColumn(null)}
                                    onDrop={(e) => handleDrop(e, col)}
                                >
                                    {/* Column Header */}
                                    <div className="p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{col}</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-black/20 text-gray-500">
                                                {colTasks.length}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setAddingToCol(col)}
                                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"
                                            title="Añadir tarea"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Cards Container */}
                                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                                        {colTasks.map(task => {
                                            const isBeingDragged = draggedTaskId === task.id;
                                            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                            const completedSub = hasSubtasks ? task.subtasks!.filter(s => s.completed).length : 0;
                                            const totalSub = hasSubtasks ? task.subtasks!.length : 0;
                                            const isOverdue = task.due_date && !task.completed && isPastDueDate(task.due_date);

                                            return (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        if (dragOverColumn !== col) setDragOverColumn(col);
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDrop(e, col);
                                                    }}
                                                    onClick={() => onEditTodo && onEditTodo(task)}
                                                    className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 border transition-all cursor-grab active:cursor-grabbing group select-none shadow-2xs ${
                                                        isBeingDragged
                                                            ? 'opacity-30 border-dashed border-primary ring-2 ring-primary/20 scale-[0.98]'
                                                            : 'border-secondary-light/40 dark:border-gray-700 hover:border-primary/50'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTodo(task.id);
                                                            }}
                                                            className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors ${
                                                                task.completed
                                                                    ? 'bg-primary-dark dark:bg-primary border-primary-dark dark:border-primary text-white dark:text-black'
                                                                    : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                                                            }`}
                                                        >
                                                            {task.completed && <Check className="w-3 h-3" />}
                                                        </button>
                                                        <p className={`text-xs flex-1 break-words leading-relaxed ${task.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100 font-medium'}`}>
                                                            {task.text}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('¿Eliminar esta tarea?')) deleteTodo(task.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded hover:bg-black/5 transition-opacity"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Meta chips */}
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                                                        {task.priority && task.priority !== 'none' && (
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                                                task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                                                                task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                                                                'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                            }`}>
                                                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                                            </span>
                                                        )}
                                                        {hasSubtasks && (
                                                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-black/5 dark:bg-black/20 text-gray-500 flex items-center gap-0.5">
                                                                <CheckSquare className="w-2.5 h-2.5" />
                                                                {completedSub}/{totalSub}
                                                            </span>
                                                        )}
                                                        {task.due_date && (
                                                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                                                                isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300' : 'bg-black/5 text-gray-500'
                                                            }`}>
                                                                <CalendarIcon className="w-2.5 h-2.5" />
                                                                {formatDueDateStr(task.due_date)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isDragOver && (
                                            <div className="border-2 border-dashed border-primary rounded-xl p-3 text-center bg-primary/5 text-primary text-xs font-semibold animate-pulse">
                                                Soltar aquí
                                            </div>
                                        )}

                                        {colTasks.length === 0 && !isDragOver && (
                                            <div className="text-center py-6 border border-dashed border-secondary-light/50 dark:border-gray-700/60 rounded-xl text-xs text-gray-400">
                                                Arrastra tareas aquí
                                            </div>
                                        )}

                                        {addingToCol === col ? (
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-primary shadow-md">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={newTaskText}
                                                    onChange={e => setNewTaskText(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleQuickAdd(col);
                                                        if (e.key === 'Escape') { setAddingToCol(null); setNewTaskText(''); }
                                                    }}
                                                    placeholder="Escribe la tarea..."
                                                    className="w-full text-xs p-1 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white"
                                                />
                                                <div className="flex justify-end gap-1.5 mt-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                                                    <button
                                                        onClick={() => { setAddingToCol(null); setNewTaskText(''); }}
                                                        className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickAdd(col)}
                                                        className="px-2.5 py-0.5 text-xs bg-primary-dark dark:bg-primary text-white dark:text-black rounded font-medium"
                                                    >
                                                        Añadir
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setAddingToCol(col)}
                                                className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-dashed border-secondary-light/50 dark:border-gray-700 transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Añadir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List View */
                    <div className="max-w-2xl mx-auto h-full flex flex-col">
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={listNewTask}
                                onChange={e => setListNewTask(e.target.value)}
                                onKeyDown={async e => {
                                    if (e.key === 'Enter' && listNewTask.trim()) {
                                        const text = listNewTask.trim();
                                        setListNewTask('');
                                        await addTodo(text, { projectId: project.id });
                                    }
                                }}
                                placeholder="Añadir una nueva tarea al proyecto..."
                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-secondary-light/50 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary"
                            />
                            <button
                                onClick={async () => {
                                    if (listNewTask.trim()) {
                                        const text = listNewTask.trim();
                                        setListNewTask('');
                                        await addTodo(text, { projectId: project.id });
                                    }
                                }}
                                className="px-4 py-2 bg-primary-dark dark:bg-primary text-white dark:text-black font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity"
                            >
                                Añadir
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {projectTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onEditTodo && onEditTodo(task)}
                                    className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-secondary-light/40 dark:border-gray-700 flex items-center justify-between gap-3 hover:border-primary/50 cursor-pointer group shadow-2xs"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTodo(task.id);
                                            }}
                                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                                task.completed
                                                    ? 'bg-primary-dark dark:bg-primary border-primary-dark dark:border-primary text-white dark:text-black'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                                            }`}
                                        >
                                            {task.completed && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={`text-sm truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100 font-medium'}`}>
                                            {task.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-black/20 text-gray-500">
                                            {task.kanban_column || 'To Do'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('¿Eliminar esta tarea?')) deleteTodo(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded hover:bg-black/5 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {projectTasks.length === 0 && (
                                <div className="text-center py-12 text-sm text-gray-400 border-2 border-dashed border-secondary-light/40 dark:border-gray-700/60 rounded-2xl">
                                    No hay tareas en este proyecto todavía. ¡Añade una arriba!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
