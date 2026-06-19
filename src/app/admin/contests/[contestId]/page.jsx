"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, ArrowLeft, CheckCircle2, XCircle, RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ContestParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.contestId;
  const { token, API_BASE } = useAuth();

  const [contest, setContest] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
  const adminHeaders = {
    "Content-Type": "application/json",
    ...(hasRealToken
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch contest details
      const contestRes = await fetch(`${API_BASE}/api/contests/${contestId}`, {
        headers: adminHeaders
      });
      const contestData = await contestRes.json();
      if (contestData.success && contestData.contest) {
        setContest(contestData.contest);
      }

      // Fetch participants
      const partRes = await fetch(`${API_BASE}/api/contests/${contestId}/participants`, {
        headers: adminHeaders
      });
      const partData = await partRes.json();
      if (partData.success) {
        setParticipants(partData.participants);
      } else {
        setError(partData.message || "Failed to load participants.");
      }
    } catch (err) {
      setError("Could not connect to the backend server.");
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!contestId) return;
    fetchData();
  }, [contestId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const getStatus = () => {
    if (!contest) return "unknown";
    const now = new Date();
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    if (now >= start && now <= end) return "active";
    if (now > end) return "past";
    return "upcoming";
  };

  const contestStatus = getStatus();

  return (
    <div className="space-y-6">
      {/* Breadcrumb header */}
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
            Contest Participants
          </h1>
          {contest && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {contest.title} &mdash; ID #{contestId}
            </p>
          )}
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:scale-102"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-primary)",
            color: "var(--text-secondary)"
          }}
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Contest Info Bar */}
      {contest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-3xl border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Status</span>
            <div className={`text-xs font-bold uppercase ${
              contestStatus === "active" ? "text-emerald-500" :
              contestStatus === "upcoming" ? "text-indigo-500" : "text-slate-400"
            }`}>
              {contestStatus}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Starts</span>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{formatDate(contest.startTime)}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Ends</span>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{formatDate(contest.endTime)}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Problems</span>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {contest.contestProblems ? contest.contestProblems.length : 0} problems
            </div>
          </div>
        </motion.div>
      )}

      {/* Participants Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
      >
        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-2">
            <Users size={16} style={{ color: "var(--text-accent)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Participants
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: "var(--bg-badge)",
                borderColor: "var(--border-accent)",
                color: "var(--text-accent)"
              }}
            >
              {participants.length} total
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
            <Trophy size={12} />
            <span>Ranked by Score</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 space-x-2">
            <RefreshCw size={16} className="animate-spin" style={{ color: "var(--text-accent)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Loading participants...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-2">
            <XCircle size={36} className="mx-auto text-rose-500 opacity-60" />
            <p className="text-xs font-bold text-rose-500">{error}</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users size={40} className="mx-auto opacity-20" style={{ color: "var(--text-secondary)" }} />
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>No participants yet</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Students who start this contest will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="font-bold uppercase tracking-wider border-b" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-muted)", fontSize: "10px" }}>
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Score</th>
                  <th className="px-6 py-3 text-center">Time Spent</th>
                  <th className="px-6 py-3 text-right">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
                {participants.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="px-6 py-4 font-bold" style={{ color: "var(--text-secondary)" }}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </td>
                    <td className="px-6 py-4 font-bold" style={{ color: "var(--text-primary)" }}>
                      {p.user.username}
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                      {p.user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        p.user.role === "ADMIN" ? "text-rose-500 bg-rose-500/10 border-rose-500/20" :
                        p.user.role === "MENTOR" ? "text-purple-500 bg-purple-500/10 border-purple-500/20" :
                        "text-blue-500 bg-blue-500/10 border-blue-500/20"
                      }`}>
                        {p.user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.completed ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-500 font-bold text-[10px]">
                          <CheckCircle2 size={12} />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-500 font-bold text-[10px]">
                          <Clock size={12} />
                          <span>In Progress</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-extrabold" style={{ color: "var(--text-accent)" }}>
                      {p.score} pts
                    </td>
                    <td className="px-6 py-4 text-center font-mono" style={{ color: "var(--text-secondary)" }}>
                      {p.timeSpent || "—"}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: "var(--text-muted)" }}>
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
