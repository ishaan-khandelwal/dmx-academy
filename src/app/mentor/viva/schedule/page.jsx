"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Brain, Plus, Calendar, Clock, BookOpen, Sparkles, CheckCircle2,
  AlertCircle, ChevronRight, ArrowLeft, Loader2, Trash2
} from "lucide-react";

export default function ScheduleVivaPage() {
  const { user, token, API_BASE } = useAuth();

  // --- Views ---
  // "list" | "create"
  const [view, setView] = useState("list");

  // --- Lists ---
  const [vivas, setVivas] = useState([]);
  const [vivasLoading, setVivasLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  
  // --- Filters ---
  const [subjectFilter, setSubjectFilter] = useState("");
  const [subjectsList, setSubjectsList] = useState([]);

  // --- UI feedback ---
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  });

  // Fetch scheduled Vivas
  const fetchVivas = async () => {
    try {
      setVivasLoading(true);
      const res = await fetch(`${API_BASE}/api/viva/scheduled`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setVivas(data.vivas);
      } else {
        setError(data.message || "Failed to load Vivas.");
      }
    } catch (err) {
      setError("Network error loading Vivas.");
    } finally {
      setVivasLoading(false);
    }
  };

  // Fetch Questions for selection
  const fetchQuestions = async () => {
    try {
      setQuestionsLoading(true);
      const res = await fetch(`${API_BASE}/api/viva/questions`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
        // Extract unique subjects
        const uniqueSubjects = [...new Set(data.questions.map(q => q.subject))];
        setSubjectsList(uniqueSubjects);
        if (uniqueSubjects.length > 0 && !subject) {
          setSubject(uniqueSubjects[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVivas();
    }
  }, [token]);

  useEffect(() => {
    if (view === "create" && token) {
      fetchQuestions();
    }
  }, [view, token]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !startTime || selectedQuestions.length === 0) {
      setError("Please fill all required fields and select at least one question.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const res = await fetch(`${API_BASE}/api/viva/schedule`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title,
          subject,
          description,
          startTime,
          endTime: endTime || null,
          questionIds: selectedQuestions
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("Viva scheduled successfully!");
        setTitle("");
        setDescription("");
        setStartTime("");
        setEndTime("");
        setSelectedQuestions([]);
        fetchVivas();
        setTimeout(() => {
          setView("list");
          setSuccess("");
        }, 1500);
      } else {
        setError(data.message || "Failed to schedule Viva.");
      }
    } catch (err) {
      setError("Network error scheduling Viva.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleQuestionSelection = (id) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const getVivaStatus = (viva) => {
    const now = new Date();
    const start = new Date(viva.startTime);
    const end = viva.endTime ? new Date(viva.endTime) : null;

    if (now < start) return { label: "Upcoming", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (end && now > end) return { label: "Ended", color: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20" };
    return { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse" };
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-400" />
              Viva Scheduling & Management
            </h1>
            <p className="text-slate-400 mt-2">
              Create, view, and manage scheduled Viva sessions for your institute.
            </p>
          </div>
          <div>
            {view === "list" ? (
              <button
                onClick={() => setView("create")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Schedule New Viva
              </button>
            ) : (
              <button
                onClick={() => setView("list")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-slate-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* --- VIEW: LIST --- */}
        {view === "list" && (
          <div className="space-y-6">
            {vivasLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-slate-400">Loading scheduled Vivas...</p>
              </div>
            ) : vivas.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
                <Calendar className="w-12 h-12 text-slate-500 mx-auto" />
                <h3 className="text-lg font-semibold text-slate-300">No Vivas Scheduled</h3>
                <p className="text-slate-400 text-sm">
                  You haven't scheduled any Vivas yet. Click "Schedule New Viva" to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vivas.map((viva) => {
                  const status = getVivaStatus(viva);
                  return (
                    <div
                      key={viva.id}
                      className="bg-gradient-to-b from-slate-900 to-[#121826] border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {viva.subject}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl font-bold group-hover:text-indigo-400 transition-colors duration-200">
                            {viva.title}
                          </h3>
                          {viva.description && (
                            <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                              {viva.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 border-t border-slate-800/80 pt-4">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span>Start: {new Date(viva.startTime).toLocaleString()}</span>
                          </div>
                          {viva.endTime && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Clock className="w-4 h-4 text-rose-400" />
                              <span>End: {new Date(viva.endTime).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <BookOpen className="w-4 h-4 text-purple-400" />
                            <span>Questions: {viva.questions?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500">
                        <span>By {viva.creator?.username || "Mentor"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- VIEW: CREATE --- */}
        {view === "create" && (
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-300">
                <Calendar className="w-5 h-5" />
                Viva Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Viva Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. JavaScript Closures & Async Final Exam"
                    className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject *</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white transition-all outline-none"
                    >
                      <option value="">Select Subject</option>
                      {subjectsList.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">New Subject (Optional)</label>
                    <input
                      type="text"
                      placeholder="Or type a new subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide short instructions for students..."
                    className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">End Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-white transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Question Selector Sidebar */}
            <div className="space-y-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex flex-col h-[600px]">
              <div>
                <h2 className="text-xl font-bold flex items-center justify-between text-purple-300">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Select Questions *
                  </span>
                  <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    {selectedQuestions.length} Selected
                  </span>
                </h2>
                
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Filter by subject..."
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="w-full bg-[#161B2B] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {questionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    <p className="text-slate-500 text-xs">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <p className="text-slate-500 text-center py-10 text-sm">No questions in bank.</p>
                ) : (
                  questions
                    .filter(q => !subjectFilter || q.subject.toLowerCase().includes(subjectFilter.toLowerCase()))
                    .map(q => {
                      const isSelected = selectedQuestions.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestionSelection(q.id)}
                          className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-200 text-left select-none ${
                            isSelected
                              ? "bg-purple-500/10 border-purple-500/40 hover:bg-purple-500/15"
                              : "bg-[#121624] border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-300 uppercase font-medium">
                              {q.subject}
                            </span>
                            <span className={`text-[10px] uppercase font-bold ${
                              q.difficulty === "EASY" ? "text-emerald-400" : q.difficulty === "MEDIUM" ? "text-amber-400" : "text-rose-400"
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                          <p className="text-slate-200 text-sm mt-2 font-medium line-clamp-2">
                            {q.questionText}
                          </p>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Create & Publish Viva
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
