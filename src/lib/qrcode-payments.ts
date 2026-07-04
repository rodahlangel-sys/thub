import { calculateSettlementAmounts } from "./settlements";

export type QrCodePaymentOrderStatus =
  | "PENDING_PAYMENT"
  | "WAIT_PLATFORM_CONFIRM"
  | "WAIT_TUTOR_PAYMENT"
  | "WAIT_TUTOR_CONFIRM"
  | "ESCROWED";

export type QrCodePaymentStatus =
  | "UNPAID"
  | "WAIT_PLATFORM_CONFIRM"
  | "WAIT_TUTOR_PAYMENT"
  | "WAIT_TUTOR_CONFIRM"
  | "PAID";

export type QrCodePaymentStage =
  | "PAY_PLATFORM_FEE"
  | "WAIT_PLATFORM_CONFIRM"
  | "PAY_TUTOR"
  | "WAIT_TUTOR_CONFIRM"
  | "PAID"
  | "UNAVAILABLE";

export type QrCodePaymentAction =
  | "PARENT_PAID_PLATFORM"
  | "ADMIN_CONFIRMED_PLATFORM"
  | "ADMIN_REJECTED_PLATFORM"
  | "PARENT_PAID_TUTOR"
  | "TUTOR_CONFIRMED_RECEIPT"
  | "TUTOR_REJECTED_RECEIPT";

export type QrCodePaymentActorRole = "PARENT" | "TUTOR" | "ADMIN";

export function calculateQrCodePaymentAmounts(input: {
  totalAmountFen: number;
  platformFeeRateBps: number;
}) {
  return calculateSettlementAmounts(
    input.totalAmountFen,
    input.platformFeeRateBps,
  );
}

export function getQrCodePaymentStage(input: {
  orderStatus: string;
  paymentStatus: string | null | undefined;
  hasPlatformQr: boolean;
  hasTutorQr: boolean;
}): QrCodePaymentStage {
  if (input.orderStatus === "ESCROWED" && input.paymentStatus === "PAID") {
    return "PAID";
  }

  if (!input.hasPlatformQr) return "UNAVAILABLE";

  if (
    input.orderStatus === "PENDING_PAYMENT" &&
    (!input.paymentStatus || input.paymentStatus === "UNPAID")
  ) {
    return "PAY_PLATFORM_FEE";
  }

  if (
    input.orderStatus === "WAIT_PLATFORM_CONFIRM" &&
    input.paymentStatus === "WAIT_PLATFORM_CONFIRM"
  ) {
    return "WAIT_PLATFORM_CONFIRM";
  }

  if (!input.hasTutorQr) return "UNAVAILABLE";

  if (
    input.orderStatus === "WAIT_TUTOR_PAYMENT" &&
    input.paymentStatus === "WAIT_TUTOR_PAYMENT"
  ) {
    return "PAY_TUTOR";
  }

  if (
    input.orderStatus === "WAIT_TUTOR_CONFIRM" &&
    input.paymentStatus === "WAIT_TUTOR_CONFIRM"
  ) {
    return "WAIT_TUTOR_CONFIRM";
  }

  return "UNAVAILABLE";
}

export function validateQrCodePaymentTransition(input: {
  actorRole: QrCodePaymentActorRole;
  action: QrCodePaymentAction;
  orderStatus: string;
  paymentStatus: string | null | undefined;
  isOrderParent: boolean;
  isOrderTutor: boolean;
}): { ok: true } | { ok: false; reason: string } {
  const deny = (reason: string) => ({ ok: false as const, reason });

  if (
    input.action === "PARENT_PAID_PLATFORM" &&
    input.actorRole === "PARENT" &&
    input.isOrderParent &&
    input.orderStatus === "PENDING_PAYMENT" &&
    (!input.paymentStatus || input.paymentStatus === "UNPAID")
  ) {
    return { ok: true };
  }

  if (
    input.action === "ADMIN_CONFIRMED_PLATFORM" &&
    input.actorRole === "ADMIN" &&
    input.orderStatus === "WAIT_PLATFORM_CONFIRM" &&
    input.paymentStatus === "WAIT_PLATFORM_CONFIRM"
  ) {
    return { ok: true };
  }

  if (
    input.action === "ADMIN_REJECTED_PLATFORM" &&
    input.actorRole === "ADMIN" &&
    input.orderStatus === "WAIT_PLATFORM_CONFIRM" &&
    input.paymentStatus === "WAIT_PLATFORM_CONFIRM"
  ) {
    return { ok: true };
  }

  if (
    input.action === "PARENT_PAID_TUTOR" &&
    input.actorRole === "PARENT" &&
    input.isOrderParent &&
    input.orderStatus === "WAIT_TUTOR_PAYMENT" &&
    input.paymentStatus === "WAIT_TUTOR_PAYMENT"
  ) {
    return { ok: true };
  }

  if (
    input.action === "TUTOR_CONFIRMED_RECEIPT" &&
    input.actorRole === "TUTOR" &&
    input.isOrderTutor &&
    input.orderStatus === "WAIT_TUTOR_CONFIRM" &&
    input.paymentStatus === "WAIT_TUTOR_CONFIRM"
  ) {
    return { ok: true };
  }

  if (
    input.action === "TUTOR_REJECTED_RECEIPT" &&
    input.actorRole === "TUTOR" &&
    input.isOrderTutor &&
    input.orderStatus === "WAIT_TUTOR_CONFIRM" &&
    input.paymentStatus === "WAIT_TUTOR_CONFIRM"
  ) {
    return { ok: true };
  }

  return deny("INVALID_QRCODE_PAYMENT_TRANSITION");
}

export function createQrCodeTransactionNo(now = Date.now()) {
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `QRCODE-${now}-${random}`;
}
