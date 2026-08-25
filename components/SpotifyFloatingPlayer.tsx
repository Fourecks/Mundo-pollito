import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Playlist } from '../types';
import { X, Music } from 'lucide-react';

interface SpotifyFloatingPlayerProps {
  track: Playlist;
  onClose: () => void;
}

const SpotifyFloatingPlayer: React.FC<SpotifyFloatingPlayerProps> = ({ track, onClose }) => {
  const [spotifySessionConfirmed, setSpotifySessionConfirmed] = useState<boolean>(() => {
    return localStorage.getItem('spotify_session_active') === 'true';
  });
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
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="pointer-events-auto relative bg-black rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden w-[340px] h-[420px] border border-white/10"
      >
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-full">
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
            onClick={onClose}
            className="p-1 rounded-full hover:bg-red-500 text-white/80 hover:text-white transition-all cursor-pointer shadow-md"
            title="Cerrar reproductor"
          >
            <X className="w-4 h-4" />
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
