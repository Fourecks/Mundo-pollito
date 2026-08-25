import React, { useState } from 'react';
import ModalWindow from './ModalWindow';
import { Playlist } from '../types';
import { Music, Minimize2, ChevronUp } from 'lucide-react';

interface SpotifyPlayerModalProps {
  track: Playlist;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
  windowState?: any;
  onStateChange?: (state: any) => void;
}

export const SpotifyPlayerModal: React.FC<SpotifyPlayerModalProps> = ({
  track,
  onClose,
  zIndex,
  onFocus,
  windowState,
  onStateChange
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const spotifyId = track.source_id || track.id;
  const embedUrl = `https://open.spotify.com/embed/${track.type || 'playlist'}/${spotifyId}?utm_source=generator`;

  return (
    <>
      {/* Minimized floating button */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-pop-in">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 p-2.5 pr-4 rounded-full shadow-2xl hover:scale-105 transition-all group cursor-pointer"
            title="Restaurar reproductor de Spotify"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Spotify</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                {track.name}
              </p>
            </div>
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>
      )}

      {/* Main Modal Window (hidden when minimized so iframe stays mounted and audio continues playing!) */}
      <div className={isMinimized ? 'hidden' : 'contents'}>
        <ModalWindow
          isOpen={true}
          onClose={onClose}
          title={`Spotify: ${track.name}`}
          isDraggable
          isResizable
          zIndex={zIndex}
          onFocus={onFocus}
          className="w-[380px] h-[450px]"
          windowState={windowState}
          onStateChange={onStateChange}
          allowFullscreen
        >
          <div className="relative w-full h-full flex flex-col bg-black">
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimizar (sigue reproduciendo en segundo plano)"
                aria-label="Minimizar reproductor"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Embed Player"
              className="flex-grow w-full h-full"
            />
          </div>
        </ModalWindow>
      </div>
    </>
  );
};

export default SpotifyPlayerModal;
