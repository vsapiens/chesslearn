import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { gameRoutes } from "./routes/games.js";
import { analysisRoutes } from "./routes/analysis.js";
import { gameRoomWs } from "./ws/gameRoom.js";
import { prisma } from "./db/client.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

async function bootstrap() {
  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // ── Plugins ─────────────────────────────────────────────────────
  await app.register(cors, {
    origin: [FRONTEND_URL, "http://localhost:3000"],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      error: "Too many requests",
      statusCode: 429,
    }),
  });

  await app.register(websocket);

  // ── Routes ───────────────────────────────────────────────────────
  await app.register(gameRoutes);
  await app.register(analysisRoutes);
  await app.register(gameRoomWs);

  // ── Health ───────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    ts: new Date().toISOString(),
  }));

  // ── Start ────────────────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`Chess server running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
