# 7. Durable jobs on Postgres via pg-boss

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

A meaningful amount of work in this system cannot happen inside an HTTP request:

- AI generation runs for minutes and should survive a deploy.
- Outbound webhooks need retries with backoff and a delivery history.
- Email must be sent after a transaction commits, not during it.
- Video and caption processing is slow and provider-dependent.
- Reconciliation of payment callbacks must happen even if the initial request
  was lost.

The previous system handled this with a hack: long-running AI endpoints held the
HTTP connection open for up to 120 seconds. That fails on any of these — a
deploy mid-generation loses the work, there is no retry, no progress, no way to
resume, and a proxy timeout looks identical to a genuine failure.

So a job system is required. The question is how much infrastructure it should
demand.

The obvious answer is Redis with BullMQ: mature, well-known, and what most
people would reach for. It also means **every self-hoster must now run Redis** to
have a working install. The stated goal is that Postgres is the only required
service, because the difference between "one dependency" and "two" is the
difference between a five-minute install and an afternoon of YAML.

## Decision

Use **pg-boss**, backed by the same Postgres instance, using its ORM transaction
adapters so that job enqueueing participates in the same transaction as the
business change that caused it.

Jobs are never enqueued outside a transaction. If the business change rolls
back, the job does not exist.

External effects — sending email, calling a webhook, invoking a provider — are
treated as **retryable delivery with idempotent effects**, not as exactly-once
execution. Exactly-once across a network boundary is not achievable, and
pretending otherwise produces duplicate side effects that are worse than
at-least-once with proper idempotency keys. Every consumer of an external effect
must be idempotent.

Retries are bounded with backoff. Terminal failures are recorded and
inspectable, and can be replayed explicitly rather than by editing the database.

## Consequences

**What this buys.**

- A self-hosted install needs exactly one stateful service. This is the single
  biggest contributor to install success.
- Enqueueing inside the business transaction will eliminate an entire bug class:
  jobs that exist for changes that were rolled back, and changes that committed
  with no corresponding job. This is the payoff once the adapters are wired; it
  is not yet banked.
- One backup covers both data and queues. There is no Redis persistence story to
  get wrong.

**What this costs.**

- Job throughput shares a connection pool and I/O with application queries. At
  high volume, a large job backlog degrades API latency. This is acceptable at
  the target scale and is a known ceiling rather than a surprise.
- pg-boss is a smaller ecosystem than BullMQ. Fewer examples, fewer people who
  have debugged it before, and a smaller hiring pool.
- Redis remains the better answer for high fan-out work. The mitigation is that
  the queue is behind an interface in `packages/integrations`, so a cloud
  deployment can substitute a different implementation without touching domain
  code.

**Explicitly not decided here.** Whether the worker runs as a separate process
or in-process with the API. It is a separate process, because a slow job must
not be able to starve request handling — but this ADR is about the queue, not the
deployment topology.
