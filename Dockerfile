# syntax=docker/dockerfile:1
# Buaze production image, built by Coolify's "Dockerfile" build pack
# (CLAUDE.md §55, docs/SELF_HOST.md).
#
# Why not Railpack: the build runs `prisma migrate deploy` and pre-renders
# pages that read the database, and the database lives on Coolify's internal
# network. Coolify builds a Dockerfile with `--network host` plus an
# `--add-host` entry for every container on that network, so the build can
# reach it; the Railpack frontend does not pass those hosts on.
#
# Secrets: turn on "Use Docker Build Secrets" in Coolify so build-time values
# are mounted per RUN step instead of being written into the image history.
FROM node:22-trixie-slim

ENV NEXT_TELEMETRY_DISABLED=1

# openssl: Prisma detects the OpenSSL version to pick its engine.
# postgresql-client: pg_dump / psql 17 for scripts/db-migration.
# curl: Coolify health check and the ops scripts.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl curl postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so a code-only change reuses this layer.
# `npm ci` runs the postinstall `prisma generate`, which needs the schema.
# The npm download cache and Next's compiler cache live in BuildKit cache
# mounts on the server, so a rebuild reuses them instead of starting cold.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
  npm ci --no-audit --no-fund --prefer-offline

COPY . .
# One retry when only the Google Fonts download failed (scripts/build-retry.mjs).
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
  node scripts/build-retry.mjs

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
