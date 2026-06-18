import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOrderGrossAmountFen,
  calculateSettlementAmounts,
  getPlatformFeeRateBps,
  getSettlementProvider,
  yuanToFen,
} from "./settlements";

test("converts a yuan price to fen and calculates the gross snapshot", () => {
  assert.equal(yuanToFen(150), 15_000);
  assert.equal(calculateOrderGrossAmountFen(2, 15_000), 30_000);
  assert.equal(calculateOrderGrossAmountFen(1.5, 19_900), 29_850);
  assert.throws(() => calculateOrderGrossAmountFen(0, 15_000));
  assert.throws(() => calculateOrderGrossAmountFen(1, -1));
});

test("calculates a five percent fee for a 100 yuan order", () => {
  assert.deepEqual(calculateSettlementAmounts(10_000, 500), {
    grossAmountFen: 10_000,
    platformFeeRateBps: 500,
    platformFeeAmountFen: 500,
    tutorNetAmountFen: 9_500,
  });
});

test("rounds the platform fee to the nearest fen", () => {
  assert.deepEqual(calculateSettlementAmounts(19_999, 500), {
    grossAmountFen: 19_999,
    platformFeeRateBps: 500,
    platformFeeAmountFen: 1_000,
    tutorNetAmountFen: 18_999,
  });
});

test("rejects zero, negative, fractional and unsafe gross amounts", () => {
  for (const value of [0, -1, 100.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateSettlementAmounts(value, 500));
  }
});

test("rejects invalid platform fee rates", () => {
  for (const value of [-1, 10_001, 500.5, Number.NaN]) {
    assert.throws(() => calculateSettlementAmounts(10_000, value));
  }
});

test("uses the fixed default rate and accepts the configured fixed rate", () => {
  assert.equal(getPlatformFeeRateBps(undefined), 500);
  assert.equal(getPlatformFeeRateBps("500"), 500);
  assert.throws(() => getPlatformFeeRateBps("499"));
  assert.throws(() => getPlatformFeeRateBps("invalid"));
});

test("only accepts the mock settlement provider", () => {
  assert.equal(getSettlementProvider(undefined), "MOCK");
  assert.equal(getSettlementProvider("MOCK"), "MOCK");
  assert.throws(() => getSettlementProvider("ALIPAY"));
});
