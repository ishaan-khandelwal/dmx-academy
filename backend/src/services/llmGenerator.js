/**
 * llmGenerator.js — LLM-powered viva question generation.
 *
 * Generates a balanced mix of question types:
 *   Definition     — "What is X?"
 *   Conceptual     — "Explain how X works"
 *   Comparison     — "What is the difference between X and Y?"
 *   Scenario-Based — "If X happens, what would you do?"
 *   Application    — "How would you use X to solve Y?"
 *   Coding-Oriented— "Write / trace / debug code involving X"
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

  // Build type distribution — cycle through types ensuring variety
  const typeDistribution = [];
  for (let i = 0; i < count; i++) {
    typeDistribution.push(QUESTION_TYPES[i % QUESTION_TYPES.length]);
  }
  const typeList = typeDistribution.map((t, i) => `${i+1}. [${t.type}] ${t.description}`).join('\n');

  const prompt = `You are an expert technical examiner creating viva questions for "${subject}".

## Study Material
${contextText}

## Task
Generate EXACTLY ${count} viva questions based on the material above.
Follow this type distribution:
${typeList}

Requirements:
- Questions must be derived from the material above, not from general knowledge.
- No duplicate questions.
- EASY = straightforward recall, MEDIUM = understanding/application, HARD = analysis/synthesis.
- expectedAnswer must be 2-3 sentences drawn from the material.
- keywords = 5-8 essential terms a correct answer MUST include (comma-separated).

Return ONLY a JSON object:
{
  "questions": [
    {
      "questionText": "...",
      "type": "Definition|Conceptual|Comparison|Scenario-Based|Application|Coding-Oriented",
      "subject": "${subject}",
      "topic": "<specific sub-topic, 1-3 words>",
      "difficulty": "EASY|MEDIUM|HARD",
      "expectedAnswer": "...",
      "keywords": "..."
    }
  ]
}`;

  try {
    const { data } = await generateJSON(prompt, { temperature: 0.3, maxTokens: 2048 });
    const arr = Array.isArray(data) ? data : (data.questions || []);

    const sanitized = arr.map(q => ({
      questionText:   String(q.questionText   || '').trim(),
      subject:        String(q.subject        || subject).trim(),
      topic:          String(q.topic          || 'General').trim(),
      difficulty:     ['EASY','MEDIUM','HARD'].includes(String(q.difficulty).toUpperCase())
                        ? String(q.difficulty).toUpperCase() : 'MEDIUM',
      expectedAnswer: String(q.expectedAnswer || '').trim(),
      keywords:       String(q.keywords       || '').trim(),
    })).filter(q => q.questionText.length > 10 && q.expectedAnswer.length > 10);

    // De-duplicate by question text similarity
    const seen = new Set();
    const unique = sanitized.filter(q => {
      const key = q.questionText.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length === 0) throw new Error('AI returned empty or invalid question array.');
    return unique.slice(0, count);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) throw err;
    console.error('[LLMGenerator] Error:', err.message);
    throw new Error('AI question generation failed.');
  }
}

module.exports = { llmGenerator };
