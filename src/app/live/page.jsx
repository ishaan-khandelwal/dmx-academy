"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useRoomContext,
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

// ─── Video Player Panel ──────────────────────────────────────────────
function VideoPlayer({ session }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  // Find the host's tracks (remote participant who is publishing)
  const screenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && !t.participant?.isLocal
  );
  const cameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && !t.participant?.isLocal
  );

  const primaryTrack = screenTrack || cameraTrack;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="space-y-4">
      {/* Video Container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden border shadow-2xl bg-black"
        style={{ borderColor: "var(--border-primary)", aspectRatio: "16/9" }}
      >
        {primaryTrack?.publication?.track ? (
          <VideoTrack
            trackRef={primaryTrack}
            style={{ width: "100%", height: "100%", objectFit: screenTrack ? "contain" : "cover" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <UserIcon size={32} className="text-white/20" />
              </div>
              <p className="text-sm font-semibold text-white/40">
                Waiting for host to share video...
              </p>
            </div>
          </div>
        )}

        {/* PIP: Camera when screen sharing */}
        {screenTrack?.publication?.track && cameraTrack?.publication?.track && (
          <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <VideoTrack
              trackRef={cameraTrack}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        {/* Overlay Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Live Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              <SessionTimer startTime={session.startedAt} />
              <ViewerCount />
            </div>

            <div className="flex items-center gap-2">
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
        </div>

        {/* Live indicator top-left */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white/80 flex items-center gap-1.5">
            <Radio size={10} className="text-red-400" />
            {session.host?.username || "Host"}
          </div>
        </div>
      </div>

      {/* Session Info */}
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

  useEffect(() => {
    checkActiveSession();
  }, []);

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
            audio={true}
            video={false}
            style={{ height: "auto" }}
          >
            <div className="flex gap-4 flex-col lg:flex-row">
              {/* Video + Session Info (2/3) */}
              <div className="flex-1 lg:flex-[2]">
                <VideoPlayer session={session} />
              </div>
              {/* Chat Sidebar (1/3) */}
              <div className="lg:flex-1 lg:min-w-[280px] lg:max-w-[350px]">
                <LiveChat />
              </div>
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
