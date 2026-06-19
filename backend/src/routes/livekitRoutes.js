const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  createSession,
  generateToken,
  getActiveSession,
  getAllSessions,
  endSession,
} = require('../controllers/livekitController');

// ─── Public Routes ──────────────────────────────────────────────────
router.get('/session/active', getActiveSession);    // Anyone can check if a session is live
router.get('/sessions', getAllSessions);             // Anyone can see past sessions

// ─── Protected Routes ───────────────────────────────────────────────
router.post('/token', protect, generateToken);      // Any logged-in user can request a token

// ─── Admin/Mentor Only ──────────────────────────────────────────────
router.post('/session', protect, restrictTo('ADMIN', 'MENTOR'), createSession);
router.patch('/session/:id/end', protect, restrictTo('ADMIN', 'MENTOR'), endSession);

module.exports = router;
