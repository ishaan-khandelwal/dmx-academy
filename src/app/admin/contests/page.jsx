"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Plus, RefreshCw, Search, Trash2, Users,
  Clock, Calendar, ChevronRight, CheckCircle2, AlertCircle,
  ArrowUpRight, Edit3, Filter, X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buildAuthHeaders } from "@/utils/api";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function getContestStatus(c) {
  const now = new Date();
  const start = new Date(c.startTime);
  const end = new Date(c.endTime);
  if (now >= start && now <= end) return "active";
  if (now > end) return "past";
  return "upcoming";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminContestsPage() {
  const router = useRouter();
  const { token, API_BASE, user } = useAuth();

  const [allContests, setAllContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | active | upcoming | past
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const adminHeaders = buildAuthHeaders(token, user);

  const triggerNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadContests = useCallback(async () => {
    setLoading(true);
    setError(null);
    let merged = [];

    try {
      const res = await fetch(`${API_BASE}/api/contests`, {
        headers: adminHeaders,
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.success && data.contests) {
        merged = data.contests.map((c) => ({
          ...c,
          status: getContestStatus(c),
          isDbContest: true,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch backend contests:", err);
      setError("Could not connect to the backend. Database is offline.");
    }

    setAllContests(merged);
    setLoading(false);
  }, [API_BASE, token]);

  useEffect(() => {
    loadContests();
  }, [loadContests]);

  const handleDelete = async (contestId) => {
    try {
      const res = await fetch(`${API_BASE}/api/contests/${contestId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllContests((prev) =>
          prev.filter((c) => String(c.id) !== String(contestId))
        );
        triggerNotification("Contest deleted successfully.");
      } else {
        triggerNotification(data.message || "Failed to delete contest.", "error");
      }
    } catch (err) {
      triggerNotification("Server error while deleting contest.", "error");
    }
    setDeletingId(null);
  };

  const filteredContests = allContests.filter((c) => {
    const matchesSearch =
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: allContests.length,
    active: allContests.filter((c) => c.status === "active").length,
    upcoming: allContests.filter((c) => c.status === "upcoming").length,
    past: allContests.filter((c) => c.status === "past").length,
  };

  const statusStyles = {
    active: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    upcoming: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    past: "text-slate-400 bg-slate-500/5 border-transparent",
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
            "linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
        }}
      >
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <Trophy size={16} className="text-cyan-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
              Contest Registry
            </span>
          </div>
          <h1
            className="text-2xl md:text-3xl font-black font-display tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Manage Contests
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            View, manage, and delete contests from the registry.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadContests}
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
          <button
            onClick={() => router.push("/admin/contests/new")}
            className="px-5 py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-102"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
            }}
          >
            <Plus size={14} />
            <span>Create Contest</span>
          </button>
        </div>
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl border text-xs text-center font-bold ${
              notification.type === "error"
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "All Contests", color: "text-slate-400" },
          { key: "active", label: "Active", color: "text-emerald-400" },
          { key: "upcoming", label: "Upcoming", color: "text-indigo-400" },
          { key: "past", label: "Past", color: "text-slate-500" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              filterStatus === f.key
                ? "border-current bg-current/10"
                : "border-transparent bg-slate-500/5 hover:bg-slate-500/10"
            } ${f.color}`}
          >
            <span>{f.label}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-current/15 text-current">
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search by title or category..."
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

      {/* Contest Table */}
      <div
        className="rounded-3xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-card)",
        }}
      >
        {/* Table Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <div className="flex items-center space-x-2">
            <Trophy size={15} style={{ color: "var(--text-accent)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {filterStatus === "all" ? "All Contests" : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Contests`}
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: "var(--bg-badge)",
                borderColor: "var(--border-accent)",
                color: "var(--text-accent)",
              }}
            >
              {filteredContests.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 space-x-2">
            <RefreshCw
              size={16}
              className="animate-spin"
              style={{ color: "var(--text-accent)" }}
            />
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              Loading contests...
            </span>
          </div>
        ) : filteredContests.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Trophy
              size={40}
              className="mx-auto opacity-20"
              style={{ color: "var(--text-secondary)" }}
            />
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              No contests found
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {search ? "Try adjusting your search or filter." : "Create your first contest."}
            </p>
            <button
              onClick={() => router.push("/admin/contests/new")}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:bg-slate-500/10"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-accent)",
              }}
            >
              <Plus size={12} />
              <span>Create Contest</span>
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
                  <th className="px-6 py-3">Contest</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Start Time</th>
                  <th className="px-6 py-3">End Time</th>
                  <th className="px-6 py-3 text-center">Problems</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--border-primary)" }}
              >
                <AnimatePresence>
                  {filteredContests.map((contest, idx) => (
                    <motion.tr
                      key={contest.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-500/5 transition-colors"
                    >
                      {/* Title */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p
                            className="font-bold max-w-[200px] truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {contest.title}
                          </p>
                          {contest.description && (
                            <p
                              className="text-[10px] max-w-[200px] truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {contest.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span
                          className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border"
                          style={{
                            borderColor: "var(--border-primary)",
                            color: "var(--text-secondary)",
                            backgroundColor: "var(--bg-primary)",
                          }}
                        >
                          {contest.category || "General"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                            statusStyles[contest.status] || statusStyles.past
                          }`}
                        >
                          {contest.status === "active" ? "● Active" : contest.status}
                        </span>
                      </td>

                      {/* Start */}
                      <td
                        className="px-6 py-4 font-mono text-[10px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDate(contest.startTime)}
                      </td>

                      {/* End */}
                      <td
                        className="px-6 py-4 font-mono text-[10px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDate(contest.endTime)}
                      </td>

                      {/* Problems count */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className="font-extrabold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {contest.contestProblems?.length ??
                            contest.problems?.length ??
                            "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {contest.isDbContest && (
                            <>
                              <button
                                onClick={() =>
                                  router.push(`/admin/contests/${contest.id}/edit`)
                                }
                                className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-500/10 group"
                                style={{ borderColor: "var(--border-primary)" }}
                                title="Edit Contest"
                              >
                                <Edit3
                                  size={12}
                                  style={{ color: "var(--text-secondary)" }}
                                />
                              </button>
                              <button
                                onClick={() =>
                                  router.push(`/admin/contests/${contest.id}`)
                                }
                                className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-500/10 group"
                                style={{ borderColor: "var(--border-primary)" }}
                                title="View Participants"
                              >
                                <Users
                                  size={12}
                                  style={{ color: "var(--text-accent)" }}
                                />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              router.push(`/contest/${contest.id}`)
                            }
                            className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-slate-500/10"
                            style={{ borderColor: "var(--border-primary)" }}
                            title="View in Arena"
                          >
                            <ArrowUpRight
                              size={12}
                              style={{ color: "var(--text-secondary)" }}
                            />
                          </button>
                          {(contest.isDbContest || contest.isLocalContest) && (
                            <button
                              onClick={() =>
                                setDeletingId(String(contest.id))
                              }
                              className="p-1.5 rounded-lg border transition-all cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/20"
                              style={{ borderColor: "var(--border-primary)" }}
                              title="Delete Contest"
                            >
                              <Trash2 size={12} className="text-rose-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
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
                  Delete Contest?
                </h3>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  This will permanently delete the contest and all related
                  data. This action cannot be undone.
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
                  onClick={() => {
                    const contest = allContests.find(
                      (c) => String(c.id) === deletingId
                    );
                    if (contest)
                      handleDelete(contest.id);
                  }}
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
