import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { Priority, Project, Todo } from '../types';
import { formatTime12h, formatDateRangeSafe } from '../src/utils/dateFormatter';

interface MobileTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask?: (text: string, options?: any) => Promise<void> | void;
  onEditTask?: (task: Todo, text: string, options?: any) => Promise<void> | void;
  taskToEdit?: Todo | null;
  projects?: Project[];
  fixedProjectId?: number | null;
}

type ActiveSheet = 'main' | 'date' | 'time' | 'repeat' | 'reminder' | 'subtasks' | 'notes';

const MobileTaskDrawer: React.FC<MobileTaskDrawerProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onEditTask,
  taskToEdit,
  projects = [],
  fixedProjectId = null
}) => {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('main');
  const [text, setText] = useState(taskToEdit?.text || '');
  const [dueDate, setDueDate] = useState(taskToEdit?.due_date || new Date().toISOString().split('T')[0]);
  const [hasDueDate, setHasDueDate] = useState(!!(taskToEdit?.due_date || true));
  const [hasEndDate, setHasEndDate] = useState(!!taskToEdit?.end_date);
  const [endDate, setEndDate] = useState(taskToEdit?.end_date || '');
  
  const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || 'medium');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(fixedProjectId || taskToEdit?.project_id || null);
  const [assignee, setAssignee] = useState<string | null>(taskToEdit?.assignee || taskToEdit?.assigned_to || null);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [timeEnabled, setTimeEnabled] = useState(!!taskToEdit?.start_time || !!taskToEdit?.time);
  const [time, setTime] = useState(taskToEdit?.start_time || taskToEdit?.time || '');
  const [endTime, setEndTime] = useState(taskToEdit?.end_time || '');
  
  const [repeatEnabled, setRepeatEnabled] = useState(taskToEdit?.recurrence?.frequency && taskToEdit?.recurrence?.frequency !== 'none' || (taskToEdit?.repeat && taskToEdit?.repeat !== 'none'));
  const [repeat, setRepeat] = useState(taskToEdit?.recurrence?.frequency || taskToEdit?.repeat || 'none');
  const [customRepeatDays, setCustomRepeatDays] = useState<string[]>(taskToEdit?.recurrence?.customDays?.map(d => d.toString()) || []);
  
  const [reminderEnabled, setReminderEnabled] = useState(!!taskToEdit?.reminder_offset || !!taskToEdit?.reminder_at);
  const [reminder, setReminder] = useState(taskToEdit?.reminder_offset || (taskToEdit?.reminder_at ? '30m' : 'none'));
  
  const [notes, setNotes] = useState(taskToEdit?.notes || taskToEdit?.description || '');
  const [subtasks, setSubtasks] = useState<{ id: string, title: string, completed: boolean }[]>((taskToEdit?.subtasks || []).map(st => ({ 
      id: st.id.toString(), 
      title: st.text || st.title, 
      completed: st.completed 
  })));

  useEffect(() => {
      if(isOpen) {
        if(taskToEdit) {
          setText(taskToEdit.text || '');
          setDueDate(taskToEdit.due_date || new Date().toISOString().split('T')[0]);
          setHasDueDate(!!taskToEdit.due_date);
          setHasEndDate(!!taskToEdit.end_date);
          setEndDate(taskToEdit.end_date || '');
          setPriority(taskToEdit.priority || 'medium');
          setSelectedProjectId(fixedProjectId || taskToEdit.project_id || null);
          setAssignee(taskToEdit.assignee || taskToEdit.assigned_to || null);
          setNotes(taskToEdit.notes || taskToEdit.description || '');
          setSubtasks((taskToEdit.subtasks || []).map(st => ({ 
              id: st.id.toString(), 
              title: st.text || st.title || '', 
              completed: st.completed || false 
          })));
          setTime(taskToEdit.start_time || taskToEdit.time || '');
          setEndTime(taskToEdit.end_time || '');
          setTimeEnabled(!!taskToEdit.start_time || !!taskToEdit.time);
          
          const freq = taskToEdit.recurrence?.frequency || taskToEdit.repeat || 'none';
          setRepeat(freq);
          setRepeatEnabled(freq !== 'none');
          setCustomRepeatDays(taskToEdit.recurrence?.customDays?.map(d => d.toString()) || []);
          
          setReminderEnabled(!!taskToEdit.reminder_offset || !!taskToEdit.reminder_at);
          setReminder(taskToEdit.reminder_offset || (taskToEdit.reminder_at ? '30m' : 'none'));
        } else {
          setText('');
          setDueDate(new Date().toISOString().split('T')[0]);
          setHasDueDate(true);
          setHasEndDate(false);
          setEndDate('');
          setPriority('medium');
          setSelectedProjectId(fixedProjectId || null);
          setAssignee(null);
          setNotes('');
          setTime('');
          setEndTime('');
          setRepeat('none');
          setCustomRepeatDays([]);
          setSubtasks([]);
          setTimeEnabled(false);
          setRepeatEnabled(false);
          setReminderEnabled(false);
          setReminder('none');
        }
        setShowAdvanced(false);
        setActiveSheet('main');
      }
  }, [taskToEdit, fixedProjectId, isOpen]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const options = {
        dueDate: hasDueDate ? dueDate : null,
        due_date: hasDueDate ? dueDate : null,
        endDate: hasEndDate && endDate ? endDate : null,
        end_date: hasEndDate && endDate ? endDate : null,
        startTime: timeEnabled && time ? time : null,
        start_time: timeEnabled && time ? time : null,
        endTime: timeEnabled && endTime ? endTime : null,
        end_time: timeEnabled && endTime ? endTime : null,
        recurrence: repeatEnabled && repeat !== 'none' ? { frequency: repeat, customDays: repeat === 'custom' ? customRepeatDays : undefined } : { frequency: 'none' },
        reminder_offset: reminderEnabled && reminder !== 'none' ? reminder : null,
        notes: notes,
        description: notes,
        subtasks: subtasks.map(st => ({ 
            id: parseInt(st.id) || Date.now() + Math.random(), 
            text: st.title, 
            completed: st.completed 
        })),
        priority,
        projectId: fixedProjectId ?? selectedProjectId,
        project_id: fixedProjectId ?? selectedProjectId,
        assignee: isAdvancedProject ? assignee : null,
        assigned_to: isAdvancedProject ? assignee : null
    };
    
    if (taskToEdit && onEditTask) {
        await onEditTask(taskToEdit, text.trim(), options);
    } else if (onAddTask) {
        await onAddTask(text.trim(), options);
    }
    onClose();
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isAdvancedProject = selectedProject?.project_mode === 'advanced';

  const renderHeader = (title: string) => (
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <button onClick={() => setActiveSheet('main')} className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Volver</button>
          <h3 className="font-bold text-zinc-900 dark:text-white">{title}</h3>
          <div className="w-10"></div>
      </div>
  );

  const renderMainSheet = () => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto pb-8"
    >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Título de la tarea"
          className="w-full text-lg font-bold bg-transparent placeholder-zinc-400 focus:outline-none dark:text-white"
        />
        
        <div className="grid grid-cols-2 gap-3 mb-2">
           <div className="space-y-1 min-w-0 cursor-pointer" onClick={() => setActiveSheet('date')}>
               <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">
                   <span>FECHA</span>
               </div>
               <div className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium dark:text-white flex items-center justify-between">
                   <span className={!hasDueDate ? 'opacity-50' : ''}>
                       {hasDueDate ? formatDateRangeSafe(dueDate, hasEndDate ? endDate : null) : 'Sin fecha'}
                   </span>
               </div>
           </div>
           <div className="space-y-1 min-w-0">
               <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Prioridad</label>
               <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white appearance-none">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
               </select>
           </div>
        </div>

        <div className={isAdvancedProject && !fixedProjectId ? "grid grid-cols-2 gap-3" : ""}>
            {!fixedProjectId && (
                <div className="min-w-0 w-full mb-3">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Proyecto</label>
                  <select value={selectedProjectId || ''} onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setSelectedProjectId(val);
                    const proj = projects.find(p => p.id === val);
                    if (proj?.project_mode !== 'advanced') {
                      setAssignee(null);
                    }
                  }} className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white appearance-none">
                      <option value="">Ninguno</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
            )}
            {isAdvancedProject && (
                <div className="min-w-0 w-full mb-3">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Asignar a</label>
                  <select value={assignee || ''} onChange={e => setAssignee(e.target.value || null)} className="w-full min-w-0 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm font-medium dark:text-white appearance-none">
                          <option value="">General (Sin asignar)</option>
                          {selectedProject?.members?.map(m => <option key={m.id || m.email} value={m.email || m.name}>{m.name || m.email}</option>)}
                  </select>
                </div>
            )}
        </div>

        {!showAdvanced && (timeEnabled || (repeatEnabled && repeat !== 'none') || (reminderEnabled && reminder !== 'none') || subtasks.length > 0 || notes) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 pt-2 pb-1">
                {timeEnabled && time && (
                    <span onClick={() => setActiveSheet('time')} className="cursor-pointer px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {formatTime12h(time)}{endTime ? ` - ${formatTime12h(endTime)}` : ''}
                    </span>
                )}
                {reminderEnabled && reminder !== 'none' && (
                    <span onClick={() => setActiveSheet('reminder')} className="cursor-pointer px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {reminder === '5m' ? '5 min antes' : reminder === '15m' ? '15 min antes' : reminder === '1h' ? '1 hora antes' : reminder === '1d' ? '1 día antes' : reminder}
                    </span>
                )}
                {repeatEnabled && repeat !== 'none' && (
                    <span onClick={() => setActiveSheet('repeat')} className="cursor-pointer px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {repeat === 'daily' ? 'Diario' : repeat === 'weekly' ? 'Semanal' : repeat === 'monthly' ? 'Mensual' : 'Personalizado'}
                    </span>
                )}
                {subtasks.length > 0 && (
                    <span onClick={() => setActiveSheet('subtasks')} className="cursor-pointer px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {subtasks.filter(s => s.completed).length}/{subtasks.length} Subtareas
                    </span>
                )}
                {notes && (
                    <span onClick={() => setActiveSheet('notes')} className="cursor-pointer px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Notas añadidas
                    </span>
                )}
            </motion.div>
        )}

        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 gap-1.5 py-2 mt-2">
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
                  <div className="pt-2 space-y-0">
                      <div className="h-px bg-zinc-200 dark:bg-zinc-700/50 w-full mb-1" />
                      
                      <button onClick={() => setActiveSheet('time')} className="flex items-center justify-between w-full py-3">
                         <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Hora</span>
                         <div className="flex items-center text-sm text-zinc-500 gap-1">
                             {timeEnabled && time ? `${time}${endTime ? ' - '+endTime : ''}` : 'Añadir'}
                             <ChevronRight className="w-4 h-4" />
                         </div>
                      </button>
                      
                      <button onClick={() => setActiveSheet('repeat')} className="flex items-center justify-between w-full py-3 border-t border-zinc-100 dark:border-zinc-800">
                         <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Repetición</span>
                         <div className="flex items-center text-sm text-zinc-500 gap-1">
                             {repeatEnabled && repeat !== 'none' ? (repeat === 'daily' ? 'Diario' : repeat === 'weekly' ? 'Semanal' : repeat === 'monthly' ? 'Mensual' : 'Personalizado') : 'No repetir'}
                             <ChevronRight className="w-4 h-4" />
                         </div>
                      </button>
                      
                      <button onClick={() => setActiveSheet('reminder')} className="flex items-center justify-between w-full py-3 border-t border-zinc-100 dark:border-zinc-800">
                         <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Recordatorio</span>
                         <div className="flex items-center text-sm text-zinc-500 gap-1">
                             {reminderEnabled && reminder !== 'none' ? (reminder === '5m' ? '5 min' : reminder === '15m' ? '15 min' : reminder === '1h' ? '1 hora' : '1 día') : 'Ninguno'}
                             <ChevronRight className="w-4 h-4" />
                         </div>
                      </button>
                      
                      <button onClick={() => setActiveSheet('subtasks')} className="flex items-center justify-between w-full py-3 border-t border-zinc-100 dark:border-zinc-800">
                         <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Subtareas</span>
                         <div className="flex items-center text-sm text-zinc-500 gap-1">
                             {subtasks.length}
                             <ChevronRight className="w-4 h-4" />
                         </div>
                      </button>
                      
                      <button onClick={() => setActiveSheet('notes')} className="flex items-center justify-between w-full py-3 border-t border-zinc-100 dark:border-zinc-800">
                         <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Notas</span>
                         <div className="flex items-center text-sm text-zinc-500 gap-1">
                             {notes ? 'Añadidas' : ''}
                             <ChevronRight className="w-4 h-4" />
                         </div>
                      </button>
                      
                      <div className="h-px bg-zinc-200 dark:bg-zinc-700/50 w-full mt-1 mb-2" />
                  </div>
              </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleSubmit} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl shrink-0 mt-4">
          {taskToEdit ? 'Guardar Cambios' : 'Guardar Tarea'}
        </button>
    </motion.div>
  );

  const renderDateSheet = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full max-h-[70vh]">
        {renderHeader('Fecha')}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
           <label className="flex items-center gap-3">
               <input type="radio" name="dateType" checked={hasDueDate && !hasEndDate} onChange={() => { setHasDueDate(true); setHasEndDate(false); setEndDate(''); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Un día</span>
           </label>
           {hasDueDate && !hasEndDate && (
               <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-[calc(100%-28px)] ml-7 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm dark:text-white" />
           )}
           
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="dateType" checked={hasDueDate && hasEndDate} onChange={() => { setHasDueDate(true); setHasEndDate(true); if(!endDate) setEndDate(dueDate || new Date().toISOString().split('T')[0]); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Rango de fechas</span>
           </label>
           {hasDueDate && hasEndDate && (
               <div className="flex flex-col gap-2 ml-7 w-[calc(100%-28px)]">
                   <div className="space-y-1">
                       <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Inicio</label>
                       <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm dark:text-white" />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Fin</label>
                       <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm dark:text-white" />
                   </div>
               </div>
           )}
           
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="dateType" checked={!hasDueDate} onChange={() => { setHasDueDate(false); setHasEndDate(false); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Sin fecha</span>
           </label>
           
           <div className="pt-4 mt-auto">
             <button onClick={() => setActiveSheet('main')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
                Listo
             </button>
           </div>
        </div>
    </motion.div>
  );

  const renderTimeSheet = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full max-h-[70vh]">
        {renderHeader('Hora')}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
           <label className="flex items-center gap-3">
               <input type="radio" name="timeType" checked={!timeEnabled} onChange={() => { setTimeEnabled(false); setTime(''); setEndTime(''); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Sin hora</span>
           </label>
           
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="timeType" checked={timeEnabled} onChange={() => { setTimeEnabled(true); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Establecer hora</span>
           </label>
           {timeEnabled && (
               <div className="grid grid-cols-2 gap-3 ml-7 w-[calc(100%-28px)] mt-2">
                   <div className="space-y-1">
                       <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Inicio</label>
                       <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm dark:text-white" />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Fin</label>
                       <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm dark:text-white" />
                   </div>
               </div>
           )}
           
           <div className="pt-4 mt-auto">
               <button onClick={() => setActiveSheet('main')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
                  Listo
               </button>
           </div>
        </div>
    </motion.div>
  );

  const renderRepeatSheet = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full max-h-[70vh]">
        {renderHeader('Repetición')}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
           <label className="flex items-center gap-3">
               <input type="radio" name="repeatType" checked={!repeatEnabled || repeat === 'none'} onChange={() => { setRepeatEnabled(false); setRepeat('none'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">No repetir</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="repeatType" checked={repeatEnabled && repeat === 'daily'} onChange={() => { setRepeatEnabled(true); setRepeat('daily'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Todos los días</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="repeatType" checked={repeatEnabled && repeat === 'weekly'} onChange={() => { setRepeatEnabled(true); setRepeat('weekly'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Cada semana</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="repeatType" checked={repeatEnabled && repeat === 'monthly'} onChange={() => { setRepeatEnabled(true); setRepeat('monthly'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Cada mes</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="repeatType" checked={repeatEnabled && repeat === 'custom'} onChange={() => { setRepeatEnabled(true); setRepeat('custom'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Personalizado</span>
           </label>
           
           {repeatEnabled && repeat === 'custom' && (
               <div className="flex justify-between mt-4 ml-7 w-[calc(100%-28px)]">
                   {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                       <button key={day} type="button" onClick={() => setCustomRepeatDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${customRepeatDays.includes(day) ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                           {day}
                       </button>
                   ))}
               </div>
           )}
           
           <div className="pt-4 mt-auto">
               <button onClick={() => setActiveSheet('main')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
                  Listo
               </button>
           </div>
        </div>
    </motion.div>
  );

  const renderReminderSheet = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full max-h-[70vh]">
        {renderHeader('Recordatorio')}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
           <label className="flex items-center gap-3">
               <input type="radio" name="reminderType" checked={!reminderEnabled || reminder === 'none'} onChange={() => { setReminderEnabled(false); setReminder('none'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">Sin recordatorio</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="reminderType" checked={reminderEnabled && reminder === '5m'} onChange={() => { setReminderEnabled(true); setReminder('5m'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">5 minutos antes</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="reminderType" checked={reminderEnabled && reminder === '15m'} onChange={() => { setReminderEnabled(true); setReminder('15m'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">15 minutos antes</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="reminderType" checked={reminderEnabled && reminder === '1h'} onChange={() => { setReminderEnabled(true); setReminder('1h'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">1 hora antes</span>
           </label>
           <label className="flex items-center gap-3 mt-4">
               <input type="radio" name="reminderType" checked={reminderEnabled && reminder === '1d'} onChange={() => { setReminderEnabled(true); setReminder('1d'); }} className="w-4 h-4 text-zinc-900 focus:ring-zinc-900" />
               <span className="text-sm font-semibold dark:text-white">1 día antes</span>
           </label>
           
           <div className="pt-4 mt-auto">
               <button onClick={() => setActiveSheet('main')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
                  Listo
               </button>
           </div>
        </div>
    </motion.div>
  );

  const renderSubtasksSheet = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full max-h-[70vh]">
        {renderHeader('Subtareas')}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-3">
                {subtasks.map(st => (
                    <div key={st.id} className="flex items-start gap-3 group">
                        <input type="checkbox" checked={st.completed} onChange={() => setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))} className="w-5 h-5 mt-1 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900" />
                        <textarea value={st.title} onChange={e => setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, title: e.target.value } : s))} placeholder="Título de subtarea..." className="flex-1 bg-transparent border-b border-zinc-200 dark:border-zinc-700 outline-none text-sm p-1 dark:text-white resize-none" rows={2} />
                        <button type="button" onClick={() => setSubtasks(prev => prev.filter(s => s.id !== st.id))} className="text-zinc-400 hover:text-red-500 p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={() => setSubtasks(prev => [...prev, { id: Math.random().toString(36).substring(7), title: '', completed: false }])} className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 mt-2">
                    + Añadir subtarea
                </button>
            </div>
            
            <div className="pt-4 mt-auto">
               <button onClick={() => setActiveSheet('main')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
                  Listo
               </button>
           </div>
        </div>
    </motion.div>
  );

  const renderNotesSheet = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full max-h-[70vh]">
        {renderHeader('Notas / Detalles')}
        <div className="p-4 sm:p-6 flex flex-col flex-1">
           <textarea 
               value={notes}
               onChange={e => setNotes(e.target.value)}
               placeholder="Añade detalles a esta tarea..."
               className="w-full flex-1 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-sm dark:text-white resize-none min-h-[200px]"
           />
           <div className="pt-4 mt-auto">
               <button onClick={() => setActiveSheet('main')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
                  Listo
               </button>
           </div>
        </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100010] flex items-end justify-center">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={onClose} 
          />
          <motion.div 
            layout
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center py-3.5 cursor-pointer shrink-0" onClick={onClose}>
                <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSheet}
                    className="flex-1 overflow-hidden flex flex-col min-h-0"
                >
                    {activeSheet === 'main' && renderMainSheet()}
                    {activeSheet === 'date' && renderDateSheet()}
                    {activeSheet === 'time' && renderTimeSheet()}
                    {activeSheet === 'repeat' && renderRepeatSheet()}
                    {activeSheet === 'reminder' && renderReminderSheet()}
                    {activeSheet === 'subtasks' && renderSubtasksSheet()}
                    {activeSheet === 'notes' && renderNotesSheet()}
                </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileTaskDrawer;
