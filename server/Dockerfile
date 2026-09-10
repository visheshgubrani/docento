FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# Generate client for the build process
RUN npx prisma generate
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production

# 1. Copy package files and the schema FIRST
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/prisma ./prisma

# 2. Install ONLY production dependencies to keep the image lean
RUN pnpm install --prod --frozen-lockfile

# 3. Explicitly install the prisma CLI so it is available for deploy-time migrations
RUN pnpm add prisma

# 4. Generate the Prisma client natively in this stage
RUN npx prisma generate

# 5. Copy the compiled JavaScript from the builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]