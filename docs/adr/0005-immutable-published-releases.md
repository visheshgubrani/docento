# 5. Published releases are immutable

- **Status:** Accepted
- **Date:** 2026-09-11
- **Related:** [4](./0004-academy-owned-courses.md)

## Context

Courses are edited continuously. A course that is live, with learners partway
through it, is the normal case rather than the exception. That creates a set of
questions the previous system answered by accident:

- A learner is on lesson 7 of 10. The author deletes lessons 3 and 4. What is the
  learner's completion percentage now?
- An author changes a quiz's correct answer. A learner failed that quiz last
  week. Was their attempt wrong, or is the answer key wrong?
- An author reorders modules. Learners' "next lesson" links point somewhere
  different mid-course.
- An author unpublishes a course that 400 people paid for.

These are not edge cases. They happen within the first week of any real course
being edited after launch, and the answer determines whether learners trust the
product.

The underlying problem is that "editing a course" and "the course a learner is
taking" are two different things being stored as one.

## Decision

Separate **editable drafts** from **immutable published releases**.

- Authors edit a working draft. Autosave, AI generation, and reordering all
  affect only the draft. Nothing an author does in the editor touches live
  content.
- **Publishing** atomically promotes the draft to a new release. Learners see
  the new release from that moment.
- **Lesson identities are stable across releases.** A lesson that survives to a
  new release keeps its identifier, so progress records remain attached to the
  right content.
- **Quiz definitions and grading rules are snapshotted when an attempt starts.**
  A published change to a quiz cannot retroactively alter an attempt that has
  already begun.

For learners following updates, the rules are explicit:

| Situation | Behavior |
| --- | --- |
| Completed lesson still exists | Stays completed |
| Completed lesson removed | Leaves the completion denominator; the historical record is retained |
| New required lesson added | Affects incomplete enrollments |
| Instructor requires reassessment | The only way a completed lesson becomes incomplete again, and it is explicit and recorded |
| Quiz changed after a passed attempt | The attempt stands; the snapshot is authoritative |
| Course unpublished | Discovery stops. Existing access is not removed. |
| Enrollment closed | No new enrollments. Existing access is not removed. |
| Certificate issued | Remains valid and verifiable, permanently |

Completion is computed **server-side** from these rules. Client playback reports
indicate progress; they are not proof of attendance and are not trusted as such.

## Consequences

**What this buys.**

- Authors can edit freely without a live-course blast radius. This is the
  difference between a tool people use and a tool people are afraid of.
- Learner history is stable and explainable: a learner can always be told why
  their progress changed.
- Certificates stay trustworthy, because the completion evidence behind them
  cannot be edited after the fact.
- Quiz answer keys never leave the server, and never change under a running
  attempt.

**What this costs.**

- Storage and complexity: a release is a materialized snapshot, not a pointer to
  the current draft.
- Publishing is not instant — it is an operation that can fail, so it needs
  status, and the UI must show when the live release differs from the draft.
- The "unpublish does not revoke access" rule will surprise authors who expect
  the opposite. It needs to be stated in the UI, not just the docs.
- The completion denominator becomes a per-enrollment computed value rather than
  a simple count, which is more work to query and to cache correctly.

**Explicitly deferred.** Propagation of edits across copies
([ADR 4](./0004-academy-owned-courses.md)), scheduled releases, and per-cohort
release pinning are all reasonable later features. The release model is what
makes them possible; none is needed to ship.
