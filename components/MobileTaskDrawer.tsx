import React, { useState, useEffect } from 'react';
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
  const isAdvancedProject = selectedProject?.project_mode === 'advanced';

  return (
    <div className="fixed inset-0 z-[100010] flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-100 dark:border-zinc-800/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3.5 cursor-pointer">
            <div className="w-12 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Título de la tarea"
            className="w-full text-lg font-bold bg-transparent placeholder-zinc-400 focus:outline-none"
          />
          
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                 <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold">
                     <button onClick={() => setHasDueDate(!hasDueDate)} className={`${hasDueDate ? 'text-blue-500' : 'text-zinc-400'}`}>
                        {hasDueDate ? 'Fecha:' : 'Sin fecha'}
                     </button>
                 </div>
                 <input 
                    type="date" 
                    disabled={!hasDueDate}
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className={`w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs ${!hasDueDate ? 'opacity-50' : ''}`} 
                 />
             </div>
             <div className="space-y-1">
                 <label className="text-[10px] font-semibold text-zinc-500">Prioridad</label>
                 <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                 </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
              {!fixedProjectId && (
                  <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs">
                    <option value="">Proyecto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              )}
              {isAdvancedProject && (
                  <select value={assignee || ''} onChange={e => setAssignee(e.target.value || null)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs">
                         <option value="">Asignado a</option>
                         {selectedProject?.members?.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                  </select>
              )}
          </div>

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-xs font-semibold text-zinc-500 gap-1.5 py-2">
             {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             Más opciones
          </button>

          {showAdvanced && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl text-xs space-y-4">
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Clock className="w-4 h-4"/> Hora</div>
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Repeat className="w-4 h-4"/> Repetición</div>
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Bell className="w-4 h-4"/> Recordatorio</div>
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><ListChecks className="w-4 h-4"/> Subtareas</div>
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><FileText className="w-4 h-4"/> Notas</div>
            </div>
          )}

          <button onClick={handleSubmit} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
            {taskToEdit ? 'Guardar Cambios' : 'Guardar Tarea'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTaskDrawer;
