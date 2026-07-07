"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Plus, Edit2, Trash2, X, Check,
  AlertCircle, BookOpen, Layers, Sparkles,
  Folder, FolderOpen, ChevronLeft, ChevronRight,
  Upload, FileText, RefreshCw, CheckCircle2, XCircle,
  Calendar, Clock, Loader2, Play
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

export default function AIAllInOneVivaPage() {
  const { user, token, API_BASE } = useAuth();

  // --- Common Headers ---
  const getHeaders = useCallback((isJson = true) => ({
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  // Main subsection tabs: "bank" | "schedule"
  const [subSectionTab, setSubSectionTab] = useState("bank");

  // ==========================================
  // 1. QUESTION BANK STATE
  // ==========================================
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questionPage, setQuestionPage] = useState(1);
  const [activeTab, setActiveTab] = useState("institute");

  const [allSubjects, setAllSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);

  // Manual Question Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Manual Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subject folder modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [newFolderSubjectName, setNewFolderSubjectName] = useState("");
  const [subjectModalError, setSubjectModalError] = useState("");

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

  useEffect(() => {
    if (user) {
      setActiveTab(user.role === "ADMIN" ? "global" : "institute");
    }
  }, [user]);

  // ==========================================
  // 2. PDF / MATERIALS & AI EXTRACTION STATE
  // ==========================================
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // PDF Delete Target
  const [pdfDeleteTarget, setPdfDeleteTarget] = useState(null);
  const [pdfDeleteLoading, setPdfDeleteLoading] = useState(false);

  // AI Question Generation Workspace
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [savingToBank, setSavingToBank] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [workspaceView, setWorkspaceView] = useState("default");

  // ==========================================
  // 3. VIVA SCHEDULING STATE
  // ==========================================
  const [vivas, setVivas] = useState([]);
  const [vivasLoading, setVivasLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // Scheduling Form Fields
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleSubject, setScheduleSubject] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleSelectedQuestions, setScheduleSelectedQuestions] = useState([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState("");
  const [editingVivaId, setEditingVivaId] = useState(null);

  // ==========================================
  // DATA FETCHING FUNCTIONS
  // ==========================================
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/questions`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setQuestions(data.questions);
      else setError(data.message || "Failed to load questions.");
    } catch {
      setError("Network error loading questions.");
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

  const fetchMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setMaterials(data.materials);
    } catch { /* silent */ }
    finally { setMaterialsLoading(false); }
  }, [API_BASE, getHeaders]);

  const fetchVivas = useCallback(async () => {
    setVivasLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/scheduled`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setVivas(data.vivas);
    } catch { /* silent */ }
    finally { setVivasLoading(false); }
  }, [API_BASE, getHeaders]);

  const reloadAll = useCallback(() => {
    if (user) {
      fetchQuestions();
      fetchMeta();
      fetchMaterials();
      fetchVivas();
    }
  }, [user, fetchQuestions, fetchMeta, fetchMaterials, fetchVivas]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Autopoll for materials processing
  useEffect(() => {
    const processing = materials.some(m => m.processingStatus === "PROCESSING" || m.processingStatus === "UPLOADED");
    if (!processing) return;
    const timer = setTimeout(fetchMaterials, 3000);
    return () => clearTimeout(timer);
  }, [materials, fetchMaterials]);

  // ==========================================
  // COMPUTED PROPS
  // ==========================================
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const isGlobal = q.instituteId === null;
      if (activeTab === "global" && !isGlobal) return false;
      if (activeTab === "institute" && isGlobal) return false;
      return true;
    });
  }, [questions, activeTab]);

  const subjectNames = useMemo(() => {
    const fromDB = [...new Set(filteredQuestions.map(q => q.subject))];
    const combined = [...new Set([...fromDB, ...customSubjects])];
    return combined.sort();
  }, [filteredQuestions, customSubjects]);

  const instituteSubjectNames = useMemo(() => {
    const instQuestions = questions.filter(q => q.instituteId !== null);
    const fromDB = [...new Set(instQuestions.map(q => q.subject))];
    const combined = [...new Set([...fromDB, ...customSubjects])];
    return combined.sort();
  }, [questions, customSubjects]);

  const selectedQuestions = useMemo(() => {
    if (!selectedSubject) return [];
    return filteredQuestions.filter(q => q.subject === selectedSubject);
  }, [filteredQuestions, selectedSubject]);

  const visibleQuestions = useMemo(() => {
    const start = (questionPage - 1) * QUESTIONS_PER_PAGE;
    return selectedQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [selectedQuestions, questionPage]);

  const total = filteredQuestions.length;
  const byDiff = useMemo(() => {
    return {
      EASY: filteredQuestions.filter(q => q.difficulty === "EASY").length,
      MEDIUM: filteredQuestions.filter(q => q.difficulty === "MEDIUM").length,
      HARD: filteredQuestions.filter(q => q.difficulty === "HARD").length,
    };
  }, [filteredQuestions]);

  // ==========================================
  // HANDLERS: MANUAL QUESTIONS
  // ==========================================
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
        reloadAll();
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
        reloadAll();
      } else setError(data.message || "Delete failed.");
    } catch { setError("Delete failed due to network error."); }
    finally { setDeleteLoading(false); }
  };

  const handleCreateSubjectFolder = () => {
    const trimmed = newFolderSubjectName.trim();
    if (!trimmed) return setSubjectModalError("Subject name is required.");
    if (!subjectNames.includes(trimmed)) {
      setCustomSubjects(prev => [...prev, trimmed]);
    }
    setNewFolderSubjectName("");
    setSubjectModalOpen(false);
  };

  // ==========================================
  // HANDLERS: PDF / EXTRACTION
  // ==========================================
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!uploadFile) return setUploadError("Please select a PDF file.");
    if (!uploadTitle.trim()) return setUploadError("Please enter a title.");
    if (!uploadSubject.trim()) return setUploadError("Please enter or select a subject folder.");

    setUploading(true); setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("subject", uploadSubject);

      const res = await fetch(`${API_BASE}/api/viva/materials`, {
        method: "POST",
        headers: getHeaders(false),
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadOpen(false);
        setUploadFile(null);
        setUploadTitle("");
        setUploadSubject("");
        fetchMaterials();
      } else {
        setUploadError(data.message || "Upload failed.");
      }
    } catch {
      setUploadError("Network error uploading PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePdf = async () => {
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
      } else setError(data.message || "Failed to delete PDF.");
    } catch { setError("Network error deleting PDF."); }
    finally { setPdfDeleteLoading(false); }
  };

  const handleRetryExtraction = async (id) => {
    try {
      await fetch(`${API_BASE}/api/viva/materials/${id}/retry`, {
        method: "POST", headers: getHeaders()
      });
      fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // HANDLERS: AI QUESTION WORKSPACE
  // ==========================================
  const triggerGenerate = (material) => {
    setActiveMaterial(material);
    setGenCount(10);
    setGenError("");
    setDraftQuestions([]);
    setSaveResult(null);
    setExtractModalOpen(false); // Close extraction modal to show generator workspace
    setWorkspaceView("review");
  };

  const handleGenerateQuestions = async () => {
    setGenerating(true); setGenError("");
    setDraftQuestions([]); // clear old before starting

    const BATCH_SIZE = 1;
    let accumulatedQuestions = [];

    try {
      while (accumulatedQuestions.length < genCount) {
        const currentCount = Math.min(BATCH_SIZE, genCount - accumulatedQuestions.length);
        
        const res = await fetch(`${API_BASE}/api/viva/materials/${activeMaterial.id}/generate`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ 
            count: currentCount,
            existingQuestions: accumulatedQuestions.map(q => q.questionText)
          })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          const newQs = Array.isArray(data.questions) ? data.questions.filter(q => q && q.questionText) : [];
          if (newQs.length === 0) throw new Error("AI returned empty result.");
          
          const formatted = newQs.map((q, idx) => ({ 
            ...q, 
            _id: accumulatedQuestions.length + idx, 
            _approved: true, 
            _editing: false 
          }));
          
          accumulatedQuestions = [...accumulatedQuestions, ...formatted];
          
          // Truncate if the AI over-generated
          if (accumulatedQuestions.length > genCount) {
            accumulatedQuestions = accumulatedQuestions.slice(0, genCount);
          }
          
          // Update state progressively so user sees them appear
          setDraftQuestions(accumulatedQuestions);
        } else {
          throw new Error(data.message || "Failed to generate questions.");
        }
      }
    } catch (err) {
      setGenError(err.message === "Failed to fetch" ? "Network error generating questions." : err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = (idx, field, val) => {
    setDraftQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  };

  const handleSaveDraftToBank = async () => {
    const approved = draftQuestions.filter(q => q._approved);
    if (approved.length === 0) return;
    setSavingToBank(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/save-questions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ questions: approved })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveResult({ saved: approved.length });
        reloadAll();
      } else {
        setGenError(data.message || "Failed to save questions to bank.");
      }
    } catch {
      setGenError("Network error saving questions.");
    } finally {
      setSavingToBank(false);
    }
  };

  // ==========================================
  // HANDLERS: VIVA SCHEDULING
  // ==========================================
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleTitle.trim() || !scheduleSubject.trim() || !scheduleStartTime || !scheduleEndTime || scheduleSelectedQuestions.length === 0) {
      setScheduleError("Please fill in all required fields and select at least one question.");
      return;
    }

    setScheduleSubmitting(true);
    setScheduleError("");
    setScheduleSuccess("");
    try {
      const url = editingVivaId 
        ? `${API_BASE}/api/viva/scheduled/${editingVivaId}`
        : `${API_BASE}/api/viva/schedule`;
      const method = editingVivaId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          title: scheduleTitle,
          subject: scheduleSubject,
          description: scheduleDescription,
          startTime: new Date(scheduleStartTime).toISOString(),
          endTime: new Date(scheduleEndTime).toISOString(),
          questionIds: scheduleSelectedQuestions
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScheduleSuccess(editingVivaId ? "Viva updated successfully!" : "Viva scheduled successfully!");
        setScheduleTitle("");
        setScheduleDescription("");
        setScheduleStartTime("");
        setScheduleEndTime("");
        setScheduleSelectedQuestions([]);
        setEditingVivaId(null);
        fetchVivas();
        setTimeout(() => {
          setScheduleOpen(false);
          setScheduleSuccess("");
        }, 1500);
      } else {
        setScheduleError(data.message || "Failed to submit Viva session.");
      }
    } catch {
      setScheduleError("Network error submitting Viva session.");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleDeleteViva = async (id) => {
    if (!window.confirm("Are you sure you want to delete this scheduled viva?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/viva/scheduled/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchVivas();
      } else {
        alert(data.message || "Failed to delete viva.");
      }
    } catch {
      alert("Network error deleting viva.");
    }
  };

  const openEditViva = (viva) => {
    setEditingVivaId(viva.id);
    setScheduleTitle(viva.title);
    setScheduleSubject(viva.subject);
    setScheduleDescription(viva.description || "");
    
    const formatDateTime = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    
    setScheduleStartTime(formatDateTime(viva.startTime));
    setScheduleEndTime(formatDateTime(viva.endTime));
    setScheduleSelectedQuestions(viva.questions?.map(q => q.id) || []);
    setScheduleError("");
    setScheduleSuccess("");
    setScheduleOpen(true);
  };

  const getVivaStatus = (viva) => {
    const now = new Date();
    const start = new Date(viva.startTime);
    const end = viva.endTime ? new Date(viva.endTime) : null;

    if (now < start) return { label: "Upcoming", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    if (end && now > end) return { label: "Ended", color: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20" };
    return { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse" };
  };

  // ==========================================
  // MODAL RENDER FUNCTION
  // ==========================================
  const renderModals = () => {
    return (
      <>
        {/* 1. Add/Edit Question Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111625] border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-200">{editingId ? "Edit Question" : "Add New Question"}</h3>
                <button onClick={closeModal} className="p-1 hover:bg-slate-800 rounded"><X size={18} /></button>
              </div>
              {formError && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{formError}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Question Text *</label>
                  <textarea rows={3} value={form.questionText} onChange={e => setForm({...form, questionText: e.target.value})} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none resize-none" placeholder="Enter question..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Subject Folder *</label>
                    <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none">
                      <option value="">Select Folder</option>
                      {subjectNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Topic (Optional)</label>
                    <input type="text" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none" placeholder="e.g. Callbacks" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Difficulty *</label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map(d => (
                      <button type="button" key={d} onClick={() => setForm({...form, difficulty: d})} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.difficulty === d ? "bg-indigo-600 text-white border-transparent" : "border-slate-800 text-slate-400"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Expected Answer Keywords (comma separated) *</label>
                  <input type="text" value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none" placeholder="e.g. scope, lexical, variables" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Detailed Rubric Expected Answer (Optional)</label>
                  <textarea rows={2} value={form.expectedAnswer} onChange={e => setForm({...form, expectedAnswer: e.target.value})} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none resize-none" placeholder="Provide complete context..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-sm text-slate-400 font-bold hover:bg-slate-800">Cancel</button>
                <button onClick={handleSaveManual} disabled={formSaving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white rounded-xl">
                  {formSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Add Folder Modal */}
        {subjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111625] border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Add Subject Folder</h3>
              {subjectModalError && <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{subjectModalError}</div>}
              <input type="text" value={newFolderSubjectName} onChange={e => setNewFolderSubjectName(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none" placeholder="Subject Name..." />
              <div className="flex gap-3">
                <button onClick={() => setSubjectModalOpen(false)} className="flex-1 py-2 border border-slate-800 rounded-xl text-xs text-slate-400 font-bold hover:bg-slate-800">Cancel</button>
                <button onClick={handleCreateSubjectFolder} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white rounded-xl">Create</button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Delete Question Confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111625] border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Delete Question</h3>
              <p className="text-slate-400 text-sm">Are you sure you want to delete: <span className="font-semibold text-slate-200">"{deleteTarget.questionText}"</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800">Cancel</button>
                <button onClick={handleDeleteQuestion} disabled={deleteLoading} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white rounded-xl">
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Delete PDF Confirm */}
        {pdfDeleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111625] border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Delete PDF Notes</h3>
              <p className="text-slate-400 text-sm">Are you sure you want to delete <span className="font-semibold text-slate-200">"{pdfDeleteTarget.title}"</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setPdfDeleteTarget(null)} className="flex-1 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800">Cancel</button>
                <button onClick={handleDeletePdf} disabled={pdfDeleteLoading} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white rounded-xl">
                  {pdfDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Schedule Viva Modal */}
        {scheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <form onSubmit={handleScheduleSubmit} className="bg-[#111625] border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-4 my-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2"><Calendar className="w-5 h-5 text-pink-400" />{editingVivaId ? "Edit Viva Session" : "Schedule Viva Session"}</h3>
                <button type="button" onClick={() => setScheduleOpen(false)} className="p-1 hover:bg-slate-800 rounded"><X size={18} /></button>
              </div>
              {scheduleError && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{scheduleError}</div>}
              {scheduleSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">{scheduleSuccess}</div>}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Details */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Viva Title *</label>
                    <input type="text" required value={scheduleTitle} onChange={e => setScheduleTitle(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none" placeholder="e.g. JS Closures Final Exam" />
                  </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 mb-1">Select Subject *</label>
                     <select required value={scheduleSubject} onChange={e => setScheduleSubject(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none">
                       <option value="">Select Folder</option>
                       {instituteSubjectNames.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Description (Optional)</label>
                    <textarea rows={2} value={scheduleDescription} onChange={e => setScheduleDescription(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none resize-none" placeholder="Instructions..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Start Time *</label>
                      <input type="datetime-local" required value={scheduleStartTime} onChange={e => setScheduleStartTime(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-xs outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">End Time *</label>
                      <input type="datetime-local" required value={scheduleEndTime} onChange={e => setScheduleEndTime(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-xs outline-none" />
                    </div>
                  </div>
                </div>

                {/* Questions Picker */}
                <div className="flex flex-col h-[320px] lg:h-[350px] border border-slate-800 rounded-xl p-4 bg-[#0E1322]">
                  <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Select Questions ({scheduleSelectedQuestions.length})</p>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {questions.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-10">No questions in bank.</p>
                    ) : (
                      questions
                        .filter(q => q.instituteId !== null && (!scheduleSubject || q.subject.toLowerCase() === scheduleSubject.toLowerCase()))
                        .map(q => {
                          const isSel = scheduleSelectedQuestions.includes(q.id);
                          return (
                            <div
                              key={q.id}
                              onClick={() => {
                                setScheduleSelectedQuestions(prev =>
                                  prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                                );
                              }}
                              className={`p-2.5 rounded border text-left cursor-pointer transition-all select-none ${
                                isSel ? "bg-emerald-500/10 border-emerald-500/50 outline outline-2 outline-emerald-500/30" : "bg-[#111625] border-slate-800/80 hover:border-slate-700"
                              }`}
                            >
                              <span className="text-[9px] uppercase font-bold text-indigo-400">{q.difficulty}</span>
                              <p className="text-xs font-medium text-slate-200 mt-0.5 line-clamp-2">{q.questionText}</p>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button type="button" onClick={() => setScheduleOpen(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-sm text-slate-400 font-bold hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={scheduleSubmitting} className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 font-bold text-sm text-white rounded-xl">
                  {scheduleSubmitting ? "Scheduling..." : "Schedule & Publish"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 7. PDF AI Question Extraction Main Modal */}
        {extractModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#111625] border border-slate-800 w-full max-w-4xl rounded-2xl p-6 space-y-6 my-8">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  AI Question Extractor
                </h3>
                <button type="button" onClick={() => setExtractModalOpen(false)} className="p-1 hover:bg-slate-800 rounded"><X size={18} /></button>
              </div>

              <div className="flex justify-between items-center bg-[#0E1322] p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-200">Generate Questions from PDF</p>
                  <p className="text-xs text-slate-400">Upload class notes or document slides to extract viva questions automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload PDF</span>
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Uploaded Materials</h4>
                {materialsLoading && materials.length === 0 ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : materials.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">No PDF documents uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                    {materials.map(m => {
                      const statusMeta = STATUS_META[m.processingStatus] || STATUS_META.UPLOADED;
                      const StatusIcon = statusMeta.icon;
                      const isReady = m.processingStatus === "COMPLETED";
                      const isFailed = m.processingStatus === "FAILED";

                      return (
                        <div key={m.id} className="group p-4 rounded-xl border border-slate-800 bg-[#0E1322]/40 flex justify-between items-center hover:border-slate-700 transition-all">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-bold text-slate-200 truncate">{m.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 mt-1">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold uppercase">{m.subject}</span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${statusMeta.cls}`}>
                                <StatusIcon size={8} />
                                <span>{statusMeta.label}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isFailed && (
                              <button type="button" onClick={() => handleRetryExtraction(m.id)} title="Retry" className="p-1.5 rounded hover:bg-slate-800 text-slate-400"><RefreshCw size={11} /></button>
                            )}
                            {isReady && (
                              <button
                                type="button"
                                onClick={() => triggerGenerate(m)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 font-bold text-[10px] text-white"
                              >
                                <Sparkles size={9} />
                                <span>Generate</span>
                              </button>
                            )}
                            <button type="button" onClick={() => setPdfDeleteTarget(m)} className="p-1.5 rounded hover:bg-slate-800 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={11} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800/80">
                <button type="button" onClick={() => setExtractModalOpen(false)} className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* 8. Upload PDF Modal */}
        {uploadOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form onSubmit={handleUploadFile} className="bg-[#111625] border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-200">Upload PDF</h3>
                <button type="button" onClick={() => setUploadOpen(false)} className="p-1 hover:bg-slate-800 rounded"><X size={18} /></button>
              </div>
              {uploadError && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{uploadError}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Select PDF Document *</label>
                  <input type="file" accept=".pdf" required onChange={e => setUploadFile(e.target.files[0])} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Title *</label>
                  <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none" placeholder="e.g. JavaScript Class Notes" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Subject Folder *</label>
                  <select required value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-xl p-3 text-sm outline-none">
                    <option value="">Select Folder</option>
                    {subjectNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setUploadOpen(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-sm text-slate-400 font-bold hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white rounded-xl cursor-pointer">
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 9. Delete PDF Confirm */}
        {pdfDeleteTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111625] border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200">Delete PDF Notes</h3>
              <p className="text-slate-400 text-sm">Are you sure you want to delete <span className="font-semibold text-slate-200">"{pdfDeleteTarget.title}"</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setPdfDeleteTarget(null)} className="flex-1 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button onClick={handleDeletePdf} disabled={pdfDeleteLoading} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white rounded-xl cursor-pointer">
                  {pdfDeleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // --- RENDER COMPONENT: GENERATE REVIEW ---
  if (workspaceView === "review") {
    const approvedCount = draftQuestions.filter(q => q._approved).length;
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10 font-sans space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <button onClick={() => setWorkspaceView("default")} className="p-2 rounded-xl hover:bg-slate-500/10 transition-all text-slate-300 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black">Generate &amp; Review Questions</h1>
            <p className="text-xs text-slate-400">PDF: {activeMaterial?.title}</p>
          </div>
        </div>

        {draftQuestions.length === 0 ? (
          <div className="max-w-xl mx-auto p-8 rounded-3xl border border-slate-800 bg-[#111625] space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Number of AI Questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setGenCount(n)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${genCount === n ? "bg-indigo-600 text-white border-transparent" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {genError && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{genError}</div>}
            <button onClick={handleGenerateQuestions} disabled={generating}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Questions</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Review generated drafts and select which to save.</p>
              {saveResult ? (
                <div className="text-emerald-400 text-sm font-bold">✓ {saveResult.saved} questions added!</div>
              ) : (
                <button onClick={handleSaveDraftToBank} disabled={savingToBank || approvedCount === 0}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white disabled:opacity-50 cursor-pointer">
                  Save {approvedCount} to Bank
                </button>
              )}
            </div>
            {genError && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{genError}</div>}
            <div className="space-y-3">
              {draftQuestions.map((q, idx) => (
                <div key={q._id} className={`p-5 rounded-2xl border bg-[#111625] transition-all ${q._approved ? "border-slate-800" : "border-slate-800/40 opacity-50"}`}>
                  <div className="flex items-start gap-4 justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button onClick={() => updateDraft(idx, "_approved", !q._approved)}
                              className={`w-5 h-5 mt-1 rounded border flex items-center justify-center cursor-pointer shrink-0 ${q._approved ? "bg-indigo-500 border-indigo-500" : "border-slate-700"}`}>
                        {q._approved && <Check size={12} />}
                      </button>
                      <div className="flex-1 space-y-2">
                        {q._editing ? (
                          <div className="space-y-3">
                            <textarea rows={2} className="w-full p-3 bg-[#161b2b] border border-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none resize-none" value={q.questionText} onChange={e => updateDraft(idx, "questionText", e.target.value)} />
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Difficulty</label>
                                <select value={q.difficulty} onChange={e => updateDraft(idx, "difficulty", e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-lg p-2 text-xs outline-none">
                                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">Keywords</label>
                                <input type="text" value={q.keywords || ""} onChange={e => updateDraft(idx, "keywords", e.target.value)} className="w-full bg-[#161B2B] border border-slate-800 rounded-lg p-2 text-xs outline-none" placeholder="Keywords..." />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-200 leading-snug">{q.questionText}</p>
                            <div className="flex gap-2">
                              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-medium">{q.subject}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${DIFF_COLOR[q.difficulty].bg} ${DIFF_COLOR[q.difficulty].text}`}>{q.difficulty}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 shrink-0">
                      {q._editing ? (
                        <button onClick={() => updateDraft(idx, "_editing", false)} className="p-2 rounded hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400 cursor-pointer" title="Save changes">
                          <Check size={14} />
                        </button>
                      ) : (
                        <button onClick={() => updateDraft(idx, "_editing", true)} className="p-2 rounded hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-400 cursor-pointer" title="Edit draft">
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button onClick={() => setDraftQuestions(qs => qs.filter((_, i) => i !== idx))} className="p-2 rounded hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 cursor-pointer" title="Remove question">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {generating && (
                <div className="p-5 rounded-2xl border border-slate-800/40 bg-[#111625]/50 flex items-center justify-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-sm font-medium text-slate-400">Generating question {draftQuestions.length + 1} of {genCount}...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- EXPLORER VIEW (WHEN FOLDER IS OPENED) ---
  if (selectedSubject) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10 font-sans space-y-6 animate-fade-in">
        {/* Breadcrumb folder navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedSubject("")}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-805 hover:text-white transition-all text-slate-300 cursor-pointer animate-fade-in"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold">
                <span className="cursor-pointer hover:underline" onClick={() => setSelectedSubject("")}>Question Bank</span>
                <span>/</span>
                <span className="text-indigo-400">{selectedSubject}</span>
              </div>
              <h1 className="text-2xl font-black mt-1 flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-indigo-400 animate-pulse" />
                {selectedSubject}
              </h1>
            </div>
          </div>

          {activeTab !== "global" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setForm({ ...emptyForm, subject: selectedSubject });
                  setEditingId(null);
                  setFormError("");
                  setModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-semibold text-xs text-white shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          )}
        </div>

        {/* List of questions for the selected subject */}
        <div className="space-y-4 max-w-5xl">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Questions inside folder</span>
            <span className="text-[10px] text-slate-500">Page {questionPage}</span>
          </div>
          
          {visibleQuestions.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
              No questions in this folder yet. Click "Add Question" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleQuestions.map((q) => (
                <div
                  key={q.id}
                  className="group flex items-start justify-between gap-4 p-5 rounded-xl border border-slate-850 bg-[#0E1322]/80 hover:border-slate-750 transition-all hover:bg-slate-900/30"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-semibold text-slate-200 leading-snug">{q.questionText}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-medium">{q.topic || "General"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${DIFF_COLOR[q.difficulty].bg} ${DIFF_COLOR[q.difficulty].text}`}>{q.difficulty}</span>
                    </div>
                  </div>
                  {!(q.instituteId === null && user?.role !== "ADMIN") && (
                    <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(q)} className="p-2 rounded hover:bg-indigo-500/10 hover:text-indigo-400 text-slate-400 cursor-pointer">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: q.id, questionText: q.questionText })} className="p-2 rounded hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Folder Pagination */}
          {selectedQuestions.length > QUESTIONS_PER_PAGE && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-850">
              <button
                disabled={questionPage === 1}
                onClick={() => setQuestionPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded border border-slate-850 bg-slate-900 disabled:opacity-40 text-slate-300 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 font-semibold">
                Page {questionPage} of {Math.ceil(selectedQuestions.length / QUESTIONS_PER_PAGE)}
              </span>
              <button
                disabled={questionPage >= Math.ceil(selectedQuestions.length / QUESTIONS_PER_PAGE)}
                onClick={() => setQuestionPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-slate-850 bg-slate-900 disabled:opacity-40 text-slate-300 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {renderModals()}
      </div>
    );
  }

  // --- MAIN ALL-IN-ONE VIEW (FOLDERS CLOSED VIEW) ---
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Title / Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Brain size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">AI Viva</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Viva Management Dashboard
            </h1>
            <p className="text-slate-400 text-sm">
              Manage question banks and schedule student assessments.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {subSectionTab === "bank" ? (
              activeTab !== "global" && (
                <>
                  <button
                    onClick={() => { setSubjectModalError(""); setNewFolderSubjectName(""); setSubjectModalOpen(true); }}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 font-medium text-xs text-slate-300 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span>Add Folder</span>
                  </button>
                  <button
                    onClick={() => { setExtractModalOpen(true); fetchMaterials(); }}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 font-medium text-xs text-slate-300 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Extract from PDF</span>
                  </button>
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-semibold text-xs text-white shadow-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>
                </>
              )
            ) : (
              <button
                onClick={() => {
                  setEditingVivaId(null);
                  setScheduleTitle("");
                  setScheduleSubject("");
                  setScheduleDescription("");
                  const now = new Date();
                  const tzOffset = now.getTimezoneOffset() * 60000;
                  const startStr = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
                  const endStr = new Date(now.getTime() + 3600000 - tzOffset).toISOString().slice(0, 16);
                  setScheduleStartTime(startStr);
                  setScheduleEndTime(endStr);
                  setScheduleSelectedQuestions([]);
                  setScheduleError("");
                  setScheduleSuccess("");
                  setScheduleOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 font-bold text-xs text-white shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Viva</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher: Question Bank vs Schedule Viva */}
        <div className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
          <button
            type="button"
            onClick={() => setSubSectionTab("bank")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer ${subSectionTab === "bank" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            Question Bank
          </button>
          <button
            type="button"
            onClick={() => setSubSectionTab("schedule")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer ${subSectionTab === "schedule" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            Schedule Viva
          </button>
        </div>

        {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

        {/* ==========================================
            TAB 1: QUESTION BANK
            ========================================== */}
        {subSectionTab === "bank" && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Questions", value: total, icon: BookOpen, color: "indigo" },
                { label: "Easy Questions", value: byDiff.EASY, icon: Layers, color: "emerald" },
                { label: "Medium Questions", value: byDiff.MEDIUM, icon: Layers, color: "amber" },
                { label: "Hard Questions", value: byDiff.HARD, icon: Layers, color: "rose" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0`}><Icon size={16} /></div>
                  <div>
                    <p className="text-xl font-black">{value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Institute/Global toggle switcher */}
            {user?.role !== "ADMIN" && (
              <div className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-xs">
                <button
                  type="button"
                  onClick={() => { setActiveTab("institute"); setSelectedSubject(""); setQuestionPage(1); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${activeTab === "institute" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Your Institute
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("global"); setSelectedSubject(""); setQuestionPage(1); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${activeTab === "global" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Global Bank
                </button>
              </div>
            )}

            {/* Folder Grid */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-300">
                <Folder className="w-5 h-5 text-indigo-400" />
                Question Bank Subjects
              </h2>

              {loading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : subjectNames.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
                  No questions found. Add folder or create questions to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {subjectNames.map(subject => {
                    const count = filteredQuestions.filter(q => q.subject === subject).length;
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => {
                          setSelectedSubject(subject);
                          setQuestionPage(1);
                        }}
                        className="group flex items-center justify-between gap-4 p-5 rounded-xl bg-[#111625] border border-slate-800 hover:border-indigo-500/40 text-left transition-all cursor-pointer outline-none font-sans"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                            <Folder className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate text-slate-200">{subject}</p>
                            <p className="text-[11px] font-semibold text-slate-500">
                              {count} question{count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: SCHEDULING VIVA
            ========================================== */}
        {subSectionTab === "schedule" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
              <h2 className="text-lg font-bold flex items-center gap-2 text-pink-300">
                <Calendar className="w-5 h-5 text-pink-400" />
                Viva Scheduling & Session History
              </h2>
            </div>

            {vivasLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              </div>
            ) : vivas.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
                No Vivas scheduled. Click "Schedule Viva" to host a new session.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vivas.map(viva => {
                  const status = getVivaStatus(viva);
                  return (
                    <div key={viva.id} className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all font-sans">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{viva.subject}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-200">{viva.title}</h3>
                          {viva.description && <p className="text-xs text-slate-400 line-clamp-2 mt-1">{viva.description}</p>}
                        </div>
                        <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /><span>Start: {new Date(viva.startTime).toLocaleString()}</span></div>
                          {viva.endTime && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /><span>End: {new Date(viva.endTime).toLocaleString()}</span></div>}
                          <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-slate-500" /><span>Questions: {viva.questions?.length || 0}</span></div>
                        </div>
                        <div className="flex gap-2 items-center pt-2 border-t border-slate-850">
                          <button
                            type="button"
                            onClick={() => openEditViva(viva)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 cursor-pointer transition-colors"
                            title="Edit Viva Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteViva(viva.id)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {renderModals()}
    </div>
  );
}
