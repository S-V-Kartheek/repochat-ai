# =============================================================
# RepoTalk Gateway — Dockerfile
# Week 11 hardening: multi-stage + prod runtime deps + non-root.
# =============================================================

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma client artifacts from builder so runtime has
# a generated client without requiring prisma CLI in production.
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl ca-certificates \
 && addgroup -S appgroup \
 && adduser -S appuser -G appgroup

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=prod-deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
