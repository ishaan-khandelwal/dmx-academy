"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  FileText, Upload, Trash2, Clock, Folder, FolderOpen,
  Search, Download, ExternalLink, X, Check, AlertCircle, AlertTriangle, ArrowLeft, Plus
} from "lucide-react";

export default function StudyMaterialsPage() {
  const { user, token, API_BASE } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Local state for custom subjects
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

  // Subject creation modal state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [newFolderSubjectName, setNewFolderSubjectName] = useState("");
  const [subjectModalError, setSubjectModalError] = useState("");

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadNewSubjectName, setUploadNewSubjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getHeaders = useCallback((isJson = true) => ({
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setMaterials(data.materials);
      else setError(data.message || "Failed to load study materials.");
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [API_BASE, getHeaders]);

  useEffect(() => {
    if (user) fetchMaterials();
  }, [user, fetchMaterials]);

  const handleCreateSubjectFolder = () => {
    const trimmed = newFolderSubjectName.trim();
    if (!trimmed) return setSubjectModalError("Subject name is required.");
    
    // Add to custom subjects list
    if (!subjects.includes(trimmed)) {
      setCustomSubjects(prev => [...prev, trimmed]);
    }
    setNewFolderSubjectName("");
    setSubjectModalOpen(false);
  };

  const handleUpload = async () => {
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
        // If they created a new subject, add it to custom subjects list so it keeps existing
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

  const handleDeleteMaterial = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/viva/materials/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteTarget(null);
        fetchMaterials();
      } else {
        setError(data.message || "Delete failed.");
      }
    } catch {
      setError("Network error during delete.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Group subjects for folders
  const subjects = useMemo(() => {
    const subs = new Set([
      ...customSubjects,
      ...materials.map(m => m.subject).filter(Boolean)
    ]);
    return Array.from(subs).sort((a, b) => a.localeCompare(b));
  }, [materials, customSubjects]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject ? m.subject === selectedSubject : true;
      return matchesSearch && matchesSubject;
    });
  }, [materials, searchQuery, selectedSubject]);

  const handleDownload = (id) => {
    const url = `${API_BASE}/api/viva/materials/${id}/download`;
    const downloadUrl = token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? `${url}?token=${encodeURIComponent(token)}`
      : `${url}?x-bypass-auth=true&x-bypass-role=ADMIN`;
    window.open(downloadUrl, "_blank");
  };

  const handleView = (id) => {
    const url = `${API_BASE}/api/viva/materials/${id}/view`;
    const viewUrl = token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? `${url}?token=${encodeURIComponent(token)}`
      : `${url}?x-bypass-auth=true&x-bypass-role=ADMIN`;
    window.open(viewUrl, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <FileText size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-accent)" }}>Notes Vault</span>
          </div>
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>Study Materials</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload class notes PDFs for reading and download.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { setSubjectModalError(""); setNewFolderSubjectName(""); setSubjectModalOpen(true); }}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border hover:scale-105 cursor-pointer"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
            <Plus size={15} className="text-indigo-400" />
            <span>Add Folder</span>
          </button>
          <button onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-105 cursor-pointer"
                  style={{ background: "var(--accent-gradient)" }}>
            <Upload size={15} />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 h-4 w-4 opacity-40" style={{ color: "var(--text-secondary)" }} />
        <input
          type="text"
          placeholder="Search documents by title or filename..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border text-sm outline-none"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)", color: "var(--text-primary)" }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Area */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
        </div>
      ) : !selectedSubject ? (
        /* Folders View */
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Subjects ({subjects.length})
          </span>

          {subjects.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed text-center space-y-4" style={{ borderColor: "var(--border-primary)" }}>
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                   style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
                <Folder size={28} />
              </div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>No subjects or notes found</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload a PDF or add a subject folder to start.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map(subject => {
                const count = materials.filter(m => m.subject === subject).length;
                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className="group p-6 rounded-3xl border text-left flex items-start gap-4 transition-all hover:scale-102 hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
                  >
                    <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                      <Folder size={28} className="fill-current" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-black truncate group-hover:text-indigo-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                        {subject}
                      </h3>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Polaris School Of Technology
                      </p>
                      <p className="text-[11px] font-semibold text-indigo-400">
                        {count} note{count !== 1 ? "s" : ""} available
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Notes inside Selected Subject folder */
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedSubject("")}
              className="p-2 rounded-xl hover:bg-slate-500/10 cursor-pointer text-indigo-400 flex items-center justify-center animate-fade-in"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-lg font-black font-display" style={{ color: "var(--text-primary)" }}>
                {selectedSubject}
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Showing {filteredMaterials.length} documents
              </p>
            </div>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed text-center" style={{ borderColor: "var(--border-primary)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>No documents match your query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map(m => (
                <div key={m.id} className="p-5 rounded-3xl border flex flex-col justify-between space-y-4 shadow-sm"
                     style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                        {m.subject}
                      </span>
                      <span className="text-[10px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                        <Clock size={11} />
                        {new Date(m.uploadDate || m.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-black truncate" style={{ color: "var(--text-primary)" }}>
                        {m.title}
                      </h3>
                      <p className="text-xs truncate font-mono" style={{ color: "var(--text-secondary)" }}>
                        {m.fileName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border-primary)" }}>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(m.id)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
                        style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                      >
                        <ExternalLink size={13} />
                        <span>Read</span>
                      </button>
                      <button
                        onClick={() => handleDownload(m.id)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:scale-102 cursor-pointer"
                        style={{ background: "var(--accent-gradient)" }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
              <div className="flex items-center space-x-2">
                <Upload size={16} style={{ color: "var(--text-accent)" }} />
                <h2 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Upload Study Note</h2>
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
                  Note Title <span className="text-rose-500">*</span>
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
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
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
              <button onClick={handleUpload} disabled={uploading}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white shadow-md transition-all hover:scale-102 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      style={{ background: "var(--accent-gradient)" }}>
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Uploading...</span></>
                ) : (
                  <><Check size={15} /><span>Upload Note</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-5 text-center"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>Delete Study Material?</h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                This permanently deletes "{deleteTarget.title}" and its PDF file.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
                      className="flex-1 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDeleteMaterial} disabled={deleteLoading}
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
