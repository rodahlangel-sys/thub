import assert from "node:assert/strict";
import test from "node:test";
import { canSubmitLessonFeedback } from "./order-status";

test("lesson feedback can only be submitted after service has started", () => {
  assert.equal(canSubmitLessonFeedback("IN_PROGRESS"), true);
  assert.equal(canSubmitLessonFeedback("ESCROWED"), false);
  assert.equal(canSubmitLessonFeedback("PENDING_PARENT_CONFIRM"), false);
});
