import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Todo, Priority, Project, GoogleCalendarEvent } from '../types';
import ProgressBar from './ProgressBar';
import TodoInput from './TodoInput';
import TodoItem from './TodoItem';
import ChickenIcon from './ChickenIcon';
import SortIcon from './icons/SortIcon';
import Calendar from './Calendar';
import CalendarIcon from './icons/CalendarIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import TrashIcon from './icons/TrashIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import PlusIcon from './icons/PlusIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import ConfirmationModal from './ConfirmationModal';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ConfirmationModalWithOptions from './ConfirmationModalWithOptions';

interface TodoListModuleProps {
    allTodos: { [key: string]: Todo[] };
    addTodo: (text: string, options?: { projectId?: number | null; isUndated?: boolean }) => Promise<void>;
    toggleTodo: (id: number) => void;
    toggleSubtask: (taskId: number, subtaskId: number) => void;
    deleteTodo: (id: number) => void;
    updateTodo: (todo: Todo) => void;
    onEditTodo: (todo: Todo) => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    datesWithTasks: Set<string>;
    datesWithAllTasksCompleted: Set<string>;
    isMobile?: boolean;
    onClearPastTodos: () => void;
    projects: Project[];
    onAddProject: (name: string, emoji: string | null) => Promise<Project | null>;
    onUpdateProject: (projectId: number, name: string, emoji: string | null) => Promise<void>;
    onDeleteProject: (projectId: number) => Promise<void>;
    onDeleteProjectAndTasks: (projectId: number) => Promise<void>;
    onViewProjectChange?: (projectId: number | null) => void;
    calendarEvents: GoogleCalendarEvent[];
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const priorityOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

const TodoListModule: React.FC<TodoListModuleProps> = (props) => {
    const {
        allTodos, addTodo, toggleTodo, toggleSubtask, deleteTodo, updateTodo, onEditTodo,
        selectedDate, setSelectedDate, datesWithTasks, datesWithAllTasksCompleted,
        isMobile = false, onClearPastTodos, projects, onAddProject, onUpdateProject,
        onDeleteProject, onDeleteProjectAndTasks, onViewProjectChange, calendarEvents
    } = props;
    // Common State
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>('tasks');

    // State for 'Tasks' tab
    const [sortBy, setSortBy] = useState<'default' | 'priority' | 'dueDate'>('default');
    const [hideCompleted, setHideCompleted] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [isCalendarPanelVisible, setIsCalendarPanelVisible] = useState(!isMobile);
    const [isNarrow, setIsNarrow] = useState(false);
    
    // State for 'Projects' tab
    const [viewingProject, setViewingProject] = useState<Project | null>(null);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectEmoji, setNewProjectEmoji] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
    const [editingProject, setEditingProject] = useState<{ id: number; name: string; emoji: string | null; } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Memoized calculations
    const todosForSelectedDate = useMemo(() => {
        const dateKey = formatDateKey(selectedDate);
        const todayKey = formatDateKey(new Date());
        
        const dailyTodos = (allTodos && allTodos[dateKey]) || [];
        // Only include undated tasks if we are looking at today's date
        const undatedTodos = (allTodos && dateKey === todayKey && allTodos['undated']) ? allTodos['undated'] : [];
        
        return [...dailyTodos, ...undatedTodos];
    }, [allTodos, selectedDate]);
    const allTasksFlat = useMemo(() => Object.values(allTodos || {}).flat(), [allTodos]);

    const projectsWithProgress = useMemo(() => {
        return (projects || []).map(project => {
            const projectTasks = allTasksFlat.filter(t => t.project_id === project.id);
            const completedTasks = projectTasks.filter(t => t.completed).length;
            return { ...project, total: projectTasks.length, completed: completedTasks };
        });
    }, [projects, allTasksFlat]);
    
