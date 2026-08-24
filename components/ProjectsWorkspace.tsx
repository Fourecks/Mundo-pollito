import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Project, Todo, Sprint, Milestone, ProjectDoc, ProjectDocFolder, ProjectInboxItem, ProjectChatMessage, ProjectActivity, ProjectInvitation, ProjectChannel, ProjectPoll, ProjectHuddle, PushNotificationPreferences, ProjectQuarterlyPriority, ProjectMember, ProjectList, ProjectListItem, Priority } from '../types';
import { sendPushNotification } from '../services/pushNotificationService';
import { useHuddle } from '../src/context/HuddleContext';
import { 
  Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight, Users, MessageSquare, Video, Search, FolderPlus, Folder, FolderOpen, Download, Send, Paperclip, Smile, Pin, ExternalLink, Shield, FileSpreadsheet, FileCode, FileImage, FileArchive, File as FileIcon, Share2, HelpCircle, AlertTriangle, RefreshCw, ThumbsUp, Heart, Flame, Eye, Lightbulb, Megaphone, Flag, Filter, Hash, Lock, Volume2, Mic, MicOff, Camera, CameraOff, Monitor, Maximize2, Minimize2, Grid, List, ListOrdered, CheckSquare as CheckSquareIcon, Bell, BellOff, MessageCircle, SlidersHorizontal, PieChart, BarChart3, ChevronLeft, LayoutGrid
} from 'lucide-react';
import { format, parseISO, isPast, isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectsWorkspaceProps {
    currentUser?: any;
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
    pushPreferences?: PushNotificationPreferences;
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

const VideoStream = ({ stream }: { stream: MediaStream | null }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    React.useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.warn("Error playing video stream:", err));
        }
    }, [stream]);
    
    if (!stream) return null;
    return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg" />;
};

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = ({
    currentUser,
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
    onOpenProjectEditor,
    pushPreferences
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'docs' | 'chat' | 'expenses' | 'time' | 'team' | 'listas'>('overview');
    
    // Sprint Detail & Task Management
    const [sprintDetailModal, setSprintDetailModal] = useState<Sprint | null>(null);
    const [sprintTaskText, setSprintTaskText] = useState('');
    const [sprintTaskPriority, setSprintTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [sprintTaskAssignee, setSprintTaskAssignee] = useState<string>('');

    const handleAddSprintTask = async (e: React.FormEvent, sprintId?: string) => {
        e.preventDefault();
        if (!sprintTaskText.trim()) return;
        if (!activeProject) return;
        
        const targetSprintId = sprintId || selectedSprintId;
        if (!targetSprintId) return;

        await addTodo(sprintTaskText.trim(), {
            projectId: activeProject.id,
            sprint_id: targetSprintId,
            priority: sprintTaskPriority,
            assignee: sprintTaskAssignee || currentUserEmail,
            kanban_column: 'Por hacer'
        });
        setSprintTaskText('');
    };

    // Share Sprint/Roadmap Update to Channel Modal
    const [shareToChannelModal, setShareToChannelModal] = useState<{ isOpen: boolean; title: string; content: string } | null>(null);
    const [shareChannelId, setShareChannelId] = useState<string>('general');
    const [shareChannelPassword, setShareChannelPassword] = useState<string>('');
    const [shareChannelError, setShareChannelError] = useState<string | null>(null);

    // Listas Section States
    const [listasSubTab, setListasSubTab] = useState<'admin' | 'quarterly'>('admin');
    const [listasFilter, setListasFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
    const [listasSearch, setListasSearch] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
    const [quarterlyModal, setQuarterlyModal] = useState<{ isOpen: boolean; item: ProjectQuarterlyPriority | null }>({ isOpen: false, item: null });
    const [qTitle, setQTitle] = useState('');
    const [qDesc, setQDesc] = useState('');
    const [qQuarter, setQQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
    const [qPriority, setQPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
    const [qImpact, setQImpact] = useState<'Alto' | 'Medio' | 'Bajo'>('Alto');
    const [qOwner, setQOwner] = useState('');
    const [qStatus, setQStatus] = useState<'planning' | 'in_progress' | 'completed' | 'on_hold'>('planning');

    // Inline Task Creation for Listas Admin
    const [inlineTaskText, setInlineTaskText] = useState('');
    const [inlineTaskPriority, setInlineTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [inlineTaskAssignee, setInlineTaskAssignee] = useState('');
    
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

    // Expenses & Time Tracking States
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseFilter, setExpenseFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
    
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
    
    // Chat States
    const [chatText, setChatText] = useState('');
    const [chatSearch, setChatSearch] = useState('');
    const [replyingToMessage, setReplyingToMessage] = useState<ProjectChatMessage | null>(null);
    const [showDocPickerInChat, setShowDocPickerInChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Communication & Channels States
    const [selectedChannelId, setSelectedChannelId] = useState<string>('general');
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDescription, setNewChannelDescription] = useState('');
    const [newChannelEmoji, setNewChannelEmoji] = useState('#');
    const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);

    // Channel Edit/Delete States
    const [editingChannel, setEditingChannel] = useState<ProjectChannel | null>(null);
    const [editingChannelName, setEditingChannelName] = useState('');
    const [editingChannelDescription, setEditingChannelDescription] = useState('');
    const [editingChannelEmoji, setEditingChannelEmoji] = useState('#');
    const [editingChannelIsPrivate, setEditingChannelIsPrivate] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState<ProjectChannel | null>(null);

    // Team Polls States
    const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
    const [newPollQuestion, setNewPollQuestion] = useState('');
    const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
    const [newPollAllowMultiple, setNewPollAllowMultiple] = useState(false);

    // Pinned Filter State
    const [showPinnedOnly, setShowPinnedOnly] = useState(false);

    // Global Huddle Integration from Context
    const {
        activeHuddle,
        isHuddleActive: isGlobalHuddleActive,
        startHuddle,
        leaveHuddle,
        isMicOn,
        isVideoOn,
        isScreenSharing,
        toggleMic,
        toggleVideo,
        toggleScreenShare,
        localStream,
        screenStream,
        localVolume,
        speakingParticipants,
        huddleParticipants,
        isHuddleFullScreen,
        setIsHuddleFullScreen,
    } = useHuddle();

    const [showHuddleParticipants, setShowHuddleParticipants] = useState(false);

    // Thread (Hilo) States
    const [activeThreadMessage, setActiveThreadMessage] = useState<ProjectChatMessage | null>(null);
    const [threadInputText, setThreadInputText] = useState<string>('');

    // Private Channel Password States
    const [newChannelPassword, setNewChannelPassword] = useState<string>('');
    const [editingChannelPassword, setEditingChannelPassword] = useState<string>('');
    const [unlockedChannels, setUnlockedChannels] = useState<Record<string, boolean>>({});
    const [passwordPromptChannel, setPasswordPromptChannel] = useState<ProjectChannel | null>(null);
    const [inputPassword, setInputPassword] = useState<string>('');

    // Document View, Preview & Channel Share States
    const [docViewMode, setDocViewMode] = useState<'grid' | 'table'>('grid');
    const [docSearchText, setDocSearchText] = useState<string>('');
    const [shareDocModal, setShareDocModal] = useState<{ isOpen: boolean; doc: ProjectDoc | null }>({ isOpen: false, doc: null });
    const [shareTargetChannelId, setShareTargetChannelId] = useState<string>('general');
    const [shareComment, setShareComment] = useState<string>('');
    const [shareError, setShareError] = useState<string | null>(null);
    const [previewDocModal, setPreviewDocModal] = useState<ProjectDoc | null>(null);

    // Sprint Detail & Share Update States
    const [viewSprintModal, setViewSprintModal] = useState<Sprint | null>(null);
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [shareUpdateModal, setShareUpdateModal] = useState<{ isOpen: boolean; title: string; updateText: string } | null>(null);

    // Custom Lists & Task Thread States
    const [selectedListId, setSelectedListId] = useState<string>('all');
    const [createListModal, setCreateListModal] = useState<{ isOpen: boolean; templateType: string }>({ isOpen: false, templateType: 'project_tracking' });
    const [newListTitle, setNewListTitle] = useState<string>('');
    const [newListDescription, setNewListDescription] = useState<string>('');
    const [activeTaskThreadItem, setActiveTaskThreadItem] = useState<{ listId: string; item: ProjectListItem } | null>(null);
    const [listThreadCommentText, setListThreadCommentText] = useState<string>('');
    const [listCustomView, setListCustomView] = useState<'all' | 'priority' | 'assigned_to_me' | 'due_date' | 'status'>('all');
    const [newItemTitle, setNewItemTitle] = useState<string>('');
    const [newItemAssignee, setNewItemAssignee] = useState<string>('');
    const [newItemDueDate, setNewItemDueDate] = useState<string>('');
    const [newItemPriority, setNewItemPriority] = useState<Priority>('medium');
    const [isAddBoardTaskModalOpen, setIsAddBoardTaskModalOpen] = useState<boolean>(false);
    const [assignListTodoId, setAssignListTodoId] = useState<string | null>(null);

    // Bandeja de Novedades y Anuncios States
    const [inboxModalOpen, setInboxModalOpen] = useState(false);
    const [inboxFormTitle, setInboxFormTitle] = useState('');
    const [inboxFormText, setInboxFormText] = useState('');
    const [inboxFormType, setInboxFormType] = useState<'announcement' | 'idea' | 'alert' | 'note'>('announcement');
    const [inboxFormPriority, setInboxFormPriority] = useState<'normal' | 'high'>('normal');

    // Team Search State
    const [memberSearchText, setMemberSearchText] = useState<string>('');

    // Simulated Typing Statuses
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

    // Auto fallback to first active project
    const activeProject = useMemo(() => {
        if (activeProjectId) {
            const found = projects.find(p => p.id === activeProjectId);
            if (found) return found;
        }
        const activeList = projects.filter(p => !p.is_archived);
        return activeList.length > 0 ? activeList[0] : (projects.length > 0 ? projects[0] : null);
    }, [projects, activeProjectId]);

    const [searchedUsers, setSearchedUsers] = useState<{name: string, email: string, avatar?: string}[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    useEffect(() => {
        const searchForUsers = async () => {
            const term = inviteEmail.trim().toLowerCase();
            if (!term) {
                setSearchedUsers([]);
                return;
            }
            setIsSearchingUsers(true);
            
            try {
                // Fetch real users using the RPC function (requires 'search_users' function in Supabase)
                const { data, error } = await supabase.rpc('search_users', { search_term: term });
                if (!error && data && Array.isArray(data)) {
                    setSearchedUsers(data);
                    setIsSearchingUsers(false);
                    return;
                }
            } catch (e) {
                console.warn('RPC search_users not found or failed, using fallback.');
            }

            // Fallback: search across all known members from projects
            const usersMap = new Map<string, {name: string, email: string, avatar?: string}>();
            projects.forEach(p => {
                if (p.members) {
                    p.members.forEach(m => {
                        if (m.email && m.email !== currentUserEmail && (m.email.toLowerCase().includes(term) || m.name.toLowerCase().includes(term))) {
                            usersMap.set(m.email, { name: m.name, email: m.email, avatar: m.avatar });
                        }
                    });
                }
            });

            setSearchedUsers(Array.from(usersMap.values()));
            setIsSearchingUsers(false);
        };

        const timeout = setTimeout(searchForUsers, 300);
        return () => clearTimeout(timeout);
    }, [inviteEmail, projects]);

    const filteredInviteUsers = searchedUsers;

    const currentUserEmail = currentUser?.email || 'usuario@local.com';
    const currentUserName = currentUser?.user_metadata?.full_name || currentUserEmail.split('@')[0] || 'Tú';

    const projectOwnerEmail = useMemo(() => {
        if (!activeProject) return currentUserEmail;
        if (activeProject.owner_email && activeProject.owner_email.includes('@')) {
            return activeProject.owner_email;
        }
        if (activeProject.members && Array.isArray(activeProject.members)) {
            const ownerMem = activeProject.members.find(m => typeof m !== 'string' && m.role === 'owner' && m.email);
            if (ownerMem && typeof ownerMem !== 'string' && ownerMem.email) {
                return ownerMem.email;
            }
        }
        const relatedInv = invitations.find(i => i.project_id === activeProject.id && (i.inviter_email || i.sender_email));
        if (relatedInv && (relatedInv.inviter_email || relatedInv.sender_email)) {
            return relatedInv.inviter_email || relatedInv.sender_email!;
        }
        if (currentUser?.id && activeProject.user_id === currentUser.id) {
            return currentUserEmail;
        }
        if (activeProject.user_id && activeProject.user_id.includes('@')) {
            return activeProject.user_id;
        }
        return currentUserEmail;
    }, [activeProject, currentUser, currentUserEmail, invitations]);

    const isProjectCreator = useMemo(() => {
        if (!activeProject) return true;
        if (currentUserEmail && projectOwnerEmail) {
            if (currentUserEmail.toLowerCase() === projectOwnerEmail.toLowerCase()) return true;
        }
        if (currentUser?.id && activeProject.user_id === currentUser.id && (!activeProject.owner_email || activeProject.owner_email.toLowerCase() === currentUserEmail.toLowerCase())) {
            return true;
        }
        return false;
    }, [activeProject, currentUser, currentUserEmail, projectOwnerEmail]);

    // Unread Channel Messages Logic
    const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem(`channel_last_read_${currentUserEmail}`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        if (activeTab === 'chat' && selectedChannelId && currentUserEmail) {
            setLastReadTimes(prev => {
                const updated = { ...prev, [selectedChannelId]: new Date().toISOString() };
                localStorage.setItem(`channel_last_read_${currentUserEmail}`, JSON.stringify(updated));
                return updated;
            });
        }
    }, [activeTab, selectedChannelId, currentUserEmail]);

    const unreadChatMessagesCount = useMemo(() => {
        if (!activeProject || !activeProject.chat_messages) return 0;
        return activeProject.chat_messages.filter(m => {
            const chanId = m.channel_id || 'general';
            const lastRead = lastReadTimes[chanId];
            if (m.sender_email === currentUserEmail) return false;
            if (!lastRead) return true;
            return m.created_at > lastRead;
        }).length;
    }, [activeProject, lastReadTimes, currentUserEmail]);

    const realMembers = useMemo(() => {
        if (!activeProject) return [];
        const rawMembers = activeProject.members || [];
        const map = new Map<string, ProjectMember>();

        // 1. Put the real Owner / Creator first
        const ownerName = activeProject.owner_name || projectOwnerEmail.split('@')[0];
        const ownerDisplayName = isProjectCreator ? `${currentUserName} (Creador)` : `${ownerName} (Creador)`;

        map.set(projectOwnerEmail.toLowerCase(), {
            id: 'owner',
            name: ownerDisplayName,
            email: projectOwnerEmail,
            role: 'owner'
        });

        // 2. Add all members from activeProject.members
        rawMembers.forEach(m => {
            const mEmail = typeof m === 'string' ? m : m.email;
            if (mEmail && mEmail.trim()) {
                const key = mEmail.toLowerCase().trim();
                if (key !== projectOwnerEmail.toLowerCase() && !map.has(key)) {
                    const memberName = typeof m === 'string' 
                        ? (mEmail.toLowerCase() === currentUserEmail.toLowerCase() ? currentUserName : mEmail.split('@')[0])
                        : (m.name || (m.email?.toLowerCase() === currentUserEmail.toLowerCase() ? currentUserName : m.email?.split('@')[0] || 'Colaborador'));
                    
                    map.set(key, {
                        id: typeof m === 'string' ? mEmail : (m.id || mEmail),
                        name: memberName,
                        email: mEmail,
                        role: typeof m === 'string' ? 'member' : (m.role === 'owner' ? 'member' : (m.role || 'member'))
                    });
                }
            }
        });

        // 3. If current user is not creator and not in map, add current user as member
        if (!isProjectCreator && currentUserEmail && !map.has(currentUserEmail.toLowerCase())) {
            map.set(currentUserEmail.toLowerCase(), {
                id: currentUser?.id || currentUserEmail,
                name: currentUserName,
                email: currentUserEmail,
                role: 'member'
            });
        }

        // 4. Also check invitations for this project (both pending and accepted)
        (invitations || []).forEach(inv => {
            if (inv.project_id === activeProject.id) {
                const invitee = (inv.invitee_email || inv.receiver_email || '').toLowerCase().trim();
                if (invitee && invitee !== projectOwnerEmail.toLowerCase() && !map.has(invitee)) {
                    map.set(invitee, {
                        id: invitee,
                        name: invitee === currentUserEmail.toLowerCase() ? currentUserName : invitee.split('@')[0],
                        email: invitee,
                        role: inv.status === 'accepted' ? 'member' : 'pending'
                    });
                }
            }
        });

        return Array.from(map.values());
    }, [activeProject, currentUserEmail, currentUserName, projectOwnerEmail, isProjectCreator, currentUser, invitations]);

    const activeChannels = useMemo(() => {
        if (!activeProject) return [];
        if (!activeProject.channels || activeProject.channels.length === 0) {
            return [
                { id: 'general', project_id: activeProject.id, name: 'general', description: 'Canal principal para charlar de todo un poco', emoji: '💬', is_private: false, created_at: activeProject.created_at },
                { id: 'ideas', project_id: activeProject.id, name: 'ideas', description: 'Tormenta de ideas y sugerencias del proyecto', emoji: '💡', is_private: false, created_at: activeProject.created_at },
                { id: 'anuncios', project_id: activeProject.id, name: 'anuncios', description: 'Notificaciones oficiales del proyecto', emoji: '📢', is_private: false, created_at: activeProject.created_at },
                { id: 'privado', project_id: activeProject.id, name: 'privado', description: 'Conversaciones privadas entre líderes', emoji: '🔒', is_private: true, created_at: activeProject.created_at }
            ];
        }
        return activeProject.channels;
    }, [activeProject]);

    const activePolls = useMemo(() => {
        if (!activeProject) return [];
        return activeProject.polls || [];
    }, [activeProject]);

    const activeHuddles = useMemo(() => {
        if (!activeProject) return [];
        return activeProject.huddles || [];
    }, [activeProject]);

    // Listen for global huddle-ended events to synchronize project huddle state immediately
    React.useEffect(() => {
        const handleHuddleEnded = (e: any) => {
            const detail = e.detail;
            if (activeProject && detail && (detail.projectId === activeProject.id || !detail.projectId)) {
                const currentHuddles = activeProject.huddles || [];
                const updatedHuddles = currentHuddles.map(h => 
                    (!detail.channelId || h.channel_id === detail.channelId)
                        ? { ...h, active: false, participants: [] }
                        : h
                );
                onUpdateProject(activeProject.id, { huddles: updatedHuddles });
            }
        };

        window.addEventListener('huddle-ended', handleHuddleEnded);
        return () => {
            window.removeEventListener('huddle-ended', handleHuddleEnded);
        };
    }, [activeProject, onUpdateProject]);

    // Handle channel selection synchronization
    React.useEffect(() => {
        if (activeChannels.length > 0) {
            const exists = activeChannels.some(c => c.id === selectedChannelId);
            if (!exists) {
                setSelectedChannelId(activeChannels[0].id);
            }
        } else {
            setSelectedChannelId('general');
        }
    }, [activeProject, activeChannels]);

    // Scroll to bottom when opening chat or changing channel
    React.useEffect(() => {
        if (activeTab === 'chat') {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }, 100);
        }
    }, [activeTab, selectedChannelId]);

    // Typing effect simulation (disabled to keep it real)
    React.useEffect(() => {
        // Typing simulation disabled as requested
    }, []);

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

    // Helper: Open Share Document in Channel Modal
    const handleOpenShareDoc = (doc: ProjectDoc) => {
        setShareDocModal({ isOpen: true, doc });
        setShareTargetChannelId(selectedChannelId || 'general');
        setShareChannelPassword('');
        setShareComment('');
        setShareError(null);
    };

    // Helper: Execute Share Document into Channel
    const handleConfirmShareDoc = () => {
        if (!activeProject || !shareDocModal.doc) return;
        const targetChannel = (activeProject.channels || []).find(c => c.id === shareTargetChannelId);
        
        // Password verification for private channel (always required when sharing to private channel)
        if (targetChannel && targetChannel.is_private) {
            const reqPass = targetChannel.password || '1234';
            if (shareChannelPassword !== reqPass) {
                setShareError('Contraseña del canal privado requerida o incorrecta.');
                return;
            }
        }

        const doc = shareDocModal.doc;
        const folder = (activeProject.doc_folders || []).find(f => f.id === doc.folder_id);
        const formattedSize = doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Nota de Texto';

        const newMessage: ProjectChatMessage = {
            id: crypto.randomUUID(),
            project_id: activeProject.id,
            channel_id: shareTargetChannelId,
            sender_name: currentUserName,
            sender_email: currentUserEmail,
            text: shareComment.trim() 
                ? `${shareComment.trim()}\n\n📄 **Documento compartido:** [${doc.title}]`
                : `Ha compartido una referencia del documento: **${doc.title}**`,
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
        setShareDocModal({ isOpen: false, doc: null });
        setSelectedChannelId(shareTargetChannelId);
        setActiveTab('chat');
    };

    // Helper: Execute Share Sprint / Roadmap Update into Channel
    const handleConfirmShareUpdate = () => {
        if (!activeProject || !shareUpdateModal) return;
        const targetChannel = (activeProject.channels || []).find(c => c.id === shareTargetChannelId);
        
        // Password verification for private channel (always required when sharing to private channel)
        if (targetChannel && targetChannel.is_private) {
            const reqPass = targetChannel.password || '1234';
            if (shareChannelPassword !== reqPass) {
                setShareError('Contraseña del canal privado requerida o incorrecta.');
                return;
            }
        }

        const newMessage: ProjectChatMessage = {
            id: crypto.randomUUID(),
            project_id: activeProject.id,
            channel_id: shareTargetChannelId,
            sender_name: currentUser?.name || 'Usuario',
            sender_email: currentUserEmail,
            text: shareComment.trim() 
                ? `${shareComment.trim()}\n\n${shareUpdateModal.updateText}`
                : shareUpdateModal.updateText,
            created_at: new Date().toISOString()
        };

        const updatedChat = [...(activeProject.chat_messages || []), newMessage];
        onUpdateProject(activeProject.id, { chat_messages: updatedChat });
        setShareUpdateModal(null);
        setShareComment('');
        setShareError(null);
        setSelectedChannelId(shareTargetChannelId);
        setActiveTab('chat');
    };

    // Helper: Share a Todo Task to a Chat Channel
    const handleShareTask = (todo: Todo) => {
        const isDone = todo.completed;
        const col = todo.kanban_column || (isDone ? 'Completado' : 'Por hacer');
        const assignee = todo.assignee || todo.assigned_to;
        const assigneeText = assignee ? `@${assignee.split('@')[0]}` : 'Sin Asignar';
        const dueText = todo.due_date ? todo.due_date : 'Sin fecha límite';
        const priorityBadge = todo.priority === 'high' ? '🔴 Alta' : todo.priority === 'low' ? '🟢 Baja' : '🟡 Media';

        const updateText = `📌 **Tarea del Proyecto: ${todo.text}**\n• **Estado:** ${isDone ? '✅ Completada' : `📋 ${col}`}\n• **Responsable:** ${assigneeText}\n• **Fecha Límite:** ${dueText}\n• **Prioridad:** ${priorityBadge}`;

        setShareTargetChannelId(selectedChannelId || 'general');
        setShareChannelPassword('');
        setShareComment('');
        setShareError(null);
        setShareUpdateModal({
            isOpen: true,
            title: `Compartir Tarea: ${todo.text}`,
            updateText
        });
    };

    // Helper: Reference Document in Chat (Direct Shortcut)
    const handleReferenceDocInChat = (doc: ProjectDoc) => {
        handleOpenShareDoc(doc);
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
                created_by: currentUserEmail,
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
        if (name.includes('doc') || name.includes('word')) return <FileText className="w-5 h-5 text-blue-500" />;
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

    const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

    const renderProjectHeader = () => {
        if (!activeProject) {
            return (
                <div className="px-6 py-4 bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Proyectos</h1>
                    <button onClick={() => setIsCreateProjectModalOpen(true)} className="px-3 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg flex items-center gap-1.5 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Nuevo Proyecto
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 shadow-sm">
                {/* 1. TOP BROWSER-STYLE TABS */}
                <div className="flex items-center gap-1 px-4 pt-2 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-[#080808] overflow-x-auto scrollbar-hide">
                    {projects.map(p => {
                        const isActive = p.id === activeProject.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => onSelectProject(p.id)}
                                className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-t-lg transition-all border-t border-x shrink-0 max-w-[200px] ${
                                    isActive
                                        ? 'bg-white dark:bg-[#0c0c0c] text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 border-b-transparent shadow-[0_-1px_3px_rgba(0,0,0,0.03)] z-10'
                                        : 'bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 border-transparent hover:bg-gray-100/70 dark:hover:bg-gray-800/40'
                                }`}
                                title={p.name}
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                <span className="truncate">{p.name}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsCreateProjectModalOpen(true)}
                        className="p-1.5 mb-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors shrink-0"
                        title="Crear nuevo proyecto"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* 2. PROJECT SUBHEADER */}
                <div className="px-6 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-2.5">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">
                                    {activeProject.name}
                                </h1>
                                {activeProject.priority && (
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                        activeProject.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60' :
                                        activeProject.priority === 'low' ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/60' :
                                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                                    }`}>
                                        {activeProject.priority === 'high' ? 'Alta' : activeProject.priority === 'low' ? 'Baja' : 'Media'}
                                    </span>
                                )}
                            </div>
                            {activeProject.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl line-clamp-1 mt-0.5">{activeProject.description}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button 
                                onClick={() => setInboxModalOpen(true)}
                                className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                                title="Bandeja de Novedades y Anuncios"
                            >
                                <Inbox className="w-3.5 h-3.5 text-amber-500" /> Bandeja
                                {activeProject.inbox && activeProject.inbox.length > 0 && (
                                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                        {activeProject.inbox.length}
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => onOpenProjectEditor && onOpenProjectEditor(activeProject)} 
                                className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                            >
                                <Settings className="w-3.5 h-3.5" /> Ajustes
                            </button>
                            {isProjectCreator ? (
                                <button 
                                    onClick={() => {
                                        if(confirm(`¿Estás seguro de eliminar el proyecto "${activeProject.name}"? Solo el creador puede realizar esta acción.`)) {
                                            onDeleteProject(activeProject.id);
                                            onSelectProject(null);
                                        }
                                    }}
                                    className="p-1.5 text-xs border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center font-medium shadow-sm"
                                    title="Eliminar Proyecto (Solo Creador)"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <span 
                                    className="px-2 py-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-gray-700 cursor-not-allowed"
                                    title="Solo el creador del proyecto puede eliminarlo"
                                >
                                    <Lock className="w-3 h-3" />
                                    <span>Colaborador</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
                        {[
                            { id: 'overview', label: 'Resumen', icon: Activity },
                            { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                            { id: 'listas', label: 'Listas', icon: CheckSquareIcon, badge: (activeProject.lists?.length || 0) },
                            { id: 'sprints', label: 'Sprints', icon: Target },
                            { id: 'roadmap', label: 'Hoja de Ruta', icon: CalendarIcon },
                            { id: 'docs', label: 'Documentos', icon: FileText, badge: activeProject.docs?.length },
                            { id: 'chat', label: 'Canales', icon: MessageSquare, badge: unreadChatMessagesCount, isHuddle: isGlobalHuddleActive || (activeProject.huddles || []).some(h => h.active) },
                            { id: 'expenses', label: 'Gastos', icon: FileSpreadsheet, badge: activeProject.expenses?.length },
                            { id: 'time', label: 'Tiempo', icon: Clock, badge: activeProject.time_entries?.length },
                            { id: 'team', label: 'Equipo', icon: Users, badge: realMembers.length },
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
                                {tab.isHuddle && (
                                    <span className="absolute -top-0.5 right-0 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                )}
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
                            <button onClick={() => setInboxModalOpen(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                                Gestionar Bandeja →
                            </button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-80">
                            {(activeProject.inbox || []).slice(0, 6).map(item => (
                                <div key={item.id} className="p-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            {item.type === 'announcement' ? <Megaphone className="w-3.5 h-3.5 text-blue-500" /> :
                                             item.type === 'alert' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> :
                                             item.type === 'idea' ? <Sparkles className="w-3.5 h-3.5 text-amber-500" /> :
                                             <FileText className="w-3.5 h-3.5 text-gray-400" />}
                                            {item.title || 'Comunicado'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            {item.created_at ? format(parseISO(item.created_at), 'd MMM, HH:mm', { locale: es }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                                    {(item.author_name || item.created_by) && (
                                        <p className="text-[10px] text-gray-400">Publicado por {item.author_name || item.created_by?.split('@')[0]}</p>
                                    )}
                                </div>
                            ))}
                            {(!activeProject.inbox || activeProject.inbox.length === 0) && (
                                <div className="text-center py-8 text-xs text-gray-400 flex flex-col items-center gap-2">
                                    <Inbox className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                    <span>Sin novedades ni anuncios recientes.</span>
                                    <button
                                        onClick={() => setInboxModalOpen(true)}
                                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-1"
                                    >
                                        + Publicar primer anuncio
                                    </button>
                                </div>
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
        const columns = activeProject.kanban_columns || ['Por hacer', 'En progreso', 'Completado'];

        return (
            <div className="h-full flex overflow-x-auto p-6 gap-6 bg-gray-50/50 dark:bg-[#050505]">
                {columns.map((col) => {
                    const colTasks = projectTodos.filter(t => (t.kanban_column || 'Por hacer') === col);
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
                                        {(() => {
                                            const prio = todo.priority || 'medium';
                                            const prioLabel = prio === 'high' ? 'Prioridad Alta' : prio === 'low' ? 'Prioridad Baja' : 'Prioridad Media';
                                            const prioStyles = prio === 'high' 
                                                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800/60' 
                                                : prio === 'low'
                                                ? 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
                                            
                                            const listMatch = (activeProject?.lists || []).find(l => l.id === todo.list_id);

                                            return (
                                                <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between gap-2 text-[10px]">
                                                    <span className={`px-2 py-0.5 rounded font-medium border ${prioStyles}`}>
                                                        {prioLabel}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAssignListTodoId(todo.id);
                                                        }}
                                                        className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 px-2 py-0.5 rounded transition-colors flex items-center gap-1 font-medium border border-gray-200 dark:border-gray-800"
                                                        title="Añadir a una lista"
                                                    >
                                                        <List className="w-3 h-3 text-gray-400" />
                                                        <span className="max-w-[100px] truncate">{listMatch ? listMatch.name : 'Añadir a Lista'}</span>
                                                    </button>
                                                </div>
                                            );
                                        })()}
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

    // Helper to broadcast announcements directly into chat channels
    const broadcastToChannel = (messageText: string) => {
        if (!activeProject) return;
        const targetChan = selectedChannelId || 'general';
        const newMsg: ProjectChatMessage = {
            id: crypto.randomUUID(),
            project_id: activeProject.id,
            channel_id: targetChan,
            sender_name: 'Sistema',
            sender_email: 'sistema@workspace.local',
            text: messageText,
            created_at: new Date().toISOString()
        };
        const currentMsgs = activeProject.chat_messages || [];
        onUpdateProject(activeProject.id, { chat_messages: [...currentMsgs, newMsg] });
    };

    // SPRINTS TAB
    const renderSprints = () => {
        if (!activeProject) return null;
        const sprints = activeProject.sprints || [];

        // If a specific sprint is selected, render inline sprint detail workspace
        const currentSprint = selectedSprintId ? sprints.find(s => s.id === selectedSprintId) : null;
        if (selectedSprintId && currentSprint) {
            const sprintTasks = projectTodos.filter(t => t.sprint_id === currentSprint.id);
            const backlogTasks = projectTodos.filter(t => !t.sprint_id);
            const completedTasks = sprintTasks.filter(t => t.completed).length;
            const totalTasks = sprintTasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
                <div className="p-8 max-w-6xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6 font-sans">
                    {/* Top Navigation Back & Sprint Title */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedSprintId(null)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                            >
                                <ChevronLeft className="w-4 h-4" /> Volver a Sprints
                            </button>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{currentSprint.name}</h2>
                                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                                        currentSprint.status === 'active' ? 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100' :
                                        currentSprint.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                        'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400'
                                    }`}>
                                        {currentSprint.status === 'active' ? '● En Curso' : currentSprint.status === 'completed' ? '✓ Completado' : 'Planificación'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">Fechas: {currentSprint.start_date || 'Sin inicio'} - {currentSprint.end_date || 'Sin fin'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const text = `📌 **Sprint: ${currentSprint.name}**\n• Progreso: ${completedTasks}/${totalTasks} tareas (${progress}%)\n• Tareas completadas: ${completedTasks} de ${totalTasks}`;
                                    setShareTargetChannelId(selectedChannelId || 'general');
                                    setShareChannelPassword('');
                                    setShareComment('');
                                    setShareError(null);
                                    setShareUpdateModal({ isOpen: true, title: `Compartir Sprint: ${currentSprint.name}`, updateText: text });
                                }}
                                className="px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 shadow-2xs"
                            >
                                <Share2 className="w-3.5 h-3.5 text-blue-500" /> Compartir en Canal
                            </button>
                            <button
                                onClick={() => setSprintModal({ isOpen: true, sprint: currentSprint })}
                                className="px-3.5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Editar Sprint
                            </button>
                        </div>
                    </div>

                    {/* Sprint Goal & Progress Card */}
                    <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-4">
                        {currentSprint.goal && (
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                <strong className="font-bold text-gray-900 dark:text-white block mb-0.5">🎯 Objetivo del Sprint:</strong>
                                {currentSprint.goal}
                            </p>
                        )}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium text-gray-500">
                                <span>Progreso de Tareas ({completedTasks} / {totalTasks} tareas)</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Tareas del Sprint & Backlog Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sprint Tasks */}
                        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-emerald-500" /> Tareas del Sprint ({sprintTasks.length})
                                </h3>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={sprintTaskText}
                                    onChange={(e) => setSprintTaskText(e.target.value)}
                                    placeholder="Nueva tarea del sprint..."
                                    className="flex-1 text-xs p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-blue-500 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSprintTask(e)}
                                />
                                <button
                                    onClick={(e) => handleAddSprintTask(e)}
                                    className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                                >
                                    Añadir
                                </button>
                            </div>

                            {sprintTasks.length === 0 ? (
                                <p className="text-xs text-gray-400 py-6 text-center">No hay tareas asignadas a este sprint todavía. Añade desde el backlog abajo.</p>
                            ) : (
                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                    {sprintTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 dark:bg-zinc-900/40 border border-gray-100 dark:border-gray-800 text-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={task.completed}
                                                    onChange={() => updateTodo(task.id, { completed: !task.completed })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
                                                />
                                                <span className={`truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                                                    {task.text}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        updateTodo(task.id, { sprint_id: null as any });
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                    title="Quitar del sprint"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Backlog / Available Tasks */}
                        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-500" /> Tareas Disponibles (Backlog)
                                </h3>
                            </div>

                            {backlogTasks.length === 0 ? (
                                <p className="text-xs text-gray-400 py-6 text-center">No hay tareas pendientes en el backlog general.</p>
                            ) : (
                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                    {backlogTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 dark:bg-zinc-900/40 border border-gray-100 dark:border-gray-800 text-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="truncate text-gray-800 dark:text-gray-200 font-medium">
                                                    {task.text}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    updateTodo(task.id, { sprint_id: currentSprint.id });
                                                }}
                                                className="px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-black text-[11px] font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-2xs shrink-0"
                                            >
                                                + Añadir al Sprint
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-8 max-w-6xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Planificación de Sprints</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Iteraciones ágiles, asignación de tareas, capacidad de equipo y seguimiento en tiempo real.</p>
                    </div>
                    <button onClick={() => setSprintModal({ isOpen: true, sprint: null })} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-sm">
                        <Plus className="w-4 h-4" /> Crear Sprint
                    </button>
                </div>

                {sprints.length === 0 ? renderEmptyState('No hay Sprints configurados', 'Organiza el trabajo del equipo en iteraciones de 1 o 2 semanas.') : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sprints.map(sprint => {
                            const sprintTasks = projectTodos.filter(t => t.sprint_id === sprint.id);
                            const completedTasks = sprintTasks.filter(t => t.completed).length;
                            const totalTasks = sprintTasks.length;
                            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                            const handleShareSprintProgress = () => {
                                const text = `📌 **Actualización de Sprint: ${sprint.name}**\n• Estado: ${sprint.status === 'active' ? '● En Curso' : sprint.status === 'completed' ? '✓ Completado' : 'En Planificación'}\n• Progreso: ${completedTasks}/${totalTasks} tareas (${progress}%)\n• Tareas Completadas: ${completedTasks} de ${totalTasks}`;
                                setShareTargetChannelId(selectedChannelId || 'general');
                                setShareChannelPassword('');
                                setShareComment('');
                                setShareError(null);
                                setShareUpdateModal({
                                    isOpen: true,
                                    title: `Compartir Sprint: ${sprint.name}`,
                                    updateText: text
                                });
                            };

                            return (
                                <div key={sprint.id} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-6 shadow-xs space-y-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{sprint.name}</h3>
                                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                                                sprint.status === 'active' ? 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100' :
                                                sprint.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                                'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400'
                                            }`}>
                                                {sprint.status === 'active' ? '● En Curso' : sprint.status === 'completed' ? '✓ Completado' : 'Planificación'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedSprintId(sprint.id)}
                                                className="px-3 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <Layers className="w-3.5 h-3.5" /> Entrar al Sprint ({sprintTasks.length})
                                            </button>

                                            <button
                                                onClick={handleShareSprintProgress}
                                                className="p-1.5 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
                                                title="Publicar actualización en el canal"
                                            >
                                                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {sprint.goal && <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">{sprint.goal}</p>}

                                    {/* Progress */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-medium text-gray-500">
                                            <span>Progreso ({completedTasks} / {totalTasks} tareas)</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-xs text-gray-500">
                                        <span>📅 {sprint.start_date || 'Sin fecha'} → {sprint.end_date || 'Sin fecha'}</span>
                                        <div className="flex items-center gap-2">
                                            {sprint.status === 'planning' && (
                                                <button 
                                                    onClick={() => {
                                                        const updated = sprints.map(s => s.id === sprint.id ? { ...s, status: 'active' as const } : s);
                                                        onUpdateProject(activeProject.id, { sprints: updated });
                                                    }}
                                                    className="px-2.5 py-1 text-[11px] bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                                                >
                                                    Iniciar
                                                </button>
                                            )}
                                            {sprint.status === 'active' && (
                                                <button 
                                                    onClick={() => setCloseSprintModal({ isOpen: true, sprint })}
                                                    className="px-2.5 py-1 text-[11px] bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                                                >
                                                    Cerrar
                                                </button>
                                            )}
                                            <button onClick={() => setSprintModal({ isOpen: true, sprint })} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg">
                                                <Edit2 className="w-3.5 h-3.5" />
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

    // ROADMAP TAB
    const renderRoadmap = () => {
        if (!activeProject) return null;
        const milestones = activeProject.milestones || [];

        return (
            <div className="p-6 max-w-5xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Hoja de Ruta y Entregables</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Hitos estratégicos del proyecto, entregables clave y notificaciones en canales.</p>
                    </div>
                    <button onClick={() => setMilestoneModal({ isOpen: true, milestone: null })} className="px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Nuevo Hito
                    </button>
                </div>

                {milestones.length === 0 ? renderEmptyState('Hoja de ruta sin hitos', 'Establece los objetivos clave y entregables del proyecto.') : (
                    <div className="relative pl-6 border-l border-gray-200 dark:border-gray-800 space-y-6">
                        {milestones.map(ms => {
                            const handleShareMilestone = () => {
                                const text = `🚩 **Hito del Proyecto: ${ms.name}**\n• Categoría: ${ms.category || 'General'}\n• Estado: ${ms.status === 'completed' ? '✓ Completado' : ms.status === 'in_progress' ? '● En Progreso' : 'Planificado'}\n• Fecha Límite: ${ms.target_date || 'Por definir'}${ms.description ? `\n• Detalle: ${ms.description}` : ''}`;
                                setShareTargetChannelId(selectedChannelId || 'general');
                                setShareChannelPassword('');
                                setShareComment('');
                                setShareError(null);
                                setShareUpdateModal({
                                    isOpen: true,
                                    title: `Compartir Hito: ${ms.name}`,
                                    updateText: text
                                });
                            };

                            const handleStatusChange = (newStatus: 'pending' | 'in_progress' | 'completed') => {
                                const updated = milestones.map(m => m.id === ms.id ? { ...m, status: newStatus } : m);
                                onUpdateProject(activeProject.id, { milestones: updated });
                            };

                            return (
                                <div key={ms.id} className="relative group">
                                    <div className={`absolute -left-[31px] w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#050505] mt-1.5 ${
                                        ms.status === 'completed' ? 'bg-emerald-500' : ms.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'
                                    }`} />

                                    <div className="bg-white dark:bg-[#0a0a0a] p-4 rounded-xl border border-gray-200 dark:border-gray-800/80 shadow-sm flex flex-col gap-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{ms.name}</h3>
                                                <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                    {ms.category || 'General'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Status Selector Pills */}
                                                <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200 dark:border-gray-800">
                                                    <button
                                                        onClick={() => handleStatusChange('pending')}
                                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${ms.status === 'pending' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
                                                    >
                                                        Pendiente
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange('in_progress')}
                                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${ms.status === 'in_progress' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
                                                    >
                                                        En Progreso
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange('completed')}
                                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded ${ms.status === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-700'}`}
                                                    >
                                                        Completado
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={handleShareMilestone}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md transition-colors"
                                                    title="Notificar hito en el canal de chat"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </button>

                                                <button onClick={() => setMilestoneModal({ isOpen: true, milestone: ms })} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {ms.description && <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{ms.description}</p>}

                                        <div className="flex items-center gap-4 text-xs text-gray-500 font-medium pt-1">
                                            <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Fecha límite: {ms.target_date || 'Por definir'}</span>
                                            {ms.owner_email && <span>Responsable: {ms.owner_email}</span>}
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

    // DOCUMENTATION & FILES TAB (MINIMALIST & ELEGANT DESIGN)
    const renderDocs = () => {
        if (!activeProject) return null;
        const folders = activeProject.doc_folders || [];
        const docs = activeProject.docs || [];
        
        let filteredDocs = selectedFolderId ? docs.filter(d => d.folder_id === selectedFolderId) : docs;
        if (docSearchText.trim()) {
            const query = docSearchText.toLowerCase();
            filteredDocs = filteredDocs.filter(d => 
                d.title.toLowerCase().includes(query) || 
                (d.content && d.content.toLowerCase().includes(query)) ||
                (d.file_name && d.file_name.toLowerCase().includes(query))
            );
        }

        return (
            <div className="p-6 max-w-6xl mx-auto w-full h-full overflow-y-auto pb-20">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Documentos y Archivos</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Repositorio limpio de archivos, especificaciones y notas del proyecto.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Buscar documentos..."
                                value={docSearchText}
                                onChange={e => setDocSearchText(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-gray-400 text-gray-900 dark:text-white w-40 sm:w-52"
                            />
                            {docSearchText && (
                                <button onClick={() => setDocSearchText('')} className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200 dark:border-gray-800">
                            <button
                                onClick={() => setDocViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${docViewMode === 'grid' ? 'bg-white dark:bg-[#111] text-gray-900 dark:text-white shadow-xs' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                title="Vista en cuadrícula"
                            >
                                <Grid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setDocViewMode('table')}
                                className={`p-1.5 rounded-md transition-colors ${docViewMode === 'table' ? 'bg-white dark:bg-[#111] text-gray-900 dark:text-white shadow-xs' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                title="Vista en tabla"
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button onClick={() => setFolderModal({ isOpen: true, folder: null })} className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors">
                            <FolderPlus className="w-3.5 h-3.5" /> Nueva Carpeta
                        </button>
                        <button onClick={() => setDocModal({ isOpen: true, doc: null, initialFolderId: selectedFolderId || undefined })} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center gap-1.5 transition-colors shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Nueva Nota
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors">
                            <Paperclip className="w-3.5 h-3.5" /> Subir
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    </div>
                </div>

                {/* Folders Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-gray-200 dark:border-gray-800 scrollbar-hide">
                    <button 
                        onClick={() => setSelectedFolderId(null)} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                            selectedFolderId === null ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-xs' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Folder className="w-3.5 h-3.5" /> Todos ({docs.length})
                    </button>

                    {folders.map(f => {
                        const count = docs.filter(d => d.folder_id === f.id).length;
                        return (
                            <div key={f.id} className="relative group shrink-0">
                                <button
                                    onClick={() => setSelectedFolderId(f.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                                        selectedFolderId === f.id ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-xs' : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <FolderOpen className="w-3.5 h-3.5" /> {f.name} ({count})
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {filteredDocs.length === 0 ? renderEmptyState('No hay archivos ni documentos', 'Sube tus archivos o crea una nueva nota para comenzar.') : docViewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDocs.map(doc => {
                            const folder = folders.find(f => f.id === doc.folder_id);
                            const canDeleteDoc = !doc.created_by || doc.created_by.toLowerCase() === currentUserEmail.toLowerCase() || isProjectCreator;
                            return (
                                <div key={doc.id} className="bg-white dark:bg-[#0a0a0a] p-4 rounded-xl border border-gray-200 dark:border-gray-800/80 shadow-xs flex flex-col justify-between hover:border-gray-400 dark:hover:border-gray-600 transition-all group">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {getFileIcon(doc.file_type, doc.file_name)}
                                                <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate" title={doc.title}>{doc.title}</h3>
                                            </div>
                                            {folder && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border border-gray-200 dark:border-gray-700 shrink-0">
                                                    {folder.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">{doc.content || 'Sin contenido de vista previa'}</p>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Nota'}
                                            </span>
                                            <span className="text-[9px] text-gray-400">
                                                Por: {doc.created_by ? (doc.created_by.toLowerCase() === currentUserEmail.toLowerCase() ? 'Tú' : doc.created_by.split('@')[0]) : 'Creador'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => setPreviewDocModal(doc)}
                                                title="Previsualizar documento"
                                                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenShareDoc(doc)}
                                                title="Compartir en canal de chat"
                                                className="px-2 py-1 text-[11px] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 font-medium flex items-center gap-1 transition-colors"
                                            >
                                                <MessageSquare className="w-3 h-3 text-blue-500" /> Compartir
                                            </button>
                                            <button 
                                                onClick={() => handleDownloadFile(doc)}
                                                title="Descargar Archivo"
                                                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            {canDeleteDoc && (
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm(`¿Estás seguro de eliminar el documento "${doc.title}"?`)) {
                                                            const updated = (activeProject.docs || []).filter(d => d.id !== doc.id);
                                                            await onUpdateProject(activeProject.id, { docs: updated });
                                                        }
                                                    }}
                                                    title="Eliminar Documento"
                                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Table View */
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-gray-800/80 overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                                    <th className="py-2.5 px-4">Documento</th>
                                    <th className="py-2.5 px-4">Carpeta</th>
                                    <th className="py-2.5 px-4">Tamaño</th>
                                    <th className="py-2.5 px-4">Autor</th>
                                    <th className="py-2.5 px-4">Fecha</th>
                                    <th className="py-2.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-gray-700 dark:text-gray-300">
                                {filteredDocs.map(doc => {
                                    const folder = folders.find(f => f.id === doc.folder_id);
                                    const canDeleteDoc = !doc.created_by || doc.created_by.toLowerCase() === currentUserEmail.toLowerCase() || isProjectCreator;
                                    return (
                                        <tr key={doc.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="py-2.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getFileIcon(doc.file_type, doc.file_name)}
                                                    <span className="font-semibold text-gray-900 dark:text-white truncate max-w-xs">{doc.title}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-4">
                                                {folder ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border border-gray-200 dark:border-gray-700">
                                                        {folder.name}
                                                    </span>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-2.5 px-4 font-mono text-[11px] text-gray-500">
                                                {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Nota'}
                                            </td>
                                            <td className="py-2.5 px-4 text-gray-500 text-[11px]">
                                                {doc.created_by ? (doc.created_by.toLowerCase() === currentUserEmail.toLowerCase() ? 'Tú' : doc.created_by.split('@')[0]) : 'Creador'}
                                            </td>
                                            <td className="py-2.5 px-4 text-gray-500 text-[11px]">
                                                {doc.created_at ? format(parseISO(doc.created_at), 'dd/MM/yyyy') : '-'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => setPreviewDocModal(doc)}
                                                        title="Previsualizar"
                                                        className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenShareDoc(doc)}
                                                        title="Compartir en canal"
                                                        className="px-2 py-0.5 text-[10px] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    >
                                                        Compartir
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownloadFile(doc)}
                                                        title="Descargar"
                                                        className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    {canDeleteDoc && (
                                                        <button 
                                                            onClick={async () => {
                                                                if (confirm(`¿Estás seguro de eliminar el documento "${doc.title}"?`)) {
                                                                    const updated = (activeProject.docs || []).filter(d => d.id !== doc.id);
                                                                    await onUpdateProject(activeProject.id, { docs: updated });
                                                                }
                                                            }}
                                                            title="Eliminar"
                                                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // TEAM CHAT & CHANNELS TAB
    const renderChat = () => {
        if (!activeProject) return null;
        
        const messages = activeProject.chat_messages || [];
        const currentChannel = activeChannels.find(c => c.id === selectedChannelId) || activeChannels[0] || { id: 'general', name: 'general', emoji: '💬', description: 'Canal principal' };

        // Filter messages by channel (handling legacy messages without channel_id as 'general') and exclude thread replies
        let channelMessages = messages.filter(m => {
            const mChanId = m.channel_id || 'general';
            return mChanId === currentChannel.id && !m.thread_id;
        });

        // Filter messages by search if specified
        if (chatSearch) {
            channelMessages = channelMessages.filter(m => m.text.toLowerCase().includes(chatSearch.toLowerCase()));
        }

        // Filter pinned only if toggled
        if (showPinnedOnly) {
            channelMessages = channelMessages.filter(m => m.is_pinned);
        }

        const handleSendMessage = (e: React.FormEvent) => {
            e.preventDefault();
            if (!chatText.trim() && !replyingToMessage) return;

            const newMessage: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                sender_name: currentUserName,
                sender_email: currentUserEmail,
                text: chatText.trim(),
                created_at: new Date().toISOString(),
                reply_to: replyingToMessage ? {
                    id: replyingToMessage.id,
                    sender_name: replyingToMessage.sender_name,
                    text: replyingToMessage.text
                } : undefined
            };

            onUpdateProject(activeProject.id, { chat_messages: [...messages, newMessage] });
            
            // Check for mentions (@user or @todos) and trigger push notification if enabled
            if (chatText.includes('@') && pushPreferences?.channelMentions !== false) {
                sendPushNotification({
                    title: `💬 Mención en #${currentChannel.name || 'general'}`,
                    message: `Has sido mencionado en "${activeProject.name}": "${chatText.trim().substring(0, 75)}${chatText.trim().length > 75 ? '...' : ''}"`,
                    eventType: 'channelMentions'
                }, pushPreferences);
            }

            setChatText('');
            setReplyingToMessage(null);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };

        const handleSendThreadReply = (e: React.FormEvent) => {
            e.preventDefault();
            if (!threadInputText.trim() || !activeThreadMessage) return;

            const newReply: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                sender_name: currentUserName,
                sender_email: currentUserEmail,
                text: threadInputText.trim(),
                created_at: new Date().toISOString(),
                thread_id: activeThreadMessage.id
            };

            onUpdateProject(activeProject.id, { chat_messages: [...messages, newReply] });
            setThreadInputText('');
        };

        const handleCreateChannel = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newChannelName.trim()) return;

            const rawName = newChannelName.trim().toLowerCase();
            const cleanName = rawName.replace(/^#+/, '').replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
            if (!cleanName) {
                alert('Nombre de canal inválido. Usa letras, números, guiones y guiones bajos.');
                return;
            }

            const duplicate = activeChannels.some(c => c.id === cleanName);
            if (duplicate) {
                alert('Ya existe un canal con ese nombre.');
                return;
            }

            const newChan: ProjectChannel = {
                id: cleanName,
                project_id: activeProject.id,
                name: cleanName,
                description: newChannelDescription.trim() || undefined,
                emoji: '#',
                is_private: newChannelIsPrivate,
                password: newChannelIsPrivate ? newChannelPassword : undefined,
                created_at: new Date().toISOString()
            };

            const updatedChannels = [...activeChannels, newChan];
            
            // Post notification message in general about the new channel
            const systemMsg: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: 'general',
                sender_name: 'Sistema 🐥',
                sender_email: 'sistema@pollito.com',
                text: `✨ El canal #${cleanName} ha sido creado por Tú: "${newChannelDescription || 'Sin descripción'}"`,
                created_at: new Date().toISOString()
            };

            onUpdateProject(activeProject.id, { 
                channels: updatedChannels,
                chat_messages: [...messages, systemMsg]
            });

            // Auto-unlock for the creator
            setUnlockedChannels(prev => ({ ...prev, [cleanName]: true }));

            setSelectedChannelId(newChan.id);
            setNewChannelName('');
            setNewChannelDescription('');
            setNewChannelEmoji('#');
            setNewChannelIsPrivate(false);
            setNewChannelPassword('');
            setIsCreateChannelOpen(false);
        };

        const handleEditChannelSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!editingChannel || !editingChannelName.trim()) return;

            const rawName = editingChannelName.trim().toLowerCase();
            const cleanName = rawName.replace(/^#+/, '').replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
            if (!cleanName) {
                alert('Nombre de canal inválido. Usa letras, números, guiones y guiones bajos.');
                return;
            }

            const updatedChanId = cleanName;
            const updatedChan: ProjectChannel = {
                ...editingChannel,
                name: updatedChanId,
                description: editingChannelDescription.trim() || undefined,
                emoji: '#',
                is_private: editingChannelIsPrivate,
                password: editingChannelIsPrivate ? editingChannelPassword : undefined
            };

            const updatedChannels = activeChannels.map(c => c.id === editingChannel.id ? updatedChan : c);
            
            // Update messages' channel_id if the channel ID changed
            const updatedMessages = messages.map(m => m.channel_id === editingChannel.id ? { ...m, channel_id: updatedChanId } : m);

            onUpdateProject(activeProject.id, { 
                channels: updatedChannels,
                chat_messages: updatedMessages
            });

            if (selectedChannelId === editingChannel.id) {
                setSelectedChannelId(updatedChanId);
            }

            setEditingChannel(null);
        };

        const confirmDeleteChannel = (channel: ProjectChannel) => {
            if (channel.id === 'general') return;
            const updatedChannels = activeChannels.filter(c => c.id !== channel.id);
            const updatedMessages = messages.filter(m => m.channel_id !== channel.id);
            
            onUpdateProject(activeProject.id, { 
                channels: updatedChannels,
                chat_messages: updatedMessages
            });

            if (selectedChannelId === channel.id) {
                setSelectedChannelId('general');
            }
            setChannelToDelete(null);
        };

        const handleCreatePollSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newPollQuestion.trim()) return;
            
            const filteredOptions = newPollOptions.filter(o => o.trim() !== '');
            if (filteredOptions.length < 2) {
                alert('Por favor, ingresa al menos 2 opciones.');
                return;
            }

            const pollId = crypto.randomUUID();
            const newPoll: ProjectPoll = {
                id: pollId,
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                question: newPollQuestion.trim(),
                options: filteredOptions.map((text, idx) => ({
                    id: `opt-${idx}`,
                    text: text.trim(),
                    voters: []
                })),
                allow_multiple: newPollAllowMultiple,
                created_by: currentUserName,
                created_at: new Date().toISOString()
            };

            const updatedPolls = [...activePolls, newPoll];
            
            const newMessage: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                sender_name: currentUserName,
                sender_email: currentUserEmail,
                text: `🗳️ ENCUESTA DE EQUIPO: ${newPollQuestion.trim()}\nResponde directamente haciendo clic en las opciones.`,
                created_at: new Date().toISOString(),
                poll_id: pollId
            };

            onUpdateProject(activeProject.id, {
                polls: updatedPolls,
                chat_messages: [...messages, newMessage]
            });

            setNewPollQuestion('');
            setNewPollOptions(['', '']);
            setNewPollAllowMultiple(false);
            setIsCreatePollOpen(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        };

        const handleVoteOption = (pollId: string, optionId: string) => {
            const userEmail = currentUserEmail;
            const updatedPolls = activePolls.map(poll => {
                if (poll.id !== pollId) return poll;

                const options = poll.options.map(opt => {
                    const hasVoted = opt.voters.includes(userEmail);
                    if (opt.id === optionId) {
                        return {
                            ...opt,
                            voters: hasVoted ? opt.voters.filter(v => v !== userEmail) : [...opt.voters, userEmail]
                        };
                    } else if (!poll.allow_multiple) {
                        // Clear vote from other options if single choice only
                        return {
                            ...opt,
                            voters: opt.voters.filter(v => v !== userEmail)
                        };
                    }
                    return opt;
                });

                return { ...poll, options };
            });

            onUpdateProject(activeProject.id, { polls: updatedPolls });
        };

        const handleReactToMessage = (messageId: string, emoji: string) => {
            const userEmail = currentUserEmail;
            const updatedMessages = messages.map(msg => {
                if (msg.id !== messageId) return msg;

                const reactions = { ...(msg.reactions || {}) };
                const voters = reactions[emoji] || [];
                const hasVoted = voters.includes(userEmail);

                if (hasVoted) {
                    reactions[emoji] = voters.filter(v => v !== userEmail);
                } else {
                    reactions[emoji] = [...voters, userEmail];
                }

                if (reactions[emoji].length === 0) {
                    delete reactions[emoji];
                }

                return { ...msg, reactions };
            });

            onUpdateProject(activeProject.id, { chat_messages: updatedMessages });
        };

        const handleTogglePinMessage = (messageId: string) => {
            const updatedMessages = messages.map(msg => {
                if (msg.id !== messageId) return msg;
                return { ...msg, is_pinned: !msg.is_pinned };
            });
            onUpdateProject(activeProject.id, { chat_messages: updatedMessages });
        };

        const isCurrentChannelHuddleActive = isGlobalHuddleActive && activeHuddle?.projectId === activeProject.id && activeHuddle?.channelId === currentChannel.id;

        const handleToggleHuddle = () => {
            if (isCurrentChannelHuddleActive) {
                leaveHuddle();
                const updatedHuddles = activeHuddles.map(h => h.channel_id === currentChannel.id ? { ...h, active: false, participants: [] } : h);
                onUpdateProject(activeProject.id, { huddles: updatedHuddles });
            } else {
                startHuddle(activeProject.id, activeProject.name, currentChannel.id, currentChannel.name, activeProject.emoji);
                const updatedHuddles = activeHuddles.some(h => h.channel_id === currentChannel.id)
                    ? activeHuddles.map(h => h.channel_id === currentChannel.id ? { ...h, active: true, started_at: new Date().toISOString(), participants: [{ name: currentUserName, email: currentUserEmail, has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing }] } : h)
                    : [...activeHuddles, { id: crypto.randomUUID(), project_id: activeProject.id, channel_id: currentChannel.id, active: true, started_at: new Date().toISOString(), participants: [{ name: currentUserName, email: currentUserEmail, has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing }] }];
                onUpdateProject(activeProject.id, { huddles: updatedHuddles });
            }
        };

        return (
            <div className="flex h-full bg-gray-50 dark:bg-[#050505] overflow-hidden">
                
                {/* 1. CHANNELS SIDEBAR */}
                <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c0c0c] flex flex-col justify-between shrink-0 h-full">
                    
                    <div className="flex-1 overflow-y-auto">
                        
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Canales de Equipo</span>
                            {isProjectCreator && (
                                <button 
                                    onClick={() => setIsCreateChannelOpen(true)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-blue-600 dark:text-blue-400"
                                    title="Crear nuevo canal"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Active Global Huddle Banner */}
                        {(isGlobalHuddleActive || activeHuddles.some(h => h.active)) && (
                            <div className="mx-3 my-2 p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Reunión en Curso</span>
                                </div>
                                <button 
                                    onClick={() => {
                                        if (isGlobalHuddleActive && activeHuddle) {
                                            setSelectedChannelId(activeHuddle.channelId);
                                        } else {
                                            const runningHuddle = activeHuddles.find(h => h.active) || { channel_id: 'general' };
                                            setSelectedChannelId(runningHuddle.channel_id);
                                            startHuddle(activeProject.id, activeProject.name, runningHuddle.channel_id, runningHuddle.channel_id, activeProject.emoji);
                                        }
                                    }}
                                    className="w-full text-center py-1 text-[11px] bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors"
                                >
                                    {isCurrentChannelHuddleActive ? 'Huddle Activo 🎙️' : 'Unirse al Huddle 🎙️'}
                                </button>
                            </div>
                        )}

                        {/* Channels List */}
                        <div className="p-2 space-y-0.5">
                            {activeChannels.map(chan => {
                                const isSelected = chan.id === currentChannel.id;
                                const isChanHuddleActive = (activeHuddles.find(h => h.channel_id === chan.id)?.active) || (isGlobalHuddleActive && activeHuddle?.projectId === activeProject.id && activeHuddle?.channelId === chan.id);
                                
                                // Check dynamic unread status for the channel
                                const hasUnread = !isSelected && (activeProject.chat_messages || []).some(m => {
                                    if ((m.channel_id || 'general') !== chan.id) return false;
                                    if (m.sender_email === currentUserEmail) return false;
                                    const lastRead = lastReadTimes[chan.id];
                                    if (!lastRead) return true;
                                    return m.created_at > lastRead;
                                });

                                return (
                                    <div 
                                        key={chan.id}
                                        className={`group/chan flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-semibold' 
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                        onClick={() => {
                                            if (chan.is_private) {
                                                setUnlockedChannels(prev => ({ ...prev, [chan.id]: false }));
                                            }
                                            setSelectedChannelId(chan.id);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-gray-400 dark:text-gray-500 shrink-0">
                                                {chan.is_private ? <Lock className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                                            </span>
                                            <div className="truncate flex items-center gap-1">
                                                <span className="text-xs truncate">{chan.name}</span>
                                                {isChanHuddleActive && (
                                                    <span className="flex h-2 w-2 shrink-0 relative">
                                                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {hasUnread && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                            )}

                                            {/* Edit & Delete Action Triggers */}
                                            {chan.id !== 'general' && isProjectCreator && (
                                                <div className="hidden group-hover/chan:flex items-center gap-0.5">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingChannel(chan);
                                                            setEditingChannelName(chan.name);
                                                            setEditingChannelDescription(chan.description || '');
                                                            setEditingChannelEmoji(chan.emoji);
                                                            setEditingChannelIsPrivate(chan.is_private);
                                                            setEditingChannelPassword(chan.password || '');
                                                        }}
                                                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setChannelToDelete(chan);
                                                        }}
                                                        className="p-0.5 hover:bg-red-100 dark:hover:bg-red-950/50 rounded text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>

                    {/* Bottom Active User Profile Mini Card */}
                    <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/30 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">T</div>
                            <div className="truncate">
                                <p className="font-bold text-gray-800 dark:text-gray-200 truncate">Tú (Líder)</p>
                                <p className="text-[10px] text-gray-400 truncate">En línea</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CHAT WORKSPACE AREA & THREAD SIDEBAR CONTAINER */}
                <div className="flex-1 flex h-full overflow-hidden relative">

                    {/* MAIN CHAT WORKSPACE AREA */}
                    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#050505] overflow-hidden relative">
                        
                        {/* Channel Main Header */}
                        <div className="px-6 py-3.5 bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 shrink-0">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400 dark:text-gray-500 shrink-0">
                                        {currentChannel.is_private ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                                    </span>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentChannel.name}</h2>
                                </div>
                                {currentChannel.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{currentChannel.description}</p>
                                )}
                            </div>

                            {/* Channel Header Actions */}
                            <div className="flex items-center gap-2">
                                
                                {/* Toggle Pin Filter Button */}
                                <button 
                                    onClick={() => setShowPinnedOnly(prev => !prev)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                        showPinnedOnly 
                                            ? 'bg-amber-500 border-amber-600 text-white shadow-sm' 
                                            : 'bg-white dark:bg-[#111] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                    title="Filtrar por mensajes fijados"
                                >
                                    <Pin className="w-3.5 h-3.5" /> 
                                    <span className="hidden sm:inline">Pines ({messages.filter(m => m.channel_id === currentChannel.id && m.is_pinned).length})</span>
                                </button>

                                {/* Create Poll Trigger - hidden if locked */}
                                {!(currentChannel.is_private && currentChannel.password && !unlockedChannels[currentChannel.id]) && (
                                    <button 
                                        onClick={() => setIsCreatePollOpen(true)}
                                        className="px-2.5 py-1.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="hidden sm:inline">Nueva Encuesta</span>
                                    </button>
                                )}

                                {/* Huddle Live Meet Button - hidden if locked */}
                                {!(currentChannel.is_private && currentChannel.password && !unlockedChannels[currentChannel.id]) && (
                                    <button 
                                        onClick={handleToggleHuddle}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                                            isCurrentChannelHuddleActive 
                                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                : (activeHuddles.find(h => h.channel_id === currentChannel.id)?.active || (isGlobalHuddleActive && activeHuddle?.projectId === activeProject.id && activeHuddle?.channelId === currentChannel.id))
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        {isCurrentChannelHuddleActive ? 'Salir del Huddle' : (activeHuddles.find(h => h.channel_id === currentChannel.id)?.active) ? 'Unirse' : 'Iniciar Huddle'}
                                    </button>
                                )}

                            </div>
                        </div>

                        {/* In-channel live active call banner */}
                        {isCurrentChannelHuddleActive && (
                            <div className="mx-6 my-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-900/30 via-slate-900/50 to-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs text-white shadow-sm shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <div>
                                        <p className="font-bold text-emerald-300">Llamada Huddle en curso en este canal</p>
                                        <p className="text-[11px] text-gray-300">Puedes moverte a cualquier sección y la llamada permanecerá en el recuadro flotante interactivo.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsHuddleFullScreen(true)}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-white/10 flex items-center gap-1 transition-colors"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" /> Pantalla Completa
                                    </button>
                                    <button
                                        onClick={handleToggleHuddle}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Colgar 📞
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CONDITIONAL LOCK VIEW OR ACTIVE CONVERSATION VIEW */}
                        {currentChannel.is_private && !unlockedChannels[currentChannel.id] ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/40 dark:bg-black/10">
                                <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                                    Canal Privado Protegido
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
                                    Este canal es privado y requiere contraseña. Ingresa la clave de acceso para entrar.
                                </p>
                                <div className="w-full max-w-xs space-y-3">
                                    <input 
                                        type="password"
                                        placeholder="Ingresar contraseña..."
                                        value={inputPassword}
                                        onChange={e => setInputPassword(e.target.value)}
                                        className="w-full px-3.5 py-2 text-xs text-center bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white font-mono"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const reqPass = currentChannel.password || '1234';
                                                if (inputPassword === reqPass) {
                                                    setUnlockedChannels(prev => ({ ...prev, [currentChannel.id]: true }));
                                                    setInputPassword('');
                                                } else {
                                                    alert('Contraseña incorrecta. Inténtalo de nuevo.');
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => {
                                            const reqPass = currentChannel.password || '1234';
                                            if (inputPassword === reqPass) {
                                                setUnlockedChannels(prev => ({ ...prev, [currentChannel.id]: true }));
                                                setInputPassword('');
                                            } else {
                                                alert('Contraseña incorrecta. Inténtalo de nuevo.');
                                            }
                                        }}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                                    >
                                        Desbloquear Canal 🔓
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Messages Search Bar Inside Main Chat Workspace */}
                                <div className="px-6 py-2 bg-gray-50 dark:bg-black/30 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Mensajes en este canal:</span> 
                                        {channelMessages.length} total
                                    </div>
                                    <div className="relative w-64">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar en este canal..." 
                                            value={chatSearch} 
                                            onChange={e => setChatSearch(e.target.value)} 
                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-md focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* 4. MESSAGES STREAM */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    
                                    {channelMessages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 mb-3">
                                                <MessageSquare className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                                                Inicio del canal #{currentChannel.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {currentChannel.description || 'Este es el inicio de la conversación de este canal. ¡Saluda a tu equipo!'}
                                            </p>
                                        </div>
                                    ) : (
                                        channelMessages.map(msg => {
                                            const isSystem = msg.sender_name.includes('Sistema');
                                            const isUser = msg.sender_email === currentUserEmail;
                                            const reactions = msg.reactions || {};
                                            const isPinned = msg.is_pinned;

                                            // Determine thread replies count
                                            const repliesCount = messages.filter(m => m.thread_id === msg.id).length;

                                            // If message has a poll_id, locate the poll
                                            const poll = msg.poll_id ? activePolls.find(p => p.id === msg.poll_id) : null;

                                            return (
                                                <div 
                                                    key={msg.id} 
                                                    className={`flex items-start gap-3 group relative p-3 rounded-xl transition-all ${
                                                        isPinned 
                                                            ? 'bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30' 
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/10'
                                                    }`}
                                                >
                                                    
                                                    {/* Sender Avatar */}
                                                    <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-sm text-white ${
                                                        isSystem ? 'bg-amber-500' : isUser ? 'bg-blue-600' : 'bg-indigo-600'
                                                    }`}>
                                                        {msg.sender_name.charAt(0).toUpperCase()}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        
                                                        {/* Sender Metadata */}
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{isUser ? 'Tú' : msg.sender_name}</span>
                                                            <span className="text-[10px] text-gray-400">{format(parseISO(msg.created_at), 'HH:mm', { locale: es })}</span>
                                                            {isPinned && (
                                                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200/40">
                                                                    📌 Fijado
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Replying Context Bar */}
                                                        {msg.reply_to && (
                                                            <div className="p-2 mb-1.5 bg-gray-100 dark:bg-gray-800/60 rounded border-l-2 border-blue-500 text-[11px] text-gray-600 dark:text-gray-300">
                                                                <strong className="block text-[10px] text-blue-500">Respondiendo a {msg.reply_to.sender_email === currentUserEmail ? 'Tú' : msg.reply_to.sender_name}:</strong>
                                                                {msg.reply_to.text}
                                                            </div>
                                                        )}

                                                        {/* Message Bubble/Content */}
                                                        <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                                            {msg.text}
                                                        </div>

                                                        {/* 5. INTERACTIVE TEAM POLL CARD (If Poll is attached) */}
                                                        {poll && (
                                                            <div className="mt-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4 max-w-md shadow-sm">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <BarChart2 className="w-4 h-4 text-blue-500" />
                                                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{poll.question}</span>
                                                                </div>
                                                                
                                                                <p className="text-[10px] text-gray-400 mb-3">
                                                                    {poll.allow_multiple ? '● Opción Múltiple Permitida' : '● Opción Única'}
                                                                </p>

                                                                <div className="space-y-2.5">
                                                                    {poll.options.map(opt => {
                                                                        const totalPollVotes = poll.options.reduce((sum, o) => sum + o.voters.length, 0);
                                                                        const percentage = totalPollVotes > 0 ? Math.round((opt.voters.length / totalPollVotes) * 100) : 0;
                                                                        const userVoted = opt.voters.includes(currentUserEmail);

                                                                        return (
                                                                            <div 
                                                                                key={opt.id}
                                                                                onClick={() => handleVoteOption(poll.id, opt.id)}
                                                                                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all relative overflow-hidden group ${
                                                                                    userVoted 
                                                                                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                                                                                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] hover:border-gray-300'
                                                                                }`}
                                                                            >
                                                                                {/* Voting Progress Fill */}
                                                                                <div 
                                                                                    className={`absolute inset-y-0 left-0 transition-all duration-500 -z-0 ${
                                                                                        userVoted ? 'bg-blue-500/10' : 'bg-gray-100 dark:bg-gray-800/40'
                                                                                    }`} 
                                                                                    style={{ width: `${percentage}%` }} 
                                                                                />

                                                                                <div className="relative flex items-center justify-between z-10">
                                                                                    <span className={`font-semibold ${userVoted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                                                        {opt.text}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-gray-400 font-bold">{opt.voters.length} votos ({percentage}%)</span>
                                                                                </div>

                                                                                {/* Voter List Detail Tooltip-like Info */}
                                                                                {opt.voters.length > 0 && (
                                                                                    <div className="relative z-10 text-[9px] text-gray-400 mt-1 flex flex-wrap gap-1 items-center">
                                                                                        <span className="font-semibold text-gray-500">Votado por:</span>
                                                                                        {opt.voters.map((v, i) => (
                                                                                            <span key={i} className="px-1 py-0.2 bg-gray-100 dark:bg-gray-800 rounded">{v === currentUserEmail ? 'Tú' : v.split('@')[0]}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Referenced Documentation attachment card */}
                                                        {msg.doc_reference && (
                                                            <div className="mt-2.5 p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg flex items-center justify-between gap-3 max-w-sm">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    {getFileIcon(msg.doc_reference.file_type, msg.doc_reference.file_name)}
                                                                    <div className="truncate">
                                                                        <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">{msg.doc_reference.title}</h4>
                                                                        <span className="text-[10px] text-blue-600 dark:text-blue-400">{msg.doc_reference.folder_name} • {msg.doc_reference.file_size_formatted}</span>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => { setSelectedFolderId(null); setActiveTab('docs'); }}
                                                                    className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 shrink-0"
                                                                >
                                                                    Abrir
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Thread Replies Trigger Button */}
                                                        {repliesCount > 0 && (
                                                            <button 
                                                                onClick={() => setActiveThreadMessage(msg)}
                                                                className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/40 dark:border-blue-900/10 px-2.5 py-1 rounded-full w-fit transition-all"
                                                            >
                                                                <MessageSquare className="w-3 h-3" />
                                                                <span>{repliesCount} {repliesCount === 1 ? 'respuesta' : 'respuestas'}</span>
                                                            </button>
                                                        )}

                                                        {/* 6. REAL-TIME EMOJI REACTIONS BAR UNDER THE MESSAGE */}
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                            {/* Map and alternate interactive reactions */}
                                                            {['👍', '❤️', '🔥', '🎉', '🚀', '👀'].map(emoji => {
                                                                const voters = reactions[emoji] || [];
                                                                const hasReacted = voters.includes(currentUserEmail);
                                                                if (voters.length === 0) return null;

                                                                return (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleReactToMessage(msg.id, emoji)}
                                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${
                                                                            hasReacted 
                                                                                ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200' 
                                                                                : 'bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                                                        }`}
                                                                        title={`Reaccionado por: ${voters.join(', ')}`}
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span>{voters.length}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                    </div>

                                                    {/* 7. FLOATING ACTIONS & REACTION PICKER OVERLAY (SLACK STYLE) */}
                                                    <div className="absolute right-4 -top-3 hidden group-hover:flex items-center gap-1 bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-lg p-1 shadow-md z-20">
                                                        {/* Quick Reactions Selector */}
                                                        <div className="flex items-center gap-0.5 border-r border-gray-100 dark:border-gray-800/80 pr-1.5 mr-1">
                                                            {['👍', '❤️', '🔥', '🎉', '🚀', '👀'].map(emoji => {
                                                                const voters = reactions[emoji] || [];
                                                                const hasReacted = voters.includes(currentUserEmail);
                                                                return (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleReactToMessage(msg.id, emoji)}
                                                                        className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all text-xs ${hasReacted ? 'grayscale-0 scale-110' : 'grayscale hover:grayscale-0 hover:scale-110'}`}
                                                                        title={`Reaccionar con ${emoji}`}
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <button 
                                                            onClick={() => handleTogglePinMessage(msg.id)}
                                                            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${isPinned ? 'text-amber-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                                            title={isPinned ? 'Desfijar Mensaje' : 'Fijar Mensaje'}
                                                        >
                                                            <Pin className="w-3.5 h-3.5" />
                                                        </button>
                                                        
                                                        {/* Thread Reply Button */}
                                                        <button 
                                                            onClick={() => setActiveThreadMessage(msg)}
                                                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-600 transition-all"
                                                            title="Responder en hilo (Thread)"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button 
                                                            onClick={() => setReplyingToMessage(msg)}
                                                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-all"
                                                            title="Responder"
                                                        >
                                                            <Share2 className="w-3.5 h-3.5 rotate-180" />
                                                        </button>
                                                    </div>

                                                </div>
                                            );
                                        })
                                    )}

                                    <div ref={chatEndRef} />
                                </div>

                                {/* 8. TYPING STATUS INDICATOR */}
                                {typingUsers[currentChannel.id] && (
                                    <div className="px-6 py-1 bg-white dark:bg-black/30 text-[10px] text-gray-500 dark:text-gray-400 italic flex items-center gap-1.5 shrink-0 select-none">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                        </span>
                                        <span>{typingUsers[currentChannel.id]} está escribiendo...</span>
                                    </div>
                                )}

                                {/* 9. MESSAGE INPUT COMPONENT */}
                                <div className="p-4 bg-white dark:bg-[#0c0c0c] border-t border-gray-200 dark:border-gray-800 shrink-0">
                                    
                                    {/* Replying Context Bar */}
                                    {replyingToMessage && (
                                        <div className="mb-2 p-2 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg text-xs flex items-center justify-between">
                                            <div className="truncate">
                                                <span className="font-semibold text-gray-500">Respondiendo a: </span>
                                                <span className="font-bold text-gray-800 dark:text-gray-200">{replyingToMessage.sender_name}</span>
                                                <p className="text-gray-500 truncate mt-0.5">{replyingToMessage.text}</p>
                                            </div>
                                            <button onClick={() => setReplyingToMessage(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-400">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        
                                        {/* Insert note attachment quickpicker */}
                                        <button 
                                            type="button" 
                                            onClick={() => setActiveTab('docs')} 
                                            title="Referenciar un documento o nota" 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>

                                        <input 
                                            type="text" 
                                            placeholder={`Enviar un mensaje a #${currentChannel.name}...`} 
                                            value={chatText} 
                                            onChange={e => setChatText(e.target.value)} 
                                            className="flex-1 bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#111] transition-all"
                                        />

                                        <button 
                                            type="submit" 
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                                        >
                                            <Send className="w-3.5 h-3.5" /> Enviar
                                        </button>

                                    </form>
                                </div>
                            </>
                        )}

                    </div>

                    {/* THREAD SIDEBAR (LATERAL SLACK-STYLE PANEL) */}
                    {activeThreadMessage && (
                        <div className="w-80 sm:w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c0c0c] flex flex-col h-full z-30 shrink-0 relative animate-in slide-in-from-right duration-200 shadow-xl">
                            {/* Thread Header */}
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-black/10">
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hilo de conversación</h3>
                                    <span className="text-[10px] text-gray-400 font-semibold">#{currentChannel.name}</span>
                                </div>
                                <button 
                                    onClick={() => setActiveThreadMessage(null)}
                                    className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Scrollable replies feed & original message */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Original Message Card */}
                                <div className="p-3 bg-blue-50/10 dark:bg-blue-950/5 border border-blue-100/50 dark:border-blue-900/10 rounded-xl relative">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {activeThreadMessage.sender_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{activeThreadMessage.sender_email === currentUserEmail ? 'Tú' : activeThreadMessage.sender_name}</p>
                                            <p className="text-[8px] text-gray-400">{format(parseISO(activeThreadMessage.created_at), 'HH:mm', { locale: es })}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap pl-1">{activeThreadMessage.text}</p>
                                </div>

                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-gray-100 dark:border-gray-800/60"></div>
                                    <span className="flex-shrink mx-3 text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        {messages.filter(m => m.thread_id === activeThreadMessage.id).length} Respuestas
                                    </span>
                                    <div className="flex-grow border-t border-gray-100 dark:border-gray-800/60"></div>
                                </div>

                                {/* Thread replies stream */}
                                <div className="space-y-3">
                                    {messages.filter(m => m.thread_id === activeThreadMessage.id).map(reply => {
                                        return (
                                            <div key={reply.id} className="flex items-start gap-2.5 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/10 rounded-lg transition-all">
                                                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                                                    {reply.sender_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">{reply.sender_email === currentUserEmail ? 'Tú' : reply.sender_name}</span>
                                                        <span className="text-[8px] text-gray-400">{format(parseISO(reply.created_at), 'HH:mm', { locale: es })}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{reply.text}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Thread reply input */}
                            <div className="p-3 bg-gray-50 dark:bg-black/30 border-t border-gray-200 dark:border-gray-800 shrink-0">
                                <form onSubmit={handleSendThreadReply} className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Responder en este hilo..." 
                                        value={threadInputText} 
                                        onChange={e => setThreadInputText(e.target.value)} 
                                        className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#111] transition-all"
                                    />
                                    <button 
                                        type="submit" 
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                                    >
                                        <Send className="w-3 h-3" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                </div>

                {/* 10. CREATE CHANNEL DIALOG/MODAL */}
                {isCreateChannelOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl relative">
                            
                            <button 
                                onClick={() => setIsCreateChannelOpen(false)}
                                className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Crear Nuevo Canal</h3>
                            
                            <form onSubmit={handleCreateChannel} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Nombre del Canal</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">#</span>
                                        <input 
                                            type="text" 
                                            placeholder="ej. desarrollo"
                                            value={newChannelName}
                                            onChange={e => setNewChannelName(e.target.value)}
                                            className="w-full pl-7 pr-3 py-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white font-semibold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Descripción</label>
                                    <textarea 
                                        placeholder="¿De qué trata este canal?"
                                        value={newChannelDescription}
                                        onChange={e => setNewChannelDescription(e.target.value)}
                                        className="w-full p-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-3 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                                        <input 
                                            type="checkbox"
                                            checked={newChannelIsPrivate}
                                            onChange={e => setNewChannelIsPrivate(e.target.checked)}
                                            className="rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span>Canal Privado 🔒</span>
                                    </label>

                                    {newChannelIsPrivate && (
                                        <div className="pt-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Contraseña de Acceso (Opcional)</label>
                                            <input 
                                                type="password" 
                                                placeholder="ej. secreto123"
                                                value={newChannelPassword}
                                                onChange={e => setNewChannelPassword(e.target.value)}
                                                className="w-full p-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">Los demás miembros necesitarán esta contraseña para unirse al canal privado.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreateChannelOpen(false)}
                                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow"
                                    >
                                        Crear Canal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 11. EDIT CHANNEL DIALOG/MODAL */}
                {editingChannel && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl relative">
                            
                            <button 
                                onClick={() => setEditingChannel(null)}
                                className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 font-sans">Editar Canal</h3>
                            
                            <form onSubmit={handleEditChannelSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Nombre del Canal</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">#</span>
                                        <input 
                                            type="text" 
                                            placeholder="ej. desarrollo"
                                            value={editingChannelName}
                                            onChange={e => setEditingChannelName(e.target.value)}
                                            className="w-full pl-7 pr-3 py-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white font-semibold"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Descripción</label>
                                    <textarea 
                                        placeholder="¿De qué trata este canal?"
                                        value={editingChannelDescription}
                                        onChange={e => setEditingChannelDescription(e.target.value)}
                                        className="w-full p-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-3 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                                        <input 
                                            type="checkbox"
                                            checked={editingChannelIsPrivate}
                                            onChange={e => setEditingChannelIsPrivate(e.target.checked)}
                                            className="rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span>Canal Privado 🔒</span>
                                    </label>

                                    {editingChannelIsPrivate && (
                                        <div className="pt-1">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Contraseña de Acceso (Opcional)</label>
                                            <input 
                                                type="password" 
                                                placeholder="ej. secreto123"
                                                value={editingChannelPassword}
                                                onChange={e => setEditingChannelPassword(e.target.value)}
                                                className="w-full p-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">Los demás miembros necesitarán esta contraseña para unirse al canal privado.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setEditingChannel(null)}
                                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 12. CREATE POLL DIALOG/MODAL */}
                {isCreatePollOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl relative">
                            
                            <button 
                                onClick={() => setIsCreatePollOpen(false)}
                                className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Crear Encuesta de Equipo</h3>
                            
                            <form onSubmit={handleCreatePollSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Pregunta de la Encuesta</label>
                                    <input 
                                        type="text" 
                                        placeholder="ej. ¿Cuándo hacemos la retrospectiva?"
                                        value={newPollQuestion}
                                        onChange={e => setNewPollQuestion(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white font-semibold"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Opciones</label>
                                    {newPollOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-1">
                                            <input 
                                                type="text" 
                                                placeholder={`Opción ${idx + 1}`}
                                                value={opt}
                                                onChange={e => {
                                                    const copy = [...newPollOptions];
                                                    copy[idx] = e.target.value;
                                                    setNewPollOptions(copy);
                                                }}
                                                className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                                                required={idx < 2}
                                            />
                                            {newPollOptions.length > 2 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setNewPollOptions(newPollOptions.filter((_, i) => i !== idx))}
                                                    className="p-1.5 hover:bg-red-50 text-red-500 dark:hover:bg-red-950 rounded"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => setNewPollOptions([...newPollOptions, ''])}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 pt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Añadir otra opción
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input 
                                        type="checkbox"
                                        id="allow_mult"
                                        checked={newPollAllowMultiple}
                                        onChange={e => setNewPollAllowMultiple(e.target.checked)}
                                        className="rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="allow_mult" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                        Permitir votar múltiples opciones
                                    </label>
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreatePollOpen(false)}
                                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow"
                                    >
                                        Lanzar Encuesta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 13. CONFIRM DELETE CHANNEL MODAL */}
                {channelToDelete && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full shadow-2xl text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">¿Eliminar canal #{channelToDelete.name}?</h3>
                            <p className="text-xs text-gray-500 mb-6">
                                Esta acción es irreversible. Se eliminarán permanentemente todos los mensajes y archivos enviados en este canal.
                            </p>
                            <div className="flex justify-center gap-2">
                                <button 
                                    onClick={() => setChannelToDelete(null)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => confirmDeleteChannel(channelToDelete)}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow"
                                >
                                    Eliminar Canal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    };

    const exportCSV = (filename: string, headers: string[], rows: any[][]) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filterByDate = (dateString: string, filter: 'all' | 'week' | 'month' | 'year') => {
        if (filter === 'all') return true;
        try {
            const date = parseISO(dateString);
            if (filter === 'week') return isThisWeek(date, { weekStartsOn: 1 });
            if (filter === 'month') return isThisMonth(date);
            if (filter === 'year') return isThisYear(date);
        } catch(e) {}
        return true;
    };

    // EXPENSES TAB
    const renderExpenses = () => {
        if (!activeProject) return null;
        const allExpenses = activeProject.expenses || [];
        const expenses = allExpenses.filter(e => filterByDate(e.date, expenseFilter));

        const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

        const handleExport = () => {
            const headers = ['Fecha', 'Descripción', 'Categoría', 'Monto', 'Registrado por'];
            const rows = expenses.map(e => [e.date, e.description, e.category, e.amount, e.created_by]);
            exportCSV(`gastos-${activeProject.name}-${expenseFilter}`, headers, rows);
        };

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Registro de Gastos</h2>
                        <p className="text-xs text-gray-500">Controla el presupuesto y gastos asociados al proyecto.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={expenseFilter}
                            onChange={(e) => setExpenseFilter(e.target.value as any)}
                            className="text-xs bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                            <option value="all">Todo el tiempo</option>
                            <option value="year">Este año</option>
                            <option value="month">Este mes</option>
                            <option value="week">Esta semana</option>
                        </select>
                        <button onClick={handleExport} className="px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-200 flex items-center gap-1.5 shadow-sm">
                            <Download className="w-3.5 h-3.5" /> Excel
                        </button>
                        <button onClick={() => setIsExpenseModalOpen(true)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Registrar Gasto
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <span className="text-xs text-gray-500 font-medium">Total Gastado</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">${totalSpent.toFixed(2)}</span>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <span className="text-xs text-gray-500 font-medium">Transacciones</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</span>
                    </div>
                </div>

                {expenses.length === 0 ? renderEmptyState('No hay gastos', 'No hay registros para este periodo.') : (
                    <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                        {expenses.map(exp => (
                            <div key={exp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{exp.description}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-gray-400">{exp.date}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{exp.category}</span>
                                        <span className="text-[10px] text-gray-400 text-ellipsis overflow-hidden">Por: {exp.created_by}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-bold text-gray-900 dark:text-white">${exp.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // TIME TRACKING TAB
    const renderTime = () => {
        if (!activeProject) return null;
        const allTimeEntries = activeProject.time_entries || [];
        const timeEntries = allTimeEntries.filter(t => filterByDate(t.date, timeFilter));

        const totalMinutes = timeEntries.reduce((acc, curr) => acc + curr.duration_minutes, 0);

        const handleExport = () => {
            const headers = ['Fecha', 'Descripción', 'Duración (Mins)', 'Horas Formateadas', 'Registrado por'];
            const rows = timeEntries.map(t => [
                t.date, 
                t.description, 
                t.duration_minutes, 
                `${Math.floor(t.duration_minutes / 60)}h ${t.duration_minutes % 60}m`, 
                t.user_name
            ]);
            exportCSV(`tiempo-${activeProject.name}-${timeFilter}`, headers, rows);
        };

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Registro de Tiempo</h2>
                        <p className="text-xs text-gray-500">Registra horas trabajadas y asócialas al proyecto.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value as any)}
                            className="text-xs bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                            <option value="all">Todo el tiempo</option>
                            <option value="year">Este año</option>
                            <option value="month">Este mes</option>
                            <option value="week">Esta semana</option>
                        </select>
                        <button onClick={handleExport} className="px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-200 flex items-center gap-1.5 shadow-sm">
                            <Download className="w-3.5 h-3.5" /> Excel
                        </button>
                        <button onClick={() => setIsTimeModalOpen(true)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Registrar Tiempo
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <span className="text-xs text-gray-500 font-medium">Total Horas</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                        </span>
                    </div>
                    <div className="bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
                        <span className="text-xs text-gray-500 font-medium">Registros</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{timeEntries.length}</span>
                    </div>
                </div>

                {timeEntries.length === 0 ? renderEmptyState('No hay registros de tiempo', 'No hay registros para este periodo.') : (
                    <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                        {timeEntries.map(t => (
                            <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.description || 'Sin descripción'}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-gray-400">{t.date}</span>
                                        <span className="text-[10px] text-gray-400 text-ellipsis overflow-hidden">Por: {t.user_name}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m</span>
                                </div>
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
        const membersList = memberSearchText.trim()
            ? realMembers.filter(m => 
                (m.name && m.name.toLowerCase().includes(memberSearchText.toLowerCase())) ||
                (m.email && m.email.toLowerCase().includes(memberSearchText.toLowerCase()))
              )
            : realMembers;

        return (
            <div className="p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto pb-20 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Miembros del Equipo</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Administra los roles, permisos y colaboradores de este espacio.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Filtrar miembros..."
                                value={memberSearchText}
                                onChange={e => setMemberSearchText(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white w-44"
                            />
                        </div>
                        {isProjectCreator && (
                            <button onClick={() => setIsInviteModalOpen(true)} className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-1.5 shadow-sm transition-colors">
                                <Users className="w-3.5 h-3.5" /> Invitar Miembro
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden shadow-sm">
                    {membersList.map((m, idx) => {
                        const isOwner = m.role === 'owner';
                        return (
                            <div key={m.id || idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full ${isOwner ? 'bg-gray-900 dark:bg-white text-white dark:text-black font-semibold' : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium'} text-xs flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-800`}>
                                        {(m.name || m.email || 'M').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{m.name || 'Miembro del Equipo'}</h4>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono">{m.email}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-wide ${
                                        isOwner 
                                            ? 'bg-gray-900/10 text-gray-900 dark:bg-white/10 dark:text-white border border-gray-900/20 dark:border-white/20' 
                                            : m.role === 'pending'
                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                            : m.role === 'lead'
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                    }`}>
                                        {isOwner ? 'Propietario / Creador' : m.role === 'pending' ? 'Invitación Pendiente' : m.role === 'lead' ? 'Líder de Proyecto' : 'Colaborador'}
                                    </span>
                                    {isProjectCreator && !isOwner && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Estás seguro de eliminar a ${m.name || m.email} de los colaboradores? Perderá acceso a este proyecto.`)) {
                                                    const updatedMembers = (activeProject.members || []).filter((mem: any) => mem.email !== m.email);
                                                    onUpdateProject(activeProject.id, { members: updatedMembers });
                                                }
                                            }}
                                            className="p-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                                            title="Eliminar Colaborador"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // LISTAS TAB (Multiple Lists, Bi-directional Kanban Sync & Inline Task Editing)
    const renderListas = () => {
        if (!activeProject) return null;

        const projectLists = activeProject.lists || [];

        if (projectLists.length === 0) {
            return (
                <div className="p-8 max-w-md mx-auto w-full h-full flex flex-col items-center justify-center text-center space-y-4 font-sans my-auto py-20">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <List className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">No hay listas creadas</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Este proyecto aún no tiene listas personalizadas. Crea una lista para organizar y clasificar tus tareas.
                        </p>
                    </div>
                    <button
                        onClick={() => setCreateListModal({ isOpen: true, templateType: 'project_tracking' })}
                        className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-2xs flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Crear Primera Lista
                    </button>
                </div>
            );
        }

        const effectiveListId = (selectedListId === 'all' || !projectLists.some(l => l.id === selectedListId)) ? projectLists[0].id : selectedListId;
        const activeCustomList = projectLists.find(l => l.id === effectiveListId) || projectLists[0];

        // Filter todos based on selected list and search
        let displayedTodos = projectTodos.filter(t => {
            if (t.list_id !== effectiveListId) return false;
            if (!listasSearch.trim()) return true;
            return t.text.toLowerCase().includes(listasSearch.toLowerCase());
        });

        if (listCustomView === 'assigned_to_me') {
            displayedTodos = displayedTodos.filter(t => (t.assigned_to || t.assignee) === currentUserEmail);
        } else if (listCustomView === 'priority') {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            displayedTodos = [...displayedTodos].sort((a, b) => (priorityWeight[b.priority || 'medium'] - priorityWeight[a.priority || 'medium']));
        } else if (listCustomView === 'due_date') {
            displayedTodos = [...displayedTodos].sort((a, b) => {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            });
        } else if (listCustomView === 'status') {
            displayedTodos = [...displayedTodos].sort((a, b) => (Number(b.completed) - Number(a.completed)));
        }

        const handleAddListTodo = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!newItemTitle.trim()) return;
            const assigneeValue = newItemAssignee.trim() || undefined;
            const availableCols = activeProject.kanban_columns && activeProject.kanban_columns.length > 0 ? activeProject.kanban_columns : ['Por hacer', 'En progreso', 'Completado'];
            const defaultCol = availableCols[0] || 'Por hacer';
            await addTodo(newItemTitle.trim(), {
                projectId: activeProject.id,
                priority: newItemPriority,
                assignee: assigneeValue,
                assigned_to: assigneeValue,
                dueDate: newItemDueDate || undefined,
                kanban_column: defaultCol,
                list_id: effectiveListId
            });
            setNewItemTitle('');
            setNewItemDueDate('');
        };

        const handleShareListSummary = () => {
            const listTasks = projectTodos.filter(t => t.list_id === effectiveListId);
            const pendingCount = listTasks.filter(t => !t.completed).length;
            const completedCount = listTasks.filter(t => t.completed).length;
            const listName = activeCustomList?.name || 'Lista';
            
            let summaryText = `**Lista: ${listName}** (${activeProject.name})\n`;
            summaryText += `Resumen: ${completedCount} completadas | ${pendingCount} pendientes\n\n`;
            summaryText += `**Tareas:**\n`;
            listTasks.slice(0, 8).forEach(t => {
                const statusBadge = t.completed ? '[Completado]' : '[Pendiente]';
                const assignee = t.assigned_to || t.assignee;
                const assigneeText = assignee ? `@${assignee.split('@')[0]}` : 'Sin Asignar';
                const col = t.kanban_column || (t.completed ? 'Completado' : 'Por hacer');
                summaryText += `- ${statusBadge} **${t.text}** [${col}] - ${assigneeText}\n`;
            });

            setShareTargetChannelId(selectedChannelId || 'general');
            setShareChannelPassword('');
            setShareComment('');
            setShareError(null);
            setShareUpdateModal({
                isOpen: true,
                title: `Compartir Lista: ${listName}`,
                updateText: summaryText
            });
        };

        const handleDeleteCustomList = (listId: string) => {
            if (!confirm('¿Estás seguro de que deseas eliminar esta lista? Las tareas no se borrarán del tablero, sólo se desvincularán de esta lista.')) return;
            const updatedLists = projectLists.filter(l => l.id !== listId);
            onUpdateProject(activeProject.id, { lists: updatedLists });
            
            // Unlink tasks
            projectTodos.filter(t => t.list_id === listId).forEach(t => {
                updateTodo(t.id, { list_id: null as any });
            });

            if (updatedLists.length > 0) {
                setSelectedListId(updatedLists[0].id);
            }
        };

        return (
            <div className="p-8 max-w-7xl mx-auto w-full h-full overflow-y-auto pb-24 space-y-6 font-sans">
                {/* Lists Navigation Tabs Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111] p-3 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
                        {projectLists.map(list => {
                            const count = projectTodos.filter(t => t.list_id === list.id).length;
                            const isSelected = effectiveListId === list.id;
                            return (
                                <div key={list.id} className="flex items-center">
                                    <button
                                        onClick={() => setSelectedListId(list.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                            isSelected
                                                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-xs'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <List className="w-3.5 h-3.5" />
                                        <span className="max-w-[140px] truncate">{list.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                            isSelected
                                                ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
                                                : 'bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}

                        <button
                            onClick={() => setCreateListModal({ isOpen: true, templateType: 'project_tracking' })}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-dashed border-blue-300 dark:border-blue-800 flex items-center gap-1.5 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Nueva Lista
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeCustomList && (
                            <>
                                <button
                                    onClick={() => setIsAddBoardTaskModalOpen(true)}
                                    className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Añadir del Tablero
                                </button>
                                <button
                                    onClick={() => handleDeleteCustomList(activeCustomList.id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                                    title="Eliminar esta lista"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleShareListSummary}
                            className="px-3.5 py-1.5 text-xs bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-gray-800 shadow-2xs"
                        >
                            <Share2 className="w-3.5 h-3.5 text-gray-400" /> Compartir
                        </button>
                    </div>
                </div>

                {/* List Header & Quick Add */}
                <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 shadow-2xs space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-4">
                        <div className="space-y-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <List className="w-4 h-4 text-blue-500" />
                                {activeCustomList?.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {activeCustomList?.description || 'Tareas asignadas a esta lista. Todas las tareas creadas aquí se reflejan en el tablero Kanban.'}
                            </p>
                        </div>
                        <div className="text-xs text-gray-400 font-medium">
                            {displayedTodos.length} {displayedTodos.length === 1 ? 'tarea' : 'tareas'}
                        </div>
                    </div>

                    {/* Quick Add Form */}
                    <form onSubmit={handleAddListTodo} className="flex flex-wrap items-center gap-3">
                        <input
                            type="text"
                            placeholder={`Añadir tarea a "${activeCustomList?.name}"...`}
                            value={newItemTitle}
                            onChange={e => setNewItemTitle(e.target.value)}
                            className="flex-1 min-w-[240px] px-3.5 py-2 text-xs bg-gray-50/60 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 shadow-2xs"
                        />
                        <select
                            value={newItemAssignee}
                            onChange={e => setNewItemAssignee(e.target.value)}
                            className="px-3 py-2 text-xs bg-gray-50/60 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none max-w-[170px]"
                        >
                            <option value="">(Sin asignar)</option>
                            {realMembers.map(m => (
                                <option key={m.email} value={m.email}>{m.name || m.email.split('@')[0]}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={newItemDueDate}
                            onChange={e => setNewItemDueDate(e.target.value)}
                            className="px-3 py-2 text-xs bg-gray-50/60 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none"
                        />
                        <select
                            value={newItemPriority}
                            onChange={e => setNewItemPriority(e.target.value as any)}
                            className="px-3 py-2 text-xs bg-gray-50/60 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none font-medium"
                        >
                            <option value="low">Prioridad Baja</option>
                            <option value="medium">Prioridad Media</option>
                            <option value="high">Prioridad Alta</option>
                        </select>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" /> Agregar Tarea
                        </button>
                    </form>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-white dark:bg-[#111] p-1 rounded-xl border border-gray-200/60 dark:border-gray-800/80 text-xs shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-gray-400 px-3 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3 h-3" /> Filtrar:
                        </span>
                        {[
                            { id: 'all', label: 'Todas' },
                            { id: 'priority', label: 'Prioridad' },
                            { id: 'assigned_to_me', label: 'Asignadas a mí' },
                            { id: 'due_date', label: 'Fecha' },
                            { id: 'status', label: 'Estado' }
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setListCustomView(v.id as any)}
                                className={`px-3 py-1 font-medium rounded-lg transition-all ${
                                    listCustomView === v.id
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-2xs font-semibold'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                }`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar en tareas..."
                            value={listasSearch}
                            onChange={e => setListasSearch(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-[#111] border border-gray-200/60 dark:border-gray-800/80 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 w-60 shadow-2xs"
                        />
                    </div>
                </div>

                {/* Minimalist Clean Table with Inline Editing */}
                <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/60 dark:border-gray-800/80 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-200/60 dark:border-gray-800 text-gray-400 font-semibold text-[10px] uppercase tracking-wider">
                                    <th className="py-3.5 px-4 min-w-[200px]">Tarea</th>
                                    <th className="py-3.5 px-4 min-w-[140px]">Columna / Estado</th>
                                    <th className="py-3.5 px-4 min-w-[160px]">Responsable</th>
                                    <th className="py-3.5 px-4 min-w-[140px]">Fecha límite</th>
                                    <th className="py-3.5 px-4 min-w-[120px]">Prioridad</th>
                                    <th className="py-3.5 px-4 text-right min-w-[100px]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                {displayedTodos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                                            No hay tareas en esta lista. Añade una arriba o usa "+ Añadir del Tablero" para incorporar tareas existentes.
                                        </td>
                                    </tr>
                                ) : (
                                    displayedTodos.map(todo => {
                                        const currentAssignee = todo.assigned_to || todo.assignee || '';
                                        const availableCols = activeProject.kanban_columns && activeProject.kanban_columns.length > 0 ? activeProject.kanban_columns : ['Por hacer', 'En progreso', 'Completado'];
                                        const doneCol = availableCols.find(c => /done|complet|finaliz|termin/i.test(c)) || availableCols[availableCols.length - 1] || 'Completado';
                                        const firstCol = availableCols[0] || 'Por hacer';
                                        const currentCol = todo.kanban_column || (todo.completed ? doneCol : firstCol);

                                        return (
                                            <tr key={todo.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                                {/* Task Title & Completed Checkbox */}
                                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                                                    <div className="flex items-center gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={todo.completed}
                                                            onChange={() => {
                                                                const nextCompleted = !todo.completed;
                                                                updateTodo(todo.id, { 
                                                                    completed: nextCompleted, 
                                                                    kanban_column: nextCompleted ? doneCol : firstCol 
                                                                });
                                                            }}
                                                            className="rounded border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-0 cursor-pointer w-3.5 h-3.5"
                                                        />
                                                        <span className={todo.completed ? 'line-through text-gray-400' : ''}>
                                                            {todo.text}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Editable Kanban Column / Status */}
                                                <td className="py-3 px-4">
                                                    <select
                                                        value={currentCol}
                                                        onChange={e => {
                                                            const newCol = e.target.value;
                                                            const isDone = /done|complet|finaliz|termin/i.test(newCol);
                                                            updateTodo(todo.id, { 
                                                                kanban_column: newCol, 
                                                                completed: isDone 
                                                            });
                                                        }}
                                                        className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                                    >
                                                        {availableCols.map(colName => (
                                                            <option key={colName} value={colName}>{colName}</option>
                                                        ))}
                                                        {!availableCols.includes(currentCol) && (
                                                            <option value={currentCol}>{currentCol}</option>
                                                        )}
                                                    </select>
                                                </td>

                                                {/* Editable Assignee Dropdown */}
                                                <td className="py-3 px-4">
                                                    <select
                                                        value={currentAssignee}
                                                        onChange={e => {
                                                            const val = e.target.value || null;
                                                            updateTodo(todo.id, { 
                                                                assigned_to: val as any, 
                                                                assignee: val as any 
                                                            });
                                                        }}
                                                        className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
                                                    >
                                                        <option value="">Sin asignar</option>
                                                        {realMembers.map(m => (
                                                            <option key={m.email} value={m.email}>
                                                                {m.name || m.email.split('@')[0]}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Editable Due Date */}
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="date"
                                                        value={todo.due_date || ''}
                                                        onChange={e => {
                                                            updateTodo(todo.id, { due_date: e.target.value || null });
                                                        }}
                                                        className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>

                                                {/* Editable Priority */}
                                                <td className="py-3 px-4">
                                                    <select
                                                        value={todo.priority || 'medium'}
                                                        onChange={e => {
                                                            updateTodo(todo.id, { priority: e.target.value as any });
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border focus:outline-none ${
                                                            todo.priority === 'high' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' :
                                                            todo.priority === 'low' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-gray-700' :
                                                            'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                                        }`}
                                                    >
                                                        <option value="low">Baja</option>
                                                        <option value="medium">Media</option>
                                                        <option value="high">Alta</option>
                                                    </select>
                                                </td>

                                                {/* Actions: Share Task & Delete Task */}
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleShareTask(todo)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors rounded-lg"
                                                            title="Compartir tarea en un canal de chat"
                                                        >
                                                            <Share2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteTodo(todo.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors rounded-lg"
                                                            title="Eliminar tarea"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                        {activeTab === 'listas' && renderListas()}
                        {activeTab === 'sprints' && renderSprints()}
                        {activeTab === 'roadmap' && renderRoadmap()}
                        {activeTab === 'docs' && renderDocs()}
                        {activeTab === 'chat' && renderChat()}
                        {activeTab === 'expenses' && renderExpenses()}
                        {activeTab === 'time' && renderTime()}
                        {activeTab === 'team' && renderTeam()}
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
                        created_by: currentUserEmail,
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

            {/* EXPENSE MODAL */}
            <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Registrar Gasto">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const desc = formData.get('description') as string;
                    const amountStr = formData.get('amount') as string;
                    const cat = formData.get('category') as string;
                    const date = formData.get('date') as string;
                    
                    if (desc && amountStr && !isNaN(Number(amountStr))) {
                        const newExp = {
                            id: crypto.randomUUID(),
                            project_id: activeProject.id,
                            description: desc,
                            amount: Number(amountStr),
                            date: date || new Date().toISOString().split('T')[0],
                            category: (cat || 'Other') as any,
                            created_at: new Date().toISOString(),
                            created_by: 'Tú'
                        };
                        onUpdateProject(activeProject.id, { expenses: [newExp, ...(activeProject.expenses || [])] });
                        setIsExpenseModalOpen(false);
                    }
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción del gasto</label>
                        <input name="description" required placeholder="Ej: Licencia de Software, Vuelo a Madrid..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Monto ($)</label>
                        <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                        <select name="category" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white">
                            <option value="Software">Software</option>
                            <option value="Hardware">Hardware</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Services">Servicios</option>
                            <option value="Travel">Viajes</option>
                            <option value="Other">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Registrar</button>
                    </div>
                </form>
            </Modal>

            {/* TIME TRACKING MODAL */}
            <Modal isOpen={isTimeModalOpen} onClose={() => setIsTimeModalOpen(false)} title="Registrar Tiempo">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!activeProject) return;
                    const formData = new FormData(e.currentTarget);
                    const desc = formData.get('description') as string;
                    const hoursStr = formData.get('hours') as string;
                    const minsStr = formData.get('minutes') as string;
                    const date = formData.get('date') as string;
                    
                    const hours = parseInt(hoursStr) || 0;
                    const mins = parseInt(minsStr) || 0;
                    const totalMinutes = (hours * 60) + mins;
                    
                    if (totalMinutes > 0) {
                        const newTime = {
                            id: crypto.randomUUID(),
                            project_id: activeProject.id,
                            user_email: currentUserEmail,
                            user_name: currentUserName,
                            duration_minutes: totalMinutes,
                            date: date || new Date().toISOString().split('T')[0],
                            description: desc || 'Trabajo general',
                            created_at: new Date().toISOString()
                        };
                        onUpdateProject(activeProject.id, { time_entries: [newTime, ...(activeProject.time_entries || [])] });
                        setIsTimeModalOpen(false);
                    }
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción / Tarea</label>
                        <input name="description" required placeholder="Ej: Desarrollo de API, Diseño de interfaz..." className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Horas</label>
                            <input name="hours" type="number" min="0" placeholder="0" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Minutos</label>
                            <input name="minutes" type="number" min="0" max="59" placeholder="0" className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsTimeModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Guardar Tiempo</button>
                    </div>
                </form>
            </Modal>

            {/* TEAM INVITE MODAL */}
            <Modal isOpen={isInviteModalOpen} onClose={() => { setIsInviteModalOpen(false); setInviteEmail(''); setInviteSuccessMessage(null); }} title="Invitar al Equipo">
                <div className="space-y-4">
                    {inviteSuccessMessage && (
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg">
                            {inviteSuccessMessage}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Buscar y Seleccionar Correo Electrónico</label>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!activeProject || !inviteEmail.trim()) return;
                            if (onSendInvitation) {
                                await onSendInvitation(activeProject, inviteEmail.trim());
                                setInviteSuccessMessage(`Invitación enviada exitosamente a ${inviteEmail.trim()}`);
                                setInviteEmail('');
                            }
                        }} className="flex gap-2">
                            <input 
                                type="email" 
                                required 
                                value={inviteEmail} 
                                onChange={e => setInviteEmail(e.target.value)} 
                                placeholder="Escribe el correo..." 
                                className="flex-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white" 
                            />
                            <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg shrink-0">Invitar</button>
                        </form>
                    </div>

                    {filteredInviteUsers.length > 0 && (
                        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredInviteUsers.map(user => (
                                <div key={user.email} className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!activeProject || !onSendInvitation) return;
                                            await onSendInvitation(activeProject, user.email);
                                            setInviteSuccessMessage(`Invitación enviada exitosamente a ${user.email}`);
                                            setInviteEmail('');
                                        }}
                                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 hover:text-white text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        Invitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {inviteEmail.trim() && filteredInviteUsers.length === 0 && (
                        <p className="text-xs text-gray-500 italic mt-2">
                            Presiona "Invitar" para enviar la invitación al correo escrito.
                        </p>
                    )}

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 mt-4">
                        <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">Cerrar</button>
                    </div>
                </div>
            </Modal>

            {/* CREATE PROJECT MODAL */}
            <Modal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} title="Crear Nuevo Proyecto">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    if (!name?.trim()) return;
                    
                    const newProj = await onAddProject(name.trim(), '', null);
                    if (newProj) {
                        onSelectProject(newProj.id);
                    }
                    setIsCreateProjectModalOpen(false);
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nombre del Proyecto *</label>
                        <input 
                            name="name" 
                            required 
                            autoFocus
                            placeholder="Ej. Rediseño de Plataforma, Campaña Q3..." 
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" 
                        />
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setIsCreateProjectModalOpen(false)} className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm">Crear Proyecto</button>
                    </div>
                </form>
            </Modal>

            {/* SHARE DOCUMENT MODAL */}
            <Modal 
                isOpen={shareDocModal.isOpen} 
                onClose={() => setShareDocModal({ isOpen: false, doc: null })} 
                title="Compartir Documento en Canal"
            >
                <div className="space-y-4">
                    {shareDocModal.doc && (
                        <div className="p-3 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center gap-3">
                            {getFileIcon(shareDocModal.doc.file_type, shareDocModal.doc.file_name)}
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{shareDocModal.doc.title}</h4>
                                <p className="text-[10px] text-gray-400 font-mono">
                                    {shareDocModal.doc.file_size ? `${(shareDocModal.doc.file_size / 1024).toFixed(0)} KB` : 'Nota'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Seleccionar Canal Destino</label>
                        <select
                            value={shareTargetChannelId}
                            onChange={e => {
                                setShareTargetChannelId(e.target.value);
                                setShareError(null);
                                setShareChannelPassword('');
                            }}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                            {activeChannels.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                    {ch.is_private ? '🔒 ' : '# '}{ch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Comentario Opcional</label>
                        <input
                            type="text"
                            placeholder="Añade un mensaje para el equipo..."
                            value={shareComment}
                            onChange={e => setShareComment(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Password input if target channel is private */}
                    {(() => {
                        const targetChan = activeChannels.find(c => c.id === shareTargetChannelId);
                        if (!targetChan?.is_private) return null;
                        return (
                            <div>
                                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" /> Contraseña del Canal Privado *
                                </label>
                                <input
                                    type="password"
                                    placeholder="Introduce la clave de acceso..."
                                    value={shareChannelPassword}
                                    onChange={e => {
                                        setShareChannelPassword(e.target.value);
                                        setShareError(null);
                                    }}
                                    className="w-full bg-gray-50 dark:bg-black border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        );
                    })()}

                    {shareError && (
                        <p className="text-xs text-red-500 font-medium">{shareError}</p>
                    )}

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button 
                            type="button" 
                            onClick={() => setShareDocModal({ isOpen: false, doc: null })} 
                            className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            onClick={handleConfirmShareDoc}
                            className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Enviar al Canal
                        </button>
                    </div>
                </div>
            </Modal>

            {/* PREVIEW DOCUMENT MODAL */}
            <Modal
                isOpen={!!previewDocModal}
                onClose={() => setPreviewDocModal(null)}
                title={previewDocModal ? previewDocModal.title : 'Vista Previa'}
            >
                {previewDocModal && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800">
                            <span>Tipo: {previewDocModal.file_name?.split('.').pop()?.toUpperCase() || 'Nota'}</span>
                            <span>{previewDocModal.file_size ? `${(previewDocModal.file_size / 1024).toFixed(0)} KB` : 'Texto'}</span>
                        </div>

                        {previewDocModal.file_url ? (
                            <div className="space-y-3">
                                {previewDocModal.file_type?.startsWith('image/') || previewDocModal.file_url.startsWith('data:image/') ? (
                                    <div className="max-h-80 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center bg-gray-50 dark:bg-black">
                                        <img src={previewDocModal.file_url} alt={previewDocModal.title} className="max-h-80 object-contain" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                                        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 font-semibold">{previewDocModal.file_name || previewDocModal.title}</p>
                                        <p className="text-[10px] text-gray-400">Archivo listo para descargar o compartir</p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {previewDocModal.content && (
                            <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800 max-h-60 overflow-y-auto font-sans text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {previewDocModal.content}
                            </div>
                        )}

                        <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => {
                                    const doc = previewDocModal;
                                    setPreviewDocModal(null);
                                    handleOpenShareDoc(doc);
                                }}
                                className="px-3.5 py-1.5 text-xs border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Compartir en Canal
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDownloadFile(previewDocModal)}
                                className="px-3.5 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Download className="w-3.5 h-3.5" /> Descargar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* QUARTERLY PRIORITY MODAL */}
            <Modal
                isOpen={quarterlyModal.isOpen}
                onClose={() => setQuarterlyModal({ isOpen: false, item: null })}
                title={quarterlyModal.item ? "Editar Prioridad Trimestral" : "Nueva Prioridad Trimestral"}
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!activeProject || !qTitle.trim()) return;

                    const newPriorityItem: ProjectQuarterlyPriority = {
                        id: quarterlyModal.item ? quarterlyModal.item.id : Date.now().toString(),
                        project_id: activeProject.id,
                        title: qTitle.trim(),
                        description: qDesc.trim(),
                        quarter: qQuarter,
                        priority_level: qPriority,
                        impact: qImpact,
                        owner_email: qOwner || currentUserEmail,
                        status: qStatus,
                        created_at: quarterlyModal.item ? quarterlyModal.item.created_at : new Date().toISOString()
                    };

                    const existing = activeProject.quarterly_priorities || [];
                    let updatedList: ProjectQuarterlyPriority[] = [];
                    if (quarterlyModal.item) {
                        updatedList = existing.map(p => p.id === newPriorityItem.id ? newPriorityItem : p);
                    } else {
                        updatedList = [...existing, newPriorityItem];
                    }

                    onUpdateProject(activeProject.id, { quarterly_priorities: updatedList });
                    setQuarterlyModal({ isOpen: false, item: null });
                }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Título de la Prioridad</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Migración de infraestructura a Cloud Run"
                            value={qTitle}
                            onChange={e => setQTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                        <textarea
                            rows={2}
                            placeholder="Detalla los objetivos clave de esta iniciativa..."
                            value={qDesc}
                            onChange={e => setQDesc(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Trimestre</label>
                            <select
                                value={qQuarter}
                                onChange={e => setQQuarter(e.target.value as any)}
                                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white"
                            >
                                <option value="Q1">Q1 Primer Trimestre</option>
                                <option value="Q2">Q2 Segundo Trimestre</option>
                                <option value="Q3">Q3 Tercer Trimestre</option>
                                <option value="Q4">Q4 Cuarto Trimestre</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nivel de Prioridad</label>
                            <select
                                value={qPriority}
                                onChange={e => setQPriority(e.target.value as any)}
                                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white"
                            >
                                <option value="P1">P1 - Crítico</option>
                                <option value="P2">P2 - Alto</option>
                                <option value="P3">P3 - Medio</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nivel de Impacto</label>
                            <select
                                value={qImpact}
                                onChange={e => setQImpact(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white"
                            >
                                <option value="Alto">Alto Impacto</option>
                                <option value="Medio">Medio Impacto</option>
                                <option value="Bajo">Bajo Impacto</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                            <select
                                value={qStatus}
                                onChange={e => setQStatus(e.target.value as any)}
                                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white"
                            >
                                <option value="planning">Planificado</option>
                                <option value="in_progress">En Marcha</option>
                                <option value="completed">Completado</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Líder Responsable</label>
                        <select
                            value={qOwner}
                            onChange={e => setQOwner(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white"
                        >
                            {realMembers.map(m => (
                                <option key={m.email} value={m.email}>{m.name || m.email}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setQuarterlyModal({ isOpen: false, item: null })} className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs">Guardar Prioridad</button>
                    </div>
                </form>
            </Modal>

            {/* SHARE UPDATE TO CHANNEL MODAL */}
            <Modal
                isOpen={!!shareUpdateModal?.isOpen}
                onClose={() => setShareUpdateModal(null)}
                title={shareUpdateModal?.title || "Compartir Actualización en Canal"}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Selecciona el Canal de Destino:
                        </label>
                        <select
                            value={shareTargetChannelId}
                            onChange={e => {
                                setShareTargetChannelId(e.target.value);
                                setShareError(null);
                                setShareChannelPassword('');
                            }}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                            {activeChannels.map(ch => (
                                <option key={ch.id} value={ch.id}>
                                    {ch.is_private ? '🔒 ' : '# '}{ch.name} {ch.is_private ? '(Privado)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Password input if target channel is private */}
                    {(() => {
                        const targetChan = activeChannels.find(c => c.id === shareTargetChannelId);
                        if (!targetChan?.is_private) return null;
                        return (
                            <div>
                                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" /> Contraseña del Canal Privado *
                                </label>
                                <input
                                    type="password"
                                    placeholder="Introduce la contraseña para publicar en este canal..."
                                    value={shareChannelPassword}
                                    onChange={e => {
                                        setShareChannelPassword(e.target.value);
                                        setShareError(null);
                                    }}
                                    className="w-full bg-gray-50 dark:bg-black border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        );
                    })()}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Comentario adicional (opcional):
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Ej: Adjunto la actualización más reciente..."
                            value={shareComment}
                            onChange={e => setShareComment(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {shareError && (
                        <p className="text-xs text-red-500 font-medium">{shareError}</p>
                    )}

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setShareUpdateModal(null)}
                            className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmShareUpdate}
                            className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                        >
                            Publicar en Canal
                        </button>
                    </div>
                </div>
            </Modal>

            {/* VIEW SPRINT DETAIL & TASK MANAGEMENT MODAL */}
            <Modal
                isOpen={!!viewSprintModal}
                onClose={() => setViewSprintModal(null)}
                title={viewSprintModal ? `Sprint: ${viewSprintModal.name}` : "Detalles del Sprint"}
            >
                {viewSprintModal && (() => {
                    const sprintTasks = projectTodos.filter(t => t.sprint_id === viewSprintModal.id);
                    const unassignedTasks = projectTodos.filter(t => !t.sprint_id);
                    const completedTasks = sprintTasks.filter(t => t.completed).length;
                    const totalTasks = sprintTasks.length;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    const handleAddSprintTaskInternal = (e: React.FormEvent) => handleAddSprintTask(e, viewSprintModal?.id);

                    return (
                        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                            {/* Header Summary */}
                            <div className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        Fechas: {viewSprintModal.start_date || 'Sin fecha'} — {viewSprintModal.end_date || 'Sin fecha'}
                                    </span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                        {completedTasks} / {totalTasks} tareas ({progress}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                                {viewSprintModal.goal && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 italic pt-1">
                                        "{viewSprintModal.goal}"
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handleAddSprintTaskInternal} className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3">
                                <input
                                    type="text"
                                    value={sprintTaskText}
                                    onChange={(e) => setSprintTaskText(e.target.value)}
                                    placeholder="Nueva tarea del sprint..."
                                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Añadir Tarea
                                </button>
                            </form>

                            {/* Sprint Tasks List */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Tareas en este Sprint ({sprintTasks.length})
                                </h4>
                                {sprintTasks.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-3 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                        No hay tareas vinculadas a este Sprint. Crea una arriba o asigna tareas desde el Backlog.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {sprintTasks.map(t => (
                                            <div key={t.id} className="p-2.5 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={t.completed}
                                                        onChange={() => updateTodo(t.id, { completed: !t.completed })}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                                    />
                                                    <span className={`truncate font-medium ${t.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                        {t.text}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Unlink from Sprint button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateTodo(t.id, { sprint_id: null as any });
                                                        }}
                                                        className="text-[10px] text-red-500 hover:text-red-700 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 font-medium"
                                                        title="Quitar del Sprint (Mover a Backlog)"
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Backlog items that can be assigned */}
                            {unassignedTasks.length > 0 && (
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Asignar tareas sin sprint del Backlog ({unassignedTasks.length})
                                    </h4>
                                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                                        {unassignedTasks.slice(0, 10).map(t => (
                                            <div key={t.id} className="p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between text-xs">
                                                <span className="truncate text-gray-700 dark:text-gray-300 min-w-0 pr-2">{t.text}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateTodo(t.id, { sprint_id: viewSprintModal.id });
                                                    }}
                                                    className="shrink-0 px-2 py-0.5 bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] font-semibold rounded hover:bg-gray-800 transition-colors"
                                                >
                                                    + Añadir al Sprint
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>

            {/* CREATE NEW LIST MODAL */}
            <Modal
                isOpen={!!createListModal?.isOpen}
                onClose={() => setCreateListModal(null)}
                title="Crear Nueva Lista de Seguimiento"
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!activeProject || !newListTitle.trim()) return;

                    const listId = `list-${Date.now()}`;
                    const templateType = createListModal?.templateType || 'project_tracking';

                    const newList: ProjectList = {
                        id: listId,
                        project_id: activeProject.id,
                        name: newListTitle.trim(),
                        description: newListDescription.trim(),
                        template_type: templateType,
                        created_at: new Date().toISOString(),
                        items: []
                    };

                    const existingLists = activeProject.lists || [];
                    const updatedLists = [...existingLists, newList];

                    onUpdateProject(activeProject.id, { lists: updatedLists });
                    setSelectedListId(listId);
                    setCreateListModal(null);
                    setNewListTitle('');
                    setNewListDescription('');
                }} className="space-y-4">

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Nombre de la Lista
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Seguimiento del Proyecto Alpha"
                            value={newListTitle}
                            onChange={e => setNewListTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Descripción / Propósito (Opcional)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Detalla los objetivos de esta lista para el equipo..."
                            value={newListDescription}
                            onChange={e => setNewListDescription(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setCreateListModal(null)}
                            className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                        >
                            Crear Lista
                        </button>
                    </div>
                </form>
            </Modal>

            {/* TASK DISCUSSION THREAD SIDE DRAWER */}
            {activeTaskThreadItem && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setActiveTaskThreadItem(null)} />
                    <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4 text-blue-500" /> Hilo de Discusión
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate max-w-xs">{activeTaskThreadItem.item.title}</p>
                                </div>
                                <button
                                    onClick={() => setActiveTaskThreadItem(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            {(() => {
                                const { listId, item } = activeTaskThreadItem;
                                const comments = item.comments || [];

                                const handleAddComment = (e: React.FormEvent) => {
                                    e.preventDefault();
                                    if (!listThreadCommentText.trim() || !activeProject) return;

                                    const newComment = {
                                        id: `cmt-${Date.now()}`,
                                        user_email: currentUserEmail,
                                        user_name: currentUserEmail.split('@')[0],
                                        content: listThreadCommentText.trim(),
                                        created_at: new Date().toISOString()
                                    };

                                    const updatedComments = [...comments, newComment];

                                    const currentLists = activeProject.lists || [];
                                    const updatedLists = currentLists.map(l => {
                                        if (l.id === listId) {
                                            return {
                                                ...l,
                                                items: l.items.map(i => i.id === item.id ? { ...i, comments: updatedComments } : i)
                                            };
                                        }
                                        return l;
                                    });

                                    onUpdateProject(activeProject.id, { lists: updatedLists });
                                    setActiveTaskThreadItem({ listId, item: { ...item, comments: updatedComments } });
                                    setListThreadCommentText('');
                                };

                                return (
                                    <div className="flex-1 flex flex-col justify-between p-5 overflow-hidden">
                                        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                                            {/* Metadata Card */}
                                            <div className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2 text-xs">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-blue-500" />
                                                        Asignado: {item.assignee_email || 'Sin asignar'}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        Fecha: {item.due_date || 'Sin fecha'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Comments Feed */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                                                    Comentarios ({comments.length})
                                                </h4>

                                                {comments.length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic py-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                                        No hay comentarios en este hilo aún. Escribe el primero abajo.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {comments.map(c => (
                                                            <div key={c.id} className="p-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-1.5">
                                                                <div className="flex items-center justify-between text-[11px]">
                                                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                                                        {c.user_name || c.user_email}
                                                                    </span>
                                                                    <span className="text-gray-400 text-[10px]">
                                                                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                                                                    {c.content}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Comment Input Form */}
                                        <form onSubmit={handleAddComment} className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                                            <textarea
                                                rows={3}
                                                placeholder="Escribe un comentario en el hilo..."
                                                value={listThreadCommentText}
                                                onChange={e => setListThreadCommentText(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
                                                >
                                                    <Send className="w-3.5 h-3.5" /> Publicar Comentario
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* BANDEJA DE NOVEDADES Y ANUNCIOS MODAL */}
            <Modal
                isOpen={inboxModalOpen}
                onClose={() => setInboxModalOpen(false)}
                title="Bandeja de Novedades y Anuncios del Proyecto"
            >
                <div className="space-y-6">
                    {/* Create Announcement Form */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!activeProject || !inboxFormTitle.trim() || !inboxFormText.trim()) return;

                            const newAnnouncement = {
                                id: `ann-${Date.now()}`,
                                project_id: activeProject.id,
                                title: inboxFormTitle.trim(),
                                text: inboxFormText.trim(),
                                type: inboxFormType,
                                priority: inboxFormPriority,
                                author_name: currentUserEmail.split('@')[0],
                                created_by: currentUserEmail,
                                created_at: new Date().toISOString()
                            };

                            const currentInbox = activeProject.inbox || [];
                            const updatedInbox = [newAnnouncement, ...currentInbox];
                            onUpdateProject(activeProject.id, { inbox: updatedInbox });

                            setInboxFormTitle('');
                            setInboxFormText('');
                            setInboxFormType('announcement');
                            setInboxFormPriority('normal');
                        }}
                        className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3.5"
                    >
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-blue-500" /> Publicar Nuevo Anuncio o Novedad
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Título</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Lanzamiento de la versión v2.0 programado"
                                    value={inboxFormTitle}
                                    onChange={e => setInboxFormTitle(e.target.value)}
                                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                                <select
                                    value={inboxFormType}
                                    onChange={e => setInboxFormType(e.target.value as any)}
                                    className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium"
                                >
                                    <option value="announcement">Anuncio</option>
                                    <option value="idea">Idea</option>
                                    <option value="alert">Alerta</option>
                                    <option value="note">Nota</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Contenido / Mensaje</label>
                            <textarea
                                rows={3}
                                required
                                placeholder="Escribe el detalle del comunicado para que aparezca en el resumen del proyecto..."
                                value={inboxFormText}
                                onChange={e => setInboxFormText(e.target.value)}
                                className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" /> Publicar en Resumen
                            </button>
                        </div>
                    </form>

                    {/* Existing Announcements List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
                            <span>Anuncios Publicados ({activeProject?.inbox?.length || 0})</span>
                        </h4>

                        {(!activeProject?.inbox || activeProject.inbox.length === 0) ? (
                            <p className="text-xs text-gray-400 italic py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                No hay anuncios publicados aún. Usa el formulario de arriba para crear uno.
                            </p>
                        ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {activeProject.inbox.map(item => (
                                    <div key={item.id} className="p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-start justify-between gap-3 text-xs shadow-2xs">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    {item.type === 'announcement' ? <Megaphone className="w-3.5 h-3.5 text-blue-500" /> :
                                                     item.type === 'alert' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> :
                                                     item.type === 'idea' ? <Sparkles className="w-3.5 h-3.5 text-amber-500" /> :
                                                     <FileText className="w-3.5 h-3.5 text-gray-400" />}
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {item.created_at ? format(parseISO(item.created_at), 'd MMM, HH:mm', { locale: es }) : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{item.text}</p>
                                            <p className="text-[10px] text-gray-400">Por {item.author_name || item.created_by?.split('@')[0]}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = (activeProject.inbox || []).filter(i => i.id !== item.id);
                                                onUpdateProject(activeProject.id, { inbox: updated });
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                            title="Eliminar anuncio"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* ADD BOARD TASKS TO LIST MODAL */}
            <Modal
                isOpen={isAddBoardTaskModalOpen}
                onClose={() => setIsAddBoardTaskModalOpen(false)}
                title="Añadir Tareas del Tablero a esta Lista"
            >
                {(() => {
                    const projectLists = activeProject?.lists || [];
                    const effectiveTargetListId = (selectedListId === 'all' || !projectLists.some(l => l.id === selectedListId)) ? (projectLists[0]?.id || '') : selectedListId;
                    const currentList = projectLists.find(l => l.id === effectiveTargetListId);
                    const availableTasks = projectTodos.filter(t => t.list_id !== effectiveTargetListId);

                    return (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Selecciona tareas existentes en el tablero para vincularlas a la lista <strong>"{currentList?.name || 'Lista'}"</strong>:
                            </p>

                            {availableTasks.length === 0 ? (
                                <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                    Todas las tareas del tablero ya están en esta lista o no hay tareas en el proyecto.
                                </div>
                            ) : (
                                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                    {availableTasks.map(t => (
                                        <div
                                            key={t.id}
                                            className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="font-medium text-gray-900 dark:text-white truncate">{t.text}</div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                                    <span>Columna: {t.kanban_column || 'Por hacer'}</span>
                                                    <span>•</span>
                                                    <span>Asignado: {t.assigned_to || t.assignee || 'Sin asignar'}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateTodo(t.id, { list_id: effectiveTargetListId });
                                                }}
                                                className="px-3 py-1 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-2xs shrink-0 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Añadir
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-3 flex justify-end border-t border-gray-200 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddBoardTaskModalOpen(false)}
                                    className="px-4 py-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ASSIGN TASK TO LIST MODAL */}
            <Modal
                isOpen={!!assignListTodoId}
                onClose={() => setAssignListTodoId(null)}
                title="Asignar Tarea a una Lista"
            >
                {(() => {
                    const targetTodo = projectTodos.find(t => t.id === assignListTodoId);
                    const lists = activeProject?.lists || [];

                    if (!targetTodo) return null;

                    if (lists.length === 0) {
                        return (
                            <div className="space-y-4 text-center py-4">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500">
                                    <List className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">No hay listas creadas</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                                        Este proyecto aún no tiene listas personalizadas a las cuales asignar esta tarea.
                                    </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setAssignListTodoId(null)}
                                        className="px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAssignListTodoId(null);
                                            setCreateListModal({ isOpen: true, templateType: 'project_tracking' });
                                        }}
                                        className="px-3.5 py-1.5 text-xs font-semibold text-white dark:text-black bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 transition-colors shadow-2xs"
                                    >
                                        Crear Primera Lista
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Selecciona la lista a la cual deseas asignar la tarea <strong className="text-gray-900 dark:text-white">"{targetTodo.text}"</strong>:
                            </p>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {lists.map(list => {
                                    const isCurrent = targetTodo.list_id === list.id;
                                    return (
                                        <button
                                            key={list.id}
                                            type="button"
                                            onClick={() => {
                                                updateTodo(targetTodo.id, { list_id: list.id });
                                                setAssignListTodoId(null);
                                            }}
                                            className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                                isCurrent
                                                    ? 'bg-gray-100 dark:bg-zinc-800 border-gray-400 dark:border-gray-600 font-semibold text-gray-900 dark:text-white'
                                                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <List className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{list.name}</span>
                                            </div>
                                            {isCurrent && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium">Asignada</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            {targetTodo.list_id && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateTodo(targetTodo.id, { list_id: null as any });
                                            setAssignListTodoId(null);
                                        }}
                                        className="w-full text-center py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors font-medium"
                                    >
                                        Quitar de la lista actual
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default ProjectsWorkspace;
