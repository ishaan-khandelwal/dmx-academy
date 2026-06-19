"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Clock,
  CalendarDays,
  ArrowRight,
  Users,
  Play,
  CheckCircle2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

// ─── Helper: Format date/time nicely ─────────────────────────────────
function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(start, end) {
  if (!start || !end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ─── Live Now Banner (pulsing card) ──────────────────────────────────
function LiveNowBanner({ session }) {
  return (
    <Link
      href="/live"
      className="group block w-full rounded-lg border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))",
        borderColor: "rgba(239,68,68,0.25)",
      }}
      id="live-now-banner"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center border-b border-red-500/10">
        {session.thumbnailUrl ? (
          <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Radio size={36} className="text-red-500 animate-pulse" />
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE NOW
        </div>
        {session.host && (
          <div className="absolute bottom-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950/70 text-slate-200 backdrop-blur-sm">
            by {session.host.username}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-black leading-snug group-hover:text-red-500 transition-colors" style={{ color: "var(--text-primary)" }}>
          {session.title}
        </h3>
        {session.description && (
          <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {session.description}
          </p>
        )}
        
        {/* Join button */}
        <div className="pt-1">
          <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-red-500 text-white text-[10px] font-extrabold uppercase tracking-wider group-hover:bg-red-600 transition-colors shadow-md shadow-red-500/10">
            <Play size={12} />
            Join Stream
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Past Session Card (vertical card) ───────────────────────────────
function PastSessionCard({ session }) {
  return (
    <div
      className="group flex flex-col rounded-lg border overflow-hidden transition-all hover:shadow-md"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900/30 flex items-center justify-center border-b" style={{ borderColor: "var(--border-primary)" }}>
        {session.thumbnailUrl ? (
          <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover opacity-80" />
        ) : (
          <CheckCircle2 size={24} style={{ color: "var(--text-accent)" }} />
        )}
        {session.host && (
          <div className="absolute bottom-2.5 left-2.5 text-[8px] font-bold px-1.5 py-0.5 rounded border bg-slate-950/60 backdrop-blur-sm text-slate-300"
            style={{ borderColor: "var(--border-primary)" }}
          >
            {session.host.username}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold line-clamp-2 leading-snug" style={{ color: "var(--text-primary)" }}>
            {session.title}
          </h4>
          {session.description && (
            <p className="text-[10px] line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {session.description}
            </p>
          )}
        </div>
        
        {/* Metadata footer */}
        <div className="flex items-center gap-2.5 text-[9px] font-semibold pt-2 border-t" style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1">
            <CalendarDays size={10} />
            {formatDateTime(session.startedAt)}
          </span>
          {session.endedAt && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(session.startedAt, session.endedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main LiveBanner Component ───────────────────────────────────────
export default function LiveBanner() {
  const [activeSession, setActiveSession] = useState(null);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    // Poll for active session every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      // Fetch active session
      const activeRes = await fetch(`${API_BASE}/api/livekit/session/active`);
      const activeData = await activeRes.json();

      if (activeData.success && activeData.session) {
        setActiveSession(activeData.session);
      } else {
        setActiveSession(null);
      }

      // Fetch all sessions for past sessions display
      const allRes = await fetch(`${API_BASE}/api/livekit/sessions`);
      const allData = await allRes.json();

      if (allData.success && allData.sessions) {
        // Filter only ended sessions (not live)
        const ended = allData.sessions.filter((s) => !s.isLive && s.endedAt);
        setPastSessions(ended.slice(0, 6)); // Show last 6
      }
    } catch (e) {
      // Silently fail — the banner just won't show if backend is down
      console.error("LiveBanner: Failed to fetch sessions", e);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything while loading
  if (loading) return null;

  const noSessions = !activeSession && pastSessions.length === 0;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 relative z-40">
      {/* Section Header */}
      <div className="space-y-1 text-center md:text-left">
        <h2 className="text-2xl font-black font-display tracking-tight text-gradient">
          Live Classes & Speedruns
        </h2>
        <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          Join live developer sessions, watch past streams, and learn in flow state.
        </p>
      </div>

      {noSessions ? (
        <div className="w-full rounded-lg border p-8 text-center space-y-4 max-w-md mx-auto"
          style={{ 
            backgroundColor: "var(--bg-card)", 
            borderColor: "var(--border-primary)",
            background: "linear-gradient(135deg, var(--bg-card), rgba(99,102,241,0.02))"
          }}
        >
          <div className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center bg-slate-500/10 text-slate-400">
            <Radio size={24} className="opacity-60" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              No Active or Past Broadcasts
            </h3>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              There are no live streaming sessions or recorded broadcasts at the moment. Keep checkin' back!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Active Session Card */}
          {activeSession && (
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Active Live Session
              </div>
              <LiveNowBanner session={activeSession} />
            </div>
          )}

          {/* Past Sessions Grid */}
          {pastSessions.length > 0 && (
            <div className={activeSession ? "md:col-span-2 space-y-3" : "md:col-span-3 space-y-3"}>
              <div className="flex items-center gap-2">
                <CalendarDays size={14} style={{ color: "var(--text-accent)" }} />
                <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Past Broadcasts
                </h3>
              </div>
              <div className={`grid gap-4 ${activeSession ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                {pastSessions.map((session) => (
                  <PastSessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
}
