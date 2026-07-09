"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2, Plus, Trash2, Edit3, CheckCircle2, XCircle,
  RefreshCw, ChevronDown, ChevronUp, Save, X, AlertCircle,
  BookOpen, Code, Terminal, Layers, Search
} from "lucide-react";

// ─── Storage helpers ────────────────────────────────────────────────────────────
const STORAGE_KEY = "arcade_custom_questions";

function loadCustom() {
  if (typeof window === "undefined") return { quiz: [], match: [], debug: [], fillin: [] };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { quiz: [], match: [], debug: [], fillin: [] };
  } catch {
    return { quiz: [], match: [], debug: [], fillin: [] };
  }
}

function saveCustom(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Game type config ─────────────────────────────────────────────────────────
const GAME_TYPES = [
  {
    key: "quiz",
    label: "Quiz Blitz",
    icon: BookOpen,
    color: "indigo",
    accent: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    description: "Multiple-choice timed questions with explanations",
    tracks: ["JavaScript", "React.js", "Node.js", "MongoDB"],
  },
  {
    key: "match",
    label: "Code Match",
    icon: Layers,
    color: "emerald",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    description: "Term-to-definition memory flip card pairs",
    tracks: ["JavaScript", "React.js", "Node.js", "MongoDB"],
  },
  {
    key: "debug",
    label: "Debug the Bug",
    icon: Terminal,
    color: "amber",
    accent: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    description: "Write code to fix logic or syntax errors in an interactive workspace IDE",
    tracks: ["JavaScript", "React.js", "Node.js", "MongoDB", "Python", "SQL"],
  },
  {
    key: "fillin",
    label: "Code Fill-In",
    icon: Code,
    color: "violet",
    accent: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    description: "Fill the blank in a code snippet from 4 options",
    langs: ["Python", "JavaScript", "SQL"],
  },
];

// ─── Empty form templates ─────────────────────────────────────────────────────
const EMPTY_FORMS = {
  quiz: {
    track: "JavaScript",
    question: "",
    code: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    explanation: "",
    time_limit: 20,
    level: 1,
  },
  match: {
    track: "JavaScript",
    term: "",
    definition: "",
    level: 1,
  },
  debug: {
    track: "JavaScript",
    title: "",
    code: "",
    buggy_lines: [{ line_number: "", line_content: "" }],
    explanation: "",
    level: 1,
  },
  fillin: {
    lang: "Python",
    title: "",
    code: "",
    hint: "",
    level: 1,
    // blanks is the multi-blank array: [{ placeholder, option_a..d, answer }]
    blanks: [
      { placeholder: "____", option_a: "", option_b: "", option_c: "", option_d: "", answer: "" }
    ],
  },
};

// ─── Sub-forms per game type ──────────────────────────────────────────────────
function QuizForm({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Track *</label>
          <select value={form.track} onChange={e => onChange("track", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none transition-all cursor-pointer"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
            {["JavaScript", "React.js", "Node.js", "MongoDB"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Time Limit (sec)</label>
          <input type="number" min={10} max={60} value={form.time_limit} onChange={e => onChange("time_limit", Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Level *</label>
          <input type="number" min={1} value={form.level} onChange={e => onChange("level", e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Question *</label>
        <textarea rows={2} value={form.question} onChange={e => onChange("question", e.target.value)} placeholder="What does this code output?"
          className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Code Snippet (optional)</label>
        <textarea rows={3} value={form.code} onChange={e => onChange("code", e.target.value)} placeholder="console.log(typeof null);"
          className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["A", "B", "C", "D"].map(opt => (
          <div key={opt}>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
              Option {opt} {form.correct_option === opt && <span className="text-emerald-400 ml-1">✓ Correct</span>}
            </label>
            <input type="text" value={form[`option_${opt.toLowerCase()}`]}
              onChange={e => onChange(`option_${opt.toLowerCase()}`, e.target.value)}
              placeholder={`Option ${opt}...`}
              className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
              style={{ backgroundColor: "var(--bg-primary)", borderColor: form.correct_option === opt ? "rgb(52 211 153 / 0.4)" : "var(--border-primary)", color: "var(--text-primary)" }} />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Correct Answer *</label>
        <div className="flex gap-2">
          {["A", "B", "C", "D"].map(opt => (
            <button key={opt} type="button" onClick={() => onChange("correct_option", opt)}
              className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${form.correct_option === opt ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "border-white/10 text-white/40 hover:text-white/70"}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Explanation *</label>
        <textarea rows={2} value={form.explanation} onChange={e => onChange("explanation", e.target.value)} placeholder="Why is this the correct answer?"
          className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>
    </div>
  );
}

function MatchForm({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Track *</label>
          <select value={form.track} onChange={e => onChange("track", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none cursor-pointer"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
            {["JavaScript", "React.js", "Node.js", "MongoDB"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Level *</label>
          <input type="number" min={1} value={form.level} onChange={e => onChange("level", e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Term *</label>
        <input type="text" value={form.term} onChange={e => onChange("term", e.target.value)} placeholder="e.g. Closure"
          className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Definition *</label>
        <textarea rows={3} value={form.definition} onChange={e => onChange("definition", e.target.value)} placeholder="A function that retains access to its outer lexical scope..."
          className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>
    </div>
  );
}

function DebugForm({ form, onChange }) {
  const buggyLines = form.buggy_lines || [{ line_number: "", line_content: "" }];

  function updateBugLine(idx, field, value) {
    const updated = buggyLines.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    onChange("buggy_lines", updated);
  }

  function addBugLine() {
    onChange("buggy_lines", [...buggyLines, { line_number: "", line_content: "" }]);
  }

  function removeBugLine(idx) {
    if (buggyLines.length <= 1) return;
    onChange("buggy_lines", buggyLines.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Track *</label>
          <select value={form.track} onChange={e => onChange("track", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none cursor-pointer"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
            {["JavaScript", "React.js", "Node.js", "MongoDB"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Title *</label>
          <input type="text" value={form.title} onChange={e => onChange("title", e.target.value)} placeholder="Off-by-one Loop Error"
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Level *</label>
          <input type="number" min={1} value={form.level} onChange={e => onChange("level", e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
          Code Snippet * <span className="normal-case text-white/30">(paste the full snippet including the bug)</span>
        </label>
        <textarea rows={6} value={form.code} onChange={e => onChange("code", e.target.value)}
          placeholder={"function avg(arr) {\n  let total = 0;\n  for (let i = 0; i <= arr.length; i++) {\n    total += arr[i];\n  }\n  return total / arr.length;\n}"}
          className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>

      {/* Buggy lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Buggy Lines ({buggyLines.length})
          </label>
          {buggyLines.length < 6 && (
            <button type="button" onClick={addBugLine}
              className="text-[10px] font-bold px-3 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer">
              + Add Bug
            </button>
          )}
        </div>

        {buggyLines.map((bug, bi) => (
          <div key={bi} className="flex items-center gap-3 p-3 rounded-2xl border"
            style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" }}>
            <div className="shrink-0">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Line #</label>
              <input type="number" min={1} value={bug.line_number}
                onChange={e => updateBugLine(bi, "line_number", Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none text-center"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Line Content (optional)</label>
              <input type="text" value={bug.line_content}
                onChange={e => updateBugLine(bi, "line_content", e.target.value)}
                placeholder={`Content of line ${bi + 1}...`}
                className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
            </div>
            {buggyLines.length > 1 && (
              <button type="button" onClick={() => removeBugLine(bi)}
                className="shrink-0 text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer transition-colors mt-4">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Explanation *</label>
        <textarea rows={2} value={form.explanation} onChange={e => onChange("explanation", e.target.value)} placeholder="The condition i <= arr.length goes out of bounds..."
          className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>
    </div>
  );
}

function FillinForm({ form, onChange }) {
  // form.blanks = [{ placeholder, option_a, option_b, option_c, option_d, answer }]
  const blanks = form.blanks || [{ placeholder: "____", option_a: "", option_b: "", option_c: "", option_d: "", answer: "" }];

  function updateBlank(idx, field, value) {
    const updated = blanks.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    onChange("blanks", updated);
  }

  function addBlank() {
    const num = blanks.length + 1;
    const placeholder = `${'_'.repeat(4)}${num}`;
    onChange("blanks", [...blanks, { placeholder, option_a: "", option_b: "", option_c: "", option_d: "", answer: "" }]);
  }

  function removeBlank(idx) {
    if (blanks.length <= 1) return;
    onChange("blanks", blanks.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Language *</label>
          <select value={form.lang} onChange={e => onChange("lang", e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none cursor-pointer"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}>
            {["Python", "JavaScript", "SQL"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Title *</label>
          <input type="text" value={form.title} onChange={e => onChange("title", e.target.value)} placeholder="Prime Checker"
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Level *</label>
          <input type="number" min={1} value={form.level} onChange={e => onChange("level", e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
          Code with Blanks *
          <span className="normal-case text-white/30 ml-1">
            Use <code className="bg-white/10 px-1 rounded">____</code> for blank 1,
            <code className="bg-white/10 px-1 rounded mx-1">____2</code> for blank 2,
            <code className="bg-white/10 px-1 rounded">____3</code> for blank 3, etc.
          </span>
        </label>
        <textarea rows={5} value={form.code} onChange={e => onChange("code", e.target.value)}
          placeholder={"def prime(n):\n  for i in ____(2, int(n**0.5)+1):\n    if n % ____2 == 0:\n      return False\n  return True"}
          className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>

      {/* ── Per-blank configuration ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Blanks ({blanks.length})
          </label>
          {blanks.length < 5 && (
            <button type="button" onClick={addBlank}
              className="text-[10px] font-bold px-3 py-1 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all cursor-pointer">
              + Add Blank
            </button>
          )}
        </div>

        {blanks.map((blank, bi) => (
          <div key={bi} className="p-4 rounded-2xl border space-y-3"
            style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-400">
                Blank {bi + 1} — placeholder: <code className="bg-violet-500/10 px-1 rounded">{blank.placeholder}</code>
              </span>
              {blanks.length > 1 && (
                <button type="button" onClick={() => removeBlank(bi)}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer transition-colors">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {["a", "b", "c", "d"].map((opt, oi) => (
                <div key={opt}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                    Option {opt.toUpperCase()}
                    {blank.answer === blank[`option_${opt}`] && blank.answer && <span className="text-emerald-400 ml-1">✓</span>}
                  </label>
                  <input type="text" value={blank[`option_${opt}`]}
                    onChange={e => updateBlank(bi, `option_${opt}`, e.target.value)}
                    placeholder={["range", "len", "list", "iter"][oi]}
                    className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: blank.answer === blank[`option_${opt}`] && blank.answer ? "rgb(52 211 153 / 0.4)" : "var(--border-primary)", color: "var(--text-primary)" }} />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Correct Answer for Blank {bi + 1} * <span className="normal-case text-white/30">(must match an option exactly)</span>
              </label>
              <input type="text" value={blank.answer}
                onChange={e => updateBlank(bi, "answer", e.target.value)}
                placeholder="range"
                className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Hint *</label>
        <textarea rows={2} value={form.hint} onChange={e => onChange("hint", e.target.value)} placeholder="Use range() to iterate and i to check divisibility..."
          className="w-full px-3 py-2 rounded-xl border text-sm font-medium outline-none resize-none"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }} />
      </div>
    </div>
  );
}

// ─── Validate form before save ────────────────────────────────────────────────
function validateForm(type, form) {
  if (type === "quiz") {
    if (!form.question.trim()) return "Question is required";
    if (!form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim() || !form.option_d.trim()) return "All 4 options are required";
    if (!form.explanation.trim()) return "Explanation is required";
  }
  if (type === "match") {
    if (!form.term.trim()) return "Term is required";
    if (!form.definition.trim()) return "Definition is required";
  }
  if (type === "debug") {
    if (!form.title.trim()) return "Title is required";
    if (!form.code.trim()) return "Code snippet is required";
    if (!form.explanation.trim()) return "Explanation is required";
    const bugs = form.buggy_lines || [];
    if (bugs.length === 0) return "At least one buggy line is required";
    for (let i = 0; i < bugs.length; i++) {
      if (!bugs[i].line_number || bugs[i].line_number < 1) return `Bug ${i + 1}: valid line number is required`;
    }
  }
  if (type === "fillin") {
    if (!form.title.trim()) return "Title is required";
    const blanks = form.blanks || [];
    if (blanks.length === 0) return "At least one blank is required";
    if (!form.code.trim()) return "Code snippet is required";
    for (let i = 0; i < blanks.length; i++) {
      const b = blanks[i];
      const opts = [b.option_a, b.option_b, b.option_c, b.option_d];
      if (!form.code.includes(b.placeholder)) return `Blank ${i + 1}: placeholder "${b.placeholder}" not found in code`;
      if (opts.some(o => !o?.trim())) return `Blank ${i + 1}: all 4 options are required`;
      if (!b.answer?.trim()) return `Blank ${i + 1}: correct answer is required`;
      if (!opts.includes(b.answer)) return `Blank ${i + 1}: answer must match one option exactly`;
    }
  }
  if (form.level && (isNaN(form.level) || Number(form.level) < 1)) {
    return "Level must be a valid positive number";
  }
  return null;
}

// ─── Question card display ─────────────────────────────────────────────────────
function QuestionCard({ q, type, onEdit, onDelete }) {
  const preview = {
    quiz: `[Lvl ${q.level || 1}] ${q.track} • ${q.question?.slice(0, 80)}${q.question?.length > 80 ? "…" : ""}`,
    match: `[Lvl ${q.level || 1}] ${q.track} • ${q.term} → ${q.definition?.slice(0, 60)}${q.definition?.length > 60 ? "…" : ""}`,
    debug: `[Lvl ${q.level || 1}] ${q.track} • ${q.title} (${(q.buggy_lines?.length || 1)} bug${(q.buggy_lines?.length || 1) > 1 ? 's' : ''} on line${(q.buggy_lines?.length || 1) > 1 ? 's' : ''} ${(q.buggy_lines || [{line_number: q.buggy_line_number}]).map(b => b.line_number).join(', ')})`,
    fillin: `[Lvl ${q.level || 1}] ${q.lang} • ${q.title} — ${q.blanks?.length || 1} blank${(q.blanks?.length || 1) > 1 ? "s" : ""}`,
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex items-start justify-between gap-4 p-4 rounded-2xl border group transition-all hover:border-white/20"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
    >
      <p className="text-xs text-white/60 font-mono flex-1 leading-relaxed">{preview}</p>
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(q)} title="Edit"
          className="p-1.5 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}>
          <Edit3 size={13} />
        </button>
        <button onClick={() => onDelete(q.id)} title="Delete"
          className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}>
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ArcadeQuestionsPage() {
  const [customData, setCustomData] = useState({ quiz: [], match: [], debug: [], fillin: [] });
  const [activeType, setActiveType] = useState("quiz");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORMS.quiz });
  const [formError, setFormError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    setCustomData(loadCustom());
  }, []);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORMS[activeType] });
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (q) => {
    setEditingId(q.id);
    const f = { ...EMPTY_FORMS[activeType] };
    // Map stored fillin options array back to form fields
    if (activeType === "fillin" && q.options) {
      setForm({
        ...f, ...q,
        option_a: q.options[0] || "",
        option_b: q.options[1] || "",
        option_c: q.options[2] || "",
        option_d: q.options[3] || "",
      });
    } else {
      setForm({ ...f, ...q });
    }
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleSave = () => {
    const err = validateForm(activeType, form);
    if (err) { setFormError(err); return; }

    const updated = loadCustom();
    let entry = {
      ...form,
      level: Number(form.level) || 1
    };

    // Normalize fillin: store options as array + lang info
    if (activeType === "fillin") {
      entry = {
        ...entry,
        options: [form.option_a, form.option_b, form.option_c, form.option_d],
        blank: "____",
      };
      delete entry.option_a; delete entry.option_b;
      delete entry.option_c; delete entry.option_d;
    }

    if (editingId) {
      updated[activeType] = updated[activeType].map(q => q.id === editingId ? { ...q, ...entry, id: editingId } : q);
      notify("Question updated successfully.");
    } else {
      entry.id = genId(activeType === "quiz" ? "custom_q" : activeType === "match" ? "custom_m" : activeType === "debug" ? "custom_d" : "custom_f");
      updated[activeType] = [...updated[activeType], entry];
      notify("Question added to the pool!");
    }

    saveCustom(updated);
    setCustomData(updated);
    closeForm();
  };

  const handleDelete = (id) => {
    const updated = loadCustom();
    updated[activeType] = updated[activeType].filter(q => q.id !== id);
    saveCustom(updated);
    setCustomData(updated);
    setDeleteConfirm(null);
    notify("Question removed.", "error");
  };

  const activeGameType = GAME_TYPES.find(g => g.key === activeType);
  const allItems = customData[activeType] || [];
  const filtered = search.trim()
    ? allItems.filter(q => JSON.stringify(q).toLowerCase().includes(search.toLowerCase()))
    : allItems;

  const totalAll = GAME_TYPES.reduce((sum, g) => sum + (customData[g.key]?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* ── Notification toast ─────────────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${
              notification.type === "error"
                ? "bg-rose-950/90 border-rose-500/30 text-rose-300"
                : "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {notification.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl text-center space-y-4"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">Remove Question?</h3>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>This question will be removed from the pool immediately.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-2xl border text-xs font-bold cursor-pointer hover:bg-white/5 transition-all"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer transition-all">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl border relative overflow-hidden"
        style={{
          backgroundColor: "var(--glass-bg)",
          borderColor: "var(--border-primary)",
          backgroundImage: "linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(16,185,129,0.05) 100%)",
        }}
      >
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <Gamepad2 size={15} className="text-violet-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400">Arcade Manager</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Question Bank
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Add custom questions to expand the student game pool — they auto-merge with built-in content.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="px-4 py-2 rounded-2xl border text-xs font-bold" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-primary)" }} className="font-black text-sm">{totalAll}</span> custom {totalAll === 1 ? "question" : "questions"} total
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs text-white shadow-lg transition-all hover:scale-105 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
          >
            <Plus size={14} /> Add Question
          </button>
        </div>
      </div>

      {/* ── Game type tabs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {GAME_TYPES.map(gt => {
          const Icon = gt.icon;
          const count = customData[gt.key]?.length || 0;
          const isActive = activeType === gt.key;
          return (
            <button
              key={gt.key}
              onClick={() => { setActiveType(gt.key); setSearch(""); setShowForm(false); }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${isActive ? `${gt.bg} ${gt.border}` : "hover:border-white/20"}`}
              style={isActive ? {} : { backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
            >
              <div className={`p-2 rounded-xl ${gt.bg} ${gt.accent} w-fit mb-3`}>
                <Icon size={16} />
              </div>
              <p className={`text-xs font-black ${isActive ? gt.accent : ""}`} style={isActive ? {} : { color: "var(--text-primary)" }}>{gt.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{gt.description}</p>
              <div className={`mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${gt.bg} ${gt.accent}`}>
                {count} custom
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Add/Edit form (slide-down) ────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl border p-6 space-y-5"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
                {editingId ? "Edit" : "Add"} {activeGameType.label} Question
              </h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Render form per type */}
            {activeType === "quiz" && <QuizForm form={form} onChange={handleFieldChange} />}
            {activeType === "match" && <MatchForm form={form} onChange={handleFieldChange} />}
            {activeType === "debug" && <DebugForm form={form} onChange={handleFieldChange} />}
            {activeType === "fillin" && <FillinForm form={form} onChange={handleFieldChange} />}

            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                <AlertCircle size={13} className="shrink-0" /> {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={closeForm}
                className="px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer hover:bg-white/5 transition-all"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-black cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}>
                <Save size={13} /> {editingId ? "Save Changes" : "Add Question"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Questions list ────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl border p-6 space-y-5"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
              Custom {activeGameType.label} Questions
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {allItems.length} question{allItems.length !== 1 ? "s" : ""} in pool · merge with {activeGameType.description}
            </p>
          </div>

          {allItems.length > 3 && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="pl-8 pr-4 py-2 rounded-xl border text-xs font-medium outline-none w-52"
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
              />
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center space-y-3">
            <div className={`p-4 rounded-2xl ${activeGameType.bg}`}>
              {React.createElement(activeGameType.icon, { size: 28, className: activeGameType.accent })}
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {search ? "No questions match your search" : `No custom ${activeGameType.label} questions yet`}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {search ? "Try a different search term" : "Click \"Add Question\" to expand the student question pool."}
            </p>
            {!search && (
              <button
                onClick={openAddForm}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
              >
                <Plus size={12} /> Add First Question
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map(q => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  type={activeType}
                  onEdit={openEditForm}
                  onDelete={(id) => setDeleteConfirm(id)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Info panel ───────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border flex items-start gap-3"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-400">How It Works</p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Custom questions are stored locally in this browser and automatically merged with the built-in question pool when students play.
            Students will see both built-in and custom questions shuffled together. Questions are tracked to avoid repetition until the pool is exhausted.
          </p>
        </div>
      </div>
    </div>
  );
}
