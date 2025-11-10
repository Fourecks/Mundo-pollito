import React, { useState, useEffect, useRef, ReactNode } from 'react';
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
import NotesIcon from './icons/NotesIcon';

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

const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <div className="relative" onClick={() => onChange(!checked)}>
        <input type="checkbox" className="sr-only" checked={checked} readOnly />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-full' : ''}`}></div>
    </div>
);

const SettingRow: React.FC<{ icon: ReactNode; label: string; enabled: boolean; onToggle: (enabled: boolean) => void; children: ReactNode; isSimple?: boolean;}> = ({ icon, label, enabled, onToggle, children, isSimple = false }) => (
    <div className={`bg-white/60 dark:bg-gray-700/60 rounded-xl ${isSimple ? '' : 'divide-y divide-secondary-light/50 dark:divide-gray-600/50'}`}>
        <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => onToggle(!enabled)}>
            <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400">{icon}</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
            </div>
            <Switch checked={enabled} onChange={onToggle} />
        </div>
        {enabled && (
            <div className="p-3 animate-pop-in">
                {children}
            </div>
        )}
    </div>
);

const MobileTaskEditor: React.FC<MobileTaskEditorProps> = ({ isOpen, onClose, onSave, onDelete, todo }) => {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [completed, setCompleted] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [due_date, setDueDate] = useState('');

    const [hasTime, setHasTime] = useState(false);
    const [hasEndDate, setHasEndDate] = useState(false);
    const [hasNotes, setHasNotes] = useState(false);
    const [hasReminder, setHasReminder] = useState(false);
    const [hasRecurrence, setHasRecurrence] = useState(false);

    const [start_time, setStartTime] = useState('');
    const [end_time, setEndTime] = useState('');
    const [end_date, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [reminderType, setReminderType] = useState('0');
    const [customReminderDate, setCustomReminderDate] = useState('');
    const [customReminderTime, setCustomReminderTime] = useState('');
    const [recurrence, setRecurrence] = useState<RecurrenceRule>({ frequency: 'none' });
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (todo) {
            setText(todo.text || '');
            setPriority(todo.priority || 'medium');
            setSubtasks(todo.subtasks || []);
            setCompleted(todo.completed || false);
            setDueDate(todo.due_date || '');

            setHasTime(!!todo.start_time);
            setHasEndDate(!!todo.end_date);
            setHasNotes(!!todo.notes);
            setHasReminder(!!todo.reminder_at || !!todo.reminder_offset);
            setHasRecurrence(todo.recurrence?.frequency !== 'none' && !!todo.recurrence);
            
            setStartTime(todo.start_time || '');
            setEndTime(todo.end_time || '');
            setEndDate(todo.end_date || '');
            setNotes(todo.notes || '');
            setRecurrence(todo.recurrence || { frequency: 'none' });
            
            if (todo.reminder_at) {
                setReminderType('custom');
                const d = new Date(todo.reminder_at);
                setCustomReminderDate(d.toISOString().split('T')[0]);
                setCustomReminderTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
            } else {
                setReminderType(String(todo.reminder_offset || '0'));
                setCustomReminderDate('');
                setCustomReminderTime('');
            }
        }
    }, [todo]);

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

        if (hasReminder) {
            if (reminderType === 'custom' && customReminderDate && customReminderTime) {
                finalReminderAt = new Date(`${customReminderDate}T${customReminderTime}:00`).toISOString();
            } else if (reminderType !== 'custom') {
                finalReminderOffset = Number(reminderType) as Todo['reminder_offset'];
            }
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
            reminder_offset: finalReminderOffset,
            reminder_at: finalReminderAt,
            recurrence: hasRecurrence ? recurrence : { frequency: 'none' },
            subtasks,
            notification_sent: reminderChanged ? false : todo.notification_sent,
        });
        onClose();
    };

    const confirmDelete = () => {
        if (todo) onDelete(todo.id);
        onClose();
        setIsDeleting(false);
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

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] animate-fade-in" onClick={onClose}></div>
            <div className="fixed bottom-0 left-0 right-0 max-h-[95vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[1001] animate-slide-up">
                <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50">
                    <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto"></div>
                    <button onClick={() => setIsDeleting(true)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full"><TrashIcon /></button>
                    <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary-dark dark:text-primary px-3 py-1 hover:bg-primary-light/50 dark:hover:bg-primary/20 rounded-full">Cerrar</button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                    <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} className="w-full bg-transparent text-gray-800 dark:text-gray-100 text-xl font-bold focus:outline-none resize-none" placeholder="Nombre de la tarea" rows={1}/>

                    <div className="space-y-2">
                        {subtasks.map(st => (
                            <div key={st.id} className="flex items-center bg-white/60 dark:bg-gray-700/60 p-2 rounded-lg group">
                                <input type="checkbox" id={`ms-${st.id}`} checked={st.completed} onChange={() => handleToggleSubtask(st.id)} className="sr-only"/>
                                <label htmlFor={`ms-${st.id}`} className={`w-5 h-5 rounded-md border-2 shrink-0 transition-all duration-200 cursor-pointer ${st.completed ? 'bg-primary/70 border-primary/70' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>{st.completed && <svg className="w-full h-full text-white p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}</label>
                                <span className={`ml-3 flex-grow text-sm truncate ${st.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{st.text}</span>
                                <button onClick={() => handleDeleteSubtask(st.id)} className="p-1 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                        <form onSubmit={(e) => { e.preventDefault(); handleAddSubtask(); }} className="flex gap-2">
                            <input type="text" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} placeholder="Añadir sub-tarea" className="flex-grow bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"/>
                            <button type="submit" className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark shrink-0"><PlusIcon /></button>
                        </form>
                    </div>
                    
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-3 flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                        <label htmlFor="due-date" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fecha</label>
                        <input type="date" id="due-date" value={due_date} onChange={e => setDueDate(e.target.value)} className="ml-auto bg-transparent text-gray-700 dark:text-gray-200 text-sm text-right focus:outline-none"/>
                    </div>
                    
                    <div className="space-y-2">
                        <SettingRow icon={<ClockIcon className="h-5 w-5"/>} label="Añadir hora" enabled={hasTime} onToggle={setHasTime}>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Inicio</label><input type="time" value={start_time} onChange={e => setStartTime(e.target.value)} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary"/></div>
                                <div><label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Fin</label><input type="time" value={end_time} onChange={e => setEndTime(e.target.value)} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary"/></div>
                            </div>
                        </SettingRow>
                         <SettingRow icon={<CalendarIcon className="h-5 w-5"/>} label="Establecer rango" enabled={hasEndDate} onToggle={setHasEndDate}>
                            <div><label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Fecha de fin</label><input type="date" value={end_date} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full bg-white/60 dark:bg-gray-600/50 border-2 border-yellow-200 dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary"/></div>
                        </SettingRow>
                        <SettingRow icon={<BellIcon className="h-5 w-5"/>} label="Recordatorio" enabled={hasReminder} onToggle={setHasReminder}>
                            <select value={reminderType} onChange={e => setReminderType(e.target.value)} className="w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 text-sm">
                                <option value="0">Nunca</option><option value="10">10 min antes</option><option value="30">30 min antes</option><option value="60">1 hora antes</option><option value="custom">Personalizado...</option>
                            </select>
                            {reminderType === 'custom' && (<div className="grid grid-cols-2 gap-2 mt-2"><input type="date" value={customReminderDate} onChange={e => setCustomReminderDate(e.target.value)} disabled={!due_date} className="bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5 text-sm disabled:opacity-50"/><input type="time" value={customReminderTime} onChange={e => setCustomReminderTime(e.target.value)} disabled={!due_date} className="bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5 text-sm disabled:opacity-50"/></div>)}
                        </SettingRow>
                         <SettingRow icon={<RefreshIcon className="h-5 w-5"/>} label="Repetir tarea" enabled={hasRecurrence} onToggle={setHasRecurrence}>
                             <div className="space-y-3"><select value={recurrence.frequency} onChange={e => setRecurrence(r => ({ ...r, frequency: e.target.value as any }))} className="w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 text-sm"><option value="none">Nunca</option><option value="daily">Diariamente</option><option value="weekly">Semanalmente</option><option value="custom">Días personalizados</option></select>{recurrence.frequency === 'custom' && (<div className="flex justify-around gap-1 p-1 bg-black/5 dark:bg-black/20 rounded-lg">{['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((day, i) => (<button key={i} onClick={() => handleCustomDayToggle(i)} className={`w-8 h-8 text-xs rounded-full font-semibold ${recurrence.customDays?.includes(i) ? 'bg-primary text-white shadow' : 'hover:bg-white text-gray-700 dark:text-gray-300'}`}>{day}</button>))}</div>)}<div><label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Finaliza</label><input type="date" value={recurrence.ends_on || ''} onChange={e => setRecurrence(r => ({ ...r, ends_on: e.target.value }))} className="mt-1 w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5 text-sm"/></div></div>
                        </SettingRow>
                        <SettingRow icon={<NotesIcon />} label="Añadir notas" enabled={hasNotes} onToggle={setHasNotes} isSimple={true}>
                             {hasNotes && <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade detalles..." className="w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" rows={3}></textarea>}
                        </SettingRow>
                    </div>

                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-3 flex flex-col gap-2">
                         <div className="flex items-center gap-3"><FlagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/><span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prioridad</span></div>
                         <div className="flex items-center gap-2 bg-black/5 dark:bg-black/20 p-1 rounded-full">
                            {(['low', 'medium', 'high'] as Priority[]).map(p => (<button key={p} onClick={() => setPriority(p)} className={`w-full text-xs py-1.5 rounded-full transition-all ${priority === p ? `${priorityMap[p].base} ${priorityMap[p].text} font-semibold shadow-md` : 'text-gray-700 dark:text-gray-300'}`}>{priorityMap[p].label}</button>))}
                        </div>
                    </div>

                </main>

                <footer className="flex-shrink-0 p-4 border-t border-secondary-light/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
                    <button onClick={handleSave} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform active:scale-95 transition-all duration-200">Guardar Cambios</button>
                </footer>
            </div>
            <ConfirmationModal isOpen={isDeleting} onClose={() => setIsDeleting(false)} onConfirm={confirmDelete} title="Eliminar Tarea" message="¿Estás seguro de que quieres eliminar esta tarea?"/>
        </>
    );
};

export default MobileTaskEditor;
