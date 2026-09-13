import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'

import { createAuthRateLimitHook } from './rate-limit-hook.js'

import { env } from '@docento/config'
import { prisma } from '../db.js'

/**
 * The staff authentication realm.
 *
 * Staff identity is global and spans workspaces: one person may belong to
 * several, because consultants and agencies work across clients. Sessions are
 * therefore not workspace-scoped, and workspace context lives on the session as
 * `activeWorkspaceId` rather than as a constraint on every query.
 *
 * This realm is deliberately separate from the learner realm — different tables,
 * different cookie prefix, different secret. Equal email addresses must never
 * merge the two. See docs/adr/0003-two-authentication-realms.md.
 */
export const STAFF_AUTH_BASE_PATH = '/api/auth/staff'
export const STAFF_COOKIE_PREFIX = 'docento-staff'

export const staffAuth = betterAuth({
  basePath: STAFF_AUTH_BASE_PATH,
  secret: env.STAFF_AUTH_SECRET,
  baseURL: env.API_URL,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Each realm maps onto its own tables. This is what makes isolation a schema
  // property rather than a query-writing discipline.
  user: { modelName: 'staffUser' },
  session: { modelName: 'staffSession' },
  account: { modelName: 'staffAccount' },
  verification: { modelName: 'staffVerification' },

  advanced: {
    cookiePrefix: STAFF_COOKIE_PREFIX,
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  trustedOrigins: [env.APP_URL, ...env.TRUSTED_ORIGINS],

  // The shared Postgres limiter is authoritative. Better Auth's own limiter
  // defaults to per-process memory counters, which double the effective limit
  // per replica and are the reason the shared store exists at all — running
  // both would mean two policies and two stores.
  rateLimit: { enabled: false },

  hooks: {
    before: createAuthRateLimitHook({ realm: 'staff' }),
  },

  plugins: [
    organization({
      // Mapped onto the workspace tables defined in the domain schema.
      schema: {
        organization: { modelName: 'workspace' },
        member: {
          modelName: 'member',
          // The plugin speaks in organizations; the domain speaks in
          // workspaces. Mapping the column keeps the domain vocabulary while
          // letting the plugin use its own field names.
          fields: { organizationId: 'workspaceId' },
        },
        invitation: {
          modelName: 'invitation',
          fields: { organizationId: 'workspaceId' },
        },
      },
      allowUserToCreateOrganization: true,
    }),
  ],
})

export type StaffAuth = typeof staffAuth
