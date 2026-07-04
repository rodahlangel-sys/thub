import type {
  CertificationStatus,
  DemandStatus,
  OrderStatus,
  RefundStatus,
  TeachMode,
  UserRole,
  UserStatus,
} from "@prisma/client";

export function getRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    PARENT: "家长",
    TUTOR: "大学生家教",
    ADMIN: "管理员",
  };

  return labels[role];
}

export function getDashboardPath(role: UserRole) {
  const paths: Record<UserRole, string> = {
    PARENT: "/parent",
    TUTOR: "/tutor",
    ADMIN: "/admin",
  };

  return paths[role];
}

export function getUserStatusLabel(status: UserStatus) {
  const labels: Record<UserStatus, string> = {
    ACTIVE: "正常",
    DISABLED: "已停用",
  };

  return labels[status];
}

export function getCertificationStatusLabel(status: CertificationStatus) {
  const labels: Record<CertificationStatus, string> = {
    PENDING: "待审核",
    APPROVED: "已认证",
    REJECTED: "未通过",
  };

  return labels[status];
}

export function getDemandStatusLabel(status: DemandStatus) {
  const labels: Record<DemandStatus, string> = {
    OPEN: "开放中",
    MATCHED: "已匹配",
    CLOSED: "已关闭",
  };

  return labels[status];
}

export function getOrderStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    PENDING_TUTOR_CONFIRM: "待老师确认",
    PENDING_PAYMENT: "待家长支付",
    WAIT_PLATFORM_CONFIRM: "待确认平台收款",
    WAIT_TUTOR_PAYMENT: "待支付家教费用",
    WAIT_TUTOR_CONFIRM: "待家教确认收款",
    ESCROWED: "已担保",
    IN_PROGRESS: "服务中",
    PENDING_PARENT_CONFIRM: "待家长确认",
    COMPLETED: "已完成",
    REFUND_REQUESTED: "退款申请中",
    REFUNDED: "已退款",
    CANCELLED: "已取消",
  };

  return labels[status];
}

export function getRefundStatusLabel(status: RefundStatus) {
  const labels: Record<RefundStatus, string> = {
    PENDING: "待处理",
    APPROVED: "已同意",
    REJECTED: "已拒绝",
  };

  return labels[status];
}

export function getTeachModeLabel(mode: TeachMode) {
  const labels: Record<TeachMode, string> = {
    ONLINE: "线上",
    OFFLINE: "线下",
    BOTH: "线上/线下均可",
  };

  return labels[mode];
}

export function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    UNPAID: "未支付",
    WAIT_PLATFORM_CONFIRM: "待确认平台收款",
    WAIT_TUTOR_PAYMENT: "待支付家教费用",
    WAIT_TUTOR_CONFIRM: "待家教确认收款",
    PAID: "已支付",
    REFUNDED: "已退款",
  };

  return labels[status] ?? status;
}

export function getPaymentProviderLabel(provider: string) {
  const labels: Record<string, string> = {
    MOCK: "模拟支付",
    QRCODE: "扫码支付",
    ALIPAY: "支付宝",
    WECHAT: "微信支付",
  };

  return labels[provider] ?? provider;
}

export function getNotificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    SYSTEM: "系统",
    AUDIT: "审核",
    ORDER: "订单",
    PAYMENT: "支付",
    FEEDBACK: "课后反馈",
    REVIEW: "评价",
    REFUND: "退款",
  };

  return labels[type] ?? type;
}
