import React, { useState } from 'react';
import { Todo, Subtask, QuickNote } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ClockIcon from './icons/ClockIcon';
import PlusIcon from './icons/PlusIcon';
import XIcon from './icons/XIcon';

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return d.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
};

interface AgendaItemProps {
  task: Todo;
  onToggleTask: (taskId: number) => void;
  onToggleSubtask: (taskId: number, subtaskId: number) => void;
}

const AgendaItem: React.FC<AgendaItemProps> = ({ task, onToggleTask, onToggleSubtask }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <div className="bg-white/60 dark:bg-gray-700/50 p-2 rounded-lg text-sm transition-all duration-200">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 ${task.completed ? 'bg-pink-400 border-pink-400' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                {task.completed && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>
        </div>
        <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onToggleTask(task.id)}>
          {task.start_time ? (
            <span className={`font-semibold text-xs flex items-center gap-1 ${task.completed ? 'text-gray-400 dark:text-gray-500' : 'text-pink-600 dark:text-pink-400'}`}>
              <ClockIcon className="h-3 w-3" />
              {formatTime(task.start_time)}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sin hora</span>
          )}
          <p className={`truncate text-gray-700 dark:text-gray-200 mt-0.5 ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
            {task.text}
          </p>
        </div>
        {hasSubtasks && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded-full hover:bg-yellow-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0">
            <ChevronDownIcon className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {isExpanded && hasSubtasks && (
        <div className="pl-7 pt-2 mt-1 border-t border-yellow-200/50 dark:border-gray-600/50 space-y-1.5 animate-pop-in">
          {task.subtasks?.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-2">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => onToggleSubtask(task.id, subtask.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-sm border-2 transition-all duration-200 ${subtask.completed ? 'bg-pink-300 border-pink-300' : 'bg-white dark:bg-gray-500 border-gray-300 dark:border-gray-400'}`}>
                    {subtask.completed && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </label>
              <p className={`text-xs flex-grow truncate cursor-pointer ${subtask.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`} onClick={() => onToggleSubtask(task.id, subtask.id)}>
                {subtask.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AgendaView: React.FC<Pick<TodaysAgendaProps, 'tasks' | 'onToggleTask' | 'onToggleSubtask'>> = ({ tasks, onToggleTask, onToggleSubtask }) => (
  <>
    {tasks.length > 0 ? (
      tasks.map(task => (
        <AgendaItem
          key={task.id}
          task={task}
          onToggleTask={onToggleTask}
          onToggleSubtask={onToggleSubtask}
        />
      ))
    ) : (
      <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4 px-2">
        <p>No tienes tareas para hoy.</p>
      </div>
    )}
  </>
);

const NotesView: React.FC<Pick<TodaysAgendaProps, 'quickNotes' | 'onAddQuickNote' | 'onDeleteQuickNote' | 'onClearAllQuickNotes'>> = ({ quickNotes, onAddQuickNote, onDeleteQuickNote, onClearAllQuickNotes }) => {
    const [newNoteText, setNewNoteText] = useState('');

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (newNoteText.trim()) {
            onAddQuickNote(newNoteText);
            setNewNoteText('');
        }
    };

    return (
      <div>
        <form onSubmit={handleAddNote} className="flex items-center gap-2 mb-2 p-1">
            <input 
                type="text" 
                value={newNoteText} 
                onChange={(e) => setNewNoteText(e.target.value)} 
                placeholder="Anota algo rápido..."
                className="flex-grow min-w-0 bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-2 border-yellow-200 dark:border-gray-600 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 transition-colors text-sm"
            />
            <button 
                type="submit" 
                className="bg-pink-400 text-white p-2 rounded-lg hover:bg-pink-500 transition-colors flex-shrink-0 disabled:opacity-50"
                disabled={!newNoteText.trim()}
                aria-label="Añadir nota"
            >
                <PlusIcon />
            </button>
        </form>
        {quickNotes.length > 0 ? (
            <div className="space-y-1.5">
                {quickNotes.map(note => (
                    <div key={note.id} className="flex items-center justify-between bg-white/60 dark:bg-gray-700/50 p-2 rounded-lg group text-sm">
                        <p className="text-gray-700 dark:text-gray-200 break-words flex-grow">{note.text}</p>
                        <button 
                            onClick={() => onDeleteQuickNote(note.id)} 
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded-full transition-opacity flex-shrink-0 ml-2"
                            aria-label="Eliminar nota"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <div className="pt-2 mt-2 border-t border-yellow-200/50 dark:border-gray-600/50">
                    <button onClick={onClearAllQuickNotes} className="w-full text-center text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline font-semibold transition-colors">
                        Limpiar Todo
                    </button>
                </div>
            </div>
        ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4 px-2">
                <p>No hay notas rápidas.</p>
            </div>
        )}
      </div>
    );
};

interface TodaysAgendaProps {
  tasks: Todo[];
  onToggleTask: (taskId: number) => void;
  onToggleSubtask: (taskId: number, subtaskId: number) => void;
  quickNotes: QuickNote[];
  onAddQuickNote: (text: string) => void;
  onDeleteQuickNote: (id: number) => void;
  onClearAllQuickNotes: () => void;
}

const TodaysAgenda: React.FC<TodaysAgendaProps> = ({ 
    tasks, 
    onToggleTask, 
    onToggleSubtask,
    quickNotes,
    onAddQuickNote,
    onDeleteQuickNote,
    onClearAllQuickNotes
}) => {
    const [activeView, setActiveView] = useState<'agenda' | 'notes'>('agenda');
    
    return (
        <div className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-2">
             <div className="flex border-b border-yellow-200/50 dark:border-gray-700/50 mb-2">
                <button 
                    onClick={() => setActiveView('agenda')} 
                    className={`flex-1 text-center font-semibold py-1.5 text-sm transition-colors rounded-t-lg ${activeView === 'agenda' ? 'text-pink-600 dark:text-pink-400 bg-white/50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    Agenda
                </button>
                <button 
                    onClick={() => setActiveView('notes')} 
                    className={`flex-1 text-center font-semibold py-1.5 text-sm transition-colors rounded-t-lg ${activeView === 'notes' ? 'text-pink-600 dark:text-pink-400 bg-white/50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    Notas Rápidas
                </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                 {activeView === 'agenda' ? (
                    <AgendaView tasks={tasks} onToggleTask={onToggleTask} onToggleSubtask={onToggleSubtask} />
                 ) : (
                    <NotesView 
                        quickNotes={quickNotes} 
                        onAddQuickNote={onAddQuickNote} 
                        onDeleteQuickNote={onDeleteQuickNote} 
                        onClearAllQuickNotes={onClearAllQuickNotes} 
                    />
                 )}
            </div>
        </div>
    );
};

export default TodaysAgenda;