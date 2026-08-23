import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Project, Todo, Sprint, Milestone, ProjectDoc, ProjectDocFolder, 
  ProjectInboxItem, ProjectChatMessage, ProjectActivity, ProjectInvitation,
  ProjectRisk, ProjectExpense, ProjectTimeLog
} from '../types';
import { 
  Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, 
  AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, 
  MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, 
  Layers, ArrowRight, Users, MessageSquare, Search, FolderPlus, Folder, 
  FolderOpen, Download, Send, Paperclip, Pin, ExternalLink, Shield, 
  FileSpreadsheet, FileCode, FileImage, FileArchive, File as FileIcon, Share2, 
  AlertTriangle, RefreshCw, Flag, Filter, DollarSign, PieChart, ShieldAlert, 
  UserPlus, Mail, ChevronDown, CheckCircle, ChevronRight, Briefcase, Grid, List,
  TrendingUp, Award, UserCheck, Flame, Zap
} from 'lucide-react';
import { ProjectChannels } from './ProjectChannels';

interface ProjectsWorkspaceProps {
    projects: Project[];
    allTodos: Todo[];
    activeProjectId: number | null;
    invitations?: ProjectInvitation[];
    currentUserEmail?: string;
    onSelectProject: (id: number | null) => void;
    onAddProject: (name: string, emoji: string | null, color: string | null, extraData?: Partial<Project>) => Promise<Project | null>;
    onUpdateProject: (id: number, updates: Partial<Project>) => Promise<void>;
    onDeleteProject: (id: number) => Promise<void>;
    onArchiveProject: (id: number, isArchived: boolean) => Promise<void>;
    onSendInvitation?: (project: Project, inviteeEmail: string) => Promise<void>;
    onAcceptInvitation?: (invitationId: string) => Promise<void>;
    onDeclineInvitation?: (invitationId: string) => Promise<void>;
    addTodo: (text: string, options?: any) => Promise<void>;
    updateTodo: (id: number, updates: Partial<Todo>) => void;
    deleteTodo: (id: number) => void;
    onEditTodo?: (todo: Todo) => void;
    onOpenProjectEditor?: (project: Project) => void;
}

class ProjectsErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error capturado en ProjectsWorkspace:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center flex flex-col items-center justify-center h-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl m-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-3 animate-bounce" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Centro de Proyectos Recuperado</h2>
          <p className="text-xs text-gray-500 max-w-md mb-4 bg-gray-50 dark:bg-black p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-left font-mono text-[11px]">
            {this.state.error?.message || 'Se produjo una inconsistencia de datos temporal.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Volver a la Lista de Proyectos
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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

// Default Preset Contacts for Instant Search Suggestions
const PRESET_CONTACTS = [
    { name: 'René González', email: 'rene.05gonzalez@gmail.com', role: 'Administrador' },
    { name: 'Equipo de Desarrollo', email: 'desarrollo@empresa.com', role: 'Dev Team' },
    { name: 'Diseño UX/UI', email: 'diseno@estudio.com', role: 'Diseño' },
    { name: 'QA & Testing', email: 'qa@testing.com', role: 'Tester' },
    { name: 'Product Manager', email: 'pm@gestion.com', role: 'Líder' },
    { name: 'Soporte Cliente', email: 'soporte@empresa.com', role: 'Soporte' }
];

const ProjectsWorkspaceInner: React.FC<ProjectsWorkspaceProps> = ({
    projects = [],
    allTodos = [],
    activeProjectId,
    invitations = [],
    currentUserEmail,
    onSelectProject,
    onAddProject,
    onUpdateProject,
    onDeleteProject,
    onArchiveProject,
    onSendInvitation,
    onAcceptInvitation,
    onDeclineInvitation,
    addTodo,
    updateTodo,
    deleteTodo,
    onEditTodo,
    onOpenProjectEditor
}) => {
    // Ensure safe array references
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeTodos = Array.isArray(allTodos) ? allTodos : [];
    const safeInvitations = Array.isArray(invitations) ? invitations : [];

    // Navigation view state: true = All Projects Dashboard Grid, false = Inside Active Project
    const [showingAllProjects, setShowingAllProjects] = useState<boolean>(activeProjectId === null);
    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'risks' | 'budget' | 'time' | 'docs' | 'chat' | 'inbox' | 'team' | 'activity' | 'channels'>('overview');
    
    // Project Search & Filter on Grid
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

    // Create Project Modal State
    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

    // Modal States
    const [riskModal, setRiskModal] = useState<{ isOpen: boolean, risk: ProjectRisk | null }>({ isOpen: false, risk: null });
    const [expenseModal, setExpenseModal] = useState(false);
    const [timeLogModal, setTimeLogModal] = useState(false);
    
    // Team Search & Invitation States
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null);
    const [inviteLoadingEmail, setInviteLoadingEmail] = useState<string | null>(null);

    // Get Active Project
    const activeProject = useMemo(() => {
        if (activeProjectId) {
            const found = safeProjects.find(p => p && p.id === activeProjectId);
            if (found) return found;
        }
        const activeList = safeProjects.filter(p => p && !p.is_archived);
        return activeList.length > 0 ? activeList[0] : (safeProjects.length > 0 ? safeProjects[0] : null);
    }, [safeProjects, activeProjectId]);

    useEffect(() => {
        if (!activeProjectId && activeProject && !showingAllProjects) {
            onSelectProject(activeProject.id);
        }
    }, [activeProjectId, activeProject, showingAllProjects, onSelectProject]);

    const projectTodos = useMemo(() => {
        return activeProject ? safeTodos.filter(t => t && t.project_id === activeProject.id) : [];
    }, [safeTodos, activeProject]);

    // Derived User Search Suggestions for Team Invitations
    const matchingSearchUsers = useMemo(() => {
        const query = userSearchQuery.trim().toLowerCase();
        if (!query) return PRESET_CONTACTS;

        const knownEmails = new Set<string>();
        const results: { name: string; email: string; role?: string }[] = [];

        // 1. Add preset contacts matching query
        PRESET_CONTACTS.forEach(c => {
            if (c.email.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)) {
                results.push(c);
                knownEmails.add(c.email.toLowerCase());
            }
        });

        // 2. Add existing project members from all user projects
        safeProjects.forEach(p => {
            if (!p) return;
            const members = Array.isArray(p.members) ? p.members : [];
            members.forEach(m => {
                if (m && m.email && (m.email.toLowerCase().includes(query) || (m.name || '').toLowerCase().includes(query))) {
                    if (!knownEmails.has(m.email.toLowerCase())) {
                        results.push({ name: m.name || m.email.split('@')[0], email: m.email, role: 'Colaborador' });
                        knownEmails.add(m.email.toLowerCase());
                    }
                }
            });
        });

        // 3. Add existing invitations
        safeInvitations.forEach(inv => {
            if (!inv) return;
            const email = inv.receiver_email || inv.invitee_email;
            if (email && email.toLowerCase().includes(query) && !knownEmails.has(email.toLowerCase())) {
                results.push({ name: email.split('@')[0], email: email, role: 'Invitado' });
                knownEmails.add(email.toLowerCase());
            }
        });

        // 4. If query looks like a valid email and not in list, add explicit typed option
        if (query.includes('@') && !knownEmails.has(query)) {
            results.unshift({
                name: `Invitar a "${query}"`,
                email: query,
                role: 'Nuevo Correo'
            });
        }

        return results;
    }, [userSearchQuery, safeProjects, safeInvitations]);

    // Helper: Send Invitation to user
    const handleSendInviteToEmail = async (email: string) => {
        if (!activeProject || !email.trim()) return;
        setInviteLoadingEmail(email);
        setInviteSuccessMessage(null);
        try {
            if (onSendInvitation) {
                await onSendInvitation(activeProject, email.trim());
                setInviteSuccessMessage(`¡Invitación enviada con éxito a ${email.trim()}!`);
            }
        } catch (err) {
            console.error('Error enviando invitación:', err);
        } finally {
            setInviteLoadingEmail(null);
        }
    };

    // ==========================================
    // RENDER 1: ALL PROJECTS DASHBOARD (GRID VIEW)
    // ==========================================
    const renderAllProjectsDashboard = () => {
        const filteredProjects = safeProjects.filter(p => {
            if (!p) return false;
            const matchesSearch = (p.name || '').toLowerCase().includes(projectSearchQuery.toLowerCase()) || 
                                  (p.description || '').toLowerCase().includes(projectSearchQuery.toLowerCase());
            if (projectStatusFilter === 'archived') return matchesSearch && p.is_archived;
            return matchesSearch && !p.is_archived;
        });

        return (
            <div className="p-6 max-w-7xl mx-auto w-full h-full overflow-y-auto space-y-6 pb-24">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 rounded-2xl text-white shadow-xl">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-6 h-6" />
                            <h1 className="text-2xl font-black tracking-tight">Centro de Proyectos y Equipos</h1>
                        </div>
                        <p className="text-sm text-blue-100 max-w-xl">
                            Crea proyectos, gestiona sprints, invita miembros con búsqueda de correo en tiempo real y controla riesgos y presupuestos.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsCreateProjectModalOpen(true)} 
                        className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Crear Nuevo Proyecto
                    </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111] p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input 
                            type="text" 
                            value={projectSearchQuery} 
                            onChange={e => setProjectSearchQuery(e.target.value)} 
                            placeholder="Buscar por nombre de proyecto o descripción..." 
                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setProjectStatusFilter('active')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${projectStatusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                        >
                            Activos ({safeProjects.filter(p => p && !p.is_archived).length})
                        </button>
                        <button 
                            onClick={() => setProjectStatusFilter('archived')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${projectStatusFilter === 'archived' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                        >
                            Archivados ({safeProjects.filter(p => p && p.is_archived).length})
                        </button>
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* New Project Card Trigger */}
                    <div 
                        onClick={() => setIsCreateProjectModalOpen(true)}
                        className="p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 bg-white/50 dark:bg-[#111]/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px] group"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Crear Nuevo Proyecto</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs">Configura un tablero desde cero o usando plantillas ágiles de trabajo.</p>
                    </div>

                    {filteredProjects.map(proj => {
                        if (!proj) return null;
                        const projTasks = safeTodos.filter(t => t && t.project_id === proj.id);
                        const completedCount = projTasks.filter(t => t.completed).length;
                        const progressPct = projTasks.length > 0 ? Math.round((completedCount / projTasks.length) * 100) : 0;
                        const members = Array.isArray(proj.members) ? proj.members : [];

                        return (
                            <div 
                                key={proj.id}
                                className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
                            >
                                {/* Color Banner Top */}
                                <div className="h-2 w-full" style={{ backgroundColor: proj.color || '#3B82F6' }} />

                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{proj.emoji || '📁'}</span>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">{proj.name}</h3>
                                                    {proj.category && <span className="text-[10px] text-gray-400 font-medium">{proj.category}</span>}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                                proj.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                                proj.priority === 'low' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {proj.priority === 'high' ? 'Alta' : proj.priority === 'low' ? 'Baja' : 'Media'}
                                            </span>
                                        </div>

                                        {proj.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{proj.description}</p>
                                        )}
                                    </div>

                                    {/* Task Progress Bar */}
                                    <div className="space-y-1.5 pt-2">
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>Progreso de Tareas</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{progressPct}% ({completedCount}/{projTasks.length})</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                                        </div>
                                    </div>

                                    {/* Footer Info & Entrar Button */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
                                        <div className="flex items-center -space-x-2">
                                            {members.slice(0, 3).map((m, idx) => (
                                                <div key={idx} className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white dark:border-[#111]" title={m?.name || m?.email || 'Miembro'}>
                                                    {(m?.name || m?.email || 'M').charAt(0).toUpperCase()}
                                                </div>
                                            ))}
                                            {members.length > 3 && (
                                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-[9px] flex items-center justify-center border-2 border-white dark:border-[#111]">
                                                    +{members.length - 3}
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => {
                                                onSelectProject(proj.id);
                                                setShowingAllProjects(false);
                                            }}
                                            className="px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            Entrar al Proyecto <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDER 2: INSIDE ACTIVE PROJECT HEADER & TABS
    // ==========================================
    const renderProjectHeader = () => {
        if (!activeProject) return null;

        return (
            <div className="px-6 py-4 bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Back Button & Project Selector Dropdown */}
                    <div className="flex items-center gap-3 relative">
                        <button 
                            onClick={() => setShowingAllProjects(true)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Volver a la lista de todos los proyectos"
                        >
                            <ArrowLeft className="w-4 h-4" /> Proyectos
                        </button>

                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />

                        <div className="relative">
                            <button 
                                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                            >
                                <span className="text-2xl">{activeProject.emoji || '📁'}</span>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h1 className="text-base font-bold text-gray-900 dark:text-white">{activeProject.name}</h1>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">Cambiar de Proyecto</span>
                                </div>
                            </button>

                            {/* Project Switcher Dropdown */}
                            {projectDropdownOpen && (
                                <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-[900] overflow-hidden p-2 space-y-1">
                                    <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tus Proyectos</div>
                                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                                        {safeProjects.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => {
                                                    onSelectProject(p.id);
                                                    setProjectDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${p.id === activeProject.id ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <span>{p.emoji || '📁'}</span>
                                                    <span className="truncate">{p.name}</span>
                                                </span>
                                                {p.id === activeProject.id && <Check className="w-3.5 h-3.5 shrink-0 text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1">
                                        <button 
                                            onClick={() => {
                                                setProjectDropdownOpen(false);
                                                setIsCreateProjectModalOpen(true);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Crear Nuevo Proyecto
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setProjectDropdownOpen(false);
                                                setShowingAllProjects(true);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                                        >
                                            <Grid className="w-3.5 h-3.5" /> Ver Todos los Proyectos
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Invitar Equipo
                        </button>
                        <button 
                            onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)} 
                            className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                        >
                            <Settings className="w-3.5 h-3.5" /> Ajustes
                        </button>
                    </div>
                </div>

                {/* Sub-Header Navigation Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { id: 'overview', label: 'Resumen', icon: Activity },
                        { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                        { id: 'channels', label: 'Canales', icon: MessageSquare },
                        { id: 'risks', label: 'Matriz Riesgos', icon: ShieldAlert, badge: activeProject.risks?.length },
                        { id: 'budget', label: 'Presupuesto', icon: DollarSign },
                        { id: 'time', label: 'Registro Horas', icon: Clock, badge: activeProject.time_logs?.length },
                        { id: 'team', label: 'Equipo', icon: Users, badge: (activeProject.members?.length || 1) },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap relative ${
                                activeTab === tab.id 
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                            {!!tab.badge && (
                                <span className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded-full ${
                                    activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDER 3: TEAM SECTION WITH EMAIL SEARCH & INVITE
    // ==========================================
    const renderTeam = () => {
        if (!activeProject) return null;
        const members = Array.isArray(activeProject.members) ? activeProject.members : [];
        const activeProjectInvitations = safeInvitations.filter(i => i && i.project_id === activeProject.id);

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Miembros y Colaboradores
                        </h2>
                        <p className="text-xs text-gray-500">Busca por correo electrónico para invitar colaboradores en tiempo real.</p>
                    </div>
                    <button 
                        onClick={() => setIsInviteModalOpen(true)} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all shrink-0"
                    >
                        <UserPlus className="w-4 h-4" /> Buscar e Invitar por Correo
                    </button>
                </div>

                {/* Live Search Input Inline Card */}
                <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                        Búsqueda de Usuarios e Invitación Directa
                    </label>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="email" 
                            value={userSearchQuery} 
                            onChange={e => setUserSearchQuery(e.target.value)} 
                            placeholder="Escribe el correo electrónico (ej. rene.05gonzalez@gmail.com)..." 
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Results Auto-Suggest List */}
                    <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Coincidencias encontradas:</span>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-black/40">
                            {matchingSearchUsers.map((u, idx) => {
                                const cleanEmail = u.email.toLowerCase();
                                const isMember = members.some(m => m && (m.email || '').toLowerCase() === cleanEmail);
                                const isPendingInvite = activeProjectInvitations.some(i => i && (i.receiver_email || i.invitee_email || '').toLowerCase() === cleanEmail && i.status === 'pending');

                                return (
                                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-white dark:hover:bg-[#161616] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                                {u.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white">{u.name}</h4>
                                                <span className="text-[11px] text-gray-500">{u.email}</span>
                                            </div>
                                        </div>

                                        <div>
                                            {isMember ? (
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Miembro
                                                </span>
                                            ) : isPendingInvite ? (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Pendiente
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleSendInviteToEmail(u.email)}
                                                    disabled={inviteLoadingEmail === u.email}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                                                >
                                                    <Mail className="w-3 h-3" /> {inviteLoadingEmail === u.email ? 'Enviando...' : 'Invitar'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-[#161616] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">Lista de Miembros Oficiales ({members.length || 1})</span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {members.map((m, idx) => (
                            <div key={m?.id || idx} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                        {(m?.name || m?.email || 'M').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">{m?.name || 'Miembro del Equipo'}</h4>
                                        <span className="text-[11px] text-gray-400">{m?.email || 'correo@ejemplo.com'}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    {m?.role === 'owner' ? 'Propietario' : m?.role === 'lead' ? 'Líder' : 'Colaborador'}
                                </span>
                            </div>
                        ))}
                        {members.length === 0 && (
                            <div className="p-4 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">Tú (Propietario del Proyecto)</span>
                                <span className="text-[10px] px-2.5 py-1 rounded font-bold uppercase bg-blue-50 text-blue-700">Propietario</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Incoming Received Invitations for Current User */}
                {currentUserEmail && safeInvitations.some(i => i && (i.receiver_email || i.invitee_email || '').toLowerCase() === currentUserEmail.toLowerCase() && i.status === 'pending') && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-3">
                        <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Invitaciones Recibidas Para Ti
                        </h3>
                        <div className="space-y-2">
                            {safeInvitations.filter(i => i && (i.receiver_email || i.invitee_email || '').toLowerCase() === currentUserEmail.toLowerCase() && i.status === 'pending').map(inv => (
                                <div key={inv.id} className="bg-white dark:bg-[#111] p-3 rounded-lg border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{inv.project_emoji || '📁'}</span>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">{inv.project_name}</h4>
                                            <p className="text-[10px] text-gray-500">Invitado por: {inv.inviter_email || inv.sender_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => onAcceptInvitation && onAcceptInvitation(inv.id)}
                                            className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700"
                                        >
                                            Aceptar
                                        </button>
                                        <button 
                                            onClick={() => onDeclineInvitation && onDeclineInvitation(inv.id)}
                                            className="px-3 py-1 bg-gray-200 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-300"
                                        >
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ==========================================
    // RENDER 4: NEW TAB - RISK MATRIX (`risks`)
    // ==========================================
    const renderRisks = () => {
        if (!activeProject) return null;
        const risks = Array.isArray(activeProject.risks) ? activeProject.risks : [];

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-amber-500" /> Matriz de Riesgos del Proyecto
                        </h2>
                        <p className="text-xs text-gray-500">Identifica, clasifica por impacto/probabilidad y crea planes de mitigación.</p>
                    </div>
                    <button 
                        onClick={() => setRiskModal({ isOpen: true, risk: null })}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Registrar Riesgo
                    </button>
                </div>

                {/* 3x3 Impact vs Probability Matrix */}
                <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">Matriz 3x3 de Impacto vs Probabilidad</h3>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                        <div className="p-2 text-gray-400">Impacto / Prob.</div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">Baja</div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">Media</div>
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">Alta</div>

                        {/* Alto Impacto */}
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">Alto</div>
                        <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-300 font-extrabold">
                            {risks.filter(r => r && r.impact === 'high' && r.probability === 'low').length} Riesgos
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 rounded-lg border border-orange-400 font-extrabold">
                            {risks.filter(r => r && r.impact === 'high' && r.probability === 'medium').length} Riesgos
                        </div>
                        <div className="p-3 bg-red-200 dark:bg-red-950/80 text-red-900 dark:text-red-200 rounded-lg border border-red-500 font-extrabold">
                            {risks.filter(r => r && r.impact === 'high' && r.probability === 'high').length} Críticos
                        </div>

                        {/* Medio Impacto */}
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">Medio</div>
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-300 font-extrabold">
                            {risks.filter(r => r && r.impact === 'medium' && r.probability === 'low').length} Riesgos
                        </div>
                        <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-300 font-extrabold">
                            {risks.filter(r => r && r.impact === 'medium' && r.probability === 'medium').length} Riesgos
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 rounded-lg border border-orange-400 font-extrabold">
                            {risks.filter(r => r && r.impact === 'medium' && r.probability === 'high').length} Riesgos
                        </div>

                        {/* Bajo Impacto */}
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">Bajo</div>
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-300 font-extrabold">
                            {risks.filter(r => r && r.impact === 'low' && r.probability === 'low').length} Riesgos
                        </div>
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-300 font-extrabold">
                            {risks.filter(r => r && r.impact === 'low' && r.probability === 'medium').length} Riesgos
                        </div>
                        <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-300 font-extrabold">
                            {risks.filter(r => r && r.impact === 'low' && r.probability === 'high').length} Riesgos
                        </div>
                    </div>
                </div>

                {/* Risks Table */}
                <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-[#161616] text-gray-500 border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-[10px]">
                            <tr>
                                <th className="p-3">Riesgo</th>
                                <th className="p-3">Impacto</th>
                                <th className="p-3">Probabilidad</th>
                                <th className="p-3">Plan Mitigación</th>
                                <th className="p-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {risks.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-black/30">
                                    <td className="p-3 font-bold text-gray-900 dark:text-white">{r.title}</td>
                                    <td className="p-3 capitalize">{r.impact}</td>
                                    <td className="p-3 capitalize">{r.probability}</td>
                                    <td className="p-3 text-gray-500">{r.mitigation_plan || 'Sin plan especificado'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            r.status === 'mitigated' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {risks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">No hay riesgos registrados en este proyecto.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDER 5: NEW TAB - BUDGET & EXPENSES (`budget`)
    // ==========================================
    const renderBudget = () => {
        if (!activeProject) return null;
        const budget = activeProject.budget || 0;
        const expenses = Array.isArray(activeProject.expenses) ? activeProject.expenses : [];
        const totalExpenses = expenses.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
        const remaining = budget - totalExpenses;
        const spentPct = budget > 0 ? Math.min(Math.round((totalExpenses / budget) * 100), 100) : 0;

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" /> Presupuesto y Control de Gastos
                        </h2>
                        <p className="text-xs text-gray-500">Monitorea el presupuesto asignado vs gastos reales en ejecuciones.</p>
                    </div>
                    <button 
                        onClick={() => setExpenseModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Registrar Gasto
                    </button>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presupuesto Total</span>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">${budget.toLocaleString()} USD</h3>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gastos Ejecutados</span>
                        <h3 className="text-2xl font-black text-red-600">${totalExpenses.toLocaleString()} USD</h3>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo Restante</span>
                        <h3 className={`text-2xl font-black ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${remaining.toLocaleString()} USD</h3>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                        <span>Consumo de Presupuesto</span>
                        <span className={spentPct > 90 ? 'text-red-600' : 'text-blue-600'}>{spentPct}% ejecutado</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all ${spentPct > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${spentPct}%` }}
                        />
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-[#161616] text-gray-500 border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-[10px]">
                            <tr>
                                <th className="p-3">Concepto</th>
                                <th className="p-3">Categoría</th>
                                <th className="p-3">Monto</th>
                                <th className="p-3">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {expenses.map(exp => (
                                <tr key={exp.id}>
                                    <td className="p-3 font-bold text-gray-900 dark:text-white">{exp.title}</td>
                                    <td className="p-3 text-gray-500">{exp.category}</td>
                                    <td className="p-3 font-bold text-red-600">${(exp.amount || 0).toLocaleString()} USD</td>
                                    <td className="p-3 text-gray-400">{exp.date}</td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">No se han registrado gastos en este proyecto.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDER 6: NEW TAB - TIME TRACKING (`time`)
    // ==========================================
    const renderTimeLogs = () => {
        if (!activeProject) return null;
        const timeLogs = Array.isArray(activeProject.time_logs) ? activeProject.time_logs : [];
        const totalHours = timeLogs.reduce((acc, curr) => acc + (curr?.hours || 0), 0);

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" /> Registro de Horas e Inversión
                        </h2>
                        <p className="text-xs text-gray-500">Mide el tiempo dedicado por el equipo en cada tarea o entrega.</p>
                    </div>
                    <button 
                        onClick={() => setTimeLogModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Registrar Horas
                    </button>
                </div>

                <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Horas Invertidas</span>
                        <h3 className="text-3xl font-black text-indigo-600">{totalHours} Horas</h3>
                    </div>
                    <Clock className="w-10 h-10 text-indigo-200 dark:text-indigo-900" />
                </div>

                {/* Time Logs Table */}
                <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-[#161616] text-gray-500 border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-[10px]">
                            <tr>
                                <th className="p-3">Colaborador</th>
                                <th className="p-3">Horas</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {timeLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="p-3 font-bold text-gray-900 dark:text-white">{log.member_email}</td>
                                    <td className="p-3 font-extrabold text-indigo-600">{log.hours} hrs</td>
                                    <td className="p-3 text-gray-500">{log.description}</td>
                                    <td className="p-3 text-gray-400">{log.date}</td>
                                </tr>
                            ))}
                            {timeLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">No hay registros de tiempo en este proyecto.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderOverview = () => (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resumen Ejecutivo de {activeProject?.name || 'Proyecto'}</h2>
            <p className="text-xs text-gray-500">{activeProject?.description || 'Sin descripción detallada registrada.'}</p>
        </div>
    );

    const renderKanban = () => (
        <div className="p-6 max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tablero de Tareas</h2>
                <button onClick={() => addTodo && addTodo("Nueva tarea de proyecto", { project_id: activeProject?.id })} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg">+ Agregar Tarea</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Por Hacer', 'En Proceso', 'Completado'].map((col, idx) => (
                    <div key={idx} className="bg-gray-100 dark:bg-[#111] p-3 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">{col}</h4>
                        <div className="space-y-2">
                            {projectTodos.filter(t => idx === 2 ? t.completed : !t.completed).map(t => (
                                <div key={t.id} className="bg-white dark:bg-black p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold flex items-center justify-between">
                                    <span>{t.text}</span>
                                    <button onClick={() => updateTodo && updateTodo(t.id, { completed: !t.completed })} className="text-blue-600">
                                        {t.completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full bg-gray-50/30 dark:bg-[#050505] overflow-hidden font-sans">
            {showingAllProjects ? (
                renderAllProjectsDashboard()
            ) : !activeProject ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full space-y-3">
                    <Briefcase className="w-10 h-10 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No hay ningún proyecto activo seleccionado</p>
                    <button 
                        onClick={() => setShowingAllProjects(true)}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700"
                    >
                        Ver Centro de Proyectos
                    </button>
                </div>
            ) : (
                <>
                    {renderProjectHeader()}
                    <div className="flex-1 overflow-hidden relative">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'kanban' && renderKanban()}
                        {activeTab === 'channels' && (
                            <div className="p-4 h-full w-full overflow-hidden">
                                <ProjectChannels 
                                    project={activeProject}
                                    currentUserEmail={currentUserEmail || ''}
                                    onUpdateProject={onUpdateProject}
                                />
                            </div>
                        )}
                        {activeTab === 'risks' && renderRisks()}
                        {activeTab === 'budget' && renderBudget()}
                        {activeTab === 'time' && renderTimeLogs()}
                        {activeTab === 'team' && renderTeam()}
                    </div>
                </>
            )}

            {/* CREATE PROJECT MODAL */}
            <Modal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} title="Crear Nuevo Proyecto">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const emoji = formData.get('emoji') as string || '📁';
                    const category = formData.get('category') as string;
                    const priority = formData.get('priority') as any;
                    const budgetVal = parseFloat(formData.get('budget') as string) || 0;
                    const description = formData.get('description') as string;

                    const newProj = await onAddProject(name, emoji, '#3B82F6', {
                        category,
                        priority,
                        budget: budgetVal,
                        description,
                        status: 'active'
                    });

                    if (newProj) {
                        onSelectProject(newProj.id);
                        setShowingAllProjects(false);
                    }
                    setIsCreateProjectModalOpen(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Proyecto</label>
                        <input name="name" required placeholder="Rediseño Plataforma Web 2.0" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Emoji / Icono</label>
                            <input name="emoji" defaultValue="📁" placeholder="📁" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white text-center" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                            <select name="category" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white">
                                <option value="Desarrollo">Desarrollo de Software</option>
                                <option value="Marketing">Marketing & Ventas</option>
                                <option value="Diseño">Diseño UX/UI</option>
                                <option value="Operaciones">Operaciones</option>
                                <option value="Personal">Personal</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
                            <select name="priority" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white">
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="low">Baja</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Presupuesto ($ USD)</label>
                            <input name="budget" type="number" defaultValue="5000" placeholder="5000" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción / Objetivos</label>
                        <textarea name="description" rows={3} placeholder="Breve resumen del objetivo de este proyecto..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsCreateProjectModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg shadow-sm">Crear Proyecto</button>
                    </div>
                </form>
            </Modal>

            {/* TEAM INVITE MODAL */}
            <Modal isOpen={isInviteModalOpen} onClose={() => { setIsInviteModalOpen(false); setUserSearchQuery(''); setInviteSuccessMessage(null); }} title="Invitar Miembro por Correo">
                <div className="space-y-4">
                    {inviteSuccessMessage && (
                        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-xl font-semibold">
                            {inviteSuccessMessage}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Buscar o Escribir Correo</label>
                        <input 
                            type="email" 
                            value={userSearchQuery} 
                            onChange={e => setUserSearchQuery(e.target.value)} 
                            placeholder="rene.05gonzalez@gmail.com" 
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white" 
                        />
                    </div>

                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Coincidencias Rápidas:</span>
                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl">
                            {matchingSearchUsers.map((u, i) => (
                                <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">{u.name}</div>
                                        <div className="text-[10px] text-gray-400">{u.email}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleSendInviteToEmail(u.email)}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                                    >
                                        Invitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* REGISTER RISK MODAL */}
            <Modal isOpen={riskModal.isOpen} onClose={() => setRiskModal({ isOpen: false, risk: null })} title="Registrar Riesgo">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const probability = formData.get('probability') as any;
                    const impact = formData.get('impact') as any;
                    const mitigation_plan = formData.get('mitigation_plan') as string;

                    const newRisk: ProjectRisk = {
                        id: crypto.randomUUID(),
                        project_id: activeProject.id,
                        title,
                        probability,
                        impact,
                        mitigation_plan,
                        status: 'open',
                        created_at: new Date().toISOString()
                    };

                    onUpdateProject(activeProject.id, { risks: [newRisk, ...(Array.isArray(activeProject.risks) ? activeProject.risks : [])] });
                    setRiskModal({ isOpen: false, risk: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Título del Riesgo</label>
                        <input name="title" required placeholder="Falta de capacidad en servidor de base de datos..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Probabilidad</label>
                            <select name="probability" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs">
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Impacto</label>
                            <select name="impact" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs">
                                <option value="low">Bajo</option>
                                <option value="medium">Medio</option>
                                <option value="high">Alto</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Plan de Mitigación</label>
                        <textarea name="mitigation_plan" rows={3} placeholder="Acciones preventivas para minimizar el impacto..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200">
                        <button type="button" onClick={() => setRiskModal({ isOpen: false, risk: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-amber-500 text-white font-bold rounded-lg">Guardar Riesgo</button>
                    </div>
                </form>
            </Modal>

            {/* REGISTER EXPENSE MODAL */}
            <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)} title="Registrar Gasto de Proyecto">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const amount = parseFloat(formData.get('amount') as string) || 0;
                    const category = formData.get('category') as any;
                    const date = formData.get('date') as string;

                    const newExpense: ProjectExpense = {
                        id: crypto.randomUUID(),
                        project_id: activeProject.id,
                        title,
                        amount,
                        category,
                        date: date || new Date().toISOString().split('T')[0],
                        created_at: new Date().toISOString()
                    };

                    onUpdateProject(activeProject.id, { expenses: [newExpense, ...(Array.isArray(activeProject.expenses) ? activeProject.expenses : [])] });
                    setExpenseModal(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Concepto del Gasto</label>
                        <input name="title" required placeholder="Licencia mensual de servidor GCP / Vercel" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Monto ($ USD)</label>
                            <input name="amount" type="number" required defaultValue="150" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                            <select name="category" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs">
                                <option value="Software / Subscriptions">Software / Licencias</option>
                                <option value="Hardware">Hardware / Infraestructura</option>
                                <option value="Personnel / Freelance">Personal / Freelance</option>
                                <option value="Design">Diseño</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Other">Otro</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200">
                        <button type="button" onClick={() => setExpenseModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 text-white font-bold rounded-lg">Guardar Gasto</button>
                    </div>
                </form>
            </Modal>

            {/* LOG TIME MODAL */}
            <Modal isOpen={timeLogModal} onClose={() => setTimeLogModal(false)} title="Registrar Horas de Trabajo">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const member_email = formData.get('member_email') as string;
                    const hours = parseFloat(formData.get('hours') as string) || 0;
                    const description = formData.get('description') as string;
                    const date = formData.get('date') as string;

                    const newLog: ProjectTimeLog = {
                        id: crypto.randomUUID(),
                        project_id: activeProject.id,
                        member_email: member_email || currentUserEmail || 'desarrollador@empresa.com',
                        hours,
                        description,
                        date: date || new Date().toISOString().split('T')[0],
                        created_at: new Date().toISOString()
                    };

                    onUpdateProject(activeProject.id, { time_logs: [newLog, ...(Array.isArray(activeProject.time_logs) ? activeProject.time_logs : [])] });
                    setTimeLogModal(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Correo del Colaborador</label>
                        <input name="member_email" defaultValue={currentUserEmail || ''} placeholder="usuario@ejemplo.com" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Horas Trabajos</label>
                            <input name="hours" type="number" step="0.5" required defaultValue="2.5" className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                            <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción de las tareas realizadas</label>
                        <textarea name="description" rows={3} required placeholder="Desarrollo de módulos e integración de API..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 rounded-lg px-3 py-2 text-xs" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200">
                        <button type="button" onClick={() => setTimeLogModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-indigo-600 text-white font-bold rounded-lg">Guardar Registro</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = (props) => {
    return (
        <ProjectsErrorBoundary onReset={() => props.onSelectProject && props.onSelectProject(null)}>
            <ProjectsWorkspaceInner {...props} />
        </ProjectsErrorBoundary>
    );
};

export default ProjectsWorkspace;
