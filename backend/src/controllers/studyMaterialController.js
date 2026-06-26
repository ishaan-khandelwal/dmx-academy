const svc = require('../services/studyMaterialService');

/** GET /api/viva/materials */
const list = async (req, res, next) => {
  try {
    const materials = await svc.listMaterials();
    res.json({ success: true, count: materials.length, materials });
  } catch (err) { next(err); }
};

/** GET /api/viva/materials/:id */
const get = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const material = await svc.getMaterial(id);
    res.json({ success: true, material });
  } catch (err) {
    if (err.message === 'Study material not found.') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
};

/** POST /api/viva/materials  (multipart/form-data: file + title + subject) */
const upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    const { title, subject } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!subject?.trim()) return res.status(400).json({ success: false, message: 'Subject is required.' });

    const material = await svc.createMaterial({
      title,
      subject,
      fileName: req.file.originalname,
      filePath: req.file.path,
      uploadedById: req.user.id
    });
    res.status(201).json({ success: true, material });
  } catch (err) {
    if (err.message && !err.code) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
};

/** POST /api/viva/materials/:id/retry */
const retry = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const material = await svc.retryExtraction(id);
    res.json({ success: true, material });
  } catch (err) {
    if (err.message && !err.code) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
};

/** POST /api/viva/materials/:id/generate */
const generate = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const count = Math.min(parseInt(req.body.count) || 10, 30);
    const questions = await svc.generateFromMaterial(id, count);
    res.json({ success: true, count: questions.length, questions });
  } catch (err) {
    if (err.message && !err.code) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
};

/** POST /api/viva/materials/save-questions */
const saveQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'questions array is required.' });
    }
    const saved = await svc.saveQuestionsToBank(questions);
    res.json({ success: true, saved: saved.length, questions: saved });
  } catch (err) {
    if (err.message && !err.code) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
};

/** DELETE /api/viva/materials/:id */
const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    const result = await svc.deleteMaterial(id);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message && !err.code) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
};

module.exports = { list, get, upload, retry, generate, saveQuestions, remove };
