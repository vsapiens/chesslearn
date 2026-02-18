import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.js";
import { analyzeGame } from "../analysis/analyzer.js";

interface GameIdParams {
  gameId: string;
}

export async function analysisRoutes(fastify: FastifyInstance) {
  // POST /api/analysis/:gameId — trigger async analysis
  fastify.post<{ Params: GameIdParams }>(
    "/api/analysis/:gameId",
    async (req: FastifyRequest<{ Params: GameIdParams }>, reply: FastifyReply) => {
      const { gameId } = req.params;

      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) {
        return reply.code(404).send({ error: "Game not found" });
      }
      if (game.status !== "finished") {
        return reply.code(400).send({ error: "Game not finished yet" });
      }

      // Check if analysis already exists and is fresh
      const existing = await prisma.review.findUnique({ where: { gameId } });
      if (existing) {
        return reply.send({ status: "ready", reviewId: existing.id });
      }

      // Trigger analysis in background
      analyzeGame(gameId).catch((err) => {
        console.error("[Analysis] Error:", err);
      });

      return reply.code(202).send({ status: "processing", gameId });
    }
  );

  // GET /api/analysis/:gameId — get analysis results
  fastify.get<{ Params: GameIdParams }>(
    "/api/analysis/:gameId",
    async (req: FastifyRequest<{ Params: GameIdParams }>, reply: FastifyReply) => {
      const { gameId } = req.params;

      const review = await prisma.review.findUnique({
        where: { gameId },
        include: {
          positions: { orderBy: { ply: "asc" } },
        },
      });

      if (!review) {
        return reply.code(404).send({ status: "pending", error: "Analysis not ready" });
      }

      // Key moments: top 5 worst moves (blunders first, then mistakes)
      const sorted = [...review.positions].sort((a, b) => {
        const order: Record<string, number> = {
          blunder: 0,
          mistake: 1,
          inaccuracy: 2,
          good: 3,
          best: 4,
          book: 5,
        };
        return (order[a.category ?? "good"] ?? 3) - (order[b.category ?? "good"] ?? 3);
      });

      const keyMoments = sorted.slice(0, 5);

      return reply.send({
        status: "ready",
        reviewId: review.id,
        summary: review.summary,
        positions: review.positions,
        keyMoments,
        createdAt: review.createdAt,
      });
    }
  );
}
