"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, ArrowRight, ChevronDown, User, GraduationCap, ShieldAlert, LogOut, AlertTriangle } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "Tracks", href: "/#tracks" },
  { name: "Curriculum", href: "/#process" },
  { name: "Contests", href: "/contest" },
  { name: "Pricing", href: "/#pricing" },
];

const courseCategories = [
  { name: "Web & Mobile Development", href: "/courses?category=Web%20%26%20Mobile%20Development", desc: "React, Next.js, Node.js, Flutter" },
  { name: "Data & AI", href: "/courses?category=Data%20%26%20AI", desc: "Machine Learning, Generative AI" },
  { name: "Cloud & DevOps", href: "/courses?category=Cloud%20%26%20DevOps", desc: "Docker, AWS, Cybersecurity" },
  { name: "Creative Tech", href: "/courses?category=Creative%20Tech", desc: "Blockchain, Web3, Trending Tech" },
];

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSignInDropdownOpen, setIsSignInDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userEmailLower = (user?.email || "").toLowerCase();
  const isUserAdmin = user?.role === "ADMIN" || user?.role === "INSTITUTE_ADMIN" || user?.role === "BATCH_MANAGER" || userEmailLower.includes("admin");
  const isUserMentor = user?.role === "MENTOR" || user?.role === "BATCH_MANAGER" || userEmailLower.includes("mentor");

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <nav
          className="relative flex items-center justify-between rounded-full border px-6 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-md"
          style={{
            backgroundColor: "var(--glass-bg)",
            borderColor: "var(--border-primary)",
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold font-display tracking-tight group"
            style={{ color: "var(--text-primary)" }}
          >
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-[0_4px_15px_rgba(99,102,241,0.35)]"
              style={{ background: "var(--accent-gradient)" }}
            >
              <Sparkles size={18} />
            </motion.div>
            <span className="text-2xl" style={{ color: "var(--text-primary)" }}>
              DMX Academy
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <ul className="hidden md:flex items-center space-x-1">
            {navItems.map((item, index) => (
              <li key={item.name} className="relative">
                <a
                  href={item.href}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="relative block px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: hoveredIndex === index ? "var(--text-accent)" : "var(--text-secondary)" }}
                >
                  {hoveredIndex === index && (
                    <motion.span
                      layoutId="navHover"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="absolute inset-0 z-0 rounded-full"
                      style={{ backgroundColor: "var(--bg-badge)", border: "1px solid var(--border-accent)" }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </a>
              </li>
            ))}

            {/* Premium Hover Dropdown for Courses */}
            <li
              className="relative"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                className="relative flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors outline-none cursor-pointer"
                style={{ color: isDropdownOpen ? "var(--text-accent)" : "var(--text-secondary)" }}
              >
                <span>Courses</span>
                <motion.span
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown size={14} />
                </motion.span>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl z-50"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border-primary)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
                    }}
                  >
                    {courseCategories.map((cat) => (
                      <a
                        key={cat.name}
                        href={cat.href}
                        className="block rounded-xl px-3 py-2 hover:bg-slate-500/5 transition-all text-left"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                          {cat.name}
                        </div>
                        <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {cat.desc}
                        </div>
                      </a>
                    ))}
                    <div className="border-t my-1" style={{ borderColor: "var(--border-primary)" }} />
                    <Link
                      href="/courses"
                      className="block rounded-xl px-4 py-2 text-xs font-bold text-center transition-all hover:bg-slate-500/10"
                      style={{ color: "var(--text-accent)" }}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      View All Courses &rarr;
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>

            {/* Live Classes Nav Link */}
            <li className="relative">
              <Link
                href="/live-classes"
                onMouseEnter={() => setHoveredIndex("live-classes")}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative block px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: hoveredIndex === "live-classes" ? "var(--text-accent)" : "var(--text-secondary)" }}
              >
                {hoveredIndex === "live-classes" && (
                  <motion.span
                    layoutId="navHover"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="absolute inset-0 z-0 rounded-full"
                    style={{ backgroundColor: "var(--bg-badge)", border: "1px solid var(--border-accent)" }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  Live Classes
                </span>
              </Link>
            </li>
          </ul>

          {/* Right: Theme Toggle + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {/* Auth User Panel / Sign In Dropdown */}
            {user ? (
              <div
                className="relative"
                onMouseEnter={() => setIsSignInDropdownOpen(true)}
                onMouseLeave={() => setIsSignInDropdownOpen(false)}
              >
                <button
                  className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors outline-none cursor-pointer rounded-full border"
                  style={{
                    color: isSignInDropdownOpen ? "var(--text-accent)" : "var(--text-secondary)",
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <User size={14} className="text-[var(--text-accent)]" />
                  <span>{user.username}</span>
                  <motion.span
                    animate={{ rotate: isSignInDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown size={14} />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isSignInDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl z-50 text-left"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-primary)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
                      }}
                    >
                      <div className="px-3 py-2 text-[10px] font-bold border-b select-none mb-1 text-slate-400" style={{ borderColor: "var(--border-primary)" }}>
                        Logged in as: <span className="text-[var(--text-primary)] block font-mono font-medium truncate">{user.email}</span>
                      </div>

                      {isUserAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-500/5 transition-all"
                          onClick={() => setIsSignInDropdownOpen(false)}
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                            <ShieldAlert size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                              Admin Panel
                            </div>
                            <div className="text-[9px] font-medium" style={{ color: "var(--text-secondary)" }}>
                              Create contests & problems
                            </div>
                          </div>
                        </Link>
                      )}

                      {isUserMentor && (
                        <Link
                          href="/mentor"
                          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-500/5 transition-all"
                          onClick={() => setIsSignInDropdownOpen(false)}
                        >
                          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                            <GraduationCap size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                              Mentor Portal
                            </div>
                            <div className="text-[9px] font-medium" style={{ color: "var(--text-secondary)" }}>
                              Review submissions
                            </div>
                          </div>
                        </Link>
                      )}

                      {!isUserAdmin && !isUserMentor && (
                        <Link
                          href="/student/dashboard"
                          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-500/5 transition-all"
                          onClick={() => setIsSignInDropdownOpen(false)}
                        >
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                            <User size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                              Student Desk
                            </div>
                            <div className="text-[9px] font-medium" style={{ color: "var(--text-secondary)" }}>
                              Access study room
                            </div>
                          </div>
                        </Link>
                      )}

                      <div className="border-t my-1" style={{ borderColor: "var(--border-primary)" }} />

                      <button
                        onClick={() => {
                          setIsSignInDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-rose-500/10 text-rose-500 transition-all font-bold text-xs cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Sign In Dropdown */
              <div
                className="relative"
                onMouseEnter={() => setIsSignInDropdownOpen(true)}
                onMouseLeave={() => setIsSignInDropdownOpen(false)}
              >
                <button
                  className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors outline-none cursor-pointer rounded-full border"
                  style={{
                    color: isSignInDropdownOpen ? "var(--text-accent)" : "var(--text-secondary)",
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <span>Sign In</span>
                  <motion.span
                    animate={{ rotate: isSignInDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown size={14} />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isSignInDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl z-50 text-left"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-primary)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
                      }}
                    >
                      <Link
                        href="/login?redirect=/student/dashboard"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-500/5 transition-all"
                        onClick={() => setIsSignInDropdownOpen(false)}
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                          <User size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                            Student Portal
                          </div>
                          <div className="text-[9px] font-medium" style={{ color: "var(--text-secondary)" }}>
                            Access your study desk
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/login?redirect=/mentor"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-500/5 transition-all"
                        onClick={() => setIsSignInDropdownOpen(false)}
                      >
                        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 shrink-0">
                          <GraduationCap size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                            Mentor Board
                          </div>
                          <div className="text-[9px] font-medium" style={{ color: "var(--text-secondary)" }}>
                            Review submissions
                          </div>
                        </div>
                      </Link>

                      <div className="border-t my-1" style={{ borderColor: "var(--border-primary)" }} />

                      <Link
                        href="/login?redirect=/admin"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-500/5 transition-all"
                        onClick={() => setIsSignInDropdownOpen(false)}
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                          <ShieldAlert size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                            Admin Control
                          </div>
                          <div className="text-[9px] font-medium" style={{ color: "var(--text-secondary)" }}>
                            Manage competitions
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {!user && (
              <motion.a
                href="#pricing"
                whileHover={{ scale: 1.05, boxShadow: "0px 6px 20px var(--accent-glow)" }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all shrink-0"
                style={{ background: "var(--accent-gradient)" }}
              >
                <span>Enroll Now</span>
                <ArrowRight size={14} />
              </motion.a>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="block md:hidden rounded-lg p-1 focus:outline-none"
            style={{ color: "var(--text-secondary)" }}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute left-4 right-4 top-24 z-40 overflow-hidden rounded-2xl border p-6 shadow-2xl backdrop-blur-lg md:hidden"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-primary)",
            }}
          >
            <ul className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="block text-base font-semibold transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.name}
                  </a>
                </li>
              ))}

              <li>
                <Link
                  href="/live-classes"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 text-base font-semibold transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span>Live Classes</span>
                </Link>
              </li>

              <li className="border-t my-1" style={{ borderColor: "var(--border-primary)" }} />

              <li className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>
                Curriculums
              </li>

              {courseCategories.map((cat) => (
                <li key={cat.name}>
                  <a
                    href={cat.href}
                    onClick={() => setIsOpen(false)}
                    className="block text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/courses"
                  onClick={() => setIsOpen(false)}
                  className="block text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                  style={{ color: "var(--text-accent)" }}
                >
                  View Course Catalog &rarr;
                </Link>
              </li>

              <li className="border-t my-1" style={{ borderColor: "var(--border-primary)" }} />

              {user ? (
                <>
                  <li className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>
                    Hello, {user.username}
                  </li>
                  {isUserAdmin && (
                    <li>
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <ShieldAlert size={14} className="text-emerald-500" />
                        <span>Admin Control</span>
                      </Link>
                    </li>
                  )}
                  {isUserMentor && (
                    <li>
                      <Link
                        href="/mentor"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <GraduationCap size={14} className="text-violet-500" />
                        <span>Mentor Board</span>
                      </Link>
                    </li>
                  )}
                  {!isUserAdmin && !isUserMentor && (
                    <li>
                      <Link
                        href="/student/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <User size={14} className="text-indigo-500" />
                        <span>Student Portal</span>
                      </Link>
                    </li>
                  )}
                  <li className="pt-2">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 font-semibold text-rose-500 border border-rose-500/20 bg-rose-500/5 cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: "var(--text-muted)" }}>
                    Sign In Portals
                  </li>
                  <li>
                    <Link
                      href="/login?redirect=/student/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <User size={14} className="text-indigo-500" />
                      <span>Student Portal</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login?redirect=/mentor"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <GraduationCap size={14} className="text-violet-500" />
                      <span>Mentor Board</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login?redirect=/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 text-sm font-bold pl-2 transition-colors hover:text-[var(--text-accent)]"
                      style={{ color: "var(--text-accent)" }}
                    >
                      <ShieldAlert size={14} className="text-emerald-500" />
                      <span>Admin Control</span>
                    </Link>
                  </li>
                </>
              )}

              {!user && (
                <li className="pt-2 border-t" style={{ borderColor: "var(--border-primary)" }}>
                  <a
                    href="#pricing"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl py-3 font-semibold text-white shadow-lg"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    <span>Enroll Now</span>
                    <ArrowRight size={16} />
                  </a>
                </li>
              )}
              {/* Theme Toggle in mobile too */}
              <li className="pt-2 flex justify-center">
                <ThemeToggle />
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
              className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl text-center space-y-5"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-primary)"
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertTriangle size={24} />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">
                  Are u sure want to logout
                </h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  You will need to sign back in to access your DMX account.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all hover:bg-[var(--bg-primary)] cursor-pointer text-[var(--text-secondary)]"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                    router.push("/");
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
