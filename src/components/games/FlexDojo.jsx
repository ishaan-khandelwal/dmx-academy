/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, 
  RefreshCw, HelpCircle, Trophy, FolderOpen, FileCode, 
  Terminal as TerminalIcon, Sparkles, Volume2, VolumeX, Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LEVELS = [
  {
    level: 1,
    title: "1. Justify Center",
    instructions: "Align the active cyber-ninja modules with their designated landing zones by centering them horizontally. Apply the `justify-content` flex attribute.",
    hint: "justify-content: center;",
    defaultCode: "/* CSS rules */\njustify-content: ",
    targetStyles: { display: "flex", justifyContent: "center" },
    items: [{ id: 1, emoji: "🥷" }]
  },
  {
    level: 2,
    title: "2. Flex End Axis",
    instructions: "Align the robot modules to the end of the horizontal row (right side).",
    hint: "justify-content: flex-end;",
    defaultCode: "justify-content: ",
    targetStyles: { display: "flex", justifyContent: "flex-end" },
    items: [{ id: 1, emoji: "🤖" }, { id: 2, emoji: "🤖" }]
  },
  {
    level: 3,
    title: "3. Space Between Nodes",
    instructions: "Distribute the database nodes evenly across the main axis. Place the first node on the far left, and the last node on the far right.",
    hint: "justify-content: space-between;",
    defaultCode: "justify-content: ",
    targetStyles: { display: "flex", justifyContent: "space-between" },
    items: [{ id: 1, emoji: "📡" }, { id: 2, emoji: "📡" }, { id: 3, emoji: "📡" }]
  },
  {
    level: 4,
    title: "4. Align Items Center",
    instructions: "Align the rocket module to the vertical center of the launch dock.",
    hint: "align-items: center;",
    defaultCode: "align-items: ",
    targetStyles: { display: "flex", alignItems: "center" },
    items: [{ id: 1, emoji: "🚀" }]
  },
  {
    level: 5,
    title: "5. Dual-Axis Quadrant",
    instructions: "Position the space probes at the absolute bottom-right corner of the docking quadrant.",
    hint: "justify-content: flex-end;\nalign-items: flex-end;",
    defaultCode: "justify-content: flex-end;\nalign-items: ",
    targetStyles: { display: "flex", justifyContent: "flex-end", alignItems: "flex-end" },
    items: [{ id: 1, emoji: "🛸" }, { id: 2, emoji: "🛸" }]
  },
  {
    level: 6,
    title: "6. Column Layout",
    instructions: "Reconfigure the server memory drives into a vertical column layout.",
    hint: "flex-direction: column;",
    defaultCode: "flex-direction: ",
    targetStyles: { display: "flex", flexDirection: "column" },
    items: [{ id: 1, emoji: "💾" }, { id: 2, emoji: "💾" }, { id: 3, emoji: "💾" }]
  },
  {
    level: 7,
    title: "7. Reversed Columns",
    instructions: "Stack the count beacons in reverse vertical order (bottom-up) and align them to the right wall.",
    hint: "flex-direction: column-reverse;\nalign-items: flex-end;",
    defaultCode: "flex-direction: column-reverse;\nalign-items: ",
    targetStyles: { display: "flex", flexDirection: "column-reverse", alignItems: "flex-end" },
    items: [{ id: 1, emoji: "1️⃣" }, { id: 2, emoji: "2️⃣" }, { id: 3, emoji: "3️⃣" }]
  },
  {
    level: 8,
    title: "8. Beacon Wrapping Grid",
    instructions: "Enable wrapping for the star beacons to form rows, and distribute the space evenly along both axes.",
    hint: "flex-wrap: wrap;\njustify-content: space-between;\nalign-content: space-between;",
    defaultCode: "flex-wrap: wrap;\njustify-content: space-between;\nalign-content: ",
    targetStyles: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignContent: "space-between" },
    items: [
      { id: 1, emoji: "⭐" }, { id: 2, emoji: "⭐" }, { id: 3, emoji: "⭐" },
      { id: 4, emoji: "⭐" }, { id: 5, emoji: "⭐" }, { id: 6, emoji: "⭐" }
    ]
  }
];

