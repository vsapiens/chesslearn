/**
 * Chess engine wrapper.
 *
 * Primary:  Stockfish binary (if `stockfish` is in PATH).
 * Fallback: JS-based minimax bot using chess.js (depth 3–5).
 *
 * To install Stockfish:
 *   Windows: https://stockfishchess.org/download/  → add to PATH as `stockfish`
 *   Linux:   sudo apt install stockfish
 *   macOS:   brew install stockfish
 */
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { Chess } from "chess.js";

export interface EngineEval {
  score: number; // centipawns, positive = white advantage
  mate?: number; // moves to mate
  bestMove: string; // UCI notation e.g. "e2e4"
}

// ── Stockfish UCI process wrapper ────────────────────────────────────────────

class StockfishProcess {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private ready = false;
  private buffer = "";

  async start(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.proc = spawn("stockfish", [], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        this.proc.on("error", () => {
          this.proc = null;
          resolve(false);
        });

        this.proc.stdout.on("data", (data: Buffer) => {
          this.buffer += data.toString();
          if (this.buffer.includes("uciok")) {
            this.ready = true;
            resolve(true);
          }
        });

        this.proc.stdin.write("uci\n");

        setTimeout(() => {
          if (!this.ready) {
            this.proc?.kill();
            this.proc = null;
            resolve(false);
          }
        }, 2000);
      } catch {
        resolve(false);
      }
    });
  }

  available(): boolean {
    return this.proc !== null && this.ready;
  }

  async query(
    fen: string,
    depthOrMs: { depth?: number; movetime?: number },
    skillLevel = 20
  ): Promise<EngineEval> {
    if (!this.proc || !this.ready) throw new Error("Engine not available");

    return new Promise((resolve) => {
      let score = 0;
      let mate: number | undefined;
      let bestMove = "";
      let done = false;

      const onData = (data: Buffer) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (line.includes("score cp")) {
            const m = line.match(/score cp (-?\d+)/);
            if (m) score = parseInt(m[1]);
          }
          if (line.includes("score mate")) {
            const m = line.match(/score mate (-?\d+)/);
            if (m) mate = parseInt(m[1]);
          }
          if (line.startsWith("bestmove") && !done) {
            done = true;
            bestMove = line.split(" ")[1] ?? "";
            this.proc!.stdout.removeListener("data", onData);
            resolve({ score, mate, bestMove });
          }
        }
      };

      this.proc!.stdout.on("data", onData);
      this.proc!.stdin.write(
        `setoption name Skill Level value ${skillLevel}\n` +
          `position fen ${fen}\n` +
          `go ${depthOrMs.depth ? `depth ${depthOrMs.depth}` : `movetime ${depthOrMs.movetime ?? 300}`}\n`
      );

      // Safety timeout
      setTimeout(() => {
        if (!done) {
          done = true;
          this.proc!.stdout.removeListener("data", onData);
          resolve({ score, mate, bestMove: bestMove || "" });
        }
      }, 5000);
    });
  }

  quit() {
    this.proc?.stdin.write("quit\n");
    this.proc = null;
  }
}

// ── JS fallback bot (piece-square evaluation + random) ──────────────────────

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Piece-square tables (white's perspective, rank 1 = index 0)
const PST: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function squareIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(sq[1]) - 1;   // 1=0..8=7
  return rank * 8 + file;
}

function evaluatePosition(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? -30000 : 30000;
  }
  if (chess.isDraw()) return 0;

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;

      const val = PIECE_VALUES[piece.type] ?? 0;
      const sq = String.fromCharCode(97 + f) + (r + 1);
      const idx = piece.color === "w"
        ? squareIndex(sq)
        : (7 - r) * 8 + f;

      const pst = PST[piece.type]?.[idx] ?? 0;
      const pieceScore = val + pst;

      score += piece.color === "w" ? pieceScore : -pieceScore;
    }
  }
  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess);
  }

  const moves = chess.moves({ verbose: true });
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function jsBotMove(fen: string, difficulty: "easy" | "medium" | "hard"): string {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return "";

  const depth =
    difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  const noise =
    difficulty === "easy" ? 150 : difficulty === "medium" ? 30 : 0;
  const isMaximizing = chess.turn() === "w";

  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMoves: typeof moves = [];

  for (const move of moves) {
    chess.move(move);
    const score =
      minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing) +
      (Math.random() * noise - noise / 2);
    chess.undo();

    const better = isMaximizing ? score > bestScore : score < bestScore;
    if (better) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) < noise / 2) {
      bestMoves.push(move);
    }
  }

  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return `${chosen.from}${chosen.to}${chosen.promotion ?? ""}`;
}

// ── Public Engine API ────────────────────────────────────────────────────────

const DEPTH_MAP = { easy: 3, medium: 8, hard: 18 };
const SKILL_MAP = { easy: 2, medium: 10, hard: 20 };

let sfProc: StockfishProcess | null = null;
let sfAvailable: boolean | null = null;

async function ensureStockfish(): Promise<boolean> {
  if (sfAvailable !== null) return sfAvailable;
  sfProc = new StockfishProcess();
  sfAvailable = await sfProc.start();
  if (sfAvailable) {
    console.log("[Engine] Stockfish binary available — full UCI mode");
  } else {
    console.log("[Engine] Stockfish not in PATH — using JS fallback bot");
    sfProc = null;
  }
  return sfAvailable;
}

export async function getBestMove(
  fen: string,
  difficulty: "easy" | "medium" | "hard"
): Promise<EngineEval> {
  const hasStockfish = await ensureStockfish();

  if (hasStockfish && sfProc) {
    try {
      return await sfProc.query(fen, { depth: DEPTH_MAP[difficulty] }, SKILL_MAP[difficulty]);
    } catch {
      // fall through to JS
    }
  }

  const bestMove = jsBotMove(fen, difficulty);
  return { score: 0, bestMove };
}

export async function evaluateFen(fen: string, depth = 10): Promise<EngineEval> {
  const hasStockfish = await ensureStockfish();

  if (hasStockfish && sfProc) {
    try {
      return await sfProc.query(fen, { movetime: 200 }, 20);
    } catch {}
  }

  // JS eval fallback
  const chess = new Chess(fen);
  const score = evaluatePosition(chess);
  return { score, bestMove: "" };
}
