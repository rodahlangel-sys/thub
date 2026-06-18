# Remaining P1 Remediation Design

## Scope

This pass closes P1-05, P1-06, P1-08, and P1-09 without changing the existing order pricing, duplicate-booking, refund restoration, settlement, or role-facing page flows. P1-07 is reduced from an implicit deployment hazard to an explicit production configuration failure; a real remote storage backend still requires a deployment provider and credentials.

## Design

- Feedback submission has one shared status predicate and accepts only `IN_PROGRESS` on both the page and Server Action.
- Server environment parsing lives in `src/lib/env.ts`. Production rejects the local private-file storage driver, while development remains compatible with the current local directory.
- Notification writes accept an optional business `dedupeKey`. A nullable unique database column makes retries idempotent without collapsing unrelated messages with identical copy.
- Tutor document uploads re-read document state inside the write transaction. A partial SQLite unique index prevents more than one active school proof; the transaction re-count prevents more than five optional proofs.
- A read-only consistency script reports notification duplicates, material-limit violations, disabled-user notifications, order/payment/refund/settlement mismatches, and exits nonzero on findings.

## Verification

Use Node tests for pure predicates and configuration parsing, Prisma validation/generation for the schema, the existing business consistency scripts plus the new aggregate script for data, and lint/build for application integration. No repair mode runs automatically.
