/**
 * Post-game analysis: evaluate each position with Stockfish,
 * classify moves by eval drop, and produce key moments.
 */
import { evaluateFen, getBestMove } from "../chess/engine.js";
import { prisma } from "../db/client.js";

const BLUNDER_THRESHOLD = 200; // centipawns
const MISTAKE_THRESHOLD = 100;
const INACCURACY_THRESHOLD = 50;

type MoveCategory =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "book";

function classifyMove(evalDrop: number): MoveCategory {
  if (evalDrop < 0) return "best"; // eval improved
  if (evalDrop < INACCURACY_THRESHOLD) return "good";
  if (evalDrop < MISTAKE_THRESHOLD) return "inaccuracy";
  if (evalDrop < BLUNDER_THRESHOLD) return "mistake";
  return "blunder";
}

function buildExplanation(
  category: MoveCategory,
  evalDrop: number,
  bestMove: string,
  playedMove: string
): string {
  if (category === "best" || category === "good") return "";
  const dropStr = Math.abs(evalDrop) + "cp";
  switch (category) {
    case "inaccuracy":
      return `Inaccuracy (${dropStr} loss). Consider ${bestMove} for a better position.`;
    case "mistake":
      return `Mistake (${dropStr} loss). ${bestMove} was the better choice here.`;
    case "blunder":
      return `Blunder! (${dropStr} loss). This loses significant material or advantage. Best was ${bestMove}.`;
    default:
      return "";
  }
}

export async function analyzeGame(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { moves: { orderBy: { ply: "asc" } } },
  });

  if (!game || game.moves.length === 0) return;

  // Delete existing review
  await prisma.review.deleteMany({ where: { gameId } });

  const review = await prisma.review.create({
    data: { gameId, analysisVersion: "1" },
  });

  const positions: Array<{
    reviewId: string;
    gameId: string;
    ply: number;
    fen: string;
    evalBefore: number;
    evalAfter: number;
    category: string;
    bestMoveUci: string;
    playedMoveUci: string;
    playedMoveSan: string;
    explanation: string;
  }> = [];

  const startFen =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  let prevFen = startFen;
  let prevEval = 0;
  let whiteBlunders = 0;
  let blackBlunders = 0;

  for (const move of game.moves) {
    // Eval before the move (from position prevFen)
    const evalBefore = prevEval;

    // Eval after the move
    const evalResult = await evaluateFen(move.fenAfter, 10);
    const evalAfter = evalResult.score;
    const bestMoveUci = evalResult.bestMove;

    // Eval drop from the moving side's perspective
    // If it's white's turn (ply is odd = white just moved), positive eval is good for white
    const isWhiteMove = move.ply % 2 === 1;
    const evalDrop = isWhiteMove
      ? evalBefore - evalAfter // white wants higher score
      : evalAfter - evalBefore; // black wants lower score (more negative)

    const category = classifyMove(evalDrop);
    const explanation = buildExplanation(
      category,
      evalDrop,
      bestMoveUci,
      move.uci
    );

    if (category === "blunder") {
      if (isWhiteMove) whiteBlunders++;
      else blackBlunders++;
    }

    positions.push({
      reviewId: review.id,
      gameId,
      ply: move.ply,
      fen: prevFen,
      evalBefore,
      evalAfter,
      category,
      bestMoveUci,
      playedMoveUci: move.uci,
      playedMoveSan: move.san,
      explanation,
    });

    prevFen = move.fenAfter;
    prevEval = evalAfter;
  }

  // Bulk insert positions
  await prisma.reviewPosition.createMany({ data: positions });

  // Build summary
  const totalMoves = game.moves.length;
  const blunders = positions.filter((p) => p.category === "blunder").length;
  const mistakes = positions.filter((p) => p.category === "mistake").length;
  const inaccuracies = positions.filter(
    (p) => p.category === "inaccuracy"
  ).length;

  const summary = `${totalMoves} moves analyzed. Blunders: ${blunders}, Mistakes: ${mistakes}, Inaccuracies: ${inaccuracies}.`;

  await prisma.review.update({
    where: { id: review.id },
    data: { summary },
  });
}
