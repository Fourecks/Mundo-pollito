import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../types';
import { 
  CheckSquare, 
  Layers, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  MessageSquare, 
  Folder, 
  Calendar, 
  ChevronRight, 
  ArrowLeft, 
  X,
  Sparkles
} from 'lucide-react';

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
  const [selectedMode, setSelectedMode] = useState<'personal' | 'advanced'>('advanced');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1e293b'); // Minimalist dark color by default

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setColor(projectToEdit.color || '#1e293b');
        setSelectedMode(projectToEdit.project_mode || 'advanced');
        setStep('form');
      } else {
        setName('');
        setColor('#1e293b');
        setSelectedMode('advanced');
        setStep('select_type');
      }
    }
  }, [isOpen, projectToEdit]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-fade-in" onClick={onClose}>
      <div 
        className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-lg rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100011] max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="px-6 py-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
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
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
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
        {step === 'select_type' ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* PERSONAL PROJECT CARD */}
            <button
              onClick={() => handleSelectMode('personal')}
              className="w-full text-left p-5 rounded-2xl bg-zinc-50 hover:bg-zinc-100/70 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80 transition-all hover:scale-[1.01] flex flex-col group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
                    Proyecto Personal
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-3">
                    Para organizar tareas y avanzar hacia un objetivo.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white transition-colors" />
              </div>

              {/* INCLUSIONS */}
              <div className="mt-4 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 w-full">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Incluye:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <CheckSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>Tareas</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>Tablero</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>Progreso</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 italic font-medium">
                Ideal para proyectos personales y sencillos.
              </p>
            </button>

            {/* ADVANCED PROJECT CARD */}
            <button
              onClick={() => handleSelectMode('advanced')}
              className="w-full text-left p-5 rounded-2xl bg-zinc-50 hover:bg-zinc-100/70 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/80 transition-all hover:scale-[1.01] flex flex-col group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full">
                    Proyecto Avanzado
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-3">
                    Para proyectos grandes, emprendimientos o equipos.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white transition-colors" />
              </div>

              {/* INCLUSIONS */}
              <div className="mt-4 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 w-full">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                  Incluye:
                </span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Sprints y Roadmap</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <Folder className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Documentos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Canales y Chats</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Gestión de Equipo</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <DollarSign className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Gastos y Finanzas</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Registro de Tiempo</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 italic font-medium">
                Ideal para proyectos colaborativos, startups o hitos de equipo.
              </p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Nombre del Proyecto
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedMode === 'personal' ? "Ej. Entrenar Maratón, Aprender Alemán..." : "Ej. Rediseño de Plataforma, Campaña Q3..."}
                required
                autoFocus
                className="w-full bg-zinc-50 dark:bg-black/40 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                Color Identificador
              </label>
              <div className="flex flex-wrap gap-2.5">
                {['#1e293b', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full border border-black/10 dark:border-white/10 relative flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-900">
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
                className="px-5 py-2 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm"
              >
                {projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default ProjectEditorPanel;
