"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { GameBoard } from "@/components/GameBoard";
import { MoveList } from "@/components/MoveList";
import { GameSocket, ServerEvent, Move, ConnectionState } from "@/lib/socket";

const GUEST_ID_KEY = "chess_guest_id";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const WS_CONNECT_TIMEOUT_MS = 15_000;

function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
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
  const [wsConnecting, setWsConnecting] = useState(true);
  // New error states
  const [connState, setConnState] = useState<ConnectionState>("connecting");
  const [connDetail, setConnDetail] = useState<string>("");
  const [wsError, setWsError] = useState<string>("");

  const triggerAnalysis = useCallback(async (gameId: string) => {
    try {
      await fetch(`${API}/api/analysis/${gameId}`, { method: "POST" });
    } catch {
      // non-blocking — review page will handle
    }
  }, []);

  useEffect(() => {
    const guestId = getOrCreateGuestId();
    const socket = new GameSocket(token);
    socketRef.current = socket;

    // Connection timeout — if we don't get game_state within 15s, show error
    const connectTimeout = setTimeout(() => {
      if (wsConnecting) {
        setWsConnecting(false);
        setWsError("Connection timed out. The server may be unavailable — please refresh to try again.");
      }
    }, WS_CONNECT_TIMEOUT_MS);

    // Subscribe to connection state changes
    const unsubConn = socket.onConnectionStateChange((state, detail) => {
      setConnState(state);
      setConnDetail(detail ?? "");

      if (state === "failed") {
        setWsConnecting(false);
        setWsError(detail ?? "Connection lost. Please refresh to reconnect.");
        clearTimeout(connectTimeout);
      }
      if (state === "reconnecting") {
        setStatusMsg(detail ?? "Reconnecting...");
      }
      if (state === "connected") {
        // Clear reconnecting message (game_state will clear wsConnecting)
        if (statusMsg.startsWith("Reconnecting")) {
          setStatusMsg("");
        }
      }
    });

    const unsubscribe = socket.onMessage((event: ServerEvent) => {
      switch (event.type) {
        case "game_state": {
          clearTimeout(connectTimeout);
          setWsConnecting(false);
          setWsError("");
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
            setStatusMsg("Waiting for opponent to join\u2026");
          } else if (event.status === "active") {
            setStatusMsg("");
          } else if (event.status === "finished") {
            setStatusMsg(formatResult(event.result, event.resultReason));
            triggerAnalysis(event.gameId);
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
          setStatusMsg("Opponent disconnected. Waiting for reconnect\u2026");
          break;
        }

        case "hint": {
          setHintMove(event.move);
          setHintsLeft(event.hintsRemaining);
          break;
        }

        case "error": {
          // Show server-sent errors to the user
          setWsError(event.message);
          // Auto-clear non-critical errors after 6s
          setTimeout(() => setWsError((prev) => prev === event.message ? "" : prev), 6000);
          break;
        }
      }
    });

    socket.connect(guestId);

    return () => {
      clearTimeout(connectTimeout);
      unsubConn();
      unsubscribe();
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, triggerAnalysis]);

  useEffect(() => {
    if (game?.status === "finished" && game.gameId) {
      triggerAnalysis(game.gameId);
    }
  }, [game?.status, game?.gameId, triggerAnalysis]);

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

  // Loading skeleton
  if (wsConnecting) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[min(90vw,560px)] h-8 bg-surface-raised border border-surface-border animate-pulse" />
            <div
              className="bg-surface-raised border border-surface-border animate-pulse"
              style={{ width: "min(90vw, 560px)", aspectRatio: "1" }}
            />
            <div className="w-full max-w-[min(90vw,560px)] h-8 bg-surface-raised border border-surface-border animate-pulse" />
          </div>
          <div className="flex-1 space-y-3 pt-10">
            <div className="h-6 bg-surface-raised border border-surface-border animate-pulse w-1/2" />
            <div className="h-32 bg-surface-raised border border-surface-border animate-pulse" />
            <div className="h-10 bg-surface-raised border border-surface-border animate-pulse" />
          </div>
        </div>
        <p className="text-center text-phosphor-muted text-sm mt-4 animate-data-stream font-mono">
          &gt; ESTABLISHING SECURE CONNECTION...
        </p>
        {connState === "reconnecting" && connDetail && (
          <p className="text-center text-amber text-xs mt-2 font-mono">{connDetail}</p>
        )}
      </div>
    );
  }

  // Fatal connection error — show full-screen error with retry
  if (wsError && !game) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="panel border-danger/30 mb-6">
          <p className="text-danger font-mono text-sm mb-1">[CONNECTION ERROR]</p>
          <p className="text-phosphor-dim font-mono text-sm">{wsError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          &gt; RECONNECT
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

        {/* Board column */}
        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          <PlayerBar
            name={
              game?.mode === "bot"
                ? `BOT (${(game.botDifficulty ?? "medium").toUpperCase()})`
                : "OPPONENT"
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
            name="YOU"
            color={orientation}
            isActive={game?.status === "active" && !!isMyTurn}
            connected={connState === "connected" || connState === "connecting"}
          />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:flex-1 flex flex-col gap-3 lg:gap-4 min-w-0">
          {/* WS error banner — shown inline when game is loaded */}
          {wsError && game && (
            <div className="panel border-danger/30 text-sm text-center font-mono">
              <span className="text-danger">[ERROR]</span>{" "}
              <span className="text-phosphor-dim">{wsError}</span>
            </div>
          )}

          {/* Reconnecting banner */}
          {connState === "reconnecting" && (
            <div className="panel border-amber/30 text-sm text-center font-mono text-amber animate-data-stream">
              {connDetail || "Reconnecting..."}
            </div>
          )}

          {statusMsg && (
            <div className="panel border-phosphor/20 text-sm text-phosphor-dim text-center font-mono">
              &gt; {statusMsg}
            </div>
          )}

          {game?.status === "active" && (
            <div
              className={`text-center text-sm font-mono px-3 py-2 ${
                isMyTurn
                  ? "panel border-amber/30 text-amber text-glow-amber"
                  : "panel border-surface-border text-phosphor-muted"
              }`}
              style={isMyTurn ? { boxShadow: "0 0 12px rgba(255,176,0,0.15)" } : {}}
            >
              {isMyTurn ? "> YOUR MOVE" : "> AWAITING OPPONENT"}
            </div>
          )}

          {/* Invite link */}
          {game?.mode === "human" && !opponentConnected && (
            <div className="panel">
              <p className="text-xs text-phosphor-muted mb-2 font-mono">// TRANSMISSION CODE</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-surface px-2 py-1.5 text-phosphor-dim truncate break-all font-mono border border-surface-border">
                  {typeof window !== "undefined" ? window.location.href : ""}
                </code>
                <button
                  onClick={copyLink}
                  className="btn-primary px-3 whitespace-nowrap text-xs"
                >
                  {copyDone ? "[COPIED]" : "[COPY]"}
                </button>
              </div>
            </div>
          )}

          {/* Move list */}
          <div className="panel">
            <h3 className="text-xs font-mono text-phosphor-muted uppercase tracking-wider mb-2">
              // MOVE LOG
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
                className="btn-secondary flex-1"
              >
                [HINT] ({hintsLeft})
              </button>
              <button
                onClick={resign}
                className="btn-danger flex-1"
              >
                [RESIGN]
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
                className="btn-primary w-full text-center"
              >
                &gt; ANALYZE GAME
              </button>
              <a
                href="/play/new"
                className="btn-secondary block text-center"
              >
                &gt; NEW MISSION
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatResult(result?: string, reason?: string): string {
  if (!result) return "GAME OVER";
  const winner = result === "draw" ? "DRAW" : `${result.toUpperCase()} WINS`;
  const why = reason ? ` [${reason.replace("_", " ").toUpperCase()}]` : "";
  return `RESULT: ${winner}${why}`;
}

function PlayerBar({
  name, color, isActive, connected, thinking,
}: {
  name: string; color: string; isActive: boolean; connected?: boolean; thinking?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 w-full font-mono" style={{ maxWidth: "min(90vw, 560px)" }}>
      <div
        className={`w-4 h-4 flex-shrink-0 border ${
          color === "white"
            ? "bg-phosphor-dim/30 border-phosphor/40"
            : "bg-surface border-surface-border-bright"
        }`}
      />
      <span className={`text-sm font-medium truncate uppercase ${
        isActive ? "text-phosphor text-glow" : "text-phosphor-muted"
      }`}>
        {name}
      </span>
      {thinking && <span className="text-xs text-amber animate-data-stream">COMPUTING...</span>}
      <div className="ml-auto flex items-center gap-1.5 text-xs">
        <span className={connected ? "text-phosphor" : "text-phosphor-muted/40"}>
          {connected ? "[ONLINE]" : "[OFFLINE]"}
        </span>
        {isActive && <span className="w-2 h-2 bg-amber animate-glow-pulse" />}
      </div>
    </div>
  );
}
