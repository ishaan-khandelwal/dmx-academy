const { generateJSON, OllamaUnavailableError } = require('../lib/ai/llm.service');

/**
 * Generate highly contextual Viva questions from extracted PDF text using a local LLM.
 *
 * @param {string} text       - Extracted text from the PDF
 * @param {string} subject    - Subject name
 * @param {number} count      - Desired number of questions
 * @returns {Array<{questionText, subject, topic, difficulty, expectedAnswer, keywords}>}
 */
async function llmGenerator(text, subject, count) {
  // Truncate text to avoid blowing token budget (approx ~4000-5000 chars for context)
  const contextText = text.length > 5000 ? text.slice(0, 5000) + '...' : text;

  const prompt = `You are an expert academic examiner. Based on the following study material text, generate ${count} high-quality, conceptual Viva questions for the subject "${subject}".

## Study Material Context
${contextText}

## Task
Extract and formulate exactly ${count} distinct questions from this material.
Return ONLY a JSON object with a single key "questions" containing an array of objects. Each object MUST have EXACTLY the following fields:
- "questionText": string (the question to ask the student)
- "subject": string (use "${subject}")
- "topic": string (the specific topic this question relates to, e.g., "Memory Management", 1-3 words)
- "difficulty": string (MUST be one of: "EASY", "MEDIUM", "HARD")
- "expectedAnswer": string (a comprehensive 2-3 sentence answer based on the text)
- "keywords": string (comma-separated list of 5-8 essential keywords that MUST be in a correct answer, e.g., "lexical, scope, closure")

Example output format:
{
  "questions": [
    {
      "questionText": "...",
      "subject": "...",
      "topic": "...",
      "difficulty": "...",
      "expectedAnswer": "...",
      "keywords": "..."
    }
  ]
}

Ensure the JSON is perfectly formatted. No markdown, no explanations.`;

  try {
    const { data } = await generateJSON(prompt, { temperature: 0.3 });
    
    // Ensure data is an array
    const questionsArray = Array.isArray(data) ? data : (data.questions || []);

    // Validate and sanitize the output
    const sanitized = questionsArray.map(q => ({
      questionText: String(q.questionText || '').trim(),
      subject: String(q.subject || subject).trim(),
      topic: String(q.topic || 'General').trim(),
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(String(q.difficulty).toUpperCase()) ? String(q.difficulty).toUpperCase() : 'MEDIUM',
      expectedAnswer: String(q.expectedAnswer || '').trim(),
      keywords: String(q.keywords || '').trim(),
    })).filter(q => q.questionText.length > 10 && q.expectedAnswer.length > 10);

    if (sanitized.length === 0) {
      throw new Error("AI returned empty or invalid question array.");
    }

    // Limit to requested count in case LLM generates too many
    return sanitized.slice(0, count);

  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      throw err; // Propagate to let caller handle fallback
    }
    console.error('[AI] Question Generation Error:', err.message);
    throw new Error('AI Question generation failed.');
  }
}

module.exports = { llmGenerator };
