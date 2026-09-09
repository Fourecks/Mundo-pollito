import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Todo, Project, Priority, Subtask, RecurrenceRule, CalendarProvider } from '../types';
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
    Folder, 
    ArrowLeft, 
    Trash2, 
    Check, 
    Mic, 
    MicOff, 
    CalendarRange, 
    ListTodo, 
    FileText, 
    RefreshCw,
    X
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
    onAddTodo?: (text: string, options?: { 
        projectId?: number | null; 
        isUndated?: boolean; 
        dueDate?: string;
        endDate?: string;
        priority?: Priority;
        startTime?: string;
        endTime?: string;
        notes?: string;
        subtasks?: Subtask[];
    }) => Promise<void> | void;
    onUpdateTodo?: (todo: Todo) => void;
    onDeleteTodo?: (id: number) => void;
    onRemoveFromCalendar?: (todoId: number) => Promise<void> | void;
    onSyncToCalendar?: (todo: Todo, provider?: CalendarProvider) => Promise<void> | void;
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
    onEditTodo,
    projects = [],
    onAddTodo,
    onUpdateTodo,
    onDeleteTodo,
    onRemoveFromCalendar,
    onSyncToCalendar,
    taskToEdit: externalTaskToEdit,
    setTaskToEdit: externalSetTaskToEdit
}) => {
    // Subpage navigation: 'list' | 'create' | 'edit'
    const [subPage, setSubPage] = useState<'list' | 'create' | 'edit'>('list');
    const [tabView, setTabView] = useState<'dated' | 'undated'>('dated');
    const [activeEditingTask, setActiveEditingTask] = useState<Todo | null>(null);

    // Sync external task to edit if triggered from outside
    useEffect(() => {
        if (externalTaskToEdit) {
            setActiveEditingTask(externalTaskToEdit);
            setSubPage('edit');
        }
    }, [externalTaskToEdit]);

    // Handle back navigation
    const handleBackToList = () => {
        setSubPage('list');
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

    // Sorted Tasks: incomplete first, high priority first, then completed
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

    // --- SUBPAGE: CREATE TASK FORM STATE ---
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState<Priority>('medium');
    const [newProjectId, setNewProjectId] = useState<number | null>(null);
    const [newIsUndated, setNewIsUndated] = useState(false);
    const [newDueDate, setNewDueDate] = useState(selectedDateKey);
    const [newHasEndDate, setNewHasEndDate] = useState(false);
    const [newEndDate, setNewEndDate] = useState(selectedDateKey);
    const [newHasTime, setNewHasTime] = useState(false);
    const [newStartTime, setNewStartTime] = useState('09:00');
    const [newEndTime, setNewEndTime] = useState('10:00');
    const [newNotes, setNewNotes] = useState('');
    const [newSubtasks, setNewSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskInput, setNewSubtaskInput] = useState('');
    const [isListeningCreate, setIsListeningCreate] = useState(false);

    const handleOpenCreatePage = () => {
        setNewTitle('');
        setNewPriority('medium');
        setNewProjectId(null);
        setNewIsUndated(false);
        setNewDueDate(selectedDateKey);
        setNewHasEndDate(false);
        setNewEndDate(selectedDateKey);
        setNewHasTime(false);
        setNewStartTime('09:00');
        setNewEndTime('10:00');
        setNewNotes('');
        setNewSubtasks([]);
        setNewSubtaskInput('');
        setSubPage('create');
    };

    const handleAddSubtaskCreate = () => {
        if (!newSubtaskInput.trim()) return;
        setNewSubtasks(prev => [...prev, { id: Date.now(), text: newSubtaskInput.trim(), completed: false }]);
        setNewSubtaskInput('');
    };

    const handleRemoveSubtaskCreate = (id: number) => {
        setNewSubtasks(prev => prev.filter(st => st.id !== id));
    };

    const handleSaveNewTask = async () => {
        if (!newTitle.trim()) return;
        
        let subtasksToSave = [...newSubtasks];
        if (newSubtaskInput.trim()) {
            subtasksToSave.push({ id: Date.now(), text: newSubtaskInput.trim(), completed: false });
        }

        if (onAddTodo) {
            await onAddTodo(newTitle.trim(), {
                projectId: newProjectId,
                isUndated: newIsUndated,
                dueDate: newIsUndated ? undefined : newDueDate,
                endDate: newIsUndated || !newHasEndDate ? undefined : newEndDate,
                priority: newPriority,
                startTime: newHasTime && !newIsUndated ? newStartTime : undefined,
                endTime: newHasTime && !newIsUndated ? newEndTime : undefined,
                notes: newNotes.trim() ? newNotes.trim() : undefined,
                subtasks: subtasksToSave.length > 0 ? subtasksToSave : undefined
            });
        }
        handleBackToList();
    };

    // --- SUBPAGE: EDIT TASK FORM STATE ---
    const [editTitle, setEditTitle] = useState('');
    const [editCompleted, setEditCompleted] = useState(false);
    const [editPriority, setEditPriority] = useState<Priority>('medium');
    const [editProjectId, setEditProjectId] = useState<number | null>(null);
    const [editIsUndated, setEditIsUndated] = useState(false);
    const [editDueDate, setEditDueDate] = useState('');
    const [editHasEndDate, setEditHasEndDate] = useState(false);
    const [editEndDate, setEditEndDate] = useState('');
    const [editHasTime, setEditHasTime] = useState(false);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editSubtasks, setEditSubtasks] = useState<Subtask[]>([]);
    const [editSubtaskInput, setEditSubtaskInput] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleOpenEditPage = (task: Todo) => {
        setActiveEditingTask(task);
        setEditTitle(task.text || '');
        setEditCompleted(task.completed || false);
        setEditPriority(task.priority || 'medium');
        setEditProjectId(task.project_id || null);
        setEditIsUndated(!task.due_date);
        setEditDueDate(task.due_date || selectedDateKey);
        setEditHasEndDate(!!task.end_date);
        setEditEndDate(task.end_date || task.due_date || selectedDateKey);
        setEditHasTime(!!task.start_time);
        setEditStartTime(task.start_time || '09:00');
        setEditEndTime(task.end_time || '10:00');
        setEditNotes(task.notes || '');
        setEditSubtasks(task.subtasks || []);
        setEditSubtaskInput('');
        setShowDeleteConfirm(false);
        setSubPage('edit');
    };

    const handleAddSubtaskEdit = () => {
        if (!editSubtaskInput.trim()) return;
        setEditSubtasks(prev => [...prev, { id: Date.now(), text: editSubtaskInput.trim(), completed: false }]);
        setEditSubtaskInput('');
    };

    const handleToggleSubtaskEdit = (id: number) => {
        setEditSubtasks(prev => prev.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
    };

    const handleRemoveSubtaskEdit = (id: number) => {
        setEditSubtasks(prev => prev.filter(st => st.id !== id));
    };

    const handleSaveEditTask = () => {
        if (!activeEditingTask || !editTitle.trim()) return;

        let subtasksToSave = [...editSubtasks];
        if (editSubtaskInput.trim()) {
            subtasksToSave.push({ id: Date.now(), text: editSubtaskInput.trim(), completed: false });
        }

        const updatedTask: Todo = {
            ...activeEditingTask,
            text: editTitle.trim(),
            completed: editCompleted,
            priority: editPriority,
            project_id: editProjectId,
            due_date: editIsUndated ? null : (editDueDate || null),
            end_date: editIsUndated || !editHasEndDate ? undefined : editEndDate,
            start_time: editHasTime && !editIsUndated ? editStartTime : undefined,
            end_time: editHasTime && !editIsUndated ? editEndTime : undefined,
            notes: editNotes.trim() ? editNotes.trim() : undefined,
            subtasks: subtasksToSave
        };

        if (onUpdateTodo) {
            onUpdateTodo(updatedTask);
        }
        handleBackToList();
    };

    const handleDeleteTaskAction = () => {
        if (!activeEditingTask) return;
        if (onDeleteTodo) {
            onDeleteTodo(activeEditingTask.id);
        }
        handleBackToList();
    };

    // Voice recognition helper
    const toggleSpeechRecognition = (type: 'create' | 'edit') => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (type === 'create') {
            if (isListeningCreate) {
                setIsListeningCreate(false);
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.onstart = () => setIsListeningCreate(true);
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setNewTitle(prev => (prev ? `${prev} ${transcript}` : transcript));
            };
            recognition.onend = () => setIsListeningCreate(false);
            recognition.onerror = () => setIsListeningCreate(false);
            recognition.start();
        }
    };

    // ==========================================
    // PAGE 2: CREATE TASK (PÁGINA NUEVA TAREA)
    // ==========================================
    if (subPage === 'create') {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-32">
                {/* Sticky Top Header */}
                <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={handleBackToList}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                    </button>
                    <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Nueva Tarea</h2>
                    <button 
                        type="button"
                        onClick={handleSaveNewTask}
                        disabled={!newTitle.trim()}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 disabled:opacity-40 active:scale-95 transition-all shadow-xs"
                    >
                        Guardar
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 px-5 pt-5 space-y-6 max-w-lg mx-auto w-full">
                    {/* Title and Voice Recognition */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Título de la Tarea</label>
                        <div className="relative">
                            <textarea 
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="¿Qué necesitas hacer?"
                                rows={2}
                                autoFocus
                                className="w-full px-4 py-3 text-base rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all resize-none text-zinc-900 dark:text-zinc-50 placeholder-zinc-400"
                            />
                            <button
                                type="button"
                                onClick={() => toggleSpeechRecognition('create')}
                                className={`absolute right-3 bottom-3 p-2 rounded-xl transition-colors ${
                                    isListeningCreate 
                                        ? 'bg-red-500 text-white animate-pulse' 
                                        : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                }`}
                                title="Dictar por voz"
                            >
                                {isListeningCreate ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Fecha y Rango de Días */}
                    <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                                <span>Asignación de Fecha</span>
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer text-zinc-500">
                                <input 
                                    type="checkbox" 
                                    checked={newIsUndated} 
                                    onChange={e => setNewIsUndated(e.target.checked)}
                                    className="rounded-md border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                                />
                                <span>Sin fecha</span>
                            </label>
                        </div>

                        {!newIsUndated && (
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500">Tipo de asignación</span>
                                    <div className="flex bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setNewHasEndDate(false)}
                                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${!newHasEndDate ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                                        >
                                            Día único
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewHasEndDate(true);
                                                if (!newEndDate) setNewEndDate(newDueDate);
                                            }}
                                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${newHasEndDate ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                                        >
                                            Rango de días
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <span className="text-[11px] font-semibold text-zinc-500 block mb-1">
                                            {newHasEndDate ? 'Fecha de inicio' : 'Fecha'}
                                        </span>
                                        <input 
                                            type="date"
                                            value={newDueDate}
                                            onChange={e => setNewDueDate(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                                        />
                                    </div>

                                    {newHasEndDate && (
                                        <div>
                                            <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Fecha de término</span>
                                            <input 
                                                type="date"
                                                value={newEndDate}
                                                min={newDueDate}
                                                onChange={e => setNewEndDate(e.target.value)}
                                                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                                            />
                                        </div>
                                    )}
                                </div>

                                {newHasEndDate && (
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 p-2 rounded-xl">
                                        ✨ Si la tarea no se completa, pasará automáticamente al día siguiente hasta completarse o alcanzar la fecha final.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Prioridad */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as Priority[]).map(p => {
                                const labels: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
                                const colors: Record<Priority, string> = {
                                    low: 'text-zinc-500 border-zinc-200 dark:border-zinc-800',
                                    medium: 'text-amber-500 border-amber-300 dark:border-amber-800/80',
                                    high: 'text-rose-500 border-rose-300 dark:border-rose-800/80'
                                };
                                const activeStyles: Record<Priority, string> = {
                                    low: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-400 dark:border-zinc-600 font-bold',
                                    medium: 'bg-amber-500/10 border-amber-500 font-bold',
                                    high: 'bg-rose-500/10 border-rose-500 font-bold'
                                };

                                const isSelected = newPriority === p;

                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setNewPriority(p)}
                                        className={`py-2.5 px-3 rounded-2xl border text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                            isSelected ? activeStyles[p] : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                                        }`}
                                    >
                                        <Flag className={`w-3.5 h-3.5 ${colors[p]}`} />
                                        <span>{labels[p]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Proyecto */}
                    {projects.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Proyecto</label>
                            <select
                                value={newProjectId || ''}
                                onChange={e => setNewProjectId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                            >
                                <option value="">Sin proyecto asociado</option>
                                {projects.map(pr => (
                                    <option key={pr.id} value={pr.id}>
                                        {pr.emoji ? `${pr.emoji} ` : ''}{pr.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Subtareas */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Subtareas</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={newSubtaskInput}
                                onChange={e => setNewSubtaskInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtaskCreate(); } }}
                                placeholder="Añadir paso o subtarea..."
                                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                            />
                            <button
                                type="button"
                                onClick={handleAddSubtaskCreate}
                                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95"
                            >
                                Añadir
                            </button>
                        </div>

                        {newSubtasks.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                {newSubtasks.map(st => (
                                    <div key={st.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                                        <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">{st.text}</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveSubtaskCreate(st.id)}
                                            className="text-zinc-400 hover:text-rose-500 p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notas Adicionales</label>
                        <textarea 
                            value={newNotes}
                            onChange={e => setNewNotes(e.target.value)}
                            placeholder="Detalles, enlaces o recordatorios..."
                            rows={3}
                            className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 resize-none focus:outline-hidden"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE 3: EDIT TASK (PÁGINA DETALLES DE TAREA)
    // ==========================================
    if (subPage === 'edit' && activeEditingTask) {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-32">
                {/* Sticky Top Header */}
                <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={handleBackToList}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                    </button>
                    <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Detalles de Tarea</h2>
                    <button 
                        type="button"
                        onClick={handleSaveEditTask}
                        disabled={!editTitle.trim()}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 disabled:opacity-40 active:scale-95 transition-all shadow-xs"
                    >
                        Guardar
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 px-5 pt-5 space-y-6 max-w-lg mx-auto w-full">
                    {/* Status Toggle & Title */}
                    <div className="flex items-start gap-3">
                        <button
                            type="button"
                            onClick={() => setEditCompleted(!editCompleted)}
                            className="mt-1 shrink-0"
                        >
                            {editCompleted ? (
                                <CheckCircle2 className="w-7 h-7 text-emerald-500 fill-emerald-500/20" />
                            ) : (
                                <Circle className="w-7 h-7 text-zinc-300 dark:text-zinc-700" />
                            )}
                        </button>
                        <div className="flex-1">
                            <textarea 
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                rows={2}
                                className={`w-full px-3.5 py-2.5 text-base font-semibold rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 resize-none focus:outline-hidden ${
                                    editCompleted ? 'line-through text-zinc-400' : ''
                                }`}
                            />
                        </div>
                    </div>

                    {/* Fecha y Rango de Días */}
                    <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                                <span>Asignación de Fecha</span>
                            </div>
                            <label className="flex items-center gap-2 text-xs cursor-pointer text-zinc-500">
                                <input 
                                    type="checkbox" 
                                    checked={editIsUndated} 
                                    onChange={e => setEditIsUndated(e.target.checked)}
                                    className="rounded-md border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                                />
                                <span>Sin fecha</span>
                            </label>
                        </div>

                        {!editIsUndated && (
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500">Tipo de asignación</span>
                                    <div className="flex bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setEditHasEndDate(false)}
                                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${!editHasEndDate ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                                        >
                                            Día único
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditHasEndDate(true);
                                                if (!editEndDate) setEditEndDate(editDueDate || selectedDateKey);
                                            }}
                                            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${editHasEndDate ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                                        >
                                            Rango de días
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <span className="text-[11px] font-semibold text-zinc-500 block mb-1">
                                            {editHasEndDate ? 'Fecha de inicio' : 'Fecha'}
                                        </span>
                                        <input 
                                            type="date"
                                            value={editDueDate || ''}
                                            onChange={e => setEditDueDate(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                                        />
                                    </div>

                                    {editHasEndDate && (
                                        <div>
                                            <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Fecha de término</span>
                                            <input 
                                                type="date"
                                                value={editEndDate || ''}
                                                min={editDueDate || undefined}
                                                onChange={e => setEditEndDate(e.target.value)}
                                                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                                            />
                                        </div>
                                    )}
                                </div>

                                {editHasEndDate && (
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 p-2 rounded-xl">
                                        ✨ Si la tarea no se completa, pasará automáticamente al día siguiente hasta completarse o alcanzar la fecha final.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Prioridad */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioridad</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as Priority[]).map(p => {
                                const labels: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
                                const colors: Record<Priority, string> = {
                                    low: 'text-zinc-500 border-zinc-200 dark:border-zinc-800',
                                    medium: 'text-amber-500 border-amber-300 dark:border-amber-800/80',
                                    high: 'text-rose-500 border-rose-300 dark:border-rose-800/80'
                                };
                                const activeStyles: Record<Priority, string> = {
                                    low: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-400 dark:border-zinc-600 font-bold',
                                    medium: 'bg-amber-500/10 border-amber-500 font-bold',
                                    high: 'bg-rose-500/10 border-rose-500 font-bold'
                                };

                                const isSelected = editPriority === p;

                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setEditPriority(p)}
                                        className={`py-2.5 px-3 rounded-2xl border text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                            isSelected ? activeStyles[p] : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                                        }`}
                                    >
                                        <Flag className={`w-3.5 h-3.5 ${colors[p]}`} />
                                        <span>{labels[p]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Proyecto */}
                    {projects.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Proyecto</label>
                            <select
                                value={editProjectId || ''}
                                onChange={e => setEditProjectId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                            >
                                <option value="">Sin proyecto asociado</option>
                                {projects.map(pr => (
                                    <option key={pr.id} value={pr.id}>
                                        {pr.emoji ? `${pr.emoji} ` : ''}{pr.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Subtareas */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Subtareas</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={editSubtaskInput}
                                onChange={e => setEditSubtaskInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtaskEdit(); } }}
                                placeholder="Añadir paso o subtarea..."
                                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                            />
                            <button
                                type="button"
                                onClick={handleAddSubtaskEdit}
                                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95"
                            >
                                Añadir
                            </button>
                        </div>

                        {editSubtasks.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                {editSubtasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSubtaskEdit(st.id)}
                                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                        >
                                            {st.completed ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-zinc-400" />
                                            )}
                                        </button>
                                        <span className={`flex-1 truncate ${st.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300 font-medium'}`}>
                                            {st.text}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveSubtaskEdit(st.id)}
                                            className="text-zinc-400 hover:text-rose-500 p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notas</label>
                        <textarea 
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Detalles de la tarea..."
                            rows={3}
                            className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 resize-none focus:outline-hidden"
                        />
                    </div>

                    {/* Eliminar Tarea */}
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        {showDeleteConfirm ? (
                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 text-center">
                                <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                                    ¿Estás seguro de eliminar esta tarea?
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-1.5 text-xs font-medium rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteTaskAction}
                                        className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white shadow-xs"
                                    >
                                        Sí, eliminar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 active:bg-rose-50 dark:active:bg-rose-950/50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar Tarea</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE 1: TASK LIST (PÁGINA PRINCIPAL TAREAS)
    // ==========================================
    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-8 px-4 sm:px-6">
            {/* Header: Title and Add Task Button */}
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Tareas</h1>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                        {completedCount} de {totalCount} completadas
                    </p>
                </div>
                <button 
                    type="button"
                    onClick={handleOpenCreatePage}
                    className="w-11 h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md"
                    title="Nueva Tarea"
                    aria-label="Nueva Tarea"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Selector de Día (Día Anterior, Día Actual / Hoy, Día Siguiente) */}
            <div className="flex items-center justify-between mb-4 bg-zinc-100/70 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                <button 
                    type="button"
                    onClick={handlePrevDay} 
                    className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    aria-label="Día anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button 
                    type="button"
                    onClick={handleResetToToday}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-zinc-800 dark:text-zinc-200"
                >
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{isSelectedToday ? `Hoy (${format(selectedDate, 'd MMM', { locale: es })})` : getRelativeDateLabel(selectedDate)}</span>
                </button>

                <button 
                    type="button"
                    onClick={handleNextDay} 
                    className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    aria-label="Día siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* View Filter Tabs: Para este día vs Sin Fecha */}
            <div className="flex space-x-2 mb-4">
                <button 
                    type="button"
                    onClick={() => setTabView('dated')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        tabView === 'dated' 
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
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
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        tabView === 'undated' 
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
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

            {/* Barra de Progreso del Día */}
            {totalCount > 0 && (
                <div className="mb-5 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{progress}%</span>
                </div>
            )}

            {/* Lista de Tareas */}
            <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                    {sortedTasks.map(task => {
                        const project = projects.find(p => p.id === task.project_id);
                        const isRange = !!task.due_date && !!task.end_date && task.end_date > task.due_date;
                        const subtasksCount = task.subtasks?.length || 0;
                        const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={task.id}
                                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.99] ${
                                    task.completed 
                                        ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/40 dark:border-zinc-800/40 opacity-60' 
                                        : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xs'
                                }`}
                            >
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTodo(task.id);
                                    }}
                                    className="mt-0.5 shrink-0"
                                    aria-label={`Marcar ${task.text} como ${task.completed ? 'incompleta' : 'completada'}`}
                                >
                                    {task.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500" />
                                    )}
                                </button>
                                
                                <div 
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleOpenEditPage(task)}
                                >
                                    <h3 className={`text-sm font-medium leading-snug ${
                                        task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                                    }`}>
                                        {task.text}
                                    </h3>
                                    
                                    {/* Badges / Tags */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-medium">
                                        {/* Multi-day Range Badge */}
                                        {isRange && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                                                <CalendarRange className="w-3 h-3" />
                                                <span>Rango: {format(new Date(task.due_date! + 'T00:00:00'), 'd MMM', { locale: es })} - {format(new Date(task.end_date! + 'T00:00:00'), 'd MMM', { locale: es })}</span>
                                            </span>
                                        )}

                                        {/* Time Badge */}
                                        {task.start_time && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                <Clock className="w-3 h-3 text-zinc-400" />
                                                <span>{task.start_time}{task.end_time ? ` - ${task.end_time}` : ''}</span>
                                            </span>
                                        )}

                                        {/* Project Badge */}
                                        {project && (
                                            <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                                <div 
                                                    className="w-2 h-2 rounded-full" 
                                                    style={{ backgroundColor: project.color || '#a1a1aa' }}
                                                />
                                                <span>{project.emoji ? `${project.emoji} ` : ''}{project.name}</span>
                                            </span>
                                        )}

                                        {/* Priority Badge */}
                                        {task.priority !== 'low' && (
                                            <span className={`inline-flex items-center gap-1 ${
                                                task.priority === 'high' ? 'text-rose-500 font-semibold' : 'text-amber-500 font-medium'
                                            }`}>
                                                <Flag className="w-3 h-3" />
                                                <span>{task.priority === 'high' ? 'Alta' : 'Media'}</span>
                                            </span>
                                        )}

                                        {/* Subtasks Count */}
                                        {subtasksCount > 0 && (
                                            <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                                                <CheckSquare className="w-3 h-3" />
                                                <span>{completedSubtasks}/{subtasksCount}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                
                {sortedTasks.length === 0 && (
                    <div className="text-center py-16 px-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            {tabView === 'dated' ? 'No hay tareas para este día' : 'No hay tareas sin fecha'}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Toca el botón + para añadir una tarea a esta vista.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileTasks;
