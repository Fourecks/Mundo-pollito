import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Hash, Pin, Trash2, Edit2, Plus, X, Send, 
  Smile, Mic, MicOff, Video, VideoOff, ScreenShare, Volume2, 
  Check, MoreHorizontal, BarChart2, Users, PinOff, MessageSquare, AlertCircle
} from 'lucide-react';
import { Project, ProjectMember } from '../types';

interface ProjectChannel {
  id: string;
  name: string;
  description: string;
  emoji: string;
  is_private: boolean;
  is_pinned?: boolean;
}

interface ProjectChannelMessage {
  id: string;
  sender_email: string;
  sender_name: string;
  text: string;
  created_at: string;
  is_pinned?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of user emails
  poll?: {
    question: string;
    options: { id: string; text: string; votes: string[] }[]; // option id -> list of voter emails
  };
}

interface HuddleState {
  is_active: boolean;
  channelId: string | null;
  participants: {
    email: string;
    name: string;
    avatar?: string;
    mic_on: boolean;
    camera_on: boolean;
    screen_sharing: boolean;
  }[];
  mic_on: boolean;
  camera_on: boolean;
  screen_sharing: boolean;
}

interface ProjectChannelsProps {
  project: Project;
  currentUserEmail: string;
  onUpdateProject: (id: number, updates: Partial<Project>) => Promise<void>;
}

