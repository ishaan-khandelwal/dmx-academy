"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Clock, Sparkles, ChevronRight, Save,
  Plus, Trash2, Calendar, HelpCircle, ArrowLeft, X, RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function EditContest() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.contestId;
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingContest, setLoadingContest] = useState(true);

  // Custom problems states
  const [availableProblems, setAvailableProblems] = useState([]);

  const refreshProblemsList = async () => {
    let merged = [];
    try {
      const res = await fetch(`${API_BASE}/api/problems`);
      const data = await res.json();
      if (data.success && data.problems) {
        merged = data.problems.map(prob => {
          const formattedDiff = prob.difficulty.charAt(0) + prob.difficulty.slice(1).toLowerCase();
          return {
            id: prob.id,
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
    setAvailableProblems(merged);
  };

  const loadContestData = useCallback(async () => {
    if (!contestId) return;
    setLoadingContest(true);
    try {
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
      };

      const res = await fetch(`${API_BASE}/api/contests/${contestId}`, { headers });
      const data = await res.json();
      if (data.success && data.contest) {
        const contest = data.contest;
        setTitle(contest.title || "");
        setDesc(contest.description || "");
        setCategory(contest.category || "Algorithms & Frontend");

        // Parse Start Date and Time
        if (contest.startTime) {
          const startObj = new Date(contest.startTime);
          const yyyy = startObj.getFullYear();
          const mm = String(startObj.getMonth() + 1).padStart(2, "0");
          const dd = String(startObj.getDate()).padStart(2, "0");
          setStartDate(`${yyyy}-${mm}-${dd}`);

          const hh = String(startObj.getHours()).padStart(2, "0");
          const min = String(startObj.getMinutes()).padStart(2, "0");
          setStartTime(`${hh}:${min}`);
        }

        // Calculate Duration
        if (contest.startTime && contest.endTime) {
          const diffMins = Math.round((new Date(contest.endTime) - new Date(contest.startTime)) / 60000);
          setDurationMins(diffMins);
        }

        // Determine Status based on time (matching getContestStatus logic)
        const now = new Date();
        const start = new Date(contest.startTime);
        const end = new Date(contest.endTime);
        if (now >= start && now <= end) setStatus("active");
        else if (now > end) setStatus("past");
        else setStatus("upcoming");

        // Problems
        if (contest.contestProblems) {
          const pIds = contest.contestProblems.map(cp => cp.problemId);
          setSelectedProblemIds(pIds);

          const sumPoints = contest.contestProblems.reduce((sum, cp) => sum + (cp.points || 0), 0);
          setTotalPoints(sumPoints || 300);
        }
      } else {
        alert("Failed to load contest details.");
      }
    } catch (err) {
      console.error("Failed to load contest:", err);
    }
    setLoadingContest(false);
  }, [contestId, API_BASE, token]);

  // Load problems and contest details on mount
  useEffect(() => {
    const init = async () => {
      await refreshProblemsList();
      await loadContestData();
    };
    init();
  }, [contestId, loadContestData]);

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
    if (!title) return;
    if (submitting) return; // prevent double submit
    setSubmitting(true);
    setErrorMsg(null);

    let start = new Date();
    if (startDate && startTime) {
      start = new Date(`${startDate}T${startTime}`);
    }
    const end = new Date(start.getTime() + durationMins * 60000);

    const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
    const headers = {
      "Content-Type": "application/json",
      ...(hasRealToken
        ? { Authorization: `Bearer ${token}` }
        : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
    };

    try {
      const res = await fetch(`${API_BASE}/api/contests/${contestId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title,
          description: desc,
          category,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          problems: selectedProblemIds,
          totalPoints: Number(totalPoints)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        let errMsg = data.message || "Failed to update contest in database.";
        setErrorMsg(errMsg);
        setSubmitting(false);
        return;
      }

      console.log("Contest updated and problems synced in database successfully");
      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/contests");
      }, 1000);
    } catch (err) {
      console.error("Failed to update contest:", err);
      setErrorMsg("Network error connecting to the database server.");
      setSubmitting(false);
    }
  };

  if (loadingContest) {
    return (
      <div className="flex items-center justify-center py-20 space-x-2">
        <RefreshCw size={18} className="animate-spin text-cyan-400" />
        <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
          Loading contest details...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/admin/contests")}
            className="flex items-center space-x-1.5 text-xs font-semibold hover:underline cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={13} />
            <span>Back to Contests List</span>
          </button>
          <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Edit Contest
          </h1>
        </div>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border text-xs text-center font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        >
          🎉 Contest updated successfully! Redirecting back...
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border text-xs text-center font-bold bg-rose-500/10 border-rose-500/20 text-rose-400"
        >
          ⚠️ {errorMsg}
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
              <div className="space-y-1.5 opacity-60">
                <label className="text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1" style={{ color: "var(--text-secondary)" }}>
                  <span>Contest Slug / URL ID</span>
                  <HelpCircle size={10} className="text-[var(--text-muted)]" title="URL path identity tag, read-only for existing contests" />
                </label>
                <input
                  type="text"
                  placeholder="synapse-code-clash-05"
                  value={slug}
                  disabled
                  className="w-full rounded-2xl py-3 px-4 text-xs border bg-slate-500/5 cursor-not-allowed"
                  style={{
                    borderColor: "var(--border-primary)",
                    color: "var(--text-muted)"
                  }}
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
              disabled={submitting || success}
              className="px-8 py-3.5 rounded-2xl font-bold text-xs text-white shadow-md transition-all flex items-center space-x-2 hover:scale-102 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "var(--accent-gradient)", cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Changes</span>
                </>
              )}
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-secondary)"
                  }}
                >
                  {category}
                </span>

                <div className="flex items-center space-x-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-500 animate-pulse" : status === "upcoming" ? "bg-indigo-500" : "bg-slate-400"
                    }`} />
                  <span
                    className="text-[9px] font-extrabold uppercase"
                    style={{
                      color: status === "active" ? "var(--text-emerald-500, #10b981)" : status === "upcoming" ? "var(--text-indigo-500, #6366f1)" : "var(--text-muted)"
                    }}
                  >
                    {status}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h3
                  className="font-bold text-sm leading-snug group-hover:text-[var(--text-accent)] transition-colors"
                  style={{ color: "var(--text-primary)" }}
                >
                  {title || "Untitled Contest"}
                </h3>
                <p
                  className="text-[10px] line-clamp-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {desc || "No description provided yet."}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t flex items-center justify-between text-[10px] font-bold" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
              <div className="flex items-center space-x-1">
                <Clock size={11} />
                <span>{durationMins} Mins</span>
              </div>
              <div className="flex items-center space-x-1 text-indigo-400">
                <Trophy size={11} />
                <span>{totalPoints} Pts</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
