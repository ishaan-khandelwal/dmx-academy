"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { getApiBase } from "@/utils/api";

const AuthContext = createContext(null);

const API_BASE = getApiBase();

// ---------------------------------------------------------------------------
// Helper: format Zod/backend errors into a readable string
// ---------------------------------------------------------------------------
function formatBackendError(data) {
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map(e => `• ${e.field ? e.field + ": " : ""}${e.message}`).join("\n");
  }
  return data.message || "An error occurred.";
}

// ---------------------------------------------------------------------------
// Local account store — used when the DB is unreachable
// Accounts are stored in localStorage under "dmx_local_accounts"
// ---------------------------------------------------------------------------
function getLocalAccounts() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("dmx_local_accounts") || "[]");
  } catch {
    return [];
  }
}

function saveLocalAccount(email, password, user) {
  const accounts = getLocalAccounts();
  // Remove any existing account with same email
  const filtered = accounts.filter(a => a.email !== email);
  filtered.push({ email, password, user });
  localStorage.setItem("dmx_local_accounts", JSON.stringify(filtered));
}

function findLocalAccount(email, password) {
  const accounts = getLocalAccounts();
  return accounts.find(a => a.email === email && a.password === password) || null;
}

// ---------------------------------------------------------------------------
// Built-in demo accounts (always available, no backend needed)
// ---------------------------------------------------------------------------
const DEMO_ACCOUNTS = [
  { email: "admin@demo.com",   password: "demo123", user: { id: "demo-1", username: "Admin",   email: "admin@demo.com",   role: "ADMIN" } },
  { email: "student@demo.com", password: "demo123", user: { id: "demo-2", username: "Student", email: "student@demo.com", role: "USER"  } },
  { email: "mentor@demo.com",  password: "demo123", user: { id: "demo-3", username: "Mentor",  email: "mentor@demo.com",  role: "MENTOR" } },
];

// ---------------------------------------------------------------------------
// Legacy session keys (used by other pages to detect role)
// ---------------------------------------------------------------------------
function setLegacySession(user) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("synapse_admin_session");
  localStorage.removeItem("synapse_student_session");
  localStorage.removeItem("synapse_mentor_session");
  if (!user) return;

  const role = user.role;
  const email = user.email || "";
  const emailLower = email.toLowerCase();

  if (role === "ADMIN" || role === "INSTITUTE_ADMIN" || emailLower.includes("admin")) {
    localStorage.setItem("synapse_admin_session", "true");
  } else if (role === "MENTOR" || emailLower.includes("mentor")) {
    localStorage.setItem("synapse_admin_session", "true");
    localStorage.setItem("synapse_mentor_session", "true");
  } else {
    localStorage.setItem("synapse_student_session", "true");
  }
}

function clearLegacySessions() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("synapse_admin_session");
  localStorage.removeItem("synapse_student_session");
  localStorage.removeItem("synapse_mentor_session");
}

// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);

  // Sync / check active session for host
  useEffect(() => {
    async function checkActiveSession() {
      if (!token || !user) {
        setActiveSession(null);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/livekit/session/active`);
        const data = await res.json();
        if (data.success && data.session && data.session.hostId === user?.id) {
          setActiveSession(data.session);
        } else {
          setActiveSession(null);
        }
      } catch (e) {
        console.error("AuthContext: failed to check active session:", e);
      }
    }
    checkActiveSession();
  }, [token, user]);

  // On mount: restore session from localStorage
  useEffect(() => {
    async function loadStoredAuth() {
      if (typeof window === "undefined") { setLoading(false); return; }

      const storedToken = localStorage.getItem("dmx_auth_token");
      const storedUser  = localStorage.getItem("dmx_auth_user");

      if (storedToken && storedUser) {
        // Only verify with the real backend if this is a real JWT (not demo/local)
        if (!storedToken.startsWith("demo-token-") && !storedToken.startsWith("local-token-")) {
          try {
            const res = await fetch(`${API_BASE}/api/auth/profile`, {
              headers: { Authorization: `Bearer ${storedToken}` },
              signal: AbortSignal.timeout(30000),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                setUser(data.user);
                setToken(storedToken);
                setLegacySession(data.user);
                setLoading(false);
                return;
              }
            }
          } catch {
            // DB/backend offline — fall through and restore from storage
          }
        }

        // Restore from stored user object (works for demo + local + offline)
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          setLegacySession(parsedUser);
        } catch {
          localStorage.removeItem("dmx_auth_token");
          localStorage.removeItem("dmx_auth_user");
        }
      }

      setLoading(false);
    }
    loadStoredAuth();
  }, []);

  // ---------------------------------------------------------------------------
  const login = async (email, password) => {
    // 1. Try real backend
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(30000),
        });

      const data = await res.json();

      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        setLegacySession(data.user);
        localStorage.setItem("dmx_auth_token", data.token);
        localStorage.setItem("dmx_auth_user", JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      // If it's a 4xx (bad credentials, wrong password, etc.) — report immediately
      if (res.status >= 400 && res.status < 500) {
        return { success: false, message: formatBackendError(data) };
      }
      // 5xx / 503 → DB down, fall through to offline checks
    } catch {
      // Network timeout — fall through
    }

    // 2. Check locally registered accounts (offline registrations)
    const localAccount = findLocalAccount(email, password);
    if (localAccount) {
      const localToken = `local-token-${Date.now()}`;
      setToken(localToken);
      setUser(localAccount.user);
      setLegacySession(localAccount.user);
      localStorage.setItem("dmx_auth_token", localToken);
      localStorage.setItem("dmx_auth_user", JSON.stringify(localAccount.user));
      return { success: true, user: localAccount.user };
    }

    // 3. Check built-in demo accounts
    const demo = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (demo) {
      const demoToken = `demo-token-${Date.now()}`;
      setToken(demoToken);
      setUser(demo.user);
      setLegacySession(demo.user);
      localStorage.setItem("dmx_auth_token", demoToken);
      localStorage.setItem("dmx_auth_user", JSON.stringify(demo.user));
      return { success: true, user: demo.user };
    }

    return {
      success: false,
      message: "Invalid credentials.\n\nIf you registered while the database was offline, your account exists locally — try logging in again with the same email and password you used.\n\nOr use a demo account:\n• admin@demo.com / demo123\n• student@demo.com / demo123",
    };
  };

  // ---------------------------------------------------------------------------
  const register = async (username, email, password, role = "USER") => {
    // 1. Try real backend
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        setLegacySession(data.user);
        localStorage.setItem("dmx_auth_token", data.token);
        localStorage.setItem("dmx_auth_user", JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      // 4xx — validation or duplicate error, report immediately
      if (res.status >= 400 && res.status < 500) {
        return { success: false, message: formatBackendError(data) };
      }
      // 5xx / 503 → DB down, fall through to offline registration
    } catch {
      // Network/timeout — fall through to offline
    }

    // 2. Offline registration — save locally so login works later
    // Check if email is already taken locally
    const existing = findLocalAccount(email, password) ||
      getLocalAccounts().find(a => a.email === email);
    if (existing) {
      return { success: false, message: "An account with this email already exists locally." };
    }

    const newUser = { id: `local-${Date.now()}`, username, email, role };
    saveLocalAccount(email, password, newUser); // Save for future logins

    const localToken = `local-token-${Date.now()}`;
    setToken(localToken);
    setUser(newUser);
    setLegacySession(newUser);
    localStorage.setItem("dmx_auth_token", localToken);
    localStorage.setItem("dmx_auth_user", JSON.stringify(newUser));
    return { success: true, offlineMode: true, user: newUser };
  };

  // ---------------------------------------------------------------------------
  const logout = () => {
    setUser(null);
    setToken(null);
    clearLegacySessions();
    localStorage.removeItem("dmx_auth_token");
    localStorage.removeItem("dmx_auth_user");
    // Note: dmx_local_accounts is intentionally kept so users can log back in
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, API_BASE, activeSession, setActiveSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
