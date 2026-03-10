FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root and backend
COPY package*.json ./
COPY backend/package.json ./backend/
COPY database/schema.prisma ./database/

RUN npm install --workspace=backend --include-workspace-root 2>/dev/null || true

COPY backend ./backend
COPY database ./database

WORKDIR /app/backend
RUN npx prisma generate --schema=../database/schema.prisma
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/database/schema.prisma ./prisma/schema.prisma

RUN mkdir -p /app/uploads

EXPOSE 4000
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
