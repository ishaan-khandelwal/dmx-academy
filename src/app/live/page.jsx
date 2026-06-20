"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  TrackToggle,
  useTracks,
  useParticipants,
  useRoomContext,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import Navbar from "@/components/Navbar";
import {
  Radio,
  Users,
  Clock,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  WifiOff,
  CalendarOff,
  ArrowLeft,
  User as UserIcon,
  Hand,
  Mic,
  Camera,
  XCircle,
  X,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import LiveChat from "@/components/LiveChat";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_BASE_FALLBACK = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// ─── Session Timer ───────────────────────────────────────────────────
function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const hrs = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${hrs}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
      <Clock size={12} />
      <span>{elapsed}</span>
    </div>
  );
}

// ─── Viewer Count ────────────────────────────────────────────────────
function ViewerCount() {
  const participants = useParticipants();
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
      <Users size={12} />
      <span>{participants.length} watching</span>
    </div>
  );
}

// ─── Draggable Video ─────────────────────────────────────────────────
function DraggableVideo({ track, name, isLocal = false, defaultPosition = { x: 20, y: 20 }, alignLeft = false, onClose = null }) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const boxRef = React.useRef(null);

  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    handleStart(e.clientX, e.clientY);
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      
      const parent = boxRef.current?.parentElement;
      let newX = clientX - dragStart.x;
      let newY = clientY - dragStart.y;

      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const boxRect = boxRef.current.getBoundingClientRect();
        const maxX = parentRect.width - boxRect.width;
        newX = Math.max(0, Math.min(newX, maxX));
        const maxY = parentRect.height - boxRect.height;
        newY = Math.max(0, Math.min(newY, maxY));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStart]);

  // Set default initial position on mount
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (parent && position.x === defaultPosition.x && position.y === defaultPosition.y) {
      const parentRect = parent.getBoundingClientRect();
      const x = alignLeft ? 20 : parentRect.width - 210;
      const y = parentRect.height - 162; // 144 (h-36) + 18
      setPosition({ x: Math.max(20, x), y: Math.max(20, y) });
    }
  }, [alignLeft, defaultPosition]);

  return (
    <div
      ref={boxRef}
      className="absolute z-50 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/90 cursor-move select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none"
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <VideoTrack trackRef={track} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      
      {/* Hide camera button */}
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute top-2.5 right-2.5 z-10 p-1 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-colors cursor-pointer flex items-center justify-center border border-white/5 shadow-inner"
          title="Hide Mentor Camera"
        >
          <X size={10} />
        </button>
      )}

      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white pointer-events-none">
        {name} {isLocal && "(You)"}
      </div>
    </div>
  );
}

