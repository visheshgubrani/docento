import { staffAuth } from '../src/auth/staff.js'
import { prisma } from '../src/db.js'

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

  // --- Owner ---------------------------------------------------------------
  // Created through Better Auth rather than by inserting a row, so the password
  // is hashed with the same algorithm the sign-in path verifies against.
  let owner = await prisma.staffUser.findUnique({ where: { email: OWNER_EMAIL } })

  if (!owner) {
    const result = await staffAuth.api.signUpEmail({
      body: { email: OWNER_EMAIL, password: DEMO_PASSWORD, name: 'Workspace Owner' },
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
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner.id } },
  })

  if (!existingMember) {
    await prisma.member.create({
      data: { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
    })
    console.log(`  created membership   owner -> ${workspace.slug}`)
  }

  // --- Academy -------------------------------------------------------------
  const academy = await prisma.academy.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: ACADEMY_SLUG } },
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
    where: { academyId_slug: { academyId: academy.id, slug: 'getting-started' } },
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
    console.log(`  created course       ${course.slug} (draft, 1 module, 2 lessons)`)
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
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
