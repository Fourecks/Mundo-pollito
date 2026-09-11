import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Flag, ChevronDown, ChevronUp, User, Clock, Repeat, Bell, ListChecks, FileText } from 'lucide-react';
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
      }
  }, [taskToEdit, fixedProjectId, isOpen]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const options = {
        dueDate: hasDueDate ? dueDate : null,
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
  // Robust detection: check mode OR existence of members
  const isAdvancedProject = selectedProject?.project_mode === 'advanced' || (selectedProject?.members && selectedProject.members.length > 0);

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
          
          <div className="flex gap-3">
             <div className="flex-1 space-y-1">
                 <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                     <button onClick={() => setHasDueDate(!hasDueDate)} className={`${hasDueDate ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                        {hasDueDate ? 'Fecha' : 'Sin fecha'}
                     </button>
                 </div>
                 <input 
                    type="date" 
                    disabled={!hasDueDate}
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className={`w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs dark:text-white ${!hasDueDate ? 'opacity-50' : ''}`} 
                 />
             </div>
             <div className="flex-1 space-y-1">
                 <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Prioridad</label>
                 <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs dark:text-white">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                 </select>
             </div>
          </div>

          <div className={isAdvancedProject ? "grid grid-cols-2 gap-3" : ""}>
              {!fixedProjectId && (
                  <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs dark:text-white">
                    <option value="">Proyecto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              )}
              {isAdvancedProject && (
                  <select value={assignee || ''} onChange={e => setAssignee(e.target.value || null)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs dark:text-white">
                         <option value="">Asignado a</option>
                         {selectedProject?.members?.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                  </select>
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
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-xs space-y-4">
                        <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100"><Clock className="w-4 h-4"/> Hora</div>
                        <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100"><Repeat className="w-4 h-4"/> Repetición</div>
                        <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100"><Bell className="w-4 h-4"/> Recordatorio</div>
                        <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100"><ListChecks className="w-4 h-4"/> Subtareas</div>
                        <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100"><FileText className="w-4 h-4"/> Notas</div>
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
