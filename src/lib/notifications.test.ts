import assert from "node:assert/strict";
import test from "node:test";
import { buildNotificationDedupeKey } from "./notifications";

test("notification dedupe keys are stable and event scoped", () => {
  const first = buildNotificationDedupeKey("order", "order-1", "paid", "tutor-1");
  const retry = buildNotificationDedupeKey("order", "order-1", "paid", "tutor-1");
  const otherEvent = buildNotificationDedupeKey("order", "order-1", "started", "tutor-1");
  const otherRecipient = buildNotificationDedupeKey("order", "order-1", "paid", "tutor-2");

  assert.equal(first, retry);
  assert.notEqual(first, otherEvent);
  assert.notEqual(first, otherRecipient);
});

test("notification dedupe keys reject ambiguous parts", () => {
  assert.throws(() => buildNotificationDedupeKey("order", "", "paid", "tutor-1"));
  assert.throws(() => buildNotificationDedupeKey("order", "order:1", "paid", "tutor-1"));
});
