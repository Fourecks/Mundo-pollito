import React from 'react';
import HomeIcon from './icons/HomeIcon';
import ListIcon from './icons/ListIcon';
import NotesIcon from './icons/NotesIcon';
import GalleryIcon from './icons/GalleryIcon';
import MoreIcon from './icons/MoreIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

type TabName = 'home' | 'tasks' | 'habits' | 'notes' | 'gallery' | 'more';

const navItems: { id: TabName; label: string; icon: React.FC }[] = [
  { id: 'home', label: 'Hoy', icon: HomeIcon },
  { id: 'tasks', label: 'Tareas', icon: ListIcon },
  { id: 'habits', label: 'Hábitos', icon: CheckBadgeIcon },
  { id: 'notes', label: 'Notas', icon: NotesIcon },
  { id: 'gallery', label: 'Galería', icon: GalleryIcon },
  { id: 'more', label: 'Más', icon: MoreIcon },
];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const isCrowded = navItems.length > 5;
  
  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-black/10 dark:border-white/10 z-50">
      <div className="flex justify-around items-center h-[76px] px-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center h-16 rounded-2xl transition-all duration-200 ${isCrowded ? 'w-[58px]' : 'w-16'} ${
                isActive ? 'text-pink-600 dark:text-pink-400 scale-105 bg-pink-100/50 dark:bg-pink-900/40' : 'text-gray-500 dark:text-gray-400'
              }`}
              aria-label={item.label}
            >
              <div className={`p-2 transition-colors duration-200`}>
                <item.icon />
              </div>
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;