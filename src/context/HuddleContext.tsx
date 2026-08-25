import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ProjectHuddleParticipant } from '../../types';
import { supabase } from '../../supabaseClient';

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
  remoteStreams: Record<string, MediaStream>;
  userEmail: string;
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

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const HuddleProvider: React.FC<{
  children: React.ReactNode;
  onHuddleStateChange?: (projectId: number, channelId: string, active: boolean, participants: ProjectHuddleParticipant[]) => void;
}> = ({ children, onHuddleStateChange }) => {
  const [activeHuddle, setActiveHuddle] = useState<ActiveHuddleSession | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [localVolume, setLocalVolume] = useState(0);
  const [speakingParticipants, setSpeakingParticipants] = useState<Record<string, boolean>>({});
  const [huddleParticipants, setHuddleParticipants] = useState<ProjectHuddleParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('Tú');
  const [isHuddleFullScreen, setIsHuddleFullScreen] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<any>(null);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const realtimeChannelRef = useRef<any>(null);
  const userSessionRef = useRef<{ email: string; name: string }>({ email: '', name: 'Tú' });
  const isMicOnRef = useRef(true);
  const isVideoOnRef = useRef(false);
  const isScreenSharingRef = useRef(false);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  const isHuddleActive = !!activeHuddle;

  // Audio analysis for local microphone meter & speaking detection
  const setUpAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
      console.warn('Audio Context setup failed:', e);
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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

  // WebRTC PeerConnection Helper
  const createPeerConnection = useCallback((peerEmail: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    pc.ontrack = (event) => {
      let currentStream = remoteStreamsRef.current.get(peerEmail);
      if (!currentStream) {
        currentStream = new MediaStream();
      }

      // Remove existing track of same kind if replacing
      const existingTrack = currentStream.getTracks().find((t) => t.kind === event.track.kind);
      if (existingTrack && existingTrack.id !== event.track.id) {
        currentStream.removeTrack(existingTrack);
      }
      if (!currentStream.getTracks().some((t) => t.id === event.track.id)) {
        currentStream.addTrack(event.track);
      }

      const freshStream = new MediaStream(currentStream.getTracks());
      remoteStreamsRef.current.set(peerEmail, freshStream);

      setRemoteStreams((prev) => ({
        ...prev,
        [peerEmail]: freshStream,
      }));

      // Play audio track automatically
      if (event.track.kind === 'audio') {
        let audioEl = audioElementsRef.current.get(peerEmail);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.id = `remote_audio_${peerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
          document.body.appendChild(audioEl);
          audioElementsRef.current.set(peerEmail, audioEl);
        }
        audioEl.srcObject = freshStream;
        audioEl.play().catch((err) => console.warn('Remote audio autoplay error:', err));
      }

      setHuddleParticipants((prev) =>
        prev.map((p) => (p.email === peerEmail ? { ...p, stream: freshStream } : p))
      );
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            to: peerEmail,
            from: userSessionRef.current.email,
            type: 'ice',
            candidate: event.candidate,
          },
        });
      }
    };

    return pc;
  }, []);

  const initiatePeerConnection = useCallback(async (peerEmail: string) => {
    let pc = peerConnectionsRef.current.get(peerEmail);
    if (!pc) {
      pc = createPeerConnection(peerEmail);
      peerConnectionsRef.current.set(peerEmail, pc);
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      realtimeChannelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          to: peerEmail,
          from: userSessionRef.current.email,
          type: 'offer',
          offer,
        },
      });
    } catch (err) {
      console.warn('Error creating WebRTC offer:', err);
    }
  }, [createPeerConnection]);

  // Update peer WebRTC senders with newly available media tracks
  const updatePeerTracks = useCallback((streamToShare: MediaStream | null) => {
    if (!streamToShare) return;
    peerConnectionsRef.current.forEach((pc, peerEmail) => {
      const senders = pc.getSenders();
      streamToShare.getTracks().forEach((track) => {
        const existingSender = senders.find((s) => s.track?.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch((err) => console.warn('Replace track error:', err));
        } else {
          try {
            pc.addTrack(track, streamToShare);
          } catch (e) {
            console.warn('Add track error:', e);
          }
        }
      });
      // Trigger WebRTC offer renegotiation so remote peer receives new tracks
      initiatePeerConnection(peerEmail);
    });
  }, [initiatePeerConnection]);

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

      updatePeerTracks(stream);

      return stream;
    } catch (err) {
      console.error('Error accessing user media:', err);
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
          updatePeerTracks(audioOnlyStream);
          return audioOnlyStream;
        } catch (audioErr) {
          console.error('Audio permission error:', audioErr);
        }
      }
      return null;
    }
  }, [setUpAudioAnalysis, updatePeerTracks]);

  // Handle incoming Realtime signaling messages
  const handleSignal = useCallback(async (payload: any) => {
    const myEmail = userSessionRef.current.email;
    if (payload.to !== myEmail) return;

    const senderEmail = payload.from;
    if (!senderEmail) return;

    if (payload.type === 'offer') {
      let pc = peerConnectionsRef.current.get(senderEmail);
      if (pc) {
        pc.close();
      }
      pc = createPeerConnection(senderEmail);
      peerConnectionsRef.current.set(senderEmail, pc);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        realtimeChannelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            to: senderEmail,
            from: myEmail,
            type: 'answer',
            answer,
          },
        });
      } catch (err) {
        console.warn('Error handling WebRTC offer:', err);
      }
    } else if (payload.type === 'answer') {
      const pc = peerConnectionsRef.current.get(senderEmail);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        } catch (err) {
          console.warn('Error setting remote description:', err);
        }
      }
    } else if (payload.type === 'ice') {
      const pc = peerConnectionsRef.current.get(senderEmail);
      if (pc && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      }
    }
  }, [createPeerConnection]);

  const startHuddle = useCallback(async (
    projectId: number,
    projectName: string,
    channelId: string,
    channelName: string,
    projectEmoji?: string
  ) => {
    // 1. Fetch current authenticated user info
    let myEmail = 'usuario@local.com';
    let myName = 'Tú';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        myEmail = session.user.email || myEmail;
        myName = session.user.user_metadata?.full_name || myEmail.split('@')[0] || myName;
      }
    } catch (e) {
      console.warn('Could not fetch user session:', e);
    }

    userSessionRef.current = { email: myEmail, name: myName };
    setUserEmail(myEmail);
    setUserName(myName);

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
      email: myEmail,
      has_mic: true,
      has_video: false,
      has_screen: false,
    };
    setHuddleParticipants([initialParticipant]);

    const stream = await syncMedia(true, false);
    if (stream) {
      setHuddleParticipants((prev) =>
        prev.map((p) => (p.email === myEmail ? { ...p, stream } : p))
      );
    }

    // Connect to Supabase Realtime channel for WebRTC signaling
    const roomName = `huddle_${projectId}_${channelId}`;
    const channel = supabase.channel(roomName, {
      config: { broadcast: { self: false } },
    });
    realtimeChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'join' }, ({ payload }) => {
        setHuddleParticipants((prev) => {
          if (prev.some((p) => p.email === payload.email)) return prev;
          return [
            ...prev,
            {
              name: payload.name || payload.email.split('@')[0],
              email: payload.email,
              has_mic: !!payload.has_mic,
              has_video: !!payload.has_video,
              has_screen: !!payload.has_screen,
            },
          ];
        });

        // Announce presence back
        channel.send({
          type: 'broadcast',
          event: 'presence_announce',
          payload: {
            to: payload.email,
            email: userSessionRef.current.email,
            name: userSessionRef.current.name,
            has_mic: isMicOnRef.current,
            has_video: isVideoOnRef.current,
            has_screen: isScreenSharingRef.current,
          },
        });

        // Initiate WebRTC peer connection
        initiatePeerConnection(payload.email);
      })
      .on('broadcast', { event: 'presence_announce' }, ({ payload }) => {
        if (payload.to === userSessionRef.current.email) {
          setHuddleParticipants((prev) => {
            if (prev.some((p) => p.email === payload.email)) return prev;
            return [
              ...prev,
              {
                name: payload.name || payload.email.split('@')[0],
                email: payload.email,
                has_mic: !!payload.has_mic,
                has_video: !!payload.has_video,
                has_screen: !!payload.has_screen,
              },
            ];
          });
        }
      })
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignal(payload);
      })
      .on('broadcast', { event: 'state_update' }, ({ payload }) => {
        setHuddleParticipants((prev) =>
          prev.map((p) =>
            p.email === payload.email
              ? {
                  ...p,
                  has_mic: payload.has_mic,
                  has_video: payload.has_video,
                  has_screen: payload.has_screen,
                }
              : p
          )
        );
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        setHuddleParticipants((prev) => prev.filter((p) => p.email !== payload.email));

        const pc = peerConnectionsRef.current.get(payload.email);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(payload.email);
        }

        const audioEl = audioElementsRef.current.get(payload.email);
        if (audioEl) {
          audioEl.pause();
          audioEl.srcObject = null;
          audioEl.remove();
          audioElementsRef.current.delete(payload.email);
        }

        remoteStreamsRef.current.delete(payload.email);
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[payload.email];
          return next;
        });
      });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'join',
          payload: {
            email: userSessionRef.current.email,
            name: userSessionRef.current.name,
            has_mic: true,
            has_video: false,
            has_screen: false,
          },
        });
      }
    });

    if (onHuddleStateChange) {
      onHuddleStateChange(projectId, channelId, true, [initialParticipant]);
    }
  }, [syncMedia, initiatePeerConnection, handleSignal, onHuddleStateChange]);

  const leaveHuddle = useCallback(() => {
    if (!activeHuddle) return;

    const projectId = activeHuddle.projectId;
    const channelId = activeHuddle.channelId;

    // Send leave signal
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'leave',
        payload: { email: userSessionRef.current.email },
      });
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Close all WebRTC peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Clean up audio DOM elements
    audioElementsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current.clear();

    remoteStreamsRef.current.clear();
    setRemoteStreams({});

    stopLocalStream();
    stopScreenStream();

    setActiveHuddle(null);
    setHuddleParticipants([]);
    setIsHuddleFullScreen(false);
    setIsFloatingMinimized(false);
    setIsMicOn(true);
    setIsVideoOn(false);
    setIsScreenSharing(false);
    setSpeakingParticipants({});
    setLocalVolume(0);

    const remainingParticipants = huddleParticipants.filter((p) => p.email !== userSessionRef.current.email);
    const stillActive = remainingParticipants.length > 0;

    if (onHuddleStateChange) {
      onHuddleStateChange(projectId, channelId, stillActive, remainingParticipants);
    }

    try {
      window.dispatchEvent(
        new CustomEvent('huddle-ended', {
          detail: { projectId, channelId },
        })
      );
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

      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'state_update',
          payload: {
            email: userSessionRef.current.email,
            has_mic: next,
            has_video: isVideoOnRef.current,
            has_screen: isScreenSharingRef.current,
          },
        });
      }

      return next;
    });
  }, [setUpAudioAnalysis]);

  const toggleVideo = useCallback(async () => {
    const next = !isVideoOn;
    setIsVideoOn(next);
    const stream = await syncMedia(isMicOn, next);

    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: {
          email: userSessionRef.current.email,
          has_mic: isMicOn,
          has_video: next,
          has_screen: isScreenSharing,
        },
      });
    }

    if (stream) {
      updatePeerTracks(stream);
    }
  }, [isVideoOn, isMicOn, isScreenSharing, syncMedia, updatePeerTracks]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenStream();
      const activeStream = localStreamRef.current;
      updatePeerTracks(activeStream);

      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'state_update',
          payload: {
            email: userSessionRef.current.email,
            has_mic: isMicOn,
            has_video: isVideoOn,
            has_screen: false,
          },
        });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        updatePeerTracks(stream);

        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'state_update',
            payload: {
              email: userSessionRef.current.email,
              has_mic: isMicOn,
              has_video: isVideoOn,
              has_screen: true,
            },
          });
        }

        stream.getVideoTracks()[0].onended = () => {
          stopScreenStream();
          const activeLocalStream = localStreamRef.current;
          updatePeerTracks(activeLocalStream);

          if (realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'state_update',
              payload: {
                email: userSessionRef.current.email,
                has_mic: isMicOnRef.current,
                has_video: isVideoOnRef.current,
                has_screen: false,
              },
            });
          }
        };
      } catch (err) {
        console.warn('Error requesting screen sharing:', err);
        setIsScreenSharing(false);
      }
    }
  }, [isScreenSharing, isMicOn, isVideoOn, stopScreenStream, updatePeerTracks]);

  // Sync participant status
  useEffect(() => {
    if (isHuddleActive) {
      setHuddleParticipants((prev) =>
        prev.map((p) =>
          p.email === userSessionRef.current.email || p.name === 'Tú'
            ? { ...p, has_mic: isMicOn, has_video: isVideoOn, has_screen: isScreenSharing, stream: localStream || undefined }
            : p
        )
      );
    }
  }, [isMicOn, isVideoOn, isScreenSharing, isHuddleActive, localStream]);

  // Track speaking participant
  useEffect(() => {
    if (!isHuddleActive) {
      setSpeakingParticipants({});
      return;
    }
    const interval = setInterval(() => {
      const speaking: Record<string, boolean> = {};
      huddleParticipants.forEach((p) => {
        if (p.email === userSessionRef.current.email || p.name === 'Tú') {
          speaking['Tú'] = isMicOn && localVolume > 10;
          if (p.email) speaking[p.email] = isMicOn && localVolume > 10;
        } else if (p.has_mic) {
          const remoteStream = remoteStreamsRef.current.get(p.email);
          if (remoteStream && remoteStream.getAudioTracks().length > 0) {
            speaking[p.email] = true;
            speaking[p.name] = true;
          }
        }
      });
      setSpeakingParticipants(speaking);
    }, 1000);

    return () => clearInterval(interval);
  }, [isHuddleActive, huddleParticipants, isMicOn, localVolume]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      leaveHuddle();
    };
  }, [leaveHuddle]);

  const currentSpeaker = useMemo(() => {
    if (isScreenSharing && screenStream) {
      return { name: 'Tu Pantalla', isLocal: true, hasVideo: true, stream: screenStream };
    }
    if (isVideoOn && localStream) {
      return { name: userName || 'Tú', isLocal: true, hasVideo: true, stream: localStream };
    }

    // Check remote active video/screen speakers
    const remoteWithVideo = huddleParticipants.find(
      (p) => p.email !== userSessionRef.current.email && (p.has_video || p.has_screen)
    );
    if (remoteWithVideo) {
      const remoteStream = remoteStreams[remoteWithVideo.email] || remoteWithVideo.stream;
      if (remoteStream) {
        return {
          name: remoteWithVideo.name,
          isLocal: false,
          hasVideo: true,
          stream: remoteStream,
        };
      }
    }

    return { name: userName || 'Tú', isLocal: true, hasVideo: false, stream: null };
  }, [isScreenSharing, screenStream, isVideoOn, localStream, huddleParticipants, remoteStreams, userName]);

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
        remoteStreams,
        userEmail,
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
      remoteStreams: {},
      userEmail: '',
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
