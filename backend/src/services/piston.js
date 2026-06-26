/**
 * Piston API Integration Service (CommonJS)
 */
const { normalizeOutput } = require('./judge0');

const PISTON_LANGUAGES = {
  'CPP': { language: 'cpp', version: '*' },
  'JAVA': { language: 'java', version: '*' },
  'PYTHON': { language: 'python', version: '*' },
  'JAVASCRIPT': { language: 'javascript', version: '*' }
};

/**
 * Executes a single test case using the Piston API
 * @param {string} sourceCode 
 * @param {string} language - JAVASCRIPT, PYTHON, CPP, JAVA
 * @param {string} stdin 
 * @param {string} expectedOutput 
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>}
 */
async function executePistonTestcase(sourceCode, language, stdin, expectedOutput, timeoutMs = 2000) {
  const langConfig = PISTON_LANGUAGES[language.toUpperCase()];
  if (!langConfig) {
    return {
      status: 'COMPILATION_ERROR',
      error: `Unsupported language: ${language}`,
      executionTimeMs: 0,
      memoryKb: 0
    };
  }

  const pistonUrl = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

  // Build files payload (some runtimes look for main.cpp / Main.java)
  let fileName = 'solution';
  if (language.toUpperCase() === 'CPP') fileName = 'main.cpp';
  if (language.toUpperCase() === 'JAVA') fileName = 'Main.java';
  if (language.toUpperCase() === 'PYTHON') fileName = 'main.py';
  if (language.toUpperCase() === 'JAVASCRIPT') fileName = 'main.js';

  const payload = {
    language: langConfig.language,
    version: langConfig.version,
    files: [
      {
        name: fileName,
        content: sourceCode
      }
    ],
    stdin: stdin,
    run_timeout: timeoutMs
  };

  try {
    const startTime = Date.now();
    const res = await fetch(`${pistonUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const elapsedMs = Date.now() - startTime;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Piston API responded with status ${res.status}: ${text}`);
    }

    const data = await res.json();
    
    // Check for compilation errors
    if (data.compile && data.compile.code !== 0) {
      return {
        status: 'COMPILATION_ERROR',
        executionTimeMs: 0,
        memoryKb: 0,
        stdout: '',
        stderr: data.compile.stderr || data.compile.output || 'Compilation Error'
      };
    }

    const runResult = data.run;
    if (!runResult) {
      throw new Error('Piston API returned no execution run data.');
    }

    // Check for Time Limit Exceeded (signal: SIGKILL is sent on timeout)
    if (runResult.signal === 'SIGKILL' || runResult.signal === 'KILL' || elapsedMs >= timeoutMs + 100) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        executionTimeMs: Math.max(elapsedMs, timeoutMs),
        memoryKb: 0,
        stdout: runResult.stdout || '',
        stderr: 'Time Limit Exceeded'
      };
    }

    // Check for runtime errors
    if (runResult.code !== 0) {
      return {
        status: 'RUNTIME_ERROR',
        executionTimeMs: elapsedMs,
        memoryKb: 0,
        stdout: runResult.stdout || '',
        stderr: runResult.stderr || runResult.output || `Process exited with code ${runResult.code}`
      };
    }

    return {
      status: 'SUCCESS',
      executionTimeMs: elapsedMs,
      memoryKb: 0,
      stdout: runResult.stdout || '',
      stderr: runResult.stderr || ''
    };
  } catch (err) {
    console.error('Piston Execution failed:', err);
    return {
      status: 'INTERNAL_ERROR',
      executionTimeMs: 0,
      memoryKb: 0,
      stdout: '',
      stderr: err.message || 'Internal execution failure'
    };
  }
}

module.exports = {
  executePistonTestcase
};
