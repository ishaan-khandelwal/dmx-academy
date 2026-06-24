const { runInSandbox } = require('./sandboxService');
const { compareOutputs } = require('./comparator');

/**
 * Queue system to restrict concurrent execution of containers.
 * Restricts unbounded spawning of docker instances to preserve server stability.
 */
class JudgeQueue {
  constructor(concurrency = 4) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Adds a judging task to the execution queue.
   */
  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next();
    });
  }

  /**
   * Triggers execution of the next queued task if under concurrency threshold.
   */
  next() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    const { fn, resolve, reject } = this.queue.shift();
    this.running++;
    
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.running--;
        this.next();
      });
  }
}

// Instantiate queue with concurrency limit (default 4)
const concurrencyLimit = parseInt(process.env.JUDGE_CONCURRENCY || '4', 10);
const judgeQueue = new JudgeQueue(concurrencyLimit);

/**
 * Pure queue-agnostic judging logic for a single submission.
 * Evaluates outputs and determines appropriate verdicts.
 */
const judgeSubmission = async (language, code, problemConfig, testCases, options = {}) => {
  try {
    // 1. Run the code in sandbox
    const sandboxRes = await runInSandbox(language, code, problemConfig, testCases, {
      runAll: options.runAll,
    });

    if (sandboxRes.verdict === 'COMPILATION_ERROR' || sandboxRes.verdict === 'INTERNAL_ERROR') {
      return {
        verdict: sandboxRes.verdict,
        failedTestCase: null,
        totalTestCases: testCases.length,
        passedTestCases: 0,
        executionTimeMs: 0,
        memoryKb: 0,
        stderr: sandboxRes.stderr,
      };
    }

    // 2. Perform comparison on output of successful test runs
    let finalVerdict = 'ACCEPTED';
    let failedTestCase = null;
    let passedCount = 0;
    const evaluatedResults = [];

    for (const tcResult of sandboxRes.results) {
      const originalTC = testCases[tcResult.index - 1];

      if (tcResult.status === 'SUCCESS') {
        const isCorrect = compareOutputs(
          tcResult.stdout,
          originalTC.expectedOutput,
          problemConfig.comparator,
          problemConfig.epsilon
        );

        if (isCorrect) {
          evaluatedResults.push({
            ...tcResult,
            verdict: 'ACCEPTED',
          });
          passedCount++;
        } else {
          evaluatedResults.push({
            ...tcResult,
            verdict: 'WRONG_ANSWER',
          });
          if (finalVerdict === 'ACCEPTED') {
            finalVerdict = 'WRONG_ANSWER';
            failedTestCase = tcResult.index;
          }
        }
      } else {
        // Handle sandbox limits failure (TLE, MLE, RE)
        evaluatedResults.push({
          ...tcResult,
          verdict: tcResult.status,
        });
        if (finalVerdict === 'ACCEPTED') {
          finalVerdict = tcResult.status;
          failedTestCase = tcResult.index;
        }
      }
    }

    return {
      verdict: finalVerdict,
      failedTestCase,
      totalTestCases: testCases.length,
      passedTestCases: passedCount,
      executionTimeMs: sandboxRes.executionTimeMs,
      memoryKb: sandboxRes.memoryKb,
      results: evaluatedResults,
      stderr: sandboxRes.stderr,
    };
  } catch (error) {
    console.error('Judge evaluation failure:', error);
    return {
      verdict: 'INTERNAL_ERROR',
      failedTestCase: null,
      totalTestCases: testCases.length,
      passedTestCases: 0,
      executionTimeMs: 0,
      memoryKb: 0,
      stderr: error.message,
    };
  }
};

/**
 * Enqueues a judging operation to enforce the concurrency limit.
 */
const judgeQueuedSubmission = (language, code, problemConfig, testCases, options = {}) => {
  return judgeQueue.add(() => judgeSubmission(language, code, problemConfig, testCases, options));
};

module.exports = {
  judgeSubmission,
  judgeQueuedSubmission,
  JudgeQueue,
};
