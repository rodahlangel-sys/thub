import type { OrderStatus } from "@prisma/client";
import {
  calculateOrderGrossAmountFen,
  calculateSettlementAmounts,
  formatFen,
  getPlatformFeeRateBps,
} from "@/lib/settlements";

export function getOrderStatusTone(status: OrderStatus) {
  if (status === "PENDING_TUTOR_CONFIRM") {
    return "yellow" as const;
  }

  if (status === "PENDING_PAYMENT") {
    return "blue" as const;
  }

  if (status === "CANCELLED") {
    return "gray" as const;
  }

  if (status === "COMPLETED") {
    return "green" as const;
  }

  if (status === "REFUND_REQUESTED" || status === "REFUNDED") {
    return "red" as const;
  }

  return "green" as const;
}

export function getOrderStatusDescription(status: OrderStatus) {
  const descriptions: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "订单已提交，等待老师确认是否接单。",
    PENDING_PAYMENT: "老师已确认接单，等待家长完成支付。",
    ESCROWED: "家长已完成担保支付，等待开始服务。",
    IN_PROGRESS: "家教服务正在进行中。",
    PENDING_PARENT_CONFIRM: "服务已结束，等待家长确认。",
    COMPLETED: "订单已完成。",
    REFUND_REQUESTED: "家长或老师已发起退款申请。",
    REFUNDED: "订单已退款。",
    CANCELLED: "订单已取消，不再继续。",
  };

  return descriptions[status];
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortOrderId(id: string) {
  return id.slice(-8).toUpperCase();
}

export function formatMoney(amount: number) {
  return `${amount.toLocaleString("zh-CN")} 元`;
}

export const formatOrderMoney = formatFen;

export function calculateOrderAmounts(hours: number, hourlyPriceFen: number) {
  const totalAmount = calculateOrderGrossAmountFen(hours, hourlyPriceFen);
  const settlement = calculateSettlementAmounts(
    totalAmount,
    getPlatformFeeRateBps(),
  );

  return {
    courseAmount: totalAmount,
    serviceFee: settlement.platformFeeAmountFen,
    totalAmount,
    platformFeeRateBps: settlement.platformFeeRateBps,
    platformFeeAmountFen: settlement.platformFeeAmountFen,
    tutorNetAmountFen: settlement.tutorNetAmountFen,
  };
}

export function calculateServerHourlyPrice(
  demand: { budgetMin: number; budgetMax: number },
  tutor: { priceMin: number; priceMax: number },
) {
  const values = [
    demand.budgetMin,
    demand.budgetMax,
    tutor.priceMin,
    tutor.priceMax,
  ];

  if (
    values.some((value) => !Number.isFinite(value) || value <= 0) ||
    demand.budgetMin > demand.budgetMax ||
    tutor.priceMin > tutor.priceMax
  ) {
    throw new Error("INVALID_PRICE_RULE");
  }

  if (tutor.priceMin >= demand.budgetMin && tutor.priceMin <= demand.budgetMax) {
    return tutor.priceMin;
  }

  if (demand.budgetMin >= tutor.priceMin && demand.budgetMin <= tutor.priceMax) {
    return demand.budgetMin;
  }

  return tutor.priceMin;
}

export function parseScheduledTime(value: string) {
  const normalized = value.trim().replace(/\//g, "-").replace("T", " ");

  if (!normalized) {
    return null;
  }

  const match = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour = "0", minute = "0"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
