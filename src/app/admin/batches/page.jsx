"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Plus, Trash2, School, Users, Briefcase, Award, X,
  CheckCircle2, AlertCircle, Calendar, GraduationCap, Check, Mail, ArrowLeft, Edit, RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ManageBatchesPage() {
  const router = useRouter();
  const { user, token, API_BASE } = useAuth();

  // Mock list of registered members in the institute (aligned with people list)
  const [managers, setManagers] = useState([
    { id: 4, name: "Sakshi", email: "sakshi@dmx.com" }
  ]);

  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  // View Navigation State: 'list' | 'details'
  const [activeView, setActiveView] = useState("list");
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const selectedBatchDetails = batches.find(b => b.id === selectedBatchId) || null;
  const [activeDetailTab, setActiveDetailTab] = useState("manager"); // 'manager' | 'mentors' | 'students'
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [mentorSearchQuery, setMentorSearchQuery] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedMentorIds, setSelectedMentorIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Delete States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);

  // Submitting States
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Roster Assign States
  const [isAssignMentorOpen, setIsAssignMentorOpen] = useState(false);
  const [isAssignStudentOpen, setIsAssignStudentOpen] = useState(false);
  const [assignToast, setAssignToast] = useState(null); // { message, type }

  // Edit States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editBatchName, setEditBatchName] = useState("");
  const [editSelectedManagerId, setEditSelectedManagerId] = useState("");
  const [editSelectedMentorIds, setEditSelectedMentorIds] = useState([]);
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState([]);

  const handleToggleEditMentor = (id) => {
    setEditSelectedMentorIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleToggleEditStudent = (id) => {
    setEditSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // Security check: Redirect if not institute admin or super admin
  useEffect(() => {
    if (user && user.role !== "INSTITUTE_ADMIN" && user.role !== "ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const loadData = async () => {
    try {
      if (!token) return;
      setLoading(true);
      
      // Fetch members
      const membersRes = await fetch(`${API_BASE}/api/institutes/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const membersData = await membersRes.json();
      if (membersData.success && Array.isArray(membersData.members)) {
        const mgrs = [];
        const ments = [];
        const studs = [];
        for (const m of membersData.members) {
          const item = { id: m.id, name: m.username, email: m.email };
          if (m.role === 'BATCH_MANAGER') mgrs.push(item);
          else if (m.role === 'MENTOR') ments.push(item);
          else if (m.role === 'USER') studs.push(item);
        }
        setManagers(mgrs);
        setMentors(ments);
        setStudents(studs);
      }

      // Fetch batches
      const batchesRes = await fetch(`${API_BASE}/api/batches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const batchesData = await batchesRes.json();
      if (batchesData.success && Array.isArray(batchesData.batches)) {
        const formatted = batchesData.batches.map(b => ({
          id: b.id,
          name: b.name,
          managerId: b.managerId,
          mentorIds: b.mentors.map(m => m.id),
          studentIds: b.students.map(s => s.id),
          createdAt: b.createdAt.split("T")[0]
        }));
        setBatches(formatted);
      }
    } catch (err) {
      console.error("Failed to load batches/members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Auto-select first available manager on open
  useEffect(() => {
    if (isAddModalOpen && managers.length > 0) {
      setSelectedManagerId(managers[0].id.toString());
      setSelectedMentorIds([]);
      setSelectedStudentIds([]);
      setBatchName("");
    }
  }, [isAddModalOpen, managers]);

  const handleToggleMentor = (id) => {
    setSelectedMentorIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleToggleStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleCreateBatchSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    if (!batchName.trim()) {
      setFormError("Batch name is required.");
      setSubmitting(false);
      return;
    }
    if (!selectedManagerId) {
      setFormError("Please select a Batch Manager.");
      setSubmitting(false);
      return;
    }

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/batches`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: batchName.trim(),
            managerId: parseInt(selectedManagerId, 10),
            mentorIds: selectedMentorIds,
            studentIds: selectedStudentIds
          })
        });
        const data = await res.json();
        if (data.success) {
          const newBatch = {
            id: data.batch.id,
            name: data.batch.name,
            managerId: data.batch.managerId,
            mentorIds: data.batch.mentors.map(m => m.id),
            studentIds: data.batch.students.map(s => s.id),
            createdAt: data.batch.createdAt.split("T")[0]
          };
          setBatches(prev => [newBatch, ...prev]);
          setFormSuccess("Batch created successfully!");
        } else {
          setFormError(data.message || "Failed to create batch.");
          setSubmitting(false);
          return;
        }
      } else {
        // Offline mockup fallback
        const newBatch = {
          id: Date.now(),
          name: batchName.trim(),
          managerId: parseInt(selectedManagerId, 10),
          mentorIds: selectedMentorIds,
          studentIds: selectedStudentIds,
          createdAt: new Date().toISOString().split("T")[0]
        };
        setBatches(prev => [newBatch, ...prev]);
        setFormSuccess("Batch created successfully (Offline Mock)!");
      }

      setBatchName("");
      setSelectedMentorIds([]);
      setSelectedStudentIds([]);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess("");
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError("Error connecting to backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerDelete = (batch) => {
    setBatchToDelete(batch);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!batchToDelete) return;
    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/batches/${batchToDelete.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (!data.success) {
          console.warn("Delete batch API returned failure, fallback to UI delete:", data.message);
        }
      }
    } catch (err) {
      console.error("Failed to delete batch via API, fallback to UI delete:", err);
    }
    setBatches(prev => prev.filter(b => b.id !== batchToDelete.id));
    setIsDeleteModalOpen(false);
    setBatchToDelete(null);
    if (selectedBatchId === batchToDelete.id) {
      setActiveView("list");
      setSelectedBatchId(null);
    }
  };

  const triggerEdit = (batch) => {
    setItemToEdit(batch);
    setEditBatchName(batch.name);
    setEditSelectedManagerId(batch.managerId ? batch.managerId.toString() : "");
    setEditSelectedMentorIds(batch.mentorIds || []);
    setEditSelectedStudentIds(batch.studentIds || []);
    setFormError("");
    setFormSuccess("");
    setIsEditModalOpen(true);
  };

  const handleEditBatchSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setEditing(true);

    if (!editBatchName.trim()) {
      setFormError("Batch name is required.");
      setEditing(false);
      return;
    }
    if (!editSelectedManagerId) {
      setFormError("Please select a Batch Manager.");
      setEditing(false);
      return;
    }

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/batches/${itemToEdit.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: editBatchName.trim(),
            managerId: parseInt(editSelectedManagerId, 10),
            mentorIds: editSelectedMentorIds,
            studentIds: editSelectedStudentIds
          })
        });
        const data = await res.json();
        if (data.success) {
          const updated = {
            id: data.batch.id,
            name: data.batch.name,
            managerId: data.batch.managerId,
            mentorIds: data.batch.mentors.map(m => m.id),
            studentIds: data.batch.students.map(s => s.id),
            createdAt: data.batch.createdAt.split("T")[0]
          };
          setBatches(prev => prev.map(b => b.id === itemToEdit.id ? updated : b));
          setFormSuccess("Batch updated successfully!");
        } else {
          setFormError(data.message || "Failed to update batch.");
          setEditing(false);
          return;
        }
      } else {
        // Fallback for offline mock mode
        const updated = {
          ...itemToEdit,
          name: editBatchName.trim(),
          managerId: parseInt(editSelectedManagerId, 10),
          mentorIds: editSelectedMentorIds,
          studentIds: editSelectedStudentIds
        };
        setBatches(prev => prev.map(b => b.id === itemToEdit.id ? updated : b));
        setFormSuccess("Batch updated successfully (Offline Mock)!");
      }

      setTimeout(() => {
        setIsEditModalOpen(false);
        setFormSuccess("");
        setItemToEdit(null);
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError("Error connecting to backend server.");
    } finally {
      setEditing(false);
    }
  };

  const handleRemoveMentorFromBatch = async (menId) => {
    if (!selectedBatchDetails) return;
    const mentorName = mentors.find(m => m.id === menId)?.name || "this mentor";
    if (!window.confirm(`Are you sure you want to remove ${mentorName} from the batch ${selectedBatchDetails.name}?`)) {
      return;
    }
    try {
      if (token) {
        await fetch(`${API_BASE}/api/batches/batch-manager/batches/${selectedBatchDetails.id}/mentors/${menId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Failed to remove mentor:", err);
    }
    const updatedMentorIds = selectedBatchDetails.mentorIds.filter(id => id !== menId);
    setBatches(prev => prev.map(b => b.id === selectedBatchDetails.id ? { ...b, mentorIds: updatedMentorIds } : b));
  };

  const handleAddMentorToBatch = async (menId) => {
    if (!selectedBatchDetails) return;
    if (selectedBatchDetails.mentorIds.includes(menId)) return;
    const mentorName = mentors.find(m => m.id === menId)?.name || "Mentor";
    try {
      if (token) {
        await fetch(`${API_BASE}/api/batches/batch-manager/batches/${selectedBatchDetails.id}/mentors`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ mentorId: menId })
        });
      }
    } catch (err) {
      console.error("Failed to add mentor:", err);
    }
    const updatedMentorIds = [...selectedBatchDetails.mentorIds, menId];
    setBatches(prev => prev.map(b => b.id === selectedBatchDetails.id ? { ...b, mentorIds: updatedMentorIds } : b));
    setAssignToast({ message: `${mentorName} assigned successfully!` });
    setTimeout(() => setAssignToast(null), 2500);
  };

  const handleRemoveStudentFromBatch = async (stdId) => {
    if (!selectedBatchDetails) return;
    const studentName = students.find(s => s.id === stdId)?.name || "this student";
    if (!window.confirm(`Are you sure you want to remove ${studentName} from the batch ${selectedBatchDetails.name}?`)) {
      return;
    }
    try {
      if (token) {
        await fetch(`${API_BASE}/api/batches/batch-manager/batches/${selectedBatchDetails.id}/students/${stdId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Failed to remove student:", err);
    }
    const updatedStudentIds = selectedBatchDetails.studentIds.filter(id => id !== stdId);
    setBatches(prev => prev.map(b => b.id === selectedBatchDetails.id ? { ...b, studentIds: updatedStudentIds } : b));
  };

  const handleAddStudentToBatch = async (stdId) => {
    if (!selectedBatchDetails) return;
    if (selectedBatchDetails.studentIds.includes(stdId)) return;
    const studentName = students.find(s => s.id === stdId)?.name || "Student";
    try {
      if (token) {
        await fetch(`${API_BASE}/api/batches/batch-manager/batches/${selectedBatchDetails.id}/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ studentId: stdId })
        });
      }
    } catch (err) {
      console.error("Failed to add student:", err);
    }
    const updatedStudentIds = [...selectedBatchDetails.studentIds, stdId];
    setBatches(prev => prev.map(b => b.id === selectedBatchDetails.id ? { ...b, studentIds: updatedStudentIds } : b));
    setAssignToast({ message: `${studentName} assigned successfully!` });
    setTimeout(() => setAssignToast(null), 2500);
  };

  if (!user || (user.role !== "INSTITUTE_ADMIN" && user.role !== "ADMIN")) {
    return null;
  }

  // Get active roster for details page view
  const getActiveRoster = () => {
    if (!selectedBatchDetails) return [];
    if (activeDetailTab === "manager") {
      const mgr = managers.find(m => m.id === selectedBatchDetails.managerId);
      return mgr ? [{ ...mgr, role: "BATCH_MANAGER" }] : [];
    }
    if (activeDetailTab === "mentors") {
      return selectedBatchDetails.mentorIds
        .map(mid => mentors.find(m => m.id === mid))
        .filter(Boolean)
        .map(m => ({ ...m, role: "MENTOR" }));
    }
    return selectedBatchDetails.studentIds
      .map(sid => students.find(s => s.id === sid))
      .filter(Boolean)
      .map(s => ({ ...s, role: "STUDENT" }));
  };

  const detailsList = getActiveRoster();
  const filteredDetailsList = detailsList.filter(member => {
    const query = rosterSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (member.name || "").toLowerCase().includes(query) ||
      (member.email || "").toLowerCase().includes(query)
    );
  });

  const availableMentors = selectedBatchDetails
    ? mentors.filter(m => !selectedBatchDetails.mentorIds.includes(m.id))
    : [];

  const availableStudents = selectedBatchDetails
    ? students.filter(s => !selectedBatchDetails.studentIds.includes(s.id))
    : [];

  const filteredAvailableMentors = availableMentors.filter(m => {
    const query = mentorSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (m.name || "").toLowerCase().includes(query) ||
      (m.email || "").toLowerCase().includes(query)
    );
  });

  const filteredAvailableStudents = availableStudents.filter(s => {
    const query = studentSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (s.name || "").toLowerCase().includes(query) ||
      (s.email || "").toLowerCase().includes(query)
    );
  });

  const getBatchNamesManagedBy = (mgrId, excludeBatchId = null) => {
    const managed = batches.filter(b => 
      Number(b.managerId) === Number(mgrId) && 
      (excludeBatchId === null || Number(b.id) !== Number(excludeBatchId))
    );
    if (managed.length === 0) return "";
    return ` - Already managing: ${managed.map(b => b.name).join(", ")}`;
  };

  return (
    <div className="space-y-6 p-6 min-h-0 flex flex-col flex-1" style={{ color: "var(--text-primary)" }}>

      {activeView === "list" ? (
        <>
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[var(--bg-badge)] text-[var(--text-accent)] text-[10px] font-extrabold uppercase tracking-wider">
                  Academy Batches
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Manage Batches
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Create academic cohorts, bind dedicated Batch Managers, and map mentor/student rosters.
              </p> 
            </div>

            <button
              onClick={() => {
                setFormError("");
                setFormSuccess("");
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-[var(--accent-glow)] border border-transparent shrink-0"
            >
              <Plus size={16} />
              <span>Create Batch</span>
            </button>
          </div>

          {/* Grid of Batches */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search batches by name or manager..."
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                />
              </div>

              {/* Refresh Batches Button */}
              <button
                onClick={loadData}
                title="Refresh Batches"
                className="p-2.5 rounded-2xl border bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-[var(--text-accent)]" : ""} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-4 rounded-3xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <div className="w-8 h-8 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-[var(--text-muted)]">Fetching Batches...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-4 rounded-3xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <div className="w-16 h-16 rounded-3xl bg-[var(--bg-badge)] flex items-center justify-center text-[var(--text-accent)]">
                  <Layers size={28} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>No active batches</h3>
                  <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                    No cohorts registered yet. Create your first batch mapping to begin.
                  </p>
                </div>
              </div>
            ) : batches.filter(batch => {
              const query = batchSearchQuery.toLowerCase().trim();
              if (!query) return true;
              const mgrName = managers.find(m => m.id === batch.managerId)?.name || "Unassigned";
              return (
                batch.name.toLowerCase().includes(query) ||
                mgrName.toLowerCase().includes(query)
              );
            }).length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-4 rounded-3xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <div className="w-16 h-16 rounded-3xl bg-[var(--bg-badge)] flex items-center justify-center text-[var(--text-accent)]">
                  <Layers size={28} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>No matching batches</h3>
                  <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                    No cohorts matched your search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {batches.filter(batch => {
                  const query = batchSearchQuery.toLowerCase().trim();
                  if (!query) return true;
                  const mgrName = managers.find(m => m.id === batch.managerId)?.name || "Unassigned";
                  return (
                    batch.name.toLowerCase().includes(query) ||
                    mgrName.toLowerCase().includes(query)
                  );
                }).map((batch) => {
                  const mgrName = managers.find(m => m.id === batch.managerId)?.name || "Unassigned";
                  return (
                    <motion.div
                      key={batch.id}
                      layout
                      onClick={() => {
                        setSelectedBatchId(batch.id);
                        setActiveDetailTab("manager");
                        setActiveView("details");
                      }}
                      className="rounded-3xl border bg-[var(--bg-card)] p-6 space-y-5 relative overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                      style={{ borderColor: "var(--border-primary)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-base font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                            {batch.name}
                          </h3>
                          <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                            Created on {new Date(batch.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                         <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerEdit(batch);
                            }}
                            className="p-2 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDelete(batch);
                            }}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Association badges */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-2xl bg-[var(--bg-primary)]/50 border flex flex-col items-center text-center space-y-1" style={{ borderColor: "var(--border-primary)" }}>
                          <Briefcase size={14} className="text-purple-400" />
                          <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Manager</span>
                          <span className="text-[10px] font-black truncate max-w-full text-[var(--text-primary)]">{mgrName}</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-[var(--bg-primary)]/50 border flex flex-col items-center text-center space-y-1" style={{ borderColor: "var(--border-primary)" }}>
                          <Award size={14} className="text-amber-400" />
                          <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Mentors</span>
                          <span className="text-xs font-black text-[var(--text-primary)]">{batch.mentorIds.length} Instructors</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-[var(--bg-primary)]/50 border flex flex-col items-center text-center space-y-1" style={{ borderColor: "var(--border-primary)" }}>
                          <GraduationCap size={14} className="text-emerald-400" />
                          <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Students</span>
                          <span className="text-xs font-black text-[var(--text-primary)]">{batch.studentIds.length} Assigned</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Full Page Details View (Looks exactly like Manage People) */
        <div className="flex-1 flex flex-col min-h-0 space-y-6">
          {/* Header section with back button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setActiveView("list");
                  setSelectedBatchId(null);
                }}
                className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-accent)] hover:underline cursor-pointer"
              >
                <ArrowLeft size={12} />
                <span>Back to batches</span>
              </button>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Batch: {selectedBatchDetails?.name}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Roster table mapping Batch Manager, active Mentors, and assigned Students.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeDetailTab === "mentors" && (
                <button
                  onClick={() => {
                    setMentorSearchQuery("");
                    setIsAssignMentorOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg border border-transparent shrink-0"
                >
                  <Plus size={16} />
                  <span>Configure Mentors</span>
                </button>
              )}
              {activeDetailTab === "students" && (
                <button
                  onClick={() => {
                    setStudentSearchQuery("");
                    setIsAssignStudentOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg border border-transparent shrink-0"
                >
                  <Plus size={16} />
                  <span>Configure Students</span>
                </button>
              )}
              <button
                onClick={() => triggerEdit(selectedBatchDetails)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg border border-transparent shrink-0"
              >
                <Edit size={16} />
                <span>Edit Batch</span>
              </button>
              <button
                onClick={() => triggerDelete(selectedBatchDetails)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg border border-transparent shrink-0"
              >
                <Trash2 size={16} />
                <span>Delete Batch</span>
              </button>
            </div>
          </div>

          {/* Roster Tabs & Search Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            {/* Roster Tabs List */}
            <div className="flex gap-2 p-1.5 rounded-2xl w-fit border shrink-0 bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
              <button
                onClick={() => {
                  setActiveDetailTab("manager");
                  setRosterSearchQuery("");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeDetailTab === "manager"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-glow)]"
                  : "hover:bg-[var(--bg-primary)] border border-transparent"
                  }`}
              >
                <Briefcase size={14} />
                <span>Batch Manager</span>
              </button>
              <button
                onClick={() => {
                  setActiveDetailTab("mentors");
                  setRosterSearchQuery("");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeDetailTab === "mentors"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-glow)]"
                  : "hover:bg-[var(--bg-primary)] border border-transparent"
                  }`}
              >
                <Award size={14} />
                <span>Mentors</span>
              </button>
              <button
                onClick={() => {
                  setActiveDetailTab("students");
                  setRosterSearchQuery("");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeDetailTab === "students"
                  ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-glow)]"
                  : "hover:bg-[var(--bg-primary)] border border-transparent"
                  }`}
              >
                <GraduationCap size={14} />
                <span>Students</span>
              </button>
            </div>

            {/* Roster Search & Refresh Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {activeDetailTab !== "manager" && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder={`Search active ${activeDetailTab}...`}
                    value={rosterSearchQuery}
                    onChange={(e) => setRosterSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  />
                </div>
              )}

              {/* Refresh Detailed Roster Button */}
              <button
                onClick={loadData}
                title="Refresh Roster"
                className="p-2.5 rounded-2xl border bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-[var(--text-accent)]" : ""} />
              </button>
            </div>
          </div>

          {/* Table Body (Styled identically to Manage People page) */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-3xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
            {detailsList.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[var(--bg-badge)] flex items-center justify-center text-[var(--text-accent)]">
                  <Users size={28} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>No members found</h3>
                  <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                    No assigned members matched this role category for this batch.
                  </p>
                </div>
              </div>
            ) : filteredDetailsList.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[var(--bg-badge)] flex items-center justify-center text-[var(--text-accent)]">
                  <Users size={28} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>No matching members</h3>
                  <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                    No members matched your search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto min-w-0">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b text-[10px] font-extrabold uppercase tracking-wider select-none" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Role Permission</th>
                      {activeDetailTab !== "manager" && (
                        <th className="px-6 py-4">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs font-semibold" style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
                    {filteredDetailsList.map((member) => (
                      <tr key={member.id} className="hover:bg-[var(--bg-primary)]/50 transition-colors">
                        <td className="px-6 py-4 font-black">{member.name}</td>
                        <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>{member.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${member.role === "BATCH_MANAGER"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : member.role === "MENTOR"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                            {member.role.replace("_", " ")}
                          </span>
                        </td>
                        {activeDetailTab !== "manager" && (
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                if (activeDetailTab === "mentors") {
                                  handleRemoveMentorFromBatch(member.id);
                                } else {
                                  handleRemoveStudentFromBatch(member.id);
                                }
                              }}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors cursor-pointer border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden bg-[var(--bg-card)] flex flex-col max-h-[85vh]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {/* Modal Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <Layers size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Configure Batch
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable form body */}
              <form onSubmit={handleCreateBatchSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <fieldset disabled={submitting} className="space-y-4 border-none p-0 m-0">
                  {formError && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  {formSuccess && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Batch Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Batch Name / Cohort Title
                    </label>
                    <input
                      type="text"
                      required
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Batch-A"
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)" }}
                    />
                  </div>

                  {/* Manager Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Assign Batch Manager (1 Role Max)
                    </label>
                    <select
                      value={selectedManagerId}
                      onChange={(e) => setSelectedManagerId(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    >
                      <option value="">-- Select Manager --</option>
                      {managers.map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.name} ({mgr.email}){getBatchNamesManagedBy(mgr.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mentors Checklist */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Select Mentors (Multi-Batch Enabled)
                    </label>
                    <div className="max-h-28 overflow-y-auto p-3 rounded-2xl bg-[var(--bg-primary)] border space-y-2" style={{ borderColor: "var(--border-primary)" }}>
                      {mentors.map((men) => (
                        <div
                          key={men.id}
                          onClick={() => handleToggleMentor(men.id)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{men.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{men.email}</span>
                          </div>
                          {selectedMentorIds.includes(men.id) && (
                            <Check size={16} className="text-[var(--text-accent)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Checklist */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Select Students (Multi-Batch Enabled)
                    </label>
                    <div className="max-h-36 overflow-y-auto p-3 rounded-2xl bg-[var(--bg-primary)] border space-y-2" style={{ borderColor: "var(--border-primary)" }}>
                      {students.map((std) => (
                        <div
                          key={std.id}
                          onClick={() => handleToggleStudent(std.id)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{std.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{std.email}</span>
                          </div>
                          {selectedStudentIds.includes(std.id) && (
                            <Check size={16} className="text-[var(--text-accent)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </fieldset>
              </form>

              {/* Modal Actions */}
              <div className="p-6 border-t shrink-0 flex justify-end gap-3 bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all hover:bg-[var(--bg-primary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={handleCreateBatchSubmit}
                  className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Configuring...</span>
                    </>
                  ) : (
                    "Configure Batch"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden p-6 text-center space-y-4 bg-[var(--bg-card)]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">
                  Are u sure want to delete this batch
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  This will delete the batch mapping <strong className="font-extrabold" style={{ color: "var(--text-primary)" }}>{batchToDelete?.name}</strong>. Students and mentors assigned to this batch will be unlinked, but their accounts in the institute will not be deleted.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all hover:bg-[var(--bg-primary)] cursor-pointer text-[var(--text-secondary)]"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Batch Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden bg-[var(--bg-card)]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b animate-slideDown" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <Edit size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Edit Batch Cohort
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable form body */}
              <form onSubmit={handleEditBatchSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <fieldset disabled={editing} className="space-y-4 border-none p-0 m-0">
                  {formError && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold animate-shake">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  {formSuccess && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold animate-bounce">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {/* Batch Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Batch Name / Cohort Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editBatchName}
                      onChange={(e) => setEditBatchName(e.target.value)}
                      placeholder="e.g. Batch-A"
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)" }}
                    />
                  </div>

                  {/* Manager Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Assign Batch Manager (1 Role Max)
                    </label>
                    <select
                      value={editSelectedManagerId}
                      onChange={(e) => setEditSelectedManagerId(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    >
                      <option value="">-- Select Manager --</option>
                      {managers.map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.name} ({mgr.email}){getBatchNamesManagedBy(mgr.id, itemToEdit?.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mentors Checklist */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Select Mentors (Multi-Batch Enabled)
                    </label>
                    <div className="max-h-28 overflow-y-auto p-3 rounded-2xl bg-[var(--bg-primary)] border space-y-2" style={{ borderColor: "var(--border-primary)" }}>
                      {mentors.map((men) => (
                        <div
                          key={men.id}
                          onClick={() => handleToggleEditMentor(men.id)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{men.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{men.email}</span>
                          </div>
                          {editSelectedMentorIds.includes(men.id) && (
                            <Check size={16} className="text-[var(--text-accent)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Checklist */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Select Students (Multi-Batch Enabled)
                    </label>
                    <div className="max-h-36 overflow-y-auto p-3 rounded-2xl bg-[var(--bg-primary)] border space-y-2" style={{ borderColor: "var(--border-primary)" }}>
                      {students.map((std) => (
                        <div
                          key={std.id}
                          onClick={() => handleToggleEditStudent(std.id)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{std.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{std.email}</span>
                          </div>
                          {editSelectedStudentIds.includes(std.id) && (
                            <Check size={16} className="text-[var(--text-accent)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </fieldset>
              </form>

              {/* Modal Actions */}
              <div className="p-6 border-t shrink-0 flex justify-end gap-3 bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <button
                  type="button"
                  disabled={editing}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all hover:bg-[var(--bg-primary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  onClick={handleEditBatchSubmit}
                  className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {editing ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Mentors Configuration Modal */}
      <AnimatePresence>
        {isAssignMentorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden bg-[var(--bg-card)] flex flex-col max-h-[80vh]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <Award size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Assign Batch Mentors
                  </h3>
                </div>
                <button
                  onClick={() => setIsAssignMentorOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Roster Selector List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
                <div className="flex flex-col gap-2 shrink-0">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    Available Institute Mentors
                  </span>
                  {/* Modal Search Box */}
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Search mentors by name or email..."
                      value={mentorSearchQuery}
                      onChange={(e) => setMentorSearchQuery(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border rounded-2xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {availableMentors.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    All mentors have already been assigned to this batch teaching roster.
                  </p>
                ) : filteredAvailableMentors.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    No available mentors match your search query.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableMentors.map((men) => (
                      <div
                        key={men.id}
                        onClick={() => handleAddMentorToBatch(men.id)}
                        className="flex items-center justify-between p-3 rounded-2xl border bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
                        style={{ borderColor: "var(--border-primary)" }}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black">{men.name}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">{men.email}</span>
                        </div>
                        <span className="text-[9px] font-black text-[var(--text-accent)] bg-[var(--bg-badge)] px-2.5 py-1.5 rounded-xl border border-[var(--border-primary)] uppercase">
                          Assign
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t shrink-0 flex justify-end bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <button
                  onClick={() => setIsAssignMentorOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Students Configuration Modal */}
      <AnimatePresence>
        {isAssignStudentOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden bg-[var(--bg-card)] flex flex-col max-h-[80vh]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <GraduationCap size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Assign Batch Students
                  </h3>
                </div>
                <button
                  onClick={() => setIsAssignStudentOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Roster Selector List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                      Add Students to Batch
                    </span>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Select students to enroll them in this cohort roster.
                    </p>
                  </div>
                  {/* Modal Search Box */}
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border rounded-2xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {availableStudents.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    No unassigned students found. All registered students are already mapping to batches.
                  </p>
                ) : filteredAvailableStudents.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    No available students match your search query.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableStudents.map((std) => (
                      <div
                        key={std.id}
                        onClick={() => handleAddStudentToBatch(std.id)}
                        className="flex items-center justify-between p-3 rounded-2xl border bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-primary)] transition-all cursor-pointer"
                        style={{ borderColor: "var(--border-primary)" }}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-black">{std.name}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">{std.email}</span>
                        </div>
                        <span className="text-[9px] font-black text-[var(--text-accent)] bg-[var(--bg-badge)] px-2.5 py-1.5 rounded-xl border border-[var(--border-primary)] uppercase">
                          Assign
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t shrink-0 flex justify-end bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
                <button
                  onClick={() => setIsAssignStudentOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Success Toast */}
      <AnimatePresence>
        {assignToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-500">Assigned!</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{assignToast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
