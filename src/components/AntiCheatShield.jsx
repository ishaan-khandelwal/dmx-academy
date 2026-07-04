"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Maximize2, AlertTriangle, XOctagon } from "lucide-react";

export default function AntiCheatShield({
  active = false,
  maxViolations = 3,
  onDisqualify,
  onViolation,
  subject = "Viva Exam"
}) {
  const [violations, setViolations] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [warningType, setWarningType] = useState(""); // "tab" | "fullscreen"

  const activeRef = useRef(active);
  const violationsRef = useRef(violations);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  // Request Fullscreen Helper
  const requestFullscreen = useCallback(async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn("Fullscreen request rejected or not supported:", err);
    }
  }, []);

  // Trigger violation warning
  const triggerViolation = useCallback((type) => {
    if (!activeRef.current) return;

    const nextViolations = violationsRef.current + 1;
    setViolations(nextViolations);
    setWarningType(type);
    
    if (onViolation) {
      onViolation(nextViolations, type);
    }

    if (nextViolations >= maxViolations) {
      // Disqualified!
      if (onDisqualify) {
        onDisqualify();
      }
    } else {
      setShowWarningModal(true);
    }
  }, [maxViolations, onViolation, onDisqualify]);

  // Handle Fullscreen Exit Detection
  const handleFullscreenChange = useCallback(() => {
    if (!activeRef.current) return;
    
    const currFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    setIsFullscreen(currFullscreen);
    if (!currFullscreen) {
      triggerViolation("fullscreen");
    }
  }, [triggerViolation]);

  useEffect(() => {
    if (!active) {
      setViolations(0);
      setShowWarningModal(false);
      return;
    }

    // Attempt to enter fullscreen initially
    requestFullscreen();

    // Listeners for focus loss & visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        triggerViolation("tab");
      }
    };

    const handleWindowBlur = () => {
      triggerViolation("tab");
    };

    // Beforeunload handler to block closing tab
    const handleBeforeUnload = (e) => {
      if (activeRef.current) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit? Your exam progress will be lost and flagged.";
        return e.returnValue;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [active, triggerViolation, requestFullscreen, handleFullscreenChange]);

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Fullscreen Enforcer Overlay */}
          {!isFullscreen && !showWarningModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center text-white"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/30 mb-6"
              >
                <Maximize2 size={36} className="text-rose-500" />
              </motion.div>

              <h2 className="text-2xl font-black font-display mb-3">Fullscreen Mode Required</h2>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-8">
                To prevent cheating, {subject} requires fullscreen mode. Please click the button below to resume your session in fullscreen.
              </p>

              <button
                onClick={requestFullscreen}
                className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:scale-102 hover:shadow-indigo-500/25 transition-all cursor-pointer flex items-center space-x-2"
              >
                <Maximize2 size={16} />
                <span>Go Fullscreen</span>
              </button>
            </motion.div>
          )}

          {/* Tab Switching Violation Warning Modal */}
          {showWarningModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-center"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl text-white"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
                  <ShieldAlert size={30} className="text-rose-500 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                    Security Alert
                  </span>
                  <h3 className="text-xl font-black">
                    {warningType === "tab" ? "Tab Switch Detected" : "Fullscreen Exited"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You switched tabs, lost window focus, or exited fullscreen. Tab switching is strictly prohibited to maintain exam integrity.
                  </p>
                </div>

                {/* Warnings counter indicator */}
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="text-amber-500" size={18} />
                    <span className="text-xs font-bold text-slate-300">Integrity Warnings</span>
                  </div>
                  <span className="text-sm font-black text-rose-500 px-3 py-1 bg-rose-500/10 rounded-xl">
                    {violations} / {maxViolations}
                  </span>
                </div>

                {violations >= maxViolations - 1 ? (
                  <div className="flex items-start space-x-2 text-rose-400 text-left p-3.5 bg-rose-950/20 rounded-xl border border-rose-900/30">
                    <XOctagon size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold leading-normal">
                      CAUTION: The next violation will result in immediate disqualification and your exam will be auto-submitted.
                    </p>
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    requestFullscreen();
                  }}
                  className="w-full py-3.5 rounded-2xl text-xs font-bold text-white shadow-md bg-gradient-to-r from-rose-500 to-orange-600 hover:scale-102 transition-all cursor-pointer"
                >
                  I Understand, Resume Exam
                </button>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
