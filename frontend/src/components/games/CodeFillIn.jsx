"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  Trophy, RotateCcw, BookOpen, Lightbulb, Star,
  Clock, Zap, Target, Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import arcadeData from "@/data/learning-arcade-content.json";

const STORAGE_KEY = "game_progress_code-fill-in";
const POINTS_PER_CORRECT = 100;
const SPEED_BONUS_THRESHOLD = 5; // seconds for full speed bonus

function loadProgress() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Normalise a question into multi-blank format.
 * Old format: { blank, answer, options }
 * New format: { blanks: [{ placeholder, options, answer }] }
 * We support both transparently.
 */
function normaliseBlanks(q) {
  // Already multi-blank
  if (Array.isArray(q.blanks) && q.blanks.length > 0) {
    return {
      ...q,
      blanks: q.blanks.map(b => {
        const opts = Array.isArray(b.options)
          ? [...b.options]
          : [b.option_a, b.option_b, b.option_c, b.option_d].filter(o => o !== undefined && o !== null);
        return {
          ...b,
          options: shuffle(opts),
        };
      }),
    };
  }
  // Legacy single-blank
  return {
    ...q,
    blanks: [{
      placeholder: q.blank || "____",
      options: shuffle([...(q.options || [])]),
      answer: q.answer,
    }],
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Built-in questions from JSON data
const getBuiltInFillins = () => arcadeData.fillin || [];

function getLevelsForLang(lang) {
  const builtIn = getBuiltInFillins();
  let custom = [];
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("arcade_custom_questions");
      if (raw) {
        const parsed = JSON.parse(raw);
        custom = (parsed?.fillin || []).map(q => ({ ...q, _custom: true }));
      }
    }
  } catch (e) { console.error(e); }

  const allQuestions = [
    ...builtIn.map((q, idx) => ({ ...q, level: q.level || Math.floor(idx / 5) + 1 })),
    ...custom.map(q => ({ ...q, level: Number(q.level) || 1 })),
  ];
  const pool = allQuestions.filter(q => q.lang === lang);
  const lvls = [...new Set(pool.map(q => q.level))].sort((a, b) => a - b);
  return lvls.length > 0 ? lvls : [1];
}

function loadGameQuestions(lang, levelNum) {
  const builtIn = getBuiltInFillins();
  let custom = [];
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("arcade_custom_questions");
      if (raw) {
        const parsed = JSON.parse(raw);
        custom = (parsed?.fillin || []).map(q => ({ ...q, _custom: true }));
      }
    }
  } catch (e) { console.error(e); }

  const allQuestions = [
    ...builtIn.map((q, idx) => ({ ...q, level: q.level || Math.floor(idx / 5) + 1 })),
    ...custom.map(q => ({ ...q, level: Number(q.level) || 1 })),
  ];
  const pool = allQuestions.filter(q => q.lang === lang && q.level === levelNum);
  if (pool.length === 0) return [];

  // Shuffle and slice at most 5 questions for this level
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5).map(normaliseBlanks);
}

