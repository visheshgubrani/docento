# 9. Offers, orders, grants, and enrollments are separate

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

"Did this person pay, and are they allowed in?" looks like one question. It is
four, and the previous system stored them as roughly two — a `price` column on
the course and an `Order` with an `amount`, with enrollment standing in for
access.

The problems that creates are all predictable:

- A learner pays, then gets a full refund. Enrollment says they're in; the
  refund says they're not. Which wins?
- A learner is granted free access by an instructor, and later the course price
  changes. What happens to their access?
- A learner buys a course, and the price is later edited. The order now shows an
  amount that does not match any version of the price that ever existed.
- A currency is hard-coded in one place and a default in another, so an order in
  one market is silently recorded in another market's currency.
- The same payment callback arrives twice, creating duplicate enrollment.

Each of these is a consequence of collapsing distinct concepts into one, and
each becomes a financial or access-control bug rather than a modelling
inconvenience.

## Decision

Five separate concepts, with explicit transitions between them.

| Concept                | Answers                                                                     | Mutable?                             |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| **Offer**              | What is for sale, at what price, in what currency, with what access terms   | Yes — this is the current price      |
| **Order**              | What a specific learner was charged, and what happened to the payment       | Append-only, plus status transitions |
| **Access grant**       | _Why_ a learner may access this course, and whether that reason still holds | Yes — grant and revoke               |
| **Enrollment**         | The learning relationship: progress, attempts, history                      | Yes                                  |
| **Cloud subscription** | A workspace's contract for managed services                                 | Yes                                  |

The critical separation is **grant** from **enrollment**. Enrollment records
learning. A grant records permission, and permission can come from several
independent sources: a purchase, an instructor's decision, a coupon, an
organization seat, an import. Revoking one grant must not disturb another, and
must not erase learning history.

Supporting rules:

- **Money is stored in integer minor units**, never floating point. A
  `price: 29.99` becomes `2900` plus a currency.
- **Order lines snapshot price, discount, and currency at purchase time.** An
  offer can change freely; a historical order never changes meaning.
- **All amounts are computed and validated server-side.** A client-supplied
  amount is never trusted, including for discounts.
- **Access is granted only after verified provider confirmation**, never on a
  browser success redirect. A redirect is a user interface signal, not proof of
  payment.
- **A full refund revokes the grant that the purchase created.** Partial
  refunds retain access. Other grants are untouched.
- **Inbound provider events are deduplicated on (connection, event id)** and
  applied transactionally, with reconciliation for events that arrive late or
  out of order. Duplicate delivery and non-guaranteed ordering are documented
  behaviors of payment providers, not exceptional conditions.

Launch scope is free enrollment and one-time course purchases through Stripe and
Razorpay. Recurring subscriptions, bundles, memberships, and marketplace payouts
are deferred.

## Consequences

**What this buys.**

- Refunds, instructor grants, coupons, and paid access compose without special
  cases. Access is the union of live grants, which is a rule that stays correct
  as new grant sources are added.
- Financial history is immutable and auditable. An order always means what it
  meant when it was created.
- Idempotency is a property of the model rather than a defensive check bolted
  onto checkout.
- Learning history survives every commercial event. A refunded learner keeps
  their progress, which is both morally right and operationally useful.

**What this costs.**

- Four tables where one column used to be, plus the transitions between them.
  "Is this learner enrolled" becomes a join against live grants rather than a
  boolean.
- Reconciliation is real work: a scheduled job that queries the provider for
  callback state and repairs drift, because webhooks are not guaranteed.
- Refund semantics are a product decision with edge cases — partial refunds,
  multiple orders for one course, a refund after a certificate was issued — and
  each needs an explicit, documented answer rather than emergent behavior.
- Money handling requires discipline about minor units everywhere, including in
  the UI layer where formatting happens.

**Deliberately out of scope.** Tax calculation, invoicing compliance, and
multi-currency presentment beyond what the payment provider handles. Every
provider in scope delegates these, and reimplementing them is a business in
itself.
