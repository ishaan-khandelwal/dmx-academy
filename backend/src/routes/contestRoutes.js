const express = require('express');
const {
  createContest,
  addProblemToContest,
  getAllContests,
  getContestDetails,
  getContestLeaderboard,
  participateInContest,
  finishContestAttempt,
  getContestParticipation,
  getContestParticipants,
} = require('../controllers/contestController');
const { protect, restrictTo, fetchUserIfExists } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes with optional user identification
router.get('/', fetchUserIfExists, getAllContests);
router.get('/:id', fetchUserIfExists, getContestDetails);
router.get('/:id/leaderboard', getContestLeaderboard);

// User contest attempt routes
router.post('/:id/participate', protect, participateInContest);
router.post('/:id/finish', protect, finishContestAttempt);
router.get('/:id/participation', protect, getContestParticipation);

// Admin/Mentor routes
router.post('/', protect, restrictTo('ADMIN', 'MENTOR'), createContest);
router.post('/:id/problem', protect, restrictTo('ADMIN', 'MENTOR'), addProblemToContest);
router.get('/:id/participants', protect, restrictTo('ADMIN', 'MENTOR'), getContestParticipants);

module.exports = router;

