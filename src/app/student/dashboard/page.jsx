"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy, BookOpen, Terminal, Code,
  ChevronRight, ArrowUpRight, Activity,
  RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { contests as staticContests } from "@/data/contestData";

// Helper: time-ago formatter
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${days}d ago`;
}

// Status badge styling
function statusStyle(status) {
  switch (status) {
    case "ACCEPTED":             return { color: "text-emerald-500", label: "Accepted ✓" };
    case "WRONG_ANSWER":         return { color: "text-rose-500",    label: "Wrong Answer" };
    case "RUNTIME_ERROR":        return { color: "text-orange-500",  label: "Runtime Error" };
    case "COMPILATION_ERROR":    return { color: "text-amber-500",   label: "Compile Error" };
    case "TIME_LIMIT_EXCEEDED":  return { color: "text-purple-500",  label: "TLE" };
    default:                     return { color: "text-slate-400",   label: status };
  }
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, token, API_BASE } = useAuth();

  const [submissions, setSubmissions]   = useState([]);
  const [contests, setContests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Fetch live data
  useEffect(() => {
    if (!user) return;

    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      const headers = {
        "Content-Type": "application/json",
        ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": user.role === "ADMIN" ? "ADMIN" : "USER" }),
      };

      let backendSubmissions = [];
      try {
        // Fetch submissions for this user
        const subRes = await fetch(
          `${API_BASE}/api/submissions?userId=${user.id}`,
          { headers, signal: AbortSignal.timeout(8000) }
        );
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.success) backendSubmissions = subData.submissions || [];
        }
      } catch (e) {
        console.error("Failed to fetch backend submissions:", e);
      }

      // Merge with local offline submissions
      let localSubmissions = [];
      if (typeof window !== "undefined") {
        try {
          const localRaw = localStorage.getItem("dmx_local_submissions");
          if (localRaw) {
            localSubmissions = JSON.parse(localRaw);
          }
        } catch (e) {
          console.error("Failed to parse local submissions:", e);
        }
      }
      
      const filteredLocalSubmissions = localSubmissions.filter(ls =>
        !backendSubmissions.some(bs =>
          bs.problem?.slug === ls.problem?.slug &&
          new Date(bs.createdAt).getTime() === new Date(ls.createdAt).getTime()
        )
      );
      setSubmissions([...backendSubmissions, ...filteredLocalSubmissions]);

      let backendContests = [];
      try {
        // Fetch contests for stats
        const contestRes = await fetch(`${API_BASE}/api/contests`, {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (contestRes.ok) {
          const contestData = await contestRes.json();
          if (contestData.success) backendContests = contestData.contests || [];
        }
      } catch (e) {
        console.error("Failed to fetch backend contests:", e);
      }

      // Merge with local/dynamic contests and static contests
      let localContests = [];
      if (typeof window !== "undefined") {
        try {
          const localRaw = localStorage.getItem("synapse_dynamic_contests");
          if (localRaw) {
            localContests = JSON.parse(localRaw);
          }
        } catch (e) {
          console.error("Failed to parse local contests:", e);
        }
      }

      const combinedContests = [
        ...backendContests,
        ...localContests.filter(dc => !backendContests.some(bc => String(bc.id) === String(dc.id))),
        ...staticContests.filter(sc =>
          !backendContests.some(bc => String(bc.id) === String(sc.id)) &&
          !localContests.some(dc => String(dc.id) === String(sc.id))
        )
      ];

      // Resolve user participation for contests
      let solvedData = {};
      let regData = [];
      if (typeof window !== "undefined") {
        try {
          const solvedRaw = localStorage.getItem("contest_solved_data");
          if (solvedRaw) solvedData = JSON.parse(solvedRaw);
          const regRaw = localStorage.getItem("contest_registrations");
          if (regRaw) regData = JSON.parse(regRaw);
        } catch (e) {
          console.error("Failed to load local contest progress:", e);
        }
      }

      const finalContests = combinedContests.map(c => {
        let participation = c.userParticipation || null;
        if (!participation) {
          if (solvedData[c.id]) {
            participation = {
              completed: true,
              score: solvedData[c.id].score,
              timeSpent: solvedData[c.id].time
            };
          } else if (regData.includes(c.id)) {
            participation = {
              completed: false
            };
          }
        }
        return {
          ...c,
          userParticipation: participation
        };
      });

      setContests(finalContests);
      setLoading(false);
    }

    fetchDashboardData();
  }, [user, token, API_BASE]);

  // --- Derived stats from live data ---
  const acceptedSubs   = submissions.filter(s => s.status === "ACCEPTED");
  const uniqueSolved   = new Set(acceptedSubs.map(s => s.problemId)).size;
  const totalSubs      = submissions.length;

  const now = new Date();
  const activeContests   = contests.filter(c => new Date(c.startTime) <= now && new Date(c.endTime) >= now);
  const upcomingContests = contests.filter(c => new Date(c.startTime) > now);

  // Contests the user participated in
  const myParticipations = contests.filter(c =>
    c.userParticipation && c.userParticipation.completed
  );

  // Best rank across completed contests (by score)
  const bestScore = myParticipations.length > 0
    ? Math.max(...myParticipations.map(c => c.userParticipation?.score || 0))
    : 0;

  // Recent activity: last 10 submissions sorted by date
  const recentActivity = [...submissions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const stats = [
    {
      title: "Problems Solved",
      value: uniqueSolved > 0 ? `${uniqueSolved}` : "0",
      change: totalSubs > 0 ? `${totalSubs} total submission${totalSubs !== 1 ? "s" : ""}` : "No submissions yet",
      icon: Code,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Contests Entered",
      value: myParticipations.length > 0 ? `${myParticipations.length}` : "0",
      change: bestScore > 0 ? `Best score: ${bestScore} pts` : activeContests.length > 0 ? `${activeContests.length} live now!` : "No contests yet",
      icon: Trophy,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Active Contests",
      value: activeContests.length > 0 ? `${activeContests.length} Live` : upcomingContests.length > 0 ? `${upcomingContests.length} Soon` : "None",
      change: upcomingContests.length > 0 ? `${upcomingContests.length} upcoming` : "Check back later",
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Acceptance Rate",
      value: totalSubs > 0 ? `${Math.round((acceptedSubs.length / totalSubs) * 100)}%` : "—",
      change: totalSubs > 0 ? `${acceptedSubs.length} accepted / ${totalSubs} submitted` : "Submit your first solution",
      icon: Terminal,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl border relative overflow-hidden"
        style={{ backgroundColor: "var(--glass-bg)", borderColor: "var(--border-primary)" }}
      >
        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Welcome back, {user?.username || "Scholar"}!
          </h1>
          <p className="text-xs max-w-xl" style={{ color: "var(--text-secondary)" }}>
            Track your progress across challenges, view coding submissions, and participate in live programming contests.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => router.push("/practice")}
            className="px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-102"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Code size={14} />
            <span>Practice Coding</span>
          </button>
          <button
            onClick={() => router.push("/contest")}
            className="px-5 py-3 rounded-2xl font-bold text-xs transition-all border cursor-pointer flex items-center space-x-1.5 hover:scale-102"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
          >
            <span>Contest Arena</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-3xl border shadow-sm space-y-4 animate-pulse"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
              <div className="h-3 w-24 rounded bg-slate-500/20" />
              <div className="h-7 w-16 rounded bg-slate-500/20" />
              <div className="h-2 w-32 rounded bg-slate-500/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between space-y-4"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {stat.title}
                  </span>
                  <div className={`p-2 rounded-xl ${stat.bgColor} ${stat.color}`}>
                    <IconComponent size={16} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
                    {stat.change}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Active / Upcoming Contests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
              Live &amp; Upcoming Contests
            </h2>
            <button
              onClick={() => router.push("/contest")}
              className="text-[10px] font-bold text-[var(--text-accent)] flex items-center space-x-1 hover:underline"
            >
              <span>View All</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="p-5 rounded-3xl border animate-pulse"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                  <div className="h-3 w-40 rounded bg-slate-500/20 mb-2" />
                  <div className="h-2 w-24 rounded bg-slate-500/10" />
                </div>
              ))
            ) : [...activeContests, ...upcomingContests].length === 0 ? (
              <div className="p-8 rounded-3xl border text-center space-y-2"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                <Trophy size={32} className="mx-auto opacity-20" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                  No contests scheduled yet
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Check back soon or ask an admin to create one.
                </p>
              </div>
            ) : (
              [...activeContests.slice(0, 2), ...upcomingContests.slice(0, 2)].map((contest) => {
                const start = new Date(contest.startTime);
                const end   = new Date(contest.endTime);
                const isLive = start <= now && end >= now;
                const minsLeft = isLive ? Math.max(0, Math.floor((end - now) / 60000)) : null;

                return (
                  <motion.div
                    key={contest.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 rounded-3xl border shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
                    onClick={() => router.push(`/contest/${contest.id}`)}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isLive
                            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                            : "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
                        }`}>
                          {isLive ? "● Live" : "Upcoming"}
                        </span>
                        {contest.category && (
                          <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] bg-slate-500/5 px-2 py-0.5 rounded border"
                            style={{ borderColor: "var(--border-primary)" }}>
                            {contest.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                        {contest.title}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        {isLive
                          ? `${minsLeft}m remaining`
                          : `Starts ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isLive ? (
                        <span className="px-3 py-1.5 text-[10px] font-bold text-white rounded-xl"
                          style={{ background: "var(--accent-gradient)" }}>
                          Enter
                        </span>
                      ) : (
                        <Clock size={16} style={{ color: "var(--text-muted)" }} />
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Submissions */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
              Recent Submissions
            </h2>
            <Activity size={16} style={{ color: "var(--text-muted)" }} />
          </div>

          <div className="border rounded-3xl overflow-hidden shadow-sm"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
            {loading ? (
              <div className="p-6 flex items-center justify-center space-x-2" style={{ color: "var(--text-muted)" }}>
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <AlertCircle size={24} className="mx-auto opacity-30" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                  No submissions yet
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Solve a practice problem to see your history here.
                </p>
                <button
                  onClick={() => router.push("/practice")}
                  className="text-[10px] font-bold text-[var(--text-accent)] hover:underline"
                >
                  Go to Practice →
                </button>
              </div>
            ) : (
              <div className="p-4 divide-y" style={{ borderColor: "var(--border-primary)" }}>
                {recentActivity.map((sub) => {
                  const { color, label } = statusStyle(sub.status);
                  return (
                    <div key={sub.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border text-[var(--text-secondary)] bg-slate-500/5"
                          style={{ borderColor: "var(--border-primary)" }}>
                          {sub.language}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {timeAgo(sub.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-0.5">
                        <p className="text-xs font-bold truncate pr-2" style={{ color: "var(--text-primary)" }}>
                          {sub.problem?.title || `Problem #${sub.problemId}`}
                        </p>
                        <span className={`text-[10px] font-extrabold shrink-0 flex items-center space-x-1 ${color}`}>
                          {sub.status === "ACCEPTED"
                            ? <CheckCircle2 size={11} />
                            : <XCircle size={11} />}
                          <span>{label}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
