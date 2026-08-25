import React, { useState, useEffect, useRef, useContext } from 'react';
import { Playlist } from '../types';
import { ModalWindowContext } from './ModalWindow';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import StarIcon from './icons/StarIcon';
import MusicIcon from './icons/MusicIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';

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
  const { startInteraction } = useContext(ModalWindowContext);
  const [view, setView] = useState<'all' | 'favorites'>('all');
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parseSpotifyUrl = (url: string): { type: 'track' | 'album' | 'playlist' | null; id: string | null } => {
    if (!url) return { type: null, id: null };
    const uriMatch = url.match(/spotify:(track|album|playlist):([a-zA-Z0-9]+)/i);
    if (uriMatch) {
      return { type: uriMatch[1].toLowerCase() as 'track' | 'album' | 'playlist', id: uriMatch[2] };
    }
    const webMatch = url.match(/(?:open\.spotify\.com(?:\/intl-[a-z]+)?(?:\/embed)?)\/(track|album|playlist)\/([a-zA-Z0-9]+)/i);
    if (webMatch) {
      return { type: webMatch[1].toLowerCase() as 'track' | 'album' | 'playlist', id: webMatch[2] };
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
      setFormError("Por favor, introduce un enlace de Spotify.");
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

    const { type, id } = parseSpotifyUrl(newPlaylistUrl);
    if (!type || !id) {
        setFormError("Enlace de Spotify no válido (track, album, o playlist).");
        setIsSaving(false);
        return;
    }
    
    const finalName = newPlaylistName.trim() || fetchedTitle || `Spotify ${type}`;

    try {
        newEntry = {
            source_id: id,
            name: finalName,
            is_favorite: false,
            type,
            platform: 'spotify',
            thumbnail_url: thumbnailUrl
        };

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
  
  const spotifyPlaylists = playlists.filter(p => p.platform === 'spotify');
  const filteredPlaylists = view === 'favorites' 
    ? spotifyPlaylists.filter(p => p.is_favorite) 
    : spotifyPlaylists;

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-3xl overflow-hidden flex flex-col sm:flex-row h-full">
      <aside className="flex sm:flex-col items-center p-2 sm:p-4 bg-black/5 dark:bg-black/20 flex-shrink-0">
        <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-4">
          <button onClick={() => setView('all')} className={`p-3 rounded-full transition-colors ${view === 'all' ? 'bg-[#1DB954] text-black font-bold' : 'hover:bg-primary-light/50 dark:hover:bg-primary/20 text-gray-600 dark:text-gray-300'}`} title="Todas las listas">
            <MusicIcon />
          </button>
          <button onClick={() => setView('favorites')} className={`p-3 rounded-full transition-colors ${view === 'favorites' ? 'bg-[#1DB954] text-black font-bold' : 'hover:bg-primary-light/50 dark:hover:bg-primary/20 text-gray-600 dark:text-gray-300'}`} title="Favoritos">
            <StarIcon filled={view === 'favorites'} />
          </button>
        </div>
      </aside>

      <main className="flex flex-col flex-grow min-w-0 relative h-full">
        <header 
          className="relative h-40 sm:h-48 w-full flex-shrink-0 overflow-hidden drag-handle cursor-move bg-gradient-to-r from-emerald-950 via-green-900 to-gray-900"
          onMouseDown={(e) => startInteraction?.(e, 'drag')}
          onTouchStart={(e) => startInteraction?.(e, 'drag')}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-black/20 to-black/40 flex flex-col justify-end p-4 md:p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.36-.18-.6.36-1.02.96-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
              </svg>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#1DB954]">Spotify</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold truncate text-white drop-shadow-sm">Música</h1>
            <p className="text-gray-300 dark:text-gray-400 font-semibold text-xs sm:text-sm">Música y Playlists de Spotify</p>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <button
              onClick={handleOpenAddForm}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black p-2 rounded-full backdrop-blur-sm shadow-md transition-colors font-bold"
              aria-label="Agregar música"
              title="Agregar música de Spotify"
            >
              <PlusIcon />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors cursor-pointer"
              aria-label="Cerrar ventana"
            >
              <CloseIcon />
            </button>
          </div>
        </header>
        
        <section className="flex-grow p-3 md:p-6 overflow-y-auto custom-scrollbar">
          {filteredPlaylists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {filteredPlaylists.map(playlist => (
                <div key={playlist.id} className="group">
                  <button onClick={() => onSelectTrack(playlist, filteredPlaylists)} className="text-left w-full transform hover:-translate-y-1 transition-transform duration-200">
                    <div className="rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-200 aspect-square bg-gray-800 relative">
                      {playlist.thumbnail_url ? (
                         <img src={playlist.thumbnail_url} alt={playlist.name} className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-[#1DB954] p-4 bg-emerald-950/40">
                            <svg className="w-10 h-10 mb-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.36-.18-.6.36-1.02.96-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
                            </svg>
                         </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <svg className="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-start justify-between mt-2">
                     <div className="flex-grow min-w-0">
                        <h3 className="font-bold truncate text-sm sm:text-base">{playlist.name}</h3>
                        {playlist.is_favorite && <p className="text-xs text-[#1DB954] font-semibold">Favorito</p>}
                     </div>
                     <div className="relative flex-shrink-0">
                        <button onClick={() => setMenuOpenFor(playlist.id)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                            <DotsVerticalIcon />
                        </button>
                        {menuOpenFor === playlist.id && (
                             <div ref={menuRef} className="absolute right-0 mt-1 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-xl z-10 animate-pop-in origin-top-right">
                                <button onClick={() => handleToggleFavorite(playlist)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-[#1DB954]/10 flex items-center gap-2">
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
                <p className="font-medium">{view === 'favorites' ? 'No tienes favoritos de Spotify.' : 'No hay música guardada.'}</p>
                <p className="text-sm">¡Añade un enlace de Spotify (playlist, álbum o canción) para empezar!</p>
            </div>
          )}
        </section>

        {showAddForm && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center p-6 animate-pop-in">
                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl p-6 w-full max-w-sm">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <svg className="w-6 h-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.36-.18-.6.36-1.02.96-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
                      </svg>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">Agregar de Spotify</h3>
                    </div>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            value={newPlaylistName} 
                            onChange={e => { setNewPlaylistName(e.target.value); setFormError(null); }} 
                            placeholder="Nombre personalizado (opcional)"
                            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all duration-300 text-sm" 
                        />
                        <input 
                            type="text" 
                            value={newPlaylistUrl} 
                            onChange={e => { setNewPlaylistUrl(e.target.value); setFormError(null); }} 
                            placeholder="https://open.spotify.com/playlist/..."
                            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all duration-300 text-sm" 
                        />
                    </div>
                    {formError && <p className="text-red-500 text-xs text-center mt-3">{formError}</p>}
                    <div className="flex justify-end gap-3 mt-4">
                        <button 
                            onClick={handleCancelAdd} 
                            className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200 text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSavePlaylist}
                            disabled={isSaving}
                            className="bg-[#1DB954] text-black font-bold rounded-full px-4 py-2 shadow-md hover:bg-[#1ed760] transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait text-sm"
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
