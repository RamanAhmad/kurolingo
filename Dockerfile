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

# Copy frontend package files and install dependencies
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

# Copy backend package files and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=builder /build/frontend/dist ./frontend/dist

# Create upload directories and set permissions
RUN mkdir -p ./backend/uploads/audio ./backend/uploads/images && \
    chown -R kurdolingo:kurdolingo /app

# Switch to non-root
USER kurdolingo

# Environment
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Healthcheck
#HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
#  CMD wget --quiet --tries=1 --spider http://localhost:$PORT/api/health || exit 1

# Start backend
CMD ["node", "backend/src/index.js"]