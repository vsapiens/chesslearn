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

const PROMOTION_PIECES = [
  { value: "q", label: "\u265B", name: "Queen" },
  { value: "r", label: "\u265C", name: "Rook" },
  { value: "b", label: "\u265D", name: "Bishop" },
  { value: "n", label: "\u265E", name: "Knight" },
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
  const [promotionPending, setPromotionPending] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: "rgba(0,255,65,0.20)" };
    customSquareStyles[lastMove.to] = { backgroundColor: "rgba(0,255,65,0.25)" };
  }

  if (hintMove) {
    customSquareStyles[hintMove.from] = { backgroundColor: "rgba(0,229,255,0.25)" };
    customSquareStyles[hintMove.to] = {
      backgroundColor: "rgba(0,229,255,0.30)",
      boxShadow: "inset 0 0 12px rgba(0,229,255,0.3)",
    };
  }

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: "rgba(255,176,0,0.25)" };
  }

  Object.assign(customSquareStyles, legalSquares);

  function isPromotionMove(from: string, to: string, chess: Chess): boolean {
    const piece = chess.get(from as Square);
    if (piece?.type !== "p") return false;
    return (piece.color === "w" && to[1] === "8") || (piece.color === "b" && to[1] === "1");
  }

  function attemptMove(from: string, to: string, chess: Chess) {
    if (isPromotionMove(from, to, chess)) {
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
              return true;
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
            ? "radial-gradient(circle, rgba(255,51,51,0.5) 60%, transparent 60%)"
            : "radial-gradient(circle, rgba(0,255,65,0.35) 30%, transparent 30%)",
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
      return true;
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

  function confirmPromotion(piece: string) {
    if (!promotionPending) return;
    onMove?.(promotionPending.from, promotionPending.to, piece);
    setPromotionPending(null);
  }

  return (
    <div className="w-full relative" style={{ maxWidth: "min(90vw, 560px)" }}>
      {/* Promotion dialog */}
      {promotionPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="panel border-phosphor/30 shadow-phosphor">
            <p className="text-sm text-phosphor-muted text-center mb-3 font-mono">// SELECT PROMOTION</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => confirmPromotion(p.value)}
                  className="flex flex-col items-center gap-1 px-4 py-3 min-w-touch min-h-touch panel hover:border-phosphor/50 transition-all"
                  title={p.name}
                >
                  <span className="text-3xl">{p.label}</span>
                  <span className="text-xs text-phosphor-muted font-mono">{p.name}</span>
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
          borderRadius: "2px",
          border: "1px solid rgba(0,255,65,0.2)",
          boxShadow: "0 0 20px rgba(0,255,65,0.08), 0 4px 32px rgba(0,0,0,0.6)",
        }}
        customLightSquareStyle={{ backgroundColor: "#1a2a1a" }}
        customDarkSquareStyle={{ backgroundColor: "#0d1a0d" }}
        animationDuration={150}
        arePiecesDraggable={interactive && !promotionPending}
      />
    </div>
  );
}
