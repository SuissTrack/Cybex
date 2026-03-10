FROM mcr.microsoft.com/playwright:v1.42.1-jammy AS builder

WORKDIR /app

COPY automation-engine/package.json ./automation-engine/
COPY database/schema.prisma ./database/

WORKDIR /app/automation-engine
RUN npm install
RUN npx prisma generate --schema=../database/schema.prisma
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.42.1-jammy AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/automation-engine/dist ./dist
COPY --from=builder /app/automation-engine/node_modules ./node_modules
COPY --from=builder /app/automation-engine/package.json ./
COPY --from=builder /app/database/schema.prisma ./prisma/schema.prisma

RUN mkdir -p /app/uploads

EXPOSE 0

CMD ["node", "dist/index.js"]
