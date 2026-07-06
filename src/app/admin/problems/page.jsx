"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code, Plus, RefreshCw, Search, Trash2, Eye, Edit3,
  Tag, BarChart2, ArrowUpRight, Filter, X, CheckCircle2,
  Clock, AlertCircle, ChevronRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buildAuthHeaders } from "@/utils/api";

function getDifficultyStyle(difficulty) {
  const d = (difficulty || "").toUpperCase();
  if (d === "EASY" || d === "Easy")
    return {
      cls: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      label: "Easy",
    };
  if (d === "HARD" || d === "Hard")
    return {
      cls: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      label: "Hard",
    };
  return {
    cls: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    label: "Medium",
  };
}

export default function AdminProblemsPage() {
  const router = useRouter();
  const { token, API_BASE, user } = useAuth();

  const [allProblems, setAllProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("institute");

  useEffect(() => {
    if (user) {
      setActiveTab(user.role === "ADMIN" ? "global" : "institute");
    }
  }, [user]);

  const adminHeaders = buildAuthHeaders(token, user);

  const triggerNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadProblems = useCallback(async () => {
    setLoading(true);
    setError(null);
    let backendProblems = [];

    try {
      const res = await fetch(`${API_BASE}/api/problems`, {
        headers: adminHeaders,
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.success && data.problems) {
        backendProblems = data.problems.map((p) => ({
          ...p,
          isDbProblem: true,
          difficulty: p.difficulty, // Already uppercase from DB
        }));
      }
    } catch (err) {
      console.error("Failed to fetch problems from backend:", err);
      setError("Could not connect to the backend. Showing local/static data.");
    }

    const combinedProblems = backendProblems;

    setAllProblems(combinedProblems);
    setLoading(false);
  }, [API_BASE, token]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const handleDelete = async (problemId, isDbProblem, slug) => {
    if (!isDbProblem) {
      triggerNotification("Static problems cannot be deleted from here.", "error");
      setDeletingId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/problems/${problemId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllProblems((prev) =>
          prev.filter((p) => String(p.id) !== String(problemId))
        );
        triggerNotification("Problem deleted successfully.");
      } else {
        triggerNotification(data.message || "Failed to delete problem.", "error");
      }
    } catch (err) {
      triggerNotification("Server error while deleting problem.", "error");
    }
    setDeletingId(null);
  };

  const canDeleteProblem = (problem) => {
    if (!problem.isDbProblem) return false;
    if (user?.role === "ADMIN") return true;
    if (user?.role === "INSTITUTE_ADMIN" || user?.role === "MENTOR") {
      return !problem.instituteId || Number(problem.instituteId) === Number(user?.instituteId);
    }
    return false;
  };

  const tabProblems = allProblems.filter((p) => {
    if (user?.role === "ADMIN") return true;
    const isGlobal = p.instituteId === null || !p.instituteId;
    if (activeTab === "global" && !isGlobal) return false;
    if (activeTab === "institute" && isGlobal) return false;
    return true;
  });

  const filteredProblems = tabProblems.filter((p) => {
    const matchesSearch =
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const d = (p.difficulty || "").toUpperCase();
    const matchesDiff =
      filterDiff === "all" ||
      d === filterDiff.toUpperCase();
    return matchesSearch && matchesDiff;
  });

  const counts = {
    all: tabProblems.length,
    easy: tabProblems.filter(
      (p) => (p.difficulty || "").toUpperCase() === "EASY"
    ).length,
    medium: tabProblems.filter(
      (p) => (p.difficulty || "").toUpperCase() === "MEDIUM"
    ).length,
    hard: tabProblems.filter(
      (p) => (p.difficulty || "").toUpperCase() === "HARD"
    ).length,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl border relative overflow-hidden"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: "var(--border-primary)",
          backgroundImage:
            "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)",
        }}
      >
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <Code size={16} className="text-indigo-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
              Problem Registry
            </span>
          </div>
          <h1
            className="text-2xl md:text-3xl font-black font-display tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Manage Problems
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Review, publish, and manage all coding challenges in the system.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadProblems}
            className="p-2.5 rounded-xl border transition-all cursor-pointer hover:bg-slate-500/10"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-primary)",
            }}
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              style={{ color: "var(--text-secondary)" }}
            />
          </button>
          {!(activeTab === "global" && user?.role !== "ADMIN") && (
            <button
              onClick={() => router.push("/admin/problems/new")}
              className="px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-102"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #10b981 100%)",
              }}
            >
              <Plus size={14} />
              <span>Create Problem</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl border text-xs text-center font-bold ${notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "all", label: "Total Problems", color: "text-slate-400", bg: "bg-slate-500/10", icon: Code },
          { key: "easy", label: "Easy", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
          { key: "medium", label: "Medium", color: "text-amber-500", bg: "bg-amber-500/10", icon: BarChart2 },
          { key: "hard", label: "Hard", color: "text-rose-500", bg: "bg-rose-500/10", icon: AlertCircle },
        ].map(({ key, label, color, bg, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilterDiff(key)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${filterDiff === key
              ? "ring-1 ring-current"
              : "hover:bg-slate-500/5"
              } ${color}`}
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-card)",
            }}
          >
            <div className={`p-2 rounded-xl ${bg} ${color} w-fit mb-3`}>
              <Icon size={14} />
            </div>
            <div className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
              {counts[key]}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* Scope Tabs */}
      {user?.role !== "ADMIN" && (
        <div className="flex border-b" style={{ borderColor: "var(--border-primary)" }}>
          <button
            onClick={() => {
              setActiveTab("institute");
              setFilterDiff("all");
            }}
            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] cursor-pointer ${activeTab === "institute"
              ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
          >
            Your Institute Problems
          </button>
          <button
            onClick={() => {
              setActiveTab("global");
              setFilterDiff("all");
            }}
            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] cursor-pointer ${activeTab === "global"
              ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
          >
            Global Problems
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search by title, slug, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-xs outline-none border transition-all"
          style={{
            backgroundColor: "var(--bg-input, var(--bg-card))",
            borderColor: "var(--border-primary)",
            color: "var(--text-primary)",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Problems Table */}
      <div
        className="rounded-3xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-card)",
        }}
      >
        {/* Table Header row */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <div className="flex items-center space-x-2">
            <Code size={15} style={{ color: "var(--text-accent)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {filterDiff === "all"
                ? "All Problems"
                : `${filterDiff.charAt(0).toUpperCase() + filterDiff.slice(1)} Problems`}
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: "var(--bg-badge)",
                borderColor: "var(--border-accent)",
                color: "var(--text-accent)",
              }}
            >
              {filteredProblems.length}
            </span>
          </div>
          {error && (
            <span className="text-[10px] text-amber-400 font-semibold flex items-center space-x-1">
              <AlertCircle size={11} />
              <span>{error}</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 space-x-2">
            <RefreshCw
              size={16}
              className="animate-spin"
              style={{ color: "var(--text-accent)" }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Loading problems...
            </span>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Code
              size={40}
              className="mx-auto opacity-20"
              style={{ color: "var(--text-secondary)" }}
            />
            <p
              className="text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              No problems found
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {search
                ? "Try adjusting your search or filter."
                : "Create your first problem to get started."}
            </p>
            <button
              onClick={() => router.push("/admin/problems/new")}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:bg-slate-500/10"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-accent)",
              }}
            >
              <Plus size={12} />
              <span>Create Problem</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="font-bold uppercase tracking-wider border-b"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-muted)",
                    fontSize: "10px",
                  }}
                >
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Problem</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Difficulty</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-center">Test Cases</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--border-primary)" }}
              >
                <AnimatePresence>
                  {filteredProblems.map((problem, idx) => {
                    const { cls, label } = getDifficultyStyle(problem.difficulty);
                    return (
                      <motion.tr
                        key={problem.id ?? problem.slug ?? idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-slate-500/5 transition-colors"
                      >
                        {/* Index */}
                        <td
                          className="px-6 py-4 font-bold text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {idx + 1}
                        </td>

                        {/* Title */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p
                              className="font-bold max-w-[220px] truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {problem.title}
                            </p>
                            {problem.isStatic && (
                              <p
                                className="text-[9px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Static — not in DB
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="px-6 py-4">
                          <span
                            className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-500/5 border"
                            style={{
                              borderColor: "var(--border-primary)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {problem.slug || problem.id || "—"}
                          </span>
                        </td>

                        {/* Difficulty */}
                        <td className="px-6 py-4">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${cls}`}
                          >
                            {label}
                          </span>
                        </td>

                        {/* Category */}
                        <td
                          className="px-6 py-4"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <span className="text-[10px] font-semibold">
                            {problem.category || "Algorithms"}
                          </span>
                        </td>

                        {/* Test Cases */}
                        <td className="px-6 py-4 text-center">
                          <span
                            className="font-extrabold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {problem.testCasesCount ??
                              problem.testCases?.length ??
                              problem.tests?.length ??
                              "—"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/practice/${problem.slug || problem.id}`
                                )
                              }
                              className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-500/10"
                              style={{ borderColor: "var(--border-primary)" }}
                              title="View Problem"
                            >
                              <Eye
                                size={12}
                                style={{ color: "var(--text-secondary)" }}
                              />
                            </button>
                            {canDeleteProblem(problem) && (
                              <>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/admin/problems/${problem.id}/edit`
                                    )
                                  }
                                  className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-500/10"
                                  style={{ borderColor: "var(--border-primary)" }}
                                  title="Edit Problem"
                                >
                                  <Edit3
                                    size={12}
                                    style={{ color: "var(--text-secondary)" }}
                                  />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeletingId({
                                      id: problem.id,
                                      slug: problem.slug,
                                      isDb: true,
                                    })
                                  }
                                  className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/20"
                                  style={{ borderColor: "var(--border-primary)" }}
                                  title="Delete Problem"
                                >
                                  <Trash2 size={12} className="text-rose-400" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="p-8 rounded-3xl border shadow-2xl max-w-sm w-full space-y-6 text-center"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-primary)",
              }}
            >
              <div className="space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto">
                  <Trash2 size={22} />
                </div>
                <h3
                  className="text-base font-black"
                  style={{ color: "var(--text-primary)" }}
                >
                  Delete Problem?
                </h3>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  This will permanently delete this problem and all associated
                  test cases and submissions. This cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:bg-slate-500/10"
                  style={{
                    borderColor: "var(--border-primary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleDelete(deletingId.id, deletingId.isDb, deletingId.slug)
                  }
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer hover:scale-102 bg-rose-500 hover:bg-rose-600"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
