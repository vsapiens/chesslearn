"use client";

import { useEffect, useRef } from "react";

interface Move {
  ply: number;
  san: string;
  uci?: string;
}

interface Props {
  moves: Move[];
  currentPly?: number;
  onSelectPly?: (ply: number) => void;
}

export function MoveList({ moves, currentPly, onSelectPly }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <div className="text-zinc-500 text-sm text-center py-4">
        No moves yet
      </div>
    );
  }

  // Group into pairs (white move + black move per row)
  const rows: Array<{ moveNum: number; white?: Move; black?: Move }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(moves[i].ply / 2) + 1;
    rows.push({
      moveNum,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="font-mono text-sm overflow-y-auto max-h-48 sm:max-h-64 pr-1">
      {rows.map((row) => (
        <div key={row.moveNum} className="flex items-center gap-1 py-0.5">
          <span className="text-zinc-600 w-7 text-right select-none">
            {row.moveNum}.
          </span>

          {row.white && (
            <button
              className={`move-item flex-1 text-left min-h-[36px] flex items-center ${
                currentPly === row.white.ply ? "active" : ""
              }`}
              onClick={() => onSelectPly?.(row.white!.ply)}
            >
              {row.white.san}
            </button>
          )}

          {row.black ? (
            <button
              className={`move-item flex-1 text-left min-h-[36px] flex items-center ${
                currentPly === row.black.ply ? "active" : ""
              }`}
              onClick={() => onSelectPly?.(row.black!.ply)}
            >
              {row.black.san}
            </button>
          ) : (
            <span className="flex-1" />
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
