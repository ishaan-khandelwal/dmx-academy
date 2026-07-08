import FlexDojo from "@/components/games/FlexDojo";
import DebugTheBug from "@/components/games/DebugTheBug";
import TypeRacer from "@/components/games/TypeRacer";
import CodeFillIn from "@/components/games/CodeFillIn";
import SqlDojo from "@/components/games/SqlDojo";
import QuizBlitz from "@/components/games/QuizBlitz";
import CodeMatch from "@/components/games/CodeMatch";

export const gamesRegistry = [
  {
    slug: "quiz-blitz",
    title: "Quiz Blitz",
    track: "Arcade",
    difficulty: "Beginner",
    description: "Fast-paced timed multiple-choice questions. Pick your subject track, maintain your streak multiplier, and beat the ticking countdown!",
    estimatedMinutes: 10,
    component: QuizBlitz,
    status: "live",
    totalLevels: 10
  },
  {
    slug: "code-match",
    title: "Code Match",
    track: "Arcade",
    difficulty: "Intermediate",
    description: "Test your memory and code vocabulary! Match terminology blocks with their correct definition in a neon memory-flip card grid.",
    estimatedMinutes: 8,
    component: CodeMatch,
    status: "live",
    totalLevels: 6
  },
  {
    slug: "flex-dojo",
    title: "Flex Dojo",
    track: "CSS & Layout",
    difficulty: "Beginner",
    description: "Master CSS Flexbox positioning with visual grid puzzles. Align elements to their ghost targets using flex attributes.",
    estimatedMinutes: 15,
    component: FlexDojo,
    status: "live"
  },
  {
    slug: "debug-the-bug",
    title: "Debug the Bug",
    track: "React & JS",
    difficulty: "Intermediate",
    description: "Identify and repair syntax, logic, and runtime errors in JavaScript, Python, and SQL modules inside an interactive IDE workspace.",
    estimatedMinutes: 20,
    component: DebugTheBug,
    status: "live"
  },
  {
    slug: "type-racer",
    title: "TypeRacer Pro",
    track: "Python & JS Syntax",
    difficulty: "Beginner",
    description: "Race against yourself typing real Python and JavaScript code snippets. Track WPM, accuracy, and unlock progressively complex levels.",
    estimatedMinutes: 10,
    component: TypeRacer,
    status: "live",
    totalLevels: 10,
  },
  {
    slug: "code-fill-in",
    title: "Code Fill-In",
    track: "Multi-Language",
    difficulty: "Beginner",
    description: "Fill in the missing keyword or operator from 4 choices across Python, JavaScript, and SQL. Speed bonuses reward fast correct answers.",
    estimatedMinutes: 15,
    component: CodeFillIn,
    status: "live",
    totalLevels: 15,
  },
  {
    slug: "sql-dojo",
    title: "SQL Dojo",
    track: "SQL & Databases",
    difficulty: "Intermediate",
    description: "Write real SQL queries against live in-browser datasets. Solve 10 progressive challenges from SELECT to subqueries — no backend needed.",
    estimatedMinutes: 20,
    component: SqlDojo,
    status: "live",
    totalLevels: 10,
  },
  {
    slug: "api-quest",
    title: "API Quest",
    track: "APIs & Backend",
    difficulty: "Intermediate",
    description: "Build REST endpoints step by step. Get live request-response verification on custom HTTP methods, params, and response codes.",
    estimatedMinutes: 25,
    status: "coming-soon"
  },
  {
    slug: "shader-duel",
    title: "Shader Duel",
    track: "WebGL & Motion",
    difficulty: "Advanced",
    description: "Match complex animation curves and canvas shapes by writing custom GLSL fragment shaders.",
    estimatedMinutes: 30,
    status: "coming-soon"
  }
];
