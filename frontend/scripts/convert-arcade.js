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
    {
      id: "quiz_js_03",
      track: "JavaScript",
      question: "Which of the following is NOT a falsy value in JavaScript?",
      code: "",
      option_a: "0",
      option_b: "\"\"",
      option_c: "[]",
      option_d: "undefined",
      correct_option: "C",
      explanation: "In JavaScript, empty arrays [] and empty objects {} are truthy. Numbers like 0, empty strings '', undefined, null, and NaN are falsy.",
      time_limit: 15
    },
    {
      id: "quiz_js_04",
      track: "JavaScript",
      question: "What is the return value of typeof null in JavaScript?",
      code: "",
      option_a: "\"null\"",
      option_b: "\"object\"",
      option_c: "\"undefined\"",
      option_d: "\"string\"",
      correct_option: "B",
      explanation: "Historically in JavaScript, typeof null returns 'object'. This is a well-known legacy behavior in the language specifications.",
      time_limit: 15
    },
    {
      id: "quiz_js_05",
      track: "JavaScript",
      question: "Which method is used to add one or more elements to the end of an array and return its new length?",
      code: "",
      option_a: "pop()",
      option_b: "push()",
      option_c: "shift()",
      option_d: "unshift()",
      correct_option: "B",
      explanation: "push() adds elements to the end of an array, while unshift() adds them to the beginning. pop() and shift() remove elements.",
      time_limit: 15
    },
    {
      id: "quiz_js_06",
      track: "JavaScript",
      question: "What is the output of console.log(typeof NaN) in JavaScript?",
      code: "",
      option_a: "\"number\"",
      option_b: "\"NaN\"",
      option_c: "\"undefined\"",
      option_d: "\"object\"",
      correct_option: "A",
      explanation: "NaN stands for Not-a-Number, but its programmatic data type in JavaScript is actually 'number'.",
      time_limit: 15
    },
    {
      id: "quiz_js_07",
      track: "JavaScript",
      question: "Which of the following statements about const is true?",
      code: "",
      option_a: "It cannot be declared without initialization.",
      option_b: "It is function-scoped.",
      option_c: "The properties of a const object cannot be modified.",
      option_d: "It can be redeclared in the same scope.",
      correct_option: "A",
      explanation: "A const variable must be initialized during declaration. It is block-scoped, and while the binding cannot be changed, the properties of objects declared with const can still be mutated.",
      time_limit: 20
    },
    {
      id: "quiz_js_08",
      track: "JavaScript",
      question: "Which array method creates a new array with the results of calling a provided function on every element?",
      code: "",
      option_a: "forEach()",
      option_b: "map()",
      option_c: "filter()",
      option_d: "some()",
      correct_option: "B",
      explanation: "map() executes a callback function on each element and returns a new array. forEach() simply iterates without returning a new array.",
      time_limit: 15
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
    {
      id: "quiz_react_03",
      track: "React.js",
      question: "Which hook should be used to memoize a function definition to prevent unnecessary re-creations on re-render?",
      code: "",
      option_a: "useMemo",
      option_b: "useCallback",
      option_c: "useRef",
      option_d: "useReducer",
      correct_option: "B",
      explanation: "useCallback memoizes the function definition itself, while useMemo memoizes the resolved value/result of calling a function.",
      time_limit: 20
    },
    {
      id: "quiz_react_04",
      track: "React.js",
      question: "What is the correct way to pass a ref to a child component when using functional components?",
      code: "",
      option_a: "Just pass it as a regular prop named ref.",
      option_b: "Wrap the child component in forwardRef API.",
      option_c: "Use components ref inheritance context.",
      option_d: "Assign it to the browser DOM nodes directly.",
      correct_option: "B",
      explanation: "In React functional components, ref cannot be passed directly as a prop. You must wrap the child component with React.forwardRef.",
      time_limit: 20
    },
    {
      id: "quiz_react_05",
      track: "React.js",
      question: "What does StrictMode in React do in development mode?",
      code: "",
      option_a: "Throws error exceptions for all runtime warnings.",
      option_b: "Double-invokes render phase lifecycles to detect side-effects.",
      option_c: "Minifies the production bundle automatically.",
      option_d: "Disables state updates completely.",
      correct_option: "B",
      explanation: "React StrictMode renders components twice in development to help identify unsafe lifecycles, legacy API usages, and unexpected side effects.",
      time_limit: 20
    },
    {
      id: "quiz_react_06",
      track: "React.js",
      question: "Which React hook is designed to manage complex state transitions using a reducer pattern?",
      code: "",
      option_a: "useState",
      option_b: "useContext",
      option_c: "useReducer",
      option_d: "useMemo",
      correct_option: "C",
      explanation: "useReducer is preferred over useState when you have complex state logic that involves multiple sub-values or when the next state depends on the previous one.",
      time_limit: 15
    },
    {
      id: "quiz_react_07",
      track: "React.js",
      question: "What is the main benefit of keys in React lists?",
      code: "",
      option_a: "They uniquely identify elements to improve DOM reconciliation.",
      option_b: "They apply CSS layout styles automatically.",
      option_c: "They bind click event handlers.",
      option_d: "They define type safety schemas.",
      correct_option: "A",
      explanation: "Keys help React identify which items have changed, are added, or are removed. They are essential for list item reconciliation.",
      time_limit: 20
    },
    {
      id: "quiz_react_08",
      track: "React.js",
      question: "When does a functional component re-render in React?",
      code: "",
      option_a: "Only when its props change.",
      option_b: "When its state updates or its parent component re-renders.",
      option_c: "Every 1 second by default.",
      option_d: "Only when the page is reloaded in browser.",
      correct_option: "B",
      explanation: "A component re-renders if its internal state updates, context values change, or its parent component initiates a re-render.",
      time_limit: 15
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
    {
      id: "quiz_node_03",
      track: "Node.js",
      question: "Which core module in Node.js is used to handle file path operations?",
      code: "",
      option_a: "fs",
      option_b: "path",
      option_c: "os",
      option_d: "http",
      correct_option: "B",
      explanation: "The 'path' module provides utilities for working with file and directory paths, handling cross-platform separator differences.",
      time_limit: 15
    },
    {
      id: "quiz_node_04",
      track: "Node.js",
      question: "How do you read environment variables in a Node.js script?",
      code: "",
      option_a: "process.env.VAR_NAME",
      option_b: "process.variables.VAR_NAME",
      option_c: "env.VAR_NAME",
      option_d: "global.env.VAR_NAME",
      correct_option: "A",
      explanation: "Node.js stores environment variables inside the process.env object.",
      time_limit: 15
    },
    {
      id: "quiz_node_05",
      track: "Node.js",
      question: "Which method of the fs module reads a file completely in a synchronous, blocking manner?",
      code: "",
      option_a: "fs.readFile",
      option_b: "fs.readFileSync",
      option_c: "fs.readSync",
      option_d: "fs.readFilesSync",
      correct_option: "B",
      explanation: "readFileSync stops execution until the file content is completely loaded into memory.",
      time_limit: 15
    },
    {
      id: "quiz_node_06",
      track: "Node.js",
      question: "What is the purpose of module.exports in Node.js?",
      code: "",
      option_a: "To download online NPM packages.",
      option_b: "To expose variables or functions from a module to be required elsewhere.",
      option_c: "To run bash commands in child processes.",
      option_d: "To optimize V8 garbage collection.",
      correct_option: "B",
      explanation: "module.exports allows modules to export objects, functions, or variables so that other files can import them using require().",
      time_limit: 15
    },
    {
      id: "quiz_node_07",
      track: "Node.js",
      question: "Which Node.js core module is used to create an HTTP server?",
      code: "",
      option_a: "net",
      option_b: "http",
      option_c: "https",
      option_d: "url",
      correct_option: "B",
      explanation: "The http module allows Node.js to transfer data over the Hyper Text Transfer Protocol (HTTP) and create web servers.",
      time_limit: 15
    },
    {
      id: "quiz_node_08",
      track: "Node.js",
      question: "Which command is used to initialize a new Node.js project and create a package.json file?",
      code: "",
      option_a: "npm install",
      option_b: "npm init",
      option_c: "npm start",
      option_d: "npm create",
      correct_option: "B",
      explanation: "npm init prompts you for project details and generates a standard configuration package.json.",
      time_limit: 15
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
    },
    {
      id: "quiz_mongo_03",
      track: "MongoDB",
      question: "Which command in MongoDB is used to insert a single document into a collection?",
      code: "",
      option_a: "db.collection.insert()",
      option_b: "db.collection.insertOne()",
      option_c: "db.collection.add()",
      option_d: "db.collection.create()",
      correct_option: "B",
      explanation: "insertOne() is the modern MongoDB command for inserting exactly one document into a collection.",
      time_limit: 15
    },
    {
      id: "quiz_mongo_04",
      track: "MongoDB",
      question: "What is the default unique identifier field generated for every document in MongoDB?",
      code: "",
      option_a: "id",
      option_b: "_id",
      option_c: "uid",
      option_d: "uuid",
      correct_option: "B",
      explanation: "Every document in MongoDB requires a unique '_id' field. If omitted, MongoDB automatically generates a 12-byte ObjectId.",
      time_limit: 15
    },
    {
      id: "quiz_mongo_05",
      track: "MongoDB",
      question: "How do you sort documents in ascending order of age in MongoDB?",
      code: "",
      option_a: ".sort({ age: -1 })",
      option_b: ".sort({ age: 1 })",
      option_c: ".sort({ age: \"asc\" })",
      option_d: ".sort({ age: \"up\" })",
      correct_option: "B",
      explanation: "MongoDB uses 1 for ascending sort order and -1 for descending sort order.",
      time_limit: 15
    },
    {
      id: "quiz_mongo_06",
      track: "MongoDB",
      question: "Which MongoDB operator is used to check if a field value is greater than a specified value?",
      code: "",
      option_a: "$gt",
      option_b: "$gte",
      option_c: "$lt",
      option_d: "$ne",
      correct_option: "A",
      explanation: "$gt stands for 'greater than', $gte is 'greater than or equal', $lt is 'less than', and $ne is 'not equal'.",
      time_limit: 15
    },
    {
      id: "quiz_mongo_07",
      track: "MongoDB",
      question: "What is the primary format MongoDB uses to store documents internally?",
      code: "",
      option_a: "XML",
      option_b: "JSON",
      option_c: "BSON",
      option_d: "CSV",
      correct_option: "C",
      explanation: "MongoDB stores documents as BSON (Binary JSON), which extends JSON with additional data types (like Date and Binary).",
      time_limit: 15
    },
    {
      id: "quiz_mongo_08",
      track: "MongoDB",
      question: "Which operator is used to modify or update specific fields in a MongoDB document without replacing it?",
      code: "",
      option_a: "$set",
      option_b: "$update",
      option_c: "$put",
      option_d: "$modify",
      correct_option: "A",
      explanation: "The $set operator replaces the value of a field with the specified value, leaving other fields intact.",
      time_limit: 15
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
    {
      id: "match_js_07",
      track: "JavaScript",
      term: "Destructuring",
      definition: "A syntax that allows unpacking values from arrays or properties from objects into distinct variables."
    },
    {
      id: "match_js_08",
      track: "JavaScript",
      term: "Arrow Function",
      definition: "A compact syntax for writing functions that lexically binds the 'this' value."
    },
    {
      id: "match_js_09",
      track: "JavaScript",
      term: "Type Coercion",
      definition: "The automatic or implicit conversion of values from one data type to another."
    },
    {
      id: "match_js_10",
      track: "JavaScript",
      term: "Strict Mode",
      definition: "A feature that opts code into a restricted variant of JavaScript, helping catch common errors."
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
    {
      id: "match_react_07",
      track: "React.js",
      term: "useRef",
      definition: "A hook that returns a mutable object whose '.current' property persists across renders without causing re-renders."
    },
    {
      id: "match_react_08",
      track: "React.js",
      term: "useCallback",
      definition: "A hook that returns a memoized version of a callback function to prevent unnecessary child renders."
    },
    {
      id: "match_react_09",
      track: "React.js",
      term: "HOC",
      definition: "A higher-order component that takes a component and returns a new enhanced component."
    },
    {
      id: "match_react_10",
      track: "React.js",
      term: "Fragments",
      definition: "A feature to group a list of children without adding extra nodes to the DOM."
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
    {
      id: "match_node_07",
      track: "Node.js",
      term: "Cluster",
      definition: "A module that allows easy creation of child processes that share server ports to handle load."
    },
    {
      id: "match_node_08",
      track: "Node.js",
      term: "Package.json",
      definition: "A metadata file that manages project dependencies, scripts, and version info."
    },
    {
      id: "match_node_09",
      track: "Node.js",
      term: "REPL",
      definition: "An interactive computer environment that takes single user inputs, evaluates them, and returns results."
    },
    {
      id: "match_node_10",
      track: "Node.js",
      term: "Event-Driven",
      definition: "An architecture pattern where flow is determined by events such as user actions or sensor outputs."
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
    },
    {
      id: "match_mongo_07",
      track: "MongoDB",
      term: "Replica Set",
      definition: "A group of MongoDB processes that maintain the same data set, providing redundancy and high availability."
    },
    {
      id: "match_mongo_08",
      track: "MongoDB",
      term: "Sharding",
      definition: "A method for distributing data across multiple machines to support very large datasets."
    },
    {
      id: "match_mongo_09",
      track: "MongoDB",
      term: "GridFS",
      definition: "A specification for storing and retrieving large files that exceed the BSON-document size limit of 16MB."
    },
    {
      id: "match_mongo_10",
      track: "MongoDB",
      term: "ObjectId",
      definition: "A 12-byte identifier used by MongoDB to uniquely identify documents within a collection."
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
    }
  ],
  fillin: [
    // Python Fill-in
    {
      id: "fillin_py_01",
      lang: "Python",
      title: "For Loop Range",
      code: "for i ____ range(5):\n    print(i)",
      blanks: [
        {
          placeholder: "____",
          options: ["in", "on", "at", "through"],
          answer: "in"
        }
      ],
      hint: "Iterates from 0 to 4 using a helper function."
    },
    {
      id: "fillin_py_02",
      lang: "Python",
      title: "Define Function",
      code: "____ greet(name):\n    return f\"Hello {name}\"",
      blanks: [
        {
          placeholder: "____",
          options: ["def", "function", "func", "define"],
          answer: "def"
        }
      ],
      hint: "Keyword to declare a functional block in Python."
    },
    {
      id: "fillin_py_03",
      lang: "Python",
      title: "List Comprehension",
      code: "squares = [x**2 ____ x ____ numbers]",
      blanks: [
        {
          placeholder: "____",
          options: ["for", "in", "each", "with"],
          answer: "for"
        },
        {
          placeholder: "____2",
          options: ["in", "of", "from", "at"],
          answer: "in"
        }
      ],
      hint: "Creates a new list using inline iteration."
    },
    {
      id: "fillin_py_04",
      lang: "Python",
      title: "Class Definition",
      code: "____ Dog(Animal):\n    def __init__(self): pass",
      blanks: [
        {
          placeholder: "____",
          options: ["class", "struct", "object", "type"],
          answer: "class"
        }
      ],
      hint: "Declares object blueprint structures."
    },
    {
      id: "fillin_py_05",
      lang: "Python",
      title: "File Context Manager",
      code: "____ open('data.txt') ____ f:\n    content = f.read()",
      blanks: [
        {
          placeholder: "____",
          options: ["with", "using", "open", "try"],
          answer: "with"
        },
        {
          placeholder: "____2",
          options: ["as", "into", "to", "for"],
          answer: "as"
        }
      ],
      hint: "Ensures proper cleanups of resource file streams."
    },
    // JavaScript Fill-in
    {
      id: "fillin_js_01",
      lang: "JavaScript",
      title: "Array Mapping",
      code: "const squares = arr.____(x => x * x);",
      blanks: [
        {
          placeholder: "____",
          options: ["map", "forEach", "filter", "reduce"],
          answer: "map"
        }
      ],
      hint: "Transforms every element in an array and returns the new array."
    },
    {
      id: "fillin_js_02",
      lang: "JavaScript",
      title: "Asynchronous Operations",
      code: "____ function getData() {\n  const res = ____ fetch('/api');\n}",
      blanks: [
        {
          placeholder: "____",
          options: ["async", "await", "promise", "defer"],
          answer: "async"
        },
        {
          placeholder: "____2",
          options: ["await", "async", "then", "yield"],
          answer: "await"
        }
      ],
      hint: "Enables promise syntax to look like synchronous code blocks."
    },
    {
      id: "fillin_js_03",
      lang: "JavaScript",
      title: "Variable Declaration",
      code: "____ { name, age } = user;",
      blanks: [
        {
          placeholder: "____",
          options: ["const", "let", "var", "function"],
          answer: "const"
        }
      ],
      hint: "Extracts fields directly using Object destructuring syntax."
    },
    {
      id: "fillin_js_04",
      lang: "JavaScript",
      title: "Lexical Closure",
      code: "function make() {\n  let count = 0;\n  ____ ____() {\n    count++;\n  };\n}",
      blanks: [
        {
          placeholder: "____",
          options: ["return", "export", "yield", "break"],
          answer: "return"
        },
        {
          placeholder: "____2",
          options: ["function", "const", "class", "arrow"],
          answer: "function"
        }
      ],
      hint: "Returns an inner function encapsulating the lexical state."
    },
    {
      id: "fillin_js_05",
      lang: "JavaScript",
      title: "Object Keys Iterator",
      code: "____.____(user).forEach(k => console.log(k));",
      blanks: [
        {
          placeholder: "____",
          options: ["Object", "Array", "JSON", "Reflect"],
          answer: "Object"
        },
        {
          placeholder: "____2",
          options: ["keys", "values", "entries", "getOwnPropertyNames"],
          answer: "keys"
        }
      ],
      hint: "Extracts an array of enumerable keys directly from an object."
    },
    // SQL Fill-in
    {
      id: "fillin_sql_01",
      lang: "SQL",
      title: "Select Statement",
      code: "____ * ____ users ____ age > 18;",
      blanks: [
        {
          placeholder: "____",
          options: ["SELECT", "GET", "FETCH", "SHOW"],
          answer: "SELECT"
        },
        {
          placeholder: "____2",
          options: ["FROM", "IN", "ON", "UNDER"],
          answer: "FROM"
        },
        {
          placeholder: "____3",
          options: ["WHERE", "HAVING", "GROUP", "ORDER"],
          answer: "WHERE"
        }
      ],
      hint: "Retrieves filtered records matching criteria."
    },
    {
      id: "fillin_sql_02",
      lang: "SQL",
      title: "Group By Aggregate",
      code: "SELECT count(*), role FROM users ____ ____ role;",
      blanks: [
        {
          placeholder: "____",
          options: ["GROUP", "ORDER", "SORT", "FILTER"],
          answer: "GROUP"
        },
        {
          placeholder: "____2",
          options: ["BY", "ON", "FOR", "WITH"],
          answer: "BY"
        }
      ],
      hint: "Aggregates matching rows matching category key."
    },
    {
      id: "fillin_sql_03",
      lang: "SQL",
      title: "Inner Join",
      code: "SELECT * FROM orders a ____ ____ customers b ____ a.cid = b.id;",
      blanks: [
        {
          placeholder: "____",
          options: ["INNER", "LEFT", "RIGHT", "OUTER"],
          answer: "INNER"
        },
        {
          placeholder: "____2",
          options: ["JOIN", "UNION", "MERGE", "LINK"],
          answer: "JOIN"
        },
        {
          placeholder: "____3",
          options: ["ON", "USING", "WHERE", "AND"],
          answer: "ON"
        }
      ],
      hint: "Retrieves matching rows found in both reference tables."
    },
    {
      id: "fillin_sql_04",
      lang: "SQL",
      title: "Update Query",
      code: "____ users ____ status = 'active' WHERE id = 5;",
      blanks: [
        {
          placeholder: "____",
          options: ["UPDATE", "SET", "ALTER", "INSERT"],
          answer: "UPDATE"
        },
        {
          placeholder: "____2",
          options: ["SET", "TO", "UPDATE", "WITH"],
          answer: "SET"
        }
      ],
      hint: "Modifies attributes inside existing table rows."
    },
    {
      id: "fillin_sql_05",
      lang: "SQL",
      title: "Insert Statement",
      code: "____ users (name) ____ ('Alice');",
      blanks: [
        {
          placeholder: "____",
          options: ["INSERT INTO", "ADD TO", "APPEND", "INSERT"],
          answer: "INSERT INTO"
        },
        {
          placeholder: "____2",
          options: ["VALUES", "VALUE", "SET", "DATA"],
          answer: "VALUES"
        }
      ],
      hint: "Adds new rows to tables."
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
    debug: [],
    fillin: []
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

  // 4. Parse Fillin Sheet
  if (workbook.Sheets["Fillin"]) {
    const sheet = workbook.Sheets["Fillin"];
    const rows = xlsx.utils.sheet_to_json(sheet);
    rows.forEach((row, i) => {
      if (!row.id || !row.lang || !row.title || !row.code) {
        console.warn(`[WARNING] Fillin Sheet Row ${i + 2}: Missing required fields. Skipping.`);
        return;
      }
      let blanks = [];
      try {
        blanks = row.blanks ? JSON.parse(row.blanks) : [];
      } catch (e) {
        blanks = [{
          placeholder: "____",
          options: [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean),
          answer: row.answer
        }];
      }
      parsedData.fillin.push({
        id: String(row.id).trim(),
        lang: String(row.lang).trim(),
        title: String(row.title).trim(),
        code: String(row.code).replace(/\r\n/g, "\n").trim(),
        blanks: blanks,
        hint: row.hint ? String(row.hint).trim() : ""
      });
    });
  } else {
    console.warn("[WARNING] 'Fillin' sheet not found in the workbook.");
  }

  // Double check if any sheet was populated. If workbook sheet names existed but are empty, use fallbacks for empty arrays
  if (parsedData.quiz.length === 0 && parsedData.match.length === 0 && parsedData.debug.length === 0 && parsedData.fillin.length === 0) {
    console.log("Workbook sheets found but they contained no valid rows. Using fallback content instead.");
    Object.assign(parsedData, fallbackContent);
  } else {
    // Fill in any completely missing sheets with their fallback equivalents
    if (parsedData.quiz.length === 0) parsedData.quiz = fallbackContent.quiz;
    if (parsedData.match.length === 0) parsedData.match = fallbackContent.match;
    if (parsedData.debug.length === 0) parsedData.debug = fallbackContent.debug;
    if (parsedData.fillin.length === 0) parsedData.fillin = fallbackContent.fillin;
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parsedData, null, 2), "utf8");
  console.log(`Successfully parsed Excel and saved content to "${OUTPUT_PATH}".`);
  console.log(`Summary: ${parsedData.quiz.length} quizzes, ${parsedData.match.length} matching pairs, ${parsedData.debug.length} debug snippets, ${parsedData.fillin.length} fillin questions.`);
} catch (error) {
  console.error("Error parsing Excel workbook:", error);
  console.log("Falling back to writing default content to prevent build failures.");
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fallbackContent, null, 2), "utf8");
}
