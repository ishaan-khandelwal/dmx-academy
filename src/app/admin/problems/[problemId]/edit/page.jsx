"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { 
  Sparkles, FileText, Code, CheckCircle, Save, 
  ArrowLeft, ArrowRight, Settings, Plus, Trash2,
  Bold, Italic, List, BookOpen, RefreshCw
} from "lucide-react";

// Custom light-weight markdown rendering parser matching CodeChef's layout
function renderMarkdown(md) {
  if (!md) return "";
  let html = md;

  // Escape HTML tags to prevent broken markup
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced Code Blocks (```lang ... ```)
  const codeBlockRegex = /```(javascript|js|python|go|cpp|c)?\n([\s\S]*?)```/g;
  html = html.replace(codeBlockRegex, (match, lang, codeContent) => {
    let highlighted = codeContent.trim();
    if (lang === "javascript" || lang === "js" || !lang) {
      const tokenRegex = /(\/\/.*)|("[^"]*"|'[^']*')|\b(while|for|if|else|function|return|let|const|var|new)\b|\b(console\.log|alert)\b|\b(\d+)\b/g;
      highlighted = highlighted.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
        if (comment) return `<span class="text-emerald-500 italic">${comment}</span>`;
        if (string) return `<span class="text-rose-450">${string}</span>`;
        if (keyword) return `<span class="text-blue-400 font-bold">${keyword}</span>`;
        if (builtin) return `<span class="text-amber-450 text-semibold">${builtin}</span>`;
        if (number) return `<span class="text-purple-400">${number}</span>`;
        return m;
      });
    } else if (lang === "python") {
      const tokenRegex = /(#.*)|("[^"]*"|'[^']*')|\b(while|for|if|else|def|return|import|from|as|in)\b|\b(print)\b|\b(\d+)\b/g;
      highlighted = highlighted.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
        if (comment) return `<span class="text-emerald-500 italic">${comment}</span>`;
        if (string) return `<span class="text-rose-450">${string}</span>`;
        if (keyword) return `<span class="text-blue-400 font-bold">${keyword}</span>`;
        if (builtin) return `<span class="text-amber-450 text-semibold">${builtin}</span>`;
        if (number) return `<span class="text-purple-400">${number}</span>`;
        return m;
      });
    } else if (lang === "go") {
      const tokenRegex = /(\/\/.*)|("[^"]*"|'[^']*')|\b(package|import|func|var|const|return|type|struct|interface|chan|select|case|default|if|else|for|range|switch|go|defer)\b|\b(fmt\.Println|fmt\.Printf|print|panic)\b|\b(\d+)\b/g;
      highlighted = highlighted.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
        if (comment) return `<span class="text-emerald-500 italic">${comment}</span>`;
        if (string) return `<span class="text-rose-450">${string}</span>`;
        if (keyword) return `<span class="text-blue-400 font-bold">${keyword}</span>`;
        if (builtin) return `<span class="text-amber-450 text-semibold">${builtin}</span>`;
        if (number) return `<span class="text-purple-400">${number}</span>`;
        return m;
      });
    }
    
    return `<div class="bg-slate-900 border border-slate-800 text-slate-100 p-4 rounded-xl font-mono text-[11px] my-3 overflow-x-auto leading-relaxed shadow-inner"><pre><code>${highlighted}</code></pre></div>`;
  });

  // Inline Code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-150 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-[11px] px-1.5 py-0.5 rounded font-mono font-bold mx-0.5 text-[var(--text-accent)]">$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold uppercase tracking-wider mt-4 mb-2" style="color: var(--text-primary)">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-black font-display mt-5 mb-2" style="color: var(--text-primary)">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="text-lg font-black font-display mt-6 mb-3 pb-1 border-b" style="borderColor: var(--border-primary); color: var(--text-primary)">$1</h2>');

  // Bold (**bold**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-[var(--text-primary)]">$1</strong>');

  // Unordered Lists
  html = html.replace(/^\* (.*$)/gim, '<li class="list-disc ml-5 pl-1 my-1 text-xs">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="list-disc ml-5 pl-1 my-1 text-xs">$1</li>');

  // Line breaks & Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="text-xs leading-relaxed my-2">');
  html = html.replace(/\n/g, '<br />');

  // Wrap in a base paragraph if not wrapped
  return `<div class="markdown-preview space-y-2 text-xs leading-relaxed" style="color: var(--text-secondary)"><p class="text-xs leading-relaxed my-2">${html}</p></div>`;
}

