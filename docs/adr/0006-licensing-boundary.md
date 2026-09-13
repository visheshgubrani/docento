# 6. AGPL-3.0 application, Apache-2.0 SDK

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

The project intends to earn money by selling hosting, managed infrastructure,
support, and enterprise operations — not by gating features. That choice rules
out a proprietary edition, but it does not settle the license question, because
two different audiences want opposite things.

**Self-hosters and operators** want the strongest possible guarantee that the
software stays open. A permissive license lets a well-funded competitor take the
work, improve it privately, and sell it back as a managed service without
contributing anything. That is the failure mode that has killed a number of
open-source infrastructure projects.

**API consumers** want to build against the API. Their integration code may be
proprietary, may be shipped to clients, and in some cases may be audited by
their own legal team. A copyleft license on the client library is an obstacle
that ranges from annoying to disqualifying.

These are not in conflict if the license follows the boundary between the
product and its interfaces.

## Decision

Licenses are assigned per directory, and the split follows that boundary.

| Path | License |
| --- | --- |
| `apps/*` | AGPL-3.0-only |
| `packages/domain` | AGPL-3.0-only |
| `packages/integrations` | AGPL-3.0-only |
| `packages/ui` | AGPL-3.0-only |
| `packages/config` | AGPL-3.0-only |
| `packages/contracts` | Apache-2.0 |
| `packages/sdk` | Apache-2.0 |

**Enforced invariant: an Apache-2.0 package must never import an AGPL-3.0
package.** Dependency direction is strictly one-way — `packages/contracts` is
imported *by* `packages/sdk` and by the applications, never the reverse. If an
Apache-2.0 package depended on AGPL-3.0 code, the whole SDK would inherit AGPL
obligations and the permissive license would be a lie.

This is checked mechanically in CI with `dependency-cruiser` (see
`.dependency-cruiser.cjs`), not by convention. A rule that matters and is only
enforced by review does not survive contact with a busy week.

Contributions use the **Developer Certificate of Origin**, not a CLA — see
[CONTRIBUTING.md](../../CONTRIBUTING.md).

## Consequences

**What this buys.**

- The application is genuinely protected: anyone offering Docento as a network
  service must publish their modifications.
- The SDK and its contracts are usable in proprietary software, including by
  companies who could not otherwise adopt the project.
- No CLA means contributors keep their copyright and the contribution process is
  a single `git commit -s`.
- No proprietary edition means self-hosters get the whole product, which is a
  real and marketable difference from the "open core" alternative.

**What this costs.**

- **The project can never be relicensed to a proprietary license.** Without a
  CLA, relicensing requires the agreement of every contributor, which in practice
  means reimplementing the contributions. This is a deliberate, permanent
  commitment, and it is recorded in [GOVERNANCE.md](../../GOVERNANCE.md) so
  contributors can rely on it.
- The dual-license structure surprises people and needs explaining in the README,
  `CONTRIBUTING.md`, and per-package `LICENSE` files.
- The import-direction rule is a real constraint on refactoring. When shared code
  needs to move, it moves *down* into `packages/contracts`, which occasionally
  means placing something in the contracts package that feels more like
  implementation than interface.
- AGPL is unacceptable to some enterprises outright. That is a known cost of
  this choice rather than an oversight; those customers are served by the hosted
  offering.

**Alternatives considered.** MIT or Apache-2.0 for everything (maximally
adoptable, no protection against hosted resale); AGPL throughout (simplest
story, unusable SDK); AGPL plus a proprietary `ee/` directory under a CLA
(defensible, but the CLA is community friction and "open core" contradicts the
stated business model).
