import React, { useState, useMemo, useRef } from 'react';
import { Project, Todo, Sprint, Milestone, ProjectDoc, ProjectDocFolder, ProjectInboxItem, ProjectChatMessage, ProjectActivity, ProjectInvitation } from '../types';
import { 
  Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight, Users, MessageSquare, Video, Search, FolderPlus, Folder, FolderOpen, Download, Send, Paperclip, Smile, Pin, ExternalLink, Shield, FileSpreadsheet, FileCode, FileImage, FileArchive, File as FileIcon, Share2, HelpCircle, AlertTriangle, RefreshCw, ThumbsUp, Heart, Flame, Eye, Lightbulb, Megaphone, Flag, Filter
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectsWorkspaceProps {
    projects: Project[];
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
}

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[90000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">{title}</h2>
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
    invitations = [],
    onSelectProject,
    onAddProject,
    onUpdateProject,
    onDeleteProject,
    onArchiveProject,
    onSendInvitation,
    addTodo,
    updateTodo,
    deleteTodo,
    onEditTodo,
    onOpenProjectEditor
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'docs' | 'chat' | 'inbox' | 'team' | 'activity'>('overview');
    
    // Kanban Add State
    const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Modal States
    const [sprintModal, setSprintModal] = useState<{ isOpen: boolean, sprint: Sprint | null }>({ isOpen: false, sprint: null });
    const [closeSprintModal, setCloseSprintModal] = useState<{ isOpen: boolean, sprint: Sprint | null }>({ isOpen: false, sprint: null });
    const [milestoneModal, setMilestoneModal] = useState<{ isOpen: boolean, milestone: Milestone | null }>({ isOpen: false, milestone: null });
    const [docModal, setDocModal] = useState<{ isOpen: boolean, doc: ProjectDoc | null, initialFolderId?: string }>({ isOpen: false, doc: null });
    const [folderModal, setFolderModal] = useState<{ isOpen: boolean, folder: ProjectDocFolder | null }>({ isOpen: false, folder: null });
    const [announcementModal, setAnnouncementModal] = useState(false);
    const [exportReportModal, setExportReportModal] = useState(false);
    
    // Team Invite State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null);

    // Filter & Active States
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
    const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
    const [inboxCategory, setInboxCategory] = useState<'all' | 'announcements' | 'mentions' | 'updates' | 'alerts'>('all');
    
    // Chat States
    const [chatText, setChatText] = useState('');
    const [chatSearch, setChatSearch] = useState('');
    const [replyingToMessage, setReplyingToMessage] = useState<ProjectChatMessage | null>(null);
    const [showDocPickerInChat, setShowDocPickerInChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto fallback to first active project
    const activeProject = useMemo(() => {
        if (activeProjectId) {
            const found = projects.find(p => p.id === activeProjectId);
            if (found) return found;
        }
        const activeList = projects.filter(p => !p.is_archived);
        return activeList.length > 0 ? activeList[0] : (projects.length > 0 ? projects[0] : null);
    }, [projects, activeProjectId]);

    React.useEffect(() => {
        if (!activeProjectId && activeProject) {
            onSelectProject(activeProject.id);
        }
    }, [activeProjectId, activeProject, onSelectProject]);

    const projectTodos = useMemo(() => activeProject ? allTodos.filter(t => t.project_id === activeProject.id) : [], [allTodos, activeProject]);

    // Helper: File Download
    const handleDownloadFile = (doc: ProjectDoc) => {
        if (doc.file_url) {
            const a = document.createElement('a');
            a.href = doc.file_url;
            a.download = doc.file_name || doc.title;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Helper: Reference Document in Chat
    const handleReferenceDocInChat = (doc: ProjectDoc) => {
        if (!activeProject) return;
        const folder = (activeProject.doc_folders || []).find(f => f.id === doc.folder_id);
        const formattedSize = doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Nota de Texto';
        
        const newMessage: ProjectChatMessage = {
            id: crypto.randomUUID(),
            project_id: activeProject.id,
            sender_name: 'Tú',
            sender_email: 'tu_correo@ejemplo.com',
            text: `Ha compartido una referencia del documento: **${doc.title}**`,
            created_at: new Date().toISOString(),
            doc_reference: {
                id: doc.id,
                title: doc.title,
                file_type: doc.file_type || doc.category || 'Documento',
                file_name: doc.file_name || doc.title,
                file_size_formatted: formattedSize,
                folder_name: folder ? folder.name : 'General',
                url: doc.file_url
            }
        };

        const updatedChat = [...(activeProject.chat_messages || []), newMessage];
        onUpdateProject(activeProject.id, { chat_messages: updatedChat });
        setActiveTab('chat');
    };

    // Helper: File Upload to Docs
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            
            let category: ProjectDoc['category'] = 'Other';
            if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'Specifications';
            else if (['docx', 'doc', 'pdf'].includes(ext)) category = 'Requirements';
            else if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) category = 'Ideas';

            const newDoc: ProjectDoc = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                folder_id: selectedFolderId,
                title: file.name,
                content: `Archivo adjunto: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
                category,
                file_url: dataUrl,
                file_name: file.name,
                file_type: file.type || ext,
                file_size: file.size,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const updatedDocs = [newDoc, ...(activeProject.docs || [])];
            onUpdateProject(activeProject.id, { docs: updatedDocs });
            if (e.target) e.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    // File Extension Icon Renderer
    const getFileIcon = (fileType?: string, fileName?: string) => {
        const name = (fileName || fileType || '').toLowerCase();
        if (name.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
        if (name.includes('xls') || name.includes('sheet') || name.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
        if (name.includes('doc') || name.includes('word')) return <FileWord className="w-5 h-5 text-blue-500" />;
        if (name.includes('png') || name.includes('jpg') || name.includes('image')) return <FileImage className="w-5 h-5 text-purple-500" />;
        if (name.includes('zip') || name.includes('rar') || name.includes('tar')) return <FileArchive className="w-5 h-5 text-amber-500" />;
        if (name.includes('js') || name.includes('json') || name.includes('code')) return <FileCode className="w-5 h-5 text-indigo-500" />;
        return <FileIcon className="w-5 h-5 text-gray-400" />;
    };

    const renderEmptyState = (title: string, description: string, action?: React.ReactNode) => (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50 dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="w-12 h-12 bg-white dark:bg-black rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <Sparkles className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">{description}</p>
            {action}
        </div>
    );

    const renderProjectHeader = () => {
        if (!activeProject) return null;

        return (
            <div className="px-6 py-4 bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{activeProject.emoji || '📁'}</span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{activeProject.name}</h1>
                                {activeProject.priority && (
                                    <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border ${
                                        activeProject.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60' :
                                        activeProject.priority === 'low' ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/60' :
                                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                                    }`}>
                                        {activeProject.priority === 'high' ? 'Alta Prioridad' : activeProject.priority === 'low' ? 'Baja Prioridad' : 'Media'}
                                    </span>
                                )}
                            </div>
                            {activeProject.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl line-clamp-1 mt-0.5">{activeProject.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setExportReportModal(true)}
                            className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                            title="Generar e imprimir resumen del proyecto"
                        >
                            <Share2 className="w-3.5 h-3.5" /> Reporte
                        </button>
                        <button 
                            onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)} 
                            className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                        >
                            <Settings className="w-3.5 h-3.5" /> Ajustes
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
                    {[
                        { id: 'overview', label: 'Resumen', icon: Activity },
                        { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                        { id: 'sprints', label: 'Sprints', icon: Target },
                        { id: 'roadmap', label: 'Hoja de Ruta', icon: CalendarIcon },
                        { id: 'docs', label: 'Documentos', icon: FileText, badge: activeProject.docs?.length },
                        { id: 'chat', label: 'Chat Grupal', icon: MessageSquare, badge: activeProject.chat_messages?.length },
                        { id: 'inbox', label: 'Bandeja', icon: Inbox, badge: activeProject.inbox?.filter(i => !i.is_read).length },
                        { id: 'team', label: 'Equipo', icon: Users, badge: (activeProject.members?.length || 1) },
                        { id: 'activity', label: 'Historial', icon: Clock },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap relative ${
                                activeTab === tab.id 
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {tab.badge ? (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    activeTab === tab.id ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {tab.badge}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // OVERVIEW TAB
    const renderOverview = () => {
        if (!activeProject) return null;
        
        const completedTasks = projectTodos.filter(t => t.completed).length;
        const totalTasks = projectTodos.length;
        const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
        
        const activeSprint = (activeProject.sprints || []).find(s => s.status === 'active');
        const pendingMilestones = (activeProject.milestones || []).filter(m => m.status !== 'completed');
        const overdueTasks = projectTodos.filter(t => t.due_date && !t.completed && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));

        // Project Health Score
        let healthLabel = 'Excelente';
        let healthBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400';
        if (overdueTasks.length > 2 || (activeProject.target_date && isPast(parseISO(activeProject.target_date)))) {
            healthLabel = 'Requiere Atención';
            healthBadgeClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400';
        } else if (overdueTasks.length > 0) {
            healthLabel = 'En Riesgo Moderado';
            healthBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';
        }

        return (
            <div className="p-6 max-w-6xl mx-auto space-y-6 w-full pb-20">
                {/* Health & Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Progreso General</span>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{progress}%</span>
                            <span className="text-xs text-gray-500 font-medium">{completedTasks} de {totalTasks} tareas</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-auto overflow-hidden">
                            <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Salud del Proyecto</span>
                        <div className="mt-auto">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${healthBadgeClass}`}>
                                {healthLabel}
                            </span>
                            <p className="text-[11px] text-gray-500 mt-2">
                                {overdueTasks.length === 0 ? 'Sin tareas atrasadas' : `${overdueTasks.length} tareas fuera de fecha`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sprint Activo</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 mt-auto">
                            {activeSprint ? activeSprint.name : 'Ningún Sprint en curso'}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 cursor-pointer hover:underline" onClick={() => setActiveTab('sprints')}>
                            {activeSprint ? 'Ver detalles →' : 'Iniciar un Sprint →'}
                        </span>
                    </div>

                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Próximo Hito</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 mt-auto">
                            {pendingMilestones.length > 0 ? pendingMilestones[0].name : 'Sin hitos pendientes'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                            {pendingMilestones.length > 0 && pendingMilestones[0].target_date ? format(parseISO(pendingMilestones[0].target_date), 'd MMM yyyy', { locale: es }) : 'Configurar Hoja de Ruta'}
                        </span>
                    </div>
                </div>

                {/* Dashboard Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Tasks */}
                    <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-blue-500" /> Tareas Recientes
                            </h3>
                            <button onClick={() => setActiveTab('kanban')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">Ver Tablero Tablero →</button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800/60 overflow-y-auto max-h-80">
                            {projectTodos.slice(0, 6).map(todo => (
                                <div key={todo.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => onEditTodo && onEditTodo(todo)}>
                                    <button onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { completed: !todo.completed }); }} className="shrink-0">
                                        {todo.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-400" />}
                                    </button>
                                    <span className={`text-sm flex-1 ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{todo.text}</span>
                                    {todo.kanban_column && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                                            {todo.kanban_column}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {projectTodos.length === 0 && (
                                <div className="p-8 text-center text-sm text-gray-500">No hay tareas creadas aún.</div>
                            )}
                        </div>
                    </div>

                    {/* Team Announcements & Activity */}
                    <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Inbox className="w-4 h-4 text-amber-500" /> Novedades y Anuncios
                            </h3>
                            <button onClick={() => setActiveTab('inbox')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">Ir a la Bandeja →</button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-80">
                            {(activeProject.inbox || []).slice(0, 4).map(item => (
                                <div key={item.id} className="p-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            {item.type === 'announcement' && <Megaphone className="w-3.5 h-3.5 text-blue-500" />}
                                            {item.title || 'Nota Informativa'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{format(parseISO(item.created_at), 'd MMM, HH:mm', { locale: es })}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">{item.text}</p>
                                </div>
                            ))}
                            {(!activeProject.inbox || activeProject.inbox.length === 0) && (
                                <div className="text-center py-8 text-sm text-gray-500">Sin notificaciones ni anuncios recientes.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // KANBAN TAB
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        try {
            e.dataTransfer.setData('taskId', taskId.toString());
            e.dataTransfer.effectAllowed = 'move';
        } catch { /* ignore */ }
    };

    const handleDrop = (e: React.DragEvent, targetCol: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        let taskId: number | null = draggedTaskId;
        try {
            const taskIdStr = e.dataTransfer.getData('taskId');
            if (taskIdStr) taskId = parseInt(taskIdStr, 10);
        } catch { /* ignore */ }
        
        setDraggedTaskId(null);
        setDragOverColumn(null);

        if (!taskId) return;
        const todo = allTodos.find(t => t.id === taskId);
        if (!todo) return;

        const isTargetDone = /done|complet|finaliz|termin/i.test(targetCol);
        updateTodo(taskId, {
            kanban_column: targetCol,
            completed: isTargetDone,
            project_id: activeProject?.id || todo.project_id
        });
    };

    const renderKanban = () => {
        if (!activeProject) return null;
        const columns = activeProject.kanban_columns || ['To Do', 'In Progress', 'Done'];

        return (
            <div className="h-full flex overflow-x-auto p-6 gap-6 bg-gray-50/50 dark:bg-[#050505]">
                {columns.map((col) => {
                    const colTasks = projectTodos.filter(t => (t.kanban_column || 'To Do') === col);
                    const isDragOver = dragOverColumn === col && draggedTaskId !== null;
                    
                    return (
                        <div 
                            key={col} 
                            className={`flex-shrink-0 w-80 flex flex-col bg-gray-100/90 dark:bg-[#111] rounded-xl border transition-all duration-200 h-full max-h-full overflow-hidden shadow-sm ${
                                isDragOver ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-800'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col); }}
                            onDragLeave={() => setDragOverColumn(null)}
                            onDrop={(e) => handleDrop(e, col)}
                        >
                            <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/70 dark:bg-[#141414]">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{col}</h3>
                                <span className="bg-gray-100 dark:bg-black text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-gray-200 dark:border-gray-800">
                                    {colTasks.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                                {colTasks.map(todo => (
                                    <div 
                                        key={todo.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, todo.id)}
                                        onClick={() => onEditTodo && onEditTodo(todo)}
                                        className="bg-white dark:bg-[#191919] p-3 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                                    >
                                        <div className="flex items-start gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { completed: !todo.completed }); }}
                                                className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border ${todo.completed ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:text-black' : 'border-gray-300 dark:border-gray-600'}`}
                                            >
                                                {todo.completed && <Check className="w-3 h-3" />}
                                            </button>
                                            <p className={`text-sm flex-1 leading-snug ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                                                {todo.text}
                                            </p>
                                        </div>
                                        {todo.story_points != null && (
                                            <div className="mt-2 text-[10px] inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-semibold">
                                                {todo.story_points} SP
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {addingToColumn === col ? (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newTaskText.trim()) {
                                            addTodo(newTaskText.trim(), { projectId: activeProject.id, kanban_column: col });
                                        }
                                        setAddingToColumn(null);
                                        setNewTaskText('');
                                    }} className="bg-white dark:bg-[#1c1c1c] p-2.5 rounded-lg border border-blue-500 shadow-md">
                                        <input 
                                            autoFocus 
                                            type="text" 
                                            value={newTaskText} 
                                            onChange={e => setNewTaskText(e.target.value)} 
                                            placeholder="Nombre de la tarea..."
                                            className="w-full text-sm bg-transparent border-none focus:ring-0 p-1 text-gray-900 dark:text-white"
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button type="button" onClick={() => setAddingToColumn(null)} className="px-2 py-1 text-xs text-gray-500">Cancelar</button>
                                            <button type="submit" className="px-3 py-1 text-xs bg-gray-900 dark:bg-white text-white dark:text-black rounded font-medium">Añadir</button>
                                        </div>
                                    </form>
                                ) : (
                                    <button 
                                        onClick={() => setAddingToColumn(col)} 
                                        className="w-full py-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 flex items-center justify-center gap-1.5 hover:bg-gray-200/60 dark:hover:bg-gray-800/80 rounded-lg transition-colors border border-dashed border-gray-300 dark:border-gray-700"
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

    // SPRINTS TAB
    const renderSprints = () => {
        if (!activeProject) return null;
        const sprints = activeProject.sprints || [];

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Planificación de Sprints</h2>
                        <p className="text-xs text-gray-500">Gestión ágil de iteraciones con capacidad y retrospectivas de equipo.</p>
                    </div>
                    <button onClick={() => setSprintModal({ isOpen: true, sprint: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Crear Sprint
                    </button>
                </div>

                {sprints.length === 0 ? renderEmptyState('No hay Sprints configurados', 'Organiza el trabajo en iteraciones de 1 o 2 semanas.') : (
                    <div className="space-y-6">
                        {sprints.map(sprint => {
                            const sprintTasks = projectTodos.filter(t => t.sprint_id === sprint.id);
                            const totalSP = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
                            const completedSP = sprintTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.story_points || 0), 0);
                            const progress = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

                            return (
                                <div key={sprint.id} className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                                                sprint.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300' :
                                                sprint.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' :
                                                'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {sprint.status === 'active' ? '● En Curso' : sprint.status === 'completed' ? '✓ Completado' : 'En Planificación'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {sprint.status === 'planning' && (
                                                <button 
                                                    onClick={() => {
                                                        const updated = sprints.map(s => s.id === sprint.id ? { ...s, status: 'active' as const } : s);
                                                        onUpdateProject(activeProject.id, { sprints: updated });
                                                    }}
                                                    className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
                                                >
                                                    Iniciar Sprint
                                                </button>
                                            )}
                                            {sprint.status === 'active' && (
                                                <button 
                                                    onClick={() => setCloseSprintModal({ isOpen: true, sprint })}
                                                    className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700"
                                                >
                                                    Cerrar Sprint
                                                </button>
                                            )}
                                            <button onClick={() => setSprintModal({ isOpen: true, sprint })} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {sprint.goal && <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">{sprint.goal}</p>}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-gray-50 dark:bg-black/50 rounded-lg border border-gray-100 dark:border-gray-800 mb-4">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Progreso SP</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{completedSP} / {totalSP} SP ({progress}%)</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Fechas</span>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sprint.start_date || '?'} al {sprint.end_date || '?'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Tareas</span>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sprintTasks.filter(t => t.completed).length} completadas de {sprintTasks.length}</span>
                                        </div>
                                    </div>

                                    {/* Retrospective */}
                                    {sprint.retrospective && (
                                        <div className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                                            <strong className="block mb-1 font-bold">📝 Retrospectiva del Sprint:</strong>
                                            {sprint.retrospective}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // ROADMAP TAB
    const renderRoadmap = () => {
        if (!activeProject) return null;
        const milestones = activeProject.milestones || [];

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hoja de Ruta y Entregables</h2>
                        <p className="text-xs text-gray-500">Cronograma visual de hitos clave, lanzamientos y dependencias del proyecto.</p>
                    </div>
                    <button onClick={() => setMilestoneModal({ isOpen: true, milestone: null })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" /> Nuevo Hito
                    </button>
                </div>

                {milestones.length === 0 ? renderEmptyState('Hoja de ruta sin hitos', 'Establece los objetivos clave del proyecto.') : (
                    <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-6">
                        {milestones.map(ms => (
                            <div key={ms.id} className="relative group">
                                <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-white dark:border-[#050505] mt-1 ${
                                    ms.status === 'completed' ? 'bg-emerald-500' : ms.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`} />
                                <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white">{ms.name}</h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                {ms.category || 'General'}
                                            </span>
                                        </div>
                                        <button onClick={() => setMilestoneModal({ isOpen: true, milestone: ms })} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {ms.description && <p className="text-xs text-gray-600 dark:text-gray-300">{ms.description}</p>}
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 font-medium">
                                        <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Límite: {ms.target_date}</span>
                                        {ms.owner_email && <span>Resp: {ms.owner_email}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // DOCUMENTATION & FILES TAB
    const renderDocs = () => {
        if (!activeProject) return null;
        const folders = activeProject.doc_folders || [];
        const docs = activeProject.docs || [];
        const filteredDocs = selectedFolderId ? docs.filter(d => d.folder_id === selectedFolderId) : docs;

        return (
            <div className="p-6 max-w-6xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Documentos y Archivos</h2>
                        <p className="text-xs text-gray-500">Sube archivos reales (Word, Excel, PDF), organiza carpetas y compártelos en el chat grupal.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setFolderModal({ isOpen: true, folder: null })} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5">
                            <FolderPlus className="w-4 h-4 text-amber-500" /> Nueva Carpeta
                        </button>
                        <button onClick={() => setDocModal({ isOpen: true, doc: null, initialFolderId: selectedFolderId || undefined })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Nueva Nota
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm">
                            <Paperclip className="w-4 h-4" /> Subir Archivo
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    </div>
                </div>

                {/* Folders Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-gray-200 dark:border-gray-800">
                    <button 
                        onClick={() => setSelectedFolderId(null)} 
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                            selectedFolderId === null ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                        <Folder className="w-4 h-4" /> Todos los Archivos ({docs.length})
                    </button>

                    {folders.map(f => {
                        const count = docs.filter(d => d.folder_id === f.id).length;
                        return (
                            <div key={f.id} className="relative group shrink-0">
                                <button
                                    onClick={() => setSelectedFolderId(f.id)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                                        selectedFolderId === f.id ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50'
                                    }`}
                                >
                                    <FolderOpen className="w-4 h-4" /> {f.name} ({count})
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Docs Grid */}
                {filteredDocs.length === 0 ? renderEmptyState('No hay archivos ni documentos', 'Sube tus archivos de Word, Excel o PDF o crea una nueva nota.') : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocs.map(doc => {
                            const folder = folders.find(f => f.id === doc.folder_id);
                            return (
                                <div key={doc.id} className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between hover:border-gray-400 dark:hover:border-gray-600 transition-all group">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {getFileIcon(doc.file_type, doc.file_name)}
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.title}</h3>
                                            </div>
                                            {folder && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/50 shrink-0">
                                                    {folder.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{doc.content}</p>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400">
                                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Nota'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleReferenceDocInChat(doc)}
                                                title="Referenciar en Chat Grupal"
                                                className="px-2 py-1 text-[11px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 font-medium flex items-center gap-1"
                                            >
                                                <MessageSquare className="w-3 h-3" /> Chat
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadFile(doc)}
                                                title="Descargar Archivo"
                                                className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // TEAM CHAT TAB
    const renderChat = () => {
        if (!activeProject) return null;
        const messages = activeProject.chat_messages || [];
        const filteredMessages = chatSearch ? messages.filter(m => m.text.toLowerCase().includes(chatSearch.toLowerCase())) : messages;

        const handleSendMessage = (e: React.FormEvent) => {
            e.preventDefault();
            if (!chatText.trim() && !replyingToMessage) return;

            const newMessage: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                sender_name: 'Tú',
                sender_email: 'tu_correo@ejemplo.com',
                text: chatText.trim(),
                created_at: new Date().toISOString(),
                reply_to: replyingToMessage ? {
                    id: replyingToMessage.id,
                    sender_name: replyingToMessage.sender_name,
                    text: replyingToMessage.text
                } : undefined
            };

            onUpdateProject(activeProject.id, { chat_messages: [...messages, newMessage] });
            setChatText('');
            setReplyingToMessage(null);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };

        return (
            <div className="flex flex-col h-full bg-gray-50/50 dark:bg-[#050505]">
                {/* Chat Top Search Bar */}
                <div className="px-6 py-2.5 bg-white dark:bg-[#0e0e0e] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                        <MessageSquare className="w-4 h-4 text-blue-500" /> Chat del Proyecto ({messages.length} mensajes)
                    </div>
                    <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar en el chat..." 
                            value={chatSearch} 
                            onChange={e => setChatSearch(e.target.value)} 
                            className="w-full pl-8 pr-3 py-1 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-md focus:outline-none"
                        />
                    </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {filteredMessages.length === 0 ? renderEmptyState('Inicio de la conversación', 'Utiliza este chat para colaborar en tiempo real y referenciar documentos.') : (
                        filteredMessages.map(msg => (
                            <div key={msg.id} className="flex items-start gap-3 group">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                    {msg.sender_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{msg.sender_name}</span>
                                        <span className="text-[10px] text-gray-400">{format(parseISO(msg.created_at), 'HH:mm', { locale: es })}</span>
                                    </div>

                                    {msg.reply_to && (
                                        <div className="p-2 mb-1 bg-gray-100 dark:bg-gray-800/60 rounded border-l-2 border-blue-500 text-xs text-gray-600 dark:text-gray-300">
                                            <strong className="block text-[10px] text-blue-500">Respondiendo a {msg.reply_to.sender_name}:</strong>
                                            {msg.reply_to.text}
                                        </div>
                                    )}

                                    <div className="p-3 bg-white dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200 shadow-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                                        {/* Doc Reference Card */}
                                        {msg.doc_reference && (
                                            <div className="mt-2.5 p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {getFileIcon(msg.doc_reference.file_type, msg.doc_reference.file_name)}
                                                    <div className="truncate">
                                                        <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">{msg.doc_reference.title}</h4>
                                                        <span className="text-[10px] text-blue-600 dark:text-blue-400">{msg.doc_reference.folder_name} • {msg.doc_reference.file_size_formatted}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button 
                                                        onClick={() => { setSelectedFolderId(null); setActiveTab('docs'); }}
                                                        className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                                                    >
                                                        Abrir
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Message Input Bar */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-[#0e0e0e] border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setActiveTab('docs')} title="Referenciar un documento" className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                            <FileText className="w-5 h-5" />
                        </button>
                        <input 
                            type="text" 
                            placeholder="Escribe un mensaje al equipo..." 
                            value={chatText} 
                            onChange={e => setChatText(e.target.value)} 
                            className="flex-1 bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm">
                            <Send className="w-3.5 h-3.5" /> Enviar
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // INBOX TAB
    const renderInbox = () => {
        if (!activeProject) return null;
        const inbox = activeProject.inbox || [];

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20 space-y-6">
                {/* Explanation Card */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl">
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-blue-600" /> ¿Para qué sirve la Bandeja del Proyecto?
                    </h3>
                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                        Es la central de notificaciones e información oficial. Agrupa <strong>anuncios del líder</strong>, notificaciones automáticas de tareas, alertas urgentes e ideas capturadas, manteniendo a todo el equipo informado sin saturar el chat diario.
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bandeja de Entrada</h2>
                    <button onClick={() => setAnnouncementModal(true)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm">
                        <Megaphone className="w-3.5 h-3.5" /> Nuevo Anuncio
                    </button>
                </div>

                {/* Quick Capture */}
                <input 
                    type="text" 
                    placeholder="Captura rápida para la bandeja (Presiona Enter)..." 
                    className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            const newItem: ProjectInboxItem = {
                                id: crypto.randomUUID(),
                                project_id: activeProject.id,
                                title: 'Nota Rápida',
                                text: e.currentTarget.value.trim(),
                                type: 'note',
                                created_at: new Date().toISOString()
                            };
                            onUpdateProject(activeProject.id, { inbox: [newItem, ...inbox] });
                            e.currentTarget.value = '';
                        }
                    }}
                />

                {/* Inbox List */}
                {inbox.length === 0 ? renderEmptyState('Bandeja limpia', 'No tienes notificaciones ni anuncios pendientes.') : (
                    <div className="space-y-3">
                        {inbox.map(item => (
                            <div key={item.id} className="p-4 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{item.title || 'Mensaje de la Bandeja'}</span>
                                        <span className="text-[10px] text-gray-400">{format(parseISO(item.created_at), 'd MMM, HH:mm', { locale: es })}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{item.text}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        addTodo(item.text, { projectId: activeProject.id });
                                        onUpdateProject(activeProject.id, { inbox: inbox.filter(i => i.id !== item.id) });
                                    }}
                                    className="px-2.5 py-1 text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 rounded font-semibold shrink-0"
                                >
                                    + Crear Tarea
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // TEAM TAB
    const renderTeam = () => {
        if (!activeProject) return null;
        const members = activeProject.members || [];

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Miembros del Equipo</h2>
                        <p className="text-xs text-gray-500">Administra los roles, permisos y colaboradores de este espacio.</p>
                    </div>
                    <button onClick={() => setIsInviteModalOpen(true)} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 flex items-center gap-1.5 shadow-sm">
                        <Users className="w-3.5 h-3.5" /> Invitar Miembro
                    </button>
                </div>

                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {members.map((m, idx) => (
                        <div key={m.id || idx} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                    {(m.name || m.email || 'M').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{m.name || 'Miembro del Equipo'}</h4>
                                    <span className="text-[10px] text-gray-400">{m.email || 'correo@ejemplo.com'}</span>
                                </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {m.role === 'owner' ? 'Propietario' : m.role === 'lead' ? 'Líder de Proyecto' : 'Colaborador'}
                            </span>
                        </div>
                    ))}
                    {members.length === 0 && (
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">Tú (Propietario)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700">Propietario</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // HISTORY TAB
    const renderActivity = () => {
        if (!activeProject) return null;
        const activities = activeProject.activities || [];

        return (
            <div className="p-6 max-w-3xl mx-auto w-full h-full overflow-y-auto pb-20 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Historial de Cambios</h2>
                {activities.length === 0 ? renderEmptyState('Sin registros de actividad', 'Las acciones importantes se guardarán aquí.') : (
                    <div className="relative pl-4 border-l border-gray-200 dark:border-gray-800 space-y-4">
                        {activities.map(act => (
                            <div key={act.id} className="relative bg-white dark:bg-[#111] p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
                                <strong className="text-gray-900 dark:text-white">{act.author}</strong> {act.action}
                                {act.details && <p className="text-gray-500 mt-1">{act.details}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50/30 dark:bg-[#050505] overflow-hidden font-sans">
            {renderProjectHeader()}
            
            <div className="flex-1 overflow-hidden relative">
                {activeProject ? (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'kanban' && renderKanban()}
                        {activeTab === 'sprints' && renderSprints()}
                        {activeTab === 'roadmap' && renderRoadmap()}
                        {activeTab === 'docs' && renderDocs()}
                        {activeTab === 'chat' && renderChat()}
                        {activeTab === 'inbox' && renderInbox()}
                        {activeTab === 'team' && renderTeam()}
                        {activeTab === 'activity' && renderActivity()}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        Selecciona un proyecto para comenzar.
                    </div>
                )}
            </div>

            {/* SPRINT MODAL */}
            <Modal isOpen={sprintModal.isOpen} onClose={() => setSprintModal({ isOpen: false, sprint: null })} title={sprintModal.sprint ? 'Editar Sprint' : 'Nuevo Sprint'}>
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const goal = formData.get('goal') as string;
                    const start_date = formData.get('start_date') as string;
                    const end_date = formData.get('end_date') as string;

                    let updatedSprints = activeProject.sprints || [];
                    if (sprintModal.sprint) {
                        updatedSprints = updatedSprints.map(s => s.id === sprintModal.sprint!.id ? { ...s, name, goal, start_date, end_date } : s);
                    } else {
                        updatedSprints = [...updatedSprints, { id: crypto.randomUUID(), project_id: activeProject.id, name, goal, start_date, end_date, status: 'planning', created_at: new Date().toISOString() }];
                    }
                    onUpdateProject(activeProject.id, { sprints: updatedSprints });
                    setSprintModal({ isOpen: false, sprint: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Sprint</label>
                        <input name="name" required defaultValue={sprintModal.sprint?.name} placeholder="Sprint 1 - MVP Release" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Objetivo del Sprint</label>
                        <textarea name="goal" defaultValue={sprintModal.sprint?.goal} rows={3} placeholder="Desplegar sistema de autenticación..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                            <input name="start_date" type="date" required defaultValue={sprintModal.sprint?.start_date} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                            <input name="end_date" type="date" required defaultValue={sprintModal.sprint?.end_date} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setSprintModal({ isOpen: false, sprint: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg">Guardar</button>
                    </div>
                </form>
            </Modal>

            {/* CLOSE SPRINT RETROSPECTIVE MODAL */}
            <Modal isOpen={closeSprintModal.isOpen} onClose={() => setCloseSprintModal({ isOpen: false, sprint: null })} title="Cerrar Sprint y Retrospectiva">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject || !closeSprintModal.sprint) return;
                    const formData = new FormData(e.currentTarget);
                    const retro = formData.get('retrospective') as string;

                    const updatedSprints = (activeProject.sprints || []).map(s => 
                        s.id === closeSprintModal.sprint!.id ? { ...s, status: 'completed' as const, retrospective: retro } : s
                    );

                    onUpdateProject(activeProject.id, { sprints: updatedSprints });
                    setCloseSprintModal({ isOpen: false, sprint: null });
                }} className="space-y-4">
                    <p className="text-xs text-gray-500">
                        Escribe un resumen de aprendizajes y progresos para el equipo antes de marcar este Sprint como completado.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Retrospectiva del Sprint</label>
                        <textarea name="retrospective" rows={4} required placeholder="¿Qué salió bien? ¿Qué se puede mejorar en la siguiente iteración?" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setCloseSprintModal({ isOpen: false, sprint: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 text-white font-semibold rounded-lg">Finalizar Sprint</button>
                    </div>
                </form>
            </Modal>

            {/* MILESTONE MODAL */}
            <Modal isOpen={milestoneModal.isOpen} onClose={() => setMilestoneModal({ isOpen: false, milestone: null })} title={milestoneModal.milestone ? 'Editar Hito' : 'Nuevo Hito de Hoja de Ruta'}>
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const description = formData.get('description') as string;
                    const target_date = formData.get('target_date') as string;
                    const category = formData.get('category') as Milestone['category'];

                    let updated = activeProject.milestones || [];
                    if (milestoneModal.milestone) {
                        updated = updated.map(m => m.id === milestoneModal.milestone!.id ? { ...m, name, description, target_date, category } : m);
                    } else {
                        updated = [...updated, { id: crypto.randomUUID(), project_id: activeProject.id, name, description, target_date, category, status: 'pending', created_at: new Date().toISOString() } as any];
                    }
                    onUpdateProject(activeProject.id, { milestones: updated });
                    setMilestoneModal({ isOpen: false, milestone: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Hito</label>
                        <input name="name" required defaultValue={milestoneModal.milestone?.name} placeholder="Lanzamiento Beta Versión 1.0" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fase / Categoría</label>
                        <select name="category" defaultValue={milestoneModal.milestone?.category || 'Product Launch'} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white">
                            <option value="Sprint Release">Sprint Release</option>
                            <option value="Product Launch">Lanzamiento de Producto</option>
                            <option value="Architecture">Arquitectura y Backend</option>
                            <option value="Quality Assurance">Pruebas de Calidad</option>
                            <option value="Client Review">Revisión de Clientes</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha Objetivo</label>
                        <input name="target_date" type="date" required defaultValue={milestoneModal.milestone?.target_date} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                        <textarea name="description" defaultValue={milestoneModal.milestone?.description} rows={3} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setMilestoneModal({ isOpen: false, milestone: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg">Guardar</button>
                    </div>
                </form>
            </Modal>

            {/* FOLDER MODAL */}
            <Modal isOpen={folderModal.isOpen} onClose={() => setFolderModal({ isOpen: false, folder: null })} title="Nueva Carpeta de Documentos">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;

                    const newFolder: ProjectDocFolder = {
                        id: crypto.randomUUID(),
                        project_id: activeProject.id,
                        name,
                        created_at: new Date().toISOString()
                    };

                    onUpdateProject(activeProject.id, { doc_folders: [...(activeProject.doc_folders || []), newFolder] });
                    setFolderModal({ isOpen: false, folder: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre de la Carpeta</label>
                        <input name="name" required placeholder="Diseño, Requerimientos, Especificaciones..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setFolderModal({ isOpen: false, folder: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-amber-500 text-white font-semibold rounded-lg">Crear Carpeta</button>
                    </div>
                </form>
            </Modal>

            {/* DOCUMENT MODAL */}
            <Modal isOpen={docModal.isOpen} onClose={() => setDocModal({ isOpen: false, doc: null })} title="Nueva Nota o Documento">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const content = formData.get('content') as string;
                    const folder_id = formData.get('folder_id') as string;

                    const newDoc: ProjectDoc = {
                        id: crypto.randomUUID(),
                        project_id: activeProject.id,
                        folder_id: folder_id || null,
                        title,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    onUpdateProject(activeProject.id, { docs: [newDoc, ...(activeProject.docs || [])] });
                    setDocModal({ isOpen: false, doc: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Título</label>
                        <input name="title" required placeholder="Minuta de reunión, Especificaciones..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Carpeta Destino</label>
                        <select name="folder_id" defaultValue={docModal.initialFolderId || ''} className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white">
                            <option value="">(Raíz - Sin Carpeta)</option>
                            {(activeProject?.doc_folders || []).map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Contenido / Notas</label>
                        <textarea name="content" rows={5} required placeholder="Escribe el texto o notas del documento aquí..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setDocModal({ isOpen: false, doc: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg">Guardar</button>
                    </div>
                </form>
            </Modal>

            {/* ANNOUNCEMENT MODAL */}
            <Modal isOpen={announcementModal} onClose={() => setAnnouncementModal(false)} title="Crear Anuncio Oficial">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const text = formData.get('text') as string;

                    const newItem: ProjectInboxItem = {
                        id: crypto.randomUUID(),
                        project_id: activeProject.id,
                        title,
                        text,
                        type: 'announcement',
                        created_at: new Date().toISOString()
                    };

                    onUpdateProject(activeProject.id, { inbox: [newItem, ...(activeProject.inbox || [])] });
                    setAnnouncementModal(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Título del Anuncio</label>
                        <input name="title" required placeholder="Actualización de Fechas Clave..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Detalles</label>
                        <textarea name="text" rows={4} required placeholder="Escribe el comunicado para el equipo..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setAnnouncementModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg">Publicar Anuncio</button>
                    </div>
                </form>
            </Modal>

            {/* EXPORT REPORT MODAL */}
            <Modal isOpen={exportReportModal} onClose={() => setExportReportModal(false)} title="Reporte del Proyecto">
                <div className="space-y-4 text-xs">
                    <p className="text-gray-500">
                        Resumen imprimible o exportable del estado actual, tareas completadas e hitos del proyecto.
                    </p>
                    <div className="p-3 bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg font-mono text-[11px] space-y-2 max-h-60 overflow-y-auto">
                        <p className="font-bold text-gray-900 dark:text-white">PROYECTO: {activeProject?.name}</p>
                        <p>Estado: {activeProject?.status || 'Activo'} | Prioridad: {activeProject?.priority || 'Media'}</p>
                        <p>Tareas: {projectTodos.filter(t => t.completed).length} / {projectTodos.length} completadas</p>
                        <p>Sprints: {activeProject?.sprints?.length || 0} configurados</p>
                        <p>Documentos: {activeProject?.docs?.length || 0} almacenados</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                        <button onClick={() => setExportReportModal(false)} className="px-4 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg">Cerrar</button>
                    </div>
                </div>
            </Modal>

            {/* TEAM INVITE MODAL */}
            <Modal isOpen={isInviteModalOpen} onClose={() => { setIsInviteModalOpen(false); setInviteEmail(''); setInviteSuccessMessage(null); }} title="Invitar al Equipo">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!activeProject || !inviteEmail.trim()) return;
                    if (onSendInvitation) {
                        await onSendInvitation(activeProject, inviteEmail.trim());
                        setInviteSuccessMessage(`Invitación enviada exitosamente a ${inviteEmail.trim()}`);
                        setInviteEmail('');
                    }
                }} className="space-y-4">
                    {inviteSuccessMessage && (
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg">
                            {inviteSuccessMessage}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                        <input 
                            type="email" 
                            required 
                            value={inviteEmail} 
                            onChange={e => setInviteEmail(e.target.value)} 
                            placeholder="usuario@ejemplo.com" 
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" 
                        />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cerrar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg">Enviar Invitación</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProjectsWorkspace;
