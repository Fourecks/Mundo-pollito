import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../types';
import { 
  ArrowLeft, 
  X,
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

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setSelectedMode(projectToEdit.project_mode || 'personal');
        setStep('form');
      } else {
        setName('');
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
      color: '#18181b', 
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
        <div className="fixed inset-0 z-[100010] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200" onClick={onClose}>
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-[100011] max-h-[92vh] flex flex-col pb-8 font-sans"
            onClick={e => e.stopPropagation()}
          >
            {/* DRAG HANDLE */}
            <div className="flex justify-center py-3.5 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-800 rounded-full hover:bg-gray-400 dark:hover:bg-zinc-700 transition-colors" />
            </div>

            {/* HEADER */}
            <header className="px-6 pb-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === 'form' && !projectToEdit && (
                  <button 
                    onClick={() => setStep('select_type')}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-600 dark:text-gray-300 transition-colors"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
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
                    className="w-full text-left p-5 rounded-2xl bg-zinc-50 hover:bg-zinc-100/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 transition-all flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            Proyecto Personal
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-normal font-medium">
                          Para organizar tareas individuales con tablero kanban y vista de lista ágil.
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* ADVANCED PROJECT CARD */}
                  <button
                    onClick={() => handleSelectMode('advanced')}
                    className="w-full text-left p-5 rounded-2xl bg-zinc-50 hover:bg-zinc-100/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 transition-all flex flex-col group relative"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            Proyecto Avanzado
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-normal font-medium">
                          Para proyectos colaborativos con sprints, documentos, canales de equipo y finanzas.
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
                      placeholder={selectedMode === 'personal' ? "Ej. Mi Proyecto Personal" : "Ej. Rediseño de Sitio Web"}
                      required
                      autoFocus
                      className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400 font-medium"
                    />
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-900/80">
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
                      className="px-5 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-xs"
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
