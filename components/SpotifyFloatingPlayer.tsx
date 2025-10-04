import React from 'react';
import { Playlist } from '../types';
import CloseIcon from './icons/CloseIcon';

interface SpotifyFloatingPlayerProps {
    track: Playlist;
    onClose: () => void;
}

const SpotifyFloatingPlayer: React.FC<SpotifyFloatingPlayerProps> = ({ track, onClose }) => {
    const embedUrl = `https://open.spotify.com/embed/${track.type}/${track.id}?utm_source=generator`;

    return (
        // The `group` class enables the hover effect on the child button
        <div className="fixed bottom-4 right-4 z-[500] transition-all duration-300 ease-in-out animate-pop-in w-80 group">
            <iframe
                title="Spotify Player"
                src={embedUrl}
                width="100%"
                height="80"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                // The iframe itself now has the shadow and rounded corners
                className="rounded-2xl shadow-2xl"
            ></iframe>
            {/* The close button is positioned absolutely over the iframe, appearing on hover */}
            <button
                onClick={onClose}
                className="absolute top-1 right-1 p-1 text-white/80 hover:text-white focus:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))' }}
                aria-label="Cerrar reproductor de Spotify"
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export default SpotifyFloatingPlayer;