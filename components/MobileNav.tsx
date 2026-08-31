import React from 'react';
import HomeIcon from './icons/HomeIcon';
import ListIcon from './icons/ListIcon';
import CalendarIcon from './icons/CalendarIcon';
import NotesIcon from './icons/NotesIcon';
import MoreIcon from './icons/MoreIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import { FolderKanban, Wallet } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

type TabName = 'home' | 'tasks' | 'projects' | 'calendar' | 'habits' | 'notes' | 'finance' | 'more';

const ProjectsIcon: React.FC = () => (
  <FolderKanban className="w-5 h-5 landscape:w-4 landscape:h-4" />
);

const FinanceIcon: React.FC = () => (
  <Wallet className="w-5 h-5 landscape:w-4 landscape:h-4" />
);

const navItems: { id: TabName; label: string; icon: React.FC }[] = [
  { id: 'home', label: 'Hoy', icon: HomeIcon },
  { id: 'tasks', label: 'Tareas', icon: ListIcon },
  { id: 'projects', label: 'Proyectos', icon: ProjectsIcon },
  { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
  { id: 'habits', label: 'Hábitos', icon: CheckBadgeIcon },
  { id: 'notes', label: 'Notas', icon: NotesIcon },
  { id: 'finance', label: 'Finanzas', icon: FinanceIcon },
  { id: 'more', label: 'Más', icon: MoreIcon },
];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const isCrowded = navItems.length > 5;
  
  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-white/85 dark:bg-gray-800/85 backdrop-blur-xl border-t border-black/10 dark:border-white/10 z-50 transition-all">
      <div className="flex justify-around items-center h-[72px] landscape:h-[50px] px-1 max-w-4xl mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col landscape:flex-row items-center justify-center h-14 landscape:h-9 rounded-2xl transition-all duration-200 ${isCrowded ? 'w-[52px] landscape:w-auto landscape:px-2.5' : 'w-14 landscape:w-auto landscape:px-3'} ${
                isActive ? 'text-pink-600 dark:text-pink-400 scale-105 bg-pink-100/50 dark:bg-pink-900/40' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              aria-label={item.label}
            >
              <div className="p-1.5 landscape:p-0.5 transition-colors duration-200 flex-shrink-0">
                <item.icon />
              </div>
              <span className="text-[11px] landscape:text-[11px] landscape:ml-1 font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;