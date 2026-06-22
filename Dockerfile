FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/thub_test
ENV AUTH_SECRET=build-only-placeholder-not-used-at-runtime
ENV STORAGE_PROVIDER=CLOUDBASE
ENV CLOUDBASE_ENV_ID=build-environment-placeholder
ENV CLOUDBASE_REGION=ap-shanghai

RUN npx prisma generate --schema prisma/schema.prisma && npx next build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
