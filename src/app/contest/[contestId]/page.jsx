"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Send, BookOpen, Terminal,
  CheckCircle2, ChevronRight, Mic, RefreshCw,
  FileText, MessageCircle, ClipboardCheck, Palette, Trash2,
  Trophy, Clock, Lock, Flag, Volume2, XCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { wrapCodeForBackend } from "@/utils/codeWrapper";
import { getSocket } from "@/utils/socket";
import { getProblemTabs } from "@/utils/problemTabsData";


const getRandom = () => Math.random();
const getCurrentTime = () => Date.now();

// Lightweight syntax highlighting tokenizer for real-time editor overlay
function highlightCode(code, lang) {
  if (!code) return "";

  // Escape HTML tags to prevent broken code markup
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (lang === "javascript" || lang === "js") {
    const tokenRegex = /(\/\/.*)|("[^"]*"|'[^']*')|\b(while|for|if|else|function|return|let|const|var|new)\b|\b(console\.log|alert)\b|\b(\d+)\b/g;
    html = html.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
      if (comment) return `<span class="text-emerald-500 italic font-mono">${comment}</span>`;
      if (string) return `<span class="text-rose-400 font-mono">${string}</span>`;
      if (keyword) return `<span class="text-blue-400 font-bold font-mono">${keyword}</span>`;
      if (builtin) return `<span class="text-amber-400 font-semibold font-mono">${builtin}</span>`;
      if (number) return `<span class="text-purple-400 font-mono">${number}</span>`;
      return m;
    });
  } else if (lang === "python") {
    const tokenRegex = /(#.*)|("[^"]*"|'[^']*')|\b(while|for|if|else|def|return|import|from|as|in)\b|\b(print)\b|\b(\d+)\b/g;
    html = html.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
      if (comment) return `<span class="text-emerald-500 italic font-mono">${comment}</span>`;
      if (string) return `<span class="text-rose-400 font-mono">${string}</span>`;
      if (keyword) return `<span class="text-blue-400 font-bold font-mono">${keyword}</span>`;
      if (builtin) return `<span class="text-amber-400 font-semibold font-mono">${builtin}</span>`;
      if (number) return `<span class="text-purple-400 font-mono">${number}</span>`;
      return m;
    });
  } else if (lang === "go") {
    const tokenRegex = /(\/\/.*)|("[^"]*"|'[^']*')|\b(package|import|func|var|const|return|type|struct|interface|chan|select|case|default|if|else|for|range|switch|go|defer)\b|\b(fmt\.Println|fmt\.Printf|print|panic)\b|\b(\d+)\b/g;
    html = html.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
      if (comment) return `<span class="text-emerald-500 italic font-mono">${comment}</span>`;
      if (string) return `<span class="text-rose-400 font-mono">${string}</span>`;
      if (keyword) return `<span class="text-blue-400 font-bold font-mono">${keyword}</span>`;
      if (builtin) return `<span class="text-amber-400 font-semibold font-mono">${builtin}</span>`;
      if (number) return `<span class="text-purple-400 font-mono">${number}</span>`;
      return m;
    });
  } else if (lang === "cpp") {
    const tokenRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|\b(class|struct|public|private|protected|template|typename|void|int|double|float|bool|char|string|if|else|for|while|do|switch|case|default|return|new|delete|std|using|namespace|include|const|constexpr)\b|\b(cout|cin|endl|vector|map|set|unordered_map|unordered_set|queue|stack|pair|make_pair|push_back|size)\b|\b(\d+)\b/g;
    html = html.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
      if (comment) return `<span class="text-emerald-500 italic font-mono">${comment}</span>`;
      if (string) return `<span class="text-rose-400 font-mono">${string}</span>`;
      if (keyword) return `<span class="text-blue-400 font-bold font-mono">${keyword}</span>`;
      if (builtin) return `<span class="text-amber-400 font-semibold font-mono">${builtin}</span>`;
      if (number) return `<span class="text-purple-400 font-mono">${number}</span>`;
      return m;
    });
  } else if (lang === "java") {
    const tokenRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|\b(public|private|protected|class|interface|extends|implements|void|int|double|float|boolean|char|String|if|else|for|while|do|switch|case|default|return|new|import|package|static|final|this|super|throw|throws|try|catch)\b|\b(System\.out\.println|System\.out\.print|Math\.max|Math\.min|List|ArrayList|Map|HashMap|Set|HashSet)\b|\b(\d+)\b/g;
    html = html.replace(tokenRegex, (m, comment, string, keyword, builtin, number) => {
      if (comment) return `<span class="text-emerald-500 italic font-mono">${comment}</span>`;
      if (string) return `<span class="text-rose-400 font-mono">${string}</span>`;
      if (keyword) return `<span class="text-blue-400 font-bold font-mono">${keyword}</span>`;
      if (builtin) return `<span class="text-amber-400 font-semibold font-mono">${builtin}</span>`;
      if (number) return `<span class="text-purple-400 font-mono">${number}</span>`;
      return m;
    });
  }
  return html;
}

// Helper: returns auth bypass headers based on current session
function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("dmx_auth_token");
  const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
  if (hasRealToken) {
    return { "Authorization": `Bearer ${token}` };
  }

  // Dev bypass
  let bypassRole = "ADMIN";
  if (localStorage.getItem("synapse_mentor_session") === "true") bypassRole = "MENTOR";
  if (localStorage.getItem("synapse_student_session") === "true") bypassRole = "USER";

  let bypassUserId = null;
  const storedUser = localStorage.getItem("dmx_auth_user");
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.id && !String(u.id).startsWith("demo-") && !String(u.id).startsWith("local-")) {
        bypassUserId = String(u.id);
      }
    } catch (e) {}
  }

  return {
    "x-bypass-auth": "true",
    "x-bypass-role": bypassRole,
    ...(bypassUserId ? { "x-bypass-userid": bypassUserId } : {})
  };
}

