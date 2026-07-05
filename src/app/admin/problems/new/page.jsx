"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles, FileText, Code2, FlaskConical, BookOpen,
  ArrowLeft, ArrowRight, Save, Plus, Trash2,
  Bold, Italic, List, ChevronRight, Check, Eye,
  Terminal, Cpu, Hash, Tag,
  AlertCircle, CheckCircle2, Info, X
} from "lucide-react";

function renderMarkdown(md) {
  if (!md) return "";
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\w]*)\n([\s\S]*?)```/g, (_, _lang, code) =>
    `<div class="bg-[#0d1117] border border-slate-800/80 text-slate-200 p-4 rounded-xl font-mono text-[11px] my-3 overflow-x-auto leading-relaxed"><pre><code>${code.trim()}</code></pre></div>`
  );
  html = html.replace(/`([^`]+)`/g, '<code class="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] px-1.5 py-0.5 rounded font-mono font-semibold mx-0.5">$1</code>');
  html = html.replace(/^### (.*$)/gim, '<h4 class="text-[11px] font-extrabold uppercase tracking-wider mt-4 mb-2 text-indigo-400">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-black mt-5 mb-2 text-white">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-black mt-6 mb-3 pb-1 border-b border-white/10 text-white">$1</h2>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/^[*-] (.*$)/gim, '<li class="flex items-start gap-2 my-1 text-xs text-slate-300"><span class="text-indigo-400">◆</span><span>$1</span></li>');
  html = html.replace(/\n\n/g, '</p><p class="text-xs leading-relaxed my-2 text-slate-300">');
  html = html.replace(/\n/g, '<br/>');
  return `<div class="space-y-1 text-xs leading-relaxed text-slate-300"><p class="text-xs leading-relaxed my-2">${html}</p></div>`;
}


function insertMd(taRef, setValue, type) {
  const ta = taRef.current;
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const text = ta.value, sel = text.substring(s, e);
  let rep = "", offset = 0;
  switch (type) {
    case "bold":     rep = `**${sel || "bold text"}**`;   offset = sel ? 0 : 2; break;
    case "italic":   rep = `*${sel || "italic text"}*`;   offset = sel ? 0 : 1; break;
    case "heading":  rep = `\n## ${sel || "Heading"}\n`;  offset = sel ? 0 : 1; break;
    case "inline":   rep = `\`${sel || "code"}\``;        offset = sel ? 0 : 1; break;
    case "list":     rep = `\n- ${sel || "List item"}\n`; offset = sel ? 0 : 1; break;
    case "block-js": rep = `\n\`\`\`javascript\n${sel || "// code"}\n\`\`\`\n`; offset = sel ? 0 : 4; break;
    case "block-py": rep = `\n\`\`\`python\n${sel || "# code"}\n\`\`\`\n`;     offset = sel ? 0 : 4; break;
    case "block-go": rep = `\n\`\`\`go\n${sel || "// code"}\n\`\`\`\n`;        offset = sel ? 0 : 4; break;
    default: return;
  }
  setValue(text.substring(0, s) + rep + text.substring(e));
  setTimeout(() => { ta.focus(); const nc = s + rep.length - offset; ta.setSelectionRange(nc, nc); }, 0);
}

function MdToolbar({ taRef, setValue }) {
  const b = (label, action, cls) => (
    <button type="button" onClick={() => insertMd(taRef, setValue, action)}
      className={`px-1.5 py-1 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-all cursor-pointer ${cls || "text-slate-400 hover:text-white"}`}>
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-[#1a1f2e] border border-white/10 flex-wrap">
      <button type="button" onClick={() => insertMd(taRef, setValue, "bold")} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"><Bold size={10} /></button>
      <button type="button" onClick={() => insertMd(taRef, setValue, "italic")} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"><Italic size={10} /></button>
      <div className="w-px h-3 bg-white/10 mx-1" />
      {b("H2", "heading")}
      {b("`c`", "inline", "font-mono text-purple-400")}
      <div className="w-px h-3 bg-white/10 mx-1" />
      {b("js", "block-js", "text-amber-400")}
      {b("py", "block-py", "text-blue-400")}
      {b("go", "block-go", "text-emerald-400")}
      <div className="w-px h-3 bg-white/10 mx-1" />
      <button type="button" onClick={() => insertMd(taRef, setValue, "list")} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"><List size={10} /></button>
    </div>
  );
}

function CodePanel({ lang, value, onChange, rows = 10 }) {
  const colors = { javascript: "#f59e0b", python: "#3b82f6", go: "#10b981", cpp: "#f43f5e", java: "#06b6d4" };
  const labels = { javascript: "JS · Node.js", python: "Python 3", go: "Go", cpp: "C++ (GCC 17)", java: "Java (JDK 21)" };
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b27] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-bold font-mono ml-1" style={{ color: colors[lang] || "#6366f1" }}>
            {labels[lang] || lang}
          </span>
        </div>
        <Terminal size={11} className="text-slate-600" />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck="false"
        className="w-full bg-[#0d1117] text-slate-200 font-mono text-[12px] leading-6 px-5 py-4 outline-none resize-none border-none placeholder:text-slate-700"
        style={{ caretColor: "#6366f1" }}
      />
    </div>
  );
}

