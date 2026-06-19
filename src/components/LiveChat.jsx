"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat, useRoomContext } from "@livekit/components-react";
import {
  MessageSquare,
  Send,
  X,
  ChevronDown,
  Users,
  Shield,
  GraduationCap,
} from "lucide-react";

// ─── Role badge helper ───────────────────────────────────────────────
function RoleBadge({ identity }) {
  // We'll encode role in the identity as "username::ROLE" if needed,
  // but for now we just show the name. The host will have a special badge.
  return null;
}

// ─── Single Chat Message ─────────────────────────────────────────────
function ChatMessage({ message, isOwnMessage }) {
  const timestamp = new Date(message.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className={`flex gap-2.5 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
          isOwnMessage
            ? "bg-indigo-500 text-white"
            : "text-white"
        }`}
        style={
          isOwnMessage
            ? {}
            : { backgroundColor: stringToColor(message.from?.identity || "U") }
        }
      >
        {(message.from?.identity || "U").charAt(0).toUpperCase()}
      </div>

      {/* Message Bubble */}
      <div className={`max-w-[75%] space-y-0.5 ${isOwnMessage ? "items-end text-right" : ""}`}>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold truncate max-w-[120px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {isOwnMessage ? "You" : message.from?.identity || "Unknown"}
          </span>
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>
            {timestamp}
          </span>
        </div>
        <div
          className={`px-3 py-2 rounded-xl text-xs leading-relaxed break-words ${
            isOwnMessage
              ? "rounded-tr-sm bg-indigo-500 text-white"
              : "rounded-tl-sm"
          }`}
          style={
            isOwnMessage
              ? {}
              : {
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }
          }
        >
          {message.message}
        </div>
      </div>
    </div>
  );
}

// ─── Generate consistent color from string ───────────────────────────
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

// ─── Main LiveChat Component ─────────────────────────────────────────
export default function LiveChat({ collapsed = false, className = "" }) {
  const { chatMessages, send, isSending } = useChat();
  const room = useRoomContext();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const prevMessageCount = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatMessages.length > prevMessageCount.current) {
      if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setHasNewMessage(true);
      }
    }
    prevMessageCount.current = chatMessages.length;
  }, [chatMessages.length, isOpen]);

  // Clear new message indicator when opening
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isSending) return;
    send(text);
    setInputValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const localIdentity = room?.localParticipant?.identity;

  // ─── Collapsed Toggle Button ───────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 px-4 py-3 rounded-xl border transition-all hover:scale-105 cursor-pointer"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-primary)",
          color: "var(--text-primary)",
        }}
        id="chat-toggle-btn"
      >
        <MessageSquare size={16} />
        <span className="text-xs font-bold">Live Chat</span>
        {hasNewMessage && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  // ─── Chat Panel ────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col rounded-2xl border shadow-xl overflow-hidden ${className}`}
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-primary)",
        height: "100%",
        minHeight: "400px",
        maxHeight: "600px",
      }}
      id="live-chat-panel"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: "var(--text-accent)" }} />
          <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Live Chat
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}
          >
            {chatMessages.length}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
          id="chat-close-btn"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
            <MessageSquare size={28} className="opacity-20" style={{ color: "var(--text-muted)" }} />
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <ChatMessage
              key={`${msg.timestamp}-${i}`}
              message={msg}
              isOwnMessage={msg.from?.identity === localIdentity}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-indigo-500/30"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-primary)",
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
            maxLength={500}
            id="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30 cursor-pointer hover:bg-indigo-500/10"
            style={{ color: "var(--text-accent)" }}
            id="chat-send-btn"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[8px] mt-1.5 px-1" style={{ color: "var(--text-muted)" }}>
          Press Enter to send • {500 - inputValue.length} chars left
        </p>
      </div>
    </div>
  );
}
