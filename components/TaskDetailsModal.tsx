

import React, { useState, useEffect } from 'react';
import { Todo, Subtask, Priority, RecurrenceRule } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import CalendarIcon from './icons/CalendarIcon';
import ClockIcon from './icons/ClockIcon';
import FlagIcon from './icons/FlagIcon';
import BellIcon from './icons/BellIcon';
import RefreshIcon from './icons/RefreshIcon';


interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  todo: Todo | null;
}

const priorityMap: { [key in Priority]: { base: string; text: string; label: string } } = {
    low: { base: 'bg-blue-400', text: 'text-white', label: 'Baja' },
    medium: { base: 'bg-yellow-500', text: 'text-white', label: 'Media' },
    high: { base: 'bg-red-500', text: 'text-white', label: 'Alta' },
};

const from24h = (time: string): { hour: string; minute: string; period: 'AM' | 'PM' } => {
    if (!time) return { hour: '12', minute: '00', period: 'AM' };
    let [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { hour: String(h), minute: String(m).padStart(2, '0'), period };
}

const to24h = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
    if (!hour || !minute || hour === '0') return '';
    let h = parseInt(hour, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}


const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, onSave, todo }) => {
    const [text, setText] = useState('');
    const [notes, setNotes] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [reminderOffset, setReminderOffset] = useState<Todo['reminder_offset']>(0);
    const [recurrence, setRecurrence] = useState<RecurrenceRule>({ frequency: 'none', customDays: [] });
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [due_date, setDueDate] = useState('');
    const [completed, setCompleted] = useState(false);

    const [startTimeParts, setStartTimeParts] = useState(from24h(''));
    const [endTimeParts, setEndTimeParts] = useState(from24h(''));


    useEffect(() => {
        if (todo) {
            setText(todo.text || '');
            setNotes(todo.notes || '');
            setPriority(todo.priority || 'medium');
            setReminderOffset(todo.reminder_offset || 0);
            setRecurrence(todo.recurrence || { frequency: 'none', customDays: [] });
            setSubtasks(todo.subtasks || []);
            setStartTimeParts(from24h(todo.start_time || ''));
            setEndTimeParts(from24h(todo.end_time || ''));
            setDueDate(todo.due_date || '');
            setCompleted(todo.completed || false);
        }
    }, [todo]);

    const handleSave = async () => {
        if (!todo) return;
        
        if (reminderOffset !== 0 && 'Notification' in window && Notification.permission !== 'granted') {
            alert("Para recibir recordatorios, por favor, primero activa las notificaciones usando el ícono de la campana en la pantalla principal.");
        }
        
        const finalStartTime = to24h(startTimeParts.hour, startTimeParts.minute, startTimeParts.period) || undefined;
        const finalEndTime = to24h(endTimeParts.hour, endTimeParts.minute, endTimeParts.period) || undefined;

        onSave({
            ...todo,
            text,
            notes,
            due_date,
            completed,
            start_time: finalStartTime,
            end_time: finalEndTime,
            priority,
            reminder_offset: reminderOffset,
            recurrence,
            subtasks,
            notification_sent: todo.reminder_offset !== reminderOffset ? false : todo.notification_sent,
        });
        onClose();
    };

    const handleAddSubtask = () => {
        if (newSubtaskText.trim() === '') return;
        const newSubtask: Subtask = {
            id: Date.now(),
            text: newSubtaskText,
            completed: false,
        };
        setSubtasks([...subtasks, newSubtask]);
        setNewSubtaskText('');
    };

    const handleToggleSubtask = (id: number) => {
        setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
    };

    const handleDeleteSubtask = (id: number) => {
        setSubtasks(subtasks.filter(st => st.id !== id));
    };
    
    const handleCustomDayToggle = (dayIndex: number) => {
        setRecurrence(prev => {
            const currentDays = prev.customDays || [];
            const newDays = currentDays.includes(dayIndex)
                ? currentDays.filter(d => d !== dayIndex)
                : [...currentDays, dayIndex];
            return { ...prev, customDays: newDays.sort((a,b) => a - b) };
        });
    };

    if (!isOpen || !todo) return null;

    const TimePicker = ({ parts, setParts }: { parts: ReturnType<typeof from24h>, setParts: React.Dispatch<React.SetStateAction<ReturnType<typeof from24h>>> }) => (
        <div className="grid grid-cols-3 gap-1">
            <select value={parts.hour} onChange={e => setParts(p => ({...p, hour: e.target.value}))} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-xs appearance-none text-center">
                {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}
            </select>
            <select value={parts.minute} onChange={e => setParts(p => ({...p, minute: e.target.value}))} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-xs appearance-none text-center">
                {Array.from({length: 60}, (_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
            </select>
            <select value={parts.period} onChange={e => setParts(p => ({...p, period: e.target.value as 'AM' | 'PM'}))} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-xs appearance-none text-center">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[1001] p-2 sm:p-4" onClick={onClose}>
        <div className="bg-gradient-to-br from-yellow-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col h-auto max-h-[90vh] animate-pop-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <header className="flex items-center justify-between p-3 md:p-4 flex-shrink-0 border-b border-yellow-300/50 dark:border-gray-700/50">
                <input 
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="text-lg font-bold text-pink-500 dark:text-pink-400 bg-transparent focus:outline-none w-full"
                    placeholder="Nombre de la tarea"
                />
                <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-pink-100 dark:hover:bg-gray-700 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"><CloseIcon /></button>
            </header>

            {/* Body */}
            <main className="flex-grow flex flex-col md:flex-row gap-4 overflow-y-auto min-h-0 custom-scrollbar">
                {/* Left Column */}
                <div className="flex-grow md:w-3/5 p-3 md:p-4 space-y-6">
                    {/* Notes */}
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-gray-300">Notas</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade detalles o notas..." className="mt-1 w-full bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 transition-colors text-sm" rows={4}></textarea>
                    </div>

                    {/* Subtasks */}
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-gray-300">Sub-tareas</label>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center bg-white/60 dark:bg-gray-700/60 p-2 rounded-lg group">
                                <input
                                        type="checkbox"
                                        id={`subtask-${subtask.id}`}
                                        checked={subtask.completed}
                                        onChange={() => handleToggleSubtask(subtask.id)}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor={`subtask-${subtask.id}`}
                                        className={`w-5 h-5 rounded-md border-2 transition-all duration-200 cursor-pointer ${subtask.completed ? 'bg-pink-300 border-pink-300' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}
                                    >
                                        {subtask.completed && (
                                        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                        )}
                                    </label>
                                    <span className={`ml-3 flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{subtask.text}</span>
                                    <button onClick={() => handleDeleteSubtask(subtask.id)} className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleAddSubtask(); }} className="mt-2 flex gap-2">
                            <input 
                                type="text"
                                value={newSubtaskText}
                                onChange={e => setNewSubtaskText(e.target.value)}
                                placeholder="Añadir nueva sub-tarea"
                                className="flex-grow bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-2 border-yellow-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 transition-colors text-sm"
                            />
                            <button type="submit" className="bg-pink-400 text-white p-2 rounded-lg hover:bg-pink-500 transition-colors flex-shrink-0">
                                <PlusIcon />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column */}
                <aside className="md:w-2/5 flex-shrink-0 bg-black/5 dark:bg-black/20 p-3 md:p-4 md:border-l border-yellow-300/50 dark:border-gray-700/50 space-y-4">
                    {/* Status */}
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3">
                        <label className="text-sm font-bold text-gray-600 dark:text-gray-300 block mb-2">Estado</label>
                        <label htmlFor="status-toggle" className="flex items-center justify-between cursor-pointer select-none">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{completed ? 'Completada' : 'Pendiente'}</span>
                            <div className="relative">
                                <input type="checkbox" id="status-toggle" className="sr-only" checked={completed} onChange={() => setCompleted(!completed)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${completed ? 'bg-pink-400' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${completed ? 'translate-x-full' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                    
                    {/* Date & Time */}
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 space-y-3">
                         <div>
                            <label htmlFor="due-date" className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" /> Fecha</label>
                            <input type="date" id="due-date" value={due_date} onChange={e => setDueDate(e.target.value)} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-sm"/>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><ClockIcon className="h-4 w-4" /> Hora de Inicio</label>
                            <TimePicker parts={startTimeParts} setParts={setStartTimeParts} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><ClockIcon className="h-4 w-4" /> Hora de Fin</label>
                             <TimePicker parts={endTimeParts} setParts={setEndTimeParts} />
                        </div>
                    </div>
                    
                    {/* Priority, Reminder, Recurrence */}
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 space-y-3">
                         <div>
                            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2"><FlagIcon className="h-4 w-4" /> Prioridad</label>
                            <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-600/50 p-1 rounded-full">
                                {(['low', 'medium', 'high'] as Priority[]).map(p => {
                                    const details = priorityMap[p];
                                    return (
                                    <button key={p} onClick={() => setPriority(p)} className={`w-full text-xs py-1 rounded-full transition-colors ${priority === p ? `${details.base} ${details.text} font-semibold shadow` : 'text-gray-900 dark:text-gray-200 hover:bg-yellow-100 dark:hover:bg-gray-600'}`}>
                                        {details.label}
                                    </button>
                                );
                                })}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="reminder" className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><BellIcon className="h-4 w-4"/> Recordatorio</label>
                            <select id="reminder" value={reminderOffset} onChange={e => setReminderOffset(Number(e.target.value) as Todo['reminder_offset'])} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-sm appearance-none">
                                <option value="0">Nunca</option>
                                <option value="10">10 min antes</option>
                                <option value="30">30 min antes</option>
                                <option value="60">1 hora antes</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="recurrence" className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><RefreshIcon className="h-4 w-4"/> Repetir</label>
                            <select 
                                id="recurrence" 
                                value={recurrence.frequency} 
                                onChange={e => {
                                    const newFrequency = e.target.value as RecurrenceRule['frequency'];
                                    setRecurrence(currentRecurrence => ({
                                        frequency: newFrequency,
                                        customDays: newFrequency === 'custom' ? (currentRecurrence.customDays || []) : []
                                    }));
                                }} 
                                className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-sm appearance-none"
                            >
                                <option value="none">Nunca</option>
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="biweekly">Cada 2 semanas</option>
                                <option value="monthly">Mensualmente</option>
                                <option value="custom">Personalizado...</option>
                            </select>
                        </div>

                        {recurrence.frequency === 'custom' && (
                            <div className="animate-pop-in">
                                <div className="flex justify-around gap-1 p-1 bg-white/60 dark:bg-gray-600/50 rounded-lg">
                                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dayLabel, index) => {
                                        const dayIndex = index; // Sunday: 0
                                        const isSelected = recurrence.customDays?.includes(dayIndex);
                                        return (
                                            <button
                                                key={dayIndex}
                                                onClick={() => handleCustomDayToggle(dayIndex)}
                                                className={`w-8 h-8 text-xs rounded-full transition-colors font-semibold ${isSelected ? 'bg-pink-400 text-white shadow' : 'hover:bg-yellow-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {dayLabel}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </main>

            {/* Footer */}
            <footer className="flex-shrink-0 p-3 border-t border-yellow-300/50 dark:border-gray-700/50 flex justify-end bg-black/5 dark:bg-black/20 rounded-b-3xl">
                <button 
                    onClick={handleSave} 
                    className="bg-pink-400 text-white font-bold rounded-full px-6 py-2 shadow-md hover:bg-pink-500 transform hover:scale-105 active:scale-95 transition-all duration-200"
                >
                    Guardar Cambios
                </button>
            </footer>
        </div>
    </div>
  );
};

export default TaskDetailsModal;