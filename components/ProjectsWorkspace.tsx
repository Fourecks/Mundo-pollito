import React, { useState, useMemo, useRef } from 'react';
import { Project, Todo, Sprint, Milestone, ProjectDoc, ProjectDocFolder, ProjectInboxItem, ProjectChatMessage, ProjectActivity, ProjectInvitation, ProjectChannel, ProjectPoll, ProjectHuddle } from '../types';
import { 
  Plus, Settings, Calendar as CalendarIcon, FileText, Activity, Inbox, Target, AlertCircle, CheckCircle2, Circle, AlignLeft, X, Edit2, Trash2, Clock, Check, MoreVertical, ArrowLeft, BarChart2, GripVertical, Tag, CheckSquare, Sparkles, Layers, ArrowRight, Users, MessageSquare, Video, Search, FolderPlus, Folder, FolderOpen, Download, Send, Paperclip, Smile, Pin, ExternalLink, Shield, FileSpreadsheet, FileCode, FileImage, FileArchive, File as FileIcon, Share2, HelpCircle, AlertTriangle, RefreshCw, ThumbsUp, Heart, Flame, Eye, Lightbulb, Megaphone, Flag, Filter, Hash, Lock, Volume2, Mic, MicOff, Camera, CameraOff, Monitor, Maximize2, Minimize2
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

    // Huddle States
    const [isHuddleActive, setIsHuddleActive] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [huddleParticipants, setHuddleParticipants] = useState<any[]>([]);
    const [showHuddleParticipants, setShowHuddleParticipants] = useState(false);
    const [isHuddleFullScreen, setIsHuddleFullScreen] = useState(false);

    // Thread (Hilo) States
    const [activeThreadMessage, setActiveThreadMessage] = useState<ProjectChatMessage | null>(null);
    const [threadInputText, setThreadInputText] = useState<string>('');

    // Private Channel Password States
    const [newChannelPassword, setNewChannelPassword] = useState<string>('');
    const [editingChannelPassword, setEditingChannelPassword] = useState<string>('');
    const [unlockedChannels, setUnlockedChannels] = useState<Record<string, boolean>>({});
    const [passwordPromptChannel, setPasswordPromptChannel] = useState<ProjectChannel | null>(null);
    const [inputPassword, setInputPassword] = useState<string>('');

    // Live WebRTC and Audio Capture/Analyze States
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const [localVolume, setLocalVolume] = useState<number>(0);
    const volumeIntervalRef = useRef<any>(null);
    const [speakingParticipants, setSpeakingParticipants] = useState<Record<string, boolean>>({});

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

    // Typing effect simulation (disabled to keep it real)
    React.useEffect(() => {
        // Typing simulation disabled as requested
    }, []);

    // Simulated active speaking for other participants
    React.useEffect(() => {
        if (!isHuddleActive) {
            setSpeakingParticipants({});
            return;
        }
        const sInterval = setInterval(() => {
            const speaking: Record<string, boolean> = {};
            huddleParticipants.forEach(p => {
                if (p.name === 'Tú') {
                    speaking['Tú'] = localVolume > 10;
                } else if (p.has_mic && Math.random() > 0.65) {
                    speaking[p.name] = true;
                }
            });
            setSpeakingParticipants(speaking);
        }, 1200);

        return () => clearInterval(sInterval);
    }, [isHuddleActive, huddleParticipants, localVolume]);

    // Setup visual audio analysis using Web Audio API
    const setUpAudioAnalysis = (stream: MediaStream) => {
        try {
            if (volumeIntervalRef.current) {
                clearInterval(volumeIntervalRef.current);
                volumeIntervalRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) return;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            volumeIntervalRef.current = setInterval(() => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                setLocalVolume(Math.min(100, Math.round((average / 128) * 100)));
            }, 100);

        } catch (e) {
            console.warn("Audio Context setup not supported or failed:", e);
        }
    };

    const stopLocalStream = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setLocalStream(null);
        
        if (volumeIntervalRef.current) {
            clearInterval(volumeIntervalRef.current);
            volumeIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        setLocalVolume(0);
    };

    const stopScreenStream = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        setScreenStream(null);
        setIsScreenSharing(false);
    };

    // Simulated background huddle joiners
    React.useEffect(() => {
        if (!isHuddleActive) {
            setHuddleParticipants([]);
            return;
        }

        // Add user immediately (only the real user, no mock joiners)
        setHuddleParticipants([{ name: 'Tú', email: 'tu_correo@ejemplo.com', has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing }]);
    }, [isHuddleActive]);

    // Handle initial streams & camera toggle
    React.useEffect(() => {
        if (!isHuddleActive) {
            stopLocalStream();
            stopScreenStream();
            return;
        }

        const initMedia = async () => {
            try {
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => track.stop());
                }

                const constraints = {
                    audio: true, 
                    video: isVideoOn ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } } : false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                localStreamRef.current = stream;
                setLocalStream(stream);

                stream.getAudioTracks().forEach(track => {
                    track.enabled = isMicOn;
                });

                if (isMicOn) {
                    setUpAudioAnalysis(stream);
                } else {
                    setLocalVolume(0);
                }

            } catch (err) {
                console.error("Error securing user media permissions:", err);
                alert("No se pudo acceder al micrófono o la cámara. Verifica los permisos de tu navegador.");
                setIsMicOn(false);
                setIsVideoOn(false);
            }
        };

        initMedia();

        return () => {};
    }, [isHuddleActive, isVideoOn]);

    // Handle Mic toggle separately to avoid starting/stopping video tracks
    React.useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = isMicOn;
            });
            if (isMicOn) {
                setUpAudioAnalysis(localStreamRef.current);
            } else {
                setLocalVolume(0);
                if (volumeIntervalRef.current) {
                    clearInterval(volumeIntervalRef.current);
                    volumeIntervalRef.current = null;
                }
            }
        }
    }, [isMicOn]);

    // Handle Screen Sharing toggle
    React.useEffect(() => {
        if (!isHuddleActive) return;

        const toggleScreen = async () => {
            if (isScreenSharing) {
                try {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    screenStreamRef.current = stream;
                    setScreenStream(stream);

                    stream.getVideoTracks()[0].onended = () => {
                        stopScreenStream();
                    };

                } catch (err) {
                    console.error("Error requesting screen share:", err);
                    setIsScreenSharing(false);
                }
            } else {
                stopScreenStream();
            }
        };

        toggleScreen();
    }, [isScreenSharing, isHuddleActive]);

    // Update user's media states in active huddle participants list
    React.useEffect(() => {
        if (isHuddleActive) {
            setHuddleParticipants(prev => prev.map(p => p.name === 'Tú' ? { ...p, has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing } : p));
        }
    }, [isMicOn, isVideoOn, isScreenSharing, isHuddleActive]);

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
                        { id: 'chat', label: 'Canales', icon: MessageSquare, badge: activeProject.chat_messages?.length, isHuddle: isHuddleActive || (activeProject.huddles || []).some(h => h.active) },
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

        const handleSendThreadReply = (e: React.FormEvent) => {
            e.preventDefault();
            if (!threadInputText.trim() || !activeThreadMessage) return;

            const newReply: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                sender_name: 'Tú',
                sender_email: 'tu_correo@ejemplo.com',
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
                created_by: 'Tú',
                created_at: new Date().toISOString()
            };

            const updatedPolls = [...activePolls, newPoll];
            
            const newMessage: ProjectChatMessage = {
                id: crypto.randomUUID(),
                project_id: activeProject.id,
                channel_id: currentChannel.id,
                sender_name: 'Tú',
                sender_email: 'tu_correo@ejemplo.com',
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
            const userEmail = 'tu_correo@ejemplo.com';
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
            const userEmail = 'tu_correo@ejemplo.com';
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

        const handleToggleHuddle = () => {
            if (isHuddleActive) {
                setIsHuddleActive(false);
                const updatedHuddles = activeHuddles.map(h => h.channel_id === currentChannel.id ? { ...h, active: false, participants: [] } : h);
                onUpdateProject(activeProject.id, { huddles: updatedHuddles });
            } else {
                setIsHuddleActive(true);
                const updatedHuddles = activeHuddles.some(h => h.channel_id === currentChannel.id)
                    ? activeHuddles.map(h => h.channel_id === currentChannel.id ? { ...h, active: true, started_at: new Date().toISOString(), participants: [{ name: 'Tú', email: 'tu_correo@ejemplo.com', has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing }] } : h)
                    : [...activeHuddles, { id: crypto.randomUUID(), project_id: activeProject.id, channel_id: currentChannel.id, active: true, started_at: new Date().toISOString(), participants: [{ name: 'Tú', email: 'tu_correo@ejemplo.com', has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing }] }];
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
                            <button 
                                onClick={() => setIsCreateChannelOpen(true)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-blue-600 dark:text-blue-400"
                                title="Crear nuevo canal"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Active Global Huddle Banner */}
                        {(isHuddleActive || activeHuddles.some(h => h.active)) && (
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
                                        const runningHuddle = activeHuddles.find(h => h.active) || { channel_id: 'general' };
                                        setSelectedChannelId(runningHuddle.channel_id);
                                        setIsHuddleActive(true);
                                    }}
                                    className="w-full text-center py-1 text-[11px] bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors"
                                >
                                    Unirse al Huddle 🎙️
                                </button>
                            </div>
                        )}

                        {/* Channels List */}
                        <div className="p-2 space-y-0.5">
                            {activeChannels.map(chan => {
                                const isSelected = chan.id === currentChannel.id;
                                const isChanHuddleActive = (activeHuddles.find(h => h.channel_id === chan.id)?.active) || (isHuddleActive && chan.id === currentChannel.id);
                                
                                // Simulation: unread notifications for non-selected channels (e.g. general usually has some history)
                                const hasUnread = !isSelected && chan.id === 'ideas';

                                return (
                                    <div 
                                        key={chan.id}
                                        className={`group/chan flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-semibold' 
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                        onClick={() => setSelectedChannelId(chan.id)}
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
                                            {chan.id !== 'general' && (
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
                    
                    {/* FULLSCREEN HUDDLE VIEW */}
                    {isHuddleActive && isHuddleFullScreen && (
                        <div className="absolute inset-0 bg-slate-950 text-white z-[45] flex flex-col p-6 select-none animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                    <div>
                                        <h2 className="text-sm font-bold tracking-wide text-white">Huddle Activo: #{currentChannel.name} (Pantalla Completa)</h2>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{huddleParticipants.length} participantes • Conexión Activa</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setIsHuddleFullScreen(false)}
                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors text-white"
                                    >
                                        <Minimize2 className="w-4 h-4" /> Salir
                                    </button>
                                    <button 
                                        onClick={handleToggleHuddle}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-xs font-bold rounded-lg text-white transition-colors"
                                    >
                                        Colgar 📞
                                    </button>
                                </div>
                            </div>

                            {/* Streams Grid */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto pb-4">
                                {huddleParticipants.map((p, idx) => {
                                    const isSpeaking = p.name === 'Tú' ? localVolume > 10 : !!speakingParticipants[p.name];
                                    return (
                                        <div 
                                            key={p.email || idx} 
                                            className={`bg-slate-900/80 rounded-2xl p-4 border relative overflow-hidden flex flex-col justify-between min-h-[220px] transition-all duration-300 ${
                                                isSpeaking 
                                                    ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/20' 
                                                    : 'border-white/5 shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent p-2 absolute inset-x-0 top-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-200">{p.name}</span>
                                                    {p.name === 'Tú' && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Tú</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {p.has_mic ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-500" />}
                                                    {p.has_screen && <span className="text-[9px] bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Compartiendo</span>}
                                                </div>
                                            </div>

                                            {/* Video Stream / Avatar container */}
                                            <div className="absolute inset-0 bg-slate-950 overflow-hidden flex items-center justify-center">
                                                {p.has_screen && p.name === 'Tú' && screenStream ? (
                                                    <VideoStream stream={screenStream} />
                                                ) : p.has_video ? (
                                                    p.name === 'Tú' && localStream ? (
                                                        <VideoStream stream={localStream} />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-900">
                                                            <span className="text-[32px] animate-bounce">🐣</span>
                                                            <span className="text-[10px] tracking-widest text-emerald-400 uppercase font-bold mt-2">Cámara de {p.name} activa</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 text-gray-300 font-bold text-2xl flex items-center justify-center transition-all">
                                                        {p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer inside video block */}
                                            <div className="mt-auto z-10 bg-black/60 p-2 absolute inset-x-0 bottom-0 flex items-center justify-between text-[10px] text-gray-300">
                                                <span>Estado: {p.has_mic ? 'Hablando' : 'Mutado'}</span>
                                                <span className="truncate max-w-[120px]">{p.email}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Controllers */}
                            <div className="border-t border-white/10 pt-4 mt-auto shrink-0 flex items-center justify-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/5 max-w-xl mx-auto w-full">
                                <button 
                                    onClick={() => setIsMicOn(prev => !prev)}
                                    className={`p-3.5 rounded-xl transition-all ${isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                    title={isMicOn ? 'Silenciar Micrófono' : 'Activar Micrófono'}
                                >
                                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </button>
                                <button 
                                    onClick={() => setIsVideoOn(prev => !prev)}
                                    className={`p-3.5 rounded-xl transition-all ${isVideoOn ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                                    title={isVideoOn ? 'Desactivar Cámara' : 'Activar Cámara'}
                                >
                                    {isVideoOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                                </button>
                                <button 
                                    onClick={() => setIsScreenSharing(prev => !prev)}
                                    className={`p-3.5 rounded-xl transition-all ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                                    title={isScreenSharing ? 'Detener Compartir Pantalla' : 'Compartir Pantalla'}
                                >
                                    <Monitor className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

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
                                            isHuddleActive 
                                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                : (activeHuddles.find(h => h.channel_id === currentChannel.id)?.active)
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        {isHuddleActive ? 'Salir del Huddle' : (activeHuddles.find(h => h.channel_id === currentChannel.id)?.active) ? 'Unirse' : 'Iniciar Huddle'}
                                    </button>
                                )}

                            </div>
                        </div>

                        {/* CONDITIONAL LOCK VIEW OR ACTIVE CONVERSATION VIEW */}
                        {currentChannel.is_private && currentChannel.password && !unlockedChannels[currentChannel.id] ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/40 dark:bg-black/10">
                                <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                                    <Lock className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                                    Canal Privado Protegido
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
                                    Este canal está protegido con contraseña. Por favor, ingresa la clave de acceso para ver las conversaciones y participar.
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
                                                if (inputPassword === currentChannel.password) {
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
                                            if (inputPassword === currentChannel.password) {
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
                                {/* 3. HUDDLE ACTIVE AUDIO/VIDEO BAR */}
                                {isHuddleActive && (
                                    <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 text-white p-4 shrink-0 shadow-lg border-b border-slate-800">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-white flex items-center gap-2">
                                                        Huddle Activo en #{currentChannel.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        {huddleParticipants.length} participantes • Conexión Real
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Live Participants Avatars */}
                                            <div className="flex items-center gap-3 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                                <span className="text-[10px] uppercase font-bold text-gray-400">En Llamada:</span>
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {huddleParticipants.map((p, idx) => (
                                                        <div 
                                                            key={p.email || idx} 
                                                            className={`w-6 h-6 rounded-full bg-blue-600 border border-slate-900 text-[10px] font-bold flex items-center justify-center transition-all ${
                                                                (p.name === 'Tú' ? localVolume > 10 : !!speakingParticipants[p.name]) 
                                                                    ? 'ring-2 ring-emerald-400 scale-105' 
                                                                    : ''
                                                            }`}
                                                            title={`${p.name} (${p.email}) ${p.has_mic ? '🎙️' : '🔇'} ${p.has_video ? '📹' : ''}`}
                                                        >
                                                            {p.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => setShowHuddleParticipants(prev => !prev)}
                                                    className="text-[10px] underline text-blue-400 hover:text-blue-300 font-bold"
                                                >
                                                    {showHuddleParticipants ? 'Ocultar' : 'Ver Detalles'}
                                                </button>
                                            </div>

                                            {/* Integrated Call Controllers */}
                                            <div className="flex items-center gap-2">
                                                {/* Full-Screen Toggle */}
                                                <button 
                                                    onClick={() => setIsHuddleFullScreen(true)}
                                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-all"
                                                    title="Pantalla Completa"
                                                >
                                                    <Maximize2 className="w-4 h-4" />
                                                </button>

                                                {/* Mic Mute/Unmute */}
                                                <button 
                                                    onClick={() => setIsMicOn(prev => !prev)}
                                                    className={`p-2 rounded-lg transition-all ${isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/90 hover:bg-red-600 text-white'}`}
                                                    title={isMicOn ? 'Silenciar Micrófono' : 'Activar Micrófono'}
                                                >
                                                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                                </button>

                                                {/* Video Camera Toggle */}
                                                <button 
                                                    onClick={() => setIsVideoOn(prev => !prev)}
                                                    className={`p-2 rounded-lg transition-all ${isVideoOn ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                                                    title={isVideoOn ? 'Desactivar Cámara' : 'Activar Cámara'}
                                                >
                                                    {isVideoOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                                                </button>

                                                {/* Screen Sharing Toggle */}
                                                <button 
                                                    onClick={() => setIsScreenSharing(prev => !prev)}
                                                    className={`p-2 rounded-lg transition-all ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                                                    title={isScreenSharing ? 'Detener Compartir Pantalla' : 'Compartir Pantalla'}
                                                >
                                                    <Monitor className="w-4 h-4" />
                                                </button>

                                                <button 
                                                    onClick={handleToggleHuddle}
                                                    className="px-2.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all"
                                                    title="Finalizar llamada"
                                                >
                                                    Colgar 📞
                                                </button>
                                            </div>

                                        </div>

                                        {/* Expanded Participant Control & Camera Streams List */}
                                        {(showHuddleParticipants || isVideoOn) && (
                                            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {huddleParticipants.map((p, idx) => {
                                                    const isSpeaking = p.name === 'Tú' ? localVolume > 10 : !!speakingParticipants[p.name];
                                                    return (
                                                        <div 
                                                            key={p.email || idx} 
                                                            className={`bg-black/40 rounded-lg p-2.5 border relative overflow-hidden flex flex-col justify-between min-h-[110px] transition-all duration-200 ${
                                                                isSpeaking 
                                                                    ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                                                                    : 'border-white/5'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between z-10">
                                                                <span className="text-[11px] font-bold text-gray-200 truncate">{p.name}</span>
                                                                <span className="text-[10px] text-gray-500">{p.name === 'Tú' ? '(Tú)' : ''}</span>
                                                            </div>

                                                            {/* Video Stream / Static Avatar view */}
                                                            {p.has_screen && p.name === 'Tú' && screenStream ? (
                                                                <div className="absolute inset-0 bg-slate-900 mt-6 overflow-hidden">
                                                                    <VideoStream stream={screenStream} />
                                                                </div>
                                                            ) : p.has_video ? (
                                                                <div className="absolute inset-0 bg-slate-900 mt-6 overflow-hidden">
                                                                    {p.name === 'Tú' && localStream ? (
                                                                        <VideoStream stream={localStream} />
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                                                                            <span className="text-[20px] animate-pulse">🐣</span>
                                                                            <span className="text-[8px] tracking-widest text-emerald-400 uppercase font-bold">Cámara Activa</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 flex items-center justify-center my-1.5 z-10">
                                                                    <div className={`w-8 h-8 rounded-full bg-slate-800 border text-gray-300 font-bold text-xs flex items-center justify-center transition-all ${
                                                                        isSpeaking ? 'border-emerald-400 bg-slate-800 ring-2 ring-emerald-500/20' : 'border-slate-700'
                                                                    }`}>
                                                                        {p.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between z-10 bg-black/50 p-1 rounded mt-auto text-[9px] text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    {p.has_mic ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-red-400" />}
                                                                    {p.has_mic ? 'Audio' : 'Mute'}
                                                                </span>
                                                                {p.has_screen && <span className="text-blue-400">Compartiendo</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                    </div>
                                )}

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
                                            const isUser = msg.sender_email === 'tu_correo@ejemplo.com';
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
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{msg.sender_name}</span>
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
                                                                <strong className="block text-[10px] text-blue-500">Respondiendo a {msg.reply_to.sender_name}:</strong>
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
                                                                        const userVoted = opt.voters.includes('tu_correo@ejemplo.com');

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
                                                                                            <span key={i} className="px-1 py-0.2 bg-gray-100 dark:bg-gray-800 rounded">{v === 'tu_correo@ejemplo.com' ? 'Tú' : v.split('@')[0]}</span>
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
                                                                const hasReacted = voters.includes('tu_correo@ejemplo.com');
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
                                                                const hasReacted = voters.includes('tu_correo@ejemplo.com');
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
                                            <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{activeThreadMessage.sender_name}</p>
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
                                                        <span className="text-[11px] font-bold text-gray-900 dark:text-white">{reply.sender_name}</span>
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
