/**
 * WebSocket game room.
 * One room per game token. Handles:
 * - Player join
 * - Move validation + relay
 * - Bot moves
 * - Hints
 * - Resign
 * - Reconnect
 */
import { FastifyInstance } from "fastify";
import { WebSocket } from "@fastify/websocket";
import { nanoid } from "nanoid";
import { prisma } from "../db/client.js";
import { validateAndApplyMove } from "../chess/validator.js";
import { getBestMove, evaluateFen } from "../chess/engine.js";
import { Chess } from "chess.js";

const MAX_HINTS = parseInt(process.env.MAX_HINTS_PER_GAME ?? "3", 10);

// In-memory room registry: token → set of sockets
interface PlayerSocket {
  ws: WebSocket;
  guestId: string;
  color?: string;
}

const rooms = new Map<string, Map<string, PlayerSocket>>();

function getRoom(token: string): Map<string, PlayerSocket> {
  if (!rooms.has(token)) {
    rooms.set(token, new Map());
  }
  return rooms.get(token)!;
}

function broadcast(
  room: Map<string, PlayerSocket>,
  msg: object,
  excludeId?: string
) {
  const payload = JSON.stringify(msg);
  for (const [id, player] of room) {
    if (id !== excludeId && player.ws.readyState === 1 /* OPEN */) {
      player.ws.send(payload);
    }
  }
}

function broadcastAll(room: Map<string, PlayerSocket>, msg: object) {
  broadcast(room, msg, undefined);
}

function send(ws: WebSocket, msg: object) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

async function handleBotMove(token: string, fen: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { token },
    include: { moves: { orderBy: { ply: "asc" } } },
  });

  if (!game || game.status !== "active") return;

  const difficulty = (game.botDifficulty as "easy" | "medium" | "hard") ?? "medium";

  try {
    const result = await getBestMove(fen, difficulty);
    const bestMove = result.bestMove;

    if (!bestMove || bestMove === "(none)") {
      // Game over
      return;
    }

    const from = bestMove.slice(0, 2);
    const to = bestMove.slice(2, 4);
    const promotion = bestMove.length === 5 ? bestMove[4] : undefined;

    const moveResult = validateAndApplyMove(fen, from, to, promotion);
    if (!moveResult.valid || !moveResult.fenAfter) return;

    const ply = game.moves.length + 1;

    await prisma.move.create({
      data: {
        gameId: game.id,
        ply,
        san: moveResult.san!,
        uci: moveResult.uci!,
        fenAfter: moveResult.fenAfter,
      },
    });

    let updatedStatus = game.status;
    if (moveResult.isGameOver) {
      updatedStatus = "finished";
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: "finished",
          result: moveResult.result,
          resultReason: moveResult.resultReason,
          currentFen: moveResult.fenAfter,
        },
      });
    } else {
      await prisma.game.update({
        where: { id: game.id },
        data: { currentFen: moveResult.fenAfter },
      });
    }

    const room = getRoom(token);
    broadcastAll(room, {
      type: "bot_moved",
      move: { from, to, promotion, san: moveResult.san, uci: moveResult.uci },
      fen: moveResult.fenAfter,
      ply,
      isGameOver: moveResult.isGameOver,
      result: moveResult.result,
      resultReason: moveResult.resultReason,
    });
  } catch (err) {
    console.error("[Bot] Move error:", err);
  }
}

