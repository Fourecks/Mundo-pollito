import React, { useState } from 'react';
import { Playlist } from '../types';
import CloseIcon from './icons/CloseIcon';

interface SpotifyFloatingPlayerProps {
    track: Playlist;
    onClose: () => void;
}

const SpotifyIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.36-.18-.6.36-1.02.96-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
    </svg>
);

const SpotifyFloatingPlayer: React.FC<SpotifyFloatingPlayerProps> = ({ track, onClose }) => {
    const spotifyId = track.source_id || track.id;
    const embedUrl = `https://open.spotify.com/embed/${track.type}/${spotifyId}?utm_source=generator`;
    const isTrack = track.type === 'track';
    const playerHeight = isTrack ? 152 : 352;

    const [sessionConfirmed, setSessionConfirmed] = useState<boolean>(() => {
        return localStorage.getItem('spotify_session_active') === 'true';
    });

    const handleOpenSpotifyLogin = () => {
        window.open('https://accounts.spotify.com/login', '_blank');
    };

    const handleConfirmSession = () => {
        localStorage.setItem('spotify_session_active', 'true');
        setSessionConfirmed(true);
    };

    const handleRequireLogin = () => {
        localStorage.removeItem('spotify_session_active');
        setSessionConfirmed(false);
    };

    if (!sessionConfirmed) {
        return (
            <div className="fixed bottom-4 right-4 z-[500] transition-all duration-300 ease-in-out animate-pop-in w-80 max-w-[calc(100vw-2rem)] bg-[#121212] border border-white/10 text-white rounded-2xl p-5 shadow-2xl">
                <div className="relative">
                    <button
                        onClick={onClose}
                        className="absolute -top-1 -right-1 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Cerrar"
                    >
                        <CloseIcon />
                    </button>

                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="text-[#1DB954]">
                            <SpotifyIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Spotify</span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-1.5 leading-snug">
                        Inicia sesión en Spotify
                    </h4>

                    <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                        Para escuchar canciones completas y tus listas guardadas sin la restricción de 30 segundos de muestra, inicia sesión con tu cuenta de Spotify.
                    </p>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleOpenSpotifyLogin}
                            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-2.5 px-4 rounded-full text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>Iniciar sesión en Spotify</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>

                        <button
                            onClick={handleConfirmSession}
                            className="w-full bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-white/20 py-2 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Ya inicié sesión / Reproducir
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[500] transition-all duration-300 ease-in-out animate-pop-in w-80 group">
            <iframe
                title="Spotify Player"
                src={embedUrl}
                width="100%"
                height={playerHeight}
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer-when-downgrade"
                loading="lazy"
                className="rounded-2xl shadow-2xl"
            ></iframe>
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleRequireLogin}
                    title="Iniciar sesión en Spotify en nueva ventana"
                    className="p-1 bg-black/60 text-white/80 hover:text-white rounded-full text-[10px] px-2 backdrop-blur-sm transition-colors cursor-pointer"
                >
                    Login Spotify
                </button>
                <button
                    onClick={onClose}
                    className="p-1 text-white/80 hover:text-white focus:text-white transition-all bg-black/60 rounded-full backdrop-blur-sm cursor-pointer"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }}
                    aria-label="Cerrar reproductor de Spotify"
                >
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
};

export default SpotifyFloatingPlayer;
