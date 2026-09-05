# ChessLearn

Play chess against friends (link invite) or bots — with post-game engine analysis powered by Stockfish.

## Overview

ChessLearn is a self-hosted multiplayer chess platform built with Fastify and Next.js. It pairs real-time WebSocket gameplay with Stockfish-powered analysis so players can review their mistakes and improve after every game.

## Features

- **Multiplayer** — Create a game and share the link. WebSocket-based real-time play.
- **Bot opponents** — Play against Stockfish at Easy, Medium, or Hard difficulty.
- **In-game hints** — Request engine hints (limited per game) to learn as you play.
- **Post-game analysis** — Full engine evaluation with blunder/mistake/inaccuracy detection.
- **Review mode** — Step through any finished game with engine annotations and key moments.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Fastify + WebSocket (TypeScript) |
| Database | SQLite via Prisma ORM |
| Chess engine | Stockfish UCI |
| Frontend | Next.js 14 (App Router) + React |
| Board UI | react-chessboard |
| Styling | Tailwind CSS |

## Project Structure

```
server/
  src/
    index.ts              # Fastify entry point
    routes/games.ts       # REST: create/fetch games
    routes/analysis.ts    # REST: post-game analysis
    ws/gameRoom.ts        # WebSocket: live game rooms
    chess/validator.ts     # chess.js move validation
    chess/engine.ts        # Stockfish UCI wrapper
    analysis/analyzer.ts   # Post-game analysis pipeline
    db/client.ts           # Prisma client singleton
  prisma/schema.prisma     # Database schema

web/
  app/
    page.tsx               # Home
    play/new/page.tsx      # Game configuration
    g/[token]/page.tsx     # Live game room
    review/[gameId]/page.tsx # Post-game review
    learn/page.tsx         # Tips & resources
  components/
    GameBoard.tsx          # Board wrapper
    MoveList.tsx           # PGN-style move list
    ReviewPanel.tsx        # Analysis display
  lib/
    socket.ts              # Typed WebSocket client
    api.ts                 # REST client
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Server (port 3001)

```bash
cd server
cp .env.example .env
npm install
npm run db:push        # create SQLite DB + apply schema
npm run dev
```

### Web (port 3000)

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Both at once

```bash
chmod +x start-dev.sh
./start-dev.sh
```

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma datasource URL for SQLite | `file:./dev.db` |
| `PORT` | HTTP/WebSocket server port | `3001` |
| `FRONTEND_URL` | Allowed CORS origin for the web client | `http://localhost:3000` |
| `MAX_HINTS_PER_GAME` | Engine hints each player can request per game | `3` |

### Web (`web/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL for REST API calls | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | Base URL for WebSocket connections | `ws://localhost:3001` |

> **Production note:** `NEXT_PUBLIC_*` variables are baked into the Next.js bundle at build time. See `.env.production.example` for production values (HTTPS/WSS URLs pointing to your domain).

## WebSocket Protocol

### Client to Server

| Event | Payload |
|-------|---------|
| `join` | `{ guestId }` |
| `move` | `{ from, to, promotion? }` |
| `resign` | `{}` |
| `hint` | `{}` |

### Server to Client

| Event | Payload |
|-------|---------|
| `game_state` | Full game snapshot on join |
| `move_made` | `{ move, fen, ply, isGameOver?, result? }` |
| `bot_moved` | Same shape as `move_made` |
| `game_over` | `{ result, resultReason }` |
| `opponent_joined` | `{ color }` |
| `hint` | `{ move, explanation, hintsRemaining }` |
| `error` | `{ message }` |

## Bot Difficulty

| Level | Search Depth | Stockfish Skill Level |
|-------|-------------|----------------------|
| Easy | 3 | 2 |
| Medium | 8 | 10 |
| Hard | 18 | 20 |

## Analysis Thresholds (centipawns)

- **Blunder**: > 200 cp drop
- **Mistake**: > 100 cp drop
- **Inaccuracy**: > 50 cp drop

## Deployment

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2+
- (Optional) `make` for shorthand commands

### Quick Start with Docker

```bash
# Build and start both services
make dev
# — or without make —
docker compose up --build
```

The server runs on `http://localhost:3001` and the web frontend on `http://localhost:3000`.

### Makefile Targets

| Target | Description |
|--------|-------------|
| `make dev` | Build images and start in foreground |
| `make build` | Build images only |
| `make up` | Start containers in background |
| `make down` | Stop all containers |
| `make logs` | Tail container logs |
| `make db-push` | Apply Prisma schema to the database |
| `make clean` | Stop containers and remove volumes |
| `make prod` | Build and start with `.env.production` |

### Production Deployment

1. **Configure environment** — copy and edit the production template:

```bash
cp .env.production.example .env.production
```

Set `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_WS_URL` to your actual domain. `NEXT_PUBLIC_*` variables are baked into the Next.js bundle at build time.

2. **Build and run**:

```bash
make prod
# — or —
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

3. **Reverse proxy (optional)** — an Nginx config is provided in `nginx/nginx.conf`. Replace `your-domain.com` and the TLS certificate paths, then run Nginx in front of the Docker services to handle HTTPS and route traffic.

### VPS Deployment (DigitalOcean, Hetzner, Linode, etc.)

```bash
# On the server
git clone <your-repo-url> chesslearn
cd chesslearn
cp .env.production.example .env.production
# Edit .env.production with your domain and settings
make prod
```

SQLite data is persisted in the `chess-data` Docker volume. To back up:

```bash
docker compose exec server cp /data/chess.db /data/chess-backup.db
docker cp "$(docker compose ps -q server)":/data/chess-backup.db ./backup.db
```

### Platform-Specific Notes

**Railway / Render** — Deploy each directory (`server/` and `web/`) as a separate service. Set the environment variables from `.env.production.example` in the platform dashboard. Railway supports persistent volumes for SQLite; on Render, attach a disk to the server service mounted at `/data`.

**Fly.io** — Use `fly launch` in each directory. Add a persistent volume for the server (`fly volumes create chess_data`) and mount it at `/data`. Set `NEXT_PUBLIC_*` build args in the web service's `fly.toml`.

### Database Considerations

SQLite works well for single-server deployments. If you need horizontal scaling (multiple server instances), migrate to PostgreSQL by updating the Prisma schema `datasource` provider and `DATABASE_URL`.

## License

MIT
