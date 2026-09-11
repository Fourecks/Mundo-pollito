import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { Priority, Project } from '../types';

interface MobileTaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (text: string, options?: any) => Promise<void> | void;
  projects?: Project[];
  fixedProjectId?: number | null;
}

const MobileTaskDrawer: React.FC<MobileTaskDrawerProps> = ({
  isOpen,
  onClose,
  onAddTask,
  projects = [],
  fixedProjectId = null
}) => {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(fixedProjectId);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await onAddTask(text.trim(), {
      dueDate,
      priority,
      projectId: fixedProjectId ?? selectedProjectId,
    });
    onClose();
    setText('');
  };

  if (!isOpen) return null;

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
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl text-xs text-zinc-500">
                (Opciones avanzadas: recordatorios, subtareas, notas...)
            </div>
          )}

          <button onClick={handleSubmit} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl">
            Guardar Tarea
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTaskDrawer;
