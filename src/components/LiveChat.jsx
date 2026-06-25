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
  BarChart2,
  Trophy,
  Mic,
  MicOff,
  XCircle,
  Hand,
} from "lucide-react";
import LivePollCreator from "@/components/LivePollCreator";
import { SessionLeaderboard } from "@/components/LiveLeaderboard";

const OPTION_LABELS = ["A", "B", "C", "D"];

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

      {/* Message Bubble container */}
      <div className={`flex flex-col max-w-[75%] space-y-1 ${isOwnMessage ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-1.5 flex-wrap ${isOwnMessage ? "justify-end" : "justify-start"}`}>
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
          className={`w-fit px-3 py-2 rounded-2xl text-[13px] font-medium leading-relaxed break-words shadow-sm ${
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
                  border: "1px solid var(--border-primary)",
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
  persistent = false,
  className = "",
  blockedUsers = [],
  setBlockedUsers = () => {},
  hostUsername = "",
  sessionId = null,
  isFullscreen: controlledIsFullscreen,
  onToggleFullscreen,
  onClose,
  isOpen: controlledIsOpen,
  onUnreadChange,
  // Programmatic Tab switching
  controlledActiveTab,
  onTabChange,
  // Live features props
  raisedHands = [],
  activeSpeaker = null,
  acceptSpeaker = () => {},
  rejectHand = () => {},
  revokeSpeaker = () => {},
  activePoll = null,
  pollAnswers = null,
  pollResultData = null,
  leaderboard = [],
  totalPolls = 0,
  onPollLaunched = () => {},
  onPollEnded = () => {},
  room: roomProp = null,
  authToken: authTokenProp = "",
  isHost: isHostProp = null,
  showPollCreatorExternal = false,
}) {
  const { chatMessages, send, isSending } = useChat();
  const roomContext = useRoomContext();
  const room = roomProp || roomContext;
  const participants = useParticipants();
  const { user, token: authContextToken } = useAuth();
  const authToken = authTokenProp || authContextToken;

  const [activeTabState, setActiveTabState] = useState("chat"); // "chat", "participants", or "polls"
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : activeTabState;
  const setActiveTab = onTabChange !== undefined ? onTabChange : setActiveTabState;
  const [inputValue, setInputValue] = useState("");
  const [internalIsOpen, setInternalIsOpen] = useState(persistent || !collapsed);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const [isFullscreenLocal, setIsFullscreenLocal] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [dbMessages, setDbMessages] = useState([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const prevMessageCount = useRef(0);

  // Sync external trigger (e.g. Show Polls button in control bar)
  useEffect(() => {
    if (showPollCreatorExternal) {
      setShowPollCreator(true);
    }
  }, [showPollCreatorExternal]);

  const userEmailLower = user?.email?.toLowerCase() || "";
  const isHost = isHostProp !== null 
    ? isHostProp 
    : (user?.role === "ADMIN" || user?.role === "MENTOR" || userEmailLower.includes("admin") || userEmailLower.includes("mentor"));
  const canCollapse = !isHost;
  const isFullscreen = controlledIsFullscreen ?? isFullscreenLocal;
  const toggleFullscreen = onToggleFullscreen || (() => setIsFullscreenLocal((prev) => !prev));
  const localIdentity = room?.localParticipant?.identity;

  // Fetch chat history from database on mount or when sessionId/authToken changes.
  // We wait until we have a valid token — auth context may hydrate after mount.
  const resolvedToken = authToken || (typeof window !== "undefined" ? localStorage.getItem("academy_auth_token") : null);
  useEffect(() => {
    if (!sessionId || !resolvedToken) return;
    const fetchChatHistory = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || getApiBase();
        const res = await fetch(`${apiBase}/api/livekit/session/${sessionId}/chat`, {
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
          },
        });
        if (!res.ok) {
          console.warn(`Chat history fetch failed: ${res.status} ${res.statusText}`);
          return;
        }
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
  }, [sessionId, resolvedToken]);

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
      } else {
        setHasNewMessage(true);
        if (onUnreadChange) onUnreadChange(true);
      }
    }
    prevMessageCount.current = filteredMessages.length;
  }, [filteredMessages.length, isOpen, activeTab, onUnreadChange]);

  // Clear new message indicator when opening
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      setHasNewMessage(false);
      if (onUnreadChange) onUnreadChange(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, activeTab, onUnreadChange]);

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

  // Sort participants: Mentor/Host first, then Speaking (activeSpeaker), then Raised Hands, then Local (You), then Remote alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsHost = a.identity === hostUsername;
    const bIsHost = b.identity === hostUsername;
    if (aIsHost && !bIsHost) return -1;
    if (!aIsHost && bIsHost) return 1;

    const aSpeaking = a.identity === activeSpeaker;
    const bSpeaking = b.identity === activeSpeaker;
    if (aSpeaking && !bSpeaking) return -1;
    if (!aSpeaking && bSpeaking) return 1;

    const aHand = raisedHands.includes(a.identity);
    const bHand = raisedHands.includes(b.identity);
    if (aHand && !bHand) return -1;
    if (!aHand && bHand) return 1;

    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;

    return a.identity.localeCompare(b.identity);
  });

  // ─── Collapsed Toggle Button ───────────────────────────────────────
  if (canCollapse && !isOpen) {
    return (
      <button
        onClick={() => setInternalIsOpen(true)}
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
    <div className={isFullscreen ? "fixed inset-0 z-[70] p-4 sm:p-6 bg-black/45 backdrop-blur-sm" : "flex flex-col min-h-0 h-full overflow-hidden"}>
      <div
        className={`flex flex-col rounded-[1.1rem] border overflow-hidden ${className} ${isFullscreen ? "w-full h-full max-h-none shadow-2xl" : "h-full"}`}
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "rgba(148, 163, 184, 0.18)",
          minHeight: "0",
        }}
        id="live-chat-panel"
      >
      {/* Tab Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b select-none"
        style={{ borderColor: "rgba(148, 163, 184, 0.16)" }}
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

          <button
            onClick={() => setActiveTab("polls")}
            className={`flex items-center gap-1.5 pb-0.5 border-b-2 text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === "polls"
                ? "border-indigo-500 text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            id="tab-polls-btn"
          >
            <BarChart2 size={13} />
            <span>Polls</span>
          </button>
        </div>

        {canCollapse && (
          <button
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                if (controlledIsFullscreen !== undefined) {
                  toggleFullscreen();
                } else {
                  setIsFullscreenLocal(false);
                }
                setInternalIsOpen(false);
              }
            }}
            className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
            id="chat-close-btn"
            title="Hide chat"
            aria-label="Hide chat"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "chat" && (
          /* Messages Area */
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
            style={{ scrollbarWidth: "thin", backgroundColor: "var(--bg-card)" }}
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
        )}

        {activeTab === "participants" && (
          /* Participants Tab Area */
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-2 flex flex-col min-h-0"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
              {sortedParticipants.map((p) => {
                const isParticipantHost = p.identity === hostUsername;
                const isBlocked = blockedUsers.includes(p.identity);
                const isLocal = p.identity === localIdentity;
                const hasHandRaised = raisedHands.includes(p.identity);
                const isSpeaking = activeSpeaker === p.identity;

                const showActionsRow = isHost && !isLocal && !isParticipantHost && hasHandRaised && !isBlocked;

                return (
                  <div
                    key={p.identity}
                    className="flex flex-col gap-2.5 p-3 rounded-xl border transition-all shrink-0"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-primary)",
                    }}
                  >
                    {/* Top Row: Avatar and User Info */}
                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                          style={{ backgroundColor: stringToColor(p.identity) }}
                        >
                          {p.identity.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold truncate max-w-[120px]" style={{ color: "var(--text-primary)" }}>
                              {p.identity}
                            </span>
                            {isLocal && (
                              <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded-md uppercase shrink-0">
                                You
                              </span>
                            )}
                            {hasHandRaised && !isBlocked && (
                              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded uppercase shrink-0 animate-pulse">
                                Hand Raised
                              </span>
                            )}
                            {isSpeaking && (
                              <span className="text-[8px] font-bold text-emerald-450 bg-emerald-500/10 px-1.5 py-0.2 rounded uppercase shrink-0 flex items-center gap-1 select-none">
                                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                                On Stage
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

                      {/* Render Block / End Stage Buttons on top row if student has NOT raised their hand */}
                      {isHost && !isLocal && !isParticipantHost && !showActionsRow && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSpeaking && (
                            <button
                              onClick={() => revokeSpeaker()}
                              className="px-2 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                              title="End Stage / Mute Student"
                            >
                              <MicOff size={10} />
                              <span>End Stage</span>
                            </button>
                          )}
                          <button
                            onClick={() => toggleBlock(p.identity)}
                            className={`px-2 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
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
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Actions (Only for Hand Raises to avoid clutter) */}
                    {showActionsRow && (
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t" style={{ borderColor: "rgba(148, 163, 184, 0.08)" }}>
                        <button
                          onClick={() => acceptSpeaker(p.identity)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => rejectHand(p.identity)}
                          className="px-2.5 py-1 rounded border hover:bg-red-500/10 text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                          style={{ borderColor: "var(--border-primary)" }}
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => toggleBlock(p.identity)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            isBlocked
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                          }`}
                        >
                          {isBlocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isHost && activeSpeaker && (
              <div className="mt-2 pt-2 border-t flex items-center justify-between shrink-0" style={{ borderColor: "rgba(148, 163, 184, 0.16)" }}>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>Speaking Student</p>
                  <p className="text-xs font-black text-[var(--text-accent)]">{activeSpeaker}</p>
                </div>
                <button
                  onClick={revokeSpeaker}
                  className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-red-500/25"
                >
                  <XCircle size={10} />
                  Mute Student
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "polls" && (
          /* Polls & Leaderboard Tab Area */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 gap-4" style={{ backgroundColor: "var(--bg-card)", scrollbarWidth: "thin" }}>
            {isHost ? (
              /* Host/Admin View — default: leaderboard; creator shown only when toggled or poll active */
              <div className="flex flex-col gap-4">
                {/* Header row */}
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Polls</span>
                  {!activePoll && (
                    <button
                      onClick={() => setShowPollCreator((v) => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer border ${
                        showPollCreator
                          ? "bg-indigo-600 border-transparent text-white"
                          : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                      }`}
                    >
                      <BarChart2 size={11} />
                      {showPollCreator ? "Hide Creator" : "Create Poll"}
                    </button>
                  )}
                </div>

                {/* Poll creator — visible when toggled or when a poll is active (so host can end it) */}
                {(showPollCreator || activePoll) && (
                  <LivePollCreator
                    sessionId={sessionId}
                    authToken={authToken}
                    room={room}
                    activePoll={activePoll}
                    onPollLaunched={(poll) => { onPollLaunched(poll); setShowPollCreator(false); }}
                    onPollEnded={onPollEnded}
                    incomingAnswers={pollAnswers}
                  />
                )}

                {/* Session leaderboard — always visible when no poll is running */}
                {!activePoll && (
                  leaderboard && leaderboard.length > 0 ? (
                    <SessionLeaderboard
                      leaderboard={leaderboard}
                      totalPolls={totalPolls}
                      currentUsername={null}
                      compact={true}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 rounded-2xl border border-dashed border-slate-700 flex-1">
                      <Trophy className="opacity-20 text-slate-400" size={28} />
                      <p className="text-xs text-slate-400">No leaderboard yet.</p>
                      <p className="text-[10px] text-slate-600">Launch a poll to start scoring.</p>
                    </div>
                  )
                )}
              </div>
            ) : (
              /* Student View */
              <div className="space-y-4">
                {activePoll ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 rounded-2xl border bg-indigo-500/5 border-indigo-500/20">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <BarChart2 className="animate-pulse" size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Poll in Progress</h4>
                      <p className="text-xs text-slate-400">
                        Answer the active poll on your main classroom screen!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {pollResultData && (
                      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-primary)" }}>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">
                            Last Poll Results
                          </span>
                          <span className="text-[9px] font-bold" style={{ color: "var(--text-muted)" }}>
                            {pollResultData.totalVotes || 0} votes
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {pollResultData.poll?.question}
                        </h4>
                        <div className="space-y-2">
                          {(pollResultData.poll?.options || []).map((opt, idx) => {
                            const count = pollResultData.voteCounts?.[idx] || 0;
                            const total = pollResultData.totalVotes || 0;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            const isCorrect = idx === pollResultData.poll?.correctIdx;
                            const myResult = pollResultData.studentResults?.find(r => r.username === user?.username);
                            const myChoice = myResult?.chosenIdx === idx;
                            return (
                              <div key={idx} className="relative rounded-xl border overflow-hidden"
                                style={{
                                  borderColor: isCorrect
                                    ? "rgba(16, 185, 129, 0.35)"
                                    : myChoice && !isCorrect
                                    ? "rgba(239,68,68,0.3)"
                                    : "var(--border-primary)",
                                  backgroundColor: isCorrect
                                    ? "rgba(16,185,129,0.06)"
                                    : myChoice && !isCorrect
                                    ? "rgba(239,68,68,0.05)"
                                    : "var(--bg-card)"
                                }}
                              >
                                <div className="absolute inset-y-0 left-0 bg-slate-500/5 transition-all" style={{ width: `${pct}%` }} />
                                <div className="relative flex items-center justify-between px-2.5 py-2 gap-2">
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold text-slate-300 block">
                                      {OPTION_LABELS[idx]}. {opt}
                                    </span>
                                    {isCorrect && myChoice && (
                                      <span className="text-[9px] font-bold text-emerald-400 mt-0.5 block">✓ Correct Answer · Your Answer</span>
                                    )}
                                    {isCorrect && !myChoice && (
                                      <span className="text-[9px] font-bold text-emerald-400 mt-0.5 block">✓ Correct Answer</span>
                                    )}
                                    {myChoice && !isCorrect && (
                                      <span className="text-[9px] font-bold text-red-400 mt-0.5 block">✗ Your Answer (Wrong)</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 shrink-0">{pct}% ({count})</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {leaderboard && leaderboard.length > 0 ? (
                      <SessionLeaderboard
                        leaderboard={leaderboard}
                        totalPolls={totalPolls}
                        currentUsername={user?.username}
                        compact={true}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 rounded-2xl border border-dashed border-slate-700">
                        <Trophy className="opacity-20 text-slate-400" size={24} />
                        <p className="text-xs text-slate-400">No leaderboard data yet.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area (only visible in Chat tab) */}
      {activeTab === "chat" && (
        <div
          className="px-3 py-2.5 border-t"
          style={{ borderColor: "rgba(148, 163, 184, 0.16)" }}
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
                  ? "You are blocked. You cannot send messages in this session."
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
              <span className="text-red-400 font-semibold">You are blocked. You cannot send messages in this session.</span>
            ) : (
              <>Press Enter to send • {500 - inputValue.length} chars left</>
            )}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
