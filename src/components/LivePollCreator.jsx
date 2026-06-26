"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart2,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  X,
  Send,
  StopCircle,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getApiBase } from "@/utils/api";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = [
  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
];
const TIMER_OPTIONS = [15, 30, 45, 60];

export default function LivePollCreator({
  sessionId,
  authToken,
  room,
  activePoll,         // { id, question, options, timerSecs, startedAt } or null
  onPollLaunched,     // (poll) => void
  onPollEnded,        // () => void
  incomingAnswers,    // Map<username, { chosenIdx, timeMs }> - collected from data channel
}) {
  const API_BASE = getApiBase();

  // Form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [timerSecs, setTimerSecs] = useState(30);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState(null);

  // Live countdown while poll is active
  const [remaining, setRemaining] = useState(null);
  const handleEndPollRef = React.useRef(null);

  useEffect(() => {
    if (!activePoll) {
      setRemaining(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - new Date(activePoll.startedAt).getTime()) / 1000);
      const left = Math.max(0, activePoll.timerSecs - elapsed);
      setRemaining(left);
      return left;
    };

    const initialLeft = updateTimer();
    if (initialLeft <= 0) {
      if (handleEndPollRef.current) {
        handleEndPollRef.current();
      }
      return;
    }

    const interval = setInterval(() => {
      const left = updateTimer();
      if (left <= 0) {
        clearInterval(interval);
        if (handleEndPollRef.current) {
          handleEndPollRef.current();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activePoll]);

  const sendDataChannel = (payloadObj) => {
    if (!room || room.state !== "connected" || !room.localParticipant) return;
    try {
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(payloadObj)), {
        reliable: true,
        topic: "poll-events",
      });
    } catch (e) {
      console.warn("Failed to publish poll event:", e);
    }
  };

  const handleAddOption = () => {
    if (options.length < 4) setOptions(prev => [...prev, ""]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) return;
    const newOpts = options.filter((_, i) => i !== idx);
    setOptions(newOpts);
    if (correctIdx >= newOpts.length) setCorrectIdx(newOpts.length - 1);
  };

  const handleOptionChange = (idx, val) => {
    setOptions(prev => prev.map((o, i) => i === idx ? val : o));
  };

  const handleLaunchPoll = async () => {
    setError(null);
    if (!question.trim()) { setError("Question text is required."); return; }
    if (options.some(o => !o.trim())) { setError("All options must have text."); return; }

    setIsLaunching(true);
    try {
      const res = await fetch(`${API_BASE}/api/livekit/session/${sessionId}/poll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ question: question.trim(), options: options.map(o => o.trim()), correctIdx, timerSecs }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const pollPayload = {
        action: "POLL_START",
        pollId: data.poll.id,
        question: data.poll.question,
        options: data.poll.options,
        correctIdx: data.poll.correctIdx,
        timerSecs: data.poll.timerSecs,
        startedAt: new Date().toISOString(),
      };
      sendDataChannel(pollPayload);

      if (onPollLaunched) onPollLaunched({ ...pollPayload, id: data.poll.id });

      // Reset form
      setQuestion("");
      setOptions(["", ""]);
      setCorrectIdx(0);
      setTimerSecs(30);
    } catch (e) {
      setError(e.message || "Failed to launch poll.");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleEndPoll = () => {
    if (!activePoll) return;
    sendDataChannel({
      action: "POLL_END",
      pollId: activePoll.id,
    });
    if (onPollEnded) onPollEnded();
  };

  useEffect(() => {
    handleEndPollRef.current = handleEndPoll;
  });

  // Compute live vote distribution from incomingAnswers
  const voteCounts = activePoll
    ? (activePoll.options || []).map((_, idx) =>
        [...(incomingAnswers?.values() || [])].filter(a => a.chosenIdx === idx).length
      )
    : [];
  const totalAnswered = incomingAnswers?.size || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Active Poll View ────────────────────────────────────── */}
      {activePoll ? (
        <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto px-4 pb-4">
          {/* Status bar */}
          <div className="flex items-center justify-between p-3 rounded-xl border"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "rgba(148, 163, 184, 0.18)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black" style={{ color: "var(--text-primary)" }}>Poll Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                <Users size={12} />
                <span>{totalAnswered} answered</span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-black ${remaining <= 5 ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
                <Clock size={12} />
                <span>{remaining ?? "—"}s</span>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="p-3.5 rounded-xl border" style={{ backgroundColor: "var(--bg-card)", borderColor: "rgba(148, 163, 184, 0.18)" }}>
            <p className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Question</p>
            <p className="text-sm font-black leading-snug" style={{ color: "var(--text-primary)" }}>{activePoll.question}</p>
          </div>

          {/* Live vote bars */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Live Responses
            </p>
            {(activePoll.options || []).map((opt, idx) => {
              const count = voteCounts[idx] || 0;
              const pct = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
              const isCorrect = idx === activePoll.correctIdx;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded flex items-center justify-center font-black ${OPTION_COLORS[idx]}`}>
                        {OPTION_LABELS[idx]}
                      </span>
                      <span className="truncate max-w-[160px]" style={{ color: "var(--text-primary)" }}>{opt}</span>
                      {isCorrect && <CheckCircle size={11} className="text-emerald-400 shrink-0" />}
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>{pct}% ({count})</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isCorrect ? "bg-emerald-500" : "bg-slate-500/50"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* End poll early button */}
          <button
            onClick={handleEndPoll}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-red-500/20 cursor-pointer mt-auto"
          >
            <StopCircle size={14} />
            End Poll Now
          </button>
        </div>
      ) : (
        /* ── Poll Creation Form ─────────────────────────────────── */
        <div className="flex flex-col gap-3.5 flex-1 overflow-y-auto px-4 pb-4">
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Question */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Question *
            </label>
            <textarea
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Enter your poll question..."
              className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "rgba(148, 163, 184, 0.24)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Options (2–4) *
              </label>
              <span className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>
                Click radio to set correct answer
              </span>
            </div>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {/* Correct answer radio */}
                <button
                  onClick={() => setCorrectIdx(idx)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${correctIdx === idx ? "border-emerald-500 bg-emerald-500" : "border-[var(--border-primary)] hover:border-emerald-400"}`}
                  title="Mark as correct answer"
                >
                  {correctIdx === idx && <div className="w-2 h-2 rounded-full bg-white" />}
                </button>

                {/* Option label */}
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 border ${OPTION_COLORS[idx]}`}>
                  {OPTION_LABELS[idx]}
                </span>

                {/* Input */}
                <input
                  type="text"
                  value={opt}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${OPTION_LABELS[idx]}`}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)]"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: correctIdx === idx ? "rgba(34,197,94,0.4)" : "rgba(148, 163, 184, 0.24)",
                    color: "var(--text-primary)",
                  }}
                />

                {/* Remove option */}
                {options.length > 2 && (
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-400 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            {options.length < 4 && (
              <button
                onClick={handleAddOption}
                className="flex items-center gap-1.5 text-[11px] font-bold transition-colors hover:opacity-80 cursor-pointer mt-1"
                style={{ color: "var(--text-accent)" }}
              >
                <Plus size={13} />
                Add option
              </button>
            )}
          </div>

          {/* Timer */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Timer
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIMER_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTimerSecs(t)}
                  className={`py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${timerSecs === t ? "border-[var(--border-accent)] bg-[var(--bg-badge)] text-[var(--text-accent)]" : "hover:border-[var(--border-accent)]"}`}
                  style={timerSecs !== t ? { borderColor: "var(--border-primary)", color: "var(--text-secondary)", backgroundColor: "var(--bg-primary)" } : {}}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* Launch button */}
          <button
            onClick={handleLaunchPoll}
            disabled={isLaunching}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-xs font-extrabold uppercase tracking-wider transition-all hover:scale-[1.01] shadow-lg cursor-pointer mt-auto disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "var(--accent-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))" }}
          >
            <Send size={14} />
            {isLaunching ? "Launching..." : "Launch Poll"}
          </button>
        </div>
      )}
    </div>
  );
}