export default function FlexDojo({ onProgressChange, savedProgress }) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [userCode, setUserCode] = useState(LEVELS[0].defaultCode);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([
    { text: "[SYSTEM] Booting Flex Dojo compiler v1.4.2...", type: "system" },
    { text: "[DOCKER] Sandbox environment initialized.", type: "system" }
  ]);

  const studentContainerRef = useRef(null);
  const targetContainerRef = useRef(null);
  const editorRef = useRef(null);

  const currentLevel = LEVELS[currentLevelIdx];

  // Synthesis synth audio player for retro game details
  const playRetroSound = useCallback((type) => {
    if (typeof window === "undefined" || !audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === "success") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "snap") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(880, ctx.currentTime);

        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn("Synth blocked:", e);
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

  // CSS Style String parser helper
  const parseStyles = (cssText) => {
    const styles = { display: "flex" };
    if (!cssText) return styles;

    const declarations = cssText.split("\n");
    declarations.forEach((decl) => {
      const trimmed = decl.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!trimmed) return;
      const parts = trimmed.split(":");
      if (parts.length === 2) {
        const property = parts[0].trim().toLowerCase();
        let value = parts[1].replace(";", "").trim();
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelProperty] = value;
      }
    });

    return styles;
  };

  const studentStyles = parseStyles(userCode);

  const addTerminalLog = (text, type = "info") => {
    setTerminalLogs(prev => [...prev.slice(-4), { text, type }]);
  };

  // Evaluate element snapping overlap
  const checkLayouts = useCallback(() => {
    const studentCont = studentContainerRef.current;
    const targetCont = targetContainerRef.current;
    if (!studentCont || !targetCont) return;

    const studentItems = studentCont.querySelectorAll(".dojo-item");
    const targetItems = targetCont.querySelectorAll(".dojo-target");
    if (studentItems.length !== targetItems.length || studentItems.length === 0) return;

    let matchCount = 0;
    let totalDist = 0;
    const maxDist = 300; // Normalizing distance boundaries

    for (let i = 0; i < studentItems.length; i++) {
      const sRect = studentItems[i].getBoundingClientRect();
      const tRect = targetItems[i].getBoundingClientRect();

      const sCenterX = sRect.left + sRect.width / 2;
      const sCenterY = sRect.top + sRect.height / 2;
      const tCenterX = tRect.left + tRect.width / 2;
      const tCenterY = tRect.top + tRect.height / 2;

      const dist = Math.sqrt(Math.pow(sCenterX - tCenterX, 2) + Math.pow(sCenterY - tCenterY, 2));
      totalDist += Math.min(dist, maxDist);

      if (dist <= 6) {
        matchCount++;
      }
    }

    const calculatedMatch = Math.round(((studentItems.length - (totalDist / (maxDist * studentItems.length))) * 100));
    setMatchPercentage(Math.max(0, Math.min(100, calculatedMatch)));

    const isMatched = matchCount === studentItems.length;

    if (isMatched && !isSuccess) {
      setIsSuccess(true);
      playRetroSound("success");
      addTerminalLog(`[SUCCESS] 100% overlap achieved. Gate unlocked.`, "success");

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
      }
    }
  }, [completedLevels, currentLevel, streak, onProgressChange, isSuccess]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkLayouts();
    }, 200);
    return () => clearTimeout(timer);
  }, [userCode, currentLevel, checkLayouts]);

  const handleNextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      const nextIdx = currentLevelIdx + 1;
      setCurrentLevelIdx(nextIdx);
      setUserCode(LEVELS[nextIdx].defaultCode);
      setIsSuccess(false);
      setShowHint(false);
      playRetroSound("snap");
      addTerminalLog(`[SYSTEM] Loaded level checkpoint #${nextIdx + 1}.`, "system");
    }
  };

  const handlePrevLevel = () => {
    if (currentLevelIdx > 0) {
      const prevIdx = currentLevelIdx - 1;
      setCurrentLevelIdx(prevIdx);
      setUserCode(LEVELS[prevIdx].defaultCode);
      setIsSuccess(false);
      setShowHint(false);
      playRetroSound("snap");
      addTerminalLog(`[SYSTEM] Reverting to level checkpoint #${prevIdx + 1}.`, "system");
    }
  };

  const handleSelectLevel = (idx) => {
    setCurrentLevelIdx(idx);
    setUserCode(LEVELS[idx].defaultCode);
    setIsSuccess(false);
    setShowHint(false);
    playRetroSound("snap");
    addTerminalLog(`[SYSTEM] Jumping to level checkpoint #${idx + 1}.`, "system");
  };

  return (
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-[#E8E6E1] bg-[#24133F]/20 backdrop-blur-md p-3 md:p-6 rounded-3xl border border-purple-500/20 shadow-2xl relative overflow-hidden font-sans">
      
      {/* Decorative CRT scanline background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,20,28,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] z-50"></div>

      {/* Top Arcade/Terminal HUD Info Row */}
      <div className="lg:col-span-12 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#2C184E]/40 p-4 rounded-2xl border border-purple-500/20 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-pulse">
            <Trophy size={18} />
          </div>
          <div>
            <h2 className="font-display font-black text-sm tracking-tight text-white uppercase">
              FLEX DOJO COMPILER
            </h2>
            <p className="text-[10px] font-mono text-purple-300/50 uppercase tracking-wider">
              Quadrant Alignment Protocol // Streak: <span className="text-purple-300 font-bold">{streak}</span>
            </p>
          </div>
        </div>

        {/* Level Controls */}
        <div className="flex items-center justify-between md:justify-end gap-3 font-mono">
          <div className="flex items-center gap-1.5 bg-[#341B5C]/35 p-1 rounded-xl border border-purple-500/15">
            <button
              onClick={handlePrevLevel}
              disabled={currentLevelIdx === 0}
              className="p-2 rounded-lg hover:bg-[#2A2D3D] disabled:opacity-20 transition-all cursor-pointer text-[#E8E6E1]"
            >
              <ArrowLeft size={12} />
            </button>
            <span className="text-xs font-black tracking-widest text-center min-w-[70px] text-white">
              LVL {currentLevel.level}/{LEVELS.length}
            </span>
            <button
              onClick={handleNextLevel}
              disabled={currentLevelIdx === LEVELS.length - 1}
              className="p-2 rounded-lg hover:bg-[#2A2D3D] disabled:opacity-20 transition-all cursor-pointer text-[#E8E6E1]"
            >
              <ArrowRight size={12} />
            </button>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2.5 rounded-xl border border-purple-500/15 bg-[#341B5C]/35 text-purple-300 hover:text-white transition-all cursor-pointer"
          >
            {audioEnabled ? <Volume2 size={13} className="text-purple-400" /> : <VolumeX size={13} />}
          </button>
        </div>
      </div>

      {/* Grid check list map */}
      <div className="lg:col-span-12 flex flex-wrap gap-2 p-2 bg-[#2C184E]/40 rounded-2xl border border-purple-500/20 z-10">
        {LEVELS.map((lvl, idx) => {
          const isCompleted = completedLevels.includes(lvl.level);
          const isActive = currentLevelIdx === idx;
          return (
            <button
              key={lvl.level}
              onClick={() => handleSelectLevel(idx)}
              className={`flex-1 min-w-[36px] py-2 rounded-xl font-mono text-xs font-black tracking-wide border transition-all cursor-pointer text-center ${
                isActive
                  ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                  : isCompleted
                  ? "bg-purple-500/20 text-[#A78BFA] border border-purple-500/30 hover:bg-purple-500/30"
                  : "bg-[#24133F]/35 border border-purple-500/15 text-purple-300/60 hover:text-white"
              }`}
            >
              {lvl.level}
            </button>
          );
        })}
      </div>

      {/* Left Column: Visual IDE Layout */}
      <div className="lg:col-span-6 flex flex-col space-y-6 z-10">
        {/* Level description block */}
        <div className="bg-[#24133F]/40 p-5 rounded-2xl border border-purple-500/20 relative overflow-hidden space-y-2.5 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-[#7CFFB2] bg-[#7CFFB2]/10 border border-[#7CFFB2]/20 px-2 py-0.5 rounded-md">
            Quadrant Objective
          </span>
          <h3 className="font-display font-black text-white text-base">
            {currentLevel.title}
          </h3>
          <p className="text-xs leading-relaxed text-purple-300/50">
            {currentLevel.instructions}
          </p>
        </div>

        {/* IDE mockup editor workspace */}
        <div className="bg-[#24133F]/45 rounded-2xl border border-purple-500/20 overflow-hidden flex flex-col relative shadow-lg backdrop-blur-md">
          
          {/* File explorer navigation header */}
          <div className="bg-[#150B25] border-b border-purple-500/10 flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="text-[10px] font-mono font-extrabold tracking-widest uppercase text-purple-300 flex items-center gap-1.5">
              <FileCode size={12} className="text-purple-400" />
              <span>sandbox-dojo.css</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHint(!showHint)}
                className={`p-1 rounded text-purple-300 hover:text-white transition-all cursor-pointer ${showHint ? "text-[#FFB86B]" : ""}`}
                title="Hint Overlay"
              >
                <HelpCircle size={14} />
              </button>
              <button
                onClick={handleResetLevel}
                className="p-1 rounded text-purple-300 hover:text-white transition-all cursor-pointer"
                title="Reset Workspace"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* IDE layout wrapper - File Tree + Code Editor */}
          <div className="flex min-h-[220px]">
            {/* Sidebar File explorer pane */}
            <div className="w-32 bg-[#0B0415]/70 border-r border-purple-500/10 p-3 hidden sm:flex flex-col space-y-4 select-none font-mono">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-purple-400/50 uppercase tracking-wider flex items-center gap-1">
                  <FolderOpen size={10} />
                  <span>WORKSPACE</span>
                </span>
                <div className="space-y-1 pl-1">
                  <div className="text-[10px] text-white bg-[#341B5C]/50 px-2 py-1 rounded-md flex items-center gap-1.5 cursor-pointer font-bold border border-purple-500/15">
                    <FileCode size={10} className="text-purple-400" />
                    <span className="truncate">dojo.css</span>
                  </div>
                  <div className="text-[10px] text-purple-300/40 px-2 py-1 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                    <FileCode size={10} />
                    <span className="truncate">index.html</span>
                  </div>
                  <div className="text-[10px] text-purple-300/40 px-2 py-1 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                    <FileCode size={10} />
                    <span className="truncate">vars.json</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Code inputs workspace */}
            <div className="flex-1 flex font-mono text-xs p-4 relative bg-[#120721]/95">
              {/* Line numbers column */}
              <div className="text-purple-400/40 select-none text-right pr-3.5 border-r border-purple-500/10 flex flex-col space-y-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
              </div>
              
              {/* Content editor */}
              <div className="flex-1 pl-4 flex flex-col space-y-1.5 relative">
                <div className="text-[#6B7080] select-none">
                  #dojo-container &#123;
                </div>
                <div className="text-purple-400/70 pl-4 font-bold select-none flex items-center gap-2">
                  display: flex;
                  <span className="text-[9px] font-mono font-normal text-purple-400 bg-[#341B5C]/35 border border-purple-500/10 px-1.5 rounded-md uppercase">system default</span>
                </div>
                <textarea
                  ref={editorRef}
                  value={userCode}
                  onChange={(e) => {
                    setUserCode(e.target.value);
                    setIsSuccess(false);
                  }}
                  spellCheck="false"
                  className="w-full bg-transparent text-white outline-none border-none resize-none pl-4 h-24 focus:ring-0 leading-relaxed font-mono"
                  style={{ caretColor: "var(--text-accent)" }}
                />
                <div className="text-[#6B7080] select-none">
                  &#125;
                </div>
              </div>
            </div>
          </div>

          {/* Code suggestions clickable tags pills */}
          <div className="bg-[#150B25] p-3 border-t border-purple-500/10 flex flex-wrap gap-1.5 items-center z-10">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400 mr-1.5">
              Suggestions:
            </span>
            {[
              "justify-content: center;",
              "justify-content: flex-end;",
              "justify-content: space-between;",
              "align-items: center;",
              "align-items: flex-end;",
              "flex-direction: column;",
              "flex-direction: column-reverse;"
            ].map(s => (
              <button
                key={s}
                onClick={() => handleInsertSuggestion(s + "\n")}
                className="px-2 py-1 rounded-lg border border-purple-500/20 bg-[#341B5C]/35 hover:bg-purple-900/40 hover:border-purple-500/35 text-purple-300 text-[10px] font-mono tracking-tight transition-all cursor-pointer"
              >
                {s.replace(";", "")}
              </button>
            ))}
          </div>

          {/* Interactive Compiler terminal logger pane */}
          <div className="bg-[#0B0415]/95 p-3 border-t border-purple-500/15 font-mono text-[9px] flex flex-col space-y-1.5 select-none relative min-h-[90px]">
            <div className="flex items-center justify-between text-purple-400/60 border-b border-purple-500/10 pb-1 mb-1">
              <span className="flex items-center gap-1">
                <TerminalIcon size={10} />
                <span>DIAGNOSTIC CONSOLE LOGS</span>
              </span>
              <span className="animate-pulse flex items-center gap-1 text-[#7CFFB2]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7CFFB2]"></span>
                <span>ONLINE</span>
              </span>
            </div>
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="truncate">
                {log.type === "success" && (
                  <span className="text-[#7CFFB2]">{log.text}</span>
                )}
                {log.type === "system" && (
                  <span className="text-indigo-400">{log.text}</span>
                )}
                {log.type === "warn" && (
                  <span className="text-[#FFB86B]">{log.text}</span>
                )}
                {log.type === "info" && (
                  <span className="text-purple-200">{log.text}</span>
                )}
                {log.type === "input" && (
                  <span className="text-[#E8E6E1]">{log.text}</span>
                )}
              </div>
            ))}
          </div>

          {/* Dynamic Hint Popout */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-[#1A0C2F] border-t border-purple-500/20 text-xs space-y-2 z-20 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[#FFB86B] flex items-center gap-1">
                    <Sparkles size={12} className="text-[#FFB86B]" />
                    <span>Dojo Master Hint</span>
                  </span>
                  <button
                    onClick={() => setShowHint(false)}
                    className="text-[10px] text-[#6B7080] hover:text-white uppercase font-bold"
                  >
                    Hide
                  </button>
                </div>
                <p className="text-[#E8E6E1] leading-relaxed">
                  Apply this alignment code into the workspace CSS:
                </p>
                <code className="block font-mono text-[10px] select-all bg-[#0B0415]/90 p-2.5 rounded-lg border border-purple-500/20 text-[#7CFFB2] font-black">
                  {currentLevel.hint}
                </code>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="bg-[#7CFFB2]/5 border border-[#7CFFB2]/20 p-5 rounded-2xl flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(124,255,178,0.06)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[#7CFFB2]/2 animate-pulse pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-[#7CFFB2]/10 border border-[#7CFFB2]/20 flex items-center justify-center text-[#7CFFB2]">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-[#7CFFB2] uppercase tracking-wider block">sandbox alignment check</span>
                <span className="text-xs font-bold text-white">
                  Coordinates matched target within 3px!
                </span>
              </div>
            </div>
            
            {currentLevelIdx < LEVELS.length - 1 ? (
              <button
                onClick={handleNextLevel}
                className="px-5 py-2.5 bg-[#7CFFB2] text-[#12141C] rounded-xl font-bold text-xs hover:scale-[1.02] shadow-[0_0_15px_rgba(124,255,178,0.25)] transition-all cursor-pointer relative z-10"
              >
                Next Quad
              </button>
            ) : (
              <div className="px-4 py-2 border border-[#7CFFB2]/30 bg-[#7CFFB2]/10 rounded-xl text-[10px] font-mono font-black text-[#7CFFB2] uppercase tracking-widest relative z-10">
                🏆 Master Dojo Complete!
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      {/* Right Column: Visualization HUD Board */}
      <div className="lg:col-span-6 flex flex-col space-y-3 z-10">
        
        {/* Sandbox details */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#6B7080] uppercase tracking-widest font-mono text-[9px]">
            Visual Grid Sandbox
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-purple-300/60 uppercase">TARGET OVERLAP:</span>
            <span className={`font-bold ${isSuccess ? "text-[#7CFFB2]" : "text-amber-400"}`}>
              {matchPercentage}%
            </span>
          </div>
        </div>

        {/* Visual Arena Workspace */}
        <div className="flex-grow min-h-[300px] md:min-h-[380px] bg-[#120721]/95 border border-purple-500/20 rounded-2xl relative overflow-hidden flex flex-col items-stretch">
          
          {/* Target Container */}
          <div 
            ref={targetContainerRef}
            className="absolute inset-0 p-6 flex pointer-events-none"
            style={{
              ...currentLevel.targetStyle,
              opacity: 0.25
            }}
          >
            {Array.from({ length: currentLevel.itemsCount }).map((_, i) => (
              <div 
                key={i} 
                className="dojo-target w-12 h-12 border-2 border-dashed border-purple-400 rounded-xl flex items-center justify-center text-purple-400 text-xs font-bold"
              >
                T{i+1}
              </div>
            ))}
          </div>

          {/* Student Container */}
          <div 
            ref={studentContainerRef}
            className="absolute inset-0 p-6 flex"
            style={studentStyles}
          >
            {Array.from({ length: currentLevel.itemsCount }).map((_, i) => (
              <div 
                key={i} 
                className="dojo-item w-12 h-12 bg-purple-600 border border-purple-400 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg animate-float"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {i+1}
              </div>
            ))}
          </div>
        </div>

        {/* Snapping progress bar */}
        <div className="bg-[#1C0F32]/50 border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
          <span className="text-[9px] font-mono text-purple-300 uppercase tracking-wider shrink-0">SNAPPING MATCH:</span>
          <div className="flex-1 h-2 bg-purple-950/40 border border-purple-950 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                isSuccess ? "bg-[#7CFFB2] shadow-[0_0_10px_rgba(124,255,178,0.5)]" : "bg-purple-500"
              }`}
              style={{ width: `${matchPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-scanline {
          animation: scanline 6s linear infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}