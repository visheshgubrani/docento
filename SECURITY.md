# Security Policy

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through GitHub's [private vulnerability
reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository. If you cannot use that channel, email the maintainers
listed in [GOVERNANCE.md](./GOVERNANCE.md).

Please include:

- what the issue is and what an attacker can achieve,
- the version or commit you tested,
- reproduction steps, ideally a minimal one,
- whether the deployment is self-hosted or managed, since that changes exposure.

**What to expect:** acknowledgement within 3 business days, an assessment and
severity within 7, and credit in the advisory unless you prefer otherwise. We
will tell you when a fix ships and coordinate disclosure timing with you. Please
give us a reasonable window before publishing.

## Supported versions

Security fixes land on the latest release. Older releases are not patched. If
you are self-hosting an older version, the fix is to upgrade.

## Scope

Docento is a multi-tenant system, so the highest-severity class of bug here is
**a tenant boundary failure** — anything that lets one academy, workspace,
learner, or service key read or modify another's data. Reports in these areas
are especially valuable:

| Area | What we care about |
| --- | --- |
| Tenant isolation | Cross-academy or cross-workspace reads and writes, including through bulk operations, exports, jobs, and file access |
| Authentication realms | Crossing between the staff and learner realms, or between two academies' learner accounts |
| Authorization | Privilege escalation between roles, or a service key reaching something it should not |
| Payment integrity | Granting access without a verified provider confirmation, replaying a callback, or manipulating an amount |
| Content protection | Reaching paid or unenrolled media, or extracting quiz answer keys |
| Credential handling | Provider credentials, session tokens, or encryption material leaking through logs, errors, or APIs |

## Known design decisions that are not vulnerabilities

These are deliberate. Reporting them is fine, but they will not be treated as
security fixes:

- **Public (publishable) keys are public.** They identify an academy in a
  browser. They are not secrets, do not authenticate learners, and do not grant
  access to paid content.
- **Origin checks are browser protections, not authentication.** They reduce
  casual cross-site abuse; the API does not treat them as proof of identity.
- **Delegated identity trusts a server-to-server exchange.** An integration
  holding a service key can assert a learner identity, by design. An
  unauthenticated browser cannot.
- **Public embeds are public.** Externally hosted video (YouTube, Vimeo) cannot
  have its access revoked the way uploaded media can. Do not use it for paid
  content if that matters to you.
- **AI output is untrusted input.** Generated content is reviewed before
  publishing and never executed.

## Hardening guidance for self-hosters

If you run Docento yourself, the items most likely to bite you:

- Set a unique `ENCRYPTION_KEY` and back it up. Losing it means losing the
  provider credentials stored in the database. Changing it without re-encrypting
  has the same effect.
- Terminate TLS in front of the app and do not expose Postgres.
- Keep `NODE_ENV=production`; this disables development conveniences and
  enables strict cookie and rate-limit behavior.
- Verify your academy domains before enabling them, and keep the platform's
  trusted-origin configuration consistent with what you actually serve.
- Configure a real email sender before allowing public registration, or account
  recovery will silently fail.
