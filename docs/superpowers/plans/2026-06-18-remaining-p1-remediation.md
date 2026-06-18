# Remaining P1 Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the locally actionable remaining P1 findings while preserving all completed pricing, booking, refund, settlement, and frontend behavior.

**Architecture:** Put testable policy in small library functions, enforce concurrency-sensitive invariants in SQLite, and keep scripts read-only by default. Production storage configuration must fail closed until a persistent driver exists.

**Tech Stack:** Next.js 16 App Router, TypeScript, Node test runner through `tsx`, Prisma 6, SQLite.

---

### Task 1: Feedback and environment policy

**Files:**
- Create: `src/lib/order-status.ts`
- Create: `src/lib/order-status.test.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/env.test.ts`
- Modify: `src/app/tutor/orders/[id]/feedback/actions.ts`
- Modify: `src/app/tutor/orders/[id]/feedback/page.tsx`
- Modify: `src/lib/storage/index.ts`
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] Write tests asserting feedback requires `IN_PROGRESS` and production rejects `LOCAL` storage.
- [ ] Run the tests and confirm they fail because the modules do not exist.
- [ ] Add the minimal policy functions and wire both server and page checks to them.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Notification and material concurrency constraints

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260618060000_remaining_p1_constraints/migration.sql`
- Modify: `src/lib/notifications.ts`
- Modify: notification-producing Server Actions
- Modify: `src/app/tutor/profile/actions.ts`
- Create: `src/lib/notifications.test.ts`

- [ ] Write a test for deterministic, event-scoped notification dedupe keys.
- [ ] Run it and confirm the helper is missing.
- [ ] Add nullable unique `Notification.dedupeKey`, the partial school-proof index, and Action-level keys.
- [ ] Re-count tutor documents inside the upload transaction and translate constraint failures to the existing user-facing error.
- [ ] Apply the new migration with `prisma migrate deploy`, then run the focused tests.

### Task 3: Read-only consistency verification and documentation

**Files:**
- Create: `scripts/check-data-consistency.ts`
- Modify: `package.json`
- Create: `docs/remaining-p1-remediation-report.md`
- Modify: `docs/full-product-audit.md`

- [ ] Add aggregate read-only checks for the repaired invariants.
- [ ] Run all existing consistency checks and the new aggregate check.
- [ ] Run `prisma format`, `prisma validate`, `prisma generate`, tests, lint, and build.
- [ ] Record fixed findings, deployment-only verification, commands, and any residual data findings.