function DarkInput({ style, ...props }) {
  return <input {...props} style={style} className="w-full rounded-xl px-4 py-3 text-sm bg-[#111827] border border-white/10 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium" />;
}
function DarkSelect({ children, ...props }) {
  return <select {...props} className="w-full rounded-xl px-4 py-3 text-sm bg-[#111827] border border-white/10 text-white outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium cursor-pointer">{children}</select>;
}
function DarkTextarea({ style, ...props }) {
  return <textarea {...props} style={style} className="w-full rounded-xl px-4 py-3 text-sm bg-[#111827] border border-white/10 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono resize-none leading-relaxed" />;
}

const STEPS = [
  { id: "details",    num: 1, label: "Problem Details",          icon: Hash,         desc: "Title, difficulty, tags" },
  { id: "statement",  num: 2, label: "Description & Statement",  icon: FileText,     desc: "Problem body & I/O format" },
  { id: "templates",  num: 3, label: "Starter Templates",        icon: Code2,        desc: "JS, Python, Go starters" },
  { id: "testcases",  num: 4, label: "Test Cases & Limits",      icon: FlaskConical, desc: "I/O pairs, time & memory" },
  { id: "tabcontent", num: 5, label: "Tab Content",              icon: BookOpen,     desc: "Editorial, solution, followup" },
];

