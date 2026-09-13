import { describe, expect, it } from 'vitest'

import { ACTIONS, type Action } from '../actions.js'
import {
  REQUIRED_RESOURCE_FIELDS,
  can,
  canViaAssignment,
  type Resource,
} from '../can.js'
import type { Principal, StaffAssignment } from '../principal.js'

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
  it('denies every action when the resource identifies nothing', () => {
    // The test that would have caught the original bug. Only genuinely public
    // actions may pass with no resource at all.
    const openWithNoResource: Action[] = ['catalog:read']

    for (const action of ACTIONS) {
      const decision = can(owner, action, {})

      if (openWithNoResource.includes(action)) {
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
      if (action === 'catalog:read') continue
      expect(can(broad, action, {}).allowed, `${action} must not pass`).toBe(
        false,
      )
    }
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

describe('anonymous', () => {
  it('may read the public catalogue and nothing else', () => {
    expect(can({ kind: 'anonymous' }, 'catalog:read').allowed).toBe(true)

    for (const action of ACTIONS) {
      if (action === 'catalog:read') continue
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
      'billing:manage',
      'workspace:delete',
      'course:publish',
    ] as const) {
      expect(can(owner, action, full()).allowed).toBe(true)
    }
  })

  it('reserves ownership, money, and credentials to the owner', () => {
    for (const action of [
      'workspace:delete',
      'billing:manage',
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
      'billing:manage',
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
      'billing:manage',
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
      'billing:manage',
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
