"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Plus, Edit2, Trash2, X, Check,
  AlertCircle, BookOpen, Layers, Sparkles,
  AlertTriangle, Folder, FolderOpen, ChevronLeft, ChevronRight,
  Upload, FileText, RefreshCw, CheckCircle2, XCircle, ArrowLeft
} from "lucide-react";

const QUESTIONS_PER_PAGE = 10;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const DIFF_COLOR = {
  EASY: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  HARD: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" },
};
const STATUS_META = {
  UPLOADED:   { label: "Uploaded",   icon: CheckCircle2,  cls: "bg-slate-500/10 text-slate-400" },
  PROCESSING: { label: "Processing", icon: RefreshCw,     cls: "bg-amber-500/10 text-amber-400 animate-pulse" },
  COMPLETED:  { label: "Ready",      icon: CheckCircle2,  cls: "bg-emerald-500/10 text-emerald-500" },
  FAILED:     { label: "Failed",     icon: XCircle,       cls: "bg-rose-500/10 text-rose-500" },
};

const emptyForm = {
  questionText: "", subject: "", topic: "",
  difficulty: "EASY", expectedAnswer: "", keywords: ""
};

const VIEWS = { QUESTIONS: "questions", EXTRACT: "extract", REVIEW: "review" };

export default function CreateVivaPage() {
  const { user, token, API_BASE } = useAuth();

  const [view, setView] = useState(VIEWS.QUESTIONS);

  // --- Questions List View State ---
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questionPage, setQuestionPage] = useState(1);

  // Tab state: "institute" or "global"
  const [activeTab, setActiveTab] = useState("institute");

  useEffect(() => {
    if (user) {
      setActiveTab(user.role === "ADMIN" ? "global" : "institute");
    }
  }, [user]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const isGlobal = q.instituteId === null;
      if (activeTab === "global" && !isGlobal) return false;
      if (activeTab === "institute" && isGlobal) return false;
      return true;
    });
  }, [questions, activeTab]);

  // Subjects & topics for folder view and modal datalists
  const [allSubjects, setAllSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);

  // Manual Question Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Manual Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- PDF Extraction View State ---
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadNewSubjectName, setUploadNewSubjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // AI Question Generation State
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Review Draft State
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [savingToBank, setSavingToBank] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // PDF Delete target
  const [pdfDeleteTarget, setPdfDeleteTarget] = useState(null);
  const [pdfDeleteLoading, setPdfDeleteLoading] = useState(false);

  // Local state for custom subjects (shared with study materials)
  const [customSubjects, setCustomSubjects] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dmx_custom_subjects");
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("dmx_custom_subjects", JSON.stringify(customSubjects));
  }, [customSubjects]);

  // Subject folder creation modal state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [newFolderSubjectName, setNewFolderSubjectName] = useState("");
  const [subjectModalError, setSubjectModalError] = useState("");

  const handleCreateSubjectFolder = () => {
    const trimmed = newFolderSubjectName.trim();
    if (!trimmed) return setSubjectModalError("Subject name is required.");
    if (!subjectNames.includes(trimmed)) {
      setCustomSubjects(prev => [...prev, trimmed]);
    }
    setNewFolderSubjectName("");
    setSubjectModalOpen(false);
  };

  // --- Common Helpers ---
  const getHeaders = useCallback((isJson = true) => ({
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" })
  }), [token]);

  // Fetch all questions and metadata (subjects/topics)
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/questions`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setQuestions(data.questions);
      else setError(data.message || "Failed to load questions.");
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [API_BASE, getHeaders]);

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

  // Fetch materials for extraction view
  const fetchMaterials = useCallback(async () => {
    materialsLoading || setMaterialsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setMaterials(data.materials);
    } catch { /* silent */ }
    finally { setMaterialsLoading(false); }
  }, [API_BASE, getHeaders]);

  // Sync / Auto-poll effects
  useEffect(() => {
    if (user) {
      fetchQuestions();
      fetchMeta();
    }
  }, [user, fetchQuestions, fetchMeta]);

  useEffect(() => {
    if (view === VIEWS.EXTRACT) {
      fetchMaterials();
    }
  }, [view, fetchMaterials]);

  // Poll materials that are extracting
  useEffect(() => {
    if (view !== VIEWS.EXTRACT) return;
    const processing = materials.some(m => m.processingStatus === "PROCESSING" || m.processingStatus === "UPLOADED");
    if (!processing) return;
    const timer = setTimeout(fetchMaterials, 3000);
    return () => clearTimeout(timer);
  }, [materials, fetchMaterials, view]);

  // --- Manual Question Handlers ---
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

  const handleSaveManual = async () => {
    if (!form.questionText.trim()) return setFormError("Question text is required.");
    if (!form.subject.trim()) return setFormError("Subject is required.");
    if (!form.difficulty) return setFormError("Difficulty is required.");
    setFormSaving(true); setFormError("");
    try {
      const url = editingId ? `${API_BASE}/api/viva/questions/${editingId}` : `${API_BASE}/api/viva/questions`;
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

  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/questions/${deleteTarget.id}`, {
        method: "DELETE", headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteTarget(null);
        fetchQuestions();
        fetchMeta();
      } else setError(data.message || "Delete failed.");
    } catch { setError("Network error during delete."); }
    finally { setDeleteLoading(false); }
  };


  // --- Extraction Upload & Retry Handlers ---
  const handleUploadPDF = async () => {
    if (!uploadFile) return setUploadError("Please select a PDF file.");
    if (!uploadTitle.trim()) return setUploadError("Title is required.");
    
    const finalSubject = uploadSubject === "__NEW__" ? uploadNewSubjectName.trim() : uploadSubject.trim();
    if (!finalSubject) return setUploadError("Subject is required.");
    
    setUploading(true); setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("title", uploadTitle);
      fd.append("subject", finalSubject);
      const res = await fetch(`${API_BASE}/api/viva/materials`, {
        method: "POST",
        headers: getHeaders(false),
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (uploadSubject === "__NEW__" && !customSubjects.includes(finalSubject)) {
          setCustomSubjects(prev => [...prev, finalSubject]);
        }
        setUploadOpen(false);
        setUploadFile(null); setUploadTitle(""); setUploadSubject(""); setUploadNewSubjectName("");
        fetchMaterials();
      } else {
        setUploadError(data.message || "Upload failed.");
      }
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleRetryExtraction = async (id) => {
    try {
      await fetch(`${API_BASE}/api/viva/materials/${id}/retry`, {
        method: "POST", headers: getHeaders()
      });
      fetchMaterials();
    } catch { /* silent */ }
  };

  const handleDeletePDF = async () => {
    if (!pdfDeleteTarget) return;
    setPdfDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/${pdfDeleteTarget.id}`, {
        method: "DELETE", headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPdfDeleteTarget(null);
        fetchMaterials();
      }
    } catch { /* silent */ }
    finally { setPdfDeleteLoading(false); }
  };

  // --- Question Generation Handlers ---
  const triggerGenerate = (material) => {
    setActiveMaterial(material);
    setGenCount(10);
    setGenError("");
    setDraftQuestions([]);
    setSaveResult(null);
    // Switch to generate/review workspace
    setView(VIEWS.REVIEW);
  };

  const handleGenerateQuestions = async () => {
    setGenerating(true); setGenError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/${activeMaterial.id}/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ count: genCount })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDraftQuestions(data.questions.map((q, i) => ({
          ...q, _id: i, _approved: true, _editing: false
        })));
      } else {
        setGenError(data.message || "Generation failed.");
      }
    } catch { setGenError("Network error during question generation."); }
    finally { setGenerating(false); }
  };

  const updateDraft = (idx, field, value) => {
    setDraftQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleSaveDraftToBank = async () => {
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
      if (res.ok && data.success) {
        setSaveResult({ saved: data.saved });
        // Refetch main list
        fetchQuestions();
        fetchMeta();
      } else {
        setGenError(data.message || "Failed to save questions.");
      }
    } catch { setGenError("Network error while saving."); }
    finally { setSavingToBank(false); }
  };

  // --- Questions List Computations ---
  // Stats
  const total = filteredQuestions.length;
  const byDiff = { EASY: 0, MEDIUM: 0, HARD: 0 };
  filteredQuestions.forEach(q => { if (byDiff[q.difficulty] !== undefined) byDiff[q.difficulty]++; });

  const subjectNames = useMemo(() => {
    const names = new Set([
      ...customSubjects,
      ...allSubjects,
      ...filteredQuestions.map(q => q.subject)
    ].filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allSubjects, filteredQuestions, customSubjects]);

  const selectedQuestions = selectedSubject
    ? filteredQuestions.filter(q => q.subject === selectedSubject)
    : [];
  const questionPageCount = Math.max(1, Math.ceil(selectedQuestions.length / QUESTIONS_PER_PAGE));
  const currentQuestionPage = Math.min(questionPage, questionPageCount);
  const questionPageStart = (currentQuestionPage - 1) * QUESTIONS_PER_PAGE;
  const visibleQuestions = selectedQuestions.slice(questionPageStart, questionPageStart + QUESTIONS_PER_PAGE);

  // ==================== RENDERS ====================

  // --- 1. REVIEW / GENERATE WORKSPACE VIEW ---
  const renderReview = () => {
    const approvedCount = draftQuestions.filter(q => q._approved).length;
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => { setView(VIEWS.EXTRACT); setDraftQuestions([]); }}
                    className="p-2 rounded-xl hover:bg-slate-500/10 cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black font-display" style={{ color: "var(--text-primary)" }}>Generate &amp; Review Questions</h1>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Source: {activeMaterial?.title}</p>
            </div>
          </div>

          {draftQuestions.length > 0 && (
            saveResult ? (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-500">{saveResult.saved} questions added!</span>
                <button onClick={() => setView(VIEWS.QUESTIONS)} className="ml-2 text-xs font-bold underline text-emerald-500">Back to Questions</button>
              </div>
            ) : (
              <button onClick={handleSaveDraftToBank} disabled={savingToBank || approvedCount === 0}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
                      style={{ background: "var(--accent-gradient)" }}>
                {savingToBank ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
                ) : (
                  <><Check size={15} /><span>Add {approvedCount} to Question Bank</span></>
                )}
              </button>
            )
          )}
        </div>

        {draftQuestions.length === 0 ? (
          /* Generate Prompt Setup */
          <div className="max-w-xl mx-auto p-8 rounded-3xl border space-y-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center space-x-3 p-4 rounded-2xl" style={{ backgroundColor: "var(--bg-primary)" }}>
              <FileText size={20} style={{ color: "var(--text-accent)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{activeMaterial?.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Subject: {activeMaterial?.subject} · {activeMaterial?.extractedText?.length?.toLocaleString() || 0} characters extracted
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Number of AI Questions to Generate
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

            <button onClick={handleGenerateQuestions} disabled={generating}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-102 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                    style={{ background: "var(--accent-gradient)" }}>
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin animate-spin-fast" /><span>Generating Viva Questions...</span></>
              ) : (
                <><Sparkles size={16} /><span>Generate AI Questions</span></>
              )}
            </button>
          </div>
        ) : (
          /* Review Questions List */
          <div className="space-y-4">
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
                  <div className="flex items-start gap-4">
                    {/* Checkbox toggle */}
                    <button onClick={() => updateDraft(idx, "_approved", !q._approved)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${q._approved ? "bg-indigo-500 border-indigo-500" : "border-current opacity-40"}`}
                            style={!q._approved ? { color: "var(--text-muted)" } : {}}>
                      {q._approved && <Check size={12} className="text-white" />}
                    </button>

                    <div className="flex-1 space-y-3 min-w-0">
                      {q._editing ? (
                        <textarea rows={2} className="w-full p-2 rounded-xl border text-sm outline-none resize-none"
                                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                                  value={q.questionText}
                                  onChange={e => updateDraft(idx, "questionText", e.target.value)} />
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{q.questionText}</p>
                      )}

                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">{q.subject}</span>
                        {q.topic && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">{q.topic}</span>}
                        {DIFFICULTIES.map(d => (
                          <button key={d} onClick={() => updateDraft(idx, "difficulty", d)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-all ${DIFF_COLOR[d].bg} ${DIFF_COLOR[d].text} ${q.difficulty === d ? "ring-1 ring-current" : "opacity-40"}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

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
        )}
      </div>
    );
  };

  // --- 2. EXTRACT VIEW (PDF Notes Extraction Dashboard) ---
  const renderExtract = () => {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setView(VIEWS.QUESTIONS)}
                    className="p-2 rounded-xl hover:bg-slate-500/10 cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>PDF Viva Generator</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Extract questions from uploaded notes PDFs automatically.</p>
            </div>
          </div>

          <button onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 cursor-pointer"
                  style={{ background: "var(--accent-gradient)" }}>
            <Upload size={15} />
            <span>Upload PDF</span>
          </button>
        </div>

        {/* Materials Table/List */}
        {materialsLoading && materials.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed text-center space-y-4" style={{ borderColor: "var(--border-primary)" }}>
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                 style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <FileText size={28} />
            </div>
            <p className="font-bold" style={{ color: "var(--text-primary)" }}>No PDFs uploaded for extraction yet</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload a class PDF note to generate Viva questions from it.</p>
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
                      <button onClick={() => handleRetryExtraction(m.id)} title="Retry extraction"
                              className="p-2 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 transition-colors cursor-pointer"
                              style={{ color: "var(--text-muted)" }}>
                        <RefreshCw size={14} />
                      </button>
                    )}
                    {isReady && (
                      <button onClick={() => triggerGenerate(m)}
                              className="flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer hover:scale-105 transition-all"
                              style={{ background: "var(--accent-gradient)" }}>
                        <Sparkles size={12} />
                        <span>Generate Viva</span>
                      </button>
                    )}
                    <button onClick={() => setPdfDeleteTarget(m)} title="Delete"
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
      </div>
    );
  };

  // --- 3. QUESTIONS LIST VIEW (Default view) ---
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {view === VIEWS.REVIEW && renderReview()}
      {view === VIEWS.EXTRACT && renderExtract()}
      {view === VIEWS.QUESTIONS && (
        <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <Brain size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-accent)" }}>AI Viva</span>
          </div>
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>Create Viva</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Manage questions and extract new ones using AI.</p>
        </div>
        

        {activeTab === "institute" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSubjectModalError(""); setNewFolderSubjectName(""); setSubjectModalOpen(true); }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border hover:scale-105 cursor-pointer"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            >
              <Plus size={15} className="text-indigo-400" />
              <span>Add Folder</span>
            </button>
            <button
              onClick={() => setView(VIEWS.EXTRACT)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border hover:scale-105 cursor-pointer"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            >
              <Sparkles size={15} className="text-indigo-400" />
              <span>Extract from PDF</span>
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 cursor-pointer"
              style={{ background: "var(--accent-gradient)" }}
            >
              <Plus size={16} />
              <span>Add Question</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      {user?.role !== "ADMIN" && (
        <div className="flex space-x-1 p-1 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl max-w-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab("institute");
              setSelectedSubject("");
              setQuestionPage(1);
            }}
            className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "institute"
                ? "shadow-sm text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            style={activeTab === "institute" ? { background: "var(--accent-gradient)" } : {}}
          >
            Your Institute
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("global");
              setSelectedSubject("");
              setQuestionPage(1);
            }}
            className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "global"
                ? "shadow-sm text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            style={activeTab === "global" ? { background: "var(--accent-gradient)" } : {}}
          >
            Global Questions
          </button>
        </div>
      )}

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

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {/* Folders & Questions list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
        </div>
      ) : subjectNames.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed text-center space-y-4"
             style={{ borderColor: "var(--border-primary)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
               style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
            <Brain size={28} />
          </div>
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>No questions found</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Add questions manually or extract them from notes PDFs.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Subjects folders */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Subjects</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {subjectNames.map(subject => {
                const count = filteredQuestions.filter(q => q.subject === subject).length;
                const active = selectedSubject === subject;
                const Icon = active ? FolderOpen : Folder;
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(subject);
                      setQuestionPage(1);
                    }}
                    className={`group flex items-center justify-between gap-4 p-5 rounded-2xl border text-left transition-all cursor-pointer ${active ? "ring-2 ring-indigo-500/40" : "hover:shadow-sm"}`}
                    style={{ backgroundColor: "var(--bg-card)", borderColor: active ? "var(--border-accent)" : "var(--border-card)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: "var(--text-primary)" }}>{subject}</p>
                        <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                          {count} question{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Questions of Selected Subject */}
          {selectedSubject ? (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {selectedSubject} Questions
              </p>
              <div className="space-y-2">
                {visibleQuestions.map((q) => (
                  <div key={q.id}
                       className="group flex items-start justify-between gap-4 p-5 rounded-2xl border transition-all hover:shadow-sm"
                       style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                        {q.questionText}
                      </p>
                      {q.topic && (
                        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{q.topic}</p>
                      )}
                    </div>
                    {!(q.instituteId === null && user?.role !== "ADMIN") && (
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
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {selectedQuestions.length > QUESTIONS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    Showing {questionPageStart + 1}-{Math.min(questionPageStart + QUESTIONS_PER_PAGE, selectedQuestions.length)} of {selectedQuestions.length} questions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestionPage(page => Math.max(1, page - 1))}
                      disabled={currentQuestionPage === 1}
                      className="p-2 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/10 hover:text-indigo-500 cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-20 text-center text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                      Page {currentQuestionPage} of {questionPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuestionPage(page => Math.min(questionPageCount, page + 1))}
                      disabled={currentQuestionPage === questionPageCount}
                      className="p-2 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/10 hover:text-indigo-500 cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-3xl border border-dashed text-center"
                 style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
              <p className="text-sm font-semibold">Select a subject folder to view its questions.</p>
            </div>
          )}
        </div>
      )}
    </>
  )}

      {/* ── Manual Question Add/Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
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

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold text-rose-500">{formError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Question Text <span className="text-rose-500">*</span>
                </label>
                <textarea rows={3}
                          className="w-full p-3 rounded-2xl border text-sm outline-none resize-none"
                          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                          placeholder="Enter the question..."
                          value={form.questionText}
                          onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} />
              </div>

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
                         list="subject-list" />
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
                         list="topic-list" />
                  <datalist id="topic-list">
                    {allTopics.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              </div>

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
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${dc.bg} ${dc.text} ${dc.border} ${selected ? "ring-2 ring-indigo-500" : "opacity-50"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Expected Answer</label>
                <textarea rows={3}
                          className="w-full p-3 rounded-2xl border text-sm outline-none resize-none"
                          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                          placeholder="Model answer..."
                          value={form.expectedAnswer}
                          onChange={e => setForm(f => ({ ...f, expectedAnswer: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Keywords</label>
                <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                       style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                       placeholder="e.g. closure, scope"
                       value={form.keywords}
                       onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleSaveManual} disabled={formSaving}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all hover:scale-102 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      style={{ background: "var(--accent-gradient)" }}>
                {formSaving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
                ) : (
                  <><Check size={15} /><span>{editingId ? "Save Changes" : "Add Question"}</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Question Delete Modal ── */}
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
                &quot;{deleteTarget.questionText.slice(0, 80)}{deleteTarget.questionText.length > 80 ? '…' : ''}&quot;
              </p>
              <p className="text-xs text-rose-500 font-semibold">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDeleteQuestion} disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold cursor-pointer hover:bg-rose-600 transition-colors disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload PDF Modal ── */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center space-x-2">
                <Upload size={16} style={{ color: "var(--text-accent)" }} />
                <h2 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Upload PDF</h2>
              </div>
              <button onClick={() => setUploadOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer animate-fade-in"
                      style={{ color: "var(--text-secondary)" }}>
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  PDF Document <span className="text-rose-500">*</span>
                </label>
                <div onClick={() => fileInputRef.current?.click()}
                     className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-500/5 transition-all flex flex-col items-center justify-center gap-2"
                     style={{ borderColor: "var(--border-primary)" }}>
                  <FileText size={32} className="opacity-40" style={{ color: "var(--text-accent)" }} />
                  {uploadFile ? (
                    <p className="text-xs font-bold text-emerald-400">{uploadFile.name}</p>
                  ) : (
                    <><p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Click to select PDF file</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Maximum size: 10MB</p></>
                  )}
                  <input type="file" ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0])} accept="application/pdf" className="hidden" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Title / Name <span className="text-rose-500">*</span>
                </label>
                <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                       style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                       placeholder="e.g. Intro to Arrays"
                       value={uploadTitle}
                       onChange={e => setUploadTitle(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Subject Folder <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full p-3 rounded-2xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  value={uploadSubject}
                  onChange={e => setUploadSubject(e.target.value)}
                >
                  <option value="">-- Select Subject Folder --</option>
                  {subjectNames.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__NEW__">+ Create New Subject...</option>
                </select>

                {uploadSubject === "__NEW__" && (
                  <input
                    className="w-full p-3 rounded-2xl border text-sm outline-none mt-2 animate-fade-in"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    placeholder="Type new subject name..."
                    value={uploadNewSubjectName}
                    onChange={e => setUploadNewSubjectName(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <button onClick={() => setUploadOpen(false)}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleUploadPDF} disabled={uploading}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all hover:scale-102 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      style={{ background: "var(--accent-gradient)" }}>
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Uploading...</span></>
                ) : (
                  <><Check size={15} /><span>Upload &amp; Extract</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Delete Modal ── */}
      {pdfDeleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-5 text-center"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Delete PDF note?</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                This deletes &quot;{pdfDeleteTarget.title}&quot; and its extracted content.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPdfDeleteTarget(null)} disabled={pdfDeleteLoading}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDeletePDF} disabled={pdfDeleteLoading}
                      className="flex-1 py-2.5 rounded-2xl bg-rose-500 text-white text-sm font-bold cursor-pointer hover:bg-rose-600 transition-colors disabled:opacity-50">
                {pdfDeleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Subject Folder Creation Modal */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center space-x-2">
                <Folder size={16} style={{ color: "var(--text-accent)" }} />
                <h2 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Create Subject Folder</h2>
              </div>
              <button onClick={() => setSubjectModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {subjectModalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold text-rose-500">{subjectModalError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input className="w-full p-3 rounded-2xl border text-sm outline-none"
                       style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                       placeholder="e.g. Data Structure and Algorithms"
                       value={newFolderSubjectName}
                       onChange={e => setNewFolderSubjectName(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
              <button onClick={() => setSubjectModalOpen(false)}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleCreateSubjectFolder}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all hover:scale-102 cursor-pointer flex items-center justify-center space-x-2"
                      style={{ background: "var(--accent-gradient)" }}>
                <Check size={15} />
                <span>Create Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
