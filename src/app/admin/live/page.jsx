"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useRoomContext,
  useParticipants,
  TrackToggle,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
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

// ─── Live Broadcasting Panel ─────────────────────────────────────────
function BroadcastPanel({ session, onEndSession }) {
  const room = useRoomContext();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const cameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.isLocal
  );
  const screenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && t.participant?.isLocal
  );

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
            {screenTrack?.publication?.track ? (
              <VideoTrack
                trackRef={screenTrack}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : cameraTrack?.publication?.track ? (
              <VideoTrack
                trackRef={cameraTrack}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div className="space-y-3">
                  <CameraOff size={48} className="mx-auto opacity-30" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                    Camera is off. Enable it using the controls below.
                  </p>
                </div>
              </div>
            )}

            {/* Floating camera PIP when screen sharing */}
            {screenTrack?.publication?.track && cameraTrack?.publication?.track && (
              <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <VideoTrack
                  trackRef={cameraTrack}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
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

        {/* Chat Sidebar (1/3) */}
        <div className="lg:flex-1 lg:min-w-[300px] lg:max-w-[380px]">
          <LiveChat />
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Live Page ────────────────────────────────────────────
export default function AdminLivePage() {
  const { user, token: authToken, API_BASE } = useAuth();
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

  // Check for existing live session on mount
  useEffect(() => {
    async function checkActive() {
      try {
        const res = await fetch(`${API_BASE}/api/livekit/session/active`);
        const data = await res.json();
        if (data.success && data.session && data.session.hostId === user?.id) {
          setSession(data.session);
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