function VideoPlayer({
  session,
  isFullscreen,
  toggleFullscreen,
  activeSpeaker,
  setActiveSpeaker,
  isHandRaised,
  setIsHandRaised,
  raisedHands,
  setRaisedHands,
  isSidebarOpen,
  setIsSidebarOpen,
  onSessionEnded,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isHostCameraHiddenLocal, setIsHostCameraHiddenLocal] = useState(false);
  const containerRef = React.useRef(null);

  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    let timeoutId;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isFullscreen]);

  const room = useRoomContext();
  const { user } = useAuth();
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);

  useEffect(() => {
    if (!room) return;

    const handleDisconnected = async () => {
      // Delay check slightly to let database write finish if server kicked us
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const res = await fetch(`${API_BASE_FALLBACK}/api/livekit/session/active`);
        const data = await res.json();
        if (!data.session) {
          if (onSessionEnded) onSessionEnded();
        } else {
          // Double check after another second
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const res2 = await fetch(`${API_BASE_FALLBACK}/api/livekit/session/active`);
          const data2 = await res2.json();
          if (!data2.session && onSessionEnded) {
            onSessionEnded();
          }
        }
      } catch (e) {
        if (onSessionEnded) onSessionEnded();
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, onSessionEnded]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Find host's screen share
  const hostScreenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && t.participant?.identity === session.host?.username
  );

  // Find host's camera
  const hostCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.identity === session.host?.username
  );

  // Find speaking student's camera (either remote or local)
  const speakingStudentCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.identity === activeSpeaker
  );

  const isHostCameraActive = !!hostCameraTrack?.publication?.track && !hostCameraTrack?.publication?.isMuted;
  const isStudentCameraActive = !!speakingStudentCameraTrack?.publication?.track && !speakingStudentCameraTrack?.publication?.isMuted;

  const sendData = (payloadObj) => {
    if (!room) return;
    const encoder = new TextEncoder();
    const payload = encoder.encode(JSON.stringify(payloadObj));
    room.localParticipant.publishData(payload, {
      reliable: true,
      topic: "raise-hand-actions"
    });
  };

  const toggleRaiseHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    sendData({
      action: newState ? "RAISE_HAND" : "LOWER_HAND",
      username: user?.username
    });
  };

  const stopSpeaking = () => {
    setIsHandRaised(false);
    setActiveSpeaker(null);
    setShowAcceptedModal(false);
    if (room) {
      room.localParticipant.setMicrophoneEnabled(false);
      room.localParticipant.setCameraEnabled(false);
    }
    sendData({
      action: "REMOVE_SPEAKER",
      username: user?.username
    });
  };

  useEffect(() => {
    if (!room) return;

    const handleData = (payload, participant, block) => {
      const decoder = new TextDecoder();
      try {
        const data = JSON.parse(decoder.decode(payload));
        if (data.action === "ACCEPT_SPEAKER") {
          setActiveSpeaker(data.username);
          if (data.username === user?.username) {
            setShowAcceptedModal(true);
          }
        } else if (data.action === "REMOVE_SPEAKER") {
          if (activeSpeaker === data.username || data.username === activeSpeaker) {
            setActiveSpeaker(null);
          }
          if (data.username === user?.username) {
            setIsHandRaised(false);
            room.localParticipant.setMicrophoneEnabled(false);
            room.localParticipant.setCameraEnabled(false);
          }
        } else if (data.action === "DISMISS_HAND") {
          if (data.username === user?.username) {
            setIsHandRaised(false);
          }
        } else if (data.action === "SYNC_STATE") {
          setActiveSpeaker(data.activeSpeaker);
          setRaisedHands(data.raisedHands || []);
          
          // If sync says I'm not active speaker, disable my feeds and hand raise
          if (data.activeSpeaker !== user?.username) {
            if (activeSpeaker === user?.username) {
              setIsHandRaised(false);
            }
            room.localParticipant.setMicrophoneEnabled(false);
            room.localParticipant.setCameraEnabled(false);
          }
        }
      } catch (e) {
        console.error("Error parsing room message:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);

    const timer = setTimeout(() => {
      sendData({ action: "REQUEST_SYNC", username: user?.username });
    }, 1500);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      clearTimeout(timer);
    };
  }, [room, activeSpeaker, user]);

  const renderControls = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {/* Live Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>

        {/* Session Title & Taker */}
        <div className="flex flex-col min-w-0 mr-1.5">
          <span className="text-[11px] font-black text-white truncate max-w-[140px] sm:max-w-[220px]" title={session.title}>
            {session.title}
          </span>
          <span className="text-[9px] font-bold text-slate-400 truncate">
            by {session.host?.username || "Mentor"}
          </span>
        </div>

        <div className="w-px h-6 bg-white/10 shrink-0 hidden sm:block" />

        <SessionTimer startTime={session.startedAt} />
        <ViewerCount />
      </div>

      <div className="flex items-center gap-2">
        {/* Restore Mentor Camera Button */}
        {isHostCameraActive && isHostCameraHiddenLocal && (
          <button
            onClick={() => setIsHostCameraHiddenLocal(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white text-[10px] font-bold uppercase transition-all cursor-pointer mr-1.5 shadow-md shadow-indigo-650/20 border border-indigo-500/20"
            title="Restore Mentor Camera Feed"
          >
            <Camera size={12} />
            <span>Show Mentor Cam</span>
          </button>
        )}
        {/* Active Speaker Controls */}
        {activeSpeaker === user?.username ? (
          <div className="flex items-center gap-1.5 bg-indigo-500/10 p-1 rounded-full border border-indigo-500/20 mr-2">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Stage
            </div>
            <TrackToggle
              source={Track.Source.Microphone}
              className="!w-8 !h-8 !rounded-full !flex !items-center !justify-center bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer !p-0 border border-white/10"
            />
            <TrackToggle
              source={Track.Source.Camera}
              className="!w-8 !h-8 !rounded-full !flex !items-center !justify-center bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer !p-0 border border-white/10"
            />
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1 py-1.5 px-3 rounded-full bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md shadow-red-600/20 border border-red-500/20"
              id="stop-speaking-btn"
            >
              <XCircle size={12} />
              <span>End</span>
            </button>
          </div>
        ) : (
          /* Raise Hand Button */
          <button
            onClick={toggleRaiseHand}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer mr-2 ${
              isHandRaised
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            id="raise-hand-btn"
          >
            <Hand size={14} className={isHandRaised ? "animate-bounce" : ""} />
            <span>{isHandRaised ? "Hand Raised" : "Raise Hand"}</span>
          </button>
        )}

        {/* Sidebar/Chat Toggle (visible in fullscreen) */}
        {isFullscreen && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isSidebarOpen
                ? "bg-indigo-650 hover:bg-indigo-700 text-white border border-indigo-500/40"
                : "bg-white/10 hover:bg-white/20 text-white border border-transparent"
            }`}
            title={isSidebarOpen ? "Close Chat & Hands" : "Open Chat & Hands"}
          >
            <MessageSquare size={16} />
          </button>
        )}

        {/* Mute Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          id="viewer-mute-btn"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          id="viewer-fullscreen-btn"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className={isFullscreen ? "relative h-full w-full overflow-hidden bg-black flex flex-col justify-between" : "space-y-3"}>
      {/* Video Container */}
      <div
        ref={containerRef}
        className={isFullscreen ? "h-full w-full border-none rounded-none bg-black min-h-0 flex-1 relative" : "relative rounded-2xl overflow-hidden border shadow-2xl bg-black"}
        style={isFullscreen ? {} : {
          borderColor: "var(--border-primary)",
          aspectRatio: "16/9",
        }}
      >
        {hostScreenTrack?.publication?.track ? (
          <VideoTrack
            trackRef={hostScreenTrack}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
                <Radio size={40} className="text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">Live Classroom Board</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {session.title || "Waiting for host to present..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Draggable Host Camera */}
        {isHostCameraActive && !isHostCameraHiddenLocal && (
          <DraggableVideo
            track={hostCameraTrack}
            name={session.host?.username || "Mentor"}
            isLocal={hostCameraTrack.participant?.isLocal}
            onClose={() => setIsHostCameraHiddenLocal(true)}
          />
        )}

        {/* Draggable Speaking Student Camera */}
        {isStudentCameraActive && (
          <DraggableVideo
            track={speakingStudentCameraTrack}
            name={activeSpeaker}
            isLocal={speakingStudentCameraTrack.participant?.isLocal}
            alignLeft={true}
          />
        )}

        {/* Active Speaker HUD Banner */}
        {activeSpeaker && (
          <div className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-xl bg-indigo-600/90 text-white text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm border border-indigo-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Active Speaker: <strong className="font-extrabold">{activeSpeaker}</strong></span>
          </div>
        )}

        {/* Live indicator top-left */}
        {!isFullscreen && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white/80 flex items-center gap-1.5">
              <Radio size={10} className="text-red-400" />
              {session.host?.username || "Host"}
            </div>
          </div>
        )}
      </div>

      {/* Controls displayed below the shared screen in normal mode, or overlayed on hover in fullscreen */}
      <div 
        className={
          isFullscreen 
            ? `absolute bottom-6 left-6 right-6 z-50 p-3.5 bg-[#0a0b10]/95 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 shadow-2xl ${
                showControls ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
              }`
            : "p-3.5 bg-[#0a0b10] border border-white/5 rounded-2xl"
        }
      >
        {renderControls()}
      </div>

      {/* Play remote user audio streams */}
      <RoomAudioRenderer muted={isMuted} />

      {/* Session Info */}
      {!isFullscreen && (
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
        >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
              {session.title}
            </h1>
            {session.description && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {session.description}
              </p>
            )}
          </div>

          {session.host && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-extrabold flex items-center justify-center text-[10px]">
                {session.host.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {session.host.username}
                </p>
                <p className="text-[8px] font-bold uppercase" style={{ color: "var(--text-accent)" }}>
                  {session.host.role}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Speaker Acceptance Modal popup */}
      {showAcceptedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div 
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl text-center space-y-6"
            style={{ 
              backgroundColor: "var(--bg-card)", 
              borderColor: "var(--border-accent)",
              backgroundImage: "linear-gradient(to bottom right, var(--bg-card), rgba(99, 102, 241, 0.05))"
            }}
          >
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Mic size={32} className="animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Speak Request Approved!
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                The mentor has accepted your request to speak. Please turn on your microphone to begin. Camera sharing is optional.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  room?.localParticipant?.setMicrophoneEnabled(true);
                  setShowAcceptedModal(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl text-white font-extrabold text-xs uppercase tracking-wider transition-all hover:scale-102 cursor-pointer shadow-md shadow-indigo-500/20"
                style={{ backgroundColor: "var(--text-accent)" }}
              >
                Turn on Mic
              </button>
              <button
                onClick={() => {
                  room?.localParticipant?.setMicrophoneEnabled(true);
                  room?.localParticipant?.setCameraEnabled(true);
                  setShowAcceptedModal(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl border transition-all hover:scale-102 text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                style={{ 
                  backgroundColor: "var(--bg-primary)", 
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)"
                }}
              >
                Turn on Mic & Cam
              </button>
            </div>
            
            <button
              onClick={() => setShowAcceptedModal(false)}
              className="text-[10px] font-bold underline transition-colors hover:text-indigo-400"
              style={{ color: "var(--text-muted)" }}
            >
              Configure manually later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Live Viewer Page ───────────────────────────────────────────
export default function LiveViewerPage() {
  const { user, token: authToken } = useAuth();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || API_BASE_FALLBACK;
  const [session, setSession] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = React.useRef(null);

  // States for raise hand (lifted up for student sidebar visibility)
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);

  const toggleFullscreen = () => {
    if (!workspaceRef.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen?.()
        .then(() => {
          setIsFullscreen(true);
          setIsSidebarOpen(false); // Closed by default in fullscreen mode
        })
        .catch(err => console.error(err));
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
      setIsSidebarOpen(true); // Re-open by default when exiting fullscreen
    }
  };

  useEffect(() => {
    const handler = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (isCurrentlyFullscreen) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    checkActiveSession();

    // Set up polling interval to check if session has ended
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/livekit/session/active`);
        const data = await res.json();
        if (data.success) {
          if (!data.session) {
            // No active session anymore
            setSessionEnded(true);
          } else if (session && data.session.id !== session.id) {
            // A different session is active now, meaning the previous one ended
            setSessionEnded(true);
          }
        }
      } catch (e) {
        console.error("Polling check failed:", e);
      }
    }, 4000); // Check every 4 seconds

    return () => clearInterval(interval);
  }, [session, API_BASE]);

  const checkActiveSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/livekit/session/active`);
      const data = await res.json();

      if (data.success && data.session) {
        setSession(data.session);

        // If user is logged in, get a viewer token
        if (authToken) {
          await fetchViewerToken(data.session.roomName);
        }
      }
    } catch (e) {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchViewerToken = async (roomName) => {
    try {
      const res = await fetch(`${API_BASE}/api/livekit/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      if (data.success) {
        setLivekitToken(data.token);
      }
    } catch (e) {
      console.error("Failed to get viewer token:", e);
    }
  };

  // ─── Session Ended State ───────────────────────────────────────────
  if (sessionEnded) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center min-h-[70vh] p-4">
          <div 
            className="w-full max-w-lg rounded-3xl p-8 border shadow-2xl text-center space-y-6 animate-fade-in"
            style={{ 
              backgroundColor: "var(--bg-card)", 
              borderColor: "var(--border-primary)",
              backgroundImage: "linear-gradient(to bottom right, var(--bg-card), rgba(99, 102, 241, 0.02))"
            }}
          >
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Radio size={40} className="text-indigo-400" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                This Session Has Ended
              </h1>
              <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                The live broadcast for <strong className="text-[var(--text-primary)] font-extrabold">{session?.title || "this class"}</strong> has finished. Thank you for participating and learning with us!
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-xs font-extrabold uppercase tracking-wider transition-all hover:scale-105 shadow-lg cursor-pointer"
                style={{
                  background: "var(--accent-gradient)",
                }}
              >
                <ArrowLeft size={14} />
                Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 rounded-full border-t-transparent animate-spin mx-auto"
              style={{ borderColor: "var(--text-accent)" }}
            />
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Checking for live sessions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── No Active Session ─────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="max-w-md text-center space-y-6 p-8">
            <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
              style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}
            >
              <CalendarOff size={36} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                No Live Session Right Now
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                There are no active live sessions at the moment. Check back later or watch for the
                &quot;Live Now&quot; banner on the homepage.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-105"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
            >
              <ArrowLeft size={14} />
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Not Logged In ─────────────────────────────────────────────────
  if (!authToken || !user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="max-w-md text-center space-y-6 p-8 rounded-2xl border shadow-xl"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 text-red-500 text-xs font-extrabold uppercase tracking-wider mx-auto w-fit">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE NOW
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                {session.title}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Sign in to watch this live session.
              </p>
            </div>
            <Link
              href="/login?redirect=/live"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--text-accent), #6366f1)",
                boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
              }}
            >
              Sign In to Watch
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Watching Live ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>

        {LIVEKIT_URL && livekitToken ? (
          <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={livekitToken}
            connect={true}
            audio={false}
            video={false}
            style={{ height: "auto" }}
          >
            <div 
              ref={workspaceRef} 
              className={`flex flex-col lg:flex-row ${isFullscreen ? "h-screen w-screen bg-black" : "gap-4"}`}
              style={isFullscreen ? { display: "flex", flexDirection: "row" } : {}}
            >
              {/* Video + Session Info (2/3) */}
              <div className={isFullscreen ? "flex-[3] h-full relative" : "flex-1 lg:flex-[2]"}>
                <VideoPlayer 
                  session={session} 
                  isFullscreen={isFullscreen} 
                  toggleFullscreen={toggleFullscreen} 
                  activeSpeaker={activeSpeaker}
                  setActiveSpeaker={setActiveSpeaker}
                  isHandRaised={isHandRaised}
                  setIsHandRaised={setIsHandRaised}
                  raisedHands={raisedHands}
                  setRaisedHands={setRaisedHands}
                  isSidebarOpen={isSidebarOpen}
                  setIsSidebarOpen={setIsSidebarOpen}
                  onSessionEnded={() => setSessionEnded(true)}
                />
              </div>
              {/* Chat Sidebar (1/3) */}
              {(!isFullscreen || isSidebarOpen) && (
                <div className={`flex flex-col gap-4 ${isFullscreen ? "w-[360px] h-full bg-[#0a0a0f]/95 border-l border-white/10 p-4 backdrop-blur-md shadow-2xl shrink-0" : "lg:flex-1 lg:min-w-[280px] lg:max-w-[350px]"}`}>
                  {/* Fullscreen Sidebar Header */}
                  {isFullscreen && (
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Live Chat & Stage</span>
                      <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 rounded-lg hover:bg-white/5 text-white transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-white/5"
                        title="Close Sidebar"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {/* Raised Hands / Speaker Panel */}
                  <div className="rounded-2xl border p-4 space-y-3"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        <Hand size={14} className="text-amber-500" />
                        Hand Raises {raisedHands.length > 0 && `(${raisedHands.length})`}
                      </h3>
                    </div>

                    {raisedHands.length === 0 ? (
                      <p className="text-[10px] font-semibold py-2 text-center" style={{ color: "var(--text-muted)" }}>
                        No active requests to speak.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {raisedHands.map((username) => (
                          <div
                            key={username}
                            className="flex items-center gap-2 p-2 rounded-xl border"
                            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span className="text-xs font-bold font-mono truncate" style={{ color: "var(--text-primary)" }}>
                              {username}
                            </span>
                            {username === user?.username && (
                              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase ml-auto tracking-wider">
                                You
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeSpeaker && (
                      <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border-primary)" }}>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>Speaking Student</p>
                          <p className="text-xs font-black text-indigo-400">{activeSpeaker}</p>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[9px] font-black uppercase tracking-wider select-none border border-indigo-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          On Stage
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <LiveChat className="h-full" />
                  </div>
                </div>
              )}
            </div>
          </LiveKitRoom>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border text-center space-y-4"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <WifiOff size={48} className="opacity-30" style={{ color: "var(--text-muted)" }} />
            <div className="space-y-1">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Unable to Connect
              </h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                LiveKit connection is not available. Please try again later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
