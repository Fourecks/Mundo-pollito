import React, { useState, useMemo } from 'react';
import { Project, Todo, Sprint, Milestone, ProjectDoc, ProjectInboxItem, ProjectActivity } from '../types';
import { Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectsWorkspaceProps {
    projects: Project[];
    allTodos: Todo[];
    activeProjectId: number | null;
    onSelectProject: (id: number | null) => void;
    onAddProject: (name: string, emoji: string | null, color: string | null) => Promise<Project | null>;
    onUpdateProject: (id: number, updates: Partial<Project>) => Promise<void>;
    onDeleteProject: (id: number) => Promise<void>;
    onArchiveProject: (id: number, isArchived: boolean) => Promise<void>;
    addTodo: (text: string, options?: any) => Promise<void>;
    updateTodo: (id: number, updates: Partial<Todo>) => void;
    deleteTodo: (id: number) => void;
    onEditTodo?: (todo: Todo) => void;
    onOpenProjectEditor?: (project: Project) => void;
}

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-5 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = ({
    projects,
    allTodos,
    activeProjectId,
    onSelectProject,
    onAddProject,
    onUpdateProject,
    onDeleteProject,
    onArchiveProject,
    addTodo,
    updateTodo,
    deleteTodo,
    onEditTodo,
    onOpenProjectEditor
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'docs' | 'inbox' | 'activity'>('overview');
    
    // Inline Kanabn Add State
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');

    // Kanban Drag & Drop State
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Modal States
    const [sprintModal, setSprintModal] = useState<{ isOpen: boolean, sprint: Sprint | null }>({ isOpen: false, sprint: null });
    const [milestoneModal, setMilestoneModal] = useState<{ isOpen: boolean, milestone: Milestone | null }>({ isOpen: false, milestone: null });
    const [docModal, setDocModal] = useState<{ isOpen: boolean, doc: ProjectDoc | null }>({ isOpen: false, doc: null });
    const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
    const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
    
    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);
    const projectTodos = useMemo(() => activeProject ? allTodos.filter(t => t.project_id === activeProject.id) : [], [allTodos, activeProject]);

    const renderEmptyState = (title: string, description: string, action?: React.ReactNode) => (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 dark:bg-[#161616] rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="w-12 h-12 bg-white dark:bg-black rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700">
                <AlertCircle className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>
            {action}
        </div>
    );

    const renderTabs = () => (
        <div className="flex items-end overflow-x-auto bg-gray-100 dark:bg-[#161616] border-b border-gray-200 dark:border-gray-800 pt-2 px-2 scrollbar-hide shrink-0">
            {projects.filter(p => !p.is_archived).map(p => (
                <button
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors whitespace-nowrap flex items-center gap-2 
                    ${activeProjectId === p.id 
                        ? 'bg-white dark:bg-black border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white z-10' 
                        : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    style={{ marginBottom: activeProjectId === p.id ? '-1px' : '0' }}
                >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#9CA3AF' }} />
                    <span className="truncate max-w-[150px]">{p.name}</span>
                </button>
            ))}
            <button 
                onClick={async () => {
                    const newProj = await onAddProject('Nuevo Proyecto', null, null);
                    if (newProj) onSelectProject(newProj.id);
                }} 
                className="px-3 py-2.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-[1px] transition-colors"
                title="Crear Proyecto"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );

    const renderProjectHeader = () => {
        if (!activeProject) return null;
        
        const getStatusBadge = () => {
            switch (activeProject.status) {
                case 'completed':
                    return { label: 'Completado', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' };
                case 'on_hold':
                    return { label: 'En Pausa', style: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60' };
                case 'planning':
                    return { label: 'Planificación', style: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60' };
                case 'archived':
                    return { label: 'Archivado', style: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' };
                case 'active':
                default:
                    return { label: 'Activo', style: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60' };
            }
        };

        const statusBadge = getStatusBadge();

        return (
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-6 py-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            {activeProject.emoji && <span className="text-2xl select-none">{activeProject.emoji}</span>}
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{activeProject.name}</h1>
                            
                            {/* Status badge */}
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusBadge.style}`}>
                                {statusBadge.label}
                            </span>

                            {/* Priority badge */}
                            {activeProject.priority && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                                    activeProject.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60' :
                                    activeProject.priority === 'low' ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/60' :
                                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                                }`}>
                                    Prioridad {activeProject.priority === 'high' ? 'Alta' : activeProject.priority === 'low' ? 'Baja' : 'Media'}
                                </span>
                            )}

                            {/* Target date badge */}
                            {activeProject.target_date && (
                                <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700/60 flex items-center gap-1 font-medium">
                                    <CalendarIcon className="w-3 h-3 text-gray-400" />
                                    Límite: {format(parseISO(activeProject.target_date), 'd MMM yyyy', { locale: es })}
                                </span>
                            )}

                            {/* Lead badge */}
                            {activeProject.lead && (
                                <span className="text-xs text-gray-600 dark:text-gray-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded font-medium">
                                    Resp: {activeProject.lead}
                                </span>
                            )}
                        </div>

                        {activeProject.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl line-clamp-2 mt-0.5 leading-relaxed">{activeProject.description}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)} 
                            className="px-3.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm hover:border-gray-300 dark:hover:border-gray-600"
                            title="Editar propiedades, fechas, estado y prioridad del proyecto"
                        >
                            <Settings className="w-4 h-4" /> Configuración
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
                    {[
                        { id: 'overview', label: 'Resumen', icon: Activity },
                        { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                        { id: 'sprints', label: 'Sprints', icon: Target },
                        { id: 'roadmap', label: 'Hoja de Ruta', icon: CalendarIcon },
                        { id: 'docs', label: 'Documentación', icon: FileText },
                        { id: 'inbox', label: 'Bandeja', icon: Inbox },
                        { id: 'activity', label: 'Historial', icon: Clock },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold' 
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderOverview = () => {
        if (!activeProject) return null;
        
        const completedTasks = projectTodos.filter(t => t.completed).length;
        const totalTasks = projectTodos.length;
        const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        return (
            <div className="p-6 max-w-5xl mx-auto space-y-6 w-full pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Progreso General</span>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-auto overflow-hidden">
                            <div className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tareas Completadas</span>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-base font-normal text-gray-400">/ {totalTasks}</span></span>
                        <span className="text-xs text-gray-400 mt-auto pt-1">{totalTasks - completedTasks} tareas pendientes</span>
                    </div>

                    <div 
                        onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)}
                        className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-all group"
                        title="Haz clic para cambiar la fecha límite o fecha de inicio"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Límite</span>
                            <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white mt-auto">
                            {activeProject.target_date ? format(parseISO(activeProject.target_date), 'd MMM, yyyy', { locale: es }) : 'Sin fecha límite'}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 group-hover:underline mt-1 font-medium">
                            {activeProject.start_date ? `Desde ${format(parseISO(activeProject.start_date), 'd MMM', { locale: es })}` : 'Configurar fechas →'}
                        </span>
                    </div>

                    <div 
                        onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)}
                        className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-all group"
                        title="Haz clic para cambiar prioridad o estado"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prioridad / Estado</span>
                            <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white capitalize mt-auto">
                            {activeProject.priority === 'high' ? 'Alta' : activeProject.priority === 'low' ? 'Baja' : 'Media'}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mt-1 capitalize">
                            Estado: {activeProject.status || 'Activo'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-96">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tareas Recientes</h3>
                        </div>
                        <div className="p-0 overflow-y-auto">
                            {projectTodos.slice(0, 5).map(todo => (
                                <div key={todo.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => onEditTodo && onEditTodo(todo)}>
                                    <div onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { completed: !todo.completed }); }} className="cursor-pointer">
                                        {todo.completed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-gray-400" />}
                                    </div>
                                    <span className={`text-sm flex-1 ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>{todo.text}</span>
                                </div>
                            ))}
                            {projectTodos.length === 0 && (
                                <div className="p-4 text-center text-sm text-gray-500">No hay tareas en este proyecto.</div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-96">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Actividad Reciente</h3>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {(activeProject.activities || []).slice(0, 10).map(act => (
                                <div key={act.id} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                        <Activity className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-900 dark:text-gray-100"><span className="font-medium">{act.author}</span> {act.action}</p>
                                        <span className="text-xs text-gray-500">{format(parseISO(act.created_at), 'dd MMM, HH:mm', { locale: es })}</span>
                                    </div>
                                </div>
                            ))}
                            {(!activeProject.activities || activeProject.activities.length === 0) && (
                                <div className="text-center text-sm text-gray-500">No hay actividad registrada.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('taskId', taskId.toString());
        e.dataTransfer.setData('text/plain', taskId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, col: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumn !== col) {
            setDragOverColumn(col);
        }
    };

    const handleDragLeave = (e: React.DragEvent, col: string) => {
        const related = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(related)) {
            if (dragOverColumn === col) {
                setDragOverColumn(null);
            }
        }
    };

    const handleDrop = (e: React.DragEvent, targetCol: string) => {
        e.preventDefault();
        const taskIdStr = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('text/plain');
        const taskId = taskIdStr ? parseInt(taskIdStr, 10) : draggedTaskId;
        
        setDraggedTaskId(null);
        setDragOverColumn(null);

        if (!taskId || isNaN(taskId)) return;

        const todo = allTodos.find(t => t.id === taskId);
        if (!todo) return;

        // Check if moving into or out of a finished column
        const isTargetDone = /done|complet|finaliz|termin/i.test(targetCol);
        const isCurrentDone = /done|complet|finaliz|termin/i.test(todo.kanban_column || '');
        
        let newCompleted = todo.completed;
        if (isTargetDone) {
            newCompleted = true;
        } else if (isCurrentDone && !isTargetDone) {
            newCompleted = false;
        }

        updateTodo(taskId, {
            kanban_column: targetCol,
            completed: newCompleted,
            project_id: activeProject?.id || todo.project_id
        });
    };

    const getColumnColor = (col: string, index: number) => {
        const lower = col.toLowerCase();
        if (/done|complet|finaliz|termin/i.test(lower)) return { dot: 'bg-emerald-500', headerBg: 'bg-emerald-50/50 dark:bg-emerald-950/20' };
        if (/in progress|en progreso|en curso|haciendo|doing/i.test(lower)) return { dot: 'bg-blue-500', headerBg: 'bg-blue-50/50 dark:bg-blue-950/20' };
        if (/review|revis|test|qa/i.test(lower)) return { dot: 'bg-purple-500', headerBg: 'bg-purple-50/50 dark:bg-purple-950/20' };
        if (/to do|por hacer|pendiente|backlog|idea/i.test(lower)) return { dot: 'bg-amber-500', headerBg: 'bg-amber-50/50 dark:bg-amber-950/20' };
        const palette = ['bg-indigo-500', 'bg-cyan-500', 'bg-rose-500', 'bg-teal-500'];
        return { dot: palette[index % palette.length], headerBg: 'bg-gray-50 dark:bg-[#151515]' };
    };

    const renderKanban = () => {
        if (!activeProject) return null;
        const columns = activeProject.kanban_columns || ['To Do', 'In Progress', 'Done'];
        
        return (
            <div className="h-full flex overflow-x-auto p-6 gap-6 bg-gray-50/50 dark:bg-[#050505]">
                {columns.map((col, colIndex) => {
                    const colTasks = projectTodos.filter(t => (t.kanban_column || 'To Do') === col);
                    const isDragOver = dragOverColumn === col && draggedTaskId !== null;
                    const colStyle = getColumnColor(col, colIndex);
                    
                    return (
                        <div 
                            key={col} 
                            className={`flex-shrink-0 w-80 flex flex-col bg-gray-100/90 dark:bg-[#111] rounded-xl border transition-all duration-200 h-full max-h-full overflow-hidden shadow-sm ${
                                isDragOver 
                                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 shadow-md' 
                                    : 'border-gray-200 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                            onDragOver={(e) => handleDragOver(e, col)}
                            onDragLeave={(e) => handleDragLeave(e, col)}
                            onDrop={(e) => handleDrop(e, col)}
                        >
                            {/* Column Header */}
                            <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/70 dark:bg-[#141414] backdrop-blur-sm">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${colStyle.dot}`} />
                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight">{col}</h3>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="bg-gray-100 dark:bg-black text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-gray-200 dark:border-gray-800">
                                        {colTasks.length}
                                    </span>
                                    <button 
                                        onClick={() => setAddingToColumn(col)}
                                        title={`Añadir tarea a ${col}`}
                                        className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Column Body & Cards */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-hide">
                                {colTasks.map(todo => {
                                    const isBeingDragged = draggedTaskId === todo.id;
                                    const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;
                                    const completedSubtasks = hasSubtasks ? todo.subtasks!.filter(s => s.completed).length : 0;
                                    const totalSubtasks = hasSubtasks ? todo.subtasks!.length : 0;
                                    const isOverdue = todo.due_date && !todo.completed && isPast(parseISO(todo.due_date)) && !isToday(parseISO(todo.due_date));

                                    return (
                                        <div 
                                            key={todo.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, todo.id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => onEditTodo && onEditTodo(todo)}
                                            className={`bg-white dark:bg-[#191919] p-3 rounded-lg border transition-all duration-150 group cursor-grab active:cursor-grabbing relative select-none ${
                                                isBeingDragged
                                                    ? 'opacity-30 border-dashed border-blue-500 scale-[0.98] ring-2 ring-blue-500/30'
                                                    : 'border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {/* Drag Handle & Quick Checkbox */}
                                                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                                    <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 cursor-grab" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateTodo(todo.id, { completed: !todo.completed });
                                                        }}
                                                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                                            todo.completed
                                                                ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 text-transparent'
                                                        }`}
                                                    >
                                                        {todo.completed && <Check className="w-3 h-3" />}
                                                    </button>
                                                </div>

                                                {/* Text Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-snug break-words ${todo.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                                                        {todo.text}
                                                    </p>
                                                </div>

                                                {/* Hover Action Menu */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('¿Eliminar tarea?')) {
                                                                deleteTodo(todo.id);
                                                            }
                                                        }}
                                                        title="Eliminar tarea"
                                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Badges & Meta Row */}
                                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800/80">
                                                {/* Priority Badge */}
                                                {todo.priority && todo.priority !== 'none' && (
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                                        todo.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60' :
                                                        todo.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60' :
                                                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
                                                    }`}>
                                                        {todo.priority === 'high' ? 'Alta' : todo.priority === 'medium' ? 'Media' : 'Baja'}
                                                    </span>
                                                )}

                                                {/* Story Points */}
                                                {todo.story_points != null && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-0.5">
                                                        {todo.story_points} SP
                                                    </span>
                                                )}

                                                {/* Subtasks Count */}
                                                {hasSubtasks && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700/60 flex items-center gap-1">
                                                        <CheckSquare className="w-2.5 h-2.5" />
                                                        {completedSubtasks}/{totalSubtasks}
                                                    </span>
                                                )}

                                                {/* Due Date */}
                                                {todo.due_date && (
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 border ${
                                                        isOverdue
                                                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60'
                                                            : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
                                                    }`}>
                                                        <CalendarIcon className="w-2.5 h-2.5" />
                                                        {format(parseISO(todo.due_date), 'd MMM', { locale: es })}
                                                    </span>
                                                )}

                                                {/* Assignee */}
                                                {todo.assignee && (
                                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-auto truncate max-w-[80px]">
                                                        {todo.assignee}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Active Drop Indicator Preview */}
                                {isDragOver && (
                                    <div className="border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg p-3 text-center bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-center gap-1.5 animate-pulse">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                        Mover tarea aquí
                                    </div>
                                )}

                                {/* Empty State when no tasks and not dragging */}
                                {colTasks.length === 0 && !isDragOver && (
                                    <div className="text-center py-8 px-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-400 dark:text-gray-500 text-xs flex flex-col items-center justify-center gap-1">
                                        <p>No hay tareas en esta columna</p>
                                        <p className="text-[11px] text-gray-400">Arrastra una tarea aquí</p>
                                    </div>
                                )}

                                {/* Quick Add Task Form */}
                                {addingToColumn === col ? (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newTaskText.trim()) {
                                            addTodo(newTaskText.trim(), { projectId: activeProject.id, kanban_column: col });
                                        }
                                        setAddingToColumn(null);
                                        setNewTaskText('');
                                    }} className="bg-white dark:bg-[#1c1c1c] p-2.5 rounded-lg border border-blue-500/80 shadow-md">
                                        <input 
                                            autoFocus 
                                            type="text" 
                                            value={newTaskText} 
                                            onChange={e => setNewTaskText(e.target.value)} 
                                            placeholder="Nombre de la tarea..."
                                            className="w-full text-sm bg-transparent border-none focus:ring-0 p-1 text-gray-900 dark:text-white placeholder-gray-400"
                                        />
                                        <div className="flex justify-end gap-2 mt-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                                            <button 
                                                type="button" 
                                                onClick={() => { setAddingToColumn(null); setNewTaskText(''); }} 
                                                className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="px-3 py-1 text-xs bg-gray-900 dark:bg-white text-white dark:text-black rounded-md font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                                            >
                                                Añadir
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button 
                                        onClick={() => setAddingToColumn(col)} 
                                        className="w-full py-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 flex items-center justify-center gap-1.5 hover:bg-gray-200/60 dark:hover:bg-gray-800/80 rounded-lg transition-colors border border-dashed border-gray-300 dark:border-gray-700/80"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Añadir Tarea
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    
    const renderSprints = () => {
        if (!activeProject) return null;
        const sprints = activeProject.sprints || [];
        
        if (activeSprintId) {
            const sprint = sprints.find(s => s.id === activeSprintId);
            if (!sprint) {
                setActiveSprintId(null);
                return null;
            }
            const sprintTasks = allTodos.filter(t => t.sprint_id === sprint.id && t.project_id === activeProject.id);
            const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
            const completedPoints = sprintTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.story_points || 0), 0);
            const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
            const completedTasks = sprintTasks.filter(t => t.completed).length;

            return (
                <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20">
                    <button onClick={() => setActiveSprintId(null)} className="mb-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver a Sprints
                    </button>
                    
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{sprint.name}</h2>
                                <span className={`text-xs px-2 py-0.5 rounded-sm font-medium border ${
                                    sprint.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : 
                                    sprint.status === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400' : 
                                    'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                    {sprint.status === 'active' ? 'En Curso' : sprint.status === 'completed' ? 'Completado' : 'Planificación'}
                                </span>
                            </div>
                            {sprint.goal && <p className="text-gray-600 dark:text-gray-400">{sprint.goal}</p>}
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {sprint.start_date ? format(parseISO(sprint.start_date), 'd MMM', { locale: es }) : '?'} - {sprint.end_date ? format(parseISO(sprint.end_date), 'd MMM yyyy', { locale: es }) : '?'}</span>
                            </div>
                        </div>
                        <button onClick={() => setSprintModal({ isOpen: true, sprint })} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Editar
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Progreso</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{progress}%</div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><BarChart2 className="w-4 h-4" /> Story Points</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedPoints} <span className="text-lg text-gray-400 font-medium">/ {totalPoints}</span></div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tareas</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-lg text-gray-400 font-medium">/ {sprintTasks.length}</span></div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tareas del Sprint</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = (e.target as any).elements.taskName;
                            if (input.value.trim()) {
                                const spInput = (e.target as any).elements.storyPoints;
                                const sp = spInput.value ? parseInt(spInput.value) : null;
                                addTodo(input.value.trim(), { sprint_id: sprint.id, project_id: activeProject.id, story_points: sp });
                                spInput.value = '';
                                input.value = '';
                            }
                        }} className="mb-4 flex gap-2">
                            <input name="taskName" type="text" placeholder="Añadir una tarea a este sprint..." className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <input name="storyPoints" type="number" min="0" max="100" placeholder="SP (ej. 3)" className="w-24 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <button type="submit" className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Añadir</button>
                        </form>
                        <div className="space-y-2">
                            {sprintTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg group hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => updateTodo(task.id, { completed: !task.completed })} className={`w-5 h-5 rounded flex items-center justify-center border ${task.completed ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}>
                                            {task.completed && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{task.text}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {task.story_points != null && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
                                                {task.story_points} SP
                                            </span>
                                        )}
                                        {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                                    </div>
                                </div>
                            ))}
                            {sprintTasks.length === 0 && <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 text-sm">No hay tareas en este sprint todavía.</div>}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gestión de Sprints</h2>
                    <button onClick={() => setSprintModal({ isOpen: true, sprint: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Nuevo Sprint
                    </button>
                </div>
                {sprints.length === 0 ? renderEmptyState('No hay sprints', 'Organiza el trabajo en iteraciones de tiempo fijo (por ejemplo, ciclos de 2 semanas).') : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sprints.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(sprint => (
                            <div key={sprint.id} onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                setActiveSprintId(sprint.id);
                            }} className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-3 group relative cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                <button onClick={(e) => { e.stopPropagation(); setSprintModal({ isOpen: true, sprint }); }} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <div className="flex items-center justify-between pr-8">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{sprint.name}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium border ${
                                        sprint.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' : 
                                        sprint.status === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400' : 
                                        'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                        {sprint.status === 'active' ? 'En Curso' : sprint.status === 'completed' ? 'Completado' : 'Planificación'}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {sprint.start_date ? format(parseISO(sprint.start_date), 'd MMM', { locale: es }) : '?'} - {sprint.end_date ? format(parseISO(sprint.end_date), 'd MMM yyyy', { locale: es }) : '?'}
                                    </span>
                                </div>
                                {sprint.goal && <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">{sprint.goal}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    
    const renderRoadmap = () => {
        if (!activeProject) return null;
        const milestones = activeProject.milestones || [];
        
        if (activeMilestoneId) {
            const ms = milestones.find(m => m.id === activeMilestoneId);
            if (!ms) {
                setActiveMilestoneId(null);
                return null;
            }
            
            const msTasks = allTodos.filter(t => t.milestone_id === ms.id && t.project_id === activeProject.id);
            const totalPoints = msTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
            const completedPoints = msTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.story_points || 0), 0);
            const progress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
            const completedTasks = msTasks.filter(t => t.completed).length;
            const totalTasks = msTasks.length;
            const msDate = (ms as any).date || ms.target_date;
            const msTitle = (ms as any).title || ms.name;
            
            return (
                <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20">
                    <button onClick={() => setActiveMilestoneId(null)} className="mb-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver a la Hoja de Ruta
                    </button>
                    
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{msTitle}</h2>
                                <span className={`text-xs px-2 py-0.5 rounded-sm font-medium border ${ms.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {ms.status === 'completed' ? 'Completado' : 'Pendiente'}
                                </span>
                            </div>
                            {ms.description && <p className="text-gray-600 dark:text-gray-400 max-w-2xl">{ms.description}</p>}
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {msDate ? format(parseISO(msDate), 'd MMMM yyyy', { locale: es }) : 'Sin fecha'}</span>
                            </div>
                        </div>
                        <button onClick={() => setMilestoneModal({ isOpen: true, milestone: ms })} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Editar
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Progreso</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{progress}%</div>
                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><BarChart2 className="w-4 h-4" /> Story Points</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedPoints} <span className="text-lg text-gray-400 font-medium">/ {totalPoints}</span></div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tareas</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-lg text-gray-400 font-medium">/ {totalTasks}</span></div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tareas del Hito</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = (e.target as any).elements.taskName;
                            const spInput = (e.target as any).elements.storyPoints;
                            if (input.value.trim()) {
                                const sp = spInput.value ? parseInt(spInput.value) : null;
                                addTodo(input.value.trim(), { milestone_id: ms.id, project_id: activeProject.id, story_points: sp });
                                input.value = '';
                                spInput.value = '';
                            }
                        }} className="mb-4 flex gap-2">
                            <input name="taskName" type="text" placeholder="Añadir una tarea a este hito..." className="flex-1 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <input name="storyPoints" type="number" min="0" max="100" placeholder="SP (ej. 3)" className="w-24 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                            <button type="submit" className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">Añadir</button>
                        </form>
                        <div className="space-y-2">
                            {msTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg group hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => updateTodo(task.id, { completed: !task.completed })} className={`w-5 h-5 rounded flex items-center justify-center border ${task.completed ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}`}>
                                            {task.completed && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{task.text}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {task.story_points != null && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
                                                {task.story_points} SP
                                            </span>
                                        )}
                                        {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                                    </div>
                                </div>
                            ))}
                            {msTasks.length === 0 && <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 text-sm">No hay tareas en este hito todavía.</div>}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hoja de Ruta (Hitos)</h2>
                    <button onClick={() => setMilestoneModal({ isOpen: true, milestone: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Nuevo Hito
                    </button>
                </div>
                {milestones.length === 0 ? renderEmptyState('No hay hitos', 'Define los puntos clave o fechas importantes de este proyecto.') : (
                    <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-6 py-2">
                        {milestones.sort((a,b) => {
                            const d1 = (a as any).date || a.target_date;
                            const d2 = (b as any).date || b.target_date;
                            return new Date(d1).getTime() - new Date(d2).getTime();
                        }).map(ms => {
                            const msDate = (ms as any).date || ms.target_date;
                            const msTitle = (ms as any).title || ms.name;
                            return (
                                <div key={ms.id} onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    setActiveMilestoneId(ms.id);
                                }} className="relative group cursor-pointer">
                                    <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white dark:border-[#050505] mt-1.5 ${ms.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <div className="bg-white dark:bg-[#111] p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-2 relative hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                        <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setMilestoneModal({ isOpen: true, milestone: ms }); }} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><Edit2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 pr-12">
                                            <h3 className={`text-base font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${ms.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{msTitle}</h3>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {msDate ? format(parseISO(msDate), 'd MMMM yyyy', { locale: es }) : 'Sin fecha'}</span>
                                        </div>
                                        {ms.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{ms.description}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderDocs = () => {
        if (!activeProject) return null;
        const docs = activeProject.docs || [];

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Documentación</h2>
                    <button onClick={() => setDocModal({ isOpen: true, doc: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Nuevo Documento
                    </button>
                </div>

                {docs.length === 0 ? renderEmptyState('No hay documentos', 'Almacena requerimientos, notas de reunión o especificaciones aquí.') : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {docs.map(doc => (
                            <div key={doc.id} onClick={() => setDocModal({ isOpen: true, doc })} className="bg-white dark:bg-[#111] p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors flex flex-col h-40 relative group">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 pr-6">{doc.title}</h3>
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{doc.category || 'General'}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mt-1 font-mono leading-relaxed">{doc.content || '...'}</p>
                                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400">
                                    <span>Actualizado {format(parseISO(doc.updated_at), 'd MMM', { locale: es })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderInbox = () => {
        if (!activeProject) return null;
        const inbox = activeProject.inbox || [];

        return (
            <div className="p-6 max-w-3xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bandeja de Entrada</h2>
                </div>
                
                <div className="mb-8">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Captura rápida (Presiona Enter para guardar)..." 
                            className="w-full bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 rounded-lg pl-4 pr-10 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-gray-500 shadow-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const newItem: ProjectInboxItem = {
                                        id: crypto.randomUUID(),
                                        project_id: activeProject.id,
                                        text: e.currentTarget.value.trim(),
                                        type: 'note',
                                        created_at: new Date().toISOString()
                                    };
                                    onUpdateProject(activeProject.id, { inbox: [newItem, ...inbox] });
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                        <div className="absolute right-3 top-3 text-gray-400"><Inbox className="w-5 h-5" /></div>
                    </div>
                </div>

                {inbox.length === 0 ? renderEmptyState('Bandeja vacía', 'Todo limpio por aquí.') : (
                    <div className="space-y-3">
                        {inbox.map(item => (
                            <div key={item.id} className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex items-start justify-between group">
                                <div className="pr-4">
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{item.text}</p>
                                    <span className="text-[11px] text-gray-400 mt-2 block">{format(parseISO(item.created_at), 'dd MMM, HH:mm', { locale: es })}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                    <button 
                                        onClick={() => {
                                            addTodo(item.text, { projectId: activeProject.id });
                                            onUpdateProject(activeProject.id, { inbox: inbox.filter(i => i.id !== item.id) });
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded" title="Convertir a tarea"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm('¿Eliminar elemento?')) onUpdateProject(activeProject.id, { inbox: inbox.filter(i => i.id !== item.id) });
                                        }}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderActivity = () => {
        if (!activeProject) return null;
        const activities = activeProject.activities || [];

        return (
            <div className="p-6 max-w-3xl mx-auto w-full h-full overflow-y-auto pb-20">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Historial de Actividad</h2>
                
                {activities.length === 0 ? renderEmptyState('Sin actividad', 'Las acciones importantes se registrarán aquí automáticamente.') : (
                    <div className="relative pl-4 border-l border-gray-200 dark:border-gray-800 space-y-6 py-2">
                        {activities.map(act => (
                            <div key={act.id} className="relative">
                                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-[#050505] mt-1.5" />
                                <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-100 dark:border-gray-800/80 shadow-sm">
                                    <p className="text-sm text-gray-800 dark:text-gray-200">
                                        <span className="font-semibold text-gray-900 dark:text-white">{act.author}</span> {act.action}
                                    </p>
                                    {act.details && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{act.details}</p>}
                                    <span className="text-xs text-gray-400 mt-2 block flex items-center gap-1.5"><Clock className="w-3 h-3"/> {format(parseISO(act.created_at), 'd MMM yyyy, HH:mm', { locale: es })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50/30 dark:bg-[#050505] overflow-hidden font-sans">
            {renderTabs()}
            
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {activeProject ? (
                    <>
                        {renderProjectHeader()}
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'overview' && renderOverview()}
                            {activeTab === 'kanban' && renderKanban()}
                            {activeTab === 'sprints' && renderSprints()}
                            {activeTab === 'roadmap' && renderRoadmap()}
                            {activeTab === 'docs' && renderDocs()}
                            {activeTab === 'inbox' && renderInbox()}
                            {activeTab === 'activity' && renderActivity()}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-[#050505]">
                        <div className="text-center max-w-sm">
                            <div className="w-16 h-16 bg-white dark:bg-[#111] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                                <AlignLeft className="w-8 h-8 text-gray-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Espacio de Proyectos</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Selecciona un proyecto de las pestañas superiores o crea uno nuevo para comenzar.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal isOpen={sprintModal.isOpen} onClose={() => setSprintModal({ isOpen: false, sprint: null })} title={sprintModal.sprint ? 'Editar Sprint' : 'Nuevo Sprint'}>
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const goal = formData.get('goal') as string;
                    const start_date = formData.get('start_date') as string;
                    const end_date = formData.get('end_date') as string;
                    const status = formData.get('status') as Sprint['status'];

                    let updatedSprints = activeProject.sprints || [];
                    if (sprintModal.sprint) {
                        updatedSprints = updatedSprints.map(s => s.id === sprintModal.sprint!.id ? { ...s, name, goal, start_date, end_date, status } : s);
                    } else {
                        updatedSprints = [...updatedSprints, { id: crypto.randomUUID(), project_id: activeProject.id, name, goal, start_date, end_date, status, created_at: new Date().toISOString() }];
                    }
                    onUpdateProject(activeProject.id, { sprints: updatedSprints });
                    setSprintModal({ isOpen: false, sprint: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                        <input name="name" required defaultValue={sprintModal.sprint?.name} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo / Meta</label>
                        <textarea name="goal" defaultValue={sprintModal.sprint?.goal} rows={3} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                            <input name="start_date" type="date" required defaultValue={sprintModal.sprint?.start_date ? new Date(sprintModal.sprint.start_date).toISOString().split('T')[0] : ''} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                            <input name="end_date" type="date" required defaultValue={sprintModal.sprint?.end_date ? new Date(sprintModal.sprint.end_date).toISOString().split('T')[0] : ''} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                        <select name="status" defaultValue={sprintModal.sprint?.status || 'planning'} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500">
                            <option value="planning">Planificación</option>
                            <option value="active">Activo (En Curso)</option>
                            <option value="completed">Completado</option>
                        </select>
                    </div>
                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        {sprintModal.sprint && (
                            <button type="button" onClick={() => {
                                if(activeProject && confirm('¿Eliminar sprint?')) {
                                    onUpdateProject(activeProject.id, { sprints: activeProject.sprints?.filter(s => s.id !== sprintModal.sprint!.id) });
                                    setSprintModal({ isOpen: false, sprint: null });
                                }
                            }} className="mr-auto text-sm text-red-600 hover:text-red-700 font-medium">Eliminar</button>
                        )}
                        <button type="button" onClick={() => setSprintModal({ isOpen: false, sprint: null })} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-md transition-colors">Guardar Sprint</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={milestoneModal.isOpen} onClose={() => setMilestoneModal({ isOpen: false, milestone: null })} title={milestoneModal.milestone ? 'Editar Hito' : 'Nuevo Hito'}>
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('title') as string; const title = name;
                    const description = formData.get('description') as string;
                    const target_date = formData.get('date') as string; const date = target_date;
                    const status = formData.get('status') as Milestone['status'];

                    let updated = activeProject.milestones || [];
                    if (milestoneModal.milestone) {
                        updated = updated.map(m => m.id === milestoneModal.milestone!.id ? { ...m, name, title, description, target_date, date, status } : m);
                    } else {
                        updated = [...updated, { id: crypto.randomUUID(), project_id: activeProject.id, name, title, description, target_date, date, status, created_at: new Date().toISOString() } as any];
                    }
                    onUpdateProject(activeProject.id, { milestones: updated });
                    setMilestoneModal({ isOpen: false, milestone: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título del Hito</label>
                        <input name="title" required defaultValue={(milestoneModal.milestone as any)?.title || milestoneModal.milestone?.name} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                        <textarea name="description" defaultValue={milestoneModal.milestone?.description} rows={3} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 resize-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Objetivo</label>
                        <input name="date" type="date" required defaultValue={((milestoneModal.milestone as any)?.date || milestoneModal.milestone?.target_date) ? new Date(((milestoneModal.milestone as any)?.date || milestoneModal.milestone?.target_date)).toISOString().split('T')[0] : ''} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                        <select name="status" defaultValue={milestoneModal.milestone?.status || 'pending'} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500">
                            <option value="pending">Pendiente</option>
                            <option value="completed">Completado</option>
                        </select>
                    </div>
                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        {milestoneModal.milestone && (
                            <button type="button" onClick={() => {
                                if(activeProject && confirm('¿Eliminar hito?')) {
                                    onUpdateProject(activeProject.id, { milestones: activeProject.milestones?.filter(m => m.id !== milestoneModal.milestone!.id) });
                                    setMilestoneModal({ isOpen: false, milestone: null });
                                }
                            }} className="mr-auto text-sm text-red-600 hover:text-red-700 font-medium">Eliminar</button>
                        )}
                        <button type="button" onClick={() => setMilestoneModal({ isOpen: false, milestone: null })} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-md transition-colors">Guardar Hito</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={docModal.isOpen} onClose={() => setDocModal({ isOpen: false, doc: null })} title={docModal.doc ? 'Editar Documento' : 'Nuevo Documento'}>
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const content = formData.get('content') as string;
                    const category = formData.get('category') as any;

                    let updated = activeProject.docs || [];
                    if (docModal.doc) {
                        updated = updated.map(d => d.id === docModal.doc!.id ? { ...d, title, content, category, updated_at: new Date().toISOString() } : d);
                    } else {
                        updated = [...updated, { id: crypto.randomUUID(), project_id: activeProject.id, title, content, category, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
                    }
                    onUpdateProject(activeProject.id, { docs: updated });
                    setDocModal({ isOpen: false, doc: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                        <input name="title" required defaultValue={docModal.doc?.title} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                        <select name="category" defaultValue={docModal.doc?.category || 'Requirements'} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500">
                            <option value="Requirements">Requerimientos</option>
                            <option value="Meeting Notes">Notas de Reunión</option>
                            <option value="Architecture">Arquitectura</option>
                            <option value="Research">Investigación</option>
                            <option value="Specifications">Especificaciones</option>
                            <option value="Other">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido (Markdown / Texto)</label>
                        <textarea name="content" required defaultValue={docModal.doc?.content} rows={12} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-gray-500 font-mono resize-none" />
                    </div>
                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        {docModal.doc && (
                            <button type="button" onClick={() => {
                                if(activeProject && confirm('¿Eliminar documento?')) {
                                    onUpdateProject(activeProject.id, { docs: activeProject.docs?.filter(d => d.id !== docModal.doc!.id) });
                                    setDocModal({ isOpen: false, doc: null });
                                }
                            }} className="mr-auto text-sm text-red-600 hover:text-red-700 font-medium">Eliminar</button>
                        )}
                        <button type="button" onClick={() => setDocModal({ isOpen: false, doc: null })} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-md transition-colors">Guardar Documento</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProjectsWorkspace;
