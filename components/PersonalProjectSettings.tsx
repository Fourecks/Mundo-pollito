import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { 
  Trash2, 
  Archive, 
  Calendar, 
  Sparkles, 
  Check, 
  AlertTriangle,
  X,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface PersonalProjectSettingsProps {
  project: Project;
  onUpdate: (projectId: number, updates: Partial<Project>) => Promise<void>;
  onArchive: (projectId: number, isArchived: boolean) => Promise<void>;
  onDelete: (projectId: number) => Promise<void>;
  onSelectProject: (projectId: number | null) => void;
  setActiveTab: (tab: any) => void;
}

const PersonalProjectSettings: React.FC<PersonalProjectSettingsProps> = ({
  project,
  onUpdate,
  onArchive,
  onDelete,
  onSelectProject,
  setActiveTab
}) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [emoji, setEmoji] = useState(project.emoji || '👤');
  const [color, setColor] = useState(project.color || '#1e293b');
  const [targetDate, setTargetDate] = useState(project.target_date || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Keep state in sync with prop updates
  useEffect(() => {
    setName(project.name);
    setDescription(project.description || '');
    setEmoji(project.emoji || '👤');
    setColor(project.color || '#1e293b');
    setTargetDate(project.target_date || '');
  }, [project]);

  const emojis = ['👤', '🎯', '📚', '🏃‍♂️', '💪', '🎨', '💼', '🏡', '✈️', '🌟', '💻', '🧘', '🍕', '🚗', '🔑'];
  const colors = ['#1e293b', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        emoji,
        color,
        target_date: targetDate || null
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    const nextArchiveState = !project.is_archived;
    if (confirm(`¿Estás seguro de que quieres ${nextArchiveState ? 'archivar' : 'desarchivar'} este proyecto?`)) {
      await onArchive(project.id, nextArchiveState);
    }
  };

  const handleDelete = async () => {
    if (confirm(`¿ELIMINAR PROYECTO? \n\nEsta acción eliminará el proyecto "${project.name}" de forma permanente. Las tareas asociadas perderán su proyecto pero se conservarán.`)) {
      await onDelete(project.id);
      onSelectProject(null);
    }
  };

  const handleConvertProject = async () => {
    setIsConverting(true);
    try {
      await onUpdate(project.id, {
        project_mode: 'advanced'
      });
      setShowConvertModal(false);
      setActiveTab('overview');
    } catch (err) {
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 w-full pb-32 font-sans text-gray-900 dark:text-gray-100 h-full overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajustes del Proyecto</h2>
        <p className="text-xs font-medium text-gray-500 mt-0.5">Configura y personaliza tu espacio personal.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-2xs">
        {/* Nombre y Emoji */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Icono</label>
            <div className="relative">
              <select
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black/30 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer appearance-none text-center"
              >
                {emojis.map(em => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-xs text-zinc-400">
                ▾
              </div>
            </div>
          </div>

          <div className="md:col-span-9 space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Nombre del Proyecto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mi Proyecto Personal"
              required
              className="w-full bg-zinc-50 dark:bg-black/30 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Añade un propósito u objetivo principal para este proyecto..."
            rows={3}
            className="w-full bg-zinc-50 dark:bg-black/30 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-zinc-400 resize-none"
          />
        </div>

        {/* Fecha Objetivo y Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Fecha Objetivo</label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black/30 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Color Identificador</label>
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              {colors.map((c) => (
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
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800/60">
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="px-5 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            {isSaving ? 'Guardando...' : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* CONVERT TO ADVANCED BANNER */}
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-950/20 dark:to-indigo-950/20 p-6 rounded-2xl border border-purple-200/50 dark:border-purple-900/30 space-y-4 shadow-3xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5 flex-1 max-w-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300">Convertir a proyecto avanzado</h3>
          </div>
          <p className="text-xs text-purple-900/70 dark:text-purple-300/60 leading-relaxed font-medium">
            Desbloquea herramientas de planificación ágil, sprints, hojas de ruta, seguimiento de gastos, registro de tiempo y colaboración con múltiples miembros del equipo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowConvertModal(true)}
          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Convertir ahora</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* DANGER ZONE */}
      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
        <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Zona de Peligro</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleArchive}
            className="flex items-center gap-3 p-4 bg-zinc-50 hover:bg-zinc-100/80 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800 rounded-xl transition-all text-left"
          >
            <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-500 dark:text-gray-400">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {project.is_archived ? 'Desarchivar Proyecto' : 'Archivar Proyecto'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {project.is_archived ? 'Devolver el proyecto a tu espacio activo.' : 'Ocultarlo de la barra lateral sin borrar datos.'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-200 dark:border-red-950/40 rounded-xl transition-all text-left"
          >
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400">Eliminar Proyecto</p>
              <p className="text-[10px] text-red-500/60 dark:text-red-400/50 mt-0.5">Elimina este proyecto. Las tareas se conservarán.</p>
            </div>
          </button>
        </div>
      </div>

      {/* CONVERSION MODAL */}
      {showConvertModal && (
        <div className="fixed inset-0 z-[100015] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in" onClick={() => setShowConvertModal(false)}>
          <div 
            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-md rounded-3xl border border-purple-200/40 dark:border-purple-950/30 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
                <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Convertir a proyecto avanzado</h3>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
              Al convertir este proyecto a modo avanzado se habilitarán herramientas adicionales diseñadas para equipos y proyectos de gran envergadura:
            </p>

            <ul className="grid grid-cols-2 gap-y-2.5 gap-x-4 pl-1 text-[11px] text-gray-600 dark:text-zinc-300 font-semibold">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Sprints</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Documentos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Canales</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Equipo</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Hoja de ruta</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Gastos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Registro de tiempo</span>
              </li>
            </ul>

            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-gray-100 dark:border-zinc-800/80 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-normal">
                Tus tareas, estado y progreso actuales se conservarán intactos. No se creará otro proyecto ni se copiarán/eliminarán identificadores.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800/60">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                disabled={isConverting}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConvertProject}
                disabled={isConverting}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                {isConverting ? 'Convirtiendo...' : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convertir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalProjectSettings;