export default function ContestWorkspace() {
  const params = useParams();
  const contestId = params.contestId;
  const { user, token, API_BASE } = useAuth();
  const [contest, setContest] = useState(null);
  const [loadingContest, setLoadingContest] = useState(true);

  // Contest lifecycle states
  const [contestStarted, setContestStarted] = useState(false);
  const [contestEnded, setContestEnded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startTimeStamp, setStartTimeStamp] = useState(null);
  const [userScore, setUserScore] = useState(0);
  const [solvedQuestions, setSolvedQuestions] = useState([]); // Array of question IDs solved
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [, setTick] = useState(0);

  // Anti-cheat: state variables
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationOverlay, setShowViolationOverlay] = useState(false);
  const [violationReason, setViolationReason] = useState("");
  const fullscreenRequestedRef = useRef(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Layout resize state
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const containerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(220); // height in pixels
  const [isConsoleResizing, setIsConsoleResizing] = useState(false);

  // Workspace tabs states
  const [activeLeftTab, setActiveLeftTab] = useState("description"); // description, followup, editorial, solution, evaluation, excalidraw
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [editorCodes, setEditorCodes] = useState({}); // Mapped as { [questionId_lang]: code }

  // Whiteboard Canvas states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#6366f1");
  const [lineWidth, setLineWidth] = useState(3);
  const drawingPaths = useRef([]); // To restore paths on resize

  // Console states
  const [activeConsoleTab, setActiveConsoleTab] = useState("testcase"); // testcase, result
  const [testcaseInputs, setTestcaseInputs] = useState([]); // Mapped by active question index
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionVerdict, setSubmissionVerdict] = useState(null); // null | { verdict, passed, executionTimeMs, passedTestCases, totalTestCases }
  const [finalScoreboard, setFinalScoreboard] = useState([]);

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false);
  const [voiceWaveform, setVoiceWaveform] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [voiceEnabled] = useState(true);
  const [finalElapsedTime, setFinalElapsedTime] = useState("0m 0s");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Code Editor Textarea Ref
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const highlightRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);

  // Terminate contest callback
  const finishContest = useCallback(async () => {
    if (!contest) return;
    setContestEnded(true);

    // Exit fullscreen when contest ends
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => { });
    }

    const elapsedSecs = startTimeStamp ? Math.floor((getCurrentTime() - startTimeStamp) / 1000) : 0;
    const elapsedMins = Math.floor(elapsedSecs / 60);
    const elapsedRemSecs = elapsedSecs % 60;
    const timeStr = `${elapsedMins}m ${elapsedRemSecs}s`;
    setFinalElapsedTime(timeStr);

    const userEntry = {
      rank: 1,
      username: "You",
      score: userScore,
      time: timeStr,
      isUser: true
    };

    const combinedLeaderboard = [...contest.leaderboard, userEntry];

    combinedLeaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const parseTimeToSecs = (str) => {
        const parts = str.match(/(\d+)m\s+(\d+)s/);
        if (parts) return parseInt(parts[1]) * 60 + parseInt(parts[2]);
        return 9999;
      };
      return parseTimeToSecs(a.time) - parseTimeToSecs(b.time);
    });

    const finalBoard = combinedLeaderboard.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    setFinalScoreboard(finalBoard);

    // Persist to localStorage
    if (typeof window !== "undefined") {
      const solvedList = localStorage.getItem("contest_solved_data");
      let list = {};
      if (solvedList) {
        try { list = JSON.parse(solvedList); } catch { }
      }
      list[contestId] = {
        score: userScore,
        time: timeStr,
        completed: true
      };
      localStorage.setItem("contest_solved_data", JSON.stringify(list));
    }

    // Persist completion to backend if this is a database contest
    const isNumeric = /^\d+$/.test(contestId);
    if (isNumeric) {
      try {
        await fetch(`${API_BASE}/api/contests/${contestId}/finish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          body: JSON.stringify({ score: userScore, timeSpent: timeStr })
        });
      } catch (err) {
        console.error("Failed to persist contest finish to backend:", err);
      }
    }
  }, [contest, contestId, startTimeStamp, userScore]);

  // Fetch contest metadata and linked problem definitions on mount / id change
  useEffect(() => {
    const fetchContestDetails = async () => {
      const isNumeric = /^\d+$/.test(contestId);

      if (isNumeric) {
        try {
          const res = await fetch(`${API_BASE}/api/contests/${contestId}`, {
            headers: getAuthHeaders(),
            signal: AbortSignal.timeout(30000)
          });
          const data = await res.json();
          if (data.success && data.contest) {
            const c = data.contest;

            // Map problems from the database relation
            const mappedProblems = c.contestProblems.map(cp => {
              const dbProb = cp.problem;
              const formattedDiff = dbProb.difficulty
                ? dbProb.difficulty.charAt(0) + dbProb.difficulty.slice(1).toLowerCase()
                : "Medium";

              return {
                id: dbProb.id,
                slug: dbProb.slug,
                title: dbProb.title,
                difficulty: formattedDiff,
                category: "Algorithms",
                points: cp.points,
                desc: dbProb.statement,
                inputFormat: dbProb.inputFormat,
                outputFormat: dbProb.outputFormat,
                constraints: dbProb.constraints,
                explanation: dbProb.explanation,
                testcases: (dbProb.testCases || []).filter(tc => tc.isSample).length > 0 
                  ? (dbProb.testCases || []).filter(tc => tc.isSample) 
                  : (dbProb.testCases && dbProb.testCases.length > 0 ? [dbProb.testCases[0]] : []),
                editorTemplates: {
                  javascript: dbProb.templateJS || `// Solve: ${dbProb.title}\nfunction solution() {\n    // Write your code here\n}`,
                  python: dbProb.templatePython || `# Solve: ${dbProb.title}\ndef solution():\n    # Write your code here\n    pass`,
                  go: dbProb.templateGo || `package main\n\nimport "fmt"\n\n// Solve: ${dbProb.title}\nfunc solution() {\n    // Write your code here\n    fmt.Println(0)\n}\n\nfunc main() {\n    solution()\n}`,
                  cpp: `// Solve: ${dbProb.title}\n#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}`,
                  java: `// Solve: ${dbProb.title}\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`
                },
                defaultLanguage: "python"
              };
            });

            // Calculate duration and dynamic contest states
            const start = new Date(c.startTime);
            const end = new Date(c.endTime);
            const now = new Date();

            const isCurrentlyActive = now >= start && now <= end;
            const isPast = now > end;

            const durationMins = Math.round((end - start) / 60000);

            // Calculate total points
            const totalPoints = c.contestProblems.reduce((sum, cp) => sum + cp.points, 0);

            // Construct mapped contest object
            const mappedContestObj = {
              id: c.id,
              title: c.title,
              desc: c.description || "No description provided.",
              durationMins,
              totalPoints,
              problems: mappedProblems,
              leaderboard: [],
              startTime: c.startTime,
              endTime: c.endTime
            };

            setContest(mappedContestObj);
            setLoadingContest(false);

            // Register participation in backend immediately upon entering/loading
            try {
              fetch(`${API_BASE}/api/contests/${contestId}/participate`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...getAuthHeaders()
                }
              });
            } catch (err) {
              console.error("Failed to auto-register participation:", err);
            }

            // Fetch dynamic username from session details
            let currentUsername = "You";
            if (typeof window !== "undefined") {
              if (localStorage.getItem("synapse_admin_session") === "true") {
                currentUsername = "Admin";
              } else if (localStorage.getItem("synapse_mentor_session") === "true") {
                currentUsername = "Mentor";
              } else if (localStorage.getItem("synapse_student_session") === "true") {
                currentUsername = "Student";
              }
            }

            // Automatically manage active or past contest states on load
            if (isCurrentlyActive) {
              const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));
              setSecondsLeft(remainingSeconds);
              setStartTimeStamp(start.getTime());
              setContestStarted(true);

              const initialCodes = {};
              mappedProblems.forEach(prob => {
                if (prob.editorTemplates) {
                  Object.keys(prob.editorTemplates).forEach(lang => {
                    initialCodes[`${prob.id}_${lang}`] = prob.editorTemplates[lang];
                  });
                }
              });
              setEditorCodes(initialCodes);

              if (mappedProblems[0]) {
                setTestcaseInputs(mappedProblems[0].testcases ? mappedProblems[0].testcases.map(t => t.input) : []);
                setSelectedLanguage(mappedProblems[0].defaultLanguage || "javascript");
              }
            } else if (isPast) {
              setContestStarted(true);
              setContestEnded(true);
              setSecondsLeft(0);

              const userEntry = {
                rank: 1,
                username: currentUsername,
                score: 0,
                time: "0m 0s",
                isUser: true
              };

              const combinedLeaderboard = [userEntry];
              const finalBoard = combinedLeaderboard.map((item, idx) => ({
                ...item,
                rank: idx + 1
              }));
              setFinalScoreboard(finalBoard);
            }

            return;
          }
        } catch (err) {
          console.error("Failed to fetch contest details from backend:", err);
        }
      }

      setContest(null);
      setLoadingContest(false);
    };

    fetchContestDetails();
  }, [contestId, API_BASE]);

  // ── Anti-Cheat: silent fullscreen lock + shortcut/right-click blocking ──
  useEffect(() => {
    if (!contestStarted || contestEnded) return;

    // Re-enter fullscreen state changes
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !contestEnded) {
        setViolationCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            finishContest();
          }
          return next;
        });
        setViolationReason("Fullscreen mode exited. You must remain in fullscreen during the contest.");
        setShowViolationOverlay(true);
      }
    };

    // When tab becomes visible again (user switched away and came back) — lock and warn
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !contestEnded) {
        setViolationCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            finishContest();
          }
          return next;
        });
        setViolationReason("Tab switched. Switching tabs or leaving the workspace is strictly prohibited.");
        setShowViolationOverlay(true);
      }
    };

    // When window loses focus (Alt+Tab or clicking outside) — lock and warn
    const handleWindowBlur = () => {
      if (!contestEnded) {
        setViolationCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            finishContest();
          }
          return next;
        });
        setViolationReason("Window focus lost. Do not switch applications or click outside the browser.");
        setShowViolationOverlay(true);
      }
    };

    // ── Block DevTools + Copy-Paste + AI shortcuts (Mac Option key etc.) ──
    const handleGlobalKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey; // Cmd on Mac, Ctrl on Windows
      const alt  = e.altKey;               // Option key on Mac
      const shift = e.shiftKey;
      const key = e.key;

      // ── Copy / Paste / Cut / Select-All ── (only block outside the code editor)
      const isCopyPaste =
        (ctrl && (key === "c" || key === "C")) ||   // Ctrl/Cmd+C  – Copy
        (ctrl && (key === "v" || key === "V")) ||   // Ctrl/Cmd+V  – Paste
        (ctrl && (key === "x" || key === "X")) ||   // Ctrl/Cmd+X  – Cut
        (ctrl && (key === "a" || key === "A"));     // Ctrl/Cmd+A  – Select All

      // ── DevTools shortcuts ──
      const isDevTools =
        key === "F12" ||
        (ctrl && shift && (key === "I" || key === "i")) ||
        (ctrl && shift && (key === "J" || key === "j")) ||
        // Ctrl+Shift+C is DevTools element picker AND a copy-like shortcut – always block
        (ctrl && shift && (key === "C" || key === "c")) ||
        (ctrl && (key === "U" || key === "u"));     // View Source

      // ── Tab / Window management shortcuts ──
      const isTabSwitch =
        (ctrl && key === "Tab") ||
        (ctrl && shift && key === "Tab") ||
        (ctrl && (key === "T" || key === "t")) ||   // New tab
        (ctrl && (key === "W" || key === "w")) ||   // Close tab
        (ctrl && (key === "N" || key === "n"));     // New window

      // ── AI-tool / Copilot / ChatGPT shortcuts ──
      // Ctrl+K  = ChatGPT, Copilot chat, VS Code command palette
      // Ctrl+Shift+A/L/P = Copilot/AI completions
      // F1 = VS Code command palette / help
      const isAIShortcut =
        (ctrl && (key === "K" || key === "k")) ||
        (ctrl && shift && (key === "A" || key === "a")) ||
        (ctrl && shift && (key === "L" || key === "l")) ||
        (ctrl && shift && (key === "P" || key === "p")) ||
        key === "F1";

      // ── Mac Option-key combos (Alt key on Windows) ──
      // Option+Space  = macOS Spotlight / ChatGPT desktop shortcut
      // Option+Cmd+I  = Safari DevTools
      // Alt+F4        = Close window (Windows)
      // Alt+Tab       = App switch (Windows / Linux)
      // Any Alt+letter combinations that open external AI tools
      const isMacOptionCombo =
        (alt && key === " ") ||                                      // Option/Alt + Space (ChatGPT desktop, Spotlight)
        (alt && (key === "F4" || key === "F4")) ||                   // Alt+F4 – close window
        (alt && key === "Tab") ||                                    // Alt+Tab – switch app
        (alt && ctrl && (key === "I" || key === "i")) ||             // Option+Cmd+I – Safari DevTools
        (alt && (key === "c" || key === "C")) ||                     // Alt+C – common AI chat shortcut
        (alt && (key === "g" || key === "G")) ||                     // Alt+G – Gemini shortcut
        (alt && (key === "p" || key === "P")) ||                     // Alt+P – GitHub Copilot panel
        (alt && (key === "l" || key === "L")) ||                     // Alt+L – various AI sidebars
        (alt && (key === "k" || key === "K")) ||                     // Alt+K – AI chat
        (alt && (key === "z" || key === "Z"));                       // Alt+Z – Perplexity / wrap toggle

      // ── Browser print (Ctrl+P) — can be used to screenshot/export ──
      const isPrint = ctrl && (key === "p" || key === "P") && !shift;

      const blocked = isDevTools || isTabSwitch || isAIShortcut || isMacOptionCombo || isPrint;

      // Copy-paste gets a softer block: only block if focus is NOT in the code textarea
      const focusedElement = document.activeElement;
      const isInCodeEditor =
        focusedElement &&
        (focusedElement.tagName === "TEXTAREA" || focusedElement.tagName === "INPUT") &&
        (focusedElement.dataset.role === "code-editor" || focusedElement.classList.contains("code-editor-textarea"));

      const shouldBlockCopyPaste = isCopyPaste && !isInCodeEditor;

      if (blocked || shouldBlockCopyPaste) {
        e.preventDefault();
        e.stopPropagation();
        setViolationCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            finishContest();
          }
          return next;
        });

        let reason = `Forbidden keyboard shortcut/action detected (Key: ${key}).`;
        if (isMacOptionCombo) {
          reason = "Mac Option/Alt key shortcut blocked. External AI tools are not permitted during contests.";
        } else if (shouldBlockCopyPaste) {
          reason = "Copy/Paste outside the code editor is not allowed during the contest.";
        } else if (isPrint) {
          reason = "Printing/screenshot shortcuts are disabled during the contest.";
        }
        setViolationReason(reason);
        setShowViolationOverlay(true);
      }
    };

    // ── Block paste events on the document (catches external clipboard paste) ──
    const handlePaste = (e) => {
      const focusedElement = document.activeElement;
      const isInCodeEditor =
        focusedElement &&
        (focusedElement.tagName === "TEXTAREA" || focusedElement.tagName === "INPUT") &&
        (focusedElement.dataset.role === "code-editor" || focusedElement.classList.contains("code-editor-textarea"));

      if (!isInCodeEditor) {
        e.preventDefault();
        e.stopPropagation();
        setViolationCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            finishContest();
          }
          return next;
        });
        setViolationReason("Pasting content outside the code editor is not allowed during the contest.");
        setShowViolationOverlay(true);
      }
    };

    // ── Silently block right-click (prevents Inspect Element) ──
    const handleContextMenu = (e) => {
      e.preventDefault();
      setViolationCount(prev => {
        const next = prev + 1;
        if (next >= 3) {
          finishContest();
        }
        return next;
      });
      setViolationReason("Right-click context menu is disabled during the contest.");
      setShowViolationOverlay(true);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("keydown", handleGlobalKeyDown, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("keydown", handleGlobalKeyDown, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestStarted, contestEnded, finishContest]);

  // Real-time leaderboard WebSocket updates
  useEffect(() => {
    if (!contestId) return;

    const socket = getSocket();
    if (socket) {
      socket.emit("joinContest", contestId);

      socket.on("contestLeaderboardUpdate", (data) => {
        if (String(data.contest.id) === String(contestId)) {
          const formatted = data.leaderboard.map((item, index) => ({
            rank: index + 1,
            username: item.user.username,
            score: item.totalScore,
            time: `${Math.round(item.totalExecutionTime / 1000)}s`
          }));
          setFinalScoreboard(formatted);
          setContest(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              leaderboard: formatted
            };
          });
        }
      });

      return () => {
        socket.emit("leaveContest", contestId);
        socket.off("contestLeaderboardUpdate");
      };
    }
  }, [contestId]);

  // Sync timer countdown clock
  useEffect(() => {
    if (!contestStarted || contestEnded || secondsLeft <= 0) {
      if (secondsLeft === 0 && contestStarted && !contestEnded) {
        setTimeout(() => {
          finishContest();
        }, 0);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [contestStarted, contestEnded, secondsLeft, finishContest]);

  // Sync clock tick for upcoming contests to enable the start button on time
  useEffect(() => {
    if (contestStarted || contestEnded) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [contestStarted, contestEnded]);

  const activeQuestion = contest ? contest.problems[activeQuestionIdx] : null;
  const currentCodeKey = activeQuestion ? `${activeQuestion.id}_${selectedLanguage}` : "";
  const currentCode = editorCodes[currentCodeKey] || "";

  // Sync lines count for editor line numbers
  useEffect(() => {
    const lines = currentCode.split("\n").length;
    setTimeout(() => {
      setLineCount(lines || 1);
    }, 0);
  }, [currentCode]);

  // Whiteboard sketch background helper
  const drawCanvasBackground = (canvas, ctx) => {
    ctx.strokeStyle = "rgba(100, 116, 139, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  };

  // Whiteboard paths restorer
  const restoreDrawing = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    drawingPaths.current.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      path.points.forEach((pt, i) => {
        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      });
      ctx.stroke();
    });
  };

  // Excalidraw canvas refresh
  useEffect(() => {
    if (activeLeftTab === "excalidraw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const updateCanvasSize = () => {
        if (!canvasRef.current) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 400; // Match CSS height of h-[400px]

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = lineWidth;

        drawCanvasBackground(canvas, ctx);
        restoreDrawing();
      };

      updateCanvasSize();

      window.addEventListener("resize", updateCanvasSize);
      return () => {
        window.removeEventListener("resize", updateCanvasSize);
      };
    }
  }, [activeLeftTab, drawColor, lineWidth, leftWidth]);

  // Clean speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // EARLY CONDITIONAL RETURNS
  if (loadingContest) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 rounded-full border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--text-accent)" }} />
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Loading contest workspace...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4" style={{ backgroundColor: "var(--bg-primary)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Contest Not Found</h2>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>The contest you are trying to access does not exist or has been deleted.</p>
        <Link href="/contest" className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: "var(--accent-gradient)" }}>
          Back to Contest Arena
        </Link>
      </div>
    );
  }

  // Initialize workspace when contest starts
  const startContest = () => {
    if (!contest) return;

    // \u2500\u2500 Fullscreen MUST be the very first call \u2014 before any setState \u2500\u2500
    // Browser user-gesture context is consumed by the first async operation.
    // Using .then() keeps this non-blocking while the rest of setup continues.
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => { fullscreenRequestedRef.current = true; })
        .catch(() => { /* denied in some browsers/environments */ });
    } else {
      fullscreenRequestedRef.current = true;
    }

    setSecondsLeft(contest.durationMins * 60);
    setStartTimeStamp(getCurrentTime());

    const initialCodes = {};
    contest.problems.forEach(prob => {
      if (prob.editorTemplates) {
        // Ensure Go template exists for all problems
        if (!prob.editorTemplates.go) {
          prob.editorTemplates.go = `package main\n\nimport "fmt"\n\n// Solve: ${prob.title}\nfunc solution() {\n    // Write your Go code here\n    fmt.Println(0)\n}\n\nfunc main() {\n    solution()\n}`;
        }
        Object.keys(prob.editorTemplates).forEach(lang => {
          initialCodes[`${prob.id}_${lang}`] = prob.editorTemplates[lang];
        });
      }
    });
    setEditorCodes(initialCodes);

    if (contest.problems[0]) {
      setTestcaseInputs(
        contest.problems[0].testcases ? contest.problems[0].testcases.map(t => t.input) : []
      );
      setSelectedLanguage(contest.problems[0].defaultLanguage || "javascript");
    }

    setContestStarted(true);

    // Register participation in backend (for numeric/database contests)
    const isNumeric = /^\d+$/.test(contestId);
    if (isNumeric) {
      fetch(`${API_BASE}/api/contests/${contestId}/participate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        }
      }).catch(err => console.error("Failed to register participation:", err));
    }
  };

  // Smart indentation + bracket auto-close key handler
  const handleEditorKeyDown = (e) => {
    const ta = e.target;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const code = currentCode;

    // ── Tab key: insert 4 spaces (or un-indent selected lines with Shift+Tab) ──
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Un-indent selected lines (or current line if no selection)
        const selStart = start !== end ? start : code.lastIndexOf("\n", start - 1) + 1;
        const selEnd = start !== end ? end : start;
        const before = code.substring(0, selStart);
        const selected = code.substring(selStart, selEnd);
        const after = code.substring(selEnd);
        const unindented = start !== end
          ? selected.replace(/^    /gm, "")
          : (selected.startsWith("    ") ? selected.slice(4) : selected.replace(/^ {1,4}/, ""));
        const diff = selected.length - unindented.length;
        const updated = before + unindented + after;
        setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = selStart;
            editorRef.current.selectionEnd = selEnd - diff;
          }
        }, 0);
      } else {
        // Insert 4 spaces at cursor position
        const updated = code.substring(0, start) + "    " + code.substring(end);
        setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 4;
          }
        }, 0);
      }
      return;
    }

    // ── Enter key: smart auto-indent (4-space levels) ──
    if (e.key === "Enter") {
      e.preventDefault();
      // Find the current line's leading whitespace
      const lineStart = code.lastIndexOf("\n", start - 1) + 1;
      const currentLine = code.substring(lineStart, start);
      const leadingWhitespace = currentLine.match(/^(\s*)/)[1];

      // Check if the character just before cursor opens a new block
      const charBefore = code[start - 1];
      const charAfter = code[start];
      const opensBlock = charBefore === "{" || charBefore === ":" || charBefore === "(" || charBefore === "[";
      const closingPair = { "{": "}", "(": ")", "[": "]" };
      const matchingClose = closingPair[charBefore];

      let newCode;
      let newCursor;

      if (opensBlock && matchingClose && charAfter === matchingClose) {
        // Cursor between { } — add indented line + closing brace on its own line
        const inner = "\n" + leadingWhitespace + "    ";
        const outer = "\n" + leadingWhitespace;
        newCode = code.substring(0, start) + inner + outer + code.substring(end);
        newCursor = start + inner.length;
      } else if (opensBlock) {
        // Line ends with block opener — indent one level deeper (4 spaces)
        const indent = "\n" + leadingWhitespace + "    ";
        newCode = code.substring(0, start) + indent + code.substring(end);
        newCursor = start + indent.length;
      } else {
        // Normal enter — keep same indentation
        const indent = "\n" + leadingWhitespace;
        newCode = code.substring(0, start) + indent + code.substring(end);
        newCursor = start + indent.length;
      }

      setEditorCodes(prev => ({ ...prev, [currentCodeKey]: newCode }));
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = newCursor;
        }
      }, 0);
      return;
    }

    // ── Auto-close brackets and quotes ──
    const autoPairs = { "{": "}", "(": ")", "[": "]" };
    if (autoPairs[e.key] && start === end) {
      e.preventDefault();
      const close = autoPairs[e.key];
      const updated = code.substring(0, start) + e.key + close + code.substring(end);
      setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 1;
        }
      }, 0);
      return;
    }

    // ── Skip over existing closing bracket if typed ──
    const closingChars = ["}", ")", "]"];
    if (closingChars.includes(e.key) && code[start] === e.key && start === end) {
      e.preventDefault();
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 1;
        }
      }, 0);
      return;
    }

    // ── Backspace: remove auto-paired empty bracket pair ──
    if (e.key === "Backspace" && start === end && start > 0) {
      const pairOpeners = { "}": "{", ")": "(", "]": "[" };
      const prevChar = code[start - 1];
      const nextChar = code[start];
      if (autoPairs[prevChar] && autoPairs[prevChar] === nextChar) {
        e.preventDefault();
        const updated = code.substring(0, start - 1) + code.substring(start + 1);
        setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = editorRef.current.selectionEnd = start - 1;
          }
        }, 0);
        return;
      }
    }
  };

  // Sync scroll between textarea, line numbers, and syntax highlight container
  const handleEditorScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop;
      highlightRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Paste handler: normalizes tabs and large indentation to 2-space style
  const handleEditorPaste = (e) => {
    e.preventDefault();
    const raw = (e.clipboardData || window.clipboardData).getData("text");
    if (!raw) return;

    // Step 1: convert tab characters to 4 spaces so we can measure uniformly
    let text = raw.replace(/\t/g, "    ");

    // Step 2: detect the predominant indent unit used in pasted code
    const indentSizes = text
      .split("\n")
      .map(line => { const m = line.match(/^( +)/); return m ? m[1].length : 0; })
      .filter(n => n > 0);

    const minIndent = indentSizes.length > 0 ? Math.min(...indentSizes) : 0;
    // Common indent units: 2 or 8 → re-normalise to 4 spaces per level
    const unitSize = [8, 2].find(u => minIndent > 0 && minIndent % u === 0) || 0;

    if (unitSize && unitSize !== 4) {
      text = text
        .split("\n")
        .map(line => {
          const m = line.match(/^( *)/);
          if (!m || m[1].length === 0) return line;
          const levels = Math.round(m[1].length / unitSize);
          return "    ".repeat(levels) + line.slice(m[1].length);
        })
        .join("\n");
    }

    // Step 3: insert at cursor position
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = currentCode.substring(0, start);
    const after = currentCode.substring(end);
    const updated = before + text + after;
    setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
    const newCursor = start + text.length;
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = newCursor;
      }
    }, 0);
  };

  const changeQuestion = (idx) => {
    setActiveQuestionIdx(idx);
    const targetProb = contest.problems[idx];
    if (targetProb) {
      setTestcaseInputs(targetProb.testcases.map(t => t.input));
      setSelectedLanguage(targetProb.defaultLanguage || "javascript");
      setTestResults(null);
      setActiveLeftTab("description");
    }
  };

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener("mousemove", resizePanes);
    document.addEventListener("mouseup", stopResizing);
  };

  const resizePanes = (e) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const percentage = (relativeX / containerRect.width) * 100;

    if (percentage > 20 && percentage < 80) {
      setLeftWidth(percentage);
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", resizePanes);
    document.removeEventListener("mouseup", stopResizing);
  };

  const startConsoleResizing = (e) => {
    e.preventDefault();
    setIsConsoleResizing(true);
    document.addEventListener("mousemove", resizeConsole);
    document.addEventListener("mouseup", stopConsoleResizing);
  };

  const resizeConsole = (e) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = containerRect.bottom - e.clientY;
    // Bound console height (e.g. between 80px and containerHeight - 150px)
    if (relativeY > 80 && relativeY < containerRect.height - 150) {
      setConsoleHeight(relativeY);
    }
  };

  const stopConsoleResizing = () => {
    setIsConsoleResizing(false);
    document.removeEventListener("mousemove", resizeConsole);
    document.removeEventListener("mouseup", stopConsoleResizing);
  };

  const startDrawing = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(x, y);

    drawingPaths.current.push({
      color: drawColor,
      width: lineWidth,
      points: [{ x, y }]
    });
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();

    const currentPath = drawingPaths.current[drawingPaths.current.length - 1];
    if (currentPath) {
      currentPath.points.push({ x, y });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingPaths.current = [];
    drawCanvasBackground(canvas, ctx);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Voice Assistant speech-to-text / speech synthesis simulator
  const askVoiceAssistant = (customQuery = "") => {
    if (isListening || assistantTyping) return;
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    const query = customQuery || "How do I optimize the code for performance?";
    setIsListening(true);
    setVoiceWaveform(true);

    setTimeout(() => {
      setIsListening(false);

      const newMessages = [...assistantMessages, { role: "user", text: query }];
      setAssistantMessages(newMessages);
      setAssistantTyping(true);

      let responseText = "To optimize your algorithms, check data structures. A nested search takes O(N²) quadratic time. Storing keys inside a dictionary hash table resolves lookups in linear time.";
      if (query.toLowerCase().includes("auth")) {
        responseText = "Remember: Authentication proves identity (401 code). Authorization tests user privileges (403 code). Validate role rules securely inside server scopes.";
      } else if (query.toLowerCase().includes("rate limit")) {
        responseText = "Distributing rate limit checks requires shared memory. Sliding Window Log utilizes Redis ZSET arrays, whereas sliding window counters optimize memory by keeping integers.";
      }

      setTimeout(() => {
        setAssistantTyping(false);
        setAssistantMessages(prev => [...prev, { role: "assistant", text: responseText }]);
        setVoiceWaveform(false);

        // Speech Synthesis
        if (voiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(responseText);

          setIsSpeaking(true);
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          utterance.onerror = () => {
            setIsSpeaking(false);
          };

          utterance.rate = 1.0;
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v => v.lang.includes("en-US")) || voices.find(v => v.lang.includes("en"));
          if (preferredVoice) utterance.voice = preferredVoice;
          window.speechSynthesis.speak(utterance);
        }
      }, 1500);

    }, 2000);
  };

  // Execution JS Sandboxed Test Runner
  const runCode = async () => {
    if (!activeQuestion) return;
    setIsRunning(true);
    setActiveConsoleTab("result");
    setTestResults([]);

    if (false && selectedLanguage === "javascript") {
      setTimeout(() => {
        const results = [];
        const originalConsoleLog = console.log;

        activeQuestion.testcases.forEach((tc, index) => {
          let passed = false;
          let output = "";
          let error = "";
          const runLogs = [];

          console.log = (...args) => {
            runLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
          };

          try {
            const funcNameMatch = currentCode.match(/function\s+(\w+)\s*\(/) || currentCode.match(/const\s+(\w+)\s*=\s*\(/);
            const functionName = funcNameMatch ? funcNameMatch[1] : null;

            if (!functionName) {
              throw new Error("Could not find a valid function declaration in your code.");
            }

            const evaluator = new Function(`${currentCode}; return ${functionName};`);
            const targetFunction = evaluator();

            let parsedInputs;
            if (activeQuestion.id === "rate-limiter" || activeQuestion.slug === "rate-limiter") {
              const mockRedis = {
                multi: () => {
                  const tx = {
                    zremrangebyscore: () => tx,
                    zcard: () => tx,
                    zadd: () => tx,
                    expire: () => tx,
                    exec: async () => [null, 2, null, null]
                  };
                  return tx;
                }
              };
              parsedInputs = [mockRedis, "user_123", 5, 60];
            } else {
              try {
                parsedInputs = JSON.parse(`[${testcaseInputs[index] || tc.input}]`);
              } catch {
                parsedInputs = [testcaseInputs[index] || tc.input];
              }
            }

            const actual = targetFunction(...parsedInputs);
            output = (actual !== undefined) ? JSON.stringify(actual) : "";

            if (typeof tc.assertion === "function") {
              passed = tc.assertion(currentCode, targetFunction);
            } else {
              // Dynamic problem validation: fallback to comparing expectedOutput with return val or console log outputs
              const cleanExpected = (tc.expectedOutput || tc.expected || "").toString().trim().replace(/\r/g, "");
              const cleanActual = (actual !== undefined ? actual : "").toString().trim().replace(/\r/g, "");
              const cleanLogs = runLogs.join("\n").trim().replace(/\r/g, "");

              passed = (cleanActual === cleanExpected) || (cleanLogs === cleanExpected);
            }
          } catch (e) {
            error = e.message;
            passed = false;
          }

          console.log = originalConsoleLog;

          results.push({
            name: tc.name || "Test Case",
            input: testcaseInputs[index] || tc.input,
            expected: tc.expected || tc.expectedOutput,
            actual: output || runLogs.join("\n"),
            passed,
            error,
            logs: runLogs
          });
        });

        setTestResults(results);
        setIsRunning(false);
      }, 1200);
    } else {
      // Call backend real-time run endpoint
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      };

      const mappedLang = selectedLanguage.toUpperCase();
      const isSchemaDriven = activeQuestion && activeQuestion.parameters && Array.isArray(activeQuestion.parameters) && activeQuestion.parameters.length > 0;
      const wrappedCode = isSchemaDriven ? currentCode : wrapCodeForBackend(activeQuestion.slug || activeQuestion.id, selectedLanguage, currentCode);

      try {
        const runPromises = activeQuestion.testcases.map(async (tc, index) => {
          const currentInput = testcaseInputs[index] || tc.input;
          const res = await fetch(`${API_BASE}/api/submissions/run`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              language: mappedLang,
              code: wrappedCode,
              input: currentInput,
              problemId: activeQuestion.id,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            throw new Error(`Execution failed with status ${res.status}`);
          }

          const data = await res.json();
          if (!data.success || !data.result) {
            throw new Error(data.message || "Failed to run code");
          }

          const runResult = data.result;
          const runLogs = [];
          if (runResult.error) {
            runLogs.push(runResult.error);
          }

          // Normalize expected and actual outputs to perform check
          const cleanExpected = (tc.expected || tc.expectedOutput || "").toString().trim().replace(/\r/g, "");
          const cleanActual = (runResult.output || "").toString().trim().replace(/\r/g, "");
          const passed = runResult.status === "SUCCESS" && (cleanActual === cleanExpected);

          return {
            name: tc.name || "Test Case",
            input: currentInput,
            expected: tc.expected || tc.expectedOutput,
            actual: runResult.output || "",
            passed,
            error: runResult.error || "",
            logs: runLogs,
          };
        });

        const completedResults = await Promise.all(runPromises);
        setTestResults(completedResults);
      } catch (e) {
        const fallbackResults = activeQuestion.testcases.map((tc, index) => ({
          name: tc.name || "Test Case",
          input: testcaseInputs[index] || tc.input,
          expected: tc.expected || tc.expectedOutput,
          actual: "",
          passed: false,
          error: e.message || "Network error",
          logs: ["Error running code: " + (e.message || "Network connection issue")]
        }));
        setTestResults(fallbackResults);
      }
      setIsRunning(false);
    }
  };

  // Submit flow — runs tests inline to avoid stale React state closure bug
  const submitCode = async () => {
    if (!activeQuestion) return;
    setIsSubmitting(true);
    setActiveConsoleTab("result");
    setTestResults([]);

    const langUpper = selectedLanguage.toUpperCase();
    const mappedLang = ["JAVASCRIPT", "PYTHON", "GO", "CPP", "JAVA"].includes(langUpper) ? langUpper : "CPP";
    const isSchemaDriven = activeQuestion && activeQuestion.parameters && Array.isArray(activeQuestion.parameters) && activeQuestion.parameters.length > 0;
    const wrappedCode = isSchemaDriven ? currentCode : wrapCodeForBackend(activeQuestion.slug || activeQuestion.id, selectedLanguage, currentCode);
    const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
    const headers = {
      "Content-Type": "application/json",
      ...(hasRealToken
        ? { Authorization: `Bearer ${token}` }
        : { "x-bypass-auth": "true", "x-bypass-role": "USER" }),
    };

    try {
      const res = await fetch(`${API_BASE}/api/submissions/problem/${activeQuestion.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          language: mappedLang,
          code: wrappedCode,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.submission) {
        throw new Error(data.message || `Submission failed with status ${res.status}`);
      }

      const verdict = data.submission.status;
      const isAccepted = verdict === "ACCEPTED";
      const judgeResult = data.submission.judgeResult || {};

      setTestResults([{
        name: "Official Judge",
        input: "Hidden and sample test cases",
        expected: "ACCEPTED",
        actual: verdict,
        passed: isAccepted,
        error: isAccepted ? "" : verdict.replace(/_/g, " "),
        logs: [`Execution time: ${data.submission.executionTime ?? 0} ms`],
      }]);

      // Trigger LeetCode-style verdict animation overlay
      setSubmissionVerdict({
        verdict,
        passed: isAccepted,
        executionTimeMs: data.submission.executionTime ?? 0,
        passedTestCases: judgeResult.passedTestCases ?? (isAccepted ? "All" : "-"),
        totalTestCases: judgeResult.totalTestCases ?? "-",
        results: judgeResult.results || [],
        stderr: judgeResult.stderr || "",
      });

      if (isAccepted) {
        triggerConfettiParticles();
        setSolvedQuestions(prev => {
          if (prev.includes(activeQuestion.id)) return prev;
          setUserScore(score => score + activeQuestion.points);
          return [...prev, activeQuestion.id];
        });
      }
    } catch (err) {
      setTestResults([{
        name: "Official Judge",
        input: "Hidden and sample test cases",
        expected: "ACCEPTED",
        actual: "SUBMISSION_FAILED",
        passed: false,
        error: err.message || "Could not submit to compiler.",
        logs: [],
      }]);
      setSubmissionVerdict({
        verdict: "SUBMISSION_FAILED",
        passed: false,
        executionTimeMs: 0,
        passedTestCases: 0,
        totalTestCases: activeQuestion?.testcases?.length || 0,
        results: [],
        stderr: err.message || "Could not submit to compiler."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Canvas Confetti generator
  const triggerConfettiParticles = () => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 9999;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#4f46e5", "#7c3aed", "#10b981", "#fbbf24", "#ef4444"];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height + 15,
        vx: (getRandom() - 0.5) * 12,
        vy: -getRandom() * 18 - 8,
        size: getRandom() * 6 + 4,
        color: colors[Math.floor(getRandom() * colors.length)],
        rotation: getRandom() * 360,
        rv: (getRandom() - 0.5) * 8
      });
    }

    const animateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.rv;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.y < canvas.height + 20) {
          active = true;
        }
      });

      if (active) {
        requestAnimationFrame(animateConfetti);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animateConfetti();
  };

  // finishContest was moved above, close to components initialization.

  if (!contest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <h1 className="text-2xl font-black font-display">Contest Not Found</h1>
        <Link href="/contest" className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md" style={{ background: "var(--accent-gradient)" }}>
          Back to Lobby
        </Link>
      </div>
    );
  }

  // Format countdown clock to rendering string MM:SS
  const formatTimer = () => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Render left pane tab contents
  const renderTabContent = () => {
    if (!activeQuestion) return null;

    // Normalize tabs mapping for custom dynamically loaded problems
    const problemTabs = getProblemTabs(activeQuestion.slug || activeQuestion.id, activeQuestion.title, {
      desc: activeQuestion.desc || activeQuestion.statement,
      inputFormat: activeQuestion.inputFormat,
      outputFormat: activeQuestion.outputFormat,
      constraints: activeQuestion.constraints,
      timeout: activeQuestion.timeLimitMs || activeQuestion.timeout,
      memoryLimit: activeQuestion.memoryLimitMb || activeQuestion.memoryLimit,
      followup: activeQuestion.followup,
      editorial: activeQuestion.editorial,
      solution: activeQuestion.solution,
      evaluation: activeQuestion.evaluation,
    });

    // Lock Solutions and Editorials during contest
    const isLockedTab = activeLeftTab === "editorial" || activeLeftTab === "solution";
    if (isLockedTab && !contestEnded) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-slate-500/5 border border-slate-500/10">
            <Lock size={20} className="text-[var(--text-muted)] animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">Tab Content Locked</h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
            Editorials and solutions are disabled during timed contests. They will unlock once you submit your final sheet.
          </p>
        </div>
      );
    }

    switch (activeLeftTab) {
      case "description":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problemTabs.description)}</div>;
      case "followup":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problemTabs.followup)}</div>;
      case "editorial":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problemTabs.editorial)}</div>;
      case "solution":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problemTabs.solution)}</div>;
      case "evaluation":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problemTabs.evaluation)}</div>;
      default:
        return null;
    }
  };

  const renderText = (markdownText) => {
    if (!markdownText) return null;

    const processInline = (str) => {
      const backtickParts = str.split(/`([^`]+)`/g);
      return backtickParts.flatMap((part, i) => {
        if (i % 2 === 1) {
          return (
            <code key={`code-${i}`} className="px-1.5 py-0.5 rounded font-mono text-xs mx-0.5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 font-semibold">
              {part}
            </code>
          );
        }
        const boldParts = part.split(/\*\*([^*]+)\*\*/);
        return boldParts.map((sub, j) => {
          if (j % 2 === 1) {
            return <strong key={`bold-${i}-${j}`} className="font-bold text-[var(--text-primary)]">{sub}</strong>;
          }
          return sub;
        });
      });
    };

    const lines = markdownText.split("\n");
    const blocks = [];
    let currentCodeBlock = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (currentCodeBlock) {
          blocks.push({ type: "code", content: currentCodeBlock.join("\n"), lang: trimmed.replace("```", "") });
          currentCodeBlock = null;
        } else {
          currentCodeBlock = [];
        }
        continue;
      }

      if (currentCodeBlock !== null) {
        currentCodeBlock.push(line);
        continue;
      }

      if (trimmed.startsWith("### ")) {
        blocks.push({ type: "h3", content: trimmed.replace("### ", "") });
      } else if (trimmed.startsWith("#### ")) {
        blocks.push({ type: "h4", content: trimmed.replace("#### ", "") });
      } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        blocks.push({ type: "bullet", content: trimmed.replace(/^[\*\-]\s+/, "") });
      } else if (!trimmed) {
        blocks.push({ type: "spacer" });
      } else {
        blocks.push({ type: "paragraph", content: line });
      }
    }

    return blocks.map((block, idx) => {
      if (block.type === "spacer") {
        return <div key={idx} className="h-3" />;
      }
      if (block.type === "h3") {
        return (
          <h3 key={idx} className="text-base font-extrabold font-display mt-6 mb-3 text-[var(--text-primary)] border-l-4 border-indigo-500 pl-3 pb-0.5 tracking-tight flex items-center">
            {block.content}
          </h3>
        );
      }
      if (block.type === "h4") {
        return (
          <h4 key={idx} className="text-xs font-black uppercase mt-5 mb-2 text-[var(--text-primary)] tracking-wider border-l-2 border-indigo-500/60 pl-2">
            {block.content}
          </h4>
        );
      }
      if (block.type === "bullet") {
        return (
          <div key={idx} className="flex items-start pl-4 space-x-2 my-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
            <span className="text-indigo-500 mt-1.5 text-[8px]">•</span>
            <span className="flex-1">{processInline(block.content)}</span>
          </div>
        );
      }
      if (block.type === "code") {
        return (
          <div key={idx} className="my-4 rounded-xl border border-indigo-500/10 dark:border-indigo-500/15 overflow-hidden shadow-[0_4px_12px_rgba(99,102,241,0.02)]">
            <div className="flex justify-between items-center px-4 py-1.5 border-b border-indigo-500/10 bg-indigo-500/5 text-[10px] text-indigo-400 font-mono font-semibold">
              <span>Example / Code Block</span>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-500/5 leading-relaxed whitespace-pre">
              <code>{block.content}</code>
            </pre>
          </div>
        );
      }
      return (
        <p key={idx} className="mb-2.5 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
          {processInline(block.content)}
        </p>
      );
    });
  };

  const isUpcoming = contest && contest.startTime && new Date() < new Date(contest.startTime);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>

      {/* ══════ Submit Contest Confirmation Overlay ══════ */}
      <AnimatePresence>
        {showSubmitConfirm && !contestEnded && (
          <motion.div
            key="submit-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(10, 10, 14, 0.8)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md p-8 rounded-3xl border border-indigo-500/20 shadow-2xl flex flex-col items-center text-center space-y-6"
              style={{
                background: "linear-gradient(135deg, rgba(20, 20, 25, 0.95), rgba(15, 15, 20, 0.95))",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)"
              }}
            >
              {/* Flag Icon */}
              <div className="h-16 w-16 rounded-full flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 shadow-lg">
                <Flag className="h-8 w-8 text-indigo-500" />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-white">Submit Contest?</h3>
                <p className="text-xs font-semibold text-indigo-400/95 uppercase tracking-wider">
                  Confirmation Required
                </p>
              </div>

              {/* Description */}
              <div className="p-4 w-full rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-left">
                <p className="text-xs text-indigo-200/80 leading-relaxed">
                  Are you sure you want to finish and submit your contest attempt? Once submitted, you cannot change your code or answer further questions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex w-full space-x-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-3 font-bold rounded-2xl text-xs text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-slate-500/5 active:scale-[0.98] transition-all cursor-pointer"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowSubmitConfirm(false);
                    await finishContest();
                  }}
                  className="flex-1 py-3 font-bold rounded-2xl text-xs text-white shadow-lg shadow-indigo-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)"
                  }}
                >
                  Yes, Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ Anti-Cheat Security Violation Overlay ══════ */}
      <AnimatePresence>
        {showViolationOverlay && !contestEnded && (
          <motion.div
            key="violation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backdropFilter: "blur(16px)", backgroundColor: "rgba(10, 10, 14, 0.85)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md p-8 rounded-3xl border border-rose-500/20 shadow-2xl flex flex-col items-center text-center space-y-6"
              style={{
                background: "linear-gradient(135deg, rgba(20, 20, 25, 0.95), rgba(15, 15, 20, 0.95))",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.15)"
              }}
            >
              {/* Warning Shield Icon */}
              <div className="h-16 w-16 rounded-full flex items-center justify-center bg-rose-500/10 border border-rose-500/20 shadow-lg">
                <Flag className="h-8 w-8 text-rose-500" />
              </div>

              {/* Threat Warning Title */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-white">Security Violation Detected</h3>
                <p className="text-xs font-medium text-rose-400/95 uppercase tracking-wider">
                  Warning {violationCount} of 3
                </p>
              </div>

              {/* Description */}
              <div className="p-4 w-full rounded-2xl bg-rose-500/5 border border-rose-500/10 text-left">
                <p className="text-sm font-semibold text-rose-200">Reason for warning:</p>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">{violationReason || "Tab switch or window blur detected."}</p>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] max-w-sm leading-normal">
                {violationCount >= 3
                  ? "You have exceeded the maximum of 3 warnings. Your contest will now be submitted and closed."
                  : "You are strictly prohibited from switching tabs, losing focus, or exiting fullscreen. Re-enter fullscreen to continue."
                }
              </p>

              {/* Action Button */}
              {violationCount < 3 && (
                <button
                  onClick={() => {
                    const el = document.documentElement;
                    el.requestFullscreen?.({ navigationUI: "hide" })
                      .then(() => {
                        setShowViolationOverlay(false);
                      })
                      .catch(err => {
                        console.error("Failed to re-enter fullscreen:", err);
                      });
                  }}
                  className="w-full py-3.5 font-bold rounded-2xl text-xs text-white shadow-lg shadow-rose-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
                  style={{
                    background: "linear-gradient(135deg, #f43f5e, #e11d48)"
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                  <span>Re-enter Fullscreen & Resume</span>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ LeetCode-style Submitting/Pending Overlay ══════ */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            key="submitting-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9997] flex items-center justify-center"
            style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.7)" }}
          >
            <JudgingOverlayContent
              selectedLanguage={selectedLanguage}
              currentCode={currentCode}
              user={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ LeetCode-style Submission Verdict Overlay ══════ */}
      <AnimatePresence>
        {submissionVerdict && (
          <motion.div
            key="verdict-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setSubmissionVerdict(null)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: submissionVerdict.passed ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background: submissionVerdict.passed
                    ? "linear-gradient(90deg,#10b981,#34d399)"
                    : "linear-gradient(90deg,#ef4444,#f87171)",
                }}
              />

              <div className="p-8 space-y-6">
                {/* Animated icon ring */}
                <div className="flex flex-col items-center space-y-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
                    className="relative"
                  >
                    {/* Outer glow ring */}
                    <motion.div
                      animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: submissionVerdict.passed
                          ? "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)"
                          : "radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)",
                        transform: "scale(1.8)",
                      }}
                    />
                    <div
                      className="h-20 w-20 rounded-full flex items-center justify-center text-white shadow-xl"
                      style={{
                        background: submissionVerdict.passed
                          ? "linear-gradient(135deg,#059669,#10b981)"
                          : "linear-gradient(135deg,#dc2626,#ef4444)",
                      }}
                    >
                      {submissionVerdict.passed ? (
                        <motion.svg
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                          width="38" height="38" viewBox="0 0 24 24" fill="none"
                          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <motion.polyline
                            points="20 6 9 17 4 12"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
                          />
                        </motion.svg>
                      ) : (
                        <motion.svg
                          width="36" height="36" viewBox="0 0 24 24" fill="none"
                          stroke="white" strokeWidth="2.5" strokeLinecap="round"
                        >
                          <motion.line x1="18" y1="6" x2="6" y2="18"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }} />
                          <motion.line x1="6" y1="6" x2="18" y2="18"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3, delay: 0.35 }} />
                        </motion.svg>
                      )}
                    </div>
                  </motion.div>

                  {/* Verdict label */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-center space-y-1"
                  >
                    <h2
                      className="text-2xl font-black tracking-tight"
                      style={{ color: submissionVerdict.passed ? "#10b981" : "#ef4444" }}
                    >
                      {submissionVerdict.passed ? "Accepted" : submissionVerdict.verdict.replace(/_/g, " ")}
                    </h2>
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {submissionVerdict.passed
                        ? "Your solution passed all test cases 🎉"
                        : "Your solution did not pass all test cases"}
                    </p>
                  </motion.div>
                </div>

                {/* Stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div
                    className="rounded-2xl p-3.5 border text-center space-y-1"
                    style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Test Cases</div>
                    <div className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                      {submissionVerdict.passedTestCases}
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                        {submissionVerdict.totalTestCases !== "-" ? `/${submissionVerdict.totalTestCases}` : ""}
                      </span>
                    </div>
                  </div>
                  <div
                    className="rounded-2xl p-3.5 border text-center space-y-1"
                    style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Runtime</div>
                    <div className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                      {submissionVerdict.executionTimeMs}
                      <span className="text-xs font-medium ml-0.5" style={{ color: "var(--text-muted)" }}>ms</span>
                    </div>
                  </div>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  className="flex space-x-3 pt-1"
                >
                  <button
                    onClick={() => setSubmissionVerdict(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all hover:opacity-80 cursor-pointer"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)" }}
                  >
                    Close
                  </button>
                  {submissionVerdict.passed && (
                    <button
                      onClick={() => { setSubmissionVerdict(null); setActiveConsoleTab("result"); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 cursor-pointer"
                      style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
                    >
                      View Details
                    </button>
                  )}
                  {!submissionVerdict.passed && (
                    <button
                      onClick={() => setSubmissionVerdict(null)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 cursor-pointer"
                      style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}
                    >
                      Try Again
                    </button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lobby entrance start screen */}

      {!contestStarted ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 relative bg-slate-50/50 dark:bg-[#0b0f19]/30">
          {/* Futuristic grid and glow backdrop */}
          <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* Glowing backdrop blobs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="max-w-xl w-full backdrop-blur-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl rounded-3xl p-8 space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-indigo-500/10 hover:border-indigo-500/30"
          >
            {/* Top gradient indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-indigo-500/20">
              <Trophy size={26} className="animate-pulse" />
            </div>

            <div className="space-y-2.5">
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[var(--text-primary)] leading-snug">
                {contest.title}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Welcome to the Timed Contest Arena. You are about to initiate a competitive coding block. Please read the instructions below:
              </p>
            </div>

            {/* instructions details */}
            <div className="space-y-4 p-5 rounded-2xl border bg-slate-500/5 backdrop-blur-sm text-xs" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
              <div className="flex items-center space-x-2 text-[var(--text-primary)] font-extrabold text-sm border-b pb-2" style={{ borderColor: "var(--border-primary)" }}>
                <Clock size={16} className="text-indigo-500" />
                <span>Contest Rules & Parameters</span>
              </div>
              <ul className="space-y-2.5 leading-relaxed text-[var(--text-secondary)]">
                <li className="flex items-start space-x-2">
                  <span className="text-indigo-500 mt-1">•</span>
                  <span>Duration: <strong>{contest.durationMins} minutes</strong> (countdown timer begins immediately and cannot be paused).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-indigo-500 mt-1">•</span>
                  <span>Submission Metrics: Your final rank is calculated based on total points and submission speed.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-indigo-500 mt-1">•</span>
                  <span>Auto-Lock: Editorial/solution tabs are hidden during active contest. Editor locks at `00:00`.</span>
                </li>
                <li className="flex items-start space-x-2 text-rose-500">
                  <span className="text-rose-500 mt-1 font-bold">!</span>
                  <span><strong>Anti-Cheat Active:</strong> Fullscreen mode is enforced. Tab switching, DevTools (F12), AI shortcuts (Ctrl+K, Option/Alt+Space, etc.), copy/paste outside the code editor, and right-clicks are all blocked. 3 violations triggers auto-submission.</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-3 pt-2">
              <Link
                href="/contest"
                className="flex-1 py-3 text-center bg-slate-500/5 hover:bg-slate-500/10 border border-[var(--border-primary)] transition-all font-bold rounded-xl text-xs text-[var(--text-secondary)] cursor-pointer"
              >
                Exit to Lobby
              </Link>
              <button
                disabled={isUpcoming}
                onClick={startContest}
                className={`flex-grow py-3 px-6 font-bold rounded-xl text-xs text-white flex items-center justify-center space-x-2 transition-all hover:scale-102 active:scale-98 shadow-[0_4px_15px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_22px_rgba(99,102,241,0.4)] ${isUpcoming ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
                  }`}
                style={{
                  background: isUpcoming ? "gray" : "linear-gradient(135deg, #6366f1, #8b5cf6)"
                }}
              >
                {isUpcoming ? `Starts at ${new Date(contest.startTime).toLocaleTimeString()}` : (
                  <>
                    <Play size={13} fill="currentColor" />
                    <span>Start in Fullscreen</span>
                  </>
                )}
              </button>

            </div>
          </motion.div>
        </div>
      ) : (
        /* Timed active workspace */
        <>
          {/* Contest header */}
          <header className="flex h-14 items-center justify-between px-6 border-b shrink-0 z-30 animate-fade-in shadow-sm" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center space-x-5">
              <span className="text-sm font-black text-[var(--text-primary)] tracking-tight font-display bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                {contest.title}
              </span>
              <span className="h-4 w-px bg-slate-500/20" />

              {/* Question list selector pills */}
              <div className="flex items-center bg-slate-500/5 p-1 rounded-full border space-x-1" style={{ borderColor: "var(--border-primary)" }}>
                {contest.problems.map((prob, idx) => {
                  const isCurrent = activeQuestionIdx === idx;
                  const isSolved = solvedQuestions.includes(prob.id);
                  return (
                    <button
                      key={prob.id}
                      onClick={() => changeQuestion(idx)}
                      className={`px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center space-x-1.5 relative ${isCurrent
                        ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-105 hover:scale-110"
                        : "text-[var(--text-secondary)] hover:bg-slate-500/10 hover:text-[var(--text-primary)] hover:scale-102 bg-transparent"
                        }`}
                    >
                      <span>Q{idx + 1}</span>
                      {isSolved && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-[0_0_8px_#10b981] animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timers and scoring status */}
            <div className="flex items-center space-x-4">
              {/* Sports-scoreboard style countdown timer */}
              <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.05)] font-mono transition-all duration-300 ${secondsLeft < 120
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-pulse"
                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400"
                }`}>
                <Clock size={14} className={secondsLeft < 120 ? "animate-pulse text-rose-500" : "text-indigo-500"} />
                <span>{formatTimer()}</span>
              </div>

              {/* High-end score badge */}
              <div className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500/5 rounded-full border border-amber-500/20 text-[11px] font-bold shadow-[0_0_15px_rgba(245,158,11,0.05)]" style={{ color: "var(--text-secondary)" }}>
                <Trophy size={13} className="text-amber-500 animate-bounce" />
                <span>Score:</span>
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-transparent bg-clip-text font-extrabold text-sm px-0.5">{userScore}</span>
                <span className="text-[var(--text-muted)]">/ {contest.totalPoints} pts</span>
              </div>

              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:scale-105 hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)] active:scale-95 transition-all duration-200 cursor-pointer border border-rose-500/30 shadow-red-500/10"
                style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}
              >
                <Flag size={12} />
                <span>Finish & Submit</span>
              </button>
            </div>
          </header>

          {/* Arena Content split columns */}
          <div
            ref={containerRef}
            className="flex flex-1 overflow-hidden relative"
          >
            {(isResizing || isConsoleResizing) && (
              <div 
                className={`fixed inset-0 z-50 bg-transparent select-none pointer-events-auto ${
                  isResizing ? "cursor-col-resize" : "cursor-row-resize"
                }`} 
              />
            )}
            {/* Left Column Problem Description */}
            <div
              className="flex flex-col h-full overflow-hidden shrink-0"
              style={{ width: `${leftWidth}%` }}
            >
              {/* Floating pill tabs selector */}
              <div className="flex h-12 border-b overflow-x-auto shrink-0 items-center px-4 space-x-2" style={{ backgroundColor: "rgba(var(--bg-secondary-rgb), 0.5)", backdropFilter: "blur(8px)", borderColor: "var(--border-primary)" }}>
                {[
                  { id: "description", label: "Description", icon: <FileText size={13} /> },
                  { id: "followup", label: "Followup", icon: <MessageCircle size={13} /> },
                  { id: "editorial", label: "Editorial", icon: <BookOpen size={13} /> },
                  { id: "solution", label: "Solution", icon: <CheckCircle2 size={13} /> },
                  { id: "evaluation", label: "Evaluation", icon: <ClipboardCheck size={13} /> },
                  { id: "excalidraw", label: "Excalidraw", icon: <Palette size={13} /> }
                ].map(tab => {
                  const isLocked = (tab.id === "editorial" || tab.id === "solution") && !contestEnded;
                  const isActive = activeLeftTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveLeftTab(tab.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-extrabold cursor-pointer rounded-full transition-all duration-200 whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0 ${isActive
                        ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-500 border border-indigo-500/30 shadow-[0_2px_10px_rgba(99,102,241,0.1)]"
                        : "text-[var(--text-secondary)] bg-transparent border border-transparent hover:bg-slate-500/5 hover:text-[var(--text-primary)]"
                        }`}
                    >
                      {isLocked ? <Lock size={11} className="text-[var(--text-muted)]" /> : tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Scrollable pane details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: "var(--bg-card)" }}>
                {/* Sketch whiteboard */}
                <div className={activeLeftTab === "excalidraw" ? "block space-y-4 h-full" : "hidden"}>
                  <div className="flex items-center justify-between p-3 rounded-2xl border" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1.5">
                        {["#6366f1", "#10b981", "#ef4444", "#f59e0b", "#e2e8f0"].map(col => (
                          <button
                            key={col}
                            onClick={() => setDrawColor(col)}
                            className={`h-5 w-5 rounded-full border cursor-pointer transition-transform ${drawColor === col ? "scale-110 border-indigo-500 shadow-sm" : "border-slate-500/20"
                              }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                      <span className="h-4 w-px bg-slate-500/20" />
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold">Size:</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={lineWidth}
                          onChange={(e) => setLineWidth(parseInt(e.target.value))}
                          className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      onClick={clearCanvas}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Clear Sketch</span>
                    </button>
                  </div>

                  <div className="border rounded-2xl overflow-hidden shadow-inner bg-slate-900/5" style={{ borderColor: "var(--border-primary)" }}>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full cursor-crosshair h-[400px] block"
                    />
                  </div>
                </div>

                {/* Text blocks */}
                {activeLeftTab !== "excalidraw" && renderTabContent()}
              </div>
            </div>

            {/* Split Resize bar */}
            <div
              onMouseDown={startResizing}
              className="w-1.5 hover:w-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 cursor-col-resize select-none h-full transition-all duration-150 shrink-0 z-20 relative"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-slate-400" />
            </div>

            {/* Right Column Workspace */}
            <div className="flex flex-1 flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
              {/* Right Panel Sub-header */}
              <div className="flex h-10 items-center justify-between px-4 border-b shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-slate-500/5 border border-[var(--border-primary)] rounded px-2.5 py-1 text-xs font-bold outline-none cursor-pointer text-[var(--text-primary)]"
                  >
                    {activeQuestion && activeQuestion.editorTemplates.markdown && <option value="markdown">Markdown</option>}
                    {activeQuestion && activeQuestion.editorTemplates.javascript && <option value="javascript">JavaScript</option>}
                    {activeQuestion && activeQuestion.editorTemplates.python && <option value="python">Python</option>}
                    {activeQuestion && activeQuestion.editorTemplates.go && <option value="go">Go</option>}
                    {activeQuestion && activeQuestion.editorTemplates.cpp && <option value="cpp">C++</option>}
                    {activeQuestion && activeQuestion.editorTemplates.java && <option value="java">Java</option>}
                  </select>
                </div>

                <div className="text-[10px] text-[var(--text-muted)] font-mono font-semibold">
                  UTF-8 Code Compiler ready
                </div>
              </div>

              {/* Voice Assistant panel */}
              <div
                className="flex items-center justify-between p-3.5 border-b shadow-[0_4px_15px_rgba(99,102,241,0.03)] transition-all duration-300 relative overflow-hidden"
                style={{
                  borderColor: "var(--border-primary)",
                  background: "linear-gradient(90deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 50%, rgba(244, 63, 94, 0.03) 100%)"
                }}
              >
                {/* Glowing edge accents */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20" />

                <div className="flex items-center space-x-3.5 relative z-10">
                  <button
                    onClick={isSpeaking ? stopSpeaking : () => askVoiceAssistant()}
                    disabled={isListening || assistantTyping}
                    className={`relative h-9 w-9 rounded-full flex items-center justify-center text-white transition-all border border-transparent outline-none focus:outline-none shadow-md ${isSpeaking
                      ? "bg-rose-500 hover:bg-rose-600 cursor-pointer shadow-rose-500/25"
                      : isListening
                        ? "bg-red-500 shadow-red-500/35 scale-105"
                        : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-indigo-600/25 hover:scale-105 active:scale-95"
                      }`}
                    title={isSpeaking ? "Stop speaking" : "Start query"}
                  >
                    {isSpeaking ? (
                      <Volume2 size={15} className="animate-bounce" />
                    ) : (
                      <Mic size={15} className={isListening ? "animate-pulse" : ""} />
                    )}
                    {isListening && (
                      <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
                    )}
                  </button>

                  <div>
                    <div className="text-xs font-black tracking-wider text-[var(--text-primary)] flex items-center space-x-1.5">
                      <span>VOICE AI DEVELOPER ASSISTANT</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-semibold mt-0.5">
                      {isListening ? "Listening to query..." : assistantTyping ? "AI typing hints..." : isSpeaking ? "Speaking... (Click speaker icon to stop)" : "Locked on explaining security & algorithms."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 relative z-10">
                  {/* Animated Wave equalizer */}
                  {voiceWaveform && (
                    <div className="flex space-x-1 items-end h-5 px-3">
                      {[1, 2, 3, 4, 5, 6].map(bar => (
                        <span
                          key={bar}
                          className="w-0.75 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full animate-waveform-bar"
                          style={{
                            animationDelay: `${bar * 0.1}s`,
                            animationDuration: `${0.6 + (bar % 3) * 0.2}s`,
                            height: "100%",
                            minHeight: "4px"
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => askVoiceAssistant()}
                    disabled={isListening || assistantTyping}
                    className="px-3.5 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full text-[10px] shadow-md hover:shadow-indigo-600/15 transition-all cursor-pointer disabled:opacity-50 hover:scale-102 active:scale-98"
                  >
                    Start Query
                  </button>
                </div>
              </div>

              {/* Editor screen */}
              <div className="flex-1 flex overflow-hidden font-mono text-sm relative" style={{ backgroundColor: "var(--bg-code)" }}>
                {/* Lines column */}
                <div
                  ref={lineNumbersRef}
                  className="w-12 select-none text-right pr-3 pt-4 border-r overflow-hidden leading-6"
                  style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)", fontSize: "12px" }}
                >
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Overlay Code Editor Container */}
                <div className="flex-grow h-full w-full relative overflow-hidden">
                  {/* Highlight layer */}
                  <div
                    ref={highlightRef}
                    className="absolute top-0 left-0 w-full h-full pt-4 px-4 pb-12 overflow-y-auto overflow-x-auto pointer-events-none font-mono whitespace-pre leading-6"
                    style={{ fontSize: "13px" }}
                    dangerouslySetInnerHTML={{ __html: highlightCode(currentCode, selectedLanguage) }}
                  />
                  {/* Editable textarea layer */}
                  <textarea
                    ref={editorRef}
                    value={currentCode}
                    data-role="code-editor"
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditorCodes(prev => ({
                        ...prev,
                        [currentCodeKey]: val
                      }));
                    }}
                    onScroll={handleEditorScroll}
                    onKeyDown={handleEditorKeyDown}
                    onPaste={handleEditorPaste}
                    spellCheck="false"
                    className="code-editor-textarea absolute top-0 left-0 w-full h-full bg-transparent text-transparent pt-4 px-4 pb-12 outline-none border-none resize-none font-mono whitespace-pre leading-6 overflow-y-auto overflow-x-auto"
                    style={{ fontSize: "13px", caretColor: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {/* Run controls panel */}
              <div 
                className="flex flex-col border-t relative" 
                style={{ 
                  borderColor: "var(--border-primary)", 
                  backgroundColor: "var(--bg-secondary)",
                  height: `${consoleHeight}px`
                }}
              >
                {/* Drag Handle */}
                <div 
                  onMouseDown={startConsoleResizing}
                  className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-indigo-500/50 transition-colors z-30"
                  style={{ transform: "translateY(-50%)" }}
                />
                {/* Console tabs headers */}
                <div className="flex h-10 items-center justify-between px-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
                  <div className="flex space-x-1.5">
                    {[
                      { id: "testcase", label: "Testcase", icon: <Terminal size={12} /> },
                      { id: "result", label: "Test Result", icon: <CheckCircle2 size={12} /> }
                    ].map(ctab => (
                      <button
                        key={ctab.id}
                        onClick={() => setActiveConsoleTab(ctab.id)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeConsoleTab === ctab.id
                          ? "bg-slate-500/10 text-indigo-400 border border-slate-500/10"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                      >
                        {ctab.icon}
                        <span>{ctab.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={runCode}
                      disabled={isRunning || isSubmitting}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isRunning ? (
                        <RefreshCw size={10} className="animate-spin" />
                      ) : (
                        <Play size={10} />
                      )}
                      <span>{isRunning ? "Running..." : "Run Testcases"}</span>
                    </button>

                    <button
                      onClick={submitCode}
                      disabled={isSubmitting || isRunning}
                      className="relative flex items-center space-x-1.5 px-3 py-1 text-white rounded text-[11px] font-bold transition-all cursor-pointer disabled:opacity-60 overflow-hidden"
                      style={{
                        background: isSubmitting
                          ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                          : "linear-gradient(135deg,#059669,#10b981)",
                        minWidth: "110px",
                      }}
                    >
                      {/* Shimmer sweep while submitting */}
                      {isSubmitting && (
                        <span
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                            animation: "shimmer-sweep 1.2s infinite",
                          }}
                        />
                      )}
                      {isSubmitting ? (
                        <RefreshCw size={10} className="animate-spin relative z-10" />
                      ) : (
                        <Send size={10} className="relative z-10" />
                      )}
                      <span className="relative z-10">{isSubmitting ? "Judging..." : "Submit Solution"}</span>
                    </button>
                  </div>
                </div>

                {/* Console results logs */}
                <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-4 shadow-inner" style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}>
                  {activeConsoleTab === "testcase" && (
                    <div className="space-y-4">
                      {activeQuestion && activeQuestion.testcases.map((tc, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="font-bold text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{tc.name}</div>
                          <input
                            type="text"
                            value={testcaseInputs[idx] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTestcaseInputs(prev => {
                                const copy = [...prev];
                                copy[idx] = val;
                                return copy;
                              });
                            }}
                            className="w-full border rounded-xl px-4 py-2.5 outline-none font-mono text-xs transition-all duration-200 focus:border-indigo-500/80 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)] bg-slate-500/5 hover:bg-slate-500/10"
                            style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeConsoleTab === "result" && (
                    <div className="space-y-4">
                      {isRunning ? (
                        <div className="flex items-center space-x-2.5 text-indigo-400 py-3 font-semibold">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Running dynamic assertions checks...</span>
                        </div>
                      ) : testResults ? (
                        testResults.map((res, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-3.5 ${res.passed
                              ? "bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5 hover:border-emerald-500/40"
                              : "bg-rose-500/5 dark:bg-rose-500/5 border-rose-500/20 shadow-rose-500/5 hover:border-rose-500/40"
                              }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-secondary)" }}>{res.name}</span>
                              <span className={`font-black text-[10px] px-2.5 py-0.8 rounded-full border uppercase tracking-wider ${res.passed
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                                }`}>
                                {res.passed ? "Passed" : "Failed"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] p-3 rounded-xl border bg-slate-900/30 border-slate-500/10 font-mono">
                              <div>
                                <span className="font-bold text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Input</span>
                                <pre className="mt-1 p-2 rounded-lg bg-slate-500/5 border border-slate-500/10 overflow-x-auto whitespace-pre-wrap max-h-24 scrollbar-thin" style={{ color: "var(--text-secondary)" }}>{res.input}</pre>
                              </div>
                              <div>
                                <span className="font-bold text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Expected</span>
                                <pre className="mt-1 p-2 rounded-lg bg-slate-500/5 border border-slate-500/10 overflow-x-auto whitespace-pre-wrap max-h-24 scrollbar-thin" style={{ color: "var(--text-secondary)" }}>{res.expected}</pre>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="font-bold text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Actual Output</span>
                                {res.error ? (
                                  <pre className="mt-1 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400/90 whitespace-pre-wrap overflow-x-auto max-h-32 scrollbar-thin">{res.error}</pre>
                                ) : (
                                  <pre className={`mt-1 p-2 rounded-lg bg-slate-500/5 border overflow-x-auto whitespace-pre-wrap max-h-24 scrollbar-thin ${res.passed ? "border-emerald-500/20 text-emerald-400/95" : "border-rose-500/20 text-rose-400/95"}`}>{res.actual}</pre>
                                )}
                              </div>
                            </div>

                            {res.logs && res.logs.length > 0 && (
                              <div className="mt-1 space-y-1 p-3 rounded-xl border text-[10px] bg-slate-900/40 border-slate-500/10 font-mono" style={{ color: "var(--text-secondary)" }}>
                                <div className="font-bold uppercase tracking-wider text-[9px] mb-1.5" style={{ color: "var(--text-muted)" }}>Standard Console Output</div>
                                <div className="space-y-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap scrollbar-thin">
                                  {res.logs.map((log, lIdx) => (
                                    <div key={lIdx} className="border-l border-slate-500/20 pl-2 py-0.5">{log}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                          <Terminal size={24} className="mx-auto mb-2 text-indigo-500/40" />
                          <span>No tests executed yet. Click "Run Testcases" above.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Full transparent drag helper resize overlay */}
      {isResizing && (
        <div className="fixed inset-0 cursor-col-resize z-50 bg-transparent select-none pointer-events-auto" />
      )}

      {/* Scoreboard Result Dialog modal popup */}
      <AnimatePresence>
        {contestEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-xl w-full rounded-3xl border p-8 shadow-2xl space-y-6"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-accent)" }}
            >
              <div className="text-center space-y-3">
                <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg bg-indigo-600 shadow-indigo-500/25">
                  <Trophy size={36} />
                </div>
                <h3 className="text-2xl font-black font-display text-[var(--text-primary)]">Contest Finished!</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                  Your final scores and timings are locked. View the official standings below:
                </p>
              </div>

              {/* Score breakdown metrics */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl border bg-slate-500/5 text-center" style={{ borderColor: "var(--border-primary)" }}>
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Your Score</span>
                  <div className="text-2xl font-black text-[var(--text-accent)]">{userScore} pts</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Time Elapsed</span>
                  <div className="text-2xl font-black text-[var(--text-primary)]">
                    {finalElapsedTime}
                  </div>
                </div>
              </div>

              {/* Dynamic Rankings list */}
              <div className="space-y-2">
                <div className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wide">Live Standings</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {finalScoreboard.map((player) => (
                    <div
                      key={player.rank}
                      className={`flex justify-between items-center p-2.5 rounded-xl border text-xs ${player.isUser
                        ? "bg-indigo-500/10 border-indigo-500/30 font-bold"
                        : "bg-slate-500/5 border-transparent"
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-extrabold w-6">
                          {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : `#${player.rank}`}
                        </span>
                        <span style={{ color: player.isUser ? "var(--text-accent)" : "var(--text-primary)" }}>
                          {player.username} {player.isUser && "(You)"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 font-mono">
                        <span className="text-[10px] text-[var(--text-muted)]">{player.time}</span>
                        <span className="font-extrabold text-[var(--text-primary)]">{player.score} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <Link
                  href="/contest"
                  className="px-6 py-2.5 text-white font-bold rounded-full text-xs shadow-md flex items-center space-x-1"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <span>Return to Lobby</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Status Dialog modal */}
      <AnimatePresence>
        {submissionVerdict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={() => setSubmissionVerdict(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-2xl w-full rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 text-left max-h-[85vh] overflow-y-auto"
              style={{ backgroundColor: "var(--bg-card)", borderColor: submissionVerdict.passed ? "var(--border-accent)" : "rgba(239, 68, 68, 0.3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center space-x-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-md ${
                    submissionVerdict.passed 
                      ? "bg-emerald-500 shadow-emerald-500/25" 
                      : "bg-rose-500 shadow-rose-500/25"
                  }`}>
                    {submissionVerdict.passed ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-display text-[var(--text-primary)]">
                      {submissionVerdict.passed ? "Accepted!" : "Submission failed"}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                      Status Verdict: <span className={`font-bold font-mono ${submissionVerdict.passed ? "text-emerald-500" : "text-rose-500"}`}>{submissionVerdict.verdict.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-black text-[var(--text-primary)] font-mono">
                    {submissionVerdict.passedTestCases} / {submissionVerdict.totalTestCases} Passed
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-semibold">
                    Time: {submissionVerdict.executionTimeMs} ms
                  </div>
                </div>
              </div>

              {submissionVerdict.stderr && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Execution Error Output:</span>
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-rose-500/10 text-rose-300 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {submissionVerdict.stderr}
                  </pre>
                </div>
              )}

              {submissionVerdict.results && submissionVerdict.results.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Test Case Run Details:</span>
                  <div className="grid gap-3">
                    {submissionVerdict.results.map((res, index) => {
                      const isSample = res.isSample;
                      const passed = res.verdict === "ACCEPTED" || res.status === "SUCCESS";
                      return (
                        <div 
                          key={index}
                          className="border rounded-2xl p-4 transition-all"
                          style={{ 
                            backgroundColor: "var(--bg-primary)", 
                            borderColor: passed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" 
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[var(--text-primary)] font-mono">
                              Test Case #{res.index} {isSample ? <span className="text-indigo-400 text-[10px] ml-1 font-sans">(Sample)</span> : <span className="text-[var(--text-muted)] text-[10px] ml-1 font-sans">(Hidden)</span>}
                            </span>
                            
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase font-mono ${
                              passed 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            }`}>
                              {passed ? "Passed" : res.verdict ? res.verdict.replace(/_/g, " ") : "Failed"}
                            </span>
                          </div>

                          {/* Show details for sample test cases, hide for background ones */}
                          {isSample ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] mt-3 pt-3 border-t font-mono" style={{ borderColor: "var(--border-primary)" }}>
                              <div>
                                <span className="font-bold text-[var(--text-muted)]">Input:</span>
                                <pre className="mt-0.5 text-[var(--text-secondary)] overflow-x-auto truncate max-w-xs">{res.input || (activeQuestion?.testcases[res.index - 1]?.input) || ""}</pre>
                              </div>
                              <div>
                                <span className="font-bold text-[var(--text-muted)]">Time:</span>
                                <div className="mt-0.5 text-[var(--text-secondary)]">{res.executionTimeMs} ms</div>
                              </div>
                              {res.stderr ? (
                                <div className="sm:col-span-2">
                                  <span className="font-bold text-rose-400">Error:</span>
                                  <pre className="text-rose-400 mt-0.5 whitespace-pre-wrap">{res.stderr}</pre>
                                </div>
                              ) : (
                                <div className="sm:col-span-2">
                                  <span className="font-bold text-[var(--text-muted)]">Output:</span>
                                  <pre className="mt-0.5 text-[var(--text-secondary)] overflow-x-auto truncate max-w-xs">{res.stdout || ""}</pre>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[var(--text-muted)] mt-2 font-mono italic">
                              Input/outputs are hidden for background security verification tests.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 justify-end pt-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
                <button
                  onClick={() => setSubmissionVerdict(null)}
                  className="px-5 py-2.5 bg-slate-500/10 hover:bg-slate-500/20 font-bold rounded-full text-xs text-[var(--text-secondary)] cursor-pointer transition-colors"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSS definitions for equalizers, typing and waveforms */}
      <style jsx global>{`
        @keyframes wavebar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .animate-waveform-bar {
          animation: wavebar 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function JudgingOverlayContent({ selectedLanguage, currentCode, user }) {
  const [statusText, setStatusText] = useState("preparing runtime environment");
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentTestCase, setCurrentTestCase] = useState(1);
  const totalTestCases = 87;

  useEffect(() => {
    // 1. Initial preparing step
    const prepareTimer = setTimeout(() => {
      setStatusText("compiling code");
      setProgressPercent(15);
    }, 900);

    // 2. Compiling step
    const compileTimer = setTimeout(() => {
      setStatusText(`running test cases: 1 / ${totalTestCases}`);
      setProgressPercent(35);
    }, 1800);

    // 3. Fast ticking for test cases
    let testCaseTimer;
    const startTicking = setTimeout(() => {
      let current = 1;
      testCaseTimer = setInterval(() => {
        if (current < 81) {
          current += Math.floor(Math.random() * 4) + 1;
          if (current > 81) current = 81;
          setCurrentTestCase(current);
          setStatusText(`running test cases: ${current} / ${totalTestCases}`);
          // Interpolate progress percentage from 35% to 92%
          const percentage = 35 + Math.round((current / totalTestCases) * 57);
          setProgressPercent(percentage);
        } else {
          clearInterval(testCaseTimer);
        }
      }, 70);
    }, 1800);

    return () => {
      clearTimeout(prepareTimer);
      clearTimeout(compileTimer);
      clearTimeout(startTicking);
      if (testCaseTimer) clearInterval(testCaseTimer);
    };
  }, []);

  const lines = currentCode.split("\n");

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 15 }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      className="relative w-full max-w-2xl mx-4 rounded-3xl overflow-hidden shadow-2xl border bg-slate-900/90 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top amber accent bar mimicking LeetCode submissions loading color */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 animate-pulse" />

      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xl font-bold tracking-tight text-slate-100">
            <RefreshCw size={20} className="animate-spin text-amber-500" />
            <span>Pending...</span>
          </div>
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{user?.username || "You"}</span> submitted at a few seconds ago
          </p>
        </div>

        {/* Status container */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center space-x-3 shadow-inner">
          {/* Animated dot */}
          <div className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>
          <span className="text-xs font-mono text-slate-300 capitalize">{statusText}</span>
        </div>

        {/* Sleek Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>PREPARING</span>
            <span>RUNNING CASES</span>
            <span>COMPLETE</span>
          </div>
        </div>

        {/* Code Preview */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/90 font-mono text-xs shadow-lg">
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-800 bg-slate-900/40 text-slate-400 select-none">
            <span>Code | {selectedLanguage === "javascript" ? "JavaScript" : selectedLanguage === "python" ? "Python3" : selectedLanguage.toUpperCase()}</span>
          </div>
          <div className="p-4 max-h-60 overflow-y-auto flex">
            {/* Line numbers */}
            <div className="text-right pr-4 select-none text-slate-600 border-r border-slate-800/60 min-w-[2.5rem]">
              {lines.map((_, i) => (
                <div key={i} className="leading-6 font-semibold">{i + 1}</div>
              ))}
            </div>
            {/* Syntax Highlighted Code */}
            <pre className="pl-4 flex-1 overflow-x-auto leading-6 text-slate-300 font-medium">
              <code dangerouslySetInnerHTML={{ __html: highlightCode(currentCode, selectedLanguage) }} />
            </pre>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
