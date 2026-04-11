# ── Stage 1: install all dependencies ──────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml ./
COPY .npmrc ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/elevator-tracker/package.json ./artifacts/elevator-tracker/
COPY scripts/package.json ./scripts/

RUN pnpm install --shamefully-hoist

# ── Stage 2: build frontend ─────────────────────────────────────────────────
FROM deps AS frontend-builder
WORKDIR /app

COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/elevator-tracker/ ./artifacts/elevator-tracker/
COPY attached_assets/ ./attached_assets/

ENV NODE_ENV=production
ENV BASE_PATH=/

RUN pnpm --filter @workspace/elevator-tracker run build

# ── Stage 3: build API server ────────────────────────────────────────────────
FROM deps AS api-builder
WORKDIR /app

COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm --filter @workspace/api-server run build

# ── Stage 4: production image ────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests for production install
COPY package.json pnpm-workspace.yaml ./
COPY .npmrc ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY scripts/package.json ./scripts/

RUN pnpm install --prod --shamefully-hoist

# Copy built outputs
COPY --from=api-builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=frontend-builder /app/artifacts/elevator-tracker/dist ./artifacts/elevator-tracker/dist

# Copy lib source (needed at runtime by the API server imports)
COPY --from=api-builder /app/lib ./lib

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
