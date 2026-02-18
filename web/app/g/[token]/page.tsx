"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { GameBoard } from "@/components/GameBoard";
import { MoveList } from "@/components/MoveList";
import { GameSocket, ServerEvent, Move } from "@/lib/socket";

const GUEST_ID_KEY = "chess_guest_id";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// S6: localStorage guard — safe in SSR and private browsing
function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing or localStorage blocked — use in-memory ID for this tab
    return Math.random().toString(36).slice(2, 12);
  }
}

type GameStatus = "waiting" | "active" | "finished";

interface GameState {
  gameId: string;
  fen: string;
  moves: Move[];
  status: GameStatus;
  result?: string;
  resultReason?: string;
  color: string;
  mode: string;
  botDifficulty?: string;
}

export default function GameRoomPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const socketRef = useRef<GameSocket | null>(null);

  const [game, setGame] = useState<GameState | null>(null);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [copyDone, setCopyDone] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [wsConnecting, setWsConnecting] = useState(true); // S4: track WS state

  // S3: trigger analysis as soon as game ends
  const triggerAnalysis = useCallback(async (gameId: string) => {
    try {
      await fetch(`${API}/api/analysis/${gameId}`, { method: "POST" });
    } catch {
      // non-blocking — review page will retry
    }
  }, []);

  // ── Connect to WebSocket ──────────────────────────────────────
  useEffect(() => {
    const guestId = getOrCreateGuestId();
    const socket = new GameSocket(token);
    socketRef.current = socket;

    const unsubscribe = socket.onMessage((event: ServerEvent) => {
      switch (event.type) {
        case "game_state": {
          setWsConnecting(false); // S4: hide skeleton
          setGame({
            gameId: event.gameId,
            fen: event.fen,
            moves: event.moves,
            status: event.status as GameStatus,
            result: event.result,
            resultReason: event.resultReason,
            color: event.color,
            mode: event.mode,
            botDifficulty: event.botDifficulty,
          });
          setOpponentConnected(
            event.status === "active" ||
              (event.mode === "bot" && event.status !== "waiting")
          );
          if (event.status === "waiting" && event.mode === "human") {
            setStatusMsg("Waiting for opponent to join…");
          } else if (event.status === "active") {
            setStatusMsg("");
          } else if (event.status === "finished") {
            setStatusMsg(formatResult(event.result, event.resultReason));
            triggerAnalysis(event.gameId); // S3: trigger on reconnect to finished game
          }
          if (event.moves.length > 0) {
            const last = event.moves[event.moves.length - 1];
            setLastMove({ from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) });
          }
          break;
        }

        case "move_made":
        case "bot_moved": {
          const { move, fen, isGameOver, result, resultReason } = event;
          setHintMove(null);
          setBotThinking(false);
          setLastMove({ from: move.from, to: move.to });

          setGame((prev) => {
            if (!prev) return prev;
            const newMove: Move = {
              id: Date.now().toString(),
              ply: event.ply,
              san: move.san ?? "",
              uci: move.uci ?? `${move.from}${move.to}`,
              fenAfter: fen,
            };
            return {
              ...prev,
              fen,
              moves: [...prev.moves, newMove],
              status: isGameOver ? "finished" : prev.status,
              result: result ?? prev.result,
              resultReason: resultReason ?? prev.resultReason,
            };
          });

          if (isGameOver && result) {
            setStatusMsg(formatResult(result, resultReason));
          }
          break;
        }

        case "game_over": {
          setGame((prev) =>
            prev
              ? { ...prev, status: "finished", result: event.result, resultReason: event.resultReason }
              : prev
          );
          setStatusMsg(formatResult(event.result, event.resultReason));
          break;
        }

        case "opponent_joined": {
          setOpponentConnected(true);
          setStatusMsg("");
          break;
        }

        case "opponent_disconnected": {
          setStatusMsg("Opponent disconnected. Waiting for reconnect…");
          break;
        }

        case "hint": {
          setHintMove(event.move);
          setHintsLeft(event.hintsRemaining);
          break;
        }

        case "error": {
          console.warn("[WS]", event.message);
          break;
        }
      }
    });

    // S3: also trigger analysis when game_over fires (set via game state update)
    // Handled inside game_over case below via setGame callback + separate effect

    socket.connect(guestId);

    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [token, triggerAnalysis]);

  // S3: trigger analysis automatically when game transitions to finished
  useEffect(() => {
    if (game?.status === "finished" && game.gameId) {
      triggerAnalysis(game.gameId);
    }
  }, [game?.status, game?.gameId, triggerAnalysis]);

  // ── Move handler ─────────────────────────────────────────────
  const handleMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (!game || game.status !== "active") return false;

      const chess = new Chess(game.fen);
      const turn = chess.turn();
      const myColor = game.color === "white" ? "w" : "b";
      if (turn !== myColor) return false;

      const testMove = chess.move({ from, to, promotion: promotion as any });
      if (!testMove) return false;

      socketRef.current?.send({ type: "move", from, to, promotion });
      if (game.mode === "bot") setBotThinking(true);
      return true;
    },
    [game]
  );

  function requestHint() {
    if (hintsLeft <= 0) return;
    socketRef.current?.send({ type: "hint" });
  }

  function resign() {
    if (!confirm("Resign this game?")) return;
    socketRef.current?.send({ type: "resign" });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  const isMyTurn =
    game?.status === "active" &&
    (() => {
      const chess = new Chess(game.fen);
      const turn = chess.turn();
      return (
        (turn === "w" && game.color === "white") ||
        (turn === "b" && game.color === "black")
      );
    })();

  const orientation = (game?.color ?? "white") as "white" | "black";

  // S4: Loading skeleton while WS not yet connected
  if (wsConnecting) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col items-center gap-4">
            {/* Skeleton player bar */}
            <div className="w-full max-w-[min(90vw,560px)] h-8 bg-zinc-800 rounded animate-pulse" />
            {/* Skeleton board */}
            <div
              className="bg-zinc-800 rounded-lg animate-pulse"
              style={{ width: "min(90vw, 560px)", aspectRatio: "1" }}
            />
            <div className="w-full max-w-[min(90vw,560px)] h-8 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex-1 space-y-3 pt-10">
            <div className="h-6 bg-zinc-800 rounded animate-pulse w-1/2" />
            <div className="h-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <p className="text-center text-zinc-500 text-sm mt-4 animate-pulse">Connecting…</p>
      </div>
    );
  }

  return (
    // S2: mobile-first layout — flex-col on all screens, lg:flex-row on desktop
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

        {/* ── Board column ──────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          <PlayerBar
            name={
              game?.mode === "bot"
                ? `Bot (${game.botDifficulty ?? "medium"})`
                : "Opponent"
            }
            color={orientation === "white" ? "black" : "white"}
            isActive={game?.status === "active" && !isMyTurn}
            connected={opponentConnected || game?.mode === "bot"}
            thinking={botThinking}
          />

          <GameBoard
            fen={game?.fen ?? "start"}
            orientation={orientation}
            onMove={handleMove}
            interactive={isMyTurn}
            hintMove={hintMove}
            lastMove={lastMove}
          />

          <PlayerBar
            name="You"
            color={orientation}
            isActive={game?.status === "active" && !!isMyTurn}
            connected
          />
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        {/* S2: full-width on mobile, flex-1 on desktop */}
        <div className="w-full lg:flex-1 flex flex-col gap-3 lg:gap-4 min-w-0">
          {statusMsg && (
            <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 text-center">
              {statusMsg}
            </div>
          )}

          {game?.status === "active" && (
            <div
              className={`text-center text-sm font-medium px-3 py-2 rounded-lg ${
                isMyTurn
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              {isMyTurn ? "Your turn" : "Opponent's turn"}
            </div>
          )}

          {/* Invite link */}
          {game?.mode === "human" && !opponentConnected && (
            <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
              <p className="text-xs text-zinc-400 mb-2">Share to invite opponent:</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-zinc-800 px-2 py-1.5 rounded text-zinc-300 truncate break-all">
                  {typeof window !== "undefined" ? window.location.href : ""}
                </code>
                <button
                  onClick={copyLink}
                  className="px-3 min-h-touch bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium rounded transition-colors whitespace-nowrap"
                >
                  {copyDone ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Move list */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Moves
            </h3>
            <MoveList moves={game?.moves ?? []} />
          </div>

          {/* Controls */}
          {game?.status === "active" && (
            <div className="flex gap-2">
              <button
                onClick={requestHint}
                disabled={hintsLeft <= 0}
                title={`${hintsLeft} hints remaining`}
                className="flex-1 py-2 min-h-touch bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
              >
                Hint ({hintsLeft})
              </button>
              <button
                onClick={resign}
                className="flex-1 py-2 min-h-touch bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-700 rounded-lg text-sm text-zinc-300 hover:text-red-400 transition-colors"
              >
                Resign
              </button>
            </div>
          )}

          {/* Post-game */}
          {game?.status === "finished" && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (game.gameId) router.push(`/review/${game.gameId}`);
                }}
                className="py-2.5 min-h-touch bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors"
              >
                Review Game →
              </button>
              <a
                href="/play/new"
                className="block text-center py-2.5 min-h-touch bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
              >
                New Game
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatResult(result?: string, reason?: string): string {
  if (!result) return "Game over";
  const winner = result === "draw" ? "Draw" : `${capitalize(result)} wins`;
  const why = reason ? ` by ${reason.replace("_", " ")}` : "";
  return winner + why;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PlayerBar({
  name, color, isActive, connected, thinking,
}: {
  name: string; color: string; isActive: boolean; connected?: boolean; thinking?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 w-full" style={{ maxWidth: "min(90vw, 560px)" }}>
      <div
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
          color === "white" ? "bg-zinc-100 border-zinc-400" : "bg-zinc-800 border-zinc-500"
        }`}
      />
      <span className="text-sm font-medium text-zinc-300 truncate">{name}</span>
      {thinking && <span className="text-xs text-zinc-500 animate-pulse">thinking…</span>}
      <div className="ml-auto flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-zinc-600"}`} />
        {isActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      </div>
    </div>
  );
}
