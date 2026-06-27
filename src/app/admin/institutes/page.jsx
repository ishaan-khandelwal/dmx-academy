"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Plus, Users, School, Mail, Key, UserPlus, 
  X, CheckCircle2, AlertCircle, Calendar, ShieldCheck 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function InstitutesPage() {
  const router = useRouter();
  const { token, API_BASE, user } = useAuth();
  
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Modal & form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instituteName, setInstituteName] = useState("");
  
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Redirect if not super admin
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  const fetchAdmins = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
      };

      const res = await fetch(`${API_BASE}/api/auth/institute-admins`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setAdmins(data.admins);
      } else {
        setErrorMsg(data.message || "Failed to fetch institute admins.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      fetchAdmins();
    }
  }, [user, token, API_BASE]);

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");
    setModalLoading(true);

    try {
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
      };

      const res = await fetch(`${API_BASE}/api/auth/institute-admin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ username, email, password, instituteName }),
      });
      const data = await res.json();

      if (data.success) {
        setModalSuccess(data.message || "Institute Admin added successfully.");
        setUsername("");
        setEmail("");
        setPassword("");
        setInstituteName("");
        // Reload table
        fetchAdmins();
        // Close modal after delay
        setTimeout(() => {
          setIsModalOpen(false);
          setModalSuccess("");
        }, 1500);
      } else {
        setModalError(data.message || "Failed to add Institute Admin.");
      }
    } catch (err) {
      setModalError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (admin) => {
    setAdminToDelete(admin);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    setDeleteLoading(true);
    try {
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
      };

      const res = await fetch(`${API_BASE}/api/auth/institute-admin/${adminToDelete.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id));
        setDeleteModalOpen(false);
        setAdminToDelete(null);
      } else {
        alert(data.message || "Failed to delete institute admin.");
      }
    } catch (err) {
      alert("Failed to connect to server.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user || user.role !== "ADMIN") {
    return null; // Prevents render flash while redirecting
  }

  return (
    <div className="space-y-6 p-6 min-h-0 flex flex-col flex-1" style={{ color: "var(--text-primary)" }}>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[var(--bg-badge)] text-[var(--text-accent)] text-[10px] font-extrabold uppercase tracking-wider">
              Control Panel
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            Institutes & Admins
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Register new institute-specific admins and track their active platforms.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError("");
            setModalSuccess("");
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-[var(--accent-glow)] border border-transparent shrink-0"
        >
          <Plus size={16} />
          <span>Add Institute Admin</span>
        </button>
      </div>

      {/* Main Table view */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-3xl border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-3 rounded-full border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--text-accent)" }} />
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Loading records...</p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-3">
            <AlertCircle size={32} className="text-rose-500" />
            <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
            <button
              onClick={fetchAdmins}
              className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ borderColor: "var(--border-primary)" }}
            >
              Retry
            </button>
          </div>
        ) : admins.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[var(--bg-badge)] flex items-center justify-center" style={{ color: "var(--text-accent)" }}>
              <School size={28} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>No Institute Admins</h3>
              <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
                Add your first Institute Admin to begin segmenting academic platforms.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto min-w-0">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b text-[10px] font-extrabold uppercase tracking-wider select-none" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Institute</th>
                  <th className="px-6 py-4">Role Permission</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-semibold" style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-[var(--bg-primary)]/50 transition-colors">
                    <td className="px-6 py-4 font-black">{adm.username}</td>
                    <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>{adm.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <School size={14} className="text-[var(--text-accent)] shrink-0" />
                        <span className="font-extrabold">{adm.institute?.name || "Global"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {adm.role === "INSTITUTE_ADMIN" ? "INSTITUTE ADMIN" : adm.role}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: "var(--text-muted)" }}>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{new Date(adm.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteClick(adm)}
                        className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors cursor-pointer border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[var(--bg-badge)] text-[var(--text-accent)]">
                    <UserPlus size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    Add Institute Admin
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
                {modalError && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}
                {modalSuccess && (
                  <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{modalSuccess}</span>
                  </div>
                )}

                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. iitd_admin"
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)" }}
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@iitd.ac.in"
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)" }}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Secure Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)" }}
                    />
                  </div>
                </div>

                {/* Institute Name Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Institute Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      placeholder="e.g. IIT Delhi"
                      className="w-full bg-[var(--bg-primary)] border rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[var(--border-accent)] transition-all placeholder:text-[var(--text-muted)]"
                      style={{ borderColor: "var(--border-primary)" }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                  >
                    {modalLoading ? "Creating..." : "Create Admin"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden p-6 text-center space-y-4"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">
                  Are u sure want to delete this instiute admin
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  This action is permanent and will revoke all access for username <strong className="font-extrabold" style={{ color: "var(--text-primary)" }}>{adminToDelete?.username}</strong> immediately.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
