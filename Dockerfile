FROM oven/bun:1.3.14 AS app
COPY --from=node:24-bookworm-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /workspace
ENV TMPDIR=/workspace/.scratch BUN_INSTALL_CACHE_DIR=/workspace/.scratch/bun-cache
RUN mkdir -p /workspace/.scratch
COPY package.json bun.lock bunfig.toml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/desktop/package.json apps/desktop/package.json
COPY apps/website/package.json apps/website/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/app-store/package.json packages/app-store/package.json
COPY packages/banking/package.json packages/banking/package.json
COPY packages/bot/package.json packages/bot/package.json
COPY packages/cache/package.json packages/cache/package.json
COPY packages/categories/package.json packages/categories/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/customers/package.json packages/customers/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/desktop-client/package.json packages/desktop-client/package.json
COPY packages/documents/package.json packages/documents/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/encryption/package.json packages/encryption/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/health/package.json packages/health/package.json
COPY packages/import/package.json packages/import/package.json
COPY packages/inbox/package.json packages/inbox/package.json
COPY packages/insights/package.json packages/insights/package.json
COPY packages/invoice/package.json packages/invoice/package.json
COPY packages/job-client/package.json packages/job-client/package.json
COPY packages/jobs/package.json packages/jobs/package.json
COPY packages/location/package.json packages/location/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/mcp-apps/package.json packages/mcp-apps/package.json
COPY packages/notifications/package.json packages/notifications/package.json
COPY packages/pramaan/package.json packages/pramaan/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/supabase/package.json packages/supabase/package.json
COPY packages/trpc/package.json packages/trpc/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/workbench/package.json packages/workbench/package.json
RUN bun install --frozen-lockfile --ignore-scripts --backend hardlink && rm -rf /workspace/.scratch/bun-cache
COPY . .
ARG NEXT_PUBLIC_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_URL=http://localhost:3002
ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:65431
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_TELEMETRY_DISABLED=1
RUN bun --bun run --cwd packages/db schema:export > scripts/local/schema.sql
RUN bun run --cwd packages/workbench build
RUN bun run --cwd packages/mcp-apps build
RUN bun run --cwd apps/dashboard build
CMD ["bun", "scripts/local/run.ts"]
