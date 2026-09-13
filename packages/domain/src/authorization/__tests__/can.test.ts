import { describe, expect, it } from 'vitest'

import { ACTIONS, type Action } from '../actions'
import {
  REQUIRED_RESOURCE_FIELDS,
  can,
  canViaAssignment,
  type Resource,
} from '../can'
import type { Principal, StaffAssignment } from '../principal'

const WS = 'workspace-1'
const OTHER_WS = 'workspace-2'
const ACADEMY = 'academy-1'
const OTHER_ACADEMY = 'academy-2'
const COURSE = 'course-1'

/** A resource that satisfies every requirement, for convenience in tests. */
const full = (overrides: Resource = {}): Resource => ({
  workspaceId: WS,
  academyId: ACADEMY,
  courseId: COURSE,
  learnerId: 'l-1',
  ...overrides,
})

const owner: Principal = {
  kind: 'staff',
  userId: 'u-owner',
  workspaceId: WS,
  memberId: 'm-owner',
  role: 'owner',
}

const admin: Principal = {
  kind: 'staff',
  userId: 'u-admin',
  workspaceId: WS,
  memberId: 'm-admin',
  role: 'admin',
}

const learner: Principal = {
  kind: 'learner',
  learnerId: 'l-1',
  academyId: ACADEMY,
}

const key = (scopes: string[], academyId: string | null = null): Principal => ({
  kind: 'serviceKey',
  keyId: 'k-1',
  workspaceId: WS,
  academyId,
  scopes,
})

/**
 * The regression suite for the most severe bug this system can have.
 *
 * An earlier version of `can` guarded staff with
 * `if (resource.workspaceId && resource.workspaceId !== principal.workspaceId)`.
 * Because `Resource` is all-optional, a caller that omitted the workspace
 * skipped containment entirely and was admitted — including an owner acting on
 * another tenant's resource. Every denial test passed a well-formed resource,
 * so the suite was green while the hole was open.
 *
 * These tests are written to fail if that shape ever returns.
 */
