import { PaymentQrType, UserRole, type OrderStatus } from "@prisma/client";

export const paymentQrTypeLabels: Record<PaymentQrType, string> = {
  WECHAT: "微信收款码",
  ALIPAY: "支付宝收款码",
};

export const paymentQrTypes = [PaymentQrType.WECHAT, PaymentQrType.ALIPAY] as const;

export function parsePaymentQrType(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  if (raw === PaymentQrType.WECHAT || raw === PaymentQrType.ALIPAY) return raw;
  return null;
}

export function canParentViewTutorPaymentQr(status: OrderStatus) {
  return [
    "WAIT_TUTOR_PAYMENT",
    "WAIT_TUTOR_CONFIRM",
    "ESCROWED",
    "IN_PROGRESS",
    "PENDING_PARENT_CONFIRM",
    "COMPLETED",
  ].includes(status);
}

export function canViewPlatformPaymentQr(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.PARENT;
}
