"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Clock, Sparkles, ChevronRight, Save,
  Plus, Trash2, Calendar, HelpCircle, ArrowLeft, X, RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function CreateContest() {
  const router = useRouter();
  const { token, API_BASE } = useAuth();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Algorithms & Frontend");
  const [durationMins, setDurationMins] = useState(60);
  const [totalPoints, setTotalPoints] = useState(300);
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("upcoming"); // active, upcoming, past
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [selectedProblemIds, setSelectedProblemIds] = useState([]);
  const [success, setSuccess] = useState(false);

  // Custom problems states
  const [availableProblems, setAvailableProblems] = useState([]);
  // Reload available problems from backend & local storage fallback
  const refreshProblemsList = async () => {
    let merged = [];
    try {
      const res = await fetch(`${API_BASE}/api/problems`);
      const data = await res.json();
      if (data.success && data.problems) {
        // Map database problems to match the UI format
        merged = data.problems.map(prob => {
          // Capitalize difficulty: EASY -> Easy, MEDIUM -> Medium, HARD -> Hard
          const formattedDiff = prob.difficulty.charAt(0) + prob.difficulty.slice(1).toLowerCase();
          return {
            id: prob.id, // Database integer ID
            slug: prob.slug,
            title: prob.title,
            difficulty: formattedDiff,
            category: "Algorithms"
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch problems from backend API:", err);
    }

    // Fallback if backend API is not responding or returned empty list
    if (merged.length === 0) {
      if (typeof window !== "undefined") {
        const dynamicRaw = localStorage.getItem("synapse_dynamic_problems");
        if (dynamicRaw) {
          try {
            merged = JSON.parse(dynamicRaw);
          } catch (e) {
            console.error("Error reading dynamic problems:", e);
          }
        }
      }
    }
    setAvailableProblems(merged);
  };

  // Load available problems on mount
  useEffect(() => {
    refreshProblemsList();
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generated);
    }
  }, [title]);

  const toggleProblemSelection = (problemId) => {
    if (selectedProblemIds.includes(problemId)) {
      setSelectedProblemIds(selectedProblemIds.filter(id => id !== problemId));
    } else {
      setSelectedProblemIds([...selectedProblemIds, problemId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !slug) return;

    let start = new Date();
    if (startDate && startTime) {
      start = new Date(`${startDate}T${startTime}`);
    }
    const end = new Date(start.getTime() + durationMins * 60000);

    // Build the problems array from selection
    const contestProblems = selectedProblemIds.map(id => {
      const prob = availableProblems.find(p => p.id === id);
      return {
        ...prob,
        points: Math.round(totalPoints / (selectedProblemIds.length || 1))
      };
    });

    const timeLeftStr = status === "active"
      ? `${durationMins}m remaining`
      : status === "upcoming" ? "Starts in 2 hours" : "Completed";

    const newContestObj = {
      id: slug,
      title,
      desc,
      durationMins: Number(durationMins),
      totalPoints: Number(totalPoints),
      status,
      category,
      timeLeftStr,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      problems: contestProblems,
      leaderboard: []
    };

    // Save to localStorage
    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem("synapse_dynamic_contests");
      let existing = [];
      if (existingRaw) {
        try {
          existing = JSON.parse(existingRaw);
        } catch {
          existing = [];
        }
      }
      // Avoid duplicate slug
      existing = existing.filter(c => c.id !== slug);
      existing.unshift(newContestObj);
      localStorage.setItem("synapse_dynamic_contests", JSON.stringify(existing));
    }

    const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
    const headers = {
      "Content-Type": "application/json",
      ...(hasRealToken
        ? { Authorization: `Bearer ${token}` }
        : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
    };

    try {
      const res = await fetch(`${API_BASE}/api/contests`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          description: desc,
          category,
          startTime: start.toISOString(),
          endTime: end.toISOString()
        })
      });
      const data = await res.json();
      if (data.success && data.contest) {
        const createdContest = data.contest;
        // Post problem links to the contest
        for (const problemId of selectedProblemIds) {
          const numId = typeof problemId === "number" ? problemId : parseInt(problemId);
          if (!isNaN(numId)) {
            try {
              await fetch(`${API_BASE}/api/contests/${createdContest.id}/problem`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  problemId: numId,
                  points: Math.round(totalPoints / (selectedProblemIds.length || 1))
                })
              });
            } catch (err) {
              console.error("Failed to add problem to contest in database:", err);
            }
          }
        }
        console.log("Contest created and problems linked in backend database successfully");
      }
    } catch (err) {
      console.error("Failed to save contest to database, fallback to local storage:", err);
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/contest");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center space-x-1.5 text-xs font-semibold hover:underline cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={13} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Create New Contest
          </h1>
        </div>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border text-xs text-center font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        >
          🎉 Contest created successfully! Redirecting to the Contest Lobby...
        </motion.div>
      )}

      {/* Main Two-Column Layout (Form + Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left 2 cols: Main Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

          {/* Card 1: Basic Info */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2" style={{ color: "var(--text-accent)" }}>
              <Sparkles size={14} />
              <span>Basic Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Contest Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Synapse Code Clash #05"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1" style={{ color: "var(--text-secondary)" }}>
                  <span>Contest Slug / URL ID</span>
                  <HelpCircle size={10} className="text-[var(--text-muted)]" title="URL path identity tag, auto-generated from title" />
                </label>
                <input
                  type="text"
                  placeholder="synapse-code-clash-05"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                >
                  <option value="Algorithms & Frontend">Algorithms & Frontend</option>
                  <option value="System Design & Security">System Design & Security</option>
                  <option value="Full Stack Mastery">Full Stack Mastery</option>
                  <option value="Machine Learning & Data">Machine Learning & Data</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active (Live Now)</option>
                  <option value="past">Past / Completed</option>
                </select>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  placeholder="60"
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                  min="5"
                  required
                />
              </div>

              {/* Points */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Total Points
                </label>
                <input
                  type="number"
                  placeholder="300"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                  min="50"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Short Description
              </label>
              <textarea
                placeholder="Give a short overview description of the challenge..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all resize-none"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)"
                }}
                required
              />
            </div>
          </div>

          {/* Card 2: Timing details */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2" style={{ color: "var(--text-accent)" }}>
              <Calendar size={14} />
              <span>Schedule & Timeline</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl py-3 px-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Problem Selection */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2" style={{ color: "var(--text-accent)" }}>
                <Trophy size={14} />
                <span>Link Problems</span>
              </h2>

              <div className="flex items-center space-x-2">
                {/* Refresh list button */}
                <button
                  type="button"
                  onClick={refreshProblemsList}
                  title="Refresh Problems List"
                  className="p-2 rounded-xl border transition-all hover:scale-102 cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-secondary)"
                  }}
                >
                  <RefreshCw size={12} />
                </button>
                {/* Button to add custom problem */}
                <button
                  type="button"
                  onClick={() => window.open('/admin/problems/new', '_blank')}
                  className="px-3 py-2 rounded-xl text-[10px] font-bold text-white shadow-sm flex items-center space-x-1 hover:scale-102 transition-all cursor-pointer"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <Plus size={10} />
                  <span>Create Problem</span>
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
              {availableProblems.map((problem) => {
                const isSelected = selectedProblemIds.includes(problem.id);
                return (
                  <div
                    key={problem.id}
                    onClick={() => toggleProblemSelection(problem.id)}
                    className="p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:scale-101"
                    style={{
                      backgroundColor: isSelected ? "var(--bg-badge)" : "var(--bg-primary)",
                      borderColor: isSelected ? "var(--border-accent)" : "var(--border-primary)"
                    }}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{problem.title}</p>
                      <div className="flex items-center space-x-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        <span className={`font-semibold ${problem.difficulty === "Easy" ? "text-emerald-500" :
                          problem.difficulty === "Medium" ? "text-amber-500" : "text-rose-500"
                          }`}>{problem.difficulty}</span>
                        <span>•</span>
                        <span>{problem.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="rounded border shadow-sm accent-indigo-500 w-4 h-4"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-2 hover:scale-102"
              style={{ background: "var(--accent-gradient)" }}
            >
              <Save size={14} />
              <span>Create Contest & Publish</span>
            </button>
          </div>

        </form>

        {/* Right 1 col: Live Preview panel */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
            Lobby Card Preview
          </h2>

          {/* Preview Container */}
          <div
            className="group relative flex flex-col justify-between rounded-3xl p-6 shadow-lg border overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-card)"
            }}
          >
            {/* Status Line */}
            <div
              className={`absolute top-0 left-0 right-0 h-[3px] transition-all ${status === "active" ? "bg-emerald-500" : status === "upcoming" ? "bg-indigo-500" : "bg-slate-400"
                }`}
            />

            {/* Card Top */}
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border bg-slate-500/5"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                >
                  {category || "Category"}
                </span>

                {/* Dynamic Tag Pill */}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${status === "active" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                  status === "upcoming" ? "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" :
                    "text-[var(--text-muted)] bg-slate-500/5 border-transparent"
                  }`}>
                  {status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold font-display leading-snug group-hover:text-[var(--text-accent)] transition-colors"
                  style={{ color: "var(--text-primary)" }}
                >
                  {title || "Untitled Contest"}
                </h3>
                <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                  {desc || "Contest description preview goes here..."}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl border bg-slate-500/5" style={{ borderColor: "var(--border-primary)" }}>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Points</span>
                  <div className="text-sm font-black text-[var(--text-primary)]">{totalPoints} pts</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Duration</span>
                  <div className="text-sm font-black text-[var(--text-primary)]">{durationMins} mins</div>
                </div>
              </div>
            </div>

            {/* Card Bottom CTA Actions */}
            <div className="pt-4 mt-6 border-t flex items-center justify-between" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center space-x-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                <Clock size={12} className="text-[var(--text-muted)]" />
                <span>{status === "active" ? `${durationMins}m remaining` : status === "upcoming" ? "Starts in 2 hours" : "Completed"}</span>
              </div>

              {status === "active" && (
                <div
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center space-x-1"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <span>Enter Arena</span>
                  <ChevronRight size={13} />
                </div>
              )}

              {status === "upcoming" && (
                <div
                  className="px-4 py-2 text-xs font-bold rounded-xl border"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                >
                  Register
                </div>
              )}

              {status === "past" && (
                <div
                  className="px-4 py-2 text-xs font-bold rounded-xl border"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                >
                  View Scoreboard
                </div>
              )}
            </div>
          </div>

          {/* Quick instructions alert */}
          <div className="p-4 rounded-2xl border text-[11px] space-y-1.5" style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)", color: "var(--text-secondary)" }}>
            <p className="font-bold text-[var(--text-accent)]">Live Synchronization Preview</p>
            <p>Creating this contest will compile your metadata and append it to the lobby registry. It becomes instantly visible to guest students.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
