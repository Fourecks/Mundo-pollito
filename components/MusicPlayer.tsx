import React, { useState, useEffect, useRef } from 'react';
import { Playlist } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import StarIcon from './icons/StarIcon';
import MusicIcon from './icons/MusicIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import { ensureYoutubeApiReady } from '../utils/youtubeApi';

interface MusicPlayerProps {
  onSelectTrack: (track: Playlist, queue: Playlist[]) => void;
  playlists: Playlist[];
  onAddPlaylist: (playlist: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onUpdatePlaylist: (playlist: Playlist) => Promise<void>;
  onDeletePlaylist: (id: number) => Promise<void>;
  onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
  onSelectTrack, 
  playlists, 
  onAddPlaylist,
  onUpdatePlaylist,
  onDeletePlaylist,
  onClose
}) => {
  const [view, setView] = useState<'all' | 'favorites'>('all');
  const [platform, setPlatform] = useState<'youtube' | 'spotify'>('youtube');
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  
  // Effect to create and destroy the YouTube background player for the header
  useEffect(() => {
    const videoId = '5qap5aO4i9A'; // Changed from a livestream to a loopable video.
    
    const createPlayer = () => {
      // Ensure the target element exists before creating the player
      if (document.getElementById('music-header-video-container')) {
        playerRef.current = new window.YT.Player('music-header-video-container', {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            loop: 1,
            mute: 1,
            playlist: videoId, // Required for loop to work on single video
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              const playerElement = e.target.getIframe();
              if (playerElement) {
                playerElement.style.position = 'absolute';
                playerElement.style.top = '50%';
                playerElement.style.left = '50%';
                playerElement.style.minWidth = '100%';
                playerElement.style.minHeight = '100%';
                playerElement.style.transform = 'translate(-50%, -50%)';
                playerElement.style.pointerEvents = 'none';
                playerElement.style.opacity = '0.8';
              }
              e.target.playVideo();
            }
          }
        });
      }
    };
  
    ensureYoutubeApiReady().then(() => {
        createPlayer();
    });
  
    // Cleanup function to destroy the player when the component unmounts
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parseYouTubeUrl = (url: string): { videoId: string | null; playlistId: string | null } => {
    if (!url) return { videoId: null, playlistId: null };
    const videoIdMatch = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
    const playlistIdMatch = url.match(/[?&]list=([^#&?]*)/);
    return {
      videoId: (videoIdMatch && videoIdMatch[1].length === 11) ? videoIdMatch[1] : null,
      playlistId: playlistIdMatch ? playlistIdMatch[1] : null,
    };
  };

  const parseSpotifyUrl = (url: string): { type: 'track' | 'album' | 'playlist' | null; id: string | null } => {
    const spotifyUrlRegex = /https:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(spotifyUrlRegex);
    if (match && (match[1] === 'track' || match[1] === 'album' || match[1] === 'playlist')) {
        return { type: match[1], id: match[2] };
    }
    return { type: null, id: null };
  };

  const handleOpenAddForm = () => {
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewPlaylistName('');
    setNewPlaylistUrl('');
    setFormError(null);
  };
  
  const handleSavePlaylist = async () => {
    setFormError(null);
    if (!newPlaylistUrl.trim()) {
      setFormError("Por favor, introduce un enlace.");
      return;
    }
    
    setIsSaving(true);
    let newEntry: Omit<Playlist, 'id' | 'user_id' | 'created_at'> | null = null;
    let thumbnailUrl: string | undefined = undefined;
    let fetchedTitle: string | undefined = undefined;

    try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(newPlaylistUrl)}`);
        if (response.ok) {
            const microlinkData = await response.json();
            if (microlinkData.status === 'success') {
                thumbnailUrl = microlinkData.data.image?.url;
                fetchedTitle = microlinkData.data.title;
            } else {
                console.warn(`Microlink API returned error for ${newPlaylistUrl}`, microlinkData);
            }
        } else {
            console.warn(`Could not fetch metadata from Microlink for ${newPlaylistUrl}`);
        }
    } catch (e) {
        console.error("Error fetching metadata from Microlink", e);
    }
    
    const finalName = newPlaylistName.trim() || fetchedTitle;
    if (!finalName) {
         setFormError("No se pudo obtener el nombre. Por favor, añádelo manualmente.");
         setIsSaving(false);
         return;
    }

    try {
        if (platform === 'youtube') {
            const { videoId, playlistId } = parseYouTubeUrl(newPlaylistUrl);
            if (!videoId && !playlistId) {
                setFormError("Enlace de YouTube no válido.");
                setIsSaving(false); return;
            }
            if (videoId && !thumbnailUrl) thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            newEntry = {
                source_id: playlistId || videoId!, name: finalName, is_favorite: false,
                type: playlistId ? 'playlist' : 'video', platform: 'youtube', thumbnail_url: thumbnailUrl
            };
        } else if (platform === 'spotify') {
            const { type, id } = parseSpotifyUrl(newPlaylistUrl);
            if (!type || !id) {
                setFormError("Enlace de Spotify no válido (track, album, o playlist).");
                setIsSaving(false); return;
            }
            newEntry = {
                source_id: id, name: finalName, is_favorite: false, type,
                platform: 'spotify', thumbnail_url: thumbnailUrl
            };
        }

        if (newEntry) {
            await onAddPlaylist(newEntry);
            handleCancelAdd();
        }
    } catch (error) {
        console.error("Failed to save playlist", error);
        setFormError("Ocurrió un error al guardar.");
    } finally {
        setIsSaving(false);
    }
  };


  const handleToggleFavorite = (playlist: Playlist) => {
    onUpdatePlaylist({ ...playlist, is_favorite: !playlist.is_favorite });
    setMenuOpenFor(null);
  };
  
  const handleDeleteClick = (playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setMenuOpenFor(null);
  };
  
  const handleConfirmDelete = async () => {
    if (playlistToDelete) {
      await onDeletePlaylist(playlistToDelete.id);
      setPlaylistToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setPlaylistToDelete(null);
  };
  
  const filteredPlaylists = (view === 'favorites' ? playlists.filter(p => p.is_favorite) : playlists)
    .filter(p => p.platform === platform);


  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-3xl overflow-hidden flex flex-col sm:flex-row h-full">
      <aside className="flex sm:flex-col items-center p-2 sm:p-4 bg-black/5 dark:bg-black/20 flex-shrink-0">
        <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-4">
          <button onClick={() => setView('all')} className={`p-3 rounded-full transition-colors ${view === 'all' ? 'bg-primary text-white' : 'hover:bg-primary-light/50 dark:hover:bg-primary/20 text-gray-600 dark:text-gray-300'}`}>
            <MusicIcon />
          </button>
          <button onClick={() => setView('favorites')} className={`p-3 rounded-full transition-colors ${view === 'favorites' ? 'bg-primary text-white' : 'hover:bg-primary-light/50 dark:hover:bg-primary/20 text-gray-600 dark:text-gray-300'}`}>
            <StarIcon filled={view === 'favorites'} />
          </button>
        </div>
      </aside>

      <main className="flex flex-col flex-grow min-w-0 relative h-full">
        <header className="relative h-28 sm:h-36 w-full flex-shrink-0 overflow-hidden drag-handle cursor-move">
          <div id="music-header-video-container" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-white/40 dark:via-gray-900/40 to-transparent flex flex-col justify-end p-4 md:p-6">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold truncate text-primary-dark dark:text-primary drop-shadow-sm">Musica para Pollos</h1>
            <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm sm:text-base">by Pollito</p>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <button
              onClick={handleOpenAddForm}
              className="bg-primary text-white p-2 rounded-full backdrop-blur-sm shadow-md hover:bg-primary-dark transition-colors"
              aria-label="Agregar música"
            >
              <PlusIcon />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm transition-colors cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <div className="bg-black/10 dark:bg-black/20 backdrop-blur-sm rounded-full p-1 flex items-center gap-1">
                 <button onClick={() => setPlatform('youtube')} className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${platform === 'youtube' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-primary' : 'text-white/80 dark:text-gray-200/80 hover:bg-white/20 dark:hover:bg-white/10'}`}>YouTube</button>
                 <button onClick={() => setPlatform('spotify')} className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-colors ${platform === 'spotify' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-primary' : 'text-white/80 dark:text-gray-200/80 hover:bg-white/20 dark:hover:bg-white/10'}`}>Spotify</button>
            </div>
        </div>
        </header>
        
        <section className="flex-grow p-3 md:p-6 overflow-y-auto custom-scrollbar">
          {filteredPlaylists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filteredPlaylists.map(playlist => (
                <div key={playlist.id} className="group">
                  <button onClick={() => onSelectTrack(playlist, filteredPlaylists)} className="text-left w-full transform hover:-translate-y-1 transition-transform duration-200">
                    <div className="rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-200 aspect-square bg-primary-light">
                      {playlist.thumbnail_url ? (
                         <img src={playlist.thumbnail_url} alt={playlist.name} className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-white p-4">
                            <MusicIcon />
                         </div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-start justify-between mt-2">
                     <div className="flex-grow min-w-0">
                        <h3 className="font-bold truncate text-sm sm:text-base">{playlist.name}</h3>
                        {playlist.is_favorite && <p className="text-xs text-secondary-dark font-semibold">Favorito</p>}
                     </div>
                     <div className="relative flex-shrink-0">
                        <button onClick={() => setMenuOpenFor(playlist.id)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                            <DotsVerticalIcon />
                        </button>
                        {menuOpenFor === playlist.id && (
                             <div ref={menuRef} className="absolute right-0 mt-1 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-xl z-10 animate-pop-in origin-top-right">
                                <button onClick={() => handleToggleFavorite(playlist)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-secondary-lighter dark:hover:bg-gray-700 flex items-center gap-2">
                                    <StarIcon filled={!!playlist.is_favorite} className="h-4 w-4" /> {playlist.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                </button>
                                <button onClick={() => handleDeleteClick(playlist)} className="w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 flex items-center gap-2">
                                    <TrashIcon className="h-4 w-4" /> Eliminar
                                </button>
                            </div>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 pt-10">
                <p className="font-medium">{view === 'favorites' ? `No tienes favoritos de ${platform}.` : 'No hay nada aquí.'}</p>
                <p className="text-sm">¡Agrega música para empezar!</p>
            </div>
          )}
        </section>

        {showAddForm && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center p-6 animate-pop-in">
                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl p-6 w-full max-w-sm">
                    <h3 className="font-bold text-lg text-primary-dark dark:text-primary mb-4 text-center">Agregar a {platform}</h3>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            value={newPlaylistName} 
                            onChange={e => { setNewPlaylistName(e.target.value); setFormError(null); }} 
                            placeholder="Nombre (opcional)"
                            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300" 
                        />
                        <input 
                            type="text" 
                            value={newPlaylistUrl} 
                            onChange={e => { setNewPlaylistUrl(e.target.value); setFormError(null); }} 
                            placeholder={`Enlace de ${platform}`}
                            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300" 
                        />
                    </div>
                    {formError && <p className="text-red-500 text-sm text-center mt-3">{formError}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button 
                            onClick={handleCancelAdd} 
                            className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSavePlaylist}
                            disabled={isSaving}
                            className="bg-primary text-white font-bold rounded-full px-4 py-2 shadow-md hover:bg-primary-dark transition-colors duration-200 disabled:bg-primary-light disabled:cursor-wait"
                        >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        <ConfirmationModal
          isOpen={!!playlistToDelete}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Eliminar de la Librería"
          message={`¿Seguro que quieres eliminar "${playlistToDelete?.name}"? Esta acción es permanente.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </main>
    </div>
  );
};

export default MusicPlayer;
