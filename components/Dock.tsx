import React from 'react';
import ListIcon from './icons/ListIcon';
import NotesIcon from './icons/NotesIcon';
import GalleryIcon from './icons/GalleryIcon';
import MusicIcon from './icons/MusicIcon';
import ClockIcon from './icons/ClockIcon';
import ChickenIcon from './ChickenIcon';
import { WindowType } from '../types';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import ChartBarIcon from './icons/ChartBarIcon';

interface DockProps {
  onButtonClick: (window: WindowType) => void;
  openWindows: WindowType[];
}

const dockItems: { id: WindowType; label: string; icon: React.FC }[] = [
  { id: 'todo', label: 'Tareas', icon: ListIcon },
  { id: 'habits', label: 'Hábitos', icon: CheckBadgeIcon },
  { id: 'pomodoro', label: 'Pomodoro', icon: ClockIcon },
  { id: 'notes', label: 'Notas', icon: NotesIcon },
  { id: 'gallery', label: 'Galería', icon: GalleryIcon },
  { id: 'music', label: 'Música', icon: MusicIcon },
  { id: 'browser', label: 'IA Pollito', icon: ChickenIcon },
];

const Dock: React.FC<DockProps> = ({ onButtonClick, openWindows }) => {
  return (
    <nav className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="flex items-center justify-center gap-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-full shadow-2xl p-1.5">
        {dockItems.map((item) => {
          const isActive = openWindows.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onButtonClick(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-primary-light/50 dark:bg-primary/20 scale-105' 
                  : 'hover:bg-secondary-lighter dark:hover:bg-gray-700'
              }`}
              aria-label={`Abrir ${item.label}`}
            >
              <div className={`p-2 rounded-full transition-colors duration-200 ${isActive ? 'bg-primary text-white' : 'bg-secondary-light dark:bg-gray-600 text-secondary-dark dark:text-gray-200'}`}>
                  <item.icon />
              </div>
              <span className={`mt-1 text-[10px] leading-tight font-semibold transition-colors duration-200 ${isActive ? 'text-primary-dark dark:text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Dock;