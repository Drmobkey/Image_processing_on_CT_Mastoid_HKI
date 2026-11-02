# ==========================================
# Tahap 1: Dependencies (Pemasangan pustaka)
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Salin package.json dan package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Tahap 2: Builder (Kompilasi Next.js)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argument build untuk Next.js client-side environment variable
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js
RUN npm run build

# ==========================================
# Tahap 3: Runner (Produksi Runtime)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Buat user non-root demi keamanan
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Salin aset publik dan artefak build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Jalankan server Next.js di port 3000
CMD ["npm", "start"]

