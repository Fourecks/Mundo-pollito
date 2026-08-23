import React, { useState, useEffect } from 'react';
import { Project } from '../types';

export interface ProjectFormData {
  name: string;
  emoji: string | null;
  color: string | null;
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
  const [name, setName] = useState('');
  const [color, setColor] = useState('#1e293b'); // Minimalist dark color by default

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setColor(projectToEdit.color || '#1e293b');
      } else {
        setName('');
        setColor('#1e293b');
      }
    }
  }, [isOpen, projectToEdit]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji: null, color });
  };

  return (
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-[#121212] w-full max-w-md rounded border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <header className="px-6 py-4 border-b border-gray-100 dark:border-gray-900">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 tracking-tight">
            {projectToEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h2>
        </header>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del proyecto"
              required
              autoFocus
              className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 transition-colors placeholder:text-gray-400"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {projectToEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectEditorPanel;
