"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, Trophy, LogOut, 
  Menu, X, ChevronLeft, ChevronRight, BookOpen, ArrowLeftRight, Code, Brain, Radio
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export default function StudentLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [studentUser, setStudentUser] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const studentSession = localStorage.getItem("synapse_student_session");
      const mentorSession = localStorage.getItem("synapse_mentor_session");
      const adminSession = localStorage.getItem("synapse_admin_session");
      const hasSession = studentSession || mentorSession || adminSession;
      const isLoginRoute = pathname === "/student";

      if (!hasSession) {
        router.push("/login?redirect=/student/dashboard");
      } else if (isLoginRoute) {
        router.push("/student/dashboard");
      } else {
        if (adminSession) {
          setStudentUser({
            name: "DMX Admin",
            email: "admin@synapse.com",
            role: "Super Admin",
            avatar: "SA"
          });
        } else if (mentorSession) {
          setStudentUser({
            name: "DMX Mentor",
            email: "mentor@synapse.com",
            role: "Senior Mentor",
            avatar: "SM"
          });
        } else {
          setStudentUser({
            name: "DMX Student",
            email: "student@synapse.com",
            role: "Elite Scholar",
            avatar: "SS"
          });
        }
      }
      setCheckingAuth(false);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    logout();
    router.push("/login?redirect=/student/dashboard");
  };

  const isLoginRoute = pathname === "/student";

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

  const sidebarLinks = [
    {
      label: "Dashboard",
      href: "/student/dashboard",
      icon: LayoutDashboard
    },
    {
      label: "Practice Arena",
      href: "/practice",
      icon: Code
    },
    {
      label: "Contest Arena",
      href: "/contest",
      icon: Trophy
    },
    {
      label: "Course Catalog",
      href: "/courses",
      icon: BookOpen
    },
    {
      label: "AI Viva",
      href: "/student/viva",
      icon: Brain
    },
    {
      label: "Live Sessions",
      href: "/live-classes",
      icon: Radio
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Sidebar - Desktop */}
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
              <BookOpen size={18} />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold text-sm tracking-tight text-gradient whitespace-nowrap">
                Student Center
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
          {!isSidebarCollapsed && studentUser ? (
            <div className="p-3 rounded-2xl flex items-center justify-between" style={{ backgroundColor: "var(--bg-primary)" }}>
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm">
                  {studentUser.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{studentUser.name}</p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{studentUser.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                title="Log Out"
                id="student-logout-btn"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-3 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              title="Log Out"
              id="student-logout-btn"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Sidebar - Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-sm">
          <div 
            className="w-72 h-full flex flex-col p-6 animate-slide-right shadow-2xl"
            style={{ backgroundColor: "var(--bg-sidebar)" }}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <BookOpen size={18} />
                </div>
                <span className="font-bold text-sm text-gradient">Student Center</span>
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
                    onClick={() => setIsMobileMenuOpen(false)}
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
              {studentUser && (
                <div className="flex items-center justify-between p-3 rounded-2xl" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-extrabold flex items-center justify-center text-xs">
                      {studentUser.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{studentUser.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{studentUser.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
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
        {/* Header */}
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
              <span>Student</span>
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

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
