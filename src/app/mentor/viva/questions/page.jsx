"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Plus, Search, Filter, Edit2, Trash2, X, Check,
  AlertCircle, ChevronDown, BookOpen, Tag, Layers, Sparkles,
  RefreshCw, AlertTriangle
} from "lucide-react";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const DIFF_COLOR = {
  EASY: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  HARD: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" },
};

const emptyForm = {
  questionText: "", subject: "", topic: "",
  difficulty: "EASY", expectedAnswer: "", keywords: ""
};

export default function QuestionBankPage() {
  const { user, token, API_BASE } = useAuth();

  // List state
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [search, setSearch] = useState("");

  // Subjects & topics for filter dropdowns
  const [allSubjects, setAllSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, questionText }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" })
  }), [token]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterSubject) params.set("subject", filterSubject);
      if (filterTopic) params.set("topic", filterTopic);
      if (filterDifficulty) params.set("difficulty", filterDifficulty);
      if (search) params.set("search", search);
      const res = await fetch(`${API_BASE}/api/viva/questions?${params}`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setQuestions(data.questions);
      else setError(data.message || "Failed to load questions.");
    } catch { setError("Network error. Is the backend running?"); }
    finally { setLoading(false); }
  }, [API_BASE, filterSubject, filterTopic, filterDifficulty, search, getHeaders]);

  const fetchMeta = useCallback(async () => {
    try {
      const [subRes, topRes] = await Promise.all([
        fetch(`${API_BASE}/api/viva/questions/subjects`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/viva/questions/topics`, { headers: getHeaders() })
      ]);
      if (subRes.ok) { const d = await subRes.json(); setAllSubjects(d.subjects || []); }
      if (topRes.ok) { const d = await topRes.json(); setAllTopics(d.topics || []); }
    } catch { /* silent */ }
  }, [API_BASE, getHeaders]);

  useEffect(() => { if (user) { fetchQuestions(); fetchMeta(); } }, [user, fetchQuestions, fetchMeta]);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setFormError(""); setModalOpen(true); };
  const openEdit = (q) => {
    setForm({
      questionText: q.questionText, subject: q.subject, topic: q.topic || "",
      difficulty: q.difficulty, expectedAnswer: q.expectedAnswer || "", keywords: q.keywords || ""
    });
    setEditingId(q.id);
    setFormError("");
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setFormError(""); };

  const handleSave = async () => {
    if (!form.questionText.trim()) return setFormError("Question text is required.");
    if (!form.subject.trim()) return setFormError("Subject is required.");
    if (!form.difficulty) return setFormError("Difficulty is required.");
    setFormSaving(true); setFormError("");
    try {
      const url = editingId
        ? `${API_BASE}/api/viva/questions/${editingId}`
        : `${API_BASE}/api/viva/questions`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok && data.success) {
        closeModal();
        fetchQuestions();
        fetchMeta();
      } else {
        setFormError(data.message || "Failed to save question.");
      }
    } catch { setFormError("Network error."); }
    finally { setFormSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/questions/${deleteTarget.id}`, {
        method: "DELETE", headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) { setDeleteTarget(null); fetchQuestions(); fetchMeta(); }
      else setError(data.message || "Delete failed.");
    } catch { setError("Network error during delete."); }
    finally { setDeleteLoading(false); }
  };

  // Stats
  const total = questions.length;
  const byDiff = { EASY: 0, MEDIUM: 0, HARD: 0 };
  questions.forEach(q => { if (byDiff[q.difficulty] !== undefined) byDiff[q.difficulty]++; });
  const subjectCount = new Set(questions.map(q => q.subject)).size;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <Brain size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-accent)" }}>AI Viva</span>
          </div>
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>Question Bank</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Manage questions used in AI Viva sessions.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 cursor-pointer"
          style={{ background: "var(--accent-gradient)" }}
        >
          <Plus size={16} />
          <span>Add Question</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, icon: BookOpen, color: "indigo" },
          { label: "Easy", value: byDiff.EASY, icon: Layers, color: "emerald" },
          { label: "Medium", value: byDiff.MEDIUM, icon: Layers, color: "amber" },
          { label: "Hard", value: byDiff.HARD, icon: Layers, color: "rose" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-2xl border flex items-center space-x-3"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
            <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-500 shrink-0`}><Icon size={16} /></div>
            <div>
              <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl border"
           style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
        <div className="flex items-center space-x-2 flex-1 min-w-[160px] px-3 py-2 rounded-xl border"
             style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)" }}>
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="px-3 py-2 rounded-xl border text-sm font-semibold outline-none"
                style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 rounded-xl border text-sm font-semibold outline-none"
                style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
          <option value="">All Topics</option>
          {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="px-3 py-2 rounded-xl border text-sm font-semibold outline-none"
                style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={fetchQuestions} title="Refresh"
                className="p-2 rounded-xl border transition-all hover:scale-105 cursor-pointer"
                style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {/* Question List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center space-y-4"
             style={{ borderColor: "var(--border-primary)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
               style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
            <Brain size={28} />
          </div>
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>No questions found</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {search || filterSubject || filterDifficulty || filterTopic
              ? "Try clearing filters."
              : "Add your first question to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {questions.map((q) => {
              const dc = DIFF_COLOR[q.difficulty] || DIFF_COLOR.EASY;
              return (
                <div key={q.id}
                     className="group flex items-start justify-between gap-4 p-5 rounded-2xl border transition-all hover:shadow-sm"
                     style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                      {q.questionText}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">{q.subject}</span>
                      {q.topic && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">{q.topic}</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dc.bg} ${dc.text}`}>{q.difficulty}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(q)}
                            className="p-2 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors cursor-pointer"
                            style={{ color: "var(--text-secondary)" }} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: q.id, questionText: q.questionText })}
                            className="p-2 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                            style={{ color: "var(--text-secondary)" }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b"
                 style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center space-x-2">
                <Sparkles size={16} style={{ color: "var(--text-accent)" }} />
                <h2 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>
                  {editingId ? "Edit Question" : "Add Question"}
                </h2>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold text-rose-500">{formError}</p>
                </div>
              )}

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Question Text <span className="text-rose-500">*</span>
                </label>
                <textarea rows={3}
                  className="w-full p-3 rounded-2xl border text-sm outline-none resize-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  placeholder="Enter the question..."
                  value={form.questionText}
                  onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
                />
              </div>

              {/* Subject & Topic */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    placeholder="e.g. JavaScript"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    list="subject-list"
                  />
                  <datalist id="subject-list">
                    {allSubjects.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Topic</label>
                  <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    placeholder="e.g. Closures"
                    value={form.topic}
                    onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    list="topic-list"
                  />
                  <datalist id="topic-list">
                    {allTopics.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Difficulty <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => {
                    const dc = DIFF_COLOR[d];
                    const selected = form.difficulty === d;
                    return (
                      <button key={d} onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${dc.bg} ${dc.text} ${dc.border} ${selected ? "ring-2 ring-offset-1" : "opacity-50"}`}
                              style={{ ringColor: "var(--text-accent)" }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected Answer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Expected Answer</label>
                <textarea rows={3}
                  className="w-full p-3 rounded-2xl border text-sm outline-none resize-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  placeholder="Model answer (used for reference)..."
                  value={form.expectedAnswer}
                  onChange={e => setForm(f => ({ ...f, expectedAnswer: e.target.value }))}
                />
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Keywords <span className="text-xs font-normal normal-case" style={{ color: "var(--text-muted)" }}>(comma-separated, used for scoring)</span>
                </label>
                <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  placeholder="e.g. closure, scope, function, lexical"
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold transition-all hover:scale-102 cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={formSaving}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all hover:scale-102 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      style={{ background: "var(--accent-gradient)" }}>
                {formSaving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
                  : <><Check size={15} /><span>{editingId ? "Save Changes" : "Add Question"}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-5 text-center"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Delete Question?</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                "{deleteTarget.questionText.slice(0, 80)}{deleteTarget.questionText.length > 80 ? '…' : ''}"
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold cursor-pointer hover:bg-rose-600 transition-colors disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
