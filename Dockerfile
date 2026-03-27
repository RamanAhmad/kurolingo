# ────────────────────────────────────────────────────────────────────────────
#  Kurdolingo — Production Dockerfile
#
#  Multi-stage build:
#    Stage 1 (builder): builds the React frontend with Vite
#    Stage 2 (runner):  runs the Node.js backend, serves the built frontend
#
#  Usage:
#    docker build -t kurdolingo .
#    docker run -d \
#      -p 4000:4000 \
#      -e JWT_SECRET=$(openssl rand -hex 32) \
#      -e NODE_ENV=production \
#      -e ALLOWED_ORIGINS=https://kurdolingo.de \
#      -v $(pwd)/data:/app/backend/kurdolingo.db \
#      -v $(pwd)/uploads:/app/backend/uploads \
#      kurdolingo
# ────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Install frontend deps first (layer cache)
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

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

# Install backend deps (production only)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

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

# Health check — Docker will restart container if API goes unresponsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

EXPOSE 4000

# ── Environment variables (set at runtime, not build time) ───────────────────
# JWT_SECRET      — REQUIRED in production
# NODE_ENV        — should be "production"
# ALLOWED_ORIGINS — comma-separated list of allowed frontend origins
# TRUST_PROXY     — 1 if behind nginx/Cloudflare, 2 for double proxy
# PORT            — default 4000

ENV NODE_ENV=production

CMD ["node", "backend/src/index.js"]
