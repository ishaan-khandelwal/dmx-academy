/**
 * evaluation.service.js
 *
 * AI-powered answer evaluation with RAG context injection.
 * Falls back to rule-based scoring if Ollama is unavailable.
 *
 * RAG flow:
 *   StudyMaterial.extractedText (for the question's subject)
 *     → truncated to context window
 *     → injected into evaluation prompt
 *     → LLM evaluates answer relative to the source material
 */

const { generateJSON, OllamaUnavailableError } = require('./llm.service');

// ── RAG: fetch study material context ────────────────────────────────
let prisma;
const getPrisma = () => { if (!prisma) prisma = require('../../prisma'); return prisma; };

/**
 * Retrieve the most recent COMPLETED study material text for a subject.
 * Returns a truncated excerpt (max ~2000 chars) to stay within context.
 */
async function getStudyContext(subject) {
  try {
    const db = getPrisma();
    const material = await db.studyMaterial.findFirst({
      where: { subject, processingStatus: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { extractedText: true, title: true }
    });
    if (!material?.extractedText) return null;
    // Truncate to ~2000 chars — enough for RAG context without blowing token budget
    const text = material.extractedText.replace(/\s+/g, ' ').trim();
    return {
      title: material.title,
      excerpt: text.length > 2000 ? text.slice(0, 2000) + '…' : text
    };
  } catch {
    return null;
  }
}

// ── Rule-based fallback ───────────────────────────────────────────────
function ruleBasedEvaluation(question, answerText) {
  if (!answerText?.trim()) {
    return { score: 0, strengths: [], weaknesses: ['No answer provided'], feedback: 'No answer provided.', followUp: null };
  }
  const lower = answerText.toLowerCase();
  const keywords = (question.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const matched  = keywords.filter(k => lower.includes(k));
  const missing  = keywords.filter(k => !lower.includes(k));
  const ratio    = keywords.length > 0 ? matched.length / keywords.length : 0;
  let score      = Math.round(ratio * 10);
  if (score === 0 && answerText.trim().length > 10) score = 2;

  const strengths  = matched.length > 0 ? [`Mentioned: ${matched.join(', ')}`] : [];
  const weaknesses = missing.length  > 0 ? [`Missing concepts: ${missing.slice(0, 3).join(', ')}`] : [];

  let feedback;
  if (score >= 8)      feedback = `Excellent! You covered key concepts: ${matched.join(', ')}.`;
  else if (score >= 5) feedback = `Good effort. Expand on: ${missing.slice(0, 3).join(', ')}.`;
  else if (score >= 2) feedback = `Partial answer. Cover more: ${missing.join(', ')}.`;
  else                 feedback = `Review core concepts: ${keywords.slice(0, 4).join(', ')}.`;

  return { score, strengths, weaknesses, feedback, followUp: null, usedFallback: true };
}

// ── AI evaluation ────────────────────────────────────────────────────
/**
 * Evaluate a student's answer using LLM + optional RAG context.
 *
 * @returns {{ score, strengths, weaknesses, feedback, followUp, usedFallback, context }}
 */
async function evaluateAnswer(question, answerText, subject) {
  const context = await getStudyContext(subject);

  const contextSection = context
    ? `\n\n## Study Material Context (Source: "${context.title}")\n${context.excerpt}`
    : '';

  const prompt = `You are a strict but fair academic viva examiner evaluating a student's spoken answer.

## Question
${question.questionText}

## Expected Answer (Reference)
${question.expectedAnswer || 'Not provided'}

## Student's Answer
${answerText || 'No answer given'}${contextSection}

## Task
Evaluate the student's answer. Return a JSON object with exactly these fields:
- "score": integer 0-10 (0=no answer, 10=perfect)
- "strengths": array of strings (what the student got right, be specific)
- "weaknesses": array of strings (what was missing or wrong, be specific)  
- "feedback": string (constructive 1-2 sentence feedback for the student)
- "followUp": string or null (a follow-up question to probe deeper, or null if not needed)

Scoring guide: 0-2=incorrect/missing, 3-4=partial, 5-6=adequate, 7-8=good, 9-10=excellent`;

  try {
    const { data } = await generateJSON(prompt, { temperature: 0.2 });

    // Validate and sanitise
    const score      = Math.max(0, Math.min(10, Math.round(Number(data.score) || 0)));
    const strengths  = Array.isArray(data.strengths)  ? data.strengths.map(String)  : [];
    const weaknesses = Array.isArray(data.weaknesses) ? data.weaknesses.map(String) : [];
    const feedback   = String(data.feedback  || '');
    const followUp   = data.followUp ? String(data.followUp) : null;

    return { score, strengths, weaknesses, feedback, followUp, usedFallback: false, context: !!context };
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      console.warn('[AI] Ollama unavailable, using rule-based fallback:', err.message);
      return { ...ruleBasedEvaluation(question, answerText), context: false };
    }
    console.error('[AI] Evaluation error:', err.message);
    return { ...ruleBasedEvaluation(question, answerText), context: false };
  }
}

module.exports = { evaluateAnswer, getStudyContext };
