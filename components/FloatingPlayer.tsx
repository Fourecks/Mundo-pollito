import React from 'react';
import { Playlist } from '../types';
import SpotifyFloatingPlayer from './SpotifyFloatingPlayer';

interface FloatingPlayerProps {
    track: Playlist;
    queue: Playlist[];
    onSelectTrack: (track: Playlist, queue: Playlist[]) => void;
    onClose: () => void;
}

const FloatingPlayer: React.FC<FloatingPlayerProps> = ({ track, onClose }) => {
    return (
        <SpotifyFloatingPlayer
            track={track}
            onClose={onClose}
        />
    );
};

export default FloatingPlayer;

