import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Flag, ChevronDown, ChevronUp, User, Clock, Repeat, Bell, ListChecks, FileText, ChevronRight } from 'lucide-react';
import { Priority, Project, Todo } from '../types';

interface MobileTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask?: (text: string, options?: any) => Promise<void> | void;
  onEditTask?: (task: Todo, text: string, options?: any) => Promise<void> | void;
  taskToEdit?: Todo | null;
  projects?: Project[];
  fixedProjectId?: number | null;
}

const MobileTaskDrawer: React.FC<MobileTaskDrawerProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onEditTask,
  taskToEdit,
  projects = [],
  fixedProjectId = null
}) => {
  const [text, setText] = useState(taskToEdit?.text || '');
  const [dueDate, setDueDate] = useState(taskToEdit?.due_date || new Date().toISOString().split('T')[0]);
  const [hasDueDate, setHasDueDate] = useState(!!(taskToEdit?.due_date || true));
  const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || 'medium');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(fixedProjectId || taskToEdit?.project_id || null);
  const [assignee, setAssignee] = useState<string | null>(taskToEdit?.assignee || null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options state
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeat, setRepeat] = useState('none');
  const [customRepeatDays, setCustomRepeatDays] = useState<string[]>([]);
  const [reminder, setReminder] = useState('none');
  const [notes, setNotes] = useState(taskToEdit?.description || '');
  const [subtasks, setSubtasks] = useState<{ id: string, title: string, completed: boolean }[]>([]);

  useEffect(() => {
      if(taskToEdit) {
        setText(taskToEdit.text);
        setDueDate(taskToEdit.due_date || new Date().toISOString().split('T')[0]);
        setHasDueDate(!!taskToEdit.due_date);
        setPriority(taskToEdit.priority || 'medium');
        setSelectedProjectId(fixedProjectId || taskToEdit.project_id || null);
        setAssignee(taskToEdit.assignee || null);
      } else {
        setText('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setHasDueDate(true);
        setPriority('medium');
        setSelectedProjectId(fixedProjectId || null);
        setAssignee(null);
        setNotes('');
        setTime('');
        setEndTime('');
        setRepeat('none');
        setCustomRepeatDays([]);
        setSubtasks([]);
      }
      setShowAdvanced(false);
      setHasEndDate(false);
      setEndDate('');
  }, [taskToEdit, fixedProjectId, isOpen]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const options = {
        dueDate: hasDueDate ? dueDate : null,
        endDate: hasEndDate ? endDate : null,
        time: time || null,
        endTime: endTime || null,
        repeat,
        customRepeatDays: repeat === 'custom' ? customRepeatDays : null,
        reminder,
        description: notes,
        subtasks,
        priority,
        projectId: fixedProjectId ?? selectedProjectId,
        assignee
    };
    
    if (taskToEdit && onEditTask) {
        await onEditTask(taskToEdit, text.trim(), options);
    } else if (onAddTask) {
        await onAddTask(text.trim(), options);
    }
    onClose();
  };

  if (!isOpen) return null;

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  console.log("Debugging selectedProject:", selectedProject);
  // Robust detection: Only advanced projects have Assignee field
  const isAdvancedProject = selectedProject?.project_mode === 'advanced';

  return (
    <div className="fixed inset-0 z-[100010] flex items-end justify-center bg-black/40 backdrop-blur-xs" onClick={onClose}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3.5 cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Título de la tarea"
            className="w-full text-lg font-bold bg-transparent placeholder-zinc-400 focus:outline-none dark:text-white"
          />
          
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1 min-w-0">
                 <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                     <span>{hasDueDate ? 'Fecha de inicio' : 'Sin fecha'}</span>
                 </div>
                 <input 
                    type="date" 
                    disabled={!hasDueDate}
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className={`w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white ${!hasDueDate ? 'opacity-50' : ''}`} 
                 />
             </div>
             <div className="space-y-1 min-w-0">
                 <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Prioridad</label>
                 <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                 </select>
             </div>
          </div>

          <div className={isAdvancedProject ? "grid grid-cols-2 gap-3" : ""}>
              {!fixedProjectId && (
                  <div className="min-w-0">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Proyecto</label>
                    <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)} className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white">
                        <option value="">Ninguno</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
              )}
              {isAdvancedProject && (
                  <div className="min-w-0">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Asignar a</label>
                    <select value={assignee || ''} onChange={e => setAssignee(e.target.value || null)} className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white">
                            <option value="">General (Sin asignar)</option>
                            {selectedProject?.members?.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                    </select>
                  </div>
              )}
          </div>

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 gap-1.5 py-2">
             {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             Más opciones
          </button>

          <AnimatePresence>
            {showAdvanced && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl space-y-4">
                        {/* FECHAS AVANZADAS */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sin fecha</span>
                                <input type="checkbox" checked={!hasDueDate} onChange={() => {
                                    const noDate = !hasDueDate;
                                    setHasDueDate(!noDate);
                                    if (noDate) setHasEndDate(false);
                                }} className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300" />
                            </div>
                            <div className={`flex items-center justify-between ${!hasDueDate ? 'opacity-50' : ''}`}>
                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Rango de fecha</span>
                                <input type="checkbox" checked={hasEndDate} disabled={!hasDueDate} onChange={() => {
                                    setHasEndDate(!hasEndDate);
                                }} className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300" />
                            </div>
                            {hasEndDate && (
                                <div className="pt-1">
                                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Fecha de finalización</label>
                                    <input 
                                        type="date" 
                                        disabled={!hasDueDate}
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm dark:text-white ${!hasDueDate ? 'opacity-50' : ''}`}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-zinc-200 dark:bg-zinc-700/50 w-full" />

                        {/* HORA */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Hora inicio</label>
                                <input 
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm dark:text-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Hora fin</label>
                                <input 
                                    type="time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm dark:text-white"
                                />
                            </div>
                        </div>

                        {/* REPETICION */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Repetición</label>
                            <select value={repeat} onChange={e => setRepeat(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm dark:text-white">
                                <option value="none">No repetir</option>
                                <option value="daily">Diariamente</option>
                                <option value="weekly">Semanalmente</option>
                                <option value="monthly">Mensualmente</option>
                                <option value="custom">Personalizada</option>
                            </select>
                            {repeat === 'custom' && (
                                <div className="flex justify-between mt-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                setCustomRepeatDays(prev => 
                                                    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                                                );
                                            }}
                                            className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                                                customRepeatDays.includes(day) 
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
                                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SUBTAREAS */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Subtareas</label>
                            <div className="space-y-2">
                                {subtasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={st.completed}
                                            onChange={() => {
                                                setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s));
                                            }}
                                            className="w-4 h-4 rounded text-zinc-900 border-zinc-300"
                                        />
                                        <input 
                                            value={st.title}
                                            onChange={e => {
                                                setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, title: e.target.value } : s));
                                            }}
                                            placeholder="Título de subtarea..."
                                            className="flex-1 bg-transparent border-b border-zinc-200 dark:border-zinc-700 outline-none text-sm px-1 py-0.5 dark:text-white"
                                        />
                                        <button type="button" onClick={() => setSubtasks(prev => prev.filter(s => s.id !== st.id))} className="text-zinc-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    onClick={() => setSubtasks(prev => [...prev, { id: Math.random().toString(36).substring(7), title: '', completed: false }])}
                                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                                >
                                    + Añadir subtarea
                                </button>
                            </div>
                        </div>

                        {/* RECORDATORIO */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Recordatorio</label>
                            <select value={reminder} onChange={e => setReminder(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm dark:text-white">
                                <option value="none">Sin recordatorio</option>
                                <option value="5m">5 min antes</option>
                                <option value="15m">15 min antes</option>
                                <option value="1h">1 hora antes</option>
                                <option value="1d">1 día antes</option>
                            </select>
                        </div>

                        {/* NOTAS */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Notas / Detalles</label>
                            <textarea 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Añade detalles a esta tarea..."
                                className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm dark:text-white min-h-[80px] resize-none"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          <button onClick={handleSubmit} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
            {taskToEdit ? 'Guardar Cambios' : 'Guardar Tarea'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MobileTaskDrawer;
