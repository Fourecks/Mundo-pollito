import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Flag, ChevronDown, ChevronUp, User } from 'lucide-react';
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
  const [priority, setPriority] = useState<Priority>(taskToEdit?.priority || 'medium');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(fixedProjectId || taskToEdit?.project_id || null);
  const [assignee, setAssignee] = useState<string | null>(taskToEdit?.assignee || null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
      if(taskToEdit) {
        setText(taskToEdit.text);
        setDueDate(taskToEdit.due_date || new Date().toISOString().split('T')[0]);
        setPriority(taskToEdit.priority || 'medium');
        setSelectedProjectId(fixedProjectId || taskToEdit.project_id || null);
        setAssignee(taskToEdit.assignee || null);
      } else {
        setText('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setPriority('medium');
        setSelectedProjectId(fixedProjectId || null);
        setAssignee(null);
      }
  }, [taskToEdit, fixedProjectId, isOpen]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const options = {
        dueDate,
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
             <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs" />
             <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
             </select>
          </div>

          {!fixedProjectId && (
              <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)} className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs">
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
          )}

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-xs font-semibold text-zinc-500 gap-1.5 py-2">
             {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             Más opciones
          </button>

          {showAdvanced && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl text-xs space-y-3">
                {isAdvancedProject && (
                    <div className="space-y-1">
                        <label className="text-zinc-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Asignar a</label>
                        <select value={assignee || ''} onChange={e => setAssignee(e.target.value || null)} className="w-full p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                             <option value="">Sin asignar</option>
                             {selectedProject?.members?.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="text-zinc-500">(Recordatorios, subtareas, notas...)</div>
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
