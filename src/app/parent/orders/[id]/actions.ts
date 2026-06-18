"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, createNotification } from "@/lib/notifications";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  calculateSettlementAmounts,
  createMockSettlementTransactionNo,
  formatFen,
  getSettlementProvider,
} from "@/lib/settlements";

function redirectWithError(orderId: string, message: string): never {
  redirect(`/parent/orders/${orderId}?error=${encodeURIComponent(message)}`);
}

export async function cancelParentOrderAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      parentId: user.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  if (order.status !== "PENDING_TUTOR_CONFIRM") {
    redirect(`/parent/orders/${order.id}`);
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`/parent/orders/${order.id}`);
}

export async function confirmParentOrderCompletedAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      parentId: user.id,
    },
    select: { id: true, status: true, tutorId: true },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const latestOrder = await tx.order.findFirst({
        where: { id: order.id, parentId: user.id },
        include: {
          payment: true,
          lessonFeedback: true,
          settlement: true,
          refunds: {
            where: { status: "PENDING" },
            select: { id: true },
          },
        },
      });

      if (!latestOrder) throw new Error("ORDER_NOT_FOUND");
      if (latestOrder.settlement || latestOrder.status === "COMPLETED") {
        throw new Error("ORDER_ALREADY_SETTLED");
      }
      if (latestOrder.status !== "PENDING_PARENT_CONFIRM") {
        throw new Error("ORDER_STATUS_CHANGED");
      }
      if (!latestOrder.lessonFeedback) throw new Error("FEEDBACK_REQUIRED");
      if (latestOrder.refunds.length > 0) throw new Error("REFUND_PENDING");
      if (
        !latestOrder.payment ||
        latestOrder.payment.status !== "PAID" ||
        latestOrder.payment.amount !== latestOrder.totalAmount
      ) {
        throw new Error("PAYMENT_MISMATCH");
      }

      const amounts = calculateSettlementAmounts(
        latestOrder.totalAmount,
        latestOrder.platformFeeRateBps,
      );

      if (
        latestOrder.platformFeeAmountFen !== amounts.platformFeeAmountFen ||
        latestOrder.tutorNetAmountFen !== amounts.tutorNetAmountFen
      ) {
        throw new Error("ORDER_FEE_SNAPSHOT_MISMATCH");
      }

      const updated = await tx.order.updateMany({
        where: { id: latestOrder.id, status: "PENDING_PARENT_CONFIRM" },
        data: { status: "COMPLETED" },
      });
      if (updated.count !== 1) throw new Error("ORDER_STATUS_CHANGED");

      await tx.settlement.create({
        data: {
          orderId: latestOrder.id,
          tutorId: latestOrder.tutorId,
          provider: getSettlementProvider(),
          status: "SETTLED",
          ...amounts,
          transactionNo: createMockSettlementTransactionNo(),
          settledAt: new Date(),
        },
      });

      await createNotification(
        {
          userId: latestOrder.tutorId,
          title: "本次辅导已完成结算",
          content: `订单总额${formatFen(amounts.grossAmountFen)}，扣除5%平台信息服务费${formatFen(amounts.platformFeeAmountFen)}，本次结算金额为${formatFen(amounts.tutorNetAmountFen)}。`,
          type: "PAYMENT",
          link: `/tutor/orders/${latestOrder.id}`,
          dedupeKey: buildNotificationDedupeKey(
            "order",
            latestOrder.id,
            "settled",
            latestOrder.tutorId,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError(order.id, "该订单已经完成结算，请勿重复操作。");
    }

    const message = error instanceof Error ? error.message : "";
    const userMessage: Record<string, string> = {
      ORDER_ALREADY_SETTLED: "该订单已经完成结算，请勿重复操作。",
      ORDER_STATUS_CHANGED: "订单状态已更新，请刷新后查看。",
      FEEDBACK_REQUIRED: "老师提交课后反馈后才能确认完成。",
      REFUND_PENDING: "退款申请处理中，暂时不能确认完成。",
      PAYMENT_MISMATCH: "支付记录与订单金额不一致，请联系管理员处理。",
      ORDER_FEE_SNAPSHOT_MISMATCH: "订单费用快照异常，请联系管理员处理。",
    };
    redirectWithError(order.id, userMessage[message] ?? "结算未完成，请稍后重试。");
  }

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${order.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/settlements");
  revalidatePath(`/admin/orders/${order.id}`);
  redirect(`/parent/orders/${order.id}/review`);
}