describe('resource requirements are structural', () => {
  /**
   * The only actions that may be decided without a resource.
   *
   * Both are reads of data that belongs to nobody: a published catalogue and a
   * certificate's public verification view. Adding to this list is a decision
   * about what an unauthenticated stranger can do, so it is written out here
   * rather than inferred from `REQUIRED_RESOURCE_FIELDS`, which would make the
   * list true by construction and therefore not a test.
   */
  const PUBLIC_ACTIONS: readonly Action[] = [
    'catalog:read',
    'certificate:verify',
  ]

  it('denies every action when the resource identifies nothing', () => {
    // The test that would have caught the original bug: `can` used to skip
    // containment when `resource.workspaceId` was absent, so an omitted tenant
    // was an admitted tenant.
    for (const action of ACTIONS) {
      const decision = can(owner, action, {})

      if (PUBLIC_ACTIONS.includes(action)) {
        expect(decision.allowed, `${action} should be public`).toBe(true)
      } else {
        expect(
          decision.allowed,
          `${action} must not be permitted with {}`,
        ).toBe(false)
      }
    }
  })

  it('denies every action when the resource identifies nothing, for a key', () => {
    const broad = key([...ACTIONS] as string[])

    for (const action of ACTIONS) {
      if (PUBLIC_ACTIONS.includes(action)) continue
      expect(can(broad, action, {}).allowed, `${action} must not pass`).toBe(
        false,
      )
    }
  })

  it('denies every action when the resource identifies nothing, for a learner', () => {
    // The learner branch had the same shape as the staff one, so the same
    // omission was reachable from an academy-bound session.
    for (const action of ACTIONS) {
      if (PUBLIC_ACTIONS.includes(action)) continue
      expect(can(learner, action, {}).allowed, `${action} must not pass`).toBe(
        false,
      )
    }
  })

  it('permits an anonymous visitor exactly the public actions', () => {
    // The positive half of the same property: a stranger may read a catalogue
    // and verify a certificate, and may do nothing else. Stated as an
    // exhaustive loop so a new public action cannot appear unnoticed.
    const anonymous: Principal = { kind: 'anonymous' }

    for (const action of ACTIONS) {
      const decision = can(anonymous, action, full())
      expect(
        decision.allowed,
        `${action} should${PUBLIC_ACTIONS.includes(action) ? '' : ' not'} be public`,
      ).toBe(PUBLIC_ACTIONS.includes(action))
    }
  })

  describe('the public actions declare no scope', () => {
    it('has an empty requirement for each', () => {
      // If either gains a requirement it stops being public, and the test above
      // would start failing in a way that looks like a bug rather than a
      // decision. This says which one changed.
      for (const action of PUBLIC_ACTIONS) {
        expect(
          REQUIRED_RESOURCE_FIELDS[action],
          `${action} is listed as public but requires a resource`,
        ).toEqual([])
      }
    })
  })

  it('declares requirements for every action', () => {
    // Exhaustiveness: adding an action without deciding its scope is a build
    // error, not a silently permissive default.
    for (const action of ACTIONS) {
      expect(
        REQUIRED_RESOURCE_FIELDS[action],
        `missing entry for ${action}`,
      ).toBeDefined()
    }
  })

  it('names the missing identifier in the refusal', () => {
    const decision = can(owner, 'course:update', {
      workspaceId: WS,
      academyId: ACADEMY,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(/courseId/)
  })
})

describe('enrolment', () => {
  /**
   * `enrollment:create` is named for the resource it touches rather than for
   * the `learner:` namespace, so it needed an explicit exception in the learner
   * branch. These tests exist because that exception is the kind of thing that
   * gets added and then quietly widened.
   */
  it('lets a learner enrol in a course in their own academy', () => {
    expect(can(learner, 'enrollment:create', full()).allowed).toBe(true)
  })

  it('refuses a learner enrolling in another academy', () => {
    const decision = can(
      learner,
      'enrollment:create',
      full({ academyId: OTHER_ACADEMY }),
    )
    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(/academy/)
  })

  it('refuses a learner enrolling on behalf of another learner', () => {
    // The reason the exception is spelled out: without it this passes, and one
    // learner can create another learner's enrolment.
    const decision = can(
      learner,
      'enrollment:create',
      full({ learnerId: 'l-someone-else' }),
    )
    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(/learner/)
  })

  it('refuses an enrolment that names no course', () => {
    // Without `courseId` this would be a permission to enrol in *something*.
    const decision = can(learner, 'enrollment:create', {
      academyId: ACADEMY,
      learnerId: 'l-1',
    })
    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(/courseId/)
  })

  it('lets staff enrol someone else, and a service key too', () => {
    expect(can(admin, 'enrollment:create', full()).allowed).toBe(true)
    expect(
      can(key(['enrollment:create']), 'enrollment:create', full()).allowed,
    ).toBe(true)
  })
})

describe('serving media', () => {
  it('is granted to a learner in their own academy', () => {
    // Serving is separate from reading the asset record, because entitlement is
    // re-checked when bytes are fetched rather than when a URL is issued.
    expect(can(learner, 'media:serve', { academyId: ACADEMY }).allowed).toBe(
      true,
    )
  })

  it('is refused across academies', () => {
    expect(
      can(learner, 'media:serve', { academyId: OTHER_ACADEMY }).allowed,
    ).toBe(false)
  })
})

describe('anonymous', () => {
  it('may read the public catalogue without naming a resource', () => {
    // Specifically with no resource at all, which is how a stranger's request
    // arrives: there is no tenant to name until the catalogue resolves one.
    expect(can({ kind: 'anonymous' }, 'catalog:read').allowed).toBe(true)
  })

  it('may verify a certificate without an account', () => {
    // The whole point of a verification link is that an employer can open it.
    expect(can({ kind: 'anonymous' }, 'certificate:verify').allowed).toBe(true)
  })

  it('may do nothing else, and the exhaustive check is elsewhere', () => {
    // The full enumeration lives in the "resource requirements are structural"
    // suite, so the list of public actions is asserted in one place rather than
    // two that can disagree.
    for (const action of [
      'workspace:read',
      'course:update',
      'media:serve',
    ] as const) {
      expect(can({ kind: 'anonymous' }, action, full()).allowed).toBe(false)
    }
  })
})

describe('tenant containment', () => {
  it('refuses a workspace owner acting on another workspace', () => {
    const decision = can(
      owner,
      'course:update',
      full({ workspaceId: OTHER_WS }),
    )

    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(
      /different workspace/,
    )
  })

  it('refuses a bare resource id with no tenant, which was the original bug', () => {
    // Reproduces the exact reported call.
    expect(
      can(owner, 'course:update', { courseId: 'course-in-ws-B' }).allowed,
    ).toBe(false)
    expect(
      can(key(['course:update']), 'course:update', { courseId: 'x' }).allowed,
    ).toBe(false)
    expect(can(owner, 'workspace:delete', {}).allowed).toBe(false)
  })

  it('refuses a learner acting on another academy', () => {
    const decision = can(
      learner,
      'course:read',
      full({ academyId: OTHER_ACADEMY }),
    )

    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(
      /different academy/,
    )
  })

  it('refuses a service key acting on another workspace', () => {
    expect(
      can(key(['course:read']), 'course:read', full({ workspaceId: OTHER_WS }))
        .allowed,
    ).toBe(false)
  })

  it('allows a principal acting within its own tenant', () => {
    expect(can(owner, 'course:update', full()).allowed).toBe(true)
    expect(can(learner, 'course:read', full()).allowed).toBe(true)
  })
})

describe('workspace roles', () => {
  it('lets the owner do anything in the workspace', () => {
    for (const action of [
      'workspace:update',
      'workspace:delete',
      'course:publish',
    ] as const) {
      expect(can(owner, action, full()).allowed).toBe(true)
    }
  })

  it('reserves ownership, money, and credentials to the owner', () => {
    for (const action of [
      'workspace:delete',
      'serviceKey:manage',
      'member:manage',
    ] as const) {
      const decision = can(admin, action, full())
      expect(decision.allowed).toBe(false)
      expect(decision.allowed === false && decision.reason).toMatch(
        /workspace owner/,
      )
    }
  })

  it('lets an admin run academies and content', () => {
    for (const action of [
      'academy:update',
      'course:publish',
      'enrollment:manage',
      'certificate:revoke',
    ] as const) {
      expect(can(admin, action, full()).allowed).toBe(true)
    }
  })
})

describe('service keys', () => {
  it('never performs a session-only action, even with the scope', () => {
    const broad = key([
      'workspace:delete',
      'billing:manage',
      'serviceKey:manage',
      'member:manage',
    ])

    for (const action of [
      'workspace:delete',
      'serviceKey:manage',
      'member:manage',
    ] as const) {
      const decision = can(broad, action, full())
      expect(decision.allowed).toBe(false)
      expect(decision.allowed === false && decision.reason).toMatch(
        /staff session/,
      )
    }
  })

  it('requires the scope to be present', () => {
    expect(can(key(['course:read']), 'course:read', full()).allowed).toBe(true)
    expect(can(key(['course:read']), 'course:update', full()).allowed).toBe(
      false,
    )
  })

  it('honours an academy restriction when the key carries one', () => {
    const restricted = key(['course:read'], ACADEMY)

    expect(can(restricted, 'course:read', full()).allowed).toBe(true)

    const decision = can(
      restricted,
      'course:read',
      full({ academyId: OTHER_ACADEMY }),
    )
    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(
      /restricted to a different academy/,
    )
  })

  it('does not imply a user identity', () => {
    const principal = key(['course:read'])
    expect('userId' in principal).toBe(false)
  })
})

describe('learners', () => {
  it('may act on their own records', () => {
    for (const action of [
      'learner:progress:write',
      'learner:checkout',
      'learner:enroll',
    ] as const) {
      expect(can(learner, action, full()).allowed).toBe(true)
    }
  })

  it("may not act on another learner's records", () => {
    const decision = can(
      learner,
      'learner:progress:write',
      full({ learnerId: 'l-2' }),
    )

    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.reason).toMatch(
      /different learner/,
    )
  })

  it('may not reach staff actions', () => {
    for (const action of [
      'course:update',
      'course:publish',
      'enrollment:manage',
      'serviceKey:manage',
    ] as const) {
      expect(can(learner, action, full()).allowed).toBe(false)
    }
  })
})

describe('assignments', () => {
  const instructorOnCourse: StaffAssignment = {
    role: 'instructor',
    scope: 'course',
    academyId: ACADEMY,
    courseId: COURSE,
  }

  const graderOnAcademy: StaffAssignment = {
    role: 'grader',
    scope: 'academy',
    academyId: ACADEMY,
    courseId: null,
  }

  it('grants an instructor exactly the assigned course', () => {
    expect(
      canViaAssignment('course:update', full(), [instructorOnCourse]).allowed,
    ).toBe(true)

    expect(
      canViaAssignment('course:update', full({ courseId: 'other' }), [
        instructorOnCourse,
      ]).allowed,
    ).toBe(false)
  })

  it('does not let an instructor reach money or credentials', () => {
    for (const action of [
      'serviceKey:manage',
      'member:manage',
      'certificate:revoke',
    ] as const) {
      expect(
        canViaAssignment(action, full(), [instructorOnCourse]).allowed,
      ).toBe(false)
    }
  })

  it('covers every course for an academy-scoped assignment', () => {
    expect(
      canViaAssignment('submission:grade', full(), [graderOnAcademy]).allowed,
    ).toBe(true)
  })

  it('keeps a grader narrower than an instructor', () => {
    expect(
      canViaAssignment('submission:grade', full(), [graderOnAcademy]).allowed,
    ).toBe(true)

    expect(
      canViaAssignment('course:publish', full({ courseId: null }), [
        graderOnAcademy,
      ]).allowed,
    ).toBe(false)
  })

  it('applies the same resource requirements as can()', () => {
    expect(
      canViaAssignment('course:update', {}, [instructorOnCourse]).allowed,
    ).toBe(false)
  })

  it('denies when there are no assignments', () => {
    expect(canViaAssignment('course:update', full(), []).allowed).toBe(false)
  })
})
