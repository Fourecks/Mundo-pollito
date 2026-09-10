import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../types';
import { 
  ArrowLeft, 
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ProjectFormData {
  name: string;
  emoji: string | null;
  color: string | null;
  project_mode?: 'personal' | 'advanced';
}

interface ProjectEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  projectToEdit?: Project | null;
}

const ProjectEditorPanel: React.FC<ProjectEditorPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  projectToEdit
}) => {
  const [step, setStep] = useState<'select_type' | 'form'>('select_type');
  const [selectedMode, setSelectedMode] = useState<'personal' | 'advanced'>('personal');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#18181b'); // Ultra minimal black/gray by default

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setColor(projectToEdit.color || '#18181b');
        setSelectedMode(projectToEdit.project_mode || 'personal');
        setStep('form');
      } else {
        setName('');
        setColor('#18181b');
        setSelectedMode('personal');
        setStep('select_type');
      }
    }
  }, [isOpen, projectToEdit]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ 
      name: name.trim(), 
      emoji: selectedMode === 'personal' ? '👤' : '💼', 
      color, 
      project_mode: selectedMode 
    });
  };

  const handleSelectMode = (mode: 'personal' | 'advanced') => {
    setSelectedMode(mode);
    setStep('form');
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100010] flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity duration-200" onClick={onClose}>
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-100 dark:border-zinc-800/80 shadow-2xl overflow-hidden z-[100011] max-h-[92vh] flex flex-col pb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* DRAG HANDLE */}
            <div className="flex justify-center py-3.5 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors" />
            </div>

            {/* HEADER */}
            <header className="px-6 pb-4 border-b border-gray-50 dark:border-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === 'form' && !projectToEdit && (
                  <button 
                    onClick={() => setStep('select_type')}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-500 dark:text-gray-400 transition-colors"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  {projectToEdit 
                    ? 'Editar Proyecto' 
                    : step === 'select_type' 
                      ? '¿Qué tipo de proyecto necesitas?' 
                      : `Nuevo Proyecto (${selectedMode === 'personal' ? 'Personal' : 'Avanzado'})`
                  }
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            
            {/* BODY */}
            <div className="overflow-y-auto custom-scrollbar">
              {step === 'select_type' ? (
                <div className="p-6 space-y-4">
                  {/* PERSONAL PROJECT CARD */}
                  <button
                    onClick={() => handleSelectMode('personal')}
                    className="w-full text-left p-5 rounded-2xl bg-zinc-50/50 hover:bg-zinc-50 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/40 border border-zinc-100/80 dark:border-zinc-800/40 transition-all flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Proyecto Personal
                          </span>
                          
                          {/* INFO TOOLTIP */}
                          <div className="relative group/tooltip inline-block cursor-help" onClick={e => e.stopPropagation()}>
                            <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-zinc-700 text-[9px] font-bold text-gray-400 dark:text-zinc-500 hover:border-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">?</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-zinc-950 dark:bg-zinc-900 text-white text-[10px] rounded-xl shadow-xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all z-20 font-sans leading-relaxed border border-zinc-800/80">
                              <span className="font-bold block mb-1">Incluye:</span>
                              <ul className="space-y-1 list-disc pl-3 text-zinc-300">
                                <li>Lista de Tareas</li>
                                <li>Tablero Kanban</li>
                                <li>Progreso y Resumen</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal font-medium">
                          Para organizar tareas de forma ágil e individual hacia un objetivo.
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* ADVANCED PROJECT CARD */}
                  <button
                    onClick={() => handleSelectMode('advanced')}
                    className="w-full text-left p-5 rounded-2xl bg-zinc-50/50 hover:bg-zinc-50 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/40 border border-zinc-100/80 dark:border-zinc-800/40 transition-all flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Proyecto Avanzado
                          </span>
                          
                          {/* INFO TOOLTIP */}
                          <div className="relative group/tooltip inline-block cursor-help" onClick={e => e.stopPropagation()}>
                            <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-zinc-700 text-[9px] font-bold text-gray-400 dark:text-zinc-500 hover:border-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">?</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-zinc-950 dark:bg-zinc-900 text-white text-[10px] rounded-xl shadow-xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all z-20 font-sans leading-relaxed border border-zinc-800/80">
                              <span className="font-bold block mb-1">Incluye:</span>
                              <ul className="space-y-1 list-disc pl-3 text-zinc-300">
                                <li>Sprints y Hojas de Ruta</li>
                                <li>Documentos Colaborativos</li>
                                <li>Chats y Canales de Comunicación</li>
                                <li>Gestión de Miembros de Equipo</li>
                                <li>Monitoreo de Gastos y Finanzas</li>
                                <li>Registro de Tiempos de Trabajo</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal font-medium">
                          Para proyectos de gran envergadura, emprendimientos o equipos de trabajo.
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSave} className="p-6 space-y-6">
                  {/* Nombre del Proyecto */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Nombre del Proyecto
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={selectedMode === 'personal' ? "Ej. Entrenar Maratón, Aprender Alemán" : "Ej. Rediseño de Plataforma, Campaña Q3"}
                      required
                      autoFocus
                      className="w-full bg-zinc-50 dark:bg-black/30 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-zinc-400"
                    />
                  </div>

                  {/* Color del Proyecto */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Color Identificador
                    </label>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {['#18181b', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className="w-6 h-6 rounded-full border border-black/5 dark:border-white/5 relative flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shrink-0"
                          style={{ backgroundColor: c }}
                        >
                          {color === c && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-50 dark:border-zinc-900/60">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!name.trim()}
                      className="px-5 py-2 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <span>{projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default ProjectEditorPanel;
