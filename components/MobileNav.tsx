import React, { useState } from 'react';
import { Home, CheckSquare, Calendar, FileText, User, Plus, LayoutGrid, Focus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'more', label: 'Perfil', icon: User },
];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const quickAddOptions = [
    { id: 'tasks', label: 'Tarea', icon: CheckSquare, color: 'text-rose-500' },
    { id: 'projects', label: 'Proyecto', icon: LayoutGrid, color: 'text-blue-500' },
    { id: 'notes', label: 'Nota', icon: FileText, color: 'text-amber-500' },
    { id: 'habits', label: 'Hábito', icon: Focus, color: 'text-emerald-500' },
  ];

  const handleQuickAdd = (tabId: string) => {
    setActiveTab(tabId);
    setShowQuickAdd(false);
    // Note: The specific creation modal (e.g. create task) should ideally 
    // be triggered, but navigating to the tab is the first step.
  };

  return (
    <>
      {/* Quick Add Overlay */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setShowQuickAdd(false)}
          >
            <div className="absolute bottom-28 right-4 flex flex-col items-end gap-3 pb-safe">
              {quickAddOptions.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAdd(opt.id);
                  }}
                  className="flex items-center gap-3 active:scale-95 transition-transform"
                >
                  <span className="text-sm font-semibold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-1.5 rounded-xl shadow-lg">
                    {opt.label}
                  </span>
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-lg border border-zinc-100 dark:border-zinc-700">
                    <opt.icon className={`w-5 h-5 ${opt.color}`} />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-4 left-4 right-4 z-50 pb-safe pointer-events-none">
        <div className="flex justify-end mb-4 mx-auto max-w-sm pointer-events-auto">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
              showQuickAdd 
                ? 'bg-zinc-800 dark:bg-zinc-200 rotate-45' 
                : 'bg-black dark:bg-white'
            }`}
          >
            <Plus className={`w-7 h-7 ${showQuickAdd ? 'text-white dark:text-black' : 'text-white dark:text-black'}`} />
          </button>
        </div>
        
        <div className="bg-black dark:bg-white rounded-[2rem] px-5 py-2.5 flex justify-between items-center shadow-2xl mx-auto max-w-sm pointer-events-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'more' && ['more', 'settings'].includes(activeTab));
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowQuickAdd(false);
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
    </>
  );
};

export default MobileNav;