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

/** Extract a human-readable error from a failed fetch response. */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.text();
    // Try to parse as JSON for a server error message
    try {
      const json = JSON.parse(body);
      if (json.error) return json.error;
      if (json.message) return json.message;
    } catch {
      // Not JSON — use raw text if short enough
      if (body.length > 0 && body.length < 200) return body;
    }
  } catch {
    // Could not read body
  }
  return `${fallback} (HTTP ${res.status})`;
}

export async function getGame(token: string): Promise<GameResponse> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/games/${token}`, { cache: "no-store" });
  } catch (err) {
    throw new Error("Network error — cannot reach the server. Check your connection.");
  }
  if (!res.ok) {
    const msg = res.status === 404
      ? "Game not found. It may have expired or the link is invalid."
      : await extractError(res, "Failed to load game");
    throw new Error(msg);
  }
  return res.json();
}

export async function createGame(body: {
  mode: "human" | "bot";
  botDifficulty?: string;
  colorPreference?: string;
  timeControl?: string;
}): Promise<{ gameId: string; token: string; inviteUrl: string; playerColor?: string }> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error("Network error — cannot reach the server. Check your connection.");
  }
  if (!res.ok) {
    throw new Error(await extractError(res, "Failed to create game"));
  }
  return res.json();
}

export async function triggerAnalysis(gameId: string): Promise<AnalysisResponse> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/analysis/${gameId}`, { method: "POST" });
  } catch (err) {
    throw new Error("Network error — cannot reach the analysis server.");
  }
  if (!res.ok) {
    throw new Error(await extractError(res, "Failed to trigger analysis"));
  }
  return res.json();
}

export async function getAnalysis(gameId: string): Promise<AnalysisResponse> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/analysis/${gameId}`, { cache: "no-store" });
  } catch (err) {
    throw new Error("Network error — cannot reach the analysis server.");
  }
  if (!res.ok) {
    throw new Error(await extractError(res, "Failed to fetch analysis"));
  }
  return res.json();
}
