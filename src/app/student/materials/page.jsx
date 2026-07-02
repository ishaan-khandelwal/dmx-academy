"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  FileText, Search, Download, ExternalLink, Clock, AlertCircle,
  Folder, ArrowLeft
} from "lucide-react";

export default function StudentMaterialsPage() {
  const { user, token, API_BASE } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": "USER" })
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

  // Group by subjects for folders
  const subjects = useMemo(() => {
    const subs = new Set(materials.map(m => m.subject).filter(Boolean));
    return Array.from(subs).sort((a, b) => a.localeCompare(b));
  }, [materials]);

  // Filtered notes based on subject and search query
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
      : `${url}?x-bypass-auth=true&x-bypass-role=USER`;
    window.open(downloadUrl, "_blank");
  };

  const handleView = (id) => {
    const url = `${API_BASE}/api/viva/materials/${id}/view`;
    const viewUrl = token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? `${url}?token=${encodeURIComponent(token)}`
      : `${url}?x-bypass-auth=true&x-bypass-role=USER`;
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
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-accent)" }}>Class Notes Center</span>
          </div>
          <h1 className="text-2xl font-black font-display" style={{ color: "var(--text-primary)" }}>Study Materials</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Access class notes and documents taught in your batches.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20 flex items-center space-x-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        </div>
      )}

      {/* Search & Filter Options */}
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

      {/* Main Grid: Folder List or Note List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
        </div>
      ) : !selectedSubject ? (
        /* Folder View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Subjects ({subjects.length})
            </span>
          </div>

          {subjects.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed text-center space-y-4" style={{ borderColor: "var(--border-primary)" }}>
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                   style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
                <Folder size={28} />
              </div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>No subjects or notes found</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Notes uploaded by batch managers will appear here.</p>
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
        /* Notes Inside Selected Folder */
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedSubject("")}
              className="p-2 rounded-xl hover:bg-slate-500/10 cursor-pointer text-indigo-400 flex items-center justify-center"
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

                  <div className="flex items-center justify-end pt-2 border-t gap-2" style={{ borderColor: "var(--border-primary)" }}>
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
