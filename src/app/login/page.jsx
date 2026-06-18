"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, User, ShieldAlert, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

function LoginForm() {
  const { login, register, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  // Auth toggle
  const [isRegistering, setIsRegistering] = useState(false);

  // Form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER"); // USER, ADMIN

  // State
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, redirectTo, router]);

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

    try {
      let result;
      if (isRegistering) {
        result = await register(username, email, password, role);
      } else {
        result = await login(email, password);
      }

      if (result.success) {
        router.replace(redirectTo);
      } else {
        setErrorMsg(result.message || "An error occurred. Please check your credentials.");
      }
    } catch (err) {
      setErrorMsg("Unable to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      {/* Card Container */}
      <div
        className="glass-panel p-8 rounded-3xl border shadow-xl backdrop-blur-xl space-y-6"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: "var(--border-primary)"
        }}
      >
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md mx-auto"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            {isRegistering ? "Create your account" : "Welcome Back"}
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {isRegistering ? "Join the DMX developer network" : "Access your workspace and coding speedruns"}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center space-x-2 p-3.5 rounded-2xl border text-xs font-bold bg-rose-500/10 border-rose-500/20 text-rose-500"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
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

          {/* Role Select */}
          <AnimatePresence>
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-extrabold uppercase tracking-wider pl-1" style={{ color: "var(--text-secondary)" }}>
                  Account Role (For Demo Testing)
                </label>
                <div className="relative">
                  <ShieldAlert size={15} className="absolute left-4 top-3.5 text-slate-400" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-2xl py-3 pl-11 pr-4 text-xs outline-none border transition-all appearance-none"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      borderColor: "var(--border-primary)",
                      color: "var(--text-primary)"
                    }}
                  >
                    <option value="USER">Student (USER)</option>
                    <option value="ADMIN">Administrator (ADMIN)</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-2xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center space-x-2 hover:scale-102 cursor-pointer disabled:opacity-50"
            style={{ background: "var(--accent-gradient)" }}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isRegistering ? "Register Account" : "Sign In to Workspace"}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="border-t pt-4 text-center" style={{ borderColor: "var(--border-primary)" }}>
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
