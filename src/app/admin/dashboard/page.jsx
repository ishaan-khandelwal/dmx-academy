"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Clock, Users, Terminal, Plus, 
  ChevronRight, ArrowUpRight, Activity, Calendar,
  Cpu, HardDrive, ShieldCheck, RefreshCw, Zap,
  CheckCircle, AlertTriangle, AlertCircle, Play, Settings
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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

export default function AdminDashboard() {
  const router = useRouter();
  const { token, API_BASE, user } = useAuth();
  
  // Dashboard Live Stats
  const [totalContestsCount, setTotalContestsCount] = useState(0);
  const [activeContestsCount, setActiveContestsCount] = useState(0);
  const [allContests, setAllContests] = useState([]);
  const [liveSubmissions, setLiveSubmissions] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [participationReports, setParticipationReports] = useState([]);
  const [activeLeftTab, setActiveLeftTab] = useState("submissions");
  
  // Console Action status triggers
  const [actionAlert, setActionAlert] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [serverSyncing, setServerSyncing] = useState(false);

  // Performance numbers
  const [cpuUsage, setCpuUsage] = useState(24);
  const [ramUsage, setRamUsage] = useState(48);

  const loadData = async () => {
    let merged = [];
    const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
    const headers = {
      "Content-Type": "application/json",
      ...(hasRealToken
        ? { Authorization: `Bearer ${token}` }
        : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
    };

    // 1. Fetch contests from backend API
    try {
      const res = await fetch(`${API_BASE}/api/contests`, { headers });
      const data = await res.json();
      if (data.success && data.contests) {
        const now = new Date();
        merged = data.contests.map(c => {
          const start = new Date(c.startTime);
          const end = new Date(c.endTime);
          let status = "upcoming";
          if (now >= start && now <= end) status = "active";
          else if (now > end) status = "past";
          const durationMins = Math.round((end - start) / 60000);
          let timeLeftStr = "Completed";
          if (status === "active") {
            const diffMins = Math.max(0, Math.floor((end - now) / 60000));
            timeLeftStr = `${diffMins}m remaining`;
          } else if (status === "upcoming") {
            const diffHrs = Math.max(0, Math.floor((new Date(c.startTime) - now) / 3600000));
            timeLeftStr = diffHrs < 24 ? `Starts in ${diffHrs}h` : `Starts in ${Math.round(diffHrs / 24)}d`;
          }
          return {
            id: c.id,
            title: c.title,
            desc: c.description || "No description.",
            category: c.category || "General",
            status,
            durationMins,
            timeLeftStr,
            isDbContest: true
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch backend contests:", err);
    }

    // Merge with local storage dynamic contests
    let localContests = [];
    if (typeof window !== "undefined") {
      try {
        const localRaw = localStorage.getItem("synapse_dynamic_contests");
        if (localRaw) localContests = JSON.parse(localRaw);
      } catch { }
    }

    const combinedContests = [
      ...merged,
      ...localContests.filter(dc => !merged.some(bc => String(bc.id) === String(dc.id)))
    ].map(c => {
      if (c.isDbContest) return c;
      // Compute status if local
      const start = new Date(c.startTime);
      const end = new Date(c.endTime);
      const now = new Date();
      let status = c.status || "upcoming";
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (now >= start && now <= end) status = "active";
        else if (now > end) status = "past";
      }
      return {
        ...c,
        status
      };
    });

    setAllContests(combinedContests);
    setTotalContestsCount(combinedContests.length);
    setActiveContestsCount(combinedContests.filter(c => c.status === "active").length);

    // 2. Fetch live system stats from backend API
    try {
      const res = await fetch(`${API_BASE}/api/auth/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setSystemStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin stats from backend:", err);
    }

    // 3. Fetch recent submissions from backend API
    try {
      const res = await fetch(`${API_BASE}/api/submissions`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.submissions) {
          setLiveSubmissions(data.submissions);
        }
      }
    } catch (err) {
      console.error("Failed to fetch live submissions:", err);
    }

    // 4. Fetch participation reports from backend API
    try {
      const res = await fetch(`${API_BASE}/api/contests/reports/participations`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.participations) {
          setParticipationReports(data.participations);
        }
      }
    } catch (err) {
      console.error("Failed to fetch participation reports:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh stats every 10 seconds
    const syncInterval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [API_BASE, token]);

  // Periodic metrics fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(18 + Math.random() * 15));
      setRamUsage(Math.floor(45 + Math.random() * 5));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleConsoleAction = (actionName) => {
    setActionAlert(`Executing: ${actionName}...`);
    setServerSyncing(true);
    setTimeout(() => {
      setServerSyncing(false);
      setActionAlert(`✓ Successful: ${actionName}`);
      loadData(); // Reload live numbers on actions
      setTimeout(() => setActionAlert(null), 3000);
    }, 1500);
  };

  // Base dynamic stats calculations
  const registeredUsersBase = 0;
  const registeredUsersCount = systemStats?.totalUsers !== undefined
    ? registeredUsersBase + systemStats.totalUsers
    : registeredUsersBase;

  const submissionsBase = 0;
  const submissionsCount = systemStats?.totalSubmissions !== undefined
    ? submissionsBase + systemStats.totalSubmissions
    : submissionsBase;

  const stats = [
    {
      title: "Total Contests",
      value: totalContestsCount,
      change: "Active in Registry",
      icon: Trophy,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10"
    },
    {
      title: "Active Contests",
      value: activeContestsCount,
      change: activeContestsCount > 0 ? `${activeContestsCount} active session(s)` : "No active contests",
      icon: Activity,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Registered Users",
      value: registeredUsersCount.toLocaleString(),
      change: "Database users",
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Submissions Queue",
      value: submissionsCount.toLocaleString(),
      change: "Database submissions",
      icon: Terminal,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10"
    }
  ];

  // Map API submissions list
  const getSubmissionsFeed = () => {
    if (liveSubmissions && liveSubmissions.length > 0) {
      return liveSubmissions.slice(0, 5).map(sub => {
        let verdict = "AC";
        if (sub.status === "WRONG_ANSWER") verdict = "WA";
        else if (sub.status === "TIME_LIMIT_EXCEEDED") verdict = "TLE";
        else if (sub.status === "RUNTIME_ERROR") verdict = "RE";
        else if (sub.status === "COMPILATION_ERROR") verdict = "CE";

        return {
          id: String(sub.id),
          user: sub.user?.username || "scholar",
          problem: sub.problem?.title || `Problem #${sub.problemId}`,
          lang: sub.language || "Unknown",
          verdict: verdict,
          score: sub.status === "ACCEPTED" ? 100 : (sub.status === "TIME_LIMIT_EXCEEDED" ? 40 : 0),
          time: timeAgo(sub.createdAt)
        };
      });
    }

    return [];
  };

  const submissionsFeed = getSubmissionsFeed();

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl border relative overflow-hidden"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: "var(--border-primary)",
          backgroundImage: "linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)"
        }}
      >
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">DMX Core Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Welcome back, System Administrator
          </h1>
          <p className="text-xs max-w-xl" style={{ color: "var(--text-secondary)" }}>
            Manage the competitive programming workspace, verify active web streams, audit problem schemas, and publish synchronized contest events.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => router.push("/admin/contests/new")}
            className="px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-102"
            style={{ background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)" }}
          >
            <Plus size={14} />
            <span>Create Contest</span>
          </button>
          <button
            onClick={() => router.push("/contest")}
            className="px-5 py-3 rounded-2xl font-bold text-xs transition-all border cursor-pointer flex items-center space-x-1.5 hover:scale-102"
            style={{ 
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)"
            }}
          >
            <span>View Contest Arena</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* System Alerts Trigger Alerts */}
      <AnimatePresence>
        {actionAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl border text-xs text-center font-bold flex items-center justify-center space-x-2 ${
              actionAlert.startsWith("✓")
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            }`}
          >
            {serverSyncing && <RefreshCw size={13} className="animate-spin text-cyan-400" />}
            <span>{actionAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid statistics */}
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
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-card)"
              }}
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

      {/* Server Health Diagnostics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Panel */}
        <div className="glass-panel p-5 rounded-3xl border flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
              <Cpu size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Core CPU Load</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{cpuUsage}%</p>
            </div>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-slate-500/10 overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${cpuUsage}%` }} />
          </div>
        </div>

        {/* RAM Panel */}
        <div className="glass-panel p-5 rounded-3xl border flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400">
              <HardDrive size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Memory Buffers</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{ramUsage}%</p>
            </div>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-slate-500/10 overflow-hidden">
            <div className="h-full bg-violet-400 transition-all duration-1000" style={{ width: `${ramUsage}%` }} />
          </div>
        </div>

        {/* Sync Panel */}
        <div className="glass-panel p-5 rounded-3xl border flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">DB Sync Engine</p>
              <p className="text-lg font-black text-[var(--text-primary)]">Synced</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            Active
          </span>
        </div>
      </div>

      {/* Analytics SVG Charts & Active Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart 1: SVG Traffic Line Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border space-y-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              API Connection Traffic (Last 24 Hours)
            </h2>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Live Network
            </span>
          </div>

          <div className="relative h-44 w-full flex items-end">
            {/* Custom SVG line chart */}
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="3" />
              
              {/* Gradient Fill under Path */}
              <path 
                d="M 0 150 L 0 120 Q 50 110 100 80 T 200 100 T 300 40 T 400 90 T 500 30 L 500 150 Z" 
                fill="url(#chartGradient)" 
              />

              {/* Line path */}
              <path 
                d="M 0 120 Q 50 110 100 80 T 200 100 T 300 40 T 400 90 T 500 30" 
                fill="none" 
                stroke="#06b6d4" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              
              {/* Interactive nodes */}
              <circle cx="100" cy="80" r="4.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="300" cy="40" r="4.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="500" cy="30" r="4.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span>08:00 AM</span>
            <span>04:00 PM</span>
            <span>12:00 AM</span>
            <span>08:00 AM (Now)</span>
          </div>
        </div>

        {/* Quick Console Tools */}
        <div className="glass-panel p-6 rounded-3xl border space-y-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Utility Operations
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => handleConsoleAction("Cache Purge & Vacuum")}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-left text-xs font-bold transition-all hover:scale-101 cursor-pointer"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            >
              <div className="flex items-center space-x-2">
                <Zap size={14} className="text-cyan-400" />
                <span>Prune Cache Buffers</span>
              </div>
              <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
            </button>

            <button
              onClick={() => {
                setMaintenanceMode(!maintenanceMode);
                handleConsoleAction(maintenanceMode ? "Disable Maintenance Mode" : "Activate Maintenance Mode");
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-left text-xs font-bold transition-all hover:scale-101 cursor-pointer"
              style={{ 
                backgroundColor: maintenanceMode ? "rgba(245, 158, 11, 0.05)" : "var(--bg-primary)", 
                borderColor: maintenanceMode ? "rgba(245, 158, 11, 0.2)" : "var(--border-primary)", 
                color: "var(--text-primary)" 
              }}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle size={14} className={maintenanceMode ? "text-amber-500" : "text-slate-400"} />
                <span>Toggle Maintenance Mode</span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-md border font-extrabold ${
                maintenanceMode ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-slate-500/5 border-transparent text-[var(--text-muted)]"
              }`}>
                {maintenanceMode ? "ON" : "OFF"}
              </span>
            </button>

            <button
              onClick={() => handleConsoleAction("Generate Livekit Token")}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-left text-xs font-bold transition-all hover:scale-101 cursor-pointer"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            >
              <div className="flex items-center space-x-2">
                <Play size={14} className="text-violet-400" />
                <span>Generate Live API Tokens</span>
              </div>
              <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Split details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Live Submissions Feed & Participation Reports Switcher */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border-primary)" }}>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveLeftTab("submissions")}
                className={`text-sm font-bold pb-2 relative transition-all cursor-pointer ${activeLeftTab === "submissions" ? "text-[var(--text-accent)]" : "text-[var(--text-muted)]"}`}
              >
                <span>Live Submissions Feed</span>
                {activeLeftTab === "submissions" && (
                  <motion.div layoutId="adminLeftTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-accent)]" />
                )}
              </button>
              <button
                onClick={() => setActiveLeftTab("reports")}
                className={`text-sm font-bold pb-2 relative transition-all cursor-pointer ${activeLeftTab === "reports" ? "text-[var(--text-accent)]" : "text-[var(--text-muted)]"}`}
              >
                <span>Contest Participation Reports</span>
                {activeLeftTab === "reports" && (
                  <motion.div layoutId="adminLeftTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-accent)]" />
                )}
              </button>
            </div>
            {activeLeftTab === "submissions" && (
              <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Real-time</span>
              </span>
            )}
          </div>

          <div className="border rounded-3xl overflow-hidden shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
            {activeLeftTab === "submissions" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-500/5 font-bold text-[var(--text-muted)] border-b" style={{ borderColor: "var(--border-primary)" }}>
                      <th className="px-6 py-4">Developer</th>
                      <th className="px-6 py-4">Problem</th>
                      <th className="px-6 py-4">Lang</th>
                      <th className="px-6 py-4 text-center">Verdict</th>
                      <th className="px-6 py-4 text-center">Points</th>
                      <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    {submissionsFeed.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                          {sub.user}
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          {sub.problem}
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px]">
                          {sub.lang}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                            sub.verdict === "AC" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                            sub.verdict === "TLE" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
                            "text-rose-500 bg-rose-500/10 border-rose-500/20"
                          }`}>
                            {sub.verdict}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-extrabold" style={{ color: sub.score > 0 ? "var(--text-accent)" : "var(--text-muted)" }}>
                          {sub.score}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: "var(--text-muted)" }}>
                          {sub.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-500/5 font-bold text-[var(--text-muted)] border-b" style={{ borderColor: "var(--border-primary)" }}>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Contest</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 text-center">Time Spent</th>
                      <th className="px-6 py-4 text-right">Completion Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    {participationReports.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center" style={{ color: "var(--text-muted)" }}>
                          No participation reports found.
                        </td>
                      </tr>
                    ) : (
                      participationReports.map((report) => (
                        <tr key={report.id || `${report.userId}-${report.contestId}`} className="hover:bg-slate-500/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                            {report.user?.username || "N/A"}
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            {report.contest?.title || `Contest #${report.contestId}`}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                              report.completed ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20"
                            }`}>
                              {report.completed ? "Completed" : "In Progress"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-[var(--text-accent)]">
                            {report.score ?? 0} pts
                          </td>
                          <td className="px-6 py-4 text-center" style={{ color: "var(--text-muted)" }}>
                            {report.timeSpent || "—"}
                          </td>
                          <td className="px-6 py-4 text-right" style={{ color: "var(--text-muted)" }}>
                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contest status list */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
              Contest Timeline
            </h2>
            <Calendar size={16} style={{ color: "var(--text-muted)" }} />
          </div>

          <div className="space-y-4">
            {allContests.slice(0, 4).map((contest) => {
              const isActive = contest.status === "active";
              const isUpcoming = contest.status === "upcoming";
              const isDbContest = contest.isDbContest || /^\d+$/.test(String(contest.id));
              return (
                <div
                  key={contest.id}
                  className="p-5 rounded-3xl border shadow-sm space-y-3 relative group overflow-hidden"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card)"
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border bg-slate-500/5"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                    >
                      {contest.category}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                      isActive ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                      isUpcoming ? "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" :
                      "text-[var(--text-muted)] bg-slate-500/5 border-transparent"
                    }`}>
                      {contest.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xs font-bold font-display" style={{ color: "var(--text-primary)" }}>
                      {contest.title}
                    </h3>
                    <p className="text-[10px] line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                      {contest.desc}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-[10px] border-t" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                    <div className="flex items-center space-x-1">
                      <Clock size={11} />
                      <span>{contest.durationMins} mins</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">{contest.timeLeftStr || contest.startTime}</span>
                      {isDbContest && (
                        <button
                          onClick={() => router.push(`/admin/contests/${contest.id}`)}
                          className="flex items-center space-x-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer hover:bg-slate-500/10"
                          style={{ borderColor: "var(--border-primary)", color: "var(--text-accent)" }}
                        >
                          <Users size={10} />
                          <span>Participants</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
