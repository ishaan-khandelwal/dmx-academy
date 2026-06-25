"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Brain, Play, CheckCircle2, XCircle, Clock, Award,
  ChevronRight, Activity, BookOpen, Send, Sparkles, MessageSquare,
  Mic, MicOff, AlertCircle
} from "lucide-react";

export default function AIVivaPage() {
  const { user, token, API_BASE } = useAuth();
  
  // State: "lobby", "active", "summary"
  const [view, setView] = useState("lobby");
  
  // Lobby Data
  const [subjects, setSubjects] = useState(["JavaScript", "Python", "DBMS", "Computer Networks"]);
  const [history, setHistory] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState(""); // "" = any
  const [selectedNumQuestions, setSelectedNumQuestions] = useState(5);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [lobbyError, setLobbyError] = useState("");

  // Active Session Data
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]); // track session question set
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Phase inside active view: "reading", "answering", "evaluating", "result"
  const [phase, setPhase] = useState("reading");
  const [timeLeft, setTimeLeft] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const micEnabledRef = useRef(false);
  const phaseRef = useRef("reading");
  const restartTimerRef = useRef(null);
  const intentionalStopRef = useRef(false);
  const startingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);

  const [answerText, setAnswerText] = useState("");
  const answerTextRef = useRef("");
  const [submitError, setSubmitError] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null); // { score, feedback }
  const [summaryData, setSummaryData] = useState(null); // Used when session is completed
  const pendingNextRef = useRef(null); // holds { session, question, progress } until user clicks Next
  const [forceNonContinuous, setForceNonContinuous] = useState(false);
  const forceNonContinuousRef = useRef(false);

  const barsRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafIdRef = useRef(null);

  useEffect(() => {
    let streamRef = null;
    if (micEnabled) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        streamRef = stream;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          if (barsRef.current) {
            for (let i = 0; i < 5; i++) {
              if (barsRef.current[i]) {
                const val = dataArray[i * 2 + 2] || 0;
                const height = 12 + (val / 255) * 24;
                barsRef.current[i].style.height = `${height}px`;
              }
            }
          }
          rafIdRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }).catch(err => {
        console.error("Audio visualization error:", err);
      });
    } else {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (streamRef) {
        streamRef.getTracks().forEach(t => t.stop());
      }
      if (barsRef.current) {
        for (let i = 0; i < 5; i++) {
          if (barsRef.current[i]) barsRef.current[i].style.height = "12px";
        }
      }
    }
    
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef) {
        streamRef.getTracks().forEach(t => t.stop());
      }
    };
  }, [micEnabled]);

  useEffect(() => {
    forceNonContinuousRef.current = forceNonContinuous;
  }, [forceNonContinuous]);
  
  // Utility headers for API requests
  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token && !token.startsWith("demo-") && !token.startsWith("local-")
      ? { Authorization: `Bearer ${token}` }
      : { "x-bypass-auth": "true", "x-bypass-role": user?.role === "ADMIN" ? "ADMIN" : "USER" })
  });

  // Fetch initial lobby data
  useEffect(() => {
    if (!user) return;
    fetchLobbyData();
  }, [user]);

  const fetchLobbyData = async () => {
    try {
      setLoadingInitial(true);
      const headers = getHeaders();

      // Fetch subjects
      const subRes = await fetch(`${API_BASE}/api/viva/subjects`, { headers }).catch(() => null);
      if (subRes && subRes.ok) {
        const subData = await subRes.json();
        if (subData.subjects && subData.subjects.length > 0) {
          setSubjects(subData.subjects);
        }
      }

      // Fetch history
      const histRes = await fetch(`${API_BASE}/api/viva/history`, { headers }).catch(() => null);
      if (histRes && histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load viva data:", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // -------------------------------------------------------------
  // Timer & Speech Recognition Logic
  // -------------------------------------------------------------
  useEffect(() => {
    if (view === "active" && (phase === "reading" || (phase === "answering" && micEnabled)) && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (view === "active" && timeLeft === 0) {
      if (phase === "reading") {
        startAnsweringPhase();
      } else if (phase === "answering") {
        submitAnswer();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, view, answerText, interimText]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  useEffect(() => {
    answerTextRef.current = answerText;
  }, [answerText]);

  useEffect(() => {
    return () => stopListening(false);
  }, []);

  const setMicEnabledSync = (value) => {
    micEnabledRef.current = value;
    setMicEnabled(value);
  };

  const getSpeechRecognition = () => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  };

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const stopRecognitionEngine = (intentional = true) => {
    intentionalStopRef.current = intentional;
    clearRestartTimer();
    startingRef.current = false;

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch (e) {}
    }
  };

  const scheduleRecognitionRestart = (delayMs = 300) => {
    clearRestartTimer();
    if (!micEnabledRef.current || phaseRef.current !== "answering" || intentionalStopRef.current) return;

    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      startRecognitionEngine();
    }, delayMs);
  };

  const startRecognitionEngine = () => {
    if (startingRef.current || recognitionRef.current) return;
    if (!micEnabledRef.current || phaseRef.current !== "answering") return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setMicError("Browser not supported");
      setMicEnabledSync(false);
      return;
    }

    const startRecognitionProcess = () => {
      startingRef.current = true;
      intentionalStopRef.current = false;

      const recognition = new SpeechRecognition();
      // Fallback to non-continuous if network errors are detected
      recognition.continuous = !forceNonContinuousRef.current;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        console.log("Speech result received");
        consecutiveErrorsRef.current = 0;
        setMicError("");

        let newFinal = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinal += transcript;
          } else {
            interim += transcript;
          }
        }

        if (newFinal) {
          const chunk = newFinal.endsWith(" ") ? newFinal : `${newFinal} `;
          setAnswerText((prev) => {
            const updated = prev + chunk;
            answerTextRef.current = updated;
            return updated;
          });
          setInterimText("");
          console.log("Transcript updated");
        }
        
        if (interim) {
          setInterimText(interim);
        } else if (newFinal) {
          setInterimText("");
        }
      };

      recognition.onerror = (event) => {
        console.log("Recognition error:", event.error);
        if (intentionalStopRef.current) return;

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicError("Microphone permission denied");
          setMicEnabledSync(false);
          stopRecognitionEngine(true);
          return;
        }

        // 'network' errors are common on HTTP (non-HTTPS) for continuous mode.
        // Clear the ref so onend can trigger a restart, and force non-continuous fallback.
        if (event.error === "network") {
          console.warn("Speech recognition network error — falling back to non-continuous mode and restarting.");
          if (!forceNonContinuousRef.current) {
            setForceNonContinuous(true);
          }
          return;
        }

        console.warn("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        console.log("Recognition ended");
        startingRef.current = false;
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }

        if (intentionalStopRef.current || !micEnabledRef.current || phaseRef.current !== "answering") {
          return;
        }

        scheduleRecognitionRestart(300);
      };

      recognition.onstart = () => {
        console.log("Speech started");
        startingRef.current = false;
      };

      try {
        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        startingRef.current = false;
        recognitionRef.current = null;
        if (!intentionalStopRef.current && micEnabledRef.current && phaseRef.current === "answering") {
          scheduleRecognitionRestart(500);
        }
      }
    };

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((status) => {
        if (status.state === 'denied') {
          setMicError("Microphone permission denied");
          setMicEnabledSync(false);
        } else {
          startRecognitionProcess();
        }
      }).catch(() => startRecognitionProcess());
    } else {
      startRecognitionProcess();
    }
  };

  const startAnsweringPhase = () => {
    setPhase("answering");
    setTimeLeft(120);
    setMicError("");
    setInterimText("");
    consecutiveErrorsRef.current = 0;
    setMicEnabledSync(false);
  };

  const startListening = () => {
    consecutiveErrorsRef.current = 0;
    setMicError("");
    setMicEnabledSync(true);
    startRecognitionEngine();
  };

  const stopListening = (disableMic = true) => {
    stopRecognitionEngine(true);
    setInterimText("");
    if (disableMic) setMicEnabledSync(false);
  };

  const toggleListening = () => {
    if (micEnabled) {
      stopListening(true);
    } else {
      setMicError("");
      startListening();
    }
  };

  // -------------------------------------------------------------
  // API Actions
  // -------------------------------------------------------------
  const startSession = async () => {
    if (!selectedSubject) return;
    setLobbyError("");
    try {
      const res = await fetch(`${API_BASE}/api/viva/session/start`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          subject: selectedSubject,
          ...(selectedDifficulty && { difficulty: selectedDifficulty }),
          numQuestions: selectedNumQuestions
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveSession({ id: data.sessionId, subject: selectedSubject });
        setCurrentQuestion(data.nextQuestion);
        setProgress(data.progress);
        setSelectedQuestionIds(data.selectedQuestionIds || []);
        setLastEvaluation(null);
        setAnswerText("");
        answerTextRef.current = "";
        setInterimText("");
        setMicEnabledSync(false);
        setMicError("");
        setSubmitError("");
        
        setView("active");
        setPhase("reading");
        setTimeLeft(15);
      } else {
        setLobbyError(data.message || "Failed to start session. Backend might be down.");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      setLobbyError("Network error: Please fully refresh the page (F5) so your browser connects to the right port.");
    }
  };

  const getFullTranscript = () => (answerTextRef.current + interimText).trim();

  const submitAnswer = async () => {
    const textToSubmit = getFullTranscript() || "No answer provided.";
    if (evaluating) return;

    stopListening(true);
    setSubmitError("");
    setEvaluating(true);
    setPhase("evaluating");
    setAnswerText(textToSubmit);
    answerTextRef.current = textToSubmit;
    setInterimText("");

    try {
      const res = await fetch(`${API_BASE}/api/viva/session/answer`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ sessionId: activeSession.id, questionText: currentQuestion.questionText, studentAnswer: textToSubmit, selectedQuestionIds })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastEvaluation(data.answer);

        if (data.isCompleted) {
          // Call completeSession explicitly
          const completeRes = await fetch(`${API_BASE}/api/viva/session/complete`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ sessionId: activeSession.id })
          });
          const completeData = await completeRes.json();

          setSummaryData(completeData.session);
          setPhase("result");
          setTimeout(() => {
            // Redirect to Result Dashboard
            window.location.href = `/student/viva/result/${activeSession.id}`;
          }, 3000);
        } else {
          // Store next question data — only apply it when user clicks "Next Question"
          pendingNextRef.current = {
            session: { id: activeSession.id },
            question: data.nextQuestion,
            progress: data.progress,
          };
          setPhase("result");
        }
      } else {
        setSubmitError(data.message || "Failed to submit your answer. Please try again.");
        setPhase("answering");
        setMicEnabledSync(true);
        startRecognitionEngine();
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setSubmitError("Network error while submitting. Check your connection and try again.");
      setPhase("answering");
      setMicEnabledSync(true);
      startRecognitionEngine();
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    stopListening(true);
    setLastEvaluation(null);
    setAnswerText("");
    answerTextRef.current = "";
    setInterimText("");
    setSubmitError("");
    setMicError("");
    // Now apply the next question data that was stored after evaluation
    if (pendingNextRef.current) {
      setActiveSession(pendingNextRef.current.session);
      setCurrentQuestion(pendingNextRef.current.question);
      setProgress(pendingNextRef.current.progress);
      pendingNextRef.current = null;
    }
    setPhase("reading");
    setTimeLeft(15);
  };

  const exitToLobby = () => {
    stopListening(false);
    setView("lobby");
    setSummaryData(null);
    setActiveSession(null);
    setSelectedSubject("");
    setSelectedQuestionIds([]);
    fetchLobbyData(); // refresh history
  };

  // -------------------------------------------------------------
  // Renderers
  // -------------------------------------------------------------
  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Format time nicely mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* ── LOBBY VIEW ── */}
      {view === "lobby" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Hero Card */}
          <div className="relative p-8 rounded-3xl border overflow-hidden shadow-sm"
               style={{ backgroundColor: "var(--glass-bg)", borderColor: "var(--border-primary)" }}>
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Brain size={200} />
            </div>
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold border"
                   style={{ backgroundColor: "var(--bg-badge)", borderColor: "var(--border-accent)", color: "var(--text-accent)" }}>
                <Sparkles size={14} className="animate-pulse" />
                <span>Next-Gen Assessment Engine</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
                AI Viva System
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Test your theoretical knowledge in a spoken viva session. Read each question, then answer verbally — your speech is transcribed live and evaluated by AI.
              </p>
              
              {lobbyError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-sm font-semibold flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>{lobbyError}</span>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-3 flex-wrap items-center">
                <select 
                  className="w-full sm:w-52 p-3 rounded-2xl text-sm border font-semibold outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  className="w-full sm:w-40 p-3 rounded-2xl text-sm border font-semibold outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  <option value="">Any Difficulty</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                <select
                  className="w-full sm:w-36 p-3 rounded-2xl text-sm border font-semibold outline-none"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                  value={selectedNumQuestions}
                  onChange={(e) => setSelectedNumQuestions(parseInt(e.target.value))}
                >
                  {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
                
                <button
                  onClick={startSession}
                  disabled={!selectedSubject}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Start Viva Session</span>
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-display" style={{ color: "var(--text-primary)" }}>Past Viva Sessions</h2>
            {history.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed text-center" style={{ borderColor: "var(--border-primary)" }}>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>You haven't attempted any viva sessions yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map(session => (
                  <Link key={session.id} href={`/student/viva/result/${session.id}`}
                       className="p-5 rounded-3xl border shadow-sm space-y-3 block transition-all hover:shadow-md hover:scale-[1.01]"
                       style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-500">
                        {session.subject}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider" 
                            style={{ color: session.status === "COMPLETED" ? "var(--text-accent)" : "var(--text-secondary)" }}>
                        {session.status?.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Final Score</p>
                        <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
                          {session.status === "COMPLETED" ? `${session.totalScore ?? 0}%` : "--"}
                        </p>
                      </div>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(session.startedAt || session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── ACTIVE SESSION VIEW ── */}
      {view === "active" && currentQuestion && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-6">
          
          {/* Header & Progress */}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-500 tracking-wider uppercase">
                {activeSession.subject} Viva
              </span>
              <h2 className="text-xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
                Question {progress.current} of {progress.total}
              </h2>
            </div>
            <button onClick={exitToLobby} className="text-xs font-semibold hover:underline text-rose-500">
              Abort Session
            </button>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500" 
                 style={{ width: `${(progress.current / progress.total) * 100}%`, background: "var(--accent-gradient)" }} />
          </div>

          {/* Phase indicator & Timer */}
          <div className="flex items-center justify-between p-4 rounded-2xl border bg-indigo-500/5 border-indigo-500/20">
            <div className="flex items-center space-x-3">
              {phase === "reading" ? <BookOpen size={20} className="text-indigo-500 animate-pulse" /> : 
               phase === "answering" ? <Mic size={20} className="text-rose-500 animate-pulse" /> :
               <Activity size={20} className="text-emerald-500" />}
              <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                {phase === "reading" ? "Reading Phase" : 
                 phase === "answering" ? "Answering Phase" : 
                 phase === "evaluating" ? "Evaluating..." : "Evaluation Result"}
              </span>
            </div>
            
            {(phase === "reading" || phase === "answering") && (
              <div className="flex items-center space-x-2 font-mono text-lg font-black" style={{ color: phase === "answering" && timeLeft < 15 ? "var(--text-accent)" : "var(--text-primary)" }}>
                <Clock size={16} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {/* Question Card */}
          <div className="p-6 md:p-8 rounded-3xl shadow-lg border"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="flex space-x-4">
              <div className="shrink-0 pt-1 text-indigo-500"><MessageSquare size={24} /></div>
              <p className="text-lg md:text-xl font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {currentQuestion.questionText}
              </p>
            </div>
          </div>

          {/* Action Area based on phase */}
          <AnimatePresence mode="wait">
            
            {/* READING PHASE */}
            {phase === "reading" && (
              <motion.div key="reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                          className="flex justify-center p-8">
                <button
                  onClick={startAnsweringPhase}
                  className="px-8 py-4 rounded-full font-bold text-sm text-white shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2 hover:scale-105"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  <Mic size={18} />
                  <span>I'm Ready to Answer Now</span>
                </button>
              </motion.div>
            )}

            {/* ANSWERING PHASE */}
            {(phase === "answering" || phase === "evaluating") && (
              <motion.div key="answering" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

                {/* Mic status banner */}
                <div className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                  micEnabled
                    ? "bg-rose-500/10 border-rose-500/30"
                    : "bg-slate-500/10 border-slate-500/20"
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
                      micEnabled ? "bg-rose-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-500"
                    }`}>
                      {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                      {micEnabled && (
                        <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-40" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {micEnabled
                          ? "Microphone is on — speak your answer"
                          : "Microphone is off"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {micEnabled
                          ? "Speak clearly — your words appear in the live transcript below"
                          : "Turn the mic on to record your verbal answer"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={evaluating}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      micEnabled
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-indigo-500 text-white hover:bg-indigo-600"
                    }`}
                  >
                    {micEnabled ? "Turn Off Mic" : "Turn On Mic"}
                  </button>
                </div>

                {micError && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl text-sm font-semibold flex items-center space-x-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{micError}</span>
                  </div>
                )}

                {submitError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-sm font-semibold flex items-center space-x-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Live transcript — voice only, read-only */}
                <div
                  className="relative rounded-2xl min-h-[200px] border overflow-hidden"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: micEnabled ? "#f43f5e" : "var(--border-primary)",
                  }}
                >
                  {micEnabled && (
                    <div className="absolute top-4 right-4 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 z-10">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Live</span>
                    </div>
                  )}

                  {/* Audio level bars */}
                  {micEnabled && (
                    <div className="flex items-end justify-center gap-1 h-12 px-6 pt-4">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          ref={el => barsRef.current[i] = el}
                          className="w-1.5 rounded-full bg-rose-500/70"
                          style={{
                            height: '12px',
                            transition: 'height 0.05s ease'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="p-6 pt-3 min-h-[140px]">
                    {answerText || interimText ? (
                      <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--text-primary)" }}>
                        {answerText}
                        {interimText && (
                          <span className="text-indigo-400/80 italic">{interimText}</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                        {micEnabled
                          ? "Listening..."
                          : "Your spoken answer will appear here as live transcription."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                    {(answerText + interimText).length} characters captured
                  </span>
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={evaluating}
                    className="px-6 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102"
                    style={{ background: "var(--accent-gradient)" }}
                  >
                    {evaluating ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <span>Submit Answer</span>
                        <Send size={14} />
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* RESULT PHASE */}
            {phase === "result" && lastEvaluation && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl border space-y-4 shadow-sm"
                          style={{ backgroundColor: lastEvaluation.score >= 5 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)', borderColor: lastEvaluation.score >= 5 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-black uppercase tracking-wider ${lastEvaluation.score >= 5 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Score: {lastEvaluation.score} / 10
                    </span>
                    {lastEvaluation.usedAI && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center space-x-1">
                        <Sparkles size={9} />
                        <span>AI</span>
                      </span>
                    )}
                  </div>
                  {summaryData ? (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-white animate-pulse">Session Complete</span>
                  ) : (
                    <button onClick={nextQuestion} className="flex items-center space-x-1 text-sm font-bold text-indigo-500 hover:underline">
                      <span>Next Question</span>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {lastEvaluation.feedback}
                </p>

                {/* Strengths & Weaknesses */}
                {(lastEvaluation.strengths?.length > 0 || lastEvaluation.weaknesses?.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lastEvaluation.strengths?.length > 0 && (
                      <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Strengths</p>
                        {lastEvaluation.strengths.map((s, i) => (
                          <p key={i} className="text-[11px] flex items-start space-x-1.5" style={{ color: "var(--text-secondary)" }}>
                            <CheckCircle2 size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {lastEvaluation.weaknesses?.length > 0 && (
                      <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">To Improve</p>
                        {lastEvaluation.weaknesses.map((w, i) => (
                          <p key={i} className="text-[11px] flex items-start space-x-1.5" style={{ color: "var(--text-secondary)" }}>
                            <XCircle size={10} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Follow-up */}
                {lastEvaluation.followUp && !summaryData && (
                  <div className="p-3 rounded-2xl border flex items-start space-x-2"
                       style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)" }}>
                    <MessageSquare size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-accent)" }} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--text-accent)" }}>Follow-Up to Consider</p>
                      <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>{lastEvaluation.followUp}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── SUMMARY VIEW ── */}
      {view === "summary" && summaryData && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center space-y-8">
          <div className="p-10 rounded-[2.5rem] border shadow-xl relative overflow-hidden"
               style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg mb-2"
                   style={{ background: (summaryData.totalScore ?? summaryData.score ?? 0) >= 80 ? "linear-gradient(to right, #10b981, #34d399)" : (summaryData.totalScore ?? summaryData.score ?? 0) >= 50 ? "linear-gradient(to right, #f59e0b, #fbbf24)" : "linear-gradient(to right, #f43f5e, #fb7185)" }}>
                <Award size={40} />
              </div>
              <h2 className="text-3xl font-black font-display" style={{ color: "var(--text-primary)" }}>
                Viva Completed
              </h2>
              <div className="text-sm font-bold uppercase tracking-widest text-indigo-500">
                Final Score: {summaryData.totalScore ?? summaryData.score ?? 0}%
              </div>
              <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
                {summaryData.feedback}
              </p>
            </div>
          </div>

          <button onClick={exitToLobby} className="px-8 py-3 rounded-full font-bold text-sm text-white shadow-md transition-all hover:scale-105"
                  style={{ background: "var(--accent-gradient)" }}>
            Return to Dashboard
          </button>
        </motion.div>
      )}

    </div>
  );
}
