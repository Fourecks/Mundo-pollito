import React, { useState, useMemo } from 'react';
import { Project, Todo, Sprint, Milestone, ProjectDoc, ProjectInboxItem, ProjectActivity } from '../types';
import { Plus, LayoutDashboard, Settings, MoreVertical, Archive, Trash2, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, Search, Filter, AlertCircle, CheckCircle2, Circle, Clock, ChevronDown, AlignLeft, Edit2 } from 'lucide-react';
import { format, parseISO, isPast, isFuture, isToday } from 'date-fns';
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

// Sub-components will be rendered within the main component for simplicity in this monolithic file,
// but structured cleanly.

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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'docs' | 'inbox' | 'activity'>('overview');
    
    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);
    const projectTodos = useMemo(() => activeProject ? allTodos.filter(t => t.project_id === activeProject.id) : [], [allTodos, activeProject]);

    // -- RENDERS --

    const renderEmptyState = (title: string, description: string, action?: React.ReactNode) => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>
            {action}
        </div>
    );

    const renderSidebar = () => (
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-[#111] h-full flex-shrink-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Proyectos</h2>
                <button onClick={() => onAddProject('Nuevo Proyecto', null, null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="p-2">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar proyecto..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.is_archived).map(project => (
                    <button
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${activeProjectId === project.id ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#9CA3AF' }} />
                        <span className="truncate flex-1">{project.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderProjectHeader = () => {
        if (!activeProject) return null;
        return (
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-6 py-4 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            {activeProject.emoji && <span className="text-2xl">{activeProject.emoji}</span>}
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{activeProject.name}</h1>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                                activeProject.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                activeProject.status === 'on_hold' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                            }`}>
                                {activeProject.status === 'completed' ? 'Completado' : activeProject.status === 'on_hold' ? 'En Pausa' : 'Activo'}
                            </span>
                        </div>
                        {activeProject.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">{activeProject.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
                    {[
                        { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
                        { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                        { id: 'sprints', label: 'Sprints', icon: Target },
                        { id: 'roadmap', label: 'Hoja de Ruta', icon: CalendarIcon },
                        { id: 'docs', label: 'Documentación', icon: FileText },
                        { id: 'inbox', label: 'Bandeja', icon: Inbox },
                        { id: 'activity', label: 'Actividad', icon: Activity },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
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
            <div className="p-6 max-w-5xl mx-auto space-y-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Progreso</span>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-auto">
                            <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tareas</span>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{completedTasks} <span className="text-lg text-gray-400">/ {totalTasks}</span></span>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Fecha Límite</span>
                        <span className="text-lg font-medium text-gray-900 dark:text-white mt-auto">
                            {activeProject.target_date ? format(parseISO(activeProject.target_date), 'd MMM, yyyy', { locale: es }) : 'No definida'}
                        </span>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Prioridad</span>
                        <span className="text-lg font-medium text-gray-900 dark:text-white capitalize mt-auto">
                            {activeProject.priority === 'high' ? 'Alta' : activeProject.priority === 'low' ? 'Baja' : 'Media'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tareas Recientes</h3>
                        </div>
                        <div className="p-0">
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
                    <div className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Actividad Reciente</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {(activeProject.activities || []).slice(0, 5).map(act => (
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

    const renderKanban = () => {
        if (!activeProject) return null;
        const columns = activeProject.kanban_columns || ['To Do', 'In Progress', 'Done'];
        
        return (
            <div className="h-full flex overflow-x-auto p-6 gap-6 bg-gray-50/50 dark:bg-[#0a0a0a]">
                {columns.map(col => {
                    const colTasks = projectTodos.filter(t => (t.kanban_column || 'To Do') === col);
                    return (
                        <div key={col} className="flex-shrink-0 w-80 flex flex-col bg-gray-100 dark:bg-[#161616] rounded-lg border border-gray-200 dark:border-gray-800 h-full max-h-full">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{col}</h3>
                                <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {colTasks.map(todo => (
                                    <div key={todo.id} onClick={() => onEditTodo && onEditTodo(todo)} className="bg-white dark:bg-[#222] p-3 rounded shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                        <p className={`text-sm ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{todo.text}</p>
                                        {todo.date && (
                                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                <CalendarIcon className="w-3 h-3" />
                                                {format(parseISO(todo.date), 'MMM d', { locale: es })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => {
                                    const text = prompt('Nueva tarea para ' + col);
                                    if(text) addTodo(text, { projectId: activeProject.id, kanban_column: col });
                                }} className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center justify-center gap-2 hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded transition-colors">
                                    <Plus className="w-4 h-4" /> Añadir Tarea
                                </button>
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

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gestión de Sprints</h2>
                    <button onClick={() => {
                        const name = prompt('Nombre del Sprint');
                        if (name) {
                            const newSprint: Sprint = {
                                id: crypto.randomUUID(),
                                project_id: activeProject.id,
                                name,
                                start_date: new Date().toISOString(),
                                end_date: new Date(Date.now() + 14 * 86400000).toISOString(),
                                status: 'planning',
                                created_at: new Date().toISOString()
                            };
                            onUpdateProject(activeProject.id, { sprints: [...sprints, newSprint] });
                        }
                    }} className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nuevo Sprint
                    </button>
                </div>

                {sprints.length === 0 ? renderEmptyState('No hay sprints', 'Organiza el trabajo en iteraciones de tiempo fijo.') : (
                    <div className="space-y-4">
                        {sprints.map(sprint => (
                            <div key={sprint.id} className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{sprint.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                            sprint.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' : 
                                            sprint.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400' : 
                                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                            {sprint.status === 'active' ? 'Activo' : sprint.status === 'completed' ? 'Completado' : 'Planificación'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        {format(parseISO(sprint.start_date), 'd MMM', { locale: es })} - {format(parseISO(sprint.end_date), 'd MMM', { locale: es })}
                                    </div>
                                </div>
                                {sprint.goal && <p className="text-sm text-gray-600 dark:text-gray-300">{sprint.goal}</p>}
                                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-2 flex justify-between items-center">
                                    <span className="text-xs text-gray-500">0 tareas completadas</span>
                                    <button className="text-sm text-primary hover:underline font-medium">Ver Tablero</button>
                                </div>
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

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hoja de Ruta</h2>
                    <button onClick={() => {
                        const title = prompt('Título del Hito (Milestone)');
                        if (title) {
                            const newMs: Milestone = {
                                id: crypto.randomUUID(),
                                project_id: activeProject.id,
                                title,
                                date: new Date().toISOString(),
                                status: 'pending',
                                created_at: new Date().toISOString()
                            };
                            onUpdateProject(activeProject.id, { milestones: [...milestones, newMs] });
                        }
                    }} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nuevo Hito
                    </button>
                </div>

                {milestones.length === 0 ? renderEmptyState('No hay hitos', 'Define los puntos clave del proyecto en la hoja de ruta.') : (
                    <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-8 py-4">
                        {milestones.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ms => (
                            <div key={ms.id} className="relative">
                                <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white dark:border-black ${ms.status === 'completed' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                <div className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{ms.title}</h3>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{format(parseISO(ms.date), 'MMMM yyyy', { locale: es })}</span>
                                    </div>
                                    {ms.description && <p className="text-sm text-gray-600 dark:text-gray-300">{ms.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderDocs = () => {
        if (!activeProject) return null;
        const docs = activeProject.docs || [];

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Documentación</h2>
                    <button onClick={() => {
                        const title = prompt('Título del documento');
                        if (title) {
                            const newDoc: ProjectDoc = {
                                id: crypto.randomUUID(),
                                project_id: activeProject.id,
                                title,
                                content: '',
                                category: 'Other',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };
                            onUpdateProject(activeProject.id, { docs: [...docs, newDoc] });
                        }
                    }} className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nuevo Documento
                    </button>
                </div>

                {docs.length === 0 ? renderEmptyState('No hay documentos', 'Crea notas, especificaciones o requerimientos.') : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {docs.map(doc => (
                            <div key={doc.id} className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-primary/50 transition-colors flex flex-col h-32">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{doc.title}</h3>
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{doc.category}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-auto">{doc.content || 'Sin contenido...'}</p>
                                <span className="text-[10px] text-gray-400 mt-2">{format(parseISO(doc.updated_at), 'dd MMM yyyy', { locale: es })}</span>
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
            <div className="p-6 max-w-3xl mx-auto w-full h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bandeja de Entrada</h2>
                </div>
                
                <div className="mb-6 flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Escribe una idea, enlace o nota rápida..." 
                        className="flex-1 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
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
                </div>

                {inbox.length === 0 ? renderEmptyState('Bandeja vacía', 'Captura ideas rápidas antes de organizarlas.') : (
                    <div className="space-y-3">
                        {inbox.map(item => (
                            <div key={item.id} className="bg-white dark:bg-[#111] p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex items-start justify-between group">
                                <div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{item.text}</p>
                                    <span className="text-xs text-gray-400 mt-1 block">{format(parseISO(item.created_at), 'dd MMM, HH:mm', { locale: es })}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                    <button className="text-xs text-primary hover:underline font-medium">Convertir a Tarea</button>
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
            <div className="p-6 max-w-3xl mx-auto w-full h-full overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Registro de Actividad</h2>
                
                {activities.length === 0 ? renderEmptyState('Sin actividad', 'Las acciones importantes se registrarán aquí.') : (
                    <div className="relative pl-4 border-l border-gray-200 dark:border-gray-800 space-y-6">
                        {activities.map(act => (
                            <div key={act.id} className="relative">
                                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 border-2 border-white dark:border-black mt-1.5" />
                                <div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">
                                        <span className="font-semibold text-gray-900 dark:text-white">{act.author}</span> {act.action}
                                    </p>
                                    {act.details && <p className="text-sm text-gray-500 mt-1">{act.details}</p>}
                                    <span className="text-xs text-gray-400 mt-1 block">{format(parseISO(act.created_at), 'd MMM yyyy, HH:mm', { locale: es })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="flex h-full w-full bg-white dark:bg-black overflow-hidden font-sans">
            {renderSidebar()}
            
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {activeProject ? (
                    <>
                        {renderProjectHeader()}
                        <div className="flex-1 overflow-hidden bg-gray-50/30 dark:bg-[#050505]">
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
                    <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-black">
                        <div className="text-center max-w-sm">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-gray-700">
                                <LayoutDashboard className="w-8 h-8 text-gray-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Selecciona un Proyecto</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Elige un proyecto del panel lateral o crea uno nuevo para empezar a gestionar tu trabajo.</p>
                            <button onClick={() => onAddProject('Nuevo Proyecto', null, null)} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm">
                                Crear Proyecto
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsWorkspace;
