"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Clock } from "lucide-react";
import { getApiBase } from "@/utils/api";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_STYLES = [
  { ring: "ring-blue-500", bg: "bg-blue-500", light: "bg-blue-500/15 border-blue-500/40", text: "text-blue-400" },
  { ring: "ring-violet-500", bg: "bg-violet-500", light: "bg-violet-500/15 border-violet-500/40", text: "text-violet-400" },
  { ring: "ring-amber-500", bg: "bg-amber-500", light: "bg-amber-500/15 border-amber-500/40", text: "text-amber-400" },
  { ring: "ring-rose-500", bg: "bg-rose-500", light: "bg-rose-500/15 border-rose-500/40", text: "text-rose-400" },
];

// Animated SVG countdown ring
function CountdownRing({ timerSecs, remaining }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = timerSecs > 0 ? remaining / timerSecs : 0;
  const dashOffset = circumference * (1 - progress);
  const isUrgent = remaining <= 5;

  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        {/* Track */}
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        {/* Progress */}
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={isUrgent ? "#ef4444" : "var(--accent-primary, #6366f1)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black leading-none ${isUrgent ? "text-red-400 animate-pulse" : ""}`}
          style={!isUrgent ? { color: "var(--text-primary)" } : {}}>
          {remaining}
        </span>
        <span className="text-[8px] font-bold" style={{ color: "var(--text-muted)" }}>sec</span>
      </div>
    </div>
  );
}

export default function LivePollPopup({ poll, sessionToken, currentUsername, onAnswered, onSkip }) {
  // poll: { id, question, options, timerSecs, startedAt }
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(poll.timerSecs);
  const startTimeRef = useRef(Date.now());
  const API_BASE = getApiBase();

  const handleSkipRef = useRef(null);
  useEffect(() => {
    handleSkipRef.current = handleSkip;
  });

  useEffect(() => {
    const startedTimeMs = poll.startedAt ? new Date(poll.startedAt).getTime() : Date.now();
    startTimeRef.current = startedTimeMs;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedTimeMs) / 1000);
      const left = Math.max(0, poll.timerSecs - elapsed);
      setRemaining(left);
      return left;
    };

    const initialLeft = updateTimer();
    setSelectedIdx(null);
    setSubmitted(false);

    if (initialLeft <= 0) {
      handleSkipRef.current?.();
      return;
    }
  }, [poll.id, poll.timerSecs, poll.startedAt]);

  // Countdown timer — keeps running even after answer is submitted
  useEffect(() => {
    const startedTimeMs = startTimeRef.current;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedTimeMs) / 1000);
      const left = Math.max(0, poll.timerSecs - elapsed);
      setRemaining(left);
      return left;
    };

    const interval = setInterval(() => {
      const left = updateTimer();
      if (left <= 0) {
        clearInterval(interval);
        handleSkipRef.current?.();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [poll.id, poll.timerSecs]);

  const submitAnswer = async (chosenIdx) => {
    if (submitted) return;
    setSubmitted(true);
    setSelectedIdx(chosenIdx);

    const timeMs = Date.now() - startTimeRef.current;

    // Background persist to DB
    try {
      await fetch(`${API_BASE}/api/livekit/poll/${poll.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ chosenIdx, timeMs }),
      });
    } catch (e) {
      console.warn("Failed to persist poll answer:", e);
    }

    if (onAnswered) onAnswered({ chosenIdx, timeMs });
  };

  async function handleSkip() {
    if (submitted) return;
    setSubmitted(true);
    const timeMs = Date.now() - startTimeRef.current;

    try {
      await fetch(`${API_BASE}/api/livekit/poll/${poll.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ chosenIdx: -1, timeMs }),
      });
    } catch (e) {
      console.warn("Failed to persist poll skip:", e);
    }

    if (onSkip) onSkip();
    if (onAnswered) onAnswered({ chosenIdx: -1, timeMs });
  }

  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/75 backdrop-blur-lg p-4 animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <CountdownRing timerSecs={poll.timerSecs} remaining={remaining} />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[var(--bg-badge)] text-[var(--text-accent)] text-[10px] font-extrabold uppercase tracking-wider">
                Live Poll
              </span>
            </div>
            <h3 className="text-base font-black leading-snug" style={{ color: "var(--text-primary)" }}>
              {poll.question}
            </h3>
          </div>
        </div>

        {/* Options */}
        <div className="px-6 pb-4 space-y-2.5">
          {poll.options.map((opt, idx) => {
            const style = OPTION_STYLES[idx];
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => submitAnswer(idx)}
                disabled={submitted}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all font-semibold text-sm cursor-pointer
                  ${submitted
                    ? isSelected
                      ? `${style.light} ring-2 ${style.ring} opacity-90`
                      : "opacity-40 cursor-not-allowed"
                    : `hover:scale-[1.01] hover:border-[var(--border-accent)] active:scale-[0.99]`
                  }`}
                style={!submitted || !isSelected ? { borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" } : {}}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${submitted && isSelected ? `${style.bg} text-white` : `bg-[var(--bg-badge)] text-[var(--text-accent)]`}`}>
                  {OPTION_LABELS[idx]}
                </span>
                <span className="flex-1">{opt}</span>
                {submitted && isSelected && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Skip button */}
        {!submitted && (
          <div className="px-6 pb-6 flex justify-center">
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 text-[11px] font-bold transition-colors hover:opacity-80 cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={12} />
              Skip this poll
            </button>
          </div>
        )}

        {submitted && (
          <div className="px-6 pb-6 text-center">
            <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              Answer recorded — results coming soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
