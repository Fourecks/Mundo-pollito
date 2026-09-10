import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Project, Todo, Sprint, Milestone, ProjectDoc, ProjectDocFolder, ProjectInboxItem, ProjectChatMessage, ProjectActivity, ProjectInvitation, ProjectChannel, ProjectPoll, ProjectHuddle, PushNotificationPreferences, ProjectQuarterlyPriority, ProjectMember, ProjectList, ProjectListItem, Priority, ProjectExpense, Folder, Note } from '../types';
import { sendPushNotification } from '../services/pushNotificationService';
import ProjectNoteEditorModal from './ProjectNoteEditorModal';
import PersonalProjectSettings from './PersonalProjectSettings';
import { 
  Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight, Users, MessageSquare, Video, Search, FolderPlus, Folder as FolderIcon, FolderOpen, Download, Send, Paperclip, Smile, Pin, ExternalLink, Shield, FileSpreadsheet, FileCode, FileImage, FileArchive, File as FileIcon, Share2, HelpCircle, AlertTriangle, RefreshCw, ThumbsUp, Heart, Flame, Eye, Lightbulb, Megaphone, Flag, Filter, Hash, Lock, Volume2, Mic, MicOff, Camera, CameraOff, Monitor, Maximize2, Minimize2, Grid, List, ListOrdered, CheckSquare as CheckSquareIcon, Bell, BellOff, MessageCircle, SlidersHorizontal, PieChart, BarChart3, ChevronLeft, ChevronDown, LayoutGrid, Upload, BookOpen, FilePlus, ChevronRight, MoreHorizontal, DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, isPast, isToday, isThisWeek, isThisMonth, isThisYear, isTomorrow, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cleanToPlainText } from '../utils/textCleaner';

interface ProjectsWorkspaceProps {
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
    currentUser,
    projects,
    notes,
    folders,
    onAddFolder,
    onUpdateFolder,
    onDeleteFolder,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onOpenNotesModule,
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
    pushPreferences,
    isMobile = false,
    onBack
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'sprints' | 'roadmap' | 'docs' | 'chat' | 'expenses' | 'time' | 'team' | 'listas' | 'mas_menu' | 'mis_tareas'>('overview');
    
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
    const [isQuickMessageModalOpen, setIsQuickMessageModalOpen] = useState(false);
    const [quickMessageText, setQuickMessageText] = useState('');
    