    // Resize Observer for responsive layout
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) setIsNarrow(entry.contentRect.width < 600);
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => { if (isNarrow && isCalendarPanelVisible) setIsCalendarPanelVisible(false); }, [isNarrow, isCalendarPanelVisible]);

    // Handlers for 'Tasks' tab
    // FIX: Changed to non-functional update to match prop type (date: Date) => void.
    const handlePrevDay = () => { const newDate = new Date(selectedDate); newDate.setDate(newDate.getDate() - 1); setSelectedDate(newDate); };
    const handleNextDay = () => { const newDate = new Date(selectedDate); newDate.setDate(newDate.getDate() + 1); setSelectedDate(newDate); };
    const toggleSort = () => setSortBy(p => p === 'default' ? 'priority' : p === 'priority' ? 'dueDate' : 'default');
    const getSortButtonText = () => sortBy === 'priority' ? 'Prioridad' : sortBy === 'dueDate' ? 'Fecha' : 'Original';
    
    const sortedTodos = useMemo(() => {
        const todosCopy = [...(hideCompleted ? todosForSelectedDate.filter(t => !t.completed) : todosForSelectedDate)];
        if (sortBy === 'priority') return todosCopy.sort((a, b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || priorityOrder[b.priority] - priorityOrder[a.priority] || a.id - b.id);
        if (sortBy === 'dueDate') return todosCopy.sort((a, b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime() || a.id - b.id);
        return todosCopy.sort((a, b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || a.id - b.id);
    }, [todosForSelectedDate, sortBy, hideCompleted]);

    const formattedDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate).replace(/^\w/, c => c.toUpperCase());
    const completedCount = todosForSelectedDate.filter(t => t.completed).length;

    // Handlers for 'Projects' tab
    const handleAddProject = async () => {
        if (newProjectName.trim()) {
            await onAddProject(newProjectName.trim(), newProjectEmoji);
            setNewProjectName('');
            setNewProjectEmoji(null);
            setIsAddingProject(false);
        }
    };
    
    const handleSaveProjectName = () => {
        if (editingProject && editingProject.name.trim()) {
            onUpdateProject(editingProject.id, editingProject.name.trim(), editingProject.emoji);
        }
        setEditingProject(null);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenFor(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const CircularProgressWithChicken = ({ percentage, emoji }: { percentage: number, emoji?: string | null }) => {
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary-light/50 dark:text-gray-700" />
                    <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="text-primary transform -rotate-90 origin-center transition-all duration-700 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    {emoji ? (
                        <span className="text-3xl sm:text-4xl drop-shadow-sm">{emoji}</span>
                    ) : (
                        <ChickenIcon className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-dark drop-shadow-sm" />
                    )}
                </div>
            </div>
        );
    };

    const renderProjectsView = () => {
        if (viewingProject) {
            const projectTasks = allTasksFlat.filter(t => t.project_id === viewingProject.id);
            const completedTasks = projectTasks.filter(t => t.completed).length;
            const percentage = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
            
            const radius = 60;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (percentage / 100) * circumference;
        
            return (
                <div className="flex flex-col h-full animate-fade-in">
                    
                    <div className="relative flex flex-col items-center justify-center p-6 flex-shrink-0">
                        <button onClick={() => { setViewingProject(null); onViewProjectChange?.(null); }} className="absolute top-3 left-3 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 z-10">
                            <ChevronLeftIcon />
                        </button>
                        <div className="relative w-36 h-36">
                            <svg className="w-full h-full" viewBox="0 0 140 140">
                                <circle cx="70" cy="70" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-secondary-light/50 dark:text-gray-700" />
                                <circle cx="70" cy="70" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="text-primary transform -rotate-90 origin-center transition-all duration-700 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                {viewingProject.emoji ? (
                                    <span className="text-5xl drop-shadow-sm">{viewingProject.emoji}</span>
                                ) : (
                                    <ChickenIcon className="w-16 h-16 text-secondary-dark drop-shadow-sm" />
                                )}
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-primary-dark dark:text-primary mt-4">{viewingProject.name}</h2>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">{completedTasks} de {projectTasks.length} completadas</p>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-4 pt-0 space-y-3">
                        {projectTasks.length > 0 ? (
                            [...projectTasks]
                                .sort((a,b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || (new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()))
                                .map(todo => <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onToggleSubtask={toggleSubtask} onDelete={deleteTodo} onUpdate={updateTodo} onEdit={onEditTodo} />)
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-10">Este proyecto no tiene tareas. ¡Añade una!</p>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <header className="flex-shrink-0 p-4 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-primary-dark dark:text-primary">Mis Proyectos</h2>
                </header>
                <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {projectsWithProgress.map(project => {
                            const percentage = project.total > 0 ? (project.completed / project.total) * 100 : 0;
                            return (
                                <div key={project.id} className="relative group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-between gap-2">
                                    <div className="absolute top-2 right-2 z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpenFor(project.id);
                                            }}
                                            className="p-1.5 rounded-full text-gray-500 hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                                            aria-label={`Opciones para ${project.name}`}
                                        >
                                            <DotsVerticalIcon />
                                        </button>
                                        {menuOpenFor === project.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-1 w-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl z-20 animate-pop-in origin-top-right p-1">
                                                <button onClick={() => { setEditingProject({ id: project.id, name: project.name, emoji: project.emoji || null }); setMenuOpenFor(null); }} className="w-full text-left px-3 py-1.5 text-sm rounded-md text-gray-700 dark:text-gray-200 hover:bg-secondary-lighter dark:hover:bg-gray-700">
                                                    Renombrar
                                                </button>
                                                <button onClick={() => { setProjectToDelete(project); setMenuOpenFor(null); }} className="w-full text-left px-3 py-1.5 text-sm rounded-md text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40">
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => { if (!editingProject) { setViewingProject(project); onViewProjectChange?.(project.id); } }} className="w-full h-full p-4 text-center flex flex-col items-center justify-between gap-2">
                                        {editingProject?.id === project.id ? (
                                            <input
                                                type="text"
                                                value={editingProject.emoji || ''}
                                                onChange={(e) => setEditingProject(p => p ? { ...p, emoji: e.target.value } : null)}
                                                placeholder="✨"
                                                className="w-12 h-12 text-2xl text-center rounded-full bg-white dark:bg-gray-700 border-2 border-secondary-light dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                                                maxLength={4}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        ) : (
                                            <CircularProgressWithChicken percentage={percentage} emoji={project.emoji} />
                                        )}
                                        <div className="w-full">
                                            {editingProject?.id === project.id ? (
                                                <input
                                                    type="text"
                                                    value={editingProject.name}
                                                    onChange={(e) => setEditingProject(p => p ? { ...p, name: e.target.value } : null)}
                                                    onBlur={handleSaveProjectName}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProjectName(); }}
                                                    className="w-full bg-white dark:bg-gray-700 text-base p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-center font-bold"
                                                    autoFocus
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <h3 className="font-bold text-base text-gray-800 dark:text-gray-200 truncate">{project.name}</h3>
                                            )}
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{project.completed} / {project.total} completadas</p>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                        <div className="bg-white/50 dark:bg-gray-800/50 border-2 border-dashed border-secondary-light dark:border-gray-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 aspect-square">
                            {isAddingProject ? (
                                <>
                                    <input
                                        type="text"
                                        value={newProjectEmoji || ''}
                                        onChange={(e) => setNewProjectEmoji(e.target.value)}
                                        placeholder="✨"
                                        className="w-12 h-12 text-2xl text-center rounded-full bg-white dark:bg-gray-700 border-2 border-secondary-light dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
                                        maxLength={4}
                                    />
                                    <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => {if (e.key === 'Enter') handleAddProject()}} placeholder="Nombre del proyecto" className="w-full bg-white dark:bg-gray-700 text-sm p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-center" autoFocus />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setIsAddingProject(false); setNewProjectName(''); setNewProjectEmoji(null); }} className="mt-2 text-xs font-semibold text-gray-500 px-3 py-1 bg-gray-200/50 rounded-full">Cancelar</button>
                                        <button onClick={handleAddProject} className="mt-2 text-xs font-semibold text-primary px-3 py-1 bg-primary-light/50 rounded-full">Guardar</button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={() => setIsAddingProject(true)} className="text-center text-gray-500 dark:text-gray-400 hover:text-primary-dark dark:hover:text-primary transition-colors">
                                    <PlusIcon />
                                    <span className="text-sm font-semibold mt-1 block">Nuevo Proyecto</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div ref={containerRef} className="w-full bg-transparent flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center p-1 bg-black/5 dark:bg-black/20">
                <button onClick={() => setActiveTab('tasks')} className={`w-1/2 py-1 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'tasks' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>Tareas</button>
                <button onClick={() => setActiveTab('projects')} className={`w-1/2 py-1 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'projects' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>Proyectos</button>
            </div>

            <div className="flex-grow overflow-hidden">
                {activeTab === 'tasks' && (
                     <div className="flex flex-col md:flex-row h-full">
                        <div className={`hidden md:flex flex-col flex-shrink-0 border-r border-secondary-light/30 dark:border-gray-700 transition-all duration-300 ease-in-out ${isCalendarPanelVisible ? 'w-full md:w-[260px] p-2' : 'w-0 p-0 overflow-hidden'}`}>
                            <Calendar selectedDate={selectedDate} setDate={setSelectedDate} datesWithTasks={datesWithTasks} datesWithAllTasksCompleted={datesWithAllTasksCompleted} calendarEvents={calendarEvents} />
                        </div>
                        <div className="flex-grow relative flex flex-col overflow-hidden">
                            <div className="absolute -top-10 -left-10 opacity-10 dark:opacity-20 transform rotate-12 -z-10"><ChickenIcon className="w-40 h-40 text-secondary"/></div>
                            <div className="absolute -bottom-12 -right-12 opacity-10 dark:opacity-20 transform -rotate-12 -z-10"><ChickenIcon className="w-48 h-48 text-primary"/></div>
                            <div className={`flex-shrink-0 ${isMobile ? 'sticky top-0 bg-secondary-lighter/80 dark:bg-gray-800/80 backdrop-blur-md z-20 border-b border-secondary-light/50 dark:border-gray-700/50' : ''}`}>
                                <div className="p-3 md:p-4">
                                    {isMobile ? (
                                        <div className="flex justify-between items-center"><button onClick={handlePrevDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día anterior"><ChevronLeftIcon /></button><button onClick={() => setCalendarVisible(true)} className="px-3 py-1.5 rounded-full hover:bg-white/70 dark:hover:bg-gray-700/70 transition-colors"><h2 className="text-lg font-bold text-primary-dark dark:text-primary text-center">{formattedDate}</h2></button><button onClick={handleNextDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día siguiente"><ChevronRightIcon /></button></div>
                                    ) : (
                                        <div className="flex justify-between items-center"><div className="flex items-center gap-1 sm:gap-2"><button onClick={() => setIsCalendarPanelVisible(!isCalendarPanelVisible)} className="hidden md:flex p-2 items-center justify-center rounded-full hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 hover:text-primary-dark transition-colors" aria-label={isCalendarPanelVisible ? 'Ocultar calendario' : 'Mostrar calendario'}><ChevronLeftIcon className={`h-5 w-5 transition-transform duration-300 ${!isCalendarPanelVisible ? 'rotate-180' : ''}`}/></button><div className="flex items-center"><button onClick={handlePrevDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día anterior"><ChevronLeftIcon /></button><h2 className="text-lg sm:text-xl font-bold text-primary-dark dark:text-primary text-center w-40 sm:w-auto flex-shrink-0">{formattedDate}</h2><button onClick={handleNextDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día siguiente"><ChevronRightIcon /></button></div></div><button onClick={() => setCalendarVisible(true)} className="md:hidden flex items-center gap-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm p-2 rounded-full shadow-sm text-primary dark:text-primary-dark hover:bg-primary-light/50 dark:hover:bg-primary/20 transition-colors" aria-label="Abrir calendario"><CalendarIcon /></button></div>
                                    )}
                                    <p className="text-gray-500 dark:text-gray-300 text-sm mt-1 text-center md:text-left">{todosForSelectedDate.length > 0 ? `${completedCount} de ${todosForSelectedDate.length} tareas completadas.` : '¡Añade una tarea para empezar!'}</p>
                                    <ProgressBar completed={completedCount} total={todosForSelectedDate.length} />
                                    <div className="flex flex-wrap justify-between items-center mt-4 mb-2 gap-3"><label htmlFor="hide-completed-toggle" className="flex items-center cursor-pointer select-none"><div className="relative"><input type="checkbox" id="hide-completed-toggle" className="sr-only" checked={hideCompleted} onChange={() => setHideCompleted(!hideCompleted)} /><div className={`block w-10 h-6 rounded-full transition-colors ${hideCompleted ? 'bg-primary-light' : 'bg-gray-200 dark:bg-gray-600'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideCompleted ? 'translate-x-full' : ''}`}></div></div><div className="ml-2 text-sm font-semibold text-gray-500 dark:text-gray-300">Ocultar completadas</div></label><div className="flex items-center gap-2 sm:gap-4"><button onClick={onClearPastTodos} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/30" title="Limpiar tareas anteriores al día actual"><TrashIcon className="h-4 w-4" /><span className="hidden sm:inline">Limpiar</span></button><button onClick={toggleSort} className="flex items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-300 hover:text-primary-dark dark:hover:text-primary transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-primary-light/30 dark:hover:bg-primary/10" aria-label="Cambiar orden de tareas"><SortIcon /><span className="hidden sm:inline">{getSortButtonText()}</span><span className="sm:hidden">{sortBy === 'default' ? 'Original' : sortBy === 'priority' ? 'Prioridad' : 'Fecha'}</span></button></div></div>
                                    {!isMobile && <TodoInput onAddTodo={(text) => addTodo(text)} />}
                                </div>
                            </div>
                            <div className="space-y-3 overflow-y-auto custom-scrollbar p-3 flex-grow min-h-0">
                                {sortedTodos.length > 0 ? sortedTodos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onToggleSubtask={toggleSubtask} onDelete={deleteTodo} onUpdate={updateTodo} onEdit={onEditTodo}/>) : (<div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-300 py-10"><p className="font-medium">{todosForSelectedDate.length > 0 && hideCompleted ? '¡Todas las tareas completadas!' : '¡No hay tareas para este día!'}</p><p className="text-sm">{todosForSelectedDate.length > 0 && hideCompleted ? 'Desactiva "Ocultar completadas" para verlas.' : '¡Añade una para empezar a organizarte!'}</p></div>)}
                            </div>
                            {calendarVisible && (<div className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCalendarVisible(false)}><div className="bg-secondary-lighter dark:bg-gray-800 rounded-2xl shadow-xl p-4 w-full max-w-xs animate-pop-in" onClick={e => e.stopPropagation()}><Calendar selectedDate={selectedDate} setDate={(date) => { setSelectedDate(date); setCalendarVisible(false); }} datesWithTasks={datesWithTasks} datesWithAllTasksCompleted={datesWithAllTasksCompleted} calendarEvents={calendarEvents}/></div></div>)}
                        </div>
                    </div>
                )}
                
                {activeTab === 'projects' && (
                    <div className="h-full overflow-hidden bg-secondary-lighter/30 dark:bg-gray-900/30">
                        {renderProjectsView()}
                    </div>
                )}
            </div>
            
            <ConfirmationModalWithOptions
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                title={`Eliminar "${projectToDelete?.name}"`}
                message="¿Qué quieres hacer con las tareas de este proyecto?"
                options={[
                    {
                        label: 'Eliminar solo el proyecto',
                        onClick: () => {
                            if (projectToDelete) onDeleteProject(projectToDelete.id);
                            setProjectToDelete(null);
                        },
                        style: 'default',
                    },
                    {
                        label: 'Eliminar proyecto Y TAREAS',
                        onClick: () => {
                            if (projectToDelete) onDeleteProjectAndTasks(projectToDelete.id);
                            setProjectToDelete(null);
                        },
                        style: 'danger',
                    }
                ]}
            />
        </div>
    );
};

export default TodoListModule;