// Synapse Academy Contest Registry Data
import { practiceProblems } from "./practiceProblems";

export const contests = [
  {
    id: "speedrun-01",
    title: "Synapse Web & Algorithm Speedrun #01",
    desc: "Test your skills in coding performance and core virtual DOM rendering mechanics in this weekly speed challenge.",
    durationMins: 30,
    totalPoints: 300,
    status: "active",
    category: "Algorithms & Frontend",
    timeLeftStr: "24m:15s",
    startTime: "Started 15 mins ago",
    problems: [
      {
        ...practiceProblems.find(p => p.id === "two-sum"),
        points: 100
      },
      {
        ...practiceProblems.find(p => p.id === "vdom-diff"),
        points: 200
      }
    ],
    leaderboard: [
      { rank: 1, username: "lex_dev", score: 300, time: "11m 45s", isUser: false },
      { rank: 2, username: "quantum_coder", score: 300, time: "14m 20s", isUser: false },
      { rank: 3, username: "pixel_architect", score: 100, time: "05m 10s", isUser: false },
      { rank: 4, username: "security_guru", score: 100, time: "08m 32s", isUser: false },
      { rank: 5, username: "react_fanatic", score: 100, time: "09m 11s", isUser: false }
    ]
  },
  {
    id: "security-cup",
    title: "Distributed Security & Systems Cup",
    desc: "A rigorous system architecture and API security design contest focusing on rate limiters, token authorization, and network attacks defense.",
    durationMins: 60,
    totalPoints: 400,
    status: "upcoming",
    category: "System Design & Security",
    timeLeftStr: "Starts in 2h 15m",
    startTime: "Starts at 8:00 PM Local Time",
    problems: [
      {
        ...practiceProblems.find(p => p.id === "auth-vs-auth"),
        points: 100
      },
      {
        ...practiceProblems.find(p => p.id === "rate-limiter"),
        points: 300
      }
    ],
    leaderboard: [] // No submissions yet
  },
  {
    id: "hackathon-04",
    title: "Synapse Monthly Hackathon #04",
    desc: "Our premium monthly marathon challenge exploring distributed services rate limits, array optimizations, and reconciliation trees.",
    durationMins: 90,
    totalPoints: 600,
    status: "past",
    category: "Full Stack Mastery",
    timeLeftStr: "Completed 2 days ago",
    startTime: "June 14, 2026",
    problems: [
      {
        ...practiceProblems.find(p => p.id === "two-sum"),
        points: 100
      },
      {
        ...practiceProblems.find(p => p.id === "vdom-diff"),
        points: 200
      },
      {
        ...practiceProblems.find(p => p.id === "rate-limiter"),
        points: 300
      }
    ],
    leaderboard: [
      { rank: 1, username: "quantum_coder", score: 600, time: "42m 10s", isUser: false },
      { rank: 2, username: "lex_dev", score: 600, time: "49m 55s", isUser: false },
      { rank: 3, username: "byte_knight", score: 600, time: "58m 12s", isUser: false },
      { rank: 4, username: "tech_nomad", score: 300, time: "25m 40s", isUser: false },
      { rank: 5, username: "node_wizard", score: 300, time: "29m 05s", isUser: false }
    ]
  }
];
