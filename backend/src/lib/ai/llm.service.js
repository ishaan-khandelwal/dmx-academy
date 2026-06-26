/**
 * llm.service.js — Central Ollama client.
 *
 * ALL AI calls in the system must go through this module.
 * To swap models: change OLLAMA_MODEL in .env.
 * To swap providers: replace `callOllama` with a new function that
 * accepts the same (prompt, opts) signature and returns { text }.
 * Nothing else in the system needs to change.
 */

const http = require('http');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────
const getConfig = () => ({
  endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
  model:    process.env.OLLAMA_MODEL    || 'phi3',
  timeout:  parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000'),
  enabled:  process.env.AI_ENABLED !== 'false'
});

/**
 * Check if Ollama is reachable.
 * Returns { available: bool, model: string, error?: string }
 */
async function checkHealth() {
  const { endpoint, model } = getConfig();
  try {
    const res = await rawRequest('GET', `${endpoint}/api/tags`, null, 5000);
    const data = JSON.parse(res);
    const models = (data.models || []).map(m => m.name);
    const modelAvailable = models.some(m => m.startsWith(model));
    return {
      available: true,
      model,
      modelAvailable,
      models,
      endpoint
    };
  } catch (err) {
    return {
      available: false,
      model,
      endpoint,
      error: err.message
    };
  }
}

/**
 * Core generation function.
 * @param {string} prompt
 * @param {{ temperature?: number, maxTokens?: number, model?: string }} opts
 * @returns {{ text: string, model: string, tokens?: number }}
 */
async function generate(prompt, opts = {}) {
  const cfg = getConfig();
  if (!cfg.enabled) {
    throw new OllamaUnavailableError('AI is disabled (AI_ENABLED=false).');
  }

  const model = opts.model || cfg.model;
  const body = JSON.stringify({
    model,
    prompt,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.3,
      num_predict: opts.maxTokens ?? 1024
    }
  });

  try {
    const raw = await rawRequest('POST', `${cfg.endpoint}/api/generate`, body, cfg.timeout);
    const data = JSON.parse(raw);
    if (!data.response) throw new Error('Empty response from Ollama.');
    return {
      text: data.response.trim(),
      model: data.model || model,
      tokens: data.eval_count
    };
  } catch (err) {
    if (err instanceof OllamaUnavailableError) throw err;
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
      throw new OllamaUnavailableError(
        `Ollama is not running at ${cfg.endpoint}. Start it with: ollama serve`
      );
    }
    if (err.message?.includes('timeout')) {
      throw new OllamaUnavailableError(
        `Ollama request timed out after ${cfg.timeout}ms. The model may be loading — try again.`
      );
    }
    throw new OllamaUnavailableError(`Ollama error: ${err.message}`);
  }
}

/**
 * Generate and parse a JSON response from the LLM.
 * Retries once if the first response isn't valid JSON.
 */
async function generateJSON(prompt, opts = {}) {
  const jsonPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON. No explanation, no markdown, no code blocks. Raw JSON only.`;

  const result = await generate(jsonPrompt, { ...opts, temperature: 0.1 });

  // Strip any markdown code fences if the model added them anyway
  let text = result.text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Find JSON object boundaries
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return { data: JSON.parse(text), model: result.model };
  } catch (parseErr) {
    // One retry with even stronger instruction
    const retry = await generate(
      `Return ONLY a JSON object. No text before or after.\n\n${prompt}`,
      { ...opts, temperature: 0.0 }
    );
    let r = retry.text
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const s = r.indexOf('{'), e = r.lastIndexOf('}');
    if (s !== -1 && e !== -1) r = r.slice(s, e + 1);
    return { data: JSON.parse(r), model: retry.model };
  }
}

// ── Error class ───────────────────────────────────────────────────────
class OllamaUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OllamaUnavailableError';
    this.isAiUnavailable = true;
  }
}

// ── Low-level HTTP helper (no external deps) ──────────────────────────
function rawRequest(method, url, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers:  body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}
    };

    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = { generate, generateJSON, checkHealth, getConfig, OllamaUnavailableError };
