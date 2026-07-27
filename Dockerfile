# syntax=docker/dockerfile:1.7
#
# Self-host alternative build. The primary production target is Cloudflare
# Workers (`bun run build`, default Nitro preset — see docs/DEPLOYMENT.md),
# which this Dockerfile does NOT produce; a Workers bundle is a `fetch`
# handler, not something `node` can run standalone. This image instead
# builds with NITRO_PRESET=node-server, which emits a self-contained Nitro
# server bundle under .output/ that a plain Node process can serve, for
# operators who want to run the frontend on their own infrastructure instead
# of Cloudflare.

# ---- Build stage ------------------------------------------------------------
FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./

# The @lovable.dev/* packages this app depends on live in a private registry
# (see docs/DEPLOYMENT.md). Pass credentials as BuildKit secrets so they
# never land in an image layer:
#   docker build --secret id=bun_registry,env=BUN_CONFIG_REGISTRY \
#                --secret id=bun_token,env=BUN_CONFIG_TOKEN .
RUN --mount=type=secret,id=bun_registry \
    --mount=type=secret,id=bun_token \
    BUN_CONFIG_REGISTRY="$(cat /run/secrets/bun_registry 2>/dev/null || true)" \
    BUN_CONFIG_TOKEN="$(cat /run/secrets/bun_token 2>/dev/null || true)" \
    bun install --frozen-lockfile

COPY . .

ARG VITE_ENABLE_DEMO_LOGIN=false
ENV VITE_ENABLE_DEMO_LOGIN=${VITE_ENABLE_DEMO_LOGIN}
ENV NITRO_PRESET=node-server
RUN bun run build

# ---- Runtime stage -----------------------------------------------------------
FROM node:22-alpine AS runtime

RUN addgroup -S -g 10001 enterprise-core && adduser -S -u 10001 -G enterprise-core enterprise-core
WORKDIR /app

COPY --from=build --chown=enterprise-core:enterprise-core /app/.output ./.output

USER 10001:10001
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
