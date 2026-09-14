# syntax=docker/dockerfile:1.7
#
# Docento's images, one workspace-aware build with a target per service.
#
# ## Why this is one file and not four
#
# The applications are not independent projects. `apps/api` and `apps/worker`
# import `packages/domain`, and both frontends are compiled against
# `packages/contracts` and `packages/sdk` as *source* rather than as build
# output — that is deliberate, and it is what makes a contract change impossible
# to forget to rebuild. A per-application Dockerfile therefore has to reach
# outside its own directory to install, and four copies of "how do we install
# this workspace" is four places to get the workspace wrong.
#
# The earlier per-app Dockerfiles did exactly that: they copied the root
# `package.json` and the lockfile without `pnpm-workspace.yaml`, so `pnpm
# install` installed the root's dev dependencies and none of the workspace's,
# and the build that followed failed on missing binaries. They also carried
# build arguments for the deleted commerce and video stack.
#
# ## Why Debian and not Alpine
#
# Prisma ships a query engine per libc. `prisma generate` picks the target from
# the platform it runs on, and these images generate inside the build, so the
# engine matches the runtime. On Alpine it would have to match musl, and the
# `openssl` package that engine links against differs between the two — a
# mismatch that shows up as an engine that will not load at runtime, after a
# build that succeeded.
#
# ## Why the API and the worker run from source
#
# Neither has a build step: both are TypeScript executed by `tsx`, which is the
# same thing `pnpm start` does outside a container. Adding a bundler here would
# be a second build path with its own failure modes, and the two services would
# then run code the test suite never executed.

ARG NODE_VERSION=22-slim

# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# The version comes from `packageManager` in package.json, so the image and a
# contributor's checkout cannot disagree about which pnpm produced the lockfile.
RUN corepack enable

# OpenSSL is not incidental.
#
# Prisma picks its query engine by libc *and* by the OpenSSL version it finds, and
# the `slim` images ship without OpenSSL. Building without it produces a warning
# that reads like advice — "defaulting to openssl-1.1.x" — and a build that
# succeeds, followed by a client that cannot load its engine at runtime. The
# package is named by Prisma's own error message as the fix.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
#
# Only manifests are copied here. Dependency installation is the slowest step and
# the one that changes least, so it is separated from the source copy that
# changes on every commit.
#
# Every workspace package's manifest is required, not just the ones a target
# needs: a frozen install validates the lockfile against the workspace as a
# whole, and a missing manifest is a lockfile that does not match. `apps/www`
# and `packages/ui` are copied for that reason alone — the marketing site has no
# target here, because a documentation-free marketing page is not part of a
# self-hosted install.
#
# Only the four services are installed, though, and that is not an optimisation.
# `apps/docs` generates its MDX index in a `postinstall`, from a config file and
# a content directory — neither of which exists at this point, because the source
# arrives in the next stage. Installing it here fails on a missing entry point,
# and the fix is not to copy that application's source earlier: a documentation
# site has no business in a runtime image, and pulling it in would make all four
# services depend on content they never read.
#
# Dependencies of the selected packages come with them, so the domain,
# contracts, SDK, integrations and config packages all arrive — which is what
# each target actually needs.
#
# The trailing `...` selects each service *and its dependency closure as
# projects*, which is not the same as selecting the service alone: a dependency
# whose own dev dependencies are skipped has no tooling, and `prisma generate`
# in the next stage is exactly that — the Prisma CLI is a dev dependency of
# `packages/domain`, not of `apps/api`.
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/docs/package.json apps/docs/
COPY apps/learn/package.json apps/learn/
COPY apps/studio/package.json apps/studio/
COPY apps/worker/package.json apps/worker/
COPY apps/www/package.json apps/www/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/
COPY packages/integrations/package.json packages/integrations/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/

RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --filter "@docento/api..." \
      --filter "@docento/worker..." \
      --filter "@docento/studio..." \
      --filter "@docento/learn..."

# ---------------------------------------------------------------------------
# Source, with the Prisma client generated for this platform
# ---------------------------------------------------------------------------
FROM deps AS source

COPY . .

# The client is generated rather than checked in, and it must be generated in the
# image: its query engine is platform-specific, so a client built on a
# contributor's machine would be the wrong binary here.
RUN pnpm db:generate

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
FROM source AS api

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# No `pnpm build`: this package has none. `start` is `tsx src/index.ts`, the same
# entry point `pnpm dev` uses.
CMD ["pnpm", "--filter", "@docento/api", "start"]

# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------
FROM source AS worker

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@docento/worker", "start"]

# ---------------------------------------------------------------------------
# Frontends
# ---------------------------------------------------------------------------
#
# Next's `standalone` output is a server plus the files it actually traced, so
# the runtime stage copies that instead of the workspace.
#
# `API_INTERNAL_URL` is a *build* argument as well as a runtime one, and that is
# worth being explicit about: `rewrites()` is evaluated when the config is
# loaded and baked into the routes manifest, so the browser-facing proxy points
# at whatever origin was set at build time. Server-side calls read the variable
# at runtime. The default is the compose service name, and a deployment that
# reaches the API somewhere else builds with its own value.

FROM source AS studio-build

ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL

RUN pnpm --filter @docento/studio build

FROM base AS studio

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=studio-build /app/apps/studio/.next/standalone ./
COPY --from=studio-build /app/apps/studio/.next/static ./apps/studio/.next/static
COPY --from=studio-build /app/apps/studio/public ./apps/studio/public

EXPOSE 3000

CMD ["node", "apps/studio/server.js"]

FROM source AS learn-build

ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL

RUN pnpm --filter @docento/learn build

FROM base AS learn

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=learn-build /app/apps/learn/.next/standalone ./
COPY --from=learn-build /app/apps/learn/.next/static ./apps/learn/.next/static
COPY --from=learn-build /app/apps/learn/public ./apps/learn/public

EXPOSE 3000

CMD ["node", "apps/learn/server.js"]