    // Chat States
    const [chatText, setChatText] = useState('');
    const [isChatInputFocused, setIsChatInputFocused] = useState(false);
    const [chatSearch, setChatSearch] = useState('');
    const [replyingToMessage, setReplyingToMessage] = useState<ProjectChatMessage | null>(null);
    const [showDocPickerInChat, setShowDocPickerInChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatFileInputRef = useRef<HTMLInputElement>(null);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [isChatAttachSheetOpen, setIsChatAttachSheetOpen] = useState(false);
    const [activeMobileActionMessageId, setActiveMobileActionMessageId] = useState<string | null>(null);

    // Communication & Channels States
    const [selectedChannelId, setSelectedChannelId] = useState<string>('general');
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelDescription, setNewChannelDescription] = useState('');
    const [newChannelEmoji, setNewChannelEmoji] = useState('#');
    const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);

    // Channel Edit/Delete States
    const [isConfirmClearChannelOpen, setIsConfirmClearChannelOpen] = useState(false);
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
    const [editingProjectNote, setEditingProjectNote] = useState<Note | null>(null);
    const [showOnlyNotesView, setShowOnlyNotesView] = useState<boolean>(false);
    const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);
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
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [mobileTaskFilters, setMobileTaskFilters] = useState<{
        status?: 'completed' | 'pending';
        sprint?: string;
        list?: string;
        assignee?: string;
        priority?: 'low' | 'medium' | 'high';
        dueDate?: 'overdue' | 'today' | 'upcoming' | 'nodate';
    }>({});
    const [mobileKanbanColumn, setMobileKanbanColumn] = useState<string>('');
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [personalFilter, setPersonalFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');

    const [newItemTitle, setNewItemTitle] = useState<string>('');
    const [newItemAssignee, setNewItemAssignee] = useState<string>('');
    const [newItemDueDate, setNewItemDueDate] = useState<string>('');
    const [newItemStartTime, setNewItemStartTime] = useState<string>('');
    const [newItemNotes, setNewItemNotes] = useState<string>('');
    const [newItemKanbanColumn, setNewItemKanbanColumn] = useState<string>('Por hacer');
    const [newItemPriority, setNewItemPriority] = useState<Priority>('medium');
    const [isAddBoardTaskModalOpen, setIsAddBoardTaskModalOpen] = useState<boolean>(false);
    const [assignListTodoId, setAssignListTodoId] = useState<string | null>(null);

    // Mobile specific drawers & popup data capture states
    const [isMobileChannelDrawerOpen, setIsMobileChannelDrawerOpen] = useState(false);
    const [isMobileFolderDrawerOpen, setIsMobileFolderDrawerOpen] = useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [isAddListItemModalOpen, setIsAddListItemModalOpen] = useState(false);
    const [kanbanAddModalCol, setKanbanAddModalCol] = useState<string | null>(null);

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

    const effectiveTab = useMemo(() => {
        if (!activeProject) return activeTab;
        if (activeProject.project_mode === 'personal') {
            return ['overview', 'listas', 'kanban', 'settings'].includes(activeTab) ? activeTab : 'overview';
        }
        return activeTab;
    }, [activeProject, activeTab]);

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

    const checkIsUser = (msgEmail?: string, msgId?: string) => {
        if (msgId && currentUser?.id && msgId === currentUser.id) {
            return true;
        }
        if (!msgEmail) return false;
        
        const emailLower = msgEmail.toLowerCase().trim();
        const currentEmailLower = currentUser?.email?.toLowerCase().trim();
        
        if (emailLower === 'usuario@local.com') {
            return !currentEmailLower; // Only match if the local user is also using the local fallback email
        }
        
        if (currentEmailLower) {
            return emailLower === currentEmailLower;
        }
        
        return emailLower === currentUserEmail.toLowerCase().trim();
    };

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
            if (checkIsUser(m.sender_email, m.sender_id)) return false;
            if (!lastRead) return true;
            return m.created_at > lastRead;
        }).length;
    }, [activeProject, lastReadTimes, currentUserEmail]);

    // Tracking tab visit times per project
    const [tabsLastVisitedTimes, setTabsLastVisitedTimes] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem(`project_tabs_last_visited_${currentUserEmail}_${activeProject?.id || 'none'}`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        if (!activeProject || !currentUserEmail) return;
        const key = `project_tabs_last_visited_${currentUserEmail}_${activeProject.id}`;
        let saved: Record<string, string> = {};
        try {
            const savedStr = localStorage.getItem(key);
            saved = savedStr ? JSON.parse(savedStr) : {};
        } catch {}

        // Mark current activeTab as visited now
        const now = new Date().toISOString();
        saved[activeTab] = now;
        localStorage.setItem(key, JSON.stringify(saved));
        setTabsLastVisitedTimes(saved);
    }, [activeProject?.id, activeTab, currentUserEmail]);

    useEffect(() => {
        if (!activeProject) return;
        if (activeProject.project_mode === 'personal') {
            if (!['overview', 'listas', 'kanban', 'settings'].includes(activeTab)) {
                setActiveTab('overview');
            }
        }
    }, [activeProject?.id]);

    // Calculate unread counts for all other tabs based on when they were last visited and if they were created by another user
    const unreadTabCounts = useMemo(() => {
        const counts: Record<string, number> = {
            listas: 0,
            docs: 0,
            expenses: 0,
            time: 0,
        };

        if (!activeProject) return counts;

        const checkIsOtherUser = (email?: string | null) => {
            if (!email) return false;
            return email.toLowerCase() !== currentUserEmail?.toLowerCase();
        };

        // 1. Listas (new lists created by others)
        if (activeProject.lists) {
            const lastVisited = tabsLastVisitedTimes['listas'];
            counts.listas = activeProject.lists.filter(list => {
                const isOther = checkIsOtherUser(list.created_by);
                if (!isOther) return false;
                if (!lastVisited) return true;
                return list.created_at > lastVisited;
            }).length;
        }

        // 2. Docs (new docs created by others)
        if (activeProject.docs) {
            const lastVisited = tabsLastVisitedTimes['docs'];
            counts.docs = activeProject.docs.filter(doc => {
                const isOther = checkIsOtherUser(doc.created_by);
                if (!isOther) return false;
                if (!lastVisited) return true;
                return doc.created_at > lastVisited;
            }).length;
        }

        // 3. Expenses (new expenses created by others)
        if (activeProject.expenses) {
            const lastVisited = tabsLastVisitedTimes['expenses'];
            counts.expenses = activeProject.expenses.filter(exp => {
                const isOther = checkIsOtherUser(exp.created_by);
                if (!isOther) return false;
                if (!lastVisited) return true;
                return exp.created_at > lastVisited;
            }).length;
        }

        // 4. Time Entries (new time entries logged by others)
        if (activeProject.time_entries) {
            const lastVisited = tabsLastVisitedTimes['time'];
            counts.time = activeProject.time_entries.filter(te => {
                const isOther = checkIsOtherUser(te.user_email);
                if (!isOther) return false;
                if (!lastVisited) return true;
                return te.created_at > lastVisited;
            }).length;
        }

        return counts;
    }, [activeProject, tabsLastVisitedTimes, currentUserEmail]);

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

    const currentChannel = useMemo(() => {
        if (!activeChannels || activeChannels.length === 0) {
            return { id: 'general', name: 'general', emoji: '💬', description: 'Canal principal' };
        }
        return activeChannels.find(c => c.id === selectedChannelId) || activeChannels[0] || { id: 'general', name: 'general', emoji: '💬', description: 'Canal principal' };
    }, [activeChannels, selectedChannelId]);

    const handleClearChannelMessages = () => {
        if (!activeProject || !isProjectCreator) return;
        const messages = activeProject.chat_messages || [];
        const filteredMessages = messages.filter(m => {
            const isChan = (m.channel_id || 'general') === currentChannel.id;
            return !isChan;
        });
        onUpdateProject(activeProject.id, { chat_messages: filteredMessages });
        setIsConfirmClearChannelOpen(false);
    };

    const activePolls = useMemo(() => {
        if (!activeProject) return [];
        return activeProject.polls || [];
    }, [activeProject]);



    // Handle channel redirection from notifications
    const pendingRedirectChannelRef = useRef<string | null>(null);

    const applyPendingChannelRedirect = React.useCallback((targetChannelId?: string) => {
        const chanId = targetChannelId || pendingRedirectChannelRef.current || (window as any).__pendingProjectChannel?.channelId;
        if (chanId) {
            setActiveTab('chat');
            setSelectedChannelId(chanId);
            pendingRedirectChannelRef.current = null;
            try {
                delete (window as any).__pendingProjectChannel;
            } catch (e) {}
        }
    }, []);

    React.useEffect(() => {
        applyPendingChannelRedirect();
    }, [activeProject?.id, applyPendingChannelRedirect]);

    React.useEffect(() => {
        const handleRedirect = (e: Event) => {
            const customEvent = e as CustomEvent<{ projectId: number; channelId: string }>;
            if (customEvent.detail) {
                const { channelId } = customEvent.detail;
                if (channelId) {
                    setActiveTab('chat');
                    setSelectedChannelId(channelId);
                    pendingRedirectChannelRef.current = null;
                    // Also clear global pending redirect to avoid "forcing" back to this channel
                    try {
                        delete (window as any).__pendingProjectChannel;
                    } catch (e) {}
                }
            }
        };

        window.addEventListener('app-redirect-project-channel', handleRedirect);
        return () => {
            window.removeEventListener('app-redirect-project-channel', handleRedirect);
        };
    }, []);



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
    }, [activeChannels, selectedChannelId]);

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
                folder_name: folder ? folder.name : 'General'
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

    // Helper: Share Note into Channel via Share Modal
    const handleOpenShareNote = (note: Note) => {
        const docLike: ProjectDoc = {
            id: `note-${note.id}`,
            project_id: activeProject?.id || 0,
            title: note.title || 'Nota sin título',
            content: note.content || '',
            category: 'Meeting Notes',
            file_type: 'note',
            file_name: `${(note.title || 'Nota').replace(/[^\w\s-]/gi, '')}.md`,
            created_by: currentUserEmail,
            created_at: note.created_at,
            updated_at: note.updated_at
        };
        handleOpenShareDoc(docLike);
    };

    // Helper: Delete Document
    const handleDeleteDoc = (docId: string) => {
        if (!activeProject) return;
        if (window.confirm('¿Estás seguro de eliminar este documento o archivo?')) {
            const updatedDocs = (activeProject.docs || []).filter(d => d.id !== docId);
            onUpdateProject(activeProject.id, { docs: updatedDocs });
        }
    };

    // Helper: Delete Doc Folder
    const handleDeleteDocFolder = (folderId: string) => {
        if (!activeProject) return;
        if (window.confirm('¿Eliminar esta carpeta de documentos? Los archivos contenidos se conservarán en la raíz del proyecto.')) {
            const updatedFolders = (activeProject.doc_folders || []).filter(f => f.id !== folderId);
            const updatedDocs = (activeProject.docs || []).map(d => d.folder_id === folderId ? { ...d, folder_id: null } : d);
            onUpdateProject(activeProject.id, { doc_folders: updatedFolders, docs: updatedDocs });
            if (selectedFolderId === folderId) {
                setSelectedFolderId(null);
            }
        }
    };

    // Helper: Create a Note for this Project (associated with folder in Notes module named with project name and synced with project folder)
    const handleCreateProjectNote = async () => {
        if (!activeProject) return;

        const folderName = activeProject.name || 'Proyecto';
        let targetNotesFolder = folders.find(f => (f.project_id && f.project_id === activeProject.id) || f.name.trim().toLowerCase() === folderName.trim().toLowerCase());

        if (!targetNotesFolder) {
            const created = await onAddFolder(folderName, activeProject.id);
            if (created) targetNotesFolder = created;
        }

        const notesFolderId = targetNotesFolder ? targetNotesFolder.id : null;

        const newNote = await onAddNote(notesFolderId, activeProject.id);
        if (newNote) {
            if (selectedFolderId) {
                const updatedNote: Note = {
                    ...newNote,
                    project_doc_folder_id: selectedFolderId
                };
                await onUpdateNote(updatedNote);
            }

            if (onOpenNotesModule) {
                onOpenNotesModule(newNote.id, notesFolderId);
            } else {
                setEditingProjectNote(newNote);
            }
        }
    };

    // Helper: Delete a Note belonging to this Project
    const handleDeleteProjectNote = async (noteId: number) => {
        if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
            await onDeleteNote(noteId, null);
            if (editingProjectNote?.id === noteId) {
                setEditingProjectNote(null);
            }
        }
    };

    // Helper: Generic File Processor (for file input and drag-and-drop)
    const processFileUpload = (file: File) => {
        if (!file || !activeProject) return;

        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        const saveDocument = (fileObj: File, fileUrl: string, fileSize: number) => {
            let category: ProjectDoc['category'] = 'Other';
            if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'Specifications';
            else if (['docx', 'doc', 'pdf'].includes(ext)) category = 'Requirements';
            else if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) category = 'Ideas';

            const newDoc: ProjectDoc = {
                id: crypto.randomUUID(),
                project_id: activeProject!.id,
                folder_id: selectedFolderId,
                title: fileObj.name,
                content: `Archivo adjunto: ${fileObj.name} (${(fileSize / 1024).toFixed(1)} KB)`,
                category,
                file_url: fileUrl,
                file_name: fileObj.name,
                file_type: fileObj.type || ext,
                file_size: fileSize,
                created_by: currentUserEmail,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const updatedDocs = [newDoc, ...(activeProject!.docs || [])];
            onUpdateProject(activeProject!.id, { docs: updatedDocs });
        };

        // If it's an image, compress it first to save space
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        if (width > height) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        } else {
                            width = Math.round((width * MAX_HEIGHT) / height);
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        saveDocument(file, compressedDataUrl, Math.round(compressedDataUrl.length * 0.75));
                    } else {
                        saveDocument(file, event.target?.result as string, file.size);
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        } else {
            // General file size validation (max 2.5 MB)
            if (file.size > 2.5 * 1024 * 1024) {
                alert(`El archivo "${file.name}" supera el límite recomendado de 2.5 MB.\n\nPor favor, sube un archivo más ligero o enlaza a tu nube.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                saveDocument(file, reader.result as string, file.size);
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper: File Upload from input
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFileUpload(file);
            if (e.target) e.target.value = '';
        }
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

    const renderMasMenu = () => {
        const sections = [
            {
                title: 'PLANIFICACIÓN',
                items: [
                    { id: 'sprints', label: 'Sprints', icon: Target, badge: 0 },
                    { id: 'roadmap', label: 'Hoja de Ruta', icon: CalendarIcon, badge: 0 }
                ]
            },
            {
                title: 'RECURSOS',
                items: [
                    { id: 'docs', label: 'Documentos', icon: FileText, badge: unreadTabCounts.docs }
                ]
            },
            {
                title: 'GESTIÓN',
                items: [
                    { id: 'expenses', label: 'Gastos', icon: FileSpreadsheet, badge: unreadTabCounts.expenses },
                    { id: 'time', label: 'Tiempo', icon: Clock, badge: unreadTabCounts.time }
                ]
            },
            {
                title: 'PROYECTO',
                items: [
                    { id: 'team', label: 'Equipo', icon: Users, badge: 0 },
                    { id: 'settings', label: 'Configuración', icon: Settings, badge: 0 }
                ]
            }
        ];

        return (
            <div className="p-4 space-y-6 h-full overflow-y-auto pb-28 font-sans">
                {sections.map(sec => (
                    <div key={sec.title} className="space-y-2">
                        <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase px-1">
                            {sec.title}
                        </h4>
                        <div className="space-y-1.5">
                            {sec.items.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            if (tab.id === 'settings') {
                                                if (onOpenProjectEditor && activeProject) onOpenProjectEditor(activeProject);
                                            } else {
                                                setActiveTab(tab.id as any);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-100/80 dark:border-zinc-800/80 active:scale-[0.99] hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all shadow-2xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl">
                                                <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                                            </div>
                                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                                                {tab.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {tab.badge && tab.badge > 0 ? (
                                                <span className="px-2 py-0.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold rounded-full">
                                                    {tab.badge}
                                                </span>
                                            ) : null}
                                            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderMisTareas = () => {
        if (!activeProject) return null;
        const myTodos = projectTodos.filter(t => (t.assigned_to === currentUserEmail || t.created_by === currentUserEmail));
        
        const atrasadas = myTodos.filter(t => !t.completed && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
        const hoy = myTodos.filter(t => !t.completed && t.due_date && isToday(parseISO(t.due_date)));
        const proximas = myTodos.filter(t => !t.completed && t.due_date && !isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
        const sinFecha = myTodos.filter(t => !t.completed && !t.due_date);
        const completadas = myTodos.filter(t => t.completed);

        const groups = [
            { label: 'Atrasadas', tasks: atrasadas, color: 'text-red-500' },
            { label: 'Hoy', tasks: hoy, color: 'text-amber-500' },
            { label: 'Próximas', tasks: proximas, color: 'text-blue-500' },
            { label: 'Sin Fecha', tasks: sinFecha, color: 'text-zinc-500 dark:text-zinc-400' },
            { label: 'Completadas', tasks: completadas, color: 'text-emerald-500' }
        ];

        return (
            <div className="p-4 h-full overflow-y-auto pb-24 space-y-6 font-sans">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mis Tareas</h2>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{myTodos.length} tareas asignadas o creadas por ti</p>
                    </div>
                </div>
                
                {myTodos.length === 0 ? (
                    <div className="text-center py-10 opacity-60 text-sm">
                        No tienes tareas pendientes en este proyecto.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groups.map(group => group.tasks.length > 0 && (
                            <div key={group.label} className="space-y-2">
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${group.color}`}>
                                    {group.label} ({group.tasks.length})
                                </h3>
                                <div className="space-y-2">
                                    {group.tasks.map(task => (
                                        <div key={task.id} className="p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-start gap-3 shadow-xs active:scale-[0.98] transition-transform" onClick={() => onEditTodo && onEditTodo(task)}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateTodo(task.id, { completed: !task.completed });
                                                }}
                                                className="mt-0.5 shrink-0"
                                            >
                                                {task.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`text-xs font-semibold truncate ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{task.text}</h3>
                                                {task.list_id && (
                                                    <p className="text-[10px] font-bold text-zinc-500 mt-0.5 uppercase tracking-wide">
                                                        Lista: {activeProject.lists?.find(l => l.id === task.list_id)?.name || 'General'}
                                                    </p>
                                                )}
                                                {task.due_date && !task.completed && (
                                                    <p className={`text-[10px] font-bold mt-0.5 ${group.color}`}>
                                                        Vence: {format(parseISO(task.due_date), 'd MMM', { locale: es })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

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

        if (isMobile) {
            let mobileMainTab = 'inicio';
            if (['mis_tareas', 'listas', 'kanban'].includes(activeTab)) mobileMainTab = 'tareas';
            if (activeTab === 'chat') mobileMainTab = 'chat';
            if (['mas_menu', 'sprints', 'roadmap', 'docs', 'expenses', 'time', 'team'].includes(activeTab)) mobileMainTab = 'mas';

            return (
                <div className="bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 shadow-xs shrink-0 select-none">
                    {/* Compact Mobile Top Bar: Project name, sleek controls */}
                    <div className="px-3 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80">
                        <div className="flex items-center gap-2">
                            {['sprints', 'roadmap', 'docs', 'expenses', 'time', 'team'].includes(activeTab) ? (
                                <button
                                    onClick={() => setActiveTab('mas_menu')}
                                    className="p-1.5 -ml-1 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all flex items-center gap-1"
                                    aria-label="Volver a Más"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Volver</span>
                                </button>
                            ) : onBack ? (
                                <button
                                    onClick={onBack}
                                    className="p-1.5 -ml-1 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                                    aria-label="Volver a lista de proyectos"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            ) : null}
                            <div className="flex items-center gap-2 max-w-[200px]">
                                <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight truncate">
                                    {activeTab === 'sprints' ? 'Sprints' :
                                     activeTab === 'roadmap' ? 'Hoja de Ruta' :
                                     activeTab === 'docs' ? 'Documentos' :
                                     activeTab === 'expenses' ? 'Gastos' :
                                     activeTab === 'time' ? 'Tiempo' :
                                     activeTab === 'team' ? 'Equipo' :
                                     activeProject.name}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsQuickAddOpen(true)}
                                className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                aria-label="Agregar al proyecto"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setInboxModalOpen(true)}
                                className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 relative transition-colors"
                                aria-label="Bandeja de entrada"
                            >
                                <Inbox className="w-5 h-5" />
                                {activeProject.inbox && activeProject.inbox.length > 0 && (
                                    <span className="absolute top-1.5 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* New Mobile 4-Tab Navigation */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800/80">
                        {(activeProject.project_mode === 'personal'
                            ? [
                                { id: 'inicio', label: 'Resumen', target: 'overview' },
                                { id: 'tareas', label: 'Tareas', target: 'listas' },
                                { id: 'tablero', label: 'Tablero', target: 'kanban' }
                              ]
                            : [
                                { id: 'inicio', label: 'Inicio', target: 'overview' },
                                { id: 'tareas', label: 'Tareas', target: 'mis_tareas' },
                                { id: 'chat', label: 'Chat', target: 'chat' },
                                { id: 'mas', label: 'Más', target: 'mas_menu' }
                              ]
                        ).map(tab => {
                            const isActive = activeProject.project_mode === 'personal'
                                ? activeTab === tab.target
                                : mobileMainTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.target as any)}
                                    className={`relative px-2 py-1.5 text-sm font-bold transition-all ${
                                        isActive 
                                            ? 'text-gray-900 dark:text-white' 
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.div 
                                            layoutId="mobileProjectNavIndicator"
                                            className="absolute bottom-[-8px] left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sub-navigation for Tareas */}
                    {activeProject.project_mode !== 'personal' && mobileMainTab === 'tareas' && (
                        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar scrollbar-none border-b border-gray-100 dark:border-gray-800/80">
                            {[
                                { id: 'mis_tareas', label: 'Mis tareas' },
                                { id: 'listas', label: 'Todas' },
                                { id: 'kanban', label: 'Tablero' }
                            ].map(sub => {
                                const isActive = activeTab === sub.id;
                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveTab(sub.id as any)}
                                        className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors whitespace-nowrap ${
                                            isActive
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                                : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
                                        }`}
                                    >
                                        {sub.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
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
                        {(activeProject.project_mode === 'personal'
                            ? [
                                { id: 'overview', label: 'Resumen', icon: Activity },
                                { id: 'listas', label: 'Tareas', icon: CheckSquareIcon },
                                { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                                { id: 'settings', label: 'Configuración', icon: Settings },
                              ]
                            : [
                                { id: 'overview', label: 'Resumen', icon: Activity },
                                { id: 'kanban', label: 'Tablero', icon: AlignLeft },
                                { id: 'listas', label: 'Listas', icon: CheckSquareIcon, badge: unreadTabCounts.listas },
                                { id: 'sprints', label: 'Sprints', icon: Target },
                                { id: 'roadmap', label: 'Hoja de Ruta', icon: CalendarIcon },
                                { id: 'docs', label: 'Documentos', icon: FileText, badge: unreadTabCounts.docs },
                                { id: 'chat', label: 'Canales', icon: MessageSquare, badge: unreadChatMessagesCount },
                                { id: 'expenses', label: 'Gastos', icon: FileSpreadsheet, badge: unreadTabCounts.expenses },
                                { id: 'time', label: 'Tiempo', icon: Clock, badge: unreadTabCounts.time },
                                { id: 'team', label: 'Equipo', icon: Users },
                              ]
                        ).map(tab => (
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
            </div>
        );
    };

    const renderPersonalSettings = () => {
        if (!activeProject) return null;
        return (
            <PersonalProjectSettings
                project={activeProject}
                onUpdate={onUpdateProject}
                onArchive={onArchiveProject}
                onDelete={onDeleteProject}
                onSelectProject={onSelectProject}
                setActiveTab={setActiveTab}
            />
        );
    };

    // OVERVIEW TAB
    const renderPersonalOverview = () => {
        if (!activeProject) return null;

        const totalTasks = projectTodos.length;
        const completedTasksCount = projectTodos.filter(t => t.completed || t.kanban_column === 'Completado').length;
        const inProgressTasksCount = projectTodos.filter(t => !t.completed && (t.kanban_column === 'En progreso' || t.kanban_column === 'En proceso')).length;
        const pendingTasksCount = projectTodos.filter(t => !t.completed && t.kanban_column !== 'En progreso' && t.kanban_column !== 'En proceso' && t.kanban_column !== 'Completado').length;
        
        const progress = totalTasks === 0 ? 0 : Math.round((completedTasksCount / totalTasks) * 100);

        // PRÓXIMAS: incomplete, due_date is in future or today
        const upcomingTasks = projectTodos
            .filter(t => !t.completed && t.due_date && (!isPast(parseISO(t.due_date)) || isToday(parseISO(t.due_date))))
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

        // ATRASADAS: incomplete, due_date in the past and NOT today
        const overdueTasks = projectTodos
            .filter(t => !t.completed && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

        const getFriendlyDate = (dateStr?: string) => {
            if (!dateStr) return '';
            try {
                const date = parseISO(dateStr);
                if (isToday(date)) return 'Hoy';
                if (isTomorrow(date)) return 'Mañana';
                if (isYesterday(date)) return 'Ayer';
                return format(date, 'd MMM', { locale: es });
            } catch (e) {
                return dateStr;
            }
        };

        return (
            <div className="p-6 max-w-2xl mx-auto space-y-8 w-full pb-24 font-sans text-gray-900 dark:text-gray-100 h-full overflow-y-auto">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>{activeProject.emoji || '📁'}</span>
                        <span>{activeProject.name}</span>
                    </h1>
                    {activeProject.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            {activeProject.description}
                        </p>
                    )}
                    {activeProject.target_date && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 pt-1">
                            <CalendarIcon className="w-4 h-4 shrink-0 text-zinc-400" />
                            <span>Objetivo: {getFriendlyDate(activeProject.target_date)}</span>
                        </div>
                    )}
                </div>

                {/* Progress Card */}
                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-2xs space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                {progress}%
                            </span>
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Progreso General
                            </p>
                        </div>
                        <span className="text-xs font-bold text-zinc-400">
                            {completedTasksCount} de {totalTasks} tareas completadas
                        </span>
                    </div>

                    <div className="w-full bg-gray-200/60 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="bg-zinc-900 dark:bg-white h-full rounded-full"
                        />
                    </div>
                </div>

                {/* Task Count grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-zinc-900/20 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 text-center shadow-3xs">
                        <span className="block text-xl font-extrabold text-zinc-700 dark:text-zinc-300">
                            {pendingTasksCount}
                        </span>
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mt-1">
                            Pendientes
                        </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/20 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 text-center shadow-3xs">
                        <span className="block text-xl font-extrabold text-amber-600 dark:text-amber-400">
                            {inProgressTasksCount}
                        </span>
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mt-1">
                            En proceso
                        </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/20 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 text-center shadow-3xs">
                        <span className="block text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {completedTasksCount}
                        </span>
                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mt-1">
                            Completadas
                        </span>
                    </div>
                </div>

                {/* PRÓXIMAS Tasks Section */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Próximas Tareas
                    </h3>
                    <div className="space-y-2">
                        {upcomingTasks.length === 0 ? (
                            <p className="text-xs text-zinc-400 py-3 italic">No hay tareas próximas programadas.</p>
                        ) : (
                            upcomingTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onEditTodo && onEditTodo(task)}
                                    className="group flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900/40 hover:bg-gray-50/50 dark:hover:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 rounded-xl transition-all cursor-pointer shadow-3xs"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateTodo(task.id, { completed: true });
                                            }}
                                            className="shrink-0 focus:outline-none"
                                        >
                                            <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700 hover:text-zinc-400 transition-colors" />
                                        </button>
                                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                                            {task.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400">
                                            {getFriendlyDate(task.due_date)}
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ATRASADAS Tasks Section */}
                {overdueTasks.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-wider text-red-500 dark:text-red-400">
                            Tareas Atrasadas
                        </h3>
                        <div className="space-y-2">
                            {overdueTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => onEditTodo && onEditTodo(task)}
                                    className="group flex items-center justify-between p-3.5 bg-red-50/20 dark:bg-red-950/5 hover:bg-red-50/40 dark:hover:bg-red-950/10 border border-red-100/50 dark:border-red-950/30 rounded-xl transition-all cursor-pointer shadow-3xs"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateTodo(task.id, { completed: true });
                                            }}
                                            className="shrink-0 focus:outline-none"
                                        >
                                            <Circle className="w-5 h-5 text-red-300 dark:text-red-900/60 hover:text-red-400 transition-colors" />
                                        </button>
                                        <span className="text-sm font-semibold text-red-900 dark:text-red-200 truncate">
                                            {task.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100/60 dark:bg-red-950 text-red-700 dark:text-red-400">
                                            {getFriendlyDate(task.due_date)}
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-red-350 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderOverview = () => {
        if (!activeProject) return null;

        if (activeProject.project_mode === 'personal') {
            return renderPersonalOverview();
        }
        
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

        if (isMobile) {
            const myPendingTodos = projectTodos.filter(t => !t.completed && (t.assigned_to === currentUserEmail || t.created_by === currentUserEmail));
            const myOverdue = myPendingTodos.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
            const myToday = myPendingTodos.filter(t => t.due_date && isToday(parseISO(t.due_date)));
            const myUpcoming = myPendingTodos.filter(t => t.due_date && !isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
            const myNoDate = myPendingTodos.filter(t => !t.due_date);
            
            const myTopTasks = [...myOverdue, ...myToday, ...myUpcoming, ...myNoDate].slice(0, 3);

            return (
                <div className="p-4 w-full h-full overflow-y-auto pb-28 space-y-4 font-sans">
                    {/* 1. Progreso del Proyecto */}
                    <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Progreso del Proyecto</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthBadgeClass}`}>
                                {healthLabel}
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{progress}%</span>
                            <span className="text-xs font-semibold text-gray-500">{completedTasks} de {totalTasks} tareas</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* 2. Para Mí */}
                    {myTopTasks.length > 0 && (
                        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Para mí
                                </h3>
                                <button
                                    onClick={() => setActiveTab('mis_tareas')}
                                    className="text-[11px] text-blue-500 font-semibold"
                                >
                                    Ver mis tareas →
                                </button>
                            </div>
                            <div className="space-y-2">
                                {myTopTasks.map(task => (
                                    <div key={task.id} className="p-2.5 bg-gray-50 dark:bg-zinc-900/60 rounded-xl flex items-start gap-2.5 shadow-xs active:scale-[0.98] transition-transform cursor-pointer" onClick={() => onEditTodo && onEditTodo(task)}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateTodo(task.id, { completed: !task.completed });
                                            }}
                                            className="mt-0.5 shrink-0"
                                        >
                                            <Circle className="w-4 h-4 text-zinc-400" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xs font-semibold truncate text-zinc-900 dark:text-zinc-100">{task.text}</h3>
                                            {task.due_date && (
                                                <p className={`text-[10px] font-bold mt-0.5 ${isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) ? 'text-red-500' : isToday(parseISO(task.due_date)) ? 'text-amber-500' : 'text-zinc-500'}`}>
                                                    Vence: {format(parseISO(task.due_date), 'd MMM', { locale: es })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Metric Tiles (2x2) */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* 3. Sprint activo */}
                        <button
                            onClick={() => setActiveTab('sprints')}
                            className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs text-left active:scale-[0.98] transition-all flex flex-col h-full"
                        >
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Sprint Activo</span>
                            {activeSprint ? (
                                <>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{activeSprint.name}</span>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden mb-1">
                                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.round((activeSprint.todos.filter(t => t.completed).length / (activeSprint.todos.length || 1)) * 100)}%` }} />
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-medium mb-auto">
                                        {activeSprint.todos.filter(t => t.completed).length}/{activeSprint.todos.length} tareas
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs font-medium text-gray-500 mb-auto">Sin sprint activo</span>
                            )}
                            <span className="text-[10px] text-blue-500 font-bold mt-2 inline-block">
                                {activeSprint ? 'Ver sprint →' : 'Planificar →'}
                            </span>
                        </button>

                        {/* 4. Próximo hito */}
                        <button
                            onClick={() => setActiveTab('roadmap')}
                            className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs text-left active:scale-[0.98] transition-all flex flex-col h-full"
                        >
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Próximo Hito</span>
                            {pendingMilestones.length > 0 ? (
                                <>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{pendingMilestones[0].name}</span>
                                    {pendingMilestones[0].date && (
                                        <span className={`text-[10px] font-medium mb-auto ${isPast(parseISO(pendingMilestones[0].date)) && !isToday(parseISO(pendingMilestones[0].date)) ? 'text-red-500' : 'text-amber-500'}`}>
                                            {format(parseISO(pendingMilestones[0].date), 'd MMM yyyy', { locale: es })}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-xs font-medium text-gray-500 mb-auto">Sin hitos pendientes</span>
                            )}
                            <span className="text-[10px] text-blue-500 font-bold mt-2 inline-block">
                                {pendingMilestones.length > 0 ? 'Ver hoja de ruta →' : 'Crear hito →'}
                            </span>
                        </button>

                        {/* 5. Tareas Atrasadas */}
                        {overdueTasks.length > 0 && (
                            <button
                                onClick={() => {
                                    setListCustomView('due_date');
                                    setActiveTab('listas');
                                }}
                                className="bg-red-50 dark:bg-red-950/20 p-3.5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-xs text-left active:scale-[0.98] transition-all col-span-2 flex items-center justify-between"
                            >
                                <div>
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Atrasadas</span>
                                    <span className="text-sm font-black text-red-700 dark:text-red-300 block mt-0.5">
                                        {overdueTasks.length} tareas requieren atención
                                    </span>
                                </div>
                                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-white dark:bg-red-900/40 px-2 py-1 rounded-lg">
                                    Ver tareas →
                                </span>
                            </button>
                        )}
                    </div>

                    {/* 6. Tareas Recientes */}
                    <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <AlignLeft className="w-3.5 h-3.5 text-blue-500" /> Tareas Recientes
                            </h3>
                            <button
                                onClick={() => {
                                    setListCustomView('all');
                                    setActiveTab('listas');
                                }}
                                className="text-[11px] text-blue-500 font-semibold"
                            >
                                Ver todas ({projectTodos.length}) →
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                            {projectTodos.slice(0, 4).map(todo => (
                                <div
                                    key={todo.id}
                                    className="flex items-center gap-2.5 py-2.5 active:bg-gray-50 dark:active:bg-gray-800/20 cursor-pointer"
                                    onClick={() => onEditTodo && onEditTodo(todo)}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateTodo(todo.id, { completed: !todo.completed });
                                        }}
                                        className="shrink-0 p-0.5"
                                    >
                                        {todo.completed ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                    <span className={`text-xs flex-1 truncate ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white font-medium'}`}>
                                        {todo.text}
                                    </span>
                                </div>
                            ))}
                            {projectTodos.length === 0 && (
                                <p className="text-xs text-gray-400 py-4 text-center">No hay tareas creadas aún.</p>
                            )}
                        </div>
                    </div>

                    {/* 7. Anuncios */}
                    <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Inbox className="w-3.5 h-3.5 text-amber-500" /> Anuncios
                            </h3>
                            <button
                                onClick={() => setInboxModalOpen(true)}
                                className="text-[11px] text-blue-500 font-semibold"
                            >
                                + Publicar
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(activeProject.inbox || []).slice(0, 3).map(item => (
                                <div key={item.id} className="p-3 bg-gray-50 dark:bg-zinc-900/60 rounded-xl space-y-1 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-gray-900 dark:text-white truncate">
                                            {item.title || 'Comunicado'}
                                        </span>
                                        <span className="text-[9px] text-gray-400 shrink-0">
                                            {item.created_at ? format(parseISO(item.created_at), 'd MMM', { locale: es }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">{item.text}</p>
                                </div>
                            ))}
                            {(!activeProject.inbox || activeProject.inbox.length === 0) && (
                                <p className="text-xs text-gray-400 py-3 text-center">Sin anuncios recientes.</p>
                            )}
                        </div>
                    </div>
                </div>
            );
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
        const columns = activeProject.project_mode === 'personal'
            ? ['Por hacer', 'En proceso', 'Completado']
            : (activeProject.kanban_columns || ['Por hacer', 'En progreso', 'Completado']);

        const getColumnTasks = (colName: string) => {
            return projectTodos.filter(t => {
                if (colName === 'Completado' || colName === 'Completados' || colName === 'Completada' || colName === 'Completadas') {
                    return t.completed || t.kanban_column === 'Completado' || t.kanban_column === 'Completados' || t.kanban_column === 'Completada' || t.kanban_column === 'Completadas';
                }
                if (colName === 'Por hacer') {
                    return !t.completed && (t.kanban_column === 'Por hacer' || !t.kanban_column || t.kanban_column === '');
                }
                if (colName === 'En proceso' || colName === 'En progreso') {
                    return !t.completed && (t.kanban_column === 'En proceso' || t.kanban_column === 'En progreso');
                }
                return !t.completed && (t.kanban_column || columns[0]) === colName;
            });
        };
        
        if (isMobile) {
            const activeMobileCol = mobileKanbanColumn && columns.includes(mobileKanbanColumn) ? mobileKanbanColumn : columns[0];
            const activeColTasks = getColumnTasks(activeMobileCol);

            return (
                <div className="h-full flex flex-col font-sans">
                    {/* Horizontal Column Tabs */}
                    <div className="flex items-center p-2 gap-2 overflow-x-auto no-scrollbar scrollbar-none border-b border-gray-200 dark:border-gray-800 shrink-0">
                        {columns.map(col => (
                            <button
                                key={col}
                                onClick={() => setMobileKanbanColumn(col)}
                                className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-colors ${
                                    activeMobileCol === col 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                                        : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
                                }`}
                            >
                                {col} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeMobileCol === col ? 'bg-white/20 dark:bg-black/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                                    {getColumnTasks(col).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div 
                    className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#080808] space-y-3 pb-24"
                    onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                        if (touchStartX === null) return;
                        const diff = touchStartX - e.changedTouches[0].clientX;
                        const currentIndex = columns.indexOf(activeMobileCol);
                        if (diff > 50 && currentIndex < columns.length - 1) {
                            setMobileKanbanColumn(columns[currentIndex + 1]);
                        } else if (diff < -50 && currentIndex > 0) {
                            setMobileKanbanColumn(columns[currentIndex - 1]);
                        }
                        setTouchStartX(null);
                    }}
                >
                        {activeColTasks.length === 0 ? (
                            <div className="text-center py-10 opacity-60 text-sm font-medium">
                                No hay tareas en {activeMobileCol}.
                            </div>
                        ) : (
                            activeColTasks.map(todo => (
                                <div 
                                    key={todo.id} 
                                    onClick={() => onEditTodo && onEditTodo(todo)}
                                    className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-start gap-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { completed: !todo.completed }); }}
                                            className="mt-0.5 shrink-0"
                                        >
                                            {todo.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />}
                                        </button>
                                        <p className={`text-sm flex-1 font-semibold leading-snug ${todo.completed ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                            {todo.text}
                                        </p>
                                    </div>
                                    <div className="pl-8 flex flex-wrap items-center gap-2">
                                        {todo.assigned_to && (
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                {todo.assigned_to.split('@')[0]}
                                            </span>
                                        )}
                                        {todo.priority && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${todo.priority === 'high' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' : todo.priority === 'low' ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' : 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30'}`}>
                                                {todo.priority === 'high' ? 'Alta' : todo.priority === 'low' ? 'Baja' : 'Media'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="pl-8 pt-2 mt-2 border-t border-gray-100 dark:border-gray-800/60">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Mover a</label>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-1">
                                            {columns.filter(c => c !== activeMobileCol).map(c => (
                                                <button
                                                    key={c}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateTodo(todo.id, { kanban_column: c });
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        return (

            <div className="h-full flex overflow-x-auto p-6 gap-6 bg-gray-50/50 dark:bg-[#050505]">
                {columns.map((col) => {
                    const colTasks = getColumnTasks(col);
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

                                <button 
                                    onClick={() => {
                                        setKanbanAddModalCol(col);
                                        setNewTaskText('');
                                    }} 
                                    className="w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 flex items-center justify-center gap-1.5 hover:bg-gray-200/60 dark:hover:bg-zinc-800/80 rounded-xl transition-colors border border-dashed border-gray-300 dark:border-zinc-800"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Añadir Tarea
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* MODAL EMERGENTE PARA AÑADIR TAREA AL KANBAN */}
                <Modal
                    isOpen={kanbanAddModalCol !== null}
                    onClose={() => { setKanbanAddModalCol(null); setNewTaskText(''); }}
                    title={`Nueva Tarea en "${kanbanAddModalCol || ''}"`}
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (newTaskText.trim() && kanbanAddModalCol) {
                                addTodo(newTaskText.trim(), { projectId: activeProject.id, kanban_column: kanbanAddModalCol });
                            }
                            setKanbanAddModalCol(null);
                            setNewTaskText('');
                        }}
                        className="space-y-4 font-sans"
                    >
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Descripción de la tarea
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={newTaskText}
                                onChange={e => setNewTaskText(e.target.value)}
                                placeholder="¿Qué tarea deseas agregar?"
                                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => { setKanbanAddModalCol(null); setNewTaskText(''); }}
                                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-2xs"
                            >
                                Añadir Tarea
                            </button>
                        </div>
                    </form>
                </Modal>
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

        if (isMobile) {
            return (
                <div className="p-3.5 w-full h-full overflow-y-auto pb-28 space-y-3.5 font-sans">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Sprints ({sprints.length})
                        </span>
                        <button
                            onClick={() => setSprintModal({ isOpen: true, sprint: null })}
                            className="px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Crear Sprint
                        </button>
                    </div>

                    {sprints.length === 0 ? renderEmptyState('No hay Sprints configurados', 'Organiza el trabajo del equipo en iteraciones de 1 o 2 semanas.') : (
                        <div className="space-y-3">
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
                                    <div key={sprint.id} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-4 shadow-xs space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{sprint.name}</h3>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                                                sprint.status === 'active' ? 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100' :
                                                sprint.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                                'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400'
                                            }`}>
                                                {sprint.status === 'active' ? '● En Curso' : sprint.status === 'completed' ? '✓ Completado' : 'Planificación'}
                                            </span>
                                        </div>

                                        {sprint.goal && <p className="text-[11px] text-gray-500 line-clamp-2">{sprint.goal}</p>}

                                        {/* Progress */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-medium text-gray-400">
                                                <span>{completedTasks}/{totalTasks} tareas completadas</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 dark:bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[11px]">
                                            <button
                                                onClick={() => setSelectedSprintId(sprint.id)}
                                                className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                                            >
                                                <Layers className="w-3.5 h-3.5" /> Entrar ({sprintTasks.length})
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                {sprint.status === 'planning' && (
                                                    <button 
                                                        onClick={() => {
                                                            const updated = sprints.map(s => s.id === sprint.id ? { ...s, status: 'active' as const } : s);
                                                            onUpdateProject(activeProject.id, { sprints: updated });
                                                        }}
                                                        className="px-2 py-1 text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg font-semibold"
                                                    >
                                                        Iniciar
                                                    </button>
                                                )}
                                                {sprint.status === 'active' && (
                                                    <button 
                                                        onClick={() => setCloseSprintModal({ isOpen: true, sprint })}
                                                        className="px-2 py-1 text-[11px] bg-emerald-600 text-white rounded-lg font-semibold"
                                                    >
                                                        Cerrar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleShareSprintProgress}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg"
                                                    title="Compartir"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setSprintModal({ isOpen: true, sprint })} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                {isProjectCreator && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de eliminar el sprint "${sprint.name}"?`)) {
                                                                const updated = sprints.filter(s => s.id !== sprint.id);
                                                                onUpdateProject(activeProject.id, { sprints: updated });
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                                        title="Eliminar Sprint"
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
                    )}
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
                                            {isProjectCreator && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Estás seguro de eliminar el sprint "${sprint.name}"?`)) {
                                                            const updated = sprints.filter(s => s.id !== sprint.id);
                                                            onUpdateProject(activeProject.id, { sprints: updated });
                                                        }
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                    title="Eliminar Sprint (Solo Propietario)"
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
                )}
            </div>
        );
    };

    // ROADMAP TAB
    const renderRoadmap = () => {
        if (!activeProject) return null;
        const milestones = activeProject.milestones || [];

        if (isMobile) {
            return (
                <div className="p-3.5 w-full h-full overflow-y-auto pb-28 space-y-3.5 font-sans">
                    {/* Top Action Bar */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Hitos ({milestones.length})
                        </span>
                        <button
                            onClick={() => setMilestoneModal({ isOpen: true, milestone: null })}
                            className="px-3.5 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Nuevo Hito
                        </button>
                    </div>

                    {milestones.length === 0 ? renderEmptyState('Hoja de ruta sin hitos', 'Establece los objetivos clave y entregables del proyecto.') : (
                        <div className="space-y-3">
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
                                    <div key={ms.id} className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                        ms.status === 'completed' ? 'bg-emerald-500' : ms.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                                                    }`} />
                                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{ms.name}</h3>
                                                </div>
                                            </div>
                                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 shrink-0">
                                                {ms.category || 'General'}
                                            </span>
                                        </div>

                                        {ms.description && (
                                            <p className="text-[11px] text-gray-500 line-clamp-2">{ms.description}</p>
                                        )}

                                        {/* Status Switcher Pills */}
                                        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-zinc-900/60 p-1 rounded-xl">
                                            <button
                                                onClick={() => handleStatusChange('pending')}
                                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                                                    ms.status === 'pending'
                                                        ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                                                        : 'text-gray-400 hover:text-gray-700'
                                                }`}
                                            >
                                                Pendiente
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange('in_progress')}
                                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                                                    ms.status === 'in_progress'
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'text-gray-400 hover:text-gray-700'
                                                }`}
                                            >
                                                En Curso
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange('completed')}
                                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                                                    ms.status === 'completed'
                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                        : 'text-gray-400 hover:text-gray-700'
                                                }`}
                                            >
                                                Completado
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-500">
                                            <span>📅 {ms.target_date || 'Sin fecha límite'}</span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={handleShareMilestone}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg"
                                                    title="Compartir"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setMilestoneModal({ isOpen: true, milestone: ms })} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                {isProjectCreator && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de eliminar el hito "${ms.name}"?`)) {
                                                                const updated = milestones.filter(m => m.id !== ms.id);
                                                                onUpdateProject(activeProject.id, { milestones: updated });
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                                        title="Eliminar Hito"
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
                    )}
                </div>
            );
        }

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
                                                {isProjectCreator && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de eliminar el hito "${ms.name}"?`)) {
                                                                const updated = milestones.filter(m => m.id !== ms.id);
                                                                onUpdateProject(activeProject.id, { milestones: updated });
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                                        title="Eliminar Hito (Solo Propietario)"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
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

    // DOCUMENTATION & FILES TAB (ARCHIVOS, IMÁGENES Y NOTAS DEL PROYECTO - DISEÑO MINIMALISTA Y ELEGANTE)
    const renderDocs = () => {
        if (!activeProject) return null;

        const allProjectDocs = activeProject.docs || [];
        const projectFolders = activeProject.doc_folders || [];
        
        // Filter notes for this project based on current folder or all
        const projectNotes = notes.filter(n => {
            if (n.project_id !== activeProject.id || n.deleted_at) return false;
            if (selectedFolderId !== null) {
                return n.project_doc_folder_id === selectedFolderId;
            }
            return true;
        });

        // Filter docs by search and folder
        let filteredDocs = allProjectDocs;
        if (selectedFolderId) {
            filteredDocs = filteredDocs.filter(d => d.folder_id === selectedFolderId);
        }
        if (docSearchText.trim()) {
            const query = docSearchText.toLowerCase();
            filteredDocs = filteredDocs.filter(d => 
                (d.title || '').toLowerCase().includes(query) || 
                (d.file_name || '').toLowerCase().includes(query) ||
                (d.content || '').toLowerCase().includes(query)
            );
        }

        const activeFolderObj = projectFolders.find(f => f.id === selectedFolderId);

        return (
            <div className="w-full h-full flex flex-col bg-zinc-50/60 dark:bg-[#08080a] overflow-hidden text-zinc-900 dark:text-zinc-100">
                {/* Hidden File Input for uploading files & images */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.zip"
                />

                {/* HEADER MINIMALISTA Y ELEGANTE */}
                {isMobile ? (
                    <div className="px-4 py-3 bg-white dark:bg-[#0d0d0f] border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 shrink-0">
                        {/* Folder Toggle */}
                        <button
                            type="button"
                            onClick={() => setIsMobileFolderDrawerOpen(true)}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-1 text-[11px] font-bold shrink-0"
                            title="Ver carpetas"
                        >
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[70px]">{activeFolderObj ? activeFolderObj.name : 'Carpetas'}</span>
                            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                        </button>

                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar archivos..."
                                value={docSearchText}
                                onChange={e => setDocSearchText(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-colors"
                            />
                            {docSearchText && (
                                <button
                                    type="button"
                                    onClick={() => setDocSearchText('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Plus (+) Action Button with Popover */}
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                                className="p-2 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm"
                                title="Acciones"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            {isPlusMenuOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40 bg-transparent" 
                                        onClick={() => setIsPlusMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-100">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPlusMenuOpen(false);
                                                fileInputRef.current?.click();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left font-semibold"
                                        >
                                            <Upload className="w-4 h-4 text-zinc-500" />
                                            <span>Subir archivo</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPlusMenuOpen(false);
                                                setFolderModal({ isOpen: true, folder: null });
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left font-semibold border-t border-zinc-100 dark:border-zinc-900"
                                        >
                                            <FolderPlus className="w-4 h-4 text-zinc-500" />
                                            <span>Crear carpeta</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPlusMenuOpen(false);
                                                handleCreateProjectNote();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left font-semibold border-t border-zinc-100 dark:border-zinc-900"
                                        >
                                            <FilePlus className="w-4 h-4 text-zinc-500" />
                                            <span>Crear texto/nota</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="px-4 sm:px-6 py-3 bg-white dark:bg-[#0d0d0f] border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                        <div className="flex items-center gap-2">
                            {/* Mobile Folder Drawer Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsMobileFolderDrawerOpen(true)}
                                className="md:hidden px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs font-semibold"
                                title="Ver carpetas"
                            >
                                <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="truncate max-w-[110px]">{activeFolderObj ? activeFolderObj.name : 'Carpetas'}</span>
                                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                            </button>

                            <div className="hidden md:flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                                    <FolderOpen className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <span>Documentos & Archivos</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                            {allProjectDocs.length}
                                        </span>
                                    </h2>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {activeFolderObj ? `Carpeta: ${activeFolderObj.name}` : 'Todos los documentos, archivos y notas asociadas'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Acciones principales - Estilo monocromático refinado */}
                        <div className="flex items-center gap-2">
                            {/* Buscador */}
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar archivos..."
                                    value={docSearchText}
                                    onChange={e => setDocSearchText(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-44 sm:w-52 transition-colors"
                                />
                                {docSearchText && (
                                    <button
                                        type="button"
                                        onClick={() => setDocSearchText('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Conmutador de vista Grid / Table */}
                            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
                                <button
                                    type="button"
                                    onClick={() => setDocViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        docViewMode === 'grid'
                                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                                            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                                    title="Vista en Cuadrícula"
                                >
                                    <Grid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDocViewMode('table')}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        docViewMode === 'table'
                                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                                            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                                    title="Vista en Tabla"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Nueva Carpeta */}
                            <button
                                type="button"
                                onClick={() => setFolderModal({ isOpen: true, folder: null })}
                                className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg flex items-center gap-1.5 transition-colors"
                                title="Nueva Carpeta"
                            >
                                <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="hidden sm:inline">Carpeta</span>
                            </button>

                            {/* Subir Archivo */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <Upload className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Subir Archivo</span>
                            </button>

                            {/* Nueva Nota - Sincronizada con Módulo de Notas */}
                            <button
                                type="button"
                                onClick={handleCreateProjectNote}
                                className="px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                                title="Crear una nota para este proyecto (asociada al Módulo de Notas)"
                            >
                                <FilePlus className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Nueva Nota</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* CONTENIDO PRINCIPAL: VISTA DE ARCHIVOS E IMÁGENES */}
                <div className="w-full flex-1 flex overflow-hidden">
                    {/* DESPLEGABLE LATERAL MÓVIL PARA CARPETAS */}
                    {isMobileFolderDrawerOpen && (
                        <div className="fixed inset-0 z-[10000] flex md:hidden animate-in fade-in duration-200">
                            <div 
                                className="fixed inset-0 bg-black/50 backdrop-blur-xs"
                                onClick={() => setIsMobileFolderDrawerOpen(false)} 
                            />
                            <div className="relative w-4/5 max-w-xs h-full bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Carpetas</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMobileFolderDrawerOpen(false);
                                                setFolderModal({ isOpen: true, folder: null });
                                            }}
                                            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                            title="Nueva Carpeta"
                                        >
                                            <FolderPlus className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsMobileFolderDrawerOpen(false)}
                                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFolderId(null);
                                            setIsMobileFolderDrawerOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                                            selectedFolderId === null
                                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-xs'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FolderOpen className="w-4 h-4 shrink-0" />
                                            <span className="truncate">Todos los Archivos</span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 font-medium">
                                            {allProjectDocs.length}
                                        </span>
                                    </button>

                                    {projectFolders.map(folder => {
                                        const count = allProjectDocs.filter(d => d.folder_id === folder.id).length;
                                        const isSelected = selectedFolderId === folder.id;
                                        return (
                                            <div
                                                key={folder.id}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-xs'
                                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFolderId(folder.id);
                                                        setIsMobileFolderDrawerOpen(false);
                                                    }}
                                                    className="flex items-center gap-2 min-w-0 flex-1 text-left py-1"
                                                >
                                                    <FolderIcon className="w-4 h-4 shrink-0 text-amber-500" />
                                                    <span className="truncate">{folder.name}</span>
                                                </button>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 font-medium">
                                                        {count}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsMobileFolderDrawerOpen(false);
                                                            handleDeleteDocFolder(folder.id);
                                                        }}
                                                        className="p-1 text-zinc-400 hover:text-red-500 rounded"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BARRA LATERAL MINIMALISTA DE CARPETAS (ESCRITORIO) */}
                    <div className="hidden md:flex w-52 sm:w-60 bg-white dark:bg-[#0d0d0f] border-r border-zinc-200/80 dark:border-zinc-800/80 flex-col shrink-0">
                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                Carpetas
                            </span>
                            <button
                                type="button"
                                onClick={() => setFolderModal({ isOpen: true, folder: null })}
                                className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                title="Nueva Carpeta"
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                {/* Todas las carpetas */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedFolderId(null)}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                                        selectedFolderId === null
                                            ? 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 font-medium'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FolderOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <span className="truncate">Todos los Archivos</span>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                                        {allProjectDocs.length}
                                    </span>
                                </button>

                                {/* Lista de carpetas del proyecto */}
                                {projectFolders.map(folder => {
                                    const count = allProjectDocs.filter(d => d.folder_id === folder.id).length;
                                    const isSelected = selectedFolderId === folder.id;
                                    return (
                                        <div
                                            key={folder.id}
                                            className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                                                isSelected
                                                    ? 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 font-medium'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSelectedFolderId(folder.id)}
                                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                            >
                                                <FolderIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <span className="truncate">{folder.name}</span>
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                                                    {count}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDocFolder(folder.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded transition-opacity"
                                                    title="Eliminar Carpeta"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Botón de acceso a las Notas del Proyecto en la barra lateral */}
                                <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                                    <button
                                        type="button"
                                        onClick={() => onOpenNotesModule?.()}
                                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                            <span className="truncate">Notas de Proyecto</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                            {projectNotes.length}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ÁREA DE ARCHIVOS Y DOCUMENTOS - DISEÑO ELEGANTE Y MINIMALISTA */}
                        <div 
                            className={`flex-1 overflow-y-auto p-4 sm:p-6 transition-colors ${
                                isDraggingFiles ? 'bg-zinc-100/80 dark:bg-zinc-800/40 border-2 border-dashed border-zinc-400 dark:border-zinc-600' : ''
                            }`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDraggingFiles(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                setIsDraggingFiles(false);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingFiles(false);
                                const droppedFiles = e.dataTransfer.files;
                                if (droppedFiles && droppedFiles.length > 0) {
                                    for (let i = 0; i < droppedFiles.length; i++) {
                                        processFileUpload(droppedFiles[i]);
                                    }
                                }
                            }}
                        >
                            {/* Banner informativo de carpeta activa */}
                            {activeFolderObj && (
                                <div className="mb-4 flex items-center justify-between p-3 bg-white dark:bg-[#0d0d0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <FolderIcon className="w-4 h-4 text-zinc-500" />
                                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Carpeta: {activeFolderObj.name}</span>
                                        <span className="text-[11px] text-zinc-400">({filteredDocs.length} archivos)</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFolderId(null)}
                                        className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors"
                                    >
                                        Ver todos
                                    </button>
                                </div>
                            )}

                            {/* Dropzone hint discreta y minimalista */}
                            <div className="mb-5 p-3.5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <Upload className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                    <span>Arrastra archivos o imágenes aquí, o</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:underline"
                                    >
                                        Examinar archivos
                                    </button>
                                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                    <button
                                        type="button"
                                        onClick={() => setDocModal({ isOpen: true, doc: null, initialFolderId: selectedFolderId || undefined })}
                                        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        Crear texto
                                    </button>
                                </div>
                            </div>

                            {/* Listado de Documentos o Estado Vacío */}
                            {filteredDocs.length === 0 ? (
                                <div className="py-14 text-center bg-white dark:bg-[#0d0d0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-8">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-3">
                                        <FolderOpen className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                        {docSearchText ? 'No se encontraron archivos' : 'Sin archivos ni documentos'}
                                    </h3>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                                        {docSearchText 
                                            ? 'Prueba con otros términos de búsqueda.' 
                                            : 'Sube especificaciones, imágenes de diseño o crea documentos para este proyecto.'
                                        }
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg flex items-center gap-1.5 transition-colors"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Subir Archivo</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateProjectNote}
                                            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                                        >
                                            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                                            <span>Nueva Nota</span>
                                        </button>
                                    </div>
                                </div>
                            ) : docViewMode === 'grid' ? (
                                /* VISTA CUADRÍCULA - MINIMALISTA */
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                    {filteredDocs.map(doc => {
                                        const isImage = doc.file_type?.startsWith('image/') || doc.file_url?.startsWith('data:image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].some(ext => (doc.file_name || doc.title).toLowerCase().endsWith(ext));
                                        const folder = projectFolders.find(f => f.id === doc.folder_id);
                                        const sizeFormatted = doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Texto';

                                        return (
                                            <div
                                                key={doc.id}
                                                className="group bg-white dark:bg-[#0d0d0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex flex-col justify-between"
                                            >
                                                {/* Previsualización superior */}
                                                <div 
                                                    onClick={() => setPreviewDocModal(doc)}
                                                    className="cursor-pointer bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/60 relative overflow-hidden flex items-center justify-center h-32"
                                                >
                                                    {isImage && doc.file_url ? (
                                                        <img
                                                            src={doc.file_url}
                                                            alt={doc.title}
                                                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center p-4 text-center">
                                                            {getFileIcon(doc.file_type, doc.file_name)}
                                                            <span className="mt-2 text-[9.5px] font-mono tracking-wider uppercase font-medium text-zinc-400 dark:text-zinc-500">
                                                                {doc.file_name?.split('.').pop() || doc.category || 'DOC'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Tag de carpeta */}
                                                    <span className="absolute top-2 left-2 text-[9px] font-medium px-2 py-0.5 rounded bg-zinc-900/80 dark:bg-black/80 text-zinc-100">
                                                        {folder ? folder.name : (doc.category || 'Archivo')}
                                                    </span>

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                                        <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-[10.5px] font-medium flex items-center gap-1 shadow-2xs">
                                                            <Eye className="w-3 h-3 text-zinc-500" /> Vista Previa
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Metadatos */}
                                                <div className="p-3 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h4 
                                                            className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
                                                            title={doc.title}
                                                        >
                                                            {doc.title}
                                                        </h4>
                                                        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                                            <span>{sizeFormatted}</span>
                                                            <span>{format(parseISO(doc.created_at), 'dd MMM yyyy', { locale: es })}</span>
                                                        </div>
                                                    </div>

                                                    {/* Acciones */}
                                                    <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenShareDoc(doc);
                                                            }}
                                                            className="px-2 py-0.5 rounded text-[10.5px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                                                            title="Compartir en Canal"
                                                        >
                                                            <MessageSquare className="w-3 h-3 text-zinc-400" />
                                                            <span>Compartir</span>
                                                        </button>

                                                        <div className="flex items-center gap-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadFile(doc);
                                                                }}
                                                                className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                title="Descargar"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteDoc(doc.id);
                                                                }}
                                                                className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* VISTA TABLA / LISTA - MINIMALISTA */
                                <div className="bg-white dark:bg-[#0d0d0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 font-medium border-b border-zinc-200/80 dark:border-zinc-800/80">
                                                <tr>
                                                    <th className="py-2.5 px-4 font-medium">Archivo / Documento</th>
                                                    <th className="py-2.5 px-3 font-medium">Carpeta</th>
                                                    <th className="py-2.5 px-3 font-medium">Tamaño</th>
                                                    <th className="py-2.5 px-3 font-medium">Fecha</th>
                                                    <th className="py-2.5 px-3 font-medium">Subido por</th>
                                                    <th className="py-2.5 px-4 text-right font-medium">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                                {filteredDocs.map(doc => {
                                                    const folder = projectFolders.find(f => f.id === doc.folder_id);
                                                    const sizeFormatted = doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Texto';

                                                    return (
                                                        <tr 
                                                            key={doc.id}
                                                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                                                        >
                                                            <td className="py-2.5 px-4">
                                                                <div 
                                                                    onClick={() => setPreviewDocModal(doc)}
                                                                    className="cursor-pointer flex items-center gap-2.5 min-w-0"
                                                                >
                                                                    {getFileIcon(doc.file_type, doc.file_name)}
                                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline truncate">
                                                                        {doc.title}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                                                                {folder ? folder.name : '—'}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                                                                {sizeFormatted}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                                                                {format(parseISO(doc.created_at), 'dd/MM/yyyy', { locale: es })}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-zinc-400 truncate max-w-[120px]">
                                                                {doc.created_by?.split('@')[0] || '—'}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewDocModal(doc)}
                                                                        className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                        title="Vista Previa"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenShareDoc(doc)}
                                                                        className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                        title="Compartir en Canal"
                                                                    >
                                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDownloadFile(doc)}
                                                                        className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                        title="Descargar"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteDoc(doc.id)}
                                                                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN INFERIOR: NOTAS DEL PROYECTO (MINIMALISTA Y MONOCROMÁTICA) */}
                            {projectNotes.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80">
                                    <div className="flex items-center justify-between mb-3.5">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                                            <h3 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                                                Notas de este Proyecto
                                            </h3>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                                {projectNotes.length}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCreateProjectNote}
                                            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Nueva Nota</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {projectNotes.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => setEditingProjectNote(n)}
                                                className="group cursor-pointer p-3.5 bg-white dark:bg-[#0d0d0f] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                                                            Nota de Proyecto
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            {format(parseISO(n.updated_at || n.created_at), 'dd MMM', { locale: es })}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors truncate">
                                                        {n.title || 'Nota sin título'}
                                                    </h4>
                                                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                                        {cleanToPlainText(n.content) || 'Haz clic para ver o editar esta nota...'}
                                                    </p>
                                                </div>

                                                <div 
                                                    className="pt-2 mt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingProjectNote(n)}
                                                        className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
                                                    >
                                                        <Edit2 className="w-3 h-3" /> Editar
                                                    </button>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenShareNote(n)}
                                                            className="px-2 py-0.5 rounded text-[10.5px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors"
                                                            title="Compartir nota en Canal"
                                                        >
                                                            <MessageSquare className="w-3 h-3" /> Compartir
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteProjectNote(n.id)}
                                                            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                            title="Eliminar Nota"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
            </div>
        );
    };

    const renderChat = () => {
        if (!activeProject) return null;
        
        const messages = activeProject.chat_messages || [];
        const currentChannel = activeChannels.find(c => c.id === selectedChannelId) || activeChannels[0] || { id: 'general', name: 'general', emoji: '💬', description: 'Canal principal' };
        const publicChannels = activeChannels.filter(c => !c.is_private);
        const privateChannels = activeChannels.filter(c => c.is_private);

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
                sender_id: currentUser?.id,
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
                sender_id: currentUser?.id,
                sender_name: currentUserName,
                sender_email: currentUserEmail,
                text: threadInputText.trim(),
                created_at: new Date().toISOString(),
                thread_id: activeThreadMessage.id
            };

            onUpdateProject(activeProject.id, { chat_messages: [...messages, newReply] });
            setThreadInputText('');
        };

        const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !activeProject) return;

            if (file.size > 5 * 1024 * 1024) {
                alert(`El archivo "${file.name}" supera los 5 MB. Por favor elige un archivo más pequeño.`);
                return;
            }

            const formattedSize = file.size < 1024 * 1024 
                ? `${(file.size / 1024).toFixed(1)} KB` 
                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

            const newDocId = crypto.randomUUID();
            const reader = new FileReader();

            reader.onload = () => {
                const dataUrl = reader.result as string;
                
                const newDoc: ProjectDoc = {
                    id: newDocId,
                    project_id: activeProject.id,
                    title: file.name,
                    content: dataUrl,
                    category: file.type.startsWith('image/') ? 'Ideas' : 'Specifications',
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type || 'application/octet-stream',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const updatedDocs = [...(activeProject.docs || []), newDoc];

                const newMessage: ProjectChatMessage = {
                    id: crypto.randomUUID(),
                    project_id: activeProject.id,
                    channel_id: currentChannel.id,
                    sender_id: currentUser?.id,
                    sender_name: currentUserName,
                    sender_email: currentUserEmail,
                    text: `📎 Archivo adjunto: **${file.name}** (${formattedSize})`,
                    created_at: new Date().toISOString(),
                    doc_reference: {
                        id: newDoc.id,
                        title: newDoc.title,
                        file_type: newDoc.file_type || 'Documento',
                        file_name: newDoc.file_name || newDoc.title,
                        file_size_formatted: formattedSize,
                        folder_name: 'Archivos de Chat'
                    }
                };

                onUpdateProject(activeProject.id, {
                    docs: updatedDocs,
                    chat_messages: [...messages, newMessage]
                });

                setIsChatAttachSheetOpen(false);
                if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            };

            reader.readAsDataURL(file);
        };

        const handleShareExistingDoc = (doc: ProjectDoc) => {
            if (!activeProject) return;

            const formattedSize = doc.file_size 
                ? (doc.file_size < 1024 * 1024 ? `${(doc.file_size / 1024).toFixed(1)} KB` : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`)
                : '1.2 MB';

            const newMessage: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                sender_id: currentUser?.id,
                sender_name: currentUserName,
                sender_email: currentUserEmail,
                text: `📄 Documento compartido: **${doc.title}**`,
                created_at: new Date().toISOString(),
                doc_reference: {
                    id: doc.id,
                    title: doc.title,
                    file_type: doc.file_type || doc.category || 'Documento',
                    file_name: doc.file_name || doc.title,
                    file_size_formatted: formattedSize,
                    folder_name: 'Documentos del Proyecto'
                }
            };

            onUpdateProject(activeProject.id, {
                chat_messages: [...messages, newMessage]
            });

            setShowDocPickerInChat(false);
            setIsChatAttachSheetOpen(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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



        return (
            <div className={`flex h-full bg-gray-50 dark:bg-[#050505] overflow-hidden ${isMobile && !isChatInputFocused ? 'pb-24' : ''}`}>
                {/* SELECTOR MÓVIL DE CANALES (BOTTOM SHEET) */}
                {isMobileChannelDrawerOpen && (
                    <div className="fixed inset-0 z-[10000] flex flex-col justify-end md:hidden animate-in fade-in duration-200">
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                            onClick={() => setIsMobileChannelDrawerOpen(false)} 
                        />
                        {/* Sheet Container */}
                        <div className="relative w-full bg-white dark:bg-[#121214] rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-10 max-h-[82vh] animate-in slide-in-from-bottom duration-200 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            {/* Handle */}
                            <div className="pt-3 pb-1 flex justify-center shrink-0">
                                <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            </div>

                            {/* Header */}
                            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">Canales</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileChannelDrawerOpen(false)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Channels List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* CANALES PÚBLICOS */}
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1">
                                        Canales Públicos
                                    </div>
                                    {publicChannels.map(chan => {
                                        const isSelected = chan.id === currentChannel.id;
                                        const hasUnread = !isSelected && (activeProject.chat_messages || []).some(m => {
                                            if ((m.channel_id || 'general') !== chan.id) return false;
                                            if (checkIsUser(m.sender_email, m.sender_id)) return false;
                                            const lastRead = lastReadTimes[chan.id];
                                            if (!lastRead) return true;
                                            return m.created_at > lastRead;
                                        });

                                        return (
                                            <button
                                                key={chan.id}
                                                onClick={() => {
                                                    setSelectedChannelId(chan.id);
                                                    setIsMobileChannelDrawerOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all text-left ${
                                                    isSelected
                                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-xs'
                                                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.99]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`font-mono text-sm ${isSelected ? 'text-blue-400 dark:text-blue-600' : 'text-zinc-400'}`}>#</span>
                                                    <div className="truncate">
                                                        <div className="truncate font-semibold text-sm">{chan.name}</div>
                                                        {chan.description && (
                                                            <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                                                {chan.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {hasUnread && (
                                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                                    )}
                                                    {isSelected && (
                                                        <Check className="w-4 h-4 shrink-0" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* CANALES PRIVADOS */}
                                <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                                    <div className="flex items-center justify-between px-2 mb-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                            <Lock className="w-3 h-3 text-amber-500" />
                                            <span>Canales Privados</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-mono">{privateChannels.length}</span>
                                    </div>

                                    {privateChannels.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-zinc-400 italic">
                                            No hay canales privados
                                        </div>
                                    ) : (
                                        privateChannels.map(chan => {
                                            const isSelected = chan.id === currentChannel.id;
                                            const isUnlocked = unlockedChannels[chan.id];
                                            const hasUnread = !isSelected && (activeProject.chat_messages || []).some(m => {
                                                if ((m.channel_id || 'general') !== chan.id) return false;
                                                if (checkIsUser(m.sender_email, m.sender_id)) return false;
                                                const lastRead = lastReadTimes[chan.id];
                                                if (!lastRead) return true;
                                                return m.created_at > lastRead;
                                            });

                                            return (
                                                <button
                                                    key={chan.id}
                                                    onClick={() => {
                                                        setSelectedChannelId(chan.id);
                                                        setIsMobileChannelDrawerOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all text-left ${
                                                        isSelected
                                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-xs'
                                                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.99]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Lock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300 dark:text-amber-600' : 'text-amber-500'}`} />
                                                        <div className="truncate">
                                                            <div className="truncate font-semibold text-sm">{chan.name}</div>
                                                            <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'}`}>
                                                                {isUnlocked ? '🔓 Desbloqueado' : '🔒 Requiere clave'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {hasUnread && (
                                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                                        )}
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 shrink-0" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* BOTÓN + NUEVO CANAL */}
                            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileChannelDrawerOpen(false);
                                        setIsCreateChannelOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm active:scale-[0.99] transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>+ Nuevo canal</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 1. CHANNELS SIDEBAR (ESCRITORIO) */}
                <div className="hidden md:flex w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c0c0c] flex-col justify-between shrink-0 h-full">
                    
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

                        {/* Channels List */}
                        <div className="p-2 space-y-0.5">
                            {activeChannels.map(chan => {
                                const isSelected = chan.id === currentChannel.id;
                                
                                // Check dynamic unread status for the channel
                                const hasUnread = !isSelected && (activeProject.chat_messages || []).some(m => {
                                    if ((m.channel_id || 'general') !== chan.id) return false;
                                    if (checkIsUser(m.sender_email, m.sender_id)) return false;
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
                        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
                            <div className="min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setIsMobileChannelDrawerOpen(true)}
                                    className={`flex items-center gap-1.5 text-left rounded-xl transition-all ${
                                        isMobile 
                                            ? 'px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-95' 
                                            : 'p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-zinc-800/80 md:pointer-events-none'
                                    }`}
                                >
                                    <span className={`${isMobile ? 'text-zinc-500 dark:text-zinc-400' : 'text-gray-400 dark:text-gray-500'} shrink-0`}>
                                        {currentChannel.is_private ? <Lock className="w-4 h-4 text-amber-500" /> : <Hash className="w-4 h-4 text-blue-500" />}
                                    </span>
                                    <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {currentChannel.name}
                                    </h2>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 ${isMobile ? '' : 'md:hidden'}`} />
                                </button>
                                {currentChannel.description && !isMobile && (
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



                                {/* Clear Channel Messages - Only visible to Project Owner/Creator */}
                                {isProjectCreator && (
                                    <button 
                                        id="clear-channel-btn"
                                        onClick={() => setIsConfirmClearChannelOpen(true)}
                                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                        title="Vaciar todos los mensajes de este canal permanentemente"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden md:inline">Vaciar Canal</span>
                                    </button>
                                )}

                            </div>
                        </div>



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
                                            const isUser = checkIsUser(msg.sender_email, msg.sender_id);
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
                                                                <strong className="block text-[10px] text-blue-500">Respondiendo a {checkIsUser(msg.reply_to.sender_email) ? 'Tú' : msg.reply_to.sender_name}:</strong>
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

                                                        {((msg.sender_email && msg.sender_email.toLowerCase() === currentUserEmail.toLowerCase()) || isProjectCreator) && (
                                                            <button 
                                                                onClick={() => {
                                                                    if (confirm('¿Deseas eliminar este mensaje?')) {
                                                                        const updated = messages.filter(m => m.id !== msg.id);
                                                                        onUpdateProject(activeProject.id, { chat_messages: updated });
                                                                    }
                                                                }}
                                                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-all"
                                                                title="Eliminar mensaje"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
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
                                            onFocus={() => setIsChatInputFocused(true)}
                                            onBlur={() => setIsChatInputFocused(false)}
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
                                            <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{checkIsUser(activeThreadMessage.sender_email, activeThreadMessage.sender_id) ? 'Tú' : activeThreadMessage.sender_name}</p>
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
                                                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">{checkIsUser(reply.sender_email, reply.sender_id) ? 'Tú' : reply.sender_name}</span>
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
                                        onFocus={() => setIsChatInputFocused(true)}
                                        onBlur={() => setIsChatInputFocused(false)}
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

        if (isMobile) {
            return (
                <div className="p-3.5 w-full h-full overflow-y-auto pb-28 space-y-3.5 font-sans">
                    {/* Top Action & Filter Bar */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
                            {[
                                { id: 'all', label: 'Todo' },
                                { id: 'month', label: 'Este mes' },
                                { id: 'week', label: 'Esta semana' },
                                { id: 'year', label: 'Año' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setExpenseFilter(f.id as any)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${
                                        expenseFilter === f.id
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-xs'
                                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Gasto
                        </button>
                    </div>

                    {/* Mobile Summary Cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Total Gastado</span>
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-0.5 block">
                                ${totalSpent.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Registros</span>
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-0.5 block">
                                {expenses.length}
                            </span>
                        </div>
                    </div>

                    {/* Expense List */}
                    {expenses.length === 0 ? (
                        <div className="py-12 text-center space-y-3 bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-6">
                            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sin gastos registrados</h4>
                                <p className="text-xs text-gray-500 mt-1">No hay gastos para el filtro seleccionado.</p>
                            </div>
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl"
                            >
                                <Plus className="w-3.5 h-3.5" /> Registrar Primer Gasto
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {expenses.map(exp => (
                                <div
                                    key={exp.id}
                                    className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex items-center justify-between gap-3 active:bg-gray-50/50 dark:active:bg-zinc-900/50 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                {exp.description}
                                            </h4>
                                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 shrink-0">
                                                {exp.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                            <span>{exp.date}</span>
                                            <span>•</span>
                                            <span className="truncate">
                                                {(() => {
                                                    const creatorEmail = exp.created_by;
                                                    const isMe = (currentUserEmail && creatorEmail && creatorEmail.toLowerCase() === currentUserEmail.toLowerCase()) || creatorEmail === 'Tú' || exp.created_by_name === 'Tú';
                                                    if (isMe) return "Tú";
                                                    if (exp.created_by_name && exp.created_by_name !== 'Tú') return exp.created_by_name;
                                                    return creatorEmail ? creatorEmail.split('@')[0] : "Colaborador";
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                                            ${exp.amount.toFixed(2)}
                                        </span>
                                        {isProjectCreator && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Estás seguro de eliminar el gasto "${exp.description}"?`)) {
                                                        const updated = allExpenses.filter(e => e.id !== exp.id);
                                                        onUpdateProject(activeProject.id, { expenses: updated });
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                                title="Eliminar gasto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

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
                                        <span className="text-[10px] text-gray-400 text-ellipsis overflow-hidden">
                                            Por: {(() => {
                                                const creatorEmail = exp.created_by;
                                                const isMe = (currentUserEmail && creatorEmail && creatorEmail.toLowerCase() === currentUserEmail.toLowerCase()) || creatorEmail === 'Tú' || exp.created_by_name === 'Tú';
                                                
                                                if (isMe) {
                                                    return "Tú";
                                                }

                                                if (exp.created_by_name && exp.created_by_name !== 'Tú') {
                                                    return exp.created_by_name;
                                                }

                                                if (creatorEmail && creatorEmail.includes('@')) {
                                                    const member = realMembers.find(m => m.email && m.email.toLowerCase() === creatorEmail.toLowerCase());
                                                    if (member && member.name) {
                                                        return member.name;
                                                    }
                                                    return creatorEmail.split('@')[0];
                                                }

                                                return creatorEmail || "Colaborador";
                                            })()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <span className="text-base font-bold text-gray-900 dark:text-white">${exp.amount.toFixed(2)}</span>
                                    {isProjectCreator && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Estás seguro de eliminar el gasto "${exp.description}"?`)) {
                                                    const updated = allExpenses.filter(e => e.id !== exp.id);
                                                    onUpdateProject(activeProject.id, { expenses: updated });
                                                }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                            title="Eliminar gasto (Solo Propietario)"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
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

        if (isMobile) {
            return (
                <div className="p-3.5 w-full h-full overflow-y-auto pb-28 space-y-3.5 font-sans">
                    {/* Top Action & Filter Bar */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
                            {[
                                { id: 'all', label: 'Todo' },
                                { id: 'month', label: 'Este mes' },
                                { id: 'week', label: 'Esta semana' },
                                { id: 'year', label: 'Año' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setTimeFilter(f.id as any)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${
                                        timeFilter === f.id
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-xs'
                                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsTimeModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Tiempo
                        </button>
                    </div>

                    {/* Mobile Summary Cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Horas Totales</span>
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-0.5 block">
                                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                            </span>
                        </div>
                        <div className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block">Sesiones</span>
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-0.5 block">
                                {timeEntries.length}
                            </span>
                        </div>
                    </div>

                    {/* Time Entries List */}
                    {timeEntries.length === 0 ? (
                        <div className="py-12 text-center space-y-3 bg-white dark:bg-[#111] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-6">
                            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sin horas registradas</h4>
                                <p className="text-xs text-gray-500 mt-1">No hay tiempos guardados para este periodo.</p>
                            </div>
                            <button
                                onClick={() => setIsTimeModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl"
                            >
                                <Plus className="w-3.5 h-3.5" /> Registrar Horas
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {timeEntries.map(t => (
                                <div
                                    key={t.id}
                                    className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex items-center justify-between gap-3 active:bg-gray-50/50 dark:active:bg-zinc-900/50 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                            {t.description || 'Sesión de trabajo'}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                            <span>{t.date}</span>
                                            <span>•</span>
                                            <span className="truncate">Por: {t.user_name}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40 font-mono">
                                            {Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m
                                        </span>
                                        {isProjectCreator && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Estás seguro de eliminar este registro de tiempo?`)) {
                                                        const updated = allTimeEntries.filter(entry => entry.id !== t.id);
                                                        onUpdateProject(activeProject.id, { time_entries: updated });
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                                                title="Eliminar tiempo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

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
                                <div className="text-right flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m</span>
                                    {isProjectCreator && (
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Estás seguro de eliminar este registro de tiempo?`)) {
                                                    const updated = allTimeEntries.filter(entry => entry.id !== t.id);
                                                    onUpdateProject(activeProject.id, { time_entries: updated });
                                                }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                            title="Eliminar tiempo (Solo Propietario)"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
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

        if (isMobile) {
            return (
                <div className="p-3.5 w-full h-full overflow-y-auto pb-28 space-y-3.5 font-sans">
                    {/* Mobile Top Bar */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Buscar miembro..."
                                value={memberSearchText}
                                onChange={e => setMemberSearchText(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-[#111] border border-gray-200/80 dark:border-gray-800/80 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
                            />
                        </div>
                        {isProjectCreator && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="px-3.5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95 transition-all"
                            >
                                <Users className="w-3.5 h-3.5" /> Invitar
                            </button>
                        )}
                    </div>

                    {/* Member Count Badge */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 px-1">
                        <span>Colaboradores ({membersList.length})</span>
                    </div>

                    {/* Member Cards */}
                    <div className="space-y-2">
                        {membersList.map((m, idx) => {
                            const isOwner = m.role === 'owner';
                            return (
                                <div
                                    key={m.id || idx}
                                    className="bg-white dark:bg-[#111] p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-9 h-9 rounded-xl ${isOwner ? 'bg-gray-900 dark:bg-white text-white dark:text-black font-bold' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-semibold'} text-xs flex items-center justify-center shrink-0 border border-gray-200/50 dark:border-gray-800`}>
                                            {(m.name || m.email || 'M').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                {m.name || 'Miembro del Equipo'}
                                            </h4>
                                            <span className="text-[10px] text-gray-400 font-mono block truncate">{m.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide ${
                                            isOwner 
                                                ? 'bg-gray-900/10 text-gray-900 dark:bg-white/10 dark:text-white border border-gray-900/20 dark:border-white/20' 
                                                : m.role === 'pending'
                                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                                : m.role === 'lead'
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                        }`}>
                                            {isOwner ? 'Dueño' : m.role === 'pending' ? 'Pendiente' : m.role === 'lead' ? 'Líder' : 'Miembro'}
                                        </span>
                                        {isProjectCreator && !isOwner && (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Estás seguro de eliminar a ${m.name || m.email} de los colaboradores? Perderá acceso a este proyecto.`)) {
                                                        const updatedMembers = (activeProject.members || []).filter((mem: any) => mem.email !== m.email);
                                                        onUpdateProject(activeProject.id, { members: updatedMembers });
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
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
        }

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

    const renderPersonalTareas = () => {
        if (!activeProject) return null;

        // Filter todos based on personalFilter (Todas | Por hacer | En progreso | Completadas) and search
        let filteredTodos = projectTodos;

        if (personalFilter === 'completed') {
            filteredTodos = filteredTodos.filter(t => t.completed || t.kanban_column === 'Completado');
        } else if (personalFilter === 'todo') {
            filteredTodos = filteredTodos.filter(t => !t.completed && (t.kanban_column === 'Por hacer' || !t.kanban_column || t.kanban_column === ''));
        } else if (personalFilter === 'in_progress') {
            filteredTodos = filteredTodos.filter(t => !t.completed && (t.kanban_column === 'En proceso' || t.kanban_column === 'En progreso'));
        }

        if (listasSearch.trim()) {
            filteredTodos = filteredTodos.filter(t => t.text.toLowerCase().includes(listasSearch.toLowerCase()));
        }

        // Sort: incomplete first, then sort by due date ascending, then complete tasks at the end
        const sortedTodos = [...filteredTodos].sort((a, b) => {
            const aDone = a.completed || a.kanban_column === 'Completado';
            const bDone = b.completed || b.kanban_column === 'Completado';
            if (aDone && !bDone) return 1;
            if (!aDone && bDone) return -1;
            if (a.due_date && b.due_date) {
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            }
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
        });

        const getFriendlyDate = (dateStr?: string) => {
            if (!dateStr) return '';
            try {
                const date = parseISO(dateStr);
                if (isToday(date)) return 'Hoy';
                if (isTomorrow(date)) return 'Mañana';
                if (isYesterday(date)) return 'Ayer';
                return format(date, 'd MMM', { locale: es });
            } catch (e) {
                return dateStr;
            }
        };

        const handleQuickAdd = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!newItemTitle.trim()) return;
            
            const isDoneCol = newItemKanbanColumn === 'Completado';

            await addTodo(newItemTitle.trim(), {
                projectId: activeProject.id,
                priority: newItemPriority || 'medium',
                dueDate: newItemDueDate || undefined,
                startTime: newItemStartTime || undefined,
                notes: newItemNotes.trim() || undefined,
                kanban_column: newItemKanbanColumn,
                completed: isDoneCol
            });

            // Reset states
            setNewItemTitle('');
            setNewItemDueDate('');
            setNewItemStartTime('');
            setNewItemNotes('');
            setNewItemKanbanColumn('Por hacer');
            setNewItemPriority('medium');
        };

        return (
            <div className="p-6 max-w-2xl mx-auto space-y-6 w-full pb-24 font-sans text-gray-900 dark:text-gray-100 h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tareas</h2>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            {projectTodos.filter(t => !t.completed && t.kanban_column !== 'Completado').length} pendientes, {projectTodos.filter(t => t.completed || t.kanban_column === 'Completado').length} completadas
                        </p>
                    </div>
                </div>

                {/* Quick Add Form */}
                <form onSubmit={handleQuickAdd} className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Añadir una nueva tarea..."
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-zinc-400"
                        />
                        {newItemTitle.trim() && (
                            <button
                                type="submit"
                                className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg transition-all shrink-0 shadow-xs hover:scale-105"
                            >
                                Añadir
                            </button>
                        )}
                    </div>
                    
                    {/* Expand details on focus/type */}
                    {newItemTitle.trim() && (
                        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                            {/* Form Input Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Due Date and Time Picker */}
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors relative bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg w-full cursor-pointer">
                                        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                                        <input
                                            type="date"
                                            value={newItemDueDate}
                                            onChange={(e) => setNewItemDueDate(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                            title="Fecha de vencimiento"
                                        />
                                        <span className="font-semibold text-[11px] truncate">
                                            {newItemDueDate ? getFriendlyDate(newItemDueDate) : 'Asignar fecha'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors relative bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg w-full cursor-pointer">
                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                        <input
                                            type="time"
                                            value={newItemStartTime}
                                            onChange={(e) => setNewItemStartTime(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                            title="Hora de inicio"
                                        />
                                        <span className="font-semibold text-[11px] truncate">
                                            {newItemStartTime ? newItemStartTime : 'Asignar hora'}
                                        </span>
                                    </div>
                                </div>

                                {/* Column State Selector */}
                                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 shrink-0">Estado:</span>
                                    <select
                                        value={newItemKanbanColumn}
                                        onChange={(e) => setNewItemKanbanColumn(e.target.value)}
                                        className="bg-transparent border-none text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-0 w-full p-0 py-0.5 cursor-pointer"
                                    >
                                        <option value="Por hacer" className="dark:bg-zinc-900 text-zinc-800 dark:text-white">Por hacer</option>
                                        <option value="En proceso" className="dark:bg-zinc-900 text-zinc-800 dark:text-white">En proceso</option>
                                        <option value="Completado" className="dark:bg-zinc-900 text-zinc-800 dark:text-white">Completado</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes description input */}
                            <div className="bg-zinc-100 dark:bg-zinc-800/40 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Añadir una nota o descripción..."
                                    value={newItemNotes}
                                    onChange={(e) => setNewItemNotes(e.target.value)}
                                    className="bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-zinc-400 w-full p-0"
                                />
                            </div>

                            {/* Priority Selector */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100/60 dark:border-zinc-800/40">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Prioridad:</span>
                                    {(['low', 'medium', 'high'] as Priority[]).map((prio) => (
                                        <button
                                            key={prio}
                                            type="button"
                                            onClick={() => setNewItemPriority(prio)}
                                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                                                newItemPriority === prio
                                                    ? prio === 'high'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                                        : prio === 'medium'
                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                        : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                                                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                            }`}
                                        >
                                            {prio === 'high' ? 'Alta' : prio === 'medium' ? 'Media' : 'Baja'}
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[10px] text-zinc-400 italic">💡 Haz clic en la tarea para editar subtareas o subir archivos</span>
                            </div>
                        </div>
                    )}
                </form>

                {/* Filters and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-hide">
                        {(['all', 'todo', 'in_progress', 'completed'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setPersonalFilter(filter)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                                    personalFilter === filter
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                                        : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {filter === 'all' ? 'Todas' : filter === 'todo' ? 'Por hacer' : filter === 'in_progress' ? 'En proceso' : 'Completadas'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/60 border border-transparent dark:border-zinc-800 rounded-lg px-2.5 py-1.5 flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar tarea..."
                            value={listasSearch}
                            onChange={(e) => setListasSearch(e.target.value)}
                            className="bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-zinc-400 w-full"
                        />
                        {listasSearch.trim() && (
                            <button onClick={() => setListasSearch('')} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-2 pt-2">
                    {sortedTodos.length === 0 ? (
                        <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-xs bg-white dark:bg-zinc-900/10 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
                            No se encontraron tareas.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortedTodos.map(task => {
                                const isOverdue = task.due_date && !(task.completed || task.kanban_column === 'Completado') && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
                                const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                                const completedSub = hasSubtasks ? task.subtasks!.filter(s => s.completed).length : 0;
                                const totalSub = hasSubtasks ? task.subtasks!.length : 0;
                                const isDone = task.completed || task.kanban_column === 'Completado';

                                return (
                                    <div 
                                        key={task.id} 
                                        className="group flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900/40 hover:bg-gray-50/50 dark:hover:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 rounded-xl transition-all cursor-pointer shadow-2xs"
                                        onClick={() => onEditTodo && onEditTodo(task)}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateTodo(task.id, { 
                                                        completed: !isDone,
                                                        kanban_column: !isDone ? 'Completado' : 'Por hacer'
                                                    });
                                                }}
                                                className="shrink-0 focus:outline-none"
                                            >
                                                {isDone ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                ) : (
                                                    <Circle className={`w-5 h-5 text-zinc-300 dark:text-zinc-700 hover:text-zinc-400 transition-colors ${
                                                        task.priority === 'high' ? 'border-red-400 hover:border-red-500' : ''
                                                    }`} />
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-sm font-semibold truncate block ${
                                                    isDone 
                                                        ? 'text-zinc-400 dark:text-zinc-600 line-through' 
                                                        : 'text-zinc-800 dark:text-zinc-100'
                                                }`}>
                                                    {task.text}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {task.due_date && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                            isDone
                                                                ? 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600'
                                                                : isOverdue
                                                                ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                                        }`}>
                                                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                                                            {getFriendlyDate(task.due_date)}
                                                        </span>
                                                    )}
                                                    {task.start_time && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                            isDone
                                                                ? 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600'
                                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                                        }`}>
                                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                                            {task.start_time}
                                                        </span>
                                                    )}
                                                    {task.priority && !isDone && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                            task.priority === 'high'
                                                                ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                                                : task.priority === 'medium'
                                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400'
                                                        }`}>
                                                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                                                        </span>
                                                    )}
                                                    {task.kanban_column && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                            isDone
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                                : (task.kanban_column === 'En progreso' || task.kanban_column === 'En proceso')
                                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                                                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400'
                                                        }`}>
                                                            {task.kanban_column}
                                                        </span>
                                                    )}
                                                    {hasSubtasks && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center gap-1">
                                                            <CheckSquareIcon className="w-3.5 h-3.5 shrink-0" />
                                                            {completedSub}/{totalSub}
                                                        </span>
                                                    )}
                                                    {task.attachments && task.attachments.length > 0 && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 flex items-center gap-1">
                                                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                                            {task.attachments.length}
                                                        </span>
                                                    )}
                                                    {task.notes && (
                                                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1" title={task.notes}>
                                                            <FileText className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="max-w-[120px] truncate">{task.notes}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTodo(task.id);
                                                }}
                                                className="p-1 text-zinc-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Eliminar tarea"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // LISTAS TAB (Multiple Lists, Bi-directional Kanban Sync & Inline Task Editing)
    const renderListas = () => {
        if (!activeProject) return null;

        if (activeProject.project_mode === 'personal') {
            return renderPersonalTareas();
        }

        const projectLists = activeProject.lists || [];

        if (isMobile) {
            let filteredTodos = projectTodos;
            
            // Apply mobile filters
            if (mobileTaskFilters.status === 'completed') filteredTodos = filteredTodos.filter(t => t.completed);
            if (mobileTaskFilters.status === 'pending') filteredTodos = filteredTodos.filter(t => !t.completed);
            if (mobileTaskFilters.sprint) filteredTodos = filteredTodos.filter(t => t.sprint_id === mobileTaskFilters.sprint);
            if (mobileTaskFilters.list) filteredTodos = filteredTodos.filter(t => t.list_id === mobileTaskFilters.list);
            if (mobileTaskFilters.assignee) filteredTodos = filteredTodos.filter(t => t.assigned_to === mobileTaskFilters.assignee || t.assignee === mobileTaskFilters.assignee);
            if (mobileTaskFilters.priority) filteredTodos = filteredTodos.filter(t => t.priority === mobileTaskFilters.priority);
            if (mobileTaskFilters.dueDate) {
                filteredTodos = filteredTodos.filter(t => {
                    if (mobileTaskFilters.dueDate === 'nodate') return !t.due_date;
                    if (!t.due_date) return false;
                    const date = parseISO(t.due_date);
                    if (mobileTaskFilters.dueDate === 'overdue') return isPast(date) && !isToday(date);
                    if (mobileTaskFilters.dueDate === 'today') return isToday(date);
                    if (mobileTaskFilters.dueDate === 'upcoming') return !isPast(date) && !isToday(date);
                    return true;
                });
            }

            const activeFilterCount = Object.values(mobileTaskFilters).filter(v => v !== undefined).length;

            return (
                <div className="p-4 h-full overflow-y-auto pb-24 space-y-4 font-sans">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Todas las Tareas</h2>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">{filteredTodos.length} tareas en total</p>
                        </div>
                        <button 
                            onClick={() => setIsMobileFiltersOpen(true)}
                            className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                                activeFilterCount > 0 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            {activeFilterCount > 0 && <span className="text-xs font-bold">{activeFilterCount}</span>}
                        </button>
                    </div>

                    {filteredTodos.length === 0 ? (
                        <div className="text-center py-10 opacity-60 text-sm">
                            No se encontraron tareas con los filtros actuales.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTodos.map(task => (
                                <div key={task.id} className="p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-start gap-3 shadow-xs active:scale-[0.98] transition-transform" onClick={() => onEditTodo && onEditTodo(task)}>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateTodo(task.id, { completed: !task.completed });
                                        }}
                                        className="mt-0.5 shrink-0"
                                    >
                                        {task.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-xs font-semibold truncate ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{task.text}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {(task.assigned_to || task.assignee) && (
                                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                                    {(task.assigned_to || task.assignee)?.split('@')[0]}
                                                </span>
                                            )}
                                            {task.due_date && !task.completed && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>
                                                    {format(parseISO(task.due_date), 'd MMM', { locale: es })}
                                                </span>
                                            )}
                                            {task.kanban_column && (
                                                <span className="text-[9px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {task.kanban_column}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

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
            const availableCols = activeProject.project_mode === 'personal'
                ? ['Por hacer', 'En proceso', 'Completado']
                : (activeProject.kanban_columns && activeProject.kanban_columns.length > 0 ? activeProject.kanban_columns : ['Por hacer', 'En progreso', 'Completado']);
            const defaultCol = availableCols[0] || 'Por hacer';
            await addTodo(newItemTitle.trim(), {
                projectId: activeProject.id,
                priority: newItemPriority,
                assignee: assigneeValue,
                assigned_to: assigneeValue,
                dueDate: newItemDueDate || undefined,
                kanban_column: defaultCol,
                list_id: activeProject.project_mode === 'personal' ? undefined : effectiveListId
            });
            setNewItemTitle('');
            setNewItemDueDate('');
            setNewItemAssignee('');
            setNewItemPriority('medium');
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
                <div className="bg-white dark:bg-[#111] p-4 sm:p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800/80 pb-3">
                        <div className="space-y-0.5 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                <List className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="truncate">{activeCustomList?.name}</span>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {activeCustomList?.description || 'Tareas asignadas a esta lista sincronizadas con Kanban.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                                {displayedTodos.length} {displayedTodos.length === 1 ? 'tarea' : 'tareas'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsAddListItemModalOpen(true)}
                                className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
                            >
                                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nueva</span> Tarea
                            </button>
                        </div>
                    </div>

                    {/* Quick Add Form (Desktop Only, on mobile data capture is done via popup) */}
                    <form onSubmit={handleAddListTodo} className="hidden md:flex flex-wrap items-center gap-3">
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

                {/* Minimalist Clean Table / Mobile Cards */}
                <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200/60 dark:border-gray-800/80 overflow-hidden shadow-2xs">
                    {/* VISTA MÓVIL DE TAREAS */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800/50">
                        {displayedTodos.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 italic text-xs">
                                No hay tareas en esta lista. Toca "+ Nueva Tarea" para crear una.
                            </div>
                        ) : (
                            displayedTodos.map(todo => {
                                const currentAssignee = todo.assigned_to || todo.assignee || '';
                                const availableCols = activeProject.kanban_columns && activeProject.kanban_columns.length > 0 ? activeProject.kanban_columns : ['Por hacer', 'En progreso', 'Completado'];
                                const doneCol = availableCols.find(c => /done|complet|finaliz|termin/i.test(c)) || availableCols[availableCols.length - 1] || 'Completado';
                                const firstCol = availableCols[0] || 'Por hacer';

                                return (
                                    <div key={todo.id} className="p-3.5 space-y-2 hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                        <div className="flex items-start gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextCompleted = !todo.completed;
                                                    const nextCol = nextCompleted ? doneCol : firstCol;
                                                    updateTodo(todo.id, {
                                                        completed: nextCompleted,
                                                        kanban_column: nextCol
                                                    });
                                                }}
                                                className="mt-0.5 shrink-0"
                                            >
                                                {todo.completed ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-gray-300 dark:text-zinc-600" />
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-semibold leading-snug ${todo.completed ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-900 dark:text-zinc-100'}`}>
                                                    {todo.text}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleShareTask(todo)}
                                                    className="p-1 text-gray-400 hover:text-blue-500 rounded"
                                                    title="Compartir"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteTodo(todo.id)}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5 pl-7 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                                                {todo.kanban_column || 'Por hacer'}
                                            </span>
                                            {todo.priority && (
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                                    todo.priority === 'high'
                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                                        : todo.priority === 'medium'
                                                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                                }`}>
                                                    {todo.priority === 'high' ? 'Alta' : todo.priority === 'medium' ? 'Media' : 'Baja'}
                                                </span>
                                            )}
                                            {todo.dueDate && (
                                                <span className="flex items-center gap-1 text-zinc-400">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {todo.dueDate}
                                                </span>
                                            )}
                                            {currentAssignee && (
                                                <span className="text-zinc-400">
                                                    @{currentAssignee.split('@')[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* VISTA ESCRITORIO CON TABLA COMPLETA */}
                    <div className="hidden md:block overflow-x-auto">
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

                {/* MODAL / BOTTOM SHEET PARA AGREGAR TAREA A LA LISTA */}
                {isAddListItemModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9999] animate-in fade-in duration-200">
                        <div 
                            className="fixed inset-0" 
                            onClick={() => setIsAddListItemModalOpen(false)}
                        />
                        <div className="relative w-full max-w-lg bg-white dark:bg-[#111] rounded-t-3xl sm:rounded-2xl border-t sm:border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
                            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Nueva Tarea</h3>
                                    <p className="text-xs text-zinc-400">En {activeProject.project_mode === 'personal' ? activeProject.name : (activeCustomList?.name || 'Lista')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAddListItemModalOpen(false)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
                                await handleAddListTodo(e);
                                setIsAddListItemModalOpen(false);
                            }} className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        Título de la tarea
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="¿Qué se necesita hacer?"
                                        value={newItemTitle}
                                        onChange={e => setNewItemTitle(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                            Responsable
                                        </label>
                                        <select
                                            value={newItemAssignee}
                                            onChange={e => setNewItemAssignee(e.target.value)}
                                            className="w-full px-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-none"
                                        >
                                            <option value="">(Sin asignar)</option>
                                            {realMembers.map(m => (
                                                <option key={m.email} value={m.email}>{m.name || m.email.split('@')[0]}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                            Fecha límite
                                        </label>
                                        <input
                                            type="date"
                                            value={newItemDueDate}
                                            onChange={e => setNewItemDueDate(e.target.value)}
                                            className="w-full px-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        Prioridad
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'low', label: 'Baja' },
                                            { id: 'medium', label: 'Media' },
                                            { id: 'high', label: 'Alta' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setNewItemPriority(p.id as any)}
                                                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                                                    newItemPriority === p.id
                                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white font-semibold'
                                                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddListItemModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-sm"
                                    >
                                        Guardar Tarea
                                    </button>
                                </div>
                            </form>
                        </div>
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
                        {effectiveTab === 'overview' && renderOverview()}
                        {effectiveTab === 'kanban' && renderKanban()}
                        {effectiveTab === 'listas' && renderListas()}
                        {effectiveTab === 'mis_tareas' && renderMisTareas()}
                        {effectiveTab === 'sprints' && renderSprints()}
                        {effectiveTab === 'roadmap' && renderRoadmap()}
                        {effectiveTab === 'docs' && renderDocs()}
                        {effectiveTab === 'chat' && renderChat()}
                        {effectiveTab === 'expenses' && renderExpenses()}
                        {effectiveTab === 'time' && renderTime()}
                        {effectiveTab === 'team' && renderTeam()}
                        {effectiveTab === 'settings' && renderPersonalSettings()}
                        {effectiveTab === 'mas_menu' && renderMasMenu()}
                    </>
                ) : (
                    <div className="h-full overflow-y-auto px-8 py-8 bg-zinc-50/50 dark:bg-[#080808] custom-scrollbar">
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Tus Proyectos</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecciona un proyecto para ver sus detalles y herramientas.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.filter(p => !p.is_archived).map(project => {
                                    const projectTasks = allTodos.filter(t => t.project_id === project.id);
                                    const completedTasks = projectTasks.filter(t => t.completed).length;
                                    const totalTasks = projectTasks.length;
                                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                    const isPersonal = project.project_mode === 'personal';

                                    // Calculate ASCII progress blocks
                                    const filledBlocks = Math.round(progress / 10);
                                    const emptyBlocks = 10 - filledBlocks;
                                    const blockString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => onSelectProject(project.id)}
                                            className="group flex flex-col text-left p-5 rounded-2xl bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <span className="text-2xl shrink-0">{project.emoji || '📁'}</span>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {project.name}
                                                </h3>
                                            </div>

                                            {project.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                                                    {project.description}
                                                </p>
                                            )}

                                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800/80 w-full flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                        isPersonal 
                                                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' 
                                                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30'
                                                    }`}>
                                                        {isPersonal ? 'Personal' : 'Avanzado'}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                                        • {completedTasks} de {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full mt-3">
                                                <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-400 tracking-wider flex items-center justify-between">
                                                    <span>{blockString}</span>
                                                    <span className="text-gray-900 dark:text-white font-bold">{progress}%</span>
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}

                                {projects.filter(p => !p.is_archived).length === 0 && (
                                    <div className="col-span-full text-center py-16 bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-gray-800 rounded-2xl">
                                        <FolderIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">No tienes proyectos creados</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Crea uno nuevo usando el botón en la barra superior.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* CONFIRM CLEAR CHANNEL MODAL */}
            <Modal 
                isOpen={isConfirmClearChannelOpen} 
                onClose={() => setIsConfirmClearChannelOpen(false)} 
                title="¿Vaciar este canal?"
            >
                <div className="space-y-4">
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold text-red-800 dark:text-red-300">Acción Irreversible</h4>
                            <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed mt-0.5">
                                Esta acción eliminará de forma permanente todos los mensajes, encuestas e hilos compartidos en este canal tanto de la aplicación local como de la base de datos remota para todo el equipo.
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        ¿Estás seguro de que deseas vaciar por completo el canal <strong>#{activeChannels.find(c => c.id === selectedChannelId)?.name || 'general'}</strong>? Solo tú, como creador del proyecto, tienes permiso para realizar esta acción.
                    </p>
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                            id="cancel-clear-channel-btn"
                            type="button"
                            onClick={() => setIsConfirmClearChannelOpen(false)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            id="confirm-clear-channel-btn"
                            type="button"
                            onClick={handleClearChannelMessages}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                        >
                            Sí, vaciar canal permanentemente
                        </button>
                    </div>
                </div>
            </Modal>

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

            {/* CLOSE SPRINT MODAL */}
            <Modal isOpen={closeSprintModal.isOpen} onClose={() => setCloseSprintModal({ isOpen: false, sprint: null })} title="Finalizar Sprint">
                <form onSubmit={e => {
                    e.preventDefault();
                    if (!activeProject || !closeSprintModal.sprint) return;

                    const updatedSprints = (activeProject.sprints || []).map(s => 
                        s.id === closeSprintModal.sprint!.id ? { ...s, status: 'completed' as const } : s
                    );

                    onUpdateProject(activeProject.id, { sprints: updatedSprints });
                    setCloseSprintModal({ isOpen: false, sprint: null });
                }} className="space-y-4">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                        ¿Deseas marcar el sprint <strong>{closeSprintModal.sprint?.name}</strong> como completado?
                    </p>
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => setCloseSprintModal({ isOpen: false, sprint: null })} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 text-xs bg-emerald-600 text-white font-semibold rounded-lg">Sí, Finalizar Sprint</button>
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
                        const newExp: ProjectExpense = {
                            id: crypto.randomUUID(),
                            project_id: activeProject.id,
                            description: desc,
                            amount: Number(amountStr),
                            date: date || new Date().toISOString().split('T')[0],
                            category: (cat || 'Other') as any,
                            created_at: new Date().toISOString(),
                            created_by: currentUserEmail || 'usuario@local.com',
                            created_by_name: currentUserName
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
                        created_by: currentUserEmail || undefined,
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

            {/* MOBILE TASK FILTERS BOTTOM SHEET */}
            {isMobileFiltersOpen && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileFiltersOpen(false)} />
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full bg-white dark:bg-[#111] rounded-t-3xl shadow-xl max-h-[85vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filtros de Tareas</h3>
                            <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-5 pb-24">
                            {/* Status */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Estado</label>
                                <div className="flex gap-2">
                                    {['pending', 'completed'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setMobileTaskFilters(prev => ({ ...prev, status: prev.status === val ? undefined : val as any }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mobileTaskFilters.status === val ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {val === 'pending' ? 'Pendientes' : 'Completadas'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Sprint */}
                            {activeProject?.sprints && activeProject.sprints.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Sprint</label>
                                    <div className="flex flex-wrap gap-2">
                                        {activeProject.sprints.map(sprint => (
                                            <button 
                                                key={sprint.id}
                                                onClick={() => setMobileTaskFilters(prev => ({ ...prev, sprint: prev.sprint === sprint.id ? undefined : sprint.id }))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mobileTaskFilters.sprint === sprint.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {sprint.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Lista */}
                            {activeProject?.lists && activeProject.lists.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Lista</label>
                                    <div className="flex flex-wrap gap-2">
                                        {activeProject.lists.map(list => (
                                            <button 
                                                key={list.id}
                                                onClick={() => setMobileTaskFilters(prev => ({ ...prev, list: prev.list === list.id ? undefined : list.id }))}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mobileTaskFilters.list === list.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {list.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Prioridad */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Prioridad</label>
                                <div className="flex gap-2">
                                    {['high', 'medium', 'low'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setMobileTaskFilters(prev => ({ ...prev, priority: prev.priority === val ? undefined : val as any }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mobileTaskFilters.priority === val ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {val === 'high' ? 'Alta' : val === 'medium' ? 'Media' : 'Baja'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Fecha */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Fecha</label>
                                <div className="flex flex-wrap gap-2">
                                    {['overdue', 'today', 'upcoming', 'nodate'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setMobileTaskFilters(prev => ({ ...prev, dueDate: prev.dueDate === val ? undefined : val as any }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${mobileTaskFilters.dueDate === val ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}
                                        >
                                            {val === 'overdue' ? 'Atrasadas' : val === 'today' ? 'Hoy' : val === 'upcoming' ? 'Próximas' : 'Sin fecha'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#111] border-t border-gray-100 dark:border-gray-800 flex gap-3">
                            <button 
                                onClick={() => { setMobileTaskFilters({}); setIsMobileFiltersOpen(false); }}
                                className="flex-1 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 rounded-xl"
                            >
                                Limpiar
                            </button>
                            <button 
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className="flex-1 py-3 text-sm font-bold text-white bg-gray-900 dark:bg-white dark:text-black rounded-xl"
                            >
                                Aplicar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* QUICK ADD BOTTOM SHEET */}
            {isQuickAddOpen && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsQuickAddOpen(false)} />
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full bg-white dark:bg-[#111] rounded-t-3xl shadow-xl max-h-[85vh] flex flex-col z-10"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Agregar al proyecto</h3>
                            <button onClick={() => setIsQuickAddOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-1 pb-10">
                            <button 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    setIsAddListItemModalOpen(true);
                                }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-gray-800 dark:text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                                <span>Nueva tarea</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    if (activeProject.project_mode === 'personal') {
                                        setIsQuickMessageModalOpen(true);
                                    } else {
                                        setActiveTab('chat');
                                    }
                                }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-gray-800 dark:text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <span>Mensaje</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    handleCreateProjectNote();
                                }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-gray-800 dark:text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span>Nota</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    fileInputRef.current?.click();
                                }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-gray-800 dark:text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Paperclip className="w-5 h-5" />
                                </div>
                                <span>Archivo</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    setIsExpenseModalOpen(true);
                                }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-gray-800 dark:text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <span>Gasto</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setIsQuickAddOpen(false);
                                    setIsTimeModalOpen(true);
                                }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-gray-800 dark:text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span>Registrar tiempo</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* QUICK MESSAGE MODAL FOR PERSONAL PROJECTS */}
            {isQuickMessageModalOpen && (
                <Modal 
                    isOpen={isQuickMessageModalOpen} 
                    onClose={() => {
                        setIsQuickMessageModalOpen(false);
                        setQuickMessageText('');
                    }} 
                    title="Enviar Mensaje al Proyecto"
                >
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!activeProject || !quickMessageText.trim()) return;

                        const newMessage: ProjectChatMessage = {
                            id: crypto.randomUUID(),
                            project_id: activeProject.id,
                            channel_id: 'general',
                            sender_id: currentUser?.id,
                            sender_name: currentUserName,
                            sender_email: currentUserEmail,
                            text: quickMessageText.trim(),
                            created_at: new Date().toISOString()
                        };

                        const currentMessages = activeProject.chat_messages || [];
                        onUpdateProject(activeProject.id, { 
                            chat_messages: [...currentMessages, newMessage] 
                        });

                        setIsQuickMessageModalOpen(false);
                        setQuickMessageText('');
                    }} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Mensaje o actualización de estado
                            </label>
                            <textarea 
                                value={quickMessageText}
                                onChange={e => setQuickMessageText(e.target.value)}
                                required 
                                rows={4}
                                placeholder="Escribe algo para publicar en el canal general del proyecto..." 
                                className="w-full bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsQuickMessageModalOpen(false);
                                    setQuickMessageText('');
                                }} 
                                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                            >
                                Enviar Mensaje
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL EDITOR ENRIQUECIDO DE NOTAS DEL PROYECTO */}
            <ProjectNoteEditorModal
                isOpen={!!editingProjectNote}
                note={editingProjectNote}
                projectName={activeProject?.title}
                onClose={() => setEditingProjectNote(null)}
                onSave={(updated) => {
                    onUpdateNote(updated);
                    setEditingProjectNote(null);
                }}
                onShareToChannel={(noteToShare) => {
                    setEditingProjectNote(null);
                    handleOpenShareNote(noteToShare);
                }}
                onDelete={(noteId) => {
                    handleDeleteProjectNote(noteId);
                    setEditingProjectNote(null);
                }}
            />
        </div>
    );
};

export default React.memo(ProjectsWorkspace);
