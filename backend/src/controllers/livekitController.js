const prisma = require('../prisma');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const getHttpLivekitUrl = (url) => {
  if (!url) return '';
  return url.replace(/^wss?:\/\//, (match) => match === 'wss://' ? 'https://' : 'http://');
};

/**
 * @desc    Create a new live session (Admin/Mentor only)
 * @route   POST /api/livekit/session
 * @access  Protected (ADMIN, MENTOR)
 */
const createSession = async (req, res) => {
  try {
    const { title, description, thumbnailUrl, scheduledAt } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session title is required.',
      });
    }

    // Check if there's already an active live session
    const existingLive = await prisma.liveSession.findFirst({
      where: { isLive: true },
    });

    if (existingLive) {
      return res.status(409).json({
        success: false,
        message: 'Another session is already live. End it before starting a new one.',
        activeSession: existingLive,
      });
    }

    // Generate a unique room name
    const roomName = `dmx-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const session = await prisma.liveSession.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        thumbnailUrl: thumbnailUrl || null,
        roomName,
        hostId: req.user.id,
        isLive: true,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        startedAt: new Date(),
      },
      include: {
        host: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Live session started successfully.',
      session,
    });
  } catch (error) {
    console.error('Error creating live session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create live session.',
    });
  }
};

/**
 * @desc    Generate a LiveKit access token for joining a room
 * @route   POST /api/livekit/token
 * @access  Protected (any authenticated user)
 */
const generateToken = async (req, res) => {
  try {
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'Room name is required.',
      });
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'LiveKit credentials are not configured on the server.',
      });
    }

    // Determine permissions based on user role
    const isHost = req.user.role === 'ADMIN' || req.user.role === 'MENTOR';

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: req.user.username,
      name: req.user.username,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,           // Allow everyone to publish (needed for student raise hand and speak feature)
      canSubscribe: true,         // Everyone can watch
      canPublishData: true,       // Data channels for future chat feature
    });

    const token = await at.toJwt();

    return res.status(200).json({
      success: true,
      token,
      isHost,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate access token.',
    });
  }
};

/**
 * @desc    Get the currently active live session (if any)
 * @route   GET /api/livekit/session/active
 * @access  Public
 */
const getActiveSession = async (req, res) => {
  try {
    const session = await prisma.liveSession.findFirst({
      where: { isLive: true },
      include: {
        host: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      session: session || null,
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active session.',
    });
  }
};

/**
 * @desc    Get all sessions (for homepage past sessions and admin dashboard)
 * @route   GET /api/livekit/sessions
 * @access  Public
 */
const getAllSessions = async (req, res) => {
  try {
    const sessions = await prisma.liveSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        host: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions.',
    });
  }
};

/**
 * @desc    End a live session
 * @route   PATCH /api/livekit/session/:id/end
 * @access  Protected (ADMIN, MENTOR — session host only)
 */
const endSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID.',
      });
    }

    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      });
    }

    if (!session.isLive) {
      return res.status(400).json({
        success: false,
        message: 'This session has already ended.',
      });
    }

    // Only the host or an admin can end a session
    if (session.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to end this session.',
      });
    }

    const updatedSession = await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
      include: {
        host: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    // Delete all chat messages associated with this session after it has ended
    try {
      await prisma.liveChatMessage.deleteMany({
        where: { sessionId: sessionId },
      });
      console.log(`Successfully deleted chat messages for ended session ID: ${sessionId}`);
    } catch (dbErr) {
      console.error('Failed to clean up session chat messages:', dbErr);
    }

    // Close the LiveKit room if we have the service client configured
    if (LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
      try {
        const httpUrl = getHttpLivekitUrl(LIVEKIT_URL);
        const svc = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        await svc.deleteRoom(session.roomName);
        console.log(`Successfully deleted LiveKit room: ${session.roomName}`);
      } catch (lkErr) {
        console.error('Failed to close LiveKit room:', lkErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Session ended successfully.',
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to end session.',
    });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = parseInt(id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID.',
      });
    }

    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      });
    }

    // Only the host or an admin can delete a session
    if (session.hostId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this session.',
      });
    }

    await prisma.liveSession.delete({
      where: { id: sessionId },
    });

    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete session.',
    });
  }
};

/**
 * @desc    Get all chat messages for a live session
 * @route   GET /api/livekit/session/:id/chat
 * @access  Protected
 */
const getSessionChat = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session ID.' });
    }

    const messages = await prisma.liveChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error fetching session chat messages:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

/**
 * @desc    Post a new chat message for a live session
 * @route   POST /api/livekit/session/:id/chat
 * @access  Protected
 */
const postChatMessage = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { messageText } = req.body;

    if (isNaN(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session ID.' });
    }
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    // Verify session exists and is live
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || !session.isLive) {
      return res.status(400).json({ success: false, message: 'Session is not active.' });
    }

    const message = await prisma.liveChatMessage.create({
      data: {
        sessionId,
        senderUsername: req.user.username,
        messageText: messageText.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return res.status(500).json({ success: false, message: 'Failed to save message.' });
  }
};

// ─── Background Active Session Host Absence Monitor ──────────────────
let hostLastSeenMap = {};

const startLiveSessionMonitor = () => {
  console.log('[MONITOR] Starting Active Live Session Monitor (15s interval)...');
  setInterval(async () => {
    try {
      const activeSession = await prisma.liveSession.findFirst({
        where: { isLive: true },
        include: {
          host: { select: { username: true } }
        }
      });
      
      if (!activeSession) {
        hostLastSeenMap = {};
        return;
      }

      if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return;
      }

      const httpUrl = getHttpLivekitUrl(LIVEKIT_URL);
      const svc = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
      
      let participants = [];
      try {
        participants = await svc.listParticipants(activeSession.roomName);
      } catch (lkErr) {
        participants = [];
      }

      const hostUsername = activeSession.host.username;
      const isHostPresent = participants.some(p => p.identity === hostUsername);

      if (isHostPresent) {
        if (hostLastSeenMap[activeSession.id]) {
          console.log(`[MONITOR] Host "${hostUsername}" returned to room "${activeSession.roomName}". Clearing countdown.`);
          delete hostLastSeenMap[activeSession.id];
        }
      } else {
        if (!hostLastSeenMap[activeSession.id]) {
          hostLastSeenMap[activeSession.id] = Date.now();
          console.log(`[MONITOR] Host "${hostUsername}" is absent from room "${activeSession.roomName}". Starting 15-minute auto-end countdown.`);
        } else {
          const absentDuration = Date.now() - hostLastSeenMap[activeSession.id];
          const fifteenMinutes = 15 * 60 * 1000;
          if (absentDuration >= fifteenMinutes) {
            console.log(`[MONITOR] Host "${hostUsername}" absent for 15+ minutes. Automatically ending session ID: ${activeSession.id}`);
            
            await prisma.liveSession.update({
              where: { id: activeSession.id },
              data: {
                isLive: false,
                endedAt: new Date()
              }
            });

            try {
              await prisma.liveChatMessage.deleteMany({
                where: { sessionId: activeSession.id }
              });
            } catch (dbErr) {
              console.error('[MONITOR] Failed to clean up session chats during auto-end:', dbErr);
            }

            try {
              await svc.deleteRoom(activeSession.roomName);
            } catch (lkErr) {
              console.error('[MONITOR] Failed to delete LiveKit room during auto-end:', lkErr);
            }

            delete hostLastSeenMap[activeSession.id];
          }
        }
      }
    } catch (err) {
      console.error('[MONITOR] Error in active session monitor:', err);
    }
  }, 15000);
};

startLiveSessionMonitor();

module.exports = {
  createSession,
  generateToken,
  getActiveSession,
  getAllSessions,
  endSession,
  deleteSession,
  getSessionChat,
  postChatMessage,
};
