"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Suspense boundary for loading skeleton. */
export default function NewGamePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="h-8 bg-surface-raised border border-surface-border animate-pulse mb-4 w-48" />
          <div className="h-4 bg-surface-raised border border-surface-border animate-pulse mb-8 w-72" />
          <div className="space-y-6">
            <div className="h-20 bg-surface-raised border border-surface-border animate-pulse" />
            <div className="h-12 bg-surface-raised border border-surface-border animate-pulse" />
          </div>
        </div>
      }
    >
      <NewGamePage />
    </Suspense>
  );
}

function NewGamePage() {
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

      if (!res.ok) {
        let detail = "";
        try {
          const body = await res.json();
          detail = body.error || body.message || "";
        } catch {
          // not JSON
        }
        throw new Error(
          detail || `Server returned ${res.status}. Please try again.`
        );
      }

      const data = await res.json();
      router.push(`/g/${data.token}`);
    } catch (e: any) {
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        setError("Cannot reach the server. Check your connection and try again.");
      } else {
        setError(e.message ?? "Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-16">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-phosphor text-glow mb-2">
        NEW MISSION
      </h1>
      <p className="text-phosphor-muted mb-8 font-mono text-sm">
        &gt; Choose your side and create an invite link to share.
      </p>

      {/* Color preference */}
      <div className="mb-8">
        <label className="block text-sm font-mono text-phosphor-muted mb-2">
          //&gt; Play as
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setColorPref("white")}
            className={`option-btn ${colorPref === "white" ? "selected" : ""}`}
          >
            [W] WHITE
          </button>
          <button
            onClick={() => setColorPref("random")}
            className={`option-btn ${colorPref === "random" ? "selected" : ""}`}
          >
            [?] RANDOM
          </button>
          <button
            onClick={() => setColorPref("black")}
            className={`option-btn ${colorPref === "black" ? "selected" : ""}`}
          >
            [B] BLACK
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-danger/30 text-danger text-sm font-mono"
          style={{ background: "rgba(255,51,51,0.08)" }}>
          [ERROR] {error}
        </div>
      )}

      <button
        onClick={createGame}
        disabled={loading}
        className="btn-primary w-full text-center"
      >
        {loading ? "INITIALIZING..." : "> EXECUTE"}
      </button>

      <p className="text-xs text-phosphor-muted text-center leading-relaxed mt-4 font-mono">
        // You&apos;ll get a unique link to share. Your friend opens it and the game starts automatically.
      </p>
    </div>
  );
}
