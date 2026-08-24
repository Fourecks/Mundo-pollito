import React, { useState, useRef, useEffect } from 'react';
import { useHuddle } from '../src/context/HuddleContext';
import { 
  Mic, MicOff, Camera, CameraOff, Monitor, Maximize2, Minimize2, PhoneOff, 
  GripHorizontal, ChevronDown, ChevronUp, FolderKanban, Volume2, Sparkles
} from 'lucide-react';

interface GlobalHuddleFloatingWidgetProps {
  onOpenProjectsWorkspace?: (projectId: number, channelId?: string) => void;
}

const VideoStream: React.FC<{ stream: MediaStream | null; isMirrored?: boolean }> = ({ stream, isMirrored = true }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.warn('Error playing video stream:', err));
    }
  }, [stream]);

  if (!stream) return null;
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover rounded-xl ${isMirrored ? 'scale-x-[-1]' : ''}`}
    />
  );
};

export const GlobalHuddleFloatingWidget: React.FC<GlobalHuddleFloatingWidgetProps> = ({ onOpenProjectsWorkspace }) => {
  const {
    activeHuddle,
    isHuddleActive,
    isMicOn,
    isVideoOn,
    isScreenSharing,
    localStream,
    screenStream,
    localVolume,
    speakingParticipants,
    huddleParticipants,
    isHuddleFullScreen,
    isFloatingMinimized,
    leaveHuddle,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    setIsHuddleFullScreen,
    setIsFloatingMinimized,
    currentSpeaker,
  } = useHuddle();

  // Draggable state for floating desktop widget
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isLocalSpeaking = isMicOn && localVolume > 10;

  // Handle Dragging (Mouse & Touch)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPos.current = { ...position };
    }
  };

  const handleExpandWidget = () => {
    setIsFloatingMinimized(false);
    if (typeof window !== 'undefined') {
      const expandedHeight = 380;
      const expandedWidth = 320;
      setPosition((prev) => {
        const maxY = Math.max(10, window.innerHeight - expandedHeight - 16);
        const maxX = Math.max(10, window.innerWidth - expandedWidth - 16);
        return {
          x: Math.max(10, Math.min(prev.x, maxX)),
          y: Math.max(10, Math.min(prev.y, maxY)),
        };
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      const widgetHeight = isFloatingMinimized ? 52 : 380;
      const widgetWidth = isFloatingMinimized ? 220 : 320;
      const maxX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - widgetWidth - 10) : 800;
      const maxY = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - widgetHeight - 10) : 600;

      setPosition({
        x: Math.max(10, Math.min(maxX, initialPos.current.x + dx)),
        y: Math.max(10, Math.min(maxY, initialPos.current.y + dy)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartPos.current.x;
      const dy = e.touches[0].clientY - dragStartPos.current.y;

      const widgetHeight = isFloatingMinimized ? 52 : 380;
      const widgetWidth = isFloatingMinimized ? 220 : 320;
      const maxX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - widgetWidth - 10) : 800;
      const maxY = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - widgetHeight - 10) : 600;

      setPosition({
        x: Math.max(10, Math.min(maxX, initialPos.current.x + dx)),
        y: Math.max(10, Math.min(maxY, initialPos.current.y + dy)),
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, isFloatingMinimized]);

  if (!isHuddleActive || !activeHuddle) return null;

  return (
    <>
      {/* 1. IMMERSIVE FULLSCREEN HUDDLE MODAL */}
      {isHuddleFullScreen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md text-white z-[100000] flex flex-col p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-wide text-white flex items-center gap-2">
                  <span>{activeHuddle.projectEmoji || '💼'}</span>
                  <span>{activeHuddle.projectName}</span>
                  <span className="text-gray-400 font-normal">#{activeHuddle.channelName}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Conexión en vivo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenProjectsWorkspace && (
                <button
                  onClick={() => {
                    setIsHuddleFullScreen(false);
                    onOpenProjectsWorkspace(activeHuddle.projectId, activeHuddle.channelId);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-gray-200 rounded-lg flex items-center gap-1.5 transition-colors border border-white/10"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Ver Proyecto</span>
                </button>
              )}
              <button
                onClick={() => setIsHuddleFullScreen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimizar a Flotante</span>
              </button>
              <button
                onClick={leaveHuddle}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-bold rounded-lg text-white transition-colors shadow-lg shadow-red-900/30 flex items-center gap-1.5"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Colgar</span>
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl relative bg-black border border-white/10">
            <iframe
              src={`https://meet.jit.si/pollito-huddle-${activeHuddle.projectId}-${activeHuddle.channelId}#userInfo.displayName="${encodeURIComponent('Miembro del Equipo')}"`}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}

      {/* 2. PERSISTENT FLOATING PICTURE-IN-PICTURE SQUARE WIDGET */}
      {!isHuddleFullScreen && (
        <div
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          }}
          className={`fixed top-0 left-0 z-[99999] select-none transition-shadow duration-200 ${
            isDragging ? 'cursor-grabbing scale-[1.02]' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {isFloatingMinimized ? (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-full shadow-2xl px-4 py-2 flex items-center gap-3 text-white">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold truncate max-w-[120px]">
                  #{activeHuddle.channelName}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandWidget();
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Expandir"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  leaveHuddle();
                }}
                className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors ml-1"
                title="Colgar"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
              
              {/* Hidden iframe to keep call active */}
              <div className="hidden">
                 <iframe
                  src={`https://meet.jit.si/pollito-huddle-${activeHuddle.projectId}-${activeHuddle.channelId}#userInfo.displayName="${encodeURIComponent('Miembro del Equipo')}"`}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write"
                 />
              </div>
            </div>
          ) : (
            <div className="w-[280px] sm:w-[320px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-2 ring-emerald-500/30" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                      <span>{activeHuddle.projectEmoji || '🎙️'}</span>
                      <span className="truncate">#{activeHuddle.channelName}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {activeHuddle.projectName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onOpenProjectsWorkspace && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProjectsWorkspace(activeHuddle.projectId, activeHuddle.channelId);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Abrir Proyecto"
                    >
                      <FolderKanban className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHuddleFullScreen(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Pantalla Completa"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFloatingMinimized(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Minimizar a pastilla"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative aspect-[4/3] w-full bg-black overflow-hidden flex items-center justify-center pointer-events-auto">
                {/* Jitsi Floating Player */}
                <iframe
                  src={`https://meet.jit.si/pollito-huddle-${activeHuddle.projectId}-${activeHuddle.channelId}#userInfo.displayName="${encodeURIComponent('Miembro del Equipo')}"`}
                  allow="camera; microphone; display-capture; autoplay; clipboard-write"
                  className="w-full h-full border-none"
                />
              </div>

              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    leaveHuddle();
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-red-950/40"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Finalizar y Salir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
