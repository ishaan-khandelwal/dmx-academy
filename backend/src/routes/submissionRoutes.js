const express = require('express');
const {
  submitSolution,
  submitSolutionDirect,
  getAllSubmissions,
  getSingleSubmission,
  runCode,
} = require('../controllers/submissionController');
const { protect } = require('../middleware/authMiddleware');
const { submissionLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Publicly view submissions
router.get('/', getAllSubmissions);
router.get('/:id', getSingleSubmission);

// Submit code directly (accepts code, language, problemId in body)
router.post('/', protect, submissionLimiter, submitSolutionDirect);

// Run code with custom input in real-time (protected)
router.post('/run', protect, runCode);

// Submit code for a specific problem (protected and rate-limited)
router.post('/problem/:problemId', protect, submissionLimiter, submitSolution);

module.exports = router;
