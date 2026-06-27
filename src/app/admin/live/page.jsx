"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useTracks,
  useRoomContext,
  useParticipants,
  TrackToggle,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import LivePollCreator from "@/components/LivePollCreator";
import LiveChat from "@/components/LiveChat";
import { SessionLeaderboard, PollResultsOverlay } from "@/components/LiveLeaderboard";
import {
  Radio,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Users,
  Clock,
  StopCircle,
  ImagePlus,
  Sparkles,
  Wifi,
  WifiOff,
  AlertTriangle,
  Hand,
  XCircle,
  BarChart2,
  X,
  ArrowLeft,
} from "lucide-react";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const playRaiseHandSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;

    const playNote = (freq, duration, startTime) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0.08, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Modern Digital Chime: Two ascending notes (D5 and A5) with exponential decay
    playNote(587.33, 0.12, now);
    playNote(880.00, 0.40, now + 0.10);
  } catch (e) {
    console.error("Failed to play hand raise notification sound:", e);
  }
};

// ─── Session Timer ───────────────────────────────────────────────────
function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const hrs = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${hrs}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 text-sm font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
      <Clock size={14} />
      <span>{elapsed}</span>
    </div>
  );
}

// ─── Participant Counter ─────────────────────────────────────────────
function ViewerCount() {
  const participants = useParticipants();
  const viewerCount = Math.max(0, participants.length - 1); // Exclude the host

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}
    >
      <Users size={14} />
      <span>{viewerCount} viewer{viewerCount !== 1 ? "s" : ""}</span>
    </div>
  );
}

function DraggableVideo({ track, name, isLocal = false, defaultPosition = { x: 20, y: 20 }, alignLeft = false }) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const boxRef = React.useRef(null);

  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    handleStart(e.clientX, e.clientY);
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      
      const parent = boxRef.current?.parentElement;
      let newX = clientX - dragStart.x;
      let newY = clientY - dragStart.y;

      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const boxRect = boxRef.current.getBoundingClientRect();
        const maxX = parentRect.width - boxRect.width;
        newX = Math.max(0, Math.min(newX, maxX));
        const maxY = parentRect.height - boxRect.height;
        newY = Math.max(0, Math.min(newY, maxY));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStart]);

  // Set default initial position on mount
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (parent && position.x === defaultPosition.x && position.y === defaultPosition.y) {
      const parentRect = parent.getBoundingClientRect();
      const x = alignLeft ? 20 : parentRect.width - 210;
      const y = parentRect.height - 162; // 144 (h-36) + 18
      setPosition({ x: Math.max(20, x), y: Math.max(20, y) });
    }
  }, [alignLeft, defaultPosition]);

  return (
    <div
      ref={boxRef}
      className="absolute z-50 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/90 cursor-move select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none"
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <VideoTrack trackRef={track} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white pointer-events-none">
        {name} {isLocal && "(You)"}
      </div>
    </div>
  );
}

