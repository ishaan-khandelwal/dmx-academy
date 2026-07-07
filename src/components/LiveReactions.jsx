"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

const EMOJIS = ["👍", "❤️", "😂", "👏", "🎉", "🔥", "🚀"];

export function ReactionOverlay({ reactions }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, y: 50, scale: 0.5, x: reaction.xOffset }}
            animate={{ opacity: [0, 1, 1, 0], y: -200, scale: [0.5, 1.2, 1, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center drop-shadow-md"
          >
            <span className="text-4xl">{reaction.emoji}</span>
            {reaction.username && (
              <span className="text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full mt-1">
                {reaction.username}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ReactionPicker({ onReact }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleReact = (emoji) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full mb-2 right-0 origin-bottom-right flex items-center gap-1.5 p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl z-50"
          >
            {EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleReact(emoji)}
                className="text-2xl hover:scale-125 transition-transform duration-200 cursor-pointer p-1"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer"
        style={{
          backgroundColor: isOpen ? "var(--bg-badge)" : "var(--bg-primary)",
          borderColor: isOpen ? "var(--border-accent)" : "var(--border-primary)",
          color: isOpen ? "var(--text-accent)" : "var(--text-primary)",
        }}
        title="Send Reaction"
      >
        <Smile size={12} />
        <span className="hidden sm:inline">React</span>
      </button>
    </div>
  );
}
