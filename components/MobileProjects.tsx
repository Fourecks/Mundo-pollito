import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Todo } from '../types';
import { Plus, ChevronRight, Folder, ArrowLeft, CheckCircle2, Circle, FileText, CheckSquare, PlusCircle } from 'lucide-react';

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
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    
    // Sort active projects first
    const activeProjects = projects.filter(p => !p.is_archived);

    const handleSelectProject = (id: number | null) => {
        setSelectedProjectId(id);
        onSelectProject(id);
    };

    if (selectedProjectId) {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project) {
            setSelectedProjectId(null);
            return null;
        }

        const projectTasks = allTodos.filter(t => t.project_id === project.id);
        const completedTasks = projectTasks.filter(t => t.completed).length;
        const totalTasks = projectTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return (
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-12 px-6"
            >
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => handleSelectProject(null)}
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{project.emoji}</span>
                            <h1 className="text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-sm font-medium text-zinc-500">Progreso del Proyecto</h2>
                        <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-black dark:bg-white transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Tareas ({projectTasks.length})</h2>
                    </div>
                    {projectTasks.length === 0 ? (
                        <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-zinc-500 text-sm">No hay tareas en este proyecto.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {projectTasks.map(task => (
                                <div key={task.id} className={`flex items-start gap-4 p-4 rounded-3xl border transition-all ${
                                    task.completed 
                                        ? 'bg-zinc-50 dark:bg-zinc-900/50 border-transparent opacity-60' 
                                        : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm'
                                }`}>
                                    <div className="mt-0.5 shrink-0">
                                        {task.completed ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-500/20" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-base font-medium truncate ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                            {task.text}
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-12 px-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
                    <p className="text-sm font-medium text-zinc-500 mt-1">{activeProjects.length} activos</p>
                </div>
                <button 
                    onClick={onAddProject}
                    className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-xl"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {activeProjects.map(project => {
                    const projectTasks = allTodos.filter(t => t.project_id === project.id);
                    const completedTasks = projectTasks.filter(t => t.completed).length;
                    const totalTasks = projectTasks.length;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={project.id}
                            onClick={() => handleSelectProject(project.id)}
                            className="flex flex-col text-left p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-all"
                        >
                            <div className="flex justify-between items-start w-full mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-2xl shadow-sm">
                                    {project.emoji || '📁'}
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                            </div>
                            
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                                {project.name}
                            </h3>
                            
                            <p className="text-sm text-zinc-500 font-medium mb-4">
                                {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
                            </p>

                            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-black dark:bg-white transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </motion.button>
                    );
                })}

                {activeProjects.length === 0 && (
                    <div className="text-center py-20 col-span-2">
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

export default MobileProjects;
