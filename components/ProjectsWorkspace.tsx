import React, { useState, useMemo } from 'react';
import { Project, Todo, Note, Folder, ProjectInvitation, PushNotificationPreferences, ProjectExpense } from '../types';
import ProjectNoteEditorModal from './ProjectNoteEditorModal';
import PersonalProjectSettings from './PersonalProjectSettings';
import AddTaskModal from './AddTaskModal';
import { ProjectKanbanView } from './ProjectKanbanView';
import { 
  Plus, Settings, FileText, ArrowLeft, Trash2, Clock, Check, 
  CheckSquare, Paperclip, DollarSign, FolderPlus, Folder as FolderIcon, 
  FolderOpen, Edit2, Share2, LayoutGrid, BarChart2,
  ListTodo, Layers, ArrowRight, RefreshCw, X, Calendar as CalendarIcon, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ProjectsWorkspaceProps {
    isMobile?: boolean;
    onBack?: () => void;
    currentUser?: any;
    projects: Project[];
    notes: Note[];
    folders: Folder[];
    onAddFolder: (name: string, projectId?: number, subjectId?: string) => Promise<Folder | null>;
    onUpdateFolder: (folderId: number, name: string) => Promise<void>;
    onDeleteFolder: (folderId: number) => Promise<void>;
    onAddNote: (folderId: number | null, projectId?: number, subjectId?: string) => Promise<Note | null>;
    onUpdateNote: (note: Note) => Promise<void>;
    onDeleteNote: (noteId: number, folderId: number | null) => Promise<void>;
    onOpenNotesModule?: (noteId?: number | null, folderId?: number | null) => void;
    allTodos: Todo[];
    activeProjectId: number | null;
    invitations?: ProjectInvitation[];
    onSelectProject: (id: number | null) => void;
    onAddProject: (name: string, emoji: string | null, color: string | null) => Promise<Project | null>;
    onUpdateProject: (id: number, updates: Partial<Project>) => Promise<void>;
    onDeleteProject: (id: number) => Promise<void>;
    onArchiveProject: (id: number, isArchived: boolean) => Promise<void>;
    onSendInvitation?: (project: Project, inviteeEmail: string) => Promise<void>;
    addTodo: (text: string, options?: any) => Promise<void>;
    updateTodo: (id: number, updates: Partial<Todo>) => void;
    deleteTodo: (id: number) => void;
    onEditTodo?: (todo: Todo) => void;
    onOpenProjectEditor?: (project: Project) => void;
    pushPreferences?: PushNotificationPreferences;
}

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = ({
    isMobile = false,
    onBack,
    currentUser,
    projects,
    notes,
    folders,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    allTodos,
    activeProjectId,
    onSelectProject,
    onUpdateProject,
    onDeleteProject,
    onArchiveProject,
    addTodo,
    updateTodo,
    deleteTodo,
    onEditTodo,
    onOpenProjectEditor
}) => {
    const [activeTab, setActiveTab] = useState<'kanban' | 'overview' | 'notes' | 'docs' | 'settings'>('kanban');
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddActiveSheet, setQuickAddActiveSheet] = useState<'main' | 'expense' | 'time'>('main');
    const [showQuickAddTaskModal, setShowQuickAddTaskModal] = useState(false);
    const [kanbanAddModalCol, setKanbanAddModalCol] = useState<string | null>(null);
    const [editingProjectNote, setEditingProjectNote] = useState<Note | null>(null);

    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId) || null;
    }, [projects, activeProjectId]);

    const projectTasks = useMemo(() => {
        if (!activeProjectId) return [];
        return (allTodos || []).filter(t => t.project_id === activeProjectId);
    }, [allTodos, activeProjectId]);

    const projectNotes = useMemo(() => {
        if (!activeProjectId) return [];
        return (notes || []).filter(n => n.project_id === activeProjectId);
    }, [notes, activeProjectId]);

    const projectFolders = useMemo(() => {
        if (!activeProjectId) return [];
        return (folders || []).filter(f => f.project_id === activeProjectId);
    }, [folders, activeProjectId]);

    const currentUserEmail = currentUser?.email || 'usuario@local.com';
    const currentUserName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Usuario';

    const handleCreateProjectNote = async () => {
        if (!activeProjectId) return;
        const newNote = await onAddNote(null, activeProjectId);
        if (newNote) {
            setEditingProjectNote(newNote);
        }
    };

    const handleDeleteProjectNote = async (noteId: number) => {
        await onDeleteNote(noteId, null);
    };

    if (!activeProject) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-[#0c0c0c] text-zinc-600 dark:text-zinc-400">
                <FolderOpen className="w-16 h-16 mb-4 text-zinc-400 dark:text-zinc-600 stroke-[1.5]" />
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Selecciona un proyecto</h2>
                <p className="text-sm max-w-sm mb-6">Elige un proyecto del menú lateral para ver sus tareas, notas, tablero Kanban y archivos.</p>
                {onBack && (
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver a la lista</span>
                    </button>
                )}
            </div>
        );
    }

    // Calculations for Overview tab
    const completedTasksCount = projectTasks.filter(t => t.completed).length;
    const totalTasksCount = projectTasks.length;
    const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const totalExpenses = (activeProject.expenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const totalTimeMins = (activeProject.time_entries || []).reduce((sum: number, entry: any) => sum + (entry.minutes || 0), 0);
    const totalHours = (totalTimeMins / 60).toFixed(1);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0c0c0c] font-sans relative overflow-hidden text-zinc-900 dark:text-zinc-100">
            {/* PROJECT HEADER */}
            <header className="shrink-0 bg-white dark:bg-[#121212] border-b border-zinc-200 dark:border-zinc-800/80 px-4 py-3 flex items-center justify-between gap-3 z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <button 
                        onClick={onBack ? onBack : () => onSelectProject(null)} 
                        className="p-2 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0">{activeProject.emoji || '📁'}</span>
                        <div className="min-w-0">
                            <h1 className="text-base font-bold truncate text-zinc-900 dark:text-white leading-tight">
                                {activeProject.name || activeProject.title}
                            </h1>
                            <span className="text-xs text-zinc-400 font-medium">
                                {totalTasksCount} tareas • {progressPercent}% completado
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {onOpenProjectEditor && (
                        <button 
                            onClick={() => onOpenProjectEditor(activeProject)} 
                            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            title="Ajustes del proyecto"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            {/* TAB NAVIGATION BAR */}
            <div className="shrink-0 bg-white dark:bg-[#121212] border-b border-zinc-200 dark:border-zinc-800 px-4 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar z-10">
                <button
                    onClick={() => setActiveTab('kanban')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'kanban'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Tablero Kanban</span>
                </button>

                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'overview'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                >
                    <BarChart2 className="w-4 h-4" />
                    <span>Resumen</span>
                </button>

                <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'notes'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Notas ({projectNotes.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('docs')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'docs'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                >
                    <Paperclip className="w-4 h-4" />
                    <span>Documentos ({projectFolders.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeTab === 'settings'
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    <span>Configuración</span>
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto relative min-h-0">
                {activeTab === 'kanban' && (
                    <ProjectKanbanView
                        project={activeProject}
                        projectTasks={projectTasks}
                        allProjects={projects}
                        toggleTodo={(id) => {
                            const task = projectTasks.find(t => t.id === id);
                            if (task) updateTodo(task.id, { completed: !task.completed });
                        }}
                        toggleSubtask={(taskId, subtaskId) => {
                            const task = projectTasks.find(t => t.id === taskId);
                            if (task && task.subtasks) {
                                const newSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
                                updateTodo(task.id, { subtasks: newSubtasks });
                            }
                        }}
                        deleteTodo={deleteTodo}
                        updateTodo={(updatedTodo) => {
                            updateTodo(updatedTodo.id, updatedTodo);
                        }}
                        onEditTodo={onEditTodo}
                        onBack={onBack ? onBack : () => onSelectProject(null)}
                        onOpenProjectEditor={onOpenProjectEditor}
                        addTodo={async (text, options) => {
                            await addTodo(text, { ...options, projectId: activeProjectId });
                        }}
                    />
                )}

                {activeTab === 'overview' && (
                    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
                        {/* Progress Header Card */}
                        <div className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Progreso del Proyecto</h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Estado global de tareas e indicadores claves</p>
                                </div>
                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
                                <motion.div 
                                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
                                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                                    <span>Completadas</span>
                                </div>
                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{completedTasksCount} / {totalTasksCount}</div>
                            </div>

                            <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    <span>Horas Registradas</span>
                                </div>
                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totalHours} hrs</div>
                            </div>

                            <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
                                    <DollarSign className="w-4 h-4 text-blue-500" />
                                    <span>Gastos Totales</span>
                                </div>
                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">${totalExpenses.toFixed(2)}</div>
                            </div>

                            <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-1">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                    <span>Notas</span>
                                </div>
                                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{projectNotes.length}</div>
                            </div>
                        </div>

                        {/* Recent Expenses & Time entries */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Expenses */}
                            <div className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-blue-500" />
                                        <span>Gastos recientes</span>
                                    </h4>
                                    <button 
                                        onClick={() => { setIsQuickAddOpen(true); setQuickAddActiveSheet('expense'); }}
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        + Agregar
                                    </button>
                                </div>

                                {(!activeProject.expenses || activeProject.expenses.length === 0) ? (
                                    <p className="text-xs text-zinc-400 py-3 text-center">No hay gastos registrados en este proyecto.</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {activeProject.expenses.slice(-5).reverse().map((exp: any) => (
                                            <div key={exp.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                                                <div>
                                                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">{exp.description}</div>
                                                    <div className="text-[10px] text-zinc-400">{exp.category} • {exp.date}</div>
                                                </div>
                                                <div className="font-bold text-zinc-900 dark:text-white">${Number(exp.amount).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Time entries */}
                            <div className="bg-white dark:bg-[#121212] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        <span>Horas / Tiempo</span>
                                    </h4>
                                    <button 
                                        onClick={() => { setIsQuickAddOpen(true); setQuickAddActiveSheet('time'); }}
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        + Registrar
                                    </button>
                                </div>

                                {(!activeProject.time_entries || activeProject.time_entries.length === 0) ? (
                                    <p className="text-xs text-zinc-400 py-3 text-center">No hay registros de tiempo en este proyecto.</p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {activeProject.time_entries.slice(-5).reverse().map((entry: any) => (
                                            <div key={entry.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                                                <div>
                                                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">{entry.description}</div>
                                                    <div className="text-[10px] text-zinc-400">{entry.date}</div>
                                                </div>
                                                <div className="font-bold text-zinc-900 dark:text-white">{entry.minutes} mins</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base text-zinc-900 dark:text-white">Notas del Proyecto</h3>
                            <button
                                onClick={handleCreateProjectNote}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nueva Nota</span>
                            </button>
                        </div>

                        {projectNotes.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-[#121212] rounded-2xl border border-zinc-200 dark:border-zinc-800/80 text-zinc-400">
                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                                <p className="text-sm font-medium">Aún no hay notas en este proyecto.</p>
                                <button
                                    onClick={handleCreateProjectNote}
                                    className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    + Crear la primera nota
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {projectNotes.map(note => (
                                    <div
                                        key={note.id}
                                        onClick={() => setEditingProjectNote(note)}
                                        className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/50 cursor-pointer transition-all space-y-2 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                {note.title || 'Nota sin título'}
                                            </h4>
                                            <Trash2
                                                className="w-4 h-4 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProjectNote(note.id);
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                                            {note.content || 'Sin contenido'}
                                        </p>
                                        <div className="text-[10px] text-zinc-400 pt-1">
                                            {format(new Date(note.created_at || Date.now()), "d 'de' MMMM, yyyy", { locale: es })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base text-zinc-900 dark:text-white">Carpetas y Documentos</h3>
                        </div>

                        {projectFolders.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-[#121212] rounded-2xl border border-zinc-200 dark:border-zinc-800/80 text-zinc-400">
                                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                                <p className="text-sm font-medium">No hay carpetas asociadas a este proyecto.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {projectFolders.map(folder => (
                                    <div key={folder.id} className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 flex items-center gap-3">
                                        <FolderIcon className="w-6 h-6 text-blue-500 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">{folder.name}</div>
                                            <div className="text-xs text-zinc-400 font-medium">Carpeta del proyecto</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
                        <PersonalProjectSettings
                            project={activeProject}
                            onUpdateProject={(updates) => onUpdateProject(activeProject.id, updates)}
                            onDeleteProject={() => onDeleteProject(activeProject.id)}
                            onArchiveProject={(isArchived) => onArchiveProject(activeProject.id, isArchived)}
                        />
                    </div>
                )}
            </div>

            {/* FLOATING QUICK ADD BUTTON */}
            <button
                type="button"
                onClick={() => {
                    setQuickAddActiveSheet('main');
                    setIsQuickAddOpen(true);
                }}
                className="fixed bottom-6 right-6 z-[100015] w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95"
                title="Agregar elemento al proyecto"
            >
                <Plus className="w-7 h-7" />
            </button>

            {/* QUICK ADD BOTTOM SHEET DRAWER WITH SMOOTH ANIMATIONS */}
            <AnimatePresence>
                {isQuickAddOpen && (
                    <div className="fixed inset-0 z-[100020] flex items-end justify-center">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs" 
                            onClick={() => {
                                setIsQuickAddOpen(false);
                                setTimeout(() => setQuickAddActiveSheet('main'), 300);
                            }} 
                        />
                        <motion.div 
                            layout
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 26, stiffness: 320 }}
                            className="relative bg-white dark:bg-[#0c0c0c] w-full max-w-xl rounded-t-[28px] border-t border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden pb-8 font-sans z-10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div 
                                className="flex justify-center py-3.5 cursor-pointer" 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                }}
                            >
                                <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                            </div>
                            <div className="px-6 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Agregar al proyecto
                                </span>
                                <button 
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                    }}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <AnimatePresence mode="wait" initial={false}>
                                {quickAddActiveSheet === 'main' && (
                                    <motion.div 
                                        key="main-sheet"
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.18, ease: "easeInOut" }}
                                        className="px-4 space-y-1"
                                    >
                                        {/* 1. Nueva tarea */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsQuickAddOpen(false);
                                                setKanbanAddModalCol(null);
                                                setShowQuickAddTaskModal(true);
                                                setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                <CheckSquare className="w-4 h-4" />
                                            </div>
                                            <span>Nueva tarea</span>
                                        </button>
                                        
                                        {/* 2. Nota */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsQuickAddOpen(false);
                                                handleCreateProjectNote();
                                                setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span>Nota</span>
                                        </button>

                                        {/* 3. Archivo */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsQuickAddOpen(false);
                                                setActiveTab('docs');
                                                setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                <Paperclip className="w-4 h-4" />
                                            </div>
                                            <span>Archivo</span>
                                        </button>

                                        {/* 4. Gasto */}
                                        <button
                                            type="button"
                                            onClick={() => setQuickAddActiveSheet('expense')}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                <DollarSign className="w-4 h-4" />
                                            </div>
                                            <span>Gasto</span>
                                        </button>

                                        {/* 5. Registrar tiempo */}
                                        <button
                                            type="button"
                                            onClick={() => setQuickAddActiveSheet('time')}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <span>Tiempo</span>
                                        </button>
                                    </motion.div>
                                )}

                                {quickAddActiveSheet === 'expense' && (
                                    <motion.div
                                        key="expense-sheet"
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.18, ease: "easeInOut" }}
                                        className="px-4 space-y-3 pb-4"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <button 
                                                onClick={() => setQuickAddActiveSheet('main')} 
                                                className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                            </button>
                                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Registrar Gasto</h3>
                                        </div>

                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!activeProject) return;
                                            const formData = new FormData(e.currentTarget);
                                            const desc = formData.get('description')?.toString();
                                            const amountStr = formData.get('amount')?.toString();
                                            const cat = formData.get('category')?.toString();
                                            const date = formData.get('date')?.toString();
                                            
                                            if (desc && amountStr && !isNaN(Number(amountStr))) {
                                                const newExp: ProjectExpense = {
                                                    id: crypto.randomUUID(),
                                                    project_id: activeProject.id,
                                                    description: desc,
                                                    amount: Number(amountStr),
                                                    date: date || new Date().toISOString().split('T')[0],
                                                    category: ((cat as any) || 'Other'),
                                                    created_at: new Date().toISOString(),
                                                    created_by: currentUserEmail,
                                                    created_by_name: currentUserName
                                                };
                                                const updated = [...(activeProject.expenses || []), newExp];
                                                onUpdateProject(activeProject.id, { expenses: updated });
                                                setIsQuickAddOpen(false);
                                                setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                            }
                                        }} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                                <input name="description" type="text" required placeholder="Ej. Licencia de software" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Monto ($)</label>
                                                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                                                <select name="category" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm">
                                                    <option value="Software">Software & SaaS</option>
                                                    <option value="Marketing">Marketing</option>
                                                    <option value="Services">Servicios Profesionales</option>
                                                    <option value="Hardware">Equipamiento</option>
                                                    <option value="Other">Otros</option>
                                                </select>
                                            </div>
                                            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs">
                                                Guardar Gasto
                                            </button>
                                        </form>
                                    </motion.div>
                                )}

                                {quickAddActiveSheet === 'time' && (
                                    <motion.div
                                        key="time-sheet"
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.18, ease: "easeInOut" }}
                                        className="px-4 space-y-3 pb-4"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <button 
                                                onClick={() => setQuickAddActiveSheet('main')} 
                                                className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                            </button>
                                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Registrar Tiempo</h3>
                                        </div>

                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!activeProject) return;
                                            const formData = new FormData(e.currentTarget);
                                            const desc = formData.get('description')?.toString();
                                            const minsStr = formData.get('minutes')?.toString();
                                            const date = formData.get('date')?.toString();
                                            
                                            if (desc && minsStr && !isNaN(Number(minsStr))) {
                                                const newTime = {
                                                    id: crypto.randomUUID(),
                                                    project_id: activeProject.id,
                                                    description: desc,
                                                    minutes: Number(minsStr),
                                                    date: date || new Date().toISOString().split('T')[0],
                                                    created_at: new Date().toISOString(),
                                                    created_by: currentUserEmail,
                                                    created_by_name: currentUserName
                                                };
                                                const updated = [...(activeProject.time_entries || []), newTime];
                                                onUpdateProject(activeProject.id, { time_entries: updated });
                                                setIsQuickAddOpen(false);
                                                setTimeout(() => setQuickAddActiveSheet('main'), 300);
                                            }
                                        }} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">¿En qué trabajaste?</label>
                                                <input name="description" type="text" required placeholder="Ej. Diseño de interfaz" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Minutos</label>
                                                    <input name="minutes" type="number" step="1" required placeholder="60" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 text-sm" />
                                                </div>
                                            </div>
                                            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs">
                                                Guardar Tiempo
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD TASK MODAL */}
            {showQuickAddTaskModal && (
                <AddTaskModal
                    isOpen={showQuickAddTaskModal}
                    onClose={() => {
                        setShowQuickAddTaskModal(false);
                        setKanbanAddModalCol(null);
                    }}
                    onAddTask={async (text, options) => {
                        await addTodo(text, { ...options, projectId: activeProjectId, kanban_column: kanbanAddModalCol || options?.kanban_column || 'Por hacer' });
                        setShowQuickAddTaskModal(false);
                        setKanbanAddModalCol(null);
                    }}
                    projects={projects}
                    fixedProjectId={activeProjectId}
                    activeProject={activeProject}
                    defaultKanbanColumn={kanbanAddModalCol}
                />
            )}

            {/* PROJECT NOTE EDITOR MODAL */}
            {editingProjectNote && (
                <ProjectNoteEditorModal
                    isOpen={!!editingProjectNote}
                    note={editingProjectNote}
                    projectName={activeProject?.name || activeProject?.title}
                    onClose={() => setEditingProjectNote(null)}
                    onSave={(updated) => {
                        onUpdateNote(updated);
                        setEditingProjectNote(null);
                    }}
                    onDelete={(noteId) => {
                        handleDeleteProjectNote(noteId);
                        setEditingProjectNote(null);
                    }}
                />
            )}
        </div>
    );
};

export default React.memo(ProjectsWorkspace);
