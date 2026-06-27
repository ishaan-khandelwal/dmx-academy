"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, User, ShieldAlert, ArrowRight, RefreshCw, AlertCircle, GraduationCap, Users } from "lucide-react";

function LoginForm() {
  const { login, register, user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  // Auth toggle
  const [isRegistering, setIsRegistering] = useState(false);

  // Form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Role Tab Switcher
  const [activeTab, setActiveTab] = useState("STUDENT"); // STUDENT, MENTOR, ADMIN
  const [hasExplicitRole, setHasExplicitRole] = useState(false);

  // State
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Detect and lock active role and pre-populated fields from query params/redirect path
  useEffect(() => {
    const roleParam = searchParams.get("role");
    let targetRole = null;
    if (roleParam) {
      const parsed = roleParam.toUpperCase();
      if (["STUDENT", "MENTOR", "ADMIN"].includes(parsed)) {
        targetRole = parsed;
      }
    } else {
      const path = redirectTo.toLowerCase();
      if (path.includes("admin")) targetRole = "ADMIN";
      else if (path.includes("mentor")) targetRole = "MENTOR";
      else if (path.includes("student")) targetRole = "STUDENT";
    }

    if (targetRole) {
      setActiveTab(targetRole);
      setHasExplicitRole(true);
    } else {
      setHasExplicitRole(false);
    }

    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams, redirectTo]);

  // Mismatch check
  const isMismatched = (() => {
    if (!user || !redirectTo) return false;
    const path = redirectTo.toLowerCase();
    const emailLower = (user.email || "").toLowerCase();
    
    const isUserAdmin = user.role === 'ADMIN' || user.role === 'INSTITUTE_ADMIN' || emailLower.includes('admin');
    const isUserMentor = user.role === 'MENTOR' || emailLower.includes('mentor');

    if (path.startsWith('/admin') && !isUserAdmin && !isUserMentor) return true;
    if (path.startsWith('/mentor') && !isUserMentor) return true;
    // Admins and Mentors are allowed to access student views/desks without mismatch errors
    return false;
  })();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !isMismatched) {
      // Determine correct redirect route if it's default
      let targetRoute = redirectTo;
      if (redirectTo === "/") {
        const emailLower = (user.email || "").toLowerCase();
        const isUserAdmin = user.role === 'ADMIN' || user.role === 'INSTITUTE_ADMIN' || emailLower.includes('admin');
        const isUserMentor = user.role === 'MENTOR' || emailLower.includes('mentor');
        if (isUserAdmin) targetRoute = '/admin/dashboard';
        else if (isUserMentor) targetRoute = '/mentor/dashboard';
        else targetRoute = '/student/dashboard';
      }
      router.replace(targetRoute);
    }
  }, [user, redirectTo, router, isMismatched]);

  if (user && isMismatched) {
    const emailLower = (user.email || "").toLowerCase();
    const isUserAdmin = user.role === 'ADMIN' || user.role === 'INSTITUTE_ADMIN' || emailLower.includes('admin');
    const isUserMentor = user.role === 'MENTOR' || emailLower.includes('mentor');

    const userRoleLabel = isUserMentor 
      ? 'Mentor' 
      : isUserAdmin 
        ? 'Administrator' 
        : 'Student';

    const targetPortalLabel = redirectTo.toLowerCase().startsWith('/admin') 
      ? 'Admin Control' 
      : redirectTo.toLowerCase().startsWith('/mentor') 
        ? 'Mentor Board' 
        : 'Student Desk';

    const getDashboardPath = () => {
      if (isUserMentor) return '/mentor/dashboard';
      if (isUserAdmin) return '/admin/dashboard';
      return '/student/dashboard';
    };

    return (
      <div
        className="glass-panel p-8 rounded-3xl border shadow-xl backdrop-blur-xl space-y-6 text-center w-full max-w-md"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: "var(--border-primary)"
        }}
      >
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md mx-auto"
          style={{ background: "var(--accent-gradient)" }}
        >
          <ShieldAlert size={24} className="animate-pulse" />
        </div>
        <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
          Role Mismatch
        </h1>
        <div className="space-y-4 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          <p>
            You are currently signed in as <span className="font-bold text-[var(--text-primary)]">{user.username}</span> ({user.email}) with the role <span className="font-bold text-[var(--text-primary)]">{userRoleLabel}</span>.
          </p>
          <p className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-left leading-relaxed">
            ⚠️ This account does not have permission to access the <strong>{targetPortalLabel}</strong>. To access this section, you must log out first and sign in with an appropriate account.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push(getDashboardPath())}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center space-x-2 hover:scale-102 cursor-pointer"
            style={{ background: "var(--accent-gradient)" }}
          >
            <span>Go to my {userRoleLabel} Desk</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={() => logout()}
            className="w-full py-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-2 border cursor-pointer"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)"
            }}
          >
            <span>Sign Out & Switch Accounts</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (!email || !password) {
      setErrorMsg("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (isRegistering && !username) {
      setErrorMsg("Username is required.");
      setLoading(false);
      return;
    }

    // Map active tab to registration role parameter
    const submitRole = activeTab === "ADMIN" ? "ADMIN" : activeTab === "MENTOR" ? "MENTOR" : "USER";

    try {
      let result;
      if (isRegistering) {
        result = await register(username, email, password, submitRole);
      } else {
        result = await login(email, password);
      }

      if (result.success) {
        let targetRoute = redirectTo;
        if (redirectTo === "/") {
          const emailLower = (result.user?.email || "").toLowerCase();
          const isUserAdmin = result.user?.role === 'ADMIN' || result.user?.role === 'INSTITUTE_ADMIN' || emailLower.includes('admin');
          const isUserMentor = result.user?.role === 'MENTOR' || emailLower.includes('mentor');
          if (isUserAdmin) targetRoute = '/admin/dashboard';
          else if (isUserMentor) targetRoute = '/mentor/dashboard';
          else targetRoute = '/student/dashboard';
        }

        if (result.offlineMode) {
          setErrorMsg("⚠️ Backend offline. Your account is saved locally only.");
          setTimeout(() => router.replace(targetRoute), 2000);
        } else {
          router.replace(targetRoute);
        }
      } else {
        setErrorMsg(result.message || "An error occurred. Please check your credentials.");
      }
    } catch (err) {
      setErrorMsg("Unable to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  };

  // Aesthetic settings derived dynamically based on the active role tab
  const getRoleTheme = () => {
    switch (activeTab) {
      case "ADMIN":
        return {
          accentColor: "#06b6d4", // Cyan
          accentGradient: "linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)",
          bgBadge: "rgba(6, 182, 212, 0.08)",
          borderAccent: "rgba(6, 182, 212, 0.2)",
          icon: <ShieldAlert size={22} className="text-cyan-400" />,
          title: isRegistering ? "Register Admin Account" : "Admin Control Sign In",
          desc: isRegistering ? "Create your administrative console account" : "Access the DMX systems scheduler and configuration room",
          demoEmail: "admin@demo.com",
          label: "Administrator"
        };
      case "MENTOR":
        return {
          accentColor: "#8b5cf6", // Violet
          accentGradient: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
          bgBadge: "rgba(139, 92, 246, 0.08)",
          borderAccent: "rgba(139, 92, 246, 0.2)",
          icon: <GraduationCap size={22} className="text-violet-400" />,
          title: isRegistering ? "Register Instructor Account" : "Mentor Workspace Sign In",
          desc: isRegistering ? "Join the DMX instructional staff track" : "Access code review desk, office hours, and curriculum editor",
          demoEmail: "mentor@demo.com",
          label: "Mentor"
        };
      default: // STUDENT
        return {
          accentColor: "#10b981", // Emerald
          accentGradient: "linear-gradient(135deg, #10b981 0%, #6366f1 100%)",
          bgBadge: "rgba(16, 185, 129, 0.08)",
          borderAccent: "rgba(16, 185, 129, 0.2)",
          icon: <Sparkles size={22} className="text-emerald-400" />,
          title: isRegistering ? "Create Scholar Account" : "Welcome Back, Coder",
          desc: isRegistering ? "Join the DMX developer learning network" : "Access study desk, practice problems, and speedrun challenges",
          demoEmail: "student@demo.com",
          label: "Student"
        };
    }
  };

  const theme = getRoleTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md space-y-6"
    >
      {/* Role selection tab bar */}
      {!hasExplicitRole && (
        <div className="flex p-1.5 rounded-2xl border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          {["STUDENT", "MENTOR", "ADMIN"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setErrorMsg("");
              }}
              className="flex-1 py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
              style={{
                backgroundColor: activeTab === tab ? "var(--bg-badge)" : "transparent",
                color: activeTab === tab ? "var(--text-accent)" : "var(--text-secondary)"
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Card Container */}
      <div
        className="glass-panel p-8 rounded-3xl border shadow-xl backdrop-blur-xl space-y-6 transition-all duration-500"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: theme.borderAccent
        }}
      >
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-md mx-auto transition-all"
            style={{ background: theme.accentGradient }}
          >
            {theme.icon}
          </div>
          <h1 className="text-xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            {theme.title}
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {theme.desc}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-start space-x-2 p-3.5 rounded-2xl border text-xs font-bold ${
                errorMsg.startsWith("⚠️")
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-500"
              }`}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="whitespace-pre-line">{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-extrabold uppercase tracking-wider pl-1" style={{ color: "var(--text-secondary)" }}>
                  Username
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="coder_name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl py-3 pl-11 pr-4 text-xs outline-none border transition-all"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      borderColor: "var(--border-primary)",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider pl-1" style={{ color: "var(--text-secondary)" }}>
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl py-3 pl-11 pr-4 text-xs outline-none border transition-all"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)"
                }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              {!isRegistering && (
                <button type="button" className="text-[9px] font-bold text-indigo-500 hover:underline">
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl py-3 pl-11 pr-4 text-xs outline-none border transition-all"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)"
                }}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-2xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center space-x-2 hover:scale-102 cursor-pointer disabled:opacity-50"
            style={{ background: theme.accentGradient }}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isRegistering ? `Register ${theme.label}` : `Sign In as ${theme.label}`}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="border-t pt-4 text-center space-y-3" style={{ borderColor: "var(--border-primary)" }}>
          <button
            type="button"
            onClick={() => {
              setErrorMsg("");
              setIsRegistering(!isRegistering);
            }}
            className="text-xs font-bold transition-all text-indigo-500 hover:underline"
          >
            {isRegistering ? "Already have an account? Sign In" : "New to DMX? Register an account"}
          </button>

          {/* Demo credentials hint */}
          <div
            className="p-3 rounded-2xl border text-left space-y-1.5 transition-all"
            style={{
              backgroundColor: theme.bgBadge,
              borderColor: theme.borderAccent
            }}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-accent)" }}>
              Demo {theme.label} Access (Offline Mode)
            </p>
            <div className="text-[10px] space-y-0.5" style={{ color: "var(--text-secondary)" }}>
              <p><span className="font-bold" style={{ color: "var(--text-primary)" }}>Email:</span> {theme.demoEmail}</p>
              <p><span className="font-bold" style={{ color: "var(--text-primary)" }}>Password:</span> demo123</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-indigo-100/30 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />

      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-24 relative z-10 px-4">
        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="animate-spin text-indigo-500" size={32} />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
