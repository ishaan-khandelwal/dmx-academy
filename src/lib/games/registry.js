import FlexDojo from "@/components/games/FlexDojo";
import DebugTheBug from "@/components/games/DebugTheBug";

export const gamesRegistry = [
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
