import React, { useState, useEffect, ReactNode } from 'react';
import { Todo, Subtask, Priority, RecurrenceRule } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import CalendarIcon from './icons/CalendarIcon';
import ClockIcon from './icons/ClockIcon';
import FlagIcon from './icons/FlagIcon';
import BellIcon from './icons/BellIcon';
import RefreshIcon from './icons/RefreshIcon';
import NotesIcon from './icons/NotesIcon';

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

const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <div className="relative" onClick={() => onChange(!checked)}>
        <input type="checkbox" className="sr-only" checked={checked} readOnly />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-full' : ''}`}></div>
    </div>
);

const SettingRow: React.FC<{ icon: ReactNode; label: string; enabled: boolean; onToggle: (enabled: boolean) => void; children: ReactNode;}> = ({ icon, label, enabled, onToggle, children }) => (
    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => onToggle(!enabled)}>
            <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">{icon}</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
            </div>
            <Switch checked={enabled} onChange={onToggle} />
        </div>
        {enabled && (
            <div className="mt-3 pt-3 border-t border-yellow-200/50 dark:border-gray-600/50 animate-pop-in">
                {children}
            </div>
        )}
    </div>
);


const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, onSave, todo }) => {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [completed, setCompleted] = useState(false);

    // Main date
    const [due_date, setDueDate] = useState('');

    // Toggles
    const [hasTime, setHasTime] = useState(false);
    const [hasEndDate, setHasEndDate] = useState(false);
    const [hasNotes, setHasNotes] = useState(false);
    const [hasReminder, setHasReminder] = useState(false);
    const [hasRecurrence, setHasRecurrence] = useState(false);

    // Conditional State
    const [start_time, setStartTime] = useState('');
    const [end_time, setEndTime] = useState('');
    const [end_date, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [reminderType, setReminderType] = useState('0'); // '0', '10', '30', '60', 'custom'
    const [customReminderDate, setCustomReminderDate] = useState('');
    const [customReminderTime, setCustomReminderTime] = useState('');
    const [recurrence, setRecurrence] = useState<RecurrenceRule>({ frequency: 'none' });

    useEffect(() => {
        if (todo) {
            setText(todo.text || '');
            setPriority(todo.priority || 'medium');
            setSubtasks(todo.subtasks || []);
            setCompleted(todo.completed || false);
            setDueDate(todo.due_date || '');

            // Set toggles based on existing data
            setHasTime(!!todo.start_time);
            setHasEndDate(!!todo.end_date);
            setHasNotes(!!todo.notes);
            setHasReminder(!!todo.reminder_at || !!todo.reminder_offset);
            setHasRecurrence(todo.recurrence?.frequency !== 'none' && !!todo.recurrence);
            
            // Set conditional data
            setStartTime(todo.start_time || '');
            setEndTime(todo.end_time || '');
            setEndDate(todo.end_date || '');
            setNotes(todo.notes || '');
            setRecurrence(todo.recurrence || { frequency: 'none' });
            
            if (todo.reminder_at) {
                setReminderType('custom');
                const d = new Date(todo.reminder_at);
                setCustomReminderDate(d.toISOString().split('T')[0]);
                setCustomReminderTime(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`);
            } else {
                setReminderType(String(todo.reminder_offset || '0'));
                setCustomReminderDate('');
                setCustomReminderTime('');
            }
        }
    }, [todo]);

    const handleSave = async () => {
        if (!todo) return;

        let finalReminderAt: string | undefined = undefined;
        let finalReminderOffset: Todo['reminder_offset'] = 0;

        if (hasReminder) {
            if (reminderType === 'custom' && customReminderDate && customReminderTime) {
                const [year, month, day] = customReminderDate.split('-').map(Number);
                const [hour, minute] = customReminderTime.split(':').map(Number);
                const reminderDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
                finalReminderAt = reminderDate.toISOString();
            } else if (reminderType !== 'custom') {
                finalReminderOffset = Number(reminderType) as Todo['reminder_offset'];
            }
        }
        
        if (hasReminder && 'Notification' in window && Notification.permission !== 'granted') {
             alert("Para recibir recordatorios, activa las notificaciones usando el ícono de la campana en la pantalla principal.");
        }

        const reminderChanged = todo.reminder_at !== finalReminderAt || todo.reminder_offset !== finalReminderOffset;

        onSave({
            ...todo,
            text,
            notes: hasNotes ? notes : undefined,
            due_date: due_date || undefined,
            end_date: hasEndDate ? end_date || undefined : undefined,
            completed,
            start_time: hasTime ? start_time || undefined : undefined,
            end_time: hasTime ? end_time || undefined : undefined,
            priority,
            reminder_offset: hasReminder && reminderType !== 'custom' ? finalReminderOffset : undefined,
            reminder_at: hasReminder && reminderType === 'custom' ? finalReminderAt : undefined,
            recurrence: hasRecurrence ? recurrence : { frequency: 'none' },
            subtasks,
            notification_sent: reminderChanged ? false : todo.notification_sent,
        });
        onClose();
    };

    const handleAddSubtask = () => {
        if (newSubtaskText.trim() === '') return;
        setSubtasks([...subtasks, { id: Date.now(), text: newSubtaskText, completed: false }]);
        setNewSubtaskText('');
    };

    const handleToggleSubtask = (id: number) => setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
    const handleDeleteSubtask = (id: number) => setSubtasks(subtasks.filter(st => st.id !== id));
    
    const handleCustomDayToggle = (dayIndex: number) => {
        setRecurrence(prev => {
            const currentDays = prev.customDays || [];
            const newDays = currentDays.includes(dayIndex) ? currentDays.filter(d => d !== dayIndex) : [...currentDays, dayIndex];
            return { ...prev, customDays: newDays.sort((a,b) => a - b) };
        });
    };

    if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[1001] p-2 sm:p-4" onClick={onClose}>
        <div className="bg-gradient-to-br from-yellow-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col h-auto max-h-[90vh] animate-pop-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <header className="flex items-center justify-between p-3 md:p-4 flex-shrink-0 border-b border-yellow-300/50 dark:border-gray-700/50">
                <input type="text" value={text} onChange={e => setText(e.target.value)} className="text-lg font-bold text-pink-500 dark:text-pink-400 bg-transparent focus:outline-none w-full" placeholder="Nombre de la tarea" />
                <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-pink-100 dark:hover:bg-gray-700 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"><CloseIcon /></button>
            </header>

            {/* Body */}
            <main className="flex-grow flex flex-col md:flex-row gap-4 overflow-y-auto min-h-0 custom-scrollbar">
                {/* Left Column */}
                <div className="flex-grow md:w-3/5 p-3 md:p-4 space-y-4">
                    {/* Subtasks */}
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-gray-300">Sub-tareas</label>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center bg-white/60 dark:bg-gray-700/60 p-2 rounded-lg group">
                                    <input type="checkbox" id={`subtask-${subtask.id}`} checked={subtask.completed} onChange={() => handleToggleSubtask(subtask.id)} className="sr-only"/>
                                    <label htmlFor={`subtask-${subtask.id}`} className={`w-5 h-5 rounded-md border-2 transition-all duration-200 cursor-pointer ${subtask.completed ? 'bg-pink-300 border-pink-300' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                                        {subtask.completed && <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                    </label>
                                    <span className={`ml-3 flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{subtask.text}</span>
                                    <button onClick={() => handleDeleteSubtask(subtask.id)} className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleAddSubtask(); }} className="mt-2 flex gap-2">
                            <input type="text" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} placeholder="Añadir nueva sub-tarea" className="flex-grow bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-2 border-yellow-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 transition-colors text-sm"/>
                            <button type="submit" className="bg-pink-400 text-white p-2 rounded-lg hover:bg-pink-500 transition-colors flex-shrink-0"><PlusIcon /></button>
                        </form>
                    </div>
                    
                    {hasNotes && (
                        <div className="animate-pop-in">
                            <label className="text-sm font-bold text-gray-600 dark:text-gray-300">Notas</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade detalles..." className="mt-1 w-full bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 transition-colors text-sm" rows={4}></textarea>
                        </div>
                    )}

                </div>

                {/* Right Column */}
                <aside className="md:w-2/5 flex-shrink-0 bg-black/5 dark:bg-black/20 p-3 md:p-4 md:border-l border-yellow-300/50 dark:border-gray-700/50 space-y-3">
                    {/* Date Section */}
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 space-y-3">
                        <div>
                            <label htmlFor="due-date" className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2"><CalendarIcon className="h-4 w-4" /> Fecha</label>
                            <div className="flex items-center gap-2">
                                <input type="date" id="due-date" value={due_date} onChange={e => setDueDate(e.target.value)} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-sm"/>
                                {hasEndDate && <span className="text-gray-500 dark:text-gray-400 font-semibold text-sm">a</span>}
                                {hasEndDate && <input type="date" value={end_date} onChange={e => setEndDate(e.target.value)} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 text-sm"/>}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-yellow-200/50 dark:border-gray-600/50">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Establecer rango</span>
                            <Switch checked={hasEndDate} onChange={setHasEndDate} />
                        </div>
                    </div>
                    
                    {/* Priority */}
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3">
                         <div className="flex items-center gap-2 mb-2"><FlagIcon className="h-4 w-4 text-gray-500 dark:text-gray-400"/><span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prioridad</span></div>
                         <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-600/50 p-1 rounded-full">
                            {(['low', 'medium', 'high'] as Priority[]).map(p => (
                                <button key={p} onClick={() => setPriority(p)} className={`w-full text-xs py-1 rounded-full transition-colors ${priority === p ? `${priorityMap[p].base} ${priorityMap[p].text} font-semibold shadow` : 'text-gray-900 dark:text-gray-200 hover:bg-yellow-100 dark:hover:bg-gray-600'}`}>{priorityMap[p].label}</button>
                            ))}
                        </div>
                     </div>

                    {/* Conditional Settings */}
                    <SettingRow icon={<ClockIcon className="h-4 w-4"/>} label="Añadir hora" enabled={hasTime} onToggle={setHasTime}>
                         <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Inicio</label>
                                <input type="time" value={start_time} onChange={e => setStartTime(e.target.value)} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300"/>
                            </div>
                             <div>
                                <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Fin</label>
                                <input type="time" value={end_time} onChange={e => setEndTime(e.target.value)} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300"/>
                            </div>
                         </div>
                    </SettingRow>

                     <SettingRow icon={<BellIcon className="h-4 w-4"/>} label="Recordatorio" enabled={hasReminder} onToggle={setHasReminder}>
                        <select value={reminderType} onChange={e => setReminderType(e.target.value)} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm appearance-none">
                            <option value="0">Nunca</option>
                            <option value="10">10 min antes</option>
                            <option value="30">30 min antes</option>
                            <option value="60">1 hora antes</option>
                            <option value="custom">Personalizado...</option>
                        </select>
                        {reminderType === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input type="date" value={customReminderDate} onChange={e => setCustomReminderDate(e.target.value)} disabled={!due_date} className="bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm disabled:opacity-50"/>
                                <input type="time" value={customReminderTime} onChange={e => setCustomReminderTime(e.target.value)} disabled={!due_date} className="bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm disabled:opacity-50"/>
                            </div>
                        )}
                    </SettingRow>
                    
                     <SettingRow icon={<NotesIcon />} label="Añadir notas" enabled={hasNotes} onToggle={setHasNotes}><div/></SettingRow>

                    <SettingRow icon={<RefreshIcon className="h-4 w-4"/>} label="Repetir tarea" enabled={hasRecurrence} onToggle={setHasRecurrence}>
                         <div className="space-y-3">
                             <select value={recurrence.frequency} onChange={e => setRecurrence(r => ({ ...r, frequency: e.target.value as any }))} className="w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm appearance-none">
                                <option value="none">Nunca</option>
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="custom">Días personalizados</option>
                            </select>
                             {recurrence.frequency === 'custom' && (
                                <div className="flex justify-around gap-1 p-1 bg-white/60 dark:bg-gray-600/50 rounded-lg">
                                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dayLabel, index) => (
                                        <button key={index} onClick={() => handleCustomDayToggle(index)} className={`w-8 h-8 text-xs rounded-full transition-colors font-semibold ${recurrence.customDays?.includes(index) ? 'bg-pink-400 text-white shadow' : 'hover:bg-yellow-100 text-gray-700'}`}>{dayLabel}</button>
                                    ))}
                                </div>
                            )}
                             <div>
                                <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Finaliza</label>
                                <input type="date" value={recurrence.ends_on || ''} onChange={e => setRecurrence(r => ({ ...r, ends_on: e.target.value }))} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 text-gray-800 dark:text-gray-200 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"/>
                            </div>
                         </div>
                    </SettingRow>

                    {/* Status */}
                      <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Estado</span>
                          <Switch checked={completed} onChange={setCompleted} />
                      </div>
                </aside>
            </main>

            {/* Footer */}
            <footer className="flex-shrink-0 p-3 border-t border-yellow-300/50 dark:border-gray-700/50 flex justify-end bg-black/5 dark:bg-black/20 rounded-b-3xl">
                <button onClick={handleSave} className="bg-pink-400 text-white font-bold rounded-full px-6 py-2 shadow-md hover:bg-pink-500 transform hover:scale-105 active:scale-95 transition-all duration-200">Guardar Cambios</button>
            </footer>
        </div>
    </div>
  );
};

export default TaskDetailsModal;