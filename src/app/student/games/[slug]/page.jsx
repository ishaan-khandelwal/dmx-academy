"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { gamesRegistry } from "@/lib/games/registry";

export default function GamePageWrapper() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const [savedProgress, setSavedProgress] = useState(null);

  // Find game definition from registry
  const game = gamesRegistry.find(g => g.slug === slug);

  // Load progress on mount
  useEffect(() => {
    if (typeof window !== "undefined" && slug) {
      const stored = localStorage.getItem(`game_progress_${slug}`);
      if (stored) {
        try {
          setSavedProgress(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse progress details:", e);
        }
      }
    }
  }, [slug]);

  // Callback to persist progress updates
  const handleProgressChange = (newProgress) => {
    if (typeof window !== "undefined" && slug) {
      localStorage.setItem(`game_progress_${slug}`, JSON.stringify(newProgress));
      setSavedProgress(newProgress);
    }
  };

  if (!game) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center text-[#E8E6E1] bg-[#12141C] p-6 rounded-3xl border border-[#2A2D3D]">
        <AlertCircle size={40} className="text-[#FF6B6B]" />
        <h2 className="text-lg font-bold text-white">Game Quad Not Found</h2>
        <p className="text-xs text-[#6B7080]">The interactive challenge you are looking for does not exist in our grid.</p>
        <button
          onClick={() => router.push("/student/games")}
          className="px-4 py-2 text-xs font-bold text-[#12141C] bg-[#7CFFB2] rounded-xl cursor-pointer"
        >
          Back to Games Hub
        </button>
      </div>
    );
  }

  if (game.status !== "live") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center text-[#E8E6E1] bg-[#12141C] p-6 rounded-3xl border border-[#2A2D3D]">
        <AlertCircle size={40} className="text-[#FFB86B]" />
        <h2 className="text-lg font-bold text-white">{game.title} is Offline</h2>
        <p className="text-xs text-[#6B7080]">This level quadrant is currently locked by the Dojo Masters. Check back soon!</p>
        <button
          onClick={() => router.push("/student/games")}
          className="px-4 py-2 text-xs font-bold text-[#12141C] bg-[#7CFFB2] rounded-xl cursor-pointer"
        >
          Back to Games Hub
        </button>
      </div>
    );
  }

  const GameComponent = game.component;

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-[#190C2F] via-[#0E061E] to-[#04010A] overflow-y-auto p-4 md:p-8 text-[#E8E6E1] select-none">
      {/* Immersive Space Ambient Glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Back to Hub Nav */}
        <button
          onClick={() => router.push("/student/games")}
          className="flex items-center space-x-2 px-4 py-2 rounded-full border border-purple-500/20 bg-purple-950/25 text-[#D8B4FE] hover:text-white hover:border-purple-500/40 hover:bg-purple-950/40 hover:scale-102 transition-all cursor-pointer text-xs font-bold font-mono shadow-sm w-fit"
        >
          <ArrowLeft size={14} className="mr-0.5" />
          <span>Exit to Arcade Lobby</span>
        </button>

        {/* Render selected live game component */}
        <GameComponent 
          onProgressChange={handleProgressChange} 
          savedProgress={savedProgress} 
        />
      </div>
    </div>
  );
}
