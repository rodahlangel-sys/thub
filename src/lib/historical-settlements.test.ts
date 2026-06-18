import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHistoricalSettlementCandidate } from "./historical-settlements";

const validCandidate = {
  orderId: "order-1",
  status: "COMPLETED",
  totalAmountFen: 10_000,
  platformFeeRateBps: 500,
  platformFeeAmountFen: 500,
  tutorNetAmountFen: 9_500,
  parentRole: "PARENT",
  tutorRole: "TUTOR",
  paymentStatus: "PAID",
  paymentAmountFen: 10_000,
  refundStatuses: [] as string[],
  hasSettlement: false,
};

test("accepts a completed paid order with an exact five percent snapshot", () => {
  const result = evaluateHistoricalSettlementCandidate(validCandidate);

  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
  assert.deepEqual(result.amounts, {
    grossAmountFen: 10_000,
    platformFeeRateBps: 500,
    platformFeeAmountFen: 500,
    tutorNetAmountFen: 9_500,
  });
});

test("rejects pending refunds, amount mismatches, and existing settlements", () => {
  const result = evaluateHistoricalSettlementCandidate({
    ...validCandidate,
    paymentAmountFen: 9_999,
    refundStatuses: ["PENDING"],
    hasSettlement: true,
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, [
    "PAYMENT_AMOUNT_MISMATCH",
    "REFUND_PENDING_OR_APPROVED",
    "SETTLEMENT_ALREADY_EXISTS",
  ]);
});

test("rejects invalid roles and a non-500 basis-point snapshot", () => {
  const result = evaluateHistoricalSettlementCandidate({
    ...validCandidate,
    parentRole: "ADMIN",
    platformFeeRateBps: 499,
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ["INVALID_PARTICIPANT_ROLES", "INVALID_FEE_SNAPSHOT"]);
});
