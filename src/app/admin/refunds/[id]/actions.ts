"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import { currentPaymentProvider } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getDashboardPath } from "@/lib/roles";

const recoverableRefundOrderStatuses = new Set<OrderStatus>([
  OrderStatus.ESCROWED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.PENDING_PARENT_CONFIRM,
]);

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(user.role));
  }

  return user;
}

function redirectWithError(refundId: string, message: string): never {
  redirect(`/admin/refunds/${refundId}?error=${encodeURIComponent(message)}`);
}

function revalidateRefundPaths(refundId: string, orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${refundId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${orderId}`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${orderId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/notifications");
}

export async function approveRefundAction(formData: FormData) {
  await requireAdmin();

  const refundId = String(formData.get("refundId") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: {
        include: {
          payment: true,
          settlement: true,
        },
      },
    },
  });

  if (!refund) {
    redirect("/admin/refunds");
  }

  if (refund.status !== "PENDING") {
    redirectWithError(refund.id, "该退款申请已被处理。");
  }

  if (refund.order.status !== "REFUND_REQUESTED") {
    redirectWithError(refund.id, "退款记录状态异常，请联系管理员处理。");
  }

  if (!refund.order.payment || refund.order.payment.status !== "PAID") {
    redirectWithError(refund.id, "订单没有可退款的已支付记录。");
  }

  if (refund.order.settlement?.status === "SETTLED") {
    redirectWithError(refund.id, "该订单已完成结算，需要先进行人工售后处理。");
  }

  if (refund.refundAmount > refund.order.payment.amount) {
    redirectWithError(refund.id, "退款金额不能超过已支付金额。");
  }

  if (!refund.order.payment.transactionNo) {
    redirectWithError(refund.id, "支付记录缺少交易号，暂时不能退款。");
  }

  const refundResult = await currentPaymentProvider.refundPayment({
    transactionNo: refund.order.payment.transactionNo,
    refundAmount: refund.refundAmount,
    reason: refund.reason,
  });

  if (
    !refundResult.success ||
    !refundResult.refundTransactionNo ||
    !refundResult.refundedAt
  ) {
    redirectWithError(
      refund.id,
      refundResult.message ?? "退款方式暂不可用，请稍后再试。",
    );
  }

  const noteParts = [
    adminNote,
    `模拟退款已完成，退款交易号：${refundResult.refundTransactionNo}`,
    `退款时间：${refundResult.refundedAt.toLocaleString("zh-CN")}`,
  ].filter(Boolean);

  try {
    await prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.updateMany({
        where: {
          id: refund.id,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          adminNote: noteParts.join("；"),
        },
      });

      if (updatedRefund.count !== 1) {
        throw new Error("REFUND_ALREADY_HANDLED");
      }

      const updatedOrder = await tx.order.updateMany({
        where: {
          id: refund.orderId,
          status: "REFUND_REQUESTED",
        },
        data: { status: "REFUNDED" },
      });

      if (updatedOrder.count !== 1) {
        throw new Error("REFUND_ORDER_STATUS_CHANGED");
      }

      await tx.payment.update({
        where: { orderId: refund.orderId },
        data: { status: "REFUNDED" },
      });

      await safelyCreateNotification(
        {
          userId: refund.order.parentId,
          title: "退款已通过",
          content: "你的退款申请已通过，订单已完成退款处理。",
          type: "REFUND",
          link: `/parent/orders/${refund.orderId}`,
          dedupeKey: buildNotificationDedupeKey(
            "refund",
            refund.id,
            "approved",
            refund.order.parentId,
          ),
        },
        tx,
      );

      await safelyCreateNotification(
        {
          userId: refund.order.tutorId,
          title: "订单已退款",
          content: "该订单的退款申请已通过，订单已结束。",
          type: "REFUND",
          link: `/tutor/orders/${refund.orderId}`,
          dedupeKey: buildNotificationDedupeKey(
            "refund",
            refund.id,
            "approved",
            refund.order.tutorId,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REFUND_ALREADY_HANDLED") {
      redirectWithError(refund.id, "该退款申请已被处理。");
    }

    if (error instanceof Error && error.message === "REFUND_ORDER_STATUS_CHANGED") {
      redirectWithError(refund.id, "退款记录状态异常，请联系管理员处理。");
    }

    throw error;
  }

  revalidateRefundPaths(refund.id, refund.orderId);
  redirect(`/admin/refunds/${refund.id}`);
}

export async function rejectRefundAction(formData: FormData) {
  await requireAdmin();

  const refundId = String(formData.get("refundId") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  if (!adminNote) {
    redirectWithError(refundId, "请填写拒绝原因");
  }

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: true,
    },
  });

  if (!refund) {
    redirect("/admin/refunds");
  }

  if (refund.status !== "PENDING") {
    redirectWithError(refund.id, "该退款申请已被处理。");
  }

  if (refund.order.status !== "REFUND_REQUESTED") {
    redirectWithError(refund.id, "退款记录状态异常，请联系管理员处理。");
  }

  if (
    !refund.previousOrderStatus ||
    !recoverableRefundOrderStatuses.has(refund.previousOrderStatus)
  ) {
    console.error("Refund is missing a recoverable previous order status", {
      refundId: refund.id,
      orderId: refund.orderId,
      previousOrderStatus: refund.previousOrderStatus,
    });
    redirectWithError(refund.id, "该退款记录缺少原订单状态，请先处理数据异常。");
  }

  const restoredStatus = refund.previousOrderStatus;

  try {
    await prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.updateMany({
        where: {
          id: refund.id,
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          adminNote,
        },
      });

      if (updatedRefund.count !== 1) {
        throw new Error("REFUND_ALREADY_HANDLED");
      }

      const updatedOrder = await tx.order.updateMany({
        where: {
          id: refund.orderId,
          status: "REFUND_REQUESTED",
        },
        data: { status: restoredStatus },
      });

      if (updatedOrder.count !== 1) {
        throw new Error("REFUND_ORDER_STATUS_CHANGED");
      }

      await safelyCreateNotification(
        {
          userId: refund.order.parentId,
          title: "退款申请未通过",
          content: "你的退款申请未通过，请查看管理员说明。",
          type: "REFUND",
          link: `/parent/orders/${refund.orderId}`,
          dedupeKey: buildNotificationDedupeKey(
            "refund",
            refund.id,
            "rejected",
            refund.order.parentId,
          ),
        },
        tx,
      );

      await safelyCreateNotification(
        {
          userId: refund.order.tutorId,
          title: "退款申请已被拒绝",
          content: "该订单退款申请未通过，请继续关注订单状态。",
          type: "REFUND",
          link: `/tutor/orders/${refund.orderId}`,
          dedupeKey: buildNotificationDedupeKey(
            "refund",
            refund.id,
            "rejected",
            refund.order.tutorId,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REFUND_ALREADY_HANDLED") {
      redirectWithError(refund.id, "该退款申请已被处理。");
    }

    if (error instanceof Error && error.message === "REFUND_ORDER_STATUS_CHANGED") {
      redirectWithError(refund.id, "退款记录状态异常，请联系管理员处理。");
    }

    throw error;
  }

  revalidateRefundPaths(refund.id, refund.orderId);
  redirect(`/admin/refunds/${refund.id}`);
}
