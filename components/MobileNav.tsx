import React from 'react';
import { Home, CheckSquare, Calendar, FileText, User, LayoutGrid, Focus, BookOpen, Clock, PieChart, ArrowRightLeft, Target, Landmark, Folder as FolderIcon, TrendingUp } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  studentMobileTab?: string;
  setStudentMobileTab?: (tab: 'resumen' | 'materias' | 'mas') => void;
  financeMobileTab?: string;
  setFinanceMobileTab?: (tab: string) => void;
  projectsMobileTab?: string;
  setProjectsMobileTab?: (tab: string) => void;
  notesMobileTab?: string;
  setNotesMobileTab?: (tab: string) => void;
  habitsMobileTab?: string;
  setHabitsMobileTab?: (tab: string) => void;
  hide?: boolean;
}

// Main Dashboard level nav items (only Home, Tareas, Calendario as requested)
const mainNavItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
];

// Module-specific bottom navigation bars
const studentNavItems = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
  { id: 'materias', label: 'Materias', icon: BookOpen },
  { id: 'mas', label: 'Más', icon: Clock },
];

const financeNavItems = [
  { id: 'summary', label: 'Resumen', icon: PieChart },
  { id: 'transactions', label: 'Movimientos', icon: ArrowRightLeft },
  { id: 'budget', label: 'Presupuesto', icon: Target },
  { id: 'accounts', label: 'Cuentas', icon: Landmark },
];

const projectsNavItems = [
  { id: 'projects_list', label: 'Proyectos', icon: FolderIcon },
  { id: 'projects_workspace', label: 'Tablero', icon: LayoutGrid },
];

const notesNavItems = [
  { id: 'notes_all', label: 'Notas', icon: FileText },
  { id: 'folders_all', label: 'Carpetas', icon: FolderIcon },
];

const habitsNavItems = [
  { id: 'habits_today', label: 'Hoy', icon: Focus },
  { id: 'habits_list', label: 'Hábitos', icon: CheckSquare },
];

const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  studentMobileTab = 'resumen',
  setStudentMobileTab,
  financeMobileTab = 'summary',
  setFinanceMobileTab,
  projectsMobileTab = 'projects_list',
  setProjectsMobileTab,
  notesMobileTab = 'notes_all',
  setNotesMobileTab,
  habitsMobileTab = 'habits_today',
  setHabitsMobileTab,
  hide = false,
}) => {
  if (hide) return null;

  // Determine which nav config to display based on activeTab
  let currentItems = mainNavItems;
  let currentActiveId = activeTab;
  let onItemClick = (id: string) => setActiveTab(id);

  if (activeTab === 'student') {
    currentItems = studentNavItems;
    currentActiveId = studentMobileTab;
    onItemClick = (id: string) => {
      if (setStudentMobileTab) setStudentMobileTab(id as any);
    };
  } else if (activeTab === 'finance') {
    currentItems = financeNavItems;
    currentActiveId = financeMobileTab;
    onItemClick = (id: string) => {
      if (setFinanceMobileTab) setFinanceMobileTab(id);
    };
  } else if (activeTab === 'projects') {
    currentItems = projectsNavItems;
    currentActiveId = projectsMobileTab;
    onItemClick = (id: string) => {
      if (setProjectsMobileTab) setProjectsMobileTab(id);
    };
  } else if (activeTab === 'notes') {
    currentItems = notesNavItems;
    currentActiveId = notesMobileTab;
    onItemClick = (id: string) => {
      if (setNotesMobileTab) setNotesMobileTab(id);
    };
  } else if (activeTab === 'habits') {
    currentItems = habitsNavItems;
    currentActiveId = habitsMobileTab;
    onItemClick = (id: string) => {
      if (setHabitsMobileTab) setHabitsMobileTab(id);
    };
  }

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 pb-safe pointer-events-none">
      <div className="bg-black dark:bg-white rounded-[2rem] px-5 py-2.5 flex justify-around items-center shadow-2xl mx-auto max-w-sm pointer-events-auto">
        {currentItems.map((item) => {
          const isActive = currentActiveId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className="relative flex flex-col items-center justify-center w-12 h-11 transition-transform active:scale-90 cursor-pointer"
              aria-label={item.label}
              title={item.label}
            >
              <item.icon 
                className={`w-5 h-5 transition-colors duration-300 ${
                  isActive 
                    ? 'text-white dark:text-black' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-300 dark:hover:text-zinc-600'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[9px] mt-0.5 font-medium transition-colors ${
                isActive ? 'text-white dark:text-black font-bold' : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white dark:bg-black" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default React.memo(MobileNav);