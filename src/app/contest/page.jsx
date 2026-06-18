"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, Search, Clock, Terminal, ChevronRight,
  UserCheck, AlertCircle
} from "lucide-react";
import { contests } from "@/data/contestData";
import { useAuth } from "@/context/AuthContext";

const globalLeaderboardMock = [
  { rank: 1, name: "quantum_coder", points: 2840, contests: 12, rankClass: "Grandmaster", color: "text-rose-500" },
  { rank: 2, name: "lex_dev", points: 2710, contests: 11, rankClass: "Grandmaster", color: "text-rose-500" },
  { rank: 3, name: "byte_knight", points: 2420, contests: 12, rankClass: "Master", color: "text-purple-500" },
  { rank: 4, name: "react_fanatic", points: 2280, contests: 10, rankClass: "Master", color: "text-purple-500" },
  { rank: 5, name: "pixel_architect", points: 2150, contests: 11, rankClass: "Diamond", color: "text-blue-500" },
  { rank: 6, name: "security_guru", points: 1980, contests: 9, rankClass: "Diamond", color: "text-blue-500" },
  { rank: 7, name: "node_wizard", points: 1850, contests: 8, rankClass: "Gold", color: "text-amber-500" },
  { rank: 8, name: "tech_nomad", points: 1720, contests: 9, rankClass: "Gold", color: "text-amber-500" }
];

