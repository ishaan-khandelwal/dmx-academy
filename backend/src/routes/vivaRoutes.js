const express = require('express');
const {
  getSubjects,
  startSession,
  submitQuestionAnswer,
  completeSession,
  getSession,
  getHistory
} = require('../controllers/vivaController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get list of available subjects
router.get('/subjects', getSubjects);

// All session routes must be protected
router.use(protect);

// GET /api/viva/history
router.get('/history', getHistory);

// GET /api/viva/history/:sessionId
router.get('/history/:sessionId', getSession);

// POST /api/viva/session/start
router.post('/session/start', startSession);

// POST /api/viva/session/answer
router.post('/session/answer', submitQuestionAnswer);

// POST /api/viva/session/complete
router.post('/session/complete', completeSession);

module.exports = router;
