"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Upload, FileText, Sparkles, Trash2, RefreshCw,
  AlertCircle, CheckCircle2, Clock, XCircle, ChevronRight,
  Edit2, Check, X, AlertTriangle, BookOpen, Plus, Layers, Tag
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────
const STATUS_META = {
  UPLOADED:   { label: "Uploaded",   icon: Clock,         cls: "bg-slate-500/10 text-slate-400" },
  PROCESSING: { label: "Processing", icon: RefreshCw,     cls: "bg-amber-500/10 text-amber-400 animate-pulse" },
  COMPLETED:  { label: "Ready",      icon: CheckCircle2,  cls: "bg-emerald-500/10 text-emerald-500" },
  FAILED:     { label: "Failed",     icon: XCircle,       cls: "bg-rose-500/10 text-rose-500" },
};
const DIFF_CLS = {
  EASY:   "bg-emerald-500/10 text-emerald-500",
  MEDIUM: "bg-amber-500/10 text-amber-500",
  HARD:   "bg-rose-500/10 text-rose-500",
};
const VIEWS = { LIST: "list", GENERATE: "generate", REVIEW: "review" };

export default function StudyMaterialsPage() {
  const { user, token, API_BASE } = useAuth();

  const [view, setView] = useState(VIEWS.LIST);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Generate state
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Review state
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [savingToBank, setSavingToBank] = useState(false);
  const [saveResult, setSaveResult] = useState(null); // { saved }

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getHeaders = useCallback((isJson = true) => ({
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" })
  }), [token]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setMaterials(data.materials);
      else setError(data.message || "Failed to load materials.");
    } catch { setError("Network error. Is the backend running?"); }
    finally { setLoading(false); }
  }, [API_BASE, getHeaders]);

  useEffect(() => { if (user) fetchMaterials(); }, [user, fetchMaterials]);

  // Poll processing materials every 3s
  useEffect(() => {
    const processing = materials.some(m => m.processingStatus === "PROCESSING" || m.processingStatus === "UPLOADED");
    if (!processing) return;
    const timer = setTimeout(fetchMaterials, 3000);
    return () => clearTimeout(timer);
  }, [materials, fetchMaterials]);

  const handleUpload = async () => {
    if (!uploadFile) return setUploadError("Please select a PDF file.");
    if (!uploadTitle.trim()) return setUploadError("Title is required.");
    if (!uploadSubject.trim()) return setUploadError("Subject is required.");
    setUploading(true); setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("title", uploadTitle);
      fd.append("subject", uploadSubject);
      const res = await fetch(`${API_BASE}/api/viva/materials`, {
        method: "POST",
        headers: getHeaders(false), // no Content-Type — let browser set multipart boundary
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadOpen(false);
        setUploadFile(null); setUploadTitle(""); setUploadSubject("");
        fetchMaterials();
      } else { setUploadError(data.message || "Upload failed."); }
    } catch { setUploadError("Network error during upload."); }
    finally { setUploading(false); }
  };

  const handleRetry = async (id) => {
    try {
      await fetch(`${API_BASE}/api/viva/materials/${id}/retry`, {
        method: "POST", headers: getHeaders()
      });
      fetchMaterials();
    } catch { /* silent */ }
  };

  const openGenerate = (material) => {
    setActiveMaterial(material);
    setGenCount(10);
    setGenError("");
    setDraftQuestions([]);
    setSaveResult(null);
    setView(VIEWS.GENERATE);
  };

  const handleGenerate = async () => {
    setGenerating(true); setGenError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/${activeMaterial.id}/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ count: genCount })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Add editable + approved flags to each draft
        setDraftQuestions(data.questions.map((q, i) => ({ ...q, _id: i, _approved: true, _editing: false })));
        setView(VIEWS.REVIEW);
      } else { setGenError(data.message || "Generation failed."); }
    } catch { setGenError("Network error during generation."); }
    finally { setGenerating(false); }
  };

  const handleDeleteMaterial = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/${deleteTarget.id}`, {
        method: "DELETE", headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) { setDeleteTarget(null); fetchMaterials(); }
      else setError(data.message || "Delete failed.");
    } catch { setError("Network error."); }
    finally { setDeleteLoading(false); }
  };

  const handleSaveToBank = async () => {
    const approved = draftQuestions.filter(q => q._approved);
    if (approved.length === 0) return;
    setSavingToBank(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/save-questions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ questions: approved.map(({ _id, _approved, _editing, ...q }) => q) })
      });
      const data = await res.json();
      if (res.ok && data.success) setSaveResult({ saved: data.saved });
      else setGenError(data.message || "Failed to save.");
    } catch { setGenError("Network error while saving."); }
    finally { setSavingToBank(false); }
  };

  const updateDraft = (idx, field, value) => {
    setDraftQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  // ── GENERATE VIEW ─────────────────────────────────────────────────
  if (view === VIEWS.GENERATE) {
    return (
      <div className="space-y-6 animate-fade-in pb-12 max-w-2xl mx-auto">
        <div className="flex items-center space-x-3">
          <button onClick={() => setView(VIEWS.LIST)} className="p-2 rounded-xl hover:bg-slate-500/10 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-black font-display" style={{ color: "var(--text-primary)" }}>Generate Questions</h1>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{activeMaterial?.title}</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl border space-y-5" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-3 p-4 rounded-2xl" style={{ backgroundColor: "var(--bg-primary)" }}>
            <FileText size={20} style={{ color: "var(--text-accent)" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{activeMaterial?.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Subject: {activeMaterial?.subject} · {activeMaterial?.extractedText?.length?.toLocaleString() || 0} chars extracted
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Number of Questions to Generate
            </label>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setGenCount(n)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer transition-all ${genCount === n ? "text-white border-transparent" : "border-current opacity-50 hover:opacity-75"}`}
                        style={genCount === n ? { background: "var(--accent-gradient)", borderColor: "transparent" } : { color: "var(--text-secondary)", borderColor: "var(--border-primary)" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {genError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2">
              <AlertCircle size={14} className="text-rose-500 shrink-0" />
              <p className="text-xs font-semibold text-rose-500">{genError}</p>
            </div>
          )}

          <button onClick={handleGenerate} disabled={generating}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-102 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                  style={{ background: "var(--accent-gradient)" }}>
            {generating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Generating...</span></>
              : <><Sparkles size={16} /><span>Generate {genCount} Questions</span></>}
          </button>
        </div>
      </div>
    );
  }

  // ── REVIEW VIEW ───────────────────────────────────────────────────
  if (view === VIEWS.REVIEW) {
    const approvedCount = draftQuestions.filter(q => q._approved).length;
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setView(VIEWS.GENERATE)} className="p-2 rounded-xl hover:bg-slate-500/10 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <div>
              <h1 className="text-xl font-black font-display" style={{ color: "var(--text-primary)" }}>Review Questions</h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{approvedCount} of {draftQuestions.length} approved</p>
            </div>
          </div>

          {saveResult ? (
            <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-500">{saveResult.saved} questions saved to Question Bank!</span>
              <button onClick={() => setView(VIEWS.LIST)} className="ml-2 text-xs font-bold underline text-emerald-500">Back to Materials</button>
            </div>
          ) : (
            <button onClick={handleSaveToBank} disabled={savingToBank || approvedCount === 0}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
                    style={{ background: "var(--accent-gradient)" }}>
              {savingToBank
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
                : <><BookOpen size={15} /><span>Save {approvedCount} to Question Bank</span></>}
            </button>
          )}
        </div>

        {genError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2">
            <AlertCircle size={14} className="text-rose-500 shrink-0" />
            <p className="text-xs font-semibold text-rose-500">{genError}</p>
          </div>
        )}

        <div className="space-y-3">
          {draftQuestions.map((q, idx) => (
            <div key={q._id}
                 className={`p-5 rounded-2xl border transition-all ${q._approved ? "" : "opacity-50"}`}
                 style={{ backgroundColor: "var(--bg-card)", borderColor: q._approved ? "var(--border-card)" : "var(--border-primary)" }}>
              <div className="flex items-start gap-3">
                {/* Approve toggle */}
                <button onClick={() => updateDraft(idx, "_approved", !q._approved)}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${q._approved ? "bg-indigo-500 border-indigo-500" : "border-current opacity-40"}`}
                        style={!q._approved ? { color: "var(--text-muted)" } : {}}>
                  {q._approved && <Check size={12} className="text-white" />}
                </button>

                <div className="flex-1 space-y-3 min-w-0">
                  {/* Question text */}
                  {q._editing ? (
                    <textarea rows={2} className="w-full p-2 rounded-xl border text-sm outline-none resize-none"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      value={q.questionText}
                      onChange={e => updateDraft(idx, "questionText", e.target.value)} />
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{q.questionText}</p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">{q.subject}</span>
                    {q.topic && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">{q.topic}</span>}
                    {/* Difficulty picker */}
                    {["EASY","MEDIUM","HARD"].map(d => (
                      <button key={d} onClick={() => updateDraft(idx, "difficulty", d)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-all ${DIFF_CLS[d]} ${q.difficulty === d ? "ring-1 ring-current" : "opacity-40 hover:opacity-70"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit / delete */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button onClick={() => updateDraft(idx, "_editing", !q._editing)}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-500 cursor-pointer transition-colors"
                          style={{ color: "var(--text-muted)" }}>
                    {q._editing ? <Check size={13} /> : <Edit2 size={13} />}
                  </button>
                  <button onClick={() => setDraftQuestions(qs => qs.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer transition-colors"
                          style={{ color: "var(--text-muted)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── LIST VIEW (default) ───────────────────────────────────────────
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
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>Study Materials</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload PDFs and generate Viva questions automatically.</p>
        </div>
        <button onClick={() => setUploadOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 cursor-pointer"
                style={{ background: "var(--accent-gradient)" }}>
          <Upload size={15} />
          <span>Upload PDF</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
        </div>
      ) : materials.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center space-y-4" style={{ borderColor: "var(--border-primary)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
               style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
            <FileText size={28} />
          </div>
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>No materials yet</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload a PDF to start generating Viva questions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(m => {
            const st = STATUS_META[m.processingStatus] || STATUS_META.UPLOADED;
            const StIcon = st.icon;
            const isReady = m.processingStatus === "COMPLETED";
            const isFailed = m.processingStatus === "FAILED";
            return (
              <div key={m.id} className="group flex items-center justify-between gap-4 p-5 rounded-2xl border transition-all hover:shadow-sm"
                   style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{m.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">{m.subject}</span>
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                        <StIcon size={10} />
                        <span>{st.label}</span>
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(m.uploadDate || m.createdAt).toLocaleDateString()}
                      </span>
                      {isReady && m.extractedText && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {m.extractedText.length.toLocaleString()} chars
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {isFailed && (
                    <button onClick={() => handleRetry(m.id)} title="Retry extraction"
                            className="p-2 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-colors cursor-pointer"
                            style={{ color: "var(--text-muted)" }}>
                      <RefreshCw size={14} />
                    </button>
                  )}
                  {isReady && (
                    <button onClick={() => openGenerate(m)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer hover:scale-105 transition-all"
                            style={{ background: "var(--accent-gradient)" }}>
                      <Sparkles size={12} />
                      <span>Generate</span>
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(m)} title="Delete"
                          className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all cursor-pointer"
                          style={{ color: "var(--text-muted)" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ── */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center space-x-2">
                <Upload size={16} style={{ color: "var(--text-accent)" }} />
                <h2 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Upload Study Material</h2>
              </div>
              <button onClick={() => { setUploadOpen(false); setUploadError(""); }} className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold text-rose-500">{uploadError}</p>
                </div>
              )}
              {/* File drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:border-indigo-500/50"
                style={{ borderColor: uploadFile ? "var(--text-accent)" : "var(--border-primary)" }}>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                       onChange={e => setUploadFile(e.target.files[0] || null)} />
                <FileText size={28} style={{ color: uploadFile ? "var(--text-accent)" : "var(--text-muted)" }} />
                <p className="mt-2 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {uploadFile ? uploadFile.name : "Click to select a PDF"}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>PDF only · Max 10 MB</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Title <span className="text-rose-500">*</span></label>
                <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  placeholder="e.g. JavaScript Fundamentals"
                  value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Subject <span className="text-rose-500">*</span></label>
                <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  placeholder="e.g. JavaScript"
                  value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <button onClick={() => { setUploadOpen(false); setUploadError(""); }}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                      style={{ background: "var(--accent-gradient)" }}>
                {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Uploading...</span></> : <><Upload size={14} /><span>Upload</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-5 text-center"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Delete Material?</h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>"{deleteTarget.title}" and its file will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>Cancel</button>
              <button onClick={handleDeleteMaterial} disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold cursor-pointer hover:bg-rose-600 disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
