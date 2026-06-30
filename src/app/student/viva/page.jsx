"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Brain, Play, CheckCircle2, XCircle, Clock, Award,
  ChevronRight, Activity, BookOpen, Send, Sparkles, MessageSquare,
  Mic, MicOff, AlertCircle, Flag, Edit2, RefreshCw, CheckCheck, Lightbulb
} from "lucide-react";

// ─── Sprint 5 config constants (mirroring backend .env defaults) ───────────────
const AI_CORRECTION_ENABLED = true;   // AI_TRANSCRIPT_CORRECTION
const CONFIDENCE_THRESHOLD = 0.6;    // VOICE_CONFIDENCE_THRESHOLD
const AUTO_STOP_SILENCE_MS = 2000;   // AUTO_STOP_SILENCE_MS
const SILENCE_RMS_THRESHOLD = 8;      // RMS below this = silence

export default function AIVivaPage() {
  const { user, token, API_BASE } = useAuth();

  // ── View State ──────────────────────────────────────────────────────────
  const [view, setView] = useState("lobby");

  // ── Lobby Data ──────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState(["JavaScript", "Python", "DBMS", "Computer Networks"]);
  const [history, setHistory] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedNumQuestions, setSelectedNumQuestions] = useState(5);
  const [showFeedbackAfterEach, setShowFeedbackAfterEach] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [lobbyError, setLobbyError] = useState("");

  // ── Active Session Data ─────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // ── Phase: "reading" | "answering" | "reviewing" | "evaluating" | "result"
  const [phase, setPhase] = useState("reading");
  const [timeLeft, setTimeLeft] = useState(0);

  // ── Mic / Speech Recognition ────────────────────────────────────────────
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
  const [forceNonContinuous, setForceNonContinuous] = useState(false);
  const forceNonContinuousRef = useRef(false);

  // ── Answer text ─────────────────────────────────────────────────────────
  const [answerText, setAnswerText] = useState("");
  const answerTextRef = useRef("");
  const [submitError, setSubmitError] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const pendingNextRef = useRef(null);

  // ── Audio visualizer refs ───────────────────────────────────────────────
  const barsRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafIdRef = useRef(null);

  // ── Sprint 5: Confidence tracking ──────────────────────────────────────
  const confidenceSumRef = useRef(0);
  const confidenceCountRef = useRef(0);
  const [avgConfidence, setAvgConfidence] = useState(null);

  // ── Sprint 5: Silence-based auto-stop (VAD) ────────────────────────────
  const silenceTimerRef = useRef(null);

  // ── Sprint 5: Transcript review/correction state ────────────────────────
  const [rawTranscriptSnapshot, setRawTranscriptSnapshot] = useState("");
  const [correctedTranscript, setCorrectedTranscript] = useState("");
  const [editedTranscript, setEditedTranscript] = useState("");
  const [correctionApplied, setCorrectionApplied] = useState(false);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionError, setCorrectionError] = useState("");

  // ──────────────────────────────────────────────────────────────────────
  // Audio Visualizer Effect (unchanged)
  // ──────────────────────────────────────────────────────────────────────
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

          // ── Sprint 5: Voice Activity Detection (silence auto-stop) ───────
          // Compute RMS of the raw data as a proxy for speech energy
          const rms = Math.sqrt(
            dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length
          );
          if (rms < SILENCE_RMS_THRESHOLD) {
            // Speech is silent — start/continue silence timer
            if (!silenceTimerRef.current && micEnabledRef.current && phaseRef.current === "answering") {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                // Auto-stop after sustained silence
                if (micEnabledRef.current && phaseRef.current === "answering") {
                  console.log("[VAD] Silence detected — auto-stopping mic");
                  stopListeningAndReview();
                }
              }, AUTO_STOP_SILENCE_MS);
            }
          } else {
            // Speech detected — cancel any pending silence timer
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
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
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
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
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
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

      const subRes = await fetch(`${API_BASE}/api/viva/subjects`, { headers }).catch(() => null);
      if (subRes && subRes.ok) {
        const subData = await subRes.json();
        if (subData.subjects && subData.subjects.length > 0) {
          setSubjects(subData.subjects);
        }
      }

      const histRes = await fetch(`${API_BASE}/api/viva/history`, { headers }).catch(() => null);
      if (histRes && histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.sessions || []);
        setLobbyError(""); // clear any stale error once data loads
      }
    } catch (err) {
      console.error("Failed to load viva data:", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Timer & Speech Recognition Logic
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
  // Timer ticks during reading and answering phases.
  // Reading phase: auto-advances to answering when it hits 0.
  // Answering phase: just counts up as a reference — student submits manually.
  if (view === "active" && (phase === "reading" || phase === "answering") && timeLeft > 0) {
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  } else if (view === "active" && timeLeft === 0 && phase === "reading") {
    startAnsweringPhase();
  }
  // No auto-submit when answering phase timer hits 0 — student submits manually.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [timeLeft, phase, view]);

useEffect(() => { phaseRef.current = phase; }, [phase]);
useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
useEffect(() => { answerTextRef.current = answerText; }, [answerText]);
useEffect(() => { return () => stopListening(false); }, []);

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
    try { recognition.stop(); } catch (e) { }
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
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          newFinal += transcript;

          // ── Sprint 5: Capture confidence ──────────────────────────────
          const confidence = result[0].confidence;
          if (typeof confidence === "number" && confidence > 0) {
            confidenceSumRef.current += confidence;
            confidenceCountRef.current += 1;
          }
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

      if (event.error === "network") {
        console.warn("Speech recognition network error — falling back to non-continuous mode.");
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
  // ── Sprint 5: Reset confidence trackers for new question ──────────
  confidenceSumRef.current = 0;
  confidenceCountRef.current = 0;
  setAvgConfidence(null);
  setCorrectionError("");
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
  if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
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

// ──────────────────────────────────────────────────────────────────────
// Sprint 5: Stop listening and decide whether to show Review UI
// ──────────────────────────────────────────────────────────────────────
const stopListeningAndReview = () => {
  // Capture the full raw transcript at this moment
  const raw = (answerTextRef.current + interimText).trim();
  stopListening(true);

  if (!raw || raw === "No answer provided.") {
    // Nothing to review — go straight to evaluation
    submitAnswer(raw || "No answer provided.");
    return;
  }

  // Calculate average confidence
  const avgConf = confidenceCountRef.current > 0
    ? confidenceSumRef.current / confidenceCountRef.current
    : null;
  setAvgConfidence(avgConf);

  const shouldCorrect =
    AI_CORRECTION_ENABLED &&
    (avgConf === null || avgConf < CONFIDENCE_THRESHOLD);

  if (shouldCorrect) {
    // Go to reviewing phase with AI correction
    setRawTranscriptSnapshot(raw);
    setCorrectedTranscript(raw);  // start with raw as default
    setEditedTranscript(raw);
    setCorrectionApplied(false);
    setPhase("reviewing");
    runAICorrection(raw);
  } else {
    // Confidence is high — skip review and submit directly
    submitAnswer(raw);
  }
};

/**
 * Sprint 5: Call the backend transcript correction endpoint.
 * Falls back to raw transcript silently if anything fails.
 */
const runAICorrection = async (raw) => {
  if (!currentQuestion || !activeSession) return;
  setCorrectionLoading(true);
  setCorrectionError("");

  if (process.env.NODE_ENV === "development") {
    console.log("[TranscriptReview] Raw:", raw);
  }

  try {
    const res = await fetch(`${API_BASE}/api/viva/session/correct-transcript`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        questionText: currentQuestion.questionText,
        rawTranscript: raw,
        subject: activeSession.subject,
      }),
    });
    const data = await res.json();

    if (data.success) {
      const corrected = data.correctedTranscript || raw;
      setCorrectedTranscript(corrected);
      setEditedTranscript(corrected);
      setCorrectionApplied(data.correctionApplied || false);

      if (process.env.NODE_ENV === "development") {
        console.log("[TranscriptReview] Corrected:", corrected);
        console.log("[TranscriptReview] CorrectionApplied:", data.correctionApplied);
      }
    }
  } catch (err) {
    console.warn("[TranscriptReview] AI correction failed, using raw:", err.message);
    setCorrectionError("AI correction unavailable — using original transcript.");
    setCorrectedTranscript(raw);
    setEditedTranscript(raw);
  } finally {
    setCorrectionLoading(false);
  }
};

