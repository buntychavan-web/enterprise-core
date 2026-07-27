# Deployment guide (enterprise-core / EWOS frontend)

## Architecture: this is not a static site

The build output has both a static half and a server half:

- `.output/public/` — static assets (JS/CSS/images).
- `.output/server/` — a TanStack Start SSR entry (Nitro). Every route render
  goes through this, not just the initial asset load.

A plain static host (S3 + CloudFront, GitHub Pages, a CDN bucket) **cannot**
serve this app — there is no build mode that produces a pure static bundle.
You need either Cloudflare Workers (the default target) or a Node process
running `.output/server/index.mjs` (the Docker alternative below).

## Primary target: Cloudflare Workers

`bun run build` (no extra flags/env) targets Nitro's `cloudflare-module`
preset by default — see `vite.config.ts`'s comment and
`node_modules/@lovable.dev/vite-tanstack-config`. The build emits
`.output/server/wrangler.json` alongside the bundle; deploy with:

```bash
bun run build
npx wrangler deploy   # reads the generated wrangler.json
# or, from CI without re-running the build:
npx nitro deploy --prebuilt
```

This needs, at minimum:

- A Cloudflare account with Workers enabled, and `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID` available to whatever runs the deploy command
  (not currently wired into `.github/workflows/ci.yml` — that workflow
  builds and tests, it does not deploy; add a deploy job once these
  secrets are set).
- The private `@lovable.dev/*` package registry credentials at build time
  (`BUN_CONFIG_REGISTRY` / `BUN_CONFIG_TOKEN`) — see "Required secrets"
  below.

## Required manual step: routing `/api/v1/*` to the backend

`src/lib/api-client.ts` calls `fetch(\`/api/v1${path}\`, ...)` — a
same-origin relative path. In local dev, `vite.config.ts`'s dev server
proxy forwards that to `http://localhost:8080`. **There is no equivalent
proxy configured for the production build** — nothing here rewrites
`/api/v1/*` to the deployed EWOS backend automatically.

Before going live, configure one of:

- A Cloudflare Worker route + [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
  to the backend Worker, if the backend is also deployed on Cloudflare.
- A reverse-proxy rule at your CDN/ingress layer (e.g. a Cloudflare Page
  Rule, an nginx `location /api/v1/ { proxy_pass ... }` block if
  self-hosting via the Docker image, or an ALB routing rule) pointing
  `/api/v1/*` at wherever `com.ewos` (the `ewos` repo) is actually running.

This is intentionally left as an operator decision — it depends on where
and how the backend is deployed, which this repo doesn't control.

## Self-host alternative: Docker

For operators not using Cloudflare Workers, `Dockerfile` builds with
`NITRO_PRESET=node-server` instead, which produces a self-contained Nitro
bundle a plain `node` process can serve:

```bash
docker build \
  --secret id=bun_registry,env=BUN_CONFIG_REGISTRY \
  --secret id=bun_token,env=BUN_CONFIG_TOKEN \
  -t enterprise-core:local .

docker run --rm -p 3000:3000 enterprise-core:local
```

Same `/api/v1/*` routing caveat applies — put a reverse proxy in front (or
alongside) this container.

## Required secrets

| Secret | Used by | Notes |
| --- | --- | --- |
| `BUN_CONFIG_REGISTRY` / `BUN_CONFIG_TOKEN` | CI, Docker build | Credentials for the private `@lovable.dev/*` package registry (`europe-west1-npm.pkg.dev`). Without these, `bun install --frozen-lockfile` fails with 403s on 3 packages. An operator with Lovable.dev platform access must issue these. |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | A future deploy job | Not yet wired into CI — add when ready to automate Cloudflare deploys. |
| `VITE_ENABLE_DEMO_LOGIN` | Build | Must be unset or `false` for any production build — `vite.config.ts` hard-fails a `mode: production` build if it's `true`. |

## CI

`.github/workflows/ci.yml` installs, lints, typechecks, runs the Vitest
suite, builds, and runs the Playwright e2e suite (see its own comments for
the Nitro node-server-preset trick that lets Playwright serve the built app
locally). It does not deploy anywhere — deployment is a manual or
separately-configured step per the above.
