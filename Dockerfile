# ---------- зависимости ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# ---------- сборка ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# NEXT_PUBLIC_* Next подставляет как литерал на этапе сборки, поэтому
# задавать этот адрес только переменной окружения контейнера недостаточно
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# API_BASE нужен и на сборке: страницы пререндерятся, и без него в образ
# попадут демо-данные с баннером «Демо-режим». В рантайме он тоже нужен —
# по нему идёт ревалидация, это переменная окружения контейнера
ARG API_BASE=""
ARG MERIDIAN_PROJECT_SLUG=""
ENV API_BASE=$API_BASE
ENV MERIDIAN_PROJECT_SLUG=$MERIDIAN_PROJECT_SLUG
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- запуск ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
