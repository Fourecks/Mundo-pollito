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
  ArrowRight,
  ArrowLeft
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
  const [targetDate, setTargetDate] = useState(project.target_date || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Keep state in sync with prop updates
  useEffect(() => {
    setName(project.name);
    setDescription(project.description || '');
    setEmoji(project.emoji || '👤');
    setTargetDate(project.target_date || '');
  }, [project]);

  const emojis = ['👤', '🎯', '📚', '🏃‍♂️', '💪', '🎨', '💼', '🏡', '✈️', '🌟', '💻', '🧘', '🍕', '🚗', '🔑'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        emoji,
        color: '#18181b',
        target_date: targetDate || null
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const confirmArchive = async () => {
    await onArchive(project.id, !project.is_archived);
    setShowArchiveModal(false);
  };

  const confirmDelete = async () => {
    await onDelete(project.id);
    onSelectProject(null);
    setShowDeleteModal(false);
  };

  const handleArchive = () => {
    setShowArchiveModal(true);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
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
    <div className="fixed inset-0 z-[1000] bg-white dark:bg-[#0c0c0e] text-gray-900 dark:text-gray-100 flex flex-col overflow-y-auto font-sans">
      {/* HEADER VENTANA COMPLETA */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800/80 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-all active:scale-95 flex items-center gap-2 text-xs font-bold"
            title="Volver al proyecto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{project.emoji || '📁'}</span>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                (project.project_mode || 'personal') === 'personal'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
              }`}>
                {(project.project_mode || 'personal') === 'personal' ? 'Personal' : 'Avanzado'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configuración completa del proyecto</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="px-3.5 py-2 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span>Eliminar</span>
        </button>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-8 pb-32">
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

        {/* Fecha Objetivo */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Fecha Objetivo</label>
          <div className="relative">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-black/30 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 transition-all cursor-pointer"
            />
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
      {(project.project_mode || 'personal') === 'personal' && (
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
      )}

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

      {/* ARCHIVE CONFIRMATION MODAL (FULL-SCREEN MOBILE, RESPONSIVE OVERLAY DESKTOP) */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-[100020] flex flex-col md:items-center md:justify-center bg-white dark:bg-[#090909] md:bg-black/70 md:backdrop-blur-xs p-6 sm:p-8 animate-fade-in" onClick={() => setShowArchiveModal(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-[#0e0e0e] rounded-3xl border border-gray-100 dark:border-zinc-800/80 shadow-2xl p-6 space-y-6 flex flex-col justify-between h-full md:h-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-gray-500 dark:text-gray-400">
                  <Archive className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {project.is_archived ? '¿Desarchivar Proyecto?' : '¿Archivar Proyecto?'}
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                {project.is_archived 
                  ? 'Este proyecto volverá a mostrarse en tu lista activa y podrás continuar trabajando en él de forma normal.' 
                  : 'Este proyecto se ocultará de tu vista principal y de la barra lateral, pero todos sus datos se conservarán intactos.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800/60">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="w-full sm:w-1/2 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmArchive}
                className="w-full sm:w-1/2 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold rounded-xl transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (FULL-SCREEN MOBILE, RESPONSIVE OVERLAY DESKTOP) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100020] flex flex-col md:items-center md:justify-center bg-white dark:bg-[#090909] md:bg-black/70 md:backdrop-blur-xs p-6 sm:p-8 animate-fade-in" onClick={() => setShowDeleteModal(false)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-[#0e0e0e] rounded-3xl border border-gray-100 dark:border-zinc-800/80 shadow-2xl p-6 space-y-6 flex flex-col justify-between h-full md:h-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-red-600 dark:text-red-400">¿Eliminar Proyecto?</h3>
              </div>
              
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Estás a punto de eliminar permanentemente el proyecto <span className="font-bold text-gray-800 dark:text-white">"{project.name}"</span>. 
                </p>
                <div className="bg-red-500/5 p-3 rounded-xl border border-red-200/20 text-[10px] text-red-500 dark:text-red-400 font-medium leading-normal">
                  Esta acción es irreversible. Todas las tareas asociadas a este proyecto perderán su vinculación pero se conservarán de manera global en tu bandeja de tareas.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800/60">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-1/2 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="w-full sm:w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Eliminar Proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalProjectSettings;
