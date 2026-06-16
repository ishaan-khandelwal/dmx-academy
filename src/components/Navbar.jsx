"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
            <span style={{ color: "var(--text-primary)" }}>
              Synapse
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
          </ul>

          {/* Right: Theme Toggle + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <motion.a
              href="#pricing"
              whileHover={{ scale: 1.05, boxShadow: "0px 6px 20px var(--accent-glow)" }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all"
              style={{ background: "var(--accent-gradient)" }}
            >
              <span>Enroll Now</span>
              <ArrowRight size={14} />
            </motion.a>
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
              {/* Theme Toggle in mobile too */}
              <li className="pt-2 flex justify-center">
                <ThemeToggle />
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
