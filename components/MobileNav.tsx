import React from 'react';
import { Home, CheckSquare, Calendar, FileText, Settings, User } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'calendar', label: 'Agenda', icon: Calendar },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'more', label: 'Más', icon: User },
];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50">
      <div className="bg-black dark:bg-white rounded-[2rem] px-6 py-3 flex justify-between items-center shadow-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90"
              aria-label={item.label}
            >
              <item.icon 
                className={`w-6 h-6 transition-colors duration-300 ${
                  isActive 
                    ? 'text-white dark:text-black' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-600'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive && (
                <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-white dark:bg-black" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;