import assert from "node:assert/strict";
import test from "node:test";
import { hasBlockingConsistencyIssues } from "./data-consistency";

const cleanReport = {
  duplicateBookings: 0,
  pendingRefundsMissingPreviousStatus: 0,
  paymentAmountMismatches: 0,
  profilesWithMultipleActiveSchoolProofs: 0,
  profilesOverOptionalDocumentLimit: 0,
  duplicateNotificationDedupeKeys: 0,
  duplicateLegacyNotificationPayloads: 2,
};

test("legacy notification payload matches are warnings rather than destructive repair signals", () => {
  assert.equal(hasBlockingConsistencyIssues(cleanReport), false);
});

test("database invariant violations block the consistency check", () => {
  assert.equal(
    hasBlockingConsistencyIssues({ ...cleanReport, paymentAmountMismatches: 1 }),
    true,
  );
});
