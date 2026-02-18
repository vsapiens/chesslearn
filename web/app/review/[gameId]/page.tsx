"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { MoveList } from "@/components/MoveList";
import { ReviewPanel } from "@/components/ReviewPanel";
import { getGame, getAnalysis, triggerAnalysis, AnalysisResponse, GameResponse } from "@/lib/api";

const MAX_POLLS = 30; // ~60s at 2s intervals

export default function ReviewPage() {
  const { gameId } = useParams<{ gameId: string }>();

  const [game, setGame] = useState<GameResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [viewFen, setViewFen] = useState<string>("");
  const [loading, setLoading] = useState(true);
  // S5: polling timeout state
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Load game + trigger analysis
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    let polls = 0; // S5: track in ref-like closure var to avoid stale state

    async function load() {
      try {
        const g = await getGame(gameId).catch(() => null);
        if (!g || cancelled) return;

        setGame(g);
        setViewFen(g.currentFen);
        setCurrentPly(g.moves.length);

        // Trigger analysis (non-blocking — server returns 202 if already processing)
        await triggerAnalysis(g.gameId);

        // S5: poll with timeout
        const poll = async (): Promise<void> => {
          if (cancelled) return;

          try {
            const a = await getAnalysis(g.gameId);
            if (cancelled) return;
            setAnalysis(a);

            if (a.status === "ready") return; // done

            polls += 1;
            if (polls >= MAX_POLLS) {
              setAnalysisTimedOut(true); // S5: show timeout UI
              return;
            }

            pollTimer = setTimeout(poll, 2000);
          } catch {
            if (cancelled) return;
            polls += 1;
            if (polls >= MAX_POLLS) {
              setAnalysisTimedOut(true);
              return;
            }
            pollTimer = setTimeout(poll, 2000);
          }
        };

        poll();
      } catch (err) {
        console.error("[Review]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [gameId, retryCount]); // S5: retryCount causes effect to re-run on retry

  // S5: retry handler — re-triggers analysis + resets timeout state
  async function retryAnalysis() {
    if (!game) return;
    setAnalysisTimedOut(false);
    setAnalysis(null);
    await triggerAnalysis(game.gameId);
    setRetryCount((c) => c + 1);
  }

  // Navigate to a ply
  function goToPly(ply: number) {
    if (!game) return;
    setCurrentPly(ply);

    if (ply === 0) {
      setViewFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      return;
    }

    const move = game.moves.find((m) => m.ply === ply);
    if (move) setViewFen(move.fenAfter);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading game…
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Game not found.
      </div>
    );
  }

  const lastMove = currentPly > 0
    ? (() => {
        const m = game.moves.find((mv) => mv.ply === currentPly);
        if (!m) return null;
        return { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4) };
      })()
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Game Review</h1>
        <div className="flex items-center gap-3">
          {game.result && (
            <span className="text-sm text-zinc-400">
              {game.result === "draw"
                ? "Draw"
                : `${capitalize(game.result)} won`}
              {game.resultReason ? ` (${game.resultReason.replace("_", " ")})` : ""}
            </span>
          )}
          <a
            href={`/g/${game.token}`}
            className="text-sm text-amber-400 hover:underline"
          >
            Back to game
          </a>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Board */}
        <div className="flex flex-col items-center gap-3">
          <GameBoard
            fen={viewFen || game.currentFen}
            orientation="white"
            interactive={false}
            lastMove={lastMove}
          />

          {/* Navigation controls */}
          <div className="flex gap-2 items-center">
            <NavBtn onClick={() => goToPly(0)} label="|◀" disabled={currentPly === 0} />
            <NavBtn
              onClick={() => goToPly(Math.max(0, currentPly - 1))}
              label="◀"
              disabled={currentPly === 0}
            />
            <span className="text-xs text-zinc-500 min-w-[60px] text-center">
              {currentPly === 0 ? "Start" : `Move ${currentPly}`}
            </span>
            <NavBtn
              onClick={() => goToPly(Math.min(game.moves.length, currentPly + 1))}
              label="▶"
              disabled={currentPly >= game.moves.length}
            />
            <NavBtn
              onClick={() => goToPly(game.moves.length)}
              label="▶|"
              disabled={currentPly >= game.moves.length}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Move list */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Moves
            </h3>
            <MoveList
              moves={game.moves}
              currentPly={currentPly}
              onSelectPly={goToPly}
            />
          </div>

          {/* Analysis panel */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Analysis
              </h3>
              {analysis?.status === "processing" && !analysisTimedOut && (
                <span className="text-xs text-amber-400 animate-pulse">
                  Analyzing…
                </span>
              )}
            </div>

            {analysis?.status === "ready" ? (
              <ReviewPanel
                summary={analysis.summary}
                positions={analysis.positions ?? []}
                keyMoments={analysis.keyMoments ?? []}
                moves={game.moves}
                onSelectPly={goToPly}
                currentPly={currentPly}
              />
            ) : analysisTimedOut ? (
              /* S5: Timeout state with retry */
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-zinc-400">
                  Analysis timed out. The engine may still be processing.
                </p>
                <button
                  onClick={retryAnalysis}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : analysis?.status === "processing" ? (
              <div className="text-sm text-zinc-500 py-4 text-center">
                Engine is analyzing the game…
                <div className="mt-2 text-xs text-zinc-600">
                  This may take up to 60 seconds.
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500 py-4 text-center">
                Analysis not available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-700 rounded text-xs text-zinc-300 transition-colors font-mono"
    >
      {label}
    </button>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
