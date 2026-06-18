"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  buildNotificationDedupeKey,
  safelyCreateNotification,
  safelyNotifyAdmins,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { canRequestPaidRefund } from "@/lib/refunds";
import { getDashboardPath } from "@/lib/roles";

const refundSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(1, "请选择退款原因"),
  description: z.string().trim().max(500, "补充说明请控制在 500 字以内"),
  refundAmount: z.coerce
    .number()
    .positive("退款金额必须大于 0")
    .max(999999, "退款金额过高"),
});

function redirectWithError(orderId: string, message: string): never {
  redirect(`/parent/orders/${orderId}/refund?error=${encodeURIComponent(message)}`);
}

export async function submitRefundRequestAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.PARENT) {
    redirect(getDashboardPath(user.role));
  }

  const result = refundSchema.safeParse({
    orderId: String(formData.get("orderId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    description: String(formData.get("description") ?? ""),
    refundAmount: formData.get("refundAmount"),
  });

  if (!result.success) {
    const orderId = String(formData.get("orderId") ?? "");
    redirectWithError(orderId, result.error.issues[0]?.message ?? "退款申请填写有误");
  }

  const data = result.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: data.orderId,
          parentId: user.id,
        },
        include: {
          payment: true,
          settlement: true,
          refunds: {
            where: { status: "PENDING" },
            select: { id: true },
          },
        },
      });

      if (!order) {
        throw new Error("未找到可申请退款的订单");
      }

      if (!canRequestPaidRefund(order.status)) {
        throw new Error("当前订单状态不能申请退款");
      }

      if (order.settlement?.status === "SETTLED") {
        throw new Error("该订单已完成结算，需要由管理员进行售后处理。");
      }

      if (!order.payment || order.payment.status !== "PAID") {
        throw new Error("订单没有可退款的支付记录");
      }

      if (order.refunds.length > 0) {
        throw new Error("已有退款申请正在审核，请勿重复提交");
      }

      if (data.refundAmount > order.payment.amount) {
        throw new Error("退款金额不能超过已支付金额");
      }

      const refund = await tx.refund.create({
        data: {
          orderId: order.id,
          applicantId: user.id,
          reason: data.reason,
          description: data.description,
          refundAmount: Math.round(data.refundAmount),
          previousOrderStatus: order.status,
          status: "PENDING",
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUND_REQUESTED" },
      });

      await safelyNotifyAdmins(
        {
          title: "有新的退款申请",
          content: "家长提交了退款申请，请及时处理。",
          type: "REFUND",
          link: "/admin/refunds",
          dedupeKey: buildNotificationDedupeKey(
            "refund",
            refund.id,
            "requested",
            "admins",
          ),
        },
        tx,
      );

      await safelyCreateNotification(
        {
          userId: order.tutorId,
          title: "家长提交了退款申请",
          content: "本次订单正在等待平台处理退款申请。",
          type: "REFUND",
          link: `/tutor/orders/${order.id}`,
          dedupeKey: buildNotificationDedupeKey(
            "refund",
            refund.id,
            "requested",
            order.tutorId,
          ),
        },
        tx,
      );
    });
  } catch (error) {
    redirectWithError(
      data.orderId,
      error instanceof Error ? error.message : "退款申请提交失败",
    );
  }

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${data.orderId}`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/refunds");
  redirect(`/parent/orders/${data.orderId}`);
}
