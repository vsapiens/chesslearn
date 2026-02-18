import { Chess } from "chess.js";

export interface MoveResult {
  valid: boolean;
  san?: string;
  uci?: string;
  fenAfter?: string;
  isGameOver?: boolean;
  result?: "white" | "black" | "draw";
  resultReason?: string;
  error?: string;
}

export function validateAndApplyMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string
): MoveResult {
  try {
    const chess = new Chess(fen);

    const moveObj: { from: string; to: string; promotion?: string } = {
      from,
      to,
    };
    if (promotion) moveObj.promotion = promotion;

    const move = chess.move(moveObj);

    if (!move) {
      return { valid: false, error: "Illegal move" };
    }

    const uci = `${from}${to}${promotion ?? ""}`;
    const fenAfter = chess.fen();

    let isGameOver = chess.isGameOver();
    let result: "white" | "black" | "draw" | undefined;
    let resultReason: string | undefined;

    if (isGameOver) {
      if (chess.isCheckmate()) {
        resultReason = "checkmate";
        // The player who just moved wins
        result = move.color === "w" ? "white" : "black";
      } else if (chess.isStalemate()) {
        result = "draw";
        resultReason = "stalemate";
      } else if (chess.isInsufficientMaterial()) {
        result = "draw";
        resultReason = "insufficient_material";
      } else if (chess.isThreefoldRepetition()) {
        result = "draw";
        resultReason = "threefold_repetition";
      } else {
        result = "draw";
        resultReason = "fifty_move_rule";
      }
    }

    return {
      valid: true,
      san: move.san,
      uci,
      fenAfter,
      isGameOver,
      result,
      resultReason,
    };
  } catch (err) {
    return { valid: false, error: "Invalid position or move" };
  }
}

export function getLegalMoves(fen: string): string[] {
  try {
    const chess = new Chess(fen);
    return chess.moves({ verbose: true }).map(
      (m: { from: string; to: string; promotion?: string }) =>
        `${m.from}${m.to}${m.promotion ?? ""}`
    );
  } catch {
    return [];
  }
}

export function getPgn(moves: Array<{ san: string }>): string {
  const chess = new Chess();
  for (const m of moves) {
    chess.move(m.san);
  }
  return chess.pgn();
}
