import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Project, Todo, Sprint, Milestone, ProjectDoc, ProjectDocFolder, 
  ProjectInboxItem, ProjectChatMessage, ProjectActivity, ProjectInvitation,
  ProjectRisk, ProjectExpense, ProjectTimeLog, ProjectChannel, ProjectPoll,
  ProjectHuddle, ProjectMemberStatus, ProjectCanvas, ProjectThreadReply
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
  TrendingUp, Award, UserCheck, Flame, Zap, Hash, Volume2, Mic, MicOff, Video, 
  VideoOff, Monitor, Smile, Reply, Play, Square, Lock, Globe, Radio, Tv
} from 'lucide-react';

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

    useEffect(() => {
        if (activeProjectId === null) {
            setShowingAllProjects(true);
        } else {
            setShowingAllProjects(false);
        }
    }, [activeProjectId]);

    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'risks' | 'budget' | 'time' | 'docs' | 'chat' | 'inbox' | 'team' | 'activity'>('overview');
    
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

    // ==========================================
    // SLACK COLLABORATION WORKSPACE STATES
    // ==========================================
    const [activeChannelId, setActiveChannelId] = useState<string>('general');
    const [chatInputText, setChatInputText] = useState('');
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    
    // Thread Drawer State
    const [activeThreadMsgId, setActiveThreadMsgId] = useState<string | null>(null);
    const [threadInputText, setThreadInputText] = useState('');

    // Create Channel Modal State
    const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
    const [newChanName, setNewChanName] = useState('');
    const [newChanDesc, setNewChanDesc] = useState('');
    const [newChanEmoji, setNewChanEmoji] = useState('💬');
    const [newChanPrivate, setNewChanPrivate] = useState(false);

    // Create Poll Modal State
    const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['Opción A', 'Opción B']);
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

    // Voice Clip Recording Simulation State
    const [isRecordingAudioClip, setIsRecordingAudioClip] = useState(false);
    const [audioClipTimer, setAudioClipTimer] = useState(0);

    // Member Slack Status Modal State
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [customStatusEmoji, setCustomStatusEmoji] = useState('🟢');
    const [customStatusText, setCustomStatusText] = useState('Disponible');
    const [customPresenceMode, setCustomPresenceMode] = useState<'online' | 'away' | 'dnd'>('online');

    // Slack Canvas Editor State
    const [newCanvasTaskText, setNewCanvasTaskText] = useState('');
    const [newCanvasResourceLabel, setNewCanvasResourceLabel] = useState('');
    const [newCanvasResourceUrl, setNewCanvasResourceUrl] = useState('');

    // Huddle Recording / Screen Share Toggle
    const [huddleMicMuted, setHuddleMicMuted] = useState(false);
    const [huddleVideoOn, setHuddleVideoOn] = useState(true);
    const [huddleScreenShareOn, setHuddleScreenShareOn] = useState(false);
    const [huddleNotesText, setHuddleNotesText] = useState('');

    useEffect(() => {
        let interval: any = null;
        if (isRecordingAudioClip) {
            interval = setInterval(() => {
                setAudioClipTimer(prev => prev + 1);
            }, 1000);
        } else {
            setAudioClipTimer(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isRecordingAudioClip]);

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

    // Slack Channels Resolution
    const projectChannels = useMemo(() => {
        if (!activeProject) return [];
        if (Array.isArray(activeProject.channels) && activeProject.channels.length > 0) {
            return activeProject.channels;
        }
        return [
            { id: 'general', project_id: activeProject.id, name: 'general', emoji: '💬', description: 'Anuncios y conversación general del proyecto', is_default: true, created_at: new Date().toISOString() },
            { id: 'desarrollo', project_id: activeProject.id, name: 'desarrollo', emoji: '💻', description: 'Código, arquitectura y tareas técnicas', created_at: new Date().toISOString() },
            { id: 'diseño-ui', project_id: activeProject.id, name: 'diseño-ui', emoji: '🎨', description: 'Prototipos, mockups y guías de estilo', created_at: new Date().toISOString() },
            { id: 'standup-huddles', project_id: activeProject.id, name: 'standup-huddles', emoji: '🎧', description: 'Llamadas rápidas, audio huddles y sync diario', created_at: new Date().toISOString() },
        ];
    }, [activeProject]);

    const currentChannel = useMemo(() => {
        return projectChannels.find(c => c.id === activeChannelId) || projectChannels[0] || { id: 'general', name: 'general', emoji: '💬', description: 'Canal principal' };
    }, [projectChannels, activeChannelId]);

    const activeHuddles = useMemo(() => {
        return Array.isArray(activeProject?.huddles) ? activeProject.huddles : [];
    }, [activeProject]);

    const currentChannelHuddle = useMemo(() => {
        return activeHuddles.find(h => h.channel_id === currentChannel.id && h.is_active);
    }, [activeHuddles, currentChannel]);

    const projectCanvases = useMemo(() => {
        if (!activeProject) return [];
        if (Array.isArray(activeProject.canvases) && activeProject.canvases.length > 0) {
            return activeProject.canvases;
        }
        return [
            {
                id: 'canvas_default',
                project_id: activeProject.id,
                title: `Slack Canvas de ${activeProject.name}`,
                content: `### 🚀 Especificaciones y Documentación del Proyecto\n\nEste es el **Slack Canvas** colaborativo. Utiliza este espacio para centralizar los requerimientos clave, enlaces importantes y checklist de entregables.\n\n- **Estado del Proyecto:** ${activeProject.status || 'En progreso'}\n- **Líder Técnico:** ${activeProject.lead || 'Por asignar'}\n- **Presupuesto Registrado:** $${activeProject.budget || 0}`,
                pinned_links: [
                    { label: 'Repositorio de Código (GitHub)', url: 'https://github.com' },
                    { label: 'Diseños y Prototipos (Figma)', url: 'https://figma.com' }
                ],
                action_items: [
                    { id: 'act_1', text: 'Revisar requisitos de integración y base de datos', done: true, assignee: 'PM' },
                    { id: 'act_2', text: 'Sincronizar modelos con la base de datos', done: false, assignee: 'Tech Lead' }
                ],
                updated_at: new Date().toISOString(),
                updated_by: currentUserEmail || 'usuario@empresa.com'
            }
        ];
    }, [activeProject, currentUserEmail]);

    const currentCanvas = useMemo(() => {
        return projectCanvases[0];
    }, [projectCanvases]);

    // Slack Handlers
    const handleCreateChannel = async () => {
        if (!activeProject || !newChanName.trim()) return;
        const cleanName = newChanName.toLowerCase().replace(/\s+/g, '-');
        const newChan: ProjectChannel = {
            id: `chan_${Date.now()}`,
            project_id: activeProject.id,
            name: cleanName,
            description: newChanDesc || 'Canal de conversación del proyecto',
            emoji: newChanEmoji || '💬',
            is_private: newChanPrivate,
            created_at: new Date().toISOString()
        };
        const updatedChannels = [...projectChannels, newChan];
        await onUpdateProject(activeProject.id, { channels: updatedChannels });
        setActiveChannelId(newChan.id);
        setIsCreateChannelModalOpen(false);
        setNewChanName('');
        setNewChanDesc('');
    };

    const handleSendMessage = async (extraPayload?: Partial<ProjectChatMessage>) => {
        if (!activeProject) return;
        if (!chatInputText.trim() && !extraPayload) return;

        const existingMsgs = Array.isArray(activeProject.chat_messages) ? activeProject.chat_messages : [];
        const userEmail = currentUserEmail || 'usuario@empresa.com';
        const newMsg: ProjectChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            project_id: activeProject.id,
            channel_id: currentChannel.id,
            sender_name: userEmail.split('@')[0],
            sender_email: userEmail,
            text: extraPayload?.text || chatInputText.trim(),
            created_at: new Date().toISOString(),
            reactions: {},
            thread_count: 0,
            thread_replies: [],
            ...extraPayload
        };

        const updatedMsgs = [...existingMsgs, newMsg];
        await onUpdateProject(activeProject.id, { chat_messages: updatedMsgs });
        setChatInputText('');
    };

    const handleAddThreadReply = async (parentMsgId: string) => {
        if (!activeProject || !threadInputText.trim()) return;
        const existingMsgs = Array.isArray(activeProject.chat_messages) ? activeProject.chat_messages : [];
        const userEmail = currentUserEmail || 'usuario@empresa.com';

        const replyObj: ProjectThreadReply = {
            id: `reply_${Date.now()}`,
            sender_name: userEmail.split('@')[0],
            sender_email: userEmail,
            text: threadInputText.trim(),
            created_at: new Date().toISOString()
        };

        const updatedMsgs = existingMsgs.map(m => {
            if (m.id === parentMsgId) {
                const replies = Array.isArray(m.thread_replies) ? m.thread_replies : [];
                return {
                    ...m,
                    thread_count: (m.thread_count || replies.length) + 1,
                    thread_replies: [...replies, replyObj]
                };
            }
            return m;
        });

        await onUpdateProject(activeProject.id, { chat_messages: updatedMsgs });
        setThreadInputText('');
    };

    const handleToggleReaction = async (msgId: string, emoji: string) => {
        if (!activeProject) return;
        const existingMsgs = Array.isArray(activeProject.chat_messages) ? activeProject.chat_messages : [];
        const userEmail = currentUserEmail || 'usuario@empresa.com';

        const updatedMsgs = existingMsgs.map(m => {
            if (m.id === msgId) {
                const currentReactions = { ...(m.reactions || {}) };
                const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
                if (users.includes(userEmail)) {
                    currentReactions[emoji] = users.filter(u => u !== userEmail);
                    if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
                } else {
                    currentReactions[emoji] = [...users, userEmail];
                }
                return { ...m, reactions: currentReactions };
            }
            return m;
        });

        await onUpdateProject(activeProject.id, { chat_messages: updatedMsgs });
    };

    const handleTogglePinMessage = async (msgId: string) => {
        if (!activeProject) return;
        const existingMsgs = Array.isArray(activeProject.chat_messages) ? activeProject.chat_messages : [];
        const updatedMsgs = existingMsgs.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m);
        await onUpdateProject(activeProject.id, { chat_messages: updatedMsgs });
    };

    const handleCreatePoll = async () => {
        if (!activeProject || !pollQuestion.trim()) return;
        const validOptions = pollOptions.filter(o => o.trim().length > 0);
        if (validOptions.length < 2) return;

        const pollId = `poll_${Date.now()}`;
        const newPoll: ProjectPoll = {
            id: pollId,
            project_id: activeProject.id,
            channel_id: currentChannel.id,
            question: pollQuestion.trim(),
            options: validOptions.map((opt, i) => ({ id: `opt_${i}`, text: opt.trim(), voters: [] })),
            author_email: currentUserEmail || 'usuario@empresa.com',
            author_name: currentUserEmail ? currentUserEmail.split('@')[0] : 'Colaborador',
            created_at: new Date().toISOString(),
            allow_multiple: pollAllowMultiple
        };

        const existingPolls = Array.isArray(activeProject.polls) ? activeProject.polls : [];
        const updatedPolls = [...existingPolls, newPoll];

        await handleSendMessage({
            text: `📊 Encuesta: ${pollQuestion.trim()}`,
            poll_id: pollId,
            poll: newPoll
        });

        await onUpdateProject(activeProject.id, { polls: updatedPolls });
        setIsCreatePollModalOpen(false);
        setPollQuestion('');
        setPollOptions(['Opción A', 'Opción B']);
    };

    const handleVotePoll = async (pollId: string, optionId: string) => {
        if (!activeProject) return;
        const userEmail = currentUserEmail || 'usuario@empresa.com';
        const existingPolls = Array.isArray(activeProject.polls) ? activeProject.polls : [];

        const updatedPolls = existingPolls.map(p => {
            if (p.id === pollId) {
                const updatedOpts = p.options.map(o => {
                    if (o.id === optionId) {
                        const hasVoted = o.voters.includes(userEmail);
                        return {
                            ...o,
                            voters: hasVoted ? o.voters.filter(v => v !== userEmail) : [...o.voters, userEmail]
                        };
                    } else if (!p.allow_multiple) {
                        return { ...o, voters: o.voters.filter(v => v !== userEmail) };
                    }
                    return o;
                });
                return { ...p, options: updatedOpts };
            }
            return p;
        });

        const existingMsgs = Array.isArray(activeProject.chat_messages) ? activeProject.chat_messages : [];
        const updatedMsgs = existingMsgs.map(m => {
            if (m.poll_id === pollId || m.poll?.id === pollId) {
                const matchedPoll = updatedPolls.find(p => p.id === pollId);
                return { ...m, poll: matchedPoll };
            }
            return m;
        });

        await onUpdateProject(activeProject.id, { polls: updatedPolls, chat_messages: updatedMsgs });
    };

    const handleToggleHuddle = async () => {
        if (!activeProject) return;
        const userEmail = currentUserEmail || 'usuario@empresa.com';
        const userName = userEmail.split('@')[0];

        if (currentChannelHuddle) {
            const otherParticipants = currentChannelHuddle.participants.filter(p => p.email !== userEmail);
            if (otherParticipants.length === 0) {
                const updatedHuddles = activeHuddles.map(h => h.id === currentChannelHuddle.id ? { ...h, is_active: false } : h);
                await onUpdateProject(activeProject.id, { huddles: updatedHuddles });
            } else {
                const updatedHuddles = activeHuddles.map(h => h.id === currentChannelHuddle.id ? { ...h, participants: otherParticipants } : h);
                await onUpdateProject(activeProject.id, { huddles: updatedHuddles });
            }
        } else {
            const newHuddle: ProjectHuddle = {
                id: `huddle_${Date.now()}`,
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                title: `Slack Huddle en #${currentChannel.name}`,
                is_active: true,
                started_at: new Date().toISOString(),
                participants: [{
                    email: userEmail,
                    name: userName,
                    is_muted: huddleMicMuted,
                    is_video_on: huddleVideoOn,
                    is_screen_sharing: huddleScreenShareOn,
                    joined_at: new Date().toISOString()
                }]
            };
            const updatedHuddles = [...activeHuddles.filter(h => h.channel_id !== currentChannel.id), newHuddle];
            await onUpdateProject(activeProject.id, { huddles: updatedHuddles });
        }
    };

    const handleSendVoiceClip = async () => {
        const durationStr = `0:${audioClipTimer < 10 ? '0' : ''}${audioClipTimer}`;
        await handleSendMessage({
            text: `🎙️ Clip de voz de audio en #${currentChannel.name}`,
            is_audio_clip: true,
            audio_duration: durationStr
        });
        setIsRecordingAudioClip(false);
    };

    const handleSaveMemberStatus = async () => {
        if (!activeProject) return;
        const userEmail = currentUserEmail || 'usuario@empresa.com';
        const existingStatuses = activeProject.member_statuses || {};

        const updatedStatuses: Record<string, ProjectMemberStatus> = {
            ...existingStatuses,
            [userEmail]: {
                email: userEmail,
                name: userEmail.split('@')[0],
                status_emoji: customStatusEmoji,
                status_text: customStatusText,
                presence: customPresenceMode,
                updated_at: new Date().toISOString()
            }
        };

        await onUpdateProject(activeProject.id, { member_statuses: updatedStatuses });
        setIsStatusModalOpen(false);
    };

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
                        { id: 'chat', label: 'Canales Slack', icon: MessageSquare, badge: activeProject.chat_messages?.length },
                        { id: 'canvas', label: 'Slack Canvas', icon: FileText },
                        { id: 'risks', label: 'Matriz Riesgos', icon: ShieldAlert, badge: activeProject.risks?.length },
                        { id: 'budget', label: 'Presupuesto', icon: DollarSign },
                        { id: 'time', label: 'Registro Horas', icon: Clock, badge: activeProject.time_logs?.length },
                        { id: 'team', label: 'Equipo & Presencia', icon: Users, badge: (activeProject.members?.length || 1) },
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
    // RENDER: SLACK CHANNELS & HUDDLES WORKSPACE
    // ==========================================
    const renderSlackChat = () => {
        if (!activeProject) return null;
        const messages = Array.isArray(activeProject.chat_messages) ? activeProject.chat_messages : [];
        const channelMessages = messages.filter(m => 
            (m.channel_id === currentChannel.id || (!m.channel_id && currentChannel.id === 'general')) &&
            (!chatSearchQuery || m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
        );

        const threadParentMsg = activeThreadMsgId ? messages.find(m => m.id === activeThreadMsgId) : null;
        const members = Array.isArray(activeProject.members) ? activeProject.members : [];
        const memberStatuses = activeProject.member_statuses || {};
        const currentUserEmailVal = currentUserEmail || 'usuario@empresa.com';
        const myStatus = memberStatuses[currentUserEmailVal] || { status_emoji: '🟢', status_text: 'Disponible', presence: 'online' };

        return (
            <div className="flex h-full w-full bg-white dark:bg-[#0d0d0d] overflow-hidden relative">
                {/* 1. SLACK LEFT SIDEBAR (CHANNELS & DIRECT MESSAGES) */}
                <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-[#080808] flex flex-col shrink-0 h-full select-none">
                    {/* Project & User Status Header */}
                    <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-base">{activeProject.emoji || '📁'}</span>
                            <div className="truncate">
                                <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{activeProject.name}</h3>
                                <p className="text-[10px] text-gray-500 truncate">Espacio Slack de Proyecto</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsStatusModalOpen(true)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                            title="Cambiar Mi Estado de Slack"
                        >
                            <span>{myStatus.status_emoji || '🟢'}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                    </div>

                    {/* Channels Navigation */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        <div>
                            <div className="flex items-center justify-between px-2 mb-1.5">
                                <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Canales de Equipo</span>
                                <button
                                    onClick={() => setIsCreateChannelModalOpen(true)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    title="Crear Nuevo Canal"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="space-y-0.5">
                                {projectChannels.map(chan => {
                                    const isCurrent = chan.id === currentChannel.id;
                                    const isHuddleRunning = activeHuddles.some(h => h.channel_id === chan.id && h.is_active);
                                    const unreadCount = messages.filter(m => (m.channel_id === chan.id || (!m.channel_id && chan.id === 'general'))).length;

                                    return (
                                        <button
                                            key={chan.id}
                                            onClick={() => {
                                                setActiveChannelId(chan.id);
                                                setActiveThreadMsgId(null);
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between group transition-all ${
                                                isCurrent 
                                                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800/60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {chan.is_private ? (
                                                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                ) : (
                                                    <span className="text-xs shrink-0">{chan.emoji || '#'}</span>
                                                )}
                                                <span className="truncate">#{chan.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {isHuddleRunning && (
                                                    <span className="flex items-center gap-1 text-[9px] bg-purple-500 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                                                        <Radio className="w-2.5 h-2.5" /> HUDDLE
                                                    </span>
                                                )}
                                                {unreadCount > 0 && !isCurrent && (
                                                    <span className="text-[9px] bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold px-1.5 py-0.2 rounded-full">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Team Members Direct Message List */}
                        <div>
                            <div className="px-2 mb-1.5 flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Miembros ({members.length || 1})</span>
                            </div>
                            <div className="space-y-1">
                                {members.length === 0 ? (
                                    <div className="px-2 py-1 text-[11px] text-gray-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span>{currentUserEmailVal.split('@')[0]} (Tú)</span>
                                    </div>
                                ) : (
                                    members.map((mem, idx) => {
                                        const status = memberStatuses[mem.email] || { status_emoji: '🟢', status_text: 'Disponible', presence: 'online' };
                                        return (
                                            <div key={idx} className="px-2.5 py-1 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/40 flex items-center justify-between group">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="relative shrink-0">
                                                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                                                            {(mem.name || mem.email)[0].toUpperCase()}
                                                        </div>
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-black ${
                                                            status.presence === 'dnd' ? 'bg-red-500' : status.presence === 'away' ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`} />
                                                    </div>
                                                    <span className="truncate font-medium">{mem.name || mem.email.split('@')[0]}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 opacity-75 group-hover:opacity-100">{status.status_emoji || '💬'}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* My Presence Footer */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-[#0d0d0d] flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{currentUserEmailVal.split('@')[0]}</span>
                        </div>
                        <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 font-medium">
                            {myStatus.status_emoji} {myStatus.status_text}
                        </span>
                    </div>
                </div>

                {/* 2. MAIN CHAT AREA */}
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0d0d0d] overflow-hidden relative">
                    {/* Channel Header Bar */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#0d0d0d] shrink-0 z-10 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base font-bold">
                                {currentChannel.emoji || '#'}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    #{currentChannel.name}
                                    {currentChannel.is_private && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                                </h2>
                                <p className="text-[11px] text-gray-500">{currentChannel.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Slack Huddle Button */}
                            <button
                                onClick={handleToggleHuddle}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                    currentChannelHuddle 
                                        ? 'bg-purple-600 text-white hover:bg-purple-700 animate-pulse' 
                                        : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800'
                                }`}
                            >
                                <Radio className="w-3.5 h-3.5" />
                                <span>{currentChannelHuddle ? 'En Huddle (Salir)' : 'Iniciar Huddle'}</span>
                            </button>

                            {/* Create Poll Button */}
                            <button
                                onClick={() => setIsCreatePollModalOpen(true)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                                <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="hidden sm:inline">Encuesta</span>
                            </button>

                            {/* Slack Canvas Quick Access */}
                            <button
                                onClick={() => setActiveTab('canvas')}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                <span className="hidden sm:inline">Canvas</span>
                            </button>

                            {/* Search Filter */}
                            <div className="relative w-36 sm:w-48">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                                <input
                                    type="text"
                                    value={chatSearchQuery}
                                    onChange={(e) => setChatSearchQuery(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Huddle Floating Top Banner */}
                    {currentChannelHuddle && (
                        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-3 border-b border-purple-500/30 flex items-center justify-between shadow-md shrink-0 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 animate-pulse">
                                    <Radio className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Slack Huddle En Vivo</span>
                                        <span className="text-[10px] bg-purple-500 text-white px-2 py-0.2 rounded-full font-extrabold">AUDIO Y VIDEO</span>
                                    </div>
                                    <p className="text-xs text-gray-300">
                                        Participantes: {currentChannelHuddle.participants.map(p => p.name).join(', ') || 'Tú'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setHuddleMicMuted(!huddleMicMuted)}
                                    className={`p-2 rounded-xl text-xs font-bold transition-all ${
                                        huddleMicMuted ? 'bg-red-500 text-white' : 'bg-gray-800 text-emerald-400 hover:bg-gray-700'
                                    }`}
                                    title={huddleMicMuted ? 'Micrófono Silenciado' : 'Micrófono Activo'}
                                >
                                    {huddleMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </button>

                                <button
                                    onClick={() => setHuddleVideoOn(!huddleVideoOn)}
                                    className={`p-2 rounded-xl text-xs font-bold transition-all ${
                                        !huddleVideoOn ? 'bg-red-500 text-white' : 'bg-gray-800 text-blue-400 hover:bg-gray-700'
                                    }`}
                                    title={huddleVideoOn ? 'Cámara Encendida' : 'Cámara Apagada'}
                                >
                                    {huddleVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                </button>

                                <button
                                    onClick={() => setHuddleScreenShareOn(!huddleScreenShareOn)}
                                    className={`p-2 rounded-xl text-xs font-bold transition-all ${
                                        huddleScreenShareOn ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                    title="Compartir Pantalla"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={handleToggleHuddle}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                >
                                    Salir del Huddle
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {channelMessages.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-2xl">
                                    {currentChannel.emoji || '#'}
                                </div>
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">¡Bienvenido al canal #{currentChannel.name}!</h3>
                                <p className="text-xs text-gray-500 max-w-sm">Este es el inicio de la conversación. Envía mensajes, inicia huddles de voz o crea encuestas para el equipo.</p>
                            </div>
                        ) : (
                            channelMessages.map(msg => {
                                const reactions = msg.reactions || {};
                                const isPinned = msg.is_pinned;
                                const threadCount = msg.thread_count || (msg.thread_replies?.length || 0);

                                return (
                                    <div 
                                        key={msg.id} 
                                        className={`group relative flex items-start gap-3 p-3 rounded-2xl transition-all ${
                                            isPinned ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30' : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                            {(msg.sender_name || 'C')[0].toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">{msg.sender_name}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isPinned && (
                                                    <span className="text-[9px] bg-amber-500 text-black font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                                        <Pin className="w-2.5 h-2.5" /> Fijado
                                                    </span>
                                                )}
                                            </div>

                                            {/* Text Content */}
                                            <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                                {msg.text}
                                            </p>

                                            {/* Audio Clip Player Widget */}
                                            {msg.is_audio_clip && (
                                                <div className="my-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl flex items-center gap-3 max-w-xs">
                                                    <button className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                                        <Play className="w-4 h-4 ml-0.5" />
                                                    </button>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-1.5 w-full bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
                                                            <div className="h-full bg-purple-600 w-2/3 rounded-full" />
                                                        </div>
                                                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                                            Clip de audio • {msg.audio_duration || '0:05'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Poll Widget */}
                                            {msg.poll && (
                                                <div className="my-2 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md space-y-3 shadow-xs">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                            <BarChart2 className="w-4 h-4 text-emerald-500" />
                                                            {msg.poll.question}
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400 font-medium">Encuesta Slack</span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {msg.poll.options.map((opt) => {
                                                            const totalVotes = msg.poll?.options.reduce((sum, o) => sum + o.voters.length, 0) || 1;
                                                            const optVotes = opt.voters.length;
                                                            const pct = Math.round((optVotes / Math.max(totalVotes, 1)) * 100);
                                                            const hasUserVoted = opt.voters.includes(currentUserEmailVal);

                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => handleVotePoll(msg.poll!.id, opt.id)}
                                                                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all relative overflow-hidden border ${
                                                                        hasUserVoted 
                                                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-bold' 
                                                                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-gray-800 dark:text-gray-200 hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    <div 
                                                                        className="absolute left-0 top-0 bottom-0 bg-blue-500/10 dark:bg-blue-500/20 transition-all"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                    <div className="relative z-10 flex items-center justify-between">
                                                                        <span>{opt.text}</span>
                                                                        <span className="font-extrabold text-[11px] text-blue-600 dark:text-blue-400">{pct}% ({optVotes})</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reactions Bar */}
                                            {Object.keys(reactions).length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                                    {Object.entries(reactions).map(([emo, voters]) => (
                                                        <button
                                                            key={emo}
                                                            onClick={() => handleToggleReaction(msg.id, emo)}
                                                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                                                                voters.includes(currentUserEmailVal)
                                                                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-600 dark:text-blue-400'
                                                                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            <span>{emo}</span>
                                                            <span>{voters.length}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Thread Footer Button */}
                                            {threadCount > 0 && (
                                                <button
                                                    onClick={() => setActiveThreadMsgId(msg.id)}
                                                    className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                >
                                                    <Reply className="w-3.5 h-3.5" />
                                                    <span>{threadCount} {threadCount === 1 ? 'respuesta en hilo' : 'respuestas en hilo'}</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Quick Actions Hover Toolbar */}
                                        <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-md flex items-center gap-1">
                                            {['👍', '❤️', '🔥', '🎉'].map(emo => (
                                                <button
                                                    key={emo}
                                                    onClick={() => handleToggleReaction(msg.id, emo)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
                                                >
                                                    {emo}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setActiveThreadMsgId(msg.id)}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-blue-600"
                                                title="Responder en Hilo"
                                            >
                                                <Reply className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleTogglePinMessage(msg.id)}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-amber-500"
                                                title="Fijar Mensaje"
                                            >
                                                <Pin className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Chat Input Bar */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d0d0d] shrink-0">
                        {isRecordingAudioClip ? (
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                                        Grabando clip de voz de Slack... 0:{audioClipTimer < 10 ? '0' : ''}{audioClipTimer}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsRecordingAudioClip(false)}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-xs font-bold rounded-lg text-gray-700 dark:text-gray-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSendVoiceClip}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                                    >
                                        Enviar Audio
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2.5 focus-within:border-blue-500 transition-colors space-y-2">
                                <textarea
                                    value={chatInputText}
                                    onChange={(e) => setChatInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={`Enviar mensaje a #${currentChannel.name}... (Presiona Enter para enviar)`}
                                    className="w-full bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none min-h-[42px]"
                                />

                                <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-gray-800/50">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setIsRecordingAudioClip(true)}
                                            className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
                                            title="Grabar Clip de Voz"
                                        >
                                            <Mic className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-bold">Clip de Voz</span>
                                        </button>

                                        <button
                                            onClick={() => setIsCreatePollModalOpen(true)}
                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
                                            title="Crear Encuesta"
                                        >
                                            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!chatInputText.trim()}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Enviar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. THREAD SLIDE-OVER DRAWER */}
                {threadParentMsg && (
                    <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex flex-col h-full shrink-0 shadow-2xl z-20 animate-in slide-in-from-right duration-200">
                        <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Reply className="w-4 h-4 text-blue-500" />
                                Hilo en #{currentChannel.name}
                            </h3>
                            <button
                                onClick={() => setActiveThreadMsgId(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Thread Parent Message */}
                        <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800 space-y-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{threadParentMsg.sender_name}</span>
                            <p className="text-xs text-gray-700 dark:text-gray-300">{threadParentMsg.text}</p>
                        </div>

                        {/* Replies List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {(threadParentMsg.thread_replies || []).length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Aún no hay respuestas en este hilo. ¡Sé el primero en responder!</p>
                            ) : (
                                (threadParentMsg.thread_replies || []).map(rep => (
                                    <div key={rep.id} className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl space-y-1 border border-gray-200/60 dark:border-gray-800/60">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-gray-900 dark:text-white">{rep.sender_name}</span>
                                            <span className="text-gray-400 text-[10px]">{new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs text-gray-800 dark:text-gray-200">{rep.text}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Reply Input Bar */}
                        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={threadInputText}
                                    onChange={(e) => setThreadInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddThreadReply(threadParentMsg.id);
                                        }
                                    }}
                                    placeholder="Responder en el hilo..."
                                    className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={() => handleAddThreadReply(threadParentMsg.id)}
                                    disabled={!threadInputText.trim()}
                                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ==========================================
    // RENDER: SLACK CANVAS (PROJECT DOCS & CHECKLIST)
    // ==========================================
    const renderSlackCanvas = () => {
        if (!activeProject) return null;

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Slack Canvas del Proyecto
                        </h2>
                        <p className="text-xs text-gray-500">
                            Documento vivo persistido en base de datos.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Sincronizado en BD
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Canvas Editor (Left 2 cols) */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                {currentCanvas.title}
                            </h3>
                            <span className="text-[10px] text-gray-400">Última edición: {new Date(currentCanvas.updated_at).toLocaleDateString()}</span>
                        </div>

                        <textarea
                            value={currentCanvas.content}
                            onChange={async (e) => {
                                const newText = e.target.value;
                                const updatedCanvas: ProjectCanvas = {
                                    ...currentCanvas,
                                    content: newText,
                                    updated_at: new Date().toISOString()
                                };
                                await onUpdateProject(activeProject.id, { canvases: [updatedCanvas] });
                            }}
                            rows={14}
                            className="w-full p-4 text-xs font-mono bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 leading-relaxed"
                            placeholder="Escribe las especificaciones o notas del lienzo aquí..."
                        />
                    </div>

                    {/* Right Widgets Column */}
                    <div className="space-y-6">
                        {/* Action Items Widget */}
                        <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-blue-500" /> Checklist Canvas</span>
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.2 rounded-full">
                                    {(currentCanvas.action_items || []).filter(i => i.done).length}/{(currentCanvas.action_items || []).length}
                                </span>
                            </h4>

                            <div className="space-y-2">
                                {(currentCanvas.action_items || []).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={async () => {
                                            const updatedItems = (currentCanvas.action_items || []).map(i => i.id === item.id ? { ...i, done: !i.done } : i);
                                            const updatedCanvas = { ...currentCanvas, action_items: updatedItems, updated_at: new Date().toISOString() };
                                            await onUpdateProject(activeProject.id, { canvases: [updatedCanvas] });
                                        }}
                                        className="w-full text-left p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 text-xs font-medium flex items-center justify-between hover:border-gray-300 transition-colors"
                                    >
                                        <span className={item.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}>{item.text}</span>
                                        {item.done ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-400" />}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <input
                                    type="text"
                                    value={newCanvasTaskText}
                                    onChange={(e) => setNewCanvasTaskText(e.target.value)}
                                    placeholder="Nueva tarea de canvas..."
                                    className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none"
                                />
                                <button
                                    onClick={async () => {
                                        if (!newCanvasTaskText.trim()) return;
                                        const newItem = { id: `act_${Date.now()}`, text: newCanvasTaskText.trim(), done: false, assignee: 'Equipo' };
                                        const updatedCanvas = { ...currentCanvas, action_items: [...(currentCanvas.action_items || []), newItem], updated_at: new Date().toISOString() };
                                        await onUpdateProject(activeProject.id, { canvases: [updatedCanvas] });
                                        setNewCanvasTaskText('');
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Pinned Links Widget */}
                        <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Pin className="w-4 h-4 text-amber-500" /> Enlaces Fijados
                            </h4>

                            <div className="space-y-2">
                                {(currentCanvas.pinned_links || []).map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between"
                                    >
                                        <span className="truncate">{link.label}</span>
                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
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
                        {members.map((m, idx) => {
                            const memberName = m?.name || m?.email?.split('@')[0] || 'Miembro';
                            const memberEmail = m?.email || '';
                            const memberAvatar = m?.avatar;
                            const initials = memberName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'M';
                            const memberStatus = (activeProject.member_statuses || []).find(s => s.email && s.email.toLowerCase() === memberEmail.toLowerCase());
                            const presence = memberStatus?.presence || 'online';
                            const statusEmoji = memberStatus?.status_emoji || '🟢';
                            const statusText = memberStatus?.status_text || (presence === 'online' ? 'En línea' : presence === 'away' ? 'Ausente' : presence === 'dnd' ? 'Ocupado' : 'Desconectado');

                            return (
                                <div key={m?.id || idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-[#161616] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {memberAvatar ? (
                                                <img src={memberAvatar} alt={memberName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-800" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                                                    {initials}
                                                </div>
                                            )}
                                            {/* Status Dot */}
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111] ${
                                                presence === 'online' ? 'bg-emerald-500' :
                                                presence === 'away' ? 'bg-amber-500' :
                                                presence === 'dnd' ? 'bg-red-500' : 'bg-gray-400'
                                            }`} title={statusText} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white">{memberName}</h4>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                                                    <span>{statusEmoji}</span> {statusText}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-500 font-mono">{memberEmail || 'Sin correo registrado'}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        {m?.role === 'owner' ? 'Propietario' : m?.role === 'lead' ? 'Líder' : 'Colaborador'}
                                    </span>
                                </div>
                            );
                        })}
                        {members.length === 0 && (
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                                            {currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'RG'}
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111] bg-emerald-500" title="En línea" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">{currentUserEmail ? currentUserEmail.split('@')[0] : 'Tú'} (Propietario)</h4>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                                                <span>🟢</span> En línea
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-gray-500 font-mono">{currentUserEmail || 'rene.05gonzalez@gmail.com'}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">Propietario</span>
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
                        {activeTab === 'chat' && renderSlackChat()}
                        {activeTab === 'canvas' && renderSlackCanvas()}
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

            {/* CREATE SLACK CHANNEL MODAL */}
            <Modal isOpen={isCreateChannelModalOpen} onClose={() => setIsCreateChannelModalOpen(false)} title="Crear Canal de Slack">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const description = formData.get('description') as string;
                    const emoji = formData.get('emoji') as string || '💬';
                    const isPrivate = formData.get('is_private') === 'on';

                    handleCreateChannel(name, description, emoji, isPrivate);
                    setIsCreateChannelModalOpen(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Canal</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">#</span>
                            <input name="name" required placeholder="anuncios-equipo" className="w-full pl-7 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Emoji / Icono</label>
                            <input name="emoji" defaultValue="💬" placeholder="💬" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white text-center" />
                        </div>
                        <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input name="is_private" type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span>Canal Privado (Solo invitados)</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Propósito / Descripción</label>
                        <textarea name="description" rows={2} placeholder="De qué se trata este canal..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsCreateChannelModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg shadow-sm">Crear Canal</button>
                    </div>
                </form>
            </Modal>

            {/* USER SLACK STATUS MODAL */}
            <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Actualizar Mi Estado de Slack">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { emoji: '🟢', text: 'Disponible', presence: 'online' },
                            { emoji: '💻', text: 'En Reunión', presence: 'online' },
                            { emoji: '🎧', text: 'Concentrado / Música', presence: 'dnd' },
                            { emoji: '🌴', text: 'De Vacaciones', presence: 'away' },
                            { emoji: '🚗', text: 'En Trayecto', presence: 'away' },
                            { emoji: '🍔', text: 'Almorzando', presence: 'away' }
                        ].map((st, i) => (
                            <button
                                key={i}
                                onClick={() => handleUpdateMemberStatus(st.emoji, st.text, st.presence as any)}
                                className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500 rounded-xl text-left text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors"
                            >
                                <span className="text-base">{st.emoji}</span>
                                <span>{st.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* CREATE POLL MODAL */}
            <Modal isOpen={isCreatePollModalOpen} onClose={() => setIsCreatePollModalOpen(false)} title="Crear Encuesta de Equipo">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const question = formData.get('question') as string;
                    const opt1 = formData.get('opt1') as string;
                    const opt2 = formData.get('opt2') as string;
                    const opt3 = formData.get('opt3') as string;

                    const options = [opt1, opt2, opt3].filter(o => Boolean(o?.trim()));
                    if (question && options.length >= 2) {
                        handleCreatePoll(question, options);
                        setIsCreatePollModalOpen(false);
                    }
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pregunta de la Encuesta</label>
                        <input name="question" required placeholder="¿Cuándo hacemos el despliegue a producción?" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Opciones de Respuesta</label>
                        <input name="opt1" required placeholder="Opción 1: Hoy a las 5 PM" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        <input name="opt2" required placeholder="Opción 2: Mañana en la mañana" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        <input name="opt3" placeholder="Opción 3: Próximo Lunes (Opcional)" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsCreatePollModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 text-white font-bold rounded-lg shadow-sm">Lanzar Encuesta</button>
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
