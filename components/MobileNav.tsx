import React, { useState } from 'react';
import { Home, CheckSquare, Calendar, FileText, User, Plus, LayoutGrid, Focus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hide?: boolean;
}

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'more', label: 'Perfil', icon: User },
];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, hide = false }) => {
  if (hide) return null;

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 pb-safe pointer-events-none">
      <div className="bg-black dark:bg-white rounded-[2rem] px-5 py-2.5 flex justify-between items-center shadow-2xl mx-auto max-w-sm pointer-events-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id || (item.id === 'more' && ['more', 'settings'].includes(activeTab));
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className="relative flex flex-col items-center justify-center w-11 h-11 transition-transform active:scale-90"
              aria-label={item.label}
            >
              <item.icon 
                className={`w-5 h-5 transition-colors duration-300 ${
                  isActive 
                    ? 'text-white dark:text-black' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-600'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-white dark:bg-black" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default React.memo(MobileNav);