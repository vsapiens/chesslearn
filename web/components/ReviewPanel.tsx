"use client";

import { ReviewPosition } from "@/lib/api";

const CATEGORY_CLASSES: Record<string, string> = {
  blunder: "cat-blunder",
  mistake: "cat-mistake",
  inaccuracy: "cat-inaccuracy",
  good: "cat-good",
  best: "cat-best",
};

const CATEGORY_ICONS: Record<string, string> = {
  blunder: "[!!]",
  mistake: "[!]",
  inaccuracy: "[?!]",
  good: "[OK]",
  best: "[++]",
};

interface Props {
  summary?: string;
  positions: ReviewPosition[];
  keyMoments: ReviewPosition[];
  moves: Array<{ ply: number; san: string }>;
  onSelectPly?: (ply: number) => void;
  currentPly?: number;
}

export function ReviewPanel({
  summary,
  positions,
  keyMoments,
  moves,
  onSelectPly,
  currentPly,
}: Props) {
  const blunders = positions.filter((p) => p.category === "blunder").length;
  const mistakes = positions.filter((p) => p.category === "mistake").length;
  const inaccuracies = positions.filter((p) => p.category === "inaccuracy").length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      {summary && (
        <div className="panel text-sm text-phosphor-dim">
          <span className="text-phosphor-muted">&gt; </span>{summary}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Blunders" value={blunders} cat="blunder" />
        <StatBox label="Mistakes" value={mistakes} cat="mistake" />
        <StatBox label="Inaccuracies" value={inaccuracies} cat="inaccuracy" />
      </div>

      {/* Key moments */}
      {keyMoments.length > 0 && (
        <div>
          <h3 className="text-sm font-mono text-phosphor-muted uppercase tracking-wider mb-2">
            // CRITICAL ALERTS
          </h3>
          <div className="space-y-2">
            {keyMoments.map((pos) => {
              const moveNum = Math.ceil(pos.ply / 2);
              const isWhite = pos.ply % 2 === 1;
              const cat = pos.category ?? "good";
              const catClass = CATEGORY_CLASSES[cat] ?? CATEGORY_CLASSES.good;
              const icon = CATEGORY_ICONS[cat] ?? "";

              return (
                <button
                  key={pos.id}
                  className={`w-full text-left p-3 border text-sm transition-all ${catClass} ${
                    currentPly === pos.ply ? "ring-1 ring-phosphor/30" : ""
                  }`}
                  onClick={() => onSelectPly?.(pos.ply)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-semibold">
                      {moveNum}.{isWhite ? "" : ".."} {pos.playedMoveSan}{" "}
                      <span className="opacity-70">{icon}</span>
                    </span>
                    <span className="text-xs uppercase opacity-70 font-mono">{cat}</span>
                  </div>
                  {pos.explanation && (
                    <p className="text-xs opacity-80 leading-relaxed">
                      {pos.explanation}
                    </p>
                  )}
                  {pos.bestMoveUci && cat !== "best" && cat !== "good" && (
                    <p className="text-xs mt-1 opacity-60 font-mono">
                      Best: <code>{pos.bestMoveUci}</code>
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Full move classification list */}
      <div>
        <h3 className="text-sm font-mono text-phosphor-muted uppercase tracking-wider mb-2">
          // FULL MOVE LOG
        </h3>
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          {positions.map((pos) => {
            const moveNum = Math.ceil(pos.ply / 2);
            const isWhite = pos.ply % 2 === 1;
            const cat = pos.category ?? "good";
            const icon = CATEGORY_ICONS[cat] ?? "";
            const catTextColor = {
              blunder: "text-danger",
              mistake: "text-amber",
              inaccuracy: "text-amber-dim",
              good: "text-phosphor",
              best: "text-cyan",
            }[cat] ?? "text-phosphor-muted";
            const evalStr =
              pos.evalAfter !== undefined
                ? (pos.evalAfter / 100).toFixed(2)
                : "\u2013";

            return (
              <button
                key={pos.id}
                onClick={() => onSelectPly?.(pos.ply)}
                className={`w-full flex items-center gap-2 px-2 py-2 sm:py-1 min-h-[36px] text-xs transition-all hover:bg-phosphor-glow10 font-mono ${
                  currentPly === pos.ply ? "bg-phosphor-glow10" : ""
                }`}
              >
                <span className="text-phosphor-muted/50 w-8 text-right">
                  {moveNum}.{isWhite ? "" : ".."}
                </span>
                <span className="font-medium text-phosphor-dim w-12">{pos.playedMoveSan}</span>
                <span className={`w-8 font-bold ${catTextColor}`}>
                  {icon}
                </span>
                <span className="text-phosphor-muted/50 ml-auto">{evalStr}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  cat,
}: {
  label: string;
  value: number;
  cat: string;
}) {
  const glowMap: Record<string, string> = {
    blunder: "shadow-danger",
    mistake: "shadow-amber",
    inaccuracy: "shadow-amber",
  };
  const colorMap: Record<string, string> = {
    blunder: "text-danger",
    mistake: "text-amber",
    inaccuracy: "text-amber-dim",
  };

  return (
    <div className={`panel ${glowMap[cat] ?? ""}`}>
      <div className={`text-2xl font-display font-bold ${colorMap[cat] ?? "text-phosphor"}`}>{value}</div>
      <div className="text-xs text-phosphor-muted font-mono">{label}</div>
    </div>
  );
}
