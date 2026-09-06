import React from 'react';
import ListIcon from './icons/ListIcon';
import CalendarIcon from './icons/CalendarIcon';
import NotesIcon from './icons/NotesIcon';
import MusicIcon from './icons/MusicIcon';
import ClockIcon from './icons/ClockIcon';
import { WindowType } from '../types';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import { FolderKanban, Wallet } from 'lucide-react';
import AcademicIcon from './icons/AcademicIcon';

interface DockProps {
  onButtonClick: (window: WindowType) => void;
  openWindows: WindowType[];
  focusedWindow: WindowType | null;
}

const ProjectsIcon: React.FC = () => (
  <FolderKanban className="w-5 h-5" />
);

const FinanceIcon: React.FC = () => (
  <Wallet className="w-5 h-5" />
);

const dockItems: { id: WindowType; label: string; icon: React.FC }[] = [
  { id: 'todo', label: 'Tareas', icon: ListIcon },
  { id: 'projects', label: 'Proyectos', icon: ProjectsIcon },
  { id: 'student', label: 'Estudio', icon: AcademicIcon },
  { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
  { id: 'habits', label: 'Hábitos', icon: CheckBadgeIcon },
  { id: 'pomodoro', label: 'Pomodoro', icon: ClockIcon },
  { id: 'notes', label: 'Notas', icon: NotesIcon },
  { id: 'finance', label: 'Finanzas', icon: FinanceIcon },
  { id: 'music', label: 'Música', icon: MusicIcon },
];

const Dock: React.FC<DockProps> = ({ onButtonClick, openWindows, focusedWindow }) => {
  return (
    <nav className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="flex items-center justify-center gap-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-full shadow-2xl p-1.5">
        {dockItems.map((item) => {
          const isOpen = openWindows.includes(item.id);
          const isFocused = focusedWindow === item.id;
          return (
            <div key={item.id} className="relative flex flex-col items-center">
              <button
                onClick={() => onButtonClick(item.id)}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
                  isFocused
                    ? 'bg-primary-light/50 dark:bg-primary/20 scale-105' 
                    : 'hover:bg-secondary-lighter dark:hover:bg-gray-700'
                }`}
                aria-label={`Abrir ${item.label}`}
              >
                <div className={`p-2 rounded-full transition-colors duration-200 ${isOpen ? 'bg-primary text-white' : 'bg-secondary-light dark:bg-gray-600 text-secondary-dark dark:text-gray-200'}`}>
                    <item.icon />
                </div>
                <span className={`mt-1 text-[10px] leading-tight font-semibold transition-colors duration-200 ${isOpen ? 'text-primary-dark dark:text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item.label}
                </span>
              </button>
              {isOpen && (
                <div className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-white dark:ring-gray-800 shadow-xs" />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default Dock;