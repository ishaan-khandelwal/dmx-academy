"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useTracks,
  useRoomContext,
  useParticipants,
  TrackToggle,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import LiveChat from "@/components/LiveChat";
import {
  Radio,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Users,
  Clock,
  StopCircle,
  ImagePlus,
  Sparkles,
  Wifi,
  WifiOff,
  AlertTriangle,
  Hand,
  XCircle,
} from "lucide-react";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

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
    <div className="flex items-center gap-2 text-sm font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
      <Clock size={14} />
      <span>{elapsed}</span>
    </div>
  );
}

// ─── Participant Counter ─────────────────────────────────────────────
function ViewerCount() {
  const participants = useParticipants();
  const viewerCount = Math.max(0, participants.length - 1); // Exclude the host

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}
    >
      <Users size={14} />
      <span>{viewerCount} viewer{viewerCount !== 1 ? "s" : ""}</span>
    </div>
  );
}

function DraggableVideo({ track, name, isLocal = false, defaultPosition = { x: 20, y: 20 }, alignLeft = false }) {
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
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white pointer-events-none">
        {name} {isLocal && "(You)"}
      </div>
    </div>
  );
}

// ─── Live Broadcasting Panel ─────────────────────────────────────────
function BroadcastPanel({ session, onEndSession }) {
  const room = useRoomContext();
  const [raisedHands, setRaisedHands] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [activeNotification, setActiveNotification] = useState(null);

  // Auto-dismiss the temporary raised hand notification after 4 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.isLocal
  );
  const localScreenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && t.participant?.isLocal
  );
  const speakingStudentCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.identity === activeSpeaker
  );

  const isLocalCameraActive = !!localCameraTrack?.publication?.track && !localCameraTrack?.publication?.isMuted;
  const isStudentCameraActive = !!speakingStudentCameraTrack?.publication?.track && !speakingStudentCameraTrack?.publication?.isMuted;

  const sendStateSync = () => {
    if (!room) return;
    const payload = {
      action: "SYNC_STATE",
      activeSpeaker,
      raisedHands,
    };
    const encoder = new TextEncoder();
    const encodedPayload = encoder.encode(JSON.stringify(payload));
    room.localParticipant.publishData(encodedPayload, {
      reliable: true,
      topic: "raise-hand-actions",
    });
  };

  const acceptSpeaker = (studentUsername) => {
    // Revoke previous speaker
    if (activeSpeaker) {
      revokeSpeaker();
    }
    setActiveSpeaker(studentUsername);
    setRaisedHands((prev) => prev.filter((u) => u !== studentUsername));

    if (room) {
      const payload = { action: "ACCEPT_SPEAKER", username: studentUsername };
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
        reliable: true,
        topic: "raise-hand-actions",
      });
    }
  };

  const rejectHand = (studentUsername) => {
    setRaisedHands((prev) => prev.filter((u) => u !== studentUsername));
    if (room) {
      const payload = { action: "DISMISS_HAND", username: studentUsername };
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
        reliable: true,
        topic: "raise-hand-actions",
      });
    }
  };

  const revokeSpeaker = () => {
    if (!activeSpeaker) return;
    const oldSpeaker = activeSpeaker;
    setActiveSpeaker(null);
    setRaisedHands((prev) => prev.filter((u) => u !== oldSpeaker));

    if (room) {
      const payload = { action: "REMOVE_SPEAKER", username: oldSpeaker };
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
        reliable: true,
        topic: "raise-hand-actions",
      });
    }
  };

  const clearAllHands = () => {
    setRaisedHands([]);
  };

  // Sync state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      sendStateSync();
    }, 3000);
    return () => clearInterval(interval);
  }, [room, activeSpeaker, raisedHands]);

  // Handle incoming data
  useEffect(() => {
    if (!room) return;

    const handleData = (payload, participant, block) => {
      const decoder = new TextDecoder();
      try {
        const data = JSON.parse(decoder.decode(payload));
        if (data.action === "RAISE_HAND") {
          setRaisedHands((prev) => {
            if (prev.includes(data.username)) return prev;
            return [...prev, data.username];
          });
          // Disabled to prevent annoying hand raise popups
          // setActiveNotification({ username: data.username });
        } else if (data.action === "LOWER_HAND") {
          setRaisedHands((prev) => prev.filter((u) => u !== data.username));
        } else if (data.action === "REMOVE_SPEAKER") {
          setActiveSpeaker((curr) => curr === data.username ? null : curr);
          setRaisedHands((prev) => prev.filter((u) => u !== data.username));
        } else if (data.action === "REQUEST_SYNC") {
          sendStateSync();
        }
      } catch (e) {
        console.error("Error parsing room data:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, activeSpeaker, raisedHands]);

  // Handle student disconnection
  useEffect(() => {
    if (!room) return;

    const handleParticipantDisconnected = (participant) => {
      const username = participant.identity;
      setRaisedHands((prev) => prev.filter((u) => u !== username));
      if (activeSpeaker === username) {
        setActiveSpeaker(null);
      }
    };

    room.on("participantDisconnected", handleParticipantDisconnected);
    return () => {
      room.off("participantDisconnected", handleParticipantDisconnected);
    };
  }, [room, activeSpeaker]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live indicator header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 text-red-500 text-xs font-extrabold uppercase tracking-wider">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </div>
          <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
            {session.title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SessionTimer startTime={session.startedAt} />
          <ViewerCount />
        </div>
      </div>

      {/* Video + Chat Side by Side */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Video Area (2/3) */}
        <div className="flex-1 lg:flex-[2] space-y-4">
          {/* Video Preview Area */}
          <div className="relative rounded-2xl overflow-hidden border shadow-2xl"
            style={{ backgroundColor: "#0a0a0f", borderColor: "var(--border-primary)", aspectRatio: "16/9" }}
          >
            {localScreenTrack?.publication?.track ? (
              <VideoTrack
                trackRef={localScreenTrack}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
                    <Radio size={40} className="text-indigo-400 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white">Broadcasting Studio</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Use the controls below to stream video, audio, or present your screen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Draggable Local Camera Preview */}
            {isLocalCameraActive && (
              <DraggableVideo
                track={localCameraTrack}
                name="You (Mentor)"
                isLocal={true}
                defaultPosition={{ x: 20, y: 20 }}
              />
            )}

            {/* Draggable Speaking Student Preview */}
            {isStudentCameraActive && (
              <DraggableVideo
                track={speakingStudentCameraTrack}
                name={activeSpeaker}
                isLocal={false}
                alignLeft={true}
              />
            )}

            {/* Connection status indicator */}
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-emerald-400">
                <Wifi size={10} />
                Connected
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl border"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <TrackToggle
              source={Track.Source.Microphone}
              className="p-3 rounded-xl border transition-all hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: "var(--bg-primary)", 
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)" 
              }}
            />
            <TrackToggle
              source={Track.Source.Camera}
              className="p-3 rounded-xl border transition-all hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: "var(--bg-primary)", 
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)" 
              }}
            />
            <TrackToggle
              source={Track.Source.ScreenShare}
              className="p-3 rounded-xl border transition-all hover:scale-105 cursor-pointer"
              style={{ 
                backgroundColor: "var(--bg-primary)", 
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)" 
              }}
            />

            <div className="w-px h-8 bg-slate-500/20 mx-2" />

            <button
              onClick={onEndSession}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-red-500/25 cursor-pointer"
            >
              <StopCircle size={16} />
              End Session
            </button>
          </div>
        </div>

        {/* Sidebar (1/3) */}
        <div className="lg:flex-1 lg:min-w-[300px] lg:max-w-[380px] flex flex-col gap-4">
          {/* Raised Hands Control Panel */}
          <div className="rounded-2xl border p-4 space-y-3"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Hand size={16} className="text-amber-500" />
                Hand Raises {raisedHands.length > 0 && `(${raisedHands.length})`}
              </h3>
              {raisedHands.length > 0 && (
                <button
                  onClick={clearAllHands}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {raisedHands.length === 0 ? (
              <p className="text-[11px] font-semibold py-2 text-center" style={{ color: "var(--text-muted)" }}>
                No active requests to speak.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {raisedHands.map((username) => (
                  <div
                    key={username}
                    className="flex items-center justify-between p-2 rounded-xl border"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}
                  >
                    <span className="text-xs font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                      {username}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptSpeaker(username)}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectHand(username)}
                        className="px-2 py-1 rounded border hover:bg-red-500/10 text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                        style={{ borderColor: "var(--border-primary)" }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSpeaker && (
              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border-primary)" }}>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Speaking Student</p>
                  <p className="text-xs font-black text-indigo-400">{activeSpeaker}</p>
                </div>
                <button
                  onClick={revokeSpeaker}
                  className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold transition-all cursor-pointer shadow-md shadow-red-500/25 flex items-center gap-1"
                >
                  <XCircle size={11} />
                  Mute Student
                </button>
              </div>
            )}
          </div>

          <LiveChat />
        </div>
      </div>

      {/* Play remote speaking student audio streams */}
      <RoomAudioRenderer />

      {/* Toast Notification for Hand Raises - Disabled to prevent annoying popups */}
    </div>
  );
}

// ─── Main Admin Live Page ────────────────────────────────────────────
export default function AdminLivePage() {
  const { user, token: authToken, API_BASE, activeSession, setActiveSession } = useAuth();
  const [livekitToken, setLivekitToken] = useState(null);
  const [session, setSession] = useState(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    thumbnailPreview: null,
    thumbnailUrl: "",
  });
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  const [pastSessions, setPastSessions] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);

  const fetchPastSessions = async () => {
    try {
      setLoadingPast(true);
      const res = await fetch(`${API_BASE}/api/livekit/sessions`);
      const data = await res.json();
      if (data.success && data.sessions) {
        // Filter only ended/past sessions
        const ended = data.sessions.filter((s) => !s.isLive && s.endedAt);
        setPastSessions(ended);
      }
    } catch (err) {
      console.error("Failed to fetch past sessions:", err);
    } finally {
      setLoadingPast(false);
    }
  };

  const handleDeleteSession = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this past broadcast? This cannot be undone.");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/livekit/session/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPastSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.message || "Failed to delete session.");
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Error connecting to server to delete session.");
    }
  };

  useEffect(() => {
    if (!session) {
      fetchPastSessions();
    }
  }, [session]);

  // Check for existing live session on mount
  useEffect(() => {
    async function checkActive() {
      try {
        const res = await fetch(`${API_BASE}/api/livekit/session/active`);
        const data = await res.json();
        if (data.success && data.session && data.session.hostId === user?.id) {
          setSession(data.session);
          setActiveSession(data.session);
          // Get a token for the existing session
          fetchToken(data.session.roomName);
        }
      } catch (e) {
        console.error("Failed to check active session:", e);
      }
    }
    if (user) checkActive();
  }, [user]);

  const fetchToken = async (roomName) => {
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
      console.error("Failed to fetch LiveKit token:", e);
    }
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for storage (simple approach)
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({
        ...prev,
        thumbnailPreview: reader.result,
        thumbnailUrl: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleStartSession = async () => {
    if (!formState.title.trim()) {
      setError("Session title is required.");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/livekit/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          thumbnailUrl: formState.thumbnailUrl,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to start session.");
        setIsStarting(false);
        return;
      }

      setSession(data.session);
      setActiveSession(data.session);
      await fetchToken(data.session.roomName);
    } catch (e) {
      setError("Network error. Is the backend running?");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    const confirmed = window.confirm("Are you sure you want to end this live session?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/livekit/session/${session.id}/end`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setSession(null);
        setActiveSession(null);
        setLivekitToken(null);
        setFormState({ title: "", description: "", thumbnailPreview: null, thumbnailUrl: "" });
      }
    } catch (e) {
      console.error("Failed to end session:", e);
    }
  };

  // ─── Pre-Session Form (Setup) ──────────────────────────────────────
  if (!session || !livekitToken) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <Radio size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                Go Live
              </h1>
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Start a live session for your students
              </p>
            </div>
          </div>
        </div>

        {/* Setup Form */}
        <div className="rounded-2xl border p-6 space-y-6 shadow-xl"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
        >
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Session Title *
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. DSA Masterclass — Trees & Graphs"
              className="w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
              id="session-title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Description
            </label>
            <textarea
              value={formState.description}
              onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of what you'll cover..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 resize-none"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
              id="session-description-input"
            />
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Thumbnail Image
            </label>
            <div className="flex items-start gap-4">
              <label
                htmlFor="thumbnail-upload"
                className="flex flex-col items-center justify-center w-40 h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5"
                style={{ borderColor: "var(--border-primary)" }}
              >
                {formState.thumbnailPreview ? (
                  <img
                    src={formState.thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <ImagePlus size={20} className="mx-auto" style={{ color: "var(--text-muted)" }} />
                    <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                      Upload Image
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  id="thumbnail-upload"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] leading-relaxed pt-1" style={{ color: "var(--text-muted)" }}>
                Optional thumbnail that students will see before joining. Recommended: 16:9 aspect ratio.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Go Live Button */}
          <button
            onClick={handleStartSession}
            disabled={isStarting || !formState.title.trim()}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white text-sm font-extrabold uppercase tracking-wider transition-all hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 8px 32px rgba(239, 68, 68, 0.3)",
            }}
            id="go-live-btn"
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting Session...
              </>
            ) : (
              <>
                <Radio size={18} />
                Go Live Now
              </>
            )}
          </button>
        </div>

        {/* LiveKit Status Info */}
        <div className="flex items-center gap-2 p-3 rounded-xl border text-[10px] font-semibold"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
        >
          <Sparkles size={12} style={{ color: "var(--text-accent)" }} />
          Powered by LiveKit — Students will see your camera, microphone, and screen share in real-time.
        </div>

        {/* Past Broadcasts List */}
        <div className="space-y-4 pt-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
              Past Broadcasts
            </h2>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Manage and delete your previously ended live sessions
            </p>
          </div>

          {loadingPast ? (
            <div className="flex items-center justify-center p-6 border border-dashed rounded-2xl"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-2xl text-center space-y-2"
              style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-card)" }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>No past broadcasts found</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Your ended broadcasts will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pastSessions.map((past) => (
                <div
                  key={past.id}
                  className="flex items-center justify-between p-4 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {past.thumbnailUrl ? (
                      <img
                        src={past.thumbnailUrl}
                        alt=""
                        className="w-14 h-9 rounded-lg object-cover bg-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border"
                        style={{ borderColor: "var(--border-primary)" }}
                      >
                        <Radio size={14} style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-black truncate" style={{ color: "var(--text-primary)" }}>
                        {past.title}
                      </h4>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                        Started {new Date(past.startedAt).toLocaleString()} • Duration: {
                          past.endedAt 
                            ? `${Math.round((new Date(past.endedAt) - new Date(past.startedAt)) / 60000)} mins`
                            : "Unknown"
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSession(past.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 text-[10px] font-bold uppercase tracking-wider cursor-pointer shrink-0"
                    title="Delete past broadcast"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Active Session (Broadcasting) ─────────────────────────────────
  return (
    <div className="space-y-6">
      {LIVEKIT_URL ? (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={livekitToken}
          connect={true}
          video={true}
          audio={true}
          style={{ height: "auto" }}
        >
          <BroadcastPanel session={session} onEndSession={handleEndSession} />
        </LiveKitRoom>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border text-center space-y-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
        >
          <WifiOff size={48} className="opacity-30" style={{ color: "var(--text-muted)" }} />
          <div className="space-y-1">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>LiveKit Not Configured</h3>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Set the <code className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">NEXT_PUBLIC_LIVEKIT_URL</code> environment variable to connect.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
