"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, 
  RefreshCw, HelpCircle, Trophy, FolderOpen, FileCode, 
  Terminal as TerminalIcon, Sparkles, Volume2, VolumeX, Play,
  Heart, RotateCcw, ShieldCheck, Flame, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LEVELS = [
  {
    level: 1,
    title: "1. Sum of Evens",
    language: "JavaScript",
    file: "sum_evens.js",
    instructions: "Fix the function to filter and sum only the even numbers in the array. Watch out for assignments inside conditional clauses, and ensure the return statement sits correctly after checking all numbers!",
    hint: "Use the triple-equals operator `===` for strict comparison, and move the `return` statement out of the loop body so it doesn't terminate early.",
    defaultCode: `function sumOfEvens(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    // There are 2 bugs in this block!
    if (arr[i] % 2 = 0) {
      sum += arr[i];
      return sum;
    }
  }
}`,
    validate: (code) => {
      try {
        const fullCode = `${code}\nreturn sumOfEvens;`;
        const testFn = new Function(fullCode)();
        
        if (typeof testFn !== "function") {
          return { success: false, error: "Function sumOfEvens is not defined or not a function." };
        }

        const tests = [
          { input: [[1, 2, 3, 4]], expected: 6 },
          { input: [[1, 3, 5]], expected: 0 },
          { input: [[2, 4, 6, 8]], expected: 20 },
          { input: [[]], expected: 0 },
        ];

        for (let i = 0; i < tests.length; i++) {
          const result = testFn(...tests[i].input);
          if (result !== tests[i].expected) {
            return {
              success: false,
              error: `Test ${i + 1} Failed: sumOfEvens(${JSON.stringify(tests[i].input[0])}) expected ${tests[i].expected}, but got ${result}`
            };
          }
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  },
  {
    level: 2,
    title: "2. Palindrome Checker",
    language: "Python",
    file: "palindrome.py",
    instructions: "Fix this Python function to check if a string is a palindrome (ignoring casing and spaces). In Python, strings are immutable, and the slice step requires proper step syntax!",
    hint: "In Python, string replacement returns a new string and does not modify the original string in place. Also, reversing a string with slices uses a negative step: `[::-1]`.",
    defaultCode: `def is_palindrome(s):
    # Clean the string (remove spaces)
    s.replace(" ", "")
    
    # Check if string matches its reverse
    return s == s[::1]`,
    validate: (code) => {
      const hasAssignment = /s\s*=\s*s\.replace/.test(code) || /s\s*=\s*[a-zA-Z0-9_.]*replace/.test(code);
      const hasLower = /\.lower\(\)/.test(code) || /\.casefold\(\)/.test(code);
      const hasReverseSlice = /s\[::-1\]/.test(code);

      if (!hasAssignment) {
        return {
          success: false,
          error: "Syntax check failed! Python strings are immutable. Doing `s.replace(' ', '')` does not update `s`. You must reassign it: `s = s.replace(...)`."
        };
      }
      
      if (!hasLower) {
        return {
          success: false,
          error: "Validation error! To ignore casing, convert the string to lowercase using `.lower()` before checking palindrome status."
        };
      }

      if (!hasReverseSlice) {
        return {
          success: false,
          error: "Algorithm error! Reversing string with slicing in Python is written as `s[::-1]`. Your current syntax `s[::1]` traverses forward!"
        };
      }

      return { success: true };
    }
  },
  {
    level: 3,
    title: "3. Active Customer Spend",
    language: "SQL",
    file: "customers.sql",
    instructions: "Fix the SQL query to retrieve names and total spends of active customers who spent more than $100. Correct the filter clause and query logic operators!",
    hint: "Use the `WHERE` clause for row filtering (instead of `HAVING`, which aggregates groups). Additionally, the standard SQL conjunction operator is the keyword `AND` rather than `&&`.",
    defaultCode: `SELECT name, total_spent
FROM customers
HAVING status = 'active'
&& total_spent > 100;`,
    validate: (code) => {
      const cleaned = code.toLowerCase().replace(/\s+/g, " ").trim();
      
      if (cleaned.includes("having status")) {
        return {
          success: false,
          error: "SQL Execution Error: `HAVING` is used to filter aggregated groups. To filter individual records before group aggregation, use the `WHERE` clause."
        };
      }
      
      if (!cleaned.includes("where status = 'active'") && !cleaned.includes("where status='active'")) {
        return {
          success: false,
          error: "Data verification failed: Query doesn't fetch active users correctly. Ensure query includes `WHERE status = 'active'`."
        };
      }
      
      if (cleaned.includes("&&")) {
        return {
          success: false,
          error: "Syntax Error: In standard SQL, the conjunction operator is the word `AND`. The double ampersand `&&` is non-standard."
        };
      }

      if (!cleaned.includes("and total_spent > 100") && !cleaned.includes("and total_spent>100")) {
        return {
          success: false,
          error: "Data verification failed: Filter condition for total spent spent is missing or incorrect. It must check `total_spent > 100`."
        };
      }

      return { success: true };
    }
  },
  {
    level: 4,
    title: "4. Stale Count Hook",
    language: "JavaScript",
    file: "useAutoIncrement.js",
    instructions: "Fix the React custom hook. It should auto-increment `count` by 1 every second. But it's stuck because of a stale closure in the interval, and it creates memory leaks because it never cleans up the timer!",
    hint: "Use a functional state updater inside `setCount(prev => prev + 1)` so the interval hook references the freshest state without closures. Also return a cleanup function `() => clearInterval(...)` inside the `useEffect` callback.",
    defaultCode: `import { useState, useEffect } from "react";

export function useAutoIncrement() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);
    }, 1000);
  }, []);

  return count;
}`,
    validate: (code) => {
      const hasCleanup = /return\s+(\(\)\s*=>\s*|function\(\)\s*\{?\s*)clearInterval\(/.test(code);
      const hasFunctionalUpdate = /setCount\(\s*(\w+)\s*=>\s*\1\s*\+\s*1\s*\)/.test(code) || 
                                  /setCount\(\s*function\s*\(\s*(\w+)\s*\)\s*\{\s*return\s+\1\s*\+\s*1\s*;?\s*\}\s*\)/.test(code);

      if (!hasFunctionalUpdate) {
        return {
          success: false,
          error: "Hook state test failed! Because the dependency array `[]` is empty, `count` inside the setInterval closure remains locked at `0`. Use functional updates: `setCount(prev => prev + 1)`."
        };
      }

      if (!hasCleanup) {
        return {
          success: false,
          error: "Resource leak detected! The interval is never cleared when the component unmounts. Return a cleanup function inside `useEffect`, e.g., `return () => clearInterval(id);`."
        };
      }

      return { success: true };
    }
  },
  {
    level: 5,
    title: "5. Parallel Mapping",
    language: "JavaScript",
    file: "fetch_users.js",
    instructions: "Fix this async function. It is intended to fetch profile data for multiple userIds concurrently and return the array of results. Right now, it returns an array of unresolved Promises instead of the fetched data!",
    hint: "An `async` function inside `.map()` returns a Promise. This yields an array of Promises. Use `await Promise.all(...)` to await all promises in parallel before returning.",
    defaultCode: `async function fetchAllUserData(userIds, fetchFunc) {
  // Map ids to async fetch calls
  const data = userIds.map(async (id) => {
    return await fetchFunc(id);
  });
  
  return data;
}`,
    validate: (code) => {
      try {
        const fullCode = `${code}\nreturn fetchAllUserData;`;
        const testFn = new Function(fullCode)();
        
        if (typeof testFn !== "function") {
          return { success: false, error: "Function fetchAllUserData is not defined or not a function." };
        }

        const mockFetch = async (id) => {
          return { id, data: `user_${id}` };
        };

        const resultPromise = testFn([101, 102, 103], mockFetch);
        
        if (!(resultPromise instanceof Promise)) {
          return {
            success: false,
            error: "Logical Error: The function must return a Promise that resolves to the array of fetched users."
          };
        }

        return resultPromise.then((results) => {
          if (!Array.isArray(results)) {
            return { success: false, error: "Logical Error: The resolved value is not an array." };
          }
          if (results.length !== 3) {
            return { success: false, error: `Logical Error: Expected 3 records, got ${results.length}.` };
          }
          if (results[0] instanceof Promise) {
            return {
              success: false,
              error: "Execution Failure: You returned `data`, which is an array of unresolved Promises! Use `await Promise.all(data)` to wait for all parallel fetches to finish."
            };
          }
          if (results[0].data !== "user_101") {
            return { success: false, error: "Logical Error: The fetched user details are incorrect." };
          }
          return { success: true };
        }).catch((err) => {
          return { success: false, error: `Execution Error: ${err.message}` };
        });
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  }
];

export default function DebugTheBug({ onProgressChange, savedProgress }) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [userCode, setUserCode] = useState(LEVELS[0].defaultCode);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lives, setLives] = useState(3);
  const [isDead, setIsDead] = useState(false);
  
  const [terminalLogs, setTerminalLogs] = useState([
    { text: "[SYSTEM] Booting Debugger sandbox v2.1.0...", type: "system" },
    { text: "[SANDBOX] Workspace initialized. Select compile target to start.", type: "system" }
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const currentLevel = LEVELS[currentLevelIdx];
  const editorRef = useRef(null);

  // Synth audio player
  const playRetroSound = useCallback((type) => {
    if (typeof window === "undefined" || !audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === "success") {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
        });
      } else if (type === "fail") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      } else if (type === "heart-loss") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "victory") {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.3);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
          osc.start(ctx.currentTime + idx * 0.06);
          osc.stop(ctx.currentTime + idx * 0.06 + 0.3);
        });
      }
    } catch (e) {
      console.warn("Audio Context blocked:", e);
    }
  }, [audioEnabled]);

  // Load progress on mount
  useEffect(() => {
    if (savedProgress) {
      setCompletedLevels(savedProgress.completedLevels || []);
      setStreak(savedProgress.streak || 0);
      const lastCompleted = savedProgress.completedLevels || [];
      if (lastCompleted.length > 0) {
        const nextLevel = LEVELS.findIndex(l => !lastCompleted.includes(l.level));
        if (nextLevel !== -1) {
          setCurrentLevelIdx(nextLevel);
          setUserCode(LEVELS[nextLevel].defaultCode);
        } else {
          setCurrentLevelIdx(LEVELS.length - 1);
          setUserCode(LEVELS[LEVELS.length - 1].defaultCode);
        }
      }
    }
  }, [savedProgress]);

  // Sync editor initial code on level changes
  useEffect(() => {
    setUserCode(LEVELS[currentLevelIdx].defaultCode);
    setIsSuccess(completedLevels.includes(LEVELS[currentLevelIdx].level));
    setShowHint(false);
    setTerminalLogs([
      { text: `[SYSTEM] Loaded workspace: '${LEVELS[currentLevelIdx].file}' (${LEVELS[currentLevelIdx].language})`, type: "system" },
      { text: `[SANDBOX] Compilation mode set to ${LEVELS[currentLevelIdx].language}. Ready for testing.`, type: "info" }
    ]);
  }, [currentLevelIdx, completedLevels]);

  const addTerminalLog = (text, type = "info") => {
    setTerminalLogs(prev => [...prev.slice(-4), { text, type }]);
  };

  const handleKeyDown = (e) => {
    playRetroSound("click");
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.target;
      const newValue = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd);
      setUserCode(newValue);
      
      // Keep selection position
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
  };

  const runCodeTests = async () => {
    if (isDead) return;
    setIsRunning(true);
    addTerminalLog(`[RUNNER] Compiling compiler trees...`, "system");
    playRetroSound("click");

    setTimeout(async () => {
      try {
        const validationResult = await currentLevel.validate(userCode);

        if (validationResult.success) {
          setIsSuccess(true);
          playRetroSound("success");
          addTerminalLog(`[SUCCESS] Compilation successful! All test matches passed.`, "success");

          if (!completedLevels.includes(currentLevel.level)) {
            const updated = [...completedLevels, currentLevel.level];
            setCompletedLevels(updated);
            const newStreak = streak + 1;
            setStreak(newStreak);

            if (onProgressChange) {
              onProgressChange({
                completedLevels: updated,
                streak: newStreak,
                completedAt: updated.length === LEVELS.length ? new Date().toISOString() : null
              });
            }

            if (updated.length === LEVELS.length) {
              playRetroSound("victory");
              addTerminalLog(`[VICTORY] You completed the Dojo Grid! Level 100 Code Master.`, "success");
            }
          }
        } else {
          // Failure flow
          playRetroSound("fail");
          addTerminalLog(`[FAIL] ${validationResult.error}`, "error");
          
          if (!completedLevels.includes(currentLevel.level)) {
            const newLives = lives - 1;
            setLives(newLives);
            playRetroSound("heart-loss");
            if (newLives <= 0) {
              setIsDead(true);
              addTerminalLog(`[SYSTEM FAILURE] Main core overloaded. Health critical! Restart to reboot.`, "error");
            } else {
              addTerminalLog(`[WARNING] System warning. -1 Health node. ${newLives} nodes remaining.`, "error");
            }
          }
        }
      } catch (e) {
        playRetroSound("fail");
        addTerminalLog(`[CRASH] Runtime execution fault: ${e.message}`, "error");
      } finally {
        setIsRunning(false);
      }
    }, 800);
  };

  const resetWorkspace = () => {
    playRetroSound("click");
    setUserCode(currentLevel.defaultCode);
    setIsSuccess(completedLevels.includes(currentLevel.level));
    addTerminalLog(`[SYSTEM] Code reverted to baseline initial commit.`, "system");
  };

  const reviveSystem = () => {
    playRetroSound("success");
    setLives(3);
    setIsDead(false);
    setUserCode(currentLevel.defaultCode);
    addTerminalLog(`[SYSTEM] Hearts restored. Diagnostic engines rebooted.`, "system");
  };

  const getLanguageColor = (lang) => {
    switch (lang.toLowerCase()) {
      case "javascript":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "python":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "sql":
        return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default:
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    }
  };

  const lineCount = userCode.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

  return (
    <div className="text-[#E8E6E1] bg-[#160D2A]/60 backdrop-blur-md p-1 md:p-4 rounded-3xl border border-purple-500/15 space-y-6 select-none shadow-2xl relative overflow-hidden">
      
      {/* Game Bar - Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#22123C]/50 border border-purple-500/20 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
            <Trophy size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-md font-black font-display text-white tracking-tight flex items-center gap-2 uppercase font-mono">
              Debug the Bug
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-extrabold bg-[#7CFFB2]/10 text-[#7CFFB2] border border-[#7CFFB2]/20">
                v2.1
              </span>
            </h2>
            <p className="text-[10px] text-purple-300/50 font-sans">Solve the code errors and learn programming syntax</p>
          </div>
        </div>

        {/* Lives, Streak, Audio controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Health indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-950/30 border border-purple-500/20">
            <span className="text-[10px] font-mono font-bold text-purple-300/60 mr-1 uppercase">Health:</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart 
                key={i} 
                size={14} 
                className={`${
                  i < lives 
                    ? "text-rose-500 fill-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                    : "text-purple-900 fill-transparent"
                } transition-all duration-300`} 
              />
            ))}
          </div>

          {/* Streak indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-950/30 border border-purple-500/20">
            <Flame size={14} className="text-amber-500 fill-amber-500/10" />
            <span className="text-[10px] font-mono font-bold text-purple-300/60 uppercase">Streak:</span>
            <span className="text-xs font-black text-amber-400">{streak}</span>
          </div>

          {/* Volume toggle */}
          <button 
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              playRetroSound("click");
            }}
            className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/25 transition-colors cursor-pointer text-purple-300/70 hover:text-white"
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {/* Grid selector of levels */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {LEVELS.map((lvl, index) => {
          const isLvlCompleted = completedLevels.includes(lvl.level);
          const isLvlActive = currentLevelIdx === index;
          return (
            <button
              key={lvl.level}
              onClick={() => {
                if (isDead) return;
                playRetroSound("click");
                setCurrentLevelIdx(index);
              }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                isLvlActive
                  ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : isLvlCompleted
                  ? "bg-[#251347]/30 text-purple-300 border border-purple-900/30 hover:bg-purple-950/40"
                  : "bg-[#1d0b38]/20 text-purple-400/50 border border-purple-950/40 hover:text-purple-300"
              }`}
            >
              {isLvlCompleted ? <CheckCircle2 size={12} className="text-[#7CFFB2] fill-[#7CFFB2]/10" /> : null}
              <span>{lvl.level}. {lvl.title.split(". ")[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Play Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left pane: Instructions, Target details, Hints */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-start">
          <div className="bg-[#24133F]/35 hover:bg-[#2C184E]/45 border border-purple-500/20 rounded-3xl p-5 md:p-6 space-y-5 shadow-2xl relative overflow-hidden">
            
            {/* Level Title banner */}
            <div className="flex items-center justify-between border-b border-purple-500/10 pb-4">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300/50">Level {currentLevel.level} Objective</span>
                <h3 className="text-md font-bold font-mono text-white tracking-tight">{currentLevel.title}</h3>
              </div>
              <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border border-purple-500/30 bg-purple-950/30 text-purple-300">
                {currentLevel.language}
              </span>
            </div>

            {/* Instruction description */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-xs text-purple-200/70 leading-relaxed">
                <BookOpen size={15} className="text-purple-400 shrink-0 mt-0.5" />
                <p>{currentLevel.instructions}</p>
              </div>
            </div>

            {/* Hint Box (Dynamic Reveal) */}
            <div className="border-t border-purple-500/10 pt-4 mt-auto">
              {showHint ? (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl border border-purple-500/15 bg-purple-950/20 text-[11px] text-purple-300/70 leading-relaxed relative font-mono"
                >
                  <div className="font-bold flex items-center gap-1.5 uppercase font-mono mb-1 tracking-wider text-purple-400 text-[9px]">
                    <Sparkles size={11} /> Hint Decrypted
                  </div>
                  <p>{currentLevel.hint}</p>
                </motion.div>
              ) : (
                <button
                  onClick={() => {
                    playRetroSound("click");
                    setShowHint(true);
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/25 hover:bg-purple-950/30 text-purple-300/80 hover:text-white text-[11px] font-bold tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                >
                  <HelpCircle size={13} />
                  <span>Decrypt Hint Node</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Overview Card */}
          <div className="bg-[#24133F]/35 border border-purple-500/20 rounded-3xl p-5 md:p-6 space-y-4 shadow-2xl">
            <h4 className="text-xs font-black text-white tracking-wide uppercase font-mono flex items-center gap-2">
              <ShieldCheck size={14} className="text-purple-400" />
              <span>Grid Decryption Status</span>
            </h4>
            
            <div className="grid grid-cols-5 gap-2 pt-2">
              {LEVELS.map((l) => {
                const finished = completedLevels.includes(l.level);
                return (
                  <div 
                    key={l.level} 
                    className={`h-2 rounded-full ${
                      finished 
                        ? "bg-[#7CFFB2]" 
                        : currentLevelIdx === l.level - 1 
                        ? "bg-purple-500 animate-pulse" 
                        : "bg-purple-950/40 border border-purple-950"
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-purple-300/40 font-mono">
              Complete all 5 core modules to unlock the Code Master title badge.
            </p>
          </div>
        </div>

        {/* Right pane: VS Code style editor workspace + Terminal console */}
        <div className="lg:col-span-3 space-y-6 flex flex-col justify-start">
          
          {/* Terminal / Code Editor card */}
          <div className="bg-[#1C0F32]/50 border border-purple-500/20 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col min-h-[460px]">
            
            {/* IDE tab header bar */}
            <div className="flex items-center justify-between bg-purple-950/30 border-b border-purple-500/10 px-4 py-2">
              <div className="flex items-center space-x-2">
                <FileCode size={13} className="text-purple-400" />
                <span className="text-[11px] font-mono text-purple-300 font-semibold">
                  {currentLevel.file}
                </span>
                <span className="h-1 w-1 rounded-full bg-purple-500/30" />
              </div>
              <div className="flex space-x-1">
                <span className="h-2 w-2 rounded-full border border-purple-950 bg-rose-500/50" />
                <span className="h-2 w-2 rounded-full border border-purple-950 bg-amber-500/50" />
                <span className="h-2 w-2 rounded-full border border-purple-950 bg-emerald-500/50" />
              </div>
            </div>

            {/* Interactive Editor Window */}
            <div className="relative flex-grow flex items-stretch font-mono text-[12px] bg-purple-950/20 min-h-[220px]">
              {isDead ? (
                /* Dead system screen overlay */
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 text-center p-6 space-y-4">
                  <AlertTriangle size={36} className="text-rose-500" />
                  <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono">System Core Overloaded</h3>
                  <p className="text-[11px] text-purple-300/50 max-w-sm font-sans">
                    You have run out of system health nodes due to runtime compiler errors. Reboot system diagnostics to try again.
                  </p>
                  <button
                    onClick={reviveSystem}
                    className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 border border-purple-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-mono shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                  >
                    <RotateCcw size={13} />
                    <span>Reboot Diagnostics</span>
                  </button>
                </div>
              ) : null}

              {/* Gutter Line numbers */}
              <div className="w-10 bg-purple-950/15 border-r border-purple-500/10 text-right pr-2.5 py-4 text-purple-300/30 select-none text-[11px] font-semibold leading-6">
                {lineNumbers.map(num => (
                  <div key={num}>{num}</div>
                ))}
              </div>

              {/* The textarea input */}
              <textarea
                ref={editorRef}
                value={userCode}
                onChange={(e) => {
                  if (!isDead && !isSuccess) {
                    setUserCode(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={isDead || isSuccess}
                className="flex-grow p-4 bg-transparent text-[#E8E6E1] font-mono outline-none border-none resize-none leading-6 scrollbar-thin whitespace-pre focus:ring-0 select-text"
                spellCheck="false"
                style={{
                  minHeight: "220px",
                  caretColor: "#D8B4FE"
                }}
              />
            </div>

            {/* Simulated compiler logs screen */}
            <div className="bg-purple-950/20 border-t border-purple-500/10 p-4 font-mono text-[11px] space-y-2 h-[120px] overflow-y-auto scrollbar-thin flex flex-col justify-start">
              <div className="flex items-center space-x-1.5 text-purple-300/40 border-b border-purple-500/10 pb-1.5 mb-1.5 uppercase font-bold text-[9px] tracking-wide">
                <TerminalIcon size={12} />
                <span>Compiler Diagnostic Logs</span>
              </div>
              {terminalLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`leading-relaxed ${
                    log.type === "system" 
                      ? "text-purple-300/40" 
                      : log.type === "success" 
                      ? "text-[#7CFFB2] font-bold" 
                      : log.type === "error" 
                      ? "text-rose-400 underline font-bold" 
                      : "text-purple-200"
                  }`}
                >
                  {log.text}
                </div>
              ))}
            </div>

            {/* Action Bar controls */}
            <div className="bg-purple-950/30 border-t border-purple-500/10 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={resetWorkspace}
                  disabled={isDead || isSuccess || isRunning}
                  className="px-3.5 py-2 rounded-xl text-xs border border-purple-500/20 hover:bg-purple-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold cursor-pointer text-purple-300 hover:text-white flex items-center gap-1.5 font-mono"
                >
                  <RefreshCw size={12} />
                  <span>Reset Commit</span>
                </button>
              </div>

              <div className="flex gap-2">
                {isSuccess ? (
                  currentLevelIdx < LEVELS.length - 1 ? (
                    <button
                      onClick={() => {
                        playRetroSound("click");
                        setCurrentLevelIdx(prev => prev + 1);
                      }}
                      className="px-4 py-2 rounded-xl text-xs text-white bg-purple-600 hover:bg-purple-500 border border-purple-400 hover:scale-102 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all cursor-pointer font-bold flex items-center gap-1.5 font-mono"
                    >
                      <span>Next Level</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <div className="px-4 py-2 rounded-xl text-xs text-[#7CFFB2] bg-[#7CFFB2]/5 border border-[#7CFFB2]/20 font-bold flex items-center gap-1.5 font-mono">
                      <ShieldCheck size={13} />
                      <span>Code Master Confirmed!</span>
                    </div>
                  )
                ) : (
                  <button
                    onClick={runCodeTests}
                    disabled={isDead || isRunning}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 border border-purple-400 hover:scale-102 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all cursor-pointer flex items-center gap-1.5 font-mono"
                  >
                    {isRunning ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Play size={13} className="fill-white text-white" />
                    )}
                    <span>Run Test Cases</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
