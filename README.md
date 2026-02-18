# ChessLearn

Play chess against friends (link invite) or bots — with post-game engine analysis powered by Stockfish.

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

## License

MIT
