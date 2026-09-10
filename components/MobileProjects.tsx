import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Todo } from '../types';
import { Plus, ChevronRight, Folder, ArrowLeft, CheckCircle2, Circle, FileText, CheckSquare, MessageSquare, MoreHorizontal } from 'lucide-react';

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
    const [projectTab, setProjectTab] = useState<'inicio' | 'tareas' | 'chat' | 'mas'>('inicio');
    
    // Sort active projects first
    const activeProjects = projects.filter(p => !p.is_archived);

    const handleSelectProject = (id: number | null) => {
        setSelectedProjectId(id);
        setProjectTab('inicio');
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
                className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-40 pt-12 px-6"
            >
                <div className="flex items-center gap-4 mb-6">
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

                {/* Internal Navigation */}
                <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-2xl mb-8 overflow-x-auto hide-scrollbar">
                    {(['inicio', 'tareas', 'chat', 'mas'] as const).map(tab => {
                        const labels = { inicio: 'Inicio', tareas: 'Tareas', chat: 'Chat', mas: 'Más' };
                        const icons = {
                            inicio: <Folder className="w-4 h-4" />,
                            tareas: <CheckSquare className="w-4 h-4" />,
                            chat: <MessageSquare className="w-4 h-4" />,
                            mas: <MoreHorizontal className="w-4 h-4" />
                        };
                        const isActive = projectTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setProjectTab(tab)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors ${
                                    isActive 
                                        ? 'bg-white dark:bg-black text-zinc-900 dark:text-white shadow-sm' 
                                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                }`}
                            >
                                {icons[tab]}
                                <span>{labels[tab]}</span>
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence mode="wait">
                    {projectTab === 'inicio' && (
                        <motion.div
                            key="inicio"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 p-5 rounded-3xl">
                                <div className="flex justify-between items-end mb-3">
                                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Progreso del Proyecto</h2>
                                    <span className="text-lg font-bold">{progress}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                                    <div 
                                        className="h-full bg-black dark:bg-white transition-all duration-500 ease-out rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs font-medium text-zinc-500">
                                    {completedTasks} de {totalTasks} tareas completadas
                                </p>
                            </div>
                            
                            {project.description && (
                                <div>
                                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Descripción</h2>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                                        {project.description}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {projectTab === 'tareas' && (
                        <motion.div
                            key="tareas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Tareas ({projectTasks.length})</h2>
                            </div>

                            {projectTasks.length === 0 ? (
                                <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                                        <CheckSquare className="w-6 h-6 text-zinc-400" />
                                    </div>
                                    <p className="text-zinc-500 text-sm font-medium">No hay tareas en este proyecto.</p>
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
                                                    <CheckCircle2 className="w-6 h-6 text-zinc-900 dark:text-white" />
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
                        </motion.div>
                    )}

                    {projectTab === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-800">
                                <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Chat del Proyecto</h3>
                            <p className="text-sm text-zinc-500 max-w-[200px]">
                                Funcionalidad de chat y colaboración próxima a llegar.
                            </p>
                        </motion.div>
                    )}

                    {projectTab === 'mas' && (
                        <motion.div
                            key="mas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            <button className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-transform">
                                <span className="font-medium text-sm">Editar Proyecto</span>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-transform">
                                <span className="font-medium text-sm">Archivar Proyecto</span>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 active:scale-[0.98] transition-transform">
                                <span className="font-medium text-sm">Eliminar Proyecto</span>
                                <ChevronRight className="w-4 h-4 text-rose-400" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

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
                            onClick={() => handleSelectProject(project.id)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80 active:scale-[0.98] transition-all"
                        >
                            <div className="flex-1 min-w-0 pr-4 text-left">
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
