"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  Trophy, RotateCcw, Play, Clock, Zap, Star, AlertCircle, Volume2, VolumeX, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getApiBase, buildAuthHeaders } from "@/utils/api";

// Web Audio API Retro Synth Sounds
const playSynthSound = (type, soundEnabled) => {
  if (!soundEnabled || typeof window === "undefined") return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    if (type === "correct") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "wrong") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === "click") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "tick") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "complete") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      osc.frequency.setValueAtTime(880.00, now + 0.3); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    }
  } catch (e) {
    console.error("Audio Synthesis error", e);
  }
};

export default function QuizBlitz({ onProgressChange, savedProgress, onBack }) {
  const { token, user } = useAuth();
  const API_BASE = getApiBase();

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState("lobby"); // lobby, playing, answer_reveal, finished
  const [selectedOpt, setSelectedOpt] = useState(null);
  
  // Game metrics
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState([]); // Array of { correct: boolean, id: string }
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [questionsPool, setQuestionsPool] = useState([]);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef(null);

  const [currentLevel, setCurrentLevel] = useState(1);

  // Available tracks in our content pool
  const tracks = ["JavaScript", "React.js", "Node.js", "MongoDB"];

  useEffect(() => {
    const fetchPool = async () => {
      if (!token || !user) return;
      try {
        const headers = buildAuthHeaders(token, user);
        const res = await fetch(`${API_BASE}/api/arcade/questions?type=quiz`, { headers });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const normalized = json.data.map((q, idx) => ({
            ...q,
            option_a: q.optionA,
            option_b: q.optionB,
            option_c: q.optionC,
            option_d: q.optionD,
            correct_option: q.correctOption,
            time_limit: q.timeLimit,
            level: q.level || Math.floor(idx / 5) + 1
          }));
          setQuestionsPool(normalized);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPool();
  }, [token, user, API_BASE]);

  const getLevelsForTrack = (track) => {
    const pool = questionsPool.filter(q => q.track === track);
    const lvls = [...new Set(pool.map(q => q.level))].sort((a, b) => a - b);
    return lvls.length > 0 ? lvls : [1];
  };

  // Select questions using localStorage tracking for non-repeating items
  const loadGameQuestions = (track, levelNum) => {
    const pool = questionsPool.filter(q => q.track === track && q.level === levelNum);
    if (pool.length === 0) return [];

    // Shuffle and slice 5 questions (shortened to make levels crisp)
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  };


  const handleStartGame = (track, levelNum) => {
    playSynthSound("click", soundEnabled);
    const selectedQuestions = loadGameQuestions(track, levelNum);
    if (selectedQuestions.length === 0) {
      alert(`No questions found for Level ${levelNum} in ${track}.`);
      return;
    }
    setSelectedTrack(track);
    setCurrentLevel(levelNum);
    setQuestions(selectedQuestions);
    setQIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setResults([]);
    setSelectedOpt(null);
    setTimeLeft(selectedQuestions[0].time_limit || 20);
    setPhase("playing");
  };

  // Timer Effect
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        if (prev <= 6) {
          // Play tick chime for low time warning
          playSynthSound("tick", soundEnabled);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  const handleTimeOut = () => {
    playSynthSound("wrong", soundEnabled);
    setStreak(0);
    setSelectedOpt("TIMEOUT");
    setResults((prev) => [...prev, { correct: false, id: questions[qIdx].id }]);
    setPhase("answer_reveal");
  };

  const handleSelectOption = (opt) => {
    if (phase !== "playing") return;
    clearInterval(timerRef.current);
    setSelectedOpt(opt);

    const currentQ = questions[qIdx];
    const isCorrect = opt === currentQ.correct_option;

    if (isCorrect) {
      playSynthSound("correct", soundEnabled);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      // Score logic: 100 base points + streak bonus + speed bonus
      const speedBonus = Math.round(timeLeft * 5); // 5 points per remaining second
      const streakBonus = Math.min((newStreak - 1) * 20, 100); // Caps streak bonus at +100
      const gainedScore = 100 + speedBonus + streakBonus;
      setScore((s) => s + gainedScore);
      setResults((prev) => [...prev, { correct: true, id: currentQ.id, gained: gainedScore }]);
    } else {
      playSynthSound("wrong", soundEnabled);
      setStreak(0);
      setResults((prev) => [...prev, { correct: false, id: currentQ.id }]);
    }

    setPhase("answer_reveal");
  };

  const handleNextQuestion = () => {
    playSynthSound("click", soundEnabled);
    if (qIdx + 1 >= questions.length) {
      playSynthSound("complete", soundEnabled);
      // Persist progress to local storage
      const finalAccuracy = Math.round((results.filter(r => r.correct).length / questions.length) * 100);
      const existingLevels = savedProgress?.completedLevels || [];
      const levelKey = `quiz_${selectedTrack.toLowerCase()}_level_${currentLevel}`;
      const updatedLevels = [...new Set([...existingLevels, levelKey])];
      onProgressChange({
        completedLevels: updatedLevels,
        highScore: Math.max(savedProgress?.highScore || 0, score),
        lastAccuracy: finalAccuracy,
        completedAll: true
      });
      setPhase("finished");
    } else {
      setSelectedOpt(null);
      setQIdx((idx) => idx + 1);
      setTimeLeft(questions[qIdx + 1].time_limit || 20);
      setPhase("playing");
    }
  };

  const currentQuestion = questions[qIdx];

  // Neon gradient themes for each track
  const getTrackTheme = (track) => {
    switch (track) {
      case "JavaScript": return "from-yellow-400 to-amber-500 shadow-yellow-500/20";
      case "React.js": return "from-cyan-400 to-blue-500 shadow-cyan-500/20";
      case "Node.js": return "from-emerald-400 to-green-500 shadow-emerald-500/20";
      case "MongoDB": return "from-green-500 to-teal-600 shadow-green-600/20";
      default: return "from-purple-500 to-indigo-600 shadow-purple-500/20";
    }
  };

  return (
    <div className="relative min-h-[70vh] w-full bg-[#0a0714] border border-purple-500/20 rounded-3xl overflow-hidden font-mono text-[#E8E6E1]">
      {/* Retro Arcade Scanline overlay effect */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-20" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,10,36,0)_97%,rgba(18,10,36,0.3)_98%)] bg-[size:100%_4px] opacity-35 z-20" />

      {/* sound toggle */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl border border-purple-500/20 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 hover:text-white transition-all cursor-pointer shadow-sm"
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* LOBBY PHASE */}
        {phase === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-8 md:p-12 text-center h-[70vh] space-y-8"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={24} className="animate-spin text-purple-400" />
                <p className="text-xs text-purple-300/60 font-mono">Syncing question pool from database...</p>
              </div>
            ) : !selectedTrack ? (
              <>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold tracking-widest text-[#7CFFB2] border border-[#7CFFB2]/20 bg-[#7CFFB2]/5 px-3 py-1 rounded-full uppercase">
                    Mode: Quiz Blitz
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-tight">
                    Speed Trivia Core
                  </h2>
                  <p className="text-xs text-purple-300/50 max-w-md mx-auto">
                    Select a track to launch your level progress. Solve timed questions, maintain your streak, and unlock the next stages!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                  {tracks.map((track) => {
                    const totalLvs = getLevelsForTrack(track).length;
                    return (
                      <button
                        key={track}
                        onClick={() => setSelectedTrack(track)}
                        className="relative p-5 rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#1a0e30]/40 to-[#0e071e]/70 text-left hover:scale-[1.03] transition-all cursor-pointer hover:border-purple-400 group overflow-hidden shadow-lg"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
                        <span className="text-xs font-bold text-purple-400/60 uppercase">Track</span>
                        <h4 className="text-lg font-black text-white group-hover:text-[#7CFFB2] transition-colors">{track}</h4>
                        <div className="flex items-center gap-1 mt-3 text-[10px] text-purple-300/40">
                          <span>{totalLvs} Level{totalLvs > 1 ? 's' : ''} available</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-white transition-colors cursor-pointer mt-4"
                >
                  <ArrowLeft size={14} /> Back to Hub Lobby
                </button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold tracking-widest text-[#7CFFB2] border border-[#7CFFB2]/20 bg-[#7CFFB2]/5 px-3 py-1 rounded-full uppercase">
                    Track: {selectedTrack}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-tight">
                    Select Level
                  </h2>
                  <p className="text-xs text-purple-300/50 max-w-md mx-auto">
                    Complete levels sequentially. Clear one level to unlock the next!
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
                  {getLevelsForTrack(selectedTrack).map((lvl) => {
                    const isUnlocked = lvl === 1 || (savedProgress?.completedLevels || []).includes(`quiz_${selectedTrack.toLowerCase()}_level_${lvl - 1}`);
                    const isCompleted = (savedProgress?.completedLevels || []).includes(`quiz_${selectedTrack.toLowerCase()}_level_${lvl}`);
                    return (
                      <button
                        key={lvl}
                        disabled={!isUnlocked}
                        onClick={() => handleStartGame(selectedTrack, lvl)}
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
                  onClick={() => setSelectedTrack(null)}
                  className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-white transition-colors cursor-pointer mt-4"
                >
                  <ArrowLeft size={14} /> Back to Tracks Selection
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* PLAYING OR ANSWER REVEAL PHASE */}
        {(phase === "playing" || phase === "answer_reveal") && currentQuestion && (
          <motion.div
            key="gameplay"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-6 md:p-8 flex flex-col justify-between min-h-[70vh] relative z-10"
          >
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-purple-500/15 pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
                  {selectedTrack} — Level {currentLevel}
                </span>
                <span className="text-[10px] font-bold text-[#7CFFB2] border border-[#7CFFB2]/20 px-2 py-0.5 rounded bg-[#7CFFB2]/5 uppercase">
                  Q {qIdx + 1}/{questions.length}
                </span>
              </div>

              <div className="flex items-center space-x-6">
                {/* Score */}
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                  <Zap size={14} className="fill-amber-400/10" />
                  <span>{score} pts</span>
                </div>
                {/* Streak */}
                {streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-400 font-bold text-xs">
                    <Star size={12} className="fill-orange-400" />
                    <span>{streak}x Streak</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full h-1 bg-purple-950 rounded-full overflow-hidden mt-3">
              <motion.div
                className={`h-full bg-gradient-to-r ${timeLeft <= 5 ? "from-red-500 to-rose-600" : "from-purple-500 to-cyan-400"}`}
                animate={{ width: `${(timeLeft / (currentQuestion.time_limit || 20)) * 100}%` }}
                transition={{ duration: phase === "playing" ? 1 : 0.2, ease: "linear" }}
              />
            </div>

            {/* Question Box */}
            <div className="my-6 space-y-4 flex-grow flex flex-col justify-center">
              <h3 className="text-base md:text-lg font-bold text-white leading-relaxed">
                {currentQuestion.question}
              </h3>

              {/* Optional Code Block */}
              {currentQuestion.code && (
                <div className="relative rounded-xl border border-purple-950 bg-[#0d071b] p-4 font-mono text-xs overflow-x-auto shadow-inner text-purple-300">
                  <div className="absolute top-2 right-3 text-[9px] uppercase tracking-wider text-purple-600 font-bold">
                    code_sandbox
                  </div>
                  <pre className="whitespace-pre-wrap">{currentQuestion.code}</pre>
                </div>
              )}
            </div>

            {/* Options grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {["A", "B", "C", "D"].map((optLetter) => {
                const optText = currentQuestion[`option_${optLetter.toLowerCase()}`];
                if (!optText) return null;

                const isSelected = selectedOpt === optLetter;
                const isCorrectOpt = optLetter === currentQuestion.correct_option;
                const revealMode = phase === "answer_reveal";

                let btnStyles = "border-purple-500/20 bg-purple-950/10 hover:border-purple-500/50 hover:bg-purple-950/20 text-[#E8E6E1]";
                let iconEl = null;

                if (revealMode) {
                  if (isCorrectOpt) {
                    btnStyles = "border-emerald-500/50 bg-emerald-950/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
                    iconEl = <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
                  } else if (isSelected) {
                    btnStyles = "border-rose-500/50 bg-rose-950/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
                    iconEl = <XCircle size={16} className="text-rose-400 shrink-0" />;
                  } else {
                    btnStyles = "border-purple-500/5 bg-[#120921]/10 text-purple-300/30 cursor-not-allowed";
                  }
                } else {
                  btnStyles += " active:scale-[0.98] cursor-pointer";
                }

                return (
                  <button
                    key={optLetter}
                    disabled={revealMode}
                    onClick={() => handleSelectOption(optLetter)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-xs font-semibold text-left transition-all duration-150 ${btnStyles}`}
                  >
                    <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      revealMode && isCorrectOpt ? "border-emerald-500/40 bg-emerald-500/10" :
                      revealMode && isSelected ? "border-rose-500/40 bg-rose-500/10" :
                      "border-purple-500/20 bg-purple-500/5"
                    }`}>
                      {optLetter}
                    </span>
                    <span className="flex-grow">{optText}</span>
                    {iconEl}
                  </button>
                );
              })}
            </div>

            {/* Bottom info panel (reveals explanation and next button) */}
            <div className="h-16 flex items-center justify-between border-t border-purple-500/10 pt-4">
              {phase === "answer_reveal" ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-3">
                  <div className="text-[10px] text-purple-300/60 leading-relaxed font-sans max-w-lg line-clamp-2">
                    <span className="font-bold text-[#7CFFB2]">EXPLANATION:</span> {currentQuestion.explanation}
                  </div>
                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 self-end shrink-0 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
                  >
                    <span>{qIdx + 1 === questions.length ? "Finish Blitz" : "Next Question"}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-purple-300/40 flex items-center gap-1">
                    <Clock size={11} /> Time Left: {timeLeft}s
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-purple-500/50">
                    Awaiting Input
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* FINISHED PHASE */}
        {phase === "finished" && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-8 text-center h-[70vh] space-y-6"
          >
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Trophy size={36} className="text-amber-400" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                Arena Cleared
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                QUIZ BLITZ COMPLETE
              </h2>
              <p className="text-xs text-purple-300/40 font-mono mt-1 uppercase">
                Track: {selectedTrack} — Level {currentLevel}
              </p>
            </div>

            {/* Performance metrics */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md">
              <div className="bg-purple-950/15 border border-purple-500/10 rounded-2xl p-4">
                <div className="text-2xl font-black text-cyan-300">{score}</div>
                <div className="text-[9px] uppercase tracking-wider text-purple-300/40 font-bold mt-1">Score</div>
              </div>
              <div className="bg-purple-950/15 border border-purple-500/10 rounded-2xl p-4">
                <div className="text-2xl font-black text-[#7CFFB2]">
                  {Math.round((results.filter(r => r.correct).length / questions.length) * 100)}%
                </div>
                <div className="text-[9px] uppercase tracking-wider text-purple-300/40 font-bold mt-1">Accuracy</div>
              </div>
              <div className="bg-purple-950/15 border border-purple-500/10 rounded-2xl p-4">
                <div className="text-2xl font-black text-orange-400">{bestStreak}</div>
                <div className="text-[9px] uppercase tracking-wider text-purple-300/40 font-bold mt-1">Best Streak</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {(() => {
                const nextLvl = currentLevel + 1;
                const trackLevels = getLevelsForTrack(selectedTrack);
                const hasNextLvl = trackLevels.includes(nextLvl);
                if (hasNextLvl) {
                  return (
                    <button
                      onClick={() => handleStartGame(selectedTrack, nextLvl)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] font-mono"
                    >
                      <Play size={13} /> Proceed to Level {nextLvl}
                    </button>
                  );
                }
                return null;
              })()}
              <button
                onClick={() => handleStartGame(selectedTrack, currentLevel)}
                className="px-5 py-2.5 rounded-xl border border-purple-500/25 bg-[#1b0d35]/30 text-purple-300 hover:text-white hover:border-purple-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 font-mono"
              >
                <RotateCcw size={13} /> Replay Level {currentLevel}
              </button>
              <button
                onClick={() => setPhase("lobby")}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] font-mono"
              >
                <Play size={13} /> Levels Selection
              </button>
            </div>

            <button
              onClick={onBack}
              className="text-xs font-bold text-purple-500 hover:text-white transition-colors cursor-pointer mt-2"
            >
              Exit to Arcade Lobby
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
