"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy, BookOpen, Terminal, Code,
  ChevronRight, ArrowUpRight, Activity,
  RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle,
  Flame, Award, TrendingUp, HelpCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LiveBanner from "@/components/LiveBanner";

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
    case "ACCEPTED":             return { color: "text-emerald-400", label: "Accepted ✓" };
    case "WRONG_ANSWER":         return { color: "text-rose-400",    label: "Wrong Answer" };
    case "RUNTIME_ERROR":        return { color: "text-orange-400",  label: "Runtime Error" };
    case "COMPILATION_ERROR":    return { color: "text-amber-400",   label: "Compile Error" };
    case "TIME_LIMIT_EXCEEDED":  return { color: "text-purple-400",  label: "TLE" };
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
  const [activeBottomTab, setActiveBottomTab] = useState("contests");

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
        ...localContests.filter(dc => !backendContests.some(bc => String(bc.id) === String(dc.id)))
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
    .slice(0, 5);

  // Gamification metrics
  const targetNextRankPoints = 500;
  const currentPoints = uniqueSolved * 10 + bestScore;
  const progressPercent = Math.min(100, Math.round((currentPoints / targetNextRankPoints) * 100));
  
  // Custom SVG solved breakdown (Difficulties solved)
  const easySolved = acceptedSubs.filter(s => s.problem?.difficulty === "EASY" || !s.problem?.difficulty).length;
  const mediumSolved = acceptedSubs.filter(s => s.problem?.difficulty === "MEDIUM").length;
  const hardSolved = acceptedSubs.filter(s => s.problem?.difficulty === "HARD").length;

  const stats = [
    {
      title: "Problems Solved",
      value: uniqueSolved > 0 ? `${uniqueSolved}` : "0",
      change: totalSubs > 0 ? `${totalSubs} total submissions` : "No submissions yet",
      icon: Code,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Contests Entered",
      value: myParticipations.length > 0 ? `${myParticipations.length}` : "0",
      change: bestScore > 0 ? `Best score: ${bestScore} pts` : activeContests.length > 0 ? `${activeContests.length} live now!` : "No contests yet",
      icon: Trophy,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Active Contests",
      value: activeContests.length > 0 ? `${activeContests.length} Live` : upcomingContests.length > 0 ? `${upcomingContests.length} Soon` : "None",
      change: upcomingContests.length > 0 ? `${upcomingContests.length} upcoming` : "Check back later",
      icon: BookOpen,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Acceptance Rate",
      value: totalSubs > 0 ? `${Math.round((acceptedSubs.length / totalSubs) * 100)}%` : "—",
      change: totalSubs > 0 ? `${acceptedSubs.length} accepted / ${totalSubs} submitted` : "Submit your first solution",
      icon: Terminal,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic Profile & Streak Header Banner */}
      <div
        className="flex flex-col lg:flex-row items-stretch justify-between gap-6 p-6 md:p-8 rounded-3xl border relative overflow-hidden"
        style={{ 
          backgroundColor: "var(--glass-bg)", 
          borderColor: "var(--border-primary)",
          backgroundImage: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)" 
        }}
      >
        <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-center">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Scholar Dashboard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Welcome back, {user?.username || "Scholar"}!
          </h1>
          <p className="text-xs max-w-xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Monitor your coding stats, complete recommended algorithms tracks, and compete in scheduled speedrun contests.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => router.push("/practice")}
              className="px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-102"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #6366f1 100%)" }}
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

        {/* Gamified visual markers (Streak, Points & animated Progress ring) */}
        <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 relative z-10 lg:pl-6 border-t lg:border-t-0 lg:border-l" style={{ borderColor: "var(--border-primary)" }}>
          {/* Circular SVG progress ring */}
          <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" stroke="var(--border-primary)" strokeWidth="6" fill="transparent" />
              <circle 
                cx="56" 
                cy="56" 
                r="48" 
                stroke="#10b981" 
                strokeWidth="6" 
                fill="transparent" 
                strokeDasharray="301.6"
                strokeDashoffset={301.6 - (301.6 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400">Rank Progress</span>
              <span className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{progressPercent}%</span>
              <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>{currentPoints} / {targetNextRankPoints} pts</span>
            </div>
          </div>

          <div className="space-y-4 w-full sm:w-auto">
            {/* Streak card */}
            <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Flame size={18} className="animate-pulse" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Active Streak</p>
                <p className="text-xs font-black text-amber-500">7 Days Running 🔥</p>
              </div>
            </div>

            {/* Rank badge card */}
            <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Award size={18} />
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Current Standing</p>
                <p className="text-xs font-black text-indigo-400">Elite Scholar III</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Analytics SVG Solved Breakdown & Topic Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Solve distribution SVG Ring chart */}
        <div className="glass-panel p-6 rounded-3xl border space-y-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Difficulty Distribution
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2 justify-around">
            {/* Pie SVG */}
            <div className="relative h-28 w-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                {/* Back Circle */}
                <circle cx="56" cy="56" r="42" stroke="var(--border-primary)" strokeWidth="12" fill="transparent" />
                {/* Easy Segment */}
                <circle 
                  cx="56" 
                  cy="56" 
                  r="42" 
                  stroke="#10b981" 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray="263.8"
                  strokeDashoffset={263.8 - (263.8 * (easySolved || 1)) / (uniqueSolved || 1)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-[var(--text-primary)]">{uniqueSolved}</span>
                <span className="text-[8px] uppercase tracking-wider text-slate-400">Total Solved</span>
              </div>
            </div>

            <div className="space-y-2 text-[10px] w-full sm:w-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Easy Solved</span>
                </div>
                <span className="font-extrabold text-[var(--text-primary)]">{easySolved}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-1.5 font-semibold text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Medium Solved</span>
                </div>
                <span className="font-extrabold text-[var(--text-primary)]">{mediumSolved}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-1.5 font-semibold text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Hard Solved</span>
                </div>
                <span className="font-extrabold text-[var(--text-primary)]">{hardSolved}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Topic strengths */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border space-y-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Topic Strength Diagnostics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl border bg-slate-500/5 space-y-2" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-400 uppercase">Array Operations</span>
                <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Strong</span>
              </div>
              <div className="w-full h-1 bg-slate-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "85%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border bg-slate-500/5 space-y-2" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-400 uppercase">Dynamic Programming</span>
                <span className="font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Review Rec</span>
              </div>
              <div className="w-full h-1 bg-slate-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: "45%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border bg-slate-500/5 space-y-2" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-400 uppercase">Tree Traversal</span>
                <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Proficient</span>
              </div>
              <div className="w-full h-1 bg-slate-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "70%" }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border bg-slate-500/5 space-y-2" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-400 uppercase">Graph Theory</span>
                <span className="font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Critical Focus</span>
              </div>
              <div className="w-full h-1 bg-slate-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Classes Display */}
      <LiveBanner />

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Active / Upcoming Contests & My Participation Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border-primary)" }}>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveBottomTab("contests")}
                className={`text-sm font-bold pb-2 relative transition-all cursor-pointer ${activeBottomTab === "contests" ? "text-[var(--text-accent)]" : "text-[var(--text-muted)]"}`}
              >
                <span>Live &amp; Upcoming Contests</span>
                {activeBottomTab === "contests" && (
                  <motion.div layoutId="studentBottomTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-accent)]" />
                )}
              </button>
              <button
                onClick={() => setActiveBottomTab("reports")}
                className={`text-sm font-bold pb-2 relative transition-all cursor-pointer ${activeBottomTab === "reports" ? "text-[var(--text-accent)]" : "text-[var(--text-muted)]"}`}
              >
                <span>My Participation Reports</span>
                {activeBottomTab === "reports" && (
                  <motion.div layoutId="studentBottomTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-accent)]" />
                )}
              </button>
            </div>
            {activeBottomTab === "contests" && (
              <button
                onClick={() => router.push("/contest")}
                className="text-[10px] font-bold text-[var(--text-accent)] flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight size={12} />
              </button>
            )}
          </div>

          {activeBottomTab === "contests" ? (
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
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
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
          ) : (
            <div className="space-y-3">
              {loading ? (
                [0, 1].map(i => (
                  <div key={i} className="p-5 rounded-3xl border animate-pulse"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                    <div className="h-3 w-40 rounded bg-slate-500/20 mb-2" />
                    <div className="h-2 w-24 rounded bg-slate-500/10" />
                  </div>
                ))
              ) : contests.filter(c => c.userParticipation).length === 0 ? (
                <div className="p-8 rounded-3xl border text-center space-y-2"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                  <Trophy size={32} className="mx-auto opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
                    No contest attempts recorded
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Participate in an active contest to see your reports here.
                  </p>
                </div>
              ) : (
                contests.filter(c => c.userParticipation).map((contest) => {
                  const isCompleted = contest.userParticipation?.completed;
                  const score = contest.userParticipation?.score ?? 0;
                  const timeSpent = contest.userParticipation?.timeSpent ?? "—";
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
                            isCompleted
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          }`}>
                            {isCompleted ? "Completed ✓" : "In Progress"}
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
                          Score: <strong className="text-[var(--text-accent)]">{score} pts</strong> &bull; Time Spent: {timeSpent}
                        </p>
                      </div>
                      <div className="shrink-0 text-xs font-bold text-[var(--text-accent)]">
                        View Arena &rarr;
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
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