// ─── Live Broadcasting Panel ─────────────────────────────────────────
function BroadcastPanel({ session, onEndSession, authToken }) {
  const { user } = useAuth();
  const room = useRoomContext();
  const [raisedHands, setRaisedHands] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  // Active Tab for sidebar
  const [activeTab, setActiveTab] = useState("chat");
  const [activePoll, setActivePoll] = useState(null);         // poll currently running
  const [pollAnswers, setPollAnswers] = useState(new Map()); // Map<username, {chosenIdx, timeMs}>
  const [pollResultData, setPollResultData] = useState(null); // fetched after poll ends
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalPolls, setTotalPolls] = useState(0);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [showPollCreatorSignal, setShowPollCreatorSignal] = useState(false);

  const [connectionState, setConnectionState] = useState(room?.state || "disconnected");
  const [isBrowserOffline, setIsBrowserOffline] = useState(false);

  useEffect(() => {
    if (!room) return;
    
    const handleStateChange = () => {
      setConnectionState(room.state);
    };

    room.on("connectionStateChanged", handleStateChange);
    
    // Listen for reconnection events specifically
    room.on("reconnecting", () => setConnectionState("reconnecting"));
    room.on("reconnected", () => setConnectionState("connected"));
    room.on("disconnected", () => setConnectionState("disconnected"));

    const handleOffline = () => setIsBrowserOffline(true);
    const handleOnline = () => setIsBrowserOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Initial check
    setIsBrowserOffline(!window.navigator.onLine);

    return () => {
      room.off("connectionStateChanged", handleStateChange);
      room.off("reconnecting", handleStateChange);
      room.off("reconnected", handleStateChange);
      room.off("disconnected", handleStateChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [room]);


  // Auto-dismiss the temporary raised hand notification after 4 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.isLocal
  );
  const localScreenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && t.participant?.isLocal
  );
  const speakingStudentCameraTrack = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant?.identity === activeSpeaker
  );
  const speakingStudentScreenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && t.participant?.identity === activeSpeaker
  );

  const isLocalCameraActive = !!localCameraTrack?.publication?.track && !localCameraTrack?.publication?.isMuted;
  const isStudentCameraActive = !!speakingStudentCameraTrack?.publication?.track && !speakingStudentCameraTrack?.publication?.isMuted;

  // Auto-stop admin screen share if student starts screen sharing
  useEffect(() => {
    if (speakingStudentScreenTrack?.publication?.track && localScreenTrack?.publication?.track) {
      room?.localParticipant?.setScreenShareEnabled(false);
    }
  }, [speakingStudentScreenTrack?.publication?.track, localScreenTrack?.publication?.track, room]);

  const sendStateSync = () => {
    if (!room || room.state !== "connected" || !room.localParticipant) return;
    try {
      const payload = {
        action: "SYNC_STATE",
        activeSpeaker,
        raisedHands,
        blockedUsers,
      };
      const encoder = new TextEncoder();
      const encodedPayload = encoder.encode(JSON.stringify(payload));
      room.localParticipant.publishData(encodedPayload, {
        reliable: true,
        topic: "raise-hand-actions",
      });
    } catch (e) {
      console.warn("Failed to publish SYNC_STATE:", e);
    }
  };

  const acceptSpeaker = (studentUsername) => {
    // Revoke previous speaker
    if (activeSpeaker) {
      revokeSpeaker();
    }
    setActiveSpeaker(studentUsername);
    setRaisedHands((prev) => prev.filter((u) => u !== studentUsername));

    if (room && room.state === "connected" && room.localParticipant) {
      try {
        const payload = { action: "ACCEPT_SPEAKER", username: studentUsername };
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
          reliable: true,
          topic: "raise-hand-actions",
        });
      } catch (e) {
        console.error("Failed to publish ACCEPT_SPEAKER:", e);
      }
    }
  };

  const rejectHand = (studentUsername) => {
    setRaisedHands((prev) => prev.filter((u) => u !== studentUsername));
    if (room && room.state === "connected" && room.localParticipant) {
      try {
        const payload = { action: "DISMISS_HAND", username: studentUsername };
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
          reliable: true,
          topic: "raise-hand-actions",
        });
      } catch (e) {
        console.error("Failed to publish DISMISS_HAND:", e);
      }
    }
  };

  const revokeSpeaker = () => {
    if (!activeSpeaker) return;
    const oldSpeaker = activeSpeaker;
    setActiveSpeaker(null);
    setRaisedHands((prev) => prev.filter((u) => u !== oldSpeaker));

    if (room && room.state === "connected" && room.localParticipant) {
      try {
        const payload = { action: "REMOVE_SPEAKER", username: oldSpeaker };
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
          reliable: true,
          topic: "raise-hand-actions",
        });
      } catch (e) {
        console.error("Failed to publish REMOVE_SPEAKER:", e);
      }
    }
  };

  const clearAllHands = () => {
    setRaisedHands([]);
  };

  // Lower hand and end stage speak if a student gets blocked
  useEffect(() => {
    let changed = false;
    let newHands = [...raisedHands];
    let newSpeaker = activeSpeaker;

    blockedUsers.forEach((blockedUsername) => {
      if (newHands.includes(blockedUsername)) {
        newHands = newHands.filter((u) => u !== blockedUsername);
        changed = true;
      }
      if (newSpeaker === blockedUsername) {
        newSpeaker = null;
        changed = true;
        // Notify the room to remove this speaker
        if (room && room.state === "connected" && room.localParticipant) {
          try {
            const payload = { action: "REMOVE_SPEAKER", username: blockedUsername };
            const encoder = new TextEncoder();
            room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
              reliable: true,
              topic: "raise-hand-actions",
            });
          } catch (e) {
            console.error("Failed to publish REMOVE_SPEAKER on block:", e);
          }
        }
      }
    });

    if (changed) {
      setRaisedHands(newHands);
      setActiveSpeaker(newSpeaker);
    }
  }, [blockedUsers, activeSpeaker, raisedHands, room]);

  // Sync state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      sendStateSync();
    }, 3000);
    return () => clearInterval(interval);
  }, [room, activeSpeaker, raisedHands, blockedUsers]);

  // Handle incoming data (raise-hand-actions topic)
  useEffect(() => {
    if (!room) return;

    const handleData = (payload, participant, block, topic) => {
      const decoder = new TextDecoder();
      try {
        const data = JSON.parse(decoder.decode(payload));

        // ── Poll events ───────────────────────────────────────────
        if (data.action === "POLL_ANSWER") {
          setPollAnswers(prev => {
            const next = new Map(prev);
            next.set(data.username, { chosenIdx: data.chosenIdx, timeMs: data.timeMs });
            return next;
          });
          return;
        }

        // ── Hand raise / speaker events ───────────────────────────
        if (data.action === "RAISE_HAND") {
          if (blockedUsers.includes(data.username)) return;
          playRaiseHandSound();
          setRaisedHands((prev) => {
            if (prev.includes(data.username)) return prev;
            return [...prev, data.username];
          });
        } else if (data.action === "LOWER_HAND") {
          setRaisedHands((prev) => prev.filter((u) => u !== data.username));
        } else if (data.action === "REMOVE_SPEAKER") {
          setActiveSpeaker((curr) => curr === data.username ? null : curr);
          setRaisedHands((prev) => prev.filter((u) => u !== data.username));
        } else if (data.action === "REQUEST_SYNC") {
          sendStateSync();
        }
      } catch (e) {
        console.error("Error parsing room data:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, activeSpeaker, raisedHands, blockedUsers]);


  // Fetch leaderboard after each poll ends
  const fetchLeaderboard = async () => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/livekit/session/${session.id}/leaderboard`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setTotalPolls(data.totalPolls);
      }
    } catch (e) {
      console.warn("Failed to fetch leaderboard:", e);
    }
  };

  // Fetch per-question results overlay
  const fetchPollResults = async (pollId) => {
    if (!session?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/livekit/poll/${pollId}/results`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setPollResultData(data);
        setShowResultOverlay(true);
        // Auto-dismiss after 12s
        setTimeout(() => setShowResultOverlay(false), 12000);
      }
    } catch (e) {
      console.warn("Failed to fetch poll results:", e);
    }
  };

  const handlePollLaunched = (poll) => {
    setActivePoll(poll);
    setPollAnswers(new Map());
  };

  const handlePollEnded = async () => {
    if (!activePoll) return;
    const endedPollId = activePoll.id;
    setActivePoll(null);
    setPollAnswers(new Map());
    // Fetch results and leaderboard from DB (source of truth)
    await fetchPollResults(endedPollId);
    await fetchLeaderboard();
  };


  // Handle student disconnection
  useEffect(() => {
    if (!room) return;

    const handleParticipantDisconnected = (participant) => {
      const username = participant.identity;
      setRaisedHands((prev) => prev.filter((u) => u !== username));
      if (activeSpeaker === username) {
        setActiveSpeaker(null);
      }
    };

    room.on("participantDisconnected", handleParticipantDisconnected);
    return () => {
      room.off("participantDisconnected", handleParticipantDisconnected);
    };
  }, [room, activeSpeaker]);

  return (
    <div className="space-y-3 animate-fade-in h-full flex flex-col min-h-0 overflow-hidden">
      {/* Live indicator header */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-xs font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </div>
          <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            {session.title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <SessionTimer startTime={session.startedAt} />
          <ViewerCount />
        </div>
      </div>

      {/* Network Error Notification Banner */}
      {(isBrowserOffline || connectionState === "reconnecting" || connectionState === "disconnected") && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-pulse shrink-0">
          <AlertTriangle size={16} className="shrink-0" />
          <div className="flex-1">
            <p className="font-extrabold text-xs">
              {isBrowserOffline ? "Offline Mode: Internet Disconnected" : connectionState === "reconnecting" ? "Network Connection Dropped" : "Stream Disconnected"}
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">
              {isBrowserOffline 
                ? "Your internet connection is offline. Please check your network cables or Wi-Fi." 
                : connectionState === "reconnecting"
                ? "We lost connection to the server. Attempting to reconnect automatically, please wait..."
                : "You have been disconnected from the session. Please check your connection and reload the page."}
            </p>
          </div>
          {connectionState === "disconnected" && (
            <button 
              onClick={() => window.location.reload()}
              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] uppercase transition-all shadow-md shrink-0 cursor-pointer"
            >
              Reload Page
            </button>
          )}
        </div>
      )}

      {/* Center board | Right chat flex wrapper */}
      <div className="flex gap-4 flex-col xl:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Center — Live Classroom Board */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden order-1">
          {/* Video Preview Area */}
          <div className="relative rounded-[1.35rem] overflow-hidden border flex-1 min-h-0 bg-black shadow-[0_18px_55px_rgba(15,23,42,0.18)]"
            style={{ borderColor: "rgba(148, 163, 184, 0.22)" }}
          >
            {speakingStudentScreenTrack?.publication?.track ? (
              <VideoTrack
                trackRef={speakingStudentScreenTrack}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : localScreenTrack?.publication?.track ? (
              <VideoTrack
                trackRef={localScreenTrack}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
                    <Radio size={40} className="text-indigo-400 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                      Broadcasting Studio
                    </h3>
                    <p className="text-[11px] text-slate-500 max-w-[280px] leading-relaxed">
                      Use the controls below to stream video, audio, or present your screen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Draggable Local Camera Preview */}
            {isLocalCameraActive && (
              <DraggableVideo
                track={localCameraTrack}
                name="You (Mentor)"
                isLocal={true}
                defaultPosition={{ x: 20, y: 20 }}
              />
            )}

            {/* Draggable Speaking Student Preview */}
            {isStudentCameraActive && (
              <DraggableVideo
                track={speakingStudentCameraTrack}
                name={activeSpeaker}
                isLocal={false}
                alignLeft={true}
              />
            )}

            {/* Connection status indicator */}
            <div className="absolute top-4 left-4 z-40">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold ${
                isBrowserOffline || connectionState === "reconnecting"
                  ? "text-amber-400 animate-pulse"
                  : connectionState === "disconnected"
                  ? "text-red-400 animate-pulse"
                  : "text-emerald-400"
              }`}>
                {isBrowserOffline || connectionState === "reconnecting" ? (
                  <>
                    <WifiOff size={10} />
                    Reconnecting...
                  </>
                ) : connectionState === "disconnected" ? (
                  <>
                    <WifiOff size={10} />
                    Disconnected
                  </>
                ) : (
                  <>
                    <Wifi size={10} />
                    Connected
                  </>
                )}
              </div>
            </div>

            {/* Per-question results overlay after POLL_END */}
            {showResultOverlay && pollResultData && (
              <PollResultsOverlay
                pollData={pollResultData}
                currentUsername={user?.username}
                onClose={() => setShowResultOverlay(false)}
              />
            )}
          </div>

          {/* Broadcast Control Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-[1.35rem] border bg-slate-900/40 backdrop-blur-md shrink-0 shadow-lg"
            style={{ borderColor: "rgba(148, 163, 184, 0.16)" }}
          >
            <div className="flex items-center gap-1 flex-wrap">
              <TrackToggle
                source={Track.Source.Microphone}
                showIcon={true}
                className="px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer shadow-sm text-slate-200 hover:text-white bg-slate-800 border-slate-700/50 hover:bg-slate-750"
              >
                Mic
              </TrackToggle>
              <TrackToggle
                source={Track.Source.Camera}
                showIcon={true}
                className="px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer shadow-sm text-slate-200 hover:text-white bg-slate-800 border-slate-700/50 hover:bg-slate-750"
              >
                Camera
              </TrackToggle>
              {speakingStudentScreenTrack?.publication?.track ? (
                <button
                  disabled
                  className="px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all opacity-40 cursor-not-allowed text-slate-200 bg-slate-800 border-slate-700/50"
                  title="A student is currently sharing their screen"
                >
                  Share Screen
                </button>
              ) : (
                <TrackToggle
                  source={Track.Source.ScreenShare}
                  showIcon={true}
                  className="px-4 py-2.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer shadow-sm text-slate-200 hover:text-white bg-slate-800 border-slate-700/50 hover:bg-slate-750"
                >
                  Share Screen
                </TrackToggle>
              )}

              <div className="w-px h-8 bg-slate-500/20 mx-2" />

              {/* Poll Tab Toggle Button */}
              <button
                onClick={() => {
                  setActiveTab("polls");
                  setShowPollCreatorSignal((v) => !v);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 cursor-pointer shadow-sm ${
                  activeTab === "polls" || activePoll
                    ? "bg-indigo-600 border-transparent text-white animate-pulse"
                    : "bg-[var(--bg-primary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                }`}
                id="poll-tab-btn"
              >
                <BarChart2 size={14} />
                {activePoll ? "Active Poll" : "Create Poll"}
              </button>

              <div className="w-px h-8 bg-slate-500/20 mx-2" />

              <button
                onClick={onEndSession}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider transition-all hover:scale-105 shadow-lg shadow-red-500/20 cursor-pointer"
              >
                <StopCircle size={16} />
                End Session
              </button>
            </div>
          </div>
        </div>

        {/* Right — Live Chat */}
        <div className="xl:w-[320px] xl:min-w-[300px] xl:max-w-[360px] flex flex-col min-h-0 overflow-hidden shrink-0 order-2">
          <LiveChat
            persistent
            sessionId={session?.id}
            hostUsername={session?.host?.username || ""}
            isHost={true}
            blockedUsers={blockedUsers}
            setBlockedUsers={setBlockedUsers}
            className="flex-1 min-h-0"
            raisedHands={raisedHands}
            activeSpeaker={activeSpeaker}
            acceptSpeaker={acceptSpeaker}
            rejectHand={rejectHand}
            revokeSpeaker={revokeSpeaker}
            activePoll={activePoll}
            pollAnswers={pollAnswers}
            pollResultData={pollResultData}
            leaderboard={leaderboard}
            totalPolls={totalPolls}
            onPollLaunched={(poll) => {
              setActivePoll(poll);
              setPollAnswers(new Map());
            }}
            onPollEnded={handlePollEnded}
            authToken={authToken}
            controlledActiveTab={activeTab}
            onTabChange={setActiveTab}
            showPollCreatorExternal={showPollCreatorSignal}
          />
        </div>
      </div>

      {/* Play remote speaking student audio streams */}
      <RoomAudioRenderer />

      {/* Toast Notification for Hand Raises - Disabled to prevent annoying popups */}
    </div>
  );
}

// ─── Main Admin Live Page ────────────────────────────────────────────
export default function AdminLivePage() {
  const router = useRouter();
  const { user, token: authToken, API_BASE, activeSession, setActiveSession } = useAuth();
  const [livekitToken, setLivekitToken] = useState(null);
  const [session, setSession] = useState(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    thumbnailPreview: null,
    thumbnailUrl: "",
  });
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  const [pastSessions, setPastSessions] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true); // true until we've checked for active session

  const fetchPastSessions = async () => {
    try {
      setLoadingPast(true);
      const res = await fetch(`${API_BASE}/api/livekit/sessions`);
      const data = await res.json();
      if (data.success && data.sessions) {
        // Filter only ended/past sessions
        const ended = data.sessions.filter((s) => !s.isLive && s.endedAt);
        setPastSessions(ended);
      }
    } catch (err) {
      console.error("Failed to fetch past sessions:", err);
    } finally {
      setLoadingPast(false);
    }
  };

  const handleDeleteSession = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this past broadcast? This cannot be undone.");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/livekit/session/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPastSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.message || "Failed to delete session.");
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Error connecting to server to delete session.");
    }
  };

  useEffect(() => {
    if (!session) {
      fetchPastSessions();
    }
  }, [session]);

  // Check for existing live session on mount — works for any admin/mentor (no hostId restriction)
  useEffect(() => {
    async function checkActive() {
      setCheckingSession(true);
      try {
        const res = await fetch(`${API_BASE}/api/livekit/session/active`);
        const data = await res.json();
        if (data.success && data.session) {
          // Any active session — reconnect regardless of who started it
          setSession(data.session);
          setActiveSession(data.session);
          // fetchToken needs authToken — will be called once token is ready
          if (authToken) {
            fetchToken(data.session.roomName);
          }
        }
      } catch (e) {
        console.error("Failed to check active session:", e);
      } finally {
        setCheckingSession(false);
      }
    }
    checkActive();
  }, []); // Run once on mount — no user dependency needed

  // If authToken becomes available after session was already found, fetch the token
  useEffect(() => {
    if (authToken && session && !livekitToken) {
      fetchToken(session.roomName);
    }
  }, [authToken, session]);

  const fetchToken = async (roomName) => {
    try {
      const res = await fetch(`${API_BASE}/api/livekit/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      if (data.success) {
        setLivekitToken(data.token);
      }
    } catch (e) {
      console.error("Failed to fetch LiveKit token:", e);
    }
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 2MB (2 * 1024 * 1024 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("Thumbnail image exceeds the 2MB size limit. Please choose a smaller file.");
      e.target.value = ""; // Clear file input selection
      setFormState((prev) => ({
        ...prev,
        thumbnailPreview: null,
        thumbnailUrl: "",
      }));
      return;
    }

    setError(null);

    // Convert to base64 for storage (simple approach)
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({
        ...prev,
        thumbnailPreview: reader.result,
        thumbnailUrl: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleStartSession = async () => {
    if (!formState.title.trim()) {
      setError("Session title is required.");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/livekit/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: formState.title,
          description: formState.description,
          thumbnailUrl: formState.thumbnailUrl,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to start session.");
        setIsStarting(false);
        return;
      }

      setSession(data.session);
      setActiveSession(data.session);
      await fetchToken(data.session.roomName);
    } catch (e) {
      setError("Network error. Is the backend running?");
    } finally {
      setIsStarting(false);
    }
  };

  const endActiveSession = async () => {
    if (!session) return false;

    try {
      const res = await fetch(`${API_BASE}/api/livekit/session/${session.id}/end`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setSession(null);
        setActiveSession(null);
        setLivekitToken(null);
        setFormState({ title: "", description: "", thumbnailPreview: null, thumbnailUrl: "" });
        return true;
      }
    } catch (e) {
      console.error("Failed to end session:", e);
    }
    return false;
  };

  const handleEndSession = async () => {
    if (!session) return;

    const confirmed = window.confirm("Are you sure you want to end this live session?");
    if (!confirmed) return;

    await endActiveSession();
  };

  const handleBackToPortal = async () => {
    const confirmed = window.confirm(
      "Leaving will end the active live session for all students. Continue?"
    );
    if (!confirmed) return;

    const ended = await endActiveSession();
    if (ended) {
      router.push("/admin/dashboard");
    }
  };

  // ─── Checking for active session (loading state) ───────────────────
  if (checkingSession) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)", borderTopColor: "transparent" }} />
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Checking for active session...</p>
        </div>
      </div>
    );
  }

  // ─── Pre-Session Form (Setup) ──────────────────────────────────────
  if (!session || !livekitToken) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-badge)", color: "var(--text-accent)" }}>
              <Radio size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                Go Live
              </h1>
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Start a live session for your students
              </p>
            </div>
          </div>
        </div>

        {/* Setup Form */}
        <div className="rounded-2xl border p-6 space-y-6 shadow-xl"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
        >
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Session Title *
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. DSA Masterclass — Trees & Graphs"
              className="w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
              id="session-title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Description
            </label>
            <textarea
              value={formState.description}
              onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of what you'll cover..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 resize-none"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
              id="session-description-input"
            />
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Thumbnail Image
              </label>
              <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider select-none">
                16:9 Aspect Ratio • Max 2MB
              </span>
            </div>
            <div className="flex items-start gap-4">
              <label
                htmlFor="thumbnail-upload"
                className="flex flex-col items-center justify-center w-40 h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5 p-2 text-center"
                style={{ borderColor: "var(--border-primary)" }}
              >
                {formState.thumbnailPreview ? (
                  <img
                    src={formState.thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <ImagePlus size={20} className="mx-auto" style={{ color: "var(--text-muted)" }} />
                    <span className="text-[10px] font-bold block" style={{ color: "var(--text-muted)" }}>
                      Upload Image
                    </span>
                    <span className="text-[8px] font-medium block opacity-75" style={{ color: "var(--text-muted)" }}>
                      16:9 • Max 2MB
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  id="thumbnail-upload"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] leading-relaxed pt-1" style={{ color: "var(--text-muted)" }}>
                Optional thumbnail that students will see before joining. Recommended: 16:9 aspect ratio, max size: 2MB.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Go Live Button */}
          <button
            onClick={handleStartSession}
            disabled={isStarting || !formState.title.trim()}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white text-sm font-extrabold uppercase tracking-wider transition-all hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 8px 32px rgba(239, 68, 68, 0.3)",
            }}
            id="go-live-btn"
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting Session...
              </>
            ) : (
              <>
                <Radio size={18} />
                Go Live Now
              </>
            )}
          </button>
        </div>

        {/* LiveKit Status Info */}
        <div className="flex items-center gap-2 p-3 rounded-xl border text-[10px] font-semibold"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)", color: "var(--text-muted)" }}
        >
          <Sparkles size={12} style={{ color: "var(--text-accent)" }} />
          Powered by LiveKit — Students will see your camera, microphone, and screen share in real-time.
        </div>

        {/* Past Broadcasts List */}
        <div className="space-y-4 pt-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
              Past Broadcasts
            </h2>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Manage and delete your previously ended live sessions
            </p>
          </div>

          {loadingPast ? (
            <div className="flex items-center justify-center p-6 border border-dashed rounded-2xl"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-accent)" }} />
            </div>
          ) : pastSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-2xl text-center space-y-2"
              style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-card)" }}
            >
              <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>No past broadcasts found</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Your ended broadcasts will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pastSessions.map((past) => (
                <div
                  key={past.id}
                  className="flex items-center justify-between p-4 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {past.thumbnailUrl ? (
                      <img
                        src={past.thumbnailUrl}
                        alt=""
                        className="w-14 h-9 rounded-lg object-cover bg-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border"
                        style={{ borderColor: "var(--border-primary)" }}
                      >
                        <Radio size={14} style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-black truncate" style={{ color: "var(--text-primary)" }}>
                        {past.title}
                      </h4>
                      <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                        Started {new Date(past.startedAt).toLocaleString()} • Duration: {
                          past.endedAt 
                            ? `${Math.round((new Date(past.endedAt) - new Date(past.startedAt)) / 60000)} mins`
                            : "Unknown"
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSession(past.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 text-[10px] font-bold uppercase tracking-wider cursor-pointer shrink-0"
                    title="Delete past broadcast"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Active Session (Broadcasting) ─────────────────────────────────
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <button
        type="button"
        onClick={handleBackToPortal}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-lg border text-xs font-bold leading-none transition-all hover:scale-[1.02] cursor-pointer shrink-0 w-fit"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-primary)",
          color: "var(--text-primary)",
        }}
      >
        <ArrowLeft size={14} />
        Back to Admin Portal
      </button>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {LIVEKIT_URL ? (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={livekitToken}
          connect={true}
          video={true}
          audio={true}
          style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}
        >
          <BroadcastPanel session={session} onEndSession={handleEndSession} authToken={authToken} />
        </LiveKitRoom>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border text-center space-y-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-primary)" }}
        >
          <WifiOff size={48} className="opacity-30" style={{ color: "var(--text-muted)" }} />
          <div className="space-y-1">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>LiveKit Not Configured</h3>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Set the <code className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">NEXT_PUBLIC_LIVEKIT_URL</code> environment variable to connect.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
