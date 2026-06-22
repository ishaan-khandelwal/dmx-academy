"use client";

import React, { useState, useEffect, useRef } from "react";
import { getApiBase } from "@/utils/api";
import { useParams } from "next/navigation";
import { 
  BookOpen, CheckCircle, Circle, Search, ArrowLeft, ArrowRight, 
  Menu, X, Sparkles, HelpCircle, ChevronRight, Award,
  ExternalLink, FileText, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Import Web Development widgets
import { 
  HtmlCssSandbox, FlexboxLab, JsDomDebugger, PracticePlayground 
} from "@/components/courses/WebDevWidgets";

// Import React/Next/Node widgets
import { 
  ReactStatePropsLab, ExpressRestController, NextRouterMap 
} from "@/components/courses/ReactNextNodeWidgets";

// Import General/AI widgets
import { 
  PromptPlayground, TokenVisualizer, ClassifierSandbox 
} from "@/components/courses/Widgets";

export default function DynamicCoursePage() {
  const params = useParams();
  const courseId = params.courseId;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("curriculum"); // "curriculum" | "practice" | "glossary" | "resources"
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [flatLessons, setFlatLessons] = useState([]);
  const contentRef = useRef(null);

  // Fetch course details dynamically
  useEffect(() => {
    async function loadCourseDetails() {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/courses/${courseId}`);
        const data = await res.json();
        if (data.success && data.course) {
          setCourse(data.course);
        }
      } catch (err) {
        console.error("Failed to load course details dynamically:", err);
      } finally {
        setLoading(false);
      }
    }
    if (courseId) {
      loadCourseDetails();
    }
  }, [courseId]);

  const { allPhases = [], resourcesList = [], glossary = [], title, accent, duration, lessons } = course || {};
  const progressKey = `${courseId}_course_progress`;

  // Parse and build flat list of lessons once
  useEffect(() => {
    const list = [];
    allPhases.forEach((p, pIdx) => {
      p.modules.forEach((m, mIdx) => {
        m.lessons.forEach((l, lIdx) => {
          list.push({
            id: l.id,
            title: l.title,
            phaseTitle: p.title,
            moduleTitle: m.title,
            lIdx: lIdx,
            mIndexInAll: allPhases.slice(0, pIdx).reduce((acc, curr) => acc + curr.modules.length, 0) + mIdx,
            lIndexInM: lIdx
          });
        });
      });
    });
    setFlatLessons(list);
  }, [allPhases]);

  // Load progress on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(progressKey);
      if (saved) {
        try {
          setCompletedLessons(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [progressKey]);

  // Sync state coordinates to URL search parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mParam = parseInt(urlParams.get("m"));
    const lParam = parseInt(urlParams.get("l"));

    let targetM = 0;
    let targetL = 0;
    
    let totalModules = 0;
    allPhases.forEach(p => { totalModules += p.modules.length; });

    if (!isNaN(mParam) && mParam >= 0 && mParam < totalModules) {
      targetM = mParam;
    }
    
    let currentModule = null;
    let tempMIdx = 0;
    for (let p = 0; p < allPhases.length; p++) {
      for (let m = 0; m < allPhases[p].modules.length; m++) {
        if (tempMIdx === targetM) {
          currentModule = allPhases[p].modules[m];
          break;
        }
        tempMIdx++;
      }
      if (currentModule) break;
    }

    if (currentModule && !isNaN(lParam) && lParam >= 0 && lParam < currentModule.lessons.length) {
      targetL = lParam;
    }

    setActiveModuleIdx(targetM);
    setActiveLessonIdx(targetL);
  }, [allPhases]);

  // Scroll to top when active lesson changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeModuleIdx, activeLessonIdx]);

  // Select lesson navigation handler
  const selectLesson = (mIdx, lIdx) => {
    setActiveModuleIdx(mIdx);
    setActiveLessonIdx(lIdx);
    setActiveTab("curriculum");
    setIsSidebarOpen(false);
    
    // Update URL query parameters
    const urlParams = new URLSearchParams();
    urlParams.set("m", mIdx.toString());
    urlParams.set("l", lIdx.toString());
    window.history.pushState(null, "", `?${urlParams.toString()}`);
  };

  // Toggle checklist complete state
  const toggleComplete = (lessonId) => {
    let nextList;
    if (completedLessons.includes(lessonId)) {
      nextList = completedLessons.filter(id => id !== lessonId);
    } else {
      nextList = [...completedLessons, lessonId];
    }
    setCompletedLessons(nextList);
    localStorage.setItem(progressKey, JSON.stringify(nextList));
  };

  // Resolve total lessons across all phases
  let totalLessonsCount = flatLessons.length;
  const progressPercent = totalLessonsCount > 0 
    ? Math.round((completedLessons.length / totalLessonsCount) * 100) 
    : 0;

  // Resolve current active lesson components
  let activePhase = null;
  let activeModule = null;
  let activeLesson = null;

  let currentGlobalModuleIdx = 0;
  for (let p = 0; p < allPhases.length; p++) {
    const phase = allPhases[p];
    for (let m = 0; m < phase.modules.length; m++) {
      const module = phase.modules[m];
      if (currentGlobalModuleIdx === activeModuleIdx) {
        activePhase = phase;
        activeModule = module;
        activeLesson = module.lessons[activeLessonIdx] || null;
        break;
      }
      currentGlobalModuleIdx++;
    }
    if (activeLesson) break;
  }

  // Prev / Next logic
  const handlePrev = () => {
    if (!flatLessons.length || !activeLesson) return;
    const currentFlatIdx = flatLessons.findIndex(l => l.id === activeLesson.id);
    if (currentFlatIdx > 0) {
      const prev = flatLessons[currentFlatIdx - 1];
      selectLesson(prev.mIndexInAll, prev.lIndexInM);
    }
  };

  const handleNext = () => {
    if (!flatLessons.length || !activeLesson) return;
    const currentFlatIdx = flatLessons.findIndex(l => l.id === activeLesson.id);
    if (currentFlatIdx >= 0 && currentFlatIdx < flatLessons.length - 1) {
      const next = flatLessons[currentFlatIdx + 1];
      selectLesson(next.mIndexInAll, next.lIndexInM);
    }
  };

  const hasPrev = () => {
    if (!flatLessons.length || !activeLesson) return false;
    const idx = flatLessons.findIndex(l => l.id === activeLesson.id);
    return idx > 0;
  };

  const hasNext = () => {
    if (!flatLessons.length || !activeLesson) return false;
    const idx = flatLessons.findIndex(l => l.id === activeLesson.id);
    return idx >= 0 && idx < flatLessons.length - 1;
  };

  // String parsing method adding inline code styling and bold text tags
  const parseInlineStyles = (htmlText) => {
    if (!htmlText) return "";
    
    // Parse single backticks `code`
    const parts = htmlText.split(/`([^`]+)`/g);
    return parts.flatMap((part, index) => {
      if (index % 2 === 1) {
        return (
          <code key={`code-${index}`} className="rounded px-1.5 py-0.5 font-mono text-[11px] mx-0.5 whitespace-nowrap" style={{ backgroundColor: "var(--bg-code)", border: "1px solid var(--border-primary)", color: "var(--text-accent)" }}>
            {part}
          </code>
        );
      }
      
      // For non-code segments, parse **bold** text
      const boldParts = part.split(/\*\*([^*]+)\*\*/g);
      return boldParts.map((subPart, subIndex) => {
        if (subIndex % 2 === 1) {
          return (
            <strong key={`bold-${index}-${subIndex}`} className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {subPart}
            </strong>
          );
        }
        return subPart;
      });
    });
  };

  // Custom text formatter parsing ### headers, lists, code panels, and tables
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split("\n");
    const elements = [];
    
    let currentBlockType = null; // null | "paragraph" | "list" | "code" | "table" | "note"
    let currentBlockLines = [];

    const flushBlock = (nextKey) => {
      if (currentBlockLines.length === 0) return;

      const blockText = currentBlockLines.join("\n").trim();
      if (!blockText) {
        currentBlockLines = [];
        return;
      }

      if (currentBlockType === "paragraph") {
        elements.push(
          <p key={nextKey} className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
            {parseInlineStyles(blockText)}
          </p>
        );
      } else if (currentBlockType === "note") {
        elements.push(
          <div key={nextKey} className="my-6 rounded-r-xl border-l-4 border-l-amber-500 p-5 shadow-sm text-sm leading-relaxed" style={{ backgroundColor: "var(--note-bg)", color: "var(--note-text)" }}>
            {parseInlineStyles(blockText)}
          </div>
        );
      } else if (currentBlockType === "list") {
        elements.push(
          <div key={nextKey} className="my-5 space-y-2.5 pl-1">
            {currentBlockLines.map((line, lIdx) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;

              const leadingSpaces = line.search(/\S/);
              const isSubItem = leadingSpaces > 2;

              if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
                const cleanLine = trimmedLine.replace(/^[\*\-]\s+/, "");
                return (
                  <div 
                    key={lIdx} 
                    className="flex items-start text-sm leading-relaxed"
                    style={{ color: isSubItem ? "var(--text-muted)" : "var(--text-secondary)", paddingLeft: isSubItem ? "1.5rem" : "0.25rem", marginTop: isSubItem ? "0.25rem" : 0, fontSize: isSubItem ? "13px" : undefined }}
                  >
                    <span className="mr-2 font-bold select-none" style={{ color: "var(--accent-primary)" }}>•</span>
                    <span className="flex-1">{parseInlineStyles(cleanLine)}</span>
                  </div>
                );
              }

              const numberMatch = trimmedLine.match(/^(\d+)\.\s+/);
              if (numberMatch) {
                const cleanLine = trimmedLine.replace(/^\d+\.\s+/, "");
                return (
                  <div 
                    key={lIdx} 
                    className="flex items-start text-sm leading-relaxed"
                    style={{ color: isSubItem ? "var(--text-muted)" : "var(--text-secondary)", paddingLeft: isSubItem ? "1.5rem" : "0.25rem", marginTop: isSubItem ? "0.25rem" : 0, fontSize: isSubItem ? "13px" : undefined }}
                  >
                    <span className="mr-2.5 font-bold select-none" style={{ color: "var(--text-accent)" }}>{numberMatch[1]}.</span>
                    <span className="flex-1">{parseInlineStyles(cleanLine)}</span>
                  </div>
                );
              }

              return (
                <div 
                  key={lIdx} 
                  className="text-sm leading-relaxed"
                  style={{ color: isSubItem ? "var(--text-muted)" : "var(--text-secondary)", paddingLeft: isSubItem ? "1.5rem" : "1.25rem", marginTop: "0.25rem", fontSize: isSubItem ? "13px" : undefined }}
                >
                  {parseInlineStyles(trimmedLine)}
                </div>
              );
            })}
          </div>
        );
      } else if (currentBlockType === "code") {
        const codeText = currentBlockLines.join("\n");
        elements.push(
          <div key={nextKey} className="my-6 rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500" style={{ backgroundColor: "var(--bg-code)", border: "1px solid var(--border-primary)" }}>
            <div className="flex items-center justify-between pb-2 mb-3" style={{ borderBottom: "1px solid var(--border-primary)" }}>
              <span className="text-xs font-semibold tracking-wider font-sans capitalize" style={{ color: "var(--text-muted)" }}>Example Code</span>
              <button 
                onClick={() => navigator.clipboard.writeText(codeText)}
                className="rounded px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer"
                style={{ backgroundColor: "var(--bg-badge)", border: "1px solid var(--border-accent)", color: "var(--text-accent)" }}
              >
                Copy Code
              </button>
            </div>
            <div className="rounded-lg p-4 overflow-x-auto" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
              <pre className="font-mono text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                <code>{codeText}</code>
              </pre>
            </div>
          </div>
        );
      } else if (currentBlockType === "table") {
        const rows = currentBlockLines.map(r => r.split("|").map(c => c.trim()).filter(c => c !== ""));
        const headers = rows[0] || [];
        const bodyRows = rows.slice(2); // Skip separator row

        elements.push(
          <div key={nextKey} className="overflow-x-auto my-5 rounded-xl shadow-sm" style={{ border: "1px solid var(--border-primary)" }}>
            <table className="min-w-full text-left text-xs" style={{ borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-muted)" }}>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-semibold" style={{ borderBottom: "1px solid var(--border-primary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: "1px solid var(--border-primary)" }}>
                    {row.map((val, vIdx) => (
                      <td key={vIdx} className="px-4 py-3 leading-relaxed">{parseInlineStyles(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      currentBlockLines = [];
      currentBlockType = null;
    };

    let inCodeFence = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle Code Fences
      if (trimmedLine.startsWith("@@@") || trimmedLine.startsWith("```")) {
        if (inCodeFence) {
          inCodeFence = false;
          flushBlock(`block-${i}`);
        } else {
          flushBlock(`block-${i}`);
          inCodeFence = true;
          currentBlockType = "code";
        }
        continue;
      }

      if (inCodeFence) {
        currentBlockLines.push(line);
        continue;
      }

      // Handle Headers
      if (trimmedLine.startsWith("### ")) {
        flushBlock(`block-${i}`);
        elements.push(
          <h3 key={`h3-${i}`} className="text-2xl font-bold font-display mt-8 mb-4 pb-2" style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-primary)" }}>
            {trimmedLine.replace("### ", "")}
          </h3>
        );
        continue;
      }

      if (trimmedLine.startsWith("#### ")) {
        flushBlock(`block-${i}`);
        elements.push(
          <h4 key={`h4-${i}`} className="text-base font-bold font-display mt-6 mb-3 tracking-normal normal-case" style={{ color: "var(--text-primary)" }}>
            {trimmedLine.replace("#### ", "")}
          </h4>
        );
        continue;
      }

      // Handle Empty lines
      if (!trimmedLine) {
        if (currentBlockType === "paragraph" || currentBlockType === "note") {
          flushBlock(`block-${i}`);
        }
        continue;
      }

      // Handle list items
      const isListItem = trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ") || /^\d+\.\s+/.test(trimmedLine);
      if (isListItem) {
        if (currentBlockType !== "list") {
          flushBlock(`block-${i}`);
          currentBlockType = "list";
        }
        currentBlockLines.push(line);
        continue;
      }

      // Handle table rows
      if (trimmedLine.startsWith("|")) {
        if (currentBlockType !== "table") {
          flushBlock(`block-${i}`);
          currentBlockType = "table";
        }
        currentBlockLines.push(trimmedLine);
        continue;
      }

      // Handle Notes / Alerts
      const isNoteLine = 
        trimmedLine.startsWith("Important:") ||
        trimmedLine.startsWith("Note:") ||
        trimmedLine.startsWith("Warning:") ||
        trimmedLine.startsWith("Analogy:") ||
        trimmedLine.startsWith("Key Concepts") ||
        trimmedLine.startsWith("Key insight:");

      if (isNoteLine) {
        flushBlock(`block-${i}`);
        currentBlockType = "note";
        currentBlockLines.push(trimmedLine);
        continue;
      }

      // Otherwise, it is a paragraph line
      if (currentBlockType !== "paragraph") {
        flushBlock(`block-${i}`);
        currentBlockType = "paragraph";
      }
      currentBlockLines.push(trimmedLine);
    }

    flushBlock(`block-final`);

    return elements;
  };

  // Helper checking if a widget should render for specific lesson IDs
  const renderLessonWidget = (lessonId) => {
    if (!lessonId) return null;
    
    // HTML/CSS live sandboxes
    if (lessonId === "wd-l-1-2" || lessonId === "wd-l-3-1") {
      return (
        <div className="my-8">
          <HtmlCssSandbox />
        </div>
      );
    }
    
    // Flexbox visual lab
    if (lessonId === "wd-l-7-1") {
      return (
        <div className="my-8">
          <FlexboxLab />
        </div>
      );
    }
    
    // JS DOM visual state debugger
    if (lessonId === "wd-l-12-2") {
      return (
        <div className="my-8">
          <JsDomDebugger />
        </div>
      );
    }

    // React State & Props Lab
    if (lessonId === "r-l-2-1" || lessonId === "r-l-1-3") {
      return (
        <div className="my-8">
          <ReactStatePropsLab />
        </div>
      );
    }

    // Express Controller Sandbox
    if (lessonId === "nd-l-2-2" || lessonId === "nd-l-2-1") {
      return (
        <div className="my-8">
          <ExpressRestController />
        </div>
      );
    }

    // Next.js Routing Map
    if (lessonId === "n-l-1-2" || lessonId === "n-l-1-1") {
      return (
        <div className="my-8">
          <NextRouterMap />
        </div>
      );
    }

    // ML Spam Classifier
    if (
      lessonId === "l-2-1" || 
      lessonId === "l-2-2" || 
      lessonId === "ml-ai-l-2-1" || 
      lessonId === "ml-ai-l-2-2"
    ) {
      return (
        <div className="my-8">
          <ClassifierSandbox />
        </div>
      );
    }

    // Token Visualizer
    if (
      lessonId === "l-3-3" || 
      lessonId === "l-5-1" || 
      lessonId === "trending-tech-l-1-2"
    ) {
      return (
        <div className="my-8">
          <TokenVisualizer />
        </div>
      );
    }

    // Prompting Sandbox
    if (lessonId === "l-6-8" || lessonId === "l-6-1") {
      return (
        <div className="my-8">
          <PromptPlayground />
        </div>
      );
    }

    return null;
  };

  // Only render practice tab for web-development
  const hasPracticeTab = courseId === "web-development";

  if (loading && !course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="w-10 h-10 border-4 rounded-full border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--text-accent)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Loading course syllabus...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <h1 className="text-2xl font-black font-display">Course Not Found</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>The requested course could not be located in our registry.</p>
        <a href="/courses" className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md transition-all" style={{ background: "var(--accent-gradient)" }}>
          Back to Catalog
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r shadow-xl transition-transform duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border-primary)" }}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-5" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <a href="/" className="flex items-center space-x-2 text-lg font-bold font-display" style={{ color: "var(--text-primary)" }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-md" style={{ background: "var(--accent-gradient)" }}>
              <Sparkles size={16} />
            </div>
            <span>DMX Academy</span>
          </a>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1 hover:bg-slate-200/20 md:hidden"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Progress Indicators */}
        <div className="px-5 py-4 space-y-2" style={{ borderBottom: "1px solid var(--border-primary)", backgroundColor: "var(--bg-hover)" }}>
          <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            <span>Course Progress</span>
            <span>{completedLessons.length} / {totalLessonsCount} Lessons ({progressPercent}%)</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "var(--border-primary)" }}>
            <motion.div 
              className="h-full"
              style={{ background: "var(--accent-gradient)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 15 }}
            />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex px-2 py-2 gap-0.5 text-[11px] font-semibold border-b" style={{ borderColor: "var(--border-primary)" }}>
          <button
            onClick={() => { setActiveTab("curriculum"); setSearchQuery(""); }}
            className="flex-1 py-2 rounded-lg text-center transition-colors cursor-pointer"
            style={activeTab === "curriculum" ? { backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" } : { color: "var(--text-muted)" }}
          >
            Syllabus
          </button>
          {hasPracticeTab && (
            <button
              onClick={() => { setActiveTab("practice"); setSearchQuery(""); }}
              className="flex-1 py-2 rounded-lg text-center transition-colors cursor-pointer"
              style={activeTab === "practice" ? { backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" } : { color: "var(--text-muted)" }}
            >
              Practice
            </button>
          )}
          <button
            onClick={() => { setActiveTab("glossary"); setSearchQuery(""); }}
            className="flex-1 py-2 rounded-lg text-center transition-colors cursor-pointer"
            style={activeTab === "glossary" ? { backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" } : { color: "var(--text-muted)" }}
          >
            Glossary
          </button>
          <button
            onClick={() => { setActiveTab("resources"); setSearchQuery(""); }}
            className="flex-1 py-2 rounded-lg text-center transition-colors cursor-pointer"
            style={activeTab === "resources" ? { backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" } : { color: "var(--text-muted)" }}
          >
            Resources
          </button>
        </div>

        {/* Search Input bar */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={
                activeTab === "curriculum" 
                  ? "Search topics..." 
                  : activeTab === "glossary" 
                    ? "Search keywords..." 
                    : "Search resources..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:outline-none transition-all border"
              style={{
                backgroundColor: "var(--bg-input)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* Collapsible Syllabus/Glossary List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          
          {/* CURRICULUM DISPLAY */}
          {activeTab === "curriculum" && (() => {
            let globalMIndex = 0;
            return allPhases.map((phase, pIdx) => {
              const filteredModules = phase.modules.map(module => {
                const matchedLessons = module.lessons.filter(lesson => 
                  lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  lesson.summary.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return { ...module, matchedLessons };
              }).filter(m => searchQuery === "" || m.matchedLessons.length > 0);

              if (searchQuery !== "" && filteredModules.length === 0) return null;

              return (
                <div key={phase.id} className="space-y-2.5 pb-3 border-b" style={{ borderColor: "var(--border-primary)" }}>
                  <h4 className="text-[10px] font-bold tracking-wider px-2 capitalize" style={{ color: "var(--text-muted)" }}>
                    {phase.title}
                  </h4>
                  
                  <div className="space-y-1.5">
                    {phase.modules.map((module, mIdx) => {
                      const modIndex = globalMIndex;
                      globalMIndex++; 

                      const matchedLessons = module.lessons.filter(lesson => 
                        searchQuery === "" ||
                        lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        lesson.summary.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      if (searchQuery !== "" && matchedLessons.length === 0) return null;

                      const isCurrentModule = activeModuleIdx === modIndex;

                      return (
                        <div key={module.id} className="space-y-1 rounded-xl p-1.5" style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--border-primary)" }}>
                          <button 
                            onClick={() => selectLesson(modIndex, 0)}
                            className="flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer"
                            style={isCurrentModule
                              ? { backgroundColor: "var(--bg-card)", color: "var(--text-accent)", border: "1px solid var(--border-accent)" }
                              : { color: "var(--text-primary)" }
                            }
                          >
                            <span className="truncate">{module.title.includes(": ") ? module.title.split(": ")[1] : module.title}</span>
                            <span className="text-[10px] font-semibold capitalize shrink-0" style={{ color: "var(--text-muted)" }}>{module.duration}</span>
                          </button>

                          {/* Lessons inside Module */}
                          <ul className="space-y-0.5 pl-1.5 pr-1.5 pb-1 pt-1">
                            {module.lessons.map((lesson, lIdx) => {
                              const isMatched = searchQuery === "" || 
                                lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                lesson.summary.toLowerCase().includes(searchQuery.toLowerCase());

                              if (!isMatched) return null;

                              const isCurrentLesson = activeModuleIdx === modIndex && activeLessonIdx === lIdx;
                              const isCompleted = completedLessons.includes(lesson.id);

                              return (
                                <li key={lesson.id}>
                                  <button
                                    onClick={() => selectLesson(modIndex, lIdx)}
                                    className="flex w-full items-center space-x-2 px-2.5 py-1.5 rounded-md text-left text-[11px] font-semibold transition-all cursor-pointer"
                                    style={isCurrentLesson
                                      ? { background: "var(--accent-gradient)", color: "#ffffff" }
                                      : { color: "var(--text-secondary)" }
                                    }
                                  >
                                    <span className="shrink-0">
                                      {isCompleted ? (
                                        <CheckCircle size={12} style={{ color: isCurrentLesson ? "#ffffff" : "var(--text-accent)" }} />
                                      ) : (
                                        <Circle size={12} style={{ color: "var(--text-muted)" }} />
                                      )}
                                    </span>
                                    <span className="truncate">{lesson.title}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}

          {/* GLOSSARY DISPLAY */}
          {activeTab === "glossary" && (() => {
            const filteredGlossary = glossary.filter(g =>
              g.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
              g.def.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <div className="space-y-3 px-2">
                {filteredGlossary.length === 0 ? (
                  <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No terms matched your search.</p>
                ) : (
                  filteredGlossary.map((g, idx) => (
                    <div key={idx} className="space-y-1 p-2 rounded-lg transition-colors border" style={{ backgroundColor: "var(--bg-hover)", borderColor: "var(--border-primary)" }}>
                      <h5 className="text-xs font-bold" style={{ color: "var(--text-accent)" }}>{g.term}</h5>
                      <p className="text-[10px] leading-normal" style={{ color: "var(--text-secondary)" }}>{g.def}</p>
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          {/* RESOURCES DISPLAY */}
          {activeTab === "resources" && (() => {
            return resourcesList.map((res, rIdx) => {
              const filteredItems = res.items.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.desc.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (searchQuery !== "" && filteredItems.length === 0) return null;

              return (
                <div key={rIdx} className="space-y-2 pb-3">
                  <h5 className="text-[11px] font-semibold capitalize tracking-wider px-2" style={{ color: "var(--text-muted)" }}>
                    {res.category}
                  </h5>
                  <div className="space-y-1.5">
                    {(searchQuery !== "" ? filteredItems : res.items).map((item, idx) => (
                      <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-2 rounded-lg transition-all border group"
                        style={{ backgroundColor: "var(--bg-hover)", borderColor: "var(--border-primary)" }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold transition-colors" style={{ color: "var(--text-primary)" }}>
                            {item.name}
                          </span>
                          <ExternalLink size={10} style={{ color: "var(--text-muted)" }} />
                        </div>
                        <p className="text-[10px] leading-normal" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                      </a>
                    ))}
                  </div>
                </div>
              );
            });
          })()}

        </div>

        {/* Sidebar Footer Link to Catalog */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
          <a
            href="/courses"
            className="flex items-center justify-center space-x-1.5 rounded-lg py-2 text-xs font-semibold transition-colors shadow-sm"
            style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={12} />
            <span>Return to Course Catalog</span>
          </a>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Mobile Navbar Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-5 shadow-sm md:hidden" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <Menu size={22} />
            </button>
            <span className="font-bold text-sm font-display" style={{ color: "var(--text-primary)" }}>{title}</span>
          </div>
          <div className="h-2 w-24 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border-primary)" }}>
            <motion.div 
              className="h-full"
              style={{ background: "var(--accent-gradient)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 15 }}
            />
          </div>
        </header>

        {/* Main Tutorial Reader Panel */}
        <main ref={contentRef} className="flex-grow overflow-y-auto px-4 py-8 md:px-12 md:py-12" style={{ backgroundColor: "var(--bg-card)" }}>
          <div className="mx-auto max-w-3xl space-y-8">
            
            <AnimatePresence mode="wait">
              {activeTab === "curriculum" && activeLesson ? (
                <motion.div
                  key={`lesson-${activeLesson.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Phase & Module Breadcrumbs */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {activePhase?.title}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
                      {activeLesson.title}
                    </h1>
                  </div>

                  {/* Complete check-button box */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border" style={{ backgroundColor: "var(--bg-hover)", borderColor: "var(--border-primary)" }}>
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
                        <BookOpen size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{activeModule?.title}</p>
                        <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{activeLesson.time} read time</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleComplete(activeLesson.id)}
                      className="flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      style={
                        completedLessons.includes(activeLesson.id)
                          ? { backgroundColor: "var(--bg-badge)", border: "1px solid var(--border-accent)", color: "var(--text-accent)" }
                          : { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }
                      }
                    >
                      <CheckCircle2 size={14} className={completedLessons.includes(activeLesson.id) ? "text-indigo-500" : "text-slate-400"} />
                      <span>{completedLessons.includes(activeLesson.id) ? "Completed" : "Mark as Complete"}</span>
                    </button>
                  </div>

                  {/* Parsed Lesson Tutorial Content */}
                  <article className="prose max-w-none">
                    {renderFormattedText(activeLesson.content)}
                  </article>

                  {/* Injected Interactive Widget (if matched) */}
                  {renderLessonWidget(activeLesson.id)}

                  {/* Practice Exercise Highlight Panel */}
                  {activeLesson.exercise && (
                    <div className="rounded-xl p-5 space-y-3" style={{ border: "1px solid var(--border-accent)", backgroundColor: "var(--bg-badge)" }}>
                      <div className="flex items-center space-x-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--bg-hover)", color: "var(--text-accent)" }}>
                          <Award size={14} />
                        </div>
                        <h4 className="font-bold font-display text-sm" style={{ color: "var(--text-primary)" }}>Practice Challenge</h4>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {activeLesson.exercise}
                      </p>
                    </div>
                  )}

                  {/* Nav buttons for Prev / Next Lesson */}
                  <div className="flex items-center justify-between pt-8 mt-12 gap-4 animate-fade-in" style={{ borderTop: "1px solid var(--border-primary)" }}>
                    <button
                      onClick={handlePrev}
                      disabled={!hasPrev()}
                      className="flex items-center space-x-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
                    >
                      <ArrowLeft size={14} />
                      <span>Previous Lesson</span>
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!hasNext()}
                      className="flex items-center space-x-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{ background: "var(--accent-gradient)" }}
                    >
                      <span>Next Lesson</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ) : activeTab === "practice" && hasPracticeTab ? (
                <motion.div
                  key="practice"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="pt-2"
                >
                  <PracticePlayground />
                </motion.div>
              ) : activeTab === "glossary" ? (
                // FULL GLOSSARY TAB
                <motion.div
                  key="glossary"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6 pt-4"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
                      Course Glossary of Key Terms
                    </h1>
                    <p className="text-sm leading-normal" style={{ color: "var(--text-secondary)" }}>
                      Quickly look up key acronyms and terms mentioned throughout the {title} curriculum.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4">
                    {glossary.map((g, idx) => (
                      <div key={idx} className="p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ backgroundColor: "var(--bg-hover)", borderColor: "var(--border-primary)" }}>
                        <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text-accent)" }}>{g.term}</h3>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{g.def}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                // FULL RESOURCES TAB
                <motion.div
                  key="resources"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6 pt-4"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
                      Recommended Study Resources
                    </h1>
                    <p className="text-sm leading-normal" style={{ color: "var(--text-secondary)" }}>
                      Free online resources, reference guides, tools, and newsletters to support your {title} learning pathway.
                    </p>
                  </div>

                  <div className="space-y-8 pt-4">
                    {resourcesList.map((cat, cIdx) => (
                      <div key={cIdx} className="space-y-3">
                        <h3 className="text-xs font-bold tracking-wider border-b pb-1.5 capitalize font-sans" style={{ color: "var(--text-muted)", borderColor: "var(--border-primary)" }}>
                          {cat.category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cat.items.map((item, idx) => (
                            <a
                              key={idx}
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-col justify-between p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group"
                              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold group-hover:text-indigo-500 transition-colors" style={{ color: "var(--text-primary)" }}>
                                  <span>{item.name}</span>
                                  <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
                                </div>
                                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                              </div>
                              <span className="text-[10px] font-semibold mt-4 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--text-accent)" }}>
                                <span>Access Resource</span>
                                <ChevronRight size={10} />
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>
      </div>

    </div>
  );
}