// ─── Render code with all blanks highlighted ───────────────────────────────────
function renderMultiBlankCode(code, blanks, answers, phase) {
  // answers = { [placeholder]: selectedValue }
  let result = code;
  const segments = [];

  // Build a regex that matches any placeholder, sorting by length descending
  // so that longer placeholders (e.g. ____2) are matched before shorter ones (e.g. ____)
  const sortedPlaceholders = [...blanks]
    .map(b => b.placeholder)
    .sort((a, b) => b.length - a.length)
    .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${sortedPlaceholders.join("|")})`, "g");

  const parts = result.split(regex);
  parts.forEach((part, i) => {
    const blank = blanks.find(b => b.placeholder === part);
    if (blank) {
      const filled = answers[blank.placeholder];
      const isActive = !filled; // this blank is currently active
      const isCorrect = filled && phase === "all_correct" && filled === blank.answer;
      const isWrong = filled && phase === "wrong";

      const displayText = filled || part;
      const color = isCorrect
        ? "text-emerald-300 bg-emerald-500/20"
        : isWrong && filled
        ? "text-rose-300 bg-rose-500/20"
        : filled
        ? "text-violet-300 bg-violet-500/20"
        : "text-cyan-300 bg-cyan-500/15 animate-pulse";

      segments.push(
        <span key={`blank-${i}`} className={`font-black px-1.5 py-0.5 rounded mx-0.5 ${color}`}>
          {displayText}
        </span>
      );
    } else {
      segments.push(<span key={`text-${i}`} className="text-white/60">{part}</span>);
    }
  });

  return segments;
}

export default function CodeFillIn({ onProgressChange, savedProgress, onBack }) {
  const [selectedLang, setSelectedLang] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);

  // Multi-blank state:
  // blankIdx = index of the currently active blank within the question
  // answers = { [placeholder]: selectedValue }
  const [blankIdx, setBlankIdx] = useState(0);
  const [answers, setAnswers] = useState({});     // filled answers per blank
  const [phase, setPhase] = useState("lobby");    // lobby | playing | wrong | all_correct | finished

  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState([]);

  const timerRef = useRef(null);

  const progressData = savedProgress || loadProgress();
  const completedLevels = progressData?.completedLevels || [];

  const q = questions[qIdx];
  const total = questions.length;

  // Timer
  useEffect(() => {
    if (phase !== "playing") { clearInterval(timerRef.current); return; }
    setStartTime(Date.now());
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, blankIdx, phase]);

  // Reset blank state when moving to next question
  function resetBlankState() {
    setBlankIdx(0);
    setAnswers({});
    setPhase("playing");
    setShowHint(false);
  }

  function handleSelect(opt) {
    if (phase !== "playing") return;
    const currentBlank = q.blanks[blankIdx];
    const isCorrect = opt === currentBlank.answer;

    const newAnswers = { ...answers, [currentBlank.placeholder]: opt };
    setAnswers(newAnswers);

    if (!isCorrect) {
      // Wrong — show error, allow retry on this blank
      clearInterval(timerRef.current);
      const timeTaken = (Date.now() - startTime) / 1000;
      setStreak(0);
      setResults(r => [...r, { correct: false, speedBonus: 0, time: Math.round(timeTaken) }]);
      setPhase("wrong");
      return;
    }

    // Correct blank — check if all blanks are now filled correctly
    const nextBlankIdx = blankIdx + 1;
    if (nextBlankIdx >= q.blanks.length) {
      // All blanks filled correctly
      clearInterval(timerRef.current);
      const timeTaken = (Date.now() - startTime) / 1000;
      const speedBonus = timeTaken <= SPEED_BONUS_THRESHOLD
        ? Math.round(POINTS_PER_CORRECT * (1 - timeTaken / (SPEED_BONUS_THRESHOLD * 2)))
        : 0;
      const gained = POINTS_PER_CORRECT * q.blanks.length + speedBonus;
      setScore(s => s + gained);
      setStreak(s => s + 1);
      setResults(r => [...r, { correct: true, speedBonus, time: Math.round(timeTaken) }]);
      setPhase("all_correct");
    } else {
      // Move to next blank
      setBlankIdx(nextBlankIdx);
      // Keep phase as playing, reset timer for next blank
      setStartTime(Date.now());
    }
  }

  function handleRetry() {
    // On wrong — clear this blank's answer and let them try again
    const currentBlank = q.blanks[blankIdx];
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentBlank.placeholder];
      return next;
    });
    setPhase("playing");
  }

  function next() {
    if (qIdx + 1 >= total) {
      const levelKey = `fillin_${selectedLang.toLowerCase()}_level_${currentLevel}`;
      const updatedCompleted = Array.from(new Set([...completedLevels, levelKey]));
      const progressUpdate = {
        ...progressData,
        completedLevels: updatedCompleted,
        highScore: Math.max(progressData?.highScore || 0, score),
        completedAll: true
      };
      if (onProgressChange) {
        onProgressChange(progressUpdate);
      } else {
        saveProgress(progressUpdate);
      }
      setPhase("finished");
    } else {
      setQIdx(i => i + 1);
      resetBlankState();
    }
  }

  const handleStartGame = (lang, levelNum) => {
    const selectedQuestions = loadGameQuestions(lang, levelNum);
    if (selectedQuestions.length === 0) {
      alert(`No questions found for Level ${levelNum} in ${lang}.`);
      return;
    }
    setSelectedLang(lang);
    setCurrentLevel(levelNum);
    setQuestions(selectedQuestions);
    setQIdx(0);
    resetBlankState();
    setScore(0);
    setStreak(0);
    setResults([]);
    setPhase("playing");
  };

  const langColor = {
    Python: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    JavaScript: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    SQL: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };

  // ── Lobby Selection Screen ──────────────────────────────────────────────────
  if (phase === "lobby") {
    const langs = ["Python", "JavaScript", "SQL"];
    return (
      <div className="min-h-[70vh] w-full bg-[#0a0714] border border-purple-500/20 rounded-3xl overflow-hidden font-mono text-[#E8E6E1] flex flex-col items-center justify-center p-8 md:p-12 text-center relative select-none">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-20" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,10,36,0)_97%,rgba(18,10,36,0.3)_98%)] bg-[size:100%_4px] opacity-35 z-20" />
        
        {!selectedLang ? (
          <>
            <div className="space-y-3 relative z-30">
              <span className="text-[10px] font-bold tracking-widest text-[#7CFFB2] border border-[#7CFFB2]/20 bg-[#7CFFB2]/5 px-3 py-1 rounded-full uppercase">
                Mode: Code Fill-In
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-tight">
                Syntax Core
              </h2>
              <p className="text-xs text-purple-300/50 max-w-md mx-auto">
                Fill in missing keywords, parameters, and tokens in real-world scripts. Select your language to launch!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl relative z-30 mt-8">
              {langs.map((lang) => {
                const totalLvs = getLevelsForLang(lang).length;
                return (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className="relative p-5 rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#1a0e30]/40 to-[#0e071e]/70 text-center hover:scale-[1.03] transition-all cursor-pointer hover:border-purple-400 group overflow-hidden shadow-lg"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
                    <span className="text-xs font-bold text-purple-400/60 uppercase">Language</span>
                    <h4 className="text-lg font-black text-white group-hover:text-[#7CFFB2] transition-colors">{lang}</h4>
                    <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-purple-300/40">
                      <span>{totalLvs} Level{totalLvs > 1 ? 's' : ''}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-white transition-colors cursor-pointer mt-8 relative z-30"
            >
              <ArrowLeft size={14} /> Back to Hub Lobby
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3 relative z-30">
              <span className="text-[10px] font-bold tracking-widest text-[#7CFFB2] border border-[#7CFFB2]/20 bg-[#7CFFB2]/5 px-3 py-1 rounded-full uppercase">
                Language: {selectedLang}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-tight">
                Select Level
              </h2>
              <p className="text-xs text-purple-300/50 max-w-md mx-auto">
                Complete levels sequentially. Clear one level to unlock the next!
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg relative z-30 mt-8">
              {getLevelsForLang(selectedLang).map((lvl) => {
                const isUnlocked = lvl === 1 || (completedLevels || []).includes(`fillin_${selectedLang.toLowerCase()}_level_${lvl - 1}`);
                const isCompleted = (completedLevels || []).includes(`fillin_${selectedLang.toLowerCase()}_level_${lvl}`);
                return (
                  <button
                    key={lvl}
                    disabled={!isUnlocked}
                    onClick={() => handleStartGame(selectedLang, lvl)}
                    className={`relative p-5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isUnlocked
                        ? "bg-purple-950/20 border-purple-500/30 hover:border-[#7CFFB2] hover:scale-105 cursor-pointer text-white"
                        : "bg-[#180f2d]/40 border-purple-950/20 text-purple-500/20 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider mb-2">Lvl {lvl}</span>
                    {isCompleted ? (
                      <span className="text-[9px] font-bold text-[#7CFFB2] bg-[#7CFFB2]/10 border border-[#7CFFB2]/20 px-2 py-0.5 rounded uppercase">Cleared</span>
                    ) : isUnlocked ? (
                      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">Play</span>
                    ) : (
                      <span className="text-[9px] font-bold text-purple-500/10 uppercase">Locked</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedLang(null)}
              className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-white transition-colors cursor-pointer mt-8 relative z-30"
            >
              <ArrowLeft size={14} /> Back to Languages
            </button>
          </>
        )}
      </div>
    );
  }

  // ── No questions fallback ───────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center p-8 bg-[#0a0714] border border-purple-500/20 rounded-3xl relative select-none">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-20" />
        <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 relative z-30">
          <Target size={32} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-black text-white relative z-30">No Questions Available</h2>
        <p className="text-xs text-purple-300/40 max-w-xs leading-relaxed relative z-30">
          This level has no questions yet. An admin or mentor can add Code Fill-In questions
          via <strong className="text-violet-300">Admin → Arcade Questions</strong>.
        </p>
        <button
          onClick={() => setPhase("lobby")}
          className="relative z-30 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 border border-violet-400 hover:scale-102 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all cursor-pointer font-bold text-xs"
        >
          Back to Level Selection
        </button>
      </div>
    );
  }

  // ── Finished screen ─────────────────────────────────────────────────────────
  if (phase === "finished") {
    const correct = results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / total) * 100);
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-[#090B14] via-[#0C1021] to-[#070A12] text-white p-4 md:p-8 flex items-center justify-center select-none border border-purple-500/20 rounded-3xl relative overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-violet-500/6 blur-[140px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-gradient-to-br from-violet-900/30 to-cyan-900/30 border border-violet-500/20 rounded-3xl p-8 text-center space-y-6 relative z-10 animate-fade-in"
        >
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-amber-500/15 border border-amber-500/25">
              <Trophy size={36} className="text-amber-300" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black">Level Complete!</h2>
            <p className="text-xs text-purple-300/40 font-mono mt-1 uppercase">
              Language: {selectedLang} — Level {currentLevel}
            </p>
            <p className="text-xs text-white/30 font-mono mt-1 font-bold">{correct}/{total} questions fully solved</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/6 rounded-2xl p-4">
              <div className="text-2xl font-black text-cyan-300">{score}</div>
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mt-1">Score</div>
            </div>
            <div className="bg-white/5 border border-white/6 rounded-2xl p-4">
              <div className="text-2xl font-black text-emerald-300">{accuracy}%</div>
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mt-1">Accuracy</div>
            </div>
            <div className="bg-white/5 border border-white/6 rounded-2xl p-4">
              <div className="text-2xl font-black text-violet-300">{Math.max(0, ...results.map((_, i) => {
                let s = 0; for (let j = i; j >= 0 && results[j].correct; j--) s++; return s;
              }))}</div>
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-bold mt-1">Best Streak</div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-44 overflow-y-auto text-left">
            {questions.map((qq, i) => (
              <div key={qq.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                results[i]?.correct ? "bg-emerald-500/8 border-emerald-500/15" : "bg-rose-500/8 border-rose-500/15"
              }`}>
                <span className="font-mono text-white/50">{qq.title}</span>
                <span className="text-white/30 font-mono text-[10px]">{qq.blanks?.length || 1} blank{(qq.blanks?.length || 1) > 1 ? "s" : ""}</span>
                {results[i]?.correct
                  ? <CheckCircle2 size={13} className="text-emerald-400" />
                  : <XCircle size={13} className="text-rose-400" />}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {(() => {
              const nextLvl = currentLevel + 1;
              const langLevels = getLevelsForLang(selectedLang);
              const hasNextLvl = langLevels.includes(nextLvl);
              if (hasNextLvl) {
                return (
                  <button
                    onClick={() => handleStartGame(selectedLang, nextLvl)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] font-mono"
                  >
                    <ArrowRight size={13} /> Proceed to Level {nextLvl}
                  </button>
                );
              }
              return null;
            })()}
            <button
              onClick={() => handleStartGame(selectedLang, currentLevel)}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 font-mono"
            >
              <RotateCcw size={13} /> Replay Level {currentLevel}
            </button>
            <button
              onClick={() => setPhase("lobby")}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] font-mono"
            >
              <Play size={13} /> Levels Selection
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main game ────────────────────────────────────────────────────────────────
  const currentBlank = q.blanks[blankIdx];
  const totalBlanks = q.blanks.length;

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-[#090B14] via-[#0C1021] to-[#070A12] text-white p-4 md:p-8 select-none border border-purple-500/20 rounded-3xl relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-violet-500/6 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-cyan-500/6 blur-[140px] pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <button
            onClick={() => setPhase("lobby")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/20 bg-violet-950/20 text-violet-300 hover:text-white hover:border-violet-400/40 transition-all text-xs font-bold font-mono cursor-pointer"
          >
            <ArrowLeft size={13} />
            Lobby Selection
          </button>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Zap size={13} />
              <span className="font-black">{score}</span>
              <span className="text-white/30">pts</span>
            </div>
            {streak >= 2 && (
              <div className="flex items-center gap-1 text-orange-400 font-black">
                <Star size={12} className="fill-orange-400" />
                {streak}x streak
              </div>
            )}
          </div>
        </div>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <BookOpen size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Code Fill-In</h1>
            <p className="text-xs text-white/35 font-mono">Language: {selectedLang} — Level {currentLevel} • Question {qIdx + 1} of {total}</p>
          </div>
        </div>

        {/* ── Progress Bar ───────────────────────────────────────────── */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
            animate={{ width: `${(qIdx / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* ── Question Card ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={qIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Meta row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border font-mono ${langColor[q.lang] || "text-white/50 bg-white/5 border-white/10"}`}>
                  {q.lang}
                </span>
                <span className="text-xs text-white/40 font-mono">{q.title}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Blank progress pills */}
                {totalBlanks > 1 && (
                  <div className="flex items-center gap-1.5">
                    {q.blanks.map((b, bi) => (
                      <div key={bi} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                        answers[b.placeholder] && (phase !== "wrong" || bi < blankIdx)
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : bi === blankIdx
                          ? "bg-violet-500/30 border-violet-400/60 text-violet-200"
                          : "bg-white/5 border-white/10 text-white/30"
                      }`}>{bi + 1}</div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs font-mono text-white/30">
                  <Clock size={11} />
                  <span>{elapsed}s</span>
                </div>
              </div>
            </div>

            {/* Active blank label */}
            {totalBlanks > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 font-mono">
                  Filling blank {blankIdx + 1} of {totalBlanks}
                </span>
                {phase === "all_correct" && (
                  <span className="text-[10px] font-bold text-emerald-400">— All blanks filled! 🎉</span>
                )}
              </div>
            )}

            {/* Code display */}
            <div className="bg-[#0D1117]/80 border border-white/8 rounded-2xl p-5 overflow-x-auto">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
              </div>
              <pre className="font-mono text-sm leading-7 whitespace-pre-wrap">
                {renderMultiBlankCode(q.code, q.blanks, answers, phase)}
              </pre>
            </div>

            {/* Options for current blank */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`blank-${blankIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-2 gap-3"
              >
                {(phase === "all_correct" ? q.blanks[q.blanks.length - 1] : currentBlank).options.map((opt) => {
                  const activeBlank = phase === "all_correct" ? q.blanks[q.blanks.length - 1] : currentBlank;
                  const filledValue = answers[activeBlank.placeholder];
                  const isSelected = filledValue === opt;
                  const isCorrect = phase !== "playing" && opt === activeBlank.answer;
                  const isWrong = isSelected && phase === "wrong";
                  return (
                    <motion.button
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      disabled={phase !== "playing"}
                      whileHover={phase === "playing" ? { scale: 1.02 } : {}}
                      whileTap={phase === "playing" ? { scale: 0.98 } : {}}
                      className={`px-4 py-3.5 rounded-xl border font-mono font-bold text-sm transition-all cursor-pointer text-left ${
                        isCorrect
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.2)]"
                          : isWrong
                          ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                          : phase !== "playing"
                          ? "bg-white/2 border-white/6 text-white/25 cursor-not-allowed"
                          : "bg-white/4 border-white/10 text-white/70 hover:text-white hover:border-violet-500/30 hover:bg-violet-500/8"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isCorrect && <CheckCircle2 size={14} className="shrink-0" />}
                        {isWrong && <XCircle size={14} className="shrink-0" />}
                        {opt}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Feedback */}
            <AnimatePresence>
              {(phase === "wrong" || phase === "all_correct") && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl border p-4 flex items-start gap-3 ${
                    phase === "all_correct"
                      ? "bg-emerald-500/8 border-emerald-500/20"
                      : "bg-rose-500/8 border-rose-500/20"
                  }`}
                >
                  {phase === "all_correct"
                    ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    : <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  }
                  <div className="space-y-1 flex-1">
                    <p className={`text-sm font-bold ${phase === "all_correct" ? "text-emerald-300" : "text-rose-300"}`}>
                      {phase === "all_correct"
                        ? totalBlanks > 1 ? "All blanks correct! 🎉" : "Correct!"
                        : `Wrong — the answer for blank ${blankIdx + 1} is "${currentBlank?.answer}"`
                      }
                    </p>
                    <p className="text-xs text-white/50 leading-relaxed">{q.hint}</p>
                  </div>
                  {/* Retry button on wrong */}
                  {phase === "wrong" && (
                    <button
                      onClick={handleRetry}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer hover:bg-rose-500/25 transition-all flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Try Again
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint toggle */}
            {phase === "playing" && (
              <button
                onClick={() => setShowHint(h => !h)}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-colors cursor-pointer font-mono"
              >
                <Lightbulb size={13} />
                {showHint ? "Hide hint" : "Show hint (−10 pts)"}
              </button>
            )}

            <AnimatePresence>
              {showHint && phase === "playing" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                    <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/70 leading-relaxed">{q.hint}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue button — only shown after all blanks correct */}
            {phase === "all_correct" && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={next}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-all hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] cursor-pointer flex items-center justify-center gap-2"
              >
                {qIdx + 1 >= total ? (
                  <><Trophy size={15} /> View Results</>
                ) : (
                  <>Next Question <ArrowRight size={15} /></>
                )}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
