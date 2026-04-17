# --- Stage 1: install production deps ---
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- Stage 2: runtime ---
FROM node:22-alpine AS runtime

RUN adduser -D -H -u 1001 signpost \
 && mkdir -p /app/.cache \
 && chown -R signpost:signpost /app

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=signpost:signpost package.json ./
COPY --chown=signpost:signpost src/ ./src/
COPY --chown=signpost:signpost templates/ ./templates/
COPY --chown=signpost:signpost vendor/ ./vendor/

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    TEMPLATES_DIR=/app/templates \
    CACHE_DIR=/app/.cache \
    FONTS_DIR=/app/vendor/fonts

EXPOSE 8080
USER signpost

# Healthcheck via /healthz; cheap, no external deps.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "src/server.js"]
