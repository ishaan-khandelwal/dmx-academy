"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Award, CheckCircle2, XCircle, ArrowLeft,
  Clock, BookOpen, BarChart2, Star, AlertCircle, TrendingUp, TrendingDown, Target,
  Sparkles, MessageSquare, ChevronDown, ChevronUp, Lightbulb
} from "lucide-react";

export default function VivaResultPage() {
  const { user, token, API_BASE } = useAuth();
  const router = useRouter();
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "ADMIN" ? "ADMIN" : "USER" })
  });

  useEffect(() => {
    if (!user || !sessionId) return;
    fetchSession();
  }, [user, sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/viva/history/${sessionId}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
      } else {
        setError(data.message || "Failed to load session results.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="p-5 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={20} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error || "Session not found."}</p>
        </div>
        <Link href="/student/viva" className="inline-flex items-center space-x-2 text-sm font-bold" style={{ color: "var(--text-accent)" }}>
          <ArrowLeft size={16} />
          <span>Back to AI Viva</span>
        </Link>
      </div>
    );
  }

  const percentage = session.totalScore ?? 0;
  const answers = session.vivaAnswers ?? [];
  const strengths = answers.filter(a => a.score >= 7);
  const improvements = answers.filter(a => a.score < 7);

  const scoreColor =
    percentage >= 80 ? "#10b981" :
    percentage >= 50 ? "#f59e0b" :
    "#f43f5e";

  const scoreGradient =
    percentage >= 80 ? "linear-gradient(135deg, #10b981, #34d399)" :
    percentage >= 50 ? "linear-gradient(135deg, #f59e0b, #fbbf24)" :
    "linear-gradient(135deg, #f43f5e, #fb7185)";

  const scoreLabel =
    percentage >= 80 ? "Outstanding" :
    percentage >= 50 ? "Good Effort" :
    "Needs Review";

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Back Navigation */}
      <div className="flex items-center space-x-3">
        <Link
          href="/student/viva"
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider hover:underline transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={14} />
          <span>Back to AI Viva</span>
        </Link>
      </div>

      {/* Hero Score Card */}
      <div className="relative p-8 md:p-10 rounded-3xl border shadow-lg overflow-hidden"
           style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ background: scoreGradient }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"
                 style={{ background: scoreGradient }}>
              <Award size={36} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">
                  {session.subject}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-muted)" }}>
                  {session.status}
                </span>
              </div>
              <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>
                Viva Result
              </h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {session.completedAt
                  ? new Date(session.completedAt).toLocaleString()
                  : new Date(session.startedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Score Ring */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-5xl font-black" style={{ color: scoreColor }}>{percentage}<span className="text-2xl">%</span></div>
              <div className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: scoreColor }}>{scoreLabel}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Questions", value: session.totalQuestions, icon: BookOpen },
            { label: "Answers Given", value: answers.length, icon: Target },
            { label: "Strengths", value: strengths.length, icon: TrendingUp },
            { label: "To Improve", value: improvements.length, icon: TrendingDown },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-3 rounded-2xl border text-center"
                 style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
              <Icon size={16} className="mx-auto mb-1" style={{ color: "var(--text-accent)" }} />
              <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Overall Feedback */}
        {session.feedback && (
          <div className="relative z-10 mt-4 p-4 rounded-2xl border text-sm"
               style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>Feedback: </span>
            {session.feedback}
          </div>
        )}
      </div>

      {/* AI Session Summary */}
      {session.aiSummary && (
        <div className="p-6 rounded-3xl border space-y-4"
             style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <Sparkles size={15} />
            </div>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>AI Session Summary</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">Powered by Local LLM</span>
          </div>

          {session.aiSummary.overallRemark && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {session.aiSummary.overallRemark}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {session.aiSummary.strongTopics?.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Strong Topics</p>
                <ul className="space-y-1">
                  {session.aiSummary.strongTopics.map((t, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {session.aiSummary.weakTopics?.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Needs Improvement</p>
                <ul className="space-y-1">
                  {session.aiSummary.weakTopics.map((t, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <XCircle size={11} className="text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {session.aiSummary.recommendedStudy?.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Study Next</p>
                <ul className="space-y-1">
                  {session.aiSummary.recommendedStudy.map((t, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <Lightbulb size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="p-6 rounded-3xl border space-y-4"
             style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Strengths</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">{strengths.length}</span>
          </div>
          {strengths.length === 0 ? (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No strengths identified (score ≥ 7).</p>
          ) : (
            <ul className="space-y-2">
              {strengths.map((a, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}
                        title={a.questionText}>
                    {a.questionText.length > 80 ? a.questionText.slice(0, 80) + "…" : a.questionText}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Needs Improvement */}
        <div className="p-6 rounded-3xl border space-y-4"
             style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <TrendingDown size={16} className="text-amber-500" />
            </div>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Needs Improvement</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{improvements.length}</span>
          </div>
          {improvements.length === 0 ? (
            <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No weak areas — excellent performance!</p>
          ) : (
            <ul className="space-y-2">
              {improvements.map((a, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <XCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}
                        title={a.questionText}>
                    {a.questionText.length > 80 ? a.questionText.slice(0, 80) + "…" : a.questionText}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Question Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <BarChart2 size={18} style={{ color: "var(--text-accent)" }} />
          <h2 className="text-lg font-bold font-display" style={{ color: "var(--text-primary)" }}>Question Breakdown</h2>
        </div>

        {answers.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed text-center" style={{ borderColor: "var(--border-primary)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No answers recorded for this session.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {answers.map((a, idx) => {
              const isStrong = a.score >= 7;
              return (
                <div key={a.id ?? idx} className="p-6 rounded-3xl border space-y-4 transition-all"
                     style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                           style={{ background: "var(--accent-gradient)" }}>
                        {idx + 1}
                      </div>
                      <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                        {a.questionText}
                      </p>
                    </div>
                    <div className={`shrink-0 flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black ${
                      isStrong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    }`}>
                      <Star size={11} />
                      <span>{a.score} / 10</span>
                    </div>
                  </div>

                  {/* Student Answer */}
                  <div className="p-3 rounded-2xl" style={{ backgroundColor: "var(--bg-primary)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Your Answer</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {a.studentAnswer || <span className="italic">No answer provided.</span>}
                    </p>
                  </div>

                  {/* Score bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1"
                         style={{ color: "var(--text-muted)" }}>
                      <span>Score</span>
                      <span>{a.score}/10</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--bg-primary)" }}>
                      <div className="h-2 rounded-full transition-all duration-500"
                           style={{
                             width: `${(a.score / 10) * 100}%`,
                             background: isStrong ? "linear-gradient(to right, #10b981, #34d399)" : "linear-gradient(to right, #f43f5e, #fb7185)"
                           }} />
                    </div>
                  </div>

                  {/* Feedback */}
                  {a.feedback && (
                    <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                      isStrong
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400"
                    }`}>
                      <span className="font-bold">AI Feedback: </span>{a.feedback}
                    </div>
                  )}

                  {/* Strengths & Weaknesses (AI) */}
                  {(a.strengths?.length > 0 || a.weaknesses?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {a.strengths?.length > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Strengths</p>
                          {a.strengths.map((s, i) => (
                            <p key={i} className="text-[11px] flex items-start space-x-1" style={{ color: "var(--text-secondary)" }}>
                              <CheckCircle2 size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{s}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {a.weaknesses?.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Weaknesses</p>
                          {a.weaknesses.map((w, i) => (
                            <p key={i} className="text-[11px] flex items-start space-x-1" style={{ color: "var(--text-secondary)" }}>
                              <XCircle size={10} className="text-rose-500 shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Follow-up question */}
                  {a.followUp && (
                    <div className="p-3 rounded-xl border flex items-start space-x-2"
                         style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
                      <MessageSquare size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-accent)" }} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--text-accent)" }}>Follow-Up</p>
                        <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>{a.followUp}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/student/viva"
          className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl border font-bold text-sm transition-all hover:scale-102"
          style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)", backgroundColor: "var(--bg-card)" }}
        >
          <Brain size={16} />
          <span>New Viva Session</span>
        </Link>
        <Link
          href="/student/viva/history"
          className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-102"
          style={{ background: "var(--accent-gradient)" }}
        >
          <Clock size={16} />
          <span>View Session History</span>
        </Link>
      </div>
    </div>
  );
}
