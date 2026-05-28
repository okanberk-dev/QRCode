#!/bin/bash
set -euo pipefail

# Buaze QR — SessionStart hook for Claude Code on the web.
# Installs npm dependencies and generates the Prisma client so that
# `tsc`, `eslint`, and the test runner work the moment the session starts.

# Only run in the remote (web) environment; local dev manages its own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Prisma's schema references DATABASE_URL/DIRECT_URL via env(); `prisma generate`
# (run through npm's postinstall) only needs them *defined*, not reachable.
# Supply stub values when the environment hasn't already injected real ones.
export DATABASE_URL="${DATABASE_URL:-postgresql://stub:stub@localhost:5432/stub}"
export DIRECT_URL="${DIRECT_URL:-postgresql://stub:stub@localhost:5432/stub}"

# npm install (not ci) is friendlier to the container snapshot cache and is
# idempotent — safe to re-run on resume/clear/compact.
npm install --no-audit --no-fund

# Belt-and-suspenders: ensure the Prisma client exists even if postinstall
# was skipped for any reason.
npx prisma generate

echo "SessionStart hook complete: dependencies installed, Prisma client generated."