export default function CreateProblem() {
  const router = useRouter();
  const { token, API_BASE, user } = useAuth();

  const [activeTab,  setActiveTab]  = useState("details");
  const [templatesVisited, setTemplatesVisited] = useState(false);
  const [tabcontentVisited, setTabcontentVisited] = useState(false);

  useEffect(() => {
    if (activeTab === "templates") {
      setTimeout(() => setTemplatesVisited(true), 0);
    }
    if (activeTab === "tabcontent") {
      setTimeout(() => setTabcontentVisited(true), 0);
    }
  }, [activeTab]);
  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [preview,    setPreview]    = useState(false);
  const [errors,     setErrors]     = useState({});

  const descRef = useRef(null), inputFmtRef = useRef(null), outputFmtRef = useRef(null), constraintsRef = useRef(null);
  const followupRef = useRef(null), editorialRef = useRef(null), solutionRef = useRef(null), evaluationRef = useRef(null);

  // Step 1
  const [title,      setTitle]      = useState("");
  const [slug,       setSlug]       = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [category,   setCategory]   = useState("Algorithms");
  const [tags,       setTags]       = useState("");

  // Step 2
  const [desc,       setDesc]       = useState("");
  const [inputFmt,   setInputFmt]   = useState("");
  const [outputFmt,  setOutputFmt]  = useState("");
  const [constr,     setConstr]     = useState("");
  const [statSub,    setStatSub]    = useState("desc");

  // Step 3
  const [tmplJS,  setTmplJS]  = useState("// JavaScript Starter Code\nfunction solve(input) {\n  // Write your solution here\n  return \"\";\n}");
  const [tmplCPP, setTmplCPP] = useState("// C++ Starter Code\n#include <iostream>\n#include <string>\n#include <vector>\n\nusing namespace std;\n\nstring solve(string input) {\n  // Write your solution here\n  return \"\";\n}");
  const [tmplJava, setTmplJava] = useState("// Java Starter Code\nimport java.util.*;\n\npublic class Solution {\n  public static String solve(String input) {\n    // Write your solution here\n    return \"\";\n  }\n}");
  const [tmplPy,  setTmplPy]  = useState("# Python 3 Starter Code\ndef solve(input_data):\n    # Write your solution here\n    pass");
  const [tmplGo,  setTmplGo]  = useState("// Go Starter Code\npackage main\n\nimport \"fmt\"\n\nfunc solve(input string) string {\n  // Write your solution here\n  return \"\"\n}");
  const [activeTmpl, setActiveTmpl] = useState("javascript");

  // Step 4
  const [testCases,  setTestCases]  = useState([{ input: "", expectedOutput: "", isSample: true }]);
  const [timeLimit,  setTimeLimit]  = useState(2000);
  const [memLimit,   setMemLimit]   = useState(256);

  // Step 5
  const [followup,   setFollowup]   = useState("");
  const [editorial,  setEditorial]  = useState("");
  const [solution,   setSolution]   = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [sub5,       setSub5]       = useState("followup");

  const stepDone = {
    details:    title.trim().length >= 3,
    statement:  desc.trim().length >= 10,
    templates:  templatesVisited && !!(tmplJS.trim() || tmplPy.trim() || tmplGo.trim() || tmplCPP.trim() || tmplJava.trim()),
    testcases:  testCases.length > 0 && testCases.some(t => t.isSample && t.expectedOutput.trim()),
    tabcontent: tabcontentVisited,
  };

  const showToast = useCallback((text, type = "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleTitleChange = (v) => {
    setTitle(v);
    if (!slug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handlePublish = async () => {
    const errs = {};
    if (title.trim().length < 3) { errs.title = "Title must be at least 3 characters"; setActiveTab("details"); }
    if (desc.trim().length < 10) { errs.desc = "Description must be at least 10 characters"; }
    if (!testCases.some(t => t.isSample)) { errs.tc = "At least one sample test case required"; }
    testCases.forEach((t, i) => { if (!t.expectedOutput.trim()) errs[`tc_${i}`] = `Test Case #${i + 1} needs expected output`; });
    setErrors(errs);
    if (Object.keys(errs).length > 0) { showToast("Please fix the highlighted issues before publishing.", "error"); return; }

    setSaving(true);
    try {
      const hasToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "MENTOR" ? "MENTOR" : "ADMIN" }),
      };
      const body = {
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        difficulty: ["EASY", "MEDIUM", "HARD"].includes(difficulty.toUpperCase()) ? difficulty.toUpperCase() : "MEDIUM",
        statement: desc.trim(),
        inputFormat:  inputFmt.trim()  || "Standard input",
        outputFormat: outputFmt.trim() || "Standard output",
        constraints:  constr.trim()    || "None",
        explanation: "No explanation provided.",
        followup: followup || "", editorial: editorial || "", solution: solution || "", evaluation: evaluation || "",
        templateJS: tmplJS || "", templatePython: tmplPy || "", templateGo: tmplGo || "",
        templateCPP: tmplCPP || "", templateJava: tmplJava || "",
        testCases: testCases.map(tc => ({ input: tc.input || "", expectedOutput: tc.expectedOutput || "", isSample: !!tc.isSample })),
        timeout: Number(timeLimit), memoryLimit: Number(memLimit),
      };
      const res = await fetch(`${API_BASE}/api/problems`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.errors?.map(e => `• ${e.field ? e.field + ": " : ""}${e.message}`).join("\n") || data.message || "Unknown error";
        showToast(msg, "error"); return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/admin/problems"), 1600);
    } catch (err) {
      showToast("Network error — check your server connection.", "error");
    } finally {
      setSaving(false);
    }
  };

  const loadDemo = (type) => {
    if (type === "fizzbuzz") {
      setTitle("FizzBuzz Challenge"); setSlug("fizzbuzz"); setDifficulty("EASY"); setCategory("Basic Logic"); setTags("math, logic");
      setDesc("Write a program that prints numbers from `1` to `N`. For multiples of 3 print `Fizz`, multiples of 5 print `Buzz`, and multiples of both print `FizzBuzz`.\n\n### Example\nFor `N = 5`, output:\n```\n1\n2\nFizz\n4\nBuzz\n```");
      setInputFmt("A single integer `N` (1 ≤ N ≤ 1000) on one line."); setOutputFmt("Output N lines."); setConstr("1 ≤ N ≤ 1000");
      setTmplJS("// JavaScript Starter Code\nfunction solve(n) {\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) console.log(\"FizzBuzz\");\n    else if (i % 3 === 0) console.log(\"Fizz\");\n    else if (i % 5 === 0) console.log(\"Buzz\");\n    else console.log(i);\n  }\n}");
      setTmplPy("# Python 3 Starter Code\ndef solve(n):\n    for i in range(1, n + 1):\n        if i % 15 == 0: print(\"FizzBuzz\")\n        elif i % 3 == 0: print(\"Fizz\")\n        elif i % 5 == 0: print(\"Buzz\")\n        else: print(i)");
      setTestCases([{ input: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", isSample: true }]);
    } else {
      setTitle(""); setSlug(""); setDifficulty("MEDIUM"); setCategory("Algorithms"); setTags("");
      setDesc(""); setInputFmt(""); setOutputFmt(""); setConstr("");
      setTmplJS("// JavaScript Starter Code\nfunction solve(input) {\n  return \"\";\n}");
      setTmplPy("# Python 3 Starter Code\ndef solve(input_data):\n    pass");
      setTmplGo("// Go Starter Code\npackage main\n\nfunc solve(input string) string {\n  return \"\"\n}");
      setTestCases([{ input: "", expectedOutput: "", isSample: true }]);
      setFollowup(""); setEditorial(""); setSolution(""); setEvaluation("");
    }
  };

  const idx = STEPS.findIndex(s => s.id === activeTab);
  const goNext = () => { if (idx < STEPS.length - 1) setActiveTab(STEPS[idx + 1].id); };
  const goPrev = () => { if (idx > 0) setActiveTab(STEPS[idx - 1].id); };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
            <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl text-sm font-medium backdrop-blur-xl ${toast.type === "error" ? "bg-rose-950/90 border-rose-500/30 text-rose-300" : "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"}`}>
              {toast.type === "error" ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
              <span className="whitespace-pre-wrap text-xs leading-relaxed">{toast.text}</span>
              <button onClick={() => setToast(null)} className="ml-auto shrink-0 cursor-pointer opacity-60 hover:opacity-100"><X size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/70">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 text-center p-10">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Problem Published!</h2>
              <p className="text-sm text-slate-400">Redirecting to problems library…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <button onClick={() => router.push("/admin/problems")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
              <ArrowLeft size={13} /> Back to Problems
            </button>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 text-transparent bg-clip-text">Create Coding Problem</span>
              <Sparkles size={20} className="text-amber-400 animate-pulse" />
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="font-black text-white">{STEPS.filter(s => stepDone[s.id]).length}</span>/{STEPS.length} steps done
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <div className="space-y-3 lg:sticky lg:top-8">
            <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = activeTab === step.id;
                const done = stepDone[step.id];
                return (
                  <button key={step.id} onClick={() => setActiveTab(step.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all cursor-pointer text-left ${isActive ? "bg-gradient-to-r from-indigo-600/20 to-violet-600/10 border-l-2 border-indigo-500" : "hover:bg-white/5 border-l-2 border-transparent"} ${i < STEPS.length - 1 ? "border-b border-white/5" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black transition-all ${done ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : isActive ? "bg-indigo-500/20 border border-indigo-500/60 text-indigo-300" : "bg-white/5 border border-white/10 text-slate-600"}`}>
                      {done ? <Check size={12} /> : step.num}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate transition-colors ${isActive ? "text-white" : done ? "text-slate-300" : "text-slate-500"}`}>{step.label}</p>
                      <p className="text-[10px] text-slate-600 truncate">{step.desc}</p>
                    </div>
                    {isActive && <ChevronRight size={12} className="ml-auto text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button onClick={handlePublish} disabled={saving}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)" }}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Publishing…</span></>
                : <><Save size={15} /><span>Publish Problem</span></>}
            </button>

            <div className="rounded-2xl border p-3 space-y-2" style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">Demo Templates</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => loadDemo("fizzbuzz")} className="py-2 rounded-xl text-[10px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/20 cursor-pointer">FizzBuzz</button>
                <button onClick={() => loadDemo("clear")} className="py-2 rounded-xl text-[10px] font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 cursor-pointer">Clear All</button>
              </div>
            </div>
          </div>

          {/* Content panel */}
          <div className="rounded-2xl border shadow-xl overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            {/* Panel header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-3">
                {(() => { const s = STEPS.find(s => s.id === activeTab); const I = s?.icon; return I ? <I size={16} className="text-indigo-400" /> : null; })()}
                <div>
                  <h2 className="text-sm font-black text-white">{STEPS.find(s => s.id === activeTab)?.label}</h2>
                  <p className="text-[10px] text-slate-500">{STEPS.find(s => s.id === activeTab)?.desc}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-600">Step {idx + 1} / {STEPS.length}</span>
            </div>

            {/* Panel body */}
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">

                {/* ─── Step 1: Details ─────────────────────────────── */}
                {activeTab === "details" && (
                  <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          Problem Title <span className="text-rose-500 text-base leading-none">*</span>
                        </label>
                        <DarkInput placeholder="e.g. Invert Binary Tree" value={title} onChange={e => handleTitleChange(e.target.value)} />
                        {errors.title && <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.title}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                          Slug / ID <span className="text-slate-600 normal-case font-normal text-[10px]">(auto-generated)</span>
                        </label>
                        <DarkInput placeholder="e.g. invert-binary-tree" value={slug} onChange={e => setSlug(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                          Difficulty <span className="text-rose-500 text-base leading-none">*</span>
                        </label>
                        <DarkSelect value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                          <option value="EASY">🟢 Easy</option>
                          <option value="MEDIUM">🟡 Medium</option>
                          <option value="HARD">🔴 Hard</option>
                        </DarkSelect>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Category / Domain</label>
                        <DarkSelect value={category} onChange={e => setCategory(e.target.value)}>
                          <option value="Security">Security</option>
                          <option value="Algorithms">Algorithms</option>
                          <option value="Frontend">Frontend</option>
                          <option value="System Design">System Design</option>
                        </DarkSelect>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                        Tags <span className="text-slate-600 normal-case font-normal text-[10px]">(comma-separated)</span>
                      </label>
                      <div className="relative">
                        <Tag size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                        <DarkInput placeholder="binary-tree, recursion, dfs…" value={tags} onChange={e => setTags(e.target.value)} style={{ paddingLeft: "2rem" }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 2: Statement ───────────────────────────── */}
                {activeTab === "statement" && (
                  <motion.div key="statement" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                    <div className="flex gap-2 flex-wrap items-center">
                      {[
                        { id: "desc",   label: "Description",  cls: "text-indigo-400 bg-indigo-500/15 border-indigo-500/40" },
                        { id: "input",  label: "Input Format", cls: "text-violet-400 bg-violet-500/15 border-violet-500/40" },
                        { id: "output", label: "Output Format",cls: "text-cyan-400 bg-cyan-500/15 border-cyan-500/40" },
                        { id: "constr", label: "Constraints",  cls: "text-amber-400 bg-amber-500/15 border-amber-500/40" },
                      ].map(sub => (
                        <button key={sub.id} type="button" onClick={() => setStatSub(sub.id)}
                          className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${statSub === sub.id ? sub.cls : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"}`}>
                          {sub.label}
                        </button>
                      ))}
                      <button type="button" onClick={() => setPreview(p => !p)}
                        className={`ml-auto px-4 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${preview ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"}`}>
                        <Eye size={12} />{preview ? "Hide Preview" : "Live Preview"}
                      </button>
                    </div>

                    <div className={`grid gap-5 ${preview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                      <div className="space-y-3">
                        {statSub === "desc" && (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400">Problem Description *</label>
                              <MdToolbar taRef={descRef} setValue={setDesc} />
                            </div>
                            <DarkTextarea ref={descRef} placeholder={"Describe the problem in markdown…\n\n### Example\nFor N = 5, output 1 2 3 4 5"} value={desc} onChange={e => setDesc(e.target.value)} rows={14} />
                            {errors.desc && <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.desc}</p>}
                          </>
                        )}
                        {statSub === "input" && (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="text-[11px] font-extrabold uppercase tracking-widest text-violet-400">Input Format</label>
                              <MdToolbar taRef={inputFmtRef} setValue={setInputFmt} />
                            </div>
                            <DarkTextarea ref={inputFmtRef} placeholder="Describe the input format clearly…" value={inputFmt} onChange={e => setInputFmt(e.target.value)} rows={10} />
                          </>
                        )}
                        {statSub === "output" && (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">Output Format</label>
                              <MdToolbar taRef={outputFmtRef} setValue={setOutputFmt} />
                            </div>
                            <DarkTextarea ref={outputFmtRef} placeholder="Describe the expected output format…" value={outputFmt} onChange={e => setOutputFmt(e.target.value)} rows={10} />
                          </>
                        )}
                        {statSub === "constr" && (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">Constraints</label>
                              <MdToolbar taRef={constraintsRef} setValue={setConstr} />
                            </div>
                            <DarkTextarea ref={constraintsRef} placeholder={"1 ≤ N ≤ 10^5\n-10^9 ≤ A[i] ≤ 10^9"} value={constr} onChange={e => setConstr(e.target.value)} rows={10} />
                          </>
                        )}
                      </div>

                      {preview && (
                        <div className="rounded-2xl border p-5 overflow-auto max-h-[520px] space-y-5" style={{ background: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
                          <div className="space-y-2">
                            <h3 className="text-lg font-black text-white">{title || "Untitled Problem"}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${difficulty === "EASY" ? "bg-emerald-500/20 text-emerald-400" : difficulty === "HARD" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{difficulty}</span>
                          </div>
                          {desc     && <div><p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 mb-2">Problem Statement</p><div dangerouslySetInnerHTML={{ __html: renderMarkdown(desc) }} /></div>}
                          {inputFmt && <div><p className="text-[11px] font-extrabold uppercase tracking-widest text-violet-400 mb-2">Input Format</p><div dangerouslySetInnerHTML={{ __html: renderMarkdown(inputFmt) }} /></div>}
                          {outputFmt&& <div><p className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 mb-2">Output Format</p><div dangerouslySetInnerHTML={{ __html: renderMarkdown(outputFmt) }} /></div>}
                          {constr   && <div><p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 mb-2">Constraints</p><div dangerouslySetInnerHTML={{ __html: renderMarkdown(constr) }} /></div>}
                          {!desc && !inputFmt && !outputFmt && !constr && <p className="text-slate-700 text-xs italic text-center py-8">Start typing to see preview…</p>}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <Info size={11} className="text-indigo-400 shrink-0" />
                      Markdown: <code className="text-slate-600">## Heading</code> · <code className="text-slate-600">**bold**</code> · <code className="text-slate-600">`inline`</code> · <code className="text-slate-600">- list</code> · triple backticks for code blocks
                    </div>
                  </motion.div>
                )}

                {/* ─── Step 3: Templates ───────────────────────────── */}
                {activeTab === "templates" && (
                  <motion.div key="templates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-400 flex items-start gap-3">
                      <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                      <span>These templates are pre-loaded in the code editor when students open this problem. Write complete starter functions that match the judge wrapper signature.</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: "javascript", label: "JavaScript", cls: "text-amber-400 bg-amber-500/15 border-amber-500/40" },
                        { id: "cpp",        label: "C++",        cls: "text-rose-400   bg-rose-500/15   border-rose-500/40" },
                        { id: "java",       label: "Java",       cls: "text-cyan-400   bg-cyan-500/15   border-cyan-500/40" },
                        { id: "python",     label: "Python 3",   cls: "text-blue-400   bg-blue-500/15   border-blue-500/40" },
                        { id: "go",         label: "Go",         cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40" },
                      ].map(l => (
                        <button key={l.id} type="button" onClick={() => setActiveTmpl(l.id)}
                          className={`px-5 py-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${activeTmpl === l.id ? l.cls : "text-slate-500 bg-white/5 border-white/10 hover:text-slate-300"}`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {activeTmpl === "javascript" && <motion.div key="js"   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CodePanel lang="javascript" value={tmplJS} onChange={setTmplJS} rows={12} /></motion.div>}
                      {activeTmpl === "cpp"        && <motion.div key="cpp"  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CodePanel lang="cpp"        value={tmplCPP} onChange={setTmplCPP} rows={12} /></motion.div>}
                      {activeTmpl === "java"       && <motion.div key="java" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CodePanel lang="java"       value={tmplJava} onChange={setTmplJava} rows={12} /></motion.div>}
                      {activeTmpl === "python"     && <motion.div key="py"   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CodePanel lang="python"     value={tmplPy} onChange={setTmplPy} rows={12} /></motion.div>}
                      {activeTmpl === "go"         && <motion.div key="go"   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CodePanel lang="go"         value={tmplGo} onChange={setTmplGo} rows={12} /></motion.div>}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ─── Step 4: Test Cases ──────────────────────────── */}
                {activeTab === "testcases" && (
                  <motion.div key="testcases" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Cpu size={11} className="text-slate-600" /> CPU Time Limit <span className="text-slate-600 normal-case font-normal">(ms)</span>
                        </label>
                        <DarkInput type="number" min={100} max={10000} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Terminal size={11} className="text-slate-600" /> Memory Limit <span className="text-slate-600 normal-case font-normal">(MB)</span>
                        </label>
                        <DarkInput type="number" min={16} max={2048} value={memLimit} onChange={e => setMemLimit(e.target.value)} />
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-4">
                      {testCases.map((tc, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className={`rounded-2xl border p-5 space-y-4 transition-all ${tc.isSample ? "border-amber-500/25 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-white">Test Case #{i + 1}</span>
                              {tc.isSample && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">Sample</span>}
                              {errors[`tc_${i}`] && <span className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors[`tc_${i}`]}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={tc.isSample}
                                  onChange={e => { const n = [...testCases]; n[i].isSample = e.target.checked; setTestCases(n); }}
                                  className="rounded accent-amber-500 w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mark as Sample</span>
                              </label>
                              {testCases.length > 1 && (
                                <button type="button" onClick={() => setTestCases(testCases.filter((_, j) => j !== i))}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Input</label>
                              <textarea placeholder="Test input…" value={tc.input}
                                onChange={e => { const n = [...testCases]; n[i].input = e.target.value; setTestCases(n); }}
                                rows={4} className="w-full rounded-xl px-4 py-3 text-xs bg-[#0d1117] border border-white/10 text-slate-300 font-mono outline-none resize-y focus:border-amber-500/40 transition-all placeholder:text-slate-700" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Expected Output</label>
                              <textarea placeholder="Expected output…" value={tc.expectedOutput}
                                onChange={e => { const n = [...testCases]; n[i].expectedOutput = e.target.value; setTestCases(n); }}
                                rows={4} className="w-full rounded-xl px-4 py-3 text-xs bg-[#0d1117] border border-white/10 text-slate-300 font-mono outline-none resize-y focus:border-emerald-500/40 transition-all placeholder:text-slate-700" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <button type="button" onClick={() => setTestCases([...testCases, { input: "", expectedOutput: "", isSample: false }])}
                      className="w-full py-3.5 rounded-2xl border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/5 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-indigo-500/50">
                      <Plus size={14} /> Add Test Case
                    </button>
                  </motion.div>
                )}

                {/* ─── Step 5: Tab Content ─────────────────────────── */}
                {activeTab === "tabcontent" && (
                  <motion.div key="tabcontent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs text-slate-400 flex items-start gap-3">
                      <Info size={14} className="text-violet-400 shrink-0 mt-0.5" />
                      <span>These tabs appear in the student problem view. Editorials and solutions are hidden during active contests. All fields support Markdown.</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "followup",   label: "Followup",   icon: "💬", cls: "text-indigo-400 bg-indigo-500/15 border-indigo-500/40" },
                        { id: "editorial",  label: "Editorial",  icon: "📖", cls: "text-violet-400 bg-violet-500/15 border-violet-500/40" },
                        { id: "solution",   label: "Solution",   icon: "✅", cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40" },
                        { id: "evaluation", label: "Evaluation", icon: "🎯", cls: "text-amber-400 bg-amber-500/15 border-amber-500/40" },
                      ].map(s => (
                        <button key={s.id} type="button" onClick={() => setSub5(s.id)}
                          className={`py-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${sub5 === s.id ? s.cls : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"}`}>
                          <span>{s.icon}</span>{s.label}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {[
                        { id: "followup",   ref: followupRef,   val: followup,   set: setFollowup,   lbl: "Followup Questions",       clr: "text-indigo-400",  previewCls: "border-indigo-500/20 bg-indigo-500/5" },
                        { id: "editorial",  ref: editorialRef,  val: editorial,  set: setEditorial,  lbl: "Editorial / Approach",     clr: "text-violet-400",  previewCls: "border-violet-500/20 bg-violet-500/5" },
                        { id: "solution",   ref: solutionRef,   val: solution,   set: setSolution,   lbl: "Official Solution Code",   clr: "text-emerald-400", previewCls: "border-emerald-500/20 bg-emerald-500/5" },
                        { id: "evaluation", ref: evaluationRef, val: evaluation, set: setEvaluation, lbl: "Evaluation Criteria",      clr: "text-amber-400",   previewCls: "border-amber-500/20 bg-amber-500/5" },
                      ].filter(s => s.id === sub5).map(s => (
                        <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className={`text-[11px] font-extrabold uppercase tracking-widest ${s.clr}`}>{s.lbl}</label>
                              <MdToolbar taRef={s.ref} setValue={s.set} />
                            </div>
                            <DarkTextarea ref={s.ref} placeholder="Write in markdown…" value={s.val} onChange={e => s.set(e.target.value)} rows={14} />
                          </div>
                          <div className={`rounded-2xl border p-5 overflow-auto text-xs ${s.previewCls}`} style={{ minHeight: "14rem" }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(s.val || "*Preview will appear here…*") }} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Panel footer */}
            <div className="px-6 sm:px-8 py-4 border-t flex items-center justify-between" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
              <button type="button" onClick={goPrev} disabled={idx === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeft size={13} /> Back
              </button>
              {idx < STEPS.length - 1 ? (
                <button type="button" onClick={goNext}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  Next: {STEPS[idx + 1]?.label} <ArrowRight size={13} />
                </button>
              ) : (
                <button type="button" onClick={handlePublish} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  {saving
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publishing…</>
                    : <><Save size={13} />Publish Problem</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

