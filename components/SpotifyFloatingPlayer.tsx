import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Playlist } from '../types';
import { X } from 'lucide-react';

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
        className="pointer-events-auto relative bg-black rounded-2xl shadow-2xl overflow-hidden w-[300px] h-[352px] border border-white/10"
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-white/80 hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-md"
          title="Cerrar reproductor"
        >
          <X className="w-4 h-4" />
        </button>

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
      </motion.div>
    </div>
  );
};

export default SpotifyFloatingPlayer;
