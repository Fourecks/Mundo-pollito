import React, { useState } from 'react';
import { Playlist } from '../types';
import CloseIcon from './icons/CloseIcon';
import YouTubeIFramePlayer from './YouTubeIFramePlayer';

interface MobileMusicPlayerProps {
    track: Playlist | null;
    queue: Playlist[];
    onSelectTrack: (track: Playlist, queue: Playlist[]) => void;
    onClose: () => void;
}

const MobileMusicPlayer: React.FC<MobileMusicPlayerProps> = ({ track, queue, onSelectTrack, onClose }) => {
    const [spotifySessionConfirmed, setSpotifySessionConfirmed] = useState<boolean>(() => {
        return localStorage.getItem('spotify_session_active') === 'true';
    });

    if (!track) return null;

    // Fallback or default Spotify rendering
    const spotifyId = track.source_id || track.id;
    const embedUrl = `https://open.spotify.com/embed/${track.type}/${spotifyId}?utm_source=generator`;
    const spotifyHeight = track.type === 'track' ? 152 : 352;

    if (!spotifySessionConfirmed) {
        return (
            <div className="fixed bottom-20 sm:bottom-4 right-4 z-[500] w-80 max-w-[calc(100vw-2rem)] bg-[#121212] border border-white/10 text-white p-4 rounded-2xl shadow-2xl animate-pop-in">
                <div className="relative">
                    <button
                        onClick={onClose}
                        className="absolute -top-1 -right-1 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Cerrar"
                    >
                        <CloseIcon />
                    </button>

                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.36-.18-.6.36-1.02.96-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Spotify</span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1">
                        Inicia sesión en Spotify
                    </h4>

                    <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                        Para escuchar canciones completas y tus listas guardadas sin la restricción de 30 segundos, inicia sesión con tu cuenta de Spotify.
                    </p>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => window.open('https://accounts.spotify.com/login', '_blank')}
                            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-2 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <span>Iniciar sesión en Spotify</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>

                        <button
                            onClick={() => {
                                localStorage.setItem('spotify_session_active', 'true');
                                setSpotifySessionConfirmed(true);
                            }}
                            className="w-full bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-white/20 py-1.5 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Ya inicié sesión / Reproducir
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 shadow-lg">
            <div className="relative">
                <iframe title="Spotify Player" src={embedUrl} width="100%" height={spotifyHeight} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="no-referrer-when-downgrade" loading="lazy" className="rounded-lg"></iframe>
                <div className="absolute top-1 right-1 flex items-center gap-1">
                    <button
                        onClick={() => {
                            localStorage.removeItem('spotify_session_active');
                            setSpotifySessionConfirmed(false);
                        }}
                        className="p-1 bg-black/60 text-white rounded-full text-[10px] px-2"
                        title="Iniciar sesión en Spotify"
                    >
                        Login
                    </button>
                    <button onClick={onClose} className="p-1 bg-black/30 rounded-full text-white cursor-pointer" aria-label="Cerrar"><CloseIcon /></button>
                </div>
            </div>
        </div>
    );
};

export default MobileMusicPlayer;