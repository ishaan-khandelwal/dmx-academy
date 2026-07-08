const fs = require("fs");
const path = require("path");

const EXCEL_FILENAME = "learning_arcade.xlsx";
const OUTPUT_FILENAME = "learning-arcade-content.json";
const OUTPUT_DIR = path.join(__dirname, "..", "src", "data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, OUTPUT_FILENAME);

// Fallback content in case the Excel spreadsheet is missing
const fallbackContent = {
  quiz: [
    // JavaScript Quiz Blitz
    {
      id: "quiz_js_01",
      track: "JavaScript",
      question: "Which of the following describes the difference between == and === in JavaScript?",
      code: "console.log(5 == '5');\nconsole.log(5 === '5');",
      option_a: "== checks only value, while === checks both value and type.",
      option_b: "== checks value and type, while === checks only value.",
      option_c: "== is for assignment, while === is for comparison.",
      option_d: "They perform the exact same type of comparison.",
      correct_option: "A",
      explanation: "The == operator performs type coercion before comparison, whereas === (strict equality) requires both value and type to match.",
      time_limit: 20
    },
    {
      id: "quiz_js_02",
      track: "JavaScript",
      question: "What is the output of the following code snippet regarding JavaScript closures?",
      code: "function outer() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\nconst counter = outer();\nconsole.log(counter());\nconsole.log(counter());",
      option_a: "0 then 1",
      option_b: "1 then 2",
      option_c: "1 then 1",
      option_d: "undefined then undefined",
      correct_option: "B",
      explanation: "A closure retains access to the lexical scope in which it was created, allowing the inner function to increment and preserve the 'count' variable across calls.",
      time_limit: 25
    },
    // React.js Quiz Blitz
    {
      id: "quiz_react_01",
      track: "React.js",
      question: "Why should you avoid updating React state directly (e.g., state.val = 10) inside a component?",
      code: "const [state, setState] = useState({ count: 0 });\n// Why is this bad?\nstate.count = 1;",
      option_a: "React will throw a compile-time syntax error.",
      option_b: "It does not trigger a re-render, leading to stale UI.",
      option_c: "State object becomes completely read-only and immutable.",
      option_d: "It automatically overrides all variables in scope.",
      correct_option: "B",
      explanation: "React relies on state update functions (like setState) to detect changes, enqueue updates, and schedule a re-render. Direct mutation bypasses React's change detection.",
      time_limit: 20
    },
    {
      id: "quiz_react_02",
      track: "React.js",
      question: "What is the primary purpose of the dependency array in useEffect?",
      code: "useEffect(() => {\n  fetchData();\n}, [userId]);",
      option_a: "To declare which variables are returned by the hook.",
      option_b: "To list variables that, when changed, trigger the hook to re-run.",
      option_c: "To specify the HTML elements that the effect attaches to.",
      option_d: "To initialize default values for state hooks.",
      correct_option: "B",
      explanation: "React compares current values of dependency array elements with their previous values. The effect runs on mount and whenever any dependency changes.",
      time_limit: 20
    },
    // Node.js Quiz Blitz
    {
      id: "quiz_node_01",
      track: "Node.js",
      question: "Which of the following best describes the Node.js event loop?",
      code: "",
      option_a: "A multi-threaded pool that processes requests in parallel.",
      option_b: "A single-threaded loop that delegates I/O tasks to the OS or worker threads and runs callbacks.",
      option_c: "A database routing system that optimizes queries.",
      option_d: "A visual debugging utility built into Chrome DevTools.",
      correct_option: "B",
      explanation: "Node.js uses a single-threaded event loop to handle execution. Async operations are delegated to Libuv's thread pool or the OS, firing callbacks when ready.",
      time_limit: 20
    },
    {
      id: "quiz_node_02",
      track: "Node.js",
      question: "What is the difference between require() and import in Node.js modules?",
      code: "const path = require('path');\n// vs\nimport path from 'path';",
      option_a: "require is CommonJS (synchronous), whereas import is ES6 Modules (static/asynchronous).",
      option_b: "require is asynchronous, whereas import is synchronous.",
      option_c: "require can only import packages, whereas import only loads local files.",
      option_d: "They are completely identical in all versions of Node.",
      correct_option: "A",
      explanation: "require() is the synchronous CommonJS loader. ESM `import` is statically analyzed and supports asynchronous module resolutions.",
      time_limit: 20
    },
    // MongoDB Quiz Blitz
    {
      id: "quiz_mongo_01",
      track: "MongoDB",
      question: "What does the $lookup stage do in a MongoDB aggregation pipeline?",
      code: "db.orders.aggregate([\n  { $lookup: { ... } }\n]);",
      option_a: "It searches the web for matching query documents.",
      option_b: "It performs an left outer join to another collection.",
      option_c: "It creates a unique index on the specified fields.",
      option_d: "It deletes documents matching a specific expression.",
      correct_option: "B",
      explanation: "$lookup acts like a left outer join, matching documents from an external collection to documents in the current aggregation pipeline.",
      time_limit: 25
    },
    {
      id: "quiz_mongo_02",
      track: "MongoDB",
      question: "Which index type is best suited for accelerating queries on subdocuments or nested arrays?",
      code: "db.users.createIndex({ 'emails.address': 1 });",
      option_a: "Compound Index",
      option_b: "Multikey Index",
      option_c: "Text Index",
      option_d: "Geospatial Index",
      correct_option: "B",
      explanation: "MongoDB uses multikey indexes to index content stored in arrays. It creates index entries for each element of the array.",
      time_limit: 20
    }
  ],
  match: [
    // JavaScript Code Match
    {
      id: "match_js_01",
      track: "JavaScript",
      term: "Closure",
      definition: "A function that retains access to its outer lexical scope variables."
    },
    {
      id: "match_js_02",
      track: "JavaScript",
      "term": "Promise",
      "definition": "An object representing the eventual completion or failure of an asynchronous operation."
    },
    {
      id: "match_js_03",
      track: "JavaScript",
      term: "Event Loop",
      definition: "Mechanism allowing JS to perform non-blocking I/O operations despite being single-threaded."
    },
    {
      id: "match_js_04",
      track: "JavaScript",
      term: "Prototype",
      definition: "An object template from which other objects inherit methods and properties."
    },
    {
      id: "match_js_05",
      track: "JavaScript",
      term: "Hoisting",
      definition: "JavaScript's behavior of moving declarations to the top of their current scope before execution."
    },
    {
      id: "match_js_06",
      track: "JavaScript",
      term: "Callback",
      definition: "A function passed as an argument to another function to be executed later."
    },
    // React.js Code Match
    {
      id: "match_react_01",
      track: "React.js",
      term: "useState",
      definition: "A hook that adds reactive local state variables to a functional component."
    },
    {
      id: "match_react_02",
      track: "React.js",
      term: "useMemo",
      definition: "A hook that memoizes calculations to prevent expensive computations on every render."
    },
    {
      id: "match_react_03",
      track: "React.js",
      term: "Virtual DOM",
      definition: "A lightweight representation of the real DOM tree kept in memory."
    },
    {
      id: "match_react_04",
      track: "React.js",
      term: "Props",
      definition: "Read-only values passed from a parent component down to its child."
    },
    {
      id: "match_react_05",
      track: "React.js",
      term: "useEffect",
      definition: "A hook used to perform side effects in functional components, like data fetching."
    },
    {
      id: "match_react_06",
      track: "React.js",
      term: "Context",
      definition: "A way to pass data through the component tree without manually passing props at every level."
    },
    // Node.js Code Match
    {
      id: "match_node_01",
      track: "Node.js",
      term: "Express",
      definition: "A minimal and flexible web application framework for Node.js routing and middleware."
    },
    {
      id: "match_node_02",
      track: "Node.js",
      term: "Buffer",
      definition: "An object used to represent raw, fixed-length binary data sequences outside the V8 engine."
    },
    {
      id: "match_node_03",
      track: "Node.js",
      term: "EventEmitter",
      definition: "A class enabling objects to trigger named events that invoke registered listener callbacks."
    },
    {
      id: "match_node_04",
      track: "Node.js",
      term: "Streams",
      definition: "Unix-like interfaces to transfer chunked data incrementally instead of loading it entirely."
    },
    {
      id: "match_node_05",
      track: "Node.js",
      term: "NPM",
      definition: "The default package manager for Node.js used to install and manage project dependencies."
    },
    {
      id: "match_node_06",
      track: "Node.js",
      term: "Middleware",
      definition: "Functions that have access to the request, response, and the next function in the cycle."
    },
    // MongoDB Code Match
    {
      id: "match_mongo_01",
      track: "MongoDB",
      term: "BSON",
      definition: "A binary serialization format used to store documents in MongoDB tables."
    },
    {
      id: "match_mongo_02",
      track: "MongoDB",
      term: "Collection",
      definition: "A grouping of MongoDB documents, equivalent to a relational database table."
    },
    {
      id: "match_mongo_03",
      track: "MongoDB",
      term: "Aggregation",
      definition: "A pipeline framework to process data records and return computed results."
    },
    {
      id: "match_mongo_04",
      track: "MongoDB",
      term: "Index",
      definition: "A data structure built on fields to speed up queries and sort operations."
    },
    {
      id: "match_mongo_05",
      track: "MongoDB",
      term: "Document",
      definition: "A record in a MongoDB collection, structured as key-value pairs similar to JSON."
    },
    {
      id: "match_mongo_06",
      track: "MongoDB",
      term: "Mongoose",
      definition: "An Object Data Modeling (ODM) library for MongoDB that provides a schema-based solution."
    }
  ],
  debug: [
    // JavaScript Debug Rush
    {
      id: "debug_js_01",
      track: "JavaScript",
      title: "Average Calculator",
      code: "function getAverage(arr) {\n  let total = 0;\n  for (let i = 0; i <= arr.length; i++) {\n    total += arr[i];\n  }\n  return total / arr.length;\n}",
      buggy_line_number: 3,
      buggy_line_content: "  for (let i = 0; i <= arr.length; i++) {",
      explanation: "The loop condition `i <= arr.length` goes out of bounds by one element (where index equals length). It should be `i < arr.length` to avoid adding `undefined` to total, which results in NaN."
    },
    {
      id: "debug_js_02",
      track: "JavaScript",
      title: "Object Property Comparison",
      code: "const user = { name: 'Alice', role: 'admin' };\nif (user.role = 'admin') {\n  console.log('Access granted');\n} else {\n  console.log('Access denied');\n}",
      buggy_line_number: 2,
      buggy_line_content: "if (user.role = 'admin') {",
      explanation: "The condition `user.role = 'admin'` uses a single equals sign, which assigns the value rather than comparing it. It will always evaluate to truthy. Use `===` instead."
    },
    // React.js Debug Rush
    {
      id: "debug_react_01",
      track: "React.js",
      title: "Counter State Incrementer",
      code: "function Counter() {\n  const [count, setCount] = useState(0);\n  const click = () => {\n    count = count + 1;\n    setCount(count);\n  };\n  return <button onClick={click}>{count}</button>;\n}",
      buggy_line_number: 4,
      buggy_line_content: "    count = count + 1;",
      explanation: "React state variables returned by `useState` are read-only. Modifying `count` directly (`count = count + 1`) mutations the local reference. Use `setCount(count + 1)` directly instead."
    },
    {
      id: "debug_react_02",
      track: "React.js",
      title: "State Update inside Render Loop",
      code: "function Toggle() {\n  const [active, setActive] = useState(false);\n  setActive(!active);\n  return <button>State: {active ? 'On' : 'Off'}</button>;\n}",
      buggy_line_number: 3,
      buggy_line_content: "  setActive(!active);",
      explanation: "Calling state setters like `setActive` directly inside the render block triggers another state update, creating an infinite recursive render loop. Move it to an event handler or useEffect."
    },
    // Node.js Debug Rush
    {
      id: "debug_node_01",
      track: "Node.js",
      title: "Express Route Response",
      code: "app.get('/users/:id', async (req, res) => {\n  try {\n    const user = await db.getUser(req.params.id);\n    if (!user) res.status(404).send('Not Found');\n    res.json(user);\n  } catch (err) {\n    res.status(500).send(err.message);\n  }\n});",
      buggy_line_number: 4,
      buggy_line_content: "    if (!user) res.status(404).send('Not Found');",
      explanation: "When user is not found, `res.status(404).send(...)` is called, but there is no `return` statement. The code continues executing and tries to run `res.json(user)` as well, resulting in a 'Headers already sent' error."
    },
    {
      id: "debug_node_02",
      track: "Node.js",
      title: "Read File Asynchronously",
      code: "const fs = require('fs');\nfunction readData(path) {\n  let content;\n  fs.readFile(path, 'utf8', (err, data) => {\n    content = data;\n  });\n  return content;\n}",
      buggy_line_number: 7,
      buggy_line_content: "  return content;",
      explanation: "Because `fs.readFile` is asynchronous, the callback updates `content` after the outer function has already returned. `content` is returned as `undefined`. Use async/await promises or fs.readFileSync."
    },
    // MongoDB Debug Rush
    {
      id: "debug_mongo_01",
      track: "MongoDB",
      title: "Sort Documents by Rating",
      code: "db.products.find({ category: 'Electronics' })\n  .sort({ rating: 'desc' })\n  .limit(10);",
      buggy_line_number: 2,
      buggy_line_content: "  .sort({ rating: 'desc' })",
      explanation: "In MongoDB, sorting parameters are specified using integers: `1` for ascending and `-1` for descending. Providing `'desc'` will cause a query parsing exception."
    },
    {
      id: "debug_mongo_02",
      track: "MongoDB",
      title: "Lookup Join Field Matching",
      code: "db.orders.aggregate([\n  {\n    $lookup: {\n      from: 'customers',\n      localField: 'customer_id',\n      foreignField: 'id',\n      as: 'details'\n    }\n  }\n]);",
      buggy_line_number: 6,
      buggy_line_content: "      foreignField: 'id',",
      explanation: "MongoDB default document IDs are stored in the `_id` field. The join foreignField should typically reference `_id` rather than `id` unless there is a custom identifier column."
    }
  ]
};

// Check if Excel file exists and convert it
const excelPath = path.join(__dirname, "..", EXCEL_FILENAME);

if (!fs.existsSync(excelPath)) {
  console.log(`Excel file NOT found at "${excelPath}".`);
  console.log("Generating structured JSON file with fallback/sample content...");
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fallbackContent, null, 2), "utf8");
  console.log(`Successfully created fallback content at "${OUTPUT_PATH}".`);
  process.exit(0);
}

