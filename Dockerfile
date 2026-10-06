# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# MedSync backend - production Dockerfile (NestJS 11 + Prisma 7 + Node 22)
#
#   builder    : full deps -> `prisma generate` -> `nest build`
#   prod-deps  : production-only node_modules
#   production : minimal runtime, non-root user, only compiled artifacts
#
# No secrets are baked in. All configuration (DATABASE_URL / Supabase URLs,
# JWT secrets, PORT, ...) is injected at RUNTIME via:
#     docker run --env-file .env ..
#     docker run -e KEY=value ..
#     docker compose (env_file: .env)
# ---------------------------------------------------------------------------

# ===========================================================================
# Stage 1 - builder
# ===========================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /usr/src/app

# Prisma needs OpenSSL; ca-certificates keeps npm/Prisma TLS happy.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 1) Install dependencies first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci

# 2) Copy sources (see .dockerignore for what is excluded).
COPY . .

# 3) Generate the Prisma 7 client into ./generated/prisma (path defined in
#    prisma/schema.prisma) and compile the NestJS app to ./dist/main.js.
#    `mkdir -p generated` guarantees the directory exists for the runtime COPY
#    even if the generator output path is changed later.
RUN npx prisma generate \
    && mkdir -p generated \
    && npm run build

# ===========================================================================
# Stage 2 - production dependencies only
# ===========================================================================
FROM node:22-bookworm-slim AS prod-deps

WORKDIR /usr/src/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# `prisma` and `@prisma/client` are devDependencies in package.json. That is
# correct with the new `prisma-client` generator: `prisma generate` only
# needs to run in the builder. Runtime only needs the prod deps below.
RUN npm ci --omit=dev \
    && npm cache clean --force

# ===========================================================================
# Stage 3 - runtime
# ===========================================================================
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production \
    PORT=3000

# dumb-init gives us correct PID 1 signal handling (clean shutdown for NestJS).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssl ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Production node_modules.
COPY --from=prod-deps --chown=node:node /usr/src/app/node_modules ./node_modules

# The generated Prisma client may resolve runtime helpers from the
# `@prisma/client` package, which `npm ci --omit=dev` does not install
# (it is a devDependency). Copy the whole `@prisma` subtree from the builder
# (same lockfile, same versions) so the client finds everything it needs
# without shipping unrelated dev dependencies.
COPY --from=builder   --chown=node:node /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Compiled NestJS application. Entrypoint is `dist/main.js`, guaranteed by
# `include: ["src/**/*"]` in tsconfig.build.json.
COPY --from=builder   --chown=node:node /usr/src/app/dist         ./dist

# Prisma 7 self-contained client. Lives as a SIBLING of dist/ because
# `src/prisma/prisma.service.ts` imports `../../generated/prisma/client.js`,
# which after compilation resolves to `<root>/generated/prisma/client.js`.
COPY --from=builder   --chown=node:node /usr/src/app/generated    ./generated

# Prisma schema (enables running `prisma migrate deploy` out-of-band; NOT
# run automatically on container start).
COPY --from=builder   --chown=node:node /usr/src/app/prisma       ./prisma

COPY --chown=node:node package.json ./

# Drop privileges: the official node image ships a "node" user (uid 1000).
USER node

EXPOSE 3000

# Uncomment once the app exposes GET /health.
# HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
#   CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
