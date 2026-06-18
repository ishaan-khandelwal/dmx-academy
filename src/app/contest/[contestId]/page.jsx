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
import { contests } from "@/data/contestData";
import { useAuth } from "@/context/AuthContext";

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

export default function ContestWorkspace() {
  const params = useParams();
  const contestId = params.contestId;
  const { token, API_BASE } = useAuth();
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
    async function loadContest() {
      let found = null;

      try {
        const res = await fetch(`${API_BASE}/api/contests/${contestId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.contest) {
            const dbContest = data.contest;
            
            const now = new Date();
            const start = new Date(dbContest.startTime);
            const end = new Date(dbContest.endTime);
            const durationMins = Math.round((end - start) / 60000);
            
            let status = "upcoming";
            if (now >= start && now <= end) {
              status = "active";
            } else if (now > end) {
              status = "past";
            }

            const resolvedProblems = [];
            if (dbContest.contestProblems && dbContest.contestProblems.length > 0) {
              for (const cp of dbContest.contestProblems) {
                const dbProb = cp.problem;
                if (!dbProb) continue;
                
                try {
                  const resProb = await fetch(`${API_BASE}/api/problems/${dbProb.slug}`);
                  if (resProb.ok) {
                    const dataProb = await resProb.json();
                    if (dataProb.success && dataProb.problem) {
                      const fullProb = dataProb.problem;
                      
                      const mappedProb = {
                        id: String(fullProb.id),
                        title: fullProb.title,
                        difficulty: fullProb.difficulty.charAt(0).toUpperCase() + fullProb.difficulty.slice(1).toLowerCase(),
                        category: fullProb.category || "General",
                        desc: fullProb.statement,
                        points: cp.points || 100,
                        defaultLanguage: "javascript",
                        editorTemplates: {
                          javascript: `// JavaScript Starter Code\nfunction solve(input) {\n  // Write your code here\n  return "";\n}`,
                          python: `# Python 3 Starter Code\ndef solve(input_data):\n    # Write your code here\n    pass`
                        },
                        testcases: (fullProb.testCases || []).map((tc, index) => ({
                          name: `Test Case ${index + 1}`,
                          input: tc.input || "",
                          expected: tc.expectedOutput || "",
                          expectedOutput: tc.expectedOutput || "",
                          isSample: tc.isSample || false,
                          assertion: (codeStr, runFunc) => {
                            if (!runFunc) return false;
                            try {
                              const cleanExpected = (tc.expectedOutput || "").trim().replace(/\r/g, "");
                              let parsedInputs;
                              try {
                                parsedInputs = JSON.parse(`[${tc.input}]`);
                              } catch {
                                parsedInputs = [tc.input];
                              }
                              const actual = runFunc(...parsedInputs);
                              const cleanActual = (actual !== undefined ? actual : "").toString().trim().replace(/\r/g, "");
                              return cleanActual === cleanExpected;
                            } catch {
                              return false;
                            }
                          }
                        })),
                        tabs: {
                          description: `### ${fullProb.title}\n\n${fullProb.statement}\n\n### Input Format\n${fullProb.inputFormat}\n\n### Output Format\n${fullProb.outputFormat}\n\n### Constraints\n${fullProb.constraints}`,
                          followup: `### Followup\n${fullProb.explanation || "No follow-up explanations provided."}`,
                          editorial: "No official editorial provided.",
                          solution: "No official solutions provided.",
                          evaluation: `Time Limit: ${fullProb.timeLimitMs || 1000}ms\nMemory Limit: ${fullProb.memoryLimitMb || 256}MB`
                        }
                      };
                      resolvedProblems.push(mappedProb);
                    }
                  }
                } catch (errProb) {
                  console.error("Failed fetching problem details for slug:", dbProb.slug, errProb);
                }
              }
            }

            found = {
              id: String(dbContest.id),
              title: dbContest.title,
              desc: dbContest.description || "No description provided.",
              durationMins,
              totalPoints: resolvedProblems.reduce((sum, p) => sum + p.points, 0) || 300,
              status,
              timeLeftStr: status === "active" ? `${Math.round((end - now) / 60000)}m remaining` : "Completed",
              startTime: `Starts at ${start.toLocaleTimeString()} on ${start.toLocaleDateString()}`,
              problems: resolvedProblems,
              leaderboard: []
            };
          }
        }
      } catch (err) {
        console.error("Failed fetching contest details from API:", err);
      }

      if (!found) {
        found = contests.find(c => c.id === contestId);
        if (!found && typeof window !== "undefined") {
          const dynamicRaw = localStorage.getItem("synapse_dynamic_contests");
          if (dynamicRaw) {
            try {
              const dynamicContests = JSON.parse(dynamicRaw);
              found = dynamicContests.find(c => c.id === contestId) || null;
            } catch (e) {
              console.error("Error reading dynamic contest detail:", e);
            }
          }
        }
      }

      setContest(found);
      setLoadingContest(false);
    }

    loadContest();
  }, [contestId, API_BASE]);

  // Terminate contest callback
  const finishContest = useCallback(() => {
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
  const startContest = () => {
    if (!contest) return;
    
    setSecondsLeft(contest.durationMins * 60);
    setStartTimeStamp(getCurrentTime());
    
    const initialCodes = {};
    contest.problems.forEach(prob => {
      Object.keys(prob.editorTemplates).forEach(lang => {
        initialCodes[`${prob.id}_${lang}`] = prob.editorTemplates[lang];
      });
    });
    setEditorCodes(initialCodes);

    if (contest.problems[0]) {
      setTestcaseInputs(contest.problems[0].testcases.map(t => t.input));
      setSelectedLanguage(contest.problems[0].defaultLanguage || "javascript");
    }

    setContestStarted(true);
  };

  // Safe tab indentation key handler
  const handleEditorKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const updatedCode = currentCode.substring(0, start) + "  " + currentCode.substring(end);
      
      setEditorCodes(prev => ({
        ...prev,
        [currentCodeKey]: updatedCode
      }));
      
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
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
  const runCode = () => {
    if (!activeQuestion) return;
    setIsRunning(true);
    setActiveConsoleTab("result");
    setTestResults([]);

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

        if (selectedLanguage === "javascript") {
          try {
            const funcNameMatch = currentCode.match(/function\s+(\w+)\s*\(/) || currentCode.match(/const\s+(\w+)\s*=\s*\(/);
            const functionName = funcNameMatch ? funcNameMatch[1] : null;

            if (!functionName) {
              throw new Error("Could not find a valid function declaration in your code.");
            }

            const evaluator = new Function(`${currentCode}; return ${functionName};`);
            const targetFunction = evaluator();

            let parsedInputs;
            try {
              parsedInputs = JSON.parse(`[${testcaseInputs[index] || tc.input}]`);
            } catch {
              parsedInputs = [testcaseInputs[index] || tc.input];
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
        } else {
          // Simulated runner for other files
          try {
            runLogs.push("> Compiling code variables...");
            runLogs.push(`> Simulating execution for ${selectedLanguage} interpreter...`);
            passed = tc.assertion ? tc.assertion(currentCode, null) : true;
            output = tc.expected || tc.expectedOutput;
          } catch(e) {
            error = e.message;
            passed = false;
          }
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
  };

  // Submit flow
  const submitCode = () => {
    if (!activeQuestion) return;
    setIsSubmitting(true);
    setActiveConsoleTab("result");
    
    runCode();

    setTimeout(() => {
      setIsSubmitting(false);
      
      const allPassed = testResults && testResults.length > 0 && testResults.every(r => r.passed);
      if (allPassed) {
        triggerConfettiParticles();
        
        // Award points if not already solved
        if (!solvedQuestions.includes(activeQuestion.id)) {
          setSolvedQuestions(prev => [...prev, activeQuestion.id]);
          setUserScore(prev => prev + activeQuestion.points);
        }
      }
    }, 1800);
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      
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
                onClick={startContest}
                className="flex-grow py-3 font-bold rounded-xl text-xs text-white shadow-md cursor-pointer"
                style={{ background: "var(--accent-gradient)" }}
              >
                {"Start Contest"}
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
                      disabled={isRunning}
                      className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Play size={10} />
                      <span>Run Testcases</span>
                    </button>

                    <button 
                      onClick={submitCode}
                      disabled={isSubmitting}
                      className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send size={10} />
                      <span>Submit Solution</span>
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
