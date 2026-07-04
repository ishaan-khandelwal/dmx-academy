"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, BookOpen, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function StudentLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLoggedIn = localStorage.getItem("synapse_student_session");
      if (isLoggedIn) {
        router.push("/student/dashboard");
      }
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        localStorage.setItem("synapse_student_session", "true");
        router.push("/student/dashboard");
      } else {
        setError(result.message || "Invalid email or password.");
        setLoading(false);
      }
    } catch (err) {
      setError("Unable to connect to the backend server.");
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail("student@synapse.com");
    setPassword("student123");
    setError("");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/20 via-transparent to-transparent pointer-events-none z-0" />
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{ background: "var(--accent-gradient)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 space-y-2"
        >
          <div 
            className="inline-flex p-3 rounded-2xl border mb-2 shadow-sm"
            style={{
              backgroundColor: "var(--bg-badge)",
              borderColor: "var(--border-accent)",
              color: "var(--text-accent)"
            }}
          >
            <BookOpen size={28} className="animate-pulse" />
          </div>
          <h1 className="text-3xl font-black font-display tracking-tight text-gradient">
            DMX Student Portal
          </h1>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            DMX Academy Learning & Practice Hub
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel p-8 rounded-3xl shadow-xl space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Student Sign In
            </h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Access your study desk, courses, and practice problems
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 p-3 rounded-2xl border text-xs bg-rose-500/10 border-rose-500/20 text-rose-500"
              >
                <span>{error}</span>
              </motion.div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5" style={{ color: "var(--text-muted)" }} />
                <input
                  id="student-email"
                  type="email"
                  placeholder="student@synapse.com"
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

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5" style={{ color: "var(--text-muted)" }} />
                <input
                  id="student-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl py-3 pl-11 pr-11 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-3.5 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="student-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 group mt-2"
              style={{ background: "var(--accent-gradient)" }}
            >
              <span>{loading ? "Logging in..." : "Enter Study Space"}</span>
              {!loading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Quick Fill Helper */}
          <div className="pt-4 border-t text-center space-y-2" style={{ borderColor: "var(--border-primary)" }}>
            <span className="text-[10px] uppercase font-bold" style={{ color: "var(--text-muted)" }}>
              Sandbox Access
            </span>
            <button
              onClick={handleQuickFill}
              className="w-full py-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-accent)"
              }}
            >
              Autofill Student Credentials
            </button>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <button 
            onClick={() => router.push("/")}
            className="text-xs transition-colors hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            ← Back to DMX Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
