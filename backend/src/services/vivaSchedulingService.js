const prisma = require('../prisma');

const createViva = async ({ title, subject, description, startTime, endTime, questionIds, creatorId, instituteId }) => {
  if (!title?.trim()) throw new Error('Title is required.');
  if (!subject?.trim()) throw new Error('Subject is required.');
  if (!startTime) throw new Error('Start time is required.');
  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    throw new Error('At least one question must be selected.');
  }

  return prisma.viva.create({
    data: {
      title: title.trim(),
      subject: subject.trim(),
      description: description?.trim() || null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      creatorId,
      instituteId,
      questions: {
        connect: questionIds.map(id => ({ id: parseInt(id) }))
      }
    },
    include: {
      questions: true
    }
  });
};

const getScheduledVivas = async (instituteId) => {
  if (!instituteId) return [];
  return prisma.viva.findMany({
    where: { instituteId },
    include: {
      questions: true,
      creator: {
        select: { username: true }
      }
    },
    orderBy: { startTime: 'asc' }
  });
};

const getVivaDetails = async (id, instituteId) => {
  const viva = await prisma.viva.findUnique({
    where: { id },
    include: {
      questions: true,
      creator: {
        select: { username: true }
      }
    }
  });
  if (!viva) throw new Error('Viva not found.');
  if (viva.instituteId !== instituteId) {
    throw new Error('Unauthorized to access this Viva.');
  }
  return viva;
};

module.exports = {
  createViva,
  getScheduledVivas,
  getVivaDetails
};
