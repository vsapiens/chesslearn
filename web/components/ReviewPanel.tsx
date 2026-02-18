"use client";

import { ReviewPosition } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  blunder: "text-red-400 bg-red-900/30 border-red-800",
  mistake: "text-orange-400 bg-orange-900/30 border-orange-800",
  inaccuracy: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  good: "text-emerald-400 bg-emerald-900/30 border-emerald-800",
  best: "text-sky-400 bg-sky-900/30 border-sky-800",
};

const CATEGORY_ICONS: Record<string, string> = {
  blunder: "??",
  mistake: "?",
  inaccuracy: "?!",
  good: "!",
  best: "!!",
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
      {/* Summary stats */}
      {summary && (
        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-sm text-zinc-300">
          {summary}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <StatBox label="Blunders" value={blunders} color="text-red-400" />
        <StatBox label="Mistakes" value={mistakes} color="text-orange-400" />
        <StatBox label="Inaccuracies" value={inaccuracies} color="text-yellow-400" />
      </div>

      {/* Key moments */}
      {keyMoments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Key Moments
          </h3>
          <div className="space-y-2">
            {keyMoments.map((pos) => {
              const moveNum = Math.ceil(pos.ply / 2);
              const isWhite = pos.ply % 2 === 1;
              const cat = pos.category ?? "good";
              const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.good;
              const icon = CATEGORY_ICONS[cat] ?? "";

              return (
                <button
                  key={pos.id}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${colors} ${
                    currentPly === pos.ply ? "ring-1 ring-white/20" : ""
                  }`}
                  onClick={() => onSelectPly?.(pos.ply)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">
                      {moveNum}.{isWhite ? "" : ".."} {pos.playedMoveSan}{" "}
                      <span className="opacity-70">{icon}</span>
                    </span>
                    <span className="text-xs uppercase opacity-70">{cat}</span>
                  </div>
                  {pos.explanation && (
                    <p className="text-xs opacity-80 leading-relaxed">
                      {pos.explanation}
                    </p>
                  )}
                  {pos.bestMoveUci && cat !== "best" && cat !== "good" && (
                    <p className="text-xs mt-1 opacity-60">
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
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          All Moves
        </h3>
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          {positions.map((pos) => {
            const moveNum = Math.ceil(pos.ply / 2);
            const isWhite = pos.ply % 2 === 1;
            const cat = pos.category ?? "good";
            const icon = CATEGORY_ICONS[cat] ?? "";
            const evalStr =
              pos.evalAfter !== undefined
                ? (pos.evalAfter / 100).toFixed(2)
                : "–";

            return (
              <button
                key={pos.id}
                onClick={() => onSelectPly?.(pos.ply)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-all hover:bg-zinc-800 ${
                  currentPly === pos.ply ? "bg-zinc-700" : ""
                }`}
              >
                <span className="text-zinc-600 w-8 text-right">
                  {moveNum}.{isWhite ? "" : ".."}
                </span>
                <span className="font-medium text-zinc-200 w-12">{pos.playedMoveSan}</span>
                <span
                  className={`w-6 font-bold ${
                    CATEGORY_COLORS[cat]?.split(" ")[0] ?? "text-zinc-400"
                  }`}
                >
                  {icon}
                </span>
                <span className="text-zinc-500 ml-auto">{evalStr}</span>
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
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
