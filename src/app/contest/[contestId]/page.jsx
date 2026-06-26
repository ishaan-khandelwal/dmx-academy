"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Send, BookOpen, Terminal, 
  CheckCircle2, ChevronRight, Mic, RefreshCw,
  FileText, MessageCircle, ClipboardCheck, Palette, Trash2,
  Trophy, Clock, Lock, Flag, Volume2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { wrapCodeForBackend } from "@/utils/codeWrapper";
import { getSocket } from "@/utils/socket";


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
  }
  return html;
}

// Helper: returns auth bypass headers based on current session
function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("dmx_auth_token");
  if (token && !token.startsWith("demo-") && !token.startsWith("local-")) {
    return { "Authorization": `Bearer ${token}` };
  }
  if (localStorage.getItem("synapse_admin_session") === "true")
    return { "x-bypass-auth": "true", "x-bypass-role": "ADMIN" };
  if (localStorage.getItem("synapse_mentor_session") === "true")
    return { "x-bypass-auth": "true", "x-bypass-role": "MENTOR" };
  if (localStorage.getItem("synapse_student_session") === "true")
    return { "x-bypass-auth": "true", "x-bypass-role": "USER" };
  return {};
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

  // Layout resize state
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const containerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

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
                testcases: dbProb.testCases || [],
                editorTemplates: {
                  javascript: `// Solve: ${dbProb.title}\nfunction solution() {\n  // Write your code here\n}`,
                  python: `# Solve: ${dbProb.title}\ndef solution(nums, target):\n    # Write your code here\n    pass`
                },
                defaultLanguage: "javascript"
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

  // Terminate contest callback
  const finishContest = useCallback(async () => {
    if (!contest) return;
    setContestEnded(true);

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
      
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 500;
      
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = lineWidth;
      
      drawCanvasBackground(canvas, ctx);
      restoreDrawing();
    }
  }, [activeLeftTab, drawColor, lineWidth]);

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
  const startContest = async () => {
    if (!contest) return;
    
    setSecondsLeft(contest.durationMins * 60);
    setStartTimeStamp(getCurrentTime());
    
    const initialCodes = {};
    contest.problems.forEach(prob => {
      if (prob.editorTemplates) {
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
      try {
        await fetch(`${API_BASE}/api/contests/${contestId}/participate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
          }
        });
      } catch (err) {
        console.error("Failed to register participation in backend:", err);
      }
    }
  };

  // Smart indentation + bracket auto-close key handler
  const handleEditorKeyDown = (e) => {
    const ta = e.target;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const code = currentCode;

    // ── Tab key: insert 2 spaces (or un-indent selected lines with Shift+Tab) ──
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey && start !== end) {
        // Un-indent selected lines
        const before = code.substring(0, start);
        const selected = code.substring(start, end);
        const after = code.substring(end);
        const unindented = selected.replace(/^  /gm, "");
        const diff = selected.length - unindented.length;
        const updated = before + unindented + after;
        setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = start;
            editorRef.current.selectionEnd = end - diff;
          }
        }, 0);
      } else {
        const updated = code.substring(0, start) + "  " + code.substring(end);
        setEditorCodes(prev => ({ ...prev, [currentCodeKey]: updated }));
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
          }
        }, 0);
      }
      return;
    }

    // ── Enter key: smart auto-indent ──
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
        const inner = "\n" + leadingWhitespace + "  ";
        const outer = "\n" + leadingWhitespace;
        newCode = code.substring(0, start) + inner + outer + code.substring(end);
        newCursor = start + inner.length;
      } else if (opensBlock) {
        // Line ends with block opener — indent one level deeper
        const indent = "\n" + leadingWhitespace + "  ";
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
    // Common indent units: 4 or 8 → re-normalise to 2 per level
    const unitSize = [8, 4, 3].find(u => minIndent > 0 && minIndent % u === 0) || 0;

    if (unitSize && unitSize !== 2) {
      text = text
        .split("\n")
        .map(line => {
          const m = line.match(/^( *)/);
          if (!m || m[1].length === 0) return line;
          const levels = Math.round(m[1].length / unitSize);
          return "  ".repeat(levels) + line.slice(m[1].length);
        })
        .join("\n");
    }

    // Step 3: insert at cursor position
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = currentCode.substring(0, start);
    const after  = currentCode.substring(end);
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
      const wrappedCode = wrapCodeForBackend(activeQuestion.slug || activeQuestion.id, selectedLanguage, currentCode);

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
            }),
            signal: AbortSignal.timeout(15000),
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

    const mappedLang = selectedLanguage.toUpperCase() === "JAVASCRIPT" ? "JAVASCRIPT" : selectedLanguage.toUpperCase() === "PYTHON" ? "PYTHON" : "CPP";
    const wrappedCode = wrapCodeForBackend(activeQuestion.slug || activeQuestion.id, selectedLanguage, currentCode);
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
    const problemTabs = activeQuestion.tabs || {
      description: `### Description\n${activeQuestion.desc || ""}\n\n### Input Format\n${activeQuestion.inputFormat || ""}\n\n### Output Format\n${activeQuestion.outputFormat || ""}\n\n### Constraints\n${activeQuestion.constraints || ""}`,
      followup: "No follow-up questions for this problem.",
      editorial: "Editorial not available for this custom problem.",
      solution: "Official solution not available for this custom problem.",
      evaluation: `Evaluation Limits:\n- **Time Limit:** ${activeQuestion.timeLimitMs || 1000}ms\n- **Memory Limit:** ${activeQuestion.memoryLimitMb || 256}MB`
    };

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
    
    return markdownText.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-xl font-bold font-display mt-6 mb-3 text-[var(--text-primary)] border-b pb-1" style={{ borderColor: "var(--border-primary)" }}>
            {trimmed.replace("### ", "")}
          </h3>
        );
      }
      if (trimmed.startsWith("#### ")) {
        return (
          <h4 key={idx} className="text-sm font-extrabold uppercase mt-5 mb-2 text-[var(--text-primary)] tracking-wide">
            {trimmed.replace("#### ", "")}
          </h4>
        );
      }
      
      if (trimmed.startsWith("```")) return null;

      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
      
      const processInline = (str) => {
        const backtickParts = str.split(/`([^`]+)`/g);
        return backtickParts.flatMap((part, i) => {
          if (i % 2 === 1) {
            return (
              <code key={`code-${i}`} className="px-1.5 py-0.5 rounded font-mono text-xs mx-0.5 text-pink-500 font-semibold bg-slate-500/10 border border-slate-500/20">
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

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start pl-4 space-x-2 my-1.5">
            <span className="text-[var(--text-accent)] mt-1.5 text-[8px]">•</span>
            <span className="flex-1">{processInline(trimmed.replace(/^[\*\-]\s+/, ""))}</span>
          </div>
        );
      }

      return (
        <p key={idx} className="mb-2.5 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
          {processInline(line)}
        </p>
      );
    });
  };

  const isUpcoming = contest && contest.startTime && new Date() < new Date(contest.startTime);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      
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
        <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
          <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-indigo-100/20 via-transparent to-transparent pointer-events-none" />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-xl w-full border rounded-3xl p-8 shadow-2xl space-y-6"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
          >
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-md bg-indigo-600">
              <Trophy size={28} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black font-display text-[var(--text-primary)] leading-snug">
                {contest.title}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Welcome to the Timed Contest Arena. You are about to initiate a competitive coding block. Please read the instructions below:
              </p>
            </div>

            {/* instructions details */}
            <div className="space-y-3 p-4 rounded-2xl border bg-slate-500/5 text-xs" style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
              <div className="flex items-center space-x-2 text-[var(--text-primary)] font-bold">
                <Clock size={14} className="text-indigo-500" />
                <span>Contest Duration: {contest.durationMins} minutes</span>
              </div>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed text-[var(--text-secondary)]">
                <li>Once you click <strong>{"Start Contest"}</strong>, the ticking countdown timer begins and cannot be paused.</li>
                <li>Your final rank is calculated based on total points earned and the speed of your submissions.</li>
                <li>Editorial and reference solution tabs will be locked during the timed contest block.</li>
                <li>When the timer hits <code>00:00</code>, your editor access will lock and submissions will close automatically.</li>
              </ul>
            </div>

            <div className="flex space-x-3 pt-2">
              <Link
                href="/contest"
                className="flex-1 py-3 text-center bg-slate-500/10 hover:bg-slate-500/20 font-bold rounded-xl text-xs text-[var(--text-secondary)] cursor-pointer"
              >
                Exit to Lobby
              </Link>
              <button
                disabled={isUpcoming}
                onClick={startContest}
                className={`flex-grow py-3 font-bold rounded-xl text-xs text-white shadow-md ${
                  isUpcoming ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  background: isUpcoming ? "gray" : "var(--accent-gradient)"
                }}
              >
                {isUpcoming ? `Starts at ${new Date(contest.startTime).toLocaleTimeString()}` : "Start Contest"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Timed active workspace */
        <>
          {/* Contest header */}
          <header className="flex h-14 items-center justify-between px-6 border-b shrink-0 z-30 animate-fade-in" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center space-x-5">
              <span className="text-sm font-black text-[var(--text-primary)] tracking-tight">
                {contest.title}
              </span>
              <span className="h-4 w-px bg-slate-500/20" />
              
              {/* Question list selector pills */}
              <div className="flex items-center bg-slate-500/5 p-0.5 rounded-lg border" style={{ borderColor: "var(--border-primary)" }}>
                {contest.problems.map((prob, idx) => {
                  const isCurrent = activeQuestionIdx === idx;
                  const isSolved = solvedQuestions.includes(prob.id);
                  return (
                    <button
                      key={prob.id}
                      onClick={() => changeQuestion(idx)}
                      className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1 ${
                        isCurrent 
                          ? "bg-indigo-500 text-white shadow-sm" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span>Q{idx + 1}</span>
                      {isSolved && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timers and scoring status */}
            <div className="flex items-center space-x-5">
              <div className="flex items-center space-x-1.5 text-sm font-extrabold"
                style={{ color: secondsLeft < 120 ? "#ef4444" : "var(--text-primary)" }}
              >
                <Clock size={16} className={secondsLeft < 120 ? "animate-pulse" : ""} />
                <span className="font-mono text-base">{formatTimer()}</span>
              </div>

              <div className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                Score: <span className="text-[var(--text-accent)] font-extrabold">{userScore}</span> / {contest.totalPoints} pts
              </div>

              <button 
                onClick={finishContest}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm cursor-pointer"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
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
            {/* Left Column Problem Description */}
            <div 
              className="flex flex-col h-full overflow-hidden shrink-0"
              style={{ width: `${leftWidth}%` }}
            >
              {/* Tabs selector */}
              <div className="flex h-10 border-b overflow-x-auto shrink-0 animate-fade-in" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
                {[
                  { id: "description", label: "Description", icon: <FileText size={13} /> },
                  { id: "followup", label: "Followup", icon: <MessageCircle size={13} /> },
                  { id: "editorial", label: "Editorial", icon: <BookOpen size={13} /> },
                  { id: "solution", label: "Solution", icon: <CheckCircle2 size={13} /> },
                  { id: "evaluation", label: "Evaluation", icon: <ClipboardCheck size={13} /> },
                  { id: "excalidraw", label: "Excalidraw", icon: <Palette size={13} /> }
                ].map(tab => {
                  const isLocked = (tab.id === "editorial" || tab.id === "solution") && !contestEnded;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveLeftTab(tab.id)}
                      className={`flex items-center space-x-1 px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                        activeLeftTab === tab.id 
                          ? "border-indigo-500 text-indigo-500" 
                          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                            className={`h-5 w-5 rounded-full border cursor-pointer transition-transform ${
                              drawColor === col ? "scale-110 border-indigo-500 shadow-sm" : "border-slate-500/20"
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
                  </select>
                </div>

                <div className="text-[10px] text-[var(--text-muted)] font-mono font-semibold">
                  UTF-8 Code Compiler ready
                </div>
              </div>

              {/* Voice Assistant panel */}
              <div className="flex items-center justify-between p-3 border-b bg-slate-500/5 shadow-sm" style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={isSpeaking ? stopSpeaking : () => askVoiceAssistant()}
                    disabled={isListening || assistantTyping}
                    className={`relative h-8 w-8 rounded-full flex items-center justify-center text-white shadow-sm transition-all border border-transparent outline-none focus:outline-none ${
                      isSpeaking 
                        ? "bg-rose-600 hover:bg-rose-700 cursor-pointer" 
                        : isListening 
                          ? "bg-red-500" 
                          : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                    }`}
                    title={isSpeaking ? "Stop speaking" : "Start query"}
                  >
                    {isSpeaking ? (
                      <Volume2 size={14} className="animate-bounce" />
                    ) : (
                      <Mic size={14} className={isListening ? "animate-pulse" : ""} />
                    )}
                    {isListening && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-400 border border-white animate-ping" />
                    )}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">VOICE DEVELOPER ASSISTANT</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {isListening ? "Listening to query..." : assistantTyping ? "AI typing hints..." : isSpeaking ? "Speaking... (Click speaker icon to stop)" : "Locked on explaining security & algorithms."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Animated Wave equalizer */}
                  {voiceWaveform && (
                    <div className="flex space-x-0.5 items-end h-4 px-3">
                      {[1, 2, 3, 4, 5].map(bar => (
                        <span 
                          key={bar} 
                          className="w-0.5 bg-indigo-500 rounded-full animate-waveform-bar"
                          style={{ 
                            animationDelay: `${bar * 0.15}s`,
                            height: "100%"
                          }} 
                        />
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={() => askVoiceAssistant()}
                    disabled={isListening || assistantTyping}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
                    className="absolute top-0 left-0 w-full h-full bg-transparent text-transparent pt-4 px-4 pb-12 outline-none border-none resize-none font-mono whitespace-pre leading-6 overflow-y-auto overflow-x-auto"
                    style={{ fontSize: "13px", caretColor: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {/* Run controls panel */}
              <div className="flex flex-col border-t" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-secondary)" }}>
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
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeConsoleTab === ctab.id 
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
                <div className="h-40 overflow-y-auto p-4 font-mono text-xs space-y-3" style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}>
                  {activeConsoleTab === "testcase" && (
                    <div className="space-y-3">
                      {activeQuestion && activeQuestion.testcases.map((tc, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">{tc.name}</div>
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
                            className="w-full border rounded px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeConsoleTab === "result" && (
                    <div className="space-y-3">
                      {isRunning ? (
                        <div className="flex items-center space-x-2 text-indigo-400 py-2">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Running dynamic assertions checks...</span>
                        </div>
                      ) : testResults ? (
                        testResults.map((res, idx) => (
                          <div key={idx} className="border-b pb-3 space-y-2 last:border-b-0 last:pb-0" style={{ borderColor: "var(--border-primary)" }}>
                            <div className="flex justify-between items-center">
                              <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: "var(--text-secondary)" }}>{res.name}</span>
                              <span className={`font-extrabold text-[10px] px-2 py-0.5 rounded border uppercase ${
                                res.passed 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              }`}>
                                {res.passed ? "Passed" : "Failed"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg border" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
                              <div>
                                <span className="font-bold" style={{ color: "var(--text-muted)" }}>Input:</span>
                                <pre className="mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{res.input}</pre>
                              </div>
                              <div>
                                <span className="font-bold" style={{ color: "var(--text-muted)" }}>Expected:</span>
                                <pre className="mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{res.expected}</pre>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="font-bold" style={{ color: "var(--text-muted)" }}>Actual:</span>
                                {res.error ? (
                                  <pre className="text-rose-400 mt-0.5 whitespace-pre-wrap">{res.error}</pre>
                                ) : (
                                  <pre className="mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{res.actual}</pre>
                                )}
                              </div>
                            </div>

                            {res.logs && res.logs.length > 0 && (
                              <div className="mt-1 space-y-0.5 p-2 rounded border text-[10px]" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                                <div className="font-bold uppercase text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>Standard Console Output:</div>
                                {res.logs.map((log, lIdx) => (
                                  <div key={lIdx}>{log}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4" style={{ color: "var(--text-muted)" }}>
                          {"No tests executed yet. Click \"Run Testcases\" above."}
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
                      className={`flex justify-between items-center p-2.5 rounded-xl border text-xs ${
                        player.isUser 
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
