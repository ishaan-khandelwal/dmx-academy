"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, BookOpen, Clock, Code, Sparkles, ShieldAlert,
  Terminal, CheckCircle2, ChevronRight, Zap, RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const categories = [
  "All Categories",
  "Security",
  "Algorithms",
  "Frontend",
  "System Design"
];

const difficulties = [
  "All Difficulties",
  "Easy",
  "Medium",
  "Hard"
];

// Map categories to icons
const getIcon = (category) => {
  switch (category) {
    case "Security":
      return <ShieldAlert size={20} className="text-emerald-500" />;
    case "Algorithms":
      return <Terminal size={20} className="text-blue-500" />;
    case "Frontend":
      return <Code size={20} className="text-amber-500" />;
    case "System Design":
      return <Sparkles size={20} className="text-rose-500" />;
    default:
      return <BookOpen size={20} className="text-indigo-500" />;
  }
};

export default function PracticeCatalogPage() {
  const { user, token, API_BASE } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All Difficulties");
  const [hoveredProblemId, setHoveredProblemId] = useState(null);
  const [completedProblems, setCompletedProblems] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    async function loadCompletedProblems() {
      if (!user) return;
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "ADMIN" ? "ADMIN" : "USER" }),
      };
      try {
        const res = await fetch(`${API_BASE}/api/submissions?userId=${user.id}&status=ACCEPTED`, {
          headers,
          signal: AbortSignal.timeout(30000)
        });
        const data = await res.json();
        if (data.success && data.submissions) {
          const solvedSlugs = Array.from(new Set(data.submissions.map(sub => sub.problem?.slug).filter(Boolean)));
          setCompletedProblems(solvedSlugs);
        }
      } catch (err) {
        console.error("Failed to load completed problems from DB:", err);
      }
    }
    loadCompletedProblems();
  }, [user, token, API_BASE]);

  useEffect(() => {
    async function loadProblems() {
      setLoading(true);
      
      try {
        const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
        const headers = {
          "Content-Type": "application/json",
          ...(hasRealToken
            ? { Authorization: `Bearer ${token}` }
            : {}),
        };
        const res = await fetch(`${API_BASE}/api/problems`, {
          headers,
          signal: AbortSignal.timeout(30000)
        });
        const data = await res.json();
        if (data.success && data.problems) {
          const mapped = data.problems.map(p => {
            let diffStr = "Medium";
            if (p.difficulty === "EASY") diffStr = "Easy";
            else if (p.difficulty === "HARD") diffStr = "Hard";

            return {
              id: p.slug,
              dbId: p.id,
              title: p.title,
              difficulty: diffStr,
              category: "Algorithms",
              desc: "Solve this algorithmic exercise from the database.",
              time: "20 min",
              tags: ["Database", "Dynamic"],
              testcases: new Array(p.testCasesCount || 0)
            };
          });

          setAllProblems(mapped);
        } else {
          setAllProblems([]);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic problems:", err);
        setAllProblems([]);
      }
      setLoading(false);
    }
    loadProblems();
  }, [API_BASE]);

  const filteredProblems = allProblems.filter(prob => {
    const matchesCategory = selectedCategory === "All Categories" || prob.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "All Difficulties" || prob.difficulty === selectedDifficulty;
    const matchesSearch = 
      prob.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prob.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prob.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden animate-fade-in" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-indigo-100/30 via-transparent to-transparent pointer-events-none z-0" />
      
      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-12">
          
          {/* Header Description */}
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
              <Zap size={13} className="text-[var(--text-accent)] animate-pulse" />
              <span>Interactive Practice Sandbox</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
              Interactive Code Zone
            </h1>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Solve system design scenarios, coding algorithms, and security reviews. Test solutions against live assertions and ask our voice-enabled AI developer assistant for guidance.
            </p>
          </motion.div>

          {/* Filtering bar */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-3xl border backdrop-blur-md"
            style={{
              backgroundColor: "var(--glass-bg)",
              borderColor: "var(--border-primary)"
            }}
          >
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1 items-center bg-slate-500/5 p-1 rounded-full border" style={{ borderColor: "var(--border-primary)" }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                    style={{
                      color: selectedCategory === cat ? "#ffffff" : "var(--text-secondary)"
                    }}
                  >
                    {selectedCategory === cat && (
                      <motion.div
                        layoutId="activeCategory"
                        className="absolute inset-0 rounded-full shadow-sm"
                        style={{ background: "var(--accent-gradient)" }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10">{cat.replace("All Categories", "All Topics")}</span>
                  </button>
                ))}
              </div>

              {/* Difficulty Select */}
              <div className="flex flex-wrap gap-1 items-center bg-slate-500/5 p-1 rounded-full border" style={{ borderColor: "var(--border-primary)" }}>
                {difficulties.map(diff => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className="relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                    style={{
                      color: selectedDifficulty === diff ? "#ffffff" : "var(--text-secondary)"
                    }}
                  >
                    {selectedDifficulty === diff && (
                      <motion.div
                        layoutId="activeDifficulty"
                        className="absolute inset-0 rounded-full shadow-sm"
                        style={{ background: "var(--accent-gradient)" }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10">{diff.replace("All Difficulties", "All Levels")}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search inputs */}
            <div className="relative w-full lg:w-80">
              <Search size={16} className="absolute left-4 top-3" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search practice exercises..."
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
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw size={28} className="animate-spin" style={{ color: "var(--text-accent)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Loading practice exercises...</p>
            </div>
          ) : (
            /* Cards Grid */
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredProblems.map((prob, idx) => {
                  const isHovered = hoveredProblemId === prob.id;
                  const isCompleted = completedProblems.includes(prob.id);
                  
                  return (
                    <motion.div
                      key={prob.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, delay: idx * 0.03 }}
                      onMouseEnter={() => setHoveredProblemId(prob.id)}
                      onMouseLeave={() => setHoveredProblemId(null)}
                      onClick={() => {
                        window.location.href = `/practice/${prob.id}`;
                      }}
                      className="group relative flex flex-col justify-between rounded-3xl p-6 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: isHovered ? "var(--border-accent)" : "var(--border-card)"
                      }}
                    >
                      {/* Hover highlights */}
                      <div 
                        className="absolute inset-0 z-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500"
                        style={{
                          background: "var(--accent-gradient)"
                        }}
                      />

                      <div className="relative z-10 space-y-4">
                        {/* Top status */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 rounded-xl bg-slate-500/5 border border-slate-500/10">
                              {getIcon(prob.category)}
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                              {prob.category}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isCompleted && (
                              <span className="inline-flex items-center space-x-1 text-xs text-emerald-500 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 size={12} />
                                <span>Solved</span>
                              </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              prob.difficulty === "Easy" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                              prob.difficulty === "Medium" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
                              "text-rose-500 bg-rose-500/10 border-rose-500/20"
                            }`}>
                              {prob.difficulty}
                            </span>
                          </div>
                        </div>

                        {/* Header details */}
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
                            {prob.title}
                          </h3>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {prob.desc}
                          </p>
                        </div>

                        {/* Pill tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {prob.tags.map(tag => (
                            <span 
                              key={tag}
                              className="text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider"
                              style={{
                                color: "var(--text-secondary)",
                                borderColor: "var(--border-primary)",
                                backgroundColor: "var(--bg-hover)"
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Details */}
                      <div className="relative z-10 flex items-center justify-between pt-4 mt-6 border-t" style={{ borderColor: "var(--border-primary)" }}>
                        <div className="flex items-center space-x-3 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{prob.time} Est.</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Terminal size={12} />
                            <span>{prob.testcases ? prob.testcases.length : 0} Test Cases</span>
                          </span>
                        </div>

                        <motion.div
                          animate={{ x: isHovered ? 4 : 0 }}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-[var(--text-accent)]"
                        >
                          <span>Start Practice</span>
                          <ChevronRight size={14} />
                        </motion.div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty view */}
              {filteredProblems.length === 0 && (
                <div className="col-span-full py-16 text-center space-y-4">
                  <Terminal size={48} className="mx-auto text-[var(--text-muted)] animate-bounce" />
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>No practice exercises match filters.</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Try modifying filters or search query terms.</p>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
