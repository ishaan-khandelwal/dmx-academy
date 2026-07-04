"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Trash2, Mail, Shield, GraduationCap, X,
  CheckCircle2, AlertCircle, Calendar, Briefcase, Award, Layers, Edit, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ManagePeoplePage() {
  const router = useRouter();
  const { token, API_BASE, user } = useAuth();

  // Tab state: 'managers' | 'mentors' | 'students'
  const [activeTab, setActiveTab] = useState("managers");
  const [searchQuery, setSearchQuery] = useState("");

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberRole, setMemberRole] = useState("BATCH_MANAGER");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Delete states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Submitting States
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Password visibility states
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Batches state
  const [batches, setBatches] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [editSelectedBatchIds, setEditSelectedBatchIds] = useState([]);

  // Security Check: Redirect if not institute admin or admin
  useEffect(() => {
    if (user && user.role !== "INSTITUTE_ADMIN" && user.role !== "ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const fetchMembers = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/institutes/members`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        const formatted = data.members.map(m => {
          let assignedBatchLabel = "Unassigned";
          if (m.role === 'BATCH_MANAGER' && Array.isArray(m.managedBatches) && m.managedBatches.length > 0) {
            assignedBatchLabel = m.managedBatches.map(b => b.name).join(", ");
          } else if (m.role === 'USER' && Array.isArray(m.batchesStudied) && m.batchesStudied.length > 0) {
            assignedBatchLabel = m.batchesStudied.map(b => b.name).join(", ");
          } else if (m.role === 'MENTOR' && Array.isArray(m.batchesTaught) && m.batchesTaught.length > 0) {
            assignedBatchLabel = m.batchesTaught.map(b => b.name).join(", ");
          }
          return {
            id: m.id,
            name: m.username,
            email: m.email,
            role: m.role === 'USER' ? 'STUDENT' : m.role,
            dateAdded: m.createdAt.split("T")[0],
            assignedBatch: assignedBatchLabel
          };
        });
        setPeople(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/batches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.batches)) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.error("Failed to load batches on people page:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchBatches();
  }, [token]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("All fields are required.");
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    if (people.some(p => p.email.toLowerCase() === email.trim().toLowerCase())) {
      setFormError("Email is already in use by another member.");
      setSubmitting(false);
      return;
    }

    const payloadRole = memberRole === 'STUDENT' ? 'USER' : memberRole;

    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/institutes/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            username: name.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(),
            role: payloadRole,
            batchIds: selectedBatchIds
          })
        });
        const data = await res.json();
        if (data.success) {
          const assignedBatchNames = batches
            .filter(b => selectedBatchIds.includes(b.id))
            .map(b => b.name)
            .join(", ") || "Unassigned";

          const newMember = {
            id: data.user.id,
            name: data.user.username,
            email: data.user.email,
            role: memberRole,
            dateAdded: data.user.createdAt.split("T")[0],
            assignedBatch: assignedBatchNames
          };
          setPeople(prev => [...prev, newMember]);
          setFormSuccess("Member registered successfully!");
        } else {
          setFormError(data.message || "Failed to register member.");
          setSubmitting(false);
          return;
        }
      } else {
        // Fallback for offline mock mode
        const newMember = {
          id: Date.now(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: memberRole,
          dateAdded: new Date().toISOString().split("T")[0]
        };
        setPeople(prev => [...prev, newMember]);
        setFormSuccess("Member registered successfully (Offline Mock)!");
      }

      // Clear inputs
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setSelectedBatchIds([]);

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

  const triggerDelete = (member) => {
    setItemToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (token) {
        const res = await fetch(`${API_BASE}/api/institutes/members/${itemToDelete.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (!data.success) {
          console.warn("Delete API returned failure, fallback to UI delete:", data.message);
        }
      }
    } catch (err) {
      console.error("Failed to call delete API, fallback to UI delete:", err);
    }
    setPeople(prev => prev.filter(p => p.id !== itemToDelete.id));
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const triggerEdit = (member) => {
    setItemToEdit(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPassword("");

    // Determine target batch IDs based on current batch label
    const currentNames = (member.assignedBatch || "").split(", ");
    const currentBatchIds = batches
      .filter(b => currentNames.includes(b.name))
      .map(b => b.id);
    setEditSelectedBatchIds(currentBatchIds);

    setFormError("");
    setFormSuccess("");
    setIsEditModalOpen(true);
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setEditing(true);

    if (!editName.trim() || !editEmail.trim()) {
      setFormError("Name and email are required.");
      setEditing(false);
      return;
    }

    try {
      if (token) {
        const bodyData = {
          username: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          batchIds: editSelectedBatchIds
        };
        if (editPassword.trim()) {
          bodyData.password = editPassword.trim();
        }

        const res = await fetch(`${API_BASE}/api/institutes/members/${itemToEdit.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        if (data.success) {
          const assignedBatchNames = batches
            .filter(b => editSelectedBatchIds.includes(b.id))
            .map(b => b.name)
            .join(", ") || "Unassigned";

          setPeople(prev => prev.map(p => p.id === itemToEdit.id ? {
            ...p,
            name: data.user.username,
            email: data.user.email,
            assignedBatch: assignedBatchNames
          } : p));
          setFormSuccess("Member updated successfully!");
        } else {
          setFormError(data.message || "Failed to update member.");
          setEditing(false);
          return;
        }
      } else {
        // Fallback for offline mock mode
        setPeople(prev => prev.map(p => p.id === itemToEdit.id ? {
          ...p,
          name: editName.trim(),
          email: editEmail.trim().toLowerCase()
        } : p));
        setFormSuccess("Member updated successfully (Offline Mock)!");
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

  const getRoleLabel = (role) => {
    if (role === "BATCH_MANAGER") return "batch manager";
    if (role === "MENTOR") return "mentor";
    return "student";
  };

  // Helper to resolve the assigned batches for each member
  const getBatchesForUser = (userId, role, assignedBatchField) => {
    if (assignedBatchField) return assignedBatchField;
    const mockBatches = [
      { name: "Batch-A", managerId: 1, mentorIds: [2, 5], studentIds: [3, 7] },
      { name: "Batch-B", managerId: 4, mentorIds: [5, 6], studentIds: [8, 9] }
    ];
    const matched = [];
    for (const b of mockBatches) {
      if (role === "BATCH_MANAGER" && b.managerId === userId) matched.push(b.name);
      if (role === "MENTOR" && b.mentorIds.includes(userId)) matched.push(b.name);
      if (role === "STUDENT" && b.studentIds.includes(userId)) matched.push(b.name);
    }
    return matched.length > 0 ? matched.join(", ") : "None";
  };

  const filteredPeople = people.filter(p => {
    const matchesTab = 
      activeTab === "managers" ? p.role === "BATCH_MANAGER" :
      activeTab === "mentors" ? p.role === "MENTOR" :
      p.role === "STUDENT";
    
    if (!matchesTab) return false;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      (p.name || "").toLowerCase().includes(query) ||
      (p.email || "").toLowerCase().includes(query) ||
      (p.assignedBatch || "").toLowerCase().includes(query)
    );
  });

  if (!user || (user.role !== "INSTITUTE_ADMIN" && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <div className="space-y-6 p-6 min-h-0 flex flex-col flex-1" style={{ color: "var(--text-primary)" }}>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[var(--bg-badge)] text-[var(--text-accent)] text-[10px] font-extrabold uppercase tracking-wider">
              Institute Directory
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Manage People
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Register and configure accounts for batch managers, mentors, and students within your institute.
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
          <UserPlus size={16} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Search & Tabs Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        {/* Tabs list */}
        <div className="flex gap-2 p-1.5 rounded-2xl w-fit border shrink-0 bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
          <button
            onClick={() => setActiveTab("managers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "managers"
              ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-glow)]"
              : "hover:bg-[var(--bg-primary)]"
              }`}
          >
            <Briefcase size={14} />
            <span>Batch Managers</span>
          </button>
          <button
            onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "mentors"
              ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-glow)]"
              : "hover:bg-[var(--bg-primary)]"
              }`}
          >
            <Award size={14} />
            <span>Mentors</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === "students"
              ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-glow)]"
              : "hover:bg-[var(--bg-primary)]"
              }`}
          >
            <GraduationCap size={14} />
            <span>Students</span>
          </button>
          
        </div>

        {/* Search & Refresh Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {/* Search Input Bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-card)] border rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Refresh Directory Button */}
          <button
            onClick={() => {
              fetchMembers();
              fetchBatches();
            }}
            title="Refresh Directory"
            className="p-2.5 rounded-2xl border bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[var(--text-accent)]" : ""} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-3xl border bg-[var(--bg-card)]" style={{ borderColor: "var(--border-primary)" }}>
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-[var(--text-muted)]">Fetching directory members...</span>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[var(--bg-badge)] flex items-center justify-center text-[var(--text-accent)]">
              <Users size={28} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>No members found</h3>
              <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                No active records matched this role criteria. Add a member to begin populating the list.
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
                  <th className="px-6 py-4">Assigned Batch</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-semibold" style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
                {filteredPeople.map((member) => (
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Layers size={12} className="text-[var(--text-muted)] shrink-0" />
                        <span className="font-extrabold text-[var(--text-secondary)]">
                          {getBatchesForUser(member.id, member.role, member.assignedBatch)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{new Date(member.dateAdded).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => triggerEdit(member)}
                          className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/10"
                        >
                          <Edit size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => triggerDelete(member)}
                          className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors cursor-pointer border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden bg-[var(--bg-card)] flex flex-col max-h-[85vh]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <UserPlus size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Register Member
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleAddMember} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                  <fieldset disabled={submitting} className="space-y-4 border-none p-0 m-0">
                    {formError && (
                      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold animate-shake">
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

                    {/* Name Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Mishra"
                        className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                        style={{ borderColor: "var(--border-primary)" }}
                      />
                    </div>

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rahul@dmx.com"
                        className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                        style={{ borderColor: "var(--border-primary)" }}
                      />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 pr-11 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                          style={{ borderColor: "var(--border-primary)" }}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-3 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 pr-11 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                          style={{ borderColor: confirmPassword && confirmPassword !== password ? "#f43f5e" : "var(--border-primary)" }}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                          className="absolute right-3 top-3 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-[10px] text-rose-500 font-bold">Passwords do not match</p>
                      )}
                    </div>

                    {/* Role Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Role Category
                      </label>
                      <select
                        value={memberRole}
                        onChange={(e) => {
                          setMemberRole(e.target.value);
                          setSelectedBatchIds([]);
                        }}
                        className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all"
                        style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      >
                        <option value="BATCH_MANAGER">Batch Manager</option>
                        <option value="MENTOR">Mentor</option>
                        <option value="STUDENT">Student</option>
                      </select>
                    </div>

                    {/* Cohort (Batch) Assignment */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] block">
                        Cohort (Batch) Assignment
                      </label>
                      <div className="max-h-28 overflow-y-auto p-3 rounded-2xl bg-[var(--bg-primary)] border space-y-2" style={{ borderColor: "var(--border-primary)" }}>
                        {batches.length === 0 ? (
                          <span className="text-[10px] text-[var(--text-muted)] italic">No cohorts found.</span>
                        ) : (
                          batches.map(b => (
                            <label key={b.id} className="flex items-start gap-2 cursor-pointer text-xs font-semibold py-1">
                              <input 
                                type="checkbox"
                                checked={selectedBatchIds.includes(b.id)}
                                onChange={() => {
                                  setSelectedBatchIds(prev => 
                                    prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                                  );
                                }}
                                className="mt-0.5 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span style={{ color: "var(--text-primary)" }}>{b.name}</span>
                                {memberRole === "BATCH_MANAGER" && b.manager && (
                                  <span className="text-[9px] text-amber-500 font-bold leading-none">
                                    (Will remove {b.manager.username} as Batch Manager)
                                  </span>
                                )}
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Actions */}
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
                    className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      "Register Member"
                    )}
                  </button>
                </div>
              </form>
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
                  Are u sure want to delete this {getRoleLabel(itemToDelete?.role)}
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  This action will permanently remove <strong className="font-extrabold" style={{ color: "var(--text-primary)" }}>{itemToDelete?.name}</strong> from the institute database immediately.
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
        {/* Edit Member Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden bg-[var(--bg-card)] flex flex-col max-h-[85vh]"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <Edit size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Edit Member Details
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleEditMember} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                  <fieldset disabled={editing} className="space-y-4 border-none p-0 m-0">
                    {formError && (
                      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold animate-shake">
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

                    {/* Name Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Rahul Mishra"
                        className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                        style={{ borderColor: "var(--border-primary)" }}
                      />
                    </div>

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="e.g. rahul@dmx.com"
                        className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                        style={{ borderColor: "var(--border-primary)" }}
                      />
                    </div>

                    {/* Password Input (Optional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                          Password
                        </label>
                        <span className="text-[9px] text-[var(--text-muted)] italic">
                          Leave blank to keep current
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 pr-11 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                          style={{ borderColor: "var(--border-primary)" }}
                        />
                        <button type="button" onClick={() => setShowEditPassword(v => !v)}
                          className="absolute right-3 top-3 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                          {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Role Badge (Read-Only) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] block">
                        Account Role
                      </label>
                      <span className="inline-block text-[9px] px-2.5 py-1 rounded-lg border uppercase font-extrabold bg-[var(--bg-badge)] text-[var(--text-accent)] border-[var(--border-accent)]/10">
                        {itemToEdit?.role.replace("_", " ")}
                      </span>
                    </div>

                    {/* Cohort (Batch) Assignment */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] block">
                        Cohort (Batch) Assignment
                      </label>
                      <div className="max-h-28 overflow-y-auto p-3 rounded-2xl bg-[var(--bg-primary)] border space-y-2" style={{ borderColor: "var(--border-primary)" }}>
                        {batches.length === 0 ? (
                          <span className="text-[10px] text-[var(--text-muted)] italic">No cohorts found.</span>
                        ) : (
                          batches.map(b => (
                            <label key={b.id} className="flex items-start gap-2 cursor-pointer text-xs font-semibold py-1">
                              <input 
                                type="checkbox"
                                checked={editSelectedBatchIds.includes(b.id)}
                                onChange={() => {
                                  setEditSelectedBatchIds(prev => 
                                    prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                                  );
                                }}
                                className="mt-0.5 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span style={{ color: "var(--text-primary)" }}>{b.name}</span>
                                {itemToEdit?.role === "BATCH_MANAGER" && b.manager && Number(b.managerId) !== Number(itemToEdit.id) && (
                                  <span className="text-[9px] text-amber-500 font-bold leading-none">
                                    (Will remove {b.manager.username} as Batch Manager)
                                  </span>
                                )}
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Actions */}
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
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
