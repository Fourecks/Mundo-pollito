import React, { useState, useMemo } from 'react';
import { Todo, Project } from '../types';
import { 
    ArrowLeft, Plus, Check, Trash2, GripVertical, 
    Calendar as CalendarIcon, Settings, CheckSquare, 
    LayoutList, Columns, Search, SlidersHorizontal, X,
    Filter
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
    addTodo: (text: string, options?: { projectId?: number | null; isUndated?: boolean; kanban_column?: string }) => Promise<void>;
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
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [addingToCol, setAddingToCol] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    const [listNewTask, setListNewTask] = useState('');

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [filterDate, setFilterDate] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Quick Add Modal State
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [quickTaskText, setQuickTaskText] = useState('');

    const columns = project.kanban_columns && project.kanban_columns.length > 0 
        ? project.kanban_columns 
        : ['Por hacer', 'En progreso', 'Completado'];

    // Filter tasks based on search query and filter states
    const filteredTasks = useMemo(() => {
        return projectTasks.filter(task => {
            if (searchQuery.trim()) {
                if (!task.text.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
                    return false;
                }
            }
            if (filterPriority !== 'all') {
                if (task.priority !== filterPriority) return false;
            }
            if (filterDate !== 'all') {
                if (!task.due_date) return false;
                const parsedDate = parseISO(task.due_date);
                if (filterDate === 'today' && !isToday(parsedDate)) return false;
                if (filterDate === 'overdue' && (!isPast(parsedDate) || isToday(parsedDate))) return false;
                if (filterDate === 'upcoming' && (isPast(parsedDate) && !isToday(parsedDate))) return false;
            }
            return true;
        });
    }, [projectTasks, searchQuery, filterPriority, filterDate]);

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

    const handleQuickAdd = async (col: string = 'Por hacer') => {
        if (!newTaskText.trim()) return;
        const text = newTaskText.trim();
        setNewTaskText('');
        setAddingToCol(null);
        await addTodo(text, { projectId: project.id, kanban_column: col } as any);
    };

    const handleCreateNewTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTaskText.trim()) return;
        const text = quickTaskText.trim();
        setQuickTaskText('');
        setShowQuickAddModal(false);
        await addTodo(text, { projectId: project.id, kanban_column: columns[0] || 'Por hacer' } as any);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-[#09090b] text-gray-900 dark:text-gray-100 font-sans">
            {/* Header Principal del Proyecto */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack}
                            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Volver a proyectos"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-2.5">
                            {project.emoji && <span className="text-2xl select-none">{project.emoji}</span>}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{project.name}</h2>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-0.5 font-medium">
                                    <span>{completedTasks}/{totalTasks} completadas ({progress}%)</span>
                                    {project.target_date && (
                                        <span className="flex items-center gap-1">
                                            • <CalendarIcon className="w-3 h-3 text-gray-400" />
                                            Límite: {format(parseISO(project.target_date), 'd MMM yyyy', { locale: es })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Switcher Vista Kanban / Lista */}
                        <div className="flex items-center bg-gray-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-gray-200/60 dark:border-zinc-700/60">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                    viewMode === 'kanban' 
                                        ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' 
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
                                        ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-xs' 
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                                title="Vista Lista"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Configuración Button */}
                        {onOpenProjectEditor && (
                            <button
                                onClick={() => onOpenProjectEditor(project)}
                                className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 flex items-center gap-1.5 transition-all active:scale-95 border border-gray-200/80 dark:border-zinc-700/80"
                            >
                                <Settings className="w-3.5 h-3.5" /> <span>Configuración</span>
                            </button>
                        )}

                        {/* Botón de Más (A la par de Configuración para crear nueva tarea directamente en por hacer) */}
                        <button
                            onClick={() => setShowQuickAddModal(true)}
                            className="p-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-95 shadow-xs flex items-center justify-center"
                            title="Añadir nueva tarea"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar Monochrome */}
                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                        className="h-full rounded-full transition-all duration-500 bg-zinc-900 dark:bg-white" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* SECCIÓN BARRA DE HERRAMIENTAS DE TAREAS (Tareas + [+ Añadir] + [Buscador] + [Filtros]) */}
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>Tareas</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-mono">
                            {filteredTasks.length}
                        </span>
                    </h3>

                    {/* Botón de Más junto a Tareas */}
                    <button
                        onClick={() => setShowQuickAddModal(true)}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 transition-colors"
                        title="Añadir tarea nueva"
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    {/* Botón de Buscar que abre buscador pequeño */}
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`p-1.5 rounded-lg transition-colors ${
                            isSearchOpen || searchQuery 
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' 
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200'
                        }`}
                        title="Buscar tareas"
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    {/* Botón de Filtros que despliega filtro pequeño */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                                filterPriority !== 'all' || filterDate !== 'all'
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' 
                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200'
                            }`}
                            title="Filtrar por fecha y prioridad"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            {(filterPriority !== 'all' || filterDate !== 'all') && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                        </button>

                        {/* Dropdown de Filtro Desplegable (Pill button options to prevent keyboard popups or mobile zoom) */}
                        {isFilterOpen && (
                            <div 
                                className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#121214] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-4 space-y-4 font-sans text-xs"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
                                    <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Filtros de Tareas</span>
                                    <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Filtrar por Fecha */}
                                <div className="space-y-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-zinc-300 block">Por Fecha:</span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { id: 'all', label: 'Todas' },
                                            { id: 'today', label: 'Hoy' },
                                            { id: 'upcoming', label: 'Próximas' },
                                            { id: 'overdue', label: 'Vencidas' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setFilterDate(f.id as any)}
                                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all text-left ${
                                                    filterDate === f.id 
                                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-bold' 
                                                        : 'bg-zinc-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Filtrar por Prioridad */}
                                <div className="space-y-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-zinc-300 block">Por Prioridad:</span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { id: 'all', label: 'Todas' },
                                            { id: 'high', label: 'Alta' },
                                            { id: 'medium', label: 'Media' },
                                            { id: 'low', label: 'Baja' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFilterPriority(p.id as any)}
                                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all text-left ${
                                                    filterPriority === p.id 
                                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-bold' 
                                                        : 'bg-zinc-50 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Resetear */}
                                {(filterPriority !== 'all' || filterDate !== 'all') && (
                                    <button
                                        type="button"
                                        onClick={() => { setFilterPriority('all'); setFilterDate('all'); }}
                                        className="w-full py-1.5 text-center text-xs text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Desplegable de Buscador Pequeño */}
                {isSearchOpen && (
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 w-full sm:w-64 animate-in fade-in duration-150">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar en tareas..."
                            autoFocus
                            className="bg-transparent border-none text-base sm:text-xs text-gray-900 dark:text-white focus:outline-none w-full placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ÁREA LIBRE INFERIOR SOLO PARA VER LAS TAREAS */}
            <div className="flex-1 overflow-hidden p-4">
                {viewMode === 'kanban' ? (
                    <div className="h-full flex overflow-x-auto gap-4 pb-2">
                        {columns.map(col => {
                            const colTasks = filteredTasks.filter(t => (t.kanban_column || (columns[0] || 'Por hacer')) === col);
                            const isDragOver = dragOverColumn === col && draggedTaskId !== null;

                            return (
                                <div
                                    key={col}
                                    className={`flex-shrink-0 w-72 sm:w-80 flex flex-col rounded-2xl bg-white dark:bg-[#121215] border transition-all duration-200 overflow-hidden shadow-2xs ${
                                        isDragOver 
                                            ? 'border-zinc-900 ring-2 ring-zinc-900/20 dark:border-white dark:ring-white/20' 
                                            : 'border-gray-200 dark:border-zinc-800'
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, col)}
                                    onDragLeave={() => dragOverColumn === col && setDragOverColumn(null)}
                                    onDrop={(e) => handleDrop(e, col)}
                                >
                                    {/* Encabezado Columna */}
                                    <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/40">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{col}</span>
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                                                {colTasks.length}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setAddingToCol(col)}
                                            className="p-1 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                                            title="Añadir tarea a esta columna"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Contenedor Tarjetas de Tareas */}
                                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                                        {colTasks.map(task => {
                                            const isBeingDragged = draggedTaskId === task.id;
                                            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                            const completedSub = hasSubtasks ? task.subtasks!.filter(s => s.completed).length : 0;
                                            const totalSub = hasSubtasks ? task.subtasks!.length : 0;
                                            const isOverdue = task.due_date && !task.completed && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

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
                                                    className={`p-3 rounded-xl bg-white dark:bg-zinc-900 border transition-all cursor-grab active:cursor-grabbing group select-none shadow-2xs ${
                                                        isBeingDragged
                                                            ? 'opacity-30 border-dashed border-zinc-900 dark:border-white scale-[0.98]'
                                                            : 'border-gray-200 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 mt-0.5 shrink-0" />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTodo(task.id);
                                                            }}
                                                            className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors ${
                                                                task.completed
                                                                    ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black'
                                                                    : 'border-gray-300 dark:border-zinc-700 hover:border-zinc-500'
                                                            }`}
                                                        >
                                                            {task.completed && <Check className="w-3 h-3" />}
                                                        </button>
                                                        <p className={`text-xs flex-1 break-words leading-relaxed ${task.completed ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-900 dark:text-zinc-100 font-medium'}`}>
                                                            {task.text}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('¿Eliminar esta tarea?')) deleteTodo(task.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-opacity"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Meta chips en Blanco y Negro Minimalista */}
                                                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-zinc-800/60">
                                                        {task.priority && task.priority !== 'none' && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900">
                                                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                                            </span>
                                                        )}
                                                        {hasSubtasks && (
                                                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 flex items-center gap-0.5">
                                                                <CheckSquare className="w-2.5 h-2.5" />
                                                                {completedSub}/{totalSub}
                                                            </span>
                                                        )}
                                                        {task.due_date && (
                                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                                                isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 font-bold' : 'bg-zinc-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'
                                                            }`}>
                                                                <CalendarIcon className="w-2.5 h-2.5" />
                                                                {format(parseISO(task.due_date), 'd MMM', { locale: es })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isDragOver && (
                                            <div className="border-2 border-dashed border-zinc-900 dark:border-white rounded-xl p-3 text-center bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold animate-pulse">
                                                Soltar aquí
                                            </div>
                                        )}

                                        {colTasks.length === 0 && !isDragOver && (
                                            <div className="text-center py-8 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-400 dark:text-zinc-500 font-medium">
                                                No hay tareas en esta columna
                                            </div>
                                        )}

                                        {addingToCol === col ? (
                                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-900 dark:border-white shadow-md">
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
                                                    className="w-full text-base sm:text-xs p-1.5 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-medium"
                                                />
                                                <div className="flex justify-end gap-1.5 mt-2 pt-1 border-t border-gray-100 dark:border-zinc-800">
                                                    <button
                                                        onClick={() => { setAddingToCol(null); setNewTaskText(''); }}
                                                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickAdd(col)}
                                                        className="px-3 py-1 text-xs bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-bold"
                                                    >
                                                        Añadir
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setAddingToCol(col)}
                                                className="w-full py-2 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-1 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 border border-dashed border-gray-200 dark:border-zinc-800 transition-colors font-medium"
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
                    /* Vista Lista */
                    <div className="max-w-3xl mx-auto h-full flex flex-col">
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={listNewTask}
                                onChange={e => setListNewTask(e.target.value)}
                                onKeyDown={async e => {
                                    if (e.key === 'Enter' && listNewTask.trim()) {
                                        const text = listNewTask.trim();
                                        setListNewTask('');
                                        await addTodo(text, { projectId: project.id, kanban_column: columns[0] || 'Por hacer' } as any);
                                    }
                                }}
                                placeholder="Añadir una nueva tarea al proyecto..."
                                className="flex-1 px-4 py-2.5 text-base sm:text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 font-medium"
                            />
                            <button
                                onClick={async () => {
                                    if (listNewTask.trim()) {
                                        const text = listNewTask.trim();
                                        setListNewTask('');
                                        await addTodo(text, { projectId: project.id, kanban_column: columns[0] || 'Por hacer' } as any);
                                    }
                                }}
                                className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm rounded-xl hover:opacity-90 transition-opacity shadow-xs"
                            >
                                Añadir
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onEditTodo && onEditTodo(task)}
                                    className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer group shadow-2xs transition-all"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTodo(task.id);
                                            }}
                                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                                task.completed
                                                    ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black'
                                                    : 'border-gray-300 dark:border-zinc-700 hover:border-zinc-500'
                                            }`}
                                        >
                                            {task.completed && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={`text-sm truncate ${task.completed ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-900 dark:text-zinc-100 font-medium'}`}>
                                            {task.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                                            {task.kanban_column || 'Por hacer'}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('¿Eliminar esta tarea?')) deleteTodo(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredTasks.length === 0 && (
                                <div className="text-center py-12 text-sm text-gray-400 dark:text-zinc-500 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl font-medium">
                                    No hay tareas que coincidan con el filtro en este proyecto.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CREAR NUEVA TAREA (SE PONE EN POR HACER AUTOMÁTICAMENTE) */}
            {showQuickAddModal && (
                <div 
                    className="fixed inset-0 z-[100020] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setShowQuickAddModal(false)}
                >
                    <div 
                        className="w-full max-w-md bg-white dark:bg-[#111113] rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 space-y-4 shadow-2xl font-sans"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                Nueva Tarea en {project.name}
                            </h3>
                            <button onClick={() => setShowQuickAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNewTask} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                    Descripción de la tarea
                                </label>
                                <input
                                    type="text"
                                    value={quickTaskText}
                                    onChange={e => setQuickTaskText(e.target.value)}
                                    placeholder="Ej. Comprar materiales para el proyecto..."
                                    autoFocus
                                    required
                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 font-medium"
                                />
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 font-medium">
                                    Se añadirá automáticamente a la columna "{columns[0] || 'Por hacer'}".
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAddModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!quickTaskText.trim()}
                                    className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Crear Tarea
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

