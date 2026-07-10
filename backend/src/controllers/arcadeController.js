const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Helper to seed on startup
const seedDefaultQuestionsIfNeeded = async () => {
  try {
    const count = await prisma.arcadeQuestion.count();
    if (count > 0) {
      return; // Already has questions
    }

    console.log("Database ArcadeQuestion table is empty. Seeding default questions...");

    // 1. Seed quizzes and match pairs from learning-arcade-content.json
    let content = null;
    const jsonPath = path.join(__dirname, '../../../../frontend/src/data/learning-arcade-content.json');
    if (fs.existsSync(jsonPath)) {
      content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    if (content) {
      if (Array.isArray(content.quiz)) {
        for (const q of content.quiz) {
          await prisma.arcadeQuestion.create({
            data: {
              type: "quiz",
              track: q.track,
              question: q.question,
              code: q.code || "",
              optionA: q.option_a || "",
              optionB: q.option_b || "",
              optionC: q.option_c || "",
              optionD: q.option_d || "",
              correctOption: q.correct_option,
              explanation: q.explanation || "",
              timeLimit: q.time_limit || 20,
              instituteId: null
            }
          });
        }
      }

      if (Array.isArray(content.match)) {
        for (const m of content.match) {
          await prisma.arcadeQuestion.create({
            data: {
              type: "match",
              track: m.track,
              term: m.term,
              definition: m.definition,
              instituteId: null
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Error seeding default arcade questions:", err);
  }
};

const getQuestions = async (req, res) => {
  try {
    const { type } = req.query || req.params;
    const filterType = type || req.query.type;

    let whereClause = {};
    if (filterType) {
      whereClause.type = filterType;
    }

    // Scoping to user's institute + global
    if (req.user && req.user.role !== 'ADMIN') {
      whereClause.OR = [
        { instituteId: req.user.instituteId },
        { instituteId: null }
      ];
    }

    const questions = await prisma.arcadeQuestion.findMany({
      where: whereClause,
      orderBy: { id: 'asc' }
    });

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const data = req.body;

    let targetInstituteId = null;
    if (req.user.role === 'INSTITUTE_ADMIN') {
      targetInstituteId = req.user.instituteId;
    } else if (req.user.role === 'ADMIN') {
      targetInstituteId = data.instituteId ? Number(data.instituteId) : null;
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role for question creation." });
    }

    const newQuestion = await prisma.arcadeQuestion.create({
      data: {
        type: data.type,
        track: data.track || "",
        title: data.title || "",
        level: Number(data.level) || 1,
        question: data.question || "",
        code: data.code || "",
        optionA: data.optionA || "",
        optionB: data.optionB || "",
        optionC: data.optionC || "",
        optionD: data.optionD || "",
        correctOption: data.correctOption || "",
        explanation: data.explanation || "",
        timeLimit: Number(data.timeLimit) || 20,
        term: data.term || "",
        definition: data.definition || "",
        blank: data.blank || "____",
        hint: data.hint || "",
        file: data.file || "",
        instructions: data.instructions || "",
        defaultCode: data.defaultCode || "",
        validateCode: data.validateCode || "",
        buggyLines: data.buggyLines || null,
        blanks: data.blanks || null,
        instituteId: targetInstituteId
      }
    });

    res.status(201).json({ success: true, data: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const questionId = Number(id);
    const existing = await prisma.arcadeQuestion.findUnique({
      where: { id: questionId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const userRole = req.user.role;
    const userInstituteId = req.user.instituteId ? Number(req.user.instituteId) : null;
    const questionInstituteId = existing.instituteId ? Number(existing.instituteId) : null;

    if (userRole !== 'ADMIN') {
      if (userRole !== 'INSTITUTE_ADMIN') {
        return res.status(403).json({ success: false, message: "Only admins can update questions." });
      }
      if (questionInstituteId === null) {
        return res.status(403).json({ success: false, message: "You cannot edit global (built-in) questions. Create a new question instead." });
      }
      if (questionInstituteId !== userInstituteId) {
        return res.status(403).json({ success: false, message: "You can only edit questions belonging to your institute." });
      }
    }

    const updated = await prisma.arcadeQuestion.update({
      where: { id: questionId },
      data: {
        track: data.track !== undefined ? data.track : existing.track,
        title: data.title !== undefined ? data.title : existing.title,
        level: data.level !== undefined ? Number(data.level) : existing.level,
        question: data.question !== undefined ? data.question : existing.question,
        code: data.code !== undefined ? data.code : existing.code,
        optionA: data.optionA !== undefined ? data.optionA : existing.optionA,
        optionB: data.optionB !== undefined ? data.optionB : existing.optionB,
        optionC: data.optionC !== undefined ? data.optionC : existing.optionC,
        optionD: data.optionD !== undefined ? data.optionD : existing.optionD,
        correctOption: data.correctOption !== undefined ? data.correctOption : existing.correctOption,
        explanation: data.explanation !== undefined ? data.explanation : existing.explanation,
        timeLimit: data.timeLimit !== undefined ? Number(data.timeLimit) : existing.timeLimit,
        term: data.term !== undefined ? data.term : existing.term,
        definition: data.definition !== undefined ? data.definition : existing.definition,
        blank: data.blank !== undefined ? data.blank : existing.blank,
        hint: data.hint !== undefined ? data.hint : existing.hint,
        file: data.file !== undefined ? data.file : existing.file,
        instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
        defaultCode: data.defaultCode !== undefined ? data.defaultCode : existing.defaultCode,
        validateCode: data.validateCode !== undefined ? data.validateCode : existing.validateCode,
        buggyLines: data.buggyLines !== undefined ? data.buggyLines : existing.buggyLines,
        blanks: data.blanks !== undefined ? data.blanks : existing.blanks
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const questionId = Number(id);

    const existing = await prisma.arcadeQuestion.findUnique({
      where: { id: questionId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const userRole = req.user.role;
    const userInstituteId = req.user.instituteId ? Number(req.user.instituteId) : null;
    const questionInstituteId = existing.instituteId ? Number(existing.instituteId) : null;

    if (userRole !== 'ADMIN') {
      if (userRole !== 'INSTITUTE_ADMIN') {
        return res.status(403).json({ success: false, message: "Only admins can delete questions." });
      }
      if (questionInstituteId === null) {
        return res.status(403).json({ success: false, message: "Built-in questions cannot be deleted. You can only delete questions you created for your institute." });
      }
      if (questionInstituteId !== userInstituteId) {
        return res.status(403).json({ success: false, message: "You can only delete questions belonging to your institute." });
      }
    }

    await prisma.arcadeQuestion.delete({
      where: { id: questionId }
    });

    res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  seedDefaultQuestionsIfNeeded
};
