"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, PlusCircle, Trophy, LogOut,
  Menu, X, ChevronLeft, ChevronRight, ShieldAlert, ArrowLeftRight, Code, Radio, AlertTriangle, List
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  const { activeSession, setActiveSession, token, API_BASE, user, logout } = useAuth();
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState(null);

  const handleSafeNavigation = (target) => {
    if (activeSession && target !== "/admin/live") {
      setPendingNavAction({ action: target });
      setShowEndConfirmModal(true);
    } else {
      if (typeof target === "string") {
        router.push(target);
      } else if (typeof target === "function") {
        target();
      }
    }
  };

  const handleConfirmEndSession = async () => {
    setShowEndConfirmModal(false);

    if (activeSession) {
      // Call end session API
      try {
        await fetch(`${API_BASE}/api/livekit/session/${activeSession.id}/end`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Failed to end session:", err);
      }

      setActiveSession(null);
    }

    // Run the pending navigation/logout action
    if (pendingNavAction && pendingNavAction.action) {
      const action = pendingNavAction.action;
      if (typeof action === "string") {
        router.push(action);
      } else if (typeof action === "function") {
        action();
      }
    }
    setPendingNavAction(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("synapse_admin_session") || localStorage.getItem("synapse_mentor_session");
      const isLoginRoute = pathname === "/admin";

      if (!session) {
        router.push("/login?redirect=/admin/dashboard");
      } else if (isLoginRoute) {
        router.push("/admin/dashboard");
      } else {
        const isMentor = localStorage.getItem("synapse_mentor_session") === "true";
        const name = user?.username || (isMentor ? "DMX Mentor" : "DMX Admin");
        const email = user?.email || (isMentor ? "mentor@synapse.com" : "admin@synapse.com");
        const roleName = user?.role === "INSTITUTE_ADMIN"
          ? "Institute Admin"
          : user?.role === "ADMIN"
            ? "Super Admin"
            : isMentor
              ? "Senior Mentor"
              : "Super Admin";
        const avatar = name.slice(0, 2).toUpperCase();

        setAdminUser({
          name,
          email,
          role: roleName,
          avatar
        });
      }
      setCheckingAuth(false);
    }
  }, [pathname, router, user]);

  const handleLogout = () => {
    logout();
    router.push("/login?redirect=/admin/dashboard");
  };

  const isLoginRoute = pathname === "/admin";

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 rounded-full border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--text-accent)" }} />
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // For the login page, render without sidebar/layout frame
  if (isLoginRoute) {
    return <>{children}</>;
  }

  const isSuperAdmin = user?.role === "ADMIN";

  const sidebarLinks = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard
    },
    isSuperAdmin && {
      label: "Institutes & Admins",
      href: "/admin/institutes",
      icon: ShieldAlert
    },
    {
      label: "All Contests",
      href: "/admin/contests",
      icon: Trophy
    },
    {
      label: "Create Contest",
      href: "/admin/contests/new",
      icon: PlusCircle
    },
    {
      label: "All Problems",
      href: "/admin/problems",
      icon: Code
    },
    {
      label: "Go Live",
      href: "/admin/live",
      icon: Radio
    },
    {
      label: "Public Lobby",
      href: "/contest",
      icon: List
    }
  ].filter(Boolean);
  const isLiveImmersive = pathname === "/admin/live" && activeSession;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Sidebar - Desktop */}
      {!isLiveImmersive && (
      <aside
        className={`hidden md:flex flex-col h-full border-r transition-all duration-300 relative z-30`}
        style={{
          width: isSidebarCollapsed ? "80px" : "260px",
          backgroundColor: "var(--bg-sidebar)",
          borderColor: "var(--border-primary)"
        }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <ShieldAlert size={18} />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold text-sm tracking-tight text-gradient whitespace-nowrap">
                DMX Admin
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const LinkIcon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleSafeNavigation(link.href);
                }}
                className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative group cursor-pointer"
                style={{
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--text-accent)" : "transparent"
                }}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl opacity-10 bg-white" />
                )}
                <LinkIcon size={16} className="shrink-0" />
                {!isSidebarCollapsed && (
                  <span>{link.label}</span>
                )}
                {isSidebarCollapsed && (
                  <div className="absolute left-16 bg-slate-950 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                    {link.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute bottom-24 -right-3 p-1.5 rounded-full border shadow-sm transition-all hover:scale-105 z-50 cursor-pointer"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-primary)",
            color: "var(--text-secondary)"
          }}
        >
          {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Sidebar Footer / User Info */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
          {!isSidebarCollapsed && adminUser ? (
            <div className="p-3 rounded-2xl flex items-center justify-between" style={{ backgroundColor: "var(--bg-primary)" }}>
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
                  {adminUser.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{adminUser.name}</p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{adminUser.role}</p>
                </div>
              </div>
              <button
                onClick={() => handleSafeNavigation(() => handleLogout(), true)}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                title="Log Out"
                id="admin-logout-btn"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleSafeNavigation(() => handleLogout(), true)}
              className="w-full flex items-center justify-center p-3 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              title="Log Out"
              id="admin-logout-btn"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
      )}

      {/* Sidebar - Mobile Menu Drawer */}
      {!isLiveImmersive && isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-sm">
          <div
            className="w-72 h-full flex flex-col p-6 animate-slide-right shadow-2xl"
            style={{ backgroundColor: "var(--bg-sidebar)" }}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <ShieldAlert size={18} />
                </div>
                <span className="font-bold text-sm text-gradient">DMX Admin</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-500/10">
                <X size={18} style={{ color: "var(--text-primary)" }} />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {sidebarLinks.map((link) => {
                const LinkIcon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMobileMenuOpen(false);
                      handleSafeNavigation(link.href);
                    }}
                    className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all"
                    style={{
                      color: isActive ? "#ffffff" : "var(--text-secondary)",
                      backgroundColor: isActive ? "var(--text-accent)" : "transparent"
                    }}
                  >
                    <LinkIcon size={16} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-6 border-t" style={{ borderColor: "var(--border-primary)" }}>
              {adminUser && (
                <div className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-extrabold flex items-center justify-center text-xs">
                      {adminUser.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{adminUser.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{adminUser.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSafeNavigation(() => handleLogout(), true)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header — hidden during active live (back button lives on the live page) */}
        {!isLiveImmersive && (
        <header
          className="flex items-center justify-between px-6 py-4 border-b relative z-20"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-primary)"
          }}
        >
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl md:hidden hover:bg-slate-500/10"
              style={{ color: "var(--text-primary)" }}
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              <span>Admin</span>
              <span style={{ color: "var(--text-muted)" }}>/</span>
              <span className="text-[var(--text-primary)] capitalize">
                {pathname.split("/").filter(Boolean).slice(1).join(" / ") || "Dashboard"}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleSafeNavigation("/");
              }}
              className="flex items-center space-x-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-102"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-primary)",
                color: "var(--text-secondary)"
              }}
            >
              <ArrowLeftRight size={12} />
              <span>Go To Public Site</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        )}

        {/* Content Body */}
        <main className={`flex-1 relative ${isLiveImmersive ? "overflow-hidden p-4 flex flex-col" : "overflow-y-auto p-6 md:p-8"}`}>
          <div className={isLiveImmersive ? "flex-1 flex flex-col min-h-0" : "max-w-6xl mx-auto space-y-8"}>
            {children}
          </div>
        </main>
      </div>

      {/* Styled Confirmation Modal for Ending Session */}
      {showEndConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl text-center space-y-6"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-primary)",
              backgroundImage: "linear-gradient(to bottom right, var(--bg-card), rgba(239, 68, 68, 0.05))"
            }}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20 animate-pulse">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                End Active Live Session?
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Navigating away or logging out will immediately end your active live session for all students. Are you sure you want to end the session?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  setShowEndConfirmModal(false);
                  setPendingNavAction(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl border transition-all cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndSession}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-500/20"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
