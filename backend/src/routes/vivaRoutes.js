const express = require('express');
const path = require('path');
const multer = require('multer');

const {
  getSubjects, startSession, submitQuestionAnswer,
  completeSession, getSession, getHistory
} = require('../controllers/vivaController');

const {
  listQuestions, listSubjects, listTopics,
  getQuestion, createQuestion, updateQuestion, deleteQuestion
} = require('../controllers/questionBankController');

const {
  list: listMaterials, get: getMaterial, upload: uploadMaterial,
  retry: retryExtraction, generate: generateQuestions,
  saveQuestions, remove: deleteMaterial
} = require('../controllers/studyMaterialController');

const { protect, restrictTo } = require('../middleware/authMiddleware');
const { UPLOADS_DIR } = require('../services/studyMaterialService');

// ── Multer: PDF uploads ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed.'), false);
};
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const router = express.Router();

// ── Public ───────────────────────────────────────────────────────────
router.get('/subjects', getSubjects);

// ── Question Bank (read: all authenticated) ──────────────────────────
router.get('/questions/subjects', protect, listSubjects);
router.get('/questions/topics',   protect, listTopics);
router.get('/questions',          protect, listQuestions);
router.get('/questions/:id',      protect, getQuestion);

// ── Question Bank (write: mentor/admin only) ─────────────────────────
router.post(  '/questions',      protect, restrictTo('ADMIN', 'MENTOR'), createQuestion);
router.put(   '/questions/:id',  protect, restrictTo('ADMIN', 'MENTOR'), updateQuestion);
router.delete('/questions/:id',  protect, restrictTo('ADMIN', 'MENTOR'), deleteQuestion);

// ── Study Materials (mentor/admin only) ──────────────────────────────
// save-questions must come BEFORE /:id routes to avoid param collision
router.post('/materials/save-questions', protect, restrictTo('ADMIN', 'MENTOR'), saveQuestions);

router.get(   '/materials',          protect, restrictTo('ADMIN', 'MENTOR'), listMaterials);
router.post(  '/materials',          protect, restrictTo('ADMIN', 'MENTOR'), uploadMiddleware.single('file'), uploadMaterial);
router.get(   '/materials/:id',      protect, restrictTo('ADMIN', 'MENTOR'), getMaterial);
router.delete('/materials/:id',      protect, restrictTo('ADMIN', 'MENTOR'), deleteMaterial);
router.post(  '/materials/:id/retry',    protect, restrictTo('ADMIN', 'MENTOR'), retryExtraction);
router.post(  '/materials/:id/generate', protect, restrictTo('ADMIN', 'MENTOR'), generateQuestions);

// ── Session routes (all protected) ───────────────────────────────────
router.use(protect);
router.get( '/history',              getHistory);
router.get( '/history/:sessionId',   getSession);
router.post('/session/start',        startSession);
router.post('/session/answer',       submitQuestionAnswer);
router.post('/session/complete',     completeSession);

module.exports = router;
