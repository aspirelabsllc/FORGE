# Build Onlook web client
FROM oven/bun:1

WORKDIR /app

# Set build and production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV STANDALONE_BUILD=true
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Build-time variables. Railway supplies service variables as Docker build args,
# but a Dockerfile only exposes them to RUN steps that declare them as ARG.
# NEXT_PUBLIC_* MUST be present during `next build` because Next.js inlines them
# into the client bundle (setting them only at runtime would not reach the browser).
# Server-only secrets are injected at runtime, so env validation is skipped for the
# build via SKIP_ENV_VALIDATION.
ARG SKIP_ENV_VALIDATION
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Copy everything (monorepo structure)
COPY . .

# Install dependencies and build
RUN bun install --frozen-lockfile
RUN cd apps/web/client && bun run build:standalone

# Expose the application port
EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the Next.js server
CMD ["bun", "apps/web/client/server.js"]