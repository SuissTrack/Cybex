# ─── Stage 1 : dépendances de production uniquement ────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Installer les dépendances natives requises par Prisma + canvas
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY prisma ./prisma/

# Installer toutes les dépendances (prisma generate nécessite les devDeps)
RUN npm ci

# Générer le client Prisma
RUN npx prisma generate

# ─── Stage 2 : build Next.js ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Désactiver la télémétrie Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Variables d'environnement minimales requises pour le build
# (les vraies valeurs sont injectées au runtime via l'orchestrateur)
ARG DATABASE_URL=postgresql://noop:noop@localhost/noop
ARG AUTH_SECRET=build-time-placeholder-not-used-in-prod
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET

RUN npm run build

# ─── Stage 3 : image de production minimale ─────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copier uniquement les artefacts nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copier le schéma Prisma (requis pour migrate deploy au démarrage)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck Docker natif
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
