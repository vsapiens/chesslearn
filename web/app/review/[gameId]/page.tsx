"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { MoveList } from "@/components/MoveList";
import { ReviewPanel } from "@/components/ReviewPanel";
import { getGame, getAnalysis, triggerAnalysis, AnalysisResponse, GameResponse } from "@/lib/api";

const MAX_POLLS = 30;

export default function ReviewPage() {
  const { gameId } = useParams<{ gameId: string }>();

  const [game, setGame] = useState<GameResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [viewFen, setViewFen] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string>("");
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    let polls = 0;

    async function load() {
      try {
        setLoadError("");
        setAnalysisError("");

        let g: GameResponse;
        try {
          g = await getGame(gameId);
        } catch (err: any) {
          if (!cancelled) {
            setLoadError(err.message || "Failed to load game data.");
          }
          return;
        }

        if (cancelled) return;

        setGame(g);
        setViewFen(g.currentFen);
        setCurrentPly(g.moves.length);

        // Trigger analysis — may fail if server is down, that's okay
        try {
          await triggerAnalysis(g.gameId);
        } catch (err: any) {
          if (!cancelled) {
            setAnalysisError(err.message || "Failed to start analysis.");
          }
          return;
        }

        // Poll for analysis results
        const poll = async (): Promise<void> => {
          if (cancelled) return;

          try {
            const a = await getAnalysis(g.gameId);
            if (cancelled) return;
            setAnalysis(a);
            setAnalysisError("");

            if (a.status === "ready") return;

            polls += 1;
            if (polls >= MAX_POLLS) {
              setAnalysisTimedOut(true);
              return;
            }

            pollTimer = setTimeout(poll, 2000);
          } catch (err: any) {
            if (cancelled) return;
            polls += 1;
            if (polls >= MAX_POLLS) {
              setAnalysisTimedOut(true);
              setAnalysisError(err.message || "Analysis polling failed.");
              return;
            }
            // Retry — but log for debugging
            console.warn("[Review] Poll error, retrying:", err.message);
            pollTimer = setTimeout(poll, 2000);
          }
        };

        poll();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [gameId, retryCount]);

  async function retryAnalysis() {
    if (!game) return;
    setAnalysisTimedOut(false);
    setAnalysis(null);
    setAnalysisError("");
    try {
      await triggerAnalysis(game.gameId);
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to restart analysis.");
      return;
    }
    setRetryCount((c) => c + 1);
  }

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
      <div className="flex items-center justify-center h-64 text-phosphor-muted font-mono animate-data-stream">
        &gt; Loading game data...
      </div>
    );
  }

  // Game load error — show specific error with retry
  if (loadError || !game) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="panel border-danger/30 mb-6">
          <p className="text-danger font-mono text-sm mb-1">[ERROR]</p>
          <p className="text-phosphor-dim font-mono text-sm">
            {loadError || "Game not found. It may have expired or the link is invalid."}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => { setLoading(true); setLoadError(""); setRetryCount((c) => c + 1); }}
            className="btn-primary"
          >
            &gt; RETRY
          </button>
          <a href="/play/new" className="btn-secondary">
            &gt; NEW GAME
          </a>
        </div>
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
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-phosphor text-glow">
          // POST-GAME ANALYSIS
        </h1>
        <div className="flex items-center gap-3 font-mono">
          {game.result && (
            <span className="text-sm text-phosphor-dim">
              RESULT: {game.result === "draw"
                ? "DRAW"
                : `${game.result.toUpperCase()} WINS`}
              {game.resultReason ? ` [${game.resultReason.replace("_", " ").toUpperCase()}]` : ""}
            </span>
          )}
          <a
            href={`/g/${game.token}`}
            className="text-sm text-phosphor hover:text-glow transition-all"
          >
            &gt; BACK
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
            <NavBtn onClick={() => goToPly(0)} label="|<" disabled={currentPly === 0} />
            <NavBtn
              onClick={() => goToPly(Math.max(0, currentPly - 1))}
              label="<"
              disabled={currentPly === 0}
            />
            <span className="text-xs text-phosphor-muted min-w-[60px] text-center font-mono">
              {currentPly === 0 ? "START" : `PLY ${currentPly}`}
            </span>
            <NavBtn
              onClick={() => goToPly(Math.min(game.moves.length, currentPly + 1))}
              label=">"
              disabled={currentPly >= game.moves.length}
            />
            <NavBtn
              onClick={() => goToPly(game.moves.length)}
              label=">|"
              disabled={currentPly >= game.moves.length}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Move list */}
          <div className="panel">
            <h3 className="text-xs font-mono text-phosphor-muted uppercase tracking-wider mb-3">
              // MOVE LOG
            </h3>
            <MoveList
              moves={game.moves}
              currentPly={currentPly}
              onSelectPly={goToPly}
            />
          </div>

          {/* Analysis panel */}
          <div className="panel">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono text-phosphor-muted uppercase tracking-wider">
                // ENGINE ANALYSIS
              </h3>
              {analysis?.status === "processing" && !analysisTimedOut && (
                <span className="text-xs text-amber font-mono animate-data-stream">
                  PROCESSING...
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
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-danger font-mono text-xs mb-1">[TIMEOUT]</p>
                <p className="text-sm text-phosphor-dim font-mono">
                  {analysisError || "Analysis timed out. The engine may still be processing."}
                </p>
                <button
                  onClick={retryAnalysis}
                  className="btn-primary"
                >
                  &gt; RETRY ANALYSIS
                </button>
              </div>
            ) : analysisError ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-danger font-mono text-xs mb-1">[ANALYSIS ERROR]</p>
                <p className="text-sm text-phosphor-dim font-mono">{analysisError}</p>
                <button
                  onClick={retryAnalysis}
                  className="btn-primary"
                >
                  &gt; RETRY ANALYSIS
                </button>
              </div>
            ) : analysis?.status === "processing" ? (
              <div className="text-sm text-phosphor-muted py-4 text-center font-mono">
                &gt; Engine processing game data...
                <div className="mt-2 text-xs text-phosphor-muted/50">
                  This may take up to 60 seconds.
                </div>
              </div>
            ) : (
              <div className="text-sm text-phosphor-muted py-4 text-center font-mono">
                &gt; Waiting for analysis to begin...
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
      className="px-3 py-2 sm:px-2 sm:py-1 min-w-touch min-h-touch sm:min-w-0 sm:min-h-0 panel hover:bg-phosphor-glow10 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-phosphor-dim transition-colors font-mono flex items-center justify-center"
    >
      {label}
    </button>
  );
}
