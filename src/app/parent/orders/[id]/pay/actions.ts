"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { buildNotificationDedupeKey, safelyCreateNotification } from "@/lib/notifications";
import {
  calculateQrCodePaymentAmounts,
  validateQrCodePaymentTransition,
} from "@/lib/qrcode-payments";
import { getDashboardPath } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

function redirectWithError(orderId: string, message: string): never {
  redirect(
    `/parent/orders/${orderId}/pay?error=${encodeURIComponent(message)}`,
  );
}

export async function payOrderAction(formData: FormData) {
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
    include: {
      payment: true,
    },
  });

  if (!order) {
    redirect("/parent/orders");
  }

  if (order.payment?.status === "PAID" || order.status === "ESCROWED") {
    redirectWithError(order.id, "该订单已完成支付，不能重复支付");
  }

  if (order.status === "CANCELLED") {
    redirectWithError(order.id, "已取消订单不能支付");
  }

  if (order.status !== "PENDING_PAYMENT") {
    redirectWithError(order.id, "当前订单状态暂不能支付");
  }

  // 统一采用二维码支付流程：家长扫码支付平台信息服务费后，进入等待管理员确认阶段
  const platformQrCount = await prisma.platformPaymentQrCode.count();
  if (platformQrCount === 0) {
    redirectWithError(order.id, "平台收款二维码尚未配置，请联系管理员。");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const latestOrder = await tx.order.findFirst({
        where: {
          id: order.id,
          parentId: user.id,
        },
        include: {
          payment: true,
        },
      });

      if (!latestOrder) throw new Error("ORDER_NOT_FOUND");
      const transition = validateQrCodePaymentTransition({
        actorRole: "PARENT",
        action: "PARENT_PAID_PLATFORM",
        orderStatus: latestOrder.status,
        paymentStatus: latestOrder.payment?.status,
        isOrderParent: latestOrder.parentId === user.id,
        isOrderTutor: false,
      });
      if (!transition.ok) throw new Error(transition.reason);

      // 金额统一从数据库重新计算，禁止前端传入
      const amounts = calculateQrCodePaymentAmounts({
        totalAmountFen: latestOrder.totalAmount,
        platformFeeRateBps: latestOrder.platformFeeRateBps,
      });

      // 校验订单金额快照一致性
      if (
        latestOrder.platformFeeAmountFen !== amounts.platformFeeAmountFen ||
        latestOrder.tutorNetAmountFen !== amounts.tutorNetAmountFen
      ) {
        throw new Error("ORDER_FEE_SNAPSHOT_MISMATCH");
      }

      await tx.order.update({
        where: { id: latestOrder.id },
        data: { status: "WAIT_PLATFORM_CONFIRM" },
      });

      await tx.payment.upsert({
        where: { orderId: latestOrder.id },
        create: {
          orderId: latestOrder.id,
          amount: latestOrder.totalAmount,
          provider: "QRCODE",
          status: "WAIT_PLATFORM_CONFIRM",
          platformAmountFen: amounts.platformFeeAmountFen,
          tutorAmountFen: amounts.tutorNetAmountFen,
        },
        update: {
          amount: latestOrder.totalAmount,
          provider: "QRCODE",
          status: "WAIT_PLATFORM_CONFIRM",
          platformAmountFen: amounts.platformFeeAmountFen,
          tutorAmountFen: amounts.tutorNetAmountFen,
          transactionNo: null,
          paidAt: null,
        },
      });
    });
  } catch {
    redirectWithError(order.id, "扫码支付状态已变化，请刷新后重试。");
  }

  await safelyCreateNotification({
    userId: order.tutorId,
    title: "订单进入扫码支付确认流程",
    content: "家长已标记支付平台信息服务费，等待管理员确认后将进入家教收款阶段。",
    type: "PAYMENT",
    link: `/tutor/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "qrcode-platform-wait",
      order.tutorId,
    ),
  });

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath(`/parent/orders/${order.id}/pay`);
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/qrcode");
  redirect(`/parent/orders/${order.id}/pay`);
}

export async function markTutorQrPaymentCompletedAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== UserRole.PARENT) redirect(getDashboardPath(user.role));

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      parentId: user.id,
    },
    include: {
      payment: true,
      tutor: {
        select: {
          tutorProfile: {
            select: {
              id: true,
              paymentQrCodes: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!order) redirect("/parent/orders");
  if (!order.tutor.tutorProfile?.paymentQrCodes.length) {
    redirectWithError(order.id, "家教尚未配置收款二维码，请稍后再试。");
  }

  const transition = validateQrCodePaymentTransition({
    actorRole: "PARENT",
    action: "PARENT_PAID_TUTOR",
    orderStatus: order.status,
    paymentStatus: order.payment?.status,
    isOrderParent: order.parentId === user.id,
    isOrderTutor: false,
  });
  if (!transition.ok) redirectWithError(order.id, "当前订单暂不能确认家教付款。");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, parentId: user.id, status: "WAIT_TUTOR_PAYMENT" },
      data: { status: "WAIT_TUTOR_CONFIRM" },
    });
    if (updated.count !== 1) throw new Error("ORDER_STATUS_CHANGED");
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "WAIT_TUTOR_CONFIRM",
        tutorPaymentMarkedAt: new Date(),
      },
    });
  });

  await safelyCreateNotification({
    userId: order.tutorId,
    title: "家长已标记完成付款",
    content: "请在确认实际收到家教服务费后，再点击确认收款。",
    type: "PAYMENT",
    link: `/tutor/orders/${order.id}`,
    dedupeKey: buildNotificationDedupeKey(
      "order",
      order.id,
      "qrcode-tutor-wait",
      order.tutorId,
    ),
  });

  revalidatePath("/parent");
  revalidatePath("/parent/orders");
  revalidatePath(`/parent/orders/${order.id}`);
  revalidatePath(`/parent/orders/${order.id}/pay`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/orders");
  revalidatePath(`/tutor/orders/${order.id}`);
  revalidatePath("/tutor/payments");
  redirect(`/parent/orders/${order.id}/pay`);
}
