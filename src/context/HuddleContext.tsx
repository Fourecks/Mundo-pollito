import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ProjectHuddleParticipant } from '../../types';

export interface ActiveHuddleSession {
  projectId: number;
  projectName: string;
  projectEmoji?: string;
  channelId: string;
  channelName: string;
  startedAt: string;
}

interface HuddleContextType {
  activeHuddle: ActiveHuddleSession | null;
  isHuddleActive: boolean;
  isMicOn: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  localVolume: number;
  speakingParticipants: Record<string, boolean>;
  huddleParticipants: ProjectHuddleParticipant[];
  isHuddleFullScreen: boolean;
  isFloatingMinimized: boolean;
  startHuddle: (projectId: number, projectName: string, channelId: string, channelName: string, projectEmoji?: string) => Promise<void>;
  leaveHuddle: () => void;
  toggleMic: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  setIsHuddleFullScreen: (fs: boolean | ((prev: boolean) => boolean)) => void;
  setIsFloatingMinimized: (min: boolean | ((prev: boolean) => boolean)) => void;
  currentSpeaker: { name: string; isLocal: boolean; hasVideo: boolean; stream: MediaStream | null };
}

const HuddleContext = createContext<HuddleContextType | null>(null);

export const HuddleProvider: React.FC<{ children: React.ReactNode; onHuddleStateChange?: (projectId: number, channelId: string, active: boolean, participants: ProjectHuddleParticipant[]) => void }> = ({ children, onHuddleStateChange }) => {
  const [activeHuddle, setActiveHuddle] = useState<ActiveHuddleSession | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [localVolume, setLocalVolume] = useState(0);
  const [speakingParticipants, setSpeakingParticipants] = useState<Record<string, boolean>>({});
  const [huddleParticipants, setHuddleParticipants] = useState<ProjectHuddleParticipant[]>([]);
  const [isHuddleFullScreen, setIsHuddleFullScreen] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<any>(null);

  const isHuddleActive = !!activeHuddle;

  // Audio analysis for microphone meter & speaking detection
  const setUpAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      volumeIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const volume = Math.min(100, Math.round((average / 128) * 100));
        setLocalVolume(volume);
      }, 100);
    } catch (e) {
      console.warn('Audio Context setup not supported or failed:', e);
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setLocalVolume(0);
  }, []);

  const stopScreenStream = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);
  }, []);

  // Sync media tracks with mic/video state
  const syncMedia = useCallback(async (mic: boolean, video: boolean) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      stream.getAudioTracks().forEach((t) => {
        t.enabled = mic;
      });

      if (mic) {
        setUpAudioAnalysis(stream);
      } else {
        setLocalVolume(0);
      }
      return stream;
    } catch (err) {
      console.error('Error accessing user media:', err);
      // Fallback: try audio only if video failed
      if (video) {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnlyStream;
          setLocalStream(audioOnlyStream);
          audioOnlyStream.getAudioTracks().forEach((t) => {
            t.enabled = mic;
          });
          if (mic) setUpAudioAnalysis(audioOnlyStream);
          setIsVideoOn(false);
          return audioOnlyStream;
        } catch (audioErr) {
          console.error('Audio permission error:', audioErr);
        }
      }
      return null;
    }
  }, [setUpAudioAnalysis]);

  const startHuddle = useCallback(async (
    projectId: number,
    projectName: string,
    channelId: string,
    channelName: string,
    projectEmoji?: string
  ) => {
    const newSession: ActiveHuddleSession = {
      projectId,
      projectName,
      projectEmoji,
      channelId,
      channelName,
      startedAt: new Date().toISOString(),
    };
    setActiveHuddle(newSession);
    setIsMicOn(true);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setIsFloatingMinimized(false);

    const initialParticipant: ProjectHuddleParticipant = {
      name: 'Tú',
      email: 'tu_correo@ejemplo.com',
      has_mic: true,
      has_video: false,
      has_screen: false,
    };
    setHuddleParticipants([initialParticipant]);

    await syncMedia(true, false);

    if (onHuddleStateChange) {
      onHuddleStateChange(projectId, channelId, true, [initialParticipant]);
    }
  }, [syncMedia, onHuddleStateChange]);

  const leaveHuddle = useCallback((forceEndAll: boolean = true) => {
    if (!activeHuddle) return;

    const projectId = activeHuddle.projectId;
    const channelId = activeHuddle.channelId;

    // 1. Terminate local streams and hardware tracks
    stopLocalStream();
    stopScreenStream();

    // 2. Clear state
    setActiveHuddle(null);
    setHuddleParticipants([]);
    setIsHuddleFullScreen(false);
    setIsFloatingMinimized(false);
    setIsMicOn(true);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setSpeakingParticipants({});
    setLocalVolume(0);

    // 3. Notify callback if passed
    if (onHuddleStateChange) {
      onHuddleStateChange(projectId, channelId, false, []);
    }

    // 4. Dispatch global custom event for instant cross-component synchronization
    try {
      window.dispatchEvent(new CustomEvent('huddle-ended', {
        detail: { projectId, channelId }
      }));
    } catch (e) {
      console.log('Error dispatching huddle-ended event:', e);
    }
  }, [activeHuddle, stopLocalStream, stopScreenStream, onHuddleStateChange]);

  const toggleMic = useCallback(() => {
    setIsMicOn((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = next;
        });
        if (next) {
          setUpAudioAnalysis(localStreamRef.current);
        } else {
          setLocalVolume(0);
        }
      }
      return next;
    });
  }, [setUpAudioAnalysis]);

  const toggleVideo = useCallback(async () => {
    const next = !isVideoOn;
    setIsVideoOn(next);
    await syncMedia(isMicOn, next);
  }, [isVideoOn, isMicOn, syncMedia]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenStream();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          stopScreenStream();
        };
      } catch (err) {
        console.warn('Error requesting screen sharing:', err);
        setIsScreenSharing(false);
      }
    }
  }, [isScreenSharing, stopScreenStream]);

  // Update participant list when user toggles mic/video/screen
  useEffect(() => {
    if (isHuddleActive) {
      setHuddleParticipants((prev) =>
        prev.map((p) =>
          p.name === 'Tú'
            ? { ...p, has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing }
            : p
        )
      );
    }
  }, [isMicOn, isVideoOn, isScreenSharing, isHuddleActive]);

  // Track speaking participant
  useEffect(() => {
    if (!isHuddleActive) {
      setSpeakingParticipants({});
      return;
    }
    const interval = setInterval(() => {
      const speaking: Record<string, boolean> = {};
      huddleParticipants.forEach((p) => {
        if (p.name === 'Tú') {
          speaking['Tú'] = isMicOn && localVolume > 10;
        } else if (p.has_mic && Math.random() > 0.7) {
          speaking[p.name] = true;
        }
      });
      setSpeakingParticipants(speaking);
    }, 1000);

    return () => clearInterval(interval);
  }, [isHuddleActive, huddleParticipants, isMicOn, localVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalStream();
      stopScreenStream();
    };
  }, [stopLocalStream, stopScreenStream]);

  const currentSpeaker = useMemo(() => {
    if (isScreenSharing && screenStream) {
      return { name: 'Tu Pantalla', isLocal: true, hasVideo: true, stream: screenStream };
    }
    if (isVideoOn && localStream) {
      return { name: 'Tú', isLocal: true, hasVideo: true, stream: localStream };
    }
    return { name: 'Tú', isLocal: true, hasVideo: false, stream: null };
  }, [isScreenSharing, screenStream, isVideoOn, localStream]);

  return (
    <HuddleContext.Provider
      value={{
        activeHuddle,
        isHuddleActive,
        isMicOn,
        isVideoOn,
        isScreenSharing,
        localStream,
        screenStream,
        localVolume,
        speakingParticipants,
        huddleParticipants,
        isHuddleFullScreen,
        isFloatingMinimized,
        startHuddle,
        leaveHuddle,
        toggleMic,
        toggleVideo,
        toggleScreenShare,
        setIsHuddleFullScreen,
        setIsFloatingMinimized,
        currentSpeaker,
      }}
    >
      {children}
    </HuddleContext.Provider>
  );
};

export const useHuddle = () => {
  const context = useContext(HuddleContext);
  if (!context) {
    return {
      activeHuddle: null,
      isHuddleActive: false,
      isMicOn: true,
      isVideoOn: false,
      isScreenSharing: false,
      localStream: null,
      screenStream: null,
      localVolume: 0,
      speakingParticipants: {},
      huddleParticipants: [],
      isHuddleFullScreen: false,
      isFloatingMinimized: false,
      startHuddle: async () => {},
      leaveHuddle: () => {},
      toggleMic: () => {},
      toggleVideo: async () => {},
      toggleScreenShare: async () => {},
      setIsHuddleFullScreen: () => {},
      setIsFloatingMinimized: () => {},
      currentSpeaker: { name: 'Tú', isLocal: true, hasVideo: false, stream: null },
    };
  }
  return context;
};