export default function EditProblem() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId;
  const { token, API_BASE, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("details"); // details, statement, templates, testcases, tabcontent
  const [showGuide, setShowGuide] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [dbId, setDbId] = useState(null);

  // Refs for inserting markdown in textareas
  const descRef = useRef(null);
  const inputFormatRef = useRef(null);
  const outputFormatRef = useRef(null);
  const constraintsRef = useRef(null);

  // 1. Details State
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [category, setCategory] = useState("Algorithms");
  const [tags, setTags] = useState("");

  // 2. Statement State
  const [desc, setDesc] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [explanation, setExplanation] = useState("No explanation provided.");

  // 3. Templates State
  const [templateJS, setTemplateJS] = useState("");
  const [templatePython, setTemplatePython] = useState("");
  const [templateGo, setTemplateGo] = useState("");

  // 4. Testcases State
  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "", isSample: true }
  ]);
  const [timeLimitMs, setTimeLimitMs] = useState(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);

  // 5. Tab Content State (Followup, Editorial, Solution, Evaluation)
  const [tabFollowup, setTabFollowup] = useState("");
  const [tabEditorial, setTabEditorial] = useState("");
  const [tabSolution, setTabSolution] = useState("");
  const [tabEvaluation, setTabEvaluation] = useState("");
  const [activeTabContent, setActiveTabContent] = useState("followup"); // sub-tab within Tab 5
  
  const followupRef = useRef(null);
  const editorialRef = useRef(null);
  const solutionRef = useRef(null);
  const evaluationRef = useRef(null);

  // Load existing problem details
  const loadProblemData = useCallback(async () => {
    if (!problemId) return;
    setLoadingProblem(true);
    try {
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" }),
      };

      const res = await fetch(`${API_BASE}/api/problems/${problemId}`, { headers });
      const data = await res.json();
      if (data.success && data.problem) {
        const prob = data.problem;
        setDbId(prob.id);
        setTitle(prob.title || "");
        setCode(prob.slug || "");
        
        let diffStr = "Medium";
        if (prob.difficulty === "EASY") diffStr = "Easy";
        else if (prob.difficulty === "HARD") diffStr = "Hard";
        setDifficulty(diffStr);
        
        setCategory(prob.category || "Algorithms");
        setTags(prob.tags ? prob.tags.join(", ") : "");
        setDesc(prob.statement || "");
        setInputFormat(prob.inputFormat || "");
        setOutputFormat(prob.outputFormat || "");
        setConstraints(prob.constraints || "");
        setTemplateJS(prob.templateJS || "");
        setTemplatePython(prob.templatePython || "");
        setTemplateGo(prob.templateGo || "");
        
        if (prob.testCases && prob.testCases.length > 0) {
          setTestCases(prob.testCases.map(tc => ({
            input: tc.input || "",
            expectedOutput: tc.expectedOutput || "",
            isSample: !!tc.isSample
          })));
        }
        
        setTabFollowup(prob.followup || "");
        setTabEditorial(prob.editorial || "");
        setTabSolution(prob.solution || "");
        setTabEvaluation(prob.evaluation || "");
        setExplanation(prob.explanation || "No explanation provided.");
      } else {
        alert("Failed to load problem details.");
      }
    } catch (err) {
      console.error("Failed to load problem:", err);
    }
    setLoadingProblem(false);
  }, [problemId, API_BASE, token]);

  useEffect(() => {
    loadProblemData();
  }, [loadProblemData]);

  // Reusable markdown insert helper for the textareas
  const insertMarkdown = (textareaRef, setValue, type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    switch (type) {
      case "bold":
        replacement = `**${selectedText || "bold text"}**`;
        cursorOffset = selectedText ? 0 : 2;
        break;
      case "italic":
        replacement = `*${selectedText || "italic text"}*`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case "heading":
        replacement = `\n## ${selectedText || "Heading"}\n`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case "inlinecode":
        replacement = `\`${selectedText || "variable"}\``;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case "codeblock-js":
        replacement = `\n\`\`\`javascript\n${selectedText || "// JS code here"}\n\`\`\`\n`;
        cursorOffset = selectedText ? 0 : 4;
        break;
      case "codeblock-py":
        replacement = `\n\`\`\`python\n${selectedText || "# Python code here"}\n\`\`\`\n`;
        cursorOffset = selectedText ? 0 : 4;
        break;
      case "codeblock-go":
        replacement = `\n\`\`\`go\n${selectedText || "// Go code here"}\n\`\`\`\n`;
        cursorOffset = selectedText ? 0 : 4;
        break;
      case "list":
        replacement = `\n- ${selectedText || "List item"}\n`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      default:
        return;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setValue(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length - cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Inline Toolbar UI Component
  const MarkdownToolbar = ({ textareaRef, setValue }) => (
    <div className="flex items-center gap-1.5 p-0.5 bg-slate-100/70 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-fit">
      <button
        type="button"
        onClick={() => insertMarkdown(textareaRef, setValue, "bold")}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition-all flex items-center justify-center cursor-pointer"
        title="Bold text"
      >
        <Bold size={11} />
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown(textareaRef, setValue, "italic")}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition-all flex items-center justify-center cursor-pointer"
        title="Italic text"
      >
        <Italic size={11} />
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown(textareaRef, setValue, "heading")}
        className="px-1.5 py-0.5 text-[9px] font-extrabold rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition-all flex items-center justify-center cursor-pointer"
        title="Add Heading"
      >
        H2
      </button>
      <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
      <button
        type="button"
        onClick={() => insertMarkdown(textareaRef, setValue, "inlinecode")}
        className="p-1 font-mono text-[9px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition-all flex items-center justify-center cursor-pointer"
        title="Inline Code Variable"
      >
        `c`
      </button>
      <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
      <div className="flex items-center space-x-0.5 px-0.5">
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mr-0.5">code:</span>
        <button
          type="button"
          onClick={() => insertMarkdown(textareaRef, setValue, "codeblock-js")}
          className="px-1 py-0.5 text-[9px] font-mono font-extrabold rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500 cursor-pointer"
          title="JS Code Block"
        >
          js
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown(textareaRef, setValue, "codeblock-py")}
          className="px-1 py-0.5 text-[9px] font-mono font-extrabold rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-500 cursor-pointer"
          title="Python Code Block"
        >
          py
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown(textareaRef, setValue, "codeblock-go")}
          className="px-1 py-0.5 text-[9px] font-mono font-extrabold rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-500 cursor-pointer"
          title="Go Code Block"
        >
          go
        </button>
      </div>
      <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
      <button
        type="button"
        onClick={() => insertMarkdown(textareaRef, setValue, "list")}
        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition-all flex items-center justify-center cursor-pointer"
        title="Bullet List"
      >
        <List size={11} />
      </button>
    </div>
  );

  const tabs = [
    { id: "details", label: "1. Problem Details", icon: Settings },
    { id: "statement", label: "2. Description & Statement", icon: FileText },
    { id: "templates", label: "3. Starter Templates", icon: Code },
    { id: "testcases", label: "4. Test Cases & Limits", icon: CheckCircle },
    { id: "tabcontent", label: "5. Tab Content", icon: BookOpen },
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title) {
      setActiveTab("details");
      alert("Please enter a Problem Title (minimum 3 characters)");
      return;
    }
    if (title.length < 3) {
      setActiveTab("details");
      alert("Title must be at least 3 characters long");
      return;
    }
    if (!desc) {
      setActiveTab("statement");
      alert("Please enter a Problem Description/Statement (minimum 10 characters)");
      return;
    }
    if (desc.length < 10) {
      setActiveTab("statement");
      alert("Description/Statement must be at least 10 characters long");
      return;
    }
    if (testCases.length === 0) {
      setActiveTab("testcases");
      alert("Please add at least one test case.");
      return;
    }
    const hasSample = testCases.some(tc => tc.isSample);
    if (!hasSample) {
      setActiveTab("testcases");
      alert("Please designate at least one test case as a Sample Case.");
      return;
    }
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (!tc.expectedOutput.trim()) {
        setActiveTab("testcases");
        alert(`Test Case #${i + 1} is missing Expected Output.`);
        return;
      }
    }

    // Save/Update in database
    try {
      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      const headers = {
        "Content-Type": "application/json",
        ...(hasRealToken
          ? { Authorization: `Bearer ${token}` }
          : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "MENTOR" ? "MENTOR" : "ADMIN" }),
      };

      const body = {
        title,
        difficulty: difficulty.toUpperCase() === "EASY" ? "EASY" : difficulty.toUpperCase() === "HARD" ? "HARD" : "MEDIUM",
        statement: desc,
        inputFormat: inputFormat || "Standard input",
        outputFormat: outputFormat || "Standard output",
        constraints: constraints || "None",
        explanation: explanation || "No explanation provided.",
        followup: tabFollowup || "",
        editorial: tabEditorial || "",
        solution: tabSolution || "",
        evaluation: tabEvaluation || "",
        templateJS: templateJS || "",
        templatePython: templatePython || "",
        templateGo: templateGo || "",
        testCases: testCases.map(tc => ({
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || "",
          isSample: !!tc.isSample
        }))
      };

      const res = await fetch(`${API_BASE}/api/problems/${dbId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error("Failed to update in database:", data.message || data.errors);
        let errMsg = "Validation or authorization error.";
        if (data.errors && Array.isArray(data.errors)) {
          errMsg = data.errors.map(e => `• ${e.field ? e.field + ": " : ""}${e.message}`).join("\n");
        } else if (data.message) {
          errMsg = data.message;
        }
        alert(`Failed to save to database:\n${errMsg}`);
        return;
      } else {
        console.log("Successfully updated problem in database:", data.problem);
      }
    } catch (err) {
      console.error("Network error saving to database:", err);
      alert("Network error connecting to the database server. Check your connection.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/admin/problems");
    }, 1200);
  };

  if (loadingProblem) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 rounded-full border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--text-accent)" }} />
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Loading problem details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => router.push("/admin/problems")}
            className="flex items-center space-x-1.5 text-xs font-semibold hover:underline cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={13} />
            <span>Back to Problems List</span>
          </button>
          <h1 className="text-2xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
            Edit Coding Problem
          </h1>
        </div>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border text-xs text-center font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        >
          🎉 Problem updated successfully!
        </motion.div>
      )}

      {/* Tab Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Column: Vertical Tab Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <div className="glass-panel p-4 rounded-3xl space-y-1">
            {tabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer"
                  style={{
                    backgroundColor: isActive ? "var(--text-accent)" : "transparent",
                    color: isActive ? "#ffffff" : "var(--text-secondary)"
                  }}
                >
                  <IconComp size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 hover:scale-102"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Save size={14} />
            <span>Save Problem</span>
          </button>
        </div>

        {/* Right Column: Tab Panels */}
        <div className="lg:col-span-3">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 min-h-[450px]">
            
            {/* Tab 1: Details */}
            {activeTab === "details" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
                  Problem Metadata & Identifiers
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      Problem Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Invert Binary Tree"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      Problem Code / Slug (Unique ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INVERT_TREE"
                      value={code}
                      disabled
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border opacity-60 cursor-not-allowed"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      Difficulty Tier
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      Category / Domain
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Trees / Algorithms"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. binary-tree, recursion, dfs"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full rounded-2xl py-3 px-4 text-xs outline-none border"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("statement")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center space-x-1.5 cursor-pointer"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    <span>Next: Description</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Statement */}
            {activeTab === "statement" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
                  Problem Statement & Specifications
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          Detailed Description (Markdown supported)
                        </label>
                        <MarkdownToolbar textareaRef={descRef} setValue={setDesc} />
                      </div>
                      <textarea
                        ref={descRef}
                        placeholder="Describe the problem... Use triple backticks for code blocks, e.g. ```javascript"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        rows={10}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                        required
                      />

                      {/* Markdown Formatting Cheatsheet / Guide */}
                      <div className="rounded-2xl border p-4 text-[11px] space-y-2 mt-2 transition-all shadow-sm" style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)" }}>
                        <button
                          type="button"
                          onClick={() => setShowGuide(!showGuide)}
                          className="w-full flex justify-between items-center font-bold text-[var(--text-accent)] uppercase tracking-wider cursor-pointer outline-none"
                        >
                          <span>📝 Markdown Guide (How to write)</span>
                          <span className="text-[9px] lowercase underline">{showGuide ? "Hide Guide" : "Show Guide"}</span>
                        </button>
                        
                        {showGuide && (
                          <div className="space-y-3 pt-2.5 text-[var(--text-secondary)] border-t border-indigo-500/10 transition-all">
                            <div>
                              <span className="font-extrabold text-[var(--text-primary)]">Headers:</span> Use <code className="bg-slate-250 dark:bg-slate-700 px-1 rounded font-mono"># Heading 1</code> (Main title), <code className="bg-slate-250 dark:bg-slate-700 px-1 rounded font-mono">## Heading 2</code> (Sections), or <code className="bg-slate-250 dark:bg-slate-700 px-1 rounded font-mono">### Heading 3</code> (Subsections).
                            </div>
                            <div>
                              <span className="font-extrabold text-[var(--text-primary)]">Inline Code Variables:</span> Wrap variables in backticks like <code className="bg-slate-250 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">{"`counter < 5`"}</code> to display formatted variables/terms inside paragraphs.
                            </div>
                            <div>
                              <span className="font-extrabold text-[var(--text-primary)]">Fenced Code Blocks:</span> Wrap multi-line program listings in triple backticks with language tags {"(e.g. `javascript` or `python`):"}
                              <pre className="bg-slate-900 text-slate-350 p-2.5 rounded-lg font-mono text-[10px] mt-1 leading-relaxed shadow-inner">
                                {"```javascript\nwhile (condition) {\n  // your code here\n}\n```"}
                              </pre>
                            </div>
                            <div>
                              <span className="font-extrabold text-[var(--text-primary)]">Lists & Emphasis:</span> Use <code className="bg-slate-250 dark:bg-slate-700 px-1 rounded font-mono">**bold text**</code> for bold text, and prefix with a hyphen <code className="bg-slate-250 dark:bg-slate-700 px-1 rounded font-mono">- list item</code> for bullets.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          Input Format (Markdown)
                        </label>
                        <MarkdownToolbar textareaRef={inputFormatRef} setValue={setInputFormat} />
                      </div>
                      <textarea
                        ref={inputFormatRef}
                        placeholder="Specify inputs format..."
                        value={inputFormat}
                        onChange={(e) => setInputFormat(e.target.value)}
                        rows={2}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          Output Format (Markdown)
                        </label>
                        <MarkdownToolbar textareaRef={outputFormatRef} setValue={setOutputFormat} />
                      </div>
                      <textarea
                        ref={outputFormatRef}
                        placeholder="Specify outputs format..."
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                        rows={2}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                          Constraints (Markdown)
                        </label>
                        <MarkdownToolbar textareaRef={constraintsRef} setValue={setConstraints} />
                      </div>
                      <textarea
                        ref={constraintsRef}
                        placeholder="e.g. 1 <= N <= 10^5"
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                        rows={2}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Live CodeChef-Style Preview */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-2" style={{ color: "var(--text-muted)" }}>
                      <FileText size={12} />
                      <span>Live Student-Facing Preview</span>
                    </label>

                    <div 
                      className="p-6 rounded-3xl border shadow-inner max-h-[550px] overflow-y-auto space-y-6"
                      style={{ 
                        backgroundColor: "var(--bg-primary)", 
                        borderColor: "var(--border-primary)"
                      }}
                    >
                      {/* Preview Title */}
                      <div className="space-y-1">
                        <h3 className="text-xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
                          {title || "Untitled Problem"}
                        </h3>
                        <div className="flex items-center space-x-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          <span className={`font-semibold ${
                            difficulty === "Easy" ? "text-emerald-500" :
                            difficulty === "Medium" ? "text-amber-500" : "text-rose-500"
                          }`}>{difficulty}</span>
                          <span>•</span>
                          <span>{category}</span>
                        </div>
                      </div>

                      {/* Rendered sections */}
                      <div className="space-y-5">
                        {desc && (
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-accent)" }}>Problem Statement</h4>
                            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(desc) }} />
                          </div>
                        )}

                        {inputFormat && (
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-accent)" }}>Input Format</h4>
                            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(inputFormat) }} />
                          </div>
                        )}

                        {outputFormat && (
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-accent)" }}>Output Format</h4>
                            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(outputFormat) }} />
                          </div>
                        )}

                        {constraints && (
                          <div className="space-y-1.5">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-accent)" }}>Constraints</h4>
                            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(constraints) }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("templates")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center space-x-1.5 cursor-pointer"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    <span>Next: Templates</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Tab 3: Starter Templates */}
            {activeTab === "templates" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
                  Starter Code Templates
                </h2>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  Provide initial function declarations for each language that users will use as their starting point.
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                      JavaScript (Node.js) Template
                    </label>
                    <textarea
                      value={templateJS}
                      onChange={(e) => setTemplateJS(e.target.value)}
                      rows={6}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border font-mono resize-none"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-blue-500">
                      Python 3 Template
                    </label>
                    <textarea
                      value={templatePython}
                      onChange={(e) => setTemplatePython(e.target.value)}
                      rows={6}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border font-mono resize-none"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                      Go Starter Template
                    </label>
                    <textarea
                      value={templateGo}
                      onChange={(e) => setTemplateGo(e.target.value)}
                      rows={6}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border font-mono resize-none"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("statement")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("testcases")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center space-x-1.5 cursor-pointer"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    <span>Next: Test Cases</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Tab 4: Testcases */}
            {activeTab === "testcases" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
                  Sample Test Cases & Performance Limits
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      CPU Execution Time Limit (ms)
                    </label>
                    <input
                      type="number"
                      value={timeLimitMs}
                      onChange={(e) => setTimeLimitMs(e.target.value)}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      min="100"
                      max="10000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      Memory Limit (MB)
                    </label>
                    <input
                      type="number"
                      value={memoryLimitMb}
                      onChange={(e) => setMemoryLimitMb(e.target.value)}
                      className="w-full rounded-2xl py-3 px-4 text-xs outline-none border"
                      style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      min="16"
                      max="2048"
                    />
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  {testCases.map((tc, index) => (
                    <div 
                      key={index} 
                      className="p-5 rounded-2xl border space-y-4 relative transition-all"
                      style={{ 
                        backgroundColor: "rgba(255, 255, 255, 0.02)", 
                        borderColor: "var(--border-primary)" 
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black" style={{ color: "var(--text-primary)" }}>
                            Test Case #{index + 1}
                          </span>
                          {tc.isSample && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                              Sample Case
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={tc.isSample}
                              onChange={(e) => {
                                const newCases = [...testCases];
                                newCases[index].isSample = e.target.checked;
                                setTestCases(newCases);
                              }}
                              className="rounded border shadow-sm accent-indigo-500 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                              Sample Case
                            </span>
                          </label>

                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newCases = testCases.filter((_, i) => i !== index);
                                setTestCases(newCases);
                              }}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-450 transition-colors cursor-pointer"
                              title="Delete Test Case"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                            Test Input
                          </label>
                          <textarea
                            placeholder="Input tokens for validation..."
                            value={tc.input}
                            onChange={(e) => {
                              const newCases = [...testCases];
                              newCases[index].input = e.target.value;
                              setTestCases(newCases);
                            }}
                            rows={3}
                            className="w-full rounded-2xl py-2.5 px-4 text-xs outline-none border font-mono resize-y min-h-[80px]"
                            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                            Expected Output
                          </label>
                          <textarea
                            placeholder="Expected output string..."
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const newCases = [...testCases];
                              newCases[index].expectedOutput = e.target.value;
                              setTestCases(newCases);
                            }}
                            rows={3}
                            className="w-full rounded-2xl py-2.5 px-4 text-xs outline-none border font-mono resize-y min-h-[80px]"
                            style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setTestCases([...testCases, { input: "", expectedOutput: "", isSample: false }])}
                    className="w-full py-3 rounded-2xl border border-dashed transition-all cursor-pointer flex items-center justify-center space-x-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-slate-500/5"
                    style={{ borderColor: "rgba(99, 102, 241, 0.4)" }}
                  >
                    <Plus size={14} />
                    <span>Add Test Case</span>
                  </button>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("templates")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tabcontent")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center space-x-1.5 cursor-pointer"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    <span>Next: Tab Content</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Tab 5: Tab Content */}
            {activeTab === "tabcontent" && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="text-base font-bold font-display" style={{ color: "var(--text-primary)" }}>
                    Tab Content
                  </h2>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    Write the content that will appear in the <strong>Followup</strong>, <strong>Editorial</strong>, <strong>Solution</strong>, and <strong>Evaluation</strong> tabs. All fields support Markdown.
                  </p>
                </div>

                {/* Sub-Tab Switcher */}
                <div className="flex flex-wrap gap-2 p-1 rounded-2xl border" style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)" }}>
                  {[
                    { id: "followup", label: "Followup", color: "text-indigo-500", bg: "bg-indigo-500" },
                    { id: "editorial", label: "Editorial", color: "text-violet-500", bg: "bg-violet-500" },
                    { id: "solution", label: "Solution", color: "text-emerald-500", bg: "bg-emerald-500" },
                    { id: "evaluation", label: "Evaluation", color: "text-amber-500", bg: "bg-amber-500" },
                  ].map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveTabContent(sub.id)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                        activeTabContent === sub.id
                          ? `${sub.color} ${sub.bg}/10 border border-current`
                          : "text-[var(--text-secondary)] hover:bg-slate-500/5"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Followup */}
                {activeTabContent === "followup" && (
                  <motion.div key="followup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                        Followup Questions (Markdown)
                      </label>
                      <MarkdownToolbar textareaRef={followupRef} setValue={setTabFollowup} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <textarea
                        ref={followupRef}
                        placeholder={`### Complexity Followup\n1. Can you improve the time complexity?\n2. What edge cases should we consider?`}
                        value={tabFollowup}
                        onChange={e => setTabFollowup(e.target.value)}
                        rows={14}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                      <div
                        className="rounded-2xl p-4 border overflow-auto text-xs"
                        style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)", minHeight: "14rem" }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(tabFollowup || "*Preview will appear here...*") }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Editorial */}
                {activeTabContent === "editorial" && (
                  <motion.div key="editorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-violet-500">
                        Editorial / Approach Guide (Markdown)
                      </label>
                      <MarkdownToolbar textareaRef={editorialRef} setValue={setTabEditorial} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <textarea
                        ref={editorialRef}
                        placeholder={`### Approach\nExplain the optimal algorithm step by step...\n\n### Complexity\n- **Time:** O(N)\n- **Space:** O(1)`}
                        value={tabEditorial}
                        onChange={e => setTabEditorial(e.target.value)}
                        rows={14}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                      <div
                        className="rounded-2xl p-4 border overflow-auto text-xs"
                        style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)", minHeight: "14rem" }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(tabEditorial || "*Preview will appear here...*") }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Solution */}
                {activeTabContent === "solution" && (
                  <motion.div key="solution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                        Official Solution Code (Markdown)
                      </label>
                      <MarkdownToolbar textareaRef={solutionRef} setValue={setTabSolution} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <textarea
                        ref={solutionRef}
                        placeholder={"```javascript\nfunction solve(input) {\n  // Official solution here\n}\n```"}
                        value={tabSolution}
                        onChange={e => setTabSolution(e.target.value)}
                        rows={14}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                      <div
                        className="rounded-2xl p-4 border overflow-auto text-xs"
                        style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)", minHeight: "14rem" }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(tabSolution || "*Preview will appear here...*") }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Evaluation */}
                {activeTabContent === "evaluation" && (
                  <motion.div key="evaluation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                        Evaluation Criteria (Markdown)
                      </label>
                      <MarkdownToolbar textareaRef={evaluationRef} setValue={setTabEvaluation} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <textarea
                        ref={evaluationRef}
                        placeholder={`### Evaluation Limits\n* **Time Limit:** 2000ms\n* **Memory Limit:** 256MB\n* **Expected Complexity:** O(N log N)`}
                        value={tabEvaluation}
                        onChange={e => setTabEvaluation(e.target.value)}
                        rows={14}
                        className="w-full rounded-2xl py-3 px-4 text-xs outline-none border resize-none font-mono"
                        style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                      />
                      <div
                        className="rounded-2xl p-4 border overflow-auto text-xs"
                        style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)", minHeight: "14rem" }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(tabEvaluation || "*Preview will appear here...*") }}
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("testcases")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center space-x-1.5 cursor-pointer"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    <Save size={13} />
                    <span>Save Problem</span>
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
