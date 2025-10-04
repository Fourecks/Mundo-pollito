import React, { useState, useEffect, useRef } from 'react';
import { Playlist } from '../types';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import NextIcon from './icons/NextIcon';
import PreviousIcon from './icons/PreviousIcon';
import CloseIcon from './icons/CloseIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};


interface MobileMusicPlayerProps {
    track: Playlist | null;
    queue: Playlist[];
    onSelectTrack: (track: Playlist, queue: Playlist[]) => void;
    onClose: () => void;
}

const MobileMusicPlayer: React.FC<MobileMusicPlayerProps> = ({ track, queue, onSelectTrack, onClose }) => {
    const playerRef = useRef<YT.Player | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    const [isExpanded, setIsExpanded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoTitle, setVideoTitle] = useState(track?.name || '');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const latestState = useRef({ track, queue, onSelectTrack });
    useEffect(() => {
        latestState.current = { track, queue, onSelectTrack };
    }, [track, queue, onSelectTrack]);

     useEffect(() => {
        if (!track) {
            setIsExpanded(false);
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        }
    }, [track]);

    useEffect(() => {
        // Only create YT player if it's a youtube track and the player view is expanded.
        if (!track || track.platform !== 'youtube' || !isExpanded) {
            // If the player exists, destroy it when collapsing or changing track type.
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            return;
        }

        const handleAutoNext = () => {
            const { track: currentTrack, queue: currentQueue, onSelectTrack: currentOnSelectTrack } = latestState.current;
            if (!currentTrack || currentQueue.length <= 1) return;
            const currentIndex = currentQueue.findIndex(t => t.uuid === currentTrack.uuid);
            const nextIndex = (currentIndex + 1) % currentQueue.length;
            currentOnSelectTrack(currentQueue[nextIndex], currentQueue);
        };
        
        const onPlayerStateChange = (event: { data: YT.PlayerState; target: YT.Player }) => {
            if (event.data === YT.PlayerState.PLAYING) setIsPlaying(true);
            else setIsPlaying(false);
            if (event.data === YT.PlayerState.ENDED) handleAutoNext();
        };

        const onPlayerReady = (event: { target: YT.Player }) => {
            if (latestState.current.track) {
                event.target.loadVideoById(latestState.current.track.id);
            }
        };
        
        const createPlayer = () => {
             if (playerRef.current) playerRef.current.destroy();
             if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

            playerRef.current = new YT.Player('mobile-player-instance', {
                height: '100%', width: '100%',
                playerVars: { autoplay: 1, controls: 0, playsinline: 1, origin: window.location.origin },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        };
        
        if (window.YT && window.YT.Player) createPlayer();
        else window.onYouTubeIframeAPIReady = createPlayer;

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [track?.uuid, track?.platform, isExpanded]);

    // Update title, duration, and progress
    useEffect(() => {
        if (isPlaying && playerRef.current) {
             if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = window.setInterval(() => {
                const player = playerRef.current;
                if(player && typeof player.getCurrentTime === 'function') {
                    setCurrentTime(player.getCurrentTime());
                    setDuration(player.getDuration());
                    const videoData = player.getVideoData();
                    if(videoData.title) setVideoTitle(videoData.title);
                }
            }, 1000);
        } else {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
        return () => { if(progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
    }, [isPlaying]);

    if (!track) return null;

    if (track.platform === 'spotify') {
        const embedUrl = `https://open.spotify.com/embed/${track.type}/${track.id}?utm_source=generator`;
        return (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 shadow-lg">
                <div className="relative">
                    <iframe title="Spotify Player" src={embedUrl} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-lg"></iframe>
                    <button onClick={onClose} className="absolute top-1 right-1 p-1 bg-black/30 rounded-full text-white"><CloseIcon /></button>
                </div>
            </div>
        );
    }
    
    // YouTube Player
    const handlePlayPause = () => {
        if (!playerRef.current) return;
        isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    };

    const handleNext = () => onSelectTrack(queue[(queue.findIndex(t => t.uuid === track.uuid) + 1) % queue.length], queue);
    const handlePrev = () => onSelectTrack(queue[(queue.findIndex(t => t.uuid === track.uuid) - 1 + queue.length) % queue.length], queue);

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    return (
        <>
            {/* Mini Player */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 shadow-lg" onClick={() => setIsExpanded(true)}>
                <div className="flex items-center gap-3">
                    <img src={track.thumbnailUrl} alt={track.name} className="w-10 h-10 rounded-md flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                        <p className="font-bold text-sm truncate text-gray-800 dark:text-gray-200">{videoTitle || track.name}</p>
                        <div className="h-1 bg-yellow-200/80 dark:bg-gray-700/80 rounded-full mt-1">
                            <div className="h-full bg-pink-400 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); handlePlayPause(); }} className="p-2 text-gray-700 dark:text-gray-300"><div className="w-6 h-6">{isPlaying ? <PauseIcon /> : <PlayIcon />}</div></button>
                        <button onClick={e => { e.stopPropagation(); onClose(); }} className="p-2 text-gray-500 dark:text-gray-400"><CloseIcon /></button>
                    </div>
                </div>
            </div>

            {/* Expanded Player */}
            {isExpanded && (
                <div className="fixed inset-0 bg-yellow-50 dark:bg-gray-900 z-[100] flex flex-col animate-pop-in">
                    <header className="flex items-center justify-between p-2 flex-shrink-0">
                        <button onClick={() => setIsExpanded(false)} className="p-2 text-gray-500 dark:text-gray-400"><ChevronDownIcon className="h-6 w-6" /></button>
                        <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Reproduciendo</span>
                        <div className="w-10"></div>
                    </header>
                    <main className="flex-grow flex flex-col justify-center items-center p-6 gap-6">
                        <div className="w-full max-w-xs aspect-square rounded-2xl shadow-2xl overflow-hidden bg-black">
                             <div id="mobile-player-instance" className="w-full h-full" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{videoTitle}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{track.name}</p>
                        </div>
                        <div className="w-full max-w-sm">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span>{formatTime(currentTime)}</span>
                                <div className="flex-grow h-1 bg-yellow-200/80 dark:bg-gray-700/80 rounded-full">
                                    <div className="h-full bg-pink-400 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                                <span>{formatTime(duration)}</span>
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <button onClick={handlePrev} className="p-3 text-gray-600 dark:text-gray-300"><PreviousIcon /></button>
                                <button onClick={handlePlayPause} className="p-5 bg-pink-400 text-white rounded-full shadow-lg"><div className="w-8 h-8">{isPlaying ? <PauseIcon /> : <PlayIcon />}</div></button>
                                <button onClick={handleNext} className="p-3 text-gray-600 dark:text-gray-300"><NextIcon /></button>
                            </div>
                        </div>
                    </main>
                </div>
            )}
        </>
    );
};

export default MobileMusicPlayer;