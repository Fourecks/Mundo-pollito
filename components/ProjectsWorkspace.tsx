import React, { useState, useMemo, useEffect } from 'react';
import { Project, Todo, Priority, Sprint, Milestone, ProjectDoc, ProjectInboxItem, ProjectActivity, ProjectMember, TaskComment, TaskAttachment } from '../types';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  FileText, 
  Paperclip, 
  Inbox, 
  Activity, 
  Users, 
  Target, 
  Zap, 
  BarChart3, 
  Play, 
  CheckSquare, 
  ChevronRight, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Archive, 
  Copy, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  ExternalLink,
  Flag,
  UserCheck,
  TrendingUp,
  Tag,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Code,
  Quote,
  X,
  Check
} from 'lucide-react';

interface ProjectsWorkspaceProps {
  projects: Project[];
  allTodos: Todo[];
  activeProjectId?: number | null;
  onSelectProject: (projectId: number) => void;
  onAddProject: (name: string, emoji: string | null, color: string | null, templateType?: string) => Promise<Project | null>;
  onUpdateProject: (projectId: number, updates: Partial<Project>) => Promise<void>;
  onDeleteProject: (projectId: number) => Promise<void>;
  onArchiveProject: (projectId: number, isArchived: boolean) => Promise<void>;
  addTodo: (text: string, options?: { projectId?: number | null; isUndated?: boolean; kanbanColumn?: string; sprintId?: string }) => Promise<void>;
  updateTodo: (todo: Todo) => void;
  deleteTodo: (id: number) => void;
  onEditTodo: (todo: Todo) => void;
  onOpenProjectEditor?: (project: Project) => void;
}

