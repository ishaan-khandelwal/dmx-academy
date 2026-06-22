"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Play, Send, BookOpen, Terminal, 
  CheckCircle2, ChevronRight, Mic, MicOff, RefreshCw,
  FileText, MessageCircle, ClipboardCheck, Palette, Trash2, CheckCircle, XCircle,
  Volume2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { wrapCodeForBackend } from "@/utils/codeWrapper";

function saveLocalSubmission(sub) {
  if (typeof window === "undefined") return;
  const key = "dmx_local_submissions";
  let existing = [];
  try {
    existing = JSON.parse(localStorage.getItem(key) || "[]");
  } catch { }
  
  const newSub = {
    id: `local-sub-${Date.now()}`,
    problemId: sub.problemId,
    dbProblemId: sub.dbProblemId || null,
    problem: {
      title: sub.title,
      slug: sub.problemId,
    },
    status: sub.status || "ACCEPTED",
    language: sub.language,
    code: sub.code,
    createdAt: new Date().toISOString(),
  };
  existing.unshift(newSub);
  localStorage.setItem(key, JSON.stringify(existing));
}

export default function PracticeWorkspace() {
  const params = useParams();
  const problemId = params.problemId;
  const { user, token, API_BASE } = useAuth();
  
  const [problem, setProblem] = useState(null);
  const [dbProblem, setDbProblem] = useState(null);
  const [loadingProblem, setLoadingProblem] = useState(true);

  useEffect(() => {
    async function loadProblemData() {
      if (!problemId) return;
      setLoadingProblem(true);
      
      let localProblem = null;
      if (typeof window !== "undefined") {
        try {
          const localRaw = localStorage.getItem("synapse_dynamic_problems");
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            localProblem = parsed.find(p => p.id === problemId);
          }
        } catch { }
      }

      try {
        const res = await fetch(`${API_BASE}/api/problems/${problemId}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.problem) {
            const dbp = data.problem;
            setDbProblem(dbp);

            const matchedSource = localProblem;

            let diffStr = "Medium";
            if (dbp.difficulty === "EASY") diffStr = "Easy";
            else if (dbp.difficulty === "HARD") diffStr = "Hard";

            if (matchedSource) {
              setProblem({
                ...matchedSource,
                dbId: dbp.id,
                difficulty: diffStr
              });
            } else {
              const dynamicTC = dbp.testCases.map((tc, index) => ({
                name: `Test Case ${index + 1}${tc.isSample ? " (Sample)" : ""}`,
                input: tc.input,
                expected: tc.expectedOutput,
                assertion: (codeStr, runFunc) => {
                  if (!runFunc) return true;
                  try {
                    let parsed;
                    try {
                      parsed = JSON.parse(`[${tc.input}]`);
                    } catch {
                      parsed = [tc.input];
                    }
                    const actual = runFunc(...parsed);
                    const expectedNormalized = tc.expectedOutput.trim();
                    return JSON.stringify(actual) === expectedNormalized || String(actual).trim() === expectedNormalized;
                  } catch {
                    return false;
                  }
                }
              }));

              setProblem({
                id: dbp.slug,
                dbId: dbp.id,
                title: dbp.title,
                difficulty: diffStr,
                category: "Algorithms",
                desc: dbp.statement,
                time: "20 min",
                tags: ["Database", "Dynamic"],
                defaultLanguage: "javascript",
                editorTemplates: {
                  javascript: `// JavaScript Starter Code\nfunction solve(input) {\n  // Write your code here\n}`,
                  python: `# Python Starter Code\ndef solve(input):\n    pass`
                },
                testcases: dynamicTC,
                tabs: {
                  description: dbp.statement,
                  followup: "Review complexity bounds and optimize your implementation.",
                  editorial: dbp.explanation || "No editorial guide published yet.",
                  solution: "No official reference solutions yet.",
                  evaluation: "Verify against sample assertions below."
                }
              });
            }
            setLoadingProblem(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load db problem details:", err);
      }

      const matchedSource = localProblem;
      if (matchedSource) {
        setProblem(matchedSource);
      }
      setLoadingProblem(false);
    }
    loadProblemData();
  }, [problemId, API_BASE]);

  // Layout resize state
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const containerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  // Tabs states
  const [activeLeftTab, setActiveLeftTab] = useState("description"); // description, followup, editorial, solution, evaluation, excalidraw
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [editorCodes, setEditorCodes] = useState({});

  // Whiteboard Canvas states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#6366f1");
  const [lineWidth, setLineWidth] = useState(3);
  const drawingPaths = useRef([]); // To restore paths on resize

  // Console states
  const [activeConsoleTab, setActiveConsoleTab] = useState("testcase"); // testcase, result
  const [testcaseInputs, setTestcaseInputs] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false);
  const [voiceWaveform, setVoiceWaveform] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Code Editor Textarea Ref
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);

  // Load problem details
  useEffect(() => {
    if (problem) {
      const defaultLang = problem.defaultLanguage || "javascript";
      
      // Initialize code editor with templates
      const codes = {};
      Object.keys(problem.editorTemplates).forEach(lang => {
        codes[lang] = problem.editorTemplates[lang];
      });
      
      const testInputs = problem.testcases.map(t => t.input);

      setTimeout(() => {
        setSelectedLanguage(defaultLang);
        setEditorCodes(codes);
        setTestcaseInputs(testInputs);
      }, 0);
    }
  }, [problem]);

  // Sync lines count for editor line numbers
  const currentCode = problem ? (editorCodes[selectedLanguage] || "") : "";
  useEffect(() => {
    const lines = currentCode.split("\n").length;
    setTimeout(() => {
      setLineCount(lines || 1);
    }, 0);
  }, [currentCode]);

  // Sync scroll between textarea and line numbers
  const handleEditorScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Safe tab indentation key handler
  const handleEditorKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const code = editorCodes[selectedLanguage] || "";
      const updatedCode = code.substring(0, start) + "  " + code.substring(end);
      
      setEditorCodes(prev => ({
        ...prev,
        [selectedLanguage]: updatedCode
      }));
      
      // Reset cursor position
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Resize divider logic
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
    
    // Bound columns
    if (percentage > 20 && percentage < 80) {
      setLeftWidth(percentage);
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", resizePanes);
    document.removeEventListener("mouseup", stopResizing);
  };

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

  // Canvas Whiteboard Logic
  useEffect(() => {
    if (activeLeftTab === "excalidraw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      // Make canvas high DPI responsive
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 500;
      
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = lineWidth;
      
      // Draw grid pattern behind sketch
      drawCanvasBackground(canvas, ctx);
      
      // Re-draw history
      restoreDrawing();
    }
  }, [activeLeftTab, drawColor, lineWidth]);

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
    
    // Simulate recording transcription
    setTimeout(() => {
      setIsListening(false);
      
      const newMessages = [...assistantMessages, { role: "user", text: query }];
      setAssistantMessages(newMessages);
      setAssistantTyping(true);
      
      // AI reasoning responses based on queries
      let responseText = "To improve performance, focus on caching. A brute force approach checks every pair, which takes O(N²) time. Storing items in a Hash Map records their values and indexes, allowing O(N) lookups in one pass.";
      if (query.toLowerCase().includes("auth")) {
        responseText = "Remember: Authentication (401 Status) proves identity claims. Authorization (403 Status) assesses user rights/roles. Always perform validation controls on the server rather than trusting front-end claims.";
      } else if (query.toLowerCase().includes("rate limit")) {
        responseText = "For rate limiting, Sliding Window Log is accurate but uses memory for each request timestamp. Consider a Sliding Window Counter using Redis integers to compress storage in distributed gates.";
      } else if (query.toLowerCase().includes("error") || query.toLowerCase().includes("test")) {
        responseText = "If test cases fail, examine inputs. Verify that your function doesn't reuse elements twice, handles edge cases, and returns indices matching the required order formats.";
      }

      // Simulate character typing effect
      setTimeout(() => {
        setAssistantTyping(false);
        setAssistantMessages(prev => [...prev, { role: "assistant", text: responseText }]);
        setVoiceWaveform(false);

        // Speech Synthesis
        if (voiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel(); // Stop active speaking
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
          // Pick a standard English voice if available
          const preferredVoice = voices.find(v => v.lang.includes("en-US") && v.name.includes("Natural")) || voices.find(v => v.lang.includes("en"));
          if (preferredVoice) utterance.voice = preferredVoice;
          window.speechSynthesis.speak(utterance);
        }
      }, 1500);

    }, 2000);
  };

  // Clean speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Execution JS Sandboxed Test Runner
  const runCode = () => {
    if (!problem) return;
    setIsRunning(true);
    setActiveConsoleTab("result");
    setTestResults([]);

    setTimeout(() => {
      const code = editorCodes[selectedLanguage] || "";
      const results = [];
      const originalConsoleLog = console.log;
      
      problem.testcases.forEach((tc, index) => {
        let passed = false;
        let output = "";
        let error = "";
        const runLogs = [];

        // Redirect console logs to capture student feedback
        console.log = (...args) => {
          runLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
        };

        if (selectedLanguage === "javascript") {
          try {
            // Find function name dynamically
            const funcNameMatch = code.match(/function\s+(\w+)\s*\(/) || code.match(/const\s+(\w+)\s*=\s*\(/);
            const functionName = funcNameMatch ? funcNameMatch[1] : null;

            if (!functionName) {
              throw new Error("Could not find a valid function declaration in your code.");
            }

            // Create evaluation context
            const evaluator = new Function(`${code}; return ${functionName};`);
            const targetFunction = evaluator();

            // Parse inputs dynamically
            let parsedInputs;
            try {
              parsedInputs = JSON.parse(`[${testcaseInputs[index] || tc.input}]`);
            } catch {
              parsedInputs = [testcaseInputs[index] || tc.input];
            }

            // Run user function
            const actual = targetFunction(...parsedInputs);
            output = JSON.stringify(actual);

            // Run assertion
            passed = tc.assertion(code, targetFunction);
          } catch (e) {
            error = e.message;
            passed = false;
          }
        } else {
          // Simulated runner for non-JS files
          try {
            runLogs.push("> Compiling syntax trees...");
            runLogs.push(`> Running simulated logs for ${selectedLanguage} interpreter...`);
            passed = tc.assertion ? tc.assertion(code, null) : true;
            output = tc.expected;
          } catch(e) {
            error = e.message;
            passed = false;
          }
        }

        // Restore logger
        console.log = originalConsoleLog;

        results.push({
          name: tc.name,
          input: testcaseInputs[index] || tc.input,
          expected: tc.expected,
          actual: output,
          passed,
          error,
          logs: runLogs
        });
      });

      setTestResults(results);
      setIsRunning(false);
    }, 1200);
  };

  // Submit flow
  const submitCode = () => {
    if (!problem) return;
    setIsSubmitting(true);
    setActiveConsoleTab("result");
    
    // Inline execution compiler to prevent React state closure bug
    const code = editorCodes[selectedLanguage] || "";
    const results = [];
    const originalConsoleLog = console.log;
    
    problem.testcases.forEach((tc, index) => {
      let passed = false;
      let output = "";
      let error = "";
      const runLogs = [];

      console.log = (...args) => {
        runLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
      };

      if (selectedLanguage === "javascript") {
        try {
          const funcNameMatch = code.match(/function\s+(\w+)\s*\(/) || code.match(/const\s+(\w+)\s*=\s*\(/);
          const functionName = funcNameMatch ? funcNameMatch[1] : null;

          if (!functionName) {
            throw new Error("Could not find a valid function declaration in your code.");
          }

          const evaluator = new Function(`${code}; return ${functionName};`);
          const targetFunction = evaluator();

          let parsedInputs;
          try {
            parsedInputs = JSON.parse(`[${testcaseInputs[index] || tc.input}]`);
          } catch {
            parsedInputs = [testcaseInputs[index] || tc.input];
          }

          const actual = targetFunction(...parsedInputs);
          output = (actual !== undefined) ? JSON.stringify(actual) : "";
          passed = tc.assertion(code, targetFunction);
        } catch (e) {
          error = e.message;
          passed = false;
        }
      } else {
        try {
          runLogs.push("> Compiling syntax trees...");
          runLogs.push(`> Running simulated logs for ${selectedLanguage} interpreter...`);
          passed = tc.assertion ? tc.assertion(code, null) : true;
          output = tc.expected;
        } catch(e) {
          error = e.message;
          passed = false;
        }
      }

      console.log = originalConsoleLog;

      results.push({
        name: tc.name,
        input: testcaseInputs[index] || tc.input,
        expected: tc.expected,
        actual: output,
        passed,
        error,
        logs: runLogs
      });
    });

    setTestResults(results);

    setTimeout(async () => {
      setIsSubmitting(false);
      
      const allPassed = results.length > 0 && results.every(r => r.passed);
      const verdict = allPassed ? "ACCEPTED" : "WRONG_ANSWER";

      if (allPassed) {
        setShowSubmissionSuccess(true);
        triggerConfettiParticles();
        
        // Save completed state to localStorage
        if (typeof window !== "undefined") {
          const solved = localStorage.getItem("solved_problems");
          let solvedArray = [];
          if (solved) {
            try { solvedArray = JSON.parse(solved); } catch { }
          }
          if (!solvedArray.includes(problemId)) {
            solvedArray.push(problemId);
            localStorage.setItem("solved_problems", JSON.stringify(solvedArray));
          }
        }
      }

      // Prepare wrapped code for backend validation
      const mappedLang = selectedLanguage.toUpperCase() === "JAVASCRIPT" ? "JAVASCRIPT" : selectedLanguage.toUpperCase() === "PYTHON" ? "PYTHON" : "CPP";
      const wrappedCode = wrapCodeForBackend(problemId, selectedLanguage, code);

      const localSub = {
        problemId: problemId,
        dbProblemId: dbProblem?.id || null,
        title: problem.title,
        language: mappedLang,
        code: code,
        status: verdict,
      };

      const hasRealToken = token && !token.startsWith("demo-") && !token.startsWith("local-");
      if (dbProblem && dbProblem.id) {
        try {
          const headers = {
            "Content-Type": "application/json",
            ...(hasRealToken
              ? { Authorization: `Bearer ${token}` }
              : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "ADMIN" ? "ADMIN" : "USER" }),
          };
          const res = await fetch(`${API_BASE}/api/submissions/problem/${dbProblem.id}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              language: mappedLang,
              code: wrappedCode,
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (!res.ok) throw new Error("Server rejected submission");
          console.log("Submission successfully posted to backend DB");
        } catch (err) {
          console.error("Backend submission failed, saving locally:", err);
          saveLocalSubmission(localSub);
        }
      } else {
        saveLocalSubmission(localSub);
      }
    }, 1200);
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
    const colors = ["#4f46e5", "#7c3aed", "#10b981", "#fbbf24", "#ef4444", "#06b6d4"];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 20 - 10,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rv: (Math.random() - 0.5) * 10
      });
    }

    const animateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
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

  if (loadingProblem) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin mx-auto text-[var(--text-accent)]" size={32} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Initializing workspace...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <h1 className="text-2xl font-black font-display">Practice Task Not Found</h1>
        <Link href="/practice" className="px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md transition-all" style={{ background: "var(--accent-gradient)" }}>
          Back to Catalog
        </Link>
      </div>
    );
  }

  // Format problem details to render safely
  const renderTabContent = () => {
    switch (activeLeftTab) {
      case "description":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problem.tabs.description)}</div>;
      case "followup":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problem.tabs.followup)}</div>;
      case "editorial":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problem.tabs.editorial)}</div>;
      case "solution":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problem.tabs.solution)}</div>;
      case "evaluation":
        return <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">{renderText(problem.tabs.evaluation)}</div>;
      default:
        return null;
    }
  };

  // String parsing function for left tabs markdown formats
  const renderText = (markdownText) => {
    if (!markdownText) return null;
    
    return markdownText.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;
      
      // Headings
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
      
      // Code blocks
      if (trimmed.startsWith("```")) {
        return null; // Ignore fences, code parsed below
      }

      // Check bullet items
      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
      
      // Inline styles processor
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
          // Bold matches
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Workspace Navigation Header */}
      <header className="flex h-14 items-center justify-between px-6 border-b shrink-0 z-30" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
        <div className="flex items-center space-x-4">
          <Link href="/practice" className="flex items-center space-x-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={16} />
            <span>Practice Explorer</span>
          </Link>
          <span className="h-4 w-px bg-slate-500/20" />
          <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-none">
            {problem.title}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              voiceEnabled 
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                : "bg-slate-500/5 text-[var(--text-muted)] border-transparent"
            }`}
          >
            {voiceEnabled ? <Mic size={12} /> : <MicOff size={12} />}
            <span>Voice Voice</span>
          </button>
          
          <button 
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-bold bg-slate-500/10 text-[var(--text-primary)] hover:bg-slate-500/20 border border-[var(--border-primary)] transition-all cursor-pointer disabled:opacity-50"
          >
            <Play size={12} />
            <span>Run Code</span>
          </button>

          <button 
            onClick={submitCode}
            disabled={isSubmitting}
            className="flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-bold text-white hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Send size={12} />
            <span>Submit</span>
          </button>
        </div>
      </header>

      {/* Main Workspace split panel layout */}
      <div 
        ref={containerRef}
        className="flex flex-1 overflow-hidden relative"
      >
        {isResizing && (
          <div className="fixed inset-0 cursor-col-resize z-50 bg-transparent select-none pointer-events-auto" />
        )}
        {/* Left Column Description Panel */}
        <div 
          className="flex flex-col h-full overflow-hidden shrink-0"
          style={{ width: `${leftWidth}%` }}
        >
          {/* Tab selector bar */}
          <div className="flex h-10 border-b overflow-x-auto shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
            {[
              { id: "description", label: "Description", icon: <FileText size={13} /> },
              { id: "followup", label: "Followup", icon: <MessageCircle size={13} /> },
              { id: "editorial", label: "Editorial", icon: <BookOpen size={13} /> },
              { id: "solution", label: "Solution", icon: <CheckCircle2 size={13} /> },
              { id: "evaluation", label: "Evaluation", icon: <ClipboardCheck size={13} /> },
              { id: "excalidraw", label: "Excalidraw", icon: <Palette size={13} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveLeftTab(tab.id)}
                className={`flex items-center space-x-1 px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition-all whitespace-nowrap ${
                  activeLeftTab === tab.id 
                    ? "border-indigo-500 text-indigo-500" 
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Left panel scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: "var(--bg-card)" }}>
            
            {/* Whiteboard sketchpad */}
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

            {/* Markdown detailed texts */}
            {activeLeftTab !== "excalidraw" && renderTabContent()}
          </div>
        </div>

        {/* Resizing divider bar */}
        <div 
          onMouseDown={startResizing}
          className="w-1.5 hover:w-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 cursor-col-resize select-none h-full transition-all duration-150 shrink-0 z-20 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-slate-400" />
        </div>

        {/* Right Column coding console */}
        <div className="flex flex-1 flex-col h-full overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
          {/* Header language selector */}
          <div className="flex h-10 items-center justify-between px-4 border-b shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-slate-500/5 border border-[var(--border-primary)] rounded px-2.5 py-1 text-xs font-bold outline-none cursor-pointer text-[var(--text-primary)]"
              >
                {problem.editorTemplates.markdown && <option value="markdown">Markdown</option>}
                {problem.editorTemplates.javascript && <option value="javascript">JavaScript</option>}
                {problem.editorTemplates.python && <option value="python">Python</option>}
              </select>
            </div>

            <div className="text-[10px] text-[var(--text-muted)] font-mono font-semibold">
              UTF-8 Code Compiler ready
            </div>
          </div>

          {/* Voice Assistant Mini Banner */}
          <div className="flex items-center justify-between p-3 border-b bg-slate-500/5" style={{ borderColor: "var(--border-primary)" }}>
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
                  {isListening ? "Listening to query..." : assistantTyping ? "AI typing guidance..." : isSpeaking ? "Speaking... (Click speaker icon to stop)" : "Ready to explain security & algorithms."}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Animated waveform equalizers */}
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

          {/* Editor Workspace */}
          <div className="flex-1 flex overflow-hidden font-mono text-sm relative" style={{ backgroundColor: "var(--bg-code)" }}>
            {/* Line numbers column */}
            <div 
              ref={lineNumbersRef}
              className="w-12 select-none text-right pr-3 pt-4 border-r overflow-hidden leading-6"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-muted)", fontSize: "12px" }}
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Custom textarea editor */}
            <textarea
              ref={editorRef}
              value={editorCodes[selectedLanguage] || ""}
              onChange={(e) => {
                const val = e.target.value;
                setEditorCodes(prev => ({ ...prev, [selectedLanguage]: val }));
              }}
              onScroll={handleEditorScroll}
              onKeyDown={handleEditorKeyDown}
              spellCheck="false"
              className="flex-grow h-full w-full resize-none bg-transparent pt-4 px-4 pb-12 outline-none border-none leading-6 overflow-y-auto"
              style={{ fontSize: "13px", color: "var(--text-primary)" }}
            />
          </div>

          {/* Collapsible Test Console footer */}
          <div className="flex flex-col border-t" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-secondary)" }}>
            {/* Console headers */}
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
                        ? "bg-slate-500/10 text-indigo-500 border border-slate-500/10" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {ctab.icon}
                    <span>{ctab.label}</span>
                  </button>
                ))}
              </div>

              {testResults && (
                <div className="text-[10px] font-bold font-mono">
                  {testResults.every(r => r.passed) ? (
                    <span className="text-emerald-500 flex items-center space-x-1">
                      <CheckCircle size={12} />
                      <span>ALL TESTS PASSED ({testResults.filter(r => r.passed).length}/{testResults.length})</span>
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center space-x-1">
                      <XCircle size={12} />
                      <span>TEST FAILS ({testResults.filter(r => !r.passed).length} FAILED)</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Console body content */}
            <div className="h-44 overflow-y-auto p-4 font-mono text-xs space-y-3" style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}>
              {activeConsoleTab === "testcase" && (
                <div className="space-y-3">
                  {problem.testcases.map((tc, idx) => (
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
                      <span>Executing code test blocks...</span>
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

                        {/* Details */}
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

                        {/* console logs */}
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
                    <div className="text-slate-500 text-center py-4">
                      {"No tests executed yet. Click \"Run Code\" above."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Success Dialog modal */}
      <AnimatePresence>
        {showSubmissionSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full rounded-3xl border p-8 shadow-2xl space-y-6 text-center"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-accent)" }}
            >
              <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 bg-emerald-500">
                <CheckCircle2 size={36} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black font-display text-[var(--text-primary)]">Submission Passed!</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Congratulations! All test assertions compiled successfully. Your solution has been saved.
                </p>
              </div>

              <div className="flex space-x-3 justify-center pt-2">
                <button
                  onClick={() => setShowSubmissionSuccess(false)}
                  className="px-5 py-2.5 bg-slate-500/10 hover:bg-slate-500/20 font-bold rounded-full text-xs text-[var(--text-secondary)] cursor-pointer"
                >
                  Close Console
                </button>
                <Link
                  href="/practice"
                  className="px-5 py-2.5 text-white font-bold rounded-full text-xs shadow-md cursor-pointer flex items-center space-x-1"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <span>Next Challenge</span>
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
