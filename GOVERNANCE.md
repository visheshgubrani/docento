# Governance

Docento is a young project. This document describes how decisions get made
today and how that is expected to change as the contributor base grows. It is
intended to be honest about the current state rather than aspirational.

## Model

**Benevolent maintainer, working in public.** A small group of maintainers holds
merge rights and is accountable for the direction of the project. Decisions are
made in public issues and pull requests, and the reasoning is recorded.

Maintainers as of this document's last update are listed in
[.github/CODEOWNERS](./.github/CODEOWNERS).

## How decisions are made

| Change                                                                       | Who decides                                                                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Bug fixes, docs, tests, refactors inside an existing boundary                | Any maintainer, on review                                                                                         |
| New features within existing architecture                                    | Lazy consensus — a maintainer opens an issue, and it proceeds if no maintainer objects within a reasonable window |
| Data model, public API, authorization model, licensing, or dependency policy | Explicit maintainer agreement, recorded as an ADR                                                                 |
| Anything that would break self-hosters on upgrade                            | Explicit maintainer agreement, plus a migration note in the release                                               |

The distinction matters because the bottom two rows are expensive to reverse.
If your change touches them, open an issue before writing code.

### Architecture decision records

Significant decisions live in [`docs/adr/`](./docs/adr/) as ADRs — short,
numbered, immutable documents. An ADR is not a design document; it records the
context, the decision, and what it costs. When a decision changes, a new ADR
supersedes the old one; the old one is never edited.

This is the project's memory. Without it, every architectural argument gets
relitigated from scratch by whoever shows up next.

### Disagreement

If you disagree with a decision, say so on the issue or ADR. Bring evidence:
what breaks, for whom, and what the alternative costs. A well-argued objection
that arrives before a decision is cheap; the same objection after it ships is
expensive. Neither is ignored, but the first is much more likely to change the
outcome.

## Becoming a maintainer

There is no formal ladder yet. In practice, contributors are invited after a
sustained pattern of high-quality contributions — not just volume, but judgment
about scope, attention to tenant isolation and authorization, and reviewing
others' work thoughtfully.

Maintainers are expected to:

- review pull requests within a few business days where possible,
- say no clearly and explain why, rather than letting a change rot,
- keep the ADRs and docs current when the architecture moves,
- treat the licensing boundaries and tenant isolation as non-negotiable.

Maintainers who become inactive for an extended period are moved to emeritus
rather than left in a role they are not performing.

## Licensing commitments

The project's licensing structure is a commitment to the community, not a
placeholder:

- `apps/*` and the AGPL-licensed packages stay AGPL-3.0-only.
- `packages/contracts` and `packages/sdk` stay Apache-2.0.
- The Apache-2.0 packages will not be made to depend on AGPL-3.0 code.
- Contributions are accepted under DCO sign-off. There is no CLA, which means
  **the project cannot be relicensed to a proprietary license later** without
  reimplementing contributions from scratch.

That last point is deliberate and effectively permanent. If you are considering
a contribution on the assumption that the project might later dual-license,
do not — it will not.

## Commercial activity

The maintainers may offer paid hosting, managed infrastructure, and support.
This is compatible with the license: anyone else may do the same, including
competing with the hosted offering.

The rules that keep this healthy:

- All product software remains open source. There is no proprietary edition.
- Hosted-only conveniences must not be load-bearing for self-hosted operation.
  A self-hosted install is complete, not crippled.
- No contributor is obligated to work on anything commercially motivated.

## Releases

Docento follows semantic versioning. Before 1.0, minor versions may include
breaking changes, but every one gets a migration note in the release notes.
After 1.0, breaking changes require a major version.

Self-hosted upgrades must always be documented. A release that silently changes
required configuration or the database shape is a bug.

## Changing this document

This document can be changed by a pull request approved by a majority of
maintainers. Changes to the licensing commitments section require unanimous
maintainer approval, because contributors relied on it when they contributed.
