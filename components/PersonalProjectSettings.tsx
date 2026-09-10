import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { 
  Trash2, 
  Check, 
  ArrowLeft
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

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
  onDelete,
  onSelectProject,
  setActiveTab
}) => {
  const [name, setName] = useState(project.name);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(project.name);
  }, [project.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(project.id, {
        name: name.trim()
      });
      setActiveTab('overview');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    await onDelete(project.id);
    onSelectProject(null);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-white dark:bg-[#0c0c0e] text-gray-900 dark:text-gray-100 flex flex-col overflow-y-auto font-sans">
      {/* HEADER PANTALLA COMPLETA */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Volver al proyecto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
              Configuración
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {project.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-2 text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Eliminar</span>
        </button>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-24">
        <form onSubmit={handleSave} className="space-y-5 bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-2xs">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              Nombre del Proyecto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mi Proyecto Personal"
              required
              className="w-full bg-zinc-50 dark:bg-black/40 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400 font-medium"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Modifica el nombre con el que identificas este proyecto.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800/60">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
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

        {/* ZONA DE ELIMINACIÓN */}
        <div className="bg-red-50/50 dark:bg-red-950/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 space-y-3">
          <h2 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Eliminar Proyecto
          </h2>
          <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-medium">
            Al eliminar este proyecto, se desvinculará de tus proyectos activos. Esta acción no se puede deshacer.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar este proyecto</span>
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL USING SYSTEM CONFIRMATIONMODAL */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={`¿Eliminar "${project.name}"?`}
        message="¿Estás seguro de que deseas eliminar este proyecto? Esta acción es permanente."
        confirmText="Eliminar Proyecto"
        cancelText="Cancelar"
        isDanger={true}
      />
    </div>
  );
};

export default React.memo(PersonalProjectSettings);
