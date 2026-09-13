## What and why

<!-- What does this change, and what problem does it solve? Link the issue. -->

Closes #

## Scope

<!-- What is deliberately NOT part of this change? -->

## How it was verified

<!--
List the exact commands you ran. For UI changes, attach a screenshot or short
recording, on both mobile and desktop.
-->

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm boundaries` (only needed if you touched package imports)

## Checklist

- [ ] Commits are signed off (`git commit -s`)
- [ ] Tenant isolation still holds — cross-tenant access attempts fail
- [ ] Authorization goes through `can(...)`, not ad-hoc route checks
- [ ] Tests cover the change, including the failure cases
- [ ] If the data model changed, the migration applies cleanly to an empty database
- [ ] If this is a breaking change for self-hosters, the upgrade note is written

## Notes for reviewers

<!-- Anything you are unsure about, or want a second opinion on. -->
