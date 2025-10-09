import React, { useState, useEffect, useRef } from 'react';
import { Playlist } from '../types';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import NextIcon from './icons/NextIcon';
import PreviousIcon from './icons/PreviousIcon';
import ShuffleIcon from './icons/ShuffleIcon';
import VolumeIcon from './icons/VolumeIcon';
import VolumeMuteIcon from './icons/VolumeMuteIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';
import CloseIcon from './icons/CloseIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import { ensureYoutubeApiReady } from '../utils/youtubeApi';


interface FloatingPlayerProps {
    track: Playlist;
    queue: Playlist[];
    onSelectTrack: (track: Playlist, queue: Playlist[]) => void;
    onClose: () => void;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const FloatingPlayer: React.FC<FloatingPlayerProps> = ({ track, queue, onSelectTrack, onClose }) => {
    const playerRef = useRef<YT.Player | null>(null);
    const progressIntervalRef = useRef<number | null>(null);

    const [isMinimized, setIsMinimized] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [videoTitle, setVideoTitle] = useState(track.name);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    
    const latestState = useRef({ track, queue, isShuffle, onSelectTrack });
    useEffect(() => {
        latestState.current = { track, queue, isShuffle, onSelectTrack };
    }, [track, queue, isShuffle, onSelectTrack]);
    
    useEffect(() => {
        return () => {
             if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
    }, []);

    useEffect(() => {
        const hasPlayedOnce = { current: false };

        const handleAutoNext = () => {
            const { track: currentTrack, queue: currentQueue, isShuffle: currentShuffle, onSelectTrack: currentOnSelectTrack } = latestState.current;
            if (currentTrack.type === 'playlist' || currentQueue.length <= 1) return;
            
            const currentIndex = currentQueue.findIndex(t => t.id === currentTrack.id);
            let nextIndex;

            if (currentShuffle) {
                do {
                    nextIndex = Math.floor(Math.random() * currentQueue.length);
                } while (currentQueue.length > 1 && nextIndex === currentIndex);
            } else {
                nextIndex = (currentIndex + 1) % currentQueue.length;
            }
            currentOnSelectTrack(currentQueue[nextIndex], currentQueue);
        };
        
        const onPlayerStateChange = (event: { data: YT.PlayerState; target: YT.Player }) => {
            const player = event.target;
            const state = event.data;
            if (state === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                hasPlayedOnce.current = true;
                setDuration(player.getDuration());
                setVideoTitle(player.getVideoData().title || track.name);
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = window.setInterval(() => {
                    setCurrentTime(player.getCurrentTime());
                }, 500);
            } else if (state === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                if (!hasPlayedOnce.current) player.playVideo();
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            } else if (state === YT.PlayerState.ENDED) {
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                setCurrentTime(duration);
                handleAutoNext();
            } else if (state === YT.PlayerState.CUED) {
                player.playVideo();
            }
        };

        const onPlayerReady = (event: { target: YT.Player }) => {
            const player = event.target;
            const { track: currentTrack } = latestState.current;
             if (currentTrack.type === 'playlist') {
                player.loadPlaylist({ list: currentTrack.source_id, listType: 'playlist' });
            } else {
                player.loadVideoById(currentTrack.source_id);
            }
            player.setVolume(volume);
            if (isMuted) player.mute(); else player.unMute();
            player.playVideo();
        };
        
        const createPlayer = () => {
             if (playerRef.current) playerRef.current.destroy();
             if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
             setCurrentTime(0); setDuration(0);
             
            playerRef.current = new YT.Player('floating-player-instance', {
                height: '100%', width: '100%',
                playerVars: { autoplay: 1, controls: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        };
        
        ensureYoutubeApiReady().then(() => {
            createPlayer();
        });

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [track.id, isMuted, volume, track.name]);

    const handlePlayPause = () => {
        if (!playerRef.current) return;
        const state = playerRef.current.getPlayerState();
        if (state === YT.PlayerState.PLAYING) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
    };

    const handleNext = () => {
        const { track: currentTrack, queue: currentQueue, onSelectTrack: currentOnSelectTrack } = latestState.current;
        if (currentTrack.type === 'playlist' && playerRef.current) playerRef.current.nextVideo();
        else {
            const currentIndex = currentQueue.findIndex(t => t.id === currentTrack.id);
            const nextIndex = (currentIndex + 1) % currentQueue.length;
            currentOnSelectTrack(currentQueue[nextIndex], currentQueue);
        }
    };

    const handlePrevious = () => {
        const { track: currentTrack, queue: currentQueue, onSelectTrack: currentOnSelectTrack } = latestState.current;
        if (currentTrack.type === 'playlist' && playerRef.current) playerRef.current.previousVideo();
        else {
            const currentIndex = currentQueue.findIndex(t => t.id === currentTrack.id);
            const prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
            currentOnSelectTrack(currentQueue[prevIndex], currentQueue);
        }
    };
    
    const handleMuteToggle = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume);
            if (newVolume > 0 && isMuted) {
                playerRef.current.unMute();
                setIsMuted(false);
            }
        }
    };
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = Number(e.target.value);
        setCurrentTime(newTime);
        if (playerRef.current) {
            playerRef.current.seekTo(newTime, true);
        }
    };

    return (
        <div className={`fixed bottom-4 right-4 z-[500] transition-all duration-300 ease-in-out animate-pop-in w-80`}>
            <div className="shadow-2xl rounded-2xl overflow-hidden">
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isMinimized ? 'h-0' : 'aspect-video'}`}>
                    <div className="relative w-full h-full bg-black">
                        <div id="floating-player-instance" className="w-full h-full" />
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-2 sm:p-3">
                    {isMinimized ? (
                        <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate ml-2 flex-grow">{videoTitle}</p>
                            <div className="flex items-center">
                                <button onClick={handlePlayPause} className="p-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-400 rounded-full">{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
                                <button onClick={() => setIsMinimized(false)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400">
                                    <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 rotate-180" />
                                </button>
                                <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400"><CloseIcon /></button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{videoTitle}</p>
                                <div className="flex items-center flex-shrink-0 pl-2">
                                     <a href={`https://www.youtube.com/watch?v=${track.source_id}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-gray-500 hover:text-pink-500 dark:hover:text-pink-400 flex-shrink-0">
                                        <ExternalLinkIcon />
                                    </a>
                                    <button onClick={() => setIsMinimized(true)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400">
                                        <ChevronDownIcon className="h-5 w-5 transition-transform duration-300" />
                                    </button>
                                    <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400">
                                        <CloseIcon />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{formatTime(currentTime)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 1}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-1 bg-yellow-200/80 dark:bg-gray-600/80 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-400"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{formatTime(duration)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <button onClick={() => setIsShuffle(!isShuffle)} className={`p-1 ${isShuffle ? 'text-pink-500 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}><ShuffleIcon /></button>
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrevious} className="p-1 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400"><PreviousIcon /></button>
                                    <button onClick={handlePlayPause} className="text-gray-600 dark:text-gray-200 hover:text-pink-500 dark:hover:text-pink-400 text-lg p-3 bg-white/50 dark:bg-gray-700/50 rounded-full shadow-sm">
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                    <button onClick={handleNext} className="p-1 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400"><NextIcon /></button>
                                </div>
                                <div className="group relative flex items-center">
                                    <button onClick={handleMuteToggle} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                        {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolumeChange}
                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-yellow-200/80 dark:bg-gray-600/80 rounded-full appearance-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-400"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FloatingPlayer;