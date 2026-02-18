import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { nanoid } from "nanoid";
import { prisma } from "../db/client.js";
import { validateAndApplyMove } from "../chess/validator.js";

interface CreateGameBody {
  mode: "human" | "bot";
  colorPreference?: "white" | "black" | "random";
  botDifficulty?: "easy" | "medium" | "hard";
  timeControl?: string;
}

interface JoinGameParams {
  token: string;
}

interface ResignBody {
  guestId: string;
}

export async function gameRoutes(fastify: FastifyInstance) {
  // POST /api/games — create a new game
  fastify.post<{ Body: CreateGameBody }>(
    "/api/games",
    async (req: FastifyRequest<{ Body: CreateGameBody }>, reply: FastifyReply) => {
      const {
        mode = "human",
        colorPreference = "random",
        botDifficulty = "medium",
        timeControl,
      } = req.body ?? {};

      const token = nanoid(12);

      // Assign colors
      let whiteGuestId: string | null = null;
      let blackGuestId: string | null = null;
      let playerColor: string | null = null;

      if (mode === "bot") {
        playerColor =
          colorPreference === "random"
            ? Math.random() < 0.5
              ? "white"
              : "black"
            : colorPreference ?? "white";
      }

      const game = await prisma.game.create({
        data: {
          token,
          mode,
          status: "waiting",
          botDifficulty: mode === "bot" ? botDifficulty : null,
          playerColor: mode === "bot" ? playerColor : null,
          timeControl: timeControl ?? null,
        },
      });

      return reply.code(201).send({
        gameId: game.id,
        token: game.token,
        inviteUrl: `${process.env.FRONTEND_URL}/g/${token}`,
        mode,
        playerColor,
        status: game.status,
      });
    }
  );

  // GET /api/games/:token — get game state
  fastify.get<{ Params: JoinGameParams }>(
    "/api/games/:token",
    async (req: FastifyRequest<{ Params: JoinGameParams }>, reply: FastifyReply) => {
      const { token } = req.params;

      const game = await prisma.game.findUnique({
        where: { token },
        include: { moves: { orderBy: { ply: "asc" } } },
      });

      if (!game) {
        return reply.code(404).send({ error: "Game not found" });
      }

      return reply.send({
        gameId: game.id,
        token: game.token,
        mode: game.mode,
        status: game.status,
        result: game.result,
        resultReason: game.resultReason,
        currentFen: game.currentFen,
        pgn: game.pgn,
        moves: game.moves,
        botDifficulty: game.botDifficulty,
        playerColor: game.playerColor,
        whiteGuestId: game.whiteGuestId,
        blackGuestId: game.blackGuestId,
        timeControl: game.timeControl,
        createdAt: game.createdAt,
      });
    }
  );

  // POST /api/games/:token/resign
  fastify.post<{ Params: JoinGameParams; Body: ResignBody }>(
    "/api/games/:token/resign",
    async (
      req: FastifyRequest<{ Params: JoinGameParams; Body: ResignBody }>,
      reply: FastifyReply
    ) => {
      const { token } = req.params;
      const { guestId } = req.body ?? {};

      const game = await prisma.game.findUnique({ where: { token } });

      if (!game) {
        return reply.code(404).send({ error: "Game not found" });
      }

      if (game.status === "finished") {
        return reply.code(400).send({ error: "Game already finished" });
      }

      // Determine which color resigned
      let resignColor: string;
      if (game.mode === "bot") {
        resignColor = game.playerColor ?? "white";
      } else {
        resignColor = game.whiteGuestId === guestId ? "white" : "black";
      }

      const winner = resignColor === "white" ? "black" : "white";

      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: "finished",
          result: winner,
          resultReason: "resign",
        },
      });

      return reply.send({ result: winner, resultReason: "resign" });
    }
  );

  // GET /api/games/:token/pgn — download PGN
  fastify.get<{ Params: JoinGameParams }>(
    "/api/games/:token/pgn",
    async (req: FastifyRequest<{ Params: JoinGameParams }>, reply: FastifyReply) => {
      const { token } = req.params;
      const game = await prisma.game.findUnique({ where: { token } });

      if (!game) return reply.code(404).send({ error: "Not found" });

      reply.header("Content-Type", "application/x-chess-pgn");
      reply.header(
        "Content-Disposition",
        `attachment; filename="game-${token}.pgn"`
      );
      return reply.send(game.pgn || "[Event \"Chess Platform Game\"]\n\n*");
    }
  );
}
