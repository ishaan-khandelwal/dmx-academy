"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize: Check local storage for existing session
  useEffect(() => {
    async function loadStoredAuth() {
      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("dmx_auth_token");
        if (storedToken) {
          try {
            const res = await fetch(`${API_BASE}/api/auth/profile`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                setUser(data.user);
                setToken(storedToken);
              } else {
                localStorage.removeItem("dmx_auth_token");
              }
            } else {
              localStorage.removeItem("dmx_auth_token");
            }
          } catch (e) {
            console.error("Failed to verify user profile token:", e);
          }
        }
      }
      setLoading(false);
    }
    loadStoredAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Login failed." };
      }

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("dmx_auth_token", data.token);
        }
        return { success: true };
      }
      return { success: false, message: data.message || "Failed to log in." };
    } catch (e) {
      console.error(e);
      return { success: false, message: "Network connection error." };
    }
  };

  const register = async (username, email, password, role = "USER") => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Registration failed." };
      }

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("dmx_auth_token", data.token);
        }
        return { success: true };
      }
      return { success: false, message: data.message || "Failed to register." };
    } catch (e) {
      console.error(e);
      return { success: false, message: "Network connection error." };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("dmx_auth_token");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, API_BASE }}>
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
