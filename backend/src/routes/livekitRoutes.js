const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  createSession,
  generateToken,
  getActiveSession,
  getAllSessions,
  endSession,
  deleteSession,
  getSessionChat,
  postChatMessage,
  createPoll,
  savePollAnswer,
  getSessionLeaderboard,
  getPollResults,
} = require('../controllers/livekitController');

// ─── Public Routes ──────────────────────────────────────────────────
router.get('/session/active', getActiveSession);    // Anyone can check if a session is live
router.get('/sessions', getAllSessions);             // Anyone can see past sessions

// ─── Protected Routes ───────────────────────────────────────────────
router.post('/token', protect, generateToken);      // Any logged-in user can request a token
router.get('/session/:id/chat', protect, getSessionChat);               // Get chat history for a session
router.post('/session/:id/chat', protect, postChatMessage);             // Post a new chat message
router.get('/session/:id/leaderboard', protect, getSessionLeaderboard); // Get cumulative leaderboard
router.post('/poll/:pollId/answer', protect, savePollAnswer);           // Student submits an answer
router.get('/poll/:pollId/results', protect, getPollResults);           // Per-question results after poll ends

// ─── Admin/Mentor Only ──────────────────────────────────────────────
router.post('/session', protect, restrictTo('ADMIN', 'MENTOR'), createSession);
router.patch('/session/:id/end', protect, restrictTo('ADMIN', 'MENTOR'), endSession);
router.delete('/session/:id', protect, restrictTo('ADMIN', 'MENTOR'), deleteSession);
router.post('/session/:id/poll', protect, restrictTo('ADMIN', 'MENTOR'), createPoll); // Launch a poll

module.exports = router;
