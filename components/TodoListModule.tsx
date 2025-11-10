import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Todo, Priority } from '../types';
import ProgressBar from './ProgressBar';
import TodoInput from './TodoInput';
import TodoItem from './TodoItem';
import ChickenIcon from './ChickenIcon';
import SortIcon from './icons/SortIcon';
import Calendar from './Calendar';
import CalendarIcon from './icons/CalendarIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface TodoListModuleProps {
    todos: Todo[];
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
}

const priorityOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

const TodoListModule: React.FC<TodoListModuleProps> = ({
    todos,
    addTodo,
    toggleTodo,
    toggleSubtask,
    deleteTodo,
    updateTodo,
    onEditTodo,
    selectedDate,
    setSelectedDate,
    datesWithTasks,
    datesWithAllTasksCompleted,
    isMobile = false,
}) => {
    const [sortBy, setSortBy] = useState<'default' | 'priority' | 'dueDate'>('default');
    const [hideCompleted, setHideCompleted] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [isCalendarPanelVisible, setIsCalendarPanelVisible] = useState(true);
    const [isNarrow, setIsNarrow] = useState(false);
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

    const completedCount = todos.filter(t => t.completed).length;
    const totalCount = todos.length;
    
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

    const sortedTodos = useMemo(() => {
        const initialList = hideCompleted ? todos.filter(t => !t.completed) : todos;
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
    }, [todos, sortBy, hideCompleted]);

    const formattedDate = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(selectedDate).replace(/^\w/, c => c.toUpperCase());

    return (
        <div ref={containerRef} className="w-full bg-transparent flex flex-col md:flex-row h-full">
            <div className={`
                    hidden md:flex flex-col flex-shrink-0 border-r border-secondary-light/30 dark:border-gray-700
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
            <div className="flex-grow relative flex flex-col overflow-hidden">
                <div className="absolute -top-10 -left-10 opacity-10 dark:opacity-20 transform rotate-12 -z-10">
                    <ChickenIcon className="w-40 h-40 text-secondary"/>
                </div>
                <div className="absolute -bottom-12 -right-12 opacity-10 dark:opacity-20 transform -rotate-12 -z-10">
                    <ChickenIcon className="w-48 h-48 text-primary"/>
                </div>

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

                            <button 
                                onClick={toggleSort}
                                className="flex items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-300 hover:text-primary-dark dark:hover:text-primary transition-colors flex-shrink-0"
                                aria-label="Cambiar orden de tareas"
                            >
                                <SortIcon />
                                <span className="hidden sm:inline">{getSortButtonText()}</span>
                                <span className="sm:hidden">{sortBy === 'default' ? 'Original' : sortBy === 'priority' ? 'Prioridad' : 'Fecha'}</span>
                            </button>
                        </div>
                         {!isMobile && <TodoInput onAddTodo={addTodo} />}
                    </div>
                </div>
              
                <div className="space-y-3 overflow-y-auto custom-scrollbar p-3 flex-grow min-h-0">
                    {sortedTodos.length > 0 ? (
                    sortedTodos.map(todo => (
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
        </div>
    );
};

export default TodoListModule;