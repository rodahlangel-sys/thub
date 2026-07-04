import type { OrderStatus, TeachMode } from "@prisma/client";
import { formatFen } from "@/lib/settlements";

export type TutorOrderCategory = "todo" | "active" | "done";

export function safeTutorText(
  value: string | null | undefined,
  fallback = "信息待确认",
) {
  const text = value?.trim();

  if (!text || text === "????" || text === "undefined" || text === "null") {
    return fallback;
  }

  return text;
}

export function formatTutorParentName(value: string | null | undefined) {
  return safeTutorText(value, "家长信息待确认");
}

export function formatTutorMoney(amount: number | null | undefined) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "金额待确认";
  }

  return formatFen(amount);
}

export function getTutorOrderCategory(status: OrderStatus): TutorOrderCategory {
  if (
    status === "PENDING_TUTOR_CONFIRM" ||
    status === "PENDING_PAYMENT" ||
    status === "WAIT_PLATFORM_CONFIRM" ||
    status === "WAIT_TUTOR_PAYMENT" ||
    status === "WAIT_TUTOR_CONFIRM" ||
    status === "REFUND_REQUESTED"
  ) {
    return "todo";
  }

  if (
    status === "ESCROWED" ||
    status === "IN_PROGRESS" ||
    status === "PENDING_PARENT_CONFIRM"
  ) {
    return "active";
  }

  return "done";
}

export function getTutorOrderStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "新预约待确认",
    PENDING_PAYMENT: "等待家长付款",
    WAIT_PLATFORM_CONFIRM: "等待平台确认收款",
    WAIT_TUTOR_PAYMENT: "等待家长支付家教费",
    WAIT_TUTOR_CONFIRM: "待确认收款",
    ESCROWED: "已安排待开始",
    IN_PROGRESS: "辅导进行中",
    PENDING_PARENT_CONFIRM: "等待家长确认",
    COMPLETED: "已完成",
    REFUND_REQUESTED: "退款处理中",
    REFUNDED: "已退款",
    CANCELLED: "已取消",
  };

  return labels[status];
}

export function getTutorOrderAction(status: OrderStatus) {
  const actions: Record<
    OrderStatus,
    { label: string; tone: "primary" | "outline" }
  > = {
    PENDING_TUTOR_CONFIRM: { label: "查看并确认", tone: "primary" },
    PENDING_PAYMENT: { label: "查看预约", tone: "outline" },
    WAIT_PLATFORM_CONFIRM: { label: "查看预约", tone: "outline" },
    WAIT_TUTOR_PAYMENT: { label: "查看预约", tone: "outline" },
    WAIT_TUTOR_CONFIRM: { label: "确认收款", tone: "primary" },
    ESCROWED: { label: "查看辅导安排", tone: "primary" },
    IN_PROGRESS: { label: "提交课后反馈", tone: "primary" },
    PENDING_PARENT_CONFIRM: { label: "查看记录", tone: "outline" },
    COMPLETED: { label: "查看详情", tone: "outline" },
    REFUND_REQUESTED: { label: "查看进度", tone: "primary" },
    REFUNDED: { label: "查看记录", tone: "outline" },
    CANCELLED: { label: "查看记录", tone: "outline" },
  };

  return actions[status];
}

export function getTutorTeachModeLabel(mode: TeachMode) {
  const labels: Record<TeachMode, string> = {
    ONLINE: "线上",
    OFFLINE: "线下",
    BOTH: "线上/线下均可",
  };

  return labels[mode];
}
