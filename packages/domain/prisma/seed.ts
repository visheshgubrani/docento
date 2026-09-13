import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Load `.env` before anything reads configuration.
 *
 * The auth realms bind their secrets at module load (`staff.ts` reads `env`
 * the moment it is imported), so the environment has to be in place before the
 * imports below run. That is why they are dynamic: a static import would be
 * hoisted above this block and the seed would fail with "Invalid input:
 * expected string, received undefined" on a correctly configured machine.
 *
 * Node's built-in loader is used rather than a dotenv dependency, matching
 * `src/test/setup.ts`. In a container the variables are already present and the
 * file simply does not exist.
 */
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

/**
 * Seed a development install.
 *
 * A fresh clone previously produced a migrated but unusable database: no
 * workspace, no academy, no way to sign in. This creates the minimum an operator
 * needs to reach the application, plus a small amount of demo content so the
 * schema can be inspected with real rows in it.
 *
 * ## Safety
 *
 * This refuses to run against `NODE_ENV=production` unless `SEED_FORCE=1` is
 * set. Demo content and known credentials must never reach a real deployment,
 * and a seed script that runs by accident in production is a bad way to find
 * that out.
 *
 * It is idempotent: running it twice updates nothing and creates no duplicates.
 */

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'docento-dev-password'

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@docento.local'
const WORKSPACE_SLUG = 'demo-workspace'
const ACADEMY_SLUG = 'demo-academy'

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
    console.error(
      'Refusing to seed: NODE_ENV is production. Set SEED_FORCE=1 if you are certain.',
    )
    process.exit(1)
  }

  console.log('Seeding development data...\n')

  // Imported here, not at the top: both read configuration at module load.
  const { prisma } = await import('../src/db.js')
  const { staffAuth } = await import('../src/auth/staff.js')

  // --- Owner ---------------------------------------------------------------
  // Created through Better Auth rather than by inserting a row, so the password
  // is hashed with the same algorithm the sign-in path verifies against.
  let owner = await prisma.staffUser.findUnique({
    where: { email: OWNER_EMAIL },
  })

  if (!owner) {
    const result = await staffAuth.api.signUpEmail({
      body: {
        email: OWNER_EMAIL,
        password: DEMO_PASSWORD,
        name: 'Workspace Owner',
      },
    })
    owner = await prisma.staffUser.findUniqueOrThrow({
      where: { id: result.user.id },
    })
    console.log(`  created owner        ${OWNER_EMAIL}`)
  } else {
    console.log(`  owner exists         ${OWNER_EMAIL}`)
  }

  // --- Workspace -----------------------------------------------------------
  const workspace = await prisma.workspace.upsert({
    where: { slug: WORKSPACE_SLUG },
    update: {},
    create: { name: 'Demo Workspace', slug: WORKSPACE_SLUG },
  })

  const existingMember = await prisma.member.findUnique({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: owner.id },
    },
  })

  if (!existingMember) {
    await prisma.member.create({
      data: { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
    })
    console.log(`  created membership   owner -> ${workspace.slug}`)
  }

  // --- Academy -------------------------------------------------------------
  const academy = await prisma.academy.upsert({
    where: {
      workspaceId_slug: { workspaceId: workspace.id, slug: ACADEMY_SLUG },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Demo Academy',
      slug: ACADEMY_SLUG,
      branding: { displayName: 'Demo Academy', primaryColor: '#6d28d9' },
    },
  })

  // A publishable key so the learner application has something to authenticate
  // with locally. Public by definition — it is not a secret.
  const publishable = await prisma.academyPublishableKey.findFirst({
    where: { academyId: academy.id },
  })

  if (!publishable) {
    await prisma.academyPublishableKey.create({
      data: {
        academyId: academy.id,
        key: `pk_test_${Buffer.from(crypto.randomUUID()).toString('hex').slice(0, 24)}`,
        name: 'Local development',
      },
    })
  }

  // --- Demo course ---------------------------------------------------------
  let course = await prisma.course.findUnique({
    where: {
      academyId_slug: { academyId: academy.id, slug: 'getting-started' },
    },
  })

  if (!course) {
    course = await prisma.course.create({
      data: {
        academyId: academy.id,
        title: 'Getting Started',
        slug: 'getting-started',
        description: 'A two-lesson course used to exercise the schema.',
        status: 'DRAFT',
        modules: {
          create: [
            {
              title: 'Introduction',
              position: 1,
              lessons: {
                create: [
                  {
                    title: 'Welcome',
                    contentType: 'TEXT',
                    position: 1,
                    isFree: true,
                    body: '<p>Welcome to the demo course.</p>',
                  },
                  {
                    title: 'How lessons work',
                    contentType: 'TEXT',
                    position: 2,
                    isFree: false,
                    body: '<p>Lessons belong to a module, which belongs to a course.</p>',
                  },
                ],
              },
            },
          ],
        },
      },
    })
    console.log(
      `  created course       ${course.slug} (draft, 1 module, 2 lessons)`,
    )
  } else {
    console.log(`  course exists        ${course.slug}`)
  }

  // --- Summary -------------------------------------------------------------
  console.log('\nDone. Sign in with:')
  console.log(`  email     ${OWNER_EMAIL}`)
  console.log(`  password  ${DEMO_PASSWORD}`)
  console.log(`\n  workspace ${workspace.slug}`)
  console.log(`  academy   ${academy.slug}`)

  if (process.env.SEED_PASSWORD === undefined) {
    console.log(
      '\n  The password above is a development default. Set SEED_PASSWORD to change it.',
    )
  }

  // Released here rather than in a `.finally()` on the promise: the client is
  // imported inside this function, so it is not in scope out there.
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('\nSeed failed:', error)
  process.exitCode = 1
})
