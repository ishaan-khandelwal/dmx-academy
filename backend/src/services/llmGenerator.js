/**
 * llmGenerator.js — LLM-powered viva question generation.
 *
 * Generates a balanced mix of question types sequentially to avoid local CPU timeouts
 * and JSON truncation errors.
 */

const { generateJSON, OllamaUnavailableError } = require('../lib/ai/llm.service');

// Distribution across 6 types (proportional for any count)
const QUESTION_TYPES = [
  { type: 'Definition',      description: 'Ask the student to define a concept or term from the material.' },
  { type: 'Conceptual',      description: 'Ask the student to explain how something works or why it exists.' },
  { type: 'Comparison',      description: 'Ask the student to compare two concepts (e.g. X vs Y).' },
  { type: 'Scenario-Based',  description: 'Present a realistic scenario and ask what happens or what they would do.' },
  { type: 'Application',     description: 'Ask how a concept is applied to solve a real problem.' },
  { type: 'Coding-Oriented', description: 'Ask to write, trace, or reason about a code snippet related to the topic.' },
];

async function llmGenerator(text, subject, count) {
  // Limit context to avoid blowing token budget
  const contextText = text.length > 4500 ? text.slice(0, 4500) + '…' : text;

  const generatedQuestions = [];
  const seenTexts = new Set();
  const maxCount = Math.min(count, 30);

  console.log(`[LLMGenerator] Starting batched generation for ${maxCount} questions...`);

  const prompt = `You are an expert technical examiner creating viva questions for "${subject}".

## Study Material
${contextText}

## Task
Generate exactly ${maxCount} viva questions based on the material above.

Requirements for each question:
- The question must be derived from the material above, not from general knowledge.
- Vary the difficulty across questions: EASY, MEDIUM, and HARD.
- expectedAnswer must be 1 concise sentence drawn from the material (keep it very brief).
- keywords = 3-5 essential terms (comma-separated).
- Use a mix of types: Definition, Conceptual, Scenario-Based, Application.

Return ONLY a JSON object with a single key "questions" containing an array of objects. Format:
{
  "questions": [
    {
      "questionText": "...",
      "type": "...",
      "subject": "${subject}",
      "topic": "<specific sub-topic, 1-3 words>",
      "difficulty": "<EASY, MEDIUM, or HARD>",
      "expectedAnswer": "...",
      "keywords": "..."
    }
  ]
}`;

  try {
    console.log(`[LLMGenerator] Generating batch of ${maxCount} questions...`);
    // Adjust maxTokens to allow for a larger response since we generate multiple questions
    const { data } = await generateJSON(prompt, { temperature: 0.3, maxTokens: 2048 });

    if (data && Array.isArray(data.questions)) {
      for (const q of data.questions) {
        if (!q || !q.questionText) continue;
        
        const questionText = String(q.questionText).trim();
        const key = questionText.toLowerCase().slice(0, 60);

        if (!seenTexts.has(key) && questionText.length > 10) {
          seenTexts.add(key);
          generatedQuestions.push({
            questionText,
            subject:        String(q.subject || subject).trim(),
            topic:          String(q.topic || 'General').trim(),
            difficulty:     ['EASY','MEDIUM','HARD'].includes(String(q.difficulty).toUpperCase())
                              ? String(q.difficulty).toUpperCase() : 'MEDIUM',
            expectedAnswer: String(q.expectedAnswer || '').trim(),
            keywords:       String(q.keywords || '').trim(),
          });
        }
      }
    }
  } catch (err) {
    if (err.isAiUnavailable || err.name === 'OllamaUnavailableError') throw err;
    console.error(`[LLMGenerator] Failed batched generation:`, err.message);
  }

  if (generatedQuestions.length === 0) {
    throw new Error('AI question generation failed completely.');
  }

  console.log(`[LLMGenerator] Generation completed. Successfully generated ${generatedQuestions.length}/${count} questions.`);
  return generatedQuestions;
}

module.exports = { llmGenerator };
