const prisma = require('../prisma');
const { problemSchema, problemUpdateSchema } = require('../utils/validators');

/**
 * Helper to slugify title
 */
const slugify = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Collapse whitespace and replace by -
    .replace(/-+/g, '-'); // Collapse dashes
};

/**
 * Create a new problem (Admin only)
 */
const createProblem = async (req, res, next) => {
  try {
    const validatedData = problemSchema.parse(req.body);
    const { title, difficulty, statement, inputFormat, outputFormat, constraints, explanation, testCases } = validatedData;

    // Generate unique slug
    let slug = slugify(title);
    const existingProblem = await prisma.problem.findUnique({ where: { slug } });
    if (existingProblem) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create problem along with testcases in a transaction
    const problem = await prisma.problem.create({
      data: {
        title,
        slug,
        difficulty,
        statement,
        inputFormat,
        outputFormat,
        constraints,
        explanation,
        testCases: {
          create: testCases,
        },
      },
      include: {
        testCases: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Problem created successfully.',
      problem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a problem (Admin only)
 */
const updateProblem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const problemId = parseInt(id);

    if (isNaN(problemId)) {
      return res.status(400).json({ success: false, message: 'Invalid problem ID format.' });
    }

    const validatedData = problemUpdateSchema.parse(req.body);
    const { title, difficulty, statement, inputFormat, outputFormat, constraints, explanation, testCases } = validatedData;

    // Find the problem first
    const problemExists = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problemExists) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = slugify(title);
      // Ensure slug is unique if it changed
      if (updateData.slug !== problemExists.slug) {
        const slugExists = await prisma.problem.findUnique({ where: { slug: updateData.slug } });
        if (slugExists) {
          updateData.slug = `${updateData.slug}-${Date.now()}`;
        }
      }
    }
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (statement !== undefined) updateData.statement = statement;
    if (inputFormat !== undefined) updateData.inputFormat = inputFormat;
    if (outputFormat !== undefined) updateData.outputFormat = outputFormat;
    if (constraints !== undefined) updateData.constraints = constraints;
    if (explanation !== undefined) updateData.explanation = explanation;

    // Perform update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If test cases are provided, delete existing and create new ones
      if (testCases !== undefined) {
        await tx.testCase.deleteMany({
          where: { problemId },
        });

        updateData.testCases = {
          create: testCases,
        };
      }

      return await tx.problem.update({
        where: { id: problemId },
        data: updateData,
        include: { testCases: true },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Problem updated successfully.',
      problem: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a problem (Admin only)
 */
const deleteProblem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const problemId = parseInt(id);

    if (isNaN(problemId)) {
      return res.status(400).json({ success: false, message: 'Invalid problem ID format.' });
    }

    const problemExists = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problemExists) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }

    // Delete problem (testcases will delete cascade due to schema mapping)
    await prisma.problem.delete({
      where: { id: problemId },
    });

    res.status(200).json({
      success: true,
      message: 'Problem deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all problems (Public)
 */
const getAllProblems = async (req, res, next) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: problems.length,
      problems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single problem by slug (Public/Admin)
 * Filters testcases to show only sample cases for non-admins to prevent cheating.
 */
const getSingleProblem = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        testCases: true,
      },
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.',
      });
    }

    // Filter test cases based on user permission (if admin, show all, otherwise only samples)
    const isAdmin = req.user && req.user.role === 'ADMIN';
    if (!isAdmin) {
      const isContestProblem = await prisma.contestProblem.findFirst({
        where: { problemId: problem.id }
      });
      if (isContestProblem) {
        problem.testCases = problem.testCases.map(tc => {
          const plainTc = { ...tc };
          if (!plainTc.isSample) {
            plainTc.expectedOutput = '';
          }
          return plainTc;
        });
      } else {
        problem.testCases = problem.testCases.filter((tc) => tc.isSample);
      }
    }

    res.status(200).json({
      success: true,
      problem,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProblem,
  updateProblem,
  deleteProblem,
  getAllProblems,
  getSingleProblem,
};
