const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Helper to seed on startup
const seedDefaultQuestionsIfNeeded = async () => {
  try {
    const count = await prisma.arcadeQuestion.count();
    if (count > 0) {
      return; // Already has questions
    }

    console.log("Database ArcadeQuestion table is empty. Seeding default questions...");
    
    // 1. Seed quizzes and match pairs from learning-arcade-content.json
    let content = null;
    const jsonPath = path.join(__dirname, '../../../../frontend/src/data/learning-arcade-content.json');
    if (fs.existsSync(jsonPath)) {
      content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    if (content) {
      if (Array.isArray(content.quiz)) {
        for (const q of content.quiz) {
          await prisma.arcadeQuestion.create({
            data: {
              type: "quiz",
              track: q.track,
              question: q.question,
              code: q.code || "",
              optionA: q.option_a || "",
              optionB: q.option_b || "",
              optionC: q.option_c || "",
              optionD: q.option_d || "",
              correctOption: q.correct_option,
              explanation: q.explanation || "",
              timeLimit: q.time_limit || 20,
              instituteId: null
            }
          });
        }
      }

      if (Array.isArray(content.match)) {
        for (const m of content.match) {
          await prisma.arcadeQuestion.create({
            data: {
              type: "match",
              track: m.track,
              term: m.term,
              definition: m.definition,
              instituteId: null
            }
          });
        }
      }
    }

    // 2. Seed default Code Fill-In questions
    const fillins = [
      { id: "py1", lang: "Python", title: "Conditional Check", code: "age = 18\n____ age >= 18:\n    print(\"adult\")", optionA: "if", optionB: "while", optionC: "for", optionD: "def", answer: "if", hint: "Python uses `if` to start a conditional block. The syntax is `if condition:`." },
      { id: "py2", lang: "Python", title: "Function Definition", code: "____ greet(name):\n    return f\"Hello, {name}!\"", optionA: "def", optionB: "fn", optionC: "function", optionD: "lambda", answer: "def", hint: "Functions in Python are defined using the `def` keyword, followed by the function name." },
      { id: "py3", lang: "Python", title: "Range Iteration", code: "for i in ____(10):\n    print(i)", optionA: "range", optionB: "len", optionC: "list", optionD: "iter", answer: "range", hint: "`range(n)` generates a sequence from 0 to n-1. It's the standard way to iterate a fixed number of times." },
      { id: "py4", lang: "Python", title: "Return Statement", code: "def square(x):\n    ____ x * x", optionA: "return", optionB: "yield", optionC: "print", optionD: "pass", answer: "return", hint: "`return` exits the function and sends back a value to the caller." },
      { id: "py5", lang: "Python", title: "List Length", code: "nums = [1, 2, 3, 4, 5]\ncount = ____(nums)\nprint(count)", optionA: "len", optionB: "count", optionC: "size", optionD: "length", answer: "len", hint: "`len()` is a built-in function that returns the number of items in a sequence." },
      { id: "js1", lang: "JavaScript", title: "Block Variable", code: "____ score = 0;\nscore += 10;\nconsole.log(score);", optionA: "let", optionB: "var", optionC: "const", optionD: "set", answer: "let", hint: "`let` declares a block-scoped variable that can be reassigned. `const` cannot be reassigned, and `var` is function-scoped." },
      { id: "js2", lang: "JavaScript", title: "Arrow Function", code: "const double = x ____ x * 2;\nconsole.log(double(5));", optionA: "=>", optionB: "->", optionC: ":", optionD: "=", answer: "=>", hint: "Arrow functions use `=>` to separate parameters from the function body: `param => expression`." },
      { id: "js3", lang: "JavaScript", title: "Array Filter", code: "const evens = [1,2,3,4,5]\n  .____( x => x % 2 === 0 );\nconsole.log(evens);", optionA: "filter", optionB: "map", optionC: "reduce", optionD: "find", answer: "filter", hint: "`Array.filter()` returns a new array with only elements that pass the test function." },
      { id: "js4", lang: "JavaScript", title: "Async Keyword", code: "____ function fetchUser(id) {\n  const data = await getUser(id);\n  return data;\n}", optionA: "async", optionB: "await", optionC: "defer", optionD: "sync", answer: "async", hint: "A function that uses `await` must itself be declared with `async`. This enables Promise-based asynchronous code." },
      { id: "js5", lang: "JavaScript", title: "Type Check", code: "const name = \"Alice\";\nconsole.log(____ name === \"string\");", optionA: "typeof", optionB: "instanceof", optionC: "typecheck", optionD: "isType", answer: "typeof", hint: "`typeof` returns a string indicating the type of the operand (e.g. \"string\", \"number\", \"boolean\")." },
      { id: "sql1", lang: "SQL", title: "Select All", code: "____ * FROM employees;", optionA: "SELECT", optionB: "GET", optionC: "FETCH", optionD: "PICK", answer: "SELECT", hint: "`SELECT` retrieves data from a database table. `SELECT *` selects all columns." },
      { id: "sql2", lang: "SQL", title: "Filter Rows", code: "SELECT name, salary\nFROM employees\n____ salary > 50000;", optionA: "WHERE", optionB: "HAVING", optionC: "IF", optionD: "FILTER", answer: "WHERE", hint: "`WHERE` filters rows before grouping. `HAVING` filters after grouping (used with GROUP BY)." },
      { id: "sql3", lang: "SQL", title: "Sort Results", code: "SELECT name, age\nFROM users\n____ age DESC;", optionA: "ORDER BY", optionB: "SORT BY", optionC: "GROUP BY", optionD: "ARRANGE BY", answer: "ORDER BY", hint: "`ORDER BY column DESC` sorts results in descending order. Use `ASC` for ascending (the default)." },
      { id: "sql4", lang: "SQL", title: "Count Rows", code: "SELECT department, ____(id)\nFROM employees\nGROUP BY department;", optionA: "COUNT", optionB: "SUM", optionC: "AVG", optionD: "TOTAL", answer: "COUNT", hint: "`COUNT(column)` counts non-null values in a column. `COUNT(*)` counts all rows." },
      { id: "sql5", lang: "SQL", title: "Inner Join", code: "SELECT e.name, d.name\nFROM employees e\n____ JOIN departments d\nON e.dept_id = d.id;", optionA: "INNER", optionB: "LEFT", optionC: "RIGHT", optionD: "CROSS", answer: "INNER", hint: "`INNER JOIN` returns rows where there is a match in both tables. Other joins (LEFT, RIGHT) include unmatched rows." }
    ];

    for (const f of fillins) {
      await prisma.arcadeQuestion.create({
        data: {
          type: "fillin",
          track: f.lang,
          title: f.title,
          code: f.code,
          blank: "____",
          optionA: f.optionA,
          optionB: f.optionB,
          optionC: f.optionC,
          optionD: f.optionD,
          correctOption: f.answer,
          hint: f.hint,
          instituteId: null
        }
      });
    }

    // 3. Seed default Debug the Bug levels
    const debugs = [
      {
        title: "Sum of Evens",
        language: "JavaScript",
        file: "sum_evens.js",
        instructions: "Fix the function to filter and sum only the even numbers in the array. Watch out for assignments inside conditional clauses, and ensure the return statement sits correctly after checking all numbers!",
        hint: "Use the triple-equals operator `===` for strict comparison, and move the `return` statement out of the loop body so it doesn't terminate early.",
        defaultCode: "function sumOfEvens(arr) {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    // There are 2 bugs in this block!\n    if (arr[i] % 2 = 0) {\n      sum += arr[i];\n      return sum;\n    }\n  }\n}",
        validateCode: "try {\n  const fullCode = `${code}\\nreturn sumOfEvens;`;\n  const testFn = new Function(fullCode)();\n  \n  if (typeof testFn !== 'function') {\n    return { success: false, error: 'Function sumOfEvens is not defined or not a function.' };\n  }\n\n  const tests = [\n    { input: [[1, 2, 3, 4]], expected: 6 },\n    { input: [[1, 3, 5]], expected: 0 },\n    { input: [[2, 4, 6, 8]], expected: 20 },\n    { input: [[]], expected: 0 },\n  ];\n\n  for (let i = 0; i < tests.length; i++) {\n    const result = testFn(...tests[i].input);\n    if (result !== tests[i].expected) {\n      return {\n        success: false,\n        error: `Test ${i + 1} Failed: sumOfEvens(${JSON.stringify(tests[i].input[0])}) expected ${tests[i].expected}, but got ${result}`\n      };\n    }\n  }\n  return { success: true };\n} catch (err) {\n  return { success: false, error: err.message };\n}"
      },
      {
        title: "Palindrome Checker",
        language: "Python",
        file: "palindrome.py",
        instructions: "Fix this Python function to check if a string is a palindrome (ignoring casing and spaces). In Python, strings are immutable, and the slice step requires proper step syntax!",
        hint: "In Python, string replacement returns a new string and does not modify the original string in place. Also, reversing a string with slices uses a negative step: `[::-1]`.",
        defaultCode: "def is_palindrome(s):\n    # Clean the string (remove spaces)\n    s.replace(\" \", \"\")\n    \n    # Check if string matches its reverse\n    return s == s[::1]",
        validateCode: "const hasAssignment = /s\\s*=\\s*s\\.replace/.test(code) || /s\\s*=\\s*[a-zA-Z0-9_.]*replace/.test(code);\nconst hasLower = /\\.lower\\(\\)/.test(code) || /\\.casefold\\(\\)/.test(code);\nconst hasReverseSlice = /s\\[::-1\\]/.test(code);\n\nif (!hasAssignment) {\n  return {\n    success: false,\n    error: \"Syntax check failed! Python strings are immutable. Doing `s.replace(' ', '')` does not update `s`. You must reassign it: `s = s.replace(...)`.\"\n  };\n}\n\nif (!hasLower) {\n  return {\n    success: false,\n    error: \"Validation error! To ignore casing, convert the string to lowercase using `.lower()` before checking palindrome status.\"\n  };\n}\n\nif (!hasReverseSlice) {\n  return {\n    success: false,\n    error: \"Algorithm error! Reversing string with slicing in Python is written as `s[::-1]`. Your current syntax `s[::1]` traverses forward!\"\n  };\n}\n\nreturn { success: true };"
      },
      {
        title: "Active Customer Spend",
        language: "SQL",
        file: "customers.sql",
        instructions: "Fix the SQL query to retrieve names and total spends of active customers who spent more than $100. Correct the filter clause and query logic operators!",
        hint: "Use the `WHERE` clause for row filtering (instead of `HAVING`, which aggregates groups). Additionally, the standard SQL conjunction operator is the keyword `AND` rather than `&&`.",
        defaultCode: "SELECT name, total_spent\nFROM customers\nHAVING status = 'active'\n&& total_spent > 100;",
        validateCode: "const cleaned = code.toLowerCase().replace(/\\s+/g, ' ').trim();\n\nif (cleaned.includes('having status')) {\n  return {\n    success: false,\n    error: \"SQL Execution Error: `HAVING` is used to filter aggregated groups. To filter individual records before group aggregation, use the `WHERE` clause.\"\n  };\n}\n\nif (!cleaned.includes(\"where status = 'active'\") && !cleaned.includes(\"where status='active'\")) {\n  return {\n    success: false,\n    error: \"Data verification failed: Query doesn't fetch active users correctly. Ensure query includes `WHERE status = 'active'`.\"\n  };\n}\n\nif (cleaned.includes('&&')) {\n  return {\n    success: false,\n    error: \"Syntax Error: In standard SQL, the conjunction operator is the word `AND`. The double ampersand `&&` is non-standard.\"\n  };\n}\n\nif (!cleaned.includes('and total_spent > 100') && !cleaned.includes('and total_spent>100')) {\n  return {\n    success: false,\n    error: \"Data verification failed: Filter condition for total spent spent is missing or incorrect. It must check `total_spent > 100`.\"\n  };\n}\n\nreturn { success: true };"
      },
      {
        title: "Stale Count Hook",
        language: "JavaScript",
        file: "useAutoIncrement.js",
        instructions: "Fix the React custom hook. It should auto-increment `count` by 1 every second. But it's stuck because of a stale closure in the interval, and it creates memory leaks because it never cleans up the timer!",
        hint: "Use a functional state updater inside `setCount(prev => prev + 1)` so the interval hook references the freshest state without closures. Also return a cleanup function `() => clearInterval(...)` inside the `useEffect` callback.",
        defaultCode: "import { useState, useEffect } from \"react\";\n\nexport function useAutoIncrement() {\n  const [count, setCount] = useState(0);\n\n  useEffect(() => {\n    const id = setInterval(() => {\n      setCount(count + 1);\n    }, 1000);\n  }, []);\n\n  return count;\n}",
        validateCode: "const hasCleanup = /return\\s+(\\(\\)\\s*=>\\s*|function\\(\\)\\s*\\{?\\s*)clearInterval\\(/.test(code);\nconst hasFunctionalUpdate = /setCount\\(\\s*(\\w+)\\s*=>\\s*\\1\\s*\\+\\s*1\\s*\\)/.test(code) || \n                            /setCount\\(\\s*function\\s*\\(\\s*(\\w+)\\s*\\)\\s*\\{\\s*return\\s+\\1\\s*\\+\\s*1\\s*;?\\s*\\}\\s*\\)/.test(code);\n\nif (!hasFunctionalUpdate) {\n  return {\n    success: false,\n    error: \"Hook state test failed! Because the dependency array `[]` is empty, `count` inside the setInterval closure remains locked at `0`. Use functional updates: `setCount(prev => prev + 1)`.\"\n  };\n}\n\nif (!hasCleanup) {\n  return {\n    success: false,\n    error: \"Resource leak detected! The interval is never cleared when the component unmounts. Return a cleanup function inside `useEffect`, e.g., `return () => clearInterval(id);`.\"\n  };\n}\n\nreturn { success: true };"
      },
      {
        title: "Parallel Mapping",
        language: "JavaScript",
        file: "fetch_users.js",
        instructions: "Fix this async function. It is intended to fetch profile data for multiple userIds concurrently and return the array of results. Right now, it returns an array of unresolved Promises instead of the fetched data!",
        hint: "An `async` function inside `.map()` returns a Promise. This yields an array of Promises. Use `await Promise.all(...)` to await all promises in parallel before returning.",
        defaultCode: "async function fetchAllUserData(userIds, fetchFunc) {\n  // Map ids to async fetch calls\n  const data = userIds.map(async (id) => {\n    return await fetchFunc(id);\n  });\n  \n  return data;\n}",
        validateCode: "try {\n  const fullCode = `${code}\\nreturn fetchAllUserData;`;\n  const testFn = new Function(fullCode)();\n  \n  if (typeof testFn !== 'function') {\n    return { success: false, error: 'Function fetchAllUserData is not defined or not a function.' };\n  }\n\n  const mockFetch = async (id) => {\n    return { id, data: `user_${id}` };\n  };\n\n  const resultPromise = testFn([101, 102, 103], mockFetch);\n  \n  if (!(resultPromise instanceof Promise)) {\n    return {\n      success: false,\n      error: \"Logical Error: The function must return a Promise that resolves to the array of fetched users.\"\n    };\n  }\n\n  return resultPromise.then((results) => {\n    if (!Array.isArray(results)) {\n      return { success: false, error: 'Logical Error: The resolved value is not an array.' };\n    }\n    if (results.length !== 3) {\n      return { success: false, error: `Logical Error: Expected 3 records, got ${results.length}.` };\n    }\n    if (results[0] instanceof Promise) {\n      return {\n        success: false,\n        error: \"Execution Failure: You returned `data`, which is an array of unresolved Promises! Use `await Promise.all(data)` to wait for all parallel fetches to finish.\"\n      };\n    }\n    if (results[0].data !== 'user_101') {\n      return { success: false, error: 'Logical Error: The fetched user details are incorrect.' };\n    }\n    return { success: true };\n  }).catch((err) => {\n    return { success: false, error: `Execution Error: ${err.message}` };\n  });\n} catch (err) {\n  return { success: false, error: err.message };\n}"
      }
    ];

    for (const d of debugs) {
      await prisma.arcadeQuestion.create({
        data: {
          type: "debug",
          track: d.language,
          title: d.title,
          file: d.file,
          instructions: d.instructions,
          hint: d.hint,
          defaultCode: d.defaultCode,
          validateCode: d.validateCode,
          instituteId: null
        }
      });
    }

    console.log("Seeding default arcade questions complete!");
  } catch (err) {
    console.error("Error seeding default arcade questions:", err);
  }
};

const getQuestions = async (req, res) => {
  try {
    const { type } = req.query || req.params;
    const filterType = type || req.query.type;

    let whereClause = {};
    if (filterType) {
      whereClause.type = filterType;
    }

    // Scoping to user's institute + global
    if (req.user && req.user.role !== 'ADMIN') {
      whereClause.OR = [
        { instituteId: req.user.instituteId },
        { instituteId: null }
      ];
    }

    const questions = await prisma.arcadeQuestion.findMany({
      where: whereClause,
      orderBy: { id: 'asc' }
    });

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const data = req.body;
    
    let targetInstituteId = null;
    if (req.user.role === 'INSTITUTE_ADMIN') {
      targetInstituteId = req.user.instituteId;
    } else if (req.user.role === 'ADMIN') {
      targetInstituteId = data.instituteId ? Number(data.instituteId) : null;
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role for question creation." });
    }

    const newQuestion = await prisma.arcadeQuestion.create({
      data: {
        type: data.type,
        track: data.track || "",
        title: data.title || "",
        level: Number(data.level) || 1,
        question: data.question || "",
        code: data.code || "",
        optionA: data.optionA || "",
        optionB: data.optionB || "",
        optionC: data.optionC || "",
        optionD: data.optionD || "",
        correctOption: data.correctOption || "",
        explanation: data.explanation || "",
        timeLimit: Number(data.timeLimit) || 20,
        term: data.term || "",
        definition: data.definition || "",
        blank: data.blank || "____",
        hint: data.hint || "",
        file: data.file || "",
        instructions: data.instructions || "",
        defaultCode: data.defaultCode || "",
        validateCode: data.validateCode || "",
        buggyLines: data.buggyLines || null,
        blanks: data.blanks || null,
        instituteId: targetInstituteId
      }
    });

    res.status(201).json({ success: true, data: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const questionId = Number(id);
    const existing = await prisma.arcadeQuestion.findUnique({
      where: { id: questionId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    if (req.user.role !== 'ADMIN') {
      if (req.user.role !== 'INSTITUTE_ADMIN' || existing.instituteId !== req.user.instituteId) {
        return res.status(403).json({ success: false, message: "Unauthorized to update this question." });
      }
    }

    const updated = await prisma.arcadeQuestion.update({
      where: { id: questionId },
      data: {
        track: data.track !== undefined ? data.track : existing.track,
        title: data.title !== undefined ? data.title : existing.title,
        level: data.level !== undefined ? Number(data.level) : existing.level,
        question: data.question !== undefined ? data.question : existing.question,
        code: data.code !== undefined ? data.code : existing.code,
        optionA: data.optionA !== undefined ? data.optionA : existing.optionA,
        optionB: data.optionB !== undefined ? data.optionB : existing.optionB,
        optionC: data.optionC !== undefined ? data.optionC : existing.optionC,
        optionD: data.optionD !== undefined ? data.optionD : existing.optionD,
        correctOption: data.correctOption !== undefined ? data.correctOption : existing.correctOption,
        explanation: data.explanation !== undefined ? data.explanation : existing.explanation,
        timeLimit: data.timeLimit !== undefined ? Number(data.timeLimit) : existing.timeLimit,
        term: data.term !== undefined ? data.term : existing.term,
        definition: data.definition !== undefined ? data.definition : existing.definition,
        blank: data.blank !== undefined ? data.blank : existing.blank,
        hint: data.hint !== undefined ? data.hint : existing.hint,
        file: data.file !== undefined ? data.file : existing.file,
        instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
        defaultCode: data.defaultCode !== undefined ? data.defaultCode : existing.defaultCode,
        validateCode: data.validateCode !== undefined ? data.validateCode : existing.validateCode,
        buggyLines: data.buggyLines !== undefined ? data.buggyLines : existing.buggyLines,
        blanks: data.blanks !== undefined ? data.blanks : existing.blanks
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const questionId = Number(id);

    const existing = await prisma.arcadeQuestion.findUnique({
      where: { id: questionId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    if (req.user.role !== 'ADMIN') {
      if (req.user.role !== 'INSTITUTE_ADMIN' || existing.instituteId !== req.user.instituteId) {
        return res.status(403).json({ success: false, message: "Unauthorized to delete this question." });
      }
    }

    await prisma.arcadeQuestion.delete({
      where: { id: questionId }
    });

    res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  seedDefaultQuestionsIfNeeded
};
