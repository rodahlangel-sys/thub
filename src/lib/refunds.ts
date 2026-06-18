import type { OrderStatus } from "@prisma/client";

export const refundReasonOptions = [
  "老师无法按约定时间上课",
  "课程尚未开始，双方协商取消",
  "课程体验与约定不符",
  "老师未完成约定服务",
  "其他原因",
] as const;

export function canRequestPaidRefund(status: OrderStatus) {
  return (
    status === "ESCROWED" ||
    status === "IN_PROGRESS" ||
    status === "PENDING_PARENT_CONFIRM"
  );
}

export function getRefundUnavailableReason(status: OrderStatus) {
  const reasons: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "老师还没有确认接单，可以取消订单，不需要申请退款。",
    PENDING_PAYMENT: "订单尚未支付，可以取消订单，不需要申请支付退款。",
    ESCROWED: "",
    IN_PROGRESS: "",
    PENDING_PARENT_CONFIRM: "",
    COMPLETED: "该订单已完成结算，需要由管理员进行售后处理。",
    REFUND_REQUESTED: "退款申请已提交，正在等待平台审核。",
    REFUNDED: "该订单已完成退款，不能重复申请。",
    CANCELLED: "订单已取消，不能申请退款。",
  };

  return reasons[status];
}

export function getSuggestedRefundAmount(status: OrderStatus, paidAmount: number) {
  if (status === "ESCROWED") {
    return paidAmount;
  }

  if (status === "IN_PROGRESS") {
    return Math.round(paidAmount * 0.5);
  }

  if (status === "PENDING_PARENT_CONFIRM") {
    return Math.round(paidAmount * 0.3);
  }

  return 0;
}