export async function gameRoomWs(fastify: FastifyInstance) {
  fastify.get(
    "/ws/game/:token",
    { websocket: true },
    async (ws: WebSocket, req: any) => {
      const { token } = req.params as { token: string };
      let guestId = "";

      ws.on("message", async (raw: Buffer | string) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          send(ws, { type: "error", message: "Invalid JSON" });
          return;
        }

        const { type } = msg;

        // ── JOIN ────────────────────────────────────────────────────
        if (type === "join") {
          const incomingGuestId = msg.guestId || nanoid(10);
          guestId = incomingGuestId;

          const game = await prisma.game.findUnique({
            where: { token },
            include: { moves: { orderBy: { ply: "asc" } } },
          });

          if (!game) {
            send(ws, { type: "error", message: "Game not found" });
            ws.close();
            return;
          }

          const room = getRoom(token);
          let assignedColor: string;

          if (game.mode === "bot") {
            // Human always plays their assigned color
            assignedColor = game.playerColor ?? "white";

            if (game.status === "waiting") {
              await prisma.game.update({
                where: { id: game.id },
                data: {
                  status: "active",
                  whiteGuestId:
                    assignedColor === "white" ? guestId : "bot",
                  blackGuestId:
                    assignedColor === "black" ? guestId : "bot",
                },
              });
            }
          } else {
            // Assign colors for human vs human
            if (!game.whiteGuestId) {
              assignedColor = "white";
              await prisma.game.update({
                where: { id: game.id },
                data: { whiteGuestId: guestId, status: "waiting" },
              });
            } else if (!game.blackGuestId && game.whiteGuestId !== guestId) {
              assignedColor = "black";
              await prisma.game.update({
                where: { id: game.id },
                data: { blackGuestId: guestId, status: "active" },
              });
              // Notify existing players
              broadcast(room, { type: "opponent_joined", color: "black" }, guestId);
            } else if (game.whiteGuestId === guestId) {
              assignedColor = "white";
            } else if (game.blackGuestId === guestId) {
              assignedColor = "black";
            } else {
              // Spectator
              assignedColor = "spectator";
            }
          }

          room.set(guestId, { ws, guestId, color: assignedColor });

          const freshGame = await prisma.game.findUnique({
            where: { token },
            include: { moves: { orderBy: { ply: "asc" } } },
          });

          send(ws, {
            type: "game_state",
            gameId: freshGame!.id,
            token,
            fen: freshGame!.currentFen,
            moves: freshGame!.moves,
            status: freshGame!.status,
            result: freshGame!.result,
            resultReason: freshGame!.resultReason,
            color: assignedColor,
            guestId,
            mode: freshGame!.mode,
            botDifficulty: freshGame!.botDifficulty,
          });

          // If bot game and bot moves first (human is black), trigger bot
          if (
            game.mode === "bot" &&
            freshGame!.status === "active" &&
            assignedColor === "black"
          ) {
            setTimeout(
              () => handleBotMove(token, freshGame!.currentFen),
              500
            );
          }

          return;
        }

        // ── MOVE ────────────────────────────────────────────────────
        if (type === "move") {
          const { from, to, promotion } = msg;
          if (!from || !to) {
            send(ws, { type: "error", message: "Missing from/to" });
            return;
          }

          const game = await prisma.game.findUnique({
            where: { token },
            include: { moves: { orderBy: { ply: "asc" } } },
          });

          if (!game || game.status !== "active") {
            send(ws, { type: "error", message: "Game not active" });
            return;
          }

          // Verify it's this player's turn
          const chess = new Chess(game.currentFen);
          const turnColor = chess.turn() === "w" ? "white" : "black";
          const room = getRoom(token);
          const player = room.get(guestId);

          if (player?.color !== turnColor) {
            send(ws, { type: "error", message: "Not your turn" });
            return;
          }

          const moveResult = validateAndApplyMove(
            game.currentFen,
            from,
            to,
            promotion
          );

          if (!moveResult.valid || !moveResult.fenAfter) {
            send(ws, { type: "error", message: moveResult.error ?? "Illegal move" });
            return;
          }

          const ply = game.moves.length + 1;

          await prisma.move.create({
            data: {
              gameId: game.id,
              ply,
              san: moveResult.san!,
              uci: moveResult.uci!,
              fenAfter: moveResult.fenAfter,
            },
          });

          if (moveResult.isGameOver) {
            await prisma.game.update({
              where: { id: game.id },
              data: {
                status: "finished",
                result: moveResult.result,
                resultReason: moveResult.resultReason,
                currentFen: moveResult.fenAfter,
              },
            });
          } else {
            await prisma.game.update({
              where: { id: game.id },
              data: { currentFen: moveResult.fenAfter },
            });
          }

          broadcastAll(room, {
            type: "move_made",
            move: {
              from,
              to,
              promotion,
              san: moveResult.san,
              uci: moveResult.uci,
            },
            fen: moveResult.fenAfter,
            ply,
            isGameOver: moveResult.isGameOver,
            result: moveResult.result,
            resultReason: moveResult.resultReason,
          });

          // Trigger bot response if bot game
          if (game.mode === "bot" && !moveResult.isGameOver) {
            setTimeout(
              () => handleBotMove(token, moveResult.fenAfter!),
              300
            );
          }

          return;
        }

        // ── RESIGN ──────────────────────────────────────────────────
        if (type === "resign") {
          const game = await prisma.game.findUnique({ where: { token } });
          if (!game || game.status !== "active") return;

          const room = getRoom(token);
          const player = room.get(guestId);
          const resignColor = player?.color ?? "white";
          const winner = resignColor === "white" ? "black" : "white";

          await prisma.game.update({
            where: { id: game.id },
            data: { status: "finished", result: winner, resultReason: "resign" },
          });

          broadcastAll(room, {
            type: "game_over",
            result: winner,
            resultReason: "resign",
          });

          return;
        }

        // ── HINT ────────────────────────────────────────────────────
        if (type === "hint") {
          const game = await prisma.game.findUnique({ where: { token } });
          if (!game || game.status !== "active") return;

          if (game.hintsUsed >= MAX_HINTS) {
            send(ws, { type: "error", message: "No hints remaining" });
            return;
          }

          const evalResult = await getBestMove(game.currentFen, "hard");

          await prisma.game.update({
            where: { id: game.id },
            data: { hintsUsed: game.hintsUsed + 1 },
          });

          const hintsRemaining = MAX_HINTS - game.hintsUsed - 1;
          const bestMove = evalResult.bestMove;
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);

          send(ws, {
            type: "hint",
            move: { from, to, uci: bestMove },
            explanation: `Best move: ${bestMove}. Plays to maintain or improve your position.`,
            hintsRemaining,
          });

          return;
        }

        send(ws, { type: "error", message: `Unknown event: ${type}` });
      });

      ws.on("close", () => {
        const room = getRoom(token);
        room.delete(guestId);
        // Broadcast disconnect to remaining players
        broadcast(room, { type: "opponent_disconnected" }, guestId);
      });
    }
  );
}
