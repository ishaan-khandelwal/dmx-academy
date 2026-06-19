const prisma = require('../prisma');
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

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
      canPublish: isHost,         // Only hosts can publish video/audio/screen
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

module.exports = {
  createSession,
  generateToken,
  getActiveSession,
  getAllSessions,
  endSession,
};
