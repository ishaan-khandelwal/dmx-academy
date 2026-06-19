"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Trophy, Clock, Users, Terminal, Plus, 
  ChevronRight, ArrowUpRight, Activity, Calendar
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { contests } from "@/data/contestData";

export default function AdminDashboard() {
  const router = useRouter();
  const { token, API_BASE } = useAuth();
  const [totalContestsCount, setTotalContestsCount] = useState(contests.length);
  const [activeContestsCount, setActiveContestsCount] = useState(0);
  const [allContests, setAllContests] = useState([]);

  useEffect(() => {
    const loadContests = async () => {
      let merged = [];
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
      };

      // Fetch from backend API
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

      // Merge with local storage dynamic contests & static contests
      let localContests = [];
      if (typeof window !== "undefined") {
        try {
          const localRaw = localStorage.getItem("synapse_dynamic_contests");
          if (localRaw) localContests = JSON.parse(localRaw);
        } catch { }
      }

      const combinedContests = [
        ...merged,
        ...localContests.filter(dc => !merged.some(bc => String(bc.id) === String(dc.id))),
        ...contests.filter(sc =>
          !merged.some(bc => String(bc.id) === String(sc.id)) &&
          !localContests.some(dc => String(dc.id) === String(sc.id))
        )
      ].map(c => {
        if (c.isDbContest) return c;
        // Compute status if static/local
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
    };

    loadContests();
  }, [API_BASE, token]);

  const stats = [
    {
      title: "Total Contests",
      value: totalContestsCount,
      change: "+2 this month",
      icon: Trophy,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    },
    {
      title: "Active Contests",
      value: activeContestsCount,
      change: "Live updates active",
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Registered Users",
      value: "1,482",
      change: "+12.4% weekly growth",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Submissions Queue",
      value: "4,821",
      change: "98.7% success rate",
      icon: Terminal,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  const recentSubmissions = [
    { id: "sub-1", user: "quantum_coder", problem: "Two Sum", lang: "Python 3", verdict: "AC", score: 100, time: "2 mins ago" },
    { id: "sub-2", user: "lex_dev", problem: "VDOM Reconciliation", lang: "JavaScript", verdict: "AC", score: 200, time: "5 mins ago" },
    { id: "sub-3", user: "security_guru", problem: "Rate Limiter Design", lang: "Go", verdict: "TLE", score: 40, time: "11 mins ago" },
    { id: "sub-4", user: "byte_knight", problem: "Two Sum", lang: "C++", verdict: "WA", score: 0, time: "15 mins ago" },
    { id: "sub-5", user: "react_fanatic", problem: "VDOM Reconciliation", lang: "TypeScript", verdict: "AC", score: 200, time: "22 mins ago" }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl border relative overflow-hidden"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: "var(--border-primary)"
        }}
      >
        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Welcome back, System Administrator
          </h1>
          <p className="text-xs max-w-xl" style={{ color: "var(--text-secondary)" }}>
            Here is the current state of DMX Competitions. You can create contests, manage algorithm problems, and check user submission flows.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => router.push("/admin/contests/new")}
            className="px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-102"
            style={{ background: "var(--accent-gradient)" }}
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

      {/* Split details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Recent Submissions feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
              Live Submissions Feed
            </h2>
            <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-time</span>
            </span>
          </div>

          <div className="border rounded-3xl overflow-hidden shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
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
                  {recentSubmissions.map((sub) => (
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
            {allContests.slice(0, 5).map((contest) => {
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