// ──────────────────────────────────────────────────────────────────────
// API Actions
// ──────────────────────────────────────────────────────────────────────
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

/**
 * Submit the final (potentially corrected) transcript for evaluation.
 * @param {string} [overrideText] - Use this text instead of current state (for direct calls)
 */
const submitAnswer = async (overrideText) => {
  const textToSubmit = overrideText !== undefined
    ? (overrideText || "No answer provided.")
    : (getFullTranscript() || "No answer provided.");
  if (evaluating) return;

  if (process.env.NODE_ENV === "development") {
    console.log("[VivaSubmit] Final submitted transcript:", textToSubmit);
  }

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
      body: JSON.stringify({
        sessionId: activeSession.id,
        questionText: currentQuestion.questionText,
        studentAnswer: textToSubmit,
        selectedQuestionIds
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setLastEvaluation(data.answer);

      if (data.isCompleted) {
        const completeRes = await fetch(`${API_BASE}/api/viva/session/complete`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ sessionId: activeSession.id })
        });
        const completeData = await completeRes.json();

        setSummaryData(completeData.session);
        if (showFeedbackAfterEach) {
          setPhase("result");
          setTimeout(() => {
            window.location.href = `/student/viva/result/${activeSession.id}`;
          }, 3000);
        } else {
          window.location.assign(`/student/viva/result/${activeSession.id}`);
        }
      } else {
        pendingNextRef.current = {
          session: activeSession,
          question: data.nextQuestion,
          progress: data.progress,
        };
        if (showFeedbackAfterEach) {
          setPhase("result");
        } else {
          nextQuestion();
        }
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

/** Retry — clear transcript so student can re-record. Stays in answering phase. */
const retryAnswer = () => {
  stopListening(true);
  setAnswerText("");
  answerTextRef.current = "";
  setInterimText("");
  setSubmitError("");
  setMicError("");
  // Reset Sprint 5 state
  setRawTranscriptSnapshot("");
  setCorrectedTranscript("");
  setEditedTranscript("");
  setCorrectionApplied(false);
  setCorrectionError("");
  setAvgConfidence(null);
  confidenceSumRef.current = 0;
  confidenceCountRef.current = 0;
  // Stay in answering phase, reset timer
  setTimeLeft(120);
};

const nextQuestion = () => {
  stopListening(true);
  setLastEvaluation(null);
  setAnswerText("");
  answerTextRef.current = "";
  setInterimText("");
  setSubmitError("");
  setMicError("");
  // Reset sprint 5 state
  setRawTranscriptSnapshot("");
  setCorrectedTranscript("");
  setEditedTranscript("");
  setCorrectionApplied(false);
  setCorrectionError("");
  setAvgConfidence(null);
  confidenceSumRef.current = 0;
  confidenceCountRef.current = 0;

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
  fetchLobbyData();
};

// ──────────────────────────────────────────────────────────────────────
// Renderers
// ──────────────────────────────────────────────────────────────────────
if (loadingInitial) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

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
              Test your theoretical knowledge in a spoken viva session. Read each question, then answer verbally — your speech is transcribed live, AI-corrected for technical accuracy, and evaluated intelligently.
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
                type="button"
                role="switch"
                aria-checked={showFeedbackAfterEach}
                onClick={() => setShowFeedbackAfterEach(value => !value)}
                className="group w-full sm:w-auto min-h-[54px] px-4 py-2.5 rounded-2xl border font-bold text-sm transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                style={{
                  background: showFeedbackAfterEach
                    ? "linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(139, 92, 246, 0.12))"
                    : "var(--bg-input)",
                  borderColor: showFeedbackAfterEach ? "var(--border-accent)" : "var(--border-primary)",
                  color: "var(--text-primary)",
                  boxShadow: showFeedbackAfterEach ? "0 14px 30px -20px var(--accent-primary)" : "none",
                }}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors"
                    style={{
                      backgroundColor: showFeedbackAfterEach ? "var(--accent-glow)" : "rgba(148, 163, 184, 0.12)",
                      color: showFeedbackAfterEach ? "var(--text-accent)" : "var(--text-secondary)",
                    }}
                  >
                    <Flag size={16} />
                  </span>
                  <span className="truncate">{showFeedbackAfterEach ? "Feedback Each Question" : "Feedback At End"}</span>
                </span>
                <span
                  className={`relative grid h-8 w-[74px] shrink-0 grid-cols-2 items-center rounded-full p-1 text-[10px] font-black uppercase tracking-wide transition-all duration-300 ${showFeedbackAfterEach ? "bg-indigo-500/95 text-white shadow-inner" : "bg-slate-500/20 text-slate-400"
                    }`}
                >
                  <span className="relative z-10 text-center">End</span>
                  <span className="relative z-10 text-center">Each</span>
                  <span
                    className={`absolute top-1 h-6 w-[31px] rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 ease-out ${showFeedbackAfterEach ? "translate-x-[35px]" : "translate-x-0"
                      }`}
                  />
                </span>
              </button>

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
                phase === "reviewing" ? <Edit2 size={20} className="text-amber-500" /> :
                  <Activity size={20} className="text-emerald-500" />}
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {phase === "reading" ? "Reading Phase" :
                phase === "answering" ? "Answering Phase" :
                  phase === "reviewing" ? "Review Transcript" :
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
              <div className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${micEnabled
                ? "bg-rose-500/10 border-rose-500/30"
                : "bg-slate-500/10 border-slate-500/20"
                }`}>
                <div className="flex items-center space-x-3">
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${micEnabled ? "bg-rose-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-500"
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
                        ? "Auto-stops after 2 seconds of silence"
                        : "Turn the mic on to record your verbal answer"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={evaluating}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${micEnabled
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

              {/* Live transcript */}
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
                        style={{ height: '12px', transition: 'height 0.05s ease' }}
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
                <div className="flex items-center space-x-2">
                  {/* Retry button — only show if there's something to clear */}
                  {(answerText || interimText) && !evaluating && (
                    <button
                      type="button"
                      onClick={retryAnswer}
                      className="px-4 py-2.5 rounded-2xl font-bold text-sm border transition-all cursor-pointer flex items-center space-x-2 hover:scale-102 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                      title="Clear transcript and try again"
                    >
                      <RefreshCw size={13} />
                      <span>Retry</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => stopListeningAndReview()}
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
              </div>
            </motion.div>
          )}

          {/* ── SPRINT 5: REVIEWING PHASE ── */}
          {phase === "reviewing" && (
            <motion.div key="reviewing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4">

              {/* Header banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-amber-500/8 border-amber-500/25">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                    <Edit2 size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                      AI Transcript Review
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {avgConfidence !== null
                        ? `Confidence: ${Math.round(avgConfidence * 100)}% — AI checked for technical mishears`
                        : "AI checked your transcript for technical vocabulary errors"}
                    </p>
                  </div>
                </div>
                {correctionLoading && (
                  <div className="flex items-center space-x-2 text-indigo-500 text-xs font-bold">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Correcting…</span>
                  </div>
                )}
                {!correctionLoading && correctionApplied && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    ✦ Corrections Applied
                  </span>
                )}
                {!correctionLoading && !correctionApplied && !correctionError && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    ✓ Looks Good
                  </span>
                )}
              </div>

              {correctionError && (
                <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-xl text-sm flex items-start space-x-2" style={{ color: "var(--text-secondary)" }}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                  <span>{correctionError}</span>
                </div>
              )}

              {/* Raw transcript (read-only) */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    Raw Transcript (from microphone)
                  </span>
                </div>
                <div className="p-4 rounded-2xl border text-sm leading-relaxed"
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
                  {rawTranscriptSnapshot || <span className="italic" style={{ color: "var(--text-muted)" }}>No transcript captured.</span>}
                </div>
              </div>

              {/* Corrected / editable transcript */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {correctionApplied ? "AI-Corrected Transcript (editable)" : "Transcript (editable)"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{editedTranscript.length} chars</span>
                </div>
                <textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  rows={5}
                  disabled={correctionLoading}
                  placeholder={correctionLoading ? "AI is correcting your transcript…" : "Edit your transcript if needed…"}
                  className="w-full p-4 rounded-2xl border text-sm leading-relaxed resize-none outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: correctionApplied ? "rgba(245,158,11,0.35)" : "var(--border-primary)",
                    color: "var(--text-primary)",
                    opacity: correctionLoading ? 0.6 : 1,
                  }}
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    // Use raw transcript — skip correction
                    submitAnswer(rawTranscriptSnapshot);
                  }}
                  disabled={correctionLoading || evaluating}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-sm border transition-all cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Submit Original
                </button>

                <button
                  type="button"
                  onClick={() => submitAnswer(editedTranscript || rawTranscriptSnapshot)}
                  disabled={correctionLoading || evaluating}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 hover:scale-102"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {evaluating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Evaluating…</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck size={15} />
                      <span>Accept &amp; Submit</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                Evaluation always uses the final transcript shown above. You may edit before submitting.
              </p>
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

              {/* Missing concepts + revision */}
              {(lastEvaluation.missingConcepts?.length > 0 || lastEvaluation.suggestedRevision?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lastEvaluation.missingConcepts?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Missing Concepts</p>
                      {lastEvaluation.missingConcepts.map((c, i) => (
                        <p key={i} className="text-[11px] flex items-start space-x-1.5" style={{ color: "var(--text-secondary)" }}>
                          <AlertCircle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {lastEvaluation.suggestedRevision?.length > 0 && (
                    <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Revise</p>
                      {lastEvaluation.suggestedRevision.map((r, i) => (
                        <p key={i} className="text-[11px] flex items-start space-x-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Lightbulb size={10} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Confidence */}
              {lastEvaluation.confidence != null && lastEvaluation.confidence < 0.6 && (
                <p className="text-[10px] text-amber-500">
                  ⚠ AI confidence: {Math.round(lastEvaluation.confidence * 100)}% — evaluation may be uncertain
                </p>
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
