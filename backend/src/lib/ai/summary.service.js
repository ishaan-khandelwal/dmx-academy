/**
 * summary.service.js
 *
 * Generates an AI-powered session summary at the end of a Viva.
 * Output is stored in VivaSession.aiSummary as a JSON string.
 *
 * Summary shape:
 * {
 *   overallRemark: string,
 *   strongTopics: string[],
 *   weakTopics: string[],
 *   recommendedStudy: string[],
 *   generatedAt: ISO string
 * }
 */

const { generateJSON, OllamaUnavailableError } = require('./llm.service');

/**
 * Generate a session summary from all answers.
 *
 * @param {object} session  - VivaSession with vivaAnswers included
 * @param {Array}  answers  - Array of { questionText, answerText, score, strengths, weaknesses }
 * @returns {object|null}   - Summary object or null if AI unavailable
 */
async function generateSessionSummary(session, answers) {
  if (!answers || answers.length === 0) return null;

  // Build a compact Q&A summary to fit in context
  const qaSummary = answers.map((a, i) =>
    `Q${i + 1} (score ${a.score}/10): ${a.questionText}\n  Answer: ${(a.answerText || '').slice(0, 150)}`
  ).join('\n\n');

  const avgScore = Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length * 10) / 10;

  const prompt = `You are an academic performance analyst reviewing a student's viva session.

Subject: ${session.subject}
Questions Attempted: ${answers.length}
Average Score: ${avgScore}/10

## Q&A Summary
${qaSummary}

## Task
Analyse the student's performance and return a JSON object with exactly these fields:
- "overallRemark": string (2-3 sentence honest overall assessment)
- "strongTopics": array of strings (topics/concepts the student demonstrated well, 1-4 items)
- "weakTopics": array of strings (topics/concepts needing improvement, 1-4 items)
- "recommendedStudy": array of strings (specific topics/resources to study next, 2-4 items)

Be specific and constructive. Base analysis only on the answers above.`;

  try {
    const { data } = await generateJSON(prompt, { temperature: 0.3, maxTokens: 600 });

    return {
      overallRemark:    String(data.overallRemark    || ''),
      strongTopics:     Array.isArray(data.strongTopics)     ? data.strongTopics.map(String)     : [],
      weakTopics:       Array.isArray(data.weakTopics)       ? data.weakTopics.map(String)       : [],
      recommendedStudy: Array.isArray(data.recommendedStudy) ? data.recommendedStudy.map(String) : [],
      generatedAt:      new Date().toISOString()
    };
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      console.warn('[AI] Ollama unavailable for summary, using rule-based fallback.');
      return ruleBasedSummary(session, answers, avgScore);
    }
    console.error('[AI] Summary generation error:', err.message);
    return ruleBasedSummary(session, answers, avgScore);
  }
}

/** Simple rule-based summary fallback */
function ruleBasedSummary(session, answers, avgScore) {
  const strong = answers.filter(a => a.score >= 7).map(a => a.questionText.slice(0, 60));
  const weak   = answers.filter(a => a.score <  5).map(a => a.questionText.slice(0, 60));

  let overallRemark;
  if (avgScore >= 8)      overallRemark = `Outstanding performance in ${session.subject}. You demonstrated strong understanding across all topics.`;
  else if (avgScore >= 6) overallRemark = `Good performance in ${session.subject}. You covered the main concepts well with room to deepen your understanding.`;
  else if (avgScore >= 4) overallRemark = `Adequate performance in ${session.subject}. Core concepts need more practice before the final assessment.`;
  else                    overallRemark = `${session.subject} needs significant review. Focus on foundational concepts before attempting advanced topics.`;

  return {
    overallRemark,
    strongTopics:     strong.slice(0, 3),
    weakTopics:       weak.slice(0, 3),
    recommendedStudy: [`Review ${session.subject} fundamentals`, 'Practice with more examples'],
    generatedAt:      new Date().toISOString()
  };
}

module.exports = { generateSessionSummary };
