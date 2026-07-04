import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQrCodePaymentAmounts,
  getQrCodePaymentStage,
  validateQrCodePaymentTransition,
} from "./qrcode-payments";

test("QRCODE payment splits the database order total into five percent platform fee and tutor net amount", () => {
  const amounts = calculateQrCodePaymentAmounts({
    totalAmountFen: 12345,
    platformFeeRateBps: 500,
  });

  assert.deepEqual(amounts, {
    grossAmountFen: 12345,
    platformFeeRateBps: 500,
    platformFeeAmountFen: 617,
    tutorNetAmountFen: 11728,
  });
  assert.equal(
    amounts.platformFeeAmountFen + amounts.tutorNetAmountFen,
    amounts.grossAmountFen,
  );
});

test("QRCODE payment exposes exactly one active step at a time", () => {
  assert.equal(
    getQrCodePaymentStage({
      orderStatus: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      hasPlatformQr: true,
      hasTutorQr: true,
    }),
    "PAY_PLATFORM_FEE",
  );
  assert.equal(
    getQrCodePaymentStage({
      orderStatus: "WAIT_PLATFORM_CONFIRM",
      paymentStatus: "WAIT_PLATFORM_CONFIRM",
      hasPlatformQr: true,
      hasTutorQr: true,
    }),
    "WAIT_PLATFORM_CONFIRM",
  );
  assert.equal(
    getQrCodePaymentStage({
      orderStatus: "WAIT_TUTOR_PAYMENT",
      paymentStatus: "WAIT_TUTOR_PAYMENT",
      hasPlatformQr: true,
      hasTutorQr: true,
    }),
    "PAY_TUTOR",
  );
  assert.equal(
    getQrCodePaymentStage({
      orderStatus: "WAIT_TUTOR_CONFIRM",
      paymentStatus: "WAIT_TUTOR_CONFIRM",
      hasPlatformQr: true,
      hasTutorQr: true,
    }),
    "WAIT_TUTOR_CONFIRM",
  );
  assert.equal(
    getQrCodePaymentStage({
      orderStatus: "ESCROWED",
      paymentStatus: "PAID",
      hasPlatformQr: true,
      hasTutorQr: true,
    }),
    "PAID",
  );
});

test("QRCODE payment transitions require the correct actor and current state", () => {
  assert.equal(
    validateQrCodePaymentTransition({
      actorRole: "PARENT",
      action: "PARENT_PAID_PLATFORM",
      orderStatus: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      isOrderParent: true,
      isOrderTutor: false,
    }).ok,
    true,
  );
  assert.equal(
    validateQrCodePaymentTransition({
      actorRole: "PARENT",
      action: "PARENT_PAID_TUTOR",
      orderStatus: "WAIT_PLATFORM_CONFIRM",
      paymentStatus: "WAIT_PLATFORM_CONFIRM",
      isOrderParent: true,
      isOrderTutor: false,
    }).ok,
    false,
  );
  assert.equal(
    validateQrCodePaymentTransition({
      actorRole: "ADMIN",
      action: "ADMIN_CONFIRMED_PLATFORM",
      orderStatus: "WAIT_PLATFORM_CONFIRM",
      paymentStatus: "WAIT_PLATFORM_CONFIRM",
      isOrderParent: false,
      isOrderTutor: false,
    }).ok,
    true,
  );
  assert.equal(
    validateQrCodePaymentTransition({
      actorRole: "ADMIN",
      action: "TUTOR_CONFIRMED_RECEIPT",
      orderStatus: "WAIT_TUTOR_CONFIRM",
      paymentStatus: "WAIT_TUTOR_CONFIRM",
      isOrderParent: false,
      isOrderTutor: false,
    }).ok,
    false,
  );
  assert.equal(
    validateQrCodePaymentTransition({
      actorRole: "TUTOR",
      action: "TUTOR_CONFIRMED_RECEIPT",
      orderStatus: "WAIT_TUTOR_CONFIRM",
      paymentStatus: "WAIT_TUTOR_CONFIRM",
      isOrderParent: false,
      isOrderTutor: true,
    }).ok,
    true,
  );
});
