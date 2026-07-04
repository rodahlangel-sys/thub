import type { DemandStatus, OrderStatus } from "@prisma/client";
import { formatFen } from "@/lib/settlements";

export type ParentOrderGroup = "pending" | "active" | "done";

export function safeText(value: unknown, fallback = "信息待完善") {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();

  if (!text || text === "null" || text === "undefined" || text.includes("????")) {
    return fallback;
  }

  return text;
}

export function formatParentDateTime(value: Date | string | null | undefined) {
  if (!value) return "时间待确认";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "时间待确认";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatParentDate(value: Date | string | null | undefined) {
  if (!value) return "时间待确认";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "时间待确认";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatCurrency(value: number | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "金额待确认";

  const text = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
  return `￥${text}`;
}

export function formatOrderCurrency(value: number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? formatFen(amount) : "金额待确认";
}

export function getParentDemandStatusLabel(status: DemandStatus) {
  const labels: Record<DemandStatus, string> = {
    OPEN: "正在寻找老师",
    MATCHED: "已进入预约",
    CLOSED: "已结束",
  };

  return labels[status];
}

export function getParentDemandStatusTone(status: DemandStatus) {
  if (status === "OPEN") return "green" as const;
  if (status === "MATCHED") return "blue" as const;
  return "gray" as const;
}

export function getParentOrderStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "等待老师确认",
    PENDING_PAYMENT: "待付款",
    WAIT_PLATFORM_CONFIRM: "等待平台确认收款",
    WAIT_TUTOR_PAYMENT: "待支付家教费用",
    WAIT_TUTOR_CONFIRM: "等待家教确认收款",
    ESCROWED: "已确认安排",
    IN_PROGRESS: "辅导进行中",
    PENDING_PARENT_CONFIRM: "待确认完成",
    COMPLETED: "已完成",
    REFUND_REQUESTED: "退款处理中",
    REFUNDED: "已退款",
    CANCELLED: "已取消",
  };

  return labels[status];
}

export function getParentOrderStatusTone(status: OrderStatus) {
  if (status === "PENDING_PAYMENT" || status === "WAIT_TUTOR_PAYMENT") {
    return "blue" as const;
  }
  if (
    status === "PENDING_TUTOR_CONFIRM" ||
    status === "PENDING_PARENT_CONFIRM" ||
    status === "WAIT_PLATFORM_CONFIRM" ||
    status === "WAIT_TUTOR_CONFIRM"
  ) {
    return "yellow" as const;
  }
  if (status === "REFUND_REQUESTED" || status === "REFUNDED") return "red" as const;
  if (status === "COMPLETED" || status === "ESCROWED" || status === "IN_PROGRESS") {
    return "green" as const;
  }
  return "gray" as const;
}

export function getParentOrderGroup(status: OrderStatus): ParentOrderGroup {
  if (
    status === "PENDING_TUTOR_CONFIRM" ||
    status === "PENDING_PAYMENT" ||
    status === "WAIT_PLATFORM_CONFIRM" ||
    status === "WAIT_TUTOR_PAYMENT" ||
    status === "WAIT_TUTOR_CONFIRM" ||
    status === "PENDING_PARENT_CONFIRM" ||
    status === "REFUND_REQUESTED"
  ) {
    return "pending";
  }

  if (status === "ESCROWED" || status === "IN_PROGRESS") {
    return "active";
  }

  return "done";
}

export function getParentOrderStatusHint(status: OrderStatus) {
  const hints: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "预约已提交，请等待老师确认。",
    PENDING_PAYMENT: "老师已确认接单，请完成担保支付。",
    WAIT_PLATFORM_CONFIRM: "已标记支付平台信息服务费，等待管理员确认收款。",
    WAIT_TUTOR_PAYMENT: "平台信息服务费已确认，请向家教支付服务费。",
    WAIT_TUTOR_CONFIRM: "已标记支付家教服务费，等待家教确认收款。",
    ESCROWED: "费用已进入担保状态，请按约定时间上课。",
    IN_PROGRESS: "老师已开始服务，课后会提交反馈。",
    PENDING_PARENT_CONFIRM: "老师已提交课后反馈，请查看并确认。",
    COMPLETED: "本次辅导已完成。",
    REFUND_REQUESTED: "退款申请已提交，等待平台处理。",
    REFUNDED: "本次订单已完成退款处理。",
    CANCELLED: "本次预约已取消。",
  };

  return hints[status];
}

export function getParentOrderAction(status: OrderStatus, orderId: string, hasReview?: boolean) {
  if (status === "PENDING_PAYMENT") {
    return { label: "去付款", href: `/parent/orders/${orderId}/pay` };
  }

  if (
    status === "WAIT_PLATFORM_CONFIRM" ||
    status === "WAIT_TUTOR_PAYMENT" ||
    status === "WAIT_TUTOR_CONFIRM"
  ) {
    return { label: "查看支付进度", href: `/parent/orders/${orderId}/pay` };
  }

  if (status === "PENDING_PARENT_CONFIRM") {
    return { label: "查看反馈", href: `/parent/orders/${orderId}` };
  }

  if (status === "COMPLETED" && !hasReview) {
    return { label: "去评价", href: `/parent/orders/${orderId}/review` };
  }

  if (status === "REFUND_REQUESTED") {
    return { label: "查看退款进度", href: `/parent/orders/${orderId}` };
  }

  return { label: "查看详情", href: `/parent/orders/${orderId}` };
}

export function getFitLabel(matchPercent: number) {
  if (matchPercent >= 80) return "非常合适";
  if (matchPercent >= 60) return "比较合适";
  return "可以了解";
}

export function getFitTone(matchPercent: number) {
  if (matchPercent >= 80) return "green" as const;
  if (matchPercent >= 60) return "blue" as const;
  return "yellow" as const;
}
