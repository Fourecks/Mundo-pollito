import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import CloseIcon from './icons/CloseIcon';

interface ProjectEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string | null, color: string | null) => void;
  projectToEdit: Project | null;
}

const projectColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'];

const ProjectEditorPanel: React.FC<ProjectEditorPanelProps> = ({ isOpen, onClose, onSave, projectToEdit }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(projectColors[0]);

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setEmoji(projectToEdit.emoji || null);
        setColor(projectToEdit.color || projectColors[0]);
      } else {
        // Reset for new project
        setName('');
        setEmoji(null);
        setColor(projectColors[0]);
      }
    }
  }, [isOpen, projectToEdit]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), emoji, color);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60000] animate-fade-in" onClick={onClose}></div>
      <div className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[60001] animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex items-center justify-between">
          <h3 className="font-bold text-lg text-primary-dark dark:text-primary w-full text-center">{projectToEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <CloseIcon />
          </button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-sm mx-auto space-y-4">
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Nombre del Proyecto</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Viaje a la playa" className="mt-1 w-full bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary"/>
            </div>
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Emoji</label>
              <input type="text" value={emoji || ''} onChange={(e) => setEmoji(e.target.value)} placeholder="✨" className="mt-1 w-full bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl" maxLength={4} />
            </div>
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Color</label>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {projectColors.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-gray-800' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </main>
        <footer className="flex-shrink-0 p-4 border-t border-secondary-light/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
          <button onClick={handleSave} disabled={!name.trim()} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform active:scale-95 transition-all duration-200 disabled:opacity-50">
            Guardar
          </button>
        </footer>
      </div>
    </>
  );
};

export default ProjectEditorPanel;