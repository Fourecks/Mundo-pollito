import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Playlist } from '../types';
import { X, Music, ChevronUp, Minus } from 'lucide-react';

interface SpotifyFloatingPlayerProps {
  track: Playlist;
  onClose: () => void;
}

const SpotifyFloatingPlayer: React.FC<SpotifyFloatingPlayerProps> = ({ track, onClose }) => {
  const [spotifySessionConfirmed, setSpotifySessionConfirmed] = useState<boolean>(() => {
    return localStorage.getItem('spotify_session_active') === 'true';
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const spotifyId = track.source_id || track.id;
  const embedUrl = `https://open.spotify.com/embed/${track.type || 'playlist'}/${spotifyId}?utm_source=generator`;

  if (!spotifySessionConfirmed) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="pointer-events-auto bg-[#121212] border border-white/15 text-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-[340px] relative"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1DB954]">Spotify</span>
              <h4 className="text-sm font-bold text-white">Inicia sesión en Spotify</h4>
            </div>
          </div>

          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            Para escuchar canciones completas y tus listas guardadas sin restricciones, inicia sesión con tu cuenta de Spotify.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => window.open('https://accounts.spotify.com/login', '_blank')}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-2.5 px-4 rounded-full text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg"
            >
              <span>Iniciar sesión en Spotify</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            <button
              onClick={() => {
                localStorage.setItem('spotify_session_active', 'true');
                setSpotifySessionConfirmed(true);
              }}
              className="w-full bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-white/20 py-2 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
              Ya inicié sesión / Reproducir
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
      {/* Minimized Pill Bar */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="pointer-events-auto bg-[#121212] border border-[#1DB954]/40 text-white px-4 py-3 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.6)] flex items-center gap-3 w-[280px]"
          >
            <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center text-[#1DB954] flex-shrink-0 animate-pulse">
              <Music className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1DB954] block leading-none">Reproduciendo</span>
              <p className="text-xs font-medium text-white truncate">{track.name}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setIsMinimized(false)}
                className="px-3 py-1 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full text-xs transition-transform active:scale-95 cursor-pointer shadow-md flex items-center gap-1"
              >
                <span>Abrir</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player Modal */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: isMinimized ? 0 : 1, y: isMinimized ? 20 : 0, scale: isMinimized ? 0.95 : 1, pointerEvents: isMinimized ? 'none' : 'auto' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ display: isMinimized ? 'none' : 'block' }}
        className="pointer-events-auto relative bg-black rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden w-[340px] h-[420px] border border-white/10"
      >
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1 rounded-full shadow-lg">
          <button
            onClick={() => {
              localStorage.removeItem('spotify_session_active');
              setSpotifySessionConfirmed(false);
            }}
            className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] font-medium transition-colors cursor-pointer"
            title="Cambiar de cuenta o iniciar sesión"
          >
            Cuenta
          </button>
          
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer flex items-center justify-center w-6 h-6"
            title="Ocultar reproductor"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-red-500 text-white/80 hover:text-white transition-all cursor-pointer shadow-md flex items-center justify-center w-6 h-6"
            title="Cerrar reproductor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <iframe
          ref={iframeRef}
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Player"
          className="w-full h-full"
        />
      </motion.div>
    </div>
  );
};

export default SpotifyFloatingPlayer;
