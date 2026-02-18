#!/usr/bin/env bash
# Start both server and web in development mode
# Requires two terminals OR use a process manager like concurrently

echo "Starting Chess Platform..."
echo ""
echo "Backend  → http://localhost:3001"
echo "Frontend → http://localhost:3000"
echo ""

# Option A: run sequentially in same terminal (use tmux/split panes)
# cd server && npm run dev
# cd web    && npm run dev

# Option B: use concurrently if installed
if command -v npx &>/dev/null; then
  npx concurrently \
    --names "server,web" \
    --prefix-colors "cyan,magenta" \
    "cd server && npm run dev" \
    "cd web && npm run dev"
fi