export const PROJECT_TEMPLATES = [
  {
    id: 'software',
    name: 'Software Development',
    icon: '💻',
    description: 'Backlog, Development, Code Review, Testing, Done. Incluye plantillas iniciales de Requisitos y Arquitectura.',
    columns: ['Backlog', 'Development', 'Code Review', 'Testing', 'Done'],
    initialDocs: [
      { title: 'Requisitos del Sistema', category: 'Requirements', content: '# Requisitos del Sistema\n\nDefinición de alcance, características principales y arquitectura técnica.' },
      { title: 'Notas de Arquitectura', category: 'Architecture', content: '# Arquitectura del Proyecto\n\nDiagramas de flujo, base de datos y endpoints de API.' }
    ]
  },
  {
    id: 'university',
    name: 'University Project',
    icon: '🎓',
    description: 'Research, Pending, Doing, Review, Delivered. Ideal para trabajos académicos e investigación.',
    columns: ['Research', 'Pending', 'Doing', 'Review', 'Delivered'],
    initialDocs: [
      { title: 'Borrador de Investigación', category: 'Research', content: '# Investigación y Fuentes\n\nRegistro de bibliografía, referencias y resúmenes.' }
    ]
  },
  {
    id: 'business',
    name: 'Business Launch',
    icon: '🚀',
    description: 'Idea, Planning, Development, Launch, Growth. Para lanzamientos de startups y negocios.',
    columns: ['Idea', 'Planning', 'Development', 'Launch', 'Growth'],
    initialDocs: [
      { title: 'Plan de Negocio & MVP', category: 'Specifications', content: '# Propuesta de Valor\n\nDefinición del cliente objetivo y estrategia de mercado.' }
    ]
  },
  {
    id: 'blank',
    name: 'Proyecto Personalizado',
    icon: '⚡',
    description: 'Proyecto desde cero con columnas estándar.',
    columns: ['Por hacer', 'En progreso', 'Completado'],
    initialDocs: []
  }
];

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
  // Current active project selection
  const currentProject = useMemo(() => {
    if (activeProjectId) {
      return projects.find(p => p.id === activeProjectId) || projects[0] || null;
    }
    return projects[0] || null;
  }, [projects, activeProjectId]);

  // Tab State
  type TabType = 'overview' | 'board' | 'sprints' | 'timeline' | 'milestones' | 'docs' | 'files' | 'inbox' | 'activity' | 'team';
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEmoji, setNewProjectEmoji] = useState('🚀');
  const [newProjectTemplate, setNewProjectTemplate] = useState('software');

  // Sprint Modal
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');

  // Finish Sprint Modal
  const [isFinishSprintOpen, setIsFinishSprintOpen] = useState(false);
  const [sprintToFinish, setSprintToFinish] = useState<Sprint | null>(null);

  // Milestone Modal
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneDesc, setMilestoneDesc] = useState('');

  // Doc Editor State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<ProjectDoc | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<ProjectDoc['category']>('Specifications');
  const [docContent, setDocContent] = useState('');

  // Inbox quick capture
  const [inboxText, setInboxText] = useState('');

  // Project Todos derived
  const projectTodos = useMemo(() => {
    if (!currentProject) return [];
    return allTodos.filter(t => t.project_id === currentProject.id);
  }, [allTodos, currentProject]);

  // Project Metrics
  const metrics = useMemo(() => {
    const total = projectTodos.length;
    const completed = projectTodos.filter(t => t.completed).length;
    const pending = total - completed;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = projectTodos.filter(t => !t.completed && t.due_date && t.due_date < todayStr).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Blocked tasks
    const blockedTasks = projectTodos.filter(t => {
      if (!t.dependencies || t.dependencies.length === 0) return false;
      // Check if any dependency is incomplete
      return t.dependencies.some(depId => {
        const depTask = allTodos.find(item => item.id === depId);
        return depTask && !depTask.completed;
      });
    });

    return { total, completed, pending, overdue, progress, blockedTasks };
  }, [projectTodos, allTodos]);

  // Active Sprint
  const activeSprint = useMemo(() => {
    return currentProject?.sprints?.find(s => s.status === 'active') || null;
  }, [currentProject]);

  // Helper to log project activity
  const logActivity = async (action: string, details?: string) => {
    if (!currentProject) return;
    const newAct: ProjectActivity = {
      id: crypto.randomUUID(),
      project_id: currentProject.id,
      author: currentProject.lead || 'Usuario',
      action,
      details,
      created_at: new Date().toISOString()
    };
    const updatedActs = [newAct, ...(currentProject.activities || [])];
    await onUpdateProject(currentProject.id, { activities: updatedActs });
  };

  // Create New Project Handler
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const template = PROJECT_TEMPLATES.find(t => t.id === newProjectTemplate) || PROJECT_TEMPLATES[0];
    const created = await onAddProject(newProjectName.trim(), newProjectEmoji, '#0284c7', template.id);

    if (created) {
      // Add initial docs if template has them
      const initialDocs: ProjectDoc[] = template.initialDocs.map(d => ({
        id: crypto.randomUUID(),
        project_id: created.id,
        title: d.title,
        content: d.content,
        category: d.category as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      await onUpdateProject(created.id, {
        kanban_columns: template.columns,
        status: 'active',
        priority: 'medium',
        docs: initialDocs,
        sprints: [],
        milestones: [],
        inbox: [],
        activities: [{
          id: crypto.randomUUID(),
          project_id: created.id,
          author: 'Usuario',
          action: 'Proyecto creado',
          details: `Plantilla: ${template.name}`,
          created_at: new Date().toISOString()
        }]
      });

      onSelectProject(created.id);
    }

    setNewProjectName('');
    setIsNewProjectModalOpen(false);
  };

  // Create Sprint
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !sprintName.trim()) return;

    const newSprint: Sprint = {
      id: crypto.randomUUID(),
      project_id: currentProject.id,
      name: sprintName.trim(),
      goal: sprintGoal.trim(),
      start_date: sprintStartDate || new Date().toISOString().split('T')[0],
      end_date: sprintEndDate || new Date(Date.now() + 14*86400000).toISOString().split('T')[0],
      status: currentProject.sprints?.some(s => s.status === 'active') ? 'planning' : 'active',
      created_at: new Date().toISOString()
    };

    const updatedSprints = [...(currentProject.sprints || []), newSprint];
    await onUpdateProject(currentProject.id, { sprints: updatedSprints });
    await logActivity(`Sprint creado: ${newSprint.name}`, newSprint.goal);

    setSprintName('');
    setSprintGoal('');
    setIsCreateSprintOpen(false);
  };

  // Finish Sprint
  const handleFinishSprintAction = async () => {
    if (!currentProject || !sprintToFinish) return;

    const updatedSprints = (currentProject.sprints || []).map(s => {
      if (s.id === sprintToFinish.id) {
        return { ...s, status: 'completed' as const };
      }
      return s;
    });

    await onUpdateProject(currentProject.id, { sprints: updatedSprints });
    await logActivity(`Sprint finalizado: ${sprintToFinish.name}`);
    setIsFinishSprintOpen(false);
    setSprintToFinish(null);
  };

  // Create Milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !milestoneName.trim()) return;

    const newM: Milestone = {
      id: crypto.randomUUID(),
      project_id: currentProject.id,
      name: milestoneName.trim(),
      target_date: milestoneDate || new Date().toISOString().split('T')[0],
      status: 'pending',
      description: milestoneDesc.trim()
    };

    const updatedM = [...(currentProject.milestones || []), newM];
    await onUpdateProject(currentProject.id, { milestones: updatedM });
    await logActivity(`Hito creado: ${newM.name}`);

    setMilestoneName('');
    setMilestoneDesc('');
    setIsCreateMilestoneOpen(false);
  };

  // Save Doc
  const handleSaveDoc = async () => {
    if (!currentProject || !docTitle.trim()) return;

    let updatedDocs = [...(currentProject.docs || [])];
    if (activeDoc) {
      updatedDocs = updatedDocs.map(d => d.id === activeDoc.id ? {
        ...d,
        title: docTitle.trim(),
        category: docCategory,
        content: docContent,
        updated_at: new Date().toISOString()
      } : d);
    } else {
      updatedDocs.push({
        id: crypto.randomUUID(),
        project_id: currentProject.id,
        title: docTitle.trim(),
        category: docCategory,
        content: docContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    await onUpdateProject(currentProject.id, { docs: updatedDocs });
    await logActivity(activeDoc ? `Documento actualizado: ${docTitle}` : `Documento creado: ${docTitle}`);
    setIsDocModalOpen(false);
    setActiveDoc(null);
    setDocTitle('');
    setDocContent('');
  };

  // Add Inbox Item
  const handleAddInboxItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !inboxText.trim()) return;

    const newItem: ProjectInboxItem = {
      id: crypto.randomUUID(),
      project_id: currentProject.id,
      text: inboxText.trim(),
      type: 'idea',
      created_at: new Date().toISOString()
    };

    const updatedInbox = [newItem, ...(currentProject.inbox || [])];
    await onUpdateProject(currentProject.id, { inbox: updatedInbox });
    setInboxText('');
  };

  // Convert Inbox Item to Task
  const handleConvertInboxToTask = async (item: ProjectInboxItem) => {
    if (!currentProject) return;
    await addTodo(item.text, { projectId: currentProject.id });
    const updatedInbox = (currentProject.inbox || []).filter(i => i.id !== item.id);
    await onUpdateProject(currentProject.id, { inbox: updatedInbox });
    await logActivity(`Elemento de Inbox convertido a Tarea: "${item.text}"`);
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
        <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 shadow-sm">
          <FolderKanban className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Comienza tu primer Proyecto</h2>
        <p className="text-sm text-stone-500 max-w-md mb-6">
          Organiza tus metas, sprints, documentación y tareas en un espacio de trabajo unificado.
        </p>
        <button
          onClick={() => setIsNewProjectModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-all shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Crear Proyecto
        </button>

        {/* New Project Modal */}
        {isNewProjectModalOpen && renderNewProjectModal()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Project Switcher Selector */}
          <div className="relative group">
            <select
              value={currentProject?.id}
              onChange={(e) => onSelectProject(Number(e.target.value))}
              className="appearance-none bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-3 pr-8 py-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.emoji || '📁'} {p.name}
                </option>
              ))}
            </select>
            <ChevronRight className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 rotate-90 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
            title="Crear nuevo proyecto"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Quick Status Pill */}
          {currentProject?.status && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 uppercase tracking-wider text-[10px]">
              {currentProject.status}
            </span>
          )}
        </div>

        {/* Project Actions */}
        <div className="flex items-center gap-2">
          {currentProject && onOpenProjectEditor && (
            <button
              onClick={() => onOpenProjectEditor(currentProject)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
          )}

          <button
            onClick={() => currentProject && onArchiveProject(currentProject.id, !currentProject.is_archived)}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
            title={currentProject?.is_archived ? "Desarchivar" : "Archivar proyecto"}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Project Navigation Tabs */}
      <nav className="px-5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'board', label: 'Tablero Kanban', icon: FolderKanban },
          { id: 'sprints', label: 'Sprints & Backlog', icon: Zap },
          { id: 'timeline', label: 'Timeline', icon: Calendar },
          { id: 'milestones', label: 'Milestones', icon: Flag },
          { id: 'docs', label: 'Docs', icon: FileText },
          { id: 'files', label: 'Archivos', icon: Paperclip },
          { id: 'inbox', label: 'Inbox', icon: Inbox },
          { id: 'activity', label: 'Actividad', icon: Activity },
          { id: 'team', label: 'Equipo', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Workspace Body Content */}
      <main className="flex-grow overflow-y-auto custom-scrollbar p-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'board' && renderBoardTab()}
        {activeTab === 'sprints' && renderSprintsTab()}
        {activeTab === 'timeline' && renderTimelineTab()}
        {activeTab === 'milestones' && renderMilestonesTab()}
        {activeTab === 'docs' && renderDocsTab()}
        {activeTab === 'files' && renderFilesTab()}
        {activeTab === 'inbox' && renderInboxTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'team' && renderTeamTab()}
      </main>

      {/* Modals */}
      {isNewProjectModalOpen && renderNewProjectModal()}
      {isCreateSprintOpen && renderCreateSprintModal()}
      {isFinishSprintOpen && renderFinishSprintModal()}
      {isCreateMilestoneOpen && renderCreateMilestoneModal()}
      {isDocModalOpen && renderDocEditorModal()}
    </div>
  );

  // --- SUB-RENDERERS FOR TABS ---

  function renderOverviewTab() {
    if (!currentProject) return null;
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Project Header Overview */}
        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 rounded-2xl bg-stone-100 dark:bg-stone-800">
                {currentProject.emoji || '🚀'}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {currentProject.name}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  {currentProject.description || 'Sin descripción asignada.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                {currentProject.priority?.toUpperCase() || 'PRIORIDAD MEDIA'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span>Progreso General</span>
              <span>{metrics.progress}% ({metrics.completed} / {metrics.total} tareas)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all duration-500"
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Completadas</p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{metrics.completed}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Pendientes</p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{metrics.pending}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Atrasadas</p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{metrics.overdue}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Sprint Activo</p>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                {activeSprint ? activeSprint.name : 'Sin Sprint Activo'}
              </p>
            </div>
          </div>
        </div>

        {/* Blocked Tasks Alert */}
        {metrics.blockedTasks.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-grow text-xs">
              <h4 className="font-bold text-rose-800 dark:text-rose-300">
                {metrics.blockedTasks.length} {metrics.blockedTasks.length === 1 ? 'Tarea Bloqueada' : 'Tareas Bloqueadas'} por Dependencias
              </h4>
              <p className="text-rose-700 dark:text-rose-400 mt-1">
                {metrics.blockedTasks.map(t => t.text).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Sprints & Recent Activity Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Sprint Summary */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" /> Sprint Actual
              </h3>
              <button
                onClick={() => setActiveTab('sprints')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
              >
                Ver todos
              </button>
            </div>

            {activeSprint ? (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 space-y-2 border border-stone-200/60 dark:border-stone-700/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{activeSprint.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                    Activo
                  </span>
                </div>
                <p className="text-xs text-stone-500">{activeSprint.goal || 'Sin meta definida'}</p>
                <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                  <span>Fechas: {activeSprint.start_date} al {activeSprint.end_date}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/30 rounded-xl">
                No hay sprint activo. Inicia uno en la pestaña de Sprints.
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" /> Actividad Reciente
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {(currentProject.activities || []).slice(0, 5).map(act => (
                <div key={act.id} className="text-xs p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">{act.action}</span>
                    {act.details && <p className="text-[11px] text-stone-500">{act.details}</p>}
                  </div>
                  <span className="text-[10px] text-stone-400 shrink-0">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(!currentProject.activities || currentProject.activities.length === 0) && (
                <p className="text-xs text-stone-400 text-center py-4">Sin actividad registrada.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderBoardTab() {
    if (!currentProject) return null;
    const columns = currentProject.kanban_columns && currentProject.kanban_columns.length > 0
      ? currentProject.kanban_columns
      : ['Por hacer', 'En progreso', 'Completado'];

    return (
      <div className="h-full flex flex-col space-y-4">
        {/* Board Search & Filter Bar */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-grow max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tareas en el tablero..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Board Columns Grid */}
        <div className="flex-grow flex gap-4 overflow-x-auto custom-scrollbar pb-4">
          {columns.map(col => {
            const colTasks = projectTodos.filter(t => {
              const matchesSearch = searchQuery ? t.text.toLowerCase().includes(searchQuery.toLowerCase()) : true;
              const taskCol = t.kanban_column || (t.completed ? columns[columns.length - 1] : columns[0]);
              return matchesSearch && taskCol === col;
            });

            return (
              <div key={col} className="w-72 shrink-0 flex flex-col bg-stone-100/70 dark:bg-stone-900/50 rounded-2xl p-3 border border-stone-200/60 dark:border-stone-800/60">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    {col}
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      {colTasks.length}
                    </span>
                  </h3>
                </div>

                {/* Tasks Container */}
                <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar pr-1">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onEditTodo(task)}
                      className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:border-sky-500/50 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-medium ${task.completed ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-100'}`}>
                          {task.text}
                        </span>
                        {task.priority && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            task.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                      </div>

                      {/* Card Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-400 pt-1">
                        {task.due_date && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                            <Calendar className="w-3 h-3" /> {task.due_date}
                          </span>
                        )}
                        {task.story_points && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                            {task.story_points} SP
                          </span>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
                            <CheckSquare className="w-3 h-3" />
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                      Sin tareas
                    </div>
                  )}
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={() => addTodo('Nueva Tarea', { projectId: currentProject.id, kanbanColumn: col })}
                  className="mt-3 w-full py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Tarea
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSprintsTab() {
    if (!currentProject) return null;
    const backlogTasks = projectTodos.filter(t => !t.sprint_id);

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Gestión de Sprints & Backlog</h2>
            <p className="text-xs text-stone-500">Planifica entregas iterativas estilo Scrum.</p>
          </div>
          <button
            onClick={() => setIsCreateSprintOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Sprint
          </button>
        </div>

        {/* Sprints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentProject.sprints || []).map(sprint => {
            const sprintTasks = projectTodos.filter(t => t.sprint_id === sprint.id);
            const totalSP = sprintTasks.reduce((acc, t) => acc + (t.story_points || 0), 0);
            const completedSP = sprintTasks.filter(t => t.completed).reduce((acc, t) => acc + (t.story_points || 0), 0);

            return (
              <div key={sprint.id} className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">{sprint.name}</h3>
                    <p className="text-xs text-stone-500">{sprint.goal || 'Sin meta'}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    sprint.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                    sprint.status === 'completed' ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {sprint.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Fechas: {sprint.start_date} - {sprint.end_date}</span>
                  <span className="font-semibold text-sky-600">{completedSP} / {totalSP} SP</span>
                </div>

                {sprint.status === 'active' && (
                  <button
                    onClick={() => {
                      setSprintToFinish(sprint);
                      setIsFinishSprintOpen(true);
                    }}
                    className="w-full py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
                  >
                    Finalizar Sprint
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Backlog Section */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" /> Backlog del Proyecto ({backlogTasks.length})
          </h3>

          <div className="space-y-2">
            {backlogTasks.map(task => (
              <div key={task.id} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-stone-800 dark:text-stone-200">{task.text}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-[10px]">
                    {task.story_points || 0} SP
                  </span>
                  <button
                    onClick={() => onEditTodo(task)}
                    className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {backlogTasks.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">No hay tareas en el backlog.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderTimelineTab() {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">Roadmap & Timeline</h2>
        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-4">
          {projectTodos.map(task => (
            <div key={task.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>{task.text}</span>
                <span className="text-stone-400">{task.due_date || 'Sin fecha'}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-sky-500'}`}
                  style={{ width: task.completed ? '100%' : '40%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderMilestonesTab() {
    if (!currentProject) return null;

    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Hitos (Milestones)</h2>
          <button
            onClick={() => setIsCreateMilestoneOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white font-medium text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear Hito
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentProject.milestones || []).map(m => (
            <div key={m.id} className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">{m.name}</h3>
                <span className="text-xs text-stone-400">{m.target_date}</span>
              </div>
              <p className="text-xs text-stone-500">{m.description || 'Sin descripción'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDocsTab() {
    if (!currentProject) return null;

    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Documentos del Proyecto</h2>
          <button
            onClick={() => {
              setActiveDoc(null);
              setDocTitle('');
              setDocContent('');
              setIsDocModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white font-medium text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Documento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(currentProject.docs || []).map(doc => (
            <div
              key={doc.id}
              onClick={() => {
                setActiveDoc(doc);
                setDocTitle(doc.title);
                setDocCategory(doc.category || 'Specifications');
                setDocContent(doc.content);
                setIsDocModalOpen(true);
              }}
              className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:border-sky-500 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-semibold">
                  {doc.category || 'General'}
                </span>
                <span className="text-[10px] text-stone-400">
                  {new Date(doc.updated_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">{doc.title}</h3>
              <p className="text-xs text-stone-500 line-clamp-3">{doc.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderFilesTab() {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">Archivos y Recursos</h2>
        <div className="p-8 text-center text-xs text-stone-400 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl">
          Todos los archivos adjuntos en tareas y documentos se centralizan aquí.
        </div>
      </div>
    );
  }

  function renderInboxTab() {
    if (!currentProject) return null;

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">Project Inbox (Captura Rápida)</h2>
        <form onSubmit={handleAddInboxItem} className="flex gap-2">
          <input
            type="text"
            value={inboxText}
            onChange={(e) => setInboxText(e.target.value)}
            placeholder="Captura una idea, nota rápida o tarea sin clasificar..."
            className="flex-grow px-4 py-2 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none"
          />
          <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-medium">
            Guardar
          </button>
        </form>

        <div className="space-y-2">
          {(currentProject.inbox || []).map(item => (
            <div key={item.id} className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
              <span>{item.text}</span>
              <button
                onClick={() => handleConvertInboxToTask(item)}
                className="px-3 py-1 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-semibold"
              >
                Convertir a Tarea
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderActivityTab() {
    if (!currentProject) return null;

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">Historial de Actividad</h2>
        <div className="space-y-2">
          {(currentProject.activities || []).map(act => (
            <div key={act.id} className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold">{act.action}</p>
                {act.details && <p className="text-stone-500">{act.details}</p>}
              </div>
              <span className="text-[10px] text-stone-400">{new Date(act.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderTeamTab() {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-bold">Equipo y Colaboración</h2>
        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-xs text-stone-500">
          Diseñado para colaboración futura. Asigna responsables y roles en cada tarea y proyecto.
        </div>
      </div>
    );
  }

  // --- MODAL DIALOGS ---

  function renderNewProjectModal() {
    return (
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 dark:border-stone-800 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">Crear Nuevo Proyecto</h3>
            <button onClick={() => setIsNewProjectModalOpen(false)} className="text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Nombre</label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Ej. FourCode Store"
                className="w-full px-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1">Plantilla de Proyecto</label>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map(t => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setNewProjectTemplate(t.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      newProjectTemplate === t.id
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div className="text-lg mb-1">{t.icon}</div>
                    <div className="font-bold">{t.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-sky-600 text-white rounded-xl hover:bg-sky-700"
              >
                Crear Proyecto
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderCreateSprintModal() {
    return (
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 dark:border-stone-800">
          <h3 className="font-bold text-base">Crear Sprint</h3>
          <form onSubmit={handleCreateSprint} className="space-y-3 text-xs">
            <div>
              <label className="block mb-1 font-medium">Nombre del Sprint</label>
              <input
                type="text"
                required
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                placeholder="Ej. Sprint 01 - Autenticación"
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Meta (Sprint Goal)</label>
              <input
                type="text"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                placeholder="Ej. Dejar listo el login y registro de usuarios"
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreateSprintOpen(false)} className="px-4 py-2 text-stone-500">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-xl">
                Crear Sprint
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderFinishSprintModal() {
    return (
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 dark:border-stone-800">
          <h3 className="font-bold text-base">Finalizar Sprint</h3>
          <p className="text-xs text-stone-500">
            ¿Deseas completar este sprint? Las tareas incompletas se mantendrán disponibles para el siguiente sprint o backlog.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsFinishSprintOpen(false)} className="px-4 py-2 text-xs text-stone-500">
              Cancelar
            </button>
            <button onClick={handleFinishSprintAction} className="px-4 py-2 text-xs bg-emerald-600 text-white rounded-xl font-medium">
              Confirmar y Finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCreateMilestoneModal() {
    return (
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 dark:border-stone-800">
          <h3 className="font-bold text-base">Crear Hito (Milestone)</h3>
          <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
            <div>
              <label className="block mb-1 font-medium">Nombre</label>
              <input
                type="text"
                required
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder="Ej. MVP Launch"
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Fecha Objetivo</label>
              <input
                type="date"
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreateMilestoneOpen(false)} className="px-4 py-2 text-stone-500">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-xl">
                Guardar Hito
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderDocEditorModal() {
    return (
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">{activeDoc ? 'Editar Documento' : 'Nuevo Documento'}</h3>
            <button onClick={() => setIsDocModalOpen(false)} className="text-stone-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Título del documento..."
              className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
            />

            <textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              rows={10}
              placeholder="Escribe el contenido del documento aquí..."
              className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 text-stone-500">
                Cancelar
              </button>
              <button onClick={handleSaveDoc} className="px-4 py-2 bg-sky-600 text-white rounded-xl font-medium">
                Guardar Documento
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default ProjectsWorkspace;
