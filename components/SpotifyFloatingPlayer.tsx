import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Playlist } from '../types';
import { Music, X } from 'lucide-react';

interface SpotifyFloatingPlayerProps {
  track: Playlist;
  onClose: () => void;
}

const SpotifyFloatingPlayer: React.FC<SpotifyFloatingPlayerProps> = ({ track, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const spotifyId = track.source_id || track.id;
  const embedUrl = `https://open.spotify.com/embed/${track.type || 'playlist'}/${spotifyId}?utm_source=generator`;

  return (
    <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden w-[320px]"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-none mb-1">
                {track.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [3, 8, 3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      className="w-0.5 bg-emerald-500/60 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Reproduciendo</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Cerrar reproductor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-0 bg-black aspect-[3/3.5] min-h-[300px]">
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
          />
        </div>
      </motion.div>
    </div>
  );
};

export default SpotifyFloatingPlayer;
