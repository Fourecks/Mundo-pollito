import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Playlist } from '../types';
import { ChevronUp, ChevronDown, Music, X } from 'lucide-react';

interface SpotifyFloatingPlayerProps {
  track: Playlist;
  onClose: () => void;
}

const SpotifyFloatingPlayer: React.FC<SpotifyFloatingPlayerProps> = ({ track, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const spotifyId = track.source_id || track.id;
  const embedUrl = `https://open.spotify.com/embed/${track.type}/${spotifyId}?utm_source=generator`;

  return (
    <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto relative group/player flex flex-col items-end"
      >
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ height: 100, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden w-[320px]"
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
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Escuchando</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setIsCollapsed(true)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Minimizar"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
          ) : (
            <motion.div
              key="collapsed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-end"
            >
              {/* Hover card that pops up */}
              <div className="hidden group-hover/player:block absolute bottom-full right-0 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
                  <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-2xl p-4 w-[280px]">
                      <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={track.thumbnail_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'} 
                              alt="" 
                              className="w-14 h-14 rounded-2xl shadow-lg object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                <Music className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-grow overflow-hidden">
                              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate mb-1">{track.name}</h4>
                              <div className="flex items-center gap-2">
                                  <div className="flex gap-0.5">
                                      {[1, 2, 3].map(i => (
                                          <motion.div 
                                            key={i}
                                            animate={{ height: [4, 12, 4] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                            className="w-0.5 bg-emerald-500 rounded-full"
                                          />
                                      ))}
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">En curso</span>
                              </div>
                          </div>
                          <button 
                              onClick={(e) => { e.stopPropagation(); setIsCollapsed(false); }}
                              className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 pointer-events-auto cursor-pointer"
                          >
                              <ChevronUp className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
              </div>

              {/* Small static pill */}
              <button
                onClick={() => setIsCollapsed(false)}
                className="flex items-center gap-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-2.5 pl-2.5 pr-5 rounded-[22px] shadow-xl hover:shadow-2xl transition-all hover:border-emerald-500/50 group active:scale-95 cursor-pointer pointer-events-auto"
              >
                <div className="w-11 h-11 rounded-2xl overflow-hidden relative shadow-md">
                  <img 
                    src={track.thumbnail_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <ChevronUp className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1.5 opacity-80">Música</p>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[140px] leading-none">
                    {track.name}
                  </p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SpotifyFloatingPlayer;
