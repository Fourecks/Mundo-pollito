import React, { useState, useEffect, useRef, ReactNode, useMemo } from 'react';
import { Todo, Subtask, Priority, RecurrenceRule, Project } from '../types';
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
import ChevronRightIcon from './icons/ChevronRightIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';

interface MobileTaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  onDelete: (id: number) => void;
  todo: Todo | null;
  projects: Project[];
}

const priorityMap: { [key in Priority]: { base: string; text: string; label: string } } = {
    low: { base: 'bg-blue-400', text: 'text-white', label: 'Baja' },
    medium: { base: 'bg-yellow-500', text: 'text-white', label: 'Media' },
    high: { base: 'bg-red-500', text: 'text-white', label: 'Alta' },
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <div className="relative" onClick={() => onChange(!checked)}>
        <input type="checkbox" className="sr-only" checked={checked} readOnly />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-full' : ''}`}></div>
    </div>
);

const SettingRow: React.FC<{ icon: ReactNode; label: string; enabled: boolean; onToggle: (enabled: boolean) => void; children: ReactNode; isSimple?: boolean;}> = ({ icon, label, enabled, onToggle, children, isSimple = false }) => (
    <div className={`border-b border-black/5 dark:border-white/10 ${isSimple ? '' : 'divide-y divide-secondary-light/50 dark:divide-gray-600/50'}`}>
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

const NavSettingRow: React.FC<{ icon: ReactNode; label: string; value: string; onClick: () => void;}> = ({ icon, label, value, onClick }) => (
    <div className="border-b border-black/5 dark:border-white/10 p-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={onClick}>
            <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400">{icon}</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{value}</span>
                <ChevronRightIcon /> 
            </div>
        </div>
    </div>
);


const MobileTaskEditor: React.FC<MobileTaskEditorProps> = ({ isOpen, onClose, onSave, onDelete, todo, projects = [] }) => {
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [completed, setCompleted] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [projectId, setProjectId] = useState<number | null>(null);

    const [isUndated, setIsUndated] = useState(false);
    const [due_date, setDueDate] = useState<string | null>('');

    const [hasTime, setHasTime] = useState(false);
    const [hasEndDate, setHasEndDate] = useState(false);
    const [hasNotes, setHasNotes] = useState(false);
    
    const [start_time, setStartTime] = useState('');
    const [end_time, setEndTime] = useState('');
    const [end_date, setEndDate] = useState('');
    const [notes, setNotes] = useState('');

    const [hasReminder, setHasReminder] = useState(false);
    const [reminderType, setReminderType] = useState('0');
    const [customReminderDate, setCustomReminderDate] = useState('');
    const [customReminderTime, setCustomReminderTime] = useState('');
    
    const [hasRecurrence, setHasRecurrence] = useState(false);
    const [recurrence, setRecurrence] = useState<RecurrenceRule>({ frequency: 'none' });
    
    const [activeSubView, setActiveSubView] = useState<'main' | 'reminder' | 'recurrence'>('main');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (todo) {
            setText(todo.text || '');
            setPriority(todo.priority || 'medium');
            setSubtasks(todo.subtasks || []);
            setCompleted(todo.completed || false);
            setDueDate(todo.due_date || null);
            setProjectId(todo.project_id || null);
            setIsUndated(!todo.due_date);

            setHasTime(!!todo.start_time);
            setHasEndDate(!!todo.end_date);
            setHasNotes(!!todo.notes);
            setHasReminder(!!todo.reminder_at || !!(todo.reminder_offset && todo.reminder_offset > 0));
            setHasRecurrence(todo.recurrence?.frequency !== 'none' && !!todo.recurrence);
            
            setStartTime(todo.start_time || '');
            setEndTime(todo.end_time || '');
            setEndDate(todo.end_date || '');
            setNotes(todo.notes || '');
            setRecurrence(todo.recurrence || { frequency: 'none' });
            
            if (todo.reminder_at) {
                setReminderType('custom');
                try {
                    const d = new Date(todo.reminder_at);
                    // Use local date parts for display
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const hour = String(d.getHours()).padStart(2, '0');
                    const minute = String(d.getMinutes()).padStart(2, '0');

                    setCustomReminderDate(`${year}-${month}-${day}`);
                    setCustomReminderTime(`${hour}:${minute}`);
                } catch(e) {/* invalid date */}
            } else {
                setReminderType(String(todo.reminder_offset || '0'));
                setCustomReminderDate('');
                setCustomReminderTime('');
            }
        }
        setActiveSubView('main');
    }, [todo]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [text]);
    
    const handleToggleUndated = (enabled: boolean) => {
        setIsUndated(enabled);
        if (enabled) {
            setDueDate(null);
            setHasEndDate(false);
        } else {
            setDueDate(todo?.due_date || formatDateKey(new Date()));
        }
    };

    const handleToggleTime = (enabled: boolean) => {
        setHasTime(enabled);
        if (!enabled) {
            setStartTime('');
            setEndTime('');
        }
    };

    const handleToggleNotes = (enabled: boolean) => {
        setHasNotes(enabled);
        if (!enabled) setNotes('');
    };

    const handleToggleReminder = (enabled: boolean) => {
        setHasReminder(enabled);
        if (!enabled) {
            setReminderType('0');
            setCustomReminderDate('');
            setCustomReminderTime('');
        }
    };

    const handleToggleRecurrence = (enabled: boolean) => {
        setHasRecurrence(enabled);
        if (!enabled) {
            setRecurrence({ frequency: 'none' });
        }
    };

    const handleSave = () => {
        if (!todo) return;
        
        const updatedTodoPayload: Partial<Todo> = { ...todo };

        updatedTodoPayload.text = text;
        updatedTodoPayload.completed = completed;
        updatedTodoPayload.priority = priority;
        updatedTodoPayload.subtasks = subtasks;
        updatedTodoPayload.project_id = projectId;

        updatedTodoPayload.due_date = due_date;
        updatedTodoPayload.end_date = hasEndDate && !isUndated ? (end_date || undefined) : undefined;
        updatedTodoPayload.start_time = hasTime && !isUndated ? (start_time || undefined) : undefined;
        updatedTodoPayload.end_time = hasTime && !isUndated ? (end_time || undefined) : undefined;
        updatedTodoPayload.notes = hasNotes ? notes : undefined;
        updatedTodoPayload.recurrence = hasRecurrence && !isUndated ? recurrence : { frequency: 'none' };
        
        let reminderChanged = false;

        if (hasReminder && !isUndated) {
            if (reminderType === 'custom' && customReminderTime) {
                const reminderDateStr = customReminderDate || due_date;
                if (reminderDateStr) {
                    const [year, month, day] = reminderDateStr.split('-').map(Number);
                    const [hour, minute] = customReminderTime.split(':').map(Number);
                    const localReminderDate = new Date(year, month - 1, day, hour, minute);
                    
                    updatedTodoPayload.reminder_at = localReminderDate.toISOString();
                    updatedTodoPayload.reminder_offset = undefined;
                } else {
                    updatedTodoPayload.reminder_at = undefined;
                    updatedTodoPayload.reminder_offset = undefined;
                }
            } else if (reminderType !== 'custom') {
                updatedTodoPayload.reminder_offset = Number(reminderType) as Todo['reminder_offset'];
                updatedTodoPayload.reminder_at = undefined;
            } else {
                updatedTodoPayload.reminder_offset = undefined;
                updatedTodoPayload.reminder_at = undefined;
            }
        } else {
            updatedTodoPayload.reminder_offset = undefined;
            updatedTodoPayload.reminder_at = undefined;
        }

        if (todo.reminder_at !== updatedTodoPayload.reminder_at || todo.reminder_offset !== updatedTodoPayload.reminder_offset) {
            reminderChanged = true;
        }
        updatedTodoPayload.notification_sent = reminderChanged ? false : todo.notification_sent;

        onSave(updatedTodoPayload as Todo);
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
    
    const reminderSummary = useMemo(() => {
        if (!hasReminder || isUndated) return 'Nunca';

        if (reminderType === 'custom') {
            if (customReminderTime) {
                const timePart = new Date(`1970-01-01T${customReminderTime}:00`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                if (customReminderDate) {
                    try {
                        const d = new Date(`${customReminderDate}T${customReminderTime}:00`);
                        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + timePart;
                    } catch (e) { /* ignore */ }
                }
                return `El día de la tarea a las ${timePart}`;
            }
            return 'Personalizado';
        }

        switch(reminderType) {
            case '10': return '10 min antes';
            case '30': return '30 min antes';
            case '60': return '1 hora antes';
            case '1440': return '1 día antes';
            default: return 'Nunca';
        }
    }, [hasReminder, reminderType, customReminderDate, customReminderTime, isUndated]);

    const recurrenceSummary = useMemo(() => {
        if (!hasRecurrence || isUndated) return 'Nunca';
        switch(recurrence.frequency) {
            case 'daily': return 'Diariamente';
            case 'weekly': return 'Semanalmente';
            case 'custom': return 'Personalizado';
            default: return 'Nunca';
        }
    }, [hasRecurrence, recurrence.frequency, isUndated]);

    if (!isOpen) return null;

    const renderMainView = () => (
         <>
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} className="w-full bg-transparent text-gray-800 dark:text-gray-100 text-xl font-bold focus:outline-none resize-none" placeholder="Nombre de la tarea" rows={1}/>

            <div className="space-y-2">
                {subtasks.map(st => (
                    <div key={st.id} className="flex items-center p-2 group border-b border-black/5 dark:border-white/5">
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
            
            <div className={`border-y border-black/5 dark:border-white/10 divide-y divide-secondary-light/50 dark:divide-gray-600/50 transition-opacity duration-300 ${isUndated ? 'opacity-50' : ''}`}>
                <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                        <label htmlFor="due-date" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Fecha</label>
                    </div>
                    <input type="date" id="due-date" value={due_date || ''} onChange={e => setDueDate(e.target.value)} disabled={isUndated} className="bg-transparent text-gray-700 dark:text-gray-200 text-sm text-right focus:outline-none disabled:text-gray-400"/>
                </div>
                <div className="p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Establecer rango</span>
                        <Switch checked={hasEndDate} onChange={setHasEndDate} />
                    </div>
                    {hasEndDate && (
                        <div className="mt-3 pt-3 border-t border-secondary-light/50 dark:border-gray-600/50 animate-pop-in">
                            <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Fecha de fin</label>
                            <input type="date" value={end_date} onChange={e => setEndDate(e.target.value)} disabled={isUndated} className="mt-1 w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-gray-500 dark:text-gray-400"><CalendarIcon className="h-5 w-5"/></span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sin fecha</span>
                </div>
                <Switch checked={isUndated} onChange={handleToggleUndated} />
            </div>

            <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <BriefcaseIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                    <label htmlFor="project-select" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Proyecto</label>
                </div>
                <select id="project-select" value={projectId === null ? '' : projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)} className="bg-transparent text-gray-700 dark:text-gray-200 text-sm text-right focus:outline-none max-w-[50%]">
                    <option value="">Sin proyecto</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>


            <div className="p-3 flex flex-col gap-2 border-b border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-3"><FlagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/><span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prioridad</span></div>
                    <div className="flex items-center gap-2 bg-black/5 dark:bg-black/20 p-1 rounded-full">
                    {/* FIX: Completed the truncated line */}
                    {(['low', 'medium', 'high'] as Priority[]).map(p => (<button key={p} onClick={() => setPriority(p)} className={`w-full text-xs py-1.5 rounded-full transition-all ${priority === p ? `${priorityMap[p].base} ${priorityMap[p].text} font-semibold shadow` : 'text-gray-700 dark:text-gray-300 hover:bg-white/50'}`}>{priorityMap[p].label}</button>))}
                    </div>
            </div>

            <div className={`transition-opacity duration-300 ${isUndated ? 'opacity-50 pointer-events-none' : ''}`}>
                <SettingRow icon={<ClockIcon className="h-5 w-5"/>} label="Añadir hora" enabled={hasTime} onToggle={handleToggleTime}>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Inicio</label>
                            <input type="time" value={start_time} onChange={e => setStartTime(e.target.value)} className="mt-1 w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                        <div>
                            <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Fin (opcional)</label>
                            <input type="time" value={end_time} onChange={e => setEndTime(e.target.value)} className="mt-1 w-full bg-white/80 dark:bg-gray-700/80 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                    </div>
                </SettingRow>

                <NavSettingRow icon={<BellIcon className="h-5 w-5"/>} label="Recordatorio" value={reminderSummary} onClick={() => setActiveSubView('reminder')} />
                <NavSettingRow icon={<RefreshIcon className="h-5 w-5"/>} label="Repetir tarea" value={recurrenceSummary} onClick={() => setActiveSubView('recurrence')} />
            </div>
            
            <SettingRow icon={<NotesIcon />} label="Añadir notas" enabled={hasNotes} onToggle={handleToggleNotes} isSimple>
                <div className="p-3 animate-pop-in">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Añade detalles..." className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm" rows={4}></textarea>
                </div>
            </SettingRow>

            <div className="p-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Estado</span>
                <Switch checked={completed} onChange={setCompleted} />
            </div>
        </>
    );
    
    const renderReminderSettings = () => (
        <div className="animate-fade-in">
            <header className="flex items-center gap-2 mb-3">
                <button onClick={() => setActiveSubView('main')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Configurar Recordatorio</h3>
            </header>
            <div className="space-y-3">
                <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Activar recordatorio</span>
                    <Switch checked={hasReminder} onChange={handleToggleReminder} />
                </div>
                {hasReminder && (
                     <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 space-y-2 animate-pop-in">
                        <select value={reminderType} onChange={e => setReminderType(e.target.value)} className="w-full bg-white/80 dark:bg-gray-600/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                            <option value="0">Nunca</option>
                            <option value="10">10 min antes</option>
                            <option value="30">30 min antes</option>
                            <option value="60">1 hora antes</option>
                            <option value="1440">1 día antes</option>
                            <option value="custom">Personalizado...</option>
                        </select>
                        {reminderType === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input type="date" value={customReminderDate} onChange={e => setCustomReminderDate(e.target.value)} disabled={!due_date} className="bg-white/80 dark:bg-gray-600/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"/>
                                <input type="time" value={customReminderTime} onChange={e => setCustomReminderTime(e.target.value)} disabled={!due_date} className="bg-white/80 dark:bg-gray-600/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50"/>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
    
    const renderRecurrenceSettings = () => (
         <div className="animate-fade-in">
            <header className="flex items-center gap-2 mb-3">
                <button onClick={() => setActiveSubView('main')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Configurar Repetición</h3>
            </header>
            <div className="space-y-3">
                <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Repetir tarea</span>
                    <Switch checked={hasRecurrence} onChange={handleToggleRecurrence} />
                </div>
                 {hasRecurrence && (
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 space-y-3 animate-pop-in">
                        <select value={recurrence.frequency} onChange={e => setRecurrence(r => ({ ...r, frequency: e.target.value as any }))} className="w-full bg-white/80 dark:bg-gray-600/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-500 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none">
                           <option value="none">Nunca</option>
                           <option value="daily">Diariamente</option>
                           <option value="weekly">Semanalmente</option>
                           <option value="custom">Días personalizados</option>
                       </select>
                        {recurrence.frequency === 'custom' && (
                           <div className="flex justify-around gap-1 p-1 bg-white/80 dark:bg-gray-600/80 rounded-lg">
                               {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dayLabel, index) => (
                                   <button key={index} onClick={() => handleCustomDayToggle(index)} className={`w-8 h-8 text-xs rounded-full transition-colors font-semibold ${recurrence.customDays?.includes(index) ? 'bg-primary text-white shadow' : 'hover:bg-yellow-100 text-gray-700'}`}>{dayLabel}</button>
                               ))}
                           </div>
                       )}
                        <div>
                           <label className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Finaliza</label>
                           <input type="date" value={recurrence.ends_on || ''} onChange={e => setRecurrence(r => ({ ...r, ends_on: e.target.value }))} className="mt-1 w-full bg-white/80 dark:bg-gray-600/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light dark:border-gray-500 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-primary text-sm"/>
                       </div>
                    </div>
                 )}
            </div>
        </div>
    );

    return (
        <div className={`fixed inset-0 bg-secondary-lighter dark:bg-gray-800 z-[60000] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
            <header className="flex-shrink-0 p-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <button onClick={() => setIsDeleting(true)} className="p-2 rounded-full text-gray-500 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                <button onClick={handleSave} className="bg-primary text-white font-bold rounded-full px-5 py-2 text-sm shadow-md hover:bg-primary-dark transition-all">Guardar</button>
            </header>
            <main className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar">
                {activeSubView === 'main' && renderMainView()}
                {activeSubView === 'reminder' && renderReminderSettings()}
                {activeSubView === 'recurrence' && renderRecurrenceSettings()}
            </main>
            <ConfirmationModal isOpen={isDeleting} onClose={() => setIsDeleting(false)} onConfirm={confirmDelete} title="Eliminar Tarea" message="¿Seguro que quieres eliminar esta tarea?"/>
        </div>
    );
};

export default MobileTaskEditor;
