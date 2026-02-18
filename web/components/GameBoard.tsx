"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { Square, Piece } from "react-chessboard/dist/chessboard/types";

interface Props {
  fen: string;
  orientation?: "white" | "black";
  onMove?: (from: string, to: string, promotion?: string) => boolean;
  interactive?: boolean;
  hintMove?: { from: string; to: string } | null;
  lastMove?: { from: string; to: string } | null;
}

// S1: promotion pieces with display labels
const PROMOTION_PIECES = [
  { value: "q", label: "♛", name: "Queen" },
  { value: "r", label: "♜", name: "Rook" },
  { value: "b", label: "♝", name: "Bishop" },
  { value: "n", label: "♞", name: "Knight" },
];

export function GameBoard({
  fen,
  orientation = "white",
  onMove,
  interactive = true,
  hintMove,
  lastMove,
}: Props) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<Record<string, object>>({});
  // S1: promotion state
  const [promotionPending, setPromotionPending] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Build custom square styles
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: "rgba(235, 210, 89, 0.4)" };
    customSquareStyles[lastMove.to] = { backgroundColor: "rgba(235, 210, 89, 0.4)" };
  }

  if (hintMove) {
    customSquareStyles[hintMove.from] = { backgroundColor: "rgba(100, 200, 100, 0.5)" };
    customSquareStyles[hintMove.to] = {
      backgroundColor: "rgba(100, 200, 100, 0.5)",
      border: "2px solid rgba(100, 200, 100, 0.8)",
    };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: "rgba(20, 120, 200, 0.35)" };
  }

  Object.assign(customSquareStyles, legalSquares);

  // S1: check if a move is a promotion
  function isPromotionMove(from: string, to: string, chess: Chess): boolean {
    const piece = chess.get(from as Square);
    if (piece?.type !== "p") return false;
    return (piece.color === "w" && to[1] === "8") || (piece.color === "b" && to[1] === "1");
  }

  function attemptMove(from: string, to: string, chess: Chess) {
    if (isPromotionMove(from, to, chess)) {
      // S1: show promotion dialog instead of auto-queening
      setPromotionPending({ from, to });
      setSelectedSquare(null);
      setLegalSquares({});
      return;
    }
    onMove?.(from, to);
    setSelectedSquare(null);
    setLegalSquares({});
  }

  function onSquareClick(square: Square) {
    if (!interactive || promotionPending) return;

    const chess = new Chess(fen);

    if (selectedSquare) {
      const success = onMove !== undefined
        ? (() => {
            if (isPromotionMove(selectedSquare, square, chess)) {
              setPromotionPending({ from: selectedSquare, to: square });
              setSelectedSquare(null);
              setLegalSquares({});
              return true; // handled
            }
            const result = onMove(selectedSquare, square);
            setSelectedSquare(null);
            setLegalSquares({});
            if (!result) trySelectSquare(square, chess);
            return result;
          })()
        : false;
      return;
    }

    trySelectSquare(square, chess);
  }

  function trySelectSquare(square: Square, chess: Chess) {
    const piece = chess.get(square);
    const turn = chess.turn();
    const myColor = orientation === "white" ? "w" : "b";

    if (piece && piece.color === myColor && piece.color === turn) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      const dots: Record<string, React.CSSProperties> = {};
      for (const m of moves) {
        dots[m.to] = {
          background: chess.get(m.to)
            ? "radial-gradient(circle, rgba(220,50,50,0.6) 60%, transparent 60%)"
            : "radial-gradient(circle, rgba(100,100,100,0.5) 30%, transparent 30%)",
          borderRadius: "50%",
        };
      }
      setLegalSquares(dots);
    } else {
      setSelectedSquare(null);
      setLegalSquares({});
    }
  }

  function onPieceDrop(from: Square, to: Square, piece: Piece): boolean {
    if (!interactive || promotionPending) return false;

    const chess = new Chess(fen);

    if (isPromotionMove(from, to, chess)) {
      setPromotionPending({ from, to });
      setSelectedSquare(null);
      setLegalSquares({});
      return true; // accept drop; wait for dialog
    }

    const success = onMove?.(from, to) ?? false;
    setSelectedSquare(null);
    setLegalSquares({});
    return success;
  }

  function onPieceClick(piece: Piece, square: Square) {
    if (!interactive || promotionPending) return;
    const chess = new Chess(fen);

    if (selectedSquare && selectedSquare !== square) {
      const movingPiece = chess.get(selectedSquare as Square);
      const targetPiece = chess.get(square);
      const myColor = orientation === "white" ? "w" : "b";

      if (movingPiece && targetPiece && movingPiece.color === myColor && targetPiece.color !== myColor) {
        if (isPromotionMove(selectedSquare, square, chess)) {
          setPromotionPending({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setLegalSquares({});
          return;
        }
        onMove?.(selectedSquare, square);
        setSelectedSquare(null);
        setLegalSquares({});
        return;
      }
    }

    trySelectSquare(square, chess);
  }

  // S1: confirm promotion choice
  function confirmPromotion(piece: string) {
    if (!promotionPending) return;
    onMove?.(promotionPending.from, promotionPending.to, piece);
    setPromotionPending(null);
  }

  return (
    <div className="w-full relative" style={{ maxWidth: "min(90vw, 560px)" }}>
      {/* S1: Promotion dialog */}
      {promotionPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-lg">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
            <p className="text-sm text-zinc-400 text-center mb-3">Promote pawn to:</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => confirmPromotion(p.value)}
                  className="flex flex-col items-center gap-1 px-4 py-3 min-w-touch min-h-touch bg-zinc-800 hover:bg-amber-500/20 hover:border-amber-400 border border-zinc-700 rounded-lg transition-all"
                  title={p.name}
                >
                  <span className="text-3xl">{p.label}</span>
                  <span className="text-xs text-zinc-400">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Chessboard
        position={fen}
        boardOrientation={orientation}
        onSquareClick={onSquareClick}
        onPieceDrop={onPieceDrop}
        onPieceClick={onPieceClick}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: "6px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
        }}
        customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
        customDarkSquareStyle={{ backgroundColor: "#b58863" }}
        animationDuration={150}
        arePiecesDraggable={interactive && !promotionPending}
      />
    </div>
  );
}