export const ProjectChannels: React.FC<ProjectChannelsProps> = ({
  project,
  currentUserEmail,
  onUpdateProject
}) => {
  // Current user's metadata from project members
  const currentMember = project.members?.find(m => m.email === currentUserEmail) || {
    name: currentUserEmail.split('@')[0],
    role: 'member',
    email: currentUserEmail
  };

  // State managers
  const [channels, setChannels] = useState<ProjectChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, ProjectChannelMessage[]>>({});
  const [inputText, setInputText] = useState('');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState<ProjectChannel | null>(null);
  
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelEmoji, setNewChannelEmoji] = useState('💬');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);

  // Poll creation state
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // UI Panels state
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Huddle State
  const [huddle, setHuddle] = useState<HuddleState>({
    is_active: false,
    channelId: null,
    participants: [],
    mic_on: true,
    camera_on: false,
    screen_sharing: false
  });

  const [activeHuddleChannelId, setActiveHuddleChannelId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load state from local storage or set defaults
  useEffect(() => {
    const localStorageKeyChannels = `project_channels_${project.id}`;
    const localStorageKeyMessages = `project_messages_${project.id}`;
    const localStorageKeyHuddle = `project_huddle_${project.id}`;

    const savedChannels = localStorage.getItem(localStorageKeyChannels);
    const savedMessages = localStorage.getItem(localStorageKeyMessages);
    const savedHuddle = localStorage.getItem(localStorageKeyHuddle);

    let loadedChannels: ProjectChannel[] = [];
    if (savedChannels) {
      try {
        loadedChannels = JSON.parse(savedChannels);
      } catch (e) {
        console.error("Error parsing channels:", e);
      }
    }

    // Default channels seeding
    if (loadedChannels.length === 0) {
      loadedChannels = [
        { id: 'chan-general', name: 'general', description: 'Canal general para discusiones del equipo', emoji: '📢', is_private: false, is_pinned: true },
        { id: 'chan-diseno', name: 'diseño-ui-ux', description: 'Canal para discutir el diseño, Figma y estilos visuales', emoji: '🎨', is_private: false },
        { id: 'chan-desarrollo', name: 'desarrollo', description: 'Canal técnico para coordinar tareas de programación', emoji: '💻', is_private: false },
        { id: 'chan-lanzamiento', name: 'lanzamiento-privado', description: 'Canal cerrado para coordinar la salida a producción', emoji: '🚀', is_private: true }
      ];
      localStorage.setItem(localStorageKeyChannels, JSON.stringify(loadedChannels));
    }
    setChannels(loadedChannels);
    
    // Choose general as default active channel
    if (loadedChannels.length > 0) {
      setSelectedChannelId(loadedChannels[0].id);
    }

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Error parsing messages:", e);
      }
    } else {
      // Seed default messages
      const seededMessages: Record<string, ProjectChannelMessage[]> = {
        'chan-general': [
          {
            id: 'm-seed-1',
            sender_email: 'sofia.lead@empresa.com',
            sender_name: 'Sofía (Lead)',
            text: '¡Bienvenidos al módulo de canales de comunicación! He creado los canales básicos para empezar a organizarnos.',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            reactions: { '👍': ['sofia.lead@empresa.com'], '🚀': ['carlos.dev@empresa.com', currentUserEmail] }
          },
          {
            id: 'm-seed-2',
            sender_email: 'carlos.dev@empresa.com',
            sender_name: 'Carlos (Dev)',
            text: '¡Excelente idea, Sofía! Mucho mejor que el chat grupal que teníamos antes. Los canales públicos y privados dan mucho orden.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            reactions: { '❤️': ['sofia.lead@empresa.com', currentUserEmail] }
          }
        ],
        'chan-diseno': [
          {
            id: 'm-seed-3',
            sender_email: 'elena.designer@empresa.com',
            sender_name: 'Elena (UI/UX)',
            text: 'Hola equipo, ¿qué les parece esta paleta de colores para el nuevo dashboard del proyecto?',
            created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
            poll: {
              question: '¿Qué paleta de colores preferimos para la interfaz?',
              options: [
                { id: 'opt-1', text: 'Azul Real y Gris Neutro Sofisticado', votes: ['elena.designer@empresa.com', 'sofia.lead@empresa.com'] },
                { id: 'opt-2', text: 'Verde Esmeralda Premium y Crema Templado', votes: ['carlos.dev@empresa.com'] },
                { id: 'opt-3', text: 'Oscura de Lujo (Acento Neón)', votes: [] }
              ]
            }
          }
        ]
      };
      setMessages(seededMessages);
      localStorage.setItem(localStorageKeyMessages, JSON.stringify(seededMessages));
    }

    if (savedHuddle) {
      try {
        const parsedHuddle = JSON.parse(savedHuddle);
        if (parsedHuddle.is_active) {
          setActiveHuddleChannelId(parsedHuddle.channelId);
        }
      } catch (e) {}
    }
  }, [project.id]);

  // Scroll to bottom on new message or channel switch
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChannelId, typingUser]);

  // Auto typing simulator to make the application feel active
  useEffect(() => {
    if (!selectedChannelId) return;

    const timer = setTimeout(() => {
      // Pick a random sender from project team or defaults
      const potentialSenders = [
        { name: 'Sofía (Lead)', email: 'sofia.lead@empresa.com' },
        { name: 'Carlos (Dev)', email: 'carlos.dev@empresa.com' },
        { name: 'Elena (UI/UX)', email: 'elena.designer@empresa.com' }
      ].filter(s => s.email !== currentUserEmail);

      if (potentialSenders.length === 0) return;
      const sender = potentialSenders[Math.floor(Math.random() * potentialSenders.length)];

      setTypingUser(sender.name);

      // Typing duration
      setTimeout(() => {
        setTypingUser(null);

        // Generate appropriate message based on the active channel
        const activeChan = channels.find(c => c.id === selectedChannelId);
        if (!activeChan) return;

        let messageText = '¿Cómo van con las tareas del día?';
        if (activeChan.name.includes('general')) {
          const generalMessages = [
            '¡Gran avance en los sprints! Sigamos así equipo.',
            'Acabo de programar una reunión rápida para definir detalles de la integración mañana.',
            'Revisemos los riesgos del proyecto, parece que la API tiene alguna inestabilidad.'
          ];
          messageText = generalMessages[Math.floor(Math.random() * generalMessages.length)];
        } else if (activeChan.name.includes('diseño')) {
          const designMessages = [
            'He revisado las guías de Apple y Material Design. Modifiqué los botones para que tengan un área de toque mínima de 44x44px.',
            'Me encanta el contraste en el modo claro. Pasa sin problemas las pruebas WCAG AA (mínimo 4.5:1).',
            '¿Qué opinan si agregamos micro-animaciones táctiles al presionar las tarjetas del Kanban?'
          ];
          messageText = designMessages[Math.floor(Math.random() * designMessages.length)];
        } else if (activeChan.name.includes('desarrollo')) {
          const devMessages = [
            'Ya subí los cambios de la base de datos local IndexedDB y el mecanismo de cola offline.',
            'El compilador de TypeScript ahora está estrictamente configurado para evitar tipos implícitos de tipo "any".',
            'Hice pruebas con la API de Gemini y la generación de resúmenes de minutas funciona perfecto.'
          ];
          messageText = devMessages[Math.floor(Math.random() * devMessages.length)];
        } else {
          messageText = `Asegurémonos de revisar el estado actual en el canal #${activeChan.name} para mantener todo alineado.`;
        }

        const newMessage: ProjectChannelMessage = {
          id: `m-sim-${Date.now()}`,
          sender_email: sender.email,
          sender_name: sender.name,
          text: messageText,
          created_at: new Date().toISOString()
        };

        setMessages(prev => {
          const chanMsgs = prev[selectedChannelId] || [];
          const updated = {
            ...prev,
            [selectedChannelId]: [...chanMsgs, newMessage]
          };
          localStorage.setItem(`project_messages_${project.id}`, JSON.stringify(updated));
          return updated;
        });

      }, 4000);

    }, 15000); // trigger typing simulation after 15 seconds

    return () => clearTimeout(timer);
  }, [selectedChannelId, channels, project.id, currentUserEmail]);

  // Persistent saving functions
  const saveChannelsToStorage = (updatedChannels: ProjectChannel[]) => {
    setChannels(updatedChannels);
    localStorage.setItem(`project_channels_${project.id}`, JSON.stringify(updatedChannels));
  };

  const saveMessagesToStorage = (updatedMessages: Record<string, ProjectChannelMessage[]>) => {
    setMessages(updatedMessages);
    localStorage.setItem(`project_messages_${project.id}`, JSON.stringify(updatedMessages));
  };

  // Channel actions
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    // Standardize channel names (no spaces, lower case)
    const formattedName = newChannelName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');

    const newChan: ProjectChannel = {
      id: `chan-${Date.now()}`,
      name: formattedName,
      description: newChannelDesc.trim() || 'Sin descripción',
      emoji: newChannelEmoji || '💬',
      is_private: newChannelIsPrivate,
      is_pinned: false
    };

    const updated = [...channels, newChan];
    saveChannelsToStorage(updated);
    
    // Add empty message array
    const updatedMsgs = { ...messages, [newChan.id]: [] };
    saveMessagesToStorage(updatedMsgs);

    setSelectedChannelId(newChan.id);
    setIsCreateModalOpen(false);
    
    // Reset form
    setNewChannelName('');
    setNewChannelDesc('');
    setNewChannelEmoji('💬');
    setNewChannelIsPrivate(false);
  };

  const handleEditChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelToEdit || !newChannelName.trim()) return;

    const formattedName = newChannelName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');

    const updated = channels.map(c => c.id === channelToEdit.id ? {
      ...c,
      name: formattedName,
      description: newChannelDesc,
      emoji: newChannelEmoji,
      is_private: newChannelIsPrivate
    } : c);

    saveChannelsToStorage(updated);
    setIsEditModalOpen(false);
    setChannelToEdit(null);
  };

  const handleDeleteChannel = (id: string) => {
    const channelToDelete = channels.find(c => c.id === id);
    if (!channelToDelete) return;

    if (!window.confirm(`¿Estás seguro de que deseas eliminar el canal #${channelToDelete.name}? Todos sus mensajes se perderán de forma permanente.`)) {
      return;
    }

    const updated = channels.filter(c => c.id !== id);
    saveChannelsToStorage(updated);

    // Delete messages from state
    const updatedMsgs = { ...messages };
    delete updatedMsgs[id];
    saveMessagesToStorage(updatedMsgs);

    if (selectedChannelId === id && updated.length > 0) {
      setSelectedChannelId(updated[0].id);
    }
  };

  const togglePinChannel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = channels.map(c => c.id === id ? { ...c, is_pinned: !c.is_pinned } : c);
    saveChannelsToStorage(updated);
  };

  // Message actions
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannelId) return;

    const newMsg: ProjectChannelMessage = {
      id: `msg-${Date.now()}`,
      sender_email: currentUserEmail,
      sender_name: currentMember.name || currentUserEmail.split('@')[0],
      text: inputText.trim(),
      created_at: new Date().toISOString()
    };

    const chanMsgs = messages[selectedChannelId] || [];
    const updatedMsgs = {
      ...messages,
      [selectedChannelId]: [...chanMsgs, newMsg]
    };

    saveMessagesToStorage(updatedMsgs);
    setInputText('');
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!selectedChannelId) return;
    const chanMsgs = messages[selectedChannelId] || [];
    const updatedMsgs = {
      ...messages,
      [selectedChannelId]: chanMsgs.filter(m => m.id !== msgId)
    };
    saveMessagesToStorage(updatedMsgs);
  };

  const togglePinMessage = (msgId: string) => {
    if (!selectedChannelId) return;
    const chanMsgs = messages[selectedChannelId] || [];
    const updatedMsgs = {
      ...messages,
      [selectedChannelId]: chanMsgs.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m)
    };
    saveMessagesToStorage(updatedMsgs);
  };

  // Reaction actions
  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!selectedChannelId) return;
    const chanMsgs = messages[selectedChannelId] || [];
    
    const updatedMsgs = {
      ...messages,
      [selectedChannelId]: chanMsgs.map(m => {
        if (m.id !== msgId) return m;
        
        const reactions = m.reactions ? { ...m.reactions } : {};
        const voters = reactions[emoji] ? [...reactions[emoji]] : [];
        
        if (voters.includes(currentUserEmail)) {
          // Remove voter
          const filtered = voters.filter(email => email !== currentUserEmail);
          if (filtered.length === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = filtered;
          }
        } else {
          // Add voter
          reactions[emoji] = [...voters, currentUserEmail];
        }

        return { ...m, reactions };
      })
    };

    saveMessagesToStorage(updatedMsgs);
  };

  // Poll actions
  const handleAddPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || !selectedChannelId) return;

    const validOptions = pollOptions
      .map((opt, i) => ({ id: `opt-${Date.now()}-${i}`, text: opt.trim(), votes: [] }))
      .filter(opt => opt.text.length > 0);

    if (validOptions.length < 2) {
      alert('Por favor agrega al menos 2 opciones válidas para la encuesta.');
      return;
    }

    const newMsg: ProjectChannelMessage = {
      id: `msg-poll-${Date.now()}`,
      sender_email: currentUserEmail,
      sender_name: currentMember.name || currentUserEmail.split('@')[0],
      text: `📊 Encuesta creada: ${pollQuestion.trim()}`,
      created_at: new Date().toISOString(),
      poll: {
        question: pollQuestion.trim(),
        options: validOptions
      }
    };

    const chanMsgs = messages[selectedChannelId] || [];
    const updatedMsgs = {
      ...messages,
      [selectedChannelId]: [...chanMsgs, newMsg]
    };

    saveMessagesToStorage(updatedMsgs);

    // Reset poll modal state
    setPollQuestion('');
    setPollOptions(['', '']);
    setIsPollModalOpen(false);
  };

  const handleVotePoll = (msgId: string, optionId: string) => {
    if (!selectedChannelId) return;
    const chanMsgs = messages[selectedChannelId] || [];

    const updatedMsgs = {
      ...messages,
      [selectedChannelId]: chanMsgs.map(m => {
        if (m.id !== msgId || !m.poll) return m;

        // Toggle vote across options (user can only vote for one option in this implementation)
        const updatedOptions = m.poll.options.map(opt => {
          const wasVoted = opt.votes.includes(currentUserEmail);
          const isTargetOption = opt.id === optionId;

          let newVotes = [...opt.votes];
          if (wasVoted) {
            newVotes = newVotes.filter(email => email !== currentUserEmail);
          } else if (isTargetOption) {
            newVotes = [...newVotes, currentUserEmail];
          } else {
            // Remove from other options to allow single choice
            newVotes = newVotes.filter(email => email !== currentUserEmail);
          }

          return { ...opt, votes: newVotes };
        });

        return {
          ...m,
          poll: {
            ...m.poll,
            options: updatedOptions
          }
        };
      })
    };

    saveMessagesToStorage(updatedMsgs);
  };

  // Huddle implementation
  const handleToggleHuddle = () => {
    if (!selectedChannelId) return;

    if (huddle.is_active && huddle.channelId === selectedChannelId) {
      // Leave huddle
      setHuddle({
        is_active: false,
        channelId: null,
        participants: [],
        mic_on: true,
        camera_on: false,
        screen_sharing: false
      });
      setActiveHuddleChannelId(null);
      localStorage.removeItem(`project_huddle_${project.id}`);
    } else {
      // Join or start huddle
      const otherParticipants = [
        { email: 'sofia.lead@empresa.com', name: 'Sofía (Lead)', mic_on: true, camera_on: true, screen_sharing: false },
        { email: 'carlos.dev@empresa.com', name: 'Carlos (Dev)', mic_on: false, camera_on: false, screen_sharing: false }
      ].filter(p => p.email !== currentUserEmail);

      const updatedHuddle = {
        is_active: true,
        channelId: selectedChannelId,
        participants: [
          {
            email: currentUserEmail,
            name: currentMember.name || currentUserEmail.split('@')[0],
            mic_on: huddle.mic_on,
            camera_on: huddle.camera_on,
            screen_sharing: huddle.screen_sharing
          },
          ...otherParticipants
        ],
        mic_on: huddle.mic_on,
        camera_on: huddle.camera_on,
        screen_sharing: huddle.screen_sharing
      };

      setHuddle(updatedHuddle);
      setActiveHuddleChannelId(selectedChannelId);
      localStorage.setItem(`project_huddle_${project.id}`, JSON.stringify(updatedHuddle));
    }
  };

  const handleToggleHuddleMic = () => {
    const updatedState = { ...huddle, mic_on: !huddle.mic_on };
    
    if (huddle.is_active) {
      updatedState.participants = huddle.participants.map(p => 
        p.email === currentUserEmail ? { ...p, mic_on: updatedState.mic_on } : p
      );
    }
    setHuddle(updatedState);
  };

  const handleToggleHuddleCamera = () => {
    const updatedState = { ...huddle, camera_on: !huddle.camera_on };
    
    if (huddle.is_active) {
      updatedState.participants = huddle.participants.map(p => 
        p.email === currentUserEmail ? { ...p, camera_on: updatedState.camera_on } : p
      );
    }
    setHuddle(updatedState);
  };

  const handleToggleHuddleScreen = () => {
    const updatedState = { ...huddle, screen_sharing: !huddle.screen_sharing };
    
    if (huddle.is_active) {
      updatedState.participants = huddle.participants.map(p => 
        p.email === currentUserEmail ? { ...p, screen_sharing: updatedState.screen_sharing } : p
      );
    }
    setHuddle(updatedState);
  };

  const currentChannel = channels.find(c => c.id === selectedChannelId) || channels[0];
  const activeMessages = messages[selectedChannelId] || [];
  const pinnedMessages = activeMessages.filter(m => m.is_pinned);

  // Sorting: Pinned channels first, then regular alphabetically
  const sortedChannels = [...channels].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
      
      {/* 1. CHANNELS SIDEBAR (LEFT PANEL) */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-zinc-950 flex flex-col justify-between">
        
        <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[calc(100%-80px)]">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Canales de Comunicación</span>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
              title="Crear nuevo canal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {sortedChannels.map(chan => {
              const isSelected = chan.id === selectedChannelId;
              const hasHuddleActive = activeHuddleChannelId === chan.id;
              
              return (
                <div 
                  key={chan.id}
                  onClick={() => {
                    setSelectedChannelId(chan.id);
                    setShowPinnedOnly(false);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition select-none ${
                    isSelected 
                      ? 'bg-blue-100/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-medium' 
                      : 'hover:bg-slate-200/50 dark:hover:bg-zinc-900/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-sm shrink-0">{chan.emoji}</span>
                    <div className="flex items-center gap-1 overflow-hidden">
                      {chan.is_private ? (
                        <Lock className="w-3 h-3 shrink-0 text-amber-500/80" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      )}
                      <span className="text-xs truncate">{chan.name}</span>
                    </div>

                    {/* Animated Huddle beacon */}
                    {hasHuddleActive && (
                      <span className="relative flex h-2 w-2 shrink-0 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={(e) => togglePinChannel(chan.id, e)}
                      className={`p-0.5 hover:bg-slate-300 dark:hover:bg-zinc-800 rounded ${chan.is_pinned ? 'text-amber-500' : 'text-slate-400'}`}
                      title={chan.is_pinned ? "Desfijar canal" : "Fijar canal al inicio"}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChannelToEdit(chan);
                        setNewChannelName(chan.name);
                        setNewChannelDesc(chan.description);
                        setNewChannelEmoji(chan.emoji);
                        setNewChannelIsPrivate(chan.is_private);
                        setIsEditModalOpen(true);
                      }}
                      className="p-0.5 hover:bg-slate-300 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Editar canal"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {channels.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChannel(chan.id);
                        }}
                        className="p-0.5 hover:bg-slate-300 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-red-500"
                        title="Eliminar canal"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User profile inside communication system */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-xs text-indigo-700 dark:text-indigo-300 font-bold uppercase select-none">
              {currentMember.name?.substring(0, 2) || 'YO'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[11px] font-bold truncate">{currentMember.name || 'Mi Perfil'}</span>
              <span className="text-[9px] text-slate-500 truncate">{currentUserEmail}</span>
            </div>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold uppercase rounded-md shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
            {currentMember.role || 'Colab'}
          </span>
        </div>
      </div>

      {/* 2. MAIN CONVERSATION AND ACTION CHANNEL AREA */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#111115]">
        {currentChannel ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white dark:bg-[#111115] shrink-0 z-10">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <span className="text-lg">{currentChannel.emoji}</span>
                    {currentChannel.name}
                  </span>
                  {currentChannel.is_private ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" title="Canal Privado" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-slate-400" title="Canal Público" />
                  )}
                  {currentChannel.is_pinned && (
                    <Pin className="w-3 h-3 text-amber-500 fill-amber-500" title="Anclado arriba" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{currentChannel.description}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Pinned Messages Toggle */}
                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className={`p-1.5 rounded-lg border transition text-xs flex items-center gap-1 ${
                    showPinnedOnly 
                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400' 
                      : 'bg-white border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                  title="Ver mensajes destacados"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Destacados ({pinnedMessages.length})</span>
                </button>

                {/* Huddle Live Button */}
                <button
                  onClick={handleToggleHuddle}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 ${
                    huddle.is_active && huddle.channelId === selectedChannelId
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : activeHuddleChannelId === selectedChannelId
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {huddle.is_active && huddle.channelId === selectedChannelId ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                      <span>Salir del Huddle</span>
                    </>
                  ) : activeHuddleChannelId === selectedChannelId ? (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      <span>Unirse al Huddle</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Llamar Huddle</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pinned Messages Warning Pane */}
            {showPinnedOnly && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between text-xs text-amber-800 dark:text-amber-400 animate-slideDown">
                <div className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 animate-bounce" />
                  <span>Filtrando para mostrar únicamente los mensajes fijados de este canal.</span>
                </div>
                <button 
                  onClick={() => setShowPinnedOnly(false)}
                  className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-amber-700 dark:text-amber-400 font-bold"
                >
                  Ver todos
                </button>
              </div>
            )}

            {/* Huddle Frame Integration (Visible inside the active channel if camera/screensharing is active) */}
            {huddle.is_active && huddle.channelId === selectedChannelId && (
              <div className="p-4 bg-slate-900 text-white border-b border-slate-800 animate-slideDown flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Huddle Activo en #{currentChannel.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Iniciado hace unos momentos</span>
                </div>

                {/* Simulated Huddle streams grids */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {huddle.participants.map(part => {
                    const isSelf = part.email === currentUserEmail;
                    return (
                      <div key={part.email} className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center relative min-h-[100px] overflow-hidden">
                        
                        {part.camera_on ? (
                          <div className="absolute inset-0 bg-indigo-900/30 flex items-center justify-center select-none">
                            {part.screen_sharing ? (
                              <div className="flex flex-col items-center gap-1 animate-pulse">
                                <ScreenShare className="w-8 h-8 text-indigo-400" />
                                <span className="text-[10px] text-indigo-200">Compartiendo Pantalla</span>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-indigo-950 to-slate-950">
                                <div className="animate-pulse flex space-x-1 items-center">
                                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full"></span>
                                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full"></span>
                                  <span className="h-1.5 w-1.5 bg-violet-400 rounded-full"></span>
                                </div>
                                <span className="text-[10px] text-indigo-300 mt-2 font-mono">Simulación de Video...</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold uppercase text-slate-300 mb-2 border border-slate-700">
                            {part.name.substring(0, 2)}
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-900/90 px-2 py-1 rounded-md text-[10px]">
                          <span className="font-bold text-slate-200 truncate">{part.name} {isSelf && '(Tú)'}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {part.mic_on ? (
                              <Mic className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <MicOff className="w-3 h-3 text-rose-500" />
                            )}
                            {part.camera_on && <Video className="w-3 h-3 text-blue-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Local controller bar */}
                <div className="flex items-center justify-center gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <button
                    onClick={handleToggleHuddleMic}
                    className={`p-2 rounded-lg transition-all ${huddle.mic_on ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-900/40 text-rose-400 hover:bg-rose-900/60'}`}
                    title={huddle.mic_on ? "Mutear Micrófono" : "Desmutear Micrófono"}
                  >
                    {huddle.mic_on ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleToggleHuddleCamera}
                    className={`p-2 rounded-lg transition-all ${huddle.camera_on ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-900/40 text-rose-400 hover:bg-rose-900/60'}`}
                    title={huddle.camera_on ? "Apagar Cámara" : "Encender Cámara"}
                  >
                    {huddle.camera_on ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleToggleHuddleScreen}
                    className={`p-2 rounded-lg transition-all ${huddle.screen_sharing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    title={huddle.screen_sharing ? "Dejar de compartir" : "Compartir Pantalla"}
                  >
                    <ScreenShare className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-6 bg-slate-800"></div>

                  <button
                    onClick={handleToggleHuddle}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
                  >
                    Terminar Llamada
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Canal vacío</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">Sé el primero en enviar un mensaje o crea una encuesta grupal para interactuar con el equipo.</p>
                </div>
              ) : (
                (showPinnedOnly ? pinnedMessages : activeMessages).map((msg) => {
                  const isCurrentUser = msg.sender_email === currentUserEmail;
                  const isPoll = !!msg.poll;

                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col group relative max-w-[85%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      {/* Sender identification */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{msg.sender_name}</span>
                        <span className="text-[8px] text-slate-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        
                        {msg.is_pinned && (
                          <span className="flex items-center text-[8px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded font-bold border border-amber-200/30">
                            <Pin className="w-2 h-2 mr-0.5 fill-amber-500 text-amber-500" />
                            FIJADO
                          </span>
                        )}
                      </div>

                      {/* Content block */}
                      <div className={`p-3 rounded-2xl text-xs relative overflow-hidden transition-all duration-200 ${
                        isCurrentUser 
                          ? isPoll 
                            ? 'bg-blue-50 border border-blue-200 text-slate-800 dark:bg-blue-950/10 dark:border-blue-900/40 dark:text-slate-200 rounded-tr-none'
                            : 'bg-indigo-600 text-white rounded-tr-none'
                          : isPoll
                            ? 'bg-emerald-50 border border-emerald-200 text-slate-800 dark:bg-emerald-950/10 dark:border-emerald-900/40 dark:text-slate-200 rounded-tl-none'
                            : 'bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-zinc-800/50'
                      }`}>
                        
                        {/* 1. REGULAR TEXT MESSAGE */}
                        {!isPoll && <p className="leading-relaxed whitespace-pre-wrap select-text">{msg.text}</p>}

                        {/* 2. RICH POLL COMPONENT */}
                        {isPoll && msg.poll && (
                          <div className="space-y-3 min-w-[260px] max-w-sm">
                            <div className="flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-900/30 pb-2">
                              <BarChart2 className="w-4 h-4 text-emerald-500" />
                              <span className="font-bold text-slate-900 dark:text-white text-xs">{msg.poll.question}</span>
                            </div>

                            <div className="space-y-2">
                              {msg.poll.options.map((opt) => {
                                const totalVotes = msg.poll?.options.reduce((sum, o) => sum + o.votes.length, 0) || 0;
                                const votePct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                const userVoted = opt.votes.includes(currentUserEmail);

                                return (
                                  <div 
                                    key={opt.id}
                                    onClick={() => handleVotePoll(msg.id, opt.id)}
                                    className={`p-2.5 rounded-xl border cursor-pointer select-none relative overflow-hidden transition-all ${
                                      userVoted
                                        ? 'border-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/40 dark:border-emerald-700'
                                        : 'border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 hover:border-slate-300'
                                    }`}
                                  >
                                    {/* Visual Percentage bar background */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 dark:bg-emerald-500/5 transition-all duration-500" 
                                      style={{ width: `${votePct}%` }}
                                    ></div>

                                    <div className="relative flex justify-between items-center text-[11px] font-medium text-slate-800 dark:text-slate-300">
                                      <div className="flex items-center gap-2 overflow-hidden mr-4">
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${userVoted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-zinc-700'}`}>
                                          {userVoted && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                        </div>
                                        <span className="truncate">{opt.text}</span>
                                      </div>
                                      <span className="font-bold text-xs shrink-0">{opt.votes.length}v ({votePct}%)</span>
                                    </div>

                                    {/* Voters avatars breakdown */}
                                    {opt.votes.length > 0 && (
                                      <div className="relative mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-zinc-800/40 flex items-center gap-1 overflow-x-auto text-[8px] text-slate-500">
                                        <span className="font-bold text-slate-400">Votos:</span>
                                        {opt.votes.map(email => (
                                          <span 
                                            key={email} 
                                            className="px-1 py-0.2 bg-slate-200/60 dark:bg-zinc-800/80 rounded"
                                            title={email}
                                          >
                                            {email === currentUserEmail ? 'Tú' : email.split('@')[0]}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Floating panel for actions inside message */}
                      <div className="flex items-center gap-2 mt-1 px-1">
                        {/* Mini reaction pill display */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            {Object.entries(msg.reactions).map(([emoji, emails]) => {
                              const hasReacted = emails.includes(currentUserEmail);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border transition flex items-center gap-1 ${
                                    hasReacted 
                                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400' 
                                      : 'bg-white border-slate-100 dark:bg-zinc-900 dark:border-zinc-800 text-slate-500 hover:bg-slate-50'
                                  }`}
                                  title={`${emails.length} reacciones. Clic para alternar.`}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[8px]">{emails.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Message actions tray: edit / pin / delete / quick emojis */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1.5 py-0.5">
                          {/* Reactions panel quick trigger */}
                          {['👍', '❤️', '🔥', '🎉', '🚀', '👀'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="text-[11px] hover:scale-125 transition active:scale-90 p-0.5 rounded-full"
                              title={`Reaccionar con ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          
                          <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800"></div>

                          {/* Pin / Unpin button */}
                          <button
                            onClick={() => togglePinMessage(msg.id)}
                            className={`p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded ${msg.is_pinned ? 'text-amber-500' : 'text-slate-400'}`}
                            title={msg.is_pinned ? "Desfijar mensaje" : "Fijar este mensaje en el canal"}
                          >
                            {msg.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                          </button>

                          {/* Delete message button (if sent by user or if team leader) */}
                          {(isCurrentUser || currentMember.role === 'owner' || currentMember.role === 'lead') && (
                            <button
                              onClick={() => {
                                if (window.confirm('¿Seguro de eliminar este mensaje?')) {
                                  handleDeleteMessage(msg.id);
                                }
                              }}
                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded text-slate-400 hover:text-red-500"
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing simulation view */}
              {typingUser && (
                <div className="flex items-center gap-2 max-w-sm mr-auto items-start animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 dark:border-slate-800">
                    {typingUser.substring(0, 2)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-500">{typingUser}</span>
                    <div className="bg-slate-100 dark:bg-zinc-900 rounded-2xl rounded-tl-none px-3 py-1.5 text-[10px] text-slate-500 flex items-center gap-1.5 border border-slate-200/50 dark:border-zinc-800/50">
                      <span>Escribiendo mensaje</span>
                      <span className="flex space-x-0.5">
                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111115] shrink-0 z-10">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Enviar mensaje a #${currentChannel.name}...`}
                  className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                
                {/* Launch Poll modal button */}
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(true)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-600 dark:text-slate-400 transition"
                  title="Crear encuesta interactiva"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-zinc-850 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
            <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Canal no disponible</p>
            <p className="text-[10px] text-slate-400 max-w-xs mt-1 text-center">No hay canales en este proyecto. Utiliza el botón de agregar (+) para crear tu primer canal.</p>
          </div>
        )}
      </div>

      {/* 3. MODALS BLOCK */}
      
      {/* A. CREATE CHANNEL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                Crear Nuevo Canal
              </span>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Canal</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="ej. diseño-interfaces"
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-1 block">Los nombres se formatearán automáticamente en minúsculas y sin espacios.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="ej. Canal para revisiones rápidas, mockup feedback y diseño de componentes"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emoji Representativo</label>
                  <select
                    value={newChannelEmoji}
                    onChange={(e) => setNewChannelEmoji(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="💬">💬 Chat default</option>
                    <option value="📢">📢 Anuncios (general)</option>
                    <option value="🎨">🎨 Diseño UI/UX</option>
                    <option value="💻">💻 Programación</option>
                    <option value="🚀">🚀 Lanzamientos / Deploy</option>
                    <option value="🐛">🐛 Corrección de Bugs</option>
                    <option value="☕">☕ Coffee Break / Off-topic</option>
                    <option value="💡">💡 Ideas / Brainstorm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Privacidad del Canal</label>
                  <div className="flex items-center gap-3 mt-1 py-1 px-1">
                    <button
                      type="button"
                      onClick={() => setNewChannelIsPrivate(!newChannelIsPrivate)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newChannelIsPrivate ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${newChannelIsPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {newChannelIsPrivate ? 'Privado 🔒' : 'Público 🔓'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Crear Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. EDIT CHANNEL MODAL */}
      {isEditModalOpen && channelToEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" />
                Editar Canal #{channelToEdit.name}
              </span>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setChannelToEdit(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditChannel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Canal</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</label>
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Emoji Representativo</label>
                  <select
                    value={newChannelEmoji}
                    onChange={(e) => setNewChannelEmoji(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="💬">💬 Chat default</option>
                    <option value="📢">📢 Anuncios (general)</option>
                    <option value="🎨">🎨 Diseño UI/UX</option>
                    <option value="💻">💻 Programación</option>
                    <option value="🚀">🚀 Lanzamientos / Deploy</option>
                    <option value="🐛">🐛 Corrección de Bugs</option>
                    <option value="☕">☕ Coffee Break / Off-topic</option>
                    <option value="💡">💡 Ideas / Brainstorm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Privacidad</label>
                  <div className="flex items-center gap-3 mt-1 py-1 px-1">
                    <button
                      type="button"
                      onClick={() => setNewChannelIsPrivate(!newChannelIsPrivate)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newChannelIsPrivate ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${newChannelIsPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {newChannelIsPrivate ? 'Privado 🔒' : 'Público 🔓'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setChannelToEdit(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. CREATE POLL MODAL */}
      {isPollModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
                Lanzar Encuesta de Equipo
              </span>
              <button 
                onClick={() => setIsPollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pregunta / Título de Encuesta</label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="ej. ¿Cuándo programamos la demo técnica de la app?"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opciones de Respuesta</label>
                
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handlePollOptionChange(i, e.target.value)}
                      placeholder={`Opcional ${i + 1}`}
                      className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(i)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-rose-500 rounded"
                        title="Eliminar opción"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 py-1"
                >
                  <Plus className="w-3 h-3" />
                  Agregar Opción de Voto
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Publicar Encuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
