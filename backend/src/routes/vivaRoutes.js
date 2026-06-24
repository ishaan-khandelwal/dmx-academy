const express = require('express');
const {
  getSubjects,
  startSession,
  submitQuestionAnswer,
  completeSession,
  getSession,
  getHistory
} = require('../controllers/vivaController');

const {
  listQuestions,
  listSubjects,
  listTopics,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion
} = require('../controllers/questionBankController');

const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Public / student-accessible ─────────────────────────────────────
// Get list of available subjects (for lobby dropdown)
router.get('/subjects', getSubjects);

// Question bank read — accessible to all authenticated users
router.get('/questions/subjects', protect, listSubjects);
router.get('/questions/topics', protect, listTopics);
router.get('/questions', protect, listQuestions);
router.get('/questions/:id', protect, getQuestion);

// ── Mentor/Admin only — question bank write ──────────────────────────
router.post('/questions', protect, restrictTo('ADMIN', 'MENTOR'), createQuestion);
router.put('/questions/:id', protect, restrictTo('ADMIN', 'MENTOR'), updateQuestion);
router.delete('/questions/:id', protect, restrictTo('ADMIN', 'MENTOR'), deleteQuestion);

// ── Session routes (all protected) ───────────────────────────────────
router.use(protect);

router.get('/history', getHistory);
router.get('/history/:sessionId', getSession);
router.post('/session/start', startSession);
router.post('/session/answer', submitQuestionAnswer);
router.post('/session/complete', completeSession);

module.exports = router;
