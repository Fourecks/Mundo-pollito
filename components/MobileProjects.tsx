import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, Todo } from '../types';
import { Plus, ChevronRight, Folder, GripVertical } from 'lucide-react';
import { sortProjectsBySavedOrder, saveProjectOrder } from '../utils/projectOrder';

interface MobileProjectsProps {
    projects: Project[];
    onAddProject: () => void;
    onSelectProject: (id: number | null) => void;
    allTodos: Todo[];
    onReorderProjects?: (projects: Project[]) => void;
}

const MobileProjects: React.FC<MobileProjectsProps> = ({
    projects,
    onAddProject,
    onSelectProject,
    allTodos,
    onReorderProjects
}) => {
    // Only active projects
    const activeProjects = useMemo(() => {
        const active = (projects || []).filter(p => !p.is_archived);
        return sortProjectsBySavedOrder(active);
    }, [projects]);

    const [orderedProjects, setOrderedProjects] = useState<Project[]>(activeProjects);
    const [draggingId, setDraggingId] = useState<number | null>(null);

    // Keep orderedProjects in sync when projects change from outside
    useEffect(() => {
        setOrderedProjects(activeProjects);
    }, [activeProjects]);

    const longPressTimerRef = useRef<any>(null);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const activeIdRef = useRef<number | null>(null);
    const orderedProjectsRef = useRef<Project[]>(orderedProjects);
    orderedProjectsRef.current = orderedProjects;

    const cleanupDrag = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            setDraggingId(null);
            // Save persistent order
            const ids = orderedProjectsRef.current.map(p => p.id);
            saveProjectOrder(ids);
            if (onReorderProjects) {
                onReorderProjects(orderedProjectsRef.current);
            }
        }
        startPosRef.current = null;
        activeIdRef.current = null;
    };

    const handlePointerDown = (e: React.PointerEvent, project: Project) => {
        cleanupDrag();
        activeIdRef.current = project.id;
        startPosRef.current = { x: e.clientX, y: e.clientY };

        // Start long-press detection (260ms)
        longPressTimerRef.current = setTimeout(() => {
            isDraggingRef.current = true;
            setDraggingId(project.id);
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                try {
                    navigator.vibrate(35);
                } catch (_) {}
            }
        }, 260);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!startPosRef.current) return;

        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;

        // If user moved finger before long-press triggered, it's a scroll: cancel drag
        if (!isDraggingRef.current) {
            if (Math.hypot(dx, dy) > 8) {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                startPosRef.current = null;
            }
            return;
        }

        // Active dragging: reorder on the fly
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const card = targetElement?.closest('[data-project-id]');
        if (card) {
            const overId = Number(card.getAttribute('data-project-id'));
            if (overId && overId !== activeIdRef.current) {
                setOrderedProjects(prev => {
                    const fromIndex = prev.findIndex(p => p.id === activeIdRef.current);
                    const toIndex = prev.findIndex(p => p.id === overId);
                    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

                    const updated = [...prev];
                    const [moved] = updated.splice(fromIndex, 1);
                    updated.splice(toIndex, 0, moved);
                    return updated;
                });
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent, project: Project) => {
        const wasDragging = isDraggingRef.current;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (wasDragging) {
            cleanupDrag();
        } else {
            // Normal quick tap (< 260ms): open project
            cleanupDrag();
            onSelectProject(project.id);
        }
    };

    const handlePointerCancel = () => {
        cleanupDrag();
    };

    return (
        <div 
            className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-40 pt-12 px-6 select-none"
            onPointerMove={handlePointerMove}
            onPointerCancel={handlePointerCancel}
        >
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
                    <p className="text-xs font-medium text-zinc-500 mt-1">
                        {orderedProjects.length} activos • <span className="text-zinc-400">Mantén presionado para reordenar</span>
                    </p>
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
                {orderedProjects.map((project) => {
                    const projectTasks = (allTodos || []).filter(t => t.project_id === project.id);
                    const completedTasks = projectTasks.filter(t => t.completed).length;
                    const totalTasks = projectTasks.length;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    const isPersonal = (project.project_mode || 'personal') === 'personal';
                    const isBeingDragged = draggingId === project.id;

                    // Calculate ASCII progress blocks
                    const filledBlocks = Math.round(progress / 10);
                    const emptyBlocks = 10 - filledBlocks;
                    const blockString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

                    return (
                        <div
                            key={project.id}
                            data-project-id={project.id}
                            onPointerDown={(e) => handlePointerDown(e, project)}
                            onPointerUp={(e) => handlePointerUp(e, project)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer touch-manipulation ${
                                isBeingDragged
                                    ? 'bg-zinc-100 dark:bg-zinc-800 border-black dark:border-white shadow-2xl scale-[1.03] z-30 ring-2 ring-black/10 dark:ring-white/10 opacity-95'
                                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/80 active:scale-[0.98]'
                            }`}
                        >
                            <div className="flex-1 min-w-0 pr-2">
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

                            <div className="flex items-center gap-1 shrink-0">
                                <div 
                                    className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 transition-colors"
                                    title="Mantén presionado para arrastrar"
                                >
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                            </div>
                        </div>
                    );
                })}

                {orderedProjects.length === 0 && (
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
