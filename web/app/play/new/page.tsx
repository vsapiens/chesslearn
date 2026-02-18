"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function NewGamePage() {
  const params = useSearchParams();
  const router = useRouter();

  const [mode, setMode] = useState<"human" | "bot">(
    (params.get("mode") as "human" | "bot") ?? "human"
  );
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [colorPref, setColorPref] = useState<"white" | "black" | "random">("random");
  const [timeControl, setTimeControl] = useState<string>("");
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
          mode,
          botDifficulty: mode === "bot" ? botDifficulty : undefined,
          colorPreference: colorPref,
          timeControl: timeControl || undefined,
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
    <div className="max-w-lg mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">New Game</h1>
      <p className="text-zinc-400 mb-8">Configure your game settings below.</p>

      {/* Mode selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Game Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["human", "bot"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                mode === m
                  ? "border-amber-400 bg-amber-400/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {m === "human" ? "🔗 vs Friend (Link)" : "🤖 vs Bot"}
            </button>
          ))}
        </div>
      </div>

      {/* Bot difficulty */}
      {mode === "bot" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Bot Difficulty
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setBotDifficulty(d)}
                className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                  botDifficulty === d
                    ? "border-sky-400 bg-sky-400/10 text-sky-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color preference */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Play as
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(["white", "random", "black"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setColorPref(c)}
              className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                colorPref === c
                  ? "border-amber-400 bg-amber-400/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {c === "white" ? "⬜ White" : c === "black" ? "⬛ Black" : "🎲 Random"}
            </button>
          ))}
        </div>
      </div>

      {/* Time control (optional) */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Time Control <span className="text-zinc-500">(optional)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {["", "3+0", "5+0", "10+0"].map((tc) => (
            <button
              key={tc || "none"}
              onClick={() => setTimeControl(tc)}
              className={`px-3 py-1.5 rounded border text-sm transition-all ${
                timeControl === tc
                  ? "border-amber-400 bg-amber-400/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {tc || "None"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={createGame}
        disabled={loading}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
      >
        {loading ? "Creating game…" : "Create Game"}
      </button>
    </div>
  );
}
