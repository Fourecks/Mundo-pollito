import React, { useState } from 'react';
import { Todo, Priority, Subtask } from '../types';
import SubtaskIcon from './icons/SubtaskIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}

const priorityMap: { [key in Priority]: { color: string; label: string, borderColor: string } } = {
    low: { color: 'bg-blue-400', label: 'Baja', borderColor: 'border-blue-400' },
    medium: { color: 'bg-yellow-500', label: 'Media', borderColor: 'border-secondary' },
    high: { color: 'bg-red-500', label: 'Alta', borderColor: 'border-red-500' },
};

const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDueDate = (todo: Todo): string => {
    if (!todo.due_date) return '';
    
    const todayKey = formatDateKey(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrowDate);

    const formatTime = (timeStr: string) => {
        const [hour, minute] = timeStr.split(':');
        const d = new Date();
        d.setHours(parseInt(hour), parseInt(minute));
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    let timeString = '';
    if (todo.start_time && todo.end_time) {
        timeString = `${formatTime(todo.start_time)} - ${formatTime(todo.end_time)}`;
    } else if (todo.start_time) {
        timeString = formatTime(todo.start_time);
    }
    
    let dateString;
    if (todo.due_date === todayKey) dateString = `Hoy`;
    else if (todo.due_date === tomorrowKey) dateString = `Mañana`;
    else {
        const [year, month, day] = todo.due_date.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        dateString = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    }

    return `${dateString}${timeString ? `, ${timeString}` : ''}`;
};


const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onUpdate, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubtaskToggle = (subtaskId: number) => {
    const newSubtasks = todo.subtasks?.map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    if (newSubtasks) {
      const allSubtasksCompleted = newSubtasks.every(st => st.completed);
      
      // If all subtasks are complete, the parent is complete. Otherwise, it's not.
      const parentCompleted = allSubtasksCompleted;

      onUpdate({ ...todo, subtasks: newSubtasks, completed: parentCompleted });
    }
  };

  const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;

  return (
    <div className={`bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 ${todo.completed ? 'opacity-70' : ''} ${priorityMap[todo.priority].borderColor}`}>
      <div className="flex items-center p-2">
        {/* Checkbox */}
        <div className="flex-shrink-0">
            <label className="flex items-center cursor-pointer">
                <div className="relative">
                <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onToggle(todo.id)}
                    className="sr-only"
                />
                <div className={`w-6 h-6 rounded-md border-2 transition-all duration-200 ${todo.completed ? 'bg-primary border-primary' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                    {todo.completed && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                    )}
                </div>
                </div>
            </label>
        </div>

        {/* Task Text & Subtask Toggle */}
        <div className="flex-grow flex items-center gap-2 ml-4 min-w-0">
            <span 
                onClick={() => onEdit(todo)}
                className={`text-gray-700 dark:text-gray-100 transition-all duration-300 truncate cursor-pointer ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                {todo.text}
            </span>
            {hasSubtasks && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded-full hover:bg-secondary-light/50 dark:hover:bg-gray-700 transition-colors">
                    <ChevronDownIcon className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}/>
                </button>
            )}
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {todo.due_date && (
                <span className="text-xs font-medium text-primary-dark dark:text-primary bg-primary-light/50 dark:bg-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline">
                    {formatDueDate(todo)}
                </span>
            )}
            {hasSubtasks && <SubtaskIcon className="text-gray-400 dark:text-gray-500 h-5 w-5" />}
            <button
            onClick={() => onDelete(todo.id)}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 p-1 rounded-full"
            aria-label="Delete task"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
        </div>
      </div>
      {/* Expanded Subtasks */}
      {isExpanded && hasSubtasks && (
          <div className="pl-12 pr-4 pb-3 space-y-2">
              {todo.subtasks?.map(subtask => (
                  <div key={subtask.id} className="flex items-center">
                      <label className="flex items-center cursor-pointer flex-grow min-w-0">
                          <div className="relative">
                              <input
                                  type="checkbox"
                                  checked={subtask.completed}
                                  onChange={() => handleSubtaskToggle(subtask.id)}
                                  className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 ${subtask.completed ? 'bg-primary/70 border-primary/70' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                                  {subtask.completed && (
                                  <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                  )}
                              </div>
                          </div>
                           <span className={`ml-3 text-sm text-gray-600 dark:text-gray-200 transition-colors duration-300 truncate ${subtask.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                               {subtask.text}
                           </span>
                      </label>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default TodoItem;