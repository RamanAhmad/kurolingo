# ────────────────────────────────────────────────────────────────────────────
#  Kurdolingo — Production Dockerfile
#
#  Multi-stage build:
#    Stage 1 (builder): builds the React frontend with Vite
#    Stage 2 (runner):  runs the Node.js backend, serves the built frontend
# ────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Install frontend deps (npm install instead of npm ci — no lockfile required)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build
# Output: /build/frontend/dist

# ── Stage 2: Production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Security: run as non-root user
RUN addgroup -g 1001 kurdolingo && \
    adduser -u 1001 -G kurdolingo -s /bin/sh -D kurdolingo

WORKDIR /app

# Install backend deps (npm install instead of npm ci — no lockfile required)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend source
COPY backend/src/ ./backend/src/
COPY backend/.env.example ./backend/.env.example

# Copy built frontend from builder stage
COPY --from=builder /build/frontend/dist ./frontend/dist

# Create upload directories
RUN mkdir -p ./backend/uploads/audio ./backend/uploads/images && \
    chown -R kurdolingo:kurdolingo /app

# Switch to non-root
USER kurdolingo

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "backend/src/index.js"]
