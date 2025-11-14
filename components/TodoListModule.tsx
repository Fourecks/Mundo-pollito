import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Todo, Priority, Project } from '../types';
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
import PlusIcon from './icons/PlusIcon';
import FolderIcon from './icons/FolderIcon';
import ConfirmationModal from './ConfirmationModal';

interface TodoListModuleProps {
    allTodos: { [key: string]: Todo[] };
    addTodo: (text: string) => void;
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
    onAddProject: (name: string) => Promise<void>;
    onUpdateProject: (project: Project) => Promise<void>;
    onDeleteProject: (projectId: number) => Promise<void>;
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
        isMobile = false, onClearPastTodos, projects, onAddProject, onUpdateProject, onDeleteProject
    } = props;

    const [viewMode, setViewMode] = useState<'date' | 'project'>('date');
    const [sortBy, setSortBy] = useState<'default' | 'priority' | 'dueDate'>('default');
    const [hideCompleted, setHideCompleted] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [isCalendarPanelVisible, setIsCalendarPanelVisible] = useState(true);
    const [isNarrow, setIsNarrow] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePrevDay = () => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    };
    
    const handleAddNewProject = (e: React.FormEvent) => {
        e.preventDefault();
        if(newProjectName.trim()) {
            onAddProject(newProjectName.trim());
            setNewProjectName('');
        }
    }

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                setIsNarrow(width < 600);
            }
        });
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (isNarrow && isCalendarPanelVisible) {
            setIsCalendarPanelVisible(false);
        }
    }, [isNarrow, isCalendarPanelVisible]);

    const todosForDateView = useMemo(() => allTodos[formatDateKey(selectedDate)] || [], [allTodos, selectedDate]);
    const completedCount = todosForDateView.filter(t => t.completed).length;
    const totalCount = todosForDateView.length;
    
    const toggleSort = () => {
        setSortBy(prev => {
            if (prev === 'default') return 'priority';
            if (prev === 'priority') return 'dueDate';
            return 'default';
        });
    };

    const getSortButtonText = () => {
        switch (sortBy) {
            case 'priority': return 'Prioridad';
            case 'dueDate': return 'Fecha';
            default: return 'Original';
        }
    };

    const sortedTodosForDateView = useMemo(() => {
        const initialList = hideCompleted ? todosForDateView.filter(t => !t.completed) : todosForDateView;
        const todosCopy = [...initialList];

        if (sortBy === 'priority') {
            todosCopy.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                return priorityDiff !== 0 ? priorityDiff : a.id - b.id;
            });
        } else if (sortBy === 'dueDate') {
            todosCopy.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (!a.due_date && b.due_date) return 1;
                if (a.due_date && !b.due_date) return -1;
                if (!a.due_date && !b.due_date) return a.id - b.id;
                
                const dateDiff = new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
                if (dateDiff !== 0) return dateDiff;
                
                return a.id - b.id;
            });
        } else { // 'default'
            todosCopy.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                return a.id - b.id;
            });
        }
        return todosCopy;
    }, [todosForDateView, sortBy, hideCompleted]);

    const formattedDate = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(selectedDate).replace(/^\w/, c => c.toUpperCase());
    
    const todosByProject = useMemo(() => {
        if (viewMode !== 'project') return new Map<string, { project: Project | { name: string, id: number }; tasks: Todo[] }>();

        // FIX: Explicitly type `flatTodos` as `Todo[]` to resolve type inference issues.
        // The type of `todo` in the following `forEach` was being inferred as `unknown`.
        const flatTodos: Todo[] = Object.values(allTodos).flat();
        const grouped = new Map<string, { project: Project | { name: string, id: number }; tasks: Todo[] }>();

        projects.forEach(p => {
            grouped.set(`project-${p.id}`, { project: p, tasks: [] });
        });
        grouped.set('unassigned', { project: { name: 'Tareas sin proyecto', id: 0 }, tasks: [] });

        flatTodos.forEach(todo => {
            if (todo.project_id && grouped.has(`project-${todo.project_id}`)) {
                grouped.get(`project-${todo.project_id}`)!.tasks.push(todo);
            } else {
                grouped.get('unassigned')!.tasks.push(todo);
            }
        });
        
        // Filter out empty projects unless it's the unassigned group
        for (const [key, value] of grouped.entries()) {
            if (key !== 'unassigned' && value.tasks.length === 0) {
                grouped.delete(key);
            }
        }

        return grouped;
    }, [allTodos, projects, viewMode]);

    const renderDateView = () => (
        <>
            <div className={`flex-shrink-0 ${isMobile ? 'sticky top-0 bg-secondary-lighter/80 dark:bg-gray-800/80 backdrop-blur-md z-20 border-b border-secondary-light/50 dark:border-gray-700/50' : ''}`}>
                <div className="p-3 md:p-4">
                     {isMobile ? (
                        <div className="flex justify-between items-center">
                            <button onClick={handlePrevDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día anterior">
                                <ChevronLeftIcon />
                            </button>
                            <button onClick={() => setCalendarVisible(true)} className="px-3 py-1.5 rounded-full hover:bg-white/70 dark:hover:bg-gray-700/70 transition-colors">
                                <h2 className="text-lg font-bold text-primary-dark dark:text-primary text-center">
                                    {formattedDate}
                                </h2>
                            </button>
                            <button onClick={handleNextDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día siguiente">
                                <ChevronRightIcon />
                            </button>
                        </div>
                    ) : (
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button
                                    onClick={() => setIsCalendarPanelVisible(!isCalendarPanelVisible)}
                                    className="hidden md:flex p-2 items-center justify-center rounded-full hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 hover:text-primary-dark transition-colors"
                                    aria-label={isCalendarPanelVisible ? 'Ocultar calendario' : 'Mostrar calendario'}
                                >
                                    <ChevronLeftIcon className={`h-5 w-5 transition-transform duration-300 ${!isCalendarPanelVisible ? 'rotate-180' : ''}`}/>
                                </button>
                                
                                <div className="flex items-center">
                                    <button onClick={handlePrevDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día anterior">
                                        <ChevronLeftIcon />
                                    </button>
                                    <h2 className="text-lg sm:text-xl font-bold text-primary-dark dark:text-primary text-center w-40 sm:w-auto flex-shrink-0">
                                        {formattedDate}
                                    </h2>
                                    <button onClick={handleNextDay} className="p-2 rounded-full text-gray-500 hover:bg-secondary-lighter/70 dark:hover:bg-gray-700 hover:text-primary-dark transition-colors" aria-label="Día siguiente">
                                        <ChevronRightIcon />
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => setCalendarVisible(true)}
                                className="md:hidden flex items-center gap-2 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm p-2 rounded-full shadow-sm text-primary dark:text-primary-dark hover:bg-primary-light/50 dark:hover:bg-primary/20 transition-colors"
                                aria-label="Abrir calendario"
                            >
                                <CalendarIcon />
                            </button>
                        </div>
                    )}


                    <p className="text-gray-500 dark:text-gray-300 text-sm mt-1 text-center md:text-left">
                        {totalCount > 0 ? `${completedCount} de ${totalCount} tareas completadas.` : '¡Añade una tarea para empezar!'}
                    </p>
                    <ProgressBar completed={completedCount} total={totalCount} />
                     <div className="flex flex-wrap justify-between items-center mt-4 mb-2 gap-3">
                        <label htmlFor="hide-completed-toggle" className="flex items-center cursor-pointer select-none">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    id="hide-completed-toggle" 
                                    className="sr-only" 
                                    checked={hideCompleted} 
                                    onChange={() => setHideCompleted(!hideCompleted)} 
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${hideCompleted ? 'bg-primary-light' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hideCompleted ? 'translate-x-full' : ''}`}></div>
                            </div>
                            <div className="ml-2 text-sm font-semibold text-gray-500 dark:text-gray-300">
                                Ocultar completadas
                            </div>
                        </label>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={onClearPastTodos}
                                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/30"
                                title="Limpiar tareas anteriores al día actual"
                            >
                                <TrashIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Limpiar</span>
                            </button>
                            <button 
                                onClick={toggleSort}
                                className="flex items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-300 hover:text-primary-dark dark:hover:text-primary transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-primary-light/30 dark:hover:bg-primary/10"
                                aria-label="Cambiar orden de tareas"
                            >
                                <SortIcon />
                                <span className="hidden sm:inline">{getSortButtonText()}</span>
                                <span className="sm:hidden">{sortBy === 'default' ? 'Original' : sortBy === 'priority' ? 'Prioridad' : 'Fecha'}</span>
                            </button>
                        </div>
                    </div>
                     {!isMobile && <TodoInput onAddTodo={addTodo} />}
                </div>
            </div>
          
            <div className="space-y-3 overflow-y-auto custom-scrollbar p-3 flex-grow min-h-0">
                {sortedTodosForDateView.length > 0 ? (
                sortedTodosForDateView.map(todo => (
                    <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onToggleSubtask={toggleSubtask}
                    onDelete={deleteTodo}
                    onUpdate={updateTodo}
                    onEdit={onEditTodo}
                    />
                ))
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-300 py-10">
                    <p className="font-medium">
                        {totalCount > 0 && hideCompleted
                            ? '¡Todas las tareas completadas!'
                            : '¡No hay tareas para este día!'}
                    </p>
                    <p className="text-sm">
                        {totalCount > 0 && hideCompleted
                            ? 'Desactiva "Ocultar completadas" para verlas.'
                            : '¡Añade una para empezar a organizarte!'}
                    </p>
                </div>
                )}
            </div>
        </>
    );
    
    const renderProjectView = () => (
        <div className="p-3 flex-grow min-h-0 space-y-4 overflow-y-auto custom-scrollbar">
            {Array.from(todosByProject.entries()).map(([key, { project, tasks }]) => {
                if (tasks.length === 0 && key !== 'unassigned') return null;

                const completed = tasks.filter(t => t.completed).length;
                const total = tasks.length;
                
                const sortedTasks = [...tasks].sort((a,b) => {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return (a.due_date || '9999').localeCompare(b.due_date || '9999');
                });

                return (
                    <div key={key} className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-primary-dark dark:text-primary">{project.name}</h3>
                             {project.id !== 0 && (
                                <button
                                    onClick={() => setProjectToDelete(project as Project)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Eliminar proyecto"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {total > 0 && <ProgressBar completed={completed} total={total} />}
                        <div className="space-y-2 mt-2">
                           {sortedTasks.map(todo => (
                                <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onToggleSubtask={toggleSubtask} onDelete={deleteTodo} onUpdate={updateTodo} onEdit={onEditTodo} />
                           ))}
                        </div>
                        {tasks.length === 0 && key === 'unassigned' && <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">Todas las tareas están en un proyecto. ¡Bien hecho!</p>}
                    </div>
                );
            })}
             <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl">
                 <h3 className="font-bold text-primary-dark dark:text-primary mb-2">Nuevo Proyecto</h3>
                <form onSubmit={handleAddNewProject} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newProjectName} 
                        onChange={e => setNewProjectName(e.target.value)} 
                        placeholder="Nombre del proyecto..."
                        className="flex-grow bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <button type="submit" className="bg-primary text-white p-2 rounded-lg shadow-md hover:bg-primary-dark shrink-0"><PlusIcon /></button>
                </form>
            </div>
        </div>
    );

    return (
        <div ref={containerRef} className="w-full bg-transparent flex flex-col md:flex-row h-full">
             {viewMode === 'date' && !isMobile && (
                <div className={`
                    flex flex-col flex-shrink-0 border-r border-secondary-light/30 dark:border-gray-700
                    transition-all duration-300 ease-in-out
                    ${isCalendarPanelVisible ? 'w-full md:w-[260px] p-2' : 'w-0 md:w-0 p-0 overflow-hidden'}
                `}>
                    <Calendar 
                        selectedDate={selectedDate}
                        setDate={setSelectedDate}
                        datesWithTasks={datesWithTasks}
                        datesWithAllTasksCompleted={datesWithAllTasksCompleted}
                    />
                </div>
             )}
            <div className="flex-grow relative flex flex-col overflow-hidden">
                <div className="absolute -top-10 -left-10 opacity-10 dark:opacity-20 transform rotate-12 -z-10">
                    <ChickenIcon className="w-40 h-40 text-secondary"/>
                </div>
                <div className="absolute -bottom-12 -right-12 opacity-10 dark:opacity-20 transform -rotate-12 -z-10">
                    <ChickenIcon className="w-48 h-48 text-primary"/>
                </div>

                <div className="p-2 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center gap-2">
                    <button onClick={() => setViewMode('date')} className={`flex-1 text-center font-semibold py-2 rounded-lg transition-colors ${viewMode === 'date' ? 'bg-white/80 dark:bg-gray-700/80 text-primary-dark dark:text-primary shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>Por Fecha</button>
                    <button onClick={() => setViewMode('project')} className={`flex-1 text-center font-semibold py-2 rounded-lg transition-colors ${viewMode === 'project' ? 'bg-white/80 dark:bg-gray-700/80 text-primary-dark dark:text-primary shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>Por Proyecto</button>
                </div>
                
                {viewMode === 'date' ? renderDateView() : renderProjectView()}

                {calendarVisible && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setCalendarVisible(false)}
                    >
                        <div className="bg-secondary-lighter dark:bg-gray-800 rounded-2xl shadow-xl p-4 w-full max-w-xs animate-pop-in" onClick={e => e.stopPropagation()}>
                            <Calendar
                                selectedDate={selectedDate}
                                setDate={(date) => {
                                    setSelectedDate(date);
                                    setCalendarVisible(false);
                                }}
                                datesWithTasks={datesWithTasks}
                                datesWithAllTasksCompleted={datesWithAllTasksCompleted}
                            />
                        </div>
                    </div>
                )}
            </div>
            <ConfirmationModal 
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={() => {
                    if (projectToDelete) onDeleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                }}
                title="Eliminar Proyecto"
                message={`¿Seguro que quieres eliminar "${projectToDelete?.name}"? Las tareas asociadas no se borrarán, pero quedarán sin proyecto.`}
                confirmText="Sí, eliminar"
            />
        </div>
    );
};

export default TodoListModule;