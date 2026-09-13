# 4. Courses belong to one academy; copying is explicit

- **Status:** Accepted
- **Date:** 2026-09-11
- **Related:** [2](./0002-workspace-and-academy-tenancy.md)

## Context

If a workspace can contain multiple academies
([ADR 2](./0002-workspace-and-academy-tenancy.md)), the immediate question is
whether a course belongs to the academy or to the workspace.

The tempting design is a shared library: `Course` belongs to the workspace, and
is *published into* one or more academies through a join table. The appeal is
obvious — author once, sell under three brands.

It also drags in a series of hard problems that have to be solved immediately,
not eventually:

- **Divergent edits.** Brand A wants to fix a typo that brand B should not see.
  Either the shared course is versioned per academy, or one brand's edit leaks
  into another's catalogue.
- **Pricing.** A shared course needs per-academy pricing, per-academy coupons,
  and per-academy currency — which is most of an `Offer` table anyway.
- **Unlisting.** Removing a course from one academy while keeping it in another
  must not revoke access for learners who already enrolled through the first.
- **Apparent isolation.** Two academies are different businesses' storefronts
  even when one workspace owns them. A leak between them looks identical to a
  leak between tenants, and is treated with the same severity.

Every one of those is solvable. None of them is worth solving in the first
release.

## Decision

**A course belongs to exactly one academy.** Slugs are unique within an academy,
not globally.

Publishing the same content to another academy is an explicit **copy**: it
duplicates the course, its modules, lessons, and quizzes as independent drafts,
and records provenance (which course and academy it was copied from).

A copy carries **content only**. It never copies learners, enrollments, orders,
progress, quiz attempts, submissions, or credentials. Those belong to the
academy whose learners earned them, and always will.

Media is the deliberate exception: workspace-owned media assets may be
**referenced** by courses in multiple academies rather than duplicated, because
video is expensive to store and the access rules are already enforced per asset.
A reference keeps the asset alive; deleting one course does not delete media
another course still uses.

## Consequences

**What this buys.**

- The isolation model stays flat and provable: a course, and everything
  underneath it, has exactly one academy, which is a database constraint rather
  than an application rule.
- No versioning, per-academy pricing, or unlisting semantics are needed in the
  first release.
- Copying is a straightforward, explainable operation a user can reason about
  without a mental model of shared-versus-local content.

**What this costs.**

- Updating a course in three academies means updating three courses. This is the
  real cost, and it is a real product limitation for a workspace running several
  brands with overlapping catalogues.
- Cross-academy reporting requires a join across independently-owned rows rather
  than one query.

**When this should be revisited.** If multiple-brand workspaces become common
and the pain is specifically "I change a lesson in three places," the answer is
propagation — a workspace-level template course, or a change-set applied to
several copies — not a shared mutable course. A future ADR would supersede this
one, and the copy operation is the migration path: copies already carry
provenance, so a propagation feature can use it.
