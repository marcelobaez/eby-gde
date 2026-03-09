FROM marcelobaez/oracle8-ic-node24.13 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY public ./public
COPY next.config.js .
COPY tsconfig.json .
COPY typings ./typings
COPY package.json .

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN corepack enable pnpm && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=America/Argentina/Buenos_Aires

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy public and static files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Remove incomplete oracledb from standalone and copy full version with native bindings
RUN rm -rf ./node_modules/oracledb
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/oracledb ./node_modules/oracledb

# Copy Oracle Instant Client from base image
COPY --from=base /opt/oracle /opt/oracle
COPY --from=base /etc/ld.so.conf.d/oracle-instantclient.conf /etc/ld.so.conf.d/
RUN ldconfig

USER nextjs

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
