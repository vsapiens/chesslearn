"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function NewGamePage() {
  const router = useRouter();

  const [colorPref, setColorPref] = useState<"white" | "black" | "random">("random");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createGame() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorPreference: colorPref,
        }),
      });

      if (!res.ok) throw new Error("Failed to create game");

      const data = await res.json();
      router.push(`/g/${data.token}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-20">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          New Game
        </h1>
        <p className="text-zinc-400 text-sm">
          Choose your side and create an invite link to share with a friend.
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
        {/* Color preference */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Play as
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["white", "random", "black"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setColorPref(c)}
                className={`py-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1.5 ${
                  colorPref === c
                    ? "border-amber-400 bg-amber-400/10 text-amber-400 shadow-sm shadow-amber-500/10"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className="text-xl">
                  {c === "white" ? "\u2659" : c === "black" ? "\u265F" : "\u2696"}
                </span>
                <span>{c === "white" ? "White" : c === "black" ? "Black" : "Random"}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={createGame}
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors text-base"
        >
          {loading ? "Creating game\u2026" : "Create Game & Get Link"}
        </button>

        <p className="text-xs text-zinc-500 text-center leading-relaxed">
          You'll get a unique link to share. Your friend opens it and the game starts automatically.
        </p>
      </div>
    </div>
  );
}
