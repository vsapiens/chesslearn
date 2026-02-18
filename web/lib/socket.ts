/**
 * Typed WebSocket client for game rooms.
 */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

export type ServerEvent =
  | {
      type: "game_state";
      gameId: string;
      token: string;
      fen: string;
      moves: Move[];
      status: string;
      result?: string;
      resultReason?: string;
      color: string;
      guestId: string;
      mode: string;
      botDifficulty?: string;
    }
  | { type: "move_made"; move: MoveInfo; fen: string; ply: number; isGameOver?: boolean; result?: string; resultReason?: string }
  | { type: "bot_moved"; move: MoveInfo; fen: string; ply: number; isGameOver?: boolean; result?: string; resultReason?: string }
  | { type: "game_over"; result: string; resultReason: string }
  | { type: "opponent_joined"; color: string }
  | { type: "opponent_disconnected" }
  | { type: "hint"; move: { from: string; to: string; uci: string }; explanation: string; hintsRemaining: number }
  | { type: "error"; message: string };

export interface Move {
  id: string;
  ply: number;
  san: string;
  uci: string;
  fenAfter: string;
}

export interface MoveInfo {
  from: string;
  to: string;
  promotion?: string;
  san?: string;
  uci?: string;
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private handlers: Array<(event: ServerEvent) => void> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;

  constructor(token: string) {
    this.token = token;
  }

  connect(guestId: string): void {
    if (this.ws && this.ws.readyState < 2) return; // CONNECTING or OPEN

    this.ws = new WebSocket(`${WS_URL}/ws/game/${this.token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.send({ type: "join", guestId });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerEvent;
        this.handlers.forEach((h) => h(msg));
      } catch (e) {
        console.error("[WS] Parse error:", e);
      }
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnects) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(guestId);
        }, delay);
      }
    };

    this.ws.onerror = (err) => {
      console.error("[WS] Error:", err);
    };
  }

  send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: (event: ServerEvent) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = this.maxReconnects; // prevent reconnect
    this.ws?.close();
    this.ws = null;
  }
}
