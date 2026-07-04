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
  const [isDisqualified, setIsDisqualified] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsDisqualified(params.get("disqualified") === "true");
    }
  }, []);

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
      {isDisqualified && (
        <div className="p-6 rounded-3xl border bg-rose-500/10 border-rose-500/25 flex items-start space-x-4 text-rose-500">
          <AlertCircle size={24} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-wider">Session Disqualified</h3>
            <p className="text-xs leading-relaxed opacity-90">
              This session was automatically terminated and submitted due to multiple proctoring violations (tab switching, window focus loss, or exiting fullscreen). The results shown below have been flagged as invalid.
            </p>
          </div>
        </div>
      )}

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
        {session.feedback && (!session.aiSummary || session.feedback !== session.aiSummary.overallRemark) && (
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
            {session.aiSummary.missingConcepts?.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Missing Concepts</p>
                <ul className="space-y-1">
                  {session.aiSummary.missingConcepts.map((t, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <AlertCircle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {session.aiSummary.recommendedStudy?.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2 sm:col-span-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Recommended Study</p>
                <div className="flex flex-wrap gap-2">
                  {session.aiSummary.recommendedStudy.map((t, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center space-x-1">
                      <Lightbulb size={10} />
                      <span>{t}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


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

                  {/* Rubric breakdown */}
                  {a.rubric && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "Technical", key: "technicalCorrectness", max: 4 },
                        { label: "Complete",  key: "completeness",         max: 3 },
                        { label: "Terminology",key:"terminology",          max: 2 },
                        { label: "Clarity",   key: "clarity",              max: 1 },
                      ].map(({ label, key, max }) => {
                        const val = a.rubric[key] ?? 0;
                        const pct = (val / max) * 100;
                        return (
                          <div key={key} className="p-2 rounded-xl border text-center"
                               style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
                            <div className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
                              {val}<span className="text-[10px] font-normal">/{max}</span>
                            </div>
                            <div className="w-full h-1 rounded-full mt-1 mb-1" style={{ backgroundColor: "var(--bg-card)" }}>
                              <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: "var(--accent-gradient)" }} />
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
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

                  {/* Missing Concepts + Suggested Revision */}
                  {(a.missingConcepts?.length > 0 || a.suggestedRevision?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {a.missingConcepts?.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Missing Concepts</p>
                          {a.missingConcepts.map((c, i) => (
                            <p key={i} className="text-[11px] flex items-start space-x-1" style={{ color: "var(--text-secondary)" }}>
                              <AlertCircle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {a.suggestedRevision?.length > 0 && (
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Revise</p>
                          {a.suggestedRevision.map((r, i) => (
                            <p key={i} className="text-[11px] flex items-start space-x-1" style={{ color: "var(--text-secondary)" }}>
                              <Lightbulb size={10} className="text-indigo-500 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confidence indicator */}
                  {a.confidence != null && (
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      AI confidence: {Math.round(a.confidence * 100)}%
                      {a.confidence < 0.6 && <span className="text-amber-500 ml-1">· evaluation may be uncertain</span>}
                    </p>
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
