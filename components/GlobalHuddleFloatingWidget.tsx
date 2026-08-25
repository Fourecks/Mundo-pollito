import React, { useState, useRef, useEffect } from 'react';
import { useHuddle } from '../src/context/HuddleContext';
import { 
  Mic, MicOff, Camera, CameraOff, Monitor, Maximize2, Minimize2, PhoneOff, 
  GripHorizontal, ChevronDown, ChevronUp, FolderKanban, Volume2, Sparkles
} from 'lucide-react';

interface GlobalHuddleFloatingWidgetProps {
  onOpenProjectsWorkspace?: (projectId: number, channelId?: string) => void;
}

const VideoStream: React.FC<{ stream: MediaStream | null; isMirrored?: boolean; muted?: boolean; objectContain?: boolean }> = ({ stream, isMirrored = true, muted = true, objectContain = false }) => {
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
      muted={muted}
      className={`w-full h-full ${objectContain ? 'object-contain bg-black' : 'object-cover'} rounded-xl ${isMirrored ? 'scale-x-[-1]' : ''}`}
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
    remoteStreams,
    userEmail,
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
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md text-white z-[100000] flex flex-col p-4 sm:p-6 select-none animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
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
                  {huddleParticipants.length} {huddleParticipants.length === 1 ? 'participante' : 'participantes'} en llamada • Conexión en vivo
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
                  title="Abrir espacio de trabajo del proyecto"
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
                <span>{huddleParticipants.length > 1 ? 'Salirse' : 'Colgar'}</span>
              </button>
            </div>
          </div>

          {/* Participants & Screen Share Main Viewport Area */}
          {(() => {
            const screenSharer = huddleParticipants.find((p) => p.has_screen);

            if (screenSharer) {
              const screenSharerStream =
                screenSharer.name === 'Tú' || (userEmail && screenSharer.email === userEmail)
                  ? screenStream
                  : remoteStreams[screenSharer.email] || screenSharer.stream || null;

              return (
                <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden p-2">
                  {/* MAIN SCREEN SHARE DISPLAY AREA */}
                  <div className="flex-1 bg-slate-950 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between shadow-2xl">
                    <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md text-xs font-bold text-white flex items-center gap-2 border border-white/10">
                      <Monitor className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span>Pantalla de {screenSharer.name}</span>
                    </div>

                    <div className="w-full h-full flex items-center justify-center relative bg-black">
                      {screenSharerStream ? (
                        <VideoStream stream={screenSharerStream} isMirrored={false} muted={screenSharer.name === 'Tú'} objectContain={true} />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                          <Monitor className="w-12 h-12 text-blue-400 animate-bounce" />
                          <p className="text-sm font-semibold">Cargando pantalla de {screenSharer.name}...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SIDEBAR PARTICIPANTS CAMERA TILES */}
                  <div className="w-full md:w-80 shrink-0 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto p-1">
                    {huddleParticipants.map((p, idx) => {
                      const isSpeaking = p.name === 'Tú' ? isLocalSpeaking : !!speakingParticipants[p.name];
                      return (
                        <div
                          key={p.email || idx}
                          className={`bg-slate-900/90 rounded-xl p-3 border relative overflow-hidden flex flex-col justify-between min-w-[200px] md:min-w-0 md:h-44 shrink-0 transition-all shadow-md ${
                            isSpeaking
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-white/10'
                          }`}
                        >
                          {/* Participant Top Info */}
                          <div className="flex items-center justify-between z-10 bg-black/60 p-1.5 rounded-lg text-xs absolute top-2 inset-x-2">
                            <span className="font-bold text-white truncate max-w-[110px]">{p.name}</span>
                            <div className="flex items-center gap-1">
                              {p.has_mic ? (
                                <Mic className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <MicOff className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                          </div>

                          {/* Video/Avatar */}
                          <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
                            {(p.name === 'Tú' || (userEmail && p.email === userEmail)) ? (
                              p.has_video && localStream ? (
                                <VideoStream stream={localStream} isMirrored={true} muted={true} />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-gray-200">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              )
                            ) : (
                              p.has_video && (remoteStreams[p.email] || p.stream) ? (
                                <VideoStream stream={remoteStreams[p.email] || p.stream || null} isMirrored={false} muted={false} />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-gray-200">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                              )
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
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-2">
                {huddleParticipants.map((p, idx) => {
                  const isSpeaking = p.name === 'Tú' ? isLocalSpeaking : !!speakingParticipants[p.name];
                  return (
                    <div
                      key={p.email || idx}
                      className={`bg-slate-900/90 rounded-2xl p-4 border relative overflow-hidden flex flex-col justify-between min-h-[240px] transition-all duration-300 shadow-xl ${
                        isSpeaking
                          ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/30'
                          : 'border-white/10'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 absolute inset-x-0 top-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-200">{p.name}</span>
                          {p.name === 'Tú' && (
                            <span className="text-[10px] bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Tú
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.has_mic ? (
                            <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                              <Mic className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-full bg-red-500/20 text-red-400">
                              <MicOff className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {p.has_screen && (
                            <span className="text-[10px] bg-blue-600/40 text-blue-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-blue-400/30">
                              <Monitor className="w-3 h-3" /> Pantalla
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Video / Avatar Canvas */}
                      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
                        {(p.name === 'Tú' || (userEmail && p.email === userEmail)) ? (
                          p.has_screen && screenStream ? (
                            <VideoStream stream={screenStream} isMirrored={false} muted={true} objectContain={true} />
                          ) : p.has_video && localStream ? (
                            <VideoStream stream={localStream} isMirrored={true} muted={true} />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                              <div
                                className={`w-24 h-24 rounded-full bg-slate-800 border-2 flex items-center justify-center text-3xl font-bold text-gray-200 transition-all duration-300 ${
                                  isSpeaking
                                    ? 'border-emerald-400 ring-8 ring-emerald-500/20 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                                    : 'border-slate-700'
                                }`}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-xs font-semibold text-gray-400 mt-4 flex items-center gap-1.5">
                                {isSpeaking ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    Hablando...
                                  </span>
                                ) : (
                                  <span>{p.has_mic ? 'Micrófono activo' : 'Silenciado'}</span>
                                )}
                              </p>
                            </div>
                          )
                        ) : (
                          (p.has_video || p.has_screen) && (remoteStreams[p.email] || p.stream) ? (
                            <VideoStream stream={remoteStreams[p.email] || p.stream || null} isMirrored={false} muted={false} />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                              <div
                                className={`w-24 h-24 rounded-full bg-slate-800 border-2 flex items-center justify-center text-3xl font-bold text-gray-200 transition-all duration-300 ${
                                  isSpeaking
                                    ? 'border-emerald-400 ring-8 ring-emerald-500/20 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                                    : 'border-slate-700'
                                }`}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-xs font-semibold text-gray-400 mt-4 flex items-center gap-1.5">
                                {isSpeaking ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    Hablando...
                                  </span>
                                ) : (
                                  <span>{p.has_mic ? 'Micrófono activo' : 'Silenciado'}</span>
                                )}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="mt-auto z-10 bg-gradient-to-t from-black/80 to-transparent p-3 absolute inset-x-0 bottom-0 flex items-center justify-between text-xs text-gray-300">
                        <span className="font-medium text-[11px]">{p.has_video ? '📹 Cámara ON' : '📷 Cámara OFF'}</span>
                        <span className="text-gray-400 text-[10px] truncate max-w-[140px]">{p.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Bottom Floating Control Bar */}
          <div className="border-t border-white/10 pt-4 mt-2 shrink-0 flex items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 max-w-xl mx-auto w-full shadow-2xl">
            <button
              onClick={toggleMic}
              className={`p-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                isMicOn
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
              }`}
              title={isMicOn ? 'Silenciar Micrófono' : 'Activar Micrófono'}
            >
              {isMicOn ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5" />}
              <span className="text-xs hidden sm:inline">{isMicOn ? 'Silenciar' : 'Activar Mic'}</span>
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                isVideoOn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border border-white/10'
              }`}
              title={isVideoOn ? 'Apagar Cámara' : 'Encender Cámara'}
            >
              {isVideoOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              <span className="text-xs hidden sm:inline">{isVideoOn ? 'Apagar Video' : 'Encender Video'}</span>
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                isScreenSharing
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border border-white/10'
              }`}
              title={isScreenSharing ? 'Detener Compartir' : 'Compartir Pantalla'}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs hidden sm:inline">{isScreenSharing ? 'Detener Pantalla' : 'Compartir'}</span>
            </button>

            <button
              onClick={leaveHuddle}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-red-900/40"
              title="Finalizar y Salir de la llamada"
            >
              <PhoneOff className="w-5 h-5" />
              <span>Colgar</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT FLOATING PICTURE-IN-PICTURE SQUARE WIDGET */}
      {/* Appears over all other windows and sections */}
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
            /* MINIMIZED PILL VIEW */
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

              {/* Quick mic control */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMic();
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  isMicOn ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
                title={isMicOn ? 'Silenciar' : 'Activar Micrófono'}
              >
                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>

              {/* Quick video control */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVideo();
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  isVideoOn ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
                title={isVideoOn ? 'Apagar Cámara' : 'Encender Cámara'}
              >
                {isVideoOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
              </button>

              {/* Expand to square */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandWidget();
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Expandir Cuadrado de Video"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {/* Leave Call */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  leaveHuddle();
                }}
                className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors ml-1"
                title="Colgar llamada"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* EXPANDED FLOATING SQUARE WIDGET (EL CUADRADO DE LLAMADA CON CÁMARA Y CONTROLES) */
            <div className="w-[280px] sm:w-[320px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header Bar */}
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
                      title="Abrir Espacio de Proyectos"
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

              {/* CAMERA / VIDEO SQUARE VIEWPORT (EL CUADRADO DE VIDEO QUE MUESTRA A QUIEN HABLA) */}
              <div className="relative aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center p-2">
                {currentSpeaker.hasVideo && currentSpeaker.stream ? (
                  <div className="w-full h-full relative rounded-xl overflow-hidden">
                    <VideoStream stream={currentSpeaker.stream} isMirrored={!isScreenSharing} />
                    {/* Live label overlay */}
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {currentSpeaker.name} {isScreenSharing ? '(Pantalla)' : ''}
                    </div>
                  </div>
                ) : (
                  /* Avatar & Reactive Audio Speaking Wave */
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 flex flex-col items-center justify-center relative p-4">
                    {/* Pulsing Audio Ring */}
                    <div
                      className={`w-20 h-20 rounded-full bg-slate-800 border-2 flex items-center justify-center text-2xl font-bold text-gray-100 transition-all duration-150 ${
                        isLocalSpeaking
                          ? 'border-emerald-400 ring-8 ring-emerald-500/25 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                          : 'border-slate-700'
                      }`}
                    >
                      {currentSpeaker.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="mt-3 text-center">
                      <p className="text-xs font-bold text-gray-200">{currentSpeaker.name}</p>
                      <p className="text-[10px] mt-0.5">
                        {isLocalSpeaking ? (
                          <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                            <Volume2 className="w-3 h-3 animate-pulse" /> Hablando...
                          </span>
                        ) : isMicOn ? (
                          <span className="text-gray-400">Micrófono listo</span>
                        ) : (
                          <span className="text-red-400 font-semibold">Silenciado</span>
                        )}
                      </p>
                    </div>

                    {/* Audio visualizer bar */}
                    {isMicOn && (
                      <div className="absolute bottom-2.5 flex items-center gap-1 h-3 px-3 py-0.5 rounded-full bg-black/40">
                        {[20, 40, 60, 80].map((threshold, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full transition-all duration-100 ${
                              localVolume >= threshold
                                ? 'bg-emerald-400 h-3'
                                : 'bg-slate-700 h-1.5'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* QUICK CONTROLS BAR (CONTROLES RÁPIDOS: MIC, CÁMARA, PANTALLA, COLGAR) */}
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-1.5">
                {/* 1. Mic Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMic();
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isMicOn
                      ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
                      : 'bg-red-600/90 hover:bg-red-600 text-white shadow-sm'
                  }`}
                  title={isMicOn ? 'Silenciar Micrófono' : 'Activar Micrófono'}
                >
                  {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{isMicOn ? 'Mic' : 'Mutado'}</span>
                </button>

                {/* 2. Video Camera Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideo();
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isVideoOn
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700'
                  }`}
                  title={isVideoOn ? 'Apagar Cámara' : 'Encender Cámara'}
                >
                  {isVideoOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{isVideoOn ? 'Cam ON' : 'Cam'}</span>
                </button>

                {/* 3. Screen Share Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleScreenShare();
                  }}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                    isScreenSharing
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-gray-400 border border-slate-700'
                  }`}
                  title={isScreenSharing ? 'Detener Compartir Pantalla' : 'Compartir Pantalla'}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>

                {/* 4. Hang Up Button (Colgar) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    leaveHuddle();
                  }}
                  className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-md shadow-red-950/40"
                  title="Finalizar y Salir de la llamada"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{huddleParticipants.length > 1 ? 'Salirse' : 'Colgar'}</span>
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </>
  );
};
