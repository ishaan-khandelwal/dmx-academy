"use client";

import React from "react";
import { Trophy, Clock, CheckCircle, XCircle, Medal, Crown, Minus } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = [
  { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", fill: "bg-blue-500" },
  { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400", fill: "bg-violet-500" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", fill: "bg-amber-500" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-400", fill: "bg-rose-500" },
];

function formatTime(ms) {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function RankBadge({ rank }) {
  if (rank === 1) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-md shadow-amber-400/30 relative"
      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
      <span className="text-[11px] font-black text-white leading-none">{rank}</span>
    </div>
  );
  if (rank === 2) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
      style={{ background: "linear-gradient(135deg, #94a3b8, #64748b)" }}>
      <span className="text-[11px] font-black text-white leading-none">{rank}</span>
    </div>
  );
  if (rank === 3) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
      style={{ background: "linear-gradient(135deg, #c2764a, #92400e)" }}>
      <span className="text-[11px] font-black text-white leading-none">{rank}</span>
    </div>
  );
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black"
      style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-muted)" }}>
      {rank}
    </div>
  );
}

// ─── Per-Question Results Overlay ─────────────────────────────────────────────
export function PollResultsOverlay({ pollData, onClose, currentUsername }) {
  const { poll, voteCounts, totalVotes, studentResults } = pollData;
  const myResult = studentResults?.find(r => r.username === currentUsername);

  const sortedResults = React.useMemo(() => {
    if (!studentResults) return [];
    return [...studentResults].sort((a, b) => {
      // 1. Correct answers first
      if (a.isCorrect && !b.isCorrect) return -1;
      if (!a.isCorrect && b.isCorrect) return 1;

      // 2. Skipped/unanswered at the very bottom
      const aSkipped = a.chosenIdx === -1;
      const bSkipped = b.chosenIdx === -1;
      if (aSkipped && !bSkipped) return 1;
      if (!aSkipped && bSkipped) return -1;

      // 3. Compare response speed (faster timeMs first)
      return (a.timeMs || 0) - (b.timeMs || 0);
    });
  }, [studentResults]);

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
              Poll Ended
            </div>
            {myResult && (
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${myResult.isCorrect ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                {myResult.isCorrect ? `+${myResult.points} pts` : "Wrong"}
              </div>
            )}
          </div>
          <h3 className="text-base font-black leading-snug" style={{ color: "var(--text-primary)" }}>
            {poll.question}
          </h3>
        </div>

        {/* Options with vote bars */}
        <div className="px-6 py-4 space-y-3">
          {poll.options.map((opt, idx) => {
            const count = voteCounts?.[idx] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isCorrect = idx === poll.correctIdx;
            const myChoice = myResult?.chosenIdx === idx;

            return (
              <div key={idx} className={`relative rounded-2xl border overflow-hidden transition-all ${isCorrect
                  ? "border-emerald-500/40 bg-emerald-500/8"
                  : myChoice && !isCorrect
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-transparent"
                }`}
                style={!isCorrect && !myChoice ? { borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" } : {}}>

                {/* Progress fill */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 rounded-2xl ${isCorrect ? "bg-emerald-500/15" : "bg-slate-500/8"}`}
                  style={{ width: `${pct}%` }}
                />

                <div className="relative flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${OPTION_COLORS[idx].bg} ${OPTION_COLORS[idx].text}`}>
                    {OPTION_LABELS[idx]}
                  </span>

                  {/* Option text + sub-label */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block" style={{ color: "var(--text-primary)" }}>
                      {opt}
                    </span>
                    {isCorrect && myChoice && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle size={9} /> Correct Answer · Your Answer
                      </span>
                    )}
                    {isCorrect && !myChoice && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle size={9} /> Correct Answer
                      </span>
                    )}
                    {myChoice && !isCorrect && (
                      <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 mt-0.5">
                        <XCircle size={9} /> Your Answer (Wrong)
                      </span>
                    )}
                  </div>

                  {/* Percentage */}
                  <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-muted)" }}>
                    {pct}% <span className="text-[10px]">({count})</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* All ranked results */}
        {sortedResults && sortedResults.length > 0 && (
          <div className="px-6 pb-5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
              All Rankings
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {sortedResults.map((r, idx) => (
                <div key={r.username} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${r.username === currentUsername ? "border-[var(--border-accent)] bg-[var(--bg-badge)]" : ""}`}
                  style={r.username !== currentUsername ? { borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" } : {}}>
                  <RankBadge rank={idx + 1} />
                  <span className="flex-1 text-xs font-bold font-mono truncate" style={{ color: "var(--text-primary)" }}>
                    {r.username} {r.username === currentUsername && <span className="text-[var(--text-accent)]">(You)</span>}
                  </span>
                  <span className={`text-[10px] font-bold ${r.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {r.isCorrect ? `+${r.points}` : "✗"}
                  </span>
                  <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <Clock size={9} />{formatTime(r.timeMs)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onClose && (
          <div className="px-6 pb-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 cursor-pointer border"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
            >
              Close Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cumulative Session Leaderboard Panel ─────────────────────────────────────
export function SessionLeaderboard({ leaderboard, totalPolls, currentUsername, compact = false, title = "Session Leaderboard" }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="rounded-[1.1rem] border p-3.5 text-center space-y-2" style={{ backgroundColor: "var(--bg-card)", borderColor: "rgba(148, 163, 184, 0.18)" }}>
        <Trophy size={24} className="mx-auto opacity-30" style={{ color: "var(--text-muted)" }} />
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          No leaderboard yet — no polls have been run in this session.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.1rem] border overflow-hidden" style={{ backgroundColor: "var(--bg-card)", borderColor: "rgba(148, 163, 184, 0.18)" }}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(148, 163, 184, 0.16)" }}>
        <Trophy size={14} className="text-amber-400" />
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        {totalPolls > 0 && (
          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-muted)" }}>
            {totalPolls} poll{totalPolls !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="px-4 py-1.5 flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider"
        style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-primary)" }}>
        <span className="w-7 shrink-0">#</span>
        <span className="flex-1">Student</span>
        <span className="w-14 text-right">Correct</span>
        <span className="w-14 text-right">Pts</span>
      </div>

      {/* Rows — show all participants */}
      <div className="divide-y overflow-y-auto" style={{ divideColor: "var(--border-primary)", scrollbarWidth: "thin" }}>
        {leaderboard.map((entry) => {
          const isMe = entry.username === currentUsername;
          return (
            <div
              key={entry.username}
              className={`flex items-center gap-2 px-4 py-2 transition-all ${isMe ? "bg-[var(--bg-badge)]" : "hover:bg-[var(--bg-hover)]"}`}
            >
              <div className="shrink-0">
                <RankBadge rank={entry.rank} />
              </div>
              <span className="flex-1 text-xs font-bold font-mono truncate" style={{ color: "var(--text-primary)" }}>
                {entry.username}
                {isMe && <span className="ml-1.5 text-[9px] font-extrabold text-[var(--text-accent)]">(You)</span>}
              </span>
              <span className="w-14 text-right text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
                {entry.correctCount}/{entry.totalAnswered}
              </span>
              <span className="w-14 text-right text-[11px] font-extrabold text-amber-400">
                {entry.totalPoints.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Full End-of-Session Leaderboard (shown on session ended screen) ──────────
export function EndSessionLeaderboard({ leaderboard, totalPolls, currentUsername }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="text-center space-y-2 py-4">
        <Trophy size={32} className="mx-auto opacity-20" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          No leaderboard — no polls were run in this session.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-amber-400" />
        <h2 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
          Final Session Leaderboard
        </h2>
        <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-muted)" }}>
          {totalPolls} poll{totalPolls !== 1 ? "s" : ""} conducted
        </span>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border-primary)" }}>
        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-4 px-6 pt-6 pb-4"
            style={{ background: "linear-gradient(to bottom, var(--bg-badge), transparent)" }}>
            {/* 2nd */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center">
                <Medal size={18} className="text-white" />
              </div>
              <span className="text-[10px] font-black truncate max-w-[64px] text-center" style={{ color: "var(--text-primary)" }}>
                {leaderboard[1]?.username}
              </span>
              <span className="text-[9px] font-bold text-amber-400">{leaderboard[1]?.totalPoints.toLocaleString()} pts</span>
              <div className="w-16 h-10 rounded-t-lg bg-slate-500/20 flex items-center justify-center text-sm font-black" style={{ color: "var(--text-muted)" }}>2</div>
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
                <Crown size={22} className="text-white" />
              </div>
              <span className="text-[11px] font-black truncate max-w-[72px] text-center" style={{ color: "var(--text-primary)" }}>
                {leaderboard[0]?.username}
              </span>
              <span className="text-[10px] font-bold text-amber-400">{leaderboard[0]?.totalPoints.toLocaleString()} pts</span>
              <div className="w-16 h-16 rounded-t-lg bg-amber-400/20 flex items-center justify-center text-lg font-black text-amber-400">1</div>
            </div>
            {/* 3rd */}
            {leaderboard[2] && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-amber-700/80 flex items-center justify-center">
                  <Medal size={18} className="text-white" />
                </div>
                <span className="text-[10px] font-black truncate max-w-[64px] text-center" style={{ color: "var(--text-primary)" }}>
                  {leaderboard[2]?.username}
                </span>
                <span className="text-[9px] font-bold text-amber-400">{leaderboard[2]?.totalPoints.toLocaleString()} pts</span>
                <div className="w-16 h-7 rounded-t-lg bg-amber-700/20 flex items-center justify-center text-sm font-black" style={{ color: "var(--text-muted)" }}>3</div>
              </div>
            )}
          </div>
        )}

        {/* Full table */}
        <div className="divide-y" style={{ divideColor: "var(--border-primary)" }}>
          <div className="px-5 py-2 flex items-center gap-3 text-[9px] font-extrabold uppercase tracking-wider"
            style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-primary)" }}>
            <span className="w-7 shrink-0">#</span>
            <span className="flex-1">Student</span>
            <span className="w-16 text-right">Correct</span>
            <span className="w-16 text-right">Avg Time</span>
            <span className="w-16 text-right">Points</span>
          </div>
          {leaderboard.map((entry) => {
            const isMe = entry.username === currentUsername;
            const avgTime = entry.totalAnswered > 0 ? Math.round(entry.totalTimeMs / entry.totalAnswered) : 0;
            return (
              <div key={entry.username}
                className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-[var(--bg-badge)]" : ""}`}>
                <div className="shrink-0"><RankBadge rank={entry.rank} /></div>
                <span className="flex-1 text-sm font-bold font-mono truncate" style={{ color: "var(--text-primary)" }}>
                  {entry.username}
                  {isMe && <span className="ml-1.5 text-[9px] font-extrabold text-[var(--text-accent)]">(You)</span>}
                </span>
                <span className="w-16 text-right text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  {entry.correctCount}/{entry.totalAnswered}
                </span>
                <span className="w-16 text-right text-xs font-bold flex items-center justify-end gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock size={9} />{formatTime(avgTime)}
                </span>
                <span className="w-16 text-right text-sm font-extrabold text-amber-400">
                  {entry.totalPoints.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
