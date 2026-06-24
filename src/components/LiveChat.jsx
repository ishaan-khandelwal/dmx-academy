"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat, useRoomContext, useParticipants } from "@livekit/components-react";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/utils/api";
import {
  MessageSquare,
  Send,
  X,
  ChevronDown,
  Users,
  Shield,
  GraduationCap,
  UserX,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

// ─── Role badge helper ───────────────────────────────────────────────
function RoleBadge({ identity }) {
  // We'll encode role in the identity as "username::ROLE" if needed,
  // but for now we just show the name. The host will have a special badge.
  return null;
}

// ─── Single Chat Message ─────────────────────────────────────────────
function ChatMessage({ message, isOwnMessage, isHost, hostUsername, blockedUsers, toggleBlock }) {
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-bold truncate max-w-[120px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {isOwnMessage ? "You" : message.from?.identity || "Unknown"}
          </span>
          {blockedUsers?.includes(message.from?.identity) && (
            <span className="text-[8px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded-md uppercase tracking-wider flex items-center gap-0.5 select-none">
              <ShieldAlert size={8} /> Blocked
            </span>
          )}
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>
            {timestamp}
          </span>
          {isHost && !isOwnMessage && message.from?.identity !== hostUsername && (
            <button
              onClick={() => toggleBlock(message.from?.identity)}
              className="text-[8px] font-bold uppercase transition-colors text-slate-400 hover:text-red-550 cursor-pointer ml-1 flex items-center gap-0.5 border border-transparent hover:border-slate-500/10 rounded px-1 py-0.2"
              title={blockedUsers?.includes(message.from?.identity) ? "Unblock Student" : "Block Student"}
            >
              {blockedUsers?.includes(message.from?.identity) ? (
                <>
                  <UserCheck size={9} className="text-emerald-500" />
                  <span className="text-emerald-500">Unblock</span>
                </>
              ) : (
                <>
                  <UserX size={9} className="text-red-400" />
                  <span className="text-red-400">Block</span>
                </>
              )}
            </button>
          )}
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
export default function LiveChat({
  collapsed = false,
  className = "",
  blockedUsers = [],
  setBlockedUsers = () => {},
  hostUsername = "",
  sessionId = null,
}) {
  const { chatMessages, send, isSending } = useChat();
  const room = useRoomContext();
  const participants = useParticipants();
  const { user, token: authToken } = useAuth();

  const [activeTab, setActiveTab] = useState("chat"); // "chat" or "participants"
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [dbMessages, setDbMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const prevMessageCount = useRef(0);

  const isHost = user?.role === "ADMIN" || user?.role === "MENTOR";
  const localIdentity = room?.localParticipant?.identity;

  // Fetch chat history from database on mount or when sessionId/authToken changes
  useEffect(() => {
    if (!sessionId) return;
    const fetchChatHistory = async () => {
      try {
        const token = authToken || localStorage.getItem("academy_auth_token");
        const apiBase = process.env.NEXT_PUBLIC_API_URL || getApiBase();
        const res = await fetch(`${apiBase}/api/livekit/session/${sessionId}/chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success && data.messages) {
          const mapped = data.messages.map((msg) => ({
            message: msg.messageText,
            from: { identity: msg.senderUsername },
            timestamp: new Date(msg.createdAt).getTime(),
          }));
          setDbMessages(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    fetchChatHistory();
  }, [sessionId, authToken]);

  // Combine DB messages and LiveKit transient messages, filtering out duplicates
  const combinedMessages = [...dbMessages];
  chatMessages.forEach((liveMsg) => {
    const isDuplicate = dbMessages.some(
      (dbMsg) =>
        dbMsg.from?.identity === liveMsg.from?.identity &&
        dbMsg.message === liveMsg.message &&
        Math.abs(dbMsg.timestamp - liveMsg.timestamp) < 5000 // within 5 seconds
    );
    if (!isDuplicate) {
      combinedMessages.push(liveMsg);
    }
  });

  // Do not filter out messages from blocked users (preserve chat history visibility)
  const filteredMessages = combinedMessages;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (filteredMessages.length > prevMessageCount.current) {
      if (isOpen && activeTab === "chat") {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (activeTab !== "chat") {
        setHasNewMessage(true);
      }
    }
    prevMessageCount.current = filteredMessages.length;
  }, [filteredMessages.length, isOpen, activeTab]);

  // Clear new message indicator when opening
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      setHasNewMessage(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, activeTab]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending || blockedUsers.includes(localIdentity)) return;
    
    // 1. Send via LiveKit (instant real-time delivery)
    send(text);
    setInputValue("");

    // 2. Persist to DB in the background
    if (sessionId) {
      try {
        const token = authToken || localStorage.getItem("academy_auth_token");
        const apiBase = process.env.NEXT_PUBLIC_API_URL || getApiBase();
        await fetch(`${apiBase}/api/livekit/session/${sessionId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messageText: text }),
        });
      } catch (err) {
        console.error("Failed to save chat message to DB:", err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleBlock = (username) => {
    const isCurrentlyBlocked = blockedUsers.includes(username);
    let newBlocked;
    if (isCurrentlyBlocked) {
      newBlocked = blockedUsers.filter((u) => u !== username);
    } else {
      newBlocked = [...blockedUsers, username];
    }
    setBlockedUsers(newBlocked);

    if (room && room.state === "connected" && room.localParticipant) {
      try {
        const payload = {
          action: isCurrentlyBlocked ? "UNBLOCK_STUDENT" : "BLOCK_STUDENT",
          username
        };
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
          reliable: true,
          topic: "raise-hand-actions"
        });
      } catch (e) {
        console.error("Failed to publish block action:", e);
      }
    }
  };

  // Sort participants: Mentor/Host first, then Local (You), then Remote alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsHost = a.identity === hostUsername;
    const bIsHost = b.identity === hostUsername;
    if (aIsHost && !bIsHost) return -1;
    if (!aIsHost && bIsHost) return 1;

    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;

    return a.identity.localeCompare(b.identity);
  });

  // ─── Collapsed Toggle Button ───────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 px-4 py-3 rounded-xl border transition-all hover:scale-105 cursor-pointer shadow-md"
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
        minHeight: "0",
      }}
      id="live-chat-panel"
    >
      {/* Tab Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b select-none"
        style={{ borderColor: "var(--border-primary)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 pb-0.5 border-b-2 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "chat"
                ? "border-indigo-500 text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            id="tab-chat-btn"
          >
            <MessageSquare size={13} />
            <span>Chat</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
              style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}
            >
              {filteredMessages.length}
            </span>
            {hasNewMessage && activeTab !== "chat" && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse ml-0.5" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("participants")}
            className={`flex items-center gap-1.5 pb-0.5 border-b-2 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "participants"
                ? "border-indigo-500 text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            id="tab-participants-btn"
          >
            <Users size={13} />
            <span>Students</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
              style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}
            >
              {sortedParticipants.length}
            </span>
          </button>
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

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "chat" ? (
          /* Messages Area */
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ scrollbarWidth: "thin" }}
          >
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
                <MessageSquare size={28} className="opacity-20" style={{ color: "var(--text-muted)" }} />
                <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                  No messages yet. Say hello! 👋
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, i) => (
                <ChatMessage
                  key={`${msg.timestamp}-${i}`}
                  message={msg}
                  isOwnMessage={msg.from?.identity === localIdentity}
                  isHost={isHost}
                  hostUsername={hostUsername}
                  blockedUsers={blockedUsers}
                  toggleBlock={toggleBlock}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Participants Tab Area */
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
            style={{ scrollbarWidth: "thin" }}
          >
            {sortedParticipants.map((p) => {
              const isParticipantHost = p.identity === hostUsername;
              const isBlocked = blockedUsers.includes(p.identity);
              const isLocal = p.identity === localIdentity;

              return (
                <div
                  key={p.identity}
                  className="flex items-center justify-between p-2.5 rounded-xl border transition-all"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                      style={{ backgroundColor: stringToColor(p.identity) }}
                    >
                      {p.identity.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate max-w-[120px]" style={{ color: "var(--text-primary)" }}>
                          {p.identity}
                        </span>
                        {isLocal && (
                          <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded-md uppercase">
                            You
                          </span>
                        )}
                      </div>
                      
                      {/* Badge / Role */}
                      <div className="flex items-center gap-1 mt-0.5 select-none">
                        {isParticipantHost ? (
                          <span className="text-[8px] font-black text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5">
                            <Shield size={8} /> Mentor
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.2 rounded uppercase">
                            Student
                          </span>
                        )}
                        {isBlocked && (
                          <span className="text-[8px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5">
                            <ShieldAlert size={8} /> Blocked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mentor Actions: Block/Unblock Button */}
                  {isHost && !isLocal && !isParticipantHost && (
                    <button
                      onClick={() => toggleBlock(p.identity)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        isBlocked
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                      }`}
                      title={isBlocked ? "Unblock Student" : "Block Student"}
                    >
                      {isBlocked ? (
                        <>
                          <UserCheck size={10} />
                          <span>Unblock</span>
                        </>
                      ) : (
                        <>
                          <UserX size={10} />
                          <span>Block</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area (only visible in Chat tab) */}
      {activeTab === "chat" && (
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
              disabled={blockedUsers.includes(localIdentity)}
              placeholder={
                blockedUsers.includes(localIdentity)
                  ? "You have been blocked from chat"
                  : "Type a message..."
              }
              className="flex-1 bg-transparent text-xs outline-none disabled:text-slate-500 disabled:cursor-not-allowed"
              style={{ color: "var(--text-primary)" }}
              maxLength={500}
              id="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending || blockedUsers.includes(localIdentity)}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30 cursor-pointer hover:bg-indigo-500/10"
              style={{ color: "var(--text-accent)" }}
              id="chat-send-btn"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[8px] mt-1.5 px-1" style={{ color: "var(--text-muted)" }}>
            {blockedUsers.includes(localIdentity) ? (
              <span className="text-red-400 font-semibold">Muted: You cannot send messages in this session.</span>
            ) : (
              <>Press Enter to send • {500 - inputValue.length} chars left</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