export default function ContestLobby() {
  const { API_BASE } = useAuth();
  const [activeTab, setActiveTab] = useState("all"); // all, active, upcoming, past, leaderboard
  const [searchQuery, setSearchQuery] = useState("");
  const [allContests, setAllContests] = useState([]);
  const [registeredContests, setRegisteredContests] = useState([]);
  const [pastContestResults, setPastContestResults] = useState(null);

  // Load registration history and dynamic contests from backend + local fallback
  useEffect(() => {
    async function fetchContests() {
      let merged = [...contests];
      try {
        const res = await fetch(`${API_BASE}/api/contests`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.contests) {
            const dbContests = data.contests.map(c => {
              const now = new Date();
              const start = new Date(c.startTime);
              const end = new Date(c.endTime);
              
              let status = "upcoming";
              if (now >= start && now <= end) {
                status = "active";
              } else if (now > end) {
                status = "past";
              }

              const durationMins = Math.round((end - start) / 60000);
              
              const startTimeStr = `Starts at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${start.toLocaleDateString()}`;
              
              let timeLeftStr = "Completed";
              if (status === "active") {
                timeLeftStr = `${Math.round((end - now) / 60000)}m remaining`;
              } else if (status === "upcoming") {
                const diffHours = Math.round((start - now) / 3600000);
                timeLeftStr = diffHours > 0 ? `Starts in ${diffHours} hours` : "Starts soon";
              }

              return {
                id: String(c.id),
                title: c.title,
                desc: c.description || "No description provided.",
                durationMins,
                totalPoints: 300, 
                status,
                category: "Backend Development",
                timeLeftStr,
                startTime: startTimeStr,
                problems: [], 
                leaderboard: []
              };
            });

            const savedRaw = localStorage.getItem("synapse_dynamic_contests");
            let savedList = [];
            if (savedRaw) {
              try { savedList = JSON.parse(savedRaw); } catch(e) {}
            }

            const combined = [
              ...dbContests,
              ...savedList.filter(dc => !dbContests.some(dbc => dbc.id === dc.id)),
              ...contests.filter(sc => !dbContests.some(dbc => dbc.id === sc.id) && !savedList.some(dc => dc.id === sc.id))
            ];
            merged = combined;
          }
        }
      } catch (err) {
        console.error("Backend fetch failed, falling back to local storage / static:", err);
        const dynamicRaw = localStorage.getItem("synapse_dynamic_contests");
        if (dynamicRaw) {
          try {
            const dynamicContests = JSON.parse(dynamicRaw);
            const dynamicFiltered = dynamicContests.filter(dc => !contests.some(sc => sc.id === dc.id));
            merged = [...dynamicFiltered, ...contests];
          } catch (e) {
            console.error("Error loading dynamic contests:", e);
          }
        }
      }

      if (typeof window !== "undefined") {
        const savedRegs = localStorage.getItem("contest_registrations");
        if (savedRegs) {
          try {
            const parsed = JSON.parse(savedRegs);
            setRegisteredContests(parsed);
          } catch {}
        }
      }

      setAllContests(merged);
    }

    fetchContests();
  }, [API_BASE]);

  const handleRegister = (contestId) => {
    const nextRegs = [...registeredContests, contestId];
    setRegisteredContests(nextRegs);
    localStorage.setItem("contest_registrations", JSON.stringify(nextRegs));
  };

  const filteredContests = allContests.filter(c => {
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "active" && c.status === "active") ||
      (activeTab === "upcoming" && c.status === "upcoming") ||
      (activeTab === "past" && c.status === "past");
    
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Background ambient light */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-indigo-100/30 via-transparent to-transparent pointer-events-none z-0" />
      
      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-12">
          
          {/* Main header block */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto space-y-4"
          >
            <div 
              className="inline-flex items-center space-x-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold"
              style={{
                backgroundColor: "var(--bg-badge)",
                borderColor: "var(--border-accent)",
                color: "var(--text-accent)"
              }}
            >
              <Trophy size={13} className="text-[var(--text-accent)] animate-bounce" />
              <span>DMX Competitive Coding</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
              Contest Arena
            </h1>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Challenge other students, solve system architectures under pressure, and climb the DMX leaderboard in timed hackathons.
            </p>
          </motion.div>

          {/* Lobby controls bar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center p-4 rounded-3xl border backdrop-blur-md"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--border-primary)"
            }}
          >
            {/* Tab links */}
            <div className="flex flex-wrap gap-1 items-center bg-slate-500/5 p-1 rounded-full border" style={{ borderColor: "var(--border-primary)" }}>
              {[
                { id: "all", label: "All Contests" },
                { id: "active", label: "Active" },
                { id: "upcoming", label: "Upcoming" },
                { id: "past", label: "Past Events" },
                { id: "leaderboard", label: "Leaderboard" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
                  style={{
                    color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)"
                  }}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeContestTab"
                      className="absolute inset-0 rounded-full shadow-sm"
                      style={{ background: "var(--accent-gradient)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Search filter input */}
            {activeTab !== "leaderboard" && (
              <div className="relative w-full lg:w-80">
                <Search size={16} className="absolute left-4 top-3" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search contests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full py-2.5 pl-11 pr-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                />
              </div>
            )}
          </div>

          {/* Tab contents */}
          <div className="relative">
            {activeTab === "leaderboard" ? (
              /* Global Leaderboard Table */
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-3xl overflow-hidden shadow-sm max-w-4xl mx-auto"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-primary)" }}>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>DMX Grand Rankings</h3>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Updated after every official weekly speedrun contest.</p>
                  </div>
                  <Trophy size={20} className="text-amber-500" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-500/5 font-bold text-[var(--text-muted)] border-b" style={{ borderColor: "var(--border-primary)" }}>
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">Developer</th>
                        <th className="px-6 py-4 text-center">Score Points</th>
                        <th className="px-6 py-4 text-center">Contests Participated</th>
                        <th className="px-6 py-4 text-right">League Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ divideColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                      {globalLeaderboardMock.map((player) => (
                        <tr key={player.rank} className="hover:bg-slate-500/5 transition-colors">
                          <td className="px-6 py-4 font-bold">
                            {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : `#${player.rank}`}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                            {player.name}
                          </td>
                          <td className="px-6 py-4 text-center font-extrabold text-[var(--text-accent)]">
                            {player.points}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {player.contests}
                          </td>
                          <td className="px-6 py-4 text-right font-bold uppercase tracking-wider text-[10px]">
                            <span className={player.color}>{player.rankClass}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              /* Contests Card Grid */
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                <AnimatePresence mode="popLayout">
                  {filteredContests.map((contest, idx) => {
                    const isActive = contest.status === "active";
                    const isUpcoming = contest.status === "upcoming";
                    const isPast = contest.status === "past";
                    const isRegistered = registeredContests.includes(contest.id);

                    return (
                      <motion.div
                        key={contest.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, delay: idx * 0.03 }}
                        className="group relative flex flex-col justify-between rounded-3xl p-6 shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-300"
                        style={{
                          backgroundColor: "var(--bg-card)",
                          borderColor: "var(--border-card)"
                        }}
                      >
                        {/* Status Line */}
                        <div 
                          className={`absolute top-0 left-0 right-0 h-[3px] ${
                            isActive ? "bg-emerald-500" : isUpcoming ? "bg-indigo-500" : "bg-slate-400"
                          }`}
                        />

                        {/* Card Top */}
                        <div className="space-y-4 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-500/5"
                              style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                            >
                              {contest.category}
                            </span>
                            
                            {/* Dynamic Tag Pill */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              isActive ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                              isUpcoming ? "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" :
                              "text-[var(--text-muted)] bg-slate-500/5 border-transparent"
                            }`}>
                              {contest.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-lg font-bold font-display leading-snug group-hover:text-[var(--text-accent)] transition-colors"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {contest.title}
                            </h3>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                              {contest.desc}
                            </p>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl border bg-slate-500/5" style={{ borderColor: "var(--border-primary)" }}>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Points</span>
                              <div className="text-sm font-black text-[var(--text-primary)]">{contest.totalPoints} pts</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Duration</span>
                              <div className="text-sm font-black text-[var(--text-primary)]">{contest.durationMins} mins</div>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom CTA Actions */}
                        <div className="pt-4 mt-6 border-t flex items-center justify-between" style={{ borderColor: "var(--border-primary)" }}>
                          <div className="flex items-center space-x-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <Clock size={12} className="text-[var(--text-muted)]" />
                            <span>{contest.timeLeftStr}</span>
                          </div>

                          {isActive && (
                            <Link
                              href={`/contest/${contest.id}`}
                              className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1"
                              style={{ background: "var(--accent-gradient)" }}
                            >
                              <span>Enter Arena</span>
                              <ChevronRight size={13} />
                            </Link>
                          )}

                          {isUpcoming && (
                            isRegistered ? (
                              <button
                                disabled
                                className="px-4 py-2 text-xs font-bold rounded-xl border flex items-center space-x-1"
                                style={{
                                  backgroundColor: "var(--bg-badge)",
                                  borderColor: "var(--border-accent)",
                                  color: "var(--text-accent)"
                                }}
                              >
                                <UserCheck size={13} />
                                <span>Registered</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegister(contest.id)}
                                className="px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer"
                                style={{
                                  backgroundColor: "var(--bg-primary)",
                                  borderColor: "var(--border-primary)",
                                  color: "var(--text-primary)"
                                }}
                              >
                                Register
                              </button>
                            )
                          )}

                          {isPast && (
                            <button
                              onClick={() => setPastContestResults(contest)}
                              className="px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer"
                              style={{
                                backgroundColor: "var(--bg-primary)",
                                borderColor: "var(--border-primary)",
                                color: "var(--text-primary)"
                              }}
                            >
                              View Scoreboard
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Empty fallbacks */}
                {filteredContests.length === 0 && (
                  <div className="col-span-full py-16 text-center space-y-4">
                    <Terminal size={48} className="mx-auto text-[var(--text-muted)]" />
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>No contests match filters.</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Try modifying filters or search query terms.</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

        </div>
      </main>

      {/* Past Contest Scoreboard Modal overlay */}
      <AnimatePresence>
        {pastContestResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xl w-full rounded-3xl border p-6 shadow-2xl space-y-4"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
            >
              <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: "var(--border-primary)" }}>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Scoreboard: {pastContestResults.title}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Completed on {pastContestResults.startTime}</p>
                </div>
                <button 
                  onClick={() => setPastContestResults(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <AlertCircle size={18} />
                </button>
              </div>

              {/* Ranks list */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {pastContestResults.leaderboard.map((item) => (
                  <div 
                    key={item.rank}
                    className="flex justify-between items-center p-3 rounded-2xl border"
                    style={{ 
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-primary)"
                    }}
                  >
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="font-bold text-[var(--text-secondary)]">
                        {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `#${item.rank}`}
                      </span>
                      <span className="font-bold text-[var(--text-primary)]">{item.username}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs font-mono">
                      <span className="text-[var(--text-muted)]">{item.time}</span>
                      <span className="font-extrabold text-[var(--text-accent)]">{item.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setPastContestResults(null)}
                  className="px-5 py-2.5 bg-slate-500/10 hover:bg-slate-500/20 font-bold rounded-full text-xs text-[var(--text-secondary)] cursor-pointer"
                >
                  Close Scoreboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
