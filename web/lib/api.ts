const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface GameResponse {
  gameId: string;
  token: string;
  mode: string;
  status: string;
  result?: string;
  resultReason?: string;
  currentFen: string;
  pgn: string;
  moves: Array<{ id: string; ply: number; san: string; uci: string; fenAfter: string }>;
  botDifficulty?: string;
  playerColor?: string;
  whiteGuestId?: string;
  blackGuestId?: string;
  timeControl?: string;
  createdAt: string;
  inviteUrl?: string;
}

export interface AnalysisResponse {
  status: "ready" | "pending" | "processing";
  reviewId?: string;
  summary?: string;
  positions?: ReviewPosition[];
  keyMoments?: ReviewPosition[];
  createdAt?: string;
}

export interface ReviewPosition {
  id: string;
  ply: number;
  fen: string;
  evalBefore?: number;
  evalAfter?: number;
  category?: string;
  bestMoveUci?: string;
  playedMoveUci?: string;
  playedMoveSan?: string;
  explanation?: string;
}

export async function getGame(token: string): Promise<GameResponse> {
  const res = await fetch(`${API}/api/games/${token}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Game not found");
  return res.json();
}

export async function createGame(body: {
  mode: "human" | "bot";
  botDifficulty?: string;
  colorPreference?: string;
  timeControl?: string;
}): Promise<{ gameId: string; token: string; inviteUrl: string; playerColor?: string }> {
  const res = await fetch(`${API}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create game");
  return res.json();
}

export async function triggerAnalysis(gameId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API}/api/analysis/${gameId}`, { method: "POST" });
  return res.json();
}

export async function getAnalysis(gameId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API}/api/analysis/${gameId}`, { cache: "no-store" });
  return res.json();
}
