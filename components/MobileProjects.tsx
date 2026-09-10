import React from 'react';
import { motion } from 'framer-motion';
import { Project, Todo } from '../types';
import { Plus, ChevronRight, Folder } from 'lucide-react';

interface MobileProjectsProps {
    projects: Project[];
    onAddProject: () => void;
    onSelectProject: (id: number | null) => void;
    allTodos: Todo[]; 
}

const MobileProjects: React.FC<MobileProjectsProps> = ({
    projects,
    onAddProject,
    onSelectProject,
    allTodos
}) => {
    // Sort active projects first
    const activeProjects = projects.filter(p => !p.is_archived);

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-40 pt-12 px-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
                    <p className="text-sm font-medium text-zinc-500 mt-1">{activeProjects.length} activos</p>
                </div>
                <button 
                    onClick={onAddProject}
                    className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-xl"
                    aria-label="Nuevo Proyecto"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="space-y-3">
                {activeProjects.map(project => {
                    const projectTasks = allTodos.filter(t => t.project_id === project.id);
                    const completedTasks = projectTasks.filter(t => t.completed).length;
                    const totalTasks = projectTasks.length;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    const isPersonal = (project.project_mode || 'personal') === 'personal';

                    // Calculate ASCII progress blocks
                    const filledBlocks = Math.round(progress / 10);
                    const emptyBlocks = 10 - filledBlocks;
                    const blockString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

                    return (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80 active:scale-[0.98] transition-all text-left"
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg shrink-0">{project.emoji || '📁'}</span>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                                        {project.name}
                                    </h3>
                                </div>
                                
                                <div className="flex items-center gap-2 pl-7 mt-1">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        isPersonal 
                                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' 
                                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30'
                                    }`}>
                                        {isPersonal ? 'Personal' : 'Avanzado'}
                                    </span>
                                    <span className="text-[11px] font-medium text-zinc-500">
                                        • {completedTasks} de {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
                                    </span>
                                </div>

                                <div className="pl-7 pt-1.5">
                                    <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">
                                        {blockString} <span className="ml-1 text-zinc-900 dark:text-white">{progress}%</span>
                                    </span>
                                </div>
                            </div>

                            <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
                        </motion.button>
                    );
                })}

                {activeProjects.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                            <Folder className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                        </div>
                        <p className="text-zinc-500 font-medium mb-2">No tienes proyectos.</p>
                        <p className="text-sm text-zinc-400">Toca el botón + para crear uno.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(MobileProjects);
