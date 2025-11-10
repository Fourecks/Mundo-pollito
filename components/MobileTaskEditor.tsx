import React, { useState, useEffect, useRef } from 'react';
import { Todo, Subtask, Priority, RecurrenceRule } from '../types';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import CalendarIcon from './icons/CalendarIcon';
import ClockIcon from './icons/ClockIcon';
import FlagIcon from './icons/FlagIcon';
import BellIcon from './icons/BellIcon';
import RefreshIcon from './icons/RefreshIcon';
import XIcon from './icons/XIcon';
import ConfirmationModal from './ConfirmationModal';

interface MobileTaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  onDelete: (id: number) => void;
  todo: Todo | null;
}

const priorityMap: { [key in Priority]: { base: string; text: string; label: string } } = {
    low: { base: 'bg-blue-400', text: 'text-white', label: 'Baja' },
    medium: { base: 'bg-yellow-500', text: 'text-white', label: 'Media' },
    high: { base: 'bg-red-500', text: 'text-white', label: 'Alta' },
};

const MobileTaskEditor: React.FC<MobileTaskEditorProps> = ({ isOpen, onClose, onSave, onDelete, todo }) => {
    const [text, setText] = useState('');
    const [notes, setNotes] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [reminderOffset, setReminderOffset] = useState<Todo['reminder_offset']>(0);
    const [isCustomReminder, setIsCustomReminder] = useState(false);
    const [customReminderTime, setCustomReminderTime] = useState('');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [due_date, setDueDate] = useState('');
    const [start_time, setStartTime] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    
    const panelRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (todo) {
            setText(todo.text || '');
            setNotes(todo.notes || '');
            setPriority(todo.priority || 'medium');
            setSubtasks(todo.subtasks || []);
            setDueDate(todo.due_date || '');
            setStartTime(todo.start_time || '');
            
            // Reminder logic
            if (todo.reminder_at && todo.due_date) {
                setIsCustomReminder(true);
                const timePart = todo.reminder_at.split('T')[1]; // e.g., "20:55:00+00:00"
                const [hour, minute] = timePart.split(':'); // Extracts "20" and "55"
                setCustomReminderTime(`${hour}:${minute}`); // Sets "20:55"
                setReminderOffset(0);
            } else {
                setIsCustomReminder(false);
                setCustomReminderTime('');
                setReminderOffset(todo.reminder_offset || 0);
            }
        }
    }, [todo]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [text]);

    const handleSave = () => {
        if (!todo) return;
        
        let finalReminderAt: string | undefined = undefined;
        let finalReminderOffset: Todo['reminder_offset'] = 0;

        if (isCustomReminder && customReminderTime && due_date) {
            finalReminderAt = `${due_date}T${customReminderTime}:00`;
            finalReminderOffset = 0;
        } else {
            finalReminderOffset = reminderOffset;
        }

        const reminderChanged = todo.reminder_at !== finalReminderAt || todo.reminder_offset !== finalReminderOffset;

        onSave({
            ...todo,
            text,
            notes,
            due_date,
            start_time: start_time || undefined,
            priority,
            reminder_offset: finalReminderOffset,
            reminder_at: finalReminderAt,
            subtasks,
            notification_sent: reminderChanged ? false : todo.notification_sent,
        });
        onClose();
    };

    const confirmDelete = () => {
        if (todo) {
            onDelete(todo.id);
            onClose(); // Close the editor after deletion
        }
        setIsDeleting(false);
    };

    const handleAddSubtask = () => {
        if (newSubtaskText.trim() === '') return;
        const newSubtask: Subtask = {
            id: Date.now(), // Temporary ID for client-side
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
    
    const handleReminderChange = (value: string) => {
        if (value === 'custom') {
            setIsCustomReminder(true);
            setReminderOffset(0);
        } else {
            setIsCustomReminder(false);
            setCustomReminderTime('');
            setReminderOffset(Number(value) as Todo['reminder_offset']);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] animate-fade-in" 
                onClick={onClose}
            ></div>
            <div 
                ref={panelRef}
                className="fixed bottom-0 left-0 right-0 max-h-[95vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[1001] animate-slide-up"
            >
                <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50">
                    <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto"></div>
                    <button onClick={() => setIsDeleting(true)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full">
                        <TrashIcon />
                    </button>
                    <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary-dark dark:text-primary px-3 py-1 hover:bg-primary-light/50 dark:hover:bg-primary/20 rounded-full">
                        Cerrar
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-5">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-full bg-transparent text-gray-800 dark:text-gray-100 text-xl font-bold focus:outline-none resize-none"
                        placeholder="Nombre de la tarea"
                        rows={1}
                    />

                    {/* Subtasks */}
                    <div className="space-y-2">
                        {subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center bg-white/60 dark:bg-gray-700/60 p-2 rounded-lg group">
                                <input type="checkbox" id={`subtask-${subtask.id}`} checked={subtask.completed} onChange={() => handleToggleSubtask(subtask.id)} className="sr-only"/>
                                <label htmlFor={`subtask-${subtask.id}`} className={`w-5 h-5 rounded-md border-2 transition-all duration-200 cursor-pointer ${subtask.completed ? 'bg-primary/70 border-primary/70' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                                    {subtask.completed && <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                </label>
                                <span className={`ml-3 flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{subtask.text}</span>
                                <button onClick={() => handleDeleteSubtask(subtask.id)} className="p-1 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                        <form onSubmit={(e) => { e.preventDefault(); handleAddSubtask(); }} className="flex gap-2">
                            <input type="text" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} placeholder="Añadir sub-tarea" className="flex-grow bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"/>
                            <button type="submit" className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-colors flex-shrink-0"><PlusIcon /></button>
                        </form>
                    </div>
                    
                    {/* Settings */}
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl divide-y divide-secondary-light/50 dark:divide-gray-600/50">
                        <div className="p-3 flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                            <label htmlFor="due-date" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fecha</label>
                            <input type="date" id="due-date" value={due_date} onChange={e => setDueDate(e.target.value)} className="ml-auto bg-transparent text-gray-700 dark:text-gray-200 text-sm text-right focus:outline-none"/>
                        </div>
                        <div className="p-3 flex items-center gap-3">
                            <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                            <label htmlFor="start-time" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Hora</label>
                            <input type="time" id="start-time" value={start_time} onChange={e => setStartTime(e.target.value)} className="ml-auto bg-transparent text-gray-700 dark:text-gray-200 text-sm text-right focus:outline-none"/>
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-3"><FlagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/><span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prioridad</span></div>
                            <div className="flex items-center gap-2 bg-black/5 dark:bg-black/20 p-1 rounded-full">
                                {(['low', 'medium', 'high'] as Priority[]).map(p => (
                                    <button key={p} onClick={() => setPriority(p)} className={`w-full text-xs py-1.5 rounded-full transition-all ${priority === p ? `${priorityMap[p].base} ${priorityMap[p].text} font-semibold shadow-md` : 'text-gray-700 dark:text-gray-300'}`}>{priorityMap[p].label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-3">
                                <BellIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                                <label htmlFor="reminder" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recordatorio</label>
                                <select id="reminder" value={isCustomReminder ? 'custom' : reminderOffset} onChange={e => handleReminderChange(e.target.value)} className="ml-auto bg-transparent text-gray-700 dark:text-gray-200 text-sm text-right focus:outline-none appearance-none">
                                    <option value="0">Nunca</option>
                                    <option value="10">10 min antes</option>
                                    <option value="30">30 min antes</option>
                                    <option value="60">1 hora antes</option>
                                    <option value="custom">Hora personalizada...</option>
                                </select>
                            </div>
                            {isCustomReminder && (
                                <input 
                                    type="time"
                                    value={customReminderTime}
                                    onChange={e => setCustomReminderTime(e.target.value)}
                                    disabled={!due_date}
                                    className="mt-2 w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"
                                    title={!due_date ? "Establece una fecha para la tarea primero" : ""}
                                />
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                     <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade notas..." className="w-full bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600/50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-sm" rows={3}></textarea>
                </main>

                <footer className="flex-shrink-0 p-4 border-t border-secondary-light/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
                    <button onClick={handleSave} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform active:scale-95 transition-all duration-200">
                        Guardar Cambios
                    </button>
                </footer>
            </div>
            <ConfirmationModal
                isOpen={isDeleting}
                onClose={() => setIsDeleting(false)}
                onConfirm={confirmDelete}
                title="Eliminar Tarea"
                message="¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer."
            />
        </>
    );
};

export default MobileTaskEditor;