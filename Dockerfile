# syntax=docker/dockerfile:1

# --- Base ---------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- Dependencies ---------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# --- Builder ---------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runner (Next.js app, standalone output) --------------------------------
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 eduai

COPY --from=builder /app/public ./public
COPY --from=builder --chown=eduai:nodejs /app/.next/standalone ./
COPY --from=builder --chown=eduai:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/storage/uploads && chown -R eduai:nodejs /app/storage

USER eduai
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]

# --- Worker (BullMQ background processing) -----------------------------------
FROM base AS worker
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 eduai

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN npx prisma generate

RUN mkdir -p /app/storage/uploads && chown -R eduai:nodejs /app/storage

USER eduai
CMD ["npx", "tsx", "src/infrastructure/queue/workers/index.ts"]
