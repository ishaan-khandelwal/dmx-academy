"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Clock, Trophy, ChevronRight, Calendar,
  BarChart2, AlertCircle, BookOpen, Sparkles, Target
} from "lucide-react";

export default function VivaHistoryPage() {
  const { user, token, API_BASE } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "ADMIN" ? "ADMIN" : "USER" })
  });

  useEffect(() => {
    if (!user) return;
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/viva/history`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.sessions || []);
      } else {
        setError(data.message || "Failed to load viva history.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (pct) =>
    pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";

  const getScoreGradient = (pct) =>
    pct >= 80
      ? "linear-gradient(135deg, #10b981, #34d399)"
      : pct >= 50
      ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
      : "linear-gradient(135deg, #f43f5e, #fb7185)";

  const getScoreLabel = (pct) =>
    pct >= 80 ? "Outstanding" : pct >= 50 ? "Good" : "Needs Review";

  // Stats summary
  const completedSessions = sessions.filter(s => s.status === "COMPLETED");
  const avgScore = completedSessions.length
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / completedSessions.length)
    : 0;
  const bestScore = completedSessions.length
    ? Math.max(...completedSessions.map(s => s.totalScore ?? 0))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "var(--text-accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <Brain size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-accent)" }}>
              AI Viva
            </span>
          </div>
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>
            Session History
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Review your past viva sessions and track your progress.
          </p>
        </div>
        <Link
          href="/student/viva"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105"
          style={{ background: "var(--accent-gradient)" }}
        >
          <Sparkles size={15} />
          <span>New Session</span>
        </Link>
      </div>

      {/* Stats Cards */}
      {completedSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Sessions", value: sessions.length, icon: BookOpen, color: "indigo" },
            { label: "Average Score", value: `${avgScore}%`, icon: BarChart2, color: "violet" },
            { label: "Best Score", value: `${bestScore}%`, icon: Trophy, color: "amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-5 rounded-3xl border flex items-center space-x-4"
                 style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
              <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-500`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{value}</p>
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={18} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 && !error ? (
        <div className="p-12 rounded-3xl border border-dashed text-center space-y-4"
             style={{ borderColor: "var(--border-primary)" }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
               style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
            <Brain size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>No sessions yet</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Start your first AI Viva session to see your results here.
            </p>
          </div>
          <Link
            href="/student/viva"
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full font-bold text-sm text-white"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Sparkles size={14} />
            <span>Start Now</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {sessions.length} Session{sessions.length !== 1 ? "s" : ""} — Newest First
            </h2>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => {
              const pct = session.totalScore ?? 0;
              const isCompleted = session.status === "COMPLETED";
              const scoreColor = getScoreColor(pct);
              const scoreGradient = getScoreGradient(pct);

              return (
                <Link
                  key={session.id}
                  href={`/student/viva/result/${session.id}`}
                  className="group flex items-center justify-between p-5 rounded-3xl border transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
                >
                  {/* Left: Score + Info */}
                  <div className="flex items-center space-x-4">
                    {/* Score Circle */}
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                        <circle cx="28" cy="28" r="22" fill="none"
                                stroke="currentColor" strokeWidth="5"
                                style={{ color: "var(--border-primary)", opacity: 0.4 }} />
                        {isCompleted && (
                          <circle cx="28" cy="28" r="22" fill="none"
                                  strokeWidth="5"
                                  strokeDasharray={`${2 * Math.PI * 22}`}
                                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                                  strokeLinecap="round"
                                  style={{
                                    stroke: scoreColor,
                                    transition: "stroke-dashoffset 0.8s ease"
                                  }} />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black"
                              style={{ color: isCompleted ? scoreColor : "var(--text-muted)" }}>
                          {isCompleted ? `${pct}%` : "--"}
                        </span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">
                          {session.subject}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-500"
                            : session.status === "IN_PROGRESS"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {session.status?.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px]"
                           style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center space-x-1">
                          <Calendar size={10} />
                          <span>{new Date(session.startedAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                          })}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Target size={10} />
                          <span>{session.totalQuestions} Q</span>
                        </span>
                        {session.completedAt && (
                          <span className="flex items-center space-x-1">
                            <Clock size={10} />
                            <span>{new Date(session.completedAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit", minute: "2-digit"
                            })}</span>
                          </span>
                        )}
                      </div>
                      {isCompleted && (
                        <div className="text-[10px] font-bold"
                             style={{ color: scoreColor }}>
                          {getScoreLabel(pct)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Arrow */}
                  <div className="flex items-center space-x-2">
                    {isCompleted && (
                      <div className="hidden sm:block w-20 h-1.5 rounded-full overflow-hidden"
                           style={{ backgroundColor: "var(--bg-primary)" }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${pct}%`, background: scoreGradient }} />
                      </div>
                    )}
                    <div className="p-2 rounded-xl transition-all group-hover:translate-x-1"
                         style={{ color: "var(--text-secondary)" }}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