console.log(`Excel file found at "${excelPath}". Parsing data...`);

try {
  const xlsx = require("xlsx");
  const workbook = xlsx.readFile(excelPath);
  
  const parsedData = {
    quiz: [],
    match: [],
    debug: []
  };

  // 1. Parse Quiz Sheet
  if (workbook.Sheets["Quiz"]) {
    const sheet = workbook.Sheets["Quiz"];
    const rows = xlsx.utils.sheet_to_json(sheet);
    rows.forEach((row, i) => {
      // Validate row
      if (!row.id || !row.track || !row.question || !row.correct_option) {
        console.warn(`[WARNING] Quiz Sheet Row ${i + 2}: Missing required fields. Skipping.`);
        return;
      }
      parsedData.quiz.push({
        id: String(row.id).trim(),
        track: String(row.track).trim(),
        question: String(row.question).trim(),
        code: row.code ? String(row.code).trim() : "",
        option_a: row.option_a ? String(row.option_a).trim() : "",
        option_b: row.option_b ? String(row.option_b).trim() : "",
        option_c: row.option_c ? String(row.option_c).trim() : "",
        option_d: row.option_d ? String(row.option_d).trim() : "",
        correct_option: String(row.correct_option).trim().toUpperCase(),
        explanation: row.explanation ? String(row.explanation).trim() : "",
        time_limit: row.time_limit ? Number(row.time_limit) : 20
      });
    });
  } else {
    console.warn("[WARNING] 'Quiz' sheet not found in the workbook.");
  }

  // 2. Parse Match Sheet
  if (workbook.Sheets["Match"]) {
    const sheet = workbook.Sheets["Match"];
    const rows = xlsx.utils.sheet_to_json(sheet);
    rows.forEach((row, i) => {
      if (!row.id || !row.track || !row.term || !row.definition) {
        console.warn(`[WARNING] Match Sheet Row ${i + 2}: Missing required fields. Skipping.`);
        return;
      }
      parsedData.match.push({
        id: String(row.id).trim(),
        track: String(row.track).trim(),
        term: String(row.term).trim(),
        definition: String(row.definition).trim(),
        explanation: row.explanation ? String(row.explanation).trim() : ""
      });
    });
  } else {
    console.warn("[WARNING] 'Match' sheet not found in the workbook.");
  }

  // 3. Parse Debug Sheet
  if (workbook.Sheets["Debug"]) {
    const sheet = workbook.Sheets["Debug"];
    const rows = xlsx.utils.sheet_to_json(sheet);
    rows.forEach((row, i) => {
      if (!row.id || !row.track || !row.title || !row.code || !row.buggy_line_number) {
        console.warn(`[WARNING] Debug Sheet Row ${i + 2}: Missing required fields. Skipping.`);
        return;
      }
      parsedData.debug.push({
        id: String(row.id).trim(),
        track: String(row.track).trim(),
        title: String(row.title).trim(),
        code: String(row.code).replace(/\r\n/g, "\n").trim(), // normalize newlines
        buggy_line_number: Number(row.buggy_line_number),
        buggy_line_content: row.buggy_line_content ? String(row.buggy_line_content).trim() : "",
        explanation: row.explanation ? String(row.explanation).trim() : ""
      });
    });
  } else {
    console.warn("[WARNING] 'Debug' sheet not found in the workbook.");
  }

  // Double check if any sheet was populated. If workbook sheet names existed but are empty, use fallbacks for empty arrays
  if (parsedData.quiz.length === 0 && parsedData.match.length === 0 && parsedData.debug.length === 0) {
    console.log("Workbook sheets found but they contained no valid rows. Using fallback content instead.");
    Object.assign(parsedData, fallbackContent);
  } else {
    // Fill in any completely missing sheets with their fallback equivalents
    if (parsedData.quiz.length === 0) parsedData.quiz = fallbackContent.quiz;
    if (parsedData.match.length === 0) parsedData.match = fallbackContent.match;
    if (parsedData.debug.length === 0) parsedData.debug = fallbackContent.debug;
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsedData, null, 2), "utf8");
  console.log(`Successfully parsed Excel and saved content to "${OUTPUT_PATH}".`);
  console.log(`Summary: ${parsedData.quiz.length} quizzes, ${parsedData.match.length} matching pairs, ${parsedData.debug.length} debug snippets.`);
} catch (error) {
  console.error("Error parsing Excel workbook:", error);
  console.log("Falling back to writing default content to prevent build failures.");
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fallbackContent, null, 2), "utf8");
}
